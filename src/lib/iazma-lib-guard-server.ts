/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import { createDecipheriv, createHash, randomUUID } from "node:crypto";
import { neon } from "@neondatabase/serverless";
import { ensureGuardSchema, syncIazmaGuardReciprocity } from "@/lib/iazma-guard-server";
import {
  DEFAULT_LIB_GUARD_SETTINGS,
  assessLibGuardProfile,
  normalizeLibGuardSettings,
} from "@/lib/iazma-lib-guard-classify";

const PUBLIC_API = "https://public.api.bsky.app/xrpc";
const FOLLOW = "app.bsky.graph.follow";
const MAX_SCAN_BATCH_SIZE = 4;
const SCAN_SPACING_MS = 700;
const BULK_LIMIT = 40;
const BULK_MUTE_SPACING_MS = 650;
const BULK_UNFOLLOW_SPACING_MS = 900;
const REQUEST_TIMEOUT_MS = 15_000;
const SESSION_CACHE_MAX_MS = 30 * 60_000;
const SESSION_CACHE_SAFETY_MS = 90_000;
const RATE_LIMIT_FALLBACK_MS = 120_000;
const RATE_LIMIT_MINIMUM_MS = 15_000;
const RATE_LIMIT_MAXIMUM_MS = 15 * 60_000;

type GuardSession = {
  did: string;
  accessJwt: string;
  refreshJwt?: string;
  handle?: string;
  pdsUrl: string;
};

type CachedGuardSession = {
  actor: string;
  fingerprint: string;
  expiresAt: number;
  session: GuardSession;
};

type LibGuardGlobal = typeof globalThis & {
  __iazmaLibGuardSession?: CachedGuardSession;
};

class BlueskyRateLimitError extends Error {
  retryAfterMs: number;

  constructor(message: string, retryAfterMs: number) {
    super(`Bluesky rate limit: ${message}`);
    this.name = "BlueskyRateLimitError";
    this.retryAfterMs = retryAfterMs;
  }
}

function getSql() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not configured.");
  return neon(process.env.DATABASE_URL);
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function boundedRetryAfter(value: number) {
  return Math.max(RATE_LIMIT_MINIMUM_MS, Math.min(RATE_LIMIT_MAXIMUM_MS, Math.ceil(value)));
}

function responseRetryAfterMs(response: Response) {
  const retryAfter = response.headers.get("retry-after");
  if (retryAfter) {
    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds) && seconds >= 0) return boundedRetryAfter(seconds * 1000);
    const retryDate = Date.parse(retryAfter);
    if (Number.isFinite(retryDate)) return boundedRetryAfter(Math.max(0, retryDate - Date.now()));
  }
  const reset = response.headers.get("ratelimit-reset") ?? response.headers.get("x-ratelimit-reset");
  if (reset) {
    const value = Number(reset);
    if (Number.isFinite(value)) {
      const asTimestamp = value > 1_000_000_000 ? value * 1000 - Date.now() : value * 1000;
      return boundedRetryAfter(Math.max(0, asTimestamp));
    }
  }
  return RATE_LIMIT_FALLBACK_MS;
}

function bodyError(body: Record<string, unknown>, fallback: string) {
  const message = body.message ?? body.error;
  return typeof message === "string" && message ? message : fallback;
}

async function fetchJson(url: string | URL, init?: RequestInit) {
  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      cache: "no-store",
      signal: init?.signal ?? AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    if (error instanceof Error && ["AbortError", "TimeoutError"].includes(error.name)) {
      throw new Error("Bluesky request timed out.");
    }
    throw error;
  }

  const text = await response.text();
  let body: Record<string, unknown> = {};
  let unreadable = "";
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      unreadable = text.trim();
    }
  }
  if (!response.ok) {
    const message = unreadable || bodyError(body, `Bluesky returned ${response.status}.`);
    if (response.status === 429 || /rate\s*limit|too many requests/i.test(message)) {
      throw new BlueskyRateLimitError(message, responseRetryAfterMs(response));
    }
    if (unreadable) throw new Error(`Bluesky returned an unreadable error response (${response.status}).`);
    throw new Error(message);
  }
  if (unreadable) throw new Error("Bluesky returned an unreadable response.");
  return body;
}

function encryptionKey() {
  const secret = process.env.ADVANCED_NETWORK_ACCESS_SECRET?.trim();
  if (!secret) throw new Error("Advanced network secret is not configured.");
  return createHash("sha256").update(`rukh-bluesky-follow-automation:${secret}`).digest();
}

function decryptSecret(value: string) {
  const [version, ivText, tagText, encryptedText] = value.split(".");
  if (version !== "v1" || !ivText || !tagText || !encryptedText) {
    throw new Error("Saved Bluesky credential is unreadable.");
  }
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(ivText, "base64url"));
  decipher.setAuthTag(Buffer.from(tagText, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedText, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

async function resolvePds(did: string) {
  const doc = did.startsWith("did:plc:")
    ? await fetchJson(`https://plc.directory/${did}`)
    : await fetchJson(`https://${did.slice("did:web:".length).split(":")[0]}/.well-known/did.json`);
  const service = doc.service?.find((item) => item.id?.endsWith("#atproto_pds"));
  if (!service || typeof service.serviceEndpoint !== "string") throw new Error("Could not resolve Bluesky PDS.");
  return service.serviceEndpoint.replace(/\/$/, "");
}

function jwtExpiryMs(jwt?: string) {
  if (!jwt) return 0;
  try {
    const payload = jwt.split(".")[1];
    if (!payload) return 0;
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    const exp = Number(parsed.exp);
    return Number.isFinite(exp) ? exp * 1000 : 0;
  } catch {
    return 0;
  }
}

async function configuredSession(): Promise<GuardSession> {
  const sql = getSql();
  const rows = await sql`
    SELECT actor_handle,app_password_enc
    FROM bluesky_follow_automation_settings
    WHERE id=1
  `;
  const current = rows[0];
  if (!current?.app_password_enc) throw new Error("Save the Bluesky app password in IAZMA Auto DM first.");

  const actor = String(current.actor_handle);
  const encryptedPassword = String(current.app_password_enc);
  const fingerprint = createHash("sha256").update(encryptedPassword).digest("base64url").slice(0, 20);
  const holder = globalThis as LibGuardGlobal;
  const cached = holder.__iazmaLibGuardSession;
  if (
    cached &&
    cached.actor === actor &&
    cached.fingerprint === fingerprint &&
    cached.expiresAt > Date.now() + SESSION_CACHE_SAFETY_MS
  ) {
    return cached.session;
  }

  const password = decryptSecret(encryptedPassword);
  const didResult = await fetchJson(`${PUBLIC_API}/com.atproto.identity.resolveHandle?handle=${encodeURIComponent(actor)}`);
  const pdsUrl = await resolvePds(String(didResult.did));
  const created = await fetchJson(`${pdsUrl}/xrpc/com.atproto.server.createSession`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ identifier: actor, password }),
  });
  const session = { ...created, pdsUrl } as GuardSession;
  const tokenExpiry = jwtExpiryMs(session.accessJwt);
  const expiresAt = Math.min(
    tokenExpiry > Date.now() ? tokenExpiry : Date.now() + SESSION_CACHE_MAX_MS,
    Date.now() + SESSION_CACHE_MAX_MS,
  );
  holder.__iazmaLibGuardSession = { actor, fingerprint, expiresAt, session };
  return session;
}

async function authXrpc(session: GuardSession, method: string, body: unknown) {
  return fetchJson(`${session.pdsUrl}/xrpc/${method}`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${session.accessJwt}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

function rkey(uri: string) {
  return uri.split("/").pop() || "";
}

async function deleteFollow(session: GuardSession, uri: string) {
  await authXrpc(session, "com.atproto.repo.deleteRecord", {
    repo: session.did,
    collection: FOLLOW,
    rkey: rkey(uri),
  });
}

async function muteActor(session: GuardSession, did: string) {
  await authXrpc(session, "app.bsky.graph.muteActor", { actor: did });
}

async function unmuteActor(session: GuardSession, did: string) {
  await authXrpc(session, "app.bsky.graph.unmuteActor", { actor: did });
}

async function authorFeed(did: string) {
  const url = new URL(`${PUBLIC_API}/app.bsky.feed.getAuthorFeed`);
  url.searchParams.set("actor", did);
  url.searchParams.set("limit", "50");
  return (await fetchJson(url)).feed ?? [];
}

async function profiles(dids: string[]) {
  if (!dids.length) return [];
  const url = new URL(`${PUBLIC_API}/app.bsky.actor.getProfiles`);
  for (const did of dids.slice(0, 25)) url.searchParams.append("actors", did);
  return (await fetchJson(url)).profiles ?? [];
}

export async function ensureLibGuardSchema() {
  await ensureGuardSchema();
  const sql = getSql();
  await sql`
    CREATE TABLE IF NOT EXISTS lib_guard_settings (
      owner_did text PRIMARY KEY,
      min_score integer NOT NULL DEFAULT 55,
      low_value_weight integer NOT NULL DEFAULT 50,
      ukraine_weight integer NOT NULL DEFAULT 25,
      lib_media_weight integer NOT NULL DEFAULT 20,
      repost_weight integer NOT NULL DEFAULT 5,
      ukraine_threshold integer NOT NULL DEFAULT 20,
      lib_media_threshold integer NOT NULL DEFAULT 18,
      quarantine_days integer NOT NULL DEFAULT 30,
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS lib_guard_scans (
      id text PRIMARY KEY,
      owner_did text NOT NULL,
      status text NOT NULL DEFAULT 'running',
      total integer NOT NULL DEFAULT 0,
      processed integer NOT NULL DEFAULT 0,
      flagged integer NOT NULL DEFAULT 0,
      errors integer NOT NULL DEFAULT 0,
      started_at timestamptz NOT NULL DEFAULT now(),
      completed_at timestamptz,
      retry_after_at timestamptz
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS lib_guard_assessments (
      owner_did text NOT NULL,
      did text NOT NULL,
      scan_id text REFERENCES lib_guard_scans(id) ON DELETE SET NULL,
      status text NOT NULL DEFAULT 'pending',
      score integer NOT NULL DEFAULT 0,
      recommendation text NOT NULL DEFAULT 'keep',
      network_value integer NOT NULL DEFAULT 0,
      low_network_value integer NOT NULL DEFAULT 0,
      ukraine_saturation integer NOT NULL DEFAULT 0,
      lib_media_saturation integer NOT NULL DEFAULT 0,
      repost_ratio integer NOT NULL DEFAULT 0,
      metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
      categories text[] NOT NULL DEFAULT ARRAY[]::text[],
      evidence jsonb NOT NULL DEFAULT '[]'::jsonb,
      muted_at timestamptz,
      dismissed_at timestamptz,
      unfollowed_at timestamptz,
      assessed_at timestamptz,
      PRIMARY KEY(owner_did,did)
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS lib_guard_assessments_owner_score_idx ON lib_guard_assessments(owner_did,score DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS lib_guard_assessments_scan_status_idx ON lib_guard_assessments(scan_id,status)`;
  return sql;
}

async function ensureOwnerSettings(sql, ownerDid: string) {
  await sql`INSERT INTO lib_guard_settings(owner_did) VALUES (${ownerDid}) ON CONFLICT(owner_did) DO NOTHING`;
}

async function loadSettings(sql, ownerDid: string) {
  await ensureOwnerSettings(sql, ownerDid);
  const row = (await sql`
    SELECT min_score,low_value_weight,ukraine_weight,lib_media_weight,repost_weight,
           ukraine_threshold,lib_media_threshold,quarantine_days
    FROM lib_guard_settings
    WHERE owner_did=${ownerDid}
  `)[0] ?? DEFAULT_LIB_GUARD_SETTINGS;
  return normalizeLibGuardSettings(row);
}

async function advancedSignals(sql, ownerDid: string, did: string) {
  const signals = {
    outgoingInteraction: 0,
    incomingInteraction: 0,
    interactionAvailable: false,
    importanceScore: 0,
    expectedBridgeValue: 0,
    visibilityPotential: 0,
    independentPaths: 0,
    sharedBestieClusters: 0,
    recommendationFound: false,
  };

  try {
    const interaction = (await sql`
      SELECT
        count(*)::int AS samples,
        max(CASE WHEN actor_did=${ownerDid} AND peer_did=${did} THEN interaction_score END)::float8 AS outgoing,
        max(CASE WHEN actor_did=${did} AND peer_did=${ownerDid} THEN interaction_score END)::float8 AS incoming
      FROM advanced_network_interaction_scores
      WHERE (actor_did=${ownerDid} AND peer_did=${did})
         OR (actor_did=${did} AND peer_did=${ownerDid})
    `)[0];
    signals.interactionAvailable = Number(interaction?.samples ?? 0) > 0;
    signals.outgoingInteraction = Number(interaction?.outgoing ?? 0);
    signals.incomingInteraction = Number(interaction?.incoming ?? 0);
  } catch {
    // Advanced Network may not have been initialized yet. Missing data is neutral, not zero-value evidence.
  }

  try {
    const recommendation = (await sql`
      SELECT
        count(*)::int AS samples,
        max(r.importance_score)::float8 AS importance_score,
        max(COALESCE(NULLIF(r.metadata->>'expectedBridgeValue','')::numeric,0))::float8 AS bridge_value,
        max(COALESCE(NULLIF(r.metadata->>'visibilityPotential','')::numeric,0))::float8 AS visibility_potential,
        max(r.independent_paths)::int AS independent_paths,
        max(r.shared_bestie_clusters)::int AS shared_bestie_clusters
      FROM advanced_network_recommendations r
      JOIN advanced_network_accounts a ON a.id=r.account_id
      WHERE a.bluesky_did=${ownerDid} AND r.target_did=${did}
    `)[0];
    signals.recommendationFound = Number(recommendation?.samples ?? 0) > 0;
    signals.importanceScore = Number(recommendation?.importance_score ?? 0);
    signals.expectedBridgeValue = Number(recommendation?.bridge_value ?? 0);
    signals.visibilityPotential = Number(recommendation?.visibility_potential ?? 0);
    signals.independentPaths = Number(recommendation?.independent_paths ?? 0);
    signals.sharedBestieClusters = Number(recommendation?.shared_bestie_clusters ?? 0);
  } catch {
    // Same rule: absent Advanced Network history does not automatically make an account disposable.
  }

  return signals;
}

async function scanStats(sql, scanId: string, ownerDid: string) {
  const scan = (await sql`
    SELECT id,status,total,processed,flagged,errors,started_at,completed_at,retry_after_at
    FROM lib_guard_scans
    WHERE id=${scanId} AND owner_did=${ownerDid}
  `)[0];
  if (!scan) throw new Error("Lib Guard scan not found.");

  const counts = (await sql`
    SELECT
      count(*) FILTER(WHERE status NOT IN ('pending','processing'))::int AS processed,
      count(*) FILTER(WHERE status='flagged')::int AS flagged,
      count(*) FILTER(WHERE status='error')::int AS errors,
      count(*) FILTER(WHERE status IN ('pending','processing'))::int AS remaining
    FROM lib_guard_assessments
    WHERE owner_did=${ownerDid} AND scan_id=${scanId}
  `)[0] ?? { processed: 0, flagged: 0, errors: 0, remaining: 0 };

  const processed = Number(counts.processed ?? 0);
  const flagged = Number(counts.flagged ?? 0);
  const errors = Number(counts.errors ?? 0);
  const remaining = Number(counts.remaining ?? 0);
  const retryAt = scan.retry_after_at ? new Date(scan.retry_after_at) : null;
  const waiting = retryAt && Number.isFinite(retryAt.getTime()) && retryAt.getTime() > Date.now();
  const status = remaining === 0 ? "complete" : waiting ? "paused" : "running";
  const completedAt = status === "complete" ? (scan.completed_at ?? new Date().toISOString()) : null;

  await sql`
    UPDATE lib_guard_scans
    SET status=${status},processed=${processed},flagged=${flagged},errors=${errors},
        completed_at=${completedAt}::timestamptz,
        retry_after_at=${status === "paused" ? retryAt?.toISOString() ?? null : null}::timestamptz
    WHERE id=${scanId}
  `;

  return {
    id: scanId,
    status,
    total: Number(scan.total ?? 0),
    processed,
    flagged,
    errors,
    remaining,
    started_at: scan.started_at,
    completed_at: completedAt,
    retry_after_at: status === "paused" ? retryAt?.toISOString() : null,
    retry_after_ms: status === "paused" && retryAt ? Math.max(0, retryAt.getTime() - Date.now()) : 0,
  };
}

async function pauseScan(sql, scanId: string, ownerDid: string, retryAfterMs: number) {
  const until = new Date(Date.now() + boundedRetryAfter(retryAfterMs)).toISOString();
  await sql`
    UPDATE lib_guard_scans
    SET status='paused',retry_after_at=${until}::timestamptz,completed_at=null
    WHERE id=${scanId} AND owner_did=${ownerDid}
  `;
}

export async function startLibGuardScan() {
  const sql = await ensureLibGuardSchema();
  const session = await configuredSession();
  await ensureOwnerSettings(sql, session.did);

  const active = (await sql`
    SELECT id FROM lib_guard_scans
    WHERE owner_did=${session.did} AND status IN ('running','paused')
    ORDER BY started_at DESC LIMIT 1
  `)[0];
  if (active?.id) return { resumed: true, ...(await scanStats(sql, String(active.id), session.did)) };

  await syncIazmaGuardReciprocity({ automatic: false, force: true });
  const scanId = randomUUID();
  await sql`
    INSERT INTO lib_guard_scans(id,owner_did,status,total,processed,flagged,errors)
    VALUES (${scanId},${session.did},'running',0,0,0,0)
  `;
  await sql`
    INSERT INTO lib_guard_assessments(
      owner_did,did,scan_id,status,score,recommendation,network_value,low_network_value,
      ukraine_saturation,lib_media_saturation,repost_ratio,metrics,categories,evidence,
      dismissed_at,unfollowed_at,assessed_at
    )
    SELECT owner_did,did,${scanId},'pending',0,'keep',0,0,0,0,0,'{}'::jsonb,ARRAY[]::text[],'[]'::jsonb,null,null,null
    FROM relationships
    WHERE owner_did=${session.did} AND is_following=true
    ON CONFLICT(owner_did,did) DO UPDATE SET
      scan_id=excluded.scan_id,status='pending',score=0,recommendation='keep',network_value=0,low_network_value=0,
      ukraine_saturation=0,lib_media_saturation=0,repost_ratio=0,metrics='{}'::jsonb,categories=ARRAY[]::text[],evidence='[]'::jsonb,
      dismissed_at=null,unfollowed_at=null,assessed_at=null
  `;
  const total = Number((await sql`
    SELECT count(*)::int AS total FROM lib_guard_assessments
    WHERE owner_did=${session.did} AND scan_id=${scanId}
  `)[0]?.total ?? 0);
  await sql`UPDATE lib_guard_scans SET total=${total} WHERE id=${scanId}`;
  return { resumed: false, ...(await scanStats(sql, scanId, session.did)) };
}

export async function processLibGuardBatch(scanId: string, requested = MAX_SCAN_BATCH_SIZE) {
  const sql = await ensureLibGuardSchema();
  const session = await configuredSession();
  const scan = (await sql`
    SELECT owner_did,status,retry_after_at
    FROM lib_guard_scans
    WHERE id=${scanId} AND owner_did=${session.did}
  `)[0];
  if (!scan) throw new Error("Lib Guard scan not found.");
  if (scan.status === "complete") return scanStats(sql, scanId, session.did);

  if (scan.status === "paused") {
    const retryAt = scan.retry_after_at ? new Date(scan.retry_after_at) : null;
    if (retryAt && Number.isFinite(retryAt.getTime()) && retryAt.getTime() > Date.now()) {
      return scanStats(sql, scanId, session.did);
    }
    await sql`UPDATE lib_guard_scans SET status='running',retry_after_at=null WHERE id=${scanId}`;
  }

  await sql`
    UPDATE lib_guard_assessments
    SET status='pending'
    WHERE owner_did=${session.did} AND scan_id=${scanId} AND status='processing' AND assessed_at IS NULL
  `;
  const limit = Math.max(1, Math.min(MAX_SCAN_BATCH_SIZE, Number(requested) || MAX_SCAN_BATCH_SIZE));
  const rows = await sql`
    SELECT l.did,l.muted_at,r.is_follower,r.is_following,r.followers_count,r.follows_count,r.posts_count,
           r.handle,r.display_name,r.avatar,r.description,r.account_created_at
    FROM lib_guard_assessments l
    JOIN relationships r ON r.owner_did=l.owner_did AND r.did=l.did
    WHERE l.owner_did=${session.did} AND l.scan_id=${scanId} AND l.status='pending' AND r.is_following=true
    ORDER BY l.did
    LIMIT ${limit}
  `;
  if (!rows.length) return scanStats(sql, scanId, session.did);

  let fresh = new Map();
  try {
    fresh = new Map((await profiles(rows.map((row) => String(row.did))))
      .filter((item) => typeof item?.did === "string")
      .map((item) => [item.did, item]));
  } catch (error) {
    if (error instanceof BlueskyRateLimitError) {
      await pauseScan(sql, scanId, session.did, error.retryAfterMs);
      return scanStats(sql, scanId, session.did);
    }
    throw error;
  }

  const settings = await loadSettings(sql, session.did);
  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    const did = String(row.did);
    await sql`
      UPDATE lib_guard_assessments SET status='processing'
      WHERE owner_did=${session.did} AND did=${did} AND scan_id=${scanId}
    `;
    try {
      const [feed, signals] = await Promise.all([
        authorFeed(did),
        advancedSignals(sql, session.did, did),
      ]);
      const profile = fresh.get(did) ?? {};
      const candidate = {
        ...row,
        handle: profile.handle ?? row.handle,
        display_name: profile.displayName ?? row.display_name,
        avatar: profile.avatar ?? row.avatar,
        description: profile.description ?? row.description,
        followers_count: profile.followersCount ?? row.followers_count ?? 0,
        follows_count: profile.followsCount ?? row.follows_count ?? 0,
        posts_count: profile.postsCount ?? row.posts_count ?? 0,
        account_created_at: profile.createdAt ?? row.account_created_at,
        is_follower: Boolean(row.is_follower),
      };
      const assessment = assessLibGuardProfile(candidate, feed, settings, signals, row.muted_at);

      await sql`
        UPDATE relationships
        SET handle=${candidate.handle ?? null},display_name=${candidate.display_name ?? null},avatar=${candidate.avatar ?? null},
            description=${candidate.description ?? null},followers_count=${candidate.followers_count},
            follows_count=${candidate.follows_count},posts_count=${candidate.posts_count}
        WHERE owner_did=${session.did} AND did=${did}
      `;
      await sql`
        UPDATE lib_guard_assessments
        SET status=${assessment.flagged ? "flagged" : "clear"},score=${assessment.score},
            recommendation=${assessment.recommendation},network_value=${assessment.networkValue},
            low_network_value=${assessment.lowNetworkValue},ukraine_saturation=${assessment.ukraineSaturation},
            lib_media_saturation=${assessment.libMediaSaturation},repost_ratio=${assessment.repostRatio},
            metrics=${JSON.stringify(assessment.metrics)}::jsonb,categories=${assessment.categories}::text[],
            evidence=${JSON.stringify(assessment.evidence)}::jsonb,assessed_at=now()
        WHERE owner_did=${session.did} AND did=${did} AND scan_id=${scanId}
      `;
    } catch (error) {
      if (error instanceof BlueskyRateLimitError) {
        await sql`
          UPDATE lib_guard_assessments SET status='pending'
          WHERE owner_did=${session.did} AND did=${did} AND scan_id=${scanId}
        `;
        await pauseScan(sql, scanId, session.did, error.retryAfterMs);
        break;
      }
      await sql`
        UPDATE lib_guard_assessments
        SET status='error',evidence=${JSON.stringify([{ category: "error", source: "scan", label: error instanceof Error ? error.message : "Scan failed", excerpt: "" }])}::jsonb,
            assessed_at=now()
        WHERE owner_did=${session.did} AND did=${did} AND scan_id=${scanId}
      `;
    }
    if (index < rows.length - 1) await delay(SCAN_SPACING_MS);
  }
  return scanStats(sql, scanId, session.did);
}

export async function libGuardDashboard() {
  const sql = await ensureLibGuardSchema();
  const session = await configuredSession();
  const settings = await loadSettings(sql, session.did);
  const [queue, scan, counts] = await Promise.all([
    sql`
      SELECT r.did,r.handle,r.display_name,r.avatar,r.description,r.followers_count,r.follows_count,
             r.is_follower,r.is_following,l.score,l.recommendation,l.network_value,l.low_network_value,
             l.ukraine_saturation,l.lib_media_saturation,l.repost_ratio,l.metrics,l.categories,l.evidence,
             l.muted_at,l.assessed_at,
             CASE WHEN l.muted_at IS NULL THEN 0 ELSE floor(extract(epoch FROM (now()-l.muted_at))/86400)::int END AS muted_days
      FROM lib_guard_assessments l
      JOIN relationships r ON r.owner_did=l.owner_did AND r.did=l.did
      WHERE l.owner_did=${session.did} AND l.status='flagged' AND r.is_following=true
      ORDER BY l.score DESC,l.network_value ASC,l.assessed_at DESC NULLS LAST
      LIMIT 500
    `,
    sql`
      SELECT id,status,total,processed,flagged,errors,started_at,completed_at,retry_after_at
      FROM lib_guard_scans
      WHERE owner_did=${session.did}
      ORDER BY started_at DESC LIMIT 1
    `,
    sql`
      SELECT
        (SELECT count(*)::int FROM relationships WHERE owner_did=${session.did} AND is_following=true) AS following,
        (SELECT count(*)::int FROM lib_guard_assessments l JOIN relationships r ON r.owner_did=l.owner_did AND r.did=l.did WHERE l.owner_did=${session.did} AND l.status='flagged' AND r.is_following=true) AS candidates,
        (SELECT count(*)::int FROM lib_guard_assessments l JOIN relationships r ON r.owner_did=l.owner_did AND r.did=l.did WHERE l.owner_did=${session.did} AND l.muted_at IS NOT NULL AND r.is_following=true) AS muted
    `,
  ]);
  return {
    settings,
    queue,
    scan: scan[0] ?? null,
    counts: counts[0] ?? { following: 0, candidates: 0, muted: 0 },
  };
}

export async function saveLibGuardSettings(input) {
  const sql = await ensureLibGuardSchema();
  const session = await configuredSession();
  const settings = normalizeLibGuardSettings(input);
  await ensureOwnerSettings(sql, session.did);
  await sql`
    UPDATE lib_guard_settings
    SET min_score=${settings.min_score},low_value_weight=${settings.low_value_weight},
        ukraine_weight=${settings.ukraine_weight},lib_media_weight=${settings.lib_media_weight},
        repost_weight=${settings.repost_weight},ukraine_threshold=${settings.ukraine_threshold},
        lib_media_threshold=${settings.lib_media_threshold},quarantine_days=${settings.quarantine_days},updated_at=now()
    WHERE owner_did=${session.did}
  `;
  return { settings };
}

async function actionTarget(sql, ownerDid: string, did: string) {
  return (await sql`
    SELECT r.did,r.handle,r.is_following,r.follow_uri,l.score,l.recommendation,l.network_value,
           l.ukraine_saturation,l.lib_media_saturation,l.repost_ratio,l.categories,l.evidence,l.metrics,l.muted_at
    FROM relationships r
    LEFT JOIN lib_guard_assessments l ON l.owner_did=r.owner_did AND l.did=r.did
    WHERE r.owner_did=${ownerDid} AND r.did=${did}
  `)[0];
}

async function addAction(sql, ownerDid: string, did: string, action: string, reason: string, metadata = {}) {
  await sql`
    INSERT INTO actions(owner_did,target_did,action,reason,metadata)
    VALUES (${ownerDid},${did},${action},${reason},${JSON.stringify(metadata)}::jsonb)
  `;
}

function actionReason(target) {
  return `Lib Guard ${Number(target?.score ?? 0)}/100 · network ${Number(target?.network_value ?? 0)} · Ukraine ${Number(target?.ukraine_saturation ?? 0)}% · Lib TV ${Number(target?.lib_media_saturation ?? 0)}%`;
}

async function markMuted(sql, session: GuardSession, did: string, target) {
  const reason = actionReason(target);
  await sql`
    UPDATE lib_guard_assessments SET muted_at=coalesce(muted_at,now())
    WHERE owner_did=${session.did} AND did=${did}
  `;
  await addAction(sql, session.did, did, "lib_guard_mute", reason, { metrics: target?.metrics ?? {}, evidence: target?.evidence ?? [] });
}

async function markUnmuted(sql, session: GuardSession, did: string, target) {
  const reason = actionReason(target);
  await sql`
    UPDATE lib_guard_assessments SET muted_at=null
    WHERE owner_did=${session.did} AND did=${did}
  `;
  await addAction(sql, session.did, did, "lib_guard_unmute", reason);
}

async function finalizeUnfollow(sql, session: GuardSession, did: string, target) {
  const reason = actionReason(target);
  await sql`
    INSERT INTO suppressions(owner_did,did,handle,reason,source,evidence,active)
    VALUES (${session.did},${did},${target?.handle ?? null},${reason},'lib_guard',${JSON.stringify({ categories: target?.categories ?? [], evidence: target?.evidence ?? [], metrics: target?.metrics ?? {} })}::jsonb,true)
    ON CONFLICT(owner_did,did) DO UPDATE SET
      handle=excluded.handle,reason=excluded.reason,source=excluded.source,evidence=excluded.evidence,active=true,updated_at=now()
  `;
  await addAction(sql, session.did, did, "lib_guard_unfollow", reason, { evidence: target?.evidence ?? [], metrics: target?.metrics ?? {} });
  await sql`
    UPDATE relationships SET is_following=false,follow_uri=null
    WHERE owner_did=${session.did} AND did=${did}
  `;
  await sql`
    UPDATE lib_guard_assessments SET status='unfollowed',unfollowed_at=now()
    WHERE owner_did=${session.did} AND did=${did}
  `;
}

function normalizeDids(input: unknown[]) {
  return [...new Set((Array.isArray(input) ? input : [])
    .map((value) => String(value ?? "").trim())
    .filter(Boolean))]
    .slice(0, BULK_LIMIT);
}

export async function bulkMuteLibGuardDids(input: unknown[]) {
  const requested = normalizeDids(input);
  if (!requested.length) return { requested: 0, muted: [], skipped: [], failed: [], remaining: [], rateLimited: false, retry_after_ms: 0 };
  const sql = await ensureLibGuardSchema();
  const session = await configuredSession();
  const muted = [];
  const skipped = [];
  const failed = [];
  let rateLimited = false;
  let retryAfter = 0;
  let stoppedAt = requested.length;

  for (let index = 0; index < requested.length; index += 1) {
    const did = requested[index];
    try {
      const target = await actionTarget(sql, session.did, did);
      if (!target) throw new Error("Account is not in your Guard graph.");
      if (target.muted_at) {
        skipped.push(did);
      } else {
        await muteActor(session, did);
        await markMuted(sql, session, did, target);
        muted.push(did);
      }
    } catch (error) {
      if (error instanceof BlueskyRateLimitError) {
        rateLimited = true;
        retryAfter = error.retryAfterMs;
        stoppedAt = index;
        break;
      }
      failed.push({ did, error: error instanceof Error ? error.message : "Mute failed." });
    }
    if (index < requested.length - 1) await delay(BULK_MUTE_SPACING_MS);
  }
  const completed = new Set([...muted, ...skipped, ...failed.map((item) => item.did)]);
  const remaining = rateLimited ? requested.slice(stoppedAt).filter((did) => !completed.has(did)) : [];
  return { requested: requested.length, muted, skipped, failed, remaining, rateLimited, retry_after_ms: retryAfter };
}

export async function bulkUnmuteLibGuardDids(input: unknown[]) {
  const requested = normalizeDids(input);
  if (!requested.length) return { requested: 0, unmuted: [], skipped: [], failed: [], remaining: [], rateLimited: false, retry_after_ms: 0 };
  const sql = await ensureLibGuardSchema();
  const session = await configuredSession();
  const unmuted = [];
  const skipped = [];
  const failed = [];
  let rateLimited = false;
  let retryAfter = 0;
  let stoppedAt = requested.length;

  for (let index = 0; index < requested.length; index += 1) {
    const did = requested[index];
    try {
      const target = await actionTarget(sql, session.did, did);
      if (!target) throw new Error("Account is not in your Guard graph.");
      if (!target.muted_at) {
        skipped.push(did);
      } else {
        await unmuteActor(session, did);
        await markUnmuted(sql, session, did, target);
        unmuted.push(did);
      }
    } catch (error) {
      if (error instanceof BlueskyRateLimitError) {
        rateLimited = true;
        retryAfter = error.retryAfterMs;
        stoppedAt = index;
        break;
      }
      failed.push({ did, error: error instanceof Error ? error.message : "Unmute failed." });
    }
    if (index < requested.length - 1) await delay(BULK_MUTE_SPACING_MS);
  }
  const completed = new Set([...unmuted, ...skipped, ...failed.map((item) => item.did)]);
  const remaining = rateLimited ? requested.slice(stoppedAt).filter((did) => !completed.has(did)) : [];
  return { requested: requested.length, unmuted, skipped, failed, remaining, rateLimited, retry_after_ms: retryAfter };
}

export async function bulkUnfollowLibGuardDids(input: unknown[]) {
  const requested = normalizeDids(input);
  if (!requested.length) return { requested: 0, unfollowed: [], skipped: [], failed: [], remaining: [], rateLimited: false, retry_after_ms: 0 };
  const sql = await ensureLibGuardSchema();
  const session = await configuredSession();
  const unfollowed = [];
  const skipped = [];
  const failed = [];
  let rateLimited = false;
  let retryAfter = 0;
  let stoppedAt = requested.length;

  for (let index = 0; index < requested.length; index += 1) {
    const did = requested[index];
    try {
      const target = await actionTarget(sql, session.did, did);
      if (!target) throw new Error("Account is not in your Guard graph.");
      if (!target.is_following || !target.follow_uri) {
        await sql`UPDATE lib_guard_assessments SET status='unfollowed',unfollowed_at=coalesce(unfollowed_at,now()) WHERE owner_did=${session.did} AND did=${did}`;
        skipped.push(did);
      } else {
        await deleteFollow(session, String(target.follow_uri));
        await finalizeUnfollow(sql, session, did, target);
        unfollowed.push(did);
      }
    } catch (error) {
      if (error instanceof BlueskyRateLimitError) {
        rateLimited = true;
        retryAfter = error.retryAfterMs;
        stoppedAt = index;
        break;
      }
      failed.push({ did, error: error instanceof Error ? error.message : "Unfollow failed." });
    }
    if (index < requested.length - 1) await delay(BULK_UNFOLLOW_SPACING_MS);
  }
  const completed = new Set([...unfollowed, ...skipped, ...failed.map((item) => item.did)]);
  const remaining = rateLimited ? requested.slice(stoppedAt).filter((did) => !completed.has(did)) : [];
  return { requested: requested.length, unfollowed, skipped, failed, remaining, rateLimited, retry_after_ms: retryAfter };
}

export async function dismissLibGuardDid(did: string) {
  const sql = await ensureLibGuardSchema();
  const session = await configuredSession();
  const targetDid = String(did ?? "").trim();
  if (!targetDid) throw new Error("Missing account DID.");
  const target = await actionTarget(sql, session.did, targetDid);
  await sql`
    UPDATE lib_guard_assessments SET status='dismissed',dismissed_at=now()
    WHERE owner_did=${session.did} AND did=${targetDid}
  `;
  await addAction(sql, session.did, targetDid, "lib_guard_keep", actionReason(target));
  return { ok: true };
}
