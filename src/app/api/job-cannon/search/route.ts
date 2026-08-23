import { createHash } from "node:crypto";
import type { NextRequest } from "next/server";
import { BRAVE_MONTHLY_REQUEST_LIMIT, reserveMonthlyApiUsage } from "@/lib/leads/api-budget";
import { cleanText, privateJson } from "@/lib/leads/crawl";
import { mapLimit } from "@/lib/leads/pipeline";
import type { JobCannonJob, JobCannonSearchRequest } from "@/lib/job-cannon/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_ROLES = 8;
const MAX_PAGE_CHECKS = 28;
const PROVIDERS = [
  { label: "Greenhouse", host: "boards.greenhouse.io" },
  { label: "Lever", host: "jobs.lever.co" },
  { label: "Ashby", host: "jobs.ashbyhq.com" },
  { label: "Workday", host: "myworkdayjobs.com" },
  { label: "SmartRecruiters", host: "jobs.smartrecruiters.com" },
  { label: "Jobvite", host: "jobs.jobvite.com" },
] as const;

const DEFAULT_ROLES = [
  "Power BI Developer",
  "Senior Data Analyst",
  "Business Intelligence Analyst",
  "BI Analyst",
  "Analytics Engineer",
  "Reporting Analyst",
];

type BraveResult = {
  title?: string;
  url?: string;
  description?: string;
  age?: string;
  page_age?: string;
};

type BravePayload = { web?: { results?: BraveResult[] } };

type JobPostingNode = Record<string, unknown>;

type PageFacts = {
  title?: string;
  company?: string;
  location?: string;
  description?: string;
  postedAt?: string;
  employmentType?: string;
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency?: string;
  salaryUnit?: string;
};

function normalizeText(value: unknown, max = 400) {
  return cleanText(typeof value === "string" ? value : "", max);
}

function cleanQueryTerm(value: string) {
  return value
    .replace(/[(){}\[\]<>"'`|]/g, " ")
    .replace(/[^a-zA-Z0-9+#.,/& -]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

function parseDate(value: unknown) {
  if (typeof value !== "string") return undefined;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : undefined;
}

function parseSearchAge(result: BraveResult) {
  const values = [result.page_age, result.age].filter((value): value is string => Boolean(value));
  for (const raw of values) {
    const direct = parseDate(raw);
    if (direct) return direct;
    const relative = raw.match(/\b(\d+)\s*(minute|minutes|min|mins|hour|hours|hr|hrs|day|days)\s*ago\b/i);
    if (!relative) continue;
    const amount = Number(relative[1]);
    const unit = relative[2].toLowerCase();
    const multiplier = unit.startsWith("day") ? 86_400_000 : unit.startsWith("hour") || unit.startsWith("hr") ? 3_600_000 : 60_000;
    return new Date(Date.now() - amount * multiplier).toISOString();
  }
  return undefined;
}

function stripHtml(value: unknown, max = 1800) {
  if (typeof value !== "string") return "";
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function flattenJsonLd(value: unknown): JobPostingNode[] {
  if (Array.isArray(value)) return value.flatMap(flattenJsonLd);
  if (!value || typeof value !== "object") return [];
  const node = value as JobPostingNode;
  const graph = Array.isArray(node["@graph"]) ? flattenJsonLd(node["@graph"]) : [];
  return [node, ...graph];
}

function typeIncludesJobPosting(node: JobPostingNode) {
  const type = node["@type"];
  if (Array.isArray(type)) return type.some((item) => String(item).toLowerCase() === "jobposting");
  return String(type || "").toLowerCase() === "jobposting";
}

function getAddress(value: unknown) {
  const location = Array.isArray(value) ? value[0] : value;
  if (!location || typeof location !== "object") return "";
  const addressValue = (location as Record<string, unknown>).address;
  const address = addressValue && typeof addressValue === "object" ? addressValue as Record<string, unknown> : {};
  const parts = [address.addressLocality, address.addressRegion, address.addressCountry]
    .map((item) => normalizeText(item, 80))
    .filter(Boolean);
  return Array.from(new Set(parts)).join(", ");
}

function numberFrom(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/[^0-9.]/g, ""));
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function parseSalary(node: JobPostingNode) {
  const salary = (node.baseSalary || node.estimatedSalary) as Record<string, unknown> | undefined;
  if (!salary || typeof salary !== "object") return {};
  const rawValue = salary.value;
  const value = rawValue && typeof rawValue === "object" ? rawValue as Record<string, unknown> : {};
  const directValue = numberFrom(rawValue);
  const min = numberFrom(value.minValue) ?? directValue;
  const max = numberFrom(value.maxValue) ?? directValue;
  return {
    salaryMin: min,
    salaryMax: max,
    salaryCurrency: normalizeText(salary.currency, 12) || undefined,
    salaryUnit: normalizeText(value.unitText, 24) || undefined,
  };
}

function factsFromJobPosting(node: JobPostingNode): PageFacts {
  const hiringOrg = node.hiringOrganization && typeof node.hiringOrganization === "object"
    ? node.hiringOrganization as Record<string, unknown>
    : {};
  const remote = String(node.jobLocationType || "").toUpperCase().includes("TELECOMMUTE");
  const location = remote ? "Remote" : getAddress(node.jobLocation);
  const employmentTypeRaw = node.employmentType;
  const employmentType = Array.isArray(employmentTypeRaw)
    ? employmentTypeRaw.map((item) => normalizeText(item, 40)).filter(Boolean).join(", ")
    : normalizeText(employmentTypeRaw, 80);
  return {
    title: normalizeText(node.title, 260) || undefined,
    company: normalizeText(hiringOrg.name, 220) || undefined,
    location: location || undefined,
    description: stripHtml(node.description, 2200) || undefined,
    postedAt: parseDate(node.datePosted),
    employmentType: employmentType || undefined,
    ...parseSalary(node),
  };
}

function extractJobPosting(html: string) {
  const scripts = Array.from(html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi));
  for (const match of scripts) {
    const raw = match[1]?.trim();
    if (!raw) continue;
    try {
      const parsed = JSON.parse(raw);
      const node = flattenJsonLd(parsed).find(typeIncludesJobPosting);
      if (node) return factsFromJobPosting(node);
    } catch {
      // Some ATS pages publish malformed or HTML-escaped JSON-LD. Search-result metadata is the fallback.
    }
  }
  return {} as PageFacts;
}

async function fetchPageFacts(url: string) {
  try {
    const response = await fetch(url, {
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "User-Agent": "Mozilla/5.0 (compatible; Rukh-Job-Cannon/1.0; +https://rukhlabs.com)",
      },
      redirect: "follow",
      cache: "no-store",
      signal: AbortSignal.timeout(7_000),
    });
    if (!response.ok) return {} as PageFacts;
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("text/html") && !contentType.includes("application/xhtml+xml")) return {} as PageFacts;
    const html = (await response.text()).slice(0, 1_100_000);
    return extractJobPosting(html);
  } catch {
    return {} as PageFacts;
  }
}

async function braveSearch(apiKey: string, query: string, maxAgeHours: number) {
  const url = new URL("https://api.search.brave.com/res/v1/web/search");
  url.searchParams.set("q", query);
  url.searchParams.set("count", "20");
  url.searchParams.set("country", "us");
  url.searchParams.set("search_lang", "en");
  url.searchParams.set("freshness", maxAgeHours <= 24 ? "pd" : "pw");
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
  if (!response.ok) throw new Error(`Search returned ${response.status}.`);
  const payload = await response.json() as BravePayload;
  return payload.web?.results ?? [];
}

function stableId(url: string) {
  return createHash("sha256").update(url).digest("hex").slice(0, 20);
}

function normalizeUrl(value: string) {
  try {
    const url = new URL(value);
    url.hash = "";
    for (const key of ["utm_source", "utm_medium", "utm_campaign", "utm_content", "gh_src", "lever-source"]) {
      url.searchParams.delete(key);
    }
    return url.toString();
  } catch {
    return value;
  }
}

function isFresh(postedAt: string | undefined, maxAgeHours: number) {
  if (!postedAt) return true;
  const age = Date.now() - Date.parse(postedAt);
  return age >= -300_000 && age <= maxAgeHours * 3_600_000;
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.BRAVE_SEARCH_API_KEY?.trim();
  if (!apiKey) return privateJson({ ok: false, error: "BRAVE_SEARCH_API_KEY is not configured." }, { status: 428 });

  let body: JobCannonSearchRequest = {};
  try {
    body = await request.json() as JobCannonSearchRequest;
  } catch {
    // Defaults are intentional.
  }

  const roles = (Array.isArray(body.roles) ? body.roles : DEFAULT_ROLES)
    .map((role) => cleanQueryTerm(String(role)))
    .filter(Boolean)
    .slice(0, MAX_ROLES);
  const selectedRoles = roles.length ? roles : DEFAULT_ROLES;
  const location = cleanQueryTerm(String(body.location || "Remote")) || "Remote";
  const maxAgeHours = Math.max(6, Math.min(168, Number(body.maxAgeHours) || 72));
  const sourceCount = Math.max(1, Math.min(PROVIDERS.length, Number(body.sourceCount) || 4));
  const sourceOffset = Math.max(0, Number(body.sourceOffset) || 0) % PROVIDERS.length;
  const selectedProviders = Array.from({ length: sourceCount }, (_, index) => PROVIDERS[(sourceOffset + index) % PROVIDERS.length]);
  const nextSourceOffset = (sourceOffset + sourceCount) % PROVIDERS.length;

  const roleQuery = selectedRoles.map((role) => `"${role}"`).join(" OR ");
  const locationQuery = /remote/i.test(location) ? '(remote OR "United States")' : `("${location}" OR remote)`;
  const searches = selectedProviders.map((provider) => ({
    ...provider,
    query: `site:${provider.host} (${roleQuery}) ${locationQuery}`,
  }));

  const budget = await reserveMonthlyApiUsage("brave-search", searches.length, BRAVE_MONTHLY_REQUEST_LIMIT);
  if (!budget.allowed) {
    return privateJson({ ok: false, error: "Monthly Brave Search budget reached.", budget }, { status: 429 });
  }

  try {
    const batches = await Promise.all(searches.map(async (search) => {
      try {
        return { search, results: await braveSearch(apiKey, search.query, maxAgeHours), error: "" };
      } catch (error) {
        return { search, results: [] as BraveResult[], error: error instanceof Error ? error.message : String(error) };
      }
    }));

    const rawCandidates = batches.flatMap((batch) => batch.results.map((result) => ({ result, provider: batch.search.label })));
    const dedupedCandidates = new Map<string, { result: BraveResult; provider: string }>();
    for (const candidate of rawCandidates) {
      const rawUrl = candidate.result.url?.trim();
      if (!rawUrl || !/^https?:\/\//i.test(rawUrl)) continue;
      const url = normalizeUrl(rawUrl);
      if (!dedupedCandidates.has(url)) dedupedCandidates.set(url, { ...candidate, result: { ...candidate.result, url } });
    }

    const candidates = Array.from(dedupedCandidates.values()).slice(0, MAX_PAGE_CHECKS);
    const checked = await mapLimit(candidates, 6, async ({ result, provider }) => {
      const url = result.url || "";
      const facts = await fetchPageFacts(url);
      const postedAt = facts.postedAt || parseSearchAge(result);
      if (!isFresh(postedAt, maxAgeHours)) return null;
      const title = facts.title || normalizeText(result.title, 260) || "Untitled role";
      const company = facts.company || title.split(/\s[-–—|]\s/).slice(-1)[0] || provider;
      const description = facts.description || normalizeText(result.description, 1800);
      const job: JobCannonJob = {
        id: stableId(url),
        title,
        company,
        location: facts.location || location || "Location not resolved",
        description,
        url,
        provider,
        postedAt,
        discoveredAt: new Date().toISOString(),
        employmentType: facts.employmentType,
        salaryMin: facts.salaryMin,
        salaryMax: facts.salaryMax,
        salaryCurrency: facts.salaryCurrency,
        salaryUnit: facts.salaryUnit,
        sourceSnippet: normalizeText(result.description, 900) || undefined,
      };
      return job;
    });

    const jobs = checked.filter((job): job is JobCannonJob => Boolean(job));
    const seen = new Set<string>();
    const uniqueJobs = jobs.filter((job) => {
      const key = `${job.url}|${job.title.toLowerCase()}|${job.company.toLowerCase()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return privateJson({
      ok: true,
      jobs: uniqueJobs,
      sources: selectedProviders.map((provider) => provider.label),
      sourceOffset,
      nextSourceOffset,
      searched: rawCandidates.length,
      checked: candidates.length,
      searchErrors: batches.filter((batch) => batch.error).map((batch) => ({ source: batch.search.label, error: batch.error })),
      budget: { used: budget.used, limit: budget.limit },
    });
  } catch (error) {
    return privateJson({ ok: false, error: error instanceof Error ? error.message : "Job search failed." }, { status: 503 });
  }
}
