import {
  CRAWLER_USER_AGENT,
  cleanText,
  normalizeWebsiteUrl,
} from "@/lib/leads/crawl";

const thirdPartyBusinessHosts = new Set([
  "facebook.com",
  "instagram.com",
  "linkedin.com",
  "x.com",
  "twitter.com",
  "tiktok.com",
  "youtube.com",
  "yelp.com",
  "mapquest.com",
  "yellowpages.com",
  "bbb.org",
  "manta.com",
  "chamberofcommerce.com",
  "singleplatform.com",
  "places.singleplatform.com",
]);

const blockedHosts = new Set([
  ...thirdPartyBusinessHosts,
  "indeed.com",
  "glassdoor.com",
  "ziprecruiter.com",
  "clutch.co",
  "designrush.com",
  "goodfirms.co",
  "upcity.com",
  "wix.com",
  "squarespace.com",
  "godaddy.com",
  "google.com",
  "bing.com",
  "brave.com",
]);

const parkedPattern =
  /\b(?:domain(?: name)? (?:is |may be )?for sale|is for sale|buy this domain|get this domain|own it today|lease to own|make an offer|inquire about this domain|this domain is available|domain parking|parked free|sedo domain parking|coming soon|under construction|website coming soon|this site can'?t be reached)\b/i;

const parkingServicePattern =
  /(?:forsale\.godaddy\.com|afternic\.com|sedo\.com|sedoparking\.com|dan\.com|hugedomains\.com|bodis\.com|parkingcrew\.(?:com|net)|undeveloped\.com|domainmarket\.com|above\.com|sav\.com\/domains?|atom\.com\/name|squadhelp\.com\/name)/i;

const privateIpPattern =
  /^(?:127\.|10\.|0\.|169\.254\.|192\.168\.|172\.(?:1[6-9]|2\d|3[01])\.|\[?::1\]?$|\[?(?:fc|fd|fe80))/i;

function safePublicUrl(value: string) {
  const normalized = normalizeWebsiteUrl(value);
  if (!normalized) return null;
  try {
    const parsed = new URL(normalized);
    const host = parsed.hostname.toLowerCase();
    if (
      !host ||
      host === "localhost" ||
      host.endsWith(".local") ||
      host.endsWith(".internal") ||
      privateIpPattern.test(host)
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function hostMatchesSet(host: string, values: Set<string>) {
  return values.has(host) || Array.from(values).some((value) => host.endsWith(`.${value}`));
}

export function isThirdPartyBusinessUrl(value: string) {
  const parsed = safePublicUrl(value);
  if (!parsed) return false;
  const host = parsed.hostname.replace(/^www\./, "").toLowerCase();
  return hostMatchesSet(host, thirdPartyBusinessHosts);
}

export function isBlockedProspectUrl(value: string) {
  const parsed = safePublicUrl(value);
  if (!parsed) return true;
  const host = parsed.hostname.replace(/^www\./, "").toLowerCase();
  if (hostMatchesSet(host, blockedHosts) || parkingServicePattern.test(parsed.toString())) {
    return true;
  }
  return /\/(?:jobs?|careers?|blog|articles?|guides?|resources?|directory|agencies|companies|marketplace)(?:\/|$)/i.test(
    parsed.pathname,
  );
}

async function readLimitedText(response: Response, maxBytes = 2_000_000) {
  if (!response.body) return "";
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let bytes = 0;
  let text = "";
  try {
    while (bytes < maxBytes) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      const remaining = maxBytes - bytes;
      const slice = value.byteLength > remaining ? value.slice(0, remaining) : value;
      bytes += slice.byteLength;
      text += decoder.decode(slice, { stream: true });
      if (slice.byteLength < value.byteLength) break;
    }
    text += decoder.decode();
  } finally {
    await reader.cancel().catch(() => undefined);
  }
  return text;
}

export type PublicFetchResult = {
  requestedUrl: string;
  finalUrl: string;
  status: number;
  contentType: string;
  text: string;
  responseMs: number;
  bytes: number;
};

export async function fetchPublicPage(
  value: string,
  timeoutMs = 10_000,
  maxBytes = 2_000_000,
): Promise<PublicFetchResult> {
  let current = safePublicUrl(value);
  if (!current) throw new Error("URL is not a safe public HTTP address.");
  const startedAt = Date.now();

  for (let redirects = 0; redirects <= 4; redirects += 1) {
    const response = await fetch(current, {
      redirect: "manual",
      cache: "no-store",
      headers: {
        Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.5",
        "User-Agent": CRAWLER_USER_AGENT,
      },
      signal: AbortSignal.timeout(timeoutMs),
    });

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) {
        return {
          requestedUrl: value,
          finalUrl: current.toString(),
          status: response.status,
          contentType: response.headers.get("content-type") ?? "",
          text: "",
          responseMs: Date.now() - startedAt,
          bytes: 0,
        };
      }
      const redirected = safePublicUrl(new URL(location, current).toString());
      if (!redirected) throw new Error("Website redirected to a non-public address.");
      current = redirected;
      continue;
    }

    const contentType = response.headers.get("content-type") ?? "";
    const text = /html|xhtml|text\//i.test(contentType)
      ? await readLimitedText(response, maxBytes)
      : "";

    return {
      requestedUrl: value,
      finalUrl: current.toString(),
      status: response.status,
      contentType,
      text,
      responseMs: Date.now() - startedAt,
      bytes: new TextEncoder().encode(text).byteLength,
    };
  }
  throw new Error("Website exceeded the redirect limit.");
}

function robotsRules(text: string) {
  const lines = text.split(/\r?\n/);
  let applies = false;
  const disallow: string[] = [];
  const allow: string[] = [];
  for (const raw of lines) {
    const line = raw.replace(/#.*$/, "").trim();
    if (!line) continue;
    const separator = line.indexOf(":");
    if (separator < 0) continue;
    const field = line.slice(0, separator).trim().toLowerCase();
    const value = line.slice(separator + 1).trim();
    if (field === "user-agent") {
      applies = value === "*" || /rukh-leads/i.test(value);
      continue;
    }
    if (!applies) continue;
    if (field === "disallow" && value) disallow.push(value);
    if (field === "allow" && value) allow.push(value);
  }
  return { disallow, allow };
}

export async function canCrawlPath(value: string, path: string) {
  const parsed = safePublicUrl(value);
  if (!parsed) return false;
  try {
    const robotsUrl = new URL("/robots.txt", parsed);
    const response = await fetch(robotsUrl, {
      cache: "no-store",
      headers: { "User-Agent": CRAWLER_USER_AGENT, Accept: "text/plain" },
      signal: AbortSignal.timeout(5_000),
    });
    if (!response.ok) return true;
    const text = await readLimitedText(response, 200_000);
    const rules = robotsRules(text);
    const allowedSpecific = rules.allow.some((rule) => path.startsWith(rule));
    if (allowedSpecific) return true;
    return !rules.disallow.some((rule) => rule === "/" || path.startsWith(rule));
  } catch {
    return true;
  }
}

function extractAttribute(tag: string, attribute: string) {
  const expression = new RegExp(
    `${attribute}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`,
    "i",
  );
  const match = tag.match(expression);
  return cleanText(match?.[1] ?? match?.[2] ?? match?.[3] ?? "", 1000);
}

function metaContent(html: string, key: string) {
  const tags = html.match(/<meta\b[^>]*>/gi) ?? [];
  for (const tag of tags) {
    const name = extractAttribute(tag, "name").toLowerCase();
    const property = extractAttribute(tag, "property").toLowerCase();
    if (name === key.toLowerCase() || property === key.toLowerCase()) {
      return extractAttribute(tag, "content");
    }
  }
  return "";
}

function stripHtml(html: string, max = 20_000) {
  return cleanText(
    html
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<[^>]+>/g, " "),
    max,
  );
}

function extractLinks(html: string, baseUrl: string) {
  const tags = html.match(/<a\b[^>]*>/gi) ?? [];
  const links: Array<{ href: string; text: string }> = [];
  for (const tag of tags.slice(0, 600)) {
    const href = extractAttribute(tag, "href");
    if (!href) continue;
    try {
      const absolute = new URL(href, baseUrl);
      if (!["http:", "https:", "mailto:", "tel:"].includes(absolute.protocol)) continue;
      links.push({ href: absolute.toString(), text: cleanText(tag, 200) });
    } catch {
      continue;
    }
  }
  return links;
}

function extractEmails(html: string) {
  const matches = html.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,24}/gi) ?? [];
  return Array.from(
    new Set(
      matches
        .map((email) => email.toLowerCase())
        .filter((email) => !/\.(?:png|jpg|jpeg|gif|webp|svg)$/i.test(email))
        .filter((email) => !/(?:example\.(?:com|org|net)|@domain\.com$|sentry|wixpress|wordpress)/i.test(email))
        .filter((email) => !/^(?:user|username|name|email|test|example|yourname|you)@/i.test(email)),
    ),
  ).slice(0, 5);
}

function extractPhones(html: string) {
  const telLinks = Array.from(
    html.matchAll(/href\s*=\s*["']tel:([^"']+)["']/gi),
    (match) => cleanText(match[1], 40),
  );
  const textMatches = html.match(/(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}/g) ?? [];
  return Array.from(new Set([...telLinks, ...textMatches])).slice(0, 5);
}

function newestCopyrightYear(text: string) {
  const years = Array.from(
    text.matchAll(/(?:©|copyright(?:\s*©)?)[^\d]{0,20}(20\d{2})/gi),
    (match) => Number(match[1]),
  ).filter((year) => year >= 2000 && year <= new Date().getFullYear() + 1);
  return years.length ? Math.max(...years) : undefined;
}

function technology(html: string) {
  const checks: Array<[RegExp, string]> = [
    [/wp-content|wordpress/i, "WordPress"],
    [/wixstatic|wix-code|wixsite/i, "Wix"],
    [/static1\.squarespace|squarespace/i, "Squarespace"],
    [/cdn\.shopify|shopify/i, "Shopify"],
    [/weebly|editmysite/i, "Weebly"],
    [/godaddysites|secureservercdn/i, "GoDaddy Website Builder"],
    [/webflow/i, "Webflow"],
  ];
  return checks.find(([pattern]) => pattern.test(html))?.[1];
}

function commercialStack(html: string) {
  const checks: Array<[RegExp, string]> = [
    [/AW-\d+|googleadservices\.com|googletagmanager\.com\/gtag|google_conversion/i, "Google Ads / conversion tracking"],
    [/connect\.facebook\.net\/.*fbevents|\bfbq\s*\(/i, "Meta Pixel"],
    [/bat\.bing\.com|\buetq\b/i, "Microsoft Ads UET"],
    [/analytics\.tiktok\.com\/.*pixel|\bttq\b/i, "TikTok Pixel"],
    [/wodify/i, "Wodify"],
    [/mindbodyonline|mindbody/i, "Mindbody"],
    [/zenplanner/i, "Zen Planner"],
    [/toasttab|toast\.com/i, "Toast"],
    [/squareup|square\.site|square\.com/i, "Square"],
    [/cdn\.shopify|shopify/i, "Shopify"],
    [/js\.stripe\.com|stripe/i, "Stripe"],
    [/calendly/i, "Calendly"],
    [/hubspot|hs-scripts\.com|hsforms/i, "HubSpot"],
  ];
  return Array.from(new Set(checks.filter(([pattern]) => pattern.test(html)).map(([, label]) => label)));
}

export type PageSignals = {
  title: string;
  description: string;
  visibleText: string;
  emails: string[];
  phones: string[];
  contactUrl?: string;
  hasViewport: boolean;
  hasForm: boolean;
  hasCta: boolean;
  hasCanonical: boolean;
  hasOpenGraph: boolean;
  hasHtmlLang: boolean;
  h1Count: number;
  imageCount: number;
  altImageCount: number;
  copyrightYear?: number;
  technology?: string;
  commercialStack: string[];
  parked: boolean;
};

export function inspectHtml(html: string, baseUrl: string): PageSignals {
  const title = cleanText(html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1], 180);
  const description = metaContent(html, "description");
  const visibleText = stripHtml(html);
  const links = extractLinks(html, baseUrl);
  const contact = links.find((link) =>
    /\b(contact|quote|estimate|book|appointment|consultation|get started)\b/i.test(`${link.href} ${link.text}`),
  );
  const images = html.match(/<img\b[^>]*>/gi) ?? [];
  const altImageCount = images.filter((tag) => /\balt\s*=\s*["'][^"']+["']/i.test(tag)).length;
  const parkingEvidence = `${baseUrl} ${title} ${description} ${visibleText} ${html.slice(0, 50_000)}`;

  return {
    title,
    description,
    visibleText,
    emails: extractEmails(html),
    phones: extractPhones(html),
    contactUrl: contact?.href,
    hasViewport: /<meta\b[^>]*name\s*=\s*["']viewport["']/i.test(html),
    hasForm: /<form\b/i.test(html),
    hasCta: /\b(get (?:a )?quote|request (?:a )?quote|book (?:now|online|an appointment)|schedule|contact us|call (?:now|today)|get started|free consultation|request service)\b/i.test(visibleText),
    hasCanonical: /<link\b[^>]*rel\s*=\s*["'][^"']*canonical/i.test(html),
    hasOpenGraph: Boolean(metaContent(html, "og:title")),
    hasHtmlLang: /<html\b[^>]*\blang\s*=\s*["'][^"']+/i.test(html),
    h1Count: (html.match(/<h1\b/gi) ?? []).length,
    imageCount: images.length,
    altImageCount,
    copyrightYear: newestCopyrightYear(visibleText),
    technology: technology(html),
    commercialStack: commercialStack(html),
    parked: parkedPattern.test(parkingEvidence) || parkingServicePattern.test(parkingEvidence),
  };
}

export function parseSafePublicUrl(value: string) {
  return safePublicUrl(value);
}
