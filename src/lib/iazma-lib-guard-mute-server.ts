/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import { createDecipheriv, createHash } from "node:crypto";
import { neon } from "@neondatabase/serverless";
import { ensureLibGuardSchema } from "@/lib/iazma-lib-guard-server";

const PUBLIC_API = "https://public.api.bsky.app/xrpc";
const APPVIEW_SERVICE = "did:web:api.bsky.app#bsky_appview";
const BULK_LIMIT = 40;
const BULK_SPACING_MS = 650;
const REQUEST_TIMEOUT_MS = 15_000;
const SESSION_CACHE_MAX_MS = 30 * 60_000;
const SESSION_CACHE_SAFETY_MS = 90_000;
const RATE_LIMIT_FALLBACK_MS = 120_000;
const RATE_LIMIT_MINIMUM_MS = 15_000;
const RATE_LIMIT_MAXIMUM_MS = 15 * 60_000;

type GuardSession = {
  did: string;
  accessJwt: string;
  pdsUrl: string;
};

type CachedSession = {
  actor: string;
  fingerprint: string;
  expiresAt: number;
  session: GuardSession;
};

type LibGuardMuteGlobal = typeof globalThis & {
  __iazmaLibGuardMuteSession?: CachedSession;
};

class BlueskyMuteRateLimitError extends Error {
  retryAfterMs: number;

  constructor(message: string, retryAfterMs: number) {
    super(`Bluesky rate limit: ${message}`);
    this.name = "BlueskyMuteRateLimitError";
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

function encryptionKey() {
  const secret = process.env.ADVANCED_NETWORK_ACCESS_SECRET?.trim();
  if (!secret) throw new Error("Advanced network secret is not configured.");
  return createHash("sha256").update(`rukh-bluesky-follow-automation:${secret}`).digest();
}

function decryptSecret(value: string) {
  const [version, ivText, tagText, encryptedText] = value.split(".");
  if (version !== "v1" || !ivText || !tagText || !encryptedText) throw new Error("Saved Bluesky credential is unreadable.");
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
      signal: init?.signal ?? AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    if (error instanceof Error && ["AbortError", "TimeoutError"].includes(error.name)) throw new Error("Bluesky request timed out.");
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
      throw new BlueskyMuteRateLimitError(message, retryAfterMs(response));
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
  const holder = globalThis as LibGuardMuteGlobal;
  const cached = holder.__iazmaLibGuardMuteSession;
  if (cached && cached.actor === actor && cached.fingerprint === fingerprint && cached.expiresAt > Date.now() + SESSION_CACHE_SAFETY_MS) {
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
  holder.__iazmaLibGuardMuteSession = { actor, fingerprint, expiresAt, session };
  return session;
}

async function appViewXrpc(session: GuardSession, method: "app.bsky.graph.muteActor" | "app.bsky.graph.unmuteActor", did: string) {
  return fetchJson(`${session.pdsUrl}/xrpc/${method}`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${session.accessJwt}`,
      "Content-Type": "application/json",
      "atproto-proxy": APPVIEW_SERVICE,
    },
    body: JSON.stringify({ actor: did }),
  });
}

async function target(sql, ownerDid: string, did: string) {
  return (await sql`
    SELECT r.did,r.handle,l.score,l.network_value,l.ukraine_saturation,l.lib_media_saturation,l.repost_ratio,
           l.metrics,l.evidence,l.muted_at
    FROM relationships r
    LEFT JOIN lib_guard_assessments l ON l.owner_did=r.owner_did AND l.did=r.did
    WHERE r.owner_did=${ownerDid} AND r.did=${did}
  `)[0];
}

function reason(row) {
  return `Lib Guard ${Number(row?.score ?? 0)}/100 · network ${Number(row?.network_value ?? 0)} · Ukraine ${Number(row?.ukraine_saturation ?? 0)}% · Lib TV ${Number(row?.lib_media_saturation ?? 0)}%`;
}

async function logAction(sql, ownerDid: string, did: string, action: string, row) {
  await sql`
    INSERT INTO actions(owner_did,target_did,action,reason,metadata)
    VALUES (${ownerDid},${did},${action},${reason(row)},${JSON.stringify({ metrics: row?.metrics ?? {}, evidence: row?.evidence ?? [] })}::jsonb)
  `;
}

function normalizeDids(input: unknown[]) {
  return [...new Set((Array.isArray(input) ? input : [])
    .map((value) => String(value ?? "").trim())
    .filter(Boolean))]
    .slice(0, BULK_LIMIT);
}

async function runBulk(input: unknown[], mode: "mute" | "unmute") {
  const requested = normalizeDids(input);
  const resultKey = mode === "mute" ? "muted" : "unmuted";
  if (!requested.length) return { requested: 0, [resultKey]: [], skipped: [], failed: [], remaining: [], rateLimited: false, retry_after_ms: 0 };

  const sql = await ensureLibGuardSchema();
  const session = await configuredSession();
  const changed: string[] = [];
  const skipped: string[] = [];
  const failed: Array<{ did: string; error: string }> = [];
  let rateLimited = false;
  let retryAfter = 0;
  let stoppedAt = requested.length;

  for (let index = 0; index < requested.length; index += 1) {
    const did = requested[index];
    try {
      const row = await target(sql, session.did, did);
      if (!row) throw new Error("Account is not in your Guard graph.");
      const alreadyDone = mode === "mute" ? Boolean(row.muted_at) : !row.muted_at;
      if (alreadyDone) {
        skipped.push(did);
      } else {
        await appViewXrpc(session, mode === "mute" ? "app.bsky.graph.muteActor" : "app.bsky.graph.unmuteActor", did);
        await sql`
          UPDATE lib_guard_assessments
          SET muted_at=${mode === "mute" ? new Date().toISOString() : null}::timestamptz
          WHERE owner_did=${session.did} AND did=${did}
        `;
        await logAction(sql, session.did, did, mode === "mute" ? "lib_guard_mute" : "lib_guard_unmute", row);
        changed.push(did);
      }
    } catch (error) {
      if (error instanceof BlueskyMuteRateLimitError) {
        rateLimited = true;
        retryAfter = error.retryAfterMs;
        stoppedAt = index;
        break;
      }
      failed.push({ did, error: error instanceof Error ? error.message : `${mode} failed.` });
    }
    if (index < requested.length - 1) await delay(BULK_SPACING_MS);
  }

  const completed = new Set([...changed, ...skipped, ...failed.map((item) => item.did)]);
  const remaining = rateLimited ? requested.slice(stoppedAt).filter((did) => !completed.has(did)) : [];
  return {
    requested: requested.length,
    [resultKey]: changed,
    skipped,
    failed,
    remaining,
    rateLimited,
    retry_after_ms: retryAfter,
  };
}

export async function bulkMuteLibGuardDids(input: unknown[]) {
  return runBulk(input, "mute");
}

export async function bulkUnmuteLibGuardDids(input: unknown[]) {
  return runBulk(input, "unmute");
}
