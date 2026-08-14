import { NextRequest, NextResponse } from "next/server";
import { hasAdvancedNetworkAccess } from "@/lib/advanced-network-access";

export const runtime = "nodejs";
export const maxDuration = 60;

const XRPC = "https://public.api.bsky.app/xrpc";
const MAX_PEOPLE = 18;
const FEED_LIMIT = 16;

const TACTICAL_TYPES = new Set([
  "warm-follower-bridge",
  "target-bestie",
  "bestie-of-bestie",
  "bridge-bestie",
  "second-wave-bestie",
]);

type NeonResponse = { rows?: Array<Array<string | null>> };

type Relationship = {
  did: string;
  following?: string;
  followedBy?: string;
};

type FeedItem = {
  post?: {
    uri?: string;
    author?: { did?: string; handle?: string };
    record?: { text?: string; createdAt?: string };
    likeCount?: number;
    replyCount?: number;
    repostCount?: number;
    quoteCount?: number;
  };
  reply?: unknown;
};

type RecommendationRow = {
  did: string;
  handle: string;
  recommendationType: string;
  reason: string;
  importance: number;
  reciprocity: number;
  independentPaths: number;
  sharedBestieClusters: number;
  state: string;
  metadata: Record<string, unknown>;
  displayName?: string;
  followersCount: number;
};

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

async function xrpc<T>(method: string, params: URLSearchParams) {
  const response = await fetch(`${XRPC}/${method}?${params.toString()}`, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Bluesky ${method} returned ${response.status}.`);
  return (await response.json()) as T;
}

function atUriToPostUrl(uri: string, handle: string) {
  const rkey = uri.split("/").filter(Boolean).at(-1);
  return rkey ? `https://bsky.app/profile/${handle}/post/${rkey}` : `https://bsky.app/profile/${handle}`;
}

function ageHours(createdAt?: string) {
  if (!createdAt) return 999;
  const ms = Date.now() - new Date(createdAt).getTime();
  return Math.max(0, ms / 3_600_000);
}

function compactText(text: string, max = 180) {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length <= max ? clean : `${clean.slice(0, max - 1)}…`;
}

function bestPost(feed: FeedItem[], did: string) {
  const candidates = feed
    .filter((item) => item.post?.author?.did === did && !item.reply && item.post?.uri)
    .map((item) => {
      const post = item.post!;
      const hours = ageHours(post.record?.createdAt);
      const engagement =
        (post.replyCount ?? 0) * 3 +
        (post.quoteCount ?? 0) * 2.5 +
        (post.repostCount ?? 0) * 2 +
        (post.likeCount ?? 0);
      const freshness = hours <= 8 ? 45 : hours <= 24 ? 32 : hours <= 48 ? 20 : hours <= 96 ? 8 : 0;
      return { post, hours, score: engagement + freshness };
    })
    .sort((a, b) => b.score - a.score);
  return candidates[0] ?? null;
}

function maxInteraction(metadata: Record<string, unknown>) {
  const paths = Array.isArray(metadata.paths) ? metadata.paths : [];
  let max = 0;
  for (const raw of paths) {
    if (!raw || typeof raw !== "object") continue;
    const value = Number((raw as Record<string, unknown>).interactionStrength ?? 0);
    if (Number.isFinite(value)) max = Math.max(max, value);
  }
  return max;
}

function targetHandles(metadata: Record<string, unknown>) {
  return Array.isArray(metadata.targetHandles)
    ? metadata.targetHandles.filter((value): value is string => typeof value === "string")
    : [];
}

function relationshipRole(type: string) {
  if (type === "warm-follower-bridge") return "Warm bridge";
  if (type === "target-bestie") return "Target-circle bridge";
  if (type === "bridge-bestie") return "Bridge-circle connection";
  if (type === "second-wave-bestie") return "Wave 2 bridge";
  return "Extended bridge";
}

function bridgeLeverage(recommendation: RecommendationRow, relation: Relationship | undefined) {
  const interaction = maxInteraction(recommendation.metadata);
  const destinations = targetHandles(recommendation.metadata).length;
  const warmRelationship = relation?.followedBy ? 12 : relation?.following ? 6 : 0;
  const score =
    recommendation.importance * 0.42 +
    recommendation.reciprocity * 0.12 +
    Math.min(30, recommendation.independentPaths * 8) +
    Math.min(18, interaction / 5) +
    Math.min(12, destinations * 4) +
    warmRelationship;
  return Math.max(0, Math.min(100, Math.round(score)));
}

function actionLabel(
  relation: Relationship | undefined,
  hours: number,
  recommendationType: string,
  independentPaths: number,
) {
  if (relation?.followedBy && !relation.following) return "Follow back + build rapport";
  if (hours <= 12 && independentPaths >= 2) return "Reply to this bridge now";
  if (hours <= 48) return "Like + thoughtful reply";
  if (!relation?.following && recommendationType === "warm-follower-bridge") return "Follow back";
  if (relation?.following || relation?.followedBy) return "Keep this bridge warm";
  return "Cultivate this bridge";
}

function actionReason(
  recommendation: RecommendationRow,
  relation: Relationship | undefined,
  targets: string[],
  hours: number,
) {
  const target = targets[0];
  const targetPhrase = target ? ` toward @${target}` : " toward a high-value destination cluster";
  const paths = recommendation.independentPaths;

  if (paths >= 2) {
    return `This person supports ${paths} independent warm path${paths === 1 ? "" : "s"}${targetPhrase}. Strengthening this relationship increases the number of people in that neighborhood who know and can vouch for you.`;
  }
  if (relation?.followedBy && !relation.following) {
    return `They already follow you and sit on a useful route${targetPhrase}. This is low-friction relationship capital worth turning into a real two-way connection.`;
  }
  if (recommendation.recommendationType === "target-bestie") {
    return `This is a close-neighborhood connection${targetPhrase}. Building familiarity here is more strategic than repeatedly cold-engaging the destination account itself.`;
  }
  if (recommendation.recommendationType === "bridge-bestie") {
    return `This person is adjacent to one of your strongest bridges${targetPhrase}; they help turn one fragile route into a broader trusted cluster.`;
  }
  if (hours <= 24) {
    return `A useful bridge account has a fresh post right now${targetPhrase}. A natural interaction here can deepen recognition while the conversation is active.`;
  }
  return `This account is part of the reachable bridge network${targetPhrase}. The goal is genuine repeated familiarity, not a one-off request for a follow.`;
}

export async function POST(request: NextRequest) {
  if (!(await hasAdvancedNetworkAccess())) {
    return NextResponse.json({ error: "Private beta access is required." }, { status: 403 });
  }

  try {
    const body = (await request.json()) as { actor?: string; runId?: string };
    const actorDid = String(body.actor ?? "").trim();
    if (!actorDid.startsWith("did:")) {
      return NextResponse.json({ error: "Connect a Bluesky account first." }, { status: 400 });
    }

    let runId = String(body.runId ?? "").trim();
    if (!runId) {
      const latest = await neonQuery(
        `SELECT r.id::text
         FROM public.advanced_network_runs r
         JOIN public.advanced_network_campaigns c ON c.id=r.campaign_id
         JOIN public.advanced_network_accounts a ON a.id=c.account_id
         WHERE a.bluesky_did=$1 AND r.status='completed'
         ORDER BY COALESCE(r.completed_at,r.created_at) DESC
         LIMIT 1`,
        [actorDid],
      );
      runId = latest.rows?.[0]?.[0] ?? "";
    }

    if (!runId) {
      return NextResponse.json({
        runId: null,
        generatedAt: new Date().toISOString(),
        actions: [],
        topPeople: [],
        bestieSignals: [],
        clusters: [],
        note: "Run Find people to follow once to build your first Action Center.",
      });
    }

    const recResult = await neonQuery(
      `SELECT rec.target_did,
              rec.target_handle,
              rec.recommendation_type,
              rec.reason,
              rec.importance_score::text,
              rec.follow_back_likelihood::text,
              COALESCE(rec.independent_paths,0)::text,
              COALESCE(rec.shared_bestie_clusters,0)::text,
              rec.state,
              rec.metadata::text,
              p.display_name,
              COALESCE(p.followers_count,0)::text
       FROM public.advanced_network_recommendations rec
       LEFT JOIN public.advanced_network_profiles p ON p.did=rec.target_did
       JOIN public.advanced_network_accounts a ON a.id=rec.account_id
       WHERE a.bluesky_did=$1 AND rec.run_id=$2::uuid
       ORDER BY rec.importance_score DESC, rec.independent_paths DESC
       LIMIT 60`,
      [actorDid, runId],
    );

    const recommendations: RecommendationRow[] = (recResult.rows ?? []).map((row) => {
      let metadata: Record<string, unknown> = {};
      try {
        metadata = JSON.parse(row[9] ?? "{}") as Record<string, unknown>;
      } catch {
        metadata = {};
      }
      return {
        did: row[0] ?? "",
        handle: row[1] ?? "",
        recommendationType: row[2] ?? "",
        reason: row[3] ?? "",
        importance: Number(row[4] ?? 0),
        reciprocity: Number(row[5] ?? 0),
        independentPaths: Number(row[6] ?? 0),
        sharedBestieClusters: Number(row[7] ?? 0),
        state: row[8] ?? "recommended",
        metadata,
        displayName: row[10] ?? undefined,
        followersCount: Number(row[11] ?? 0),
      };
    }).filter((item) => item.did && item.handle);

    // The Action Center is tactical. Large destination accounts belong in the
    // target layer; this queue focuses on the reachable humans who form bridges
    // and trusted neighborhoods around those destinations.
    const tacticalRecommendations = recommendations.filter((item) => TACTICAL_TYPES.has(item.recommendationType));
    const candidatePool = tacticalRecommendations.slice(0, MAX_PEOPLE);

    const relParams = new URLSearchParams({ actor: actorDid });
    for (const item of candidatePool) relParams.append("others", item.did);
    const relationships = candidatePool.length
      ? (await xrpc<{ relationships?: Relationship[] }>("app.bsky.graph.getRelationships", relParams)).relationships ?? []
      : [];
    const relationByDid = new Map(relationships.map((item) => [item.did, item]));

    const rankedBridges = candidatePool
      .map((recommendation) => ({
        recommendation,
        relation: relationByDid.get(recommendation.did),
        leverage: bridgeLeverage(recommendation, relationByDid.get(recommendation.did)),
      }))
      .sort((a, b) => b.leverage - a.leverage || b.recommendation.independentPaths - a.recommendation.independentPaths);

    const actionRows = await Promise.all(
      rankedBridges.slice(0, 10).map(async ({ recommendation, relation, leverage }) => {
        let feed: FeedItem[] = [];
        try {
          const result = await xrpc<{ feed?: FeedItem[] }>(
            "app.bsky.feed.getAuthorFeed",
            new URLSearchParams({ actor: recommendation.did, limit: String(FEED_LIMIT) }),
          );
          feed = result.feed ?? [];
        } catch {
          feed = [];
        }
        const selected = bestPost(feed, recommendation.did);
        const targets = targetHandles(recommendation.metadata);
        const hours = selected?.hours ?? 999;
        const post = selected?.post;
        const freshnessBonus = hours <= 12 ? 18 : hours <= 36 ? 11 : hours <= 72 ? 5 : 0;
        const warmBonus = relation?.followedBy ? 12 : relation?.following ? 6 : 0;
        const opportunityScore = Math.min(100, Math.round(leverage * 0.72 + freshnessBonus + warmBonus));
        return {
          did: recommendation.did,
          handle: recommendation.handle,
          displayName: recommendation.displayName,
          followersCount: recommendation.followersCount,
          recommendationType: recommendation.recommendationType,
          relationshipRole: relationshipRole(recommendation.recommendationType),
          bridgeLeverage: leverage,
          independentPaths: recommendation.independentPaths,
          opportunityScore,
          action: actionLabel(relation, hours, recommendation.recommendationType, recommendation.independentPaths),
          reason: actionReason(recommendation, relation, targets, hours),
          targetHandles: targets,
          following: Boolean(relation?.following),
          followedBy: Boolean(relation?.followedBy),
          post: post?.uri
            ? {
                uri: post.uri,
                url: atUriToPostUrl(post.uri, recommendation.handle),
                text: compactText(String(post.record?.text ?? "")),
                createdAt: post.record?.createdAt ?? null,
                ageHours: Math.round(hours * 10) / 10,
                likes: post.likeCount ?? 0,
                replies: post.replyCount ?? 0,
                reposts: post.repostCount ?? 0,
                quotes: post.quoteCount ?? 0,
              }
            : null,
        };
      }),
    );

    const actions = actionRows.sort((a, b) => b.opportunityScore - a.opportunityScore).slice(0, 6);

    const topPeople = rankedBridges.slice(0, 8).map(({ recommendation, relation, leverage }) => ({
      did: recommendation.did,
      handle: recommendation.handle,
      displayName: recommendation.displayName,
      followersCount: recommendation.followersCount,
      importance: recommendation.importance,
      reciprocity: recommendation.reciprocity,
      independentPaths: recommendation.independentPaths,
      interactionStrength: maxInteraction(recommendation.metadata),
      bridgeLeverage: leverage,
      relationshipRole: relationshipRole(recommendation.recommendationType),
      targetHandles: targetHandles(recommendation.metadata),
      following: Boolean(relation?.following),
      followedBy: Boolean(relation?.followedBy),
    }));

    const bestieSignals = tacticalRecommendations
      .filter((item) =>
        ["target-bestie", "bestie-of-bestie", "bridge-bestie", "second-wave-bestie"].includes(item.recommendationType),
      )
      .map((item) => {
        const relation = relationByDid.get(item.did);
        const leverage = bridgeLeverage(item, relation);
        return {
          did: item.did,
          handle: item.handle,
          displayName: item.displayName,
          followersCount: item.followersCount,
          signalStrength: Math.max(leverage, item.importance, maxInteraction(item.metadata)),
          interactionStrength: maxInteraction(item.metadata),
          independentPaths: item.independentPaths,
          bridgeLeverage: leverage,
          type: item.recommendationType,
          targetHandles: targetHandles(item.metadata),
        };
      })
      .sort((a, b) => b.signalStrength - a.signalStrength)
      .slice(0, 6);

    const clusterMap = new Map<string, { count: number; score: number; paths: number }>();
    for (const item of tacticalRecommendations) {
      for (const target of targetHandles(item.metadata)) {
        const current = clusterMap.get(target) ?? { count: 0, score: 0, paths: 0 };
        current.count += 1;
        current.score += item.importance;
        current.paths += item.independentPaths;
        clusterMap.set(target, current);
      }
    }
    const clusters = [...clusterMap.entries()]
      .map(([handle, value]) => ({
        handle,
        people: value.count,
        independentPaths: value.paths,
        strength: Math.round(value.score / Math.max(1, value.count)),
      }))
      .sort((a, b) => b.independentPaths - a.independentPaths || b.strength - a.strength || b.people - a.people)
      .slice(0, 6);

    return NextResponse.json({
      runId,
      generatedAt: new Date().toISOString(),
      actions,
      topPeople,
      bestieSignals,
      clusters,
      note:
        "The Action Center deliberately excludes pure destination accounts. It prioritizes the reachable bridge, bestie, and emerging-trust relationships that can create multiple independent warm paths into those destination neighborhoods. Likes and replies are suggestions only and are never automated.",
    });
  } catch (error) {
    console.error("Advanced Network Action Center failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Action Center failed." },
      { status: 502 },
    );
  }
}
