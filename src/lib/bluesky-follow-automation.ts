import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";
import { neon } from "@neondatabase/serverless";

export const DEFAULT_AUTOMATION_ACTOR = "rukhlabs.bsky.social";
export const DEFAULT_AUTOMATION_MESSAGE =
  "hey comrade, thanks for the follow — i build weird internet stuff. if you’re making something too, send it my way. i’m nosy.";

const PUBLIC_API = "https://public.api.bsky.app/xrpc";
const CHAT_PROXY = "did:web:api.bsky.chat#bsky_chat";
const SYNC_THROTTLE_MINUTES = 4;
const MAX_FOLLOWER_PAGES_PER_SYNC = 20;
const MAX_BASELINE_PAGES = 200;
const RETRY_LIMIT = 6;

function databaseUrl() {
  const value = process.env.DATABASE_URL?.trim();
  if (!value) throw new Error("DATABASE_URL is not configured.");
  return value;
}

function getSql() {
  return neon(databaseUrl());
}

type Sql = ReturnType<typeof getSql>;

type PublicFollower = {
  did: string;
  handle: string;
  displayName?: string;
  avatar?: string;
};

type FollowerPage = {
  followers: PublicFollower[];
  cursor?: string;
};

type BskySession = {
  accessJwt: string;
  did: string;
  handle: string;
  pdsUrl: string;
};

type ChatAvailability = {
  canChat: boolean;
  convo?: { id?: string };
};

type ResolveHandleResponse = {
  did: string;
};

type DidService = {
  id?: string;
  type?: string;
  serviceEndpoint?: unknown;
};

type DidDocument = {
  id?: string;
  service?: DidService[];
};

type SettingsRow = {
  actor_handle: string;
  app_password_enc: string | null;
  message: string;
  enabled: boolean;
  baseline_seeded: boolean;
  last_sync_at: string | null;
  last_sync_error: string | null;
  last_weekly_post_at: string | null;
};

type FollowerRow = {
  follower_did: string;
  follower_handle: string;
  profile_name: string | null;
  first_seen_at: string;
  dm_status: string;
  dm_attempts: number;
  initial_availability_checked_at: string | null;
  initial_can_chat: boolean | null;
  last_dm_attempt_at: string | null;
  next_retry_at: string | null;
  weekly_eligible: boolean;
  thanked_at: string | null;
  last_error: string | null;
};

type WeeklyRunRow = {
  status: string;
  root_uri: string | null;
  root_cid: string | null;
  last_uri: string | null;
  last_cid: string | null;
};

type WeeklyMention = { did: string; handle: string };
type WeeklyChunk = { text: string; mentions: WeeklyMention[] };
type StrongRef = { uri: string; cid: string };
type CreateRecordResponse = StrongRef;

type ErrorBody = { error?: string; message?: string };

export type FollowAutomationPublicState = {
  configured: boolean;
  actorHandle: string;
  message: string;
  enabled: boolean;
  appPasswordSaved: boolean;
  baselineSeeded: boolean;
  lastSyncAt: string | null;
  lastSyncError: string | null;
  lastWeeklyPostAt: string | null;
  stats: {
    baseline: number;
    sent: number;
    queuedForMonday: number;
    retrying: number;
    failed: number;
  };
};

export type FollowAutomationSyncResult = {
  ok: boolean;
  skipped?: boolean;
  seeded?: number;
  discovered?: number;
  sent?: number;
  queuedForMonday?: number;
  retried?: number;
  message?: string;
};

export class AtprotoRequestError extends Error {
  status?: number;
  code?: string;

  constructor(message: string, options?: { status?: number; code?: string }) {
    super(message);
    this.name = "AtprotoRequestError";
    this.status = options?.status;
    this.code = options?.code;
  }
}

function normalizeHandle(value: string) {
  return value.trim().replace(/^@/, "").toLowerCase();
}

function encryptionSecret() {
  const value = process.env.ADVANCED_NETWORK_ACCESS_SECRET?.trim();
  if (!value) {
    throw new Error(
      "ADVANCED_NETWORK_ACCESS_SECRET is required to protect the Bluesky app password.",
    );
  }
  return value;
}

function encryptionKey() {
  return createHash("sha256")
    .update(`rukh-bluesky-follow-automation:${encryptionSecret()}`)
    .digest();
}

function encryptSecret(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return ["v1", iv, cipher.getAuthTag(), encrypted]
    .map((part) => (typeof part === "string" ? part : part.toString("base64url")))
    .join(".");
}

function decryptSecret(value: string) {
  const [version, ivText, tagText, encryptedText] = value.split(".");
  if (version !== "v1" || !ivText || !tagText || !encryptedText) {
    throw new Error("The saved Bluesky credential is not readable.");
  }
  const decipher = createDecipheriv(
    "aes-256-gcm",
    encryptionKey(),
    Buffer.from(ivText, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(tagText, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedText, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

async function parseError(response: Response) {
  let body: ErrorBody = {};
  try {
    body = (await response.json()) as ErrorBody;
  } catch {
    // Some upstream failures are not JSON.
  }
  return new AtprotoRequestError(
    body.message || `Bluesky returned ${response.status}.`,
    { status: response.status, code: body.error },
  );
}

async function fetchJson<T>(url: URL | string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, { ...init, cache: "no-store" });
  } catch (error) {
    throw new AtprotoRequestError(
      error instanceof Error ? error.message : "Could not reach Bluesky.",
    );
  }
  if (!response.ok) throw await parseError(response);
  return (await response.json()) as T;
}

async function resolveDid(identifier: string) {
  if (identifier.startsWith("did:")) return identifier;
  const url = new URL(`${PUBLIC_API}/com.atproto.identity.resolveHandle`);
  url.searchParams.set("handle", normalizeHandle(identifier));
  const resolved = await fetchJson<ResolveHandleResponse>(url);
  if (!resolved.did.startsWith("did:")) {
    throw new Error("Bluesky returned an invalid DID for this account.");
  }
  return resolved.did;
}

function didDocumentUrl(did: string) {
  if (did.startsWith("did:plc:")) {
    return `https://plc.directory/${did}`;
  }
  if (did.startsWith("did:web:")) {
    const parts = did
      .slice("did:web:".length)
      .split(":")
      .map((part) => decodeURIComponent(part));
    const host = parts.shift();
    if (!host) throw new Error("The Bluesky DID document host is invalid.");
    if (!parts.length) return `https://${host}/.well-known/did.json`;
    return `https://${host}/${parts.map((part) => encodeURIComponent(part)).join("/")}/did.json`;
  }
  throw new Error(`Unsupported Bluesky DID method: ${did.split(":").slice(0, 2).join(":")}`);
}

async function resolvePds(identifier: string) {
  const did = await resolveDid(identifier);
  const document = await fetchJson<DidDocument>(didDocumentUrl(did));
  const service = document.service?.find(
    (item) => item.id === `${did}#atproto_pds` || item.id?.endsWith("#atproto_pds"),
  );
  if (!service || typeof service.serviceEndpoint !== "string") {
    throw new Error("Could not find this account's AT Protocol PDS.");
  }
  const endpoint = new URL(service.serviceEndpoint);
  if (endpoint.protocol !== "https:") {
    throw new Error("The account PDS must use HTTPS.");
  }
  return { did, pdsUrl: endpoint.toString().replace(/\/$/, "") };
}

async function createSession(identifier: string, password: string) {
  const { did, pdsUrl } = await resolvePds(identifier);
  const session = await fetchJson<Omit<BskySession, "pdsUrl">>(
    `${pdsUrl}/xrpc/com.atproto.server.createSession`,
    {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({ identifier, password }),
    },
  );
  if (session.did !== did) {
    throw new Error("Bluesky login resolved to a different account than expected.");
  }
  return { ...session, pdsUrl };
}

async function chatRequest<T>(
  session: BskySession,
  method: string,
  options?: { params?: Record<string, string>; body?: unknown },
) {
  const url = new URL(`${session.pdsUrl}/xrpc/${method}`);
  for (const [key, value] of Object.entries(options?.params ?? {})) {
    url.searchParams.append(key, value);
  }
  return fetchJson<T>(url, {
    method: options?.body === undefined ? "GET" : "POST",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${session.accessJwt}`,
      "atproto-proxy": CHAT_PROXY,
      ...(options?.body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    body: options?.body === undefined ? undefined : JSON.stringify(options.body),
  });
}

async function followerPage(actor: string, cursor?: string) {
  const url = new URL(`${PUBLIC_API}/app.bsky.graph.getFollowers`);
  url.searchParams.set("actor", actor);
  url.searchParams.set("limit", "100");
  url.searchParams.set("sort", "latest");
  if (cursor) url.searchParams.set("cursor", cursor);
  return fetchJson<FollowerPage>(url);
}

export async function ensureFollowAutomationSchema(sql: Sql = getSql()) {
  await sql`
    create table if not exists bluesky_follow_automation_settings (
      id smallint primary key check (id = 1),
      actor_handle text not null default 'rukhlabs.bsky.social',
      app_password_enc text,
      message text not null,
      enabled boolean not null default false,
      baseline_seeded boolean not null default false,
      last_sync_at timestamptz,
      last_sync_error text,
      last_weekly_post_at timestamptz,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )
  `;
  await sql`
    insert into bluesky_follow_automation_settings (id, actor_handle, message)
    values (1, ${DEFAULT_AUTOMATION_ACTOR}, ${DEFAULT_AUTOMATION_MESSAGE})
    on conflict (id) do nothing
  `;
  await sql`
    create table if not exists bluesky_follow_automation (
      follower_did text primary key,
      follower_handle text not null,
      profile_name text,
      first_seen_at timestamptz not null default now(),
      source_tag text,
      dm_status text not null default 'pending',
      dm_attempts integer not null default 0,
      initial_availability_checked_at timestamptz,
      initial_can_chat boolean,
      last_dm_attempt_at timestamptz,
      next_retry_at timestamptz,
      weekly_eligible boolean not null default false,
      thanked_at timestamptz,
      last_error text
    )
  `;
  await sql`
    create index if not exists bluesky_follow_automation_retry_idx
      on bluesky_follow_automation (dm_status, next_retry_at)
  `;
  await sql`
    create index if not exists bluesky_follow_automation_weekly_idx
      on bluesky_follow_automation (weekly_eligible, thanked_at, first_seen_at)
  `;
  await sql`
    create table if not exists bluesky_weekly_thanks_runs (
      week_start date primary key,
      status text not null default 'pending',
      root_uri text,
      root_cid text,
      last_uri text,
      last_cid text,
      started_at timestamptz,
      completed_at timestamptz,
      last_error text
    )
  `;
  return sql;
}

async function settings(sql: Sql) {
  const rows = await sql`
    select actor_handle, app_password_enc, message, enabled, baseline_seeded,
           last_sync_at, last_sync_error, last_weekly_post_at
    from bluesky_follow_automation_settings
    where id = 1
  `;
  const row = rows[0] as unknown as SettingsRow | undefined;
  if (!row) throw new Error("Bluesky follower automation settings are missing.");
  return row;
}

export async function getFollowAutomationPublicState(): Promise<FollowAutomationPublicState> {
  const sql = await ensureFollowAutomationSchema();
  const current = await settings(sql);
  const rows = await sql`
    select
      count(*) filter (where dm_status = 'baseline')::int as baseline,
      count(*) filter (where dm_status = 'sent')::int as sent,
      count(*) filter (where weekly_eligible = true and thanked_at is null)::int as queued,
      count(*) filter (where dm_status in ('pending','retry','processing'))::int as retrying,
      count(*) filter (where dm_status = 'failed')::int as failed
    from bluesky_follow_automation
  `;
  const stats = (rows[0] ?? {}) as Record<string, unknown>;
  const number = (key: string) => Number(stats[key] ?? 0);
  return {
    configured: true,
    actorHandle: current.actor_handle,
    message: current.message,
    enabled: current.enabled,
    appPasswordSaved: Boolean(current.app_password_enc),
    baselineSeeded: current.baseline_seeded,
    lastSyncAt: current.last_sync_at,
    lastSyncError: current.last_sync_error,
    lastWeeklyPostAt: current.last_weekly_post_at,
    stats: {
      baseline: number("baseline"),
      sent: number("sent"),
      queuedForMonday: number("queued"),
      retrying: number("retrying"),
      failed: number("failed"),
    },
  };
}

async function validateCredential(actor: string, password: string) {
  const session = await createSession(actor, password);
  if (normalizeHandle(session.handle) !== normalizeHandle(actor)) {
    throw new Error(`That app password authenticated @${session.handle}, not @${actor}.`);
  }
  try {
    await chatRequest(session, "chat.bsky.convo.listConvos", { params: { limit: "1" } });
  } catch (error) {
    if (
      error instanceof AtprotoRequestError &&
      [400, 401, 403].includes(error.status ?? 0)
    ) {
      throw new Error(
        "That Bluesky app password does not have chat/DM access. Create one with direct-message access enabled and try again.",
      );
    }
    throw error;
  }
}

export async function saveFollowAutomationSettings(input: {
  actorHandle: string;
  message: string;
  enabled: boolean;
  appPassword?: string;
}) {
  const sql = await ensureFollowAutomationSchema();
  const current = await settings(sql);
  const actor = normalizeHandle(input.actorHandle || DEFAULT_AUTOMATION_ACTOR);
  const message = input.message.trim();
  const suppliedPassword = input.appPassword?.trim() || "";
  if (!actor) throw new Error("A Bluesky handle is required.");
  if (!message) throw new Error("The welcome DM cannot be empty.");

  const actorChanged = normalizeHandle(current.actor_handle) !== actor;
  let encryptedPassword = current.app_password_enc;
  if (suppliedPassword) {
    await validateCredential(actor, suppliedPassword);
    encryptedPassword = encryptSecret(suppliedPassword);
  } else if (actorChanged && current.app_password_enc) {
    throw new Error("Enter an app password when changing the Bluesky account.");
  }
  if (input.enabled && !encryptedPassword) {
    throw new Error("Save a chat-enabled Bluesky app password before enabling Auto DM.");
  }

  if (actorChanged) {
    await sql`delete from bluesky_follow_automation`;
    await sql`delete from bluesky_weekly_thanks_runs`;
  }
  if (suppliedPassword && current.app_password_enc) {
    await sql`
      update bluesky_follow_automation
      set dm_status = 'retry', next_retry_at = now(), last_error = null
      where dm_status = 'failed' and thanked_at is null
    `;
  }
  await sql`
    update bluesky_follow_automation_settings
    set actor_handle = ${actor},
        app_password_enc = ${encryptedPassword},
        message = ${message},
        enabled = ${input.enabled},
        baseline_seeded = case when ${actorChanged} then false else baseline_seeded end,
        last_sync_error = null,
        updated_at = now()
    where id = 1
  `;

  const updated = await settings(sql);
  if (updated.enabled && !updated.baseline_seeded) await seedBaseline(sql, updated);
  return getFollowAutomationPublicState();
}

async function insertBaseline(sql: Sql, followers: PublicFollower[]) {
  if (!followers.length) return;
  const payload = JSON.stringify(
    followers.map((item) => ({
      did: item.did,
      handle: normalizeHandle(item.handle),
      display_name: item.displayName?.trim() || null,
    })),
  );
  await sql`
    insert into bluesky_follow_automation (
      follower_did, follower_handle, profile_name, source_tag, dm_status, weekly_eligible
    )
    select item.did, item.handle, item.display_name, 'baseline', 'baseline', false
    from jsonb_to_recordset(${payload}::jsonb)
      as item(did text, handle text, display_name text)
    on conflict (follower_did) do nothing
  `;
}

async function seedBaseline(sql: Sql, current: SettingsRow) {
  let cursor: string | undefined;
  let count = 0;
  for (let pageNumber = 0; pageNumber < MAX_BASELINE_PAGES; pageNumber += 1) {
    const page = await followerPage(current.actor_handle, cursor);
    await insertBaseline(sql, page.followers);
    count += page.followers.length;
    cursor = page.cursor;
    if (!cursor || !page.followers.length) {
      await sql`
        update bluesky_follow_automation_settings
        set baseline_seeded = true, last_sync_error = null, updated_at = now()
        where id = 1
      `;
      return count;
    }
  }
  throw new Error(
    "Baseline follower scan exceeded its safety limit. Auto DM has not started for new followers.",
  );
}

async function knownDids(sql: Sql, dids: string[]) {
  if (!dids.length) return new Set<string>();
  const payload = JSON.stringify(dids);
  const rows = await sql`
    select follower_did
    from bluesky_follow_automation
    where follower_did in (
      select value from jsonb_array_elements_text(${payload}::jsonb)
    )
  `;
  return new Set(rows.map((row) => String(row.follower_did)));
}

async function discoverFollowers(sql: Sql, actor: string) {
  let cursor: string | undefined;
  const found: PublicFollower[] = [];
  for (let pageNumber = 0; pageNumber < MAX_FOLLOWER_PAGES_PER_SYNC; pageNumber += 1) {
    const page = await followerPage(actor, cursor);
    if (!page.followers.length) break;
    const known = await knownDids(sql, page.followers.map((item) => item.did));
    found.push(...page.followers.filter((item) => !known.has(item.did)));
    if (known.size > 0 || !page.cursor) break;
    cursor = page.cursor;
  }
  return found.reverse();
}

async function registerFollower(sql: Sql, follower: PublicFollower) {
  const rows = await sql`
    insert into bluesky_follow_automation (
      follower_did, follower_handle, profile_name, source_tag, dm_status
    ) values (
      ${follower.did}, ${normalizeHandle(follower.handle)},
      ${follower.displayName?.trim() || null}, 'follower-sync', 'pending'
    )
    on conflict (follower_did) do nothing
    returning *
  `;
  return (rows[0] as unknown as FollowerRow | undefined) ?? null;
}

async function claimFollower(sql: Sql, did: string) {
  const rows = await sql`
    update bluesky_follow_automation
    set dm_status = 'processing', dm_attempts = dm_attempts + 1,
        last_dm_attempt_at = now(), next_retry_at = null
    where follower_did = ${did}
      and (
        dm_status = 'pending'
        or (dm_status = 'retry' and (next_retry_at is null or next_retry_at <= now()))
        or (dm_status = 'processing' and last_dm_attempt_at < now() - interval '15 minutes')
      )
    returning *
  `;
  return (rows[0] as unknown as FollowerRow | undefined) ?? null;
}

function retryable(error: unknown) {
  return (
    error instanceof AtprotoRequestError &&
    (error.status === undefined || error.status === 429 || error.status >= 500)
  );
}

function retryMinutes(attempt: number) {
  return Math.min(360, 5 * 2 ** Math.max(0, attempt - 1));
}

async function processFollower(
  sql: Sql,
  claimed: FollowerRow,
  current: SettingsRow,
  session: BskySession,
) {
  const firstAvailabilityAttempt = !claimed.initial_availability_checked_at;
  if (firstAvailabilityAttempt) {
    await sql`
      update bluesky_follow_automation
      set initial_availability_checked_at = now()
      where follower_did = ${claimed.follower_did}
        and initial_availability_checked_at is null
    `;
  }

  try {
    const availability = await chatRequest<ChatAvailability>(
      session,
      "chat.bsky.convo.getConvoAvailability",
      { params: { members: claimed.follower_did } },
    );
    if (!availability.canChat) {
      await sql`
        update bluesky_follow_automation
        set dm_status = 'recipient_unavailable',
            initial_can_chat = case when ${firstAvailabilityAttempt} then false else initial_can_chat end,
            weekly_eligible = case when ${firstAvailabilityAttempt} then true else weekly_eligible end,
            next_retry_at = null,
            last_error = null
        where follower_did = ${claimed.follower_did}
      `;
      return "queued" as const;
    }

    if (firstAvailabilityAttempt) {
      await sql`
        update bluesky_follow_automation
        set initial_can_chat = true
        where follower_did = ${claimed.follower_did}
      `;
    }

    let convoId = availability.convo?.id;
    if (!convoId) {
      const convo = await chatRequest<{ convo: { id: string } }>(
        session,
        "chat.bsky.convo.getConvoForMembers",
        { params: { members: claimed.follower_did } },
      );
      convoId = convo.convo.id;
    }
    await chatRequest(session, "chat.bsky.convo.sendMessage", {
      body: { convoId, message: { text: current.message } },
    });
    await sql`
      update bluesky_follow_automation
      set dm_status = 'sent', weekly_eligible = false,
          next_retry_at = null, last_error = null
      where follower_did = ${claimed.follower_did}
    `;
    return "sent" as const;
  } catch (error) {
    const shouldRetry = retryable(error) && claimed.dm_attempts < RETRY_LIMIT;
    const errorText =
      error instanceof Error ? error.message.slice(0, 900) : "Unknown Bluesky error";
    if (shouldRetry) {
      const delay = retryMinutes(claimed.dm_attempts);
      await sql`
        update bluesky_follow_automation
        set dm_status = 'retry',
            next_retry_at = now() + (${delay} * interval '1 minute'),
            weekly_eligible = false,
            last_error = ${errorText}
        where follower_did = ${claimed.follower_did}
      `;
      return "retry" as const;
    }
    await sql`
      update bluesky_follow_automation
      set dm_status = 'failed', next_retry_at = null,
          weekly_eligible = false, last_error = ${errorText}
      where follower_did = ${claimed.follower_did}
    `;
    return "failed" as const;
  }
}

async function sessionFor(current: SettingsRow) {
  if (!current.app_password_enc) throw new Error("No Bluesky app password is saved.");
  return createSession(current.actor_handle, decryptSecret(current.app_password_enc));
}

async function processDids(sql: Sql, current: SettingsRow, dids: string[]) {
  if (!dids.length) return { sent: 0, queued: 0, retried: 0 };
  const session = await sessionFor(current);
  let sent = 0;
  let queued = 0;
  let retried = 0;
  for (const did of dids) {
    const claimed = await claimFollower(sql, did);
    if (!claimed) continue;
    const result = await processFollower(sql, claimed, current, session);
    if (result === "sent") sent += 1;
    if (result === "queued") queued += 1;
    if (result === "retry") retried += 1;
  }
  return { sent, queued, retried };
}

async function dueRetries(sql: Sql) {
  const rows = await sql`
    select follower_did
    from bluesky_follow_automation
    where
      (dm_status = 'retry' and (next_retry_at is null or next_retry_at <= now()))
      or (dm_status = 'processing' and last_dm_attempt_at < now() - interval '15 minutes')
    order by coalesce(next_retry_at, last_dm_attempt_at, first_seen_at) asc
    limit 20
  `;
  return rows.map((row) => String(row.follower_did));
}

async function claimSync(sql: Sql, force: boolean) {
  if (force) {
    await sql`
      update bluesky_follow_automation_settings
      set last_sync_at = now(), updated_at = now()
      where id = 1
    `;
    return true;
  }
  const rows = await sql`
    update bluesky_follow_automation_settings
    set last_sync_at = now(), updated_at = now()
    where id = 1
      and (
        last_sync_at is null
        or last_sync_at < now() - (${SYNC_THROTTLE_MINUTES} * interval '1 minute')
      )
    returning id
  `;
  return rows.length > 0;
}

export async function syncFollowAutomation(
  options: { force?: boolean } = {},
): Promise<FollowAutomationSyncResult> {
  const sql = await ensureFollowAutomationSchema();
  let current = await settings(sql);
  if (!current.enabled) {
    return { ok: true, skipped: true, message: "Auto DM is disabled." };
  }
  if (!current.app_password_enc) {
    return { ok: false, skipped: true, message: "No Bluesky app password is saved." };
  }
  if (!(await claimSync(sql, Boolean(options.force)))) {
    return { ok: true, skipped: true, message: "A recent sync already ran." };
  }

  try {
    let seeded = 0;
    if (!current.baseline_seeded) {
      seeded = await seedBaseline(sql, current);
      current = await settings(sql);
    }
    const discovered = await discoverFollowers(sql, current.actor_handle);
    const newDids: string[] = [];
    for (const follower of discovered) {
      const inserted = await registerFollower(sql, follower);
      if (inserted) newDids.push(inserted.follower_did);
    }
    const retries = await dueRetries(sql);
    const processed = await processDids(
      sql,
      current,
      Array.from(new Set([...newDids, ...retries])),
    );
    await sql`
      update bluesky_follow_automation_settings
      set last_sync_error = null, updated_at = now()
      where id = 1
    `;
    return {
      ok: true,
      seeded,
      discovered: newDids.length,
      sent: processed.sent,
      queuedForMonday: processed.queued,
      retried: processed.retried,
    };
  } catch (error) {
    const errorText =
      error instanceof Error ? error.message.slice(0, 900) : "Follower sync failed.";
    await sql`
      update bluesky_follow_automation_settings
      set last_sync_error = ${errorText}, updated_at = now()
      where id = 1
    `;
    throw error;
  }
}

function denverParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Denver",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value || "";
  return {
    year: value("year"),
    month: value("month"),
    day: value("day"),
    weekday: value("weekday"),
    hour: Number(value("hour")),
  };
}

function weekKey() {
  const local = denverParts();
  return `${local.year}-${local.month}-${local.day}`;
}

function graphemes(value: string) {
  return Array.from(
    new Intl.Segmenter("en", { granularity: "grapheme" }).segment(value),
  ).length;
}

function weeklyChunks(mentions: WeeklyMention[], continuing: boolean) {
  const chunks: WeeklyChunk[] = [];
  let text = continuing ? "And y'all too..." : "Thanks for the #follow, y'all.";
  let current: WeeklyMention[] = [];
  for (const mention of mentions) {
    const line = `@${mention.handle}`;
    const candidate = `${text}\n${line}`;
    if (current.length && graphemes(candidate) > 300) {
      chunks.push({ text, mentions: current });
      text = `And y'all too...\n${line}`;
      current = [mention];
      continue;
    }
    if (graphemes(candidate) > 300) {
      throw new Error(`@${mention.handle} is too long to fit in a Bluesky post.`);
    }
    text = candidate;
    current.push(mention);
  }
  if (current.length) chunks.push({ text, mentions: current });
  return chunks;
}

function byteRange(text: string, needle: string, start = 0) {
  const characterStart = text.indexOf(needle, start);
  if (characterStart < 0) return null;
  const byteStart = Buffer.byteLength(text.slice(0, characterStart), "utf8");
  return {
    characterStart,
    byteStart,
    byteEnd: byteStart + Buffer.byteLength(needle, "utf8"),
  };
}

function facets(chunk: WeeklyChunk) {
  const result: Array<Record<string, unknown>> = [];
  const tag = byteRange(chunk.text, "#follow");
  if (tag) {
    result.push({
      index: { byteStart: tag.byteStart, byteEnd: tag.byteEnd },
      features: [{ $type: "app.bsky.richtext.facet#tag", tag: "follow" }],
    });
  }
  let from = 0;
  for (const mention of chunk.mentions) {
    const token = `@${mention.handle}`;
    const range = byteRange(chunk.text, token, from);
    if (!range) continue;
    result.push({
      index: { byteStart: range.byteStart, byteEnd: range.byteEnd },
      features: [{ $type: "app.bsky.richtext.facet#mention", did: mention.did }],
    });
    from = range.characterStart + token.length;
  }
  return result;
}

async function createPost(
  session: BskySession,
  chunk: WeeklyChunk,
  reply?: { root: StrongRef; parent: StrongRef },
) {
  const record: Record<string, unknown> = {
    $type: "app.bsky.feed.post",
    text: chunk.text,
    facets: facets(chunk),
    createdAt: new Date().toISOString(),
  };
  if (reply) record.reply = reply;
  return fetchJson<CreateRecordResponse>(
    `${session.pdsUrl}/xrpc/com.atproto.repo.createRecord`,
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${session.accessJwt}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        repo: session.did,
        collection: "app.bsky.feed.post",
        record,
      }),
    },
  );
}

async function weeklyRun(sql: Sql, week: string) {
  const rows = await sql`
    select status, root_uri, root_cid, last_uri, last_cid
    from bluesky_weekly_thanks_runs
    where week_start = ${week}::date
  `;
  return (rows[0] as unknown as WeeklyRunRow | undefined) ?? null;
}

export async function runWeeklyThanks(options: { force?: boolean } = {}) {
  const sql = await ensureFollowAutomationSchema();
  const current = await settings(sql);
  if (!current.enabled || !current.app_password_enc) {
    return { ok: true, skipped: true, message: "Auto DM is disabled or not configured." };
  }
  const local = denverParts();
  if (!options.force && (local.weekday !== "Mon" || local.hour !== 8)) {
    return { ok: true, skipped: true, message: "Not the Monday 8am Mountain window." };
  }

  const week = weekKey();
  await sql`
    insert into bluesky_weekly_thanks_runs (week_start, status, started_at)
    values (${week}::date, 'running', now())
    on conflict (week_start) do nothing
  `;
  const run = await weeklyRun(sql, week);
  if (!run) throw new Error("Could not create the weekly Bluesky run record.");
  if (run.status === "complete") {
    return { ok: true, skipped: true, message: "This week's thank-you thread already ran." };
  }
  await sql`
    update bluesky_weekly_thanks_runs
    set status = 'running', started_at = coalesce(started_at, now()), last_error = null
    where week_start = ${week}::date
  `;

  const queueRows = await sql`
    select follower_did as did, follower_handle as handle
    from bluesky_follow_automation
    where weekly_eligible = true and thanked_at is null
    order by first_seen_at asc, follower_handle asc
  `;
  const queue = queueRows.map((row) => ({
    did: String(row.did),
    handle: String(row.handle),
  }));
  if (!queue.length) {
    await sql`
      update bluesky_weekly_thanks_runs
      set status = 'complete', completed_at = now(), last_error = null
      where week_start = ${week}::date
    `;
    return { ok: true, posted: 0, mentioned: 0 };
  }

  try {
    const session = await sessionFor(current);
    const continuing = Boolean(run.root_uri && run.root_cid);
    const chunks = weeklyChunks(queue, continuing);
    let root: StrongRef | undefined =
      run.root_uri && run.root_cid ? { uri: run.root_uri, cid: run.root_cid } : undefined;
    let parent: StrongRef | undefined =
      run.last_uri && run.last_cid ? { uri: run.last_uri, cid: run.last_cid } : root;
    let posted = 0;
    let mentioned = 0;

    for (const chunk of chunks) {
      const created = await createPost(
        session,
        chunk,
        root && parent ? { root, parent } : undefined,
      );
      if (!root) root = created;
      parent = created;
      posted += 1;
      mentioned += chunk.mentions.length;
      const dids = JSON.stringify(chunk.mentions.map((item) => item.did));
      await sql`
        update bluesky_follow_automation
        set thanked_at = now()
        where follower_did in (
          select value from jsonb_array_elements_text(${dids}::jsonb)
        )
      `;
      await sql`
        update bluesky_weekly_thanks_runs
        set root_uri = ${root.uri}, root_cid = ${root.cid},
            last_uri = ${parent.uri}, last_cid = ${parent.cid}, last_error = null
        where week_start = ${week}::date
      `;
    }

    await sql`
      update bluesky_weekly_thanks_runs
      set status = 'complete', completed_at = now(), last_error = null
      where week_start = ${week}::date
    `;
    await sql`
      update bluesky_follow_automation_settings
      set last_weekly_post_at = now(), updated_at = now()
      where id = 1
    `;
    return { ok: true, posted, mentioned, rootUri: root?.uri ?? null };
  } catch (error) {
    const errorText =
      error instanceof Error ? error.message.slice(0, 900) : "Weekly Bluesky post failed.";
    await sql`
      update bluesky_weekly_thanks_runs
      set status = 'failed', last_error = ${errorText}
      where week_start = ${week}::date
    `;
    throw error;
  }
}
