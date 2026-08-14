import { NextRequest, NextResponse } from "next/server";
import { hasAdvancedNetworkAccess } from "@/lib/advanced-network-access";

export const runtime = "nodejs";

const PUBLIC_API = "https://public.api.bsky.app/xrpc";
const MAX_MUTUAL_SCAN_FOLLOWERS = 2_000;
const SNAPSHOT_COOLDOWN_MS = 10 * 60 * 1000;

type NetworkLevelDefinition = {
  level: number;
  title: string;
  minXp: number;
};

const NETWORK_LEVELS: NetworkLevelDefinition[] = [
  { level: 1, title: "Starting Point", minXp: 0 },
  { level: 2, title: "Connector", minXp: 150 },
  { level: 3, title: "Bridge Builder", minXp: 350 },
  { level: 4, title: "Network Weaver", minXp: 650 },
  { level: 5, title: "Cluster Builder", minXp: 1_050 },
  { level: 6, title: "Social Proof", minXp: 1_600 },
  { level: 7, title: "Neighborhood Insider", minXp: 2_300 },
  { level: 8, title: "Network Architect", minXp: 3_200 },
  { level: 9, title: "Constellation", minXp: 4_300 },
  { level: 10, title: "Network Gravity", minXp: 5_600 },
];

type Profile = {
  did: string;
  handle: string;
  displayName?: string;
  followersCount?: number;
  followsCount?: number;
  postsCount?: number;
};

type Relationship = {
  did?: string;
  following?: string;
  followedBy?: string;
};

type NeonResponse = {
  rows?: Array<Array<string | null>>;
};

type SnapshotMetrics = {
  followersCount?: number;
  followsCount?: number;
  mutualsCount?: number;
  postsCount?: number;
  networkXp?: number;
  baseline?: boolean;
  source?: string;
  followersCountNote?: string;
  mutualsSampled?: boolean;
  sampledFollowerCount?: number;
};

type Snapshot = {
  capturedAt: string;
  metrics: SnapshotMetrics;
};

type GrowthStats = {
  bridgePeople: number;
  independentPaths: number;
  newBridgePeople: number;
  newIndependentPaths: number;
  followBacks: number;
  interactionScore: number;
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

async function publicJson<T>(method: string, params: Record<string, string | number | undefined>) {
  const url = new URL(`${PUBLIC_API}/${method}`);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }
  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Bluesky returned ${response.status} while refreshing network progress.`);
  return (await response.json()) as T;
}

async function collectFollowerDids(actor: string) {
  const dids: string[] = [];
  const seen = new Set<string>();
  let cursor: string | undefined;
  let complete = true;

  do {
    const payload = await publicJson<{
      cursor?: string;
      followers?: Array<{ did?: string }>;
    }>("app.bsky.graph.getFollowers", {
      actor,
      limit: 100,
      cursor,
    });

    for (const follower of payload.followers ?? []) {
      if (!follower.did || seen.has(follower.did)) continue;
      seen.add(follower.did);
      dids.push(follower.did);
      if (dids.length >= MAX_MUTUAL_SCAN_FOLLOWERS) {
        complete = !payload.cursor;
        return { dids, complete };
      }
    }
    cursor = payload.cursor;
  } while (cursor);

  return { dids, complete };
}

async function countMutuals(actorDid: string) {
  const followers = await collectFollowerDids(actorDid);
  let mutuals = 0;

  for (let index = 0; index < followers.dids.length; index += 30) {
    const batch = followers.dids.slice(index, index + 30);
    const url = new URL(`${PUBLIC_API}/app.bsky.graph.getRelationships`);
    url.searchParams.set("actor", actorDid);
    for (const did of batch) url.searchParams.append("others", did);

    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`Bluesky returned ${response.status} while checking mutual relationships.`);

    const payload = (await response.json()) as { relationships?: Relationship[] };
    mutuals += (payload.relationships ?? []).filter(
      (relationship) => Boolean(relationship.following && relationship.followedBy),
    ).length;
  }

  return {
    count: mutuals,
    complete: followers.complete,
    sampledFollowerCount: followers.dids.length,
  };
}

function parseSnapshotRow(row: Array<string | null> | undefined): Snapshot | null {
  if (!row?.[0]) return null;
  let metrics: SnapshotMetrics = {};
  try {
    metrics = row[1] ? (JSON.parse(row[1]) as SnapshotMetrics) : {};
  } catch {
    metrics = {};
  }
  return { capturedAt: row[0], metrics };
}

function metric(metrics: SnapshotMetrics, key: "followersCount" | "followsCount" | "mutualsCount") {
  const value = metrics[key];
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function numeric(value: string | null | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

async function getGrowthStats(accountId: string, actorDid: string, baselineAt: string): Promise<GrowthStats> {
  const bridgeResult = await neonQuery(
    `WITH targets AS (
       SELECT DISTINCT t.target_did
       FROM public.advanced_network_targets t
       JOIN public.advanced_network_campaigns c ON c.id=t.campaign_id
       WHERE c.account_id=$1::uuid
         AND c.status='active'
         AND t.status IN ('active','candidate')
     ),
     mutual_user AS (
       SELECT e1.target_did AS bridge_did,
              GREATEST(e1.first_seen_at,e2.first_seen_at) AS relationship_seen_at
       FROM public.advanced_network_follow_edges e1
       JOIN public.advanced_network_follow_edges e2
         ON e2.source_did=e1.target_did
        AND e2.target_did=e1.source_did
        AND e2.active=true
       WHERE e1.source_did=$2
         AND e1.active=true
     ),
     twohop AS (
       SELECT DISTINCT m.bridge_did,
              t.target_did,
              GREATEST(m.relationship_seen_at,bt.first_seen_at,tb.first_seen_at) AS path_seen_at
       FROM mutual_user m
       JOIN public.advanced_network_follow_edges bt
         ON bt.source_did=m.bridge_did AND bt.active=true
       JOIN public.advanced_network_follow_edges tb
         ON tb.source_did=bt.target_did
        AND tb.target_did=m.bridge_did
        AND tb.active=true
       JOIN targets t ON t.target_did=bt.target_did
     )
     SELECT COUNT(DISTINCT bridge_did)::text,
            COUNT(*)::text,
            COUNT(DISTINCT bridge_did) FILTER (WHERE path_seen_at >= $3::timestamptz)::text,
            COUNT(*) FILTER (WHERE path_seen_at >= $3::timestamptz)::text
     FROM twohop`,
    [accountId, actorDid, baselineAt],
  );

  const outcomeResult = await neonQuery(
    `SELECT COUNT(DISTINCT target_did) FILTER (
              WHERE followed_back_at IS NOT NULL AND followed_back_at >= $2::timestamptz
            )::text
     FROM public.advanced_network_recommendations
     WHERE account_id=$1::uuid`,
    [accountId, baselineAt],
  );

  const interactionResult = await neonQuery(
    `SELECT COALESCE(SUM(interaction_score),0)::text
     FROM public.advanced_network_interaction_scores
     WHERE (actor_did=$1 OR peer_did=$1)
       AND updated_at >= $2::timestamptz`,
    [actorDid, baselineAt],
  );

  const bridgeRow = bridgeResult.rows?.[0] ?? [];
  return {
    bridgePeople: numeric(bridgeRow[0]),
    independentPaths: numeric(bridgeRow[1]),
    newBridgePeople: numeric(bridgeRow[2]),
    newIndependentPaths: numeric(bridgeRow[3]),
    followBacks: numeric(outcomeResult.rows?.[0]?.[0]),
    interactionScore: numeric(interactionResult.rows?.[0]?.[0]),
  };
}

function calculateNetworkXp(
  delta: { followers: number; mutuals: number },
  stats: GrowthStats,
) {
  const breakdown = {
    followerGrowth: Math.min(400, Math.max(0, delta.followers) * 4),
    mutualGrowth: Math.min(700, Math.max(0, delta.mutuals) * 35),
    bridgeGrowth: Math.min(540, stats.newBridgePeople * 18),
    pathGrowth: Math.min(
      260,
      stats.newIndependentPaths > 0
        ? Math.round(Math.log2(stats.newIndependentPaths + 1) * 28)
        : 0,
    ),
    followBacks: Math.min(700, stats.followBacks * 70),
    interactions: Math.min(
      300,
      stats.interactionScore > 0
        ? Math.round(Math.log2(stats.interactionScore + 1) * 20)
        : 0,
    ),
  };

  return {
    xp: Object.values(breakdown).reduce((sum, value) => sum + value, 0),
    breakdown,
  };
}

function levelForXp(xp: number) {
  let current = NETWORK_LEVELS[0];
  for (const level of NETWORK_LEVELS) {
    if (xp >= level.minXp) current = level;
  }
  const next = NETWORK_LEVELS.find((level) => level.level === current.level + 1) ?? null;
  const span = next ? Math.max(1, next.minXp - current.minXp) : 1;
  const progress = next
    ? Math.round(Math.max(0, Math.min(1, (xp - current.minXp) / span)) * 100)
    : 100;
  return { current, next, progress };
}

export async function GET(request: NextRequest) {
  try {
    if (!(await hasAdvancedNetworkAccess())) {
      return NextResponse.json({ error: "Advanced Network access is required." }, { status: 401 });
    }

    const actor = request.nextUrl.searchParams.get("actor")?.trim();
    if (!actor) return NextResponse.json({ error: "Connect a Bluesky account first." }, { status: 400 });

    const profile = await publicJson<Profile>("app.bsky.actor.getProfile", { actor });
    if (!profile.did || !profile.handle) {
      return NextResponse.json({ error: "That Bluesky account could not be resolved." }, { status: 404 });
    }

    const accountResult = await neonQuery(
      `INSERT INTO public.advanced_network_accounts (bluesky_did, handle, display_name, access_status, plan)
       VALUES ($1, $2, $3, 'approved', 'beta')
       ON CONFLICT (bluesky_did) DO UPDATE SET
         handle = EXCLUDED.handle,
         display_name = EXCLUDED.display_name,
         updated_at = now()
       RETURNING id::text`,
      [profile.did, profile.handle, profile.displayName ?? null],
    );
    const accountId = accountResult.rows?.[0]?.[0];
    if (!accountId) throw new Error("Advanced Network account could not be initialized.");

    const mutuals = await countMutuals(profile.did);

    const snapshotsResult = await neonQuery(
      `SELECT captured_at::text, metrics::text
       FROM public.advanced_network_snapshots
       WHERE account_id = $1::uuid
       ORDER BY captured_at ASC`,
      [accountId],
    );
    let snapshots = (snapshotsResult.rows ?? []).map(parseSnapshotRow).filter(Boolean) as Snapshot[];

    if (snapshots.length === 0) {
      const baselineMetrics: SnapshotMetrics = {
        followersCount: Math.max(0, profile.followersCount ?? 0),
        followsCount: Math.max(0, profile.followsCount ?? 0),
        mutualsCount: mutuals.count,
        postsCount: Math.max(0, profile.postsCount ?? 0),
        networkXp: 0,
        baseline: true,
        source: "first-advanced-network-login",
        mutualsSampled: !mutuals.complete,
        sampledFollowerCount: mutuals.sampledFollowerCount,
      };
      const insertBaseline = await neonQuery(
        `INSERT INTO public.advanced_network_snapshots (account_id, captured_at, metrics, graph_summary)
         VALUES ($1::uuid, now(), $2::jsonb, '{"baselineEstablishedBy":"first-login"}'::jsonb)
         RETURNING captured_at::text, metrics::text`,
        [accountId, JSON.stringify(baselineMetrics)],
      );
      const created = parseSnapshotRow(insertBaseline.rows?.[0]);
      snapshots = created ? [created] : [{ capturedAt: new Date().toISOString(), metrics: baselineMetrics }];
    }

    const baseline = snapshots[0];
    const baseDelta = {
      followers: Math.max(0, profile.followersCount ?? 0) - metric(baseline.metrics, "followersCount"),
      follows: Math.max(0, profile.followsCount ?? 0) - metric(baseline.metrics, "followsCount"),
      mutuals: mutuals.count - metric(baseline.metrics, "mutualsCount"),
    };

    const growthStats = await getGrowthStats(accountId, profile.did, baseline.capturedAt);
    const calculated = calculateNetworkXp(baseDelta, growthStats);
    const historicalXp = snapshots.reduce(
      (max, snapshot) => Math.max(max, Number(snapshot.metrics.networkXp ?? 0)),
      0,
    );
    const networkXp = Math.max(historicalXp, calculated.xp);
    const level = levelForXp(networkXp);

    const currentMetrics: SnapshotMetrics = {
      followersCount: Math.max(0, profile.followersCount ?? 0),
      followsCount: Math.max(0, profile.followsCount ?? 0),
      mutualsCount: mutuals.count,
      postsCount: Math.max(0, profile.postsCount ?? 0),
      networkXp,
      baseline: false,
      source: "live-login-reconciliation",
      mutualsSampled: !mutuals.complete,
      sampledFollowerCount: mutuals.sampledFollowerCount,
    };

    const latest = snapshots.at(-1)!;
    const latestAt = Date.parse(latest.capturedAt);
    const changed =
      metric(latest.metrics, "followersCount") !== metric(currentMetrics, "followersCount") ||
      metric(latest.metrics, "followsCount") !== metric(currentMetrics, "followsCount") ||
      metric(latest.metrics, "mutualsCount") !== metric(currentMetrics, "mutualsCount") ||
      Number(latest.metrics.networkXp ?? 0) !== networkXp;
    const stale = !Number.isFinite(latestAt) || Date.now() - latestAt >= SNAPSHOT_COOLDOWN_MS;

    let current: Snapshot = { capturedAt: new Date().toISOString(), metrics: currentMetrics };
    if (changed || stale) {
      const insertResult = await neonQuery(
        `INSERT INTO public.advanced_network_snapshots (account_id, captured_at, metrics, graph_summary)
         VALUES ($1::uuid, now(), $2::jsonb, $3::jsonb)
         RETURNING captured_at::text, metrics::text`,
        [
          accountId,
          JSON.stringify(currentMetrics),
          JSON.stringify({
            observableFollowersChecked: mutuals.sampledFollowerCount,
            mutualScanComplete: mutuals.complete,
            networkLevel: level.current.level,
            networkLevelTitle: level.current.title,
            bridgePeople: growthStats.bridgePeople,
            independentPaths: growthStats.independentPaths,
          }),
        ],
      );
      current = parseSnapshotRow(insertResult.rows?.[0]) ?? current;
    } else {
      current = latest;
    }

    return NextResponse.json({
      actor: {
        did: profile.did,
        handle: profile.handle,
        displayName: profile.displayName,
      },
      baseline,
      current,
      delta: baseDelta,
      continuingExistingHistory: baseline.metrics.source === "aug-14-network-session",
      networkLevel: {
        xp: networkXp,
        level: level.current.level,
        title: level.current.title,
        currentLevelXp: level.current.minXp,
        nextLevelXp: level.next?.minXp ?? null,
        nextLevelTitle: level.next?.title ?? null,
        progressPercent: level.progress,
        breakdown: calculated.breakdown,
        stats: growthStats,
        scoringNote:
          "Network XP rewards quality growth from the saved baseline: mutuals, verified bridge coverage, independent paths, real follow-backs, and interaction. Raw following volume is not rewarded.",
      },
    });
  } catch (error) {
    console.error("Advanced Network progress reconciliation failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Network progress could not be refreshed." },
      { status: 503 },
    );
  }
}
