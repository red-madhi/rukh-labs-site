import type { NextRequest } from "next/server";
import { hasValidBasicAuth, hasValidCronAuth } from "@/lib/leads/auth";
import {
  beginCollectorRun,
  clamp,
  cleanText,
  completeCollectorRun,
  failCollectorRun,
  privateJson,
} from "@/lib/leads/crawl";
import {
  BRAVE_MONTHLY_REQUEST_LIMIT,
  reserveMonthlyApiUsage,
} from "@/lib/leads/api-budget";
import { upsertIntentOpportunities } from "@/lib/leads/intent-opportunities";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SOURCE_ID = "procurement-rfp";
const searches = [
  '(("website redesign" OR "web design") (RFP OR "request for proposals"))',
  '(("website development" OR "web development services") (solicitation OR RFP OR bid))',
  '(("website redesign" OR "website development") (RFQ OR "request for qualifications"))',
  '((website AND "digital services") (RFP OR procurement OR solicitation))',
] as const;

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

const websitePattern =
  /\b(?:website|web site|web design|website design|website redesign|web development|website development|digital experience|content management system|cms implementation)\b/i;
const procurementPattern =
  /\b(?:rfp|rfq|request for proposals?|request for qualifications?|solicitation|invitation to bid|call for proposals?|procurement notice|bid opportunity)\b/i;
const excludePattern =
  /\b(?:template|sample rfp|example rfp|how to write|guide to|blog|article|top agencies|best web design|resume|career|job opening|apply now|award announcement|contract awarded)\b/i;

function hostOf(value: string) {
  try {
    return new URL(value).hostname.replace(/^www\./i, "").toLowerCase();
  } catch {
    return "";
  }
}

function extractEmail(value: string) {
  const match = value.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return match?.[0]?.toLowerCase();
}

async function braveSearch(apiKey: string, query: string) {
  const url = new URL("https://api.search.brave.com/res/v1/web/search");
  url.searchParams.set("q", query);
  url.searchParams.set("count", "20");
  url.searchParams.set("country", "us");
  url.searchParams.set("search_lang", "en");
  url.searchParams.set("freshness", "pm");
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
    const detail = cleanText(await response.text().catch(() => ""), 180);
    throw new Error(
      `Brave procurement search returned ${response.status}${detail ? `: ${detail}` : ""}`,
    );
  }

  const payload = (await response.json()) as BravePayload;
  return payload.web?.results ?? [];
}

function qualify(result: BraveResult, query: string) {
  const sourceUrl = result.url?.trim();
  if (!sourceUrl || !/^https?:\/\//i.test(sourceUrl)) return null;

  const title = cleanText(result.title, 260);
  const description = cleanText(result.description, 900);
  const combined = `${title} ${description}`;
  if (!websitePattern.test(combined) || !procurementPattern.test(combined)) return null;
  if (excludePattern.test(combined)) return null;

  const host = hostOf(sourceUrl);
  if (!host) return null;

  let score = 89;
  const signals = [
    "Public procurement result explicitly references website or web-development work",
    "RFP, RFQ, solicitation, or bid language was detected",
  ];
  const risks = [
    "Confirm the submission deadline, geographic restrictions, insurance requirements, and vendor eligibility before investing time",
    "Formal procurement opportunities may have a longer sales cycle than ordinary small-business outreach",
  ];

  if (/\.(?:gov|edu)$/i.test(host) || /(?:gov|county|city|state|school|university)/i.test(host)) {
    score += 4;
    signals.push("The source appears to be a government or education organization");
  }
  if (/\b(?:deadline|due date|proposals? due|responses? due|closing date)\b/i.test(combined)) {
    score += 3;
    signals.push("A submission deadline was referenced");
  }
  const email = extractEmail(combined);
  if (email) {
    score += 2;
    signals.push("A public procurement contact email was surfaced");
  }
  score = clamp(score, 0, 98);

  return {
    sourceKey: `procurement:${sourceUrl}`,
    sourceUrl,
    companyName: title || `Website procurement opportunity on ${host}`,
    summary: description || "Public website procurement opportunity. Open the source for the complete scope and submission instructions.",
    score,
    signals,
    risks,
    tags: ["procurement", "website rfp", host],
    pitch:
      "I found your public website procurement notice and would like to review the scope, timeline, and required submission format. Rukh Labs builds practical, maintainable websites and can provide a clear fixed-scope proposal where the requirements are a fit.",
    contactEmail: email,
    contactUrl: sourceUrl,
    industry: "Public procurement",
    rawPayload: {
      matchedQuery: query,
      resultAge: result.age ?? result.page_age ?? null,
      sourceHost: host,
    },
  };
}

export async function GET(request: NextRequest) {
  if (!hasValidCronAuth(request) && !hasValidBasicAuth(request)) {
    return privateJson({ error: "Collector authentication failed." }, { status: 401 });
  }

  const apiKey = process.env.BRAVE_SEARCH_API_KEY?.trim();
  if (!apiKey) {
    return privateJson(
      { error: "BRAVE_SEARCH_API_KEY is not configured.", source: SOURCE_ID },
      { status: 428 },
    );
  }

  const budget = await reserveMonthlyApiUsage(
    "brave-search",
    searches.length,
    BRAVE_MONTHLY_REQUEST_LIMIT,
  );
  if (!budget.allowed) {
    return privateJson(
      {
        error: `Monthly Brave Search budget reached (${budget.limit} requests).`,
        source: SOURCE_ID,
        budget,
      },
      { status: 429 },
    );
  }

  const runId = await beginCollectorRun(SOURCE_ID);
  try {
    const batches = await Promise.all(
      searches.map(async (query) => ({ query, results: await braveSearch(apiKey, query) })),
    );
    const seen = batches.reduce((total, batch) => total + batch.results.length, 0);
    const leads = new Map<string, NonNullable<ReturnType<typeof qualify>>>();

    for (const batch of batches) {
      for (const result of batch.results) {
        const lead = qualify(result, batch.query);
        if (!lead) continue;
        const current = leads.get(lead.sourceKey);
        if (!current || lead.score > current.score) leads.set(lead.sourceKey, lead);
      }
    }

    const rows = Array.from(leads.values());
    const stored = await upsertIntentOpportunities(rows);
    await completeCollectorRun(runId, SOURCE_ID, seen, stored, {
      braveBudgetUsed: budget.used,
      braveBudgetLimit: budget.limit,
    });

    return privateJson({
      ok: true,
      source: SOURCE_ID,
      seen,
      qualified: rows.length,
      stored,
      budget,
    });
  } catch (error) {
    const message = await failCollectorRun(runId, SOURCE_ID, error);
    return privateJson({ error: message, source: SOURCE_ID }, { status: 503 });
  }
}
