const EMAIL_PATTERN = /[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?(?:\.[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?)+/gi;
const WEBSITE_PATTERN = /(?:https?:\/\/|www\.)[^\s;,|<>"']+|(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}(?:\/[^\s;,|<>"']*)?/gi;

const FREE_EMAIL_DOMAINS = new Set([
  "aol.com",
  "comcast.net",
  "gmail.com",
  "hotmail.com",
  "icloud.com",
  "live.com",
  "outlook.com",
  "proton.me",
  "protonmail.com",
  "yahoo.com",
]);

const ROLE_PRIORITY = new Map([
  ["hello", 35],
  ["info", 34],
  ["contact", 33],
  ["office", 30],
  ["sales", 28],
  ["admin", 24],
  ["support", 20],
]);

function unique(values: string[]) {
  return [...new Set(values)];
}

function normalizeWebsiteCandidate(value: string) {
  const candidate = value.trim().replace(/[.)\]}>,]+$/g, "");
  if (!candidate) return null;
  const withProtocol = /^https?:\/\//i.test(candidate) ? candidate : `https://${candidate}`;
  try {
    const parsed = new URL(withProtocol);
    if (!["http:", "https:"].includes(parsed.protocol)) return null;
    parsed.hash = "";
    return parsed.toString();
  } catch {
    return null;
  }
}

export function extractEmailAddresses(value: unknown) {
  if (typeof value !== "string") return [];
  return unique(
    (value.match(EMAIL_PATTERN) ?? [])
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function extractWebsiteUrls(value: unknown) {
  if (typeof value !== "string") return [];
  return unique(
    (value.match(WEBSITE_PATTERN) ?? [])
      .map(normalizeWebsiteCandidate)
      .filter((url): url is string => Boolean(url)),
  );
}

export function selectPrimaryWebsite(value: unknown) {
  return extractWebsiteUrls(value)[0] ?? null;
}

function websiteHost(value: unknown) {
  const website = selectPrimaryWebsite(value);
  if (!website) return "";
  try {
    return new URL(website).hostname.replace(/^www\./i, "").toLowerCase();
  } catch {
    return "";
  }
}

export function selectPrimaryEmail(value: unknown, website?: unknown) {
  const candidates = extractEmailAddresses(value);
  if (!candidates.length) return "";

  const host = websiteHost(website);
  return candidates
    .map((email, index) => {
      const [local = "", domain = ""] = email.split("@");
      let score = -index;
      if (host && (domain === host || host.endsWith(`.${domain}`) || domain.endsWith(`.${host}`))) score += 100;
      score += ROLE_PRIORITY.get(local) ?? 0;
      if (FREE_EMAIL_DOMAINS.has(domain)) score -= 12;
      if (/^(?:no-?reply|donotreply|mailer-daemon)$/i.test(local)) score -= 200;
      return { email, score };
    })
    .sort((left, right) => right.score - left.score)[0]?.email ?? "";
}

export function contactValueMetadata(emailValue: unknown, websiteValue: unknown) {
  const emailCandidates = extractEmailAddresses(emailValue);
  const websiteCandidates = extractWebsiteUrls(websiteValue);
  const primaryEmail = selectPrimaryEmail(emailValue, websiteCandidates[0]);
  const primaryWebsite = websiteCandidates[0] ?? null;

  return {
    primaryEmail: primaryEmail || null,
    primaryWebsite,
    emailCandidates,
    websiteCandidates,
    alternateContactEmails: emailCandidates.filter((email) => email !== primaryEmail),
    alternateWebsiteUrls: websiteCandidates.slice(1),
  };
}
