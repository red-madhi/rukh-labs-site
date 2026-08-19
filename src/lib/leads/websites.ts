import {
  canonicalHost,
  cleanText,
  normalizeWebsiteUrl,
  organizationTokens,
  tokenSimilarity,
} from "@/lib/leads/crawl";
import {
  canCrawlPath,
  fetchPublicPage,
  inspectHtml,
  isBlockedProspectUrl,
  parseSafePublicUrl,
} from "@/lib/leads/site-fetch";

export type WebsitePage = {
  requestedUrl: string;
  finalUrl: string;
  status: number;
  contentType: string;
  html: string;
  responseMs: number;
  bytes: number;
};

const weakTokens = new Set([
  "and",
  "group",
  "services",
  "service",
  "solutions",
  "company",
  "business",
  "center",
  "associates",
]);

function domainSlug(name: string) {
  return organizationTokens(name)
    .filter((token) => !weakTokens.has(token))
    .slice(0, 5)
    .join("");
}

export function candidateDomainGuesses(organizationName: string) {
  const compact = domainSlug(organizationName);
  const dashed = organizationTokens(organizationName)
    .filter((token) => !weakTokens.has(token))
    .slice(0, 5)
    .join("-");
  if (!compact) return [];

  return Array.from(
    new Set(
      [
        `https://${compact}.com/`,
        `https://www.${compact}.com/`,
        dashed && `https://${dashed}.com/`,
        `https://${compact}.org/`,
        `https://${compact}.net/`,
      ].filter((value): value is string => Boolean(value)),
    ),
  );
}

export function cleanSearchResultUrl(value: string) {
  const normalized = normalizeWebsiteUrl(value);
  if (!normalized || isBlockedProspectUrl(normalized)) return null;
  try {
    const url = new URL(normalized);
    url.hash = "";
    for (const parameter of [
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_term",
      "utm_content",
      "gclid",
      "fbclid",
    ]) {
      url.searchParams.delete(parameter);
    }
    return url.toString();
  } catch {
    return null;
  }
}

export async function robotsAllows(value: string) {
  const parsed = parseSafePublicUrl(value);
  if (!parsed) return false;
  return canCrawlPath(parsed.toString(), parsed.pathname || "/");
}

export async function fetchPage(
  value: string,
  timeoutMs = 10_000,
  maxBytes = 2_000_000,
): Promise<WebsitePage> {
  const page = await fetchPublicPage(value, timeoutMs, maxBytes);
  return {
    requestedUrl: page.requestedUrl,
    finalUrl: page.finalUrl,
    status: page.status,
    contentType: page.contentType,
    html: page.text,
    responseMs: page.responseMs,
    bytes: page.bytes,
  };
}

function digits(value?: string | null) {
  return (value ?? "").replace(/\D+/g, "");
}

export function pageMatchesBusiness(
  page: WebsitePage,
  organizationName: string,
  city?: string | null,
  contactPhone?: string | null,
) {
  if (page.status >= 400 || !page.html || isBlockedProspectUrl(page.finalUrl)) return false;
  const facts = inspectHtml(page.html, page.finalUrl);
  const comparable = cleanText(
    `${facts.title} ${facts.description} ${facts.visibleText.slice(0, 12_000)} ${canonicalHost(page.finalUrl)}`,
    16_000,
  );
  const similarity = tokenSimilarity(organizationName, comparable);
  const phone = digits(contactPhone);
  const phoneMatch = phone.length >= 10 && digits(comparable).includes(phone.slice(-10));
  const cityMatch = Boolean(city && new RegExp(`\\b${city.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(comparable));

  return similarity >= 0.6 || phoneMatch || (similarity >= 0.4 && cityMatch);
}

export function extractPageFacts(html: string, baseUrl: string) {
  const facts = inspectHtml(html, baseUrl);
  return {
    email: facts.emails[0] ?? null,
    phone: facts.phones[0] ?? null,
    contactUrl: facts.contactUrl ?? null,
    title: facts.title || null,
    description: facts.description || null,
    visibleText: facts.visibleText,
  };
}
