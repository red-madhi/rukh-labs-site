import { neon } from "@neondatabase/serverless";
import { createAutomationRepost, getAutomationBlueskyActor, inspectAutomationRepost } from "@/lib/bluesky-repost-automation";

const PUBLIC_API = "https://public.api.bsky.app/xrpc";
const TIME_ZONE = "America/Denver";
const DAILY_COUNT = 2;
const CANDIDATE_LIMIT = 24;
const POST_AGE_DAYS = 21;
const DEFAULT_FIRST_REPOST_HOUR = 13;
const DEFAULT_SECOND_REPOST_HOUR = 18;
const DEV_BIO_PATTERN = "(\\mdeveloper\\M|software engineer\\M|software dev\\M|software developer\\M|web dev\\M|web developer\\M|game dev\\M|game developer\\M|game development\\M|app dev\\M|app developer\\M|app development\\M|\\mprogrammer\\M|\\mcoder\\M|indie hacker\\M|open[- ]source developer\\M|full[- ]?stack\\M|front[- ]?end\\M|back[- ]?end\\M|android dev\\M|ios dev\\M)";
type Profile = { did: string; handle: string; displayName?: string; description?: string };
type Relationship = { did: string; following?: string; followedBy?: string };
type FeedItem = {
  reason?: unknown;
  post: {
    uri: string; cid: string; author: Profile;
    record: { text?: string; createdAt?: string; reply?: unknown; labels?: { values?: unknown[] }; embed?: { external?: { uri?: string; title?: string; description?: string } } };
    replyCount?: number; repostCount?: number; likeCount?: number; quoteCount?: number; labels?: unknown[];
  };
};
type Candidate = Profile & { followersCount: number; lastUsed: string | null; uses: number; inNetwork: boolean };
type ProjectPost = {
  sourceDid: string; sourceHandle: string; displayName?: string; postUri: string; postCid: string;
  postText: string; postCreatedAt: string; projectScore: number; engagement: number;
  lastUsed: string | null; uses: number; inNetwork: boolean;
};
function db() {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) throw new Error("DATABASE_URL is not configured.");
  return neon(url);
}
type Sql = ReturnType<typeof db>;
function localParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23" }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? "";
  return { date: `${value("year")}-${value("month")}-${value("day")}`, hour: Number(value("hour")) };
}
function validHour(value: unknown, fallback: number) {
  const hour = Number(value);
  return Number.isInteger(hour) && hour >= 0 && hour <= 23 ? hour : fallback;
}
function scheduledTargetCount(hour: number) {
  const firstHour = validHour(process.env.DEV_PROJECT_FIRST_REPOST_HOUR, DEFAULT_FIRST_REPOST_HOUR);
  const secondHour = Math.max(firstHour + 1, validHour(process.env.DEV_PROJECT_SECOND_REPOST_HOUR, DEFAULT_SECOND_REPOST_HOUR));
  return hour >= secondHour ? DAILY_COUNT : hour >= firstHour ? 1 : 0;
}
function minimumGapMinutes() {
  const value = Number(process.env.DEV_PROJECT_MIN_GAP_MINUTES ?? 60);
  return Number.isFinite(value) && value >= 15 && value <= 720 ? value : 60;
}
async function xrpc<T>(method: string, params: URLSearchParams) {
  const response = await fetch(`${PUBLIC_API}/${method}?${params}`, { headers: { Accept: "application/json" }, cache: "no-store", signal: AbortSignal.timeout(10_000) });
  if (!response.ok) throw new Error(`Bluesky ${method} returned ${response.status}.`);
  return await response.json() as T;
}
async function ensureSchema(sql: Sql = db()) {
  await sql`
    create table if not exists bluesky_daily_dev_reposts (
      local_date date not null, slot smallint not null, source_did text not null, source_handle text not null,
      display_name text, post_uri text not null, post_cid text not null, post_text text not null,
      post_created_at timestamptz, project_score numeric not null default 0, status text not null,
      repost_uri text, repost_cid text, last_error text,
      created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
      primary key(local_date,slot), unique(post_uri)
    )
  `;
  return sql;
}
async function candidateDevelopers(sql: Sql, actorDid: string): Promise<Candidate[]> {
  const rows = await sql`
    with usage as (
      select source_did,max(local_date)::text as last_used,count(*)::int as uses
      from bluesky_daily_dev_reposts where status='posted' group by source_did
    )
    select p.did,p.handle,p.display_name,p.description,coalesce(p.followers_count,0)::int as followers_count,
      u.last_used,coalesce(u.uses,0)::int as uses
    from advanced_network_profiles p left join usage u on u.source_did=p.did
    where p.did <> ${actorDid} and lower(coalesce(p.description,'')) ~ ${DEV_BIO_PATTERN}
      and coalesce(p.posts_count,0)>0
    order by case when u.last_used is null then 0 else 1 end,u.last_used asc nulls first,
      coalesce(u.uses,0) asc,coalesce(p.updated_at,p.observed_at) desc nulls last,coalesce(p.followers_count,0) asc
    limit ${CANDIDATE_LIMIT}
  `;
  if (!rows.length) return [];
  const params = new URLSearchParams({ actor: actorDid });
  rows.forEach((row) => params.append("others", String(row.did)));
  const relationships = await xrpc<{ relationships?: Relationship[] }>("app.bsky.graph.getRelationships", params);
  const relation = new Map((relationships.relationships ?? []).map((r) => [r.did, r]));
  // Keep fallback developers. The old early network-only filter could discard
  // every eligible project when the preferred authors had no unused posts.
  return rows.filter((r) => r.did && r.handle).map((r) => {
    const rel = relation.get(String(r.did));
    return {
      did: String(r.did),handle: String(r.handle),displayName: r.display_name ? String(r.display_name) : undefined,
      description: r.description ? String(r.description) : undefined,followersCount: Number(r.followers_count ?? 0),
      lastUsed: r.last_used ? String(r.last_used) : null,uses: Number(r.uses ?? 0),inNetwork: Boolean(rel?.following || rel?.followedBy),
    };
  });
}
function projectSignals(item: FeedItem) {
  const text = item.post.record.text?.trim() ?? "";
  const external = item.post.record.embed?.external;
  const combined = `${text} ${external?.title ?? ""} ${external?.description ?? ""}`.toLowerCase();
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
  const data = await xrpc<{ feed?: FeedItem[] }>("app.bsky.feed.getAuthorFeed", new URLSearchParams({ actor: candidate.did, limit: "100", filter: "posts_no_replies", includePins: "false" }));
  const cutoff = Date.now() - POST_AGE_DAYS * 86_400_000;
  const ranked = (data.feed ?? []).filter((item) => {
    const created = new Date(item.post.record.createdAt ?? "").getTime();
    return item.post.author.did === candidate.did && !item.reason && !item.post.record.reply &&
      !usedUris.has(item.post.uri) && !item.post.labels?.length && !item.post.record.labels?.values?.length &&
      Number.isFinite(created) && created >= cutoff && created <= Date.now();
  }).map((item) => {
    const score = projectSignals(item);
    const ageHours = Math.max(0,(Date.now() - new Date(item.post.record.createdAt ?? "").getTime()) / 3_600_000);
    const engagement = (item.post.likeCount ?? 0) + (item.post.repostCount ?? 0) * 2 + (item.post.replyCount ?? 0) * 1.5 + (item.post.quoteCount ?? 0) * 2.5;
    return { item,score,engagement,rank: score * 100 - ageHours + Math.log1p(engagement) * 3 };
  }).filter((e) => e.score >= 5).sort((a,b) => b.rank - a.rank);
  const winner = ranked[0];
  if (!winner) return null;
  const post = winner.item.post;
  return {
    sourceDid: candidate.did,sourceHandle: candidate.handle,displayName: candidate.displayName,
    postUri: post.uri,postCid: post.cid,postText: post.record.text?.trim() ?? "",
    postCreatedAt: post.record.createdAt ?? new Date().toISOString(),projectScore: winner.score,engagement: winner.engagement,
    lastUsed: candidate.lastUsed,uses: candidate.uses,inNetwork: candidate.inNetwork,
  } satisfies ProjectPost;
}
function rotationCompare(a: ProjectPost, b: ProjectPost) {
  if (a.inNetwork !== b.inNetwork) return a.inNetwork ? -1 : 1;
  if (!a.lastUsed && b.lastUsed) return -1;
  if (a.lastUsed && !b.lastUsed) return 1;
  if (a.lastUsed && b.lastUsed) { const order = a.lastUsed.localeCompare(b.lastUsed); if (order) return order; }
  return a.uses - b.uses || b.projectScore - a.projectScore || b.engagement - a.engagement;
}

export async function runDailyDevProjectReposts(options: { force?: boolean; scheduled?: boolean; targetCount?: number } = {}) {
  const local = localParts();
  const dueTarget = options.scheduled ? scheduledTargetCount(local.hour) : undefined;
  if (options.scheduled && !dueTarget) return { ok: true,skipped: true,message: "Before first dev project repost time." };
  if (!options.force && !options.scheduled) return { ok: true,skipped: true,message: "Use the scheduled dev-project repost runner." };
  const requestedTarget = Number.isInteger(options.targetCount) ? Math.max(1,Math.min(DAILY_COUNT,Number(options.targetCount))) : dueTarget ?? DAILY_COUNT;
  const targetCount = options.scheduled ? Math.min(requestedTarget,dueTarget ?? 0) : requestedTarget;
  const automation = await getAutomationBlueskyActor();
  if (!automation.configured) return { ok: false,skipped: true,message: "Bluesky server automation is not configured." };
  const actor = await xrpc<Profile>("app.bsky.actor.getProfile",new URLSearchParams({ actor: automation.handle }));
  const sql = await ensureSchema();
  const existing = await sql`select * from bluesky_daily_dev_reposts where local_date=${local.date}::date order by slot`;

  // A pending public index is a retry of the same post, not a new selection.
  for (const row of existing.filter((r) => r.status === "posted_pending_index")) {
    const inspection = await inspectAutomationRepost({ uri: String(row.post_uri),cid: String(row.post_cid) },row.repost_uri ? String(row.repost_uri) : null);
    if (inspection.found && inspection.publicVisible === true) {
      await sql`update bluesky_daily_dev_reposts set status='posted',last_error=null,updated_at=now() where local_date=${local.date}::date and slot=${Number(row.slot)} and status='posted_pending_index'`;
      row.status = "posted";
      row.updated_at = new Date().toISOString();
    } else if (inspection.found) {
      return { ok: false,skipped: true,message: "Dev project repost exists but public visibility is still pending.",postUri: String(row.post_uri),repostUri: row.repost_uri };
    }
  }
  const alreadyPosted = existing.filter((r) => r.status === "posted");
  if (alreadyPosted.length >= targetCount) return { ok: true,skipped: true,message: `${targetCount} dev project repost${targetCount === 1 ? " was" : "s were"} already completed today.`,authors: alreadyPosted.map((r) => String(r.source_handle)) };
  const lastPosted = Math.max(...alreadyPosted.map((r) => new Date(String(r.updated_at)).getTime()).filter(Number.isFinite));
  if (options.scheduled && Number.isFinite(lastPosted) && Date.now() - lastPosted < minimumGapMinutes() * 60_000) {
    return { ok: true,skipped: true,message: "Waiting for the minimum stagger interval before the next dev project repost.",nextEligibleAt: new Date(lastPosted + minimumGapMinutes() * 60_000).toISOString() };
  }
  const slot = Array.from({ length: targetCount },(_,i) => i + 1).find((s) => !alreadyPosted.some((r) => Number(r.slot) === s));
  if (!slot) return { ok: false,skipped: true,message: "No uncompleted dev-project slot is available." };
  const retry = existing.find((r) => Number(r.slot) === slot);
  if (retry?.status === "posting" && Date.now() - new Date(String(retry.updated_at)).getTime() < 600_000) {
    return { ok: false,skipped: true,message: "Another dev-project run owns the posting lock; retry later." };
  }
  let winner: ProjectPost | null = null;
  if (retry) {
    winner = { sourceDid: String(retry.source_did),sourceHandle: String(retry.source_handle),displayName: retry.display_name ? String(retry.display_name) : undefined,
      postUri: String(retry.post_uri),postCid: String(retry.post_cid),postText: String(retry.post_text),postCreatedAt: String(retry.post_created_at),
      projectScore: Number(retry.project_score),engagement: 0,lastUsed: null,uses: 0,inNetwork: true };
  } else {
    const usedRows = await sql`select post_uri from bluesky_daily_dev_reposts`;
    const usedUris = new Set(usedRows.map((r) => String(r.post_uri)));
    const usedHandles = new Set(existing.map((r) => String(r.source_handle)));
    const candidates = (await candidateDevelopers(sql,actor.did)).filter((c) => !usedHandles.has(c.handle));
    const feedErrors: Array<{ source: string; error: string }> = [];
    const evaluated = await Promise.all(candidates.map(async (candidate) => {
      try { return await bestProjectPost(candidate,usedUris); }
      catch (error) { feedErrors.push({ source: candidate.handle,error: error instanceof Error ? error.message.slice(0,200) : "Feed request failed." }); return null; }
    }));
    winner = evaluated.filter((p): p is NonNullable<typeof p> => p !== null).sort(rotationCompare)[0] ?? null;
    if (!winner) {
      const message = feedErrors.length === candidates.length && candidates.length > 0 ? "Every developer feed request failed; no post was selected." : "No eligible unused dev project posts were found.";
      console.warn("Dev project selection incomplete",{ checked: candidates.length,feedErrors });
      return { ok: false,skipped: true,message,checkedCandidates: candidates.length,feedErrors };
    }
  }
  const claimed = retry
    ? await sql`
        update bluesky_daily_dev_reposts set status='posting',last_error=null,updated_at=now()
        where local_date=${local.date}::date and slot=${slot}
          and (status in ('failed','posted_pending_index') or (status='posting' and updated_at < now() - interval '10 minutes'))
        returning slot
      `
    : await sql`
        insert into bluesky_daily_dev_reposts(local_date,slot,source_did,source_handle,display_name,post_uri,post_cid,post_text,post_created_at,project_score,status,last_error)
        values(${local.date}::date,${slot},${winner.sourceDid},${winner.sourceHandle},${winner.displayName ?? null},${winner.postUri},${winner.postCid},${winner.postText},${winner.postCreatedAt}::timestamptz,${winner.projectScore},'posting',null)
        on conflict do nothing returning slot
      `;
  if (!claimed[0]) return { ok: false,skipped: true,message: "Another dev-project run already claimed this slot or post." };
  try {
    const repost = await createAutomationRepost({ uri: winner.postUri,cid: winner.postCid });
    const verified = repost.repositoryVerified && repost.publicVisible === true;
    const status = verified ? "posted" : "posted_pending_index";
    const error = verified ? null : repost.visibilityError ?? "Dev project repost exists but public visibility is still pending.";
    await sql`update bluesky_daily_dev_reposts set status=${status},repost_uri=${repost.uri},repost_cid=${repost.cid},last_error=${error},updated_at=now() where local_date=${local.date}::date and slot=${slot}`;
    return { ok: verified,skipped: false,reposted: verified ? 1 : 0,targetCount,
      results: [{ source: `@${winner.sourceHandle}`,postUri: winner.postUri,repostUri: repost.uri,...(error ? { error } : {}) }],
      verification: { repositoryVerified: repost.repositoryVerified,publicVisible: repost.publicVisible } };
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0,900) : "Dev project repost failed.";
    await sql`update bluesky_daily_dev_reposts set status='failed',last_error=${message},updated_at=now() where local_date=${local.date}::date and slot=${slot}`;
    return { ok: false,skipped: false,reposted: 0,targetCount,results: [{ source: `@${winner.sourceHandle}`,postUri: winner.postUri,error: message }] };
  }
}
