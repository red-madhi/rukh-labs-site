import { NextRequest, NextResponse } from "next/server";
import { hasAdvancedNetworkAccess } from "@/lib/advanced-network-access";

export const runtime = "nodejs";

const PUBLIC_API = "https://public.api.bsky.app/xrpc";
const MAX_MUTUAL_SCAN_FOLLOWERS = 2_000;
const SNAPSHOT_COOLDOWN_MS = 10 * 60 * 1000;

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
    const currentMetrics: SnapshotMetrics = {
      followersCount: Math.max(0, profile.followersCount ?? 0),
      followsCount: Math.max(0, profile.followsCount ?? 0),
      mutualsCount: mutuals.count,
      postsCount: Math.max(0, profile.postsCount ?? 0),
      baseline: false,
      source: "live-login-reconciliation",
      mutualsSampled: !mutuals.complete,
      sampledFollowerCount: mutuals.sampledFollowerCount,
    };

    const snapshotsResult = await neonQuery(
      `SELECT captured_at::text, metrics::text
       FROM public.advanced_network_snapshots
       WHERE account_id = $1::uuid
       ORDER BY captured_at ASC`,
      [accountId],
    );
    let snapshots = (snapshotsResult.rows ?? []).map(parseSnapshotRow).filter(Boolean) as Snapshot[];

    if (snapshots.length === 0) {
      const baselineMetrics = { ...currentMetrics, baseline: true, source: "first-advanced-network-login" };
      await neonQuery(
        `INSERT INTO public.advanced_network_snapshots (account_id, captured_at, metrics, graph_summary)
         VALUES ($1::uuid, now(), $2::jsonb, '{"baselineEstablishedBy":"first-login"}'::jsonb)`,
        [accountId, JSON.stringify(baselineMetrics)],
      );
      const now = new Date().toISOString();
      snapshots = [{ capturedAt: now, metrics: baselineMetrics }];
    }

    const latest = snapshots.at(-1)!;
    const latestAt = Date.parse(latest.capturedAt);
    const changed =
      metric(latest.metrics, "followersCount") !== metric(currentMetrics, "followersCount") ||
      metric(latest.metrics, "followsCount") !== metric(currentMetrics, "followsCount") ||
      metric(latest.metrics, "mutualsCount") !== metric(currentMetrics, "mutualsCount");
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
          }),
        ],
      );
      current = parseSnapshotRow(insertResult.rows?.[0]) ?? current;
    } else {
      current = latest;
    }

    const baseline = snapshots[0];
    return NextResponse.json({
      actor: {
        did: profile.did,
        handle: profile.handle,
        displayName: profile.displayName,
      },
      baseline,
      current,
      delta: {
        followers: metric(current.metrics, "followersCount") - metric(baseline.metrics, "followersCount"),
        follows: metric(current.metrics, "followsCount") - metric(baseline.metrics, "followsCount"),
        mutuals: metric(current.metrics, "mutualsCount") - metric(baseline.metrics, "mutualsCount"),
      },
      continuingExistingHistory: baseline.metrics.source === "aug-14-network-session",
    });
  } catch (error) {
    console.error("Advanced Network progress reconciliation failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Network progress could not be refreshed." },
      { status: 503 },
    );
  }
}
