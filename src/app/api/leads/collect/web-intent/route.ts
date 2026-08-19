import { NextRequest, NextResponse } from "next/server";
import { hasValidBasicAuth, hasValidCronAuth } from "@/lib/leads/auth";
import { leadNeonQuery } from "@/lib/leads/neon";
import { BRAVE_MONTHLY_REQUEST_LIMIT, reserveMonthlyApiUsage } from "@/lib/leads/api-budget";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SOURCE_ID = "web-intent";

const searchConfigs = [
  { query: '"looking for a web designer"', score: 88, tag: "designer request" },
  { query: '"need a web designer"', score: 90, tag: "designer request" },
  { query: '"recommend a web designer"', score: 88, tag: "recommendation request" },
  { query: '"looking for a web developer"', score: 86, tag: "developer request" },
  { query: '"need a web developer"', score: 88, tag: "developer request" },
  { query: '"who can build me a website"', score: 92, tag: "build request" },
  { query: '"need a website" business', score: 82, tag: "website need" },
  { query: '"website redesign" "looking for"', score: 80, tag: "redesign" },
] as const;

const intentPattern = /\b(looking for|need|seeking|recommend|recommendation|who can|want someone|could use help|trying to find|anyone know)\b.{0,90}\b(web(?:site)?\s*(?:designer|developer)|website|site redesign|website redesign|web design|website design|web development)\b|\b(web(?:site)?\s*(?:designer|developer)|website|site redesign|website redesign|web design|website design|web development)\b.{0,90}\b(looking for|need|seeking|recommend|recommendation|who can|want someone|could use help|trying to find|anyone know)\b/i;
const prospectPattern = /\b(?:i|we|our business|my business|our company|my company|our nonprofit|my nonprofit|our organization|my organization|our shop|my shop)\b.{0,90}\b(?:need|needs|want|looking for|seeking|could use|trying to find)\b.{0,100}\b(?:website|web designer|website designer|web developer|website developer|site redesign|website redesign|web design|web development)\b|\b(?:looking for|seeking|trying to find|need|want)\b.{0,55}\b(?:someone|a freelancer|an agency|a designer|a developer)\b.{0,90}\b(?:website|web design|website design|web development|website development|redesign)\b|\b(?:can anyone|anyone know|recommend|recommendation|who can|who could)\b.{0,100}\b(?:web designer|website designer|web developer|website developer|website|build (?:me|us|our business)? ?(?:a )?website)\b/i;
const promoPattern = /\b(i am|i'm|we are|available for|hire me|my services|our services|portfolio|freelance web designer|web design agency|book a call|request a quote from us)\b/i;
const editorialPattern = /\b(resume|résumé|curriculum vitae|\bcv\b|template|examples?|guide|how to|tutorial|blog post|article|case study|definitive answer|best web|top web|top \d+|web design companies|web design agencies|agency directory|marketplace|salary|career|interview|job hunting|job board|job listing|vacanc(?:y|ies)|apply now|hiring manager)\b/i;
const employmentPattern = /\b(full[- ]time|part[- ]time|contract role|job|jobs|position|candidate|applicant|employment|salary|benefits|join our team|apply for|apply now|careers?|working with (?:a |our )?team|engineers?, testers?|project managers?|system administrators?)\b/i;
const blockedPathPattern = /\/(?:blog|blogs|article|articles|guides?|resources?|resume|resumes|careers?|jobs?|job|agency|agencies|companies)(?:\/|$)/i;
const blockedHosts = new Set([
  "resume.io",
  "designrush.com",
  "clutch.co",
  "goodfirms.co",
  "upcity.com",
  "theuxjobs.com",
  "indeed.com",
  "glassdoor.com",
  "ziprecruiter.com",
]);

type BraveResult = {
  title?: string;
  url?: string;
  description?: string;
  age?: string;
  page_age?: string;
};

type BravePayload = {
  web?: { results?: BraveResult[] };
};

type Candidate = {
  source_key: string;
  source_url: string;
  company_name: string;
  summary: string;
  score: number;
  priority: "hot" | "strong" | "watch";
  signals: string[];
  risks: string[];
  tags: string[];
  pitch: string;
  raw_payload: Record<string, unknown>;
};

function privateJson(body: unknown, init?: ResponseInit) {
  const response = NextResponse.json(body, init);
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive, nosnippet");
  return response;
}

function decodeSnippet(value: string) {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/&#x27;|&#39;|&apos;/gi, "'")
    .replace(/&quot;|&#34;/gi, '"')
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&nbsp;/gi, " ");
}

function normalize(value: string, max = 500) {
  const cleaned = decodeSnippet(value).replace(/\s+/g, " ").trim();
  return cleaned.length > max ? `${cleaned.slice(0, max - 1).trimEnd()}…` : cleaned;
}

function hostname(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "public-web";
  }
}

function isBlockedUrl(url: string) {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "").toLowerCase();
    if (blockedHosts.has(host)) return true;
    if (blockedPathPattern.test(parsed.pathname)) return true;
    return false;
  } catch {
    return true;
  }
}

async function braveSearch(apiKey: string, config: (typeof searchConfigs)[number]) {
  const url = new URL("https://api.search.brave.com/res/v1/web/search");
  url.searchParams.set("q", config.query);
  url.searchParams.set("count", "20");
  url.searchParams.set("country", "us");
  url.searchParams.set("search_lang", "en");
  url.searchParams.set("freshness", "pw");
  url.searchParams.set("safesearch", "moderate");

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "Accept-Encoding": "gzip",
      "X-Subscription-Token": apiKey,
    },
    cache: "no-store",
    signal: AbortSignal.timeout(12_000),
  });

  if (!response.ok) {
    const detail = normalize(await response.text().catch(() => ""), 180);
    throw new Error(`Brave Search returned ${response.status}${detail ? `: ${detail}` : ""}`);
  }

  const payload = (await response.json()) as BravePayload;
  return payload.web?.results ?? [];
}

function qualify(result: BraveResult, config: (typeof searchConfigs)[number]): Candidate | null {
  const url = result.url?.trim();
  if (!url || !/^https?:\/\//i.test(url) || isBlockedUrl(url)) return null;

  const title = normalize(result.title || hostname(url), 180);
  const description = normalize(result.description || "", 500);
  const combined = `${title} ${description}`;

  if (!intentPattern.test(combined)) return null;
  if (!prospectPattern.test(combined)) return null;
  if (promoPattern.test(combined) || editorialPattern.test(combined) || employmentPattern.test(combined)) return null;

  let score: number = config.score;
  const signals = [
    `Fresh public-web result matched ${config.query}`,
    "Language looks like a first-person or organization request rather than editorial content",
  ];
  const risks = ["Business identity and budget may still need verification"];

  if (/\b(business|company|startup|shop|store|restaurant|nonprofit|organization|practice|studio|brand|launch|opening)\b/i.test(combined)) {
    score += 4;
    signals.push("Business or organization context detected");
  }
  if (/\b(asap|urgent|urgently|this week|this month|launch|opening|deadline)\b/i.test(combined)) {
    score += 4;
    signals.push("Urgency or launch timing detected");
  }
  if (/\b(paid|budget|quote|estimate|proposal|freelancer|contractor)\b/i.test(combined)) {
    score += 4;
    signals.push("Commercial intent detected");
  }
  score = Math.min(97, score);

  return {
    source_key: `web:${url}`,
    source_url: url,
    company_name: title || hostname(url),
    summary: description || title,
    score,
    priority: score >= 85 ? "hot" : score >= 70 ? "strong" : "watch",
    signals,
    risks,
    tags: ["public web", config.tag, hostname(url)],
    pitch: "I came across your public request for website help. I build practical small-business sites and can send a concise scope and fixed-price route based on what you actually need.",
    raw_payload: {
      matchedQuery: config.query,
      resultAge: result.age ?? result.page_age ?? null,
      sourceHost: hostname(url),
    },
  };
}

async function recordFailure(message: string) {
  await leadNeonQuery(
    `UPDATE public.lead_source_state
     SET status = 'error', last_run_at = now(), last_error = $2, updated_at = now()
     WHERE source_id = $1`,
    [SOURCE_ID, message.slice(0, 900)],
  ).catch(() => undefined);
}

export async function GET(request: NextRequest) {
  if (!hasValidCronAuth(request) && !hasValidBasicAuth(request)) {
    return privateJson({ error: "Collector authentication failed." }, { status: 401 });
  }

  const apiKey = process.env.BRAVE_SEARCH_API_KEY?.trim();
  if (!apiKey) {
    const message = "BRAVE_SEARCH_API_KEY is not configured.";
    await leadNeonQuery(
      `UPDATE public.lead_source_state
       SET status = 'needs-setup', last_error = $2, updated_at = now()
       WHERE source_id = $1`,
      [SOURCE_ID, message],
    ).catch(() => undefined);
    return privateJson({ error: message, source: SOURCE_ID }, { status: 428 });
  }

  const budget = await reserveMonthlyApiUsage(
    "brave-search",
    searchConfigs.length,
    BRAVE_MONTHLY_REQUEST_LIMIT,
  );
  if (!budget.allowed) {
    const message = `Monthly Brave Search budget reached (${budget.limit} requests).`;
    await leadNeonQuery(
      `UPDATE public.lead_source_state SET status = 'ready', last_run_at = now(), last_error = $2, updated_at = now() WHERE source_id = $1`,
      [SOURCE_ID, message],
    ).catch(() => undefined);
    return privateJson({ error: message, source: SOURCE_ID, budget }, { status: 429 });
  }

  const runId = crypto.randomUUID();
  try {
    await leadNeonQuery(
      `INSERT INTO public.lead_collector_runs (id, source_id, status) VALUES ($1::uuid, $2, 'running')`,
      [runId, SOURCE_ID],
    );

    const batches = await Promise.all(
      searchConfigs.map(async (config) => ({ config, results: await braveSearch(apiKey, config) })),
    );
    const seen = batches.reduce((total, batch) => total + batch.results.length, 0);
    const candidates = new Map<string, Candidate>();

    for (const { config, results } of batches) {
      for (const result of results) {
        const candidate = qualify(result, config);
        if (!candidate) continue;
        const existing = candidates.get(candidate.source_key);
        if (!existing || candidate.score > existing.score) candidates.set(candidate.source_key, candidate);
      }
    }

    const rows = Array.from(candidates.values());
    let stored = 0;
    if (rows.length) {
      const result = await leadNeonQuery(
        `WITH incoming AS (
           SELECT * FROM jsonb_to_recordset($1::jsonb) AS item(
             source_key text, source_url text, company_name text, summary text, score smallint, priority text,
             signals jsonb, risks jsonb, tags jsonb, pitch text, raw_payload jsonb
           )
         )
         INSERT INTO public.lead_opportunities AS existing (
           source, source_key, source_url, company_name, location, industry, summary, score, priority,
           signals, risks, tags, pitch, raw_payload, last_checked_at
         )
         SELECT
           'intent', source_key, source_url, company_name, 'Location not confirmed', 'Unclassified', summary,
           score, priority, signals, risks, tags, pitch, raw_payload, now()
         FROM incoming
         ON CONFLICT (source, source_key) DO UPDATE SET
           source_url = EXCLUDED.source_url,
           company_name = EXCLUDED.company_name,
           summary = EXCLUDED.summary,
           score = GREATEST(existing.score, EXCLUDED.score),
           priority = CASE WHEN GREATEST(existing.score, EXCLUDED.score) >= 85 THEN 'hot' WHEN GREATEST(existing.score, EXCLUDED.score) >= 70 THEN 'strong' ELSE 'watch' END,
           signals = EXCLUDED.signals,
           risks = EXCLUDED.risks,
           tags = EXCLUDED.tags,
           pitch = EXCLUDED.pitch,
           raw_payload = EXCLUDED.raw_payload,
           last_checked_at = now(),
           updated_at = now()
         RETURNING id::text`,
        [JSON.stringify(rows)],
      );
      stored = result.rows?.length ?? result.rowCount ?? 0;
    }

    await Promise.all([
      leadNeonQuery(
        `UPDATE public.lead_collector_runs
         SET status = 'success', completed_at = now(), items_seen = $2::int, items_upserted = $3::int
         WHERE id = $1::uuid`,
        [runId, String(seen), String(stored)],
      ),
      leadNeonQuery(
        `UPDATE public.lead_source_state
         SET status = 'ready', last_run_at = now(), last_success_at = now(), last_items = $2::int,
             last_error = NULL, updated_at = now()
         WHERE source_id = $1`,
        [SOURCE_ID, String(stored)],
      ),
    ]);

    return privateJson({ ok: true, source: SOURCE_ID, seen, qualified: rows.length, stored });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Public web collector failed.";
    await Promise.allSettled([
      leadNeonQuery(
        `UPDATE public.lead_collector_runs SET status = 'error', completed_at = now(), error_message = $2 WHERE id = $1::uuid`,
        [runId, message.slice(0, 900)],
      ),
      recordFailure(message),
    ]);
    return privateJson({ error: message, source: SOURCE_ID }, { status: 503 });
  }
}
