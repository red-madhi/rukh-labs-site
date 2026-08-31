import { neon } from "@neondatabase/serverless";
import {
  createAutomationRepost,
  getAutomationBlueskyActor,
  inspectAutomationRepost,
  type AutomationRepostInspection,
} from "@/lib/bluesky-repost-automation";

const PUBLIC_API = "https://public.api.bsky.app/xrpc";
const TIME_ZONE = "America/Denver";
const DEFAULT_VERIFY_MINUTES = 30;
const POSTING_STALE_MINUTES = 10;

type Sql = ReturnType<typeof db>;

type FeedItem = {
  reason?: unknown;
  post: {
    uri: string;
    cid: string;
    author: { did: string; handle: string; displayName?: string };
    record: { text?: string; createdAt?: string; reply?: unknown };
  };
};

type StoredRow = {
  localDate: string;
  status: string;
  postUri: string;
  postCid: string;
  postCreatedAt: string | null;
  repostUri: string | null;
  publicVisible: boolean | null;
  lastCheckedAt: string | null;
  updatedAt: string | null;
};

export type DailySourceRepostConfig = {
  key: string;
  displayName: string;
  sourceHandle: string;
  sourceDid: string;
  tableName: string;
  envPrefix: string;
  defaultHour: number;
  defaultMinute: number;
  defaultCutoffHour?: number;
};

export type DailySourceRepostOptions = { force?: boolean };

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

function indexName(sql: Sql, config: DailySourceRepostConfig) {
  return sql.unsafe(`${config.tableName}_post_uri_idx`);
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

function scheduleState(config: DailySourceRepostConfig, local: ReturnType<typeof localParts>) {
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
    return "before" as const;
  }
  if (config.defaultCutoffHour !== undefined) {
    const cutoff = Math.max(
      hour + 1,
      validHour(
        process.env[`${config.envPrefix}_REPOST_CUTOFF_HOUR`],
        config.defaultCutoffHour,
      ),
    );
    if (local.hour >= cutoff) return "after" as const;
  }
  return "due" as const;
}

function verificationMinutes() {
  const value = Number(process.env.SOCIAL_REPOST_VERIFY_MINUTES ?? DEFAULT_VERIFY_MINUTES);
  return Number.isFinite(value) && value >= 5 && value <= 1_440
    ? value
    : DEFAULT_VERIFY_MINUTES;
}

function elapsedMinutes(value: string | null) {
  const timestamp = new Date(value ?? "").getTime();
  return Number.isFinite(timestamp)
    ? (Date.now() - timestamp) / 60_000
    : Number.POSITIVE_INFINITY;
}

function recentlyVerified(row: StoredRow) {
  return row.publicVisible === true && elapsedMinutes(row.lastCheckedAt) < verificationMinutes();
}

function freshPosting(row: StoredRow) {
  return row.status === "posting" && elapsedMinutes(row.updatedAt) < POSTING_STALE_MINUTES;
}

function storedRow(row: Record<string, unknown>): StoredRow {
  return {
    localDate: String(row.local_date ?? ""),
    status: String(row.status ?? ""),
    postUri: String(row.post_uri ?? ""),
    postCid: String(row.post_cid ?? ""),
    postCreatedAt: row.post_created_at ? String(row.post_created_at) : null,
    repostUri: row.repost_uri ? String(row.repost_uri) : null,
    publicVisible: typeof row.public_visible === "boolean" ? row.public_visible : null,
    lastCheckedAt: row.last_checked_at ? String(row.last_checked_at) : null,
    updatedAt: row.updated_at ? String(row.updated_at) : null,
  };
}

function inspectionStatus(inspection: AutomationRepostInspection) {
  if (!inspection.found) return "missing";
  return inspection.publicVisible === true ? "posted" : "posted_pending_index";
}

function inspectionError(config: DailySourceRepostConfig, inspection: AutomationRepostInspection) {
  if (!inspection.found) {
    return `The stored ${config.displayName} repost is missing from the configured Bluesky account repository.`;
  }
  if (inspection.visibilityError) return inspection.visibilityError;
  if (inspection.publicVisible !== true) {
    return "The repost exists in the Bluesky account repository but is not visible in the public Bluesky index yet.";
  }
  return null;
}

function verificationResult(
  inspection: AutomationRepostInspection,
  message: string,
  extra: Record<string, unknown> = {},
) {
  return {
    ok: inspection.found && inspection.publicVisible === true,
    skipped: true,
    message,
    actor: { handle: inspection.actorHandle, did: inspection.actorDid },
    repostUri: inspection.uri,
    verification: {
      repositoryVerified: inspection.repositoryVerified,
      publicVisible: inspection.publicVisible,
      visibilityError: inspection.visibilityError,
      recoveredRecord: inspection.recovered,
    },
    ...extra,
  };
}

async function ensureSchema(sql: Sql, config: DailySourceRepostConfig) {
  const t = table(sql, config);
  const idx = indexName(sql, config);
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
  await sql`create index if not exists ${idx} on ${t}(post_uri)`;
}

async function loadToday(sql: Sql, config: DailySourceRepostConfig, localDate: string) {
  const t = table(sql, config);
  const rows = await sql`
    select local_date::text,status,post_uri,post_cid,post_created_at,repost_uri,
      public_visible,last_checked_at,updated_at
    from ${t}
    where local_date=${localDate}::date
  `;
  return rows[0] ? storedRow(rows[0] as Record<string, unknown>) : null;
}

async function latestOriginalPost(config: DailySourceRepostConfig) {
  const params = new URLSearchParams({
    actor: config.sourceDid,
    limit: "20",
    filter: "posts_no_replies",
    includePins: "false",
  });
  const response = await fetch(
    `${PUBLIC_API}/app.bsky.feed.getAuthorFeed?${params.toString()}`,
    { headers: { Accept: "application/json" }, cache: "no-store" },
  );
  if (!response.ok) {
    throw new Error(`${config.displayName} Bluesky feed returned ${response.status}.`);
  }
  const payload = (await response.json()) as { feed?: FeedItem[] };
  return (
    (payload.feed ?? [])
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
      )[0]?.post ?? null
  );
}

async function saveInspection(
  sql: Sql,
  config: DailySourceRepostConfig,
  localDate: string,
  inspection: AutomationRepostInspection,
  statusOverride?: string,
) {
  const t = table(sql, config);
  const status = statusOverride ?? inspectionStatus(inspection);
  const lastError = inspectionError(config, inspection);
  await sql`
    update ${t}
    set status=${status},
      repost_uri=coalesce(${inspection.uri},repost_uri),
      repost_cid=coalesce(${inspection.cid},repost_cid),
      actor_did=${inspection.actorDid},actor_handle=${inspection.actorHandle},
      public_visible=${inspection.publicVisible},last_checked_at=now(),
      repository_verified_at=case when ${inspection.repositoryVerified} then now() else null end,
      public_verified_at=case when ${inspection.publicVisible === true} then now() else public_verified_at end,
      verification_attempts=verification_attempts+1,
      repair_count=repair_count+case when ${inspection.recovered} then 1 else 0 end,
      last_error=${lastError},updated_at=now()
    where local_date=${localDate}::date
  `;
}

async function markPriorMissing(
  sql: Sql,
  config: DailySourceRepostConfig,
  localDate: string | null,
  message: string,
) {
  if (!localDate) return;
  const t = table(sql, config);
  await sql`
    update ${t}
    set status='missing',public_visible=false,last_checked_at=now(),
      last_error=${message},updated_at=now()
    where local_date=${localDate}::date
  `;
}

async function publishTarget(
  sql: Sql,
  config: DailySourceRepostConfig,
  localDate: string,
  target: { uri: string; cid: string; createdAt: string | null },
  repairing: boolean,
) {
  const t = table(sql, config);
  try {
    const repost = await createAutomationRepost({ uri: target.uri, cid: target.cid });
    const status = repost.publicVisible === true ? "posted" : "posted_pending_index";
    const lastError =
      repost.visibilityError ??
      (repost.publicVisible === true
        ? null
        : "The repost exists in the Bluesky account repository but is not visible in the public Bluesky index yet.");
    await sql`
      update ${t}
      set status=${status},repost_uri=${repost.uri},repost_cid=${repost.cid},
        actor_did=${repost.actorDid},actor_handle=${repost.actorHandle},
        public_visible=${repost.publicVisible},last_checked_at=now(),
        repository_verified_at=now(),
        public_verified_at=case when ${repost.publicVisible === true} then now() else public_verified_at end,
        verification_attempts=verification_attempts+1,
        repair_count=repair_count+case when ${repairing || repost.recovered || !repost.created} then 1 else 0 end,
        last_error=${lastError},updated_at=now()
      where local_date=${localDate}::date
    `;
    return {
      ok: repost.publicVisible === true,
      skipped: !repost.created,
      repaired: repairing || repost.recovered || !repost.created,
      message:
        repost.publicVisible === true
          ? repost.created
            ? `${config.displayName} repost was created and publicly verified.`
            : `${config.displayName} repost already existed and was publicly verified.`
          : `${config.displayName} repost exists in the account repository but public Bluesky visibility is still pending.`,
      source: `@${config.sourceHandle}`,
      actor: { handle: repost.actorHandle, did: repost.actorDid },
      postUri: target.uri,
      repostUri: repost.uri,
      postCreatedAt: target.createdAt,
      verification: {
        repositoryVerified: repost.repositoryVerified,
        publicVisible: repost.publicVisible,
        visibilityError: repost.visibilityError,
        recoveredRecord: repost.recovered,
      },
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message.slice(0, 900)
        : `${config.displayName} repost failed.`;
    await sql`
      update ${t}
      set status='failed',public_visible=false,last_checked_at=now(),
        last_error=${message},updated_at=now()
      where local_date=${localDate}::date
    `;
    return { ok: false, skipped: false, repaired: repairing, message };
  }
}

export async function runDailySourceRepost(
  config: DailySourceRepostConfig,
  options: DailySourceRepostOptions = {},
) {
  validateConfig(config);
  const local = localParts();
  const sql = db();
  await ensureSchema(sql, config);
  const existing = await loadToday(sql, config, local.date);
  const timing = scheduleState(config, local);

  if (!existing && !options.force && timing !== "due") {
    return {
      ok: true,
      skipped: true,
      message:
        timing === "before"
          ? `Before ${config.displayName} repost time.`
          : `Outside ${config.displayName} repost window.`,
    };
  }

  const automation = await getAutomationBlueskyActor();
  if (!automation.configured) {
    return {
      ok: false,
      skipped: true,
      message: "Bluesky server automation is not configured.",
    };
  }
  const t = table(sql, config);

  if (existing) {
    const subject = { uri: existing.postUri, cid: existing.postCid };
    if (freshPosting(existing)) {
      return {
        ok: false,
        skipped: true,
        message: `${config.displayName} repost is already in progress; verification will retry.`,
        actor: { handle: automation.handle, did: automation.did },
        postUri: existing.postUri,
      };
    }
    if (existing.status === "posted" && recentlyVerified(existing)) {
      return {
        ok: true,
        skipped: true,
        message: `${config.displayName} repost remains publicly verified.`,
        actor: { handle: automation.handle, did: automation.did },
        postUri: existing.postUri,
        repostUri: existing.repostUri,
        verification: {
          repositoryVerified: true,
          publicVisible: true,
          cached: true,
          lastCheckedAt: existing.lastCheckedAt,
        },
      };
    }

    if (existing.status === "posted" || existing.status === "posted_pending_index") {
      const inspection = await inspectAutomationRepost(subject, existing.repostUri);
      await saveInspection(sql, config, local.date, inspection);
      if (inspection.found) {
        return verificationResult(
          inspection,
          inspection.publicVisible === true
            ? `${config.displayName} repost exists and is publicly verified.`
            : `${config.displayName} repost exists in the account repository but is not publicly visible yet.`,
          { postUri: existing.postUri },
        );
      }
    } else if (existing.status === "no-new-post") {
      if (recentlyVerified(existing)) {
        return {
          ok: true,
          skipped: true,
          message: `${config.displayName} has no newer source post, and the prior repost remains publicly verified.`,
          actor: { handle: automation.handle, did: automation.did },
          postUri: existing.postUri,
          repostUri: existing.repostUri,
          verification: {
            repositoryVerified: true,
            publicVisible: true,
            cached: true,
            lastCheckedAt: existing.lastCheckedAt,
          },
        };
      }
      const priorRows = await sql`
        select local_date::text,repost_uri from ${t}
        where post_uri=${existing.postUri}
          and local_date<>${local.date}::date
          and status in ('posted','posted_pending_index')
        order by local_date desc limit 1
      `;
      const priorDate = priorRows[0]?.local_date ? String(priorRows[0].local_date) : null;
      const priorUri =
        existing.repostUri ??
        (priorRows[0]?.repost_uri ? String(priorRows[0].repost_uri) : null);
      const inspection = await inspectAutomationRepost(subject, priorUri);
      if (inspection.found) {
        if (priorDate) await saveInspection(sql, config, priorDate, inspection);
        await saveInspection(sql, config, local.date, inspection, "no-new-post");
        return verificationResult(
          inspection,
          inspection.publicVisible === true
            ? `${config.displayName} has no newer source post, and the prior repost is publicly verified.`
            : `${config.displayName} has no newer source post, but the prior repost is not publicly visible yet.`,
          { postUri: existing.postUri },
        );
      }
      await markPriorMissing(
        sql,
        config,
        priorDate,
        `The prior ${config.displayName} repost record is missing from the configured Bluesky account.`,
      );
      await saveInspection(sql, config, local.date, inspection);
    } else if (existing.status === "posting") {
      await sql`
        update ${t}
        set status='missing',last_error='Recovered a stale posting lock.',updated_at=now()
        where local_date=${local.date}::date
      `;
    }

    const claim = await sql`
      update ${t}
      set status='posting',public_visible=null,last_error=null,updated_at=now()
      where local_date=${local.date}::date
        and (status<>'posting' or updated_at < now() - interval '10 minutes')
      returning local_date::text
    `;
    if (!claim[0]) {
      return {
        ok: false,
        skipped: true,
        message: `Another ${config.displayName} repair attempt owns the posting lock.`,
        actor: { handle: automation.handle, did: automation.did },
        postUri: existing.postUri,
      };
    }
    return publishTarget(
      sql,
      config,
      local.date,
      { uri: existing.postUri, cid: existing.postCid, createdAt: existing.postCreatedAt },
      true,
    );
  }

  const post = await latestOriginalPost(config);
  if (!post) {
    return { ok: false, skipped: true, message: `No ${config.displayName} post was found.` };
  }
  const subject = { uri: post.uri, cid: post.cid };
  const priorRows = await sql`
    select local_date::text,repost_uri from ${t}
    where post_uri=${post.uri} and status in ('posted','posted_pending_index')
    order by local_date desc limit 1
  `;
  const priorDate = priorRows[0]?.local_date ? String(priorRows[0].local_date) : null;
  const priorUri = priorRows[0]?.repost_uri ? String(priorRows[0].repost_uri) : null;
  const inspection = await inspectAutomationRepost(subject, priorUri);

  if (inspection.found) {
    if (priorDate) await saveInspection(sql, config, priorDate, inspection);
    const status = priorDate ? "no-new-post" : inspectionStatus(inspection);
    const inserted = await sql`
      insert into ${t}(
        local_date,source_did,source_handle,post_uri,post_cid,post_created_at,status,
        repost_uri,repost_cid,actor_did,actor_handle,public_visible,last_checked_at,
        repository_verified_at,public_verified_at,verification_attempts,repair_count,last_error
      ) values(
        ${local.date}::date,${config.sourceDid},${config.sourceHandle},${post.uri},${post.cid},
        ${post.record.createdAt ?? null}::timestamptz,${status},${inspection.uri},${inspection.cid},
        ${inspection.actorDid},${inspection.actorHandle},${inspection.publicVisible},now(),now(),
        case when ${inspection.publicVisible === true} then now() else null end,1,1,
        ${inspectionError(config, inspection)}
      )
      on conflict(local_date) do nothing returning local_date::text
    `;
    if (!inserted[0]) {
      return {
        ok: false,
        skipped: true,
        message: `Another ${config.displayName} scheduler run created today's state first.`,
      };
    }
    return verificationResult(
      inspection,
      priorDate
        ? inspection.publicVisible === true
          ? `${config.displayName} has not published a newer post; the existing repost is publicly verified.`
          : `${config.displayName} has not published a newer post; the existing repost is awaiting public indexing.`
        : inspection.publicVisible === true
          ? `Recovered an existing ${config.displayName} repost and rebuilt the missing scheduler state.`
          : `Recovered an existing ${config.displayName} repost record, but public visibility is pending.`,
      { postUri: post.uri, repaired: true },
    );
  }

  await markPriorMissing(
    sql,
    config,
    priorDate,
    `The prior ${config.displayName} repost record is missing from the configured Bluesky account.`,
  );
  const claimed = await sql`
    insert into ${t}(
      local_date,source_did,source_handle,post_uri,post_cid,post_created_at,status,
      actor_did,actor_handle,public_visible,last_error
    ) values(
      ${local.date}::date,${config.sourceDid},${config.sourceHandle},${post.uri},${post.cid},
      ${post.record.createdAt ?? null}::timestamptz,'posting',${automation.did},${automation.handle},
      null,null
    )
    on conflict(local_date) do nothing returning local_date::text
  `;
  if (!claimed[0]) {
    return {
      ok: false,
      skipped: true,
      message: `Another ${config.displayName} scheduler run claimed today's post first.`,
    };
  }
  return publishTarget(
    sql,
    config,
    local.date,
    { uri: post.uri, cid: post.cid, createdAt: post.record.createdAt ?? null },
    Boolean(priorDate),
  );
}
