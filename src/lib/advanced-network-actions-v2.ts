import { NextRequest, NextResponse } from "next/server";
import { hasAdvancedNetworkAccess } from "@/lib/advanced-network-access";
import { relationshipStageRank, type RelationshipStage } from "@/lib/advanced-network-v2";

const XRPC = "https://public.api.bsky.app/xrpc";
const ACTIVE_PORTFOLIO = 8;
const DAILY_ACTIONS = 3;
const FEED_LIMIT = 18;

type NeonResponse = { rows?: Array<Array<string | null>> };
type Relationship = { did: string; following?: string; followedBy?: string };
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
  metadata: Record<string, unknown>;
  displayName?: string;
  followersCount: number;
  stage: RelationshipStage;
  destinationOnly: boolean;
  humanFit: string | null;
};

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
  return Math.max(0, (Date.now() - new Date(createdAt).getTime()) / 3_600_000);
}

function compactText(text: string, max = 180) {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length <= max ? clean : `${clean.slice(0, max - 1)}…`;
}

function bestPost(feed: FeedItem[], did: string) {
  return feed
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
    .sort((a, b) => b.score - a.score)[0] ?? null;
}

function parseMetadata(value: string | null) {
  try {
    return value ? (JSON.parse(value) as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function targetHandles(metadata: Record<string, unknown>) {
  return Array.isArray(metadata.targetHandles)
    ? metadata.targetHandles.filter((value): value is string => typeof value === "string")
    : [];
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

function bridgeRole(type: string) {
  if (type === "warm-follower-bridge") return "Direct warm bridge";
  if (type === "target-bestie") return "Target-circle connection";
  if (type === "bridge-bestie") return "Bridge-circle connection";
  if (type === "second-wave-bestie") return "Second-wave circle";
  return "Bestie-of-bestie route";
}

function stageBonus(stage: RelationshipStage) {
  return { structural: -20, active: 5, activated: 18, converted: 28 }[stage];
}

function actionLabel(relation: Relationship | undefined, hours: number, stage: RelationshipStage) {
  if (relation?.followedBy && !relation.following) return "Follow back + reply";
  if (hours <= 12) return "Reply while fresh";
  if (hours <= 48) return "Like + thoughtful reply";
  if (stage === "converted") return "Keep the relationship warm";
  return relation?.following ? "Reconnect" : "Follow + engage";
}

function actionReason(
  recommendation: RecommendationRow,
  relation: Relationship | undefined,
  targets: string[],
  hours: number,
) {
  const destination = targets[0] ? ` toward @${targets[0]}` : " in a useful target circle";
  if (relation?.followedBy && !relation.following) {
    return `They already follow you. Following back and having a real conversation is a low-friction way to activate this bridge${destination}.`;
  }
  if (recommendation.stage === "converted") {
    return `This bridge is already reciprocal. A timely, substantive interaction helps keep the relationship visible and durable${destination}.`;
  }
  if (hours <= 24) {
    return `A high-value bridge person has a fresh post now. Engage them—not the celebrity destination—to strengthen social proof${destination}.`;
  }
  return recommendation.reason;
}

export async function runAdvancedNetworkActionsV2(request: NextRequest) {
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
        note: "Run Find people to follow once to build your first bridge portfolio.",
      });
    }

    const result = await neonQuery(
      `SELECT rec.target_did,rec.target_handle,rec.recommendation_type,rec.reason,
              rec.importance_score::text,rec.follow_back_likelihood::text,
              rec.independent_paths::text,rec.metadata::text,p.display_name,
              COALESCE(p.followers_count,0)::text
       FROM public.advanced_network_recommendations rec
       LEFT JOIN public.advanced_network_profiles p ON p.did=rec.target_did
       JOIN public.advanced_network_accounts a ON a.id=rec.account_id
       WHERE a.bluesky_did=$1 AND rec.run_id=$2::uuid
       ORDER BY rec.importance_score DESC,rec.independent_paths DESC
       LIMIT 60`,
      [actorDid, runId],
    );

    const recommendations: RecommendationRow[] = (result.rows ?? [])
      .map((row) => {
        const metadata = parseMetadata(row[7]);
        const stage = String(metadata.relationshipStage ?? "structural") as RelationshipStage;
        return {
          did: row[0] ?? "",
          handle: row[1] ?? "",
          recommendationType: row[2] ?? "",
          reason: row[3] ?? "",
          importance: Number(row[4] ?? 0),
          reciprocity: Number(row[5] ?? 0),
          independentPaths: Number(row[6] ?? 0),
          metadata,
          displayName: row[8] ?? undefined,
          followersCount: Number(row[9] ?? 0),
          stage,
          destinationOnly: metadata.destinationOnly === true || metadata.destinationOnly === "true",
          humanFit: typeof metadata.humanFit === "string" ? metadata.humanFit : null,
        };
      })
      .filter((item) => item.did && item.handle)
      .filter((item) => !item.destinationOnly)
      .filter((item) => !["not-for-me", "not-my-audience"].includes(item.humanFit ?? ""))
      .filter((item) => relationshipStageRank(item.stage) >= relationshipStageRank("active"));

    const portfolio = recommendations.slice(0, ACTIVE_PORTFOLIO);
    const params = new URLSearchParams({ actor: actorDid });
    for (const item of portfolio) params.append("others", item.did);
    const relationships = portfolio.length
      ? (await xrpc<{ relationships?: Relationship[] }>("app.bsky.graph.getRelationships", params)).relationships ?? []
      : [];
    const relationByDid = new Map(relationships.map((item) => [item.did, item]));

    const actionRows = await Promise.all(
      portfolio.map(async (recommendation) => {
        let feed: FeedItem[] = [];
        try {
          const payload = await xrpc<{ feed?: FeedItem[] }>(
            "app.bsky.feed.getAuthorFeed",
            new URLSearchParams({ actor: recommendation.did, limit: String(FEED_LIMIT) }),
          );
          feed = payload.feed ?? [];
        } catch {
          feed = [];
        }
        const selected = bestPost(feed, recommendation.did);
        const relation = relationByDid.get(recommendation.did);
        const targets = targetHandles(recommendation.metadata);
        const hours = selected?.hours ?? 999;
        const post = selected?.post;
        const freshness = hours <= 12 ? 20 : hours <= 36 ? 12 : hours <= 72 ? 6 : 0;
        const warm = relation?.followedBy ? 18 : relation?.following ? 8 : 0;
        const leverage = Math.min(100, recommendation.importance + recommendation.independentPaths * 7);
        const opportunityScore = Math.round(
          recommendation.importance * 0.46 +
            recommendation.reciprocity * 0.17 +
            leverage * 0.15 +
            stageBonus(recommendation.stage) +
            freshness +
            warm,
        );
        return {
          did: recommendation.did,
          handle: recommendation.handle,
          displayName: recommendation.displayName,
          followersCount: recommendation.followersCount,
          recommendationType: recommendation.recommendationType,
          relationshipRole: bridgeRole(recommendation.recommendationType),
          bridgeLeverage: leverage,
          independentPaths: recommendation.independentPaths,
          opportunityScore,
          action: actionLabel(relation, hours, recommendation.stage),
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
          stage: recommendation.stage,
        };
      }),
    );

    const actions = actionRows
      .sort((a, b) => b.opportunityScore - a.opportunityScore)
      .slice(0, DAILY_ACTIONS);

    const topPeople = portfolio.slice(0, 6).map((item) => {
      const relation = relationByDid.get(item.did);
      return {
        did: item.did,
        handle: item.handle,
        displayName: item.displayName,
        followersCount: item.followersCount,
        importance: item.importance,
        reciprocity: item.reciprocity,
        independentPaths: item.independentPaths,
        interactionStrength: maxInteraction(item.metadata),
        bridgeLeverage: Math.min(100, item.importance + item.independentPaths * 7),
        relationshipRole: bridgeRole(item.recommendationType),
        targetHandles: targetHandles(item.metadata),
        following: Boolean(relation?.following),
        followedBy: Boolean(relation?.followedBy),
        stage: item.stage,
      };
    });

    const bestieSignals = recommendations
      .filter((item) =>
        ["target-bestie", "bestie-of-bestie", "bridge-bestie", "second-wave-bestie"].includes(
          item.recommendationType,
        ),
      )
      .map((item) => ({
        did: item.did,
        handle: item.handle,
        displayName: item.displayName,
        followersCount: item.followersCount,
        signalStrength: Math.max(item.importance, maxInteraction(item.metadata)),
        interactionStrength: maxInteraction(item.metadata),
        independentPaths: item.independentPaths,
        bridgeLeverage: Math.min(100, item.importance + item.independentPaths * 7),
        type: item.recommendationType,
        targetHandles: targetHandles(item.metadata),
        stage: item.stage,
      }))
      .sort((a, b) => b.signalStrength - a.signalStrength)
      .slice(0, 5);

    const clusterMap = new Map<string, { people: Set<string>; paths: number; score: number }>();
    for (const item of recommendations) {
      for (const target of targetHandles(item.metadata)) {
        const current = clusterMap.get(target) ?? { people: new Set<string>(), paths: 0, score: 0 };
        current.people.add(item.did);
        current.paths += item.independentPaths;
        current.score += item.importance;
        clusterMap.set(target, current);
      }
    }
    const clusters = [...clusterMap.entries()]
      .map(([handle, value]) => ({
        handle,
        people: value.people.size,
        independentPaths: value.paths,
        strength: Math.round(value.score / Math.max(1, value.people.size)),
      }))
      .sort((a, b) => b.independentPaths - a.independentPaths || b.strength - a.strength)
      .slice(0, 6);

    return NextResponse.json({
      runId,
      generatedAt: new Date().toISOString(),
      actions,
      topPeople,
      bestieSignals,
      clusters,
      note:
        "The Action Center now keeps only a small active bridge portfolio and returns three timely moves. Structural-only paths and destination accounts are excluded until the relationships show real activity.",
    });
  } catch (error) {
    console.error("Advanced Network Action Center v2 failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Action Center failed." },
      { status: 502 },
    );
  }
}
