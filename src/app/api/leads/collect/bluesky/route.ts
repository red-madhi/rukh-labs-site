import { NextRequest, NextResponse } from "next/server";
import { hasValidBasicAuth, hasValidCronAuth } from "@/lib/leads/auth";
import { leadNeonQuery } from "@/lib/leads/neon";
import type { LeadPriority } from "@/lib/leads/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SOURCE_ID = "intent-bluesky";
const MAX_POST_AGE_MS = 48 * 60 * 60 * 1000;
const MINIMUM_SCORE = 65;

const searchConfigs = [
  { query: "looking for a web designer", match: /looking for (?:a |an )?(?:web|website) designer/i, baseScore: 80, tag: "designer request" },
  { query: "need a web designer", match: /need (?:a |an )?(?:web|website) designer/i, baseScore: 82, tag: "designer request" },
  { query: "recommend a web designer", match: /recommend(?:ation|ations)?(?: for)? (?:a |an )?(?:web|website) designer|recommend (?:a |an )?(?:web|website) designer/i, baseScore: 78, tag: "recommendation request" },
  { query: "looking for a web developer", match: /looking for (?:a |an )?web developer/i, baseScore: 77, tag: "developer request" },
  { query: "need a web developer", match: /need (?:a |an )?web developer/i, baseScore: 78, tag: "developer request" },
  { query: "who can build me a website", match: /who (?:can|could) (?:build|make|create) (?:me |us )?(?:a |our )?website/i, baseScore: 82, tag: "build request" },
  { query: "need a website", match: /(?:i|we|my business|our business) (?:really )?need(?:s)? (?:a |our )?(?:new )?website/i, baseScore: 70, tag: "website need" },
  { query: "website redesign", match: /(?:need|looking for|seeking|want)(?: someone| help)?(?: to| with)? (?:redesign|rebuild|redo)(?:ing)? (?:my|our|the)? ?website|website (?:redesign|rebuild)/i, baseScore: 70, tag: "redesign" },
  { query: "help with my website", match: /(?:need|looking for|could use) help with (?:my|our) website/i, baseScore: 68, tag: "website help" },
] as const;

const selfPromotionPattern = /\b(?:i(?:'|’)m|i am|we are) (?:a |an )?(?:freelance )?(?:web|website) (?:designer|developer)\b|\bi (?:build|design|make|create) websites\b|\b(?:web design|website design) (?:services|commissions) (?:are )?open\b|\bavailable for (?:web|website) (?:design|development) work\b|\blooking for (?:new )?clients\b/i;
const exploratoryPattern = /\b(?:someday|eventually|just curious|hypothetically|for a class|school project)\b/i;
const businessPattern = /\b(?:business|company|startup|studio|agency|shop|store|restaurant|nonprofit|organization|brand|practice|contractor|service)\b/i;
const urgencyPattern = /\b(?:asap|urgent|urgently|soon|this week|this month|deadline|launch(?:ing)?|opening)\b/i;
const paidPattern = /\b(?:paid|budget|hire|hiring|quote|estimate|proposal)\b/i;

type BskyAuthor = { did?: string; handle?: string; displayName?: string };
type BskyPostView = { uri?: string; cid?: string; author?: BskyAuthor; record?: unknown; replyCount?: number; repostCount?: number; likeCount?: number; quoteCount?: number };
type BskySearchResponse = { posts?: BskyPostView[] };
type QualifiedLead = {
  source_key: string; source_url: string; source_published_at: string; company_name: string; contact_name: string | null;
  contact_url: string; location: string; industry: string; summary: string; score: number; priority: LeadPriority;
  signals: string[]; risks: string[]; tags: string[]; pitch: string; raw_payload: Record<string, unknown>;
};

function privateJson(body: unknown, init?: ResponseInit) {
  const response = NextResponse.json(body, init);
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive, nosnippet");
  return response;
}

function getRecord(post: BskyPostView) {
  if (!post.record || typeof post.record !== "object") return null;
  const record = post.record as Record<string, unknown>;
  const text = typeof record.text === "string" ? record.text.trim() : "";
  const createdAt = typeof record.createdAt === "string" ? record.createdAt : "";
  if (!text || !createdAt) return null;
  return { text, createdAt };
}

function normalizeText(value: string, max = 420) {
  const cleaned = value.replace(/\s+/g, " ").trim();
  return cleaned.length > max ? `${cleaned.slice(0, max - 1).trimEnd()}…` : cleaned;
}

function getPostUrl(post: BskyPostView) {
  const handle = post.author?.handle;
  const uriParts = post.uri?.split("/") ?? [];
  const postKey = uriParts.at(-1);
  if (!handle || !postKey) return null;
  return `https://bsky.app/profile/${encodeURIComponent(handle)}/post/${encodeURIComponent(postKey)}`;
}

function getRecency(createdAt: string) {
  const ageMs = Date.now() - new Date(createdAt).getTime();
  if (!Number.isFinite(ageMs) || ageMs < 0 || ageMs > MAX_POST_AGE_MS) return null;
  if (ageMs <= 15 * 60 * 1000) return { points: 14, label: "Posted within the last 15 minutes" };
  if (ageMs <= 60 * 60 * 1000) return { points: 11, label: "Posted within the last hour" };
  if (ageMs <= 6 * 60 * 60 * 1000) return { points: 7, label: "Posted within the last six hours" };
  if (ageMs <= 24 * 60 * 60 * 1000) return { points: 3, label: "Posted within the last day" };
  return { points: 0, label: "Posted within the last two days" };
}

function buildPitch(text: string) {
  const projectAngle = /redesign|rebuild|redo/i.test(text)
    ? "rebuilding the site"
    : /launch|opening|new business|startup/i.test(text)
      ? "getting the site launched"
      : "the website help you mentioned";
  return `Saw your Bluesky post about ${projectAngle}. I build practical, conversion-focused sites and can send a concise scope with a fixed-price route based on what you actually need. No hard sell—just a clear plan you can compare.`;
}

function qualifyPost(post: BskyPostView, config: (typeof searchConfigs)[number]): QualifiedLead | null {
  const record = getRecord(post);
  const sourceUrl = getPostUrl(post);
  const uri = post.uri;
  if (!record || !sourceUrl || !uri) return null;
  if (!config.match.test(record.text) || selfPromotionPattern.test(record.text)) return null;
  const recency = getRecency(record.createdAt);
  if (!recency) return null;

  let score = config.baseScore + recency.points;
  const signals = [`Explicit public phrase matched: “${config.query}”`, recency.label];
  const risks: string[] = [];
  const tags = ["Bluesky", config.tag, "public intent"];

  if (businessPattern.test(record.text)) { score += 4; signals.push("Post includes a business or organization context"); tags.push("business context"); }
  else risks.push("Business context and ability to pay are not yet confirmed");
  if (urgencyPattern.test(record.text)) { score += 4; signals.push("Post includes a launch, deadline, or urgency signal"); tags.push("time-sensitive"); }
  if (paidPattern.test(record.text)) { score += 5; signals.push("Post includes a hiring, budget, quote, or paid-work signal"); tags.push("commercial intent"); }
  if (exploratoryPattern.test(record.text)) { score -= 12; risks.push("Language suggests the need may be exploratory rather than immediate"); }

  const replyCount = Number(post.replyCount ?? 0);
  if (replyCount >= 12) risks.push("The post is already attracting substantial reply competition");
  else if (replyCount >= 4) risks.push("Other providers may already be responding");

  score = Math.max(0, Math.min(97, score));
  if (score < MINIMUM_SCORE) return null;
  const handle = post.author?.handle || "unknown-handle";
  const displayName = post.author?.displayName?.trim() || `@${handle}`;
  const priority: LeadPriority = score >= 85 ? "hot" : score >= 70 ? "strong" : "watch";

  return {
    source_key: uri, source_url: sourceUrl, source_published_at: record.createdAt, company_name: displayName,
    contact_name: post.author?.displayName?.trim() || null, contact_url: sourceUrl, location: "Location not confirmed",
    industry: "Unclassified", summary: normalizeText(record.text), score, priority, signals, risks, tags,
    pitch: buildPitch(record.text),
    raw_payload: { uri, cid: post.cid ?? null, authorDid: post.author?.did ?? null, authorHandle: handle, replyCount,
      repostCount: Number(post.repostCount ?? 0), likeCount: Number(post.likeCount ?? 0), quoteCount: Number(post.quoteCount ?? 0), matchedQuery: config.query },
  };
}

async function searchBluesky(config: (typeof searchConfigs)[number]) {
  const url = new URL("https://api.bsky.app/xrpc/app.bsky.feed.searchPosts");
  url.searchParams.set("q", config.query);
  url.searchParams.set("sort", "latest");
  url.searchParams.set("limit", "50");
  const response = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": "Rukh-Leads/0.1 (hello@rukhlabs.com)" },
    cache: "no-store",
    signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) {
    const detail = normalizeText(await response.text().catch(() => ""), 180);
    throw new Error(`Bluesky search failed for “${config.query}” with ${response.status}${detail ? `: ${detail}` : "."}`);
  }
  const payload = (await response.json()) as BskySearchResponse;
  return (payload.posts ?? []).map((post) => qualifyPost(post, config)).filter((lead): lead is QualifiedLead => Boolean(lead));
}

async function mapWithConcurrency<T, R>(values: readonly T[], concurrency: number, worker: (value: T) => Promise<R>) {
  const results = new Array<R>(values.length);
  let nextIndex = 0;
  async function runWorker() {
    while (nextIndex < values.length) { const index = nextIndex; nextIndex += 1; results[index] = await worker(values[index]); }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, values.length) }, () => runWorker()));
  return results;
}

async function recordRunStart(runId: string) {
  await leadNeonQuery(`INSERT INTO public.lead_collector_runs (id, source_id, status) VALUES ($1::uuid, $2, 'running')`, [runId, SOURCE_ID]);
}

async function recordRunSuccess(runId: string, seen: number, stored: number) {
  await Promise.all([
    leadNeonQuery(`UPDATE public.lead_collector_runs SET status = 'success', completed_at = now(), items_seen = $2::int, items_upserted = $3::int WHERE id = $1::uuid`, [runId, String(seen), String(stored)]),
    leadNeonQuery(`UPDATE public.lead_source_state SET status = 'ready', last_run_at = now(), last_success_at = now(), last_items = $2::int, last_error = NULL, updated_at = now() WHERE source_id = $1`, [SOURCE_ID, String(stored)]),
  ]);
}

async function recordRunFailure(runId: string, error: unknown) {
  const message = error instanceof Error ? error.message.slice(0, 900) : "Unknown collector error";
  await Promise.allSettled([
    leadNeonQuery(`UPDATE public.lead_collector_runs SET status = 'error', completed_at = now(), error_message = $2 WHERE id = $1::uuid`, [runId, message]),
    leadNeonQuery(`UPDATE public.lead_source_state SET status = 'error', last_run_at = now(), last_error = $2, updated_at = now() WHERE source_id = $1`, [SOURCE_ID, message]),
  ]);
}

async function upsertLeads(leads: QualifiedLead[]) {
  if (!leads.length) return 0;
  const result = await leadNeonQuery(
    `WITH incoming AS (
       SELECT * FROM jsonb_to_recordset($1::jsonb) AS item(
         source_key text, source_url text, source_published_at timestamptz, company_name text, contact_name text,
         contact_url text, location text, industry text, summary text, score smallint, priority text,
         signals jsonb, risks jsonb, tags jsonb, pitch text, raw_payload jsonb
       )
     )
     INSERT INTO public.lead_opportunities AS existing (
       source, source_key, source_url, source_published_at, company_name, contact_name, contact_url, location, industry,
       summary, score, priority, signals, risks, tags, pitch, raw_payload, last_checked_at
     )
     SELECT 'intent', source_key, source_url, source_published_at, company_name, contact_name, contact_url, location, industry,
       summary, score, priority, signals, risks, tags, pitch, raw_payload, now() FROM incoming
     ON CONFLICT (source, source_key) DO UPDATE SET
       source_url = EXCLUDED.source_url, source_published_at = EXCLUDED.source_published_at, updated_at = now(),
       company_name = EXCLUDED.company_name, contact_name = EXCLUDED.contact_name, contact_url = EXCLUDED.contact_url,
       summary = EXCLUDED.summary, score = GREATEST(existing.score, EXCLUDED.score),
       priority = CASE WHEN GREATEST(existing.score, EXCLUDED.score) >= 85 THEN 'hot' WHEN GREATEST(existing.score, EXCLUDED.score) >= 70 THEN 'strong' ELSE 'watch' END,
       signals = EXCLUDED.signals, risks = EXCLUDED.risks, tags = EXCLUDED.tags, pitch = EXCLUDED.pitch,
       raw_payload = EXCLUDED.raw_payload, last_checked_at = now()
     RETURNING id::text`,
    [JSON.stringify(leads)],
  );
  return result.rows?.length ?? result.rowCount ?? 0;
}

export async function GET(request: NextRequest) {
  if (!hasValidCronAuth(request) && !hasValidBasicAuth(request)) return privateJson({ error: "Collector authentication failed." }, { status: 401 });
  const runId = crypto.randomUUID();
  const startedAt = Date.now();
  try {
    await recordRunStart(runId);
    const batches = await mapWithConcurrency(searchConfigs, 3, searchBluesky);
    const seen = batches.reduce((total, batch) => total + batch.length, 0);
    const deduplicated = new Map<string, QualifiedLead>();
    for (const lead of batches.flat()) {
      const existing = deduplicated.get(lead.source_key);
      if (!existing) { deduplicated.set(lead.source_key, lead); continue; }
      const mergedScore = Math.max(existing.score, lead.score);
      deduplicated.set(lead.source_key, { ...existing, score: mergedScore,
        priority: mergedScore >= 85 ? "hot" : mergedScore >= 70 ? "strong" : "watch",
        signals: Array.from(new Set([...existing.signals, ...lead.signals])), risks: Array.from(new Set([...existing.risks, ...lead.risks])),
        tags: Array.from(new Set([...existing.tags, ...lead.tags])) });
    }
    const qualified = Array.from(deduplicated.values()).sort((a, b) => b.score - a.score);
    const stored = await upsertLeads(qualified);
    await recordRunSuccess(runId, seen, stored);
    return privateJson({ ok: true, source: SOURCE_ID, queries: searchConfigs.length, matched: seen, qualified: qualified.length, stored, durationMs: Date.now() - startedAt });
  } catch (error) {
    console.error("Rukh Leads Bluesky collector failed", error);
    await recordRunFailure(runId, error);
    return privateJson({ error: error instanceof Error ? error.message : "The Bluesky collector failed.", runId }, { status: 503 });
  }
}
