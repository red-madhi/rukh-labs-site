import { NextRequest, NextResponse } from "next/server";
import {
  DEFAULT_DEEP_TARGETS,
  MAX_EXPLICIT_TARGETS,
  estimateGraphCost,
  type StartingNetworkScope,
} from "@/lib/advanced-network";
import { normalizeNetworkGoal, type NetworkGoal } from "@/lib/advanced-network-v2";
import { hasAdvancedNetworkAccess } from "@/lib/advanced-network-access";

const XRPC = "https://public.api.bsky.app/xrpc";
const MAX_FOLLOWERS = 2_000;
const STARTING_ANCHORS = 24;
const FEED_LIMIT = 80;
const PEERS_PER_ANCHOR = 28;
const PROFILE_BATCH_SIZE = 25;
const RELATIONSHIP_BATCH_SIZE = 30;
const MIN_DIRECTION_FOLLOWERS = 20_000;
const MAX_DIRECTION_POOL = 90;

type Profile = {
  did: string;
  handle: string;
  displayName?: string;
  description?: string;
  avatar?: string;
  followersCount?: number;
  followsCount?: number;
  postsCount?: number;
};

type Relationship = { did: string; following?: string; followedBy?: string };
type FeedActor = { did?: string; handle?: string };
type FeedItem = {
  post?: { author?: FeedActor; embed?: unknown; record?: { createdAt?: string } };
  reason?: { by?: FeedActor };
  reply?: { parent?: { author?: FeedActor }; root?: { author?: FeedActor } };
};
type PeerInteraction = {
  did: string;
  events: number;
  replies: number;
  reposts: number;
  quotes: number;
  rawScore: number;
  distinctDays: number;
};
type WarmRoute = {
  anchorDid: string;
  anchorHandle: string;
  anchorFollowers: number;
  anchorMutual: boolean;
  interactionStrength: number;
  events: number;
};
type DirectionAccumulator = { routes: Map<string, WarmRoute> };
type NeonResponse = { rows?: Array<Array<string | null>> };

type RankedDirection = {
  did: string;
  handle: string;
  displayName?: string;
  followersCount: number;
  followsCount: number;
  priorityScore: number;
  estimatedCost: ReturnType<typeof estimateGraphCost>;
  disposition: "deep-analysis" | "deferred";
  relationship: { following: boolean; followedBy: boolean; mutual: boolean };
  source: "expanded-graph-v2";
  warmPathHandles: string[];
  warmPathCount: number;
  distinctWarmAnchors: number;
  categoryMatches: string[];
  discoveryReason: string;
  portfolioTier: "reachable" | "aspirational" | "moonshot";
  routeSignature: string[];
};

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  politics: ["politic", "congress", "senate", "election", "policy", "government"],
  journalism: ["journal", "reporter", "editor", "news", "media", "press"],
  activism: ["activis", "advocacy", "organizer", "rights", "justice"],
  "film-tv": ["film", "movie", "television", "actor", "director", "screenwriter"],
  celebrity: ["actor", "author", "artist", "comedian", "musician", "performer"],
  music: ["music", "musician", "singer", "band", "producer", "songwriter"],
  comedy: ["comed", "satire", "humor", "comic"],
  gaming: ["gaming", "gamer", "video game", "games", "twitch", "steam"],
  "indie-games": ["indie game", "indiedev", "game maker", "itch.io", "gamedev"],
  "game-dev": ["gamedev", "game developer", "game design", "unity", "unreal", "godot"],
  software: ["software", "developer", "engineer", "programmer", "typescript", "javascript", "python"],
  "linux-open-source": ["linux", "open source", "opensource", "foss", "kde", "fedora", "ubuntu"],
  startups: ["startup", "founder", "entrepreneur", "venture", "saas", "bootstrap"],
  design: ["design", "designer", "ux", "ui", "product design"],
  science: ["science", "scientist", "research", "biology", "physics", "climate", "medicine"],
  books: ["author", "writer", "books", "novelist", "publishing", "poet"],
  art: ["artist", "illustrator", "drawing", "painting", "animation"],
  creators: ["creator", "youtube", "streamer", "podcast", "newsletter"],
  sports: ["sports", "athlete", "coach", "football", "basketball", "baseball", "hockey"],
  nfl: ["nfl", "football", "quarterback"],
  nba: ["nba", "basketball"],
  mlb: ["mlb", "baseball"],
  nhl: ["nhl", "hockey"],
  soccer: ["soccer", "football club", "premier league", "mls", "fifa"],
};

function clamp(value: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value));
}

function normalize(input: string) {
  let value = input.trim();
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) {
    try {
      const url = new URL(value);
      const parts = url.pathname.split("/").filter(Boolean);
      const profileIndex = parts.indexOf("profile");
      value = profileIndex >= 0 ? parts[profileIndex + 1] ?? "" : parts.at(-1) ?? "";
    } catch {
      return "";
    }
  }
  return value.replace(/^@/, "").replace(/[/?#].*$/, "").trim();
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function xrpc<T>(method: string, params: URLSearchParams, retry = true): Promise<T> {
  const response = await fetch(`${XRPC}/${method}?${params.toString()}`, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  if (!response.ok) {
    if (retry && (response.status === 429 || response.status >= 500)) {
      await sleep(300);
      return xrpc<T>(method, params, false);
    }
    throw new Error(`Bluesky ${method} returned ${response.status}.`);
  }
  return (await response.json()) as T;
}

async function getProfile(actor: string) {
  return xrpc<Profile>("app.bsky.actor.getProfile", new URLSearchParams({ actor }));
}

async function getProfiles(actors: string[]) {
  const profiles: Profile[] = [];
  const unique = Array.from(new Set(actors.filter(Boolean)));
  for (let index = 0; index < unique.length; index += PROFILE_BATCH_SIZE) {
    const params = new URLSearchParams();
    for (const actor of unique.slice(index, index + PROFILE_BATCH_SIZE)) params.append("actors", actor);
    const payload = await xrpc<{ profiles?: Profile[] }>("app.bsky.actor.getProfiles", params);
    profiles.push(...(payload.profiles ?? []));
  }
  return profiles;
}

async function getFollowers(actor: string) {
  const followers: Profile[] = [];
  let cursor = "";
  do {
    const params = new URLSearchParams({ actor, limit: "100" });
    if (cursor) params.set("cursor", cursor);
    const payload = await xrpc<{ followers?: Profile[]; cursor?: string }>(
      "app.bsky.graph.getFollowers",
      params,
    );
    followers.push(...(payload.followers ?? []));
    cursor = payload.cursor ?? "";
  } while (cursor && followers.length < MAX_FOLLOWERS);
  return followers;
}

async function getRelationships(actor: string, others: string[]) {
  const relationships: Relationship[] = [];
  const unique = Array.from(new Set(others.filter((did) => did && did !== actor)));
  for (let index = 0; index < unique.length; index += RELATIONSHIP_BATCH_SIZE) {
    const params = new URLSearchParams({ actor });
    for (const did of unique.slice(index, index + RELATIONSHIP_BATCH_SIZE)) params.append("others", did);
    const payload = await xrpc<{ relationships?: Relationship[] }>(
      "app.bsky.graph.getRelationships",
      params,
    );
    relationships.push(...(payload.relationships ?? []));
  }
  return relationships;
}

function embeddedAuthors(value: unknown, depth = 0): FeedActor[] {
  if (!value || typeof value !== "object" || depth > 5) return [];
  const object = value as Record<string, unknown>;
  const result: FeedActor[] = [];
  const author = object.author;
  if (author && typeof author === "object" && typeof (author as FeedActor).did === "string") {
    result.push(author as FeedActor);
  }
  for (const key of ["record", "media", "embed", "view", "value"]) {
    if (key in object) result.push(...embeddedAuthors(object[key], depth + 1));
  }
  if (Array.isArray(object.items)) {
    for (const item of object.items) result.push(...embeddedAuthors(item, depth + 1));
  }
  return result;
}

function addPeer(
  map: Map<string, PeerInteraction & { days: Set<string> }>,
  did: string | undefined,
  kind: "reply" | "repost" | "quote",
  createdAt?: string,
) {
  if (!did) return;
  const current = map.get(did) ?? {
    did,
    events: 0,
    replies: 0,
    reposts: 0,
    quotes: 0,
    rawScore: 0,
    days: new Set<string>(),
  };
  current.events += 1;
  if (kind === "reply") {
    current.replies += 1;
    current.rawScore += 5;
  } else if (kind === "quote") {
    current.quotes += 1;
    current.rawScore += 4;
  } else {
    current.reposts += 1;
    current.rawScore += 3;
  }
  if (createdAt) {
    const date = new Date(createdAt);
    if (Number.isFinite(date.getTime())) current.days.add(date.toISOString().slice(0, 10));
  }
  map.set(did, current);
}

async function interactionPeers(anchor: Profile) {
  const payload = await xrpc<{ feed?: FeedItem[] }>(
    "app.bsky.feed.getAuthorFeed",
    new URLSearchParams({ actor: anchor.did, limit: String(FEED_LIMIT) }),
  );
  const peers = new Map<string, PeerInteraction & { days: Set<string> }>();
  for (const item of payload.feed ?? []) {
    const postAuthorDid = item.post?.author?.did;
    const createdAt = item.post?.record?.createdAt;
    if (item.reason?.by?.did === anchor.did && postAuthorDid && postAuthorDid !== anchor.did) {
      addPeer(peers, postAuthorDid, "repost", createdAt);
    }
    if (postAuthorDid === anchor.did) {
      addPeer(peers, item.reply?.parent?.author?.did, "reply", createdAt);
      for (const quoted of embeddedAuthors(item.post?.embed)) {
        addPeer(peers, quoted.did, "quote", createdAt);
      }
    }
  }
  return [...peers.values()]
    .filter((peer) => peer.did !== anchor.did && (peer.events >= 2 || peer.days.size >= 2))
    .sort(
      (a, b) =>
        b.rawScore - a.rawScore ||
        b.days.size - a.days.size ||
        b.events - a.events,
    )
    .slice(0, PEERS_PER_ANCHOR)
    .map((peer) => ({ ...peer, distinctDays: peer.days.size }));
}

function profileInfluence(profile: Profile, mutual = false) {
  const followers = Math.max(0, profile.followersCount ?? 0);
  const follows = Math.max(0, profile.followsCount ?? 0);
  const ratio = followers / Math.max(1, follows);
  return Math.round(
    Math.log10(followers + 10) * 22 +
      Math.min(24, Math.log2(ratio + 1) * 8) +
      (mutual ? 35 : 0),
  );
}

function massFollowPenalty(profile: Profile) {
  const followers = Math.max(1, profile.followersCount ?? 0);
  const follows = Math.max(0, profile.followsCount ?? 0);
  const ratio = follows / followers;
  if (follows > 150_000 && ratio > 2) return 24;
  if (follows > 75_000 && ratio > 1.5) return 16;
  if (follows > 30_000 && ratio > 2.5) return 10;
  return 0;
}

function categoryMatches(profile: Profile, selected: string[]) {
  if (!selected.length) return [] as string[];
  const haystack = `${profile.handle} ${profile.displayName ?? ""} ${profile.description ?? ""}`.toLowerCase();
  return selected.filter((category) =>
    (CATEGORY_KEYWORDS[category] ?? [category.replaceAll("-", " ")]).some((keyword) => haystack.includes(keyword)),
  );
}

function categoryScore(matches: string[], selected: string[]) {
  if (!selected.length) return 62;
  if (!matches.length) return 20;
  return clamp(44 + matches.length * 23 + (matches.length === selected.length ? 12 : 0));
}

function tierFor(followersCount: number): RankedDirection["portfolioTier"] {
  if (followersCount >= 1_000_000) return "moonshot";
  if (followersCount >= 100_000) return "aspirational";
  return "reachable";
}

function goalWeights(goal: NetworkGoal) {
  if (goal === "follow-backs") return { influence: 0.25, routes: 0.35, relevance: 0.17, warmth: 0.23 };
  if (goal === "visibility") return { influence: 0.46, routes: 0.31, relevance: 0.14, warmth: 0.09 };
  if (goal === "clients") return { influence: 0.28, routes: 0.27, relevance: 0.34, warmth: 0.11 };
  if (goal === "collaboration") return { influence: 0.24, routes: 0.34, relevance: 0.27, warmth: 0.15 };
  if (goal === "community-entry") return { influence: 0.24, routes: 0.43, relevance: 0.21, warmth: 0.12 };
  return { influence: 0.34, routes: 0.35, relevance: 0.2, warmth: 0.11 };
}

function getNeonEndpoint(connectionString: string) {
  const parsed = new URL(connectionString);
  const parts = parsed.hostname.split(".");
  if (parts.length < 2) throw new Error("Database connection host is invalid.");
  parts[0] = "api";
  return `https://${parts.join(".")}/sql`;
}

async function neonQuery(query: string, params: Array<string | null> = []) {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) return { rows: [] } as NeonResponse;
  const response = await fetch(getNeonEndpoint(connectionString), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Neon-Connection-String": connectionString,
      "Neon-Raw-Text-Output": "true",
      "Neon-Array-Mode": "true",
    },
    body: JSON.stringify({ query, params }),
    cache: "no-store",
  });
  if (!response.ok) return { rows: [] } as NeonResponse;
  return (await response.json()) as NeonResponse;
}

async function existingTargetDids(actorDid: string) {
  const result = await neonQuery(
    `SELECT DISTINCT t.target_did
     FROM public.advanced_network_targets t
     JOIN public.advanced_network_campaigns c ON c.id=t.campaign_id
     JOIN public.advanced_network_accounts a ON a.id=c.account_id
     WHERE a.bluesky_did=$1 AND t.status IN ('active','candidate')`,
    [actorDid],
  );
  return new Set((result.rows ?? []).map((row) => row[0]).filter((value): value is string => Boolean(value)));
}

async function mapWithConcurrency<T, R>(items: T[], concurrency: number, fn: (item: T) => Promise<R>) {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  async function worker() {
    while (true) {
      const index = cursor++;
      if (index >= items.length) return;
      results[index] = await fn(items[index]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => worker()));
  return results;
}

function selectPortfolio(ranked: RankedDirection[], limit: number) {
  const selected: RankedDirection[] = [];
  const usedAnchors = new Map<string, number>();
  const tierCaps: Record<RankedDirection["portfolioTier"], number> = {
    reachable: Math.max(2, Math.ceil(limit * 0.4)),
    aspirational: Math.max(2, Math.ceil(limit * 0.45)),
    moonshot: Math.max(1, Math.floor(limit * 0.2)),
  };
  const tierCounts = { reachable: 0, aspirational: 0, moonshot: 0 };

  while (selected.length < limit) {
    const candidate = ranked
      .filter((item) => !selected.some((chosen) => chosen.did === item.did))
      .filter((item) => tierCounts[item.portfolioTier] < tierCaps[item.portfolioTier])
      .map((item) => {
        const redundancy = item.routeSignature.reduce(
          (sum, anchor) => sum + (usedAnchors.get(anchor) ?? 0) * 9,
          0,
        );
        return { item, adjusted: item.priorityScore - redundancy };
      })
      .sort((a, b) => b.adjusted - a.adjusted || b.item.priorityScore - a.item.priorityScore)[0]?.item;
    if (!candidate) break;
    selected.push(candidate);
    tierCounts[candidate.portfolioTier] += 1;
    candidate.routeSignature.forEach((anchor) => usedAnchors.set(anchor, (usedAnchors.get(anchor) ?? 0) + 1));
  }

  if (selected.length < limit) {
    for (const candidate of ranked) {
      if (selected.length >= limit) break;
      if (!selected.some((item) => item.did === candidate.did)) selected.push(candidate);
    }
  }
  return selected;
}

export async function runSuggestedDirectionV2(request: NextRequest) {
  if (!(await hasAdvancedNetworkAccess())) {
    return NextResponse.json({ error: "Private beta access is required." }, { status: 403 });
  }

  try {
    const body = (await request.json()) as {
      actor?: string;
      categories?: string[];
      scope?: StartingNetworkScope;
      deepTargetLimit?: number;
      includeExistingTargets?: boolean;
      goal?: string;
    };
    const actorInput = normalize(String(body.actor ?? ""));
    if (!actorInput) return NextResponse.json({ error: "Connect a Bluesky account first." }, { status: 400 });

    const categories = Array.from(new Set((body.categories ?? []).map(String))).slice(0, 8);
    const scope: StartingNetworkScope = body.scope === "mutuals-only" ? "mutuals-only" : "all-followers";
    const deepTargetLimit = Math.min(
      MAX_EXPLICIT_TARGETS,
      Math.max(1, Math.floor(body.deepTargetLimit ?? DEFAULT_DEEP_TARGETS)),
    );
    const goal = normalizeNetworkGoal(
      String(body.goal ?? request.cookies.get("advanced-network-goal")?.value ?? "balanced"),
    );
    const weights = goalWeights(goal);
    const actor = await getProfile(actorInput);

    const followerStubs = await getFollowers(actor.did);
    const followerProfiles = await getProfiles(followerStubs.map((profile) => profile.did));
    const followerByDid = new Map(followerProfiles.map((profile) => [profile.did, profile]));
    const followers = followerStubs.map((stub) => ({ ...stub, ...(followerByDid.get(stub.did) ?? {}) }));
    const followerRelations = await getRelationships(actor.did, followers.map((profile) => profile.did));
    const relationByDid = new Map(followerRelations.map((relationship) => [relationship.did, relationship]));

    const mutualAnchors = followers
      .map((profile) => {
        const relation = relationByDid.get(profile.did);
        const mutual = Boolean(relation?.following && relation?.followedBy);
        return { profile, mutual, score: profileInfluence(profile, mutual) - massFollowPenalty(profile) };
      })
      .filter((item) => item.mutual)
      .sort((a, b) => b.score - a.score);
    const oneWayAnchors = followers
      .map((profile) => {
        const relation = relationByDid.get(profile.did);
        const mutual = Boolean(relation?.following && relation?.followedBy);
        return { profile, mutual, score: profileInfluence(profile, mutual) - massFollowPenalty(profile) };
      })
      .filter((item) => !item.mutual)
      .sort((a, b) => b.score - a.score);

    const anchors = scope === "mutuals-only"
      ? mutualAnchors.slice(0, STARTING_ANCHORS)
      : [
          ...mutualAnchors.slice(0, Math.ceil(STARTING_ANCHORS * 0.65)),
          ...oneWayAnchors.slice(0, Math.floor(STARTING_ANCHORS * 0.35)),
        ].sort((a, b) => b.score - a.score);

    if (!anchors.length) {
      return NextResponse.json({ error: "No starting followers are visible for direction discovery." }, { status: 400 });
    }

    const expanded = new Map<string, DirectionAccumulator>();
    const anchorResults = await mapWithConcurrency(anchors, 4, async ({ profile: anchor, mutual }) => {
      try {
        const peers = await interactionPeers(anchor);
        if (!peers.length) return { anchor, mutual, verified: [] as PeerInteraction[] };
        const relationships = await getRelationships(anchor.did, peers.map((peer) => peer.did));
        const relationshipByDid = new Map(relationships.map((relationship) => [relationship.did, relationship]));
        const verified = peers.filter((peer) => {
          const relation = relationshipByDid.get(peer.did);
          return Boolean(relation?.following && relation?.followedBy);
        });
        return { anchor, mutual, verified };
      } catch {
        return { anchor, mutual, verified: [] as PeerInteraction[] };
      }
    });

    for (const { anchor, mutual, verified } of anchorResults) {
      for (const peer of verified) {
        if (peer.did === actor.did) continue;
        const current = expanded.get(peer.did) ?? { routes: new Map<string, WarmRoute>() };
        current.routes.set(anchor.did, {
          anchorDid: anchor.did,
          anchorHandle: anchor.handle,
          anchorFollowers: Math.max(0, anchor.followersCount ?? 0),
          anchorMutual: mutual,
          interactionStrength: clamp(peer.rawScore * 7 + peer.events * 3 + peer.distinctDays * 5),
          events: peer.events,
        });
        expanded.set(peer.did, current);
      }
    }

    const candidateDids = [...expanded.keys()].slice(0, MAX_DIRECTION_POOL * 3);
    const candidateProfiles = await getProfiles(candidateDids);
    const userRelations = await getRelationships(actor.did, candidateProfiles.map((profile) => profile.did));
    const userRelationByDid = new Map(userRelations.map((relationship) => [relationship.did, relationship]));
    const excludedTargets = body.includeExistingTargets ? new Set<string>() : await existingTargetDids(actor.did);

    const ranked: RankedDirection[] = candidateProfiles
      .filter((profile) => {
        if (profile.did === actor.did || excludedTargets.has(profile.did)) return false;
        if ((profile.followersCount ?? 0) < MIN_DIRECTION_FOLLOWERS) return false;
        const relation = userRelationByDid.get(profile.did);
        if (relation?.following && relation?.followedBy) return false;
        return true;
      })
      .map((profile) => {
        const routes = [...(expanded.get(profile.did)?.routes.values() ?? [])].sort(
          (a, b) =>
            b.interactionStrength - a.interactionStrength ||
            Number(b.anchorMutual) - Number(a.anchorMutual) ||
            b.anchorFollowers - a.anchorFollowers,
        );
        const matches = categoryMatches(profile, categories);
        const relation = userRelationByDid.get(profile.did);
        const following = Boolean(relation?.following);
        const followedBy = Boolean(relation?.followedBy);
        const followersCount = Math.max(0, profile.followersCount ?? 0);
        const followsCount = Math.max(0, profile.followsCount ?? 0);
        const influence = clamp((Math.log10(followersCount + 10) / 7) * 100 - massFollowPenalty(profile));
        const routeStrength = clamp(
          Math.log2(routes.length + 1) * 29 +
            (routes.slice(0, 4).reduce((sum, route) => sum + route.interactionStrength, 0) /
              Math.max(1, Math.min(4, routes.length))) * 0.45,
        );
        const relevance = categoryScore(matches, categories);
        const directWarmth = followedBy ? 100 : following ? 58 : 24;
        const score = clamp(
          Math.round(
            influence * weights.influence +
              routeStrength * weights.routes +
              relevance * weights.relevance +
              directWarmth * weights.warmth -
              massFollowPenalty(profile),
          ),
        );
        const routeHandles = routes.slice(0, 5).map((route) => route.anchorHandle);
        const matchText = matches.length
          ? ` Matches ${matches.map((value) => value.replaceAll("-", " ")).join(", ")}.`
          : "";
        const tier = tierFor(followersCount);
        const discoveryReason = `${routes.length} verified reciprocal route${routes.length === 1 ? "" : "s"} from your current network through ${routeHandles.map((handle) => `@${handle}`).join(", ")}.${matchText} Portfolio tier: ${tier}.`;
        return {
          did: profile.did,
          handle: profile.handle,
          displayName: profile.displayName,
          followersCount,
          followsCount,
          priorityScore: score,
          estimatedCost: estimateGraphCost(followersCount, followsCount),
          disposition: "deferred" as const,
          relationship: { following, followedBy, mutual: false },
          source: "expanded-graph-v2" as const,
          warmPathHandles: routeHandles,
          warmPathCount: routes.length,
          distinctWarmAnchors: routes.length,
          categoryMatches: matches,
          discoveryReason,
          portfolioTier: tier,
          routeSignature: routes.slice(0, 6).map((route) => route.anchorDid),
        };
      })
      .sort(
        (a, b) =>
          b.priorityScore - a.priorityScore ||
          b.distinctWarmAnchors - a.distinctWarmAnchors ||
          b.followersCount - a.followersCount,
      )
      .slice(0, MAX_DIRECTION_POOL);

    if (!ranked.length) {
      return NextResponse.json(
        {
          error:
            "The current observable graph did not expose a fresh relevant destination with a verified warm route. Broaden to All Followers or change the topic focus.",
        },
        { status: 404 },
      );
    }

    const selected = selectPortfolio(ranked, deepTargetLimit);
    const selectedIds = new Set(selected.map((item) => item.did));
    const ordered = [
      ...selected.map((item) => ({ ...item, disposition: "deep-analysis" as const })),
      ...ranked
        .filter((item) => !selectedIds.has(item.did))
        .map((item) => ({ ...item, disposition: "deferred" as const })),
    ];

    return NextResponse.json({
      actor: { did: actor.did, handle: actor.handle, displayName: actor.displayName },
      categories,
      goal,
      requestedTargetCount: 0,
      deepTargetLimit,
      targets: ordered,
      deferredCount: ordered.filter((target) => target.disposition === "deferred").length,
      discovery: {
        mode: "expanded-graph-v2",
        scope,
        goal,
        observableFollowers: followers.length,
        startingAnchorsScanned: anchors.length,
        reciprocalInteractionEndpoints: expanded.size,
        freshLargeDirections: ranked.length,
        existingTargetsExcluded: excludedTargets.size,
        portfolio: {
          reachable: selected.filter((item) => item.portfolioTier === "reachable").length,
          aspirational: selected.filter((item) => item.portfolioTier === "aspirational").length,
          moonshot: selected.filter((item) => item.portfolioTier === "moonshot").length,
        },
      },
    });
  } catch (error) {
    console.error("Advanced Network suggested direction v2 failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Suggested direction discovery failed." },
      { status: 502 },
    );
  }
}
