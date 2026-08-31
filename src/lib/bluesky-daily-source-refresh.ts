import { neon } from "@neondatabase/serverless";
import type {
  DailySourceRepostConfig,
  DailySourceRepostOptions,
} from "@/lib/bluesky-daily-source-repost";

const PUBLIC_API = "https://public.api.bsky.app/xrpc";
const TIME_ZONE = "America/Denver";
const FEED_PAGE_LIMIT = 100;
const FEED_MAX_PAGES = 5;
const REFRESHABLE_STATUSES = new Set(["no-new-post", "failed", "missing"]);

type Sql = ReturnType<typeof db>;

type FeedItem = {
  reason?: unknown;
  post: {
    uri: string;
    cid: string;
    author: { did: string };
    record: { createdAt?: string; reply?: unknown };
  };
};

type AuthorFeedResponse = {
  feed?: FeedItem[];
  cursor?: string;
};

function db() {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) throw new Error("DATABASE_URL is not configured.");
  return neon(url);
}

function validateConfig(config: DailySourceRepostConfig) {
  if (!/^[a-z][a-z0-9_]*$/.test(config.tableName)) {
    throw new Error("Invalid daily repost table name.");
  }
  if (!/^[A-Z][A-Z0-9_]*$/.test(config.envPrefix)) {
    throw new Error("Invalid daily repost environment prefix.");
  }
}

function table(sql: Sql, config: DailySourceRepostConfig) {
  return sql.unsafe(config.tableName);
}

function localParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return {
    date: `${value("year")}-${value("month")}-${value("day")}`,
    hour: Number(value("hour")),
    minute: Number(value("minute")),
  };
}

function validHour(value: unknown, fallback: number) {
  const hour = Number(value);
  return Number.isInteger(hour) && hour >= 0 && hour <= 23 ? hour : fallback;
}

function isDue(config: DailySourceRepostConfig, local: ReturnType<typeof localParts>) {
  const hour = validHour(
    process.env[`${config.envPrefix}_REPOST_HOUR`] ??
      process.env.DAILY_BOOST_NOTIFICATION_HOUR,
    config.defaultHour,
  );
  const rawMinute = Number(
    process.env[`${config.envPrefix}_REPOST_MINUTE`] ?? config.defaultMinute,
  );
  const minute =
    Number.isInteger(rawMinute) && rawMinute >= 0 && rawMinute <= 59
      ? rawMinute
      : config.defaultMinute;
  if (local.hour < hour || (local.hour === hour && local.minute < minute)) {
    return false;
  }
  if (config.defaultCutoffHour !== undefined) {
    const cutoff = Math.max(
      hour + 1,
      validHour(
        process.env[`${config.envPrefix}_REPOST_CUTOFF_HOUR`],
        config.defaultCutoffHour,
      ),
    );
    if (local.hour >= cutoff) return false;
  }
  return true;
}

async function ensureSchema(sql: Sql, config: DailySourceRepostConfig) {
  const t = table(sql, config);
  await sql`
    create table if not exists ${t} (
      local_date date primary key,
      source_did text not null,
      source_handle text not null,
      post_uri text not null,
      post_cid text not null,
      post_created_at timestamptz,
      status text not null,
      repost_uri text,
      repost_cid text,
      last_error text,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )
  `;
  await sql`
    alter table ${t}
      add column if not exists actor_did text,
      add column if not exists actor_handle text,
      add column if not exists public_visible boolean,
      add column if not exists last_checked_at timestamptz,
      add column if not exists repository_verified_at timestamptz,
      add column if not exists public_verified_at timestamptz,
      add column if not exists verification_attempts integer not null default 0,
      add column if not exists repair_count integer not null default 0
  `;
}

async function latestEligibleOriginal(config: DailySourceRepostConfig) {
  let cursor: string | undefined;
  for (let page = 0; page < FEED_MAX_PAGES; page += 1) {
    const params = new URLSearchParams({
      actor: config.sourceDid,
      limit: String(FEED_PAGE_LIMIT),
      filter: "posts_no_replies",
      includePins: "false",
    });
    if (cursor) params.set("cursor", cursor);
    const response = await fetch(
      `${PUBLIC_API}/app.bsky.feed.getAuthorFeed?${params.toString()}`,
      { headers: { Accept: "application/json" }, cache: "no-store" },
    );
    if (!response.ok) {
      throw new Error(`${config.displayName} Bluesky feed returned ${response.status}.`);
    }
    const payload = (await response.json()) as AuthorFeedResponse;
    const candidate = (payload.feed ?? [])
      .filter((item) => {
        const createdAt = new Date(item.post.record.createdAt ?? "").getTime();
        return (
          item.post.author.did === config.sourceDid &&
          !item.reason &&
          !item.post.record.reply &&
          Number.isFinite(createdAt)
        );
      })
      .sort(
        (a, b) =>
          new Date(b.post.record.createdAt ?? "").getTime() -
          new Date(a.post.record.createdAt ?? "").getTime(),
      )[0]?.post;
    if (candidate) return candidate;
    if (!payload.cursor || payload.cursor === cursor) break;
    cursor = payload.cursor;
  }
  return null;
}

export async function refreshDailySourceCandidate(
  config: DailySourceRepostConfig,
  options: DailySourceRepostOptions = {},
) {
  validateConfig(config);
  const local = localParts();
  if (!options.force && !isDue(config, local)) return;

  const sql = db();
  await ensureSchema(sql, config);
  const t = table(sql, config);
  const rows = await sql`
    select status,post_uri,post_cid
    from ${t}
    where local_date=${local.date}::date
  `;
  const existing = rows[0];
  const status = existing ? String(existing.status ?? "") : null;

  // A completed or actively publishing day never needs another source-feed scan.
  // Only an empty day or a retryable/no-new state can accept a newer candidate.
  if (existing && !REFRESHABLE_STATUSES.has(status ?? "")) return;

  const latest = await latestEligibleOriginal(config);
  if (!latest) return;

  if (!existing) {
    await sql`
      insert into ${t}(
        local_date,source_did,source_handle,post_uri,post_cid,post_created_at,
        status,last_error
      ) values(
        ${local.date}::date,${config.sourceDid},${config.sourceHandle},
        ${latest.uri},${latest.cid},${latest.record.createdAt ?? null}::timestamptz,
        'failed','Prepared the newest eligible source post from the paginated source feed.'
      )
      on conflict(local_date) do nothing
    `;
    return;
  }

  if (
    String(existing.post_uri ?? "") === latest.uri &&
    String(existing.post_cid ?? "") === latest.cid
  ) {
    return;
  }

  await sql`
    update ${t}
    set source_did=${config.sourceDid},source_handle=${config.sourceHandle},
      post_uri=${latest.uri},post_cid=${latest.cid},
      post_created_at=${latest.record.createdAt ?? null}::timestamptz,
      status='failed',repost_uri=null,repost_cid=null,
      public_visible=null,last_checked_at=null,repository_verified_at=null,
      public_verified_at=null,last_error='A newer eligible source post was detected after the earlier check.',
      updated_at=now()
    where local_date=${local.date}::date
      and status in ('no-new-post','failed','missing')
  `;
}
