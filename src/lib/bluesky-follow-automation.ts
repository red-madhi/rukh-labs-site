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
const BSKY_ENTRYWAY = "https://bsky.social/xrpc";
const CHAT_PROXY = "did:web:api.bsky.chat#bsky_chat";
const SYNC_THROTTLE_MINUTES = 4;
const MAX_FOLLOWER_PAGES_PER_SYNC = 20;
const MAX_BASELINE_PAGES = 200;
const RETRY_LIMIT = 6;

type Sql = ReturnType<typeof neon>;

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

type PublicProfile = PublicFollower;

type BskySession = {
  accessJwt: string;
  did: string;
  handle: string;
};

type ChatAvailability = {
  canChat: boolean;
  convo?: { id?: string };
};

type ConvoResponse = {
  convo: { id: string };
};

type CreateRecordResponse = {
  uri: string;
  cid: string;
};

type StrongRef = {
  uri: string;
  cid: string;
};

type AutomationSettingsRow = {
  actor_handle: string;
  app_password_enc: string | null;
  message: string;
  enabled: boolean;
  baseline_seeded: boolean;
  last_sync_at: string | null;
  last_sync_error: string | null;
  last_weekly_post_at: string | null;
};

type AutomationFollowerRow = {
  follower_did: string;
  follower_handle: string;
  profile_name: string | null;
  first_seen_at: string;
  source_tag: string | null;
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
  week_start: string;
  status: string;
  root_uri: string | null;
  root_cid: string | null;
  last_uri: string | null;
  last_cid: string | null;
};

type AtprotoErrorBody = {
  error?: string;
  message?: string;
};

type WeeklyMention = {
  did: string;
  handle: string;
};

type WeeklyChunk = {
  text: string;
  mentions: WeeklyMention[];
};

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

function getDatabaseUrl() {
  const value = process.env.DATABASE_URL?.trim();
  if (!value) throw new Error("DATABASE_URL is not configured.");
  return value;
}

function getSql() {
  return neon(getDatabaseUrl());
}

function getEncryptionSecret() {
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
    .update(`rukh-bluesky-follow-automation:${getEncryptionSecret()}`)
    .digest();
}

function encryptSecret(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return ["v1", iv, tag, encrypted]
    .map((part) => (typeof part === "string" ? part : part.toString("base64url")))
    .join(".");
}

function decryptSecret(value: string) {
  const [version, ivEncoded, tagEncoded, encryptedEncoded] = value.split(".");
  if (version !== "v1" || !ivEncoded || !tagEncoded || !encryptedEncoded) {
    throw new Error("The saved Bluesky credential is not readable.");
  }
  const decipher = createDecipheriv(
    "aes-256-gcm",
    encryptionKey(),
    Buffer.from(ivEncoded, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(tagEncoded, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedEncoded, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

async function parseAtprotoError(response: Response) {
  let body: AtprotoErrorBody = {};
  try {
    body = (await response.json()) as AtprotoErrorBody;
  } catch {
    // Upstream errors are not always JSON.
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
  if (!response.ok) throw await parseAtprotoError(response);
  return (await response.json()) as T;
}

async function createSession(identifier: string, password: string) {
  return fetchJson<BskySession>(`${BSKY_ENTRYWAY}/com.atproto.server.createSession`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ identifier, password }),
  });
}

async function chatRequest<T>(
  session: BskySession,
  method: string,
  options?: { params?: Record<string, string>; body?: unknown },
) {
  const url = new URL(`${BSKY_ENTRYWAY}/${method}`);
  for (const [key, value] of Object.entries(options?.params ?? {})) {
    url.searchParams.append(key, value);
  }
  return fetchJson<T>(url, {
    method: options?.body === undefined ? "GET" : "POST",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${session.accessJwt}`,
      "atproto-proxy": CHAT_PROXY,
      ...(options?.body === undefined
        ? {}
        : { "Content-Type": "application/json" }),
    },
    body: options?.body === undefined ? undefined : JSON.stringify(options.body),
  });
}

async function verifyChatAccess(session: BskySession) {
  await chatRequest(session, "chat.bsky.convo.listConvos", {
    params: { limit: "1" },
  });
}

async function fetchFollowerPage(
  actor: string,
  cursor?: string,
): Promise<FollowerPage> {
  const url = new URL(`${PUBLIC_API}/app.bsky.graph.getFollowers`);
  url.searchParams.set("actor", actor);
  url.searchParams.set("limit", "100");
  url.searchParams.set("sort", "latest");
  if (cursor) url.searchParams.set("cursor", cursor);
  return fetchJson<FollowerPage>(url);
}

async function fetchPublicProfile(actor: string) {
  const url = new URL(`${PUBLIC_API}/app.bsky.actor.getProfile`);
  url.searchParams.set("actor", actor);
  return fetchJson<PublicProfile>(url);
}

export async function ensureFollowAutomationSchema(sql: Sql = getSql()) {
  await sql`
    create table if not exists follower_events (
      id bigserial primary key,
      follower_did text,
      follower_handle text,
      profile_name text,
      avatar_url text,
      source_tag text,
      followed_at timestamptz not null default now()
    )
  `;

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

async function getSettings(sql: Sql): Promise<AutomationSettingsRow> {
  const rows = (await sql`
    select
      actor_handle,
      app_password_enc,
      message,
      enabled,
      baseline_seeded,
      last_sync_at,
      last_sync_error,
      last_weekly_post_at
    from bluesky_follow_automation_settings
    where id = 1
  `) as AutomationSettingsRow[];
  const row = rows[0];
  if (!row) throw new Error("Bluesky follower automation settings are missing.");
  return row;
}

export async function getFollowAutomationPublicState(): Promise<FollowAutomationPublicState> {
  const sql = await ensureFollowAutomationSchema();
  const settings = await getSettings(sql);
  const statsRows = (await sql`
    select
      count(*) filter (where dm_status = 'baseline')::int as baseline,
      count(*) filter (where dm_status = 'sent')::int as sent,
      count(*) filter (where weekly_eligible = true and thanked_at is null)::int as queued,
      count(*) filter (where dm_status in ('pending', 'retry', 'processing'))::int as retrying,
      count(*) filter (where dm_status = 'failed')::int as failed
    from bluesky_follow_automation
  `) as Array<{
    baseline: number;
    sent: number;
    queued: number;
    retrying: number;
    failed: number;
  }>;
  const stats = statsRows[0] ?? {
    baseline: 0,
    sent: 0,
    queued: 0,
    retrying: 0,
    failed: 0,
  };

  return {
    configured: true,
    actorHandle: settings.actor_handle,
    message: settings.message,
    enabled: settings.enabled,
    appPasswordSaved: Boolean(settings.app_password_enc),
    baselineSeeded: settings.baseline_seeded,
    lastSyncAt: settings.last_sync_at,
    lastSyncError: settings.last_sync_error,
    lastWeeklyPostAt: settings.last_weekly_post_at,
    stats: {
      baseline: Number(stats.baseline || 0),
      sent: Number(stats.sent || 0),
      queuedForMonday: Number(stats.queued || 0),
      retrying: Number(stats.retrying || 0),
      failed: Number(stats.failed || 0),
    },
  };
}

async function validateCredential(actorHandle: string, appPassword: string) {
  const session = await createSession(actorHandle, appPassword);
  if (normalizeHandle(session.handle) !== normalizeHandle(actorHandle)) {
    throw new Error(
      `That app password authenticated @${session.handle}, not @${actorHandle}.`,
    );
  }
  try {
    await verifyChatAccess(session);
  } catch (error) {
    if (error instanceof AtprotoRequestError && [400, 401, 403].includes(error.status ?? 0)) {
      throw new Error(
        "That Bluesky app password does not have chat/DM access. Create one with direct-message access enabled and try again.",
      );
    }
    throw error;
  }
  return session;
}

export async function saveFollowAutomationSettings(input: {
  actorHandle: string;
  message: string;
  enabled: boolean;
  appPassword?: string;
}) {
  const sql = await ensureFollowAutomationSchema();
  const current = await getSettings(sql);
  const actorHandle = normalizeHandle(input.actorHandle || DEFAULT_AUTOMATION_ACTOR);
  const message = input.message.trim();
  if (!actorHandle) throw new Error("A Bluesky handle is required.");
  if (!message) throw new Error("The welcome DM cannot be empty.");

  const actorChanged = normalizeHandle(current.actor_handle) !== actorHandle;
  const suppliedPassword = input.appPassword?.trim() || "";
  let encryptedPassword = current.app_password_enc;

  if (suppliedPassword) {
    await validateCredential(actorHandle, suppliedPassword);
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
      set
        dm_status = 'retry',
        next_retry_at = now(),
        last_error = null
      where dm_status = 'failed' and thanked_at is null
    `;
  }

  await sql`
    update bluesky_follow_automation_settings
    set
      actor_handle = ${actorHandle},
      app_password_enc = ${encryptedPassword},
      message = ${message},
      enabled = ${input.enabled},
      baseline_seeded = case when ${actorChanged} then false else baseline_seeded end,
      last_sync_error = null,
      updated_at = now()
    where id = 1
  `;

  if (input.enabled) {
    const updated = await getSettings(sql);
    if (!updated.baseline_seeded) await seedFollowerBaseline(sql, updated);
  }

  return getFollowAutomationPublicState();
}

async function insertBaselineBatch(sql: Sql, followers: PublicFollower[]) {
  if (!followers.length) return;
  const payload = JSON.stringify(
    followers.map((follower) => ({
      did: follower.did,
      handle: normalizeHandle(follower.handle),
      display_name: follower.displayName?.trim() || null,
    })),
  );
  await sql`
    insert into bluesky_follow_automation (
      follower_did,
      follower_handle,
      profile_name,
      source_tag,
      dm_status,
      weekly_eligible
    )
    select
      item.did,
      item.handle,
      item.display_name,
      'baseline',
      'baseline',
      false
    from jsonb_to_recordset(${payload}::jsonb)
      as item(did text, handle text, display_name text)
    on conflict (follower_did) do nothing
  `;
}

async function seedFollowerBaseline(
  sql: Sql,
  settings: AutomationSettingsRow,
): Promise<number> {
  let cursor: string | undefined;
  let seeded = 0;

  for (let pageNumber = 0; pageNumber < MAX_BASELINE_PAGES; pageNumber += 1) {
    const page = await fetchFollowerPage(settings.actor_handle, cursor);
    await insertBaselineBatch(sql, page.followers);
    seeded += page.followers.length;
    cursor = page.cursor;
    if (!cursor || !page.followers.length) {
      await sql`
        update bluesky_follow_automation_settings
        set baseline_seeded = true, last_sync_error = null, updated_at = now()
        where id = 1
      `;
      return seeded;
    }
  }

  throw new Error(
    "Baseline follower scan exceeded its safety limit. Auto DM was not activated for new followers yet.",
  );
}

async function knownFollowerDids(sql: Sql, dids: string[]) {
  if (!dids.length) return new Set<string>();
  const payload = JSON.stringify(dids);
  const rows = (await sql`
    select follower_did
    from bluesky_follow_automation
    where follower_did in (
      select value from jsonb_array_elements_text(${payload}::jsonb)
    )
  `) as Array<{ follower_did: string }>;
  return new Set(rows.map((row) => row.follower_did));
}

async function registerFollower(
  sql: Sql,
  follower: PublicFollower,
  sourceTag: string,
) {
  const rows = (await sql`
    insert into bluesky_follow_automation (
      follower_did,
      follower_handle,
      profile_name,
      source_tag,
      dm_status
    )
    values (
      ${follower.did},
      ${normalizeHandle(follower.handle)},
      ${follower.displayName?.trim() || null},
      ${sourceTag},
      'pending'
    )
    on conflict (follower_did) do nothing
    returning *
  `) as AutomationFollowerRow[];
  return rows[0] ?? null;
}

async function claimFollower(sql: Sql, did: string) {
  const rows = (await sql`
    update bluesky_follow_automation
    set
      dm_status = 'processing',
      dm_attempts = dm_attempts + 1,
      last_dm_attempt_at = now(),
      next_retry_at = null
    where follower_did = ${did}
      and (
        dm_status = 'pending'
        or (dm_status = 'retry' and (next_retry_at is null or next_retry_at <= now()))
        or (dm_status = 'processing' and last_dm_attempt_at < now() - interval '15 minutes')
      )
    returning *
  `) as AutomationFollowerRow[];
  return rows[0] ?? null;
}

function isRetryableAtprotoError(error: unknown) {
  if (!(error instanceof AtprotoRequestError)) return false;
  return error.status === undefined || error.status === 429 || error.status >= 500;
}

function retryDelayMinutes(attempt: number) {
  return Math.min(360, 5 * 2 ** Math.max(0, attempt - 1));
}

async function processClaimedFollower(
  sql: Sql,
  claimed: AutomationFollowerRow,
  settings: AutomationSettingsRow,
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
        set
          dm_status = 'recipient_unavailable',
          initial_can_chat = case
            when ${firstAvailabilityAttempt} then false
            else initial_can_chat
          end,
          weekly_eligible = case
            when ${firstAvailabilityAttempt} then true
            else weekly_eligible
          end,
          next_retry_at = null,
          last_error = null
        where follower_did = ${claimed.follower_did}
      `;
      return { status: "queued" as const };
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
      const response = await chatRequest<ConvoResponse>(
        session,
        "chat.bsky.convo.getConvoForMembers",
        { params: { members: claimed.follower_did } },
      );
      convoId = response.convo.id;
    }

    await chatRequest(session, "chat.bsky.convo.sendMessage", {
      body: {
        convoId,
        message: { text: settings.message },
      },
    });

    await sql`
      update bluesky_follow_automation
      set
        dm_status = 'sent',
        weekly_eligible = false,
        next_retry_at = null,
        last_error = null
      where follower_did = ${claimed.follower_did}
    `;
    return { status: "sent" as const };
  } catch (error) {
    const retryable = isRetryableAtprotoError(error) && claimed.dm_attempts < RETRY_LIMIT;
    const status = retryable ? "retry" : "failed";
    const nextRetryMinutes = retryDelayMinutes(claimed.dm_attempts);
    const message = error instanceof Error ? error.message.slice(0, 900) : "Unknown Bluesky error";

    if (retryable) {
      await sql`
        update bluesky_follow_automation
        set
          dm_status = 'retry',
          next_retry_at = now() + (${nextRetryMinutes} * interval '1 minute'),
          weekly_eligible = false,
          last_error = ${message}
        where follower_did = ${claimed.follower_did}
      `;
    } else {
      await sql`
        update bluesky_follow_automation
        set
          dm_status = 'failed',
          next_retry_at = null,
          weekly_eligible = false,
          last_error = ${message}
        where follower_did = ${claimed.follower_did}
      `;
    }
    return { status: status as "retry" | "failed", error: message };
  }
}

async function loadSession(settings: AutomationSettingsRow) {
  if (!settings.app_password_enc) throw new Error("No Bluesky app password is saved.");
  const password = decryptSecret(settings.app_password_enc);
  return createSession(settings.actor_handle, password);
}

async function processFollowerDids(
  sql: Sql,
  settings: AutomationSettingsRow,
  dids: string[],
) {
  if (!dids.length) return { sent: 0, queued: 0, retried: 0 };
  const session = await loadSession(settings);
  let sent = 0;
  let queued = 0;
  let retried = 0;

  for (const did of dids) {
    const claimed = await claimFollower(sql, did);
    if (!claimed) continue;
    const result = await processClaimedFollower(sql, claimed, settings, session);
    if (result.status === "sent") sent += 1;
    if (result.status === "queued") queued += 1;
    if (result.status === "retry") retried += 1;
  }

  return { sent, queued, retried };
}

async function discoverNewFollowers(sql: Sql, actor: string) {
  let cursor: string | undefined;
  const discovered: PublicFollower[] = [];

  for (let pageNumber = 0; pageNumber < MAX_FOLLOWER_PAGES_PER_SYNC; pageNumber += 1) {
    const page = await fetchFollowerPage(actor, cursor);
    if (!page.followers.length) break;
    const known = await knownFollowerDids(
      sql,
      page.followers.map((follower) => follower.did),
    );
    const unseen = page.followers.filter((follower) => !known.has(follower.did));
    discovered.push(...unseen);

    if (known.size > 0 || !page.cursor) break;
    cursor = page.cursor;
  }

  return discovered.reverse();
}

async function dueRetryDids(sql: Sql) {
  const rows = (await sql`
    select follower_did
    from bluesky_follow_automation
    where
      (dm_status = 'retry' and (next_retry_at is null or next_retry_at <= now()))
      or (dm_status = 'processing' and last_dm_attempt_at < now() - interval '15 minutes')
    order by coalesce(next_retry_at, last_dm_attempt_at, first_seen_at) asc
    limit 20
  `) as Array<{ follower_did: string }>;
  return rows.map((row) => row.follower_did);
}

async function claimSyncWindow(sql: Sql, force: boolean) {
  if (force) {
    await sql`
      update bluesky_follow_automation_settings
      set last_sync_at = now(), updated_at = now()
      where id = 1
    `;
    return true;
  }
  const rows = (await sql`
    update bluesky_follow_automation_settings
    set last_sync_at = now(), updated_at = now()
    where id = 1
      and (
        last_sync_at is null
        or last_sync_at < now() - (${SYNC_THROTTLE_MINUTES} * interval '1 minute')
      )
    returning id
  `) as Array<{ id: number }>;
  return rows.length > 0;
}

export async function syncFollowAutomation(options: { force?: boolean } = {}): Promise<FollowAutomationSyncResult> {
  const sql = await ensureFollowAutomationSchema();
  let settings = await getSettings(sql);
  if (!settings.enabled) {
    return { ok: true, skipped: true, message: "Auto DM is disabled." };
  }
  if (!settings.app_password_enc) {
    return { ok: false, skipped: true, message: "No Bluesky app password is saved." };
  }

  const claimed = await claimSyncWindow(sql, Boolean(options.force));
  if (!claimed) {
    return { ok: true, skipped: true, message: "A recent sync already ran." };
  }

  try {
    let seeded = 0;
    if (!settings.baseline_seeded) {
      seeded = await seedFollowerBaseline(sql, settings);
      settings = await getSettings(sql);
    }

    const discovered = await discoverNewFollowers(sql, settings.actor_handle);
    const newDids: string[] = [];
    for (const follower of discovered) {
      const inserted = await registerFollower(sql, follower, "follower-sync");
      if (inserted) newDids.push(inserted.follower_did);
    }

    const retries = await dueRetryDids(sql);
    const allDids = Array.from(new Set([...newDids, ...retries]));
    const processed = await processFollowerDids(sql, settings, allDids);

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
    const message = error instanceof Error ? error.message.slice(0, 900) : "Follower sync failed.";
    await sql`
      update bluesky_follow_automation_settings
      set last_sync_error = ${message}, updated_at = now()
      where id = 1
    `;
    throw error;
  }
}

export async function storeFollowerWebhookEvent(input: {
  followerDid?: string | null;
  followerHandle?: string | null;
  profileName?: string | null;
  avatarUrl?: string | null;
  sourceTag?: string | null;
}) {
  const sql = await ensureFollowAutomationSchema();
  let follower: PublicFollower | null = null;
  if (input.followerDid && input.followerHandle) {
    follower = {
      did: input.followerDid.trim(),
      handle: normalizeHandle(input.followerHandle),
      displayName: input.profileName?.trim() || undefined,
      avatar: input.avatarUrl?.trim() || undefined,
    };
  } else {
    const actor = input.followerDid?.trim() || normalizeHandle(input.followerHandle || "");
    if (!actor) throw new Error("follower_did or follower_handle is required.");
    follower = await fetchPublicProfile(actor);
  }

  await sql`
    insert into follower_events (
      follower_did,
      follower_handle,
      profile_name,
      avatar_url,
      source_tag,
      followed_at
    ) values (
      ${follower.did},
      ${normalizeHandle(follower.handle)},
      ${input.profileName?.trim() || follower.displayName?.trim() || null},
      ${input.avatarUrl?.trim() || follower.avatar?.trim() || null},
      ${input.sourceTag?.trim() || "webhook"},
      now()
    )
  `;

  const settings = await getSettings(sql);
  if (!settings.enabled || !settings.baseline_seeded || !settings.app_password_enc) {
    return { stored: true, automated: false };
  }

  const inserted = await registerFollower(
    sql,
    follower,
    input.sourceTag?.trim() || "webhook",
  );
  if (!inserted) return { stored: true, automated: false, duplicate: true };
  const processed = await processFollowerDids(sql, settings, [inserted.follower_did]);
  return { stored: true, automated: true, ...processed };
}

function denverDateParts(date = new Date()) {
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

function weekStartKey(date = new Date()) {
  const parts = denverDateParts(date);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function graphemeCount(value: string) {
  return Array.from(
    new Intl.Segmenter("en", { granularity: "grapheme" }).segment(value),
  ).length;
}

function buildWeeklyChunks(mentions: WeeklyMention[], continuingThread: boolean) {
  const chunks: WeeklyChunk[] = [];
  let header = continuingThread ? "And y'all too..." : "Thanks for the #follow, y'all.";
  let text = header;
  let current: WeeklyMention[] = [];

  for (const mention of mentions) {
    const line = `@${mention.handle}`;
    const candidate = `${text}\n${line}`;
    if (current.length > 0 && graphemeCount(candidate) > 300) {
      chunks.push({ text, mentions: current });
      header = "And y'all too...";
      text = `${header}\n${line}`;
      current = [mention];
      continue;
    }
    if (graphemeCount(candidate) > 300) {
      throw new Error(`@${mention.handle} is too long to fit in a Bluesky thank-you post.`);
    }
    text = candidate;
    current.push(mention);
  }

  if (current.length) chunks.push({ text, mentions: current });
  return chunks;
}

function byteRange(text: string, needle: string, fromIndex = 0) {
  const characterStart = text.indexOf(needle, fromIndex);
  if (characterStart < 0) return null;
  const byteStart = Buffer.byteLength(text.slice(0, characterStart), "utf8");
  const byteEnd = byteStart + Buffer.byteLength(needle, "utf8");
  return { characterStart, byteStart, byteEnd };
}

function buildPostFacets(chunk: WeeklyChunk) {
  const facets: Array<Record<string, unknown>> = [];
  const tag = byteRange(chunk.text, "#follow");
  if (tag) {
    facets.push({
      index: { byteStart: tag.byteStart, byteEnd: tag.byteEnd },
      features: [{ $type: "app.bsky.richtext.facet#tag", tag: "follow" }],
    });
  }

  let searchFrom = 0;
  for (const mention of chunk.mentions) {
    const token = `@${mention.handle}`;
    const range = byteRange(chunk.text, token, searchFrom);
    if (!range) continue;
    facets.push({
      index: { byteStart: range.byteStart, byteEnd: range.byteEnd },
      features: [
        { $type: "app.bsky.richtext.facet#mention", did: mention.did },
      ],
    });
    searchFrom = range.characterStart + token.length;
  }

  return facets;
}

async function createPost(
  session: BskySession,
  chunk: WeeklyChunk,
  reply?: { root: StrongRef; parent: StrongRef },
) {
  const record: Record<string, unknown> = {
    $type: "app.bsky.feed.post",
    text: chunk.text,
    facets: buildPostFacets(chunk),
    createdAt: new Date().toISOString(),
  };
  if (reply) record.reply = reply;

  return fetchJson<CreateRecordResponse>(`${BSKY_ENTRYWAY}/com.atproto.repo.createRecord`, {
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
  });
}

async function getWeeklyRun(sql: Sql, weekStart: string) {
  const rows = (await sql`
    select week_start::text, status, root_uri, root_cid, last_uri, last_cid
    from bluesky_weekly_thanks_runs
    where week_start = ${weekStart}::date
  `) as WeeklyRunRow[];
  return rows[0] ?? null;
}

export async function runWeeklyThanks(options: { force?: boolean } = {}) {
  const sql = await ensureFollowAutomationSchema();
  const settings = await getSettings(sql);
  if (!settings.enabled || !settings.app_password_enc) {
    return { ok: true, skipped: true, message: "Auto DM is disabled or not configured." };
  }

  const local = denverDateParts();
  if (!options.force && (local.weekday !== "Mon" || local.hour !== 8)) {
    return { ok: true, skipped: true, message: "Not the Monday 8am Mountain window." };
  }

  const weekStart = weekStartKey();
  await sql`
    insert into bluesky_weekly_thanks_runs (week_start, status, started_at)
    values (${weekStart}::date, 'running', now())
    on conflict (week_start) do nothing
  `;
  let run = await getWeeklyRun(sql, weekStart);
  if (!run) throw new Error("Could not create the weekly Bluesky run record.");
  if (run.status === "complete") {
    return { ok: true, skipped: true, message: "This week's thank-you thread already ran." };
  }

  await sql`
    update bluesky_weekly_thanks_runs
    set status = 'running', started_at = coalesce(started_at, now()), last_error = null
    where week_start = ${weekStart}::date
  `;

  const queue = (await sql`
    select follower_did as did, follower_handle as handle
    from bluesky_follow_automation
    where weekly_eligible = true and thanked_at is null
    order by first_seen_at asc, follower_handle asc
  `) as WeeklyMention[];

  if (!queue.length) {
    await sql`
      update bluesky_weekly_thanks_runs
      set status = 'complete', completed_at = now(), last_error = null
      where week_start = ${weekStart}::date
    `;
    return { ok: true, posted: 0, mentioned: 0 };
  }

  try {
    const session = await loadSession(settings);
    const continuingThread = Boolean(run.root_uri && run.root_cid);
    const chunks = buildWeeklyChunks(queue, continuingThread);
    let root: StrongRef | undefined =
      run.root_uri && run.root_cid
        ? { uri: run.root_uri, cid: run.root_cid }
        : undefined;
    let parent: StrongRef | undefined =
      run.last_uri && run.last_cid
        ? { uri: run.last_uri, cid: run.last_cid }
        : root;
    let posted = 0;
    let mentioned = 0;

    for (const chunk of chunks) {
      const response = await createPost(
        session,
        chunk,
        root && parent ? { root, parent } : undefined,
      );
      const created = { uri: response.uri, cid: response.cid };
      if (!root) root = created;
      parent = created;
      posted += 1;
      mentioned += chunk.mentions.length;

      const didPayload = JSON.stringify(chunk.mentions.map((mention) => mention.did));
      await sql`
        update bluesky_follow_automation
        set thanked_at = now()
        where follower_did in (
          select value from jsonb_array_elements_text(${didPayload}::jsonb)
        )
      `;
      await sql`
        update bluesky_weekly_thanks_runs
        set
          root_uri = ${root.uri},
          root_cid = ${root.cid},
          last_uri = ${parent.uri},
          last_cid = ${parent.cid},
          last_error = null
        where week_start = ${weekStart}::date
      `;
    }

    await sql`
      update bluesky_weekly_thanks_runs
      set status = 'complete', completed_at = now(), last_error = null
      where week_start = ${weekStart}::date
    `;
    await sql`
      update bluesky_follow_automation_settings
      set last_weekly_post_at = now(), updated_at = now()
      where id = 1
    `;
    return { ok: true, posted, mentioned, rootUri: root?.uri ?? null };
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 900) : "Weekly Bluesky post failed.";
    await sql`
      update bluesky_weekly_thanks_runs
      set status = 'failed', last_error = ${message}
      where week_start = ${weekStart}::date
    `;
    throw error;
  }
}
