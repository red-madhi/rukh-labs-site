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

const SOURCE_ID = "social-linkedin-x";

const searches = [
  {
    platform: "linkedin",
    query:
      'site:linkedin.com/posts ("need a web designer" OR "looking for a web designer" OR "recommend a web designer")',
    baseScore: 90,
  },
  {
    platform: "linkedin",
    query:
      'site:linkedin.com/posts ("need a website" OR "website redesign" OR "who can build us a website") (business OR startup OR nonprofit OR company)',
    baseScore: 87,
  },
  {
    platform: "x",
    query:
      'site:x.com ("need a web designer" OR "looking for a web designer" OR "recommend a web developer")',
    baseScore: 90,
  },
  {
    platform: "x",
    query:
      'site:x.com ("need a website" OR "who can build me a website" OR "website redesign")',
    baseScore: 88,
  },
] as const;

type Platform = (typeof searches)[number]["platform"];

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

const intentPattern =
  /\b(?:need|needs|looking for|seeking|recommend|recommendation|who can|anyone know|trying to find|could use help|want someone)\b.{0,110}\b(?:web(?:site)?\s*(?:designer|developer)|website|web design|website design|website redesign|site redesign|web development)\b|\b(?:web(?:site)?\s*(?:designer|developer)|website|web design|website design|website redesign|site redesign|web development)\b.{0,110}\b(?:need|needs|looking for|seeking|recommend|recommendation|who can|anyone know|trying to find|could use help|want someone)\b/i;

const buyerContextPattern =
  /\b(?:i|we|our|my|business|company|startup|brand|shop|store|restaurant|practice|nonprofit|organization|launch|opening)\b/i;

const excludePattern =
  /\b(?:i am a web designer|i'm a web designer|we are a web design|our web design services|available for work|hire me|portfolio|job opening|we are hiring|join our team|salary|resume|career|apply now|vacancy|web designer job|web developer job|course|tutorial|guide|template|top web design|best web design agencies)\b/i;

function platformFromUrl(value: string): Platform | null {
  try {
    const url = new URL(value);
    const host = url.hostname.replace(/^www\./i, "").toLowerCase();
    const path = url.pathname.toLowerCase();
    if (host === "linkedin.com") {
      if (path.startsWith("/posts/") || path.includes("/feed/update/urn:li:activity")) {
        return "linkedin";
      }
      return null;
    }
    if (host === "x.com" || host === "twitter.com") {
      return /\/[^/]+\/status\/\d+/.test(path) ? "x" : null;
    }
    return null;
  } catch {
    return null;
  }
}

async function braveSearch(
  apiKey: string,
  search: (typeof searches)[number],
): Promise<BraveResult[]> {
  const url = new URL("https://api.search.brave.com/res/v1/web/search");
  url.searchParams.set("q", search.query);
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
    const detail = cleanText(await response.text().catch(() => ""), 180);
    throw new Error(
      `Brave social discovery returned ${response.status}${detail ? `: ${detail}` : ""}`,
    );
  }

  const payload = (await response.json()) as BravePayload;
  return payload.web?.results ?? [];
}

function qualify(
  result: BraveResult,
  search: (typeof searches)[number],
) {
  const sourceUrl = result.url?.trim();
  if (!sourceUrl) return null;
  const platform = platformFromUrl(sourceUrl);
  if (!platform || platform !== search.platform) return null;

  const title = cleanText(result.title, 240);
  const description = cleanText(result.description, 700);
  const combined = `${title} ${description}`;
  if (!intentPattern.test(combined)) return null;
  if (!buyerContextPattern.test(combined)) return null;
  if (excludePattern.test(combined)) return null;

  const signals = [
    `Public ${platform === "linkedin" ? "LinkedIn" : "X"} post URL matched a website-buying query`,
    "Language appears to describe a buyer request rather than a designer promotion or job listing",
  ];
  const risks = [
    "Discovered through a public search index rather than a native platform feed",
    "Open the source and confirm that the post is still public and genuinely relevant before replying",
  ];

  let score: number = search.baseScore;
  if (/\b(?:urgent|urgently|asap|this week|deadline|launching|opening soon)\b/i.test(combined)) {
    score += 4;
    signals.push("Urgency or launch timing was detected");
  }
  if (/\b(?:paid|budget|quote|proposal|freelancer|contractor)\b/i.test(combined)) {
    score += 3;
    signals.push("Commercial intent was detected");
  }
  score = clamp(score, 0, 97);

  const platformLabel = platform === "linkedin" ? "LinkedIn" : "X";
  return {
    sourceKey: `social-search:${platform}:${sourceUrl}`,
    sourceUrl,
    companyName: `${platformLabel} website request`,
    summary: `A public ${platformLabel} post appears to request website design, development, or redesign help. Open the source to verify the exact request and author before contacting them.`,
    score,
    signals,
    risks,
    tags: [
      "public social intent",
      platform === "linkedin" ? "linkedin" : "x-twitter",
      "manual verification required",
    ],
    pitch:
      "I saw your public post about needing website help. I build practical small-business sites and can send a concise fixed-price route based on what you are trying to launch or improve.",
    rawPayload: {
      platform,
      matchedQuery: search.query,
      resultAge: result.age ?? result.page_age ?? null,
      discoveryMethod: "Brave Search public index",
      storedContentPolicy: "URL and paraphrased classification only; post text is not retained",
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
      searches.map(async (search) => ({ search, results: await braveSearch(apiKey, search) })),
    );
    const seen = batches.reduce((total, batch) => total + batch.results.length, 0);
    const leads = new Map<string, NonNullable<ReturnType<typeof qualify>>>();

    for (const batch of batches) {
      for (const result of batch.results) {
        const lead = qualify(result, batch.search);
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
      linkedinQualified: rows.filter((row) => row.tags.includes("linkedin")).length,
      xQualified: rows.filter((row) => row.tags.includes("x-twitter")).length,
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
