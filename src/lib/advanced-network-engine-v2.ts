import { NextRequest, NextResponse } from "next/server";
import type { StartingNetworkScope } from "@/lib/advanced-network";
import {
  bestRelationshipStage,
  calculateExpectedBridgeValue,
  calculateTieConfidence,
  calculateWeightedPathCost,
  clamp,
  confidenceLevel,
  countNodeIndependentPaths,
  normalizeNetworkGoal,
  relationshipStageRank,
  type HumanFitLabel,
  type NetworkGoal,
  type RelationshipStage,
  type TieConfidenceLevel,
} from "@/lib/advanced-network-v2";
import { hasAdvancedNetworkAccess } from "@/lib/advanced-network-access";

const XRPC = "https://public.api.bsky.app/xrpc";
const MAX_DEEP_TARGETS = 6;
const MAX_FOLLOWERS = 2_000;
const STARTING_POOL_CAP = 140;
const FEED_LIMIT = 100;
const BESTIES_PER_ACTOR = 6;
const FULL_REVERSE_CHECKS = 4;
const FIRST_HOP_EXPANSIONS = 7;
const BRIDGE_EXPANSIONS = 4;
const ROUND_TWO_FOOTHOLDS = 4;
const SECOND_WAVE_TARGETS = 2;
const MAX_RECOMMENDATIONS = 24;
const PROFILE_BATCH_SIZE = 25;
const RELATIONSHIP_BATCH_SIZE = 30;
const SECOND_WAVE_MIN_FOLLOWERS = 75_000;

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  politics: ["politic", "policy", "election", "government", "congress"],
  journalism: ["journal", "reporter", "news", "editor", "media"],
  activism: ["activis", "advocacy", "organizer", "rights", "justice"],
  "film-tv": ["film", "movie", "television", "actor", "director", "screen"],
  celebrity: ["actor", "author", "artist", "comedian", "musician", "performer"],
  music: ["music", "musician", "singer", "band", "producer", "album"],
  comedy: ["comed", "satire", "humor", "comic"],
  gaming: ["gaming", "gamer", "video game", "games", "twitch", "steam"],
  "indie-games": ["indie game", "indiedev", "game maker", "itch.io", "gamedev"],
  "game-dev": ["gamedev", "game developer", "game design", "unity", "unreal", "godot"],
  software: ["software", "developer", "engineer", "programmer", "typescript", "python"],
  "linux-open-source": ["linux", "open source", "opensource", "foss", "kde", "fedora"],
  startups: ["startup", "founder", "entrepreneur", "saas", "bootstrap"],
  design: ["design", "designer", "ux", "ui", "product design"],
  science: ["science", "scientist", "research", "climate", "medicine"],
  books: ["author", "writer", "books", "novelist", "publishing", "poet"],
  art: ["artist", "illustrator", "drawing", "painting", "animation"],
  creators: ["creator", "youtube", "streamer", "podcast", "newsletter"],
  sports: ["sports", "athlete", "coach", "football", "basketball", "baseball"],
  nfl: ["nfl", "football", "quarterback"],
  nba: ["nba", "basketball"],
  mlb: ["mlb", "baseball"],
  nhl: ["nhl", "hockey"],
  soccer: ["soccer", "football club", "premier league", "mls", "fifa"],
};

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

type FeedRecord = {
  createdAt?: string;
  text?: string;
};

type FeedItem = {
  post?: {
    uri?: string;
    author?: FeedActor;
    record?: FeedRecord;
    embed?: unknown;
  };
  reason?: { by?: FeedActor };
  reply?: {
    parent?: { author?: FeedActor };
    root?: { author?: FeedActor };
  };
};

type InteractionEvidence = {
  peerDid: string;
  replies: number;
  reposts: number;
  quotes: number;
  events: number;
  rawScore: number;
  days: Set<string>;
  lastAt: string | null;
};

type StoredInteraction = {
  replies: number;
  reposts: number;
  quotes: number;
  score: number;
  windowStart: string | null;
  windowEnd: string | null;
};

type Tie = {
  profile: Profile;
  confidence: number;
  confidenceLevel: TieConfidenceLevel;
  interactionStrength: number;
  outgoingScore: number;
  incomingScore: number;
  outgoingEvents: number;
  incomingEvents: number;
  distinctDays: number;
  lastInteractionAt: string | null;
  actorAttention: number;
};

type RecommendationType =
  | "warm-follower-bridge"
  | "target-bestie"
  | "bestie-of-bestie"
  | "bridge-bestie"
  | "second-wave-large-target"
  | "second-wave-bestie";

type CandidatePath = {
  kind: RecommendationType;
  targetDid: string;
  targetHandle: string;
  viaDids: string[];
  viaHandles: string[];
  distanceAfterReciprocity: number;
  interactionStrength: number;
  tieConfidence: number;
  confidenceLevel: TieConfidenceLevel;
  attentionFromTarget: number;
  pathConfidence: number;
  weightedCost: number;
  stage: RelationshipStage;
};

type Candidate = {
  profile: Profile;
  types: Set<RecommendationType>;
  targetHandles: Set<string>;
  targetDids: Set<string>;
  paths: CandidatePath[];
  maxInteractionStrength: number;
  maxTieConfidence: number;
};

type ScoredRecommendation = {
  did: string;
  handle: string;
  displayName?: string;
  description?: string;
  avatar?: string;
  followersCount: number;
  followsCount: number;
  importanceScore: number;
  expectedBridgeValue: number;
  reciprocityPotential: number;
  shortestDistanceAfterReciprocity: number;
  weightedDistance: number;
  independentPaths: number;
  totalPaths: number;
  sharedTargetClusters: number;
  recommendationType: RecommendationType;
  types: RecommendationType[];
  targetHandles: string[];
  reason: string;
  strategy: string;
  paths: CandidatePath[];
  alreadyFollowsYou: boolean;
  following: boolean;
  followedBy: boolean;
  profileUrl: string;
  relationshipStage: RelationshipStage;
  tieConfidence: number;
  confidenceLevel: TieConfidenceLevel;
  visibilityPotential: number;
  topicalFit: number;
  marginalCoverage: number;
  humanFit: HumanFitLabel | null;
  destinationOnly: boolean;
};

type NeonResponse = { rows?: Array<Array<string | null>> };

type Calibration = { rate: number; sample: number };

type BridgeTarget = {
  targetDid: string;
  targetHandle: string;
  tieConfidence: number;
  interactionStrength: number;
  attentionFromTarget: number;
};

const profileCache = new Map<string, Profile>();
const relationshipCache = new Map<string, Relationship>();
const interactionMapCache = new Map<string, Map<string, InteractionEvidence>>();
const bestieCache = new Map<string, Tie[]>();
const followEdges = new Set<string>();
const interactionRecords = new Map<string, InteractionEvidence & { actorDid: string }>();

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
      await sleep(350);
      return xrpc<T>(method, params, false);
    }
    throw new Error(`Bluesky ${method} returned ${response.status}.`);
  }
  return (await response.json()) as T;
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>,
) {
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

async function getProfile(actor: string) {
  const cached = profileCache.get(actor);
  if (cached) return cached;
  const profile = await xrpc<Profile>("app.bsky.actor.getProfile", new URLSearchParams({ actor }));
  profileCache.set(profile.did, profile);
  profileCache.set(profile.handle, profile);
  return profile;
}

async function getProfiles(actors: string[]) {
  const unique = Array.from(new Set(actors.filter(Boolean)));
  const found: Profile[] = [];
  const missing: string[] = [];
  for (const actor of unique) {
    const cached = profileCache.get(actor);
    if (cached) found.push(cached);
    else missing.push(actor);
  }
  for (let index = 0; index < missing.length; index += PROFILE_BATCH_SIZE) {
    const params = new URLSearchParams();
    for (const actor of missing.slice(index, index + PROFILE_BATCH_SIZE)) params.append("actors", actor);
    const payload = await xrpc<{ profiles?: Profile[] }>("app.bsky.actor.getProfiles", params);
    for (const profile of payload.profiles ?? []) {
      profileCache.set(profile.did, profile);
      profileCache.set(profile.handle, profile);
      found.push(profile);
    }
  }
  return found;
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

function relationshipKey(actorDid: string, otherDid: string) {
  return `${actorDid}|${otherDid}`;
}

async function getRelationships(actorDid: string, others: string[]) {
  const unique = Array.from(new Set(others.filter((did) => did && did !== actorDid)));
  const result: Relationship[] = [];
  const missing: string[] = [];
  for (const did of unique) {
    const cached = relationshipCache.get(relationshipKey(actorDid, did));
    if (cached) result.push(cached);
    else missing.push(did);
  }
  for (let index = 0; index < missing.length; index += RELATIONSHIP_BATCH_SIZE) {
    const params = new URLSearchParams({ actor: actorDid });
    for (const did of missing.slice(index, index + RELATIONSHIP_BATCH_SIZE)) params.append("others", did);
    const payload = await xrpc<{ relationships?: Relationship[] }>(
      "app.bsky.graph.getRelationships",
      params,
    );
    for (const relationship of payload.relationships ?? []) {
      relationshipCache.set(relationshipKey(actorDid, relationship.did), relationship);
      result.push(relationship);
    }
  }
  return result;
}

function addFollowEdge(sourceDid: string, targetDid: string) {
  if (sourceDid && targetDid && sourceDid !== targetDid) followEdges.add(`${sourceDid}|${targetDid}`);
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
  if (follows > 150_000 && ratio > 2) return 22;
  if (follows > 75_000 && ratio > 1.5) return 14;
  if (follows > 30_000 && ratio > 2.5) return 9;
  return 0;
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

function addInteraction(
  map: Map<string, InteractionEvidence>,
  actorDid: string,
  peerDid: string | undefined,
  kind: "reply" | "repost" | "quote",
  createdAt?: string,
) {
  if (!peerDid || peerDid === actorDid) return;
  const current = map.get(peerDid) ?? {
    peerDid,
    replies: 0,
    reposts: 0,
    quotes: 0,
    events: 0,
    rawScore: 0,
    days: new Set<string>(),
    lastAt: null,
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
    if (Number.isFinite(date.getTime())) {
      current.days.add(date.toISOString().slice(0, 10));
      if (!current.lastAt || date.getTime() > new Date(current.lastAt).getTime()) {
        current.lastAt = date.toISOString();
      }
    }
  }
  map.set(peerDid, current);
}

async function interactionMap(actor: Profile) {
  const cached = interactionMapCache.get(actor.did);
  if (cached) return cached;
  const payload = await xrpc<{ feed?: FeedItem[] }>(
    "app.bsky.feed.getAuthorFeed",
    new URLSearchParams({ actor: actor.did, limit: String(FEED_LIMIT) }),
  );
  const map = new Map<string, InteractionEvidence>();
  for (const item of payload.feed ?? []) {
    const postAuthorDid = item.post?.author?.did;
    const createdAt = item.post?.record?.createdAt;
    if (item.reason?.by?.did === actor.did && postAuthorDid && postAuthorDid !== actor.did) {
      addInteraction(map, actor.did, postAuthorDid, "repost", createdAt);
    }
    if (postAuthorDid === actor.did) {
      addInteraction(map, actor.did, item.reply?.parent?.author?.did, "reply", createdAt);
      for (const quoted of embeddedAuthors(item.post?.embed)) {
        addInteraction(map, actor.did, quoted.did, "quote", createdAt);
      }
    }
  }
  interactionMapCache.set(actor.did, map);
  for (const evidence of map.values()) {
    interactionRecords.set(`${actor.did}|${evidence.peerDid}`, { ...evidence, actorDid: actor.did });
  }
  return map;
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
  if (!connectionString) throw new Error("Advanced Network storage is not configured.");
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
  if (!response.ok) throw new Error(`Advanced Network storage query failed with ${response.status}.`);
  return (await response.json()) as NeonResponse;
}

async function storedInteractions(actorDid: string, peerDids: string[]) {
  if (!peerDids.length) return new Map<string, StoredInteraction>();
  const result = await neonQuery(
    `SELECT peer_did,replies::text,reposts::text,quotes::text,interaction_score::text,
            window_start::text,window_end::text
     FROM public.advanced_network_interaction_scores
     WHERE actor_did=$1 AND peer_did=ANY($2::text[])`,
    [actorDid, `{${peerDids.map((did) => `"${did.replaceAll('"', '\\"')}"`).join(",")}}`],
  );
  return new Map(
    (result.rows ?? []).map((row) => [
      row[0] ?? "",
      {
        replies: Number(row[1] ?? 0),
        reposts: Number(row[2] ?? 0),
        quotes: Number(row[3] ?? 0),
        score: Number(row[4] ?? 0),
        windowStart: row[5] ?? null,
        windowEnd: row[6] ?? null,
      },
    ]),
  );
}

function latestDate(...values: Array<string | null | undefined>) {
  const valid = values.filter((value): value is string => Boolean(value));
  if (!valid.length) return null;
  return valid.sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0];
}

async function getBesties(actor: Profile, mode: "full" | "light" = "light") {
  const cacheKey = `${actor.did}|${mode}`;
  const cached = bestieCache.get(cacheKey);
  if (cached) return cached;

  const outgoingMap = await interactionMap(actor);
  const initial = [...outgoingMap.values()]
    .filter((item) => item.events >= 1)
    .sort((a, b) => b.rawScore - a.rawScore || b.events - a.events)
    .slice(0, 18);
  if (!initial.length) {
    bestieCache.set(cacheKey, []);
    return [];
  }

  const stored = await storedInteractions(actor.did, initial.map((item) => item.peerDid));
  const relationships = await getRelationships(actor.did, initial.map((item) => item.peerDid));
  const relationByDid = new Map(relationships.map((relationship) => [relationship.did, relationship]));
  const eligible = initial.filter((item) => {
    const relation = relationByDid.get(item.peerDid);
    const history = stored.get(item.peerDid);
    if (relation?.following) addFollowEdge(actor.did, item.peerDid);
    if (relation?.followedBy) addFollowEdge(item.peerDid, actor.did);
    return Boolean(
      relation?.following &&
        relation?.followedBy &&
        (item.events >= 2 || (history?.score ?? 0) >= 16),
    );
  });
  const peerProfiles = await getProfiles(eligible.map((item) => item.peerDid));
  const profileByDid = new Map(peerProfiles.map((profile) => [profile.did, profile]));
  const reverseIds = new Set(
    mode === "full" ? eligible.slice(0, FULL_REVERSE_CHECKS).map((item) => item.peerDid) : [],
  );

  const ties = await mapWithConcurrency(eligible, 3, async (outgoing) => {
    const profile = profileByDid.get(outgoing.peerDid);
    if (!profile) return null;
    let incoming: InteractionEvidence | undefined;
    if (reverseIds.has(profile.did)) {
      const peerMap = await interactionMap(profile);
      incoming = peerMap.get(actor.did);
    } else {
      incoming = interactionMapCache.get(profile.did)?.get(actor.did);
    }
    const history = stored.get(profile.did);
    const outgoingScore = Math.max(outgoing.rawScore, history?.score ?? 0);
    const incomingScore = incoming?.rawScore ?? 0;
    const lastAt = latestDate(outgoing.lastAt, incoming?.lastAt, history?.windowEnd);
    const recencyHours = lastAt
      ? Math.max(0, (Date.now() - new Date(lastAt).getTime()) / 3_600_000)
      : null;
    const confidence = calculateTieConfidence({
      mutual: true,
      outgoingScore,
      incomingScore,
      outgoingEvents: Math.max(outgoing.events, (history?.replies ?? 0) + (history?.reposts ?? 0) + (history?.quotes ?? 0)),
      incomingEvents: incoming?.events ?? 0,
      distinctDays: Math.max(outgoing.days.size, incoming?.days.size ?? 0),
      recencyHours,
    });
    const interactionStrength = clamp(
      outgoingScore * 0.46 +
        incomingScore * 0.42 +
        Math.min(16, (outgoing.days.size + (incoming?.days.size ?? 0)) * 3),
    );
    return {
      profile,
      confidence,
      confidenceLevel: confidenceLevel(confidence),
      interactionStrength,
      outgoingScore,
      incomingScore,
      outgoingEvents: outgoing.events,
      incomingEvents: incoming?.events ?? 0,
      distinctDays: outgoing.days.size + (incoming?.days.size ?? 0),
      lastInteractionAt: lastAt,
      actorAttention: outgoingScore,
    } satisfies Tie;
  });

  const result = ties
    .filter((tie): tie is Tie => Boolean(tie && tie.confidence >= 50))
    .sort(
      (a, b) =>
        b.confidence - a.confidence ||
        b.actorAttention - a.actorAttention ||
        profileInfluence(b.profile) - profileInfluence(a.profile),
    )
    .slice(0, BESTIES_PER_ACTOR);
  bestieCache.set(cacheKey, result);
  return result;
}

function addCandidate(candidates: Map<string, Candidate>, profile: Profile, path: CandidatePath) {
  const current = candidates.get(profile.did) ?? {
    profile,
    types: new Set<RecommendationType>(),
    targetHandles: new Set<string>(),
    targetDids: new Set<string>(),
    paths: [],
    maxInteractionStrength: 0,
    maxTieConfidence: 0,
  };
  current.profile = profile;
  current.types.add(path.kind);
  current.targetHandles.add(path.targetHandle);
  current.targetDids.add(path.targetDid);
  const key = `${path.kind}|${path.targetDid}|${path.viaDids.join(">")}`;
  if (!current.paths.some((existing) => `${existing.kind}|${existing.targetDid}|${existing.viaDids.join(">")}` === key)) {
    current.paths.push(path);
  }
  current.maxInteractionStrength = Math.max(current.maxInteractionStrength, path.interactionStrength);
  current.maxTieConfidence = Math.max(current.maxTieConfidence, path.tieConfidence);
  candidates.set(profile.did, current);
}

function makePath(input: {
  kind: RecommendationType;
  target: Profile;
  viaProfiles: Profile[];
  hops: number;
  tieConfidence: number;
  interactionStrength: number;
  attentionFromTarget?: number;
  stage?: RelationshipStage;
}) {
  const pathConfidence = clamp(
    input.tieConfidence * 0.68 +
      input.interactionStrength * 0.22 +
      Math.min(10, (input.attentionFromTarget ?? 0) * 0.1),
  );
  return {
    kind: input.kind,
    targetDid: input.target.did,
    targetHandle: input.target.handle,
    viaDids: input.viaProfiles.map((profile) => profile.did),
    viaHandles: input.viaProfiles.map((profile) => profile.handle),
    distanceAfterReciprocity: input.hops,
    interactionStrength: input.interactionStrength,
    tieConfidence: input.tieConfidence,
    confidenceLevel: confidenceLevel(input.tieConfidence),
    attentionFromTarget: input.attentionFromTarget ?? 0,
    pathConfidence,
    weightedCost: calculateWeightedPathCost(input.hops, pathConfidence),
    stage: input.stage ?? (pathConfidence >= 66 ? "active" : "structural"),
  } satisfies CandidatePath;
}

function directEvidenceStage(
  relation: Relationship | undefined,
  outgoing: InteractionEvidence | undefined,
  incoming: InteractionEvidence | undefined,
  pathStage: RelationshipStage,
) {
  const following = Boolean(relation?.following);
  const followedBy = Boolean(relation?.followedBy);
  const events = (outgoing?.events ?? 0) + (incoming?.events ?? 0);
  if (following && followedBy) return "converted" as const;
  if (events >= 2 || (followedBy && relationshipStageRank(pathStage) >= 1)) return "activated" as const;
  if (relationshipStageRank(pathStage) >= 1) return "active" as const;
  return "structural" as const;
}

function reciprocityPotential(
  profile: Profile,
  followedBy: boolean,
  following: boolean,
  sharedTargets: number,
  directInteractionStrength: number,
  humanFit: HumanFitLabel | null,
) {
  let value = 22;
  if (followedBy) value += 50;
  if (following) value += 6;
  const followers = Math.max(1, profile.followersCount ?? 0);
  const follows = Math.max(0, profile.followsCount ?? 0);
  if (follows >= followers * 0.8) value += 10;
  else if (follows >= followers * 0.3) value += 5;
  if (followers >= 100_000 && !followedBy) value -= 13;
  if (sharedTargets >= 2) value += 7;
  if (directInteractionStrength >= 25) value += 8;
  if (humanFit === "already-know" || humanFit === "worth-cultivating") value += 6;
  return clamp(value);
}

function topicalFit(profile: Profile, categories: string[]) {
  if (!categories.length) return 62;
  const haystack = `${profile.handle} ${profile.displayName ?? ""} ${profile.description ?? ""}`.toLowerCase();
  const matches = categories.filter((category) =>
    (CATEGORY_KEYWORDS[category] ?? [category.replaceAll("-", " ")]).some((keyword) => haystack.includes(keyword)),
  );
  if (!matches.length) return 24;
  return clamp(48 + matches.length * 18 + (matches.length === categories.length ? 10 : 0));
}

function visibilityPotential(profile: Profile, direct: InteractionEvidence | undefined, paths: CandidatePath[]) {
  const publicAction =
    (direct?.quotes ?? 0) * 12 +
    (direct?.reposts ?? 0) * 8 +
    (direct?.replies ?? 0) * 5;
  const pathAttention = Math.max(0, ...paths.map((path) => path.attentionFromTarget));
  const reach = Math.log10(Math.max(0, profile.followersCount ?? 0) + 10) * 8;
  return clamp(publicAction + pathAttention * 0.35 + reach);
}

function primaryType(types: Set<RecommendationType>) {
  const priority: RecommendationType[] = [
    "warm-follower-bridge",
    "target-bestie",
    "bridge-bestie",
    "bestie-of-bestie",
    "second-wave-bestie",
    "second-wave-large-target",
  ];
  return priority.find((type) => types.has(type)) ?? "bestie-of-bestie";
}

function reasonFor(
  candidate: Candidate,
  type: RecommendationType,
  stage: RelationshipStage,
  independentPaths: number,
) {
  const targets = [...candidate.targetHandles].slice(0, 3).map((handle) => `@${handle}`).join(", ");
  if (type === "warm-follower-bridge") {
    return `A reachable bridge already connected to you and ${targets}. ${independentPaths} node-independent route${independentPaths === 1 ? "" : "s"} make this more than a vanity follow.`;
  }
  if (type === "target-bestie") {
    return `A ${confidenceLevel(candidate.maxTieConfidence)} target-circle relationship with visible reciprocal interaction around ${targets}. The destination pays some attention to this person.`;
  }
  if (type === "bridge-bestie") {
    return `This person sits inside a verified bridge account's active circle and adds a separate route toward ${targets}.`;
  }
  if (type === "second-wave-bestie") {
    return `A close interaction tie around a second-wave destination unlocked by a ${stage} round-one foothold.`;
  }
  if (type === "second-wave-large-target") {
    return `A second-wave destination discovered from a round-one foothold that was already activated or converted. It is a goal, not a daily engagement task.`;
  }
  return `A socially verified bestie-of-bestie route toward ${targets}. Confidence is discounted for the additional inferred hop.`;
}

function strategyFor(
  candidate: Candidate,
  type: RecommendationType,
  followedBy: boolean,
  stage: RelationshipStage,
) {
  const bestPath = [...candidate.paths].sort(
    (a, b) => a.weightedCost - b.weightedCost || b.pathConfidence - a.pathConfidence,
  )[0];
  const nearer = bestPath?.viaHandles.slice(1, -1).map((handle) => `@${handle}`).join(" → ");
  if (type === "second-wave-large-target") {
    return "Treat this as a destination only. Continue developing the validated foothold and the destination's reachable circle instead of cold-replying to the large account.";
  }
  if (followedBy && stage !== "converted") {
    return `Follow back first, then interact naturally with a relevant post. They already opened the door; use that low-friction relationship before expanding through ${nearer || "their target circle"}.`;
  }
  if (stage === "converted") {
    return `This relationship is already reciprocal. Keep it warm with occasional substantive interaction and let repeated public overlap build social proof toward ${bestPath ? `@${bestPath.targetHandle}` : "the destination"}.`;
  }
  if (type === "target-bestie") {
    return "Engage this person directly on something genuinely relevant. The objective is repeated recognition inside the destination's circle, not asking for an introduction or pitching yourself.";
  }
  return `Cultivate the nearest reachable people on the path${nearer ? ` (${nearer})` : ""}. Favor real replies and shared conversations over generic likes or rapid-fire engagement.`;
}

async function ensureAccount(actor: Profile) {
  const result = await neonQuery(
    `INSERT INTO public.advanced_network_accounts (bluesky_did,handle,display_name,access_status,plan)
     VALUES ($1,$2,$3,'approved','beta')
     ON CONFLICT (bluesky_did) DO UPDATE SET handle=EXCLUDED.handle,display_name=EXCLUDED.display_name,updated_at=now()
     RETURNING id::text`,
    [actor.did, actor.handle, actor.displayName ?? null],
  );
  const id = result.rows?.[0]?.[0];
  if (!id) throw new Error("Could not initialize the Advanced Network account.");
  return id;
}

async function ensureCampaign(
  accountId: string,
  targets: Profile[],
  scope: StartingNetworkScope,
  categories: string[],
  goal: NetworkGoal,
) {
  const targetHandles = targets.map((target) => target.handle);
  const targetJson = JSON.stringify(targetHandles);
  const existing = await neonQuery(
    `SELECT id::text FROM public.advanced_network_campaigns
     WHERE account_id=$1::uuid AND status='active' AND target_mode='profiles'
       AND explicit_targets=$2::jsonb AND starting_network_scope=$3
     ORDER BY updated_at DESC LIMIT 1`,
    [accountId, targetJson, scope],
  );
  if (existing.rows?.[0]?.[0]) return existing.rows[0][0];
  const name = `Evidence expansion · ${targetHandles.slice(0, 2).map((handle) => `@${handle}`).join(" + ")}${targetHandles.length > 2 ? ` +${targetHandles.length - 2}` : ""}`;
  const inserted = await neonQuery(
    `INSERT INTO public.advanced_network_campaigns
       (account_id,name,target_mode,starting_network_scope,categories,explicit_targets,max_explicit_targets,compute_budget,status)
     VALUES ($1::uuid,$2,'profiles',$3,$4::jsonb,$5::jsonb,10,100,'active')
     RETURNING id::text`,
    [accountId, name, scope, JSON.stringify([...categories, `goal:${goal}`]), targetJson],
  );
  const id = inserted.rows?.[0]?.[0];
  if (!id) throw new Error("Could not create the target campaign.");
  return id;
}

async function createRun(campaignId: string, config: Record<string, unknown>) {
  const result = await neonQuery(
    `INSERT INTO public.advanced_network_runs (campaign_id,status,wave,config,started_at)
     VALUES ($1::uuid,'running',1,$2::jsonb,now()) RETURNING id::text`,
    [campaignId, JSON.stringify(config)],
  );
  const id = result.rows?.[0]?.[0];
  if (!id) throw new Error("Could not create the analysis run.");
  return id;
}

async function loadHumanFit(accountId: string) {
  const result = await neonQuery(
    `SELECT DISTINCT ON (target_did) target_did,metadata->>'humanFit'
     FROM public.advanced_network_recommendations
     WHERE account_id=$1::uuid AND metadata ? 'humanFit'
     ORDER BY target_did,updated_at DESC`,
    [accountId],
  );
  return new Map(
    (result.rows ?? [])
      .filter((row) => row[0] && row[1])
      .map((row) => [row[0] as string, row[1] as HumanFitLabel]),
  );
}

async function loadCalibration(accountId: string) {
  const result = await neonQuery(
    `SELECT recommendation_type,
            COUNT(*)::text,
            COUNT(*) FILTER (WHERE state='followed_back')::text
     FROM public.advanced_network_recommendations
     WHERE account_id=$1::uuid
     GROUP BY recommendation_type`,
    [accountId],
  );
  return new Map(
    (result.rows ?? []).map((row) => {
      const sample = Number(row[1] ?? 0);
      const successes = Number(row[2] ?? 0);
      return [
        row[0] ?? "",
        { sample, rate: ((successes + 2) / (sample + 4)) * 100 } satisfies Calibration,
      ];
    }),
  );
}

async function persistProfiles() {
  const unique = new Map<string, Profile>();
  for (const profile of profileCache.values()) unique.set(profile.did, profile);
  const rows = [...unique.values()].map((profile) => ({
    did: profile.did,
    handle: profile.handle,
    display_name: profile.displayName ?? null,
    description: profile.description ?? null,
    avatar: profile.avatar ?? null,
    followers_count: Math.max(0, profile.followersCount ?? 0),
    follows_count: Math.max(0, profile.followsCount ?? 0),
    posts_count: Math.max(0, profile.postsCount ?? 0),
    profile_json: profile,
  }));
  if (!rows.length) return;
  await neonQuery(
    `INSERT INTO public.advanced_network_profiles
       (did,handle,display_name,description,avatar,followers_count,follows_count,posts_count,profile_json,observed_at,updated_at)
     SELECT x.did,x.handle,x.display_name,x.description,x.avatar,x.followers_count,x.follows_count,x.posts_count,x.profile_json,now(),now()
     FROM jsonb_to_recordset($1::jsonb) AS x(
       did text,handle text,display_name text,description text,avatar text,
       followers_count integer,follows_count integer,posts_count integer,profile_json jsonb)
     ON CONFLICT (did) DO UPDATE SET
       handle=EXCLUDED.handle,display_name=EXCLUDED.display_name,description=EXCLUDED.description,
       avatar=EXCLUDED.avatar,followers_count=EXCLUDED.followers_count,follows_count=EXCLUDED.follows_count,
       posts_count=EXCLUDED.posts_count,profile_json=EXCLUDED.profile_json,observed_at=now(),updated_at=now()`,
    [JSON.stringify(rows)],
  );
}

async function persistEdges() {
  const rows = [...followEdges].map((edge) => {
    const [source_did, target_did] = edge.split("|");
    return { source_did, target_did };
  });
  if (!rows.length) return;
  await neonQuery(
    `INSERT INTO public.advanced_network_follow_edges (source_did,target_did,active,first_seen_at,last_seen_at)
     SELECT x.source_did,x.target_did,true,now(),now()
     FROM jsonb_to_recordset($1::jsonb) AS x(source_did text,target_did text)
     ON CONFLICT (source_did,target_did) DO UPDATE SET active=true,last_seen_at=now()`,
    [JSON.stringify(rows)],
  );
}

async function persistInteractions() {
  const rows = [...interactionRecords.values()].map((item) => ({
    actor_did: item.actorDid,
    peer_did: item.peerDid,
    replies: item.replies,
    reposts: item.reposts,
    quotes: item.quotes,
    interaction_score: item.rawScore,
    window_start: item.days.size ? [...item.days].sort()[0] : null,
    window_end: item.lastAt,
  }));
  if (!rows.length) return;
  await neonQuery(
    `INSERT INTO public.advanced_network_interaction_scores
       (actor_did,peer_did,replies,reposts,quotes,interaction_score,window_start,window_end,updated_at)
     SELECT x.actor_did,x.peer_did,x.replies,x.reposts,x.quotes,x.interaction_score,
            x.window_start::timestamptz,x.window_end::timestamptz,now()
     FROM jsonb_to_recordset($1::jsonb) AS x(
       actor_did text,peer_did text,replies integer,reposts integer,quotes integer,
       interaction_score numeric,window_start text,window_end text)
     ON CONFLICT (actor_did,peer_did) DO UPDATE SET
       replies=GREATEST(advanced_network_interaction_scores.replies,EXCLUDED.replies),
       reposts=GREATEST(advanced_network_interaction_scores.reposts,EXCLUDED.reposts),
       quotes=GREATEST(advanced_network_interaction_scores.quotes,EXCLUDED.quotes),
       interaction_score=GREATEST(advanced_network_interaction_scores.interaction_score,EXCLUDED.interaction_score),
       window_start=LEAST(COALESCE(advanced_network_interaction_scores.window_start,EXCLUDED.window_start),COALESCE(EXCLUDED.window_start,advanced_network_interaction_scores.window_start)),
       window_end=GREATEST(COALESCE(advanced_network_interaction_scores.window_end,EXCLUDED.window_end),COALESCE(EXCLUDED.window_end,advanced_network_interaction_scores.window_end)),
       updated_at=now()`,
    [JSON.stringify(rows)],
  );
}

async function persistTargets(campaignId: string, targets: Profile[], wave: number, sourceKind: string) {
  const rows = targets.map((target) => ({
    target_did: target.did,
    target_handle: target.handle,
    metadata: {
      displayName: target.displayName,
      followersCount: target.followersCount ?? 0,
      followsCount: target.followsCount ?? 0,
    },
  }));
  if (!rows.length) return;
  await neonQuery(
    `INSERT INTO public.advanced_network_targets
       (campaign_id,target_did,target_handle,source_kind,wave,status,priority_score,metadata,updated_at)
     SELECT $1::uuid,x.target_did,x.target_handle,$3,$4,'active',0,x.metadata,now()
     FROM jsonb_to_recordset($2::jsonb) AS x(target_did text,target_handle text,metadata jsonb)
     ON CONFLICT (campaign_id,target_did,wave) DO UPDATE SET
       target_handle=EXCLUDED.target_handle,status='active',source_kind=EXCLUDED.source_kind,
       metadata=EXCLUDED.metadata,updated_at=now()`,
    [campaignId, JSON.stringify(rows), sourceKind, String(wave)],
  );
}

async function persistRecommendations(
  accountId: string,
  campaignId: string,
  runId: string,
  goal: NetworkGoal,
  recommendations: ScoredRecommendation[],
) {
  if (!recommendations.length) return;
  const rows = recommendations.map((item) => ({
    target_did: item.did,
    target_handle: item.handle,
    recommendation_type: item.recommendationType,
    reason: item.reason,
    importance_score: item.importanceScore,
    shortest_mutual_distance: item.shortestDistanceAfterReciprocity,
    independent_paths: item.independentPaths,
    shared_bestie_clusters: item.sharedTargetClusters,
    follow_back_likelihood: item.reciprocityPotential,
    category_relevance: item.topicalFit,
    state: item.following && item.followedBy ? "followed_back" : item.following ? "followed" : "recommended",
    metadata: {
      engine: "evidence-weighted-v2",
      goal,
      types: item.types,
      targetHandles: item.targetHandles,
      paths: item.paths,
      strategy: item.strategy,
      profileUrl: item.profileUrl,
      followersCount: item.followersCount,
      followsCount: item.followsCount,
      alreadyFollowsYou: item.alreadyFollowsYou,
      expectedBridgeValue: item.expectedBridgeValue,
      weightedDistance: item.weightedDistance,
      nodeIndependentPaths: item.independentPaths,
      totalPaths: item.totalPaths,
      relationshipStage: item.relationshipStage,
      tieConfidence: item.tieConfidence,
      confidenceLevel: item.confidenceLevel,
      visibilityPotential: item.visibilityPotential,
      topicalFit: item.topicalFit,
      marginalCoverage: item.marginalCoverage,
      destinationOnly: item.destinationOnly,
      humanFit: item.humanFit,
    },
  }));
  await neonQuery(
    `INSERT INTO public.advanced_network_recommendations
       (account_id,campaign_id,run_id,target_did,target_handle,recommendation_type,reason,
        importance_score,shortest_mutual_distance,independent_paths,shared_bestie_clusters,
        follow_back_likelihood,category_relevance,state,recommended_at,followed_at,followed_back_at,metadata,updated_at)
     SELECT $1::uuid,$2::uuid,$3::uuid,x.target_did,x.target_handle,x.recommendation_type,x.reason,
            x.importance_score,x.shortest_mutual_distance,x.independent_paths,x.shared_bestie_clusters,
            x.follow_back_likelihood,x.category_relevance,x.state,now(),
            CASE WHEN x.state IN ('followed','followed_back') THEN now() ELSE NULL END,
            CASE WHEN x.state='followed_back' THEN now() ELSE NULL END,x.metadata,now()
     FROM jsonb_to_recordset($4::jsonb) AS x(
       target_did text,target_handle text,recommendation_type text,reason text,
       importance_score numeric,shortest_mutual_distance integer,independent_paths integer,
       shared_bestie_clusters integer,follow_back_likelihood numeric,category_relevance numeric,
       state text,metadata jsonb)
     ON CONFLICT (account_id,campaign_id,target_did) DO UPDATE SET
       run_id=EXCLUDED.run_id,target_handle=EXCLUDED.target_handle,recommendation_type=EXCLUDED.recommendation_type,
       reason=EXCLUDED.reason,importance_score=EXCLUDED.importance_score,
       shortest_mutual_distance=EXCLUDED.shortest_mutual_distance,independent_paths=EXCLUDED.independent_paths,
       shared_bestie_clusters=EXCLUDED.shared_bestie_clusters,follow_back_likelihood=EXCLUDED.follow_back_likelihood,
       category_relevance=EXCLUDED.category_relevance,
       state=CASE
         WHEN EXCLUDED.state='followed_back' THEN 'followed_back'
         WHEN EXCLUDED.state='followed' AND advanced_network_recommendations.state<>'followed_back' THEN 'followed'
         ELSE advanced_network_recommendations.state
       END,
       followed_at=CASE WHEN EXCLUDED.state IN ('followed','followed_back') THEN COALESCE(advanced_network_recommendations.followed_at,now()) ELSE advanced_network_recommendations.followed_at END,
       followed_back_at=CASE WHEN EXCLUDED.state='followed_back' THEN COALESCE(advanced_network_recommendations.followed_back_at,now()) ELSE advanced_network_recommendations.followed_back_at END,
       metadata=EXCLUDED.metadata || CASE
         WHEN advanced_network_recommendations.metadata ? 'humanFit'
         THEN jsonb_build_object('humanFit',advanced_network_recommendations.metadata->'humanFit')
         ELSE '{}'::jsonb END,
       updated_at=now()`,
    [accountId, campaignId, runId, JSON.stringify(rows)],
  );
}

async function finishRun(runId: string, metrics: Record<string, unknown>, status = "completed", error?: string) {
  await neonQuery(
    `UPDATE public.advanced_network_runs
     SET status=$2,metrics=$3::jsonb,error_message=$4,completed_at=now()
     WHERE id=$1::uuid`,
    [runId, status, JSON.stringify(metrics), error ?? null],
  );
}

function relationStageFromPaths(paths: CandidatePath[]) {
  return bestRelationshipStage(paths.map((path) => path.stage));
}

function portfolioOrder(targets: Profile[]) {
  const reachable = targets.filter((target) => (target.followersCount ?? 0) < 100_000);
  const aspirational = targets.filter(
    (target) => (target.followersCount ?? 0) >= 100_000 && (target.followersCount ?? 0) < 1_000_000,
  );
  const moonshots = targets.filter((target) => (target.followersCount ?? 0) >= 1_000_000);
  return [
    ...reachable.sort((a, b) => profileInfluence(b) - profileInfluence(a)).slice(0, 3),
    ...aspirational.sort((a, b) => profileInfluence(b) - profileInfluence(a)).slice(0, 3),
    ...moonshots.sort((a, b) => profileInfluence(b) - profileInfluence(a)).slice(0, 2),
  ].slice(0, MAX_DEEP_TARGETS);
}

export async function runAdvancedNetworkAnalysisV2(request: NextRequest) {
  let runId = "";
  try {
    if (!(await hasAdvancedNetworkAccess())) {
      return NextResponse.json({ error: "Private beta access is required." }, { status: 403 });
    }

    profileCache.clear();
    relationshipCache.clear();
    interactionMapCache.clear();
    bestieCache.clear();
    followEdges.clear();
    interactionRecords.clear();

    const body = (await request.json()) as {
      actor?: string;
      targets?: string[];
      categories?: string[];
      scope?: StartingNetworkScope;
      goal?: string;
    };
    const actorInput = normalize(String(body.actor ?? ""));
    if (!actorInput) return NextResponse.json({ error: "Connect a Bluesky account first." }, { status: 400 });

    const scope: StartingNetworkScope = body.scope === "mutuals-only" ? "mutuals-only" : "all-followers";
    const categories = Array.from(new Set((body.categories ?? []).map(String))).slice(0, 8);
    const goal = normalizeNetworkGoal(
      String(body.goal ?? request.cookies.get("advanced-network-goal")?.value ?? "balanced"),
    );
    const actor = await getProfile(actorInput);
    const requestedTargets = Array.from(
      new Set((body.targets ?? []).map((value) => normalize(String(value))).filter(Boolean)),
    ).slice(0, MAX_DEEP_TARGETS);
    if (!requestedTargets.length) {
      return NextResponse.json({ error: "No destination accounts were supplied for analysis." }, { status: 400 });
    }

    const resolvedTargets = (await getProfiles(requestedTargets)).filter((profile) => profile.did !== actor.did);
    const targets = portfolioOrder(resolvedTargets);
    if (!targets.length) return NextResponse.json({ error: "No valid target profiles were found." }, { status: 400 });

    const accountId = await ensureAccount(actor);
    const [humanFit, calibration] = await Promise.all([
      loadHumanFit(accountId),
      loadCalibration(accountId),
    ]);
    const campaignId = await ensureCampaign(accountId, targets, scope, categories, goal);
    await persistTargets(campaignId, targets, 1, "evidence-v2-destination");
    runId = await createRun(campaignId, {
      scope,
      categories,
      goal,
      targets: targets.map((target) => target.handle),
      engine: "evidence-weighted-v2",
      feedLimit: FEED_LIMIT,
    });

    const [followerStubs, userInteractionMap, targetBestieSets] = await Promise.all([
      getFollowers(actor.did),
      interactionMap(actor),
      Promise.all(targets.map(async (target) => ({ target, besties: await getBesties(target, "full") }))),
    ]);
    const followerProfiles = await getProfiles(followerStubs.map((profile) => profile.did));
    const followerByDid = new Map(followerProfiles.map((profile) => [profile.did, profile]));
    const followers = followerStubs.map((stub) => ({ ...stub, ...(followerByDid.get(stub.did) ?? {}) }));
    const userFollowerRelationships = await getRelationships(actor.did, followers.map((profile) => profile.did));
    const userFollowerRelationByDid = new Map(userFollowerRelationships.map((relationship) => [relationship.did, relationship]));
    for (const relationship of userFollowerRelationships) {
      if (relationship.following) addFollowEdge(actor.did, relationship.did);
      if (relationship.followedBy) addFollowEdge(relationship.did, actor.did);
    }

    const startingPool = followers
      .map((profile) => {
        const relation = userFollowerRelationByDid.get(profile.did);
        const mutual = Boolean(relation?.following && relation?.followedBy);
        const direct = userInteractionMap.get(profile.did);
        const warmth = (direct?.rawScore ?? 0) * 2 + (direct?.events ?? 0) * 3;
        return {
          profile,
          relation,
          mutual,
          score: profileInfluence(profile, mutual) + Math.min(35, warmth) - massFollowPenalty(profile),
        };
      })
      .filter((item) => scope === "all-followers" || item.mutual)
      .sort((a, b) => b.score - a.score)
      .slice(0, STARTING_POOL_CAP);

    const targetBestiesByTarget = new Map(
      targetBestieSets.map(({ target, besties }) => [
        target.did,
        new Map(besties.map((bestie) => [bestie.profile.did, bestie])),
      ]),
    );
    const candidates = new Map<string, Candidate>();
    const targetDids = new Set(targets.map((target) => target.did));
    const bridgeTargets = new Map<string, BridgeTarget[]>();

    await Promise.all(
      targets.map(async (target) => {
        const relationships = await getRelationships(target.did, startingPool.map((item) => item.profile.did));
        const bestieMap = targetBestiesByTarget.get(target.did) ?? new Map<string, Tie>();
        for (const relationship of relationships) {
          if (relationship.following) addFollowEdge(target.did, relationship.did);
          if (relationship.followedBy) addFollowEdge(relationship.did, target.did);
          if (!(relationship.following && relationship.followedBy)) continue;
          const starting = startingPool.find((item) => item.profile.did === relationship.did);
          if (!starting) continue;
          const tie = bestieMap.get(starting.profile.did);
          const tieConfidence = tie?.confidence ?? 48;
          const interactionStrength = tie?.interactionStrength ?? 20;
          const bridge: BridgeTarget = {
            targetDid: target.did,
            targetHandle: target.handle,
            tieConfidence,
            interactionStrength,
            attentionFromTarget: tie?.actorAttention ?? 0,
          };
          const list = bridgeTargets.get(starting.profile.did) ?? [];
          list.push(bridge);
          bridgeTargets.set(starting.profile.did, list);
          const userPathStage: RelationshipStage = starting.mutual
            ? "converted"
            : starting.relation?.followedBy
              ? "activated"
              : tieConfidence >= 60
                ? "active"
                : "structural";
          addCandidate(
            candidates,
            starting.profile,
            makePath({
              kind: "warm-follower-bridge",
              target,
              viaProfiles: [starting.profile, target],
              hops: 2,
              tieConfidence,
              interactionStrength,
              attentionFromTarget: tie?.actorAttention ?? 0,
              stage: userPathStage,
            }),
          );
        }
      }),
    );

    for (const { target, besties } of targetBestieSets) {
      for (const tie of besties) {
        if (tie.profile.did === actor.did || targetDids.has(tie.profile.did)) continue;
        addCandidate(
          candidates,
          tie.profile,
          makePath({
            kind: "target-bestie",
            target,
            viaProfiles: [tie.profile, target],
            hops: 2,
            tieConfidence: tie.confidence,
            interactionStrength: tie.interactionStrength,
            attentionFromTarget: tie.actorAttention,
            stage: tie.confidence >= 66 ? "active" : "structural",
          }),
        );
      }
    }

    const firstHopAnchors = targetBestieSets
      .flatMap(({ target, besties }) => besties.slice(0, 2).map((tie) => ({ target, tie })))
      .sort((a, b) => b.tie.confidence - a.tie.confidence)
      .slice(0, FIRST_HOP_EXPANSIONS);
    const secondHopResults = await mapWithConcurrency(firstHopAnchors, 3, async ({ target, tie }) => ({
      target,
      anchor: tie,
      besties: await getBesties(tie.profile, "light"),
    }));
    for (const { target, anchor, besties } of secondHopResults) {
      for (const tie of besties) {
        if (tie.profile.did === actor.did || targetDids.has(tie.profile.did) || tie.profile.did === anchor.profile.did) continue;
        const confidence = clamp(Math.min(anchor.confidence, tie.confidence) * 0.86);
        addCandidate(
          candidates,
          tie.profile,
          makePath({
            kind: "bestie-of-bestie",
            target,
            viaProfiles: [tie.profile, anchor.profile, target],
            hops: 3,
            tieConfidence: confidence,
            interactionStrength: clamp((anchor.interactionStrength + tie.interactionStrength) / 2),
            attentionFromTarget: anchor.actorAttention,
            stage: confidence >= 62 ? "active" : "structural",
          }),
        );
      }
    }

    const bridgeAnchors = [...bridgeTargets.entries()]
      .map(([did, targetLinks]) => ({
        profile: startingPool.find((item) => item.profile.did === did)?.profile,
        targetLinks,
      }))
      .filter((item): item is { profile: Profile; targetLinks: BridgeTarget[] } => Boolean(item.profile))
      .sort(
        (a, b) =>
          b.targetLinks.length - a.targetLinks.length ||
          Math.max(...b.targetLinks.map((link) => link.tieConfidence)) -
            Math.max(...a.targetLinks.map((link) => link.tieConfidence)),
      )
      .slice(0, BRIDGE_EXPANSIONS);
    const bridgeBestieResults = await mapWithConcurrency(bridgeAnchors, 3, async (bridge) => ({
      bridge,
      besties: await getBesties(bridge.profile, "light"),
    }));
    for (const { bridge, besties } of bridgeBestieResults) {
      for (const tie of besties) {
        if (tie.profile.did === actor.did || targetDids.has(tie.profile.did)) continue;
        for (const targetLink of bridge.targetLinks) {
          const target = targets.find((item) => item.did === targetLink.targetDid);
          if (!target) continue;
          const confidence = clamp(Math.min(targetLink.tieConfidence, tie.confidence) * 0.88);
          addCandidate(
            candidates,
            tie.profile,
            makePath({
              kind: "bridge-bestie",
              target,
              viaProfiles: [tie.profile, bridge.profile, target],
              hops: 3,
              tieConfidence: confidence,
              interactionStrength: clamp((targetLink.interactionStrength + tie.interactionStrength) / 2),
              attentionFromTarget: targetLink.attentionFromTarget,
              stage: confidence >= 62 ? "active" : "structural",
            }),
          );
        }
      }
    }

    let candidateDids = [...candidates.keys()];
    let userCandidateRelationships = await getRelationships(actor.did, candidateDids);
    let userCandidateRelationByDid = new Map(userCandidateRelationships.map((relationship) => [relationship.did, relationship]));
    for (const relationship of userCandidateRelationships) {
      if (relationship.following) addFollowEdge(actor.did, relationship.did);
      if (relationship.followedBy) addFollowEdge(relationship.did, actor.did);
    }

    function candidateStage(candidate: Candidate) {
      const relation = userCandidateRelationByDid.get(candidate.profile.did);
      const outgoing = userInteractionMap.get(candidate.profile.did);
      const incoming = interactionMapCache.get(candidate.profile.did)?.get(actor.did);
      return directEvidenceStage(relation, outgoing, incoming, relationStageFromPaths(candidate.paths));
    }

    const preliminary = [...candidates.values()]
      .map((candidate) => {
        const relation = userCandidateRelationByDid.get(candidate.profile.did);
        const stage = candidateStage(candidate);
        const human = humanFit.get(candidate.profile.did) ?? null;
        const independent = countNodeIndependentPaths(candidate.paths);
        const type = primaryType(candidate.types);
        const reciprocity = reciprocityPotential(
          candidate.profile,
          Boolean(relation?.followedBy),
          Boolean(relation?.following),
          candidate.targetHandles.size,
          userInteractionMap.get(candidate.profile.did)?.rawScore ?? 0,
          human,
        );
        const score = calculateExpectedBridgeValue(
          {
            weightedDistance: Math.min(...candidate.paths.map((path) => path.weightedCost)),
            nodeIndependentPaths: independent,
            destinationClusters: candidate.targetHandles.size,
            tieConfidence: candidate.maxTieConfidence,
            interactionStrength: candidate.maxInteractionStrength,
            reciprocityPotential: reciprocity,
            visibilityPotential: visibilityPotential(
              candidate.profile,
              userInteractionMap.get(candidate.profile.did),
              candidate.paths,
            ),
            topicalFit: topicalFit(candidate.profile, categories),
            marginalCoverage: 70,
            followersCount: candidate.profile.followersCount ?? 0,
            stage,
            humanFit: human,
            historicalConversionRate: calibration.get(type)?.rate ?? 50,
            spamPenalty: massFollowPenalty(candidate.profile),
          },
          goal,
        );
        return { candidate, stage, score, human };
      })
      .filter((item) => !["not-for-me", "not-my-audience", "destination-only"].includes(item.human ?? ""))
      .sort((a, b) => b.score - a.score);

    const eligibleFootholds = preliminary
      .filter(
        (item) =>
          relationshipStageRank(item.stage) >= relationshipStageRank("activated") &&
          item.score >= 52,
      )
      .slice(0, ROUND_TWO_FOOTHOLDS);

    const secondWaveProposalMap = new Map<string, { profile: Profile; tie: Tie; foothold: Profile }>();
    const footholdExpansions = await mapWithConcurrency(eligibleFootholds, 2, async ({ candidate }) => ({
      foothold: candidate.profile,
      ties: await getBesties(candidate.profile, "full"),
    }));
    for (const { foothold, ties } of footholdExpansions) {
      for (const tie of ties) {
        if (
          targetDids.has(tie.profile.did) ||
          tie.profile.did === actor.did ||
          (tie.profile.followersCount ?? 0) < SECOND_WAVE_MIN_FOLLOWERS
        ) {
          continue;
        }
        const existing = secondWaveProposalMap.get(tie.profile.did);
        if (!existing || tie.confidence > existing.tie.confidence) {
          secondWaveProposalMap.set(tie.profile.did, { profile: tie.profile, tie, foothold });
        }
      }
    }
    const secondWaveTargets = [...secondWaveProposalMap.values()]
      .sort(
        (a, b) =>
          b.tie.confidence - a.tie.confidence ||
          profileInfluence(b.profile) - profileInfluence(a.profile),
      )
      .slice(0, SECOND_WAVE_TARGETS);

    for (const proposal of secondWaveTargets) {
      const sourceCandidate = candidates.get(proposal.foothold.did);
      const sourceTarget = targets.find((target) => sourceCandidate?.targetDids.has(target.did)) ?? proposal.profile;
      addCandidate(
        candidates,
        proposal.profile,
        makePath({
          kind: "second-wave-large-target",
          target: sourceTarget,
          viaProfiles: [proposal.profile, proposal.foothold, sourceTarget],
          hops: 3,
          tieConfidence: proposal.tie.confidence,
          interactionStrength: proposal.tie.interactionStrength,
          attentionFromTarget: proposal.tie.actorAttention,
          stage: "activated",
        }),
      );
      const secondWaveBesties = await getBesties(proposal.profile, "full");
      for (const tie of secondWaveBesties) {
        if (tie.profile.did === actor.did || targetDids.has(tie.profile.did) || tie.profile.did === proposal.profile.did) continue;
        addCandidate(
          candidates,
          tie.profile,
          makePath({
            kind: "second-wave-bestie",
            target: proposal.profile,
            viaProfiles: [tie.profile, proposal.profile],
            hops: 2,
            tieConfidence: tie.confidence,
            interactionStrength: tie.interactionStrength,
            attentionFromTarget: tie.actorAttention,
            stage: tie.confidence >= 66 ? "active" : "structural",
          }),
        );
      }
    }

    candidateDids = [...candidates.keys()];
    userCandidateRelationships = await getRelationships(actor.did, candidateDids);
    userCandidateRelationByDid = new Map(userCandidateRelationships.map((relationship) => [relationship.did, relationship]));
    for (const relationship of userCandidateRelationships) {
      if (relationship.following) addFollowEdge(actor.did, relationship.did);
      if (relationship.followedBy) addFollowEdge(relationship.did, actor.did);
    }

    const targetCandidateCounts = new Map<string, number>();
    for (const candidate of candidates.values()) {
      for (const targetDid of candidate.targetDids) {
        targetCandidateCounts.set(targetDid, (targetCandidateCounts.get(targetDid) ?? 0) + 1);
      }
    }

    const allScored: ScoredRecommendation[] = [...candidates.values()].map((candidate) => {
      const relation = userCandidateRelationByDid.get(candidate.profile.did);
      const following = Boolean(relation?.following);
      const followedBy = Boolean(relation?.followedBy);
      const outgoing = userInteractionMap.get(candidate.profile.did);
      const incoming = interactionMapCache.get(candidate.profile.did)?.get(actor.did);
      const pathStage = relationStageFromPaths(candidate.paths);
      const stage = directEvidenceStage(relation, outgoing, incoming, pathStage);
      const independentPaths = countNodeIndependentPaths(candidate.paths);
      const totalPaths = candidate.paths.length;
      const weightedDistance = Math.min(...candidate.paths.map((path) => path.weightedCost));
      const shortestDistance = Math.min(...candidate.paths.map((path) => path.distanceAfterReciprocity));
      const human = humanFit.get(candidate.profile.did) ?? null;
      const type = primaryType(candidate.types);
      const directStrength = (outgoing?.rawScore ?? 0) + (incoming?.rawScore ?? 0);
      const reciprocity = reciprocityPotential(
        candidate.profile,
        followedBy,
        following,
        candidate.targetHandles.size,
        directStrength,
        human,
      );
      const relevance = topicalFit(candidate.profile, categories);
      const visibility = visibilityPotential(candidate.profile, outgoing, candidate.paths);
      const marginalCoverage = clamp(
        [...candidate.targetDids].reduce(
          (sum, targetDid) => sum + 100 / Math.max(1, targetCandidateCounts.get(targetDid) ?? 1),
          0,
        ) / Math.max(1, candidate.targetDids.size),
      );
      const expectedBridgeValue = calculateExpectedBridgeValue(
        {
          weightedDistance,
          nodeIndependentPaths: independentPaths,
          destinationClusters: candidate.targetHandles.size,
          tieConfidence: candidate.maxTieConfidence,
          interactionStrength: candidate.maxInteractionStrength,
          reciprocityPotential: reciprocity,
          visibilityPotential: visibility,
          topicalFit: relevance,
          marginalCoverage,
          followersCount: candidate.profile.followersCount ?? 0,
          stage,
          humanFit: human,
          historicalConversionRate: calibration.get(type)?.rate ?? 50,
          spamPenalty: massFollowPenalty(candidate.profile),
        },
        goal,
      );
      const destinationOnly = type === "second-wave-large-target" || human === "destination-only";
      return {
        did: candidate.profile.did,
        handle: candidate.profile.handle,
        displayName: candidate.profile.displayName,
        description: candidate.profile.description,
        avatar: candidate.profile.avatar,
        followersCount: Math.max(0, candidate.profile.followersCount ?? 0),
        followsCount: Math.max(0, candidate.profile.followsCount ?? 0),
        importanceScore: expectedBridgeValue,
        expectedBridgeValue,
        reciprocityPotential: reciprocity,
        shortestDistanceAfterReciprocity: shortestDistance,
        weightedDistance,
        independentPaths,
        totalPaths,
        sharedTargetClusters: candidate.targetHandles.size,
        recommendationType: type,
        types: [...candidate.types],
        targetHandles: [...candidate.targetHandles],
        reason: reasonFor(candidate, type, stage, independentPaths),
        strategy: strategyFor(candidate, type, followedBy, stage),
        paths: [...candidate.paths]
          .sort((a, b) => a.weightedCost - b.weightedCost || b.pathConfidence - a.pathConfidence)
          .slice(0, 7),
        alreadyFollowsYou: followedBy,
        following,
        followedBy,
        profileUrl: `https://bsky.app/profile/${candidate.profile.handle}`,
        relationshipStage: stage,
        tieConfidence: candidate.maxTieConfidence,
        confidenceLevel: confidenceLevel(candidate.maxTieConfidence),
        visibilityPotential: visibility,
        topicalFit: relevance,
        marginalCoverage,
        humanFit: human,
        destinationOnly,
      };
    });

    allScored.sort(
      (a, b) =>
        b.expectedBridgeValue - a.expectedBridgeValue ||
        relationshipStageRank(b.relationshipStage) - relationshipStageRank(a.relationshipStage) ||
        b.independentPaths - a.independentPaths ||
        b.tieConfidence - a.tieConfidence,
    );

    await Promise.all([persistProfiles(), persistEdges(), persistInteractions()]);
    if (secondWaveTargets.length) {
      await persistTargets(
        campaignId,
        secondWaveTargets.map((item) => item.profile),
        2,
        "validated-foothold-second-wave",
      );
    }
    await persistRecommendations(accountId, campaignId, runId, goal, allScored);

    const recommendations = allScored
      .filter(
        (item) =>
          !item.following &&
          !item.destinationOnly &&
          !["not-for-me", "not-my-audience"].includes(item.humanFit ?? ""),
      )
      .slice(0, MAX_RECOMMENDATIONS);
    const stageCounts = allScored.reduce(
      (counts, item) => {
        counts[item.relationshipStage] += 1;
        return counts;
      },
      { structural: 0, active: 0, activated: 0, converted: 0 },
    );
    const metrics = {
      scope,
      goal,
      observableFollowers: followers.length,
      startingPool: startingPool.length,
      targetsAnalyzed: targets.length,
      verifiedStartingBridges: bridgeTargets.size,
      targetBesties: targetBestieSets.reduce((sum, item) => sum + item.besties.length, 0),
      firstHopExpansions: firstHopAnchors.length,
      candidateAccounts: allScored.length,
      recommendationsReturned: recommendations.length,
      alreadyFollowingCandidates: allScored.filter((item) => item.following).length,
      nodeIndependentPaths: allScored.reduce((sum, item) => sum + item.independentPaths, 0),
      relationshipStages: stageCounts,
      roundTwoStatus: eligibleFootholds.length ? (secondWaveTargets.length ? "expanded" : "no-qualified-destination") : "locked-awaiting-activated-foothold",
      roundTwoEligibleFootholds: eligibleFootholds.length,
      secondWaveTargets: secondWaveTargets.map((item) => item.profile.handle),
      engine: "evidence-weighted-v2",
    };
    await finishRun(runId, metrics);

    return NextResponse.json({
      runId,
      campaignId,
      engine: "evidence-weighted-v2",
      generatedAt: new Date().toISOString(),
      goal,
      targets: targets.map((target) => ({
        did: target.did,
        handle: target.handle,
        displayName: target.displayName,
        followersCount: Math.max(0, target.followersCount ?? 0),
      })),
      metrics,
      recommendations,
      note:
        "V2 ranks weighted relationship quality rather than raw hop count. Target-circle labels require reciprocal follows plus repeated public interaction evidence; deeper paths are confidence-discounted. Round two expands only from activated or converted round-one footholds, and node-independent routes are counted separately from total paths.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Advanced analysis failed.";
    if (runId) {
      try {
        await finishRun(runId, {}, "failed", message);
      } catch {
        // Keep the original error.
      }
    }
    console.error("Advanced Network v2 analysis failed", error);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
