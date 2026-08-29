/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import { createDecipheriv, createHash } from "node:crypto";
import { neon } from "@neondatabase/serverless";

const PUBLIC_API = "https://public.api.bsky.app/xrpc";
const FOLLOW = "app.bsky.graph.follow";
const BLUESKY_REQUEST_TIMEOUT_MS = 15_000;
const BULK_UNFOLLOW_LIMIT = 40;
const BULK_UNFOLLOW_SPACING_MS = 900;
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
  credentialFingerprint: string;
  expiresAt: number;
  session: GuardSession;
};

type GuardGlobal = typeof globalThis & {
  __iazmaGuardUnfollowSession?: CachedGuardSession;
};

class BlueskyUnfollowRateLimitError extends Error {
  retryAfterMs: number;

  constructor(message: string, retryAfterMs: number) {
    super(`Bluesky rate limit: ${message}`);
    this.name = "BlueskyUnfollowRateLimitError";
    this.retryAfterMs = retryAfterMs;
  }
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getSql() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not configured.");
  return neon(process.env.DATABASE_URL);
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

function boundedRetryAfter(value: number) {
  return Math.max(RATE_LIMIT_MINIMUM_MS, Math.min(RATE_LIMIT_MAXIMUM_MS, Math.ceil(value)));
}

function retryAfterMs(response: Response) {
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
      signal: init?.signal ?? AbortSignal.timeout(BLUESKY_REQUEST_TIMEOUT_MS),
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
      throw new BlueskyUnfollowRateLimitError(message, retryAfterMs(response));
    }
    if (unreadable) throw new Error(`Bluesky returned an unreadable error response (${response.status}).`);
    throw new Error(message);
  }
  if (unreadable) throw new Error("Bluesky returned an unreadable response.");
  return body;
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
    SELECT actor_handle, app_password_enc
    FROM bluesky_follow_automation_settings
    WHERE id=1
  `;
  const current = rows[0];
  if (!current?.app_password_enc) {
    throw new Error("Save the Bluesky app password in IAZMA Auto DM first.");
  }

  const actor = String(current.actor_handle);
  const encryptedPassword = String(current.app_password_enc);
  const credentialFingerprint = createHash("sha256").update(encryptedPassword).digest("base64url").slice(0, 20);
  const holder = globalThis as GuardGlobal;
  const cached = holder.__iazmaGuardUnfollowSession;
  if (
    cached
    && cached.actor === actor
    && cached.credentialFingerprint === credentialFingerprint
    && cached.expiresAt > Date.now() + SESSION_CACHE_SAFETY_MS
  ) {
    return cached.session;
  }

  const password = decryptSecret(encryptedPassword);
  const didRes = await fetchJson(
    `${PUBLIC_API}/com.atproto.identity.resolveHandle?handle=${encodeURIComponent(actor)}`,
  );
  const pdsUrl = await resolvePds(String(didRes.did));
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
  holder.__iazmaGuardUnfollowSession = { actor, credentialFingerprint, expiresAt, session };
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

async function guardTarget(sql, ownerDid: string, did: string) {
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

async function finalizeUnfollow(sql, session: GuardSession, did: string, target) {
  const categories = target.categories ?? [];
  const evidence = target.evidence ?? [];
  const reason = categories.join(", ") || "Manual Guard cleanup";
  await sql`
    INSERT INTO suppressions(owner_did,did,handle,reason,source,evidence,active)
    VALUES (${session.did},${did},${target.handle ?? null},${reason},'cleanup',${JSON.stringify({ categories, evidence })}::jsonb,true)
    ON CONFLICT(owner_did,did) DO UPDATE
    SET handle=excluded.handle,
        reason=excluded.reason,
        source=excluded.source,
        evidence=excluded.evidence,
        active=true,
        updated_at=now()
  `;
  await sql`
    INSERT INTO actions(owner_did,target_did,action,reason,metadata)
    VALUES (${session.did},${did},'unfollow',${reason},${JSON.stringify({ evidence })}::jsonb)
  `;
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
  return { reason, handle: target.handle ?? null };
}

async function markAlreadyUnfollowed(sql, session: GuardSession, did: string) {
  await sql`
    UPDATE assessments
    SET status='unfollowed',resolved_at=coalesce(resolved_at,now())
    WHERE owner_did=${session.did} AND did=${did}
  `;
  await sql`
    UPDATE relationships
    SET is_following=false,follow_uri=null
    WHERE owner_did=${session.did} AND did=${did}
  `;
}

export async function unfollowGuardDidEfficient(did: string) {
  const targetDid = String(did ?? "").trim();
  if (!targetDid) throw new Error("Missing account DID.");
  const sql = getSql();
  const session = await configuredSession();
  const target = await guardTarget(sql, session.did, targetDid);
  if (!target.is_following || !target.follow_uri) {
    await markAlreadyUnfollowed(sql, session, targetDid);
    return { unfollowed: false, alreadyUnfollowed: true, suppressed: false };
  }
  await deleteFollow(session, String(target.follow_uri));
  const detail = await finalizeUnfollow(sql, session, targetDid, target);
  return { unfollowed: true, alreadyUnfollowed: false, suppressed: true, ...detail };
}

export async function bulkUnfollowGuardDids(input: unknown[]) {
  const requested = [...new Set((Array.isArray(input) ? input : [])
    .map((value) => String(value ?? "").trim())
    .filter(Boolean))]
    .slice(0, BULK_UNFOLLOW_LIMIT);
  if (!requested.length) {
    return { requested: 0, unfollowed: [], skipped: [], failed: [], remaining: [], rateLimited: false, retry_after_ms: 0 };
  }

  const sql = getSql();
  const session = await configuredSession();
  const unfollowed: string[] = [];
  const skipped: string[] = [];
  const failed: Array<{ did: string; error: string }> = [];
  let rateLimited = false;
  let retryAfter = 0;
  let stoppedAt = requested.length;

  for (let index = 0; index < requested.length; index += 1) {
    const did = requested[index];
    try {
      const target = await guardTarget(sql, session.did, did);
      if (!target.is_following || !target.follow_uri) {
        await markAlreadyUnfollowed(sql, session, did);
        skipped.push(did);
      } else {
        await deleteFollow(session, String(target.follow_uri));
        await finalizeUnfollow(sql, session, did, target);
        unfollowed.push(did);
      }
    } catch (error) {
      if (error instanceof BlueskyUnfollowRateLimitError) {
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
  const remaining = rateLimited
    ? requested.slice(stoppedAt).filter((did) => !completed.has(did))
    : [];

  return {
    requested: requested.length,
    unfollowed,
    skipped,
    failed,
    remaining,
    rateLimited,
    retry_after_ms: retryAfter,
  };
}
