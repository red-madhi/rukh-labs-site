import type { NextRequest } from "next/server";
import { hasValidBasicAuth, hasValidCronAuth } from "@/lib/leads/auth";
import {
  beginCollectorRun,
  clamp,
  cleanText,
  completeCollectorRun,
  failCollectorRun,
  getSourceConfig,
  mapLimit,
  privateJson,
} from "@/lib/leads/crawl";
import { BRAVE_MONTHLY_REQUEST_LIMIT, reserveMonthlyApiUsage } from "@/lib/leads/api-budget";
import { expirePowerBiJobBoardGigs, upsertPowerBiGigs, type PowerBiGigInput } from "@/lib/leads/power-bi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SOURCE_ID = "power-bi-web";
const JOB_MAX_AGE_MS = 12 * 60 * 60 * 1000;
const MAX_JOB_PAGES_PER_RUN = 24;

type SearchConfig = {
  label: string;
  query: string;
  platform?: string;
  useDayFreshness?: boolean;
};

type BraveResult = {
  title?: string;
  url?: string;
  description?: string;
  age?: string;
  page_age?: string;
};
type BravePayload = { web?: { results?: BraveResult[] } };

type JobCheck = {
  gig: PowerBiGigInput | null;
  dateResolved: boolean;
  pageChecked: boolean;
  fresh: boolean;
};

const BROAD_SEARCH: SearchConfig = {
  label: "fresh direct or proactive signal",
  query: '("Power BI" OR "Microsoft Fabric") (consultant OR freelancer OR "need help" OR migration OR implementation OR rollout OR modernization OR Tableau) -jobs -careers',
};

const SOCIAL_SEARCHES: SearchConfig[] = [
  {
    label: "fresh LinkedIn post",
    query: 'site:linkedin.com/posts "Power BI" (consultant OR freelancer OR "need help" OR migration OR implementation)',
    platform: "LinkedIn",
  },
  {
    label: "fresh X post",
    query: 'site:x.com "Power BI" (consultant OR freelancer OR "need help" OR migration OR implementation)',
    platform: "X",
  },
];

const JOB_BOARD_SEARCHES: SearchConfig[] = [
  { label: "fresh Indeed Power BI posting", query: 'site:indeed.com "Power BI" developer', platform: "Indeed", useDayFreshness: false },
  { label: "fresh Upwork Power BI posting", query: 'site:upwork.com/jobs "Power BI"', platform: "Upwork", useDayFreshness: false },
  { label: "fresh ZipRecruiter Power BI posting", query: 'site:ziprecruiter.com "Power BI" developer', platform: "ZipRecruiter", useDayFreshness: false },
  { label: "fresh Dice Power BI posting", query: 'site:dice.com "Power BI" developer', platform: "Dice", useDayFreshness: false },
];

const jobBoardHosts = [
  "indeed.com", "glassdoor.com", "ziprecruiter.com", "monster.com", "dice.com",
  "careerbuilder.com", "simplyhired.com", "upwork.com", "fiverr.com", "freelancer.com",
  "guru.com", "peopleperhour.com", "toptal.com", "wellfound.com",
];

const powerBiPattern = /\b(?:power\s*bi|microsoft fabric|power query|\bdax\b|semantic model|business intelligence dashboard)\b/i;
const jobPattern = /\b(?:apply now|job opening|job posting|full[- ]time|part[- ]time|salary|benefits|recruiter|resume|candidate|careers?|vacancy|position available|w2|c2c|corp to corp|staffing agency|recruitment agency)\b/i;
const providerPattern = /\b(?:we provide power bi|our power bi services|hire our consultants|power bi consulting company|our consultants|book a consultation with us)\b/i;
const editorialPattern = /\b(?:how to|guide|tutorial|template|best practices|tips for|webinar|course|certification|training program|learn power bi|power bi tutorial)\b/i;
const directPattern = /\b(?:need|looking for|seeking|recommend|recommendation|anyone know|who can|could use|want to hire|need to hire|hire|hiring|contracting|need someone|looking for someone|help us with|support with|assistance with)\b.{0,170}\b(?:power bi|microsoft fabric|business intelligence|dashboard|dax|power query|semantic model)\b|\b(?:power bi|microsoft fabric|business intelligence|dashboard|dax|power query|semantic model)\b.{0,170}\b(?:help|consultant|freelancer|contractor|expert|specialist|support)\b/i;
const proactivePattern = /\b(?:migrat(?:e|ing|ion)|replace|rebuild|moderniz(?:e|ing|ation)|rolling out|implement(?:ing|ation)|moving from tableau|moving to power bi|fabric adoption|semantic model|dashboard overhaul|reporting overhaul|automat(?:e|ing|ion)|consolidat(?:e|ing|ion)|replace excel|manual reports?|stuck with|struggling with|performance issue|cleanup|clean up)\b.{0,200}\b(?:power bi|microsoft fabric|business intelligence|dashboard|reporting|analytics|dax|power query)\b|\b(?:power bi|microsoft fabric)\b.{0,200}\b(?:migration|implementation|rollout|modernization|overhaul|rebuild|automation|cleanup|performance|optimization)\b/i;
const paidPattern = /\b(?:paid|budget|quote|proposal|contract|contractor|freelance|consultant|consulting|project fee|hourly)\b/i;
const contractPattern = /\b(?:contract|contractor|freelance|freelancer|consultant|consulting|temporary|short[- ]term|project[- ]based|hourly)\b/i;

function hostOf(value: string) {
  try { return new URL(value).hostname.replace(/^www\./i, "").toLowerCase(); } catch { return ""; }
}

function platformTag(value: string) {
  const host = hostOf(value);
  if (host.includes("linkedin.com")) return "LinkedIn";
  if (host === "x.com" || host === "twitter.com") return "X";
  if (host.includes("indeed.com")) return "Indeed";
  if (host.includes("ziprecruiter.com")) return "ZipRecruiter";
  if (host.includes("dice.com")) return "Dice";
  if (host.includes("upwork.com")) return "Upwork";
  return host || "Public web";
}

function isJobLike(url: string, combined: string) {
  const host = hostOf(url);
  if (jobBoardHosts.some((item) => host === item || host.endsWith(`.${item}`))) return true;
  try {
    if (/\/(?:jobs?|careers?|vacancies?|apply)(?:\/|$)/i.test(new URL(url).pathname)) return true;
  } catch { return false; }
  return jobPattern.test(combined);
}

function normalizeDate(value: string) {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : null;
}

function parsePublishedAt(result: BraveResult) {
  const values = [result.page_age, result.age].map((value) => value?.trim()).filter((value): value is string => Boolean(value));
  for (const value of values) {
    const direct = normalizeDate(value);
    if (direct) return direct;

    const relative = value.match(/\b(\d+)\s*(minute|minutes|min|mins|hour|hours|hr|hrs|day|days)\s*ago\b/i);
    if (relative) {
      const amount = Number(relative[1]);
      const unit = relative[2].toLowerCase();
      const multiplier = unit.startsWith("day") ? 86_400_000 : unit.startsWith("hour") || unit.startsWith("hr") ? 3_600_000 : 60_000;
      return new Date(Date.now() - amount * multiplier).toISOString();
    }

    const compact = value.match(/^\s*(\d+)\s*([mhd])\s*$/i);
    if (compact) {
      const amount = Number(compact[1]);
      const unit = compact[2].toLowerCase();
      const multiplier = unit === "d" ? 86_400_000 : unit === "h" ? 3_600_000 : 60_000;
      return new Date(Date.now() - amount * multiplier).toISOString();
    }
  }
  return null;
}

function parsePostingDateFromHtml(html: string) {
  const patterns = [
    /["']datePosted["']\s*:\s*["']([^"']+)["']/i,
    /itemprop=["']datePosted["'][^>]*content=["']([^"']+)["']/i,
    /content=["']([^"']+)["'][^>]*itemprop=["']datePosted["']/i,
    /name=["']datePosted["'][^>]*content=["']([^"']+)["']/i,
    /property=["']datePosted["'][^>]*content=["']([^"']+)["']/i,
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (!match?.[1]) continue;
    const normalized = normalizeDate(match[1]);
    if (normalized) return normalized;
  }

  const relative = html.match(/\b(?:posted|published)\s*(?:about\s*)?(\d+)\s*(minutes?|mins?|hours?|hrs?)\s*ago\b/i);
  if (relative) {
    const amount = Number(relative[1]);
    const unit = relative[2].toLowerCase();
    return new Date(Date.now() - amount * (unit.startsWith("h") ? 3_600_000 : 60_000)).toISOString();
  }
  return null;
}

async function fetchPostingPublishedAt(url: string) {
  try {
    const response = await fetch(url, {
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "User-Agent": "Mozilla/5.0 (compatible; Rukh-Leads/1.0; +https://rukhlabs.com)",
      },
      cache: "no-store",
      redirect: "follow",
      signal: AbortSignal.timeout(6_000),
    });
    if (!response.ok) return null;
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("text/html") && !contentType.includes("application/xhtml+xml")) return null;
    const html = (await response.text()).slice(0, 900_000);
    return parsePostingDateFromHtml(html);
  } catch {
    return null;
  }
}

async function braveSearch(apiKey: string, search: SearchConfig) {
  const url = new URL("https://api.search.brave.com/res/v1/web/search");
  url.searchParams.set("q", search.query);
  url.searchParams.set("count", "20");
  url.searchParams.set("country", "us");
  url.searchParams.set("search_lang", "en");
  if (search.useDayFreshness !== false) url.searchParams.set("freshness", "pd");
  url.searchParams.set("safesearch", "moderate");

  const response = await fetch(url, {
    headers: { Accept: "application/json", "Accept-Encoding": "gzip", "X-Subscription-Token": apiKey },
    cache: "no-store",
    signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) throw new Error(`Brave Power BI search returned ${response.status}.`);
  const payload = (await response.json()) as BravePayload;
  return payload.web?.results ?? [];
}

async function qualifyJob(result: BraveResult, search: SearchConfig): Promise<JobCheck> {
  const sourceUrl = result.url?.trim();
  if (!sourceUrl || !/^https?:\/\//i.test(sourceUrl)) return { gig: null, dateResolved: false, pageChecked: false, fresh: false };
  const title = cleanText(result.title, 260);
  const description = cleanText(result.description, 900);
  const combined = `${title} ${description}`;
  if (!powerBiPattern.test(combined) || providerPattern.test(combined) || editorialPattern.test(combined)) {
    return { gig: null, dateResolved: false, pageChecked: false, fresh: false };
  }

  let sourcePublishedAt = parsePublishedAt(result);
  let pageChecked = false;
  if (!sourcePublishedAt) {
    pageChecked = true;
    sourcePublishedAt = await fetchPostingPublishedAt(sourceUrl);
  }
  if (!sourcePublishedAt) return { gig: null, dateResolved: false, pageChecked, fresh: false };

  const ageMs = Date.now() - Date.parse(sourcePublishedAt);
  if (ageMs < -300_000 || ageMs > JOB_MAX_AGE_MS) {
    return { gig: null, dateResolved: true, pageChecked, fresh: false };
  }

  const platform = search.platform || platformTag(sourceUrl);
  const contractish = contractPattern.test(combined);
  let score = contractish ? 84 : 74;
  const signals = [
    "Public Power BI job posting verified as no more than 12 hours old",
    "Automatically expires from the active feed after 12 hours",
    `Discovered from ${platform}`,
  ];
  const risks = ["Job-board competition can increase quickly, so early outreach/application matters"];
  if (contractish) signals.push("Contract, freelance, consulting, temporary, or project-based language was detected");
  else risks.push("This may be a traditional employment role rather than freelance/contract work");
  if (/\b(?:urgent|asap|immediately|this week|deadline|stuck|blocked)\b/i.test(combined)) score += 4;
  if (/\b(?:tableau|qlik|excel|manual reporting|legacy reports?)\b/i.test(combined)) score += 3;

  return {
    dateResolved: true,
    pageChecked,
    fresh: true,
    gig: {
      sourceKey: `power-bi-job:${sourceUrl}`,
      sourceUrl,
      sourcePublishedAt,
      discoveredAt: new Date().toISOString(),
      companyName: title || `${platform} Power BI opportunity`,
      summary: description || title,
      score: clamp(score, 0, 97),
      signals,
      risks,
      tags: ["power-bi", "job-board", "fresh <12h", platform.toLowerCase(), search.label],
      pitch: contractish
        ? "I saw your newly posted Power BI/Fabric contract opportunity. I work hands-on with DAX, Power Query, data modeling, Fabric migrations and production dashboards. I can move quickly on a focused project and can work fixed-scope or hourly depending on the need."
        : "I saw your newly posted Power BI/Fabric role. My background is hands-on Power BI, DAX, Power Query, data modeling and Fabric migration work. The posting is still very fresh, so I wanted to reach out while the need is active.",
      contactUrl: sourceUrl,
      rawPayload: { matchedQuery: search.query, resultAge: result.age ?? result.page_age ?? null, platform, opportunityType: "job-board", autoExpireHours: 12 },
    },
  };
}

function qualifyNonJob(result: BraveResult, search: SearchConfig): PowerBiGigInput | null {
  const sourceUrl = result.url?.trim();
  if (!sourceUrl || !/^https?:\/\//i.test(sourceUrl)) return null;
  const title = cleanText(result.title, 260);
  const description = cleanText(result.description, 900);
  const combined = `${title} ${description}`;
  if (providerPattern.test(combined) || editorialPattern.test(combined)) return null;

  const direct = directPattern.test(combined);
  const proactive = proactivePattern.test(combined);
  if (!direct && !proactive) return null;

  const platform = search.platform || platformTag(sourceUrl);
  let score = direct ? 88 : 68;
  const signals = [direct ? "Fresh public text appears to request Power BI / Fabric help" : "Fresh public text suggests Power BI / Fabric work that may benefit from outside help", `Discovered from ${platform} through a one-day freshness window`];
  const risks = [direct ? "Confirm the work is still open before replying" : "This is a proactive signal, not a confirmed request for a freelancer"];
  if (paidPattern.test(combined)) { score += 5; signals.push("Commercial consulting, contract, budget, or proposal language was detected"); }
  if (/\b(?:urgent|asap|immediately|this week|deadline|stuck|blocked)\b/i.test(combined)) score += 4;
  if (/\b(?:tableau|qlik|excel|manual reporting|legacy reports?)\b/i.test(combined)) score += 3;

  return {
    sourceKey: `power-bi-web:${sourceUrl}`,
    sourceUrl,
    sourcePublishedAt: parsePublishedAt(result) || undefined,
    companyName: title || `${platform} Power BI opportunity`,
    summary: description || title,
    score: clamp(score, 0, 97),
    signals,
    risks,
    tags: ["power-bi", direct ? "direct ask" : "proactive signal", platform.toLowerCase(), search.label, "fresh public signal"],
    pitch: direct
      ? "I saw your public post about needing Power BI/Fabric help. I build and repair production Power BI models, DAX, Power Query, Fabric migrations, and executive dashboards. If the work is still open, I can quickly scope the problem and give you a practical fixed-scope or hourly option."
      : "I came across your public Power BI/Fabric migration or reporting-modernization signal. I work hands-on with Power BI, DAX, Power Query and Fabric, and can help with a focused migration, model cleanup, automation, or dashboard build without turning it into a long consulting engagement.",
    contactUrl: sourceUrl,
    rawPayload: { matchedQuery: search.query, resultAge: result.age ?? result.page_age ?? null, platform, opportunityType: direct ? "direct" : "proactive" },
  };
}

export async function GET(request: NextRequest) {
  if (!hasValidCronAuth(request) && !hasValidBasicAuth(request)) return privateJson({ error: "Collector authentication failed." }, { status: 401 });
  const apiKey = process.env.BRAVE_SEARCH_API_KEY?.trim();
  if (!apiKey) return privateJson({ error: "BRAVE_SEARCH_API_KEY is not configured.", source: SOURCE_ID }, { status: 428 });

  const sourceConfig = await getSourceConfig(SOURCE_ID, { socialIndex: 0, jobBoardIndex: 0 });
  const socialIndex = Math.max(0, Number(sourceConfig.socialIndex ?? 0) || 0) % SOCIAL_SEARCHES.length;
  const jobBoardIndex = Math.max(0, Number(sourceConfig.jobBoardIndex ?? 0) || 0) % JOB_BOARD_SEARCHES.length;
  const socialSearch = SOCIAL_SEARCHES[socialIndex];
  const jobSearches = [JOB_BOARD_SEARCHES[jobBoardIndex], JOB_BOARD_SEARCHES[(jobBoardIndex + 1) % JOB_BOARD_SEARCHES.length]];
  const searches = [BROAD_SEARCH, socialSearch, ...jobSearches];

  const budget = await reserveMonthlyApiUsage("brave-search", searches.length, BRAVE_MONTHLY_REQUEST_LIMIT);
  if (!budget.allowed) return privateJson({ error: "Monthly Brave Search budget reached.", source: SOURCE_ID, budget }, { status: 429 });

  const runId = await beginCollectorRun(SOURCE_ID);
  try {
    const expired = await expirePowerBiJobBoardGigs();
    const batches = await Promise.all(searches.map(async (search) => {
      try { return { search, results: await braveSearch(apiKey, search), error: null as string | null }; }
      catch (error) { return { search, results: [] as BraveResult[], error: error instanceof Error ? error.message : String(error) }; }
    }));
    if (!batches.some((batch) => !batch.error)) throw new Error(batches.map((batch) => batch.error).filter(Boolean).join(" · ") || "All Power BI web searches failed.");

    const deduped = new Map<string, PowerBiGigInput>();
    const jobCandidates: Array<{ result: BraveResult; search: SearchConfig }> = [];
    for (const batch of batches) {
      for (const result of batch.results) {
        const sourceUrl = result.url?.trim() || "";
        const combined = `${cleanText(result.title, 260)} ${cleanText(result.description, 900)}`;
        if (batch.search.useDayFreshness === false || (sourceUrl && isJobLike(sourceUrl, combined))) {
          if (jobCandidates.length < MAX_JOB_PAGES_PER_RUN) jobCandidates.push({ result, search: batch.search });
          continue;
        }
        const gig = qualifyNonJob(result, batch.search);
        if (!gig) continue;
        const current = deduped.get(gig.sourceKey);
        if (!current || gig.score > current.score) deduped.set(gig.sourceKey, gig);
      }
    }

    const jobChecks = await mapLimit(jobCandidates, 6, async ({ result, search }) => qualifyJob(result, search));
    for (const check of jobChecks) {
      if (!check.gig) continue;
      const current = deduped.get(check.gig.sourceKey);
      if (!current || check.gig.score > current.score) deduped.set(check.gig.sourceKey, check.gig);
    }

    const gigs = Array.from(deduped.values());
    const stored = await upsertPowerBiGigs(gigs);
    const seen = batches.reduce((total, batch) => total + batch.results.length, 0);
    const nextSocialIndex = (socialIndex + 1) % SOCIAL_SEARCHES.length;
    const nextJobBoardIndex = (jobBoardIndex + 2) % JOB_BOARD_SEARCHES.length;
    const searchErrors = batches.filter((batch) => batch.error).map((batch) => ({ label: batch.search.label, error: batch.error }));
    const searchCounts = batches.map((batch) => ({ label: batch.search.label, count: batch.results.length }));
    const pageChecks = jobChecks.filter((check) => check.pageChecked).length;
    const datesResolved = jobChecks.filter((check) => check.dateResolved).length;
    const freshJobs = jobChecks.filter((check) => check.fresh).length;

    await completeCollectorRun(runId, SOURCE_ID, seen, stored, {
      socialIndex: nextSocialIndex,
      jobBoardIndex: nextJobBoardIndex,
      lastSocialPlatform: socialSearch.platform,
      nextSocialPlatform: SOCIAL_SEARCHES[nextSocialIndex].platform,
      jobBoardSources: jobSearches.map((search) => search.platform),
      nextJobBoardSources: [JOB_BOARD_SEARCHES[nextJobBoardIndex].platform, JOB_BOARD_SEARCHES[(nextJobBoardIndex + 1) % JOB_BOARD_SEARCHES.length].platform],
      braveBudgetUsed: budget.used,
      braveBudgetLimit: budget.limit,
      expiredJobBoardLeads: expired,
      jobBoardMaxAgeHours: 12,
      jobCandidatesChecked: jobChecks.length,
      jobPagesChecked: pageChecks,
      jobDatesResolved: datesResolved,
      freshJobBoardLeads: freshJobs,
      searchCounts,
      searchErrors,
    });

    return privateJson({
      ok: true,
      partial: searchErrors.length > 0,
      source: SOURCE_ID,
      seen,
      qualified: gigs.length,
      stored,
      expired,
      jobBoardSources: jobSearches.map((search) => search.platform),
      jobCandidatesChecked: jobChecks.length,
      jobPagesChecked: pageChecks,
      jobDatesResolved: datesResolved,
      freshJobBoardLeads: freshJobs,
      searchCounts,
      searchErrors,
      budget,
    });
  } catch (error) {
    const message = await failCollectorRun(runId, SOURCE_ID, error);
    return privateJson({ error: message, source: SOURCE_ID }, { status: 503 });
  }
}
