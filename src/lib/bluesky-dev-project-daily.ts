import { neon } from "@neondatabase/serverless";
import {
  createAutomationRepost,
  getAutomationBlueskyActor,
} from "@/lib/bluesky-repost-automation";

const PUBLIC_API = "https://public.api.bsky.app/xrpc";
const TIME_ZONE = "America/Denver";
const DEFAULT_HOUR = 8;
const DAILY_COUNT = 2;
const CANDIDATE_LIMIT = 24;
const POST_AGE_DAYS = 21;

const DEV_BIO_PATTERN =
  "(\\mdeveloper\\M|software engineer\\M|software dev\\M|software developer\\M|web dev\\M|web developer\\M|game dev\\M|game developer\\M|game development\\M|app dev\\M|app developer\\M|app development\\M|\\mprogrammer\\M|\\mcoder\\M|indie hacker\\M|open[- ]source developer\\M|full[- ]?stack\\M|front[- ]?end\\M|back[- ]?end\\M|android dev\\M|ios dev\\M)";

type Profile = {
  did: string;
  handle: string;
  displayName?: string;
  description?: string;
};

type Relationship = {
  did: string;
  following?: string;
  followedBy?: string;
};

type FeedItem = {
  reason?: unknown;
  post: {
    uri: string;
    cid: string;
    author: { did: string; handle: string; displayName?: string };
    record: {
      text?: string;
      createdAt?: string;
      reply?: unknown;
      labels?: { values?: unknown[] };
      embed?: {
        external?: { uri?: string; title?: string; description?: string };
      };
    };
    replyCount?: number;
    repostCount?: number;
    likeCount?: number;
    quoteCount?: number;
    labels?: unknown[];
  };
};

type Candidate = Profile & {
  followersCount: number;
  lastUsed: string | null;
  uses: number;
};

type ProjectPost = {
  sourceDid: string;
  sourceHandle: string;
  displayName?: string;
  postUri: string;
  postCid: string;
  postText: string;
  postCreatedAt: string;
  projectScore: number;
  engagement: number;
  lastUsed: string | null;
  uses: number;
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

async function xrpc<T>(method: string, params: URLSearchParams) {
  const response = await fetch(`${PUBLIC_API}/${method}?${params.toString()}`, {
    headers: { Accept: "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`Bluesky ${method} returned ${response.status}.`);
  return (await response.json()) as T;
}

async function profile(actor: string) {
  return xrpc<Profile>("app.bsky.actor.getProfile", new URLSearchParams({ actor }));
}

async function ensureSchema(sql: Sql = db()) {
  await sql`
    create table if not exists bluesky_daily_dev_reposts (
      local_date date not null,
      slot smallint not null,
      source_did text not null,
      source_handle text not null,
      display_name text,
      post_uri text not null,
      post_cid text not null,
      post_text text not null,
      post_created_at timestamptz,
      project_score numeric not null default 0,
      status text not null,
      repost_uri text,
      repost_cid text,
      last_error text,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      primary key (local_date, slot),
      unique (post_uri)
    )
  `;
  return sql;
}

async function relationships(actorDid: string, dids: string[]) {
  if (!dids.length) return new Map<string, Relationship>();
  const params = new URLSearchParams({ actor: actorDid });
  dids.forEach((did) => params.append("others", did));
  const data = await xrpc<{ relationships?: Relationship[] }>(
    "app.bsky.graph.getRelationships",
    params,
  );
  return new Map((data.relationships ?? []).map((item) => [item.did, item]));
}

async function candidateDevelopers(sql: Sql, actorDid: string): Promise<Candidate[]> {
  const rows = await sql`
    with usage as (
      select source_did, max(local_date)::text as last_used, count(*)::int as uses
      from bluesky_daily_dev_reposts
      where status='posted'
      group by source_did
    )
    select p.did, p.handle, p.display_name, p.description,
           coalesce(p.followers_count,0)::int as followers_count,
           u.last_used, coalesce(u.uses,0)::int as uses
    from advanced_network_profiles p
    left join usage u on u.source_did=p.did
    where p.did <> ${actorDid}
      and lower(coalesce(p.description,'')) ~ ${DEV_BIO_PATTERN}
      and coalesce(p.posts_count,0) > 0
    order by
      case when u.last_used is null then 0 else 1 end,
      u.last_used asc nulls first,
      coalesce(u.uses,0) asc,
      coalesce(p.updated_at,p.observed_at) desc nulls last,
      coalesce(p.followers_count,0) asc
    limit ${CANDIDATE_LIMIT}
  `;

  const candidates = rows
    .filter((row) => row.did && row.handle)
    .map((row) => ({
      did: String(row.did),
      handle: String(row.handle),
      displayName: row.display_name ? String(row.display_name) : undefined,
      description: row.description ? String(row.description) : undefined,
      followersCount: Number(row.followers_count ?? 0),
      lastUsed: row.last_used ? String(row.last_used) : null,
      uses: Number(row.uses ?? 0),
    }));

  const relation = await relationships(
    actorDid,
    candidates.map((candidate) => candidate.did),
  );
  const network = candidates.filter((candidate) => {
    const rel = relation.get(candidate.did);
    return Boolean(rel?.following || rel?.followedBy);
  });

  return network.length >= DAILY_COUNT ? network : candidates;
}

function projectSignals(item: FeedItem) {
  const text = item.post.record.text?.trim() ?? "";
  const lower = text.toLowerCase();
  const external = item.post.record.embed?.external;
  const externalText = `${external?.title ?? ""} ${external?.description ?? ""}`.toLowerCase();
  const combined = `${lower} ${externalText}`;
  let score = 0;

  if (/\b(i|we)\s+(built|made|shipped|launched|released|published|deployed|updated|created)\b/.test(combined)) score += 5;
  if (/\b(my|our)\s+(app|game|project|tool|site|website|library|package|plugin|extension|product|repo|software)\b/.test(combined)) score += 5;
  if (/\b(launch|launched|release|released|shipping|shipped|devlog|demo|beta|alpha|open[- ]source|github|itch\.io|play store|app store|npm|pypi|steam|version\s+\d|v\d+[.]?\d*)\b/.test(combined)) score += 4;
  if (/\b(building|working on|work in progress|wip|new feature|new update|just added|now available|try it|check it out)\b/.test(combined)) score += 3;
  if (/\b(app|game|project|tool|website|site|library|package|plugin|extension|repo|software|product)\b/.test(combined)) score += 2;
  if (external?.uri || /https?:\/\//.test(text)) score += 2;
  if (/\b(hiring|job search|looking for work|available for hire|resume|cv)\b/.test(combined)) score -= 5;

  return score;
}

async function bestProjectPost(candidate: Candidate, usedUris: Set<string>) {
  const data = await xrpc<{ feed?: FeedItem[] }>(
    "app.bsky.feed.getAuthorFeed",
    new URLSearchParams({
      actor: candidate.did,
      limit: "30",
      filter: "posts_no_replies",
      includePins: "false",
    }),
  );
  const cutoff = Date.now() - POST_AGE_DAYS * 24 * 60 * 60 * 1000;

  const ranked = (data.feed ?? [])
    .filter((item) => {
      const created = new Date(item.post.record.createdAt ?? "").getTime();
      return (
        item.post.author.did === candidate.did &&
        !item.reason &&
        !item.post.record.reply &&
        !usedUris.has(item.post.uri) &&
        !item.post.labels?.length &&
        !item.post.record.labels?.values?.length &&
        Number.isFinite(created) &&
        created >= cutoff
      );
    })
    .map((item) => {
      const score = projectSignals(item);
      const created = new Date(item.post.record.createdAt ?? "").getTime();
      const ageHours = Math.max(0, (Date.now() - created) / 3_600_000);
      const engagement =
        (item.post.likeCount ?? 0) +
        (item.post.repostCount ?? 0) * 2 +
        (item.post.replyCount ?? 0) * 1.5 +
        (item.post.quoteCount ?? 0) * 2.5;
      const rank = score * 100 - ageHours + Math.log1p(engagement) * 3;
      return { item, score, rank, engagement };
    })
    .filter((entry) => entry.score >= 5)
    .sort((a, b) => b.rank - a.rank);

  const winner = ranked[0];
  if (!winner) return null;
  const post = winner.item.post;
  return {
    sourceDid: candidate.did,
    sourceHandle: candidate.handle,
    displayName: candidate.displayName,
    postUri: post.uri,
    postCid: post.cid,
    postText: post.record.text?.trim() ?? "",
    postCreatedAt: post.record.createdAt ?? new Date().toISOString(),
    projectScore: winner.score,
    engagement: winner.engagement,
    lastUsed: candidate.lastUsed,
    uses: candidate.uses,
  } satisfies ProjectPost;
}

function rotationCompare(a: ProjectPost, b: ProjectPost) {
  if (!a.lastUsed && b.lastUsed) return -1;
  if (a.lastUsed && !b.lastUsed) return 1;
  if (a.lastUsed && b.lastUsed) {
    const dateOrder = a.lastUsed.localeCompare(b.lastUsed);
    if (dateOrder !== 0) return dateOrder;
  }
  const useOrder = a.uses - b.uses;
  if (useOrder !== 0) return useOrder;
  const projectOrder = b.projectScore - a.projectScore;
  if (projectOrder !== 0) return projectOrder;
  return b.engagement - a.engagement;
}

export async function runDailyDevProjectReposts(
  options: { force?: boolean } = {},
) {
  const local = localParts();
  if (!options.force && local.hour !== notificationHour()) {
    return { ok: true, skipped: true, message: "Outside dev project repost hour." };
  }

  const automation = await getAutomationBlueskyActor();
  if (!automation.configured) {
    return { ok: false, skipped: true, message: "Bluesky server automation is not configured." };
  }

  const actor = await profile(automation.handle);
  const sql = await ensureSchema();
  const existing = await sql`
    select slot, status, source_handle, post_uri, repost_uri
    from bluesky_daily_dev_reposts
    where local_date=${local.date}::date
    order by slot
  `;
  const alreadyPosted = existing.filter((row) => row.status === "posted");
  if (alreadyPosted.length >= DAILY_COUNT) {
    return {
      ok: true,
      skipped: true,
      message: "Two dev project posts were already reposted today.",
      authors: alreadyPosted.map((row) => String(row.source_handle)),
    };
  }

  const usedRows = await sql`
    select post_uri from bluesky_daily_dev_reposts where status='posted'
  `;
  const usedUris = new Set(usedRows.map((row) => String(row.post_uri)));
  const usedDidsToday = new Set(
    existing.map((row) => String(row.source_handle)).filter(Boolean),
  );
  const candidates = (await candidateDevelopers(sql, actor.did)).filter(
    (candidate) => !usedDidsToday.has(candidate.handle),
  );

  const evaluated = await Promise.all(
    candidates.map(async (candidate) => {
      try {
        return await bestProjectPost(candidate, usedUris);
      } catch {
        return null;
      }
    }),
  );
  const winners = evaluated
    .filter((value): value is NonNullable<(typeof evaluated)[number]> => value !== null)
    .sort(rotationCompare)
    .slice(0, DAILY_COUNT - alreadyPosted.length);

  if (!winners.length) {
    return { ok: false, skipped: true, message: "No eligible dev project posts were found." };
  }

  const results: Array<{ source: string; postUri: string; repostUri?: string; error?: string }> = [];
  let nextSlot = alreadyPosted.length + 1;
  for (const winner of winners) {
    const slot = nextSlot++;
    await sql`
      insert into bluesky_daily_dev_reposts(
        local_date,slot,source_did,source_handle,display_name,post_uri,post_cid,
        post_text,post_created_at,project_score,status,last_error
      ) values(
        ${local.date}::date,${slot},${winner.sourceDid},${winner.sourceHandle},${winner.displayName ?? null},
        ${winner.postUri},${winner.postCid},${winner.postText},${winner.postCreatedAt}::timestamptz,
        ${winner.projectScore},'posting',null
      )
      on conflict(local_date,slot) do update set
        source_did=excluded.source_did,source_handle=excluded.source_handle,
        display_name=excluded.display_name,post_uri=excluded.post_uri,post_cid=excluded.post_cid,
        post_text=excluded.post_text,post_created_at=excluded.post_created_at,
        project_score=excluded.project_score,status='posting',last_error=null,updated_at=now()
    `;

    try {
      const repost = await createAutomationRepost({ uri: winner.postUri, cid: winner.postCid });
      await sql`
        update bluesky_daily_dev_reposts
        set status='posted',repost_uri=${repost.uri},repost_cid=${repost.cid},last_error=null,updated_at=now()
        where local_date=${local.date}::date and slot=${slot}
      `;
      results.push({
        source: `@${winner.sourceHandle}`,
        postUri: winner.postUri,
        repostUri: repost.uri,
      });
      usedUris.add(winner.postUri);
    } catch (error) {
      const message = error instanceof Error ? error.message.slice(0, 900) : "Dev project repost failed.";
      await sql`
        update bluesky_daily_dev_reposts
        set status='failed',last_error=${message},updated_at=now()
        where local_date=${local.date}::date and slot=${slot}
      `;
      results.push({ source: `@${winner.sourceHandle}`, postUri: winner.postUri, error: message });
    }
  }

  const failures = results.filter((result) => result.error).length;
  return {
    ok: failures === 0,
    skipped: false,
    reposted: results.length - failures,
    results,
  };
}
