import type { CandidateRow } from "@/lib/leads/crawl";
import {
  canonicalHost,
  clamp,
  cleanText,
  normalizeWebsiteUrl,
  organizationTokens,
  tokenSimilarity,
} from "@/lib/leads/crawl";
import {
  fetchPublicPage,
  inspectHtml,
  isBlockedProspectUrl,
} from "@/lib/leads/site-fetch";

function slugify(tokens: string[]) {
  return tokens.join("").replace(/[^a-z0-9]/g, "");
}

const genericEmailHosts = new Set([
  "gmail.com",
  "googlemail.com",
  "yahoo.com",
  "ymail.com",
  "rocketmail.com",
  "hotmail.com",
  "outlook.com",
  "live.com",
  "msn.com",
  "aol.com",
  "icloud.com",
  "me.com",
  "mac.com",
  "proton.me",
  "protonmail.com",
  "pm.me",
  "gmx.com",
  "gmx.us",
  "mail.com",
  "zoho.com",
  "fastmail.com",
  "hey.com",
  "comcast.net",
  "xfinity.com",
  "verizon.net",
  "att.net",
  "sbcglobal.net",
  "bellsouth.net",
  "cox.net",
  "charter.net",
  "spectrum.net",
  "centurylink.net",
  "q.com",
  "earthlink.net",
  "frontier.com",
  "frontiernet.net",
  "optimum.net",
  "optonline.net",
]);

function emailDomainGuesses(email?: string) {
  const domain = cleanText(email, 220).toLowerCase().split("@")[1]?.replace(/^www\./, "");
  if (!domain || genericEmailHosts.has(domain) || !/^[a-z0-9.-]+\.[a-z]{2,24}$/i.test(domain)) {
    return [];
  }

  const guesses = [`https://${domain}/`];
  const labels = domain.split(".").filter(Boolean);
  const multipartSuffix = /\.(?:co|org|net|gov|ac)\.(?:uk|au|nz|za)$/i.test(domain);
  if (labels.length >= 3 && !multipartSuffix) {
    guesses.push(`https://${labels.slice(-2).join(".")}/`);
  }
  return Array.from(new Set(guesses));
}

export function candidateDomainGuesses(candidate: CandidateRow) {
  const tokens = organizationTokens(candidate.organizationName).slice(0, 5);
  const compact = slugify(tokens);
  const short = slugify(tokens.slice(0, 3));
  const firstTwo = slugify(tokens.slice(0, 2));
  const city = cleanText(candidate.city, 80).toLowerCase().replace(/[^a-z0-9]/g, "");
  const bases = Array.from(
    new Set(
      [
        compact,
        short,
        firstTwo,
        city && short ? `${short}${city}` : "",
        city && short ? `${city}${short}` : "",
      ].filter((value) => value.length >= 4 && value.length <= 45),
    ),
  );
  const tlds = candidate.source === "national-nonprofits" ? ["org", "com"] : ["com", "org", "net"];
  const nameGuesses = bases.flatMap((base) => tlds.map((tld) => `https://${base}.${tld}/`));

  // A public organization-specific email address is one of the strongest free domain hints
  // available. Try it before name/city guesses or consuming a Brave request. The normal
  // page-verification logic still has to prove that the site actually belongs to the business.
  return Array.from(new Set([...emailDomainGuesses(candidate.email), ...nameGuesses])).slice(0, 12);
}

export async function verifyOfficialWebsite(candidate: CandidateRow, url: string) {
  if (isBlockedProspectUrl(url)) return null;
  try {
    const result = await fetchPublicPage(url, 7_000, 500_000);
    if (result.status >= 400 || !result.text) return null;
    if (isBlockedProspectUrl(result.finalUrl)) return null;

    const signals = inspectHtml(result.text, result.finalUrl);
    if (signals.parked) return null;

    // A matching hostname alone is not proof that this is the organization's live site.
    // Tiny redirect/parking stubs frequently use the business-looking domain itself.
    if (result.bytes < 600 || signals.visibleText.length < 80) return null;

    const contentText = `${signals.title} ${signals.description} ${signals.visibleText.slice(0, 4000)}`;
    const contentSimilarity = tokenSimilarity(candidate.organizationName, contentText);
    if (contentSimilarity < 0.35) return null;

    const host = canonicalHost(result.finalUrl);
    const compactOrg = organizationTokens(candidate.organizationName).join("");
    const hostCompact = host.replace(/[^a-z0-9]/g, "");
    const hostMatch =
      compactOrg.length >= 5 &&
      hostCompact.includes(compactOrg.slice(0, Math.min(compactOrg.length, 18)))
        ? 0.72
        : 0;
    const similarity = Math.max(contentSimilarity, hostMatch);
    if (similarity < 0.45) return null;

    return {
      url: result.finalUrl,
      confidence: clamp(55 + similarity * 45),
      title: signals.title,
    };
  } catch {
    return null;
  }
}

type BraveResult = { title?: string; url?: string; description?: string };
type BravePayload = { web?: { results?: BraveResult[] } };

export async function searchOfficialWebsite(candidate: CandidateRow, apiKey: string) {
  const location = [candidate.city, candidate.state].filter(Boolean).join(" ");
  const query = `"${candidate.organizationName}" ${location} official website`;
  const url = new URL("https://api.search.brave.com/res/v1/web/search");
  url.searchParams.set("q", query);
  url.searchParams.set("count", "10");
  url.searchParams.set("country", candidate.countryCode === "US" ? "us" : "all");
  url.searchParams.set("search_lang", "en");
  url.searchParams.set("safesearch", "moderate");

  const response = await fetch(url, {
    headers: { Accept: "application/json", "X-Subscription-Token": apiKey },
    cache: "no-store",
    signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) throw new Error(`Brave domain research returned ${response.status}.`);
  const payload = (await response.json()) as BravePayload;

  for (const result of payload.web?.results ?? []) {
    const candidateUrl = normalizeWebsiteUrl(result.url);
    if (!candidateUrl || isBlockedProspectUrl(candidateUrl)) continue;
    const resultText = `${cleanText(result.title, 200)} ${cleanText(result.description, 400)} ${canonicalHost(candidateUrl)}`;
    if (tokenSimilarity(candidate.organizationName, resultText) < 0.45) continue;
    const verified = await verifyOfficialWebsite(candidate, candidateUrl);
    if (verified) return verified;
  }
  return null;
}
