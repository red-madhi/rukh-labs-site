import type { CandidateRow } from "@/lib/leads/crawl";
import {
  canonicalHost,
  cleanText,
  tokenSimilarity,
} from "@/lib/leads/crawl";
import {
  BRAVE_MONTHLY_REQUEST_LIMIT,
  reserveMonthlyApiUsage,
} from "@/lib/leads/api-budget";
import { leadNeonQuery } from "@/lib/leads/neon";
import {
  fetchPublicPage,
  inspectHtml,
  parseSafePublicUrl,
} from "@/lib/leads/site-fetch";

const DAILY_SEARCH_LIMIT = 8;
const MAX_INTERNAL_PAGES = 5;
const MAX_RELATED_PAGES = 3;
const MAX_SEARCH_PAGES = 4;

const relatedServiceHosts = [
  "crossfit.com",
  "wodify.com",
  "pushpress.com",
  "zenplanner.com",
  "mindbodyonline.com",
  "mindbody.io",
  "wellnessliving.com",
  "gymmasteronline.com",
  "gymdesk.com",
  "glofox.com",
  "teamup.com",
  "booksy.com",
  "vagaro.com",
  "schedulicity.com",
  "acuityscheduling.com",
  "square.site",
  "getomnify.com",
  "classpass.com",
  "bbb.org",
  "chamberofcommerce.com",
];

const ignoredEmailPattern =
  /^(?:noreply|no-reply|donotreply|do-not-reply|privacy|legal|abuse|webmaster|postmaster|hostmaster|wordpress|sentry|test|example|user|username|yourname|you)@/i;

export type EmailEnrichmentResult = {
  email?: string;
  sourceUrl?: string;
  method?: "website-page" | "related-platform" | "indexed-public-page";
  pagesChecked: number;
  searchUsed: boolean;
};

type Link = { href: string; text: string };
type EmailHit = { email: string; sourceUrl: string; method: EmailEnrichmentResult["method"] };

type BraveResult = { title?: string; url?: string; description?: string };
type BravePayload = { web?: { results?: BraveResult[] } };

function decodeEntities(value: string) {
  return value
    .replace(/&#x([0-9a-f]+);?/gi, (_, hex: string) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);?/g, (_, decimal: string) => String.fromCodePoint(Number.parseInt(decimal, 10)))
    .replace(/&commat;|&commat/gi, "@")
    .replace(/&period;|&period/gi, ".")
    .replace(/&nbsp;|&nbsp/gi, " ")
    .replace(/&amp;|&amp/gi, "&")
    .replace(/&quot;|&quot/gi, '"')
    .replace(/&#39;|&apos;/gi, "'");
}

function decodeCloudflareEmail(encoded: string) {
  if (!/^[0-9a-f]+$/i.test(encoded) || encoded.length < 4 || encoded.length % 2 !== 0) return "";
  try {
    const key = Number.parseInt(encoded.slice(0, 2), 16);
    let output = "";
    for (let index = 2; index < encoded.length; index += 2) {
      output += String.fromCharCode(Number.parseInt(encoded.slice(index, index + 2), 16) ^ key);
    }
    return output;
  } catch {
    return "";
  }
}

function normalizeEmail(value: string) {
  const email = value
    .trim()
    .replace(/^mailto:/i, "")
    .split(/[?#]/, 1)[0]
    .replace(/[>,;.)\]]+$/g, "")
    .replace(/^[<([\s]+/g, "")
    .toLowerCase();
  if (!/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,24}$/i.test(email)) return "";
  if (/\.(?:png|jpg|jpeg|gif|webp|svg)$/i.test(email)) return "";
  if (/(?:example\.(?:com|org|net)|@domain\.com$|wixpress|sentry)/i.test(email)) return "";
  if (ignoredEmailPattern.test(email)) return "";
  return email;
}

function extractEmails(value: string) {
  const decoded = decodeEntities(value);
  const candidates: string[] = decoded.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,24}/gi) ?? [];

  for (const match of decoded.matchAll(/href\s*=\s*["']mailto:([^"']+)["']/gi)) {
    try {
      candidates.push(decodeURIComponent(match[1]));
    } catch {
      candidates.push(match[1]);
    }
  }

  for (const match of decoded.matchAll(/data-cfemail\s*=\s*["']([0-9a-f]+)["']/gi)) {
    const email = decodeCloudflareEmail(match[1]);
    if (email) candidates.push(email);
  }

  const obfuscated = decoded.matchAll(
    /\b([a-z0-9._%+-]{1,64})\s*(?:\[at\]|\(at\)|\{at\}|\s+at\s+)\s*([a-z0-9.-]{2,190})\s*(?:\[dot\]|\(dot\)|\{dot\}|\s+dot\s+)\s*([a-z]{2,24})\b/gi,
  );
  for (const match of obfuscated) candidates.push(`${match[1]}@${match[2]}.${match[3]}`);

  return Array.from(new Set(candidates.map(normalizeEmail).filter(Boolean))).slice(0, 12);
}

function extractLinks(html: string, baseUrl: string) {
  const links: Link[] = [];
  const anchors = html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi);
  for (const match of anchors) {
    if (links.length >= 800) break;
    const attrs = match[1] || "";
    const hrefMatch = attrs.match(/\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i);
    const href = cleanText(hrefMatch?.[1] ?? hrefMatch?.[2] ?? hrefMatch?.[3] ?? "", 1200);
    if (!href) continue;
    try {
      const absolute = new URL(href, baseUrl);
      if (!["http:", "https:"].includes(absolute.protocol)) continue;
      const text = cleanText(match[2].replace(/<[^>]+>/g, " "), 240);
      links.push({ href: absolute.toString(), text });
    } catch {
      continue;
    }
  }
  return links;
}

function isRelatedServiceUrl(value: string, text = "") {
  try {
    const host = new URL(value).hostname.replace(/^www\./, "").toLowerCase();
    if (relatedServiceHosts.some((item) => host === item || host.endsWith(`.${item}`))) return true;
    return /\b(?:book|booking|schedule|join|membership|member portal|profile|classes|reserve|register)\b/i.test(text);
  } catch {
    return false;
  }
}

function pageLooksRelated(candidate: CandidateRow, pageUrl: string, html: string) {
  try {
    const candidateHost = canonicalHost(candidate.websiteUrl || "");
    const pageHost = canonicalHost(pageUrl);
    if (candidateHost && pageHost === candidateHost) return true;
  } catch {
    // Continue with content verification.
  }

  const signals = inspectHtml(html, pageUrl);
  const content = `${signals.title} ${signals.description} ${signals.visibleText.slice(0, 7000)}`;
  const similarity = tokenSimilarity(candidate.organizationName, content);
  if (similarity >= 0.34) return true;

  const city = cleanText(candidate.city, 100).toLowerCase();
  const orgWords = candidate.organizationName
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length >= 4);
  const normalized = content.toLowerCase();
  return Boolean(
    city &&
      normalized.includes(city) &&
      orgWords.some((word) => normalized.includes(word)),
  );
}

function websiteEmailDomain(websiteUrl: string) {
  try {
    return canonicalHost(websiteUrl).replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

function matchesOfficialDomain(email: string, websiteUrl: string) {
  const domain = email.split("@")[1]?.toLowerCase() || "";
  const websiteDomain = websiteEmailDomain(websiteUrl);
  return Boolean(
    domain &&
      websiteDomain &&
      (domain === websiteDomain ||
        domain.endsWith(`.${websiteDomain}`) ||
        websiteDomain.endsWith(`.${domain}`)),
  );
}

function emailRank(email: string, websiteUrl: string) {
  let score = matchesOfficialDomain(email, websiteUrl) ? 100 : 20;
  if (/^(?:info|contact|hello|office|admin|support|sales|team|frontdesk)@/i.test(email)) score += 20;
  if (/^(?:billing|careers?|jobs?|hr|privacy|legal)@/i.test(email)) score -= 25;
  return score;
}

function bestHit(hits: EmailHit[], websiteUrl: string) {
  return [...hits].sort((a, b) => emailRank(b.email, websiteUrl) - emailRank(a.email, websiteUrl))[0];
}

async function fetchForEmail(candidate: CandidateRow, url: string, method: EmailHit["method"]) {
  try {
    const parsed = parseSafePublicUrl(url);
    if (!parsed) return { hits: [] as EmailHit[], html: "", finalUrl: url };
    const page = await fetchPublicPage(parsed.toString(), 6_000, 800_000);
    if (page.status >= 400 || !page.text || !pageLooksRelated(candidate, page.finalUrl, page.text)) {
      return { hits: [] as EmailHit[], html: page.text || "", finalUrl: page.finalUrl };
    }
    const hits = extractEmails(page.text).map((email) => ({ email, sourceUrl: page.finalUrl, method }));
    return { hits, html: page.text, finalUrl: page.finalUrl };
  } catch {
    return { hits: [] as EmailHit[], html: "", finalUrl: url };
  }
}

async function crawlWebsiteAndRelatedPages(candidate: CandidateRow, websiteUrl: string) {
  const hits: EmailHit[] = [];
  let pagesChecked = 0;
  let homeHtml = "";
  let homeFinalUrl = websiteUrl;

  const home = await fetchForEmail(candidate, websiteUrl, "website-page");
  pagesChecked += 1;
  hits.push(...home.hits);
  homeHtml = home.html;
  homeFinalUrl = home.finalUrl;
  const immediate = bestHit(hits.filter((hit) => matchesOfficialDomain(hit.email, websiteUrl)), websiteUrl);
  if (immediate) return { hit: immediate, pagesChecked };

  const base = parseSafePublicUrl(homeFinalUrl || websiteUrl);
  if (!base) return { hit: bestHit(hits, websiteUrl), pagesChecked };
  const links = extractLinks(homeHtml, base.toString());
  const origin = base.origin;

  const internal = new Set<string>();
  for (const link of links) {
    try {
      const parsed = new URL(link.href);
      if (parsed.origin !== origin) continue;
      if (/\b(?:contact|about|about-us|team|staff|coaches|leadership|membership|join|get-started|location)\b/i.test(`${parsed.pathname} ${link.text}`)) {
        internal.add(parsed.toString());
      }
    } catch {
      continue;
    }
  }
  for (const path of ["/contact", "/contact-us", "/about", "/about-us", "/team", "/staff"]) {
    internal.add(new URL(path, origin).toString());
  }

  for (const url of Array.from(internal).slice(0, MAX_INTERNAL_PAGES)) {
    if (url === homeFinalUrl) continue;
    const result = await fetchForEmail(candidate, url, "website-page");
    pagesChecked += 1;
    hits.push(...result.hits);
    const official = bestHit(hits.filter((hit) => matchesOfficialDomain(hit.email, websiteUrl)), websiteUrl);
    if (official) return { hit: official, pagesChecked };
  }

  const related = links
    .filter((link) => {
      try {
        return new URL(link.href).origin !== origin && isRelatedServiceUrl(link.href, link.text);
      } catch {
        return false;
      }
    })
    .map((link) => link.href);

  for (const url of Array.from(new Set(related)).slice(0, MAX_RELATED_PAGES)) {
    const result = await fetchForEmail(candidate, url, "related-platform");
    pagesChecked += 1;
    hits.push(...result.hits);
    const official = bestHit(hits.filter((hit) => matchesOfficialDomain(hit.email, websiteUrl)), websiteUrl);
    if (official) return { hit: official, pagesChecked };
  }

  const repeatedOffDomain = hits.find((hit) =>
    hits.some((other) => other.sourceUrl !== hit.sourceUrl && other.email === hit.email),
  );
  return { hit: repeatedOffDomain || undefined, pagesChecked };
}

async function reserveContactSearchBudget() {
  const daily = await leadNeonQuery(
    `INSERT INTO public.lead_api_usage (service, period_start, request_count, updated_at)
     VALUES ('brave-contact-enrichment-daily', current_date, 1, now())
     ON CONFLICT (service, period_start) DO UPDATE SET
       request_count = public.lead_api_usage.request_count + 1,
       updated_at = now()
     WHERE public.lead_api_usage.request_count + 1 <= $1::int
     RETURNING request_count::text`,
    [String(DAILY_SEARCH_LIMIT)],
  );
  if (!(daily.rows?.length ?? 0)) return false;
  const monthly = await reserveMonthlyApiUsage("brave-search", 1, BRAVE_MONTHLY_REQUEST_LIMIT);
  return monthly.allowed;
}

async function braveContactSearch(candidate: CandidateRow, websiteUrl: string) {
  const apiKey = process.env.BRAVE_SEARCH_API_KEY?.trim();
  if (!apiKey || !(await reserveContactSearchBudget())) {
    return { hit: undefined as EmailHit | undefined, pagesChecked: 0, searchUsed: false };
  }

  const location = [candidate.city, candidate.state].filter(Boolean).join(" ");
  const query = `"${candidate.organizationName}" ${location ? `"${location}" ` : ""}email`;
  const url = new URL("https://api.search.brave.com/res/v1/web/search");
  url.searchParams.set("q", query);
  url.searchParams.set("count", "10");
  url.searchParams.set("country", candidate.countryCode === "US" ? "us" : "all");
  url.searchParams.set("search_lang", "en");
  url.searchParams.set("safesearch", "moderate");

  let results: BraveResult[] = [];
  try {
    const response = await fetch(url, {
      headers: { Accept: "application/json", "X-Subscription-Token": apiKey },
      cache: "no-store",
      signal: AbortSignal.timeout(12_000),
    });
    if (!response.ok) return { hit: undefined, pagesChecked: 0, searchUsed: true };
    const payload = (await response.json()) as BravePayload;
    results = payload.web?.results ?? [];
  } catch {
    return { hit: undefined, pagesChecked: 0, searchUsed: true };
  }

  const snippetHits: EmailHit[] = [];
  const relevant: BraveResult[] = [];
  for (const result of results) {
    const resultUrl = cleanText(result.url, 1200);
    if (!resultUrl || !/^https?:\/\//i.test(resultUrl)) continue;
    const resultText = `${cleanText(result.title, 220)} ${cleanText(result.description, 700)}`;
    const similarity = tokenSimilarity(candidate.organizationName, resultText);
    const city = cleanText(candidate.city, 100).toLowerCase();
    const locationMatch = city && resultText.toLowerCase().includes(city);
    if (similarity < 0.28 && !locationMatch) continue;
    relevant.push(result);
    for (const email of extractEmails(resultText)) {
      if (matchesOfficialDomain(email, websiteUrl)) {
        snippetHits.push({ email, sourceUrl: resultUrl, method: "indexed-public-page" });
      }
    }
  }

  const snippet = bestHit(snippetHits, websiteUrl);
  if (snippet) return { hit: snippet, pagesChecked: 0, searchUsed: true };

  const pageHits: EmailHit[] = [];
  let pagesChecked = 0;
  for (const result of relevant.slice(0, MAX_SEARCH_PAGES)) {
    const resultUrl = cleanText(result.url, 1200);
    if (!resultUrl) continue;
    const page = await fetchForEmail(candidate, resultUrl, "indexed-public-page");
    pagesChecked += 1;
    pageHits.push(...page.hits.filter((hit) => matchesOfficialDomain(hit.email, websiteUrl)));
    const best = bestHit(pageHits, websiteUrl);
    if (best) return { hit: best, pagesChecked, searchUsed: true };
  }

  return { hit: undefined, pagesChecked, searchUsed: true };
}

export async function enrichPublicEmail(
  candidate: CandidateRow,
  websiteUrl: string,
  allowSearch: boolean,
): Promise<EmailEnrichmentResult> {
  const crawled = await crawlWebsiteAndRelatedPages(candidate, websiteUrl);
  if (crawled.hit) {
    return {
      email: crawled.hit.email,
      sourceUrl: crawled.hit.sourceUrl,
      method: crawled.hit.method,
      pagesChecked: crawled.pagesChecked,
      searchUsed: false,
    };
  }

  if (!allowSearch) {
    return { pagesChecked: crawled.pagesChecked, searchUsed: false };
  }

  const searched = await braveContactSearch(candidate, websiteUrl);
  return {
    email: searched.hit?.email,
    sourceUrl: searched.hit?.sourceUrl,
    method: searched.hit?.method,
    pagesChecked: crawled.pagesChecked + searched.pagesChecked,
    searchUsed: searched.searchUsed,
  };
}
