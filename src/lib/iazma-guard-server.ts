/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import { createDecipheriv, createHash, randomUUID } from "node:crypto";
import { neon } from "@neondatabase/serverless";
import { assessProfile } from "@/lib/iazma-guard-classify";

const PUBLIC_API = "https://public.api.bsky.app/xrpc";
const FOLLOW = "app.bsky.graph.follow";
const BLOCK = "app.bsky.graph.block";
const MAX_SCAN_BATCH_SIZE = 2;
const BLUESKY_REQUEST_TIMEOUT_MS = 15_000;

function getSql() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not configured.");
  return neon(process.env.DATABASE_URL);
}

function scanScope(value) {
  return value === "followers" || value === "following" || value === "all" ? value : "all";
}

async function fetchJson(url: string | URL, init?: RequestInit, timeoutMs = BLUESKY_REQUEST_TIMEOUT_MS) {
  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      cache: "no-store",
      signal: init?.signal ?? AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    if (error instanceof Error && ["AbortError", "TimeoutError"].includes(error.name)) {
      throw new Error("Bluesky request timed out.");
    }
    throw error;
  }

  const text = await response.text();
  let body: Record<string, unknown> = {};
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      throw new Error("Bluesky returned an unreadable response.");
    }
  }

  if (!response.ok) {
    throw new Error(body.message || body.error || `Bluesky returned ${response.status}.`);
  }
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
  if (!service || typeof service.serviceEndpoint !== "string") {
    throw new Error("Could not resolve Bluesky PDS.");
  }
  return service.serviceEndpoint.replace(/\/$/, "");
}

async function configuredSession() {
  const sql = getSql();
  const rows = await sql`
    SELECT actor_handle, app_password_enc
    FROM bluesky_follow_automation_settings
    WHERE id=1
  `;
  const current = rows[0];
  if (!current?.app_password_enc) {
    throw new Error("Save the Bluesky app password in IAZMA Auto DM first.");
  }

  const actor = String(current.actor_handle);
  const password = decryptSecret(String(current.app_password_enc));
  const didRes = await fetchJson(
    `${PUBLIC_API}/com.atproto.identity.resolveHandle?handle=${encodeURIComponent(actor)}`,
  );
  const pdsUrl = await resolvePds(didRes.did);
  const session = await fetchJson(`${pdsUrl}/xrpc/com.atproto.server.createSession`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ identifier: actor, password }),
  });
  return { ...session, pdsUrl };
}

async function authXrpc(session, method: string, body?: unknown, params?: URLSearchParams) {
  const url = new URL(`${session.pdsUrl}/xrpc/${method}`);
  if (params) {
    for (const [key, value] of params) url.searchParams.append(key, value);
  }
  return fetchJson(url, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${session.accessJwt}`,
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

async function allFollowers(actor: string) {
  const out = [];
  let cursor = "";
  do {
    const url = new URL(`${PUBLIC_API}/app.bsky.graph.getFollowers`);
    url.searchParams.set("actor", actor);
    url.searchParams.set("limit", "100");
    if (cursor) url.searchParams.set("cursor", cursor);
    const page = await fetchJson(url);
    out.push(...(page.followers ?? []));
    cursor = page.cursor ?? "";
  } while (cursor && out.length < 10_000);
  return out;
}

async function allFollowRecords(session) {
  const out = [];
  let cursor = "";
  do {
    const params = new URLSearchParams({ repo: session.did, collection: FOLLOW, limit: "100" });
    if (cursor) params.set("cursor", cursor);
    const page = await authXrpc(session, "com.atproto.repo.listRecords", undefined, params);
    for (const record of page.records ?? []) {
      const subject = record.value?.subject;
      if (typeof subject === "string") out.push({ did: subject, uri: record.uri });
    }
    cursor = page.cursor ?? "";
  } while (cursor && out.length < 10_000);
  return out;
}

function rkey(uri: string) {
  return uri.split("/").pop() || "";
}

async function deleteFollow(session, uri: string) {
  await authXrpc(session, "com.atproto.repo.deleteRecord", {
    repo: session.did,
    collection: FOLLOW,
    rkey: rkey(uri),
  });
}

async function createBlock(session, did: string) {
  return authXrpc(session, "com.atproto.repo.createRecord", {
    repo: session.did,
    collection: BLOCK,
    record: { $type: BLOCK, subject: did, createdAt: new Date().toISOString() },
  });
}

export async function ensureGuardSchema() {
  const sql = getSql();
  await sql`CREATE TABLE IF NOT EXISTS users (did text PRIMARY KEY, handle text, display_name text, avatar text, created_at timestamptz NOT NULL DEFAULT now(), last_login_at timestamptz, last_graph_sync_at timestamptz, last_scan_at timestamptz)`;
  await sql`CREATE TABLE IF NOT EXISTS settings (owner_did text PRIMARY KEY REFERENCES users(did) ON DELETE CASCADE, inactive_days integer NOT NULL DEFAULT 90, bot_threshold integer NOT NULL DEFAULT 70, auto_unfollow boolean NOT NULL DEFAULT true, filters jsonb NOT NULL DEFAULT '{"rightWing":true,"antiPalestine":true,"islamophobia":true,"xenophobia":true}'::jsonb, updated_at timestamptz NOT NULL DEFAULT now())`;
  await sql`CREATE TABLE IF NOT EXISTS relationships (owner_did text NOT NULL REFERENCES users(did) ON DELETE CASCADE, did text NOT NULL, handle text, display_name text, avatar text, description text, followers_count integer, follows_count integer, posts_count integer, account_created_at timestamptz, was_follower boolean NOT NULL DEFAULT false, is_follower boolean NOT NULL DEFAULT false, is_following boolean NOT NULL DEFAULT false, follow_uri text, first_seen_at timestamptz NOT NULL DEFAULT now(), last_seen_at timestamptz NOT NULL DEFAULT now(), last_activity_at timestamptz, unfollowed_me_at timestamptz, PRIMARY KEY(owner_did,did))`;
  await sql`CREATE TABLE IF NOT EXISTS scans (id text PRIMARY KEY, owner_did text NOT NULL REFERENCES users(did) ON DELETE CASCADE, status text NOT NULL DEFAULT 'running', total integer NOT NULL DEFAULT 0, processed integer NOT NULL DEFAULT 0, flagged integer NOT NULL DEFAULT 0, started_at timestamptz NOT NULL DEFAULT now(), completed_at timestamptz)`;
  await sql`CREATE TABLE IF NOT EXISTS assessments (owner_did text NOT NULL REFERENCES users(did) ON DELETE CASCADE, did text NOT NULL, scan_id text REFERENCES scans(id) ON DELETE SET NULL, status text NOT NULL DEFAULT 'pending', score integer NOT NULL DEFAULT 0, categories text[] NOT NULL DEFAULT ARRAY[]::text[], confidence text, evidence jsonb NOT NULL DEFAULT '[]'::jsonb, last_activity_at timestamptz, assessed_at timestamptz, dismissed_at timestamptz, blocked_at timestamptz, PRIMARY KEY(owner_did,did))`;
  await sql`CREATE TABLE IF NOT EXISTS suppressions (owner_did text NOT NULL REFERENCES users(did) ON DELETE CASCADE, did text NOT NULL, handle text, reason text NOT NULL, source text NOT NULL, evidence jsonb NOT NULL DEFAULT '{}'::jsonb, active boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(owner_did,did))`;
  await sql`CREATE TABLE IF NOT EXISTS actions (id bigserial PRIMARY KEY, owner_did text NOT NULL REFERENCES users(did) ON DELETE CASCADE, target_did text NOT NULL, action text NOT NULL, reason text, metadata jsonb NOT NULL DEFAULT '{}'::jsonb, created_at timestamptz NOT NULL DEFAULT now())`;
  await sql`ALTER TABLE scans ADD COLUMN IF NOT EXISTS scope text NOT NULL DEFAULT 'legacy'`;
  await sql`ALTER TABLE assessments ADD COLUMN IF NOT EXISTS resolved_at timestamptz`;
  return sql;
}

async function addAction(sql, ownerDid, targetDid, action, reason, metadata = {}) {
  await sql`
    INSERT INTO actions(owner_did,target_did,action,reason,metadata)
    VALUES (${ownerDid},${targetDid},${action},${reason ?? null},${JSON.stringify(metadata)}::jsonb)
  `;
}

async function suppress(sql, ownerDid, did, handle, reason, source, evidence = {}) {
  await sql`
    INSERT INTO suppressions(owner_did,did,handle,reason,source,evidence,active)
    VALUES (${ownerDid},${did},${handle ?? null},${reason},${source},${JSON.stringify(evidence)}::jsonb,true)
    ON CONFLICT(owner_did,did) DO UPDATE
    SET handle=excluded.handle,
        reason=excluded.reason,
        source=excluded.source,
        evidence=excluded.evidence,
        active=true,
        updated_at=now()
  `;
}

export async function syncIazmaGuardReciprocity({ automatic = true, force = false } = {}) {
  const sql = await ensureGuardSchema();
  const session = await configuredSession();
  const ownerDid = session.did;
  const profile = await fetchJson(`${PUBLIC_API}/app.bsky.actor.getProfile?actor=${encodeURIComponent(ownerDid)}`);
  await sql`
    INSERT INTO users(did,handle,display_name,avatar,last_login_at)
    VALUES (${ownerDid},${profile.handle ?? null},${profile.displayName ?? null},${profile.avatar ?? null},now())
    ON CONFLICT(did) DO UPDATE
    SET handle=excluded.handle,display_name=excluded.display_name,avatar=excluded.avatar
  `;
  await sql`INSERT INTO settings(owner_did) VALUES (${ownerDid}) ON CONFLICT(owner_did) DO NOTHING`;

  if (!force) {
    const recent = await sql`
      SELECT last_graph_sync_at > now() - interval '12 minutes' AS recent
      FROM users
      WHERE did=${ownerDid}
    `;
    if (recent[0]?.recent) {
      return { ownerDid, skipped: true, followers: 0, following: 0, lostFollowers: 0, autoUnfollowed: 0 };
    }
  }

  const priorRows = await sql`
    SELECT did FROM relationships WHERE owner_did=${ownerDid} AND is_follower=true
  `;
  const prior = new Set(priorRows.map((row) => String(row.did)));
  const [followers, follows, settingRows] = await Promise.all([
    allFollowers(ownerDid),
    allFollowRecords(session),
    sql`SELECT auto_unfollow FROM settings WHERE owner_did=${ownerDid}`,
  ]);
  const current = new Set(followers.map((follower) => follower.did));
  const followMap = new Map(follows.map((follow) => [follow.did, follow.uri]));

  await sql`
    UPDATE relationships
    SET is_follower=false,is_following=false,follow_uri=null
    WHERE owner_did=${ownerDid}
  `;

  if (followers.length) {
    const payload = JSON.stringify(followers.map((follower) => ({
      did: follower.did,
      handle: follower.handle,
      display_name: follower.displayName ?? null,
      avatar: follower.avatar ?? null,
      description: follower.description ?? null,
      followers_count: follower.followersCount ?? 0,
      follows_count: follower.followsCount ?? 0,
      posts_count: follower.postsCount ?? 0,
      created_at: follower.createdAt ?? null,
    })));
    await sql`
      INSERT INTO relationships(owner_did,did,handle,display_name,avatar,description,followers_count,follows_count,posts_count,account_created_at,was_follower,is_follower,last_seen_at)
      SELECT ${ownerDid},x.did,x.handle,x.display_name,x.avatar,x.description,x.followers_count,x.follows_count,x.posts_count,x.created_at::timestamptz,true,true,now()
      FROM jsonb_to_recordset(${payload}::jsonb) AS x(did text,handle text,display_name text,avatar text,description text,followers_count int,follows_count int,posts_count int,created_at text)
      ON CONFLICT(owner_did,did) DO UPDATE
      SET handle=excluded.handle,
          display_name=excluded.display_name,
          avatar=excluded.avatar,
          description=excluded.description,
          followers_count=excluded.followers_count,
          follows_count=excluded.follows_count,
          posts_count=excluded.posts_count,
          account_created_at=coalesce(excluded.account_created_at,relationships.account_created_at),
          was_follower=true,
          is_follower=true,
          last_seen_at=now()
    `;
  }

  if (follows.length) {
    const payload = JSON.stringify(follows);
    await sql`
      INSERT INTO relationships(owner_did,did,is_following,follow_uri,last_seen_at)
      SELECT ${ownerDid},x.did,true,x.uri,now()
      FROM jsonb_to_recordset(${payload}::jsonb) AS x(did text,uri text)
      ON CONFLICT(owner_did,did) DO UPDATE
      SET is_following=true,follow_uri=excluded.follow_uri,last_seen_at=now()
    `;
  }

  const lost = [...prior].filter((did) => !current.has(did));
  let autoUnfollowed = 0;
  const enabled = settingRows[0]?.auto_unfollow !== false;
  for (const did of lost) {
    await sql`
      UPDATE relationships
      SET unfollowed_me_at=coalesce(unfollowed_me_at,now())
      WHERE owner_did=${ownerDid} AND did=${did}
    `;
    const uri = followMap.get(did);
    if (automatic && enabled && uri) {
      try {
        await deleteFollow(session, uri);
        const relationship = await sql`
          SELECT handle FROM relationships WHERE owner_did=${ownerDid} AND did=${did}
        `;
        await suppress(sql, ownerDid, did, relationship[0]?.handle, "Unfollowed you after you followed them", "unfollowed_me", { observedBy: "graph-diff" });
        await addAction(sql, ownerDid, did, "auto_unfollow", "They stopped following you", { followUri: uri });
        await sql`
          UPDATE relationships
          SET is_following=false,follow_uri=null
          WHERE owner_did=${ownerDid} AND did=${did}
        `;
        autoUnfollowed += 1;
      } catch (error) {
        await addAction(sql, ownerDid, did, "auto_unfollow_error", String(error instanceof Error ? error.message : error));
      }
    }
  }

  await sql`UPDATE users SET last_graph_sync_at=now() WHERE did=${ownerDid}`;
  return {
    ownerDid,
    followers: followers.length,
    following: follows.length - autoUnfollowed,
    lostFollowers: lost.length,
    autoUnfollowed,
  };
}

async function authorFeed(did: string) {
  const url = new URL(`${PUBLIC_API}/app.bsky.feed.getAuthorFeed`);
  url.searchParams.set("actor", did);
  url.searchParams.set("limit", "30");
  return (await fetchJson(url)).feed ?? [];
}

async function profile(did: string) {
  return fetchJson(`${PUBLIC_API}/app.bsky.actor.getProfile?actor=${encodeURIComponent(did)}`);
}

async function scanStats(sql, scanId: string, ownerDid: string) {
  const stat = (await sql`
    SELECT
      count(*) FILTER(WHERE status NOT IN ('pending','processing'))::int AS processed,
      count(*) FILTER(WHERE status='flagged')::int AS flagged,
      count(*) FILTER(WHERE status='error')::int AS errors,
      count(*) FILTER(WHERE status IN ('pending','processing'))::int AS remaining
    FROM assessments
    WHERE owner_did=${ownerDid} AND scan_id=${scanId}
  `)[0] ?? { processed: 0, flagged: 0, errors: 0, remaining: 0 };
  const scan = (await sql`
    SELECT total,scope,status,started_at,completed_at
    FROM scans
    WHERE id=${scanId} AND owner_did=${ownerDid}
  `)[0];
  if (!scan) throw new Error("Scan not found.");

  const processed = Number(stat.processed ?? 0);
  const flagged = Number(stat.flagged ?? 0);
  const errors = Number(stat.errors ?? 0);
  const remaining = Number(stat.remaining ?? 0);
  const complete = remaining === 0;
  await sql`
    UPDATE scans
    SET processed=${processed},
        flagged=${flagged},
        status=${complete ? "complete" : "running"},
        completed_at=${complete ? new Date().toISOString() : null}::timestamptz
    WHERE id=${scanId}
  `;

  return {
    id: scanId,
    scope: scan.scope,
    status: complete ? "complete" : "running",
    total: Number(scan.total ?? 0),
    processed,
    flagged,
    errors,
    remaining,
    started_at: scan.started_at,
    completed_at: complete ? new Date().toISOString() : scan.completed_at,
  };
}

export async function startGuardScan(requestedScope = "all") {
  const scope = scanScope(requestedScope);
  const graph = await syncIazmaGuardReciprocity({ automatic: true, force: true });
  const sql = getSql();
  const existing = (await sql`
    SELECT id
    FROM scans
    WHERE owner_did=${graph.ownerDid} AND status='running' AND scope=${scope}
    ORDER BY started_at DESC
    LIMIT 1
  `)[0];

  if (existing?.id) {
    return { scanId: existing.id, resumed: true, graph, ...(await scanStats(sql, existing.id, graph.ownerDid)) };
  }

  const id = randomUUID();
  await sql`
    INSERT INTO scans(id,owner_did,status,total,processed,flagged,scope)
    VALUES (${id},${graph.ownerDid},'running',0,0,0,${scope})
  `;
  await sql`
    INSERT INTO assessments(owner_did,did,scan_id,status,score,categories,confidence,evidence)
    SELECT owner_did,did,${id},'pending',0,ARRAY[]::text[],null,'[]'::jsonb
    FROM relationships
    WHERE owner_did=${graph.ownerDid}
      AND (
        ${scope}='all'
        OR (${scope}='followers' AND is_follower=true)
        OR (${scope}='following' AND is_following=true)
      )
    ON CONFLICT(owner_did,did) DO UPDATE
    SET scan_id=excluded.scan_id,
        status=CASE WHEN assessments.status IN ('ignored','blocked','unfollowed') THEN assessments.status ELSE 'pending' END,
        score=CASE WHEN assessments.status IN ('ignored','blocked','unfollowed') THEN assessments.score ELSE 0 END,
        categories=CASE WHEN assessments.status IN ('ignored','blocked','unfollowed') THEN assessments.categories ELSE ARRAY[]::text[] END,
        confidence=CASE WHEN assessments.status IN ('ignored','blocked','unfollowed') THEN assessments.confidence ELSE null END,
        evidence=CASE WHEN assessments.status IN ('ignored','blocked','unfollowed') THEN assessments.evidence ELSE '[]'::jsonb END,
        assessed_at=CASE WHEN assessments.status IN ('ignored','blocked','unfollowed') THEN assessments.assessed_at ELSE null END,
        resolved_at=CASE WHEN assessments.status IN ('ignored','blocked','unfollowed') THEN assessments.resolved_at ELSE null END
  `;

  const total = Number((await sql`
    SELECT count(*)::int AS total
    FROM assessments
    WHERE owner_did=${graph.ownerDid} AND scan_id=${id}
  `)[0]?.total ?? 0);
  await sql`UPDATE scans SET total=${total} WHERE id=${id}`;
  await sql`UPDATE users SET last_scan_at=now() WHERE did=${graph.ownerDid}`;
  return { scanId: id, resumed: false, graph, ...(await scanStats(sql, id, graph.ownerDid)) };
}

async function assessGuardAccount(sql, ownerDid: string, scanId: string, did: string, settings) {
  await sql`
    UPDATE assessments
    SET status='processing'
    WHERE owner_did=${ownerDid} AND did=${did} AND scan_id=${scanId}
  `;

  try {
    const relationship = (await sql`
      SELECT * FROM relationships WHERE owner_did=${ownerDid} AND did=${did}
    `)[0];
    if (!relationship) throw new Error("Account is no longer in your Guard graph.");

    const [fresh, feed] = await Promise.all([profile(did), authorFeed(did)]);
    const candidate = {
      ...relationship,
      handle: fresh.handle ?? relationship.handle,
      display_name: fresh.displayName ?? relationship.display_name,
      description: fresh.description ?? relationship.description,
      followers_count: fresh.followersCount ?? relationship.followers_count,
      follows_count: fresh.followsCount ?? relationship.follows_count,
      posts_count: fresh.postsCount ?? relationship.posts_count,
      account_created_at: fresh.createdAt ?? relationship.account_created_at,
    };
    const assessment = assessProfile(candidate, feed, settings);

    await sql`
      UPDATE relationships
      SET handle=${candidate.handle},
          display_name=${candidate.display_name},
          description=${candidate.description},
          followers_count=${candidate.followers_count},
          follows_count=${candidate.follows_count},
          posts_count=${candidate.posts_count},
          last_activity_at=${assessment.lastActivity}::timestamptz
      WHERE owner_did=${ownerDid} AND did=${did}
    `;
    await sql`
      UPDATE assessments
      SET status=${assessment.flagged ? "flagged" : "clear"},
          score=${assessment.score},
          categories=${assessment.categories}::text[],
          confidence=${assessment.confidence},
          evidence=${JSON.stringify(assessment.evidence)}::jsonb,
          last_activity_at=${assessment.lastActivity}::timestamptz,
          assessed_at=now()
      WHERE owner_did=${ownerDid} AND did=${did} AND scan_id=${scanId}
    `;
  } catch (error) {
    await sql`
      UPDATE assessments
      SET status='error',
          evidence=${JSON.stringify([{ category: "error", label: String(error instanceof Error ? error.message : error) }])}::jsonb,
          assessed_at=now()
      WHERE owner_did=${ownerDid} AND did=${did} AND scan_id=${scanId}
    `;
  }
}

export async function processGuardBatch(scanId: string, requested = MAX_SCAN_BATCH_SIZE) {
  const sql = getSql();
  const scan = (await sql`
    SELECT owner_did,status
    FROM scans
    WHERE id=${scanId}
  `)[0];
  if (!scan) throw new Error("Scan not found.");
  const ownerDid = scan.owner_did;
  if (scan.status === "complete") return scanStats(sql, scanId, ownerDid);

  await sql`
    UPDATE assessments
    SET status='pending'
    WHERE owner_did=${ownerDid} AND scan_id=${scanId} AND status='processing' AND assessed_at IS NULL
  `;

  const settings = (await sql`
    SELECT inactive_days,bot_threshold,auto_unfollow,filters
    FROM settings
    WHERE owner_did=${ownerDid}
  `)[0] ?? { inactive_days: 90, bot_threshold: 70, auto_unfollow: true, filters: {} };
  const limit = Math.max(1, Math.min(MAX_SCAN_BATCH_SIZE, Number(requested) || MAX_SCAN_BATCH_SIZE));
  const rows = await sql`
    SELECT did
    FROM assessments
    WHERE owner_did=${ownerDid} AND scan_id=${scanId} AND status='pending'
    ORDER BY did
    LIMIT ${limit}
  `;
  await Promise.all(rows.map((row) => assessGuardAccount(sql, ownerDid, scanId, String(row.did), settings)));
  return scanStats(sql, scanId, ownerDid);
}

export async function guardDashboard() {
  const sql = await ensureGuardSchema();
  const session = await configuredSession();
  const ownerDid = session.did;
  await syncIdentityOnly(sql, session);
  const [user, settings, queue, suppressions, actions, scan, counts] = await Promise.all([
    sql`SELECT did,handle,display_name,avatar,last_graph_sync_at,last_scan_at FROM users WHERE did=${ownerDid}`,
    sql`SELECT inactive_days,bot_threshold,auto_unfollow,filters FROM settings WHERE owner_did=${ownerDid}`,
    sql`
      SELECT r.did,r.handle,r.display_name,r.avatar,r.description,r.followers_count,r.follows_count,r.posts_count,r.is_follower,r.is_following,r.last_activity_at,a.score,a.categories,a.confidence,a.evidence,a.assessed_at
      FROM assessments a
      JOIN relationships r ON r.owner_did=a.owner_did AND r.did=a.did
      WHERE a.owner_did=${ownerDid}
        AND a.status='flagged'
        AND (r.is_follower=true OR r.is_following=true)
      ORDER BY a.score DESC,a.assessed_at DESC NULLS LAST
      LIMIT 250
    `,
    sql`SELECT did,handle,reason,source,evidence,created_at,updated_at FROM suppressions WHERE owner_did=${ownerDid} AND active=true ORDER BY updated_at DESC LIMIT 500`,
    sql`SELECT a.id,a.target_did,a.action,a.reason,a.metadata,a.created_at,r.handle,r.display_name,r.avatar FROM actions a LEFT JOIN relationships r ON r.owner_did=a.owner_did AND r.did=a.target_did WHERE a.owner_did=${ownerDid} ORDER BY a.created_at DESC LIMIT 100`,
    sql`SELECT id,status,total,processed,flagged,scope,started_at,completed_at FROM scans WHERE owner_did=${ownerDid} AND scope <> 'legacy' ORDER BY started_at DESC LIMIT 1`,
    sql`SELECT count(*) FILTER(WHERE is_follower=true)::int followers,count(*) FILTER(WHERE is_following=true)::int following,count(*) FILTER(WHERE unfollowed_me_at IS NOT NULL)::int observed_unfollowers FROM relationships WHERE owner_did=${ownerDid}`,
  ]);
  return {
    user: user[0],
    settings: settings[0],
    queue,
    suppressions,
    actions,
    scan: scan[0] ?? null,
    counts: counts[0] ?? { followers: 0, following: 0, observed_unfollowers: 0 },
  };
}

async function syncIdentityOnly(sql, session) {
  const exists = await sql`SELECT 1 FROM users WHERE did=${session.did}`;
  if (!exists.length) {
    const account = await profile(session.did);
    await sql`
      INSERT INTO users(did,handle,display_name,avatar)
      VALUES (${session.did},${account.handle ?? null},${account.displayName ?? null},${account.avatar ?? null})
      ON CONFLICT(did) DO NOTHING
    `;
    await sql`INSERT INTO settings(owner_did) VALUES (${session.did}) ON CONFLICT(owner_did) DO NOTHING`;
  }
}

export async function saveGuardSettings(input) {
  const sql = await ensureGuardSchema();
  const session = await configuredSession();
  await syncIdentityOnly(sql, session);
  const filters = {
    rightWing: input.filters?.rightWing !== false,
    antiPalestine: input.filters?.antiPalestine !== false,
    islamophobia: input.filters?.islamophobia !== false,
    xenophobia: input.filters?.xenophobia !== false,
  };
  await sql`
    UPDATE settings
    SET inactive_days=${Math.max(30, Math.min(365, Number(input.inactive_days) || 90))},
        bot_threshold=${Math.max(50, Math.min(95, Number(input.bot_threshold) || 70))},
        auto_unfollow=${input.auto_unfollow !== false},
        filters=${JSON.stringify(filters)}::jsonb,
        updated_at=now()
    WHERE owner_did=${session.did}
  `;
  return guardDashboard();
}

export async function ignoreGuardDid(did) {
  const sql = getSql();
  const session = await configuredSession();
  await sql`
    UPDATE assessments
    SET status='ignored',dismissed_at=now(),resolved_at=now()
    WHERE owner_did=${session.did} AND did=${did}
  `;
  await addAction(sql, session.did, did, "ignore_flag", "Marked as false positive / keep");
}

export async function restoreGuardDid(did) {
  const sql = getSql();
  const session = await configuredSession();
  await sql`
    UPDATE suppressions
    SET active=false,updated_at=now()
    WHERE owner_did=${session.did} AND did=${did}
  `;
  await addAction(sql, session.did, did, "restore_iazma", "Removed from IAZMA suppression list");
}

async function guardTarget(sql, ownerDid, did) {
  const rows = await sql`
    SELECT r.handle,r.is_following,r.follow_uri,a.categories,a.evidence
    FROM relationships r
    LEFT JOIN assessments a ON a.owner_did=r.owner_did AND a.did=r.did
    WHERE r.owner_did=${ownerDid} AND r.did=${did}
  `;
  const target = rows[0];
  if (!target) throw new Error("Account is not in the Guard graph.");
  return target;
}

export async function unfollowGuardDid(did) {
  const sql = getSql();
  const session = await configuredSession();
  const target = await guardTarget(sql, session.did, did);
  if (!target.is_following || !target.follow_uri) {
    throw new Error("You are not currently following this account.");
  }
  await deleteFollow(session, String(target.follow_uri));
  const reason = (target.categories ?? []).join(", ") || "Manual Guard cleanup";
  await suppress(sql, session.did, did, target.handle, reason, "cleanup", { categories: target.categories ?? [], evidence: target.evidence ?? [] });
  await addAction(sql, session.did, did, "unfollow", reason, { evidence: target.evidence ?? [] });
  await sql`
    UPDATE assessments
    SET status='unfollowed',resolved_at=now()
    WHERE owner_did=${session.did} AND did=${did}
  `;
  await sql`
    UPDATE relationships
    SET is_following=false,follow_uri=null
    WHERE owner_did=${session.did} AND did=${did}
  `;
  return { unfollowed: true, suppressed: true };
}

export async function blockGuardDid(did) {
  const sql = getSql();
  const session = await configuredSession();
  const target = await guardTarget(sql, session.did, did);
  let unfollowed = false;
  if (target.is_following && target.follow_uri) {
    await deleteFollow(session, String(target.follow_uri));
    unfollowed = true;
  }
  const block = await createBlock(session, did);
  const reason = (target.categories ?? []).join(", ") || "Manual moderation";
  await suppress(sql, session.did, did, target.handle, reason, "cleanup", { categories: target.categories ?? [], blockUri: block.uri });
  await addAction(sql, session.did, did, unfollowed ? "unfollow_block" : "block", reason, { blockUri: block.uri, evidence: target.evidence ?? [] });
  await sql`
    UPDATE assessments
    SET status='blocked',blocked_at=now(),resolved_at=now()
    WHERE owner_did=${session.did} AND did=${did}
  `;
  await sql`
    UPDATE relationships
    SET is_follower=false,is_following=false,follow_uri=null
    WHERE owner_did=${session.did} AND did=${did}
  `;
  return { unfollowed, blocked: true };
}
