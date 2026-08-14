import { NextRequest, NextResponse } from "next/server";
import {
  DEFAULT_DEEP_TARGETS,
  MAX_EXPLICIT_TARGETS,
  estimateGraphCost,
  targetPriorityScore,
  type StartingNetworkScope,
} from "@/lib/advanced-network";
import { hasAdvancedNetworkAccess } from "@/lib/advanced-network-access";

export const runtime = "nodejs";
export const maxDuration = 60;

const XRPC = "https://public.api.bsky.app/xrpc";
const MAX_FOLLOWERS = 2_000;
const STARTING_ANCHORS = 18;
const FEED_LIMIT = 60;
const PEERS_PER_ANCHOR = 24;
const PROFILE_BATCH_SIZE = 25;
const RELATIONSHIP_BATCH_SIZE = 30;
const MIN_DIRECTION_FOLLOWERS = 25_000;
const MAX_DIRECTION_POOL = 80;

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

type Relationship = {
  did: string;
  following?: string;
  followedBy?: string;
};

type FeedActor = {
  did?: string;
  handle?: string;
};

type FeedItem = {
  post?: {
    author?: FeedActor;
    embed?: unknown;
  };
  reason?: {
    by?: FeedActor;
  };
  reply?: {
    parent?: { author?: FeedActor };
    root?: { author?: FeedActor };
  };
};

type PeerInteraction = {
  did: string;
  events: number;
  replies: number;
  reposts: number;
  quotes: number;
  rawScore: number;
};

type WarmRoute = {
  anchorDid: string;
  anchorHandle: string;
  anchorFollowers: number;
  interactionStrength: number;
  events: number;
};

type DirectionAccumulator = {
  routes: Map<string, WarmRoute>;
};

type NeonResponse = {
  rows?: Array<Array<string | null>>;
};

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  politics: ["politic", "congress", "senate", "democrat", "republican", "election", "policy", "government"],
  journalism: ["journal", "reporter", "editor", "news", "media", "press", "correspondent"],
  activism: ["activis", "advocacy", "organizer", "rights", "justice", "nonprofit", "campaign"],
  "film-tv": ["film", "movie", "television", "actor", "actress", "director", "screenwriter", "cinema"],
  celebrity: ["actor", "author", "artist", "comedian", "musician", "celebrity", "performer"],
  music: ["music", "musician", "singer", "band", "producer", "songwriter", "guitar", "album"],
  comedy: ["comed", "satire", "humor", "humour", "comic", "jokes"],
  gaming: ["gaming", "gamer", "video game", "games", "gameplay", "twitch", "steam"],
  "indie-games": ["indie game", "indiedev", "indie dev", "game maker", "itch.io", "gamedev"],
  "game-dev": ["gamedev", "game dev", "game developer", "game design", "unity", "unreal", "godot"],
  software: ["software", "developer", "engineer", "programmer", "coding", "typescript", "javascript", "python", "web dev"],
  "linux-open-source": ["linux", "open source", "opensource", "foss", "kde", "gnome", "fedora", "ubuntu", "debian"],
  startups: ["startup", "founder", "entrepreneur", "venture", "saas", "indie hacker", "bootstrap"],
  design: ["design", "designer", "ux", "ui", "product design", "creative director"],
  science: ["science", "scientist", "research", "biology", "physics", "astronomy", "climate", "medicine"],
  books: ["author", "writer", "books", "novelist", "publishing", "literary", "poet"],
  art: ["artist", "illustrator", "illustration", "drawing", "painting", "animation", "visual art"],
  creators: ["creator", "youtube", "tiktok", "streamer", "podcast", "content creator", "newsletter"],
  sports: ["sports", "athlete", "coach", "league", "football", "basketball", "baseball", "hockey", "soccer"],
  nfl: ["nfl", "football", "touchdown", "quarterback"],
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
      await sleep(250);
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
    const payload = await xrpc<{ followers?: Profile[]; cursor?: string }>("app.bsky.graph.getFollowers", params);
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
    const payload = await xrpc<{ relationships?: Relationship[] }>("app.bsky.graph.getRelationships", params);
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
  map: Map<string, PeerInteraction>,
  did: string | undefined,
  kind: "reply" | "repost" | "quote",
) {
  if (!did) return;
  const current = map.get(did) ?? {
    did,
    events: 0,
    replies: 0,
    reposts: 0,
    quotes: 0,
    rawScore: 0,
  };
  current.events += 1;
  if (kind === "reply") {
    current.replies += 1;
    current.rawScore += 4;
  } else if (kind === "repost") {
    current.reposts += 1;
    current.rawScore += 3;
  } else {
    current.quotes += 1;
    current.rawScore += 3;
  }
  map.set(did, current);
}

async function interactionPeers(anchor: Profile) {
  const payload = await xrpc<{ feed?: FeedItem[] }>(
    "app.bsky.feed.getAuthorFeed",
    new URLSearchParams({ actor: anchor.did, limit: String(FEED_LIMIT) }),
  );
  const peers = new Map<string, PeerInteraction>();
  for (const item of payload.feed ?? []) {
    const postAuthorDid = item.post?.author?.did;
    if (item.reason?.by?.did === anchor.did && postAuthorDid && postAuthorDid !== anchor.did) {
      addPeer(peers, postAuthorDid, "repost");
    }
    if (postAuthorDid === anchor.did) {
      addPeer(peers, item.reply?.parent?.author?.did, "reply");
      for (const quoted of embeddedAuthors(item.post?.embed)) addPeer(peers, quoted.did, "quote");
    }
  }
  return [...peers.values()]
    .filter((peer) => peer.did !== anchor.did)
    .sort((a, b) => b.rawScore - a.rawScore || b.events - a.events)
    .slice(0, PEERS_PER_ANCHOR);
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
    (CATEGORY_KEYWORDS[category] ?? []).some((keyword) => haystack.includes(keyword)),
  );
}

function categoryScore(matches: string[], selected: string[]) {
  if (!selected.length) return 62;
  if (!matches.length) return 18;
  return clamp(45 + matches.length * 24 + (matches.length === selected.length ? 12 : 0));
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
  return new Set(
    (result.rows ?? []).map((row) => row[0]).filter((value): value is string => Boolean(value)),
  );
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

export async function POST(request: NextRequest) {
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
    };
    const actorInput = normalize(String(body.actor ?? ""));
    if (!actorInput) {
      return NextResponse.json({ error: "Connect a Bluesky account first." }, { status: 400 });
    }

    const categories = Array.from(new Set((body.categories ?? []).map(String))).slice(0, 8);
    const scope: StartingNetworkScope = body.scope === "mutuals-only" ? "mutuals-only" : "all-followers";
    const deepTargetLimit = Math.min(
      MAX_EXPLICIT_TARGETS,
      Math.max(1, Math.floor(body.deepTargetLimit ?? DEFAULT_DEEP_TARGETS)),
    );
    const actor = await getProfile(actorInput);

    const followerStubs = await getFollowers(actor.did);
    const followerProfiles = await getProfiles(followerStubs.map((profile) => profile.did));
    const followerByDid = new Map(followerProfiles.map((profile) => [profile.did, profile]));
    const followers = followerStubs.map((stub) => ({ ...stub, ...(followerByDid.get(stub.did) ?? {}) }));
    const followerRelations = await getRelationships(actor.did, followers.map((profile) => profile.did));
    const relationByDid = new Map(followerRelations.map((relationship) => [relationship.did, relationship]));

    const anchors = followers
      .map((profile) => {
        const relation = relationByDid.get(profile.did);
        const mutual = Boolean(relation?.following && relation?.followedBy);
        return {
          profile,
          mutual,
          score: profileInfluence(profile, mutual) - massFollowPenalty(profile),
        };
      })
      .filter((item) => scope === "all-followers" || item.mutual)
      .sort((a, b) => b.score - a.score)
      .slice(0, STARTING_ANCHORS);

    if (!anchors.length) {
      return NextResponse.json({ error: "No starting followers are visible for direction discovery." }, { status: 400 });
    }

    const expanded = new Map<string, DirectionAccumulator>();
    const anchorResults = await mapWithConcurrency(anchors, 4, async ({ profile: anchor }) => {
      try {
        const peers = await interactionPeers(anchor);
        if (!peers.length) return { anchor, verified: [] as Array<{ peer: PeerInteraction; did: string }> };
        const relationships = await getRelationships(anchor.did, peers.map((peer) => peer.did));
        const relationshipByDid = new Map(relationships.map((relationship) => [relationship.did, relationship]));
        const verified = peers
          .filter((peer) => {
            const relation = relationshipByDid.get(peer.did);
            return Boolean(relation?.following && relation?.followedBy);
          })
          .map((peer) => ({ peer, did: peer.did }));
        return { anchor, verified };
      } catch {
        return { anchor, verified: [] as Array<{ peer: PeerInteraction; did: string }> };
      }
    });

    for (const { anchor, verified } of anchorResults) {
      for (const { peer, did } of verified) {
        if (did === actor.did) continue;
        const current = expanded.get(did) ?? { routes: new Map<string, WarmRoute>() };
        current.routes.set(anchor.did, {
          anchorDid: anchor.did,
          anchorHandle: anchor.handle,
          anchorFollowers: Math.max(0, anchor.followersCount ?? 0),
          interactionStrength: clamp(peer.rawScore * 8 + peer.events * 4),
          events: peer.events,
        });
        expanded.set(did, current);
      }
    }

    const candidateDids = [...expanded.keys()].slice(0, MAX_DIRECTION_POOL * 3);
    const candidateProfiles = await getProfiles(candidateDids);
    const userRelations = await getRelationships(actor.did, candidateProfiles.map((profile) => profile.did));
    const userRelationByDid = new Map(userRelations.map((relationship) => [relationship.did, relationship]));
    const excludedTargets = body.includeExistingTargets ? new Set<string>() : await existingTargetDids(actor.did);

    const ranked = candidateProfiles
      .filter((profile) => {
        if (profile.did === actor.did || excludedTargets.has(profile.did)) return false;
        if ((profile.followersCount ?? 0) < MIN_DIRECTION_FOLLOWERS) return false;
        const relation = userRelationByDid.get(profile.did);
        if (relation?.following && relation?.followedBy) return false;
        return true;
      })
      .map((profile) => {
        const routes = [...(expanded.get(profile.did)?.routes.values() ?? [])]
          .sort(
            (a, b) =>
              b.interactionStrength - a.interactionStrength ||
              b.anchorFollowers - a.anchorFollowers,
          );
        const matches = categoryMatches(profile, categories);
        const relation = userRelationByDid.get(profile.did);
        const following = Boolean(relation?.following);
        const followedBy = Boolean(relation?.followedBy);
        const followersCount = Math.max(0, profile.followersCount ?? 0);
        const followsCount = Math.max(0, profile.followsCount ?? 0);
        const influence = targetPriorityScore({
          followersCount,
          followsCount,
          mutual: false,
          oneWay: following || followedBy,
        });
        const routeStrength = clamp(
          Math.log2(routes.length + 1) * 28 +
            (routes.slice(0, 3).reduce((sum, route) => sum + route.interactionStrength, 0) /
              Math.max(1, Math.min(3, routes.length))) *
              0.45,
        );
        const relevance = categoryScore(matches, categories);
        const directWarmth = followedBy ? 100 : following ? 58 : 28;
        const score = clamp(
          Math.round(
            influence * 0.42 +
              routeStrength * 0.32 +
              relevance * 0.18 +
              directWarmth * 0.08 -
              massFollowPenalty(profile),
          ),
        );
        const routeHandles = routes.slice(0, 4).map((route) => route.anchorHandle);
        const matchText = matches.length ? ` Matches ${matches.map((value) => value.replaceAll("-", " ")).join(", ")}.` : "";
        const discoveryReason = `${routes.length} verified warm route${routes.length === 1 ? "" : "s"} from your current network${routeHandles.length ? ` through ${routeHandles.map((handle) => `@${handle}`).join(", ")}` : ""}.${matchText}`;
        return {
          did: profile.did,
          handle: profile.handle,
          displayName: profile.displayName,
          followersCount,
          followsCount,
          priorityScore: score,
          estimatedCost: estimateGraphCost(followersCount, followsCount),
          disposition: "deep-analysis" as const,
          relationship: { following, followedBy, mutual: false },
          source: "expanded-graph" as const,
          warmPathHandles: routeHandles,
          warmPathCount: routes.length,
          categoryMatches: matches,
          discoveryReason,
        };
      })
      .sort(
        (a, b) =>
          b.priorityScore - a.priorityScore ||
          b.warmPathCount - a.warmPathCount ||
          b.followersCount - a.followersCount,
      )
      .slice(0, MAX_DIRECTION_POOL)
      .map((target, index) => ({
        ...target,
        disposition: index < deepTargetLimit ? ("deep-analysis" as const) : ("deferred" as const),
      }));

    if (!ranked.length) {
      return NextResponse.json(
        {
          error:
            "The current observable graph did not expose a fresh large-account direction with a verified warm route. Broaden to All Followers or change the category filters.",
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      actor: { did: actor.did, handle: actor.handle, displayName: actor.displayName },
      categories,
      requestedTargetCount: 0,
      deepTargetLimit,
      targets: ranked,
      deferredCount: ranked.filter((target) => target.disposition === "deferred").length,
      discovery: {
        mode: "expanded-graph",
        scope,
        observableFollowers: followers.length,
        startingAnchorsScanned: anchors.length,
        reciprocalInteractionEndpoints: expanded.size,
        freshLargeDirections: ranked.length,
        existingTargetsExcluded: excludedTargets.size,
      },
    });
  } catch (error) {
    console.error("Advanced Network suggested direction discovery failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Suggested direction discovery failed." },
      { status: 502 },
    );
  }
}
