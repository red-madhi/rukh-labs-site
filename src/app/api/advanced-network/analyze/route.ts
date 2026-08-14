import { NextRequest, NextResponse } from "next/server";
import { calculateDynamicImportance, type StartingNetworkScope } from "@/lib/advanced-network";
import { hasAdvancedNetworkAccess } from "@/lib/advanced-network-access";

export const runtime = "nodejs";
export const maxDuration = 60;

const XRPC = "https://public.api.bsky.app/xrpc";
const MAX_DEEP_TARGETS = 6;
const MAX_FOLLOWERS = 2_000;
const STARTING_POOL_CAP = 120;
const FEED_LIMIT = 80;
const BESTIES_PER_ACTOR = 8;
const FIRST_HOP_EXPANSIONS = 8;
const BRIDGE_EXPANSIONS = 4;
const SECOND_WAVE_TARGETS = 2;
const MAX_RECOMMENDATIONS = 30;
const PROFILE_BATCH_SIZE = 25;
const RELATIONSHIP_BATCH_SIZE = 30;
const SECOND_WAVE_MIN_FOLLOWERS = 100_000;

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
  displayName?: string;
  avatar?: string;
};

type FeedItem = {
  post?: {
    uri?: string;
    author?: FeedActor;
    record?: unknown;
    embed?: unknown;
  };
  reason?: {
    by?: FeedActor;
  };
  reply?: {
    parent?: {
      author?: FeedActor;
    };
    root?: {
      author?: FeedActor;
    };
  };
};

type InteractionCounts = {
  peerDid: string;
  replies: number;
  reposts: number;
  quotes: number;
  events: number;
  rawScore: number;
};

type Bestie = InteractionCounts & {
  profile: Profile;
  interactionStrength: number;
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
  targetHandle: string;
  viaHandles: string[];
  distanceAfterReciprocity: number;
  interactionStrength: number;
};

type Candidate = {
  profile: Profile;
  types: Set<RecommendationType>;
  targetHandles: Set<string>;
  paths: CandidatePath[];
  maxInteractionStrength: number;
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
  reciprocityPotential: number;
  shortestDistanceAfterReciprocity: number;
  independentPaths: number;
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
};

type NeonResponse = {
  rows?: Array<Array<string | null>>;
};

const profileCache = new Map<string, Profile>();
const relationshipCache = new Map<string, Relationship>();
const bestieCache = new Map<string, Bestie[]>();
const interactionRecords = new Map<string, InteractionCounts & { actorDid: string }>();
const followEdges = new Set<string>();

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

function clamp(value: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value));
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
    const payload = await xrpc<{ followers?: Profile[]; cursor?: string }>("app.bsky.graph.getFollowers", params);
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
    const payload = await xrpc<{ relationships?: Relationship[] }>("app.bsky.graph.getRelationships", params);
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

function addInteraction(
  map: Map<string, InteractionCounts>,
  actorDid: string,
  peerDid: string | undefined,
  kind: "reply" | "repost" | "quote",
) {
  if (!peerDid || peerDid === actorDid) return;
  const current = map.get(peerDid) ?? {
    peerDid,
    replies: 0,
    reposts: 0,
    quotes: 0,
    events: 0,
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
  map.set(peerDid, current);
}

function embeddedAuthors(value: unknown, depth = 0): FeedActor[] {
  if (!value || typeof value !== "object" || depth > 5) return [];
  const object = value as Record<string, unknown>;
  const actors: FeedActor[] = [];
  const author = object.author;
  if (author && typeof author === "object" && typeof (author as FeedActor).did === "string") {
    actors.push(author as FeedActor);
  }
  for (const key of ["record", "media", "embed", "view", "value"]) {
    if (key in object) actors.push(...embeddedAuthors(object[key], depth + 1));
  }
  if (Array.isArray(object.items)) {
    for (const item of object.items) actors.push(...embeddedAuthors(item, depth + 1));
  }
  return actors;
}

async function getBesties(actor: Profile) {
  const cached = bestieCache.get(actor.did);
  if (cached) return cached;

  const payload = await xrpc<{ feed?: FeedItem[] }>(
    "app.bsky.feed.getAuthorFeed",
    new URLSearchParams({ actor: actor.did, limit: String(FEED_LIMIT) }),
  );
  const counts = new Map<string, InteractionCounts>();

  for (const item of payload.feed ?? []) {
    const postAuthorDid = item.post?.author?.did;
    if (item.reason?.by?.did === actor.did && postAuthorDid && postAuthorDid !== actor.did) {
      addInteraction(counts, actor.did, postAuthorDid, "repost");
    }
    if (postAuthorDid === actor.did) {
      addInteraction(counts, actor.did, item.reply?.parent?.author?.did, "reply");
      const quoteAuthors = embeddedAuthors(item.post?.embed);
      for (const peer of quoteAuthors) addInteraction(counts, actor.did, peer.did, "quote");
    }
  }

  const repeated = [...counts.values()].filter((item) => item.events >= 2);
  if (!repeated.length) {
    bestieCache.set(actor.did, []);
    return [];
  }

  const relationships = await getRelationships(actor.did, repeated.map((item) => item.peerDid));
  const relationByDid = new Map(relationships.map((relationship) => [relationship.did, relationship]));
  const mutualRepeated = repeated.filter((item) => {
    const relation = relationByDid.get(item.peerDid);
    if (relation?.following) addFollowEdge(actor.did, item.peerDid);
    if (relation?.followedBy) addFollowEdge(item.peerDid, actor.did);
    return Boolean(relation?.following && relation?.followedBy);
  });
  const peerProfiles = await getProfiles(mutualRepeated.map((item) => item.peerDid));
  const profileByDid = new Map(peerProfiles.map((profile) => [profile.did, profile]));

  const besties = mutualRepeated
    .map((item) => {
      const profile = profileByDid.get(item.peerDid);
      if (!profile) return null;
      const interactionStrength = clamp(item.rawScore * 7 + Math.min(16, item.events * 2));
      interactionRecords.set(`${actor.did}|${item.peerDid}`, { ...item, actorDid: actor.did });
      return { ...item, profile, interactionStrength };
    })
    .filter((item): item is Bestie => Boolean(item))
    .sort(
      (a, b) =>
        b.interactionStrength - a.interactionStrength ||
        profileInfluence(b.profile) - profileInfluence(a.profile),
    )
    .slice(0, BESTIES_PER_ACTOR);

  bestieCache.set(actor.did, besties);
  return besties;
}

function getNeonEndpoint(connectionString: string) {
  const parsed = new URL(connectionString);
  const hostParts = parsed.hostname.split(".");
  if (hostParts.length < 2) throw new Error("Database connection host is invalid.");
  hostParts[0] = "api";
  return `https://${hostParts.join(".")}/sql`;
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

async function savedTargetHandles(actorDid: string) {
  const result = await neonQuery(
    `SELECT t.target_handle
     FROM public.advanced_network_targets t
     JOIN public.advanced_network_campaigns c ON c.id=t.campaign_id
     JOIN public.advanced_network_accounts a ON a.id=c.account_id
     WHERE a.bluesky_did=$1 AND c.status='active' AND t.status IN ('active','candidate')
     ORDER BY t.wave ASC, CASE WHEN t.status='active' THEN 0 ELSE 1 END, t.priority_score DESC
     LIMIT ${MAX_DEEP_TARGETS}`,
    [actorDid],
  );
  return (result.rows ?? []).map((row) => row[0]).filter((value): value is string => Boolean(value));
}

async function ensureAccount(actor: Profile) {
  const result = await neonQuery(
    `INSERT INTO public.advanced_network_accounts (bluesky_did, handle, display_name, access_status, plan)
     VALUES ($1,$2,$3,'approved','beta')
     ON CONFLICT (bluesky_did) DO UPDATE SET handle=EXCLUDED.handle, display_name=EXCLUDED.display_name, updated_at=now()
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
) {
  const targetHandles = targets.map((target) => target.handle);
  const targetJson = JSON.stringify(targetHandles);
  const categoryJson = JSON.stringify(categories);
  const existing = await neonQuery(
    `SELECT id::text FROM public.advanced_network_campaigns
     WHERE account_id=$1::uuid AND status='active' AND target_mode='profiles'
       AND explicit_targets=$2::jsonb AND starting_network_scope=$3
     ORDER BY updated_at DESC LIMIT 1`,
    [accountId, targetJson, scope],
  );
  if (existing.rows?.[0]?.[0]) return existing.rows[0][0];

  const name = `Targeted expansion · ${targetHandles.slice(0, 2).map((handle) => `@${handle}`).join(" + ")}${targetHandles.length > 2 ? ` +${targetHandles.length - 2}` : ""}`;
  const inserted = await neonQuery(
    `INSERT INTO public.advanced_network_campaigns
       (account_id,name,target_mode,starting_network_scope,categories,explicit_targets,max_explicit_targets,compute_budget,status)
     VALUES ($1::uuid,$2,'profiles',$3,$4::jsonb,$5::jsonb,10,100,'active')
     RETURNING id::text`,
    [accountId, name, scope, categoryJson, targetJson],
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

function addCandidate(
  candidates: Map<string, Candidate>,
  profile: Profile,
  path: CandidatePath,
) {
  const current = candidates.get(profile.did) ?? {
    profile,
    types: new Set<RecommendationType>(),
    targetHandles: new Set<string>(),
    paths: [],
    maxInteractionStrength: 0,
  };
  current.profile = profile;
  current.types.add(path.kind);
  current.targetHandles.add(path.targetHandle);
  const pathKey = `${path.kind}|${path.targetHandle}|${path.viaHandles.join(">")}`;
  if (!current.paths.some((existing) => `${existing.kind}|${existing.targetHandle}|${existing.viaHandles.join(">")}` === pathKey)) {
    current.paths.push(path);
  }
  current.maxInteractionStrength = Math.max(current.maxInteractionStrength, path.interactionStrength);
  candidates.set(profile.did, current);
}

function massFollowPenalty(profile: Profile) {
  const followers = Math.max(1, profile.followersCount ?? 0);
  const follows = Math.max(0, profile.followsCount ?? 0);
  const ratio = follows / followers;
  if (follows > 150_000 && ratio > 2) return 20;
  if (follows > 75_000 && ratio > 1.5) return 13;
  if (follows > 30_000 && ratio > 2.5) return 8;
  return 0;
}

function reciprocityPotential(
  profile: Profile,
  followedBy: boolean,
  sharedTargets: number,
  interactionStrength: number,
) {
  let value = 24;
  if (followedBy) value += 56;
  const followers = Math.max(1, profile.followersCount ?? 0);
  const follows = Math.max(0, profile.followsCount ?? 0);
  if (follows >= followers * 0.8) value += 9;
  else if (follows >= followers * 0.3) value += 4;
  if (followers >= 100_000 && !followedBy) value -= 10;
  if (sharedTargets >= 2) value += 6;
  if (interactionStrength >= 60) value += 5;
  return clamp(value);
}

const typePriority: RecommendationType[] = [
  "warm-follower-bridge",
  "target-bestie",
  "bridge-bestie",
  "bestie-of-bestie",
  "second-wave-large-target",
  "second-wave-bestie",
];

function primaryType(types: Set<RecommendationType>) {
  return typePriority.find((type) => types.has(type)) ?? "bestie-of-bestie";
}

function reasonFor(candidate: Candidate, type: RecommendationType, followedBy: boolean) {
  const targets = [...candidate.targetHandles].slice(0, 3).map((handle) => `@${handle}`).join(", ");
  const paths = candidate.paths.length;
  if (type === "warm-follower-bridge") {
    return `Already follows you and has a verified reciprocal path into ${targets}. Following back can turn an existing warm edge into immediate network leverage.`;
  }
  if (type === "target-bestie") {
    return `Reciprocal with and repeatedly interacts with ${targets}. This is a close target-neighborhood account, not a random high-follower recommendation.`;
  }
  if (type === "bridge-bestie") {
    return `A repeated-interaction mutual of one of your verified bridge accounts, with ${paths} useful path${paths === 1 ? "" : "s"} into the target neighborhood.`;
  }
  if (type === "second-wave-large-target") {
    return `A fresh large account discovered only after expanding the first target neighborhood. It is a second-wave endpoint created by the recursive search.`;
  }
  if (type === "second-wave-bestie") {
    return `A repeated-interaction mutual inside a newly discovered second-wave large account's close circle.`;
  }
  return `A reciprocal bestie-of-bestie inside the ${targets} neighborhood, giving you a deeper but still socially verified route into that cluster.`;
}

function strategyFor(candidate: Candidate, type: RecommendationType, followedBy: boolean) {
  const bestPath = [...candidate.paths].sort(
    (a, b) => a.distanceAfterReciprocity - b.distanceAfterReciprocity || b.interactionStrength - a.interactionStrength,
  )[0];
  const via = bestPath?.viaHandles.slice(0, -1).map((handle) => `@${handle}`).join(" → ");
  if (followedBy) {
    return `Follow back first. They already follow you, so this is the lowest-friction reciprocal opportunity. Then engage naturally with a recent relevant post before trying to move deeper through ${via || "their target cluster"}.`;
  }
  if (type === "target-bestie") {
    return `Engage with this account directly before chasing the large target. Reply to a genuinely relevant recent post, then keep showing up where they interact with ${via || "the target"}; avoid pitching your account.`;
  }
  if (type === "bestie-of-bestie" || type === "bridge-bestie") {
    return `Treat this as a warm-cluster approach: engage with the nearer account in the path (${via || "the shared bestie"}) and this profile on-topic. The goal is repeated recognition, not a one-off follow request.`;
  }
  if (type === "second-wave-large-target") {
    return `Do not cold-pitch this large account. Use the close reciprocal accounts that surfaced it, interact in the same conversation cluster, and let the shorter social path do the work.`;
  }
  return `Engage with this account through the second-wave neighborhood that exposed it. Prioritize substantive replies and shared-topic conversations over generic likes.`;
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
       did text, handle text, display_name text, description text, avatar text,
       followers_count integer, follows_count integer, posts_count integer, profile_json jsonb
     )
     ON CONFLICT (did) DO UPDATE SET
       handle=EXCLUDED.handle, display_name=EXCLUDED.display_name, description=EXCLUDED.description,
       avatar=EXCLUDED.avatar, followers_count=EXCLUDED.followers_count, follows_count=EXCLUDED.follows_count,
       posts_count=EXCLUDED.posts_count, profile_json=EXCLUDED.profile_json, observed_at=now(), updated_at=now()`,
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
  }));
  if (!rows.length) return;
  await neonQuery(
    `INSERT INTO public.advanced_network_interaction_scores
       (actor_did,peer_did,replies,reposts,quotes,interaction_score,window_end,updated_at)
     SELECT x.actor_did,x.peer_did,x.replies,x.reposts,x.quotes,x.interaction_score,now(),now()
     FROM jsonb_to_recordset($1::jsonb) AS x(
       actor_did text,peer_did text,replies integer,reposts integer,quotes integer,interaction_score numeric
     )
     ON CONFLICT (actor_did,peer_did) DO UPDATE SET
       replies=EXCLUDED.replies,reposts=EXCLUDED.reposts,quotes=EXCLUDED.quotes,
       interaction_score=EXCLUDED.interaction_score,window_end=now(),updated_at=now()`,
    [JSON.stringify(rows)],
  );
}

async function persistTargets(campaignId: string, targets: Profile[]) {
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
     SELECT $1::uuid,x.target_did,x.target_handle,'explicit-profile',1,'active',0,x.metadata,now()
     FROM jsonb_to_recordset($2::jsonb) AS x(target_did text,target_handle text,metadata jsonb)
     ON CONFLICT (campaign_id,target_did,wave) DO UPDATE SET
       target_handle=EXCLUDED.target_handle,status='active',metadata=EXCLUDED.metadata,updated_at=now()`,
    [campaignId, JSON.stringify(rows)],
  );
}

async function persistRecommendations(
  accountId: string,
  campaignId: string,
  runId: string,
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
    category_relevance: Math.min(100, 65 + item.sharedTargetClusters * 7),
    state: item.following && item.followedBy ? "followed_back" : item.following ? "followed" : "recommended",
    metadata: {
      types: item.types,
      targetHandles: item.targetHandles,
      paths: item.paths,
      strategy: item.strategy,
      profileUrl: item.profileUrl,
      followersCount: item.followersCount,
      followsCount: item.followsCount,
      alreadyFollowsYou: item.alreadyFollowsYou,
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
            CASE WHEN x.state='followed_back' THEN now() ELSE NULL END,
            x.metadata,now()
     FROM jsonb_to_recordset($4::jsonb) AS x(
       target_did text,target_handle text,recommendation_type text,reason text,
       importance_score numeric,shortest_mutual_distance integer,independent_paths integer,
       shared_bestie_clusters integer,follow_back_likelihood numeric,category_relevance numeric,
       state text,metadata jsonb
     )
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
       metadata=EXCLUDED.metadata,updated_at=now()`,
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

export async function POST(request: NextRequest) {
  let runId = "";
  try {
    if (!(await hasAdvancedNetworkAccess())) {
      return NextResponse.json({ error: "Private beta access is required." }, { status: 403 });
    }

    profileCache.clear();
    relationshipCache.clear();
    bestieCache.clear();
    interactionRecords.clear();
    followEdges.clear();

    const body = (await request.json()) as {
      actor?: string;
      targets?: string[];
      categories?: string[];
      scope?: StartingNetworkScope;
    };
    const actorInput = normalize(String(body.actor ?? ""));
    if (!actorInput) return NextResponse.json({ error: "Connect a Bluesky account first." }, { status: 400 });

    const scope: StartingNetworkScope = body.scope === "mutuals-only" ? "mutuals-only" : "all-followers";
    const categories = Array.from(new Set((body.categories ?? []).map(String))).slice(0, 8);
    const actor = await getProfile(actorInput);
    const requestedTargets = Array.from(
      new Set((body.targets ?? []).map((value) => normalize(String(value))).filter(Boolean)),
    ).slice(0, MAX_DEEP_TARGETS);
    const targetInputs = requestedTargets.length ? requestedTargets : await savedTargetHandles(actor.did);
    if (!targetInputs.length) {
      return NextResponse.json({ error: "Run reconnaissance on at least one named target first." }, { status: 400 });
    }

    const targets = (await getProfiles(targetInputs))
      .filter((profile) => profile.did !== actor.did)
      .slice(0, MAX_DEEP_TARGETS);
    if (!targets.length) return NextResponse.json({ error: "No valid target profiles were found." }, { status: 400 });

    const accountId = await ensureAccount(actor);
    const campaignId = await ensureCampaign(accountId, targets, scope, categories);
    await persistTargets(campaignId, targets);
    runId = await createRun(campaignId, {
      scope,
      categories,
      targets: targets.map((target) => target.handle),
      engine: "bounded-recursive-v1",
      feedLimit: FEED_LIMIT,
    });

    const followerStubs = await getFollowers(actor.did);
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
        return { profile, relation, mutual, score: profileInfluence(profile, mutual) };
      })
      .filter((item) => scope === "all-followers" || item.mutual)
      .sort((a, b) => b.score - a.score)
      .slice(0, STARTING_POOL_CAP);

    const candidates = new Map<string, Candidate>();
    const targetDids = new Set(targets.map((target) => target.did));
    const bridgeTargets = new Map<string, Set<string>>();

    await Promise.all(
      targets.map(async (target) => {
        const relationships = await getRelationships(target.did, startingPool.map((item) => item.profile.did));
        for (const relationship of relationships) {
          if (relationship.following) addFollowEdge(target.did, relationship.did);
          if (relationship.followedBy) addFollowEdge(relationship.did, target.did);
          if (!(relationship.following && relationship.followedBy)) continue;
          const starting = startingPool.find((item) => item.profile.did === relationship.did);
          if (!starting) continue;
          const set = bridgeTargets.get(starting.profile.did) ?? new Set<string>();
          set.add(target.handle);
          bridgeTargets.set(starting.profile.did, set);
          const userRelation = starting.relation;
          if (userRelation?.followedBy && !userRelation.following) {
            addCandidate(candidates, starting.profile, {
              kind: "warm-follower-bridge",
              targetHandle: target.handle,
              viaHandles: [starting.profile.handle, target.handle],
              distanceAfterReciprocity: 2,
              interactionStrength: 45,
            });
          }
        }
      }),
    );

    const targetBestieSets = await Promise.all(
      targets.map(async (target) => ({ target, besties: await getBesties(target) })),
    );

    for (const { target, besties } of targetBestieSets) {
      for (const bestie of besties) {
        if (bestie.profile.did === actor.did || targetDids.has(bestie.profile.did)) continue;
        addCandidate(candidates, bestie.profile, {
          kind: "target-bestie",
          targetHandle: target.handle,
          viaHandles: [target.handle, bestie.profile.handle],
          distanceAfterReciprocity: 2,
          interactionStrength: bestie.interactionStrength,
        });
      }
    }

    const firstHopAnchors = targetBestieSets
      .flatMap(({ target, besties }) => besties.slice(0, 2).map((bestie) => ({ target, bestie })))
      .sort((a, b) => b.bestie.interactionStrength - a.bestie.interactionStrength)
      .slice(0, FIRST_HOP_EXPANSIONS);

    const secondHopResults = await Promise.all(
      firstHopAnchors.map(async ({ target, bestie }) => ({
        target,
        anchor: bestie.profile,
        besties: await getBesties(bestie.profile),
      })),
    );

    for (const { target, anchor, besties } of secondHopResults) {
      for (const bestie of besties) {
        if (bestie.profile.did === actor.did || targetDids.has(bestie.profile.did) || bestie.profile.did === anchor.did) continue;
        addCandidate(candidates, bestie.profile, {
          kind: "bestie-of-bestie",
          targetHandle: target.handle,
          viaHandles: [target.handle, anchor.handle, bestie.profile.handle],
          distanceAfterReciprocity: 3,
          interactionStrength: bestie.interactionStrength,
        });
      }
    }

    const bridgeAnchors = [...bridgeTargets.entries()]
      .map(([did, targetHandles]) => ({
        profile: startingPool.find((item) => item.profile.did === did)?.profile,
        targetHandles: [...targetHandles],
      }))
      .filter((item): item is { profile: Profile; targetHandles: string[] } => Boolean(item.profile))
      .sort((a, b) => b.targetHandles.length - a.targetHandles.length || profileInfluence(b.profile, true) - profileInfluence(a.profile, true))
      .slice(0, BRIDGE_EXPANSIONS);

    const bridgeBestieResults = await Promise.all(
      bridgeAnchors.map(async (bridge) => ({ bridge, besties: await getBesties(bridge.profile) })),
    );
    for (const { bridge, besties } of bridgeBestieResults) {
      for (const bestie of besties) {
        if (bestie.profile.did === actor.did || targetDids.has(bestie.profile.did)) continue;
        for (const targetHandle of bridge.targetHandles) {
          addCandidate(candidates, bestie.profile, {
            kind: "bridge-bestie",
            targetHandle,
            viaHandles: [targetHandle, bridge.profile.handle, bestie.profile.handle],
            distanceAfterReciprocity: 3,
            interactionStrength: bestie.interactionStrength,
          });
        }
      }
    }

    const candidateProfilesBeforeSecondWave = [...candidates.values()].map((candidate) => candidate.profile);
    const secondWaveCandidates = candidateProfilesBeforeSecondWave
      .filter(
        (profile) =>
          !targetDids.has(profile.did) &&
          (profile.followersCount ?? 0) >= SECOND_WAVE_MIN_FOLLOWERS,
      )
      .sort((a, b) => profileInfluence(b) - profileInfluence(a))
      .slice(0, SECOND_WAVE_TARGETS);

    for (const secondWave of secondWaveCandidates) {
      const existing = candidates.get(secondWave.did);
      const sourcePath = existing?.paths
        .slice()
        .sort((a, b) => a.distanceAfterReciprocity - b.distanceAfterReciprocity)[0];
      addCandidate(candidates, secondWave, {
        kind: "second-wave-large-target",
        targetHandle: sourcePath?.targetHandle ?? secondWave.handle,
        viaHandles: sourcePath?.viaHandles ?? [secondWave.handle],
        distanceAfterReciprocity: sourcePath?.distanceAfterReciprocity ?? 3,
        interactionStrength: sourcePath?.interactionStrength ?? 50,
      });

      const secondWaveBesties = await getBesties(secondWave);
      for (const bestie of secondWaveBesties) {
        if (bestie.profile.did === actor.did || targetDids.has(bestie.profile.did) || bestie.profile.did === secondWave.did) continue;
        addCandidate(candidates, bestie.profile, {
          kind: "second-wave-bestie",
          targetHandle: secondWave.handle,
          viaHandles: [secondWave.handle, bestie.profile.handle],
          distanceAfterReciprocity: 2,
          interactionStrength: bestie.interactionStrength,
        });
      }
    }

    const candidateDids = [...candidates.keys()];
    const userCandidateRelationships = await getRelationships(actor.did, candidateDids);
    const userCandidateRelationByDid = new Map(userCandidateRelationships.map((relationship) => [relationship.did, relationship]));
    for (const relationship of userCandidateRelationships) {
      if (relationship.following) addFollowEdge(actor.did, relationship.did);
      if (relationship.followedBy) addFollowEdge(relationship.did, actor.did);
    }

    const allScored: ScoredRecommendation[] = [...candidates.values()].map((candidate) => {
      const relation = userCandidateRelationByDid.get(candidate.profile.did);
      const following = Boolean(relation?.following);
      const followedBy = Boolean(relation?.followedBy);
      const sharedTargets = candidate.targetHandles.size;
      const shortestDistance = Math.min(...candidate.paths.map((path) => path.distanceAfterReciprocity));
      const reciprocity = reciprocityPotential(
        candidate.profile,
        followedBy,
        sharedTargets,
        candidate.maxInteractionStrength,
      );
      const categoryRelevance = Math.min(100, 65 + sharedTargets * 7 + (categories.length ? 5 : 0));
      let importance = calculateDynamicImportance({
        shortestMutualDistance: shortestDistance,
        independentPaths: candidate.paths.length,
        sharedBestieClusters: sharedTargets,
        interactionStrength: candidate.maxInteractionStrength,
        followersCount: Math.max(0, candidate.profile.followersCount ?? 0),
        followBackLikelihood: reciprocity,
        categoryRelevance,
      });
      if (followedBy && !following) importance += 8;
      if (sharedTargets >= 2) importance += Math.min(10, (sharedTargets - 1) * 3);
      importance = clamp(importance - massFollowPenalty(candidate.profile));
      const type = primaryType(candidate.types);
      return {
        did: candidate.profile.did,
        handle: candidate.profile.handle,
        displayName: candidate.profile.displayName,
        description: candidate.profile.description,
        avatar: candidate.profile.avatar,
        followersCount: Math.max(0, candidate.profile.followersCount ?? 0),
        followsCount: Math.max(0, candidate.profile.followsCount ?? 0),
        importanceScore: importance,
        reciprocityPotential: reciprocity,
        shortestDistanceAfterReciprocity: shortestDistance,
        independentPaths: candidate.paths.length,
        sharedTargetClusters: sharedTargets,
        recommendationType: type,
        types: [...candidate.types],
        targetHandles: [...candidate.targetHandles],
        reason: reasonFor(candidate, type, followedBy),
        strategy: strategyFor(candidate, type, followedBy),
        paths: candidate.paths
          .slice()
          .sort((a, b) => a.distanceAfterReciprocity - b.distanceAfterReciprocity || b.interactionStrength - a.interactionStrength)
          .slice(0, 5),
        alreadyFollowsYou: followedBy,
        following,
        followedBy,
        profileUrl: `https://bsky.app/profile/${candidate.profile.handle}`,
      };
    });

    allScored.sort(
      (a, b) =>
        b.importanceScore - a.importanceScore ||
        b.sharedTargetClusters - a.sharedTargetClusters ||
        b.independentPaths - a.independentPaths ||
        b.followersCount - a.followersCount,
    );

    await Promise.all([persistProfiles(), persistEdges(), persistInteractions()]);
    await persistRecommendations(accountId, campaignId, runId, allScored);

    const recommendations = allScored.filter((item) => !item.following).slice(0, MAX_RECOMMENDATIONS);
    const followedCandidates = allScored.filter((item) => item.following).length;
    const secondWaveHandles = secondWaveCandidates.map((profile) => profile.handle);
    const metrics = {
      scope,
      observableFollowers: followers.length,
      startingPool: startingPool.length,
      targetsAnalyzed: targets.length,
      verifiedStartingBridges: bridgeTargets.size,
      targetBesties: targetBestieSets.reduce((sum, item) => sum + item.besties.length, 0),
      firstHopExpansions: firstHopAnchors.length,
      candidateAccounts: allScored.length,
      recommendationsReturned: recommendations.length,
      alreadyFollowingCandidates: followedCandidates,
      secondWaveTargets: secondWaveHandles,
    };
    await finishRun(runId, metrics);

    return NextResponse.json({
      runId,
      campaignId,
      engine: "bounded-recursive-v1",
      generatedAt: new Date().toISOString(),
      targets: targets.map((target) => ({
        did: target.did,
        handle: target.handle,
        displayName: target.displayName,
        followersCount: Math.max(0, target.followersCount ?? 0),
      })),
      metrics,
      recommendations,
      note:
        "Recommendations require real Bluesky profiles. Bestie labels require reciprocal follows plus at least two sampled public interactions in the analyzed author feed. Accounts you already follow are saved for outcome history but removed from the follow-now list.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Advanced analysis failed.";
    if (runId) {
      try {
        await finishRun(runId, {}, "failed", message);
      } catch {
        // Keep the original analysis error.
      }
    }
    console.error("Advanced Network analysis failed", error);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
