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

const SOURCE_ID = "power-bi-web";

const searches = [
  {
    label: "fresh public ask",
    query:
      '("Power BI" OR "Microsoft Fabric") ("need help" OR "looking for a consultant" OR "looking for a freelancer" OR "need a consultant" OR "seeking a consultant" OR "recommend a consultant") -jobs -careers',
  },
  {
    label: "fresh social post",
    query:
      '(site:linkedin.com/posts OR site:x.com) ("Power BI" OR "Microsoft Fabric") ("looking for" OR "need help" OR consultant OR freelancer OR contractor)',
  },
] as const;

type BraveResult = {
  title?: string;
  url?: string;
  description?: string;
  age?: string;
  page_age?: string;
};

type BravePayload = { web?: { results?: BraveResult[] } };

const blockedHosts = [
  "indeed.com",
  "glassdoor.com",
  "ziprecruiter.com",
  "monster.com",
  "dice.com",
  "careerbuilder.com",
  "simplyhired.com",
  "upwork.com",
  "fiverr.com",
  "freelancer.com",
  "guru.com",
  "peopleperhour.com",
  "toptal.com",
  "wellfound.com",
];

const jobBoardPattern =
  /\b(?:apply now|job opening|job posting|full[- ]time|part[- ]time|salary|benefits|recruiter|resume|candidate|careers?|vacancy|position available|w2|c2c|corp to corp|staffing agency|recruitment agency)\b/i;
const providerPattern =
  /\b(?:we provide power bi|our power bi services|hire our consultants|power bi consulting company|our consultants|book a consultation with us)\b/i;
const directAskPattern =
  /\b(?:need|looking for|seeking|recommend|recommendation|anyone know|who can|could use|want to hire|need to hire)\b.{0,130}\b(?:power bi|microsoft fabric|business intelligence|dashboard|dax|power query)\b|\b(?:power bi|microsoft fabric|business intelligence|dashboard|dax|power query)\b.{0,130}\b(?:help|consultant|freelancer|contractor|expert|specialist)\b/i;
const proactivePattern =
  /\b(?:migrat(?:e|ing|ion)|replace|rebuild|moderniz(?:e|ing|ation)|rolling out|implement(?:ing|ation)|moving from tableau|moving to power bi|fabric adoption|semantic model|dashboard overhaul|reporting overhaul)\b.{0,180}\b(?:power bi|microsoft fabric|business intelligence|dashboard|reporting|analytics)\b|\b(?:power bi|microsoft fabric)\b.{0,180}\b(?:migration|implementation|rollout|modernization|overhaul|rebuild)\b/i;
const paidPattern = /\b(?:paid|budget|quote|proposal|contract|contractor|freelance|consultant|consulting|project fee|hourly)\b/i;

function hostOf(value: string) {
  try {
    return new URL(value).hostname.replace(/^www\./i, "").toLowerCase();
  } catch {
    return "";
  }
}

function platformTag(value: string) {
  const host = hostOf(value);
  if (host === "linkedin.com") return "LinkedIn";
  if (host === "x.com" || host === "twitter.com") return "X";
  return "Public web";
}

function isBlocked(value: string, combined: string) {
  const host = hostOf(value);
  return (
    !host ||
    blockedHosts.some((blocked) => host === blocked || host.endsWith(`.${blocked}`)) ||
    /\/(?:jobs?|careers?|vacancies?|apply)(?:\/|$)/i.test(new URL(value).pathname) ||
    jobBoardPattern.test(combined) ||
    providerPattern.test(combined)
  );
}

async function braveSearch(apiKey: string, search: (typeof searches)[number]) {
  const url = new URL("https://api.search.brave.com/res/v1/web/search");
  url.searchParams.set("q", search.query);
  url.searchParams.set("count", "20");
  url.searchParams.set("country", "us");
  url.searchParams.set("search_lang", "en");
  url.searchParams.set("freshness", "pd");
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
    throw new Error(`Brave Power BI search returned ${response.status}.`);
  }
  const payload = (await response.json()) as BravePayload;
  return payload.web?.results ?? [];
}

function qualify(result: BraveResult, search: (typeof searches)[number]) {
  const sourceUrl = result.url?.trim();
  if (!sourceUrl || !/^https?:\/\//i.test(sourceUrl)) return null;
  const title = cleanText(result.title, 260);
  const description = cleanText(result.description, 900);
  const combined = `${title} ${description}`;
  if (isBlocked(sourceUrl, combined)) return null;

  const direct = directAskPattern.test(combined);
  const proactive = proactivePattern.test(combined);
  if (!direct && !proactive) return null;

  const platform = platformTag(sourceUrl);
  let score = direct ? 88 : 69;
  const signals = [
    direct
      ? "Fresh public text appears to request Power BI / Fabric help"
      : "Fresh public text suggests a Power BI / Fabric implementation or migration that may need outside help",
    `Discovered from ${platform} through a one-day freshness window`,
  ];
  const risks = [
    direct
      ? "Confirm the work is still open before replying"
      : "This is a proactive signal, not a confirmed request for a freelancer",
    "Normal job-board postings are intentionally excluded from this feed",
  ];

  if (paidPattern.test(combined)) {
    score += 5;
    signals.push("Commercial consulting, contract, budget, or proposal language was detected");
  }
  if (/\b(?:urgent|asap|immediately|this week|deadline|stuck|blocked)\b/i.test(combined)) {
    score += 4;
    signals.push("Urgency or an active blocker was detected");
  }
  if (/\b(?:tableau|qlik|excel|manual reporting|legacy reports?)\b/i.test(combined)) {
    score += 3;
    signals.push("A migration or legacy-reporting modernization angle was detected");
  }
  score = clamp(score, 0, 97);

  return {
    sourceKey: `power-bi-web:${sourceUrl}`,
    sourceUrl,
    companyName: title || `${platform} Power BI opportunity`,
    summary: description || title,
    score,
    signals,
    risks,
    tags: [
      "power-bi",
      direct ? "direct ask" : "proactive signal",
      platform.toLowerCase(),
      search.label,
      "extreme fresh",
    ],
    pitch: direct
      ? "I saw your public post about needing Power BI/Fabric help. I build and repair production Power BI models, DAX, Power Query, Fabric migrations, and executive dashboards. If the work is still open, I can quickly scope the problem and give you a practical fixed-scope or hourly option."
      : "I came across your public Power BI/Fabric migration or reporting-modernization signal. I work hands-on with Power BI, DAX, Power Query and Fabric, and can help with a focused migration, model cleanup, or dashboard build without turning it into a long consulting engagement.",
    contactUrl: sourceUrl,
    rawPayload: {
      matchedQuery: search.query,
      resultAge: result.age ?? result.page_age ?? null,
      platform,
      opportunityType: direct ? "direct" : "proactive",
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

  const budget = await reserveMonthlyApiUsage(
    "brave-search",
    searches.length,
    BRAVE_MONTHLY_REQUEST_LIMIT,
  );
  if (!budget.allowed) {
    return privateJson({ error: "Monthly Brave Search budget reached.", source: SOURCE_ID, budget }, { status: 429 });
  }

  const runId = await beginCollectorRun(SOURCE_ID);
  try {
    const batches = await Promise.all(
      searches.map(async (search) => ({ search, results: await braveSearch(apiKey, search) })),
    );
    const seen = batches.reduce((total, batch) => total + batch.results.length, 0);
    const deduped = new Map<string, NonNullable<ReturnType<typeof qualify>>>();
    for (const batch of batches) {
      for (const result of batch.results) {
        const gig = qualify(result, batch.search);
        if (!gig) continue;
        const current = deduped.get(gig.sourceKey);
        if (!current || gig.score > current.score) deduped.set(gig.sourceKey, gig);
      }
    }

    const gigs = Array.from(deduped.values());
    const stored = await upsertPowerBiGigs(gigs);
    await completeCollectorRun(runId, SOURCE_ID, seen, stored, {
      braveBudgetUsed: budget.used,
      braveBudgetLimit: budget.limit,
    });
    return privateJson({ ok: true, source: SOURCE_ID, seen, qualified: gigs.length, stored, budget });
  } catch (error) {
    const message = await failCollectorRun(runId, SOURCE_ID, error);
    return privateJson({ error: message, source: SOURCE_ID }, { status: 503 });
  }
}
