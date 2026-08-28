import { createHmac } from "node:crypto";
import { neon } from "@neondatabase/serverless";
import { getAutomationBlueskyActor } from "@/lib/bluesky-repost-automation";

const XRPC = "https://public.api.bsky.app/xrpc";
const SLOT_ORDER = ["mutual", "target", "bridge"] as const;
const TIME_ZONE = "America/Denver";
const DEFAULT_HOUR = 8;
const CANDIDATE_LIMIT = 8;

type Slot = (typeof SLOT_ORDER)[number];
type Profile = { did: string; handle: string; displayName?: string };
type Relationship = { did: string; following?: string; followedBy?: string };
type Candidate = {
  did: string;
  handle: string;
  displayName?: string;
  signal: number;
  reason: string;
};
type Usage = { lastDate: string; uses: number };
type FeedItem = {
  reason?: unknown;
  post: {
    uri: string;
    cid: string;
    author: Profile;
    record: {
      text?: string;
      createdAt?: string;
      reply?: unknown;
      labels?: { values?: unknown[] };
    };
    replyCount?: number;
    repostCount?: number;
    likeCount?: number;
    quoteCount?: number;
    labels?: unknown[];
  };
};
type Pick = {
  slot: Slot;
  subjectDid: string;
  subjectHandle: string;
  displayName?: string;
  postUri: string;
  postCid: string;
  postText: string;
  postCreatedAt: string;
  replyCount: number;
  repostCount: number;
  likeCount: number;
  quoteCount: number;
  score: number;
  reason: string;
};
type StoredItem = Pick & { status: string };
type RunSummary = {
  actorDid: string;
  actorHandle: string;
  localDate: string;
  status: string;
  notificationSentAt: string | null;
};

function getSql() {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) throw new Error("DATABASE_URL is not configured.");
  return neon(url);
}

type Sql = ReturnType<typeof getSql>;

function signingSecret() {
  const value = process.env.ADVANCED_NETWORK_ACCESS_SECRET?.trim();
  if (!value) throw new Error("ADVANCED_NETWORK_ACCESS_SECRET is not configured.");
  return value;
}

function makeToken(actor: string, date: string) {
  const body = Buffer.from(
    JSON.stringify({
      v: 1,
      actor,
      date,
      exp: Date.now() + 16 * 60 * 60 * 1000,
    }),
  ).toString("base64url");
  const signature = createHmac("sha256", signingSecret())
    .update(`iazma-daily-boosts:v1:${body}`)
    .digest("base64url");
  return `${body}.${signature}`;
}

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
  const response = await fetch(`${XRPC}/${method}?${params.toString()}`, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Bluesky ${method} returned ${response.status}.`);
  return (await response.json()) as T;
}

async function profile(actor: string) {
  return xrpc<Profile>("app.bsky.actor.getProfile", new URLSearchParams({ actor }));
}

async function ensureSchema(sql: Sql = getSql()) {
  await sql`
    create table if not exists advanced_network_daily_boost_runs (
      actor_did text not null,
      local_date date not null,
      actor_handle text not null,
      status text not null default 'prepared',
      notification_sent_at timestamptz,
      approved_at timestamptz,
      completed_at timestamptz,
      last_error text,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      primary key (actor_did, local_date)
    )
  `;
  await sql`
    create table if not exists advanced_network_daily_boost_items (
      actor_did text not null,
      local_date date not null,
      slot text not null,
      slot_order smallint not null,
      subject_did text not null,
      subject_handle text not null,
      display_name text,
      post_uri text not null,
      post_cid text not null,
      post_text text not null,
      post_created_at timestamptz not null,
      reply_count integer not null default 0,
      repost_count integer not null default 0,
      like_count integer not null default 0,
      quote_count integer not null default 0,
      score numeric not null default 0,
      reason text not null,
      status text not null default 'prepared',
      repost_uri text,
      repost_cid text,
      last_error text,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      primary key (actor_did, local_date, slot),
      unique (actor_did, post_uri),
      foreign key (actor_did, local_date)
        references advanced_network_daily_boost_runs(actor_did, local_date) on delete cascade
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

async function candidates(sql: Sql, actorDid: string, slot: Slot): Promise<Candidate[]> {
  if (slot === "mutual") {
    const rows = await sql`
      select s.peer_did, p.handle, p.display_name, s.interaction_score
      from advanced_network_interaction_scores s
      join advanced_network_profiles p on p.did=s.peer_did
      where s.actor_did=${actorDid}
      order by s.interaction_score desc, s.window_end desc nulls last
      limit ${CANDIDATE_LIMIT}
    `;
    const relation = await relationships(
      actorDid,
      rows.map((row) => String(row.peer_did)),
    );
    return rows
      .filter(
        (row) =>
          relation.get(String(row.peer_did))?.following &&
          relation.get(String(row.peer_did))?.followedBy,
      )
      .map((row) => ({
        did: String(row.peer_did),
        handle: String(row.handle),
        displayName: row.display_name ? String(row.display_name) : undefined,
        signal: Number(row.interaction_score ?? 0),
        reason: `Strong mutual · interaction ${Math.round(Number(row.interaction_score ?? 0))}`,
      }));
  }

  if (slot === "target") {
    const rows = await sql`
      select * from (
        select distinct on (t.target_did)
          t.target_did, coalesce(p.handle,t.target_handle) handle, p.display_name,
          t.priority_score, c.updated_at
        from advanced_network_accounts a
        join advanced_network_campaigns c on c.account_id=a.id and c.status='active'
        join advanced_network_targets t on t.campaign_id=c.id and t.status='active'
        left join advanced_network_profiles p on p.did=t.target_did
        where a.bluesky_did=${actorDid}
        order by t.target_did, c.updated_at desc
      ) latest
      order by priority_score desc nulls last, updated_at desc
      limit ${CANDIDATE_LIMIT}
    `;
    return rows
      .filter((row) => row.handle)
      .map((row) => ({
        did: String(row.target_did),
        handle: String(row.handle),
        displayName: row.display_name ? String(row.display_name) : undefined,
        signal: Math.max(25, Number(row.priority_score ?? 0)),
        reason: "Active IAZMA target",
      }));
  }

  const rows = await sql`
    select * from (
      select distinct on (r.target_did)
        r.target_did, coalesce(p.handle,r.target_handle) handle, p.display_name,
        r.importance_score,
        coalesce(nullif(r.metadata->>'expectedBridgeValue','')::numeric,r.importance_score,0) bridge_value,
        r.updated_at
      from advanced_network_accounts a
      join advanced_network_recommendations r on r.account_id=a.id
      left join advanced_network_profiles p on p.did=r.target_did
      where a.bluesky_did=${actorDid}
        and r.recommendation_type in ('warm-follower-bridge','bridge-bestie','bestie-of-bestie')
        and coalesce(r.metadata->>'humanFit','') not in ('not-for-me','not-my-audience','destination-only')
      order by r.target_did, r.updated_at desc
    ) latest
    order by bridge_value desc, importance_score desc nulls last
    limit ${CANDIDATE_LIMIT}
  `;
  return rows
    .filter((row) => row.handle)
    .map((row) => ({
      did: String(row.target_did),
      handle: String(row.handle),
      displayName: row.display_name ? String(row.display_name) : undefined,
      signal: Math.max(25, Number(row.bridge_value ?? 0)),
      reason: `IAZMA bridge · value ${Math.round(Number(row.bridge_value ?? 0))}`,
    }));
}

async function usageMap(sql: Sql, actorDid: string, beforeDate: string) {
  const rows = await sql`
    select subject_did, max(local_date)::text as last_date, count(*)::int as uses
    from advanced_network_daily_boost_items
    where actor_did=${actorDid} and local_date < ${beforeDate}::date
    group by subject_did
  `;
  return new Map<string, Usage>(
    rows.map((row) => [
      String(row.subject_did),
      {
        lastDate: String(row.last_date),
        uses: Number(row.uses ?? 0),
      },
    ]),
  );
}

function usageKey(candidate: Candidate, usage: Map<string, Usage>) {
  const entry = usage.get(candidate.did);
  return entry ? `${entry.lastDate}:${entry.uses}` : "never";
}

function rotatedGroups(pool: Candidate[], usage: Map<string, Usage>) {
  const ordered = [...pool].sort((a, b) => {
    const au = usage.get(a.did);
    const bu = usage.get(b.did);
    if (!au && bu) return -1;
    if (au && !bu) return 1;
    if (!au && !bu) return b.signal - a.signal;
    const dateOrder = String(au?.lastDate).localeCompare(String(bu?.lastDate));
    if (dateOrder !== 0) return dateOrder;
    const useOrder = (au?.uses ?? 0) - (bu?.uses ?? 0);
    if (useOrder !== 0) return useOrder;
    return b.signal - a.signal;
  });

  const groups: Candidate[][] = [];
  for (const candidate of ordered) {
    const key = usageKey(candidate, usage);
    const last = groups.at(-1);
    if (!last || usageKey(last[0], usage) !== key) groups.push([candidate]);
    else last.push(candidate);
  }
  return groups;
}

function postScore(item: FeedItem, signal: number) {
  const created = new Date(item.post.record.createdAt ?? "").getTime();
  const ageHours = Number.isFinite(created)
    ? Math.max(0.5, (Date.now() - created) / 3_600_000)
    : 120;
  const engagement =
    (item.post.likeCount ?? 0) +
    (item.post.replyCount ?? 0) * 2 +
    (item.post.repostCount ?? 0) * 3 +
    (item.post.quoteCount ?? 0) * 4;
  return (
    Math.log1p(engagement) * 18 +
    Math.log1p(engagement / ageHours) * 10 +
    Math.max(0, 72 - ageHours) +
    signal * 0.25
  );
}

async function bestPost(candidate: Candidate, usedUris: Set<string>) {
  const data = await xrpc<{ feed?: FeedItem[] }>(
    "app.bsky.feed.getAuthorFeed",
    new URLSearchParams({
      actor: candidate.did,
      limit: "20",
      filter: "posts_no_replies",
      includePins: "false",
    }),
  );
  const cutoff = Date.now() - 5 * 24 * 60 * 60 * 1000;
  return (
    (data.feed ?? [])
      .filter((item) => {
        const created = new Date(item.post.record.createdAt ?? "").getTime();
        return (
          item.post.author.did === candidate.did &&
          !item.reason &&
          !item.post.record.reply &&
          !usedUris.has(item.post.uri) &&
          (item.post.record.text?.trim().length ?? 0) >= 4 &&
          Number.isFinite(created) &&
          created >= cutoff &&
          !item.post.labels?.length &&
          !item.post.record.labels?.values?.length
        );
      })
      .map((item) => ({ item, score: postScore(item, candidate.signal) }))
      .sort((a, b) => b.score - a.score)[0] ?? null
  );
}

async function pick(
  sql: Sql,
  actorDid: string,
  slot: Slot,
  usedDids: Set<string>,
  usedUris: Set<string>,
  usage: Map<string, Usage>,
): Promise<Pick | null> {
  const pool = (await candidates(sql, actorDid, slot)).filter(
    (candidate) => !usedDids.has(candidate.did),
  );

  for (const group of rotatedGroups(pool, usage)) {
    const results = await Promise.all(
      group.map(async (candidate) => {
        try {
          const result = await bestPost(candidate, usedUris);
          return result ? { candidate, ...result } : null;
        } catch {
          return null;
        }
      }),
    );
    const winner = results
      .filter((value): value is NonNullable<typeof value> => Boolean(value))
      .sort((a, b) => b.score - a.score)[0];
    if (!winner) continue;

    const post = winner.item.post;
    const previous = usage.get(winner.candidate.did);
    return {
      slot,
      subjectDid: winner.candidate.did,
      subjectHandle: winner.candidate.handle,
      displayName: winner.candidate.displayName,
      postUri: post.uri,
      postCid: post.cid,
      postText: post.record.text?.trim() ?? "",
      postCreatedAt: post.record.createdAt ?? new Date().toISOString(),
      replyCount: Math.max(0, post.replyCount ?? 0),
      repostCount: Math.max(0, post.repostCount ?? 0),
      likeCount: Math.max(0, post.likeCount ?? 0),
      quoteCount: Math.max(0, post.quoteCount ?? 0),
      score: Math.round(winner.score * 10) / 10,
      reason: previous
        ? `${winner.candidate.reason} · last boosted ${previous.lastDate}`
        : `${winner.candidate.reason} · new rotation pick`,
    };
  }
  return null;
}

async function loadSummary(sql: Sql, actorDid: string, date: string) {
  const rows = await sql`
    select actor_did, actor_handle, local_date::text, status, notification_sent_at::text
    from advanced_network_daily_boost_runs
    where actor_did=${actorDid} and local_date=${date}::date
  `;
  if (!rows[0]) return null;
  return {
    actorDid: String(rows[0].actor_did),
    actorHandle: String(rows[0].actor_handle),
    localDate: String(rows[0].local_date),
    status: String(rows[0].status),
    notificationSentAt: rows[0].notification_sent_at
      ? String(rows[0].notification_sent_at)
      : null,
  } satisfies RunSummary;
}

async function loadItems(sql: Sql, actorDid: string, date: string) {
  const rows = await sql`
    select slot, subject_did, subject_handle, display_name, post_uri, post_cid, post_text,
           post_created_at::text, reply_count, repost_count, like_count, quote_count,
           score, reason, status
    from advanced_network_daily_boost_items
    where actor_did=${actorDid} and local_date=${date}::date
    order by slot_order
  `;
  return rows.map((row) => ({
    slot: String(row.slot) as Slot,
    subjectDid: String(row.subject_did),
    subjectHandle: String(row.subject_handle),
    displayName: row.display_name ? String(row.display_name) : undefined,
    postUri: String(row.post_uri),
    postCid: String(row.post_cid),
    postText: String(row.post_text),
    postCreatedAt: String(row.post_created_at),
    replyCount: Number(row.reply_count ?? 0),
    repostCount: Number(row.repost_count ?? 0),
    likeCount: Number(row.like_count ?? 0),
    quoteCount: Number(row.quote_count ?? 0),
    score: Number(row.score ?? 0),
    reason: String(row.reason),
    status: String(row.status),
  })) satisfies StoredItem[];
}

function postUrl(item: StoredItem) {
  return `https://bsky.app/profile/${encodeURIComponent(item.subjectHandle)}/post/${encodeURIComponent(item.postUri.split("/").at(-1) ?? "")}`;
}

function escapeHtml(value: string) {
  const entities: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;",
  };
  return value.replace(/[&<>'"]/g, (char) => entities[char] ?? char);
}

async function sendEmail(
  run: RunSummary,
  items: StoredItem[],
  options: { regenerate?: boolean } = {},
) {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const to = (
    process.env.DAILY_BOOST_NOTIFICATION_EMAIL ??
    process.env.CONTACT_NOTIFICATION_EMAIL ??
    ""
  ).trim();
  if (!apiKey || !to) {
    return {
      sent: false,
      error: "Daily Boost email is not configured.",
    };
  }

  const from = process.env.CONTACT_FROM_EMAIL || "Rukh Labs <hello@rukhlabs.com>";
  const reviewUrl = `https://rukhlabs.com/tools/bluesky-network-advanced/app/daily-boosts?token=${encodeURIComponent(makeToken(run.actorDid, run.localDate))}`;
  const cards = items
    .map(
      (item) => `<div style="border:1px solid #d9e2ea;border-radius:14px;padding:16px;margin:14px 0">
    <div style="font-size:11px;font-weight:700;letter-spacing:.12em;color:#087ea4">${item.slot === "mutual" ? "STRONG MUTUAL" : item.slot.toUpperCase()}</div>
    <div style="font-size:17px;font-weight:700;margin:6px 0">@${escapeHtml(item.subjectHandle)}</div>
    <div style="white-space:pre-wrap;line-height:1.5">${escapeHtml(item.postText.slice(0, 420))}</div>
    <div style="font-size:12px;color:#667085;margin-top:9px">${escapeHtml(item.reason)} · ${item.likeCount} likes · ${item.repostCount} reposts · ${item.replyCount} replies</div>
    <div style="margin-top:9px"><a href="${postUrl(item)}">Open post</a></div>
  </div>`,
    )
    .join("");

  const keySuffix = options.regenerate ? `regen-${Date.now()}` : "rotation-v3";
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `iazma-daily-boosts-${run.actorDid}-${run.localDate}-${keySuffix}`,
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: `IAZMA Daily Boosts · ${items.length} picks ready`,
      html: `<div style="font-family:Arial,sans-serif;max-width:680px;margin:auto;color:#101828">
        <div style="font-size:12px;font-weight:700;letter-spacing:.12em;color:#087ea4">IAZMA PRO · DAILY BOOSTS</div>
        <h1>Today's repost picks are ready.</h1>
        <p style="color:#667085">Authors rotate before engagement score is considered. Opening this email or the review page does not repost anything.</p>
        ${cards}
        <p style="margin:26px 0"><a href="${reviewUrl}" style="background:#111827;color:white;text-decoration:none;padding:14px 20px;border-radius:10px;font-weight:700">Review & approve</a></p>
        <p style="font-size:12px;color:#98a2b3">The signed link expires later today. The reposts happen only after you confirm.</p>
      </div>`,
    }),
    cache: "no-store",
  });
  if (response.ok) return { sent: true };

  const detail = (await response.text()).replace(/\s+/g, " ").slice(0, 300);
  return {
    sent: false,
    error: `Daily Boost email service returned ${response.status}${detail ? `: ${detail}` : "."}`,
  };
}

export async function prepareDailyBoosts(
  options: { force?: boolean; regenerate?: boolean } = {},
) {
  const local = localParts();
  if (!options.force && local.hour < notificationHour()) {
    return { ok: true, skipped: true, message: "Before notification hour." };
  }

  const automation = await getAutomationBlueskyActor();
  if (!automation.configured) {
    return {
      ok: false,
      skipped: true,
      message: "Bluesky server automation is not configured.",
    };
  }

  const actor = await profile(automation.handle);
  const sql = await ensureSchema();
  let run = await loadSummary(sql, actor.did, local.date);

  if (run && options.regenerate) {
    if (run.status !== "prepared") {
      return {
        ok: false,
        skipped: true,
        message: `Today's batch cannot rotate because it is already ${run.status}.`,
      };
    }
    await sql`
      delete from advanced_network_daily_boost_items
      where actor_did=${actor.did} and local_date=${local.date}::date
    `;
    await sql`
      update advanced_network_daily_boost_runs
      set notification_sent_at=null,last_error=null,updated_at=now()
      where actor_did=${actor.did} and local_date=${local.date}::date
    `;
    run = await loadSummary(sql, actor.did, local.date);
  } else if (run?.notificationSentAt) {
    return { ok: true, skipped: true, message: "Already sent today." };
  }

  if (!run) {
    await sql`
      insert into advanced_network_daily_boost_runs(actor_did,local_date,actor_handle,status)
      values(${actor.did},${local.date}::date,${actor.handle},'prepared')
      on conflict do nothing
    `;
    run = await loadSummary(sql, actor.did, local.date);
  }
  if (!run) throw new Error("Daily Boost run could not be created.");

  let items = await loadItems(sql, actor.did, local.date);
  if (!items.length) {
    const usedRows = await sql`
      select post_uri from advanced_network_daily_boost_items
      where actor_did=${actor.did} and local_date < ${local.date}::date
    `;
    const usedUris = new Set<string>(
      usedRows.map((row) => String(row.post_uri)),
    );
    const usedDids = new Set<string>();
    const usage = await usageMap(sql, actor.did, local.date);

    for (const slot of SLOT_ORDER) {
      const chosen = await pick(sql, actor.did, slot, usedDids, usedUris, usage);
      if (!chosen) continue;
      await sql`
        insert into advanced_network_daily_boost_items(
          actor_did,local_date,slot,slot_order,subject_did,subject_handle,display_name,
          post_uri,post_cid,post_text,post_created_at,reply_count,repost_count,like_count,
          quote_count,score,reason
        ) values(
          ${actor.did},${local.date}::date,${slot},${SLOT_ORDER.indexOf(slot)+1},${chosen.subjectDid},
          ${chosen.subjectHandle},${chosen.displayName ?? null},${chosen.postUri},${chosen.postCid},
          ${chosen.postText},${chosen.postCreatedAt}::timestamptz,${chosen.replyCount},${chosen.repostCount},
          ${chosen.likeCount},${chosen.quoteCount},${chosen.score},${chosen.reason}
        ) on conflict do nothing
      `;
      usedDids.add(chosen.subjectDid);
      usedUris.add(chosen.postUri);
    }
    items = await loadItems(sql, actor.did, local.date);
  }

  if (!items.length) {
    return {
      ok: false,
      skipped: true,
      message: "No eligible Daily Boost posts found.",
    };
  }

  const email = await sendEmail(run, items, {
    regenerate: options.regenerate,
  });
  await sql`
    update advanced_network_daily_boost_runs
    set notification_sent_at=case when ${email.sent} then now() else notification_sent_at end,
        last_error=case when ${email.sent} then null else ${email.error} end,
        updated_at=now()
    where actor_did=${actor.did} and local_date=${local.date}::date
  `;

  return {
    ok: email.sent,
    skipped: false,
    emailed: email.sent,
    picks: items.length,
    authors: items.map((item) => item.subjectHandle),
    rotated: true,
    ...(email.sent ? {} : { message: email.error }),
  };
}
