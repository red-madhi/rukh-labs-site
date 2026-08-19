import type { NextRequest } from "next/server";
import { hasValidBasicAuth, hasValidCronAuth } from "@/lib/leads/auth";
import { beginCollectorRun, clamp, cleanText, completeCollectorRun, failCollectorRun, getSourceConfig, privateJson } from "@/lib/leads/crawl";
import { BRAVE_MONTHLY_REQUEST_LIMIT, reserveMonthlyApiUsage } from "@/lib/leads/api-budget";
import { upsertPowerBiGigs } from "@/lib/leads/power-bi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SOURCE_ID = "power-bi-adoption";
const searches = [
  '"Power BI" (careers OR jobs OR hiring) -indeed -ziprecruiter -dice -glassdoor -linkedin -upwork',
  '"Microsoft Fabric" (careers OR jobs OR hiring) -indeed -ziprecruiter -dice -glassdoor -linkedin -upwork',
  '"Tableau" "Power BI" (migration OR modernization) (careers OR hiring) -indeed -ziprecruiter -dice -glassdoor',
] as const;

const blockedHosts = [
  "indeed.com", "ziprecruiter.com", "dice.com", "glassdoor.com", "linkedin.com",
  "upwork.com", "monster.com", "careerbuilder.com", "simplyhired.com",
];
const techPattern = /\b(?:power\s*bi|microsoft fabric|fabric lakehouse|fabric data factory|\bdax\b|power query)\b/i;
const hiringPattern = /\b(?:careers?|jobs?|hiring|join our team|open positions?|vacanc(?:y|ies)|apply)\b/i;
const rolePattern = /\b(?:developer|analyst|engineer|architect|consultant|manager|specialist|lead|administrator|data visualization|business intelligence)\b/i;
const migrationPattern = /\b(?:tableau|qlik|migration|modernization|replace|transition|move to power bi|fabric adoption)\b/i;

type BraveResult = { title?: string; url?: string; description?: string; age?: string; page_age?: string };
type BravePayload = { web?: { results?: BraveResult[] } };

function host(value: string) {
  try { return new URL(value).hostname.replace(/^www\./, "").toLowerCase(); } catch { return ""; }
}

function accountHost(value: string) {
  const h = host(value);
  return h.replace(/^(?:careers?|jobs?|apply)\./, "");
}

function blocked(value: string) {
  const h = host(value);
  return blockedHosts.some((item) => h === item || h.endsWith(`.${item}`));
}

function looksCompanyOwned(value: string) {
  if (blocked(value)) return false;
  try {
    const parsed = new URL(value);
    return /\/(?:careers?|jobs?|job|opportunities|join-us|join-our-team)(?:\/|$)/i.test(parsed.pathname) || /^(?:careers?|jobs?|apply)\./i.test(parsed.hostname);
  } catch {
    return false;
  }
}

async function brave(apiKey: string, query: string) {
  const url = new URL("https://api.search.brave.com/res/v1/web/search");
  url.searchParams.set("q", query);
  url.searchParams.set("count", "20");
  url.searchParams.set("country", "us");
  url.searchParams.set("search_lang", "en");
  url.searchParams.set("freshness", "pm");
  url.searchParams.set("safesearch", "moderate");
  const response = await fetch(url, {
    headers: { Accept: "application/json", "X-Subscription-Token": apiKey },
    cache: "no-store",
    signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) throw new Error(`Brave Power BI adoption search returned ${response.status}.`);
  const payload = (await response.json()) as BravePayload;
  return payload.web?.results ?? [];
}

function qualify(result: BraveResult, query: string) {
  const sourceUrl = cleanText(result.url, 1000);
  if (!sourceUrl || !looksCompanyOwned(sourceUrl)) return null;
  const title = cleanText(result.title, 280);
  const description = cleanText(result.description, 900);
  const combined = `${title} ${description}`;
  if (!techPattern.test(combined) || !hiringPattern.test(combined) || !rolePattern.test(combined)) return null;

  const accountKey = accountHost(sourceUrl);
  if (!accountKey) return null;
  let score = 58;
  const signals = [
    "A company-owned careers/jobs page shows active Power BI or Microsoft Fabric hiring",
    "Hiring is treated as a technology-investment/adoption signal, not as proof the company wants a freelancer",
  ];
  if (migrationPattern.test(combined)) {
    score += 8;
    signals.push("Migration or reporting-modernization language overlaps the hiring signal");
  }
  if (/\b(?:multiple|several|team|platform|enterprise|center of excellence|coe)\b/i.test(combined)) {
    score += 4;
    signals.push("The language suggests broader team or platform investment rather than a single isolated task");
  }

  return {
    sourceKey: `power-bi-adoption:${sourceUrl}`,
    sourceUrl,
    companyName: accountKey,
    accountKey,
    summary: `${title}${description ? ` — ${description}` : ""}`,
    score: clamp(score, 0, 78),
    signals,
    risks: [
      "This is a proactive capacity/adoption signal; outside consulting or freelance help has not been requested",
      "Verify the underlying company and role are still active before outreach",
    ],
    tags: ["power-bi", "proactive signal", "hiring adoption signal", "company careers"],
    pitch: "I noticed your team is actively hiring around Power BI/Fabric. I work hands-on with Power BI/Fabric migrations, data modeling, DAX and production reporting, and can provide short-term capacity for a focused migration or backlog while permanent hiring is underway. If useful, I can send the areas where I typically plug in without disrupting the internal team.",
    contactUrl: sourceUrl,
    website: `https://${accountKey}/`,
    rawPayload: {
      accountKey,
      opportunityType: "company-adoption-hiring",
      matchedQuery: query,
      resultAge: result.age ?? result.page_age ?? null,
      intentLevel: "low-by-itself",
    },
  };
}

export async function GET(request: NextRequest) {
  if (!hasValidCronAuth(request) && !hasValidBasicAuth(request)) {
    return privateJson({ error: "Collector authentication failed." }, { status: 401 });
  }
  const apiKey = process.env.BRAVE_SEARCH_API_KEY?.trim();
  if (!apiKey) return privateJson({ error: "BRAVE_SEARCH_API_KEY is not configured.", source: SOURCE_ID }, { status: 428 });

  const runId = await beginCollectorRun(SOURCE_ID);
  try {
    const config = await getSourceConfig(SOURCE_ID, { queryIndex: 0 });
    const index = Math.max(0, Number(config.queryIndex ?? 0) || 0) % searches.length;
    const query = searches[index];
    const budget = await reserveMonthlyApiUsage("brave-search", 1, BRAVE_MONTHLY_REQUEST_LIMIT);
    if (!budget.allowed) {
      await completeCollectorRun(runId, SOURCE_ID, 0, 0, { queryIndex: index, braveBudgetBlocked: true });
      return privateJson({ ok: true, source: SOURCE_ID, seen: 0, stored: 0, budgetBlocked: true });
    }

    const results = await brave(apiKey, query);
    const deduped = new Map<string, NonNullable<ReturnType<typeof qualify>>>();
    for (const result of results) {
      const gig = qualify(result, query);
      if (gig) deduped.set(gig.sourceKey, gig);
    }
    const rows = Array.from(deduped.values());
    const stored = await upsertPowerBiGigs(rows);
    const nextIndex = (index + 1) % searches.length;
    await completeCollectorRun(runId, SOURCE_ID, results.length, stored, {
      queryIndex: nextIndex,
      lastQuery: query,
      nextQuery: searches[nextIndex],
      braveBudgetUsed: budget.used,
      intentInterpretation: "low-intent adoption/capacity signal; stronger only when other account signals converge",
    });
    return privateJson({ ok: true, source: SOURCE_ID, seen: results.length, qualified: rows.length, stored, query, budget });
  } catch (error) {
    const message = await failCollectorRun(runId, SOURCE_ID, error);
    return privateJson({ error: message, source: SOURCE_ID }, { status: 503 });
  }
}
