import { neon } from "@neondatabase/serverless";
import {
  createAutomationRepost,
  getAutomationBlueskyActor,
} from "@/lib/bluesky-repost-automation";

const PUBLIC_API = "https://public.api.bsky.app/xrpc";
const TIME_ZONE = "America/Denver";
const DEFAULT_HOUR = 8;
const DROP_SITE_HANDLE = "dropsitenews.com";
const DROP_SITE_DID = "did:plc:avtgggryiqtjlg5wwsufccua";

type FeedItem = {
  reason?: unknown;
  post: {
    uri: string;
    cid: string;
    author: { did: string; handle: string; displayName?: string };
    record: { text?: string; createdAt?: string; reply?: unknown };
  };
};

function db() {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) throw new Error("DATABASE_URL is not configured.");
  return neon(url);
}

type Sql = ReturnType<typeof db>;

function localParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return {
    date: `${value("year")}-${value("month")}-${value("day")}`,
    hour: Number(value("hour")),
  };
}

function notificationHour() {
  const value = Number(process.env.DAILY_BOOST_NOTIFICATION_HOUR ?? DEFAULT_HOUR);
  return Number.isInteger(value) && value >= 0 && value <= 23 ? value : DEFAULT_HOUR;
}

async function ensureSchema(sql: Sql = db()) {
  await sql`
    create table if not exists bluesky_dropsite_daily_reposts (
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
  return sql;
}

async function latestOriginalPost() {
  const params = new URLSearchParams({
    actor: DROP_SITE_DID,
    limit: "20",
    filter: "posts_no_replies",
    includePins: "false",
  });
  const response = await fetch(
    `${PUBLIC_API}/app.bsky.feed.getAuthorFeed?${params.toString()}`,
    { headers: { Accept: "application/json" }, cache: "no-store" },
  );
  if (!response.ok) {
    throw new Error(`Drop Site Bluesky feed returned ${response.status}.`);
  }
  const payload = (await response.json()) as { feed?: FeedItem[] };
  const candidates = (payload.feed ?? [])
    .filter((item) => {
      const createdAt = new Date(item.post.record.createdAt ?? "").getTime();
      return (
        item.post.author.did === DROP_SITE_DID &&
        !item.reason &&
        !item.post.record.reply &&
        Number.isFinite(createdAt)
      );
    })
    .sort(
      (a, b) =>
        new Date(b.post.record.createdAt ?? "").getTime() -
        new Date(a.post.record.createdAt ?? "").getTime(),
    );
  return candidates[0]?.post ?? null;
}

export async function runDailyDropSiteRepost(
  options: { force?: boolean } = {},
) {
  const local = localParts();
  if (!options.force && local.hour !== notificationHour()) {
    return { ok: true, skipped: true, message: "Outside Drop Site repost hour." };
  }

  const automation = await getAutomationBlueskyActor();
  if (!automation.configured) {
    return {
      ok: false,
      skipped: true,
      message: "Bluesky server automation is not configured.",
    };
  }

  const post = await latestOriginalPost();
  if (!post) {
    return { ok: false, skipped: true, message: "No Drop Site post was found." };
  }

  const sql = await ensureSchema();
  const existing = await sql`
    select status, post_uri, repost_uri
    from bluesky_dropsite_daily_reposts
    where local_date=${local.date}::date
  `;
  if (existing[0]?.status === "posted") {
    return {
      ok: true,
      skipped: true,
      message: "Drop Site was already reposted today.",
      postUri: String(existing[0].post_uri),
      repostUri: existing[0].repost_uri ? String(existing[0].repost_uri) : null,
    };
  }
  if (
    existing[0]?.status === "no-new-post" &&
    String(existing[0].post_uri) === post.uri
  ) {
    return {
      ok: true,
      skipped: true,
      message: "Drop Site has not published a newer post yet.",
      postUri: String(existing[0].post_uri),
    };
  }
  if (existing[0]?.status === "posting") {
    return { ok: true, skipped: true, message: "Drop Site repost is already in progress." };
  }

  const prior = await sql`
    select local_date::text
    from bluesky_dropsite_daily_reposts
    where post_uri=${post.uri} and status='posted'
    order by local_date desc
    limit 1
  `;
  if (prior[0]) {
    await sql`
      insert into bluesky_dropsite_daily_reposts(
        local_date,source_did,source_handle,post_uri,post_cid,post_created_at,status,last_error
      ) values(
        ${local.date}::date,${DROP_SITE_DID},${DROP_SITE_HANDLE},${post.uri},${post.cid},
        ${post.record.createdAt ?? null}::timestamptz,'no-new-post',null
      )
      on conflict(local_date) do update set
        source_did=excluded.source_did,
        source_handle=excluded.source_handle,
        post_uri=excluded.post_uri,
        post_cid=excluded.post_cid,
        post_created_at=excluded.post_created_at,
        status='no-new-post',
        last_error=null,
        updated_at=now()
    `;
    return {
      ok: true,
      skipped: true,
      message: "Drop Site has not published a newer post since the last repost.",
      postUri: post.uri,
    };
  }

  await sql`
    insert into bluesky_dropsite_daily_reposts(
      local_date,source_did,source_handle,post_uri,post_cid,post_created_at,status,last_error
    ) values(
      ${local.date}::date,${DROP_SITE_DID},${DROP_SITE_HANDLE},${post.uri},${post.cid},
      ${post.record.createdAt ?? null}::timestamptz,'posting',null
    )
    on conflict(local_date) do update set
      source_did=excluded.source_did,
      source_handle=excluded.source_handle,
      post_uri=excluded.post_uri,
      post_cid=excluded.post_cid,
      post_created_at=excluded.post_created_at,
      status='posting',
      last_error=null,
      updated_at=now()
  `;

  try {
    const repost = await createAutomationRepost({ uri: post.uri, cid: post.cid });
    await sql`
      update bluesky_dropsite_daily_reposts
      set status='posted',repost_uri=${repost.uri},repost_cid=${repost.cid},last_error=null,updated_at=now()
      where local_date=${local.date}::date
    `;
    return {
      ok: true,
      skipped: false,
      source: `@${DROP_SITE_HANDLE}`,
      postUri: post.uri,
      repostUri: repost.uri,
      postCreatedAt: post.record.createdAt ?? null,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 900) : "Drop Site repost failed.";
    await sql`
      update bluesky_dropsite_daily_reposts
      set status='failed',last_error=${message},updated_at=now()
      where local_date=${local.date}::date
    `;
    return { ok: false, skipped: false, message };
  }
}
