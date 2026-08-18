import { NextRequest, NextResponse } from "next/server";
import { hasValidBasicAuth, hasValidCronAuth } from "@/lib/leads/auth";
import { leadNeonQuery } from "@/lib/leads/neon";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SOURCE_ID = "web-intent";

const searchConfigs = [
  { query: '"looking for a web designer"', score: 88, tag: "designer request" },
  { query: '"need a web designer"', score: 90, tag: "designer request" },
  { query: '"looking for a web developer"', score: 86, tag: "developer request" },
  { query: '"need a web developer"', score: 88, tag: "developer request" },
  { query: '"who can build me a website"', score: 92, tag: "build request" },
  { query: '"need a website" business', score: 82, tag: "website need" },
  { query: '"website redesign" "looking for"', score: 80, tag: "redesign" },
] as const;

const intentPattern = /\b(looking for|need|seeking|recommend|recommendation|who can|hiring|want someone|could use help)\b.{0,80}\b(web(?:site)?\s*(?:designer|developer)|website|site redesign|website redesign)\b|\b(web(?:site)?\s*(?:designer|developer)|website|site redesign|website redesign)\b.{0,80}\b(looking for|need|seeking|recommend|recommendation|who can|hiring|want someone|could use help)\b/i;
const promoPattern = /\b(i am|i'm|we are|available for|hire me|my services|our services|portfolio|freelance web designer|web design agency)\b/i;

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

function normalize(value: string, max = 500) {
  const cleaned = value.replace(/\s+/g, " ").trim();
  return cleaned.length > max ? `${cleaned.slice(0, max - 1).trimEnd()}…` : cleaned;
}

function hostname(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "Public web";
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
  if (!url || !/^https?:\/\//i.test(url)) return null;

  const title = normalize(result.title || hostname(url), 180);
  const description = normalize(result.description || "", 500);
  const combined = `${title} ${description}`;
  if (!intentPattern.test(combined) || promoPattern.test(combined)) return null;

  let score: number = config.score;
  const signals = [`Fresh public-web result matched ${config.query}`];
  const risks = ["Business identity and budget may still need verification"];
  if (/\b(asap|urgent|this week|launch|opening|deadline)\b/i.test(combined)) {
    score += 4;
    signals.push("Urgency or launch timing detected");
  }
  if (/\b(paid|budget|hire|hiring|quote|estimate|proposal)\b/i.test(combined)) {
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
    pitch: "I came across your public post/request about website help. I build practical small-business sites and can send a concise scope and fixed-price route based on what you actually need.",
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

  const runId = crypto.randomUUID();
  try {
    await leadNeonQuery(
      `INSERT INTO public.lead_collector_runs (id, source_id, status) VALUES ($1::uuid, $2, 'running')`,
      [runId, SOURCE_ID],
    );

    const batches = await Promise.all(searchConfigs.map(async (config) => ({ config, results: await braveSearch(apiKey, config) })));
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
