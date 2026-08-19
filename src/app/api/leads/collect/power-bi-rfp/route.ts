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
import { upsertPowerBiGigs } from "@/lib/leads/power-bi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SOURCE_ID = "power-bi-rfp";
const QUERY =
  '("Power BI" OR "Microsoft Fabric" OR "business intelligence" OR "data visualization" OR "analytics dashboard") (RFP OR RFQ OR solicitation OR "request for proposal" OR "request for qualifications" OR "bid opportunity") -training -course -jobs';

const relevantPattern =
  /\b(?:power\s*bi|microsoft fabric|business intelligence|data visualization|analytics dashboard|reporting dashboard|dashboard development|data analytics)\b/i;
const procurementPattern =
  /\b(?:rfp|rfq|request for proposals?|request for qualifications?|solicitation|bid opportunity|invitation to bid|procurement notice|call for proposals?)\b/i;
const falsePositivePattern =
  /\b(?:sample rfp|rfp template|how to write|guide|blog|article|training course|curriculum|job opening|career|award announcement|contract awarded)\b/i;

type BraveResult = { title?: string; url?: string; description?: string; age?: string; page_age?: string };
type BravePayload = { web?: { results?: BraveResult[] } };

function hostOf(value: string) {
  try { return new URL(value).hostname.replace(/^www\./i, "").toLowerCase(); } catch { return ""; }
}

function extractEmail(value: string) {
  return value.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0]?.toLowerCase();
}

function qualify(result: BraveResult) {
  const sourceUrl = result.url?.trim();
  if (!sourceUrl || !/^https?:\/\//i.test(sourceUrl)) return null;
  const title = cleanText(result.title, 320);
  const description = cleanText(result.description, 1000);
  const combined = `${title} ${description}`;
  if (!relevantPattern.test(combined) || !procurementPattern.test(combined) || falsePositivePattern.test(combined)) return null;
  const host = hostOf(sourceUrl);
  if (!host) return null;

  let score = 90;
  const signals = [
    "Public RFP/RFQ/solicitation references Power BI, Fabric, BI, data visualization, or analytics dashboards",
    "This is a proactive procurement opportunity rather than a saturated general job-board listing",
  ];
  if (/\.(?:gov|edu)$/i.test(host) || /\b(?:city|county|state|school|university|authority|district)\b/i.test(combined)) {
    score += 4;
    signals.push("Government or education procurement context was detected");
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
    sourceKey: `power-bi:rfp:${sourceUrl}`,
    sourceUrl,
    companyName: title || `Power BI procurement opportunity on ${host}`,
    summary: description || "Public Power BI / analytics procurement opportunity. Open the source for the complete scope and submission instructions.",
    score,
    signals,
    risks: [
      "Confirm the submission deadline, geographic restrictions, insurance requirements, and vendor eligibility before investing proposal time",
      "Formal procurement work may have a longer sales cycle than direct freelance gigs",
    ],
    tags: ["power-bi", "rfp", "procurement", "proactive opportunity", host],
    pitch: "I found your public Power BI / analytics procurement notice and would like to review the scope, timeline and submission format. I work hands-on with Power BI, DAX, Power Query, data modeling and Microsoft Fabric, and can provide a concise requirements-mapped proposal where the project is a fit.",
    contactEmail: email,
    contactUrl: sourceUrl,
    rawPayload: {
      sourceHost: host,
      resultAge: result.age ?? result.page_age ?? null,
      matchedQuery: QUERY,
    },
  };
}

export async function GET(request: NextRequest) {
  if (!hasValidCronAuth(request) && !hasValidBasicAuth(request)) {
    return privateJson({ error: "Collector authentication failed." }, { status: 401 });
  }
  const apiKey = process.env.BRAVE_SEARCH_API_KEY?.trim();
  if (!apiKey) {
    return privateJson({ error: "BRAVE_SEARCH_API_KEY is not configured.", source: SOURCE_ID }, { status: 428 });
  }
  const budget = await reserveMonthlyApiUsage("brave-search", 1, BRAVE_MONTHLY_REQUEST_LIMIT);
  if (!budget.allowed) {
    return privateJson({ error: "Monthly Brave Search budget reached.", source: SOURCE_ID, budget }, { status: 429 });
  }

  const runId = await beginCollectorRun(SOURCE_ID);
  try {
    const url = new URL("https://api.search.brave.com/res/v1/web/search");
    url.searchParams.set("q", QUERY);
    url.searchParams.set("count", "20");
    url.searchParams.set("country", "us");
    url.searchParams.set("search_lang", "en");
    url.searchParams.set("freshness", "pm");
    url.searchParams.set("safesearch", "moderate");
    const response = await fetch(url, {
      headers: { Accept: "application/json", "Accept-Encoding": "gzip", "X-Subscription-Token": apiKey },
      cache: "no-store",
      signal: AbortSignal.timeout(12_000),
    });
    if (!response.ok) throw new Error(`Brave Power BI RFP search returned ${response.status}.`);
    const payload = (await response.json()) as BravePayload;
    const results = payload.web?.results ?? [];
    const rows = Array.from(
      new Map(
        results.flatMap((result) => {
          const gig = qualify(result);
          return gig ? [[gig.sourceKey, gig] as const] : [];
        }),
      ).values(),
    );
    const stored = await upsertPowerBiGigs(rows);
    await completeCollectorRun(runId, SOURCE_ID, results.length, stored, {
      braveBudgetUsed: budget.used,
      braveBudgetLimit: budget.limit,
    });
    return privateJson({ ok: true, source: SOURCE_ID, seen: results.length, qualified: rows.length, stored, budget });
  } catch (error) {
    const message = await failCollectorRun(runId, SOURCE_ID, error);
    return privateJson({ error: message, source: SOURCE_ID }, { status: 503 });
  }
}
