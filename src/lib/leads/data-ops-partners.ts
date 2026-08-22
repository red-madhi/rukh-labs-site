import { clamp, cleanText } from "@/lib/leads/crawl";
import type { PowerBiGigInput } from "@/lib/leads/power-bi";

export type DataOpsPartnerSearch = {
  label: string;
  query: string;
};

export type DataOpsPartnerSearchResult = {
  title?: string;
  url?: string;
  description?: string;
};

export const DATA_OPS_PARTNER_SEARCHES: readonly DataOpsPartnerSearch[] = [
  {
    label: "Power BI + Fabric consulting firms",
    query: '"Power BI" "Microsoft Fabric" ("consulting services" OR "implementation services") -jobs -careers -blog -training -course',
  },
  {
    label: "Power BI managed-services firms",
    query: '"Power BI" ("managed services" OR "managed analytics") consulting -jobs -careers -blog -training',
  },
  {
    label: "BI migration consultancies",
    query: '("Power BI" OR "Microsoft Fabric") (migration OR modernization) (consulting OR services) -jobs -careers -blog -article',
  },
  {
    label: "Microsoft BI implementation firms",
    query: '"Power BI" "implementation" (consulting OR "professional services") -jobs -careers -blog -webinar -training',
  },
] as const;

const blockedHosts = [
  "linkedin.com",
  "x.com",
  "twitter.com",
  "facebook.com",
  "instagram.com",
  "youtube.com",
  "reddit.com",
  "medium.com",
  "substack.com",
  "microsoft.com",
  "appsource.microsoft.com",
  "learn.microsoft.com",
  "clutch.co",
  "g2.com",
  "glassdoor.com",
  "indeed.com",
  "ziprecruiter.com",
  "dice.com",
  "upwork.com",
  "fiverr.com",
  "freelancer.com",
] as const;

const contentPathPattern =
  /\/(?:blog|blogs|article|articles|insights?|news|press|careers?|jobs?|vacancies|training|academy|courses?|webinars?|events?|resources?|whitepapers?|ebooks?|guides?)(?:\/|$)/i;
const stackPattern = /\b(?:power\s*bi|microsoft fabric|power query|business intelligence|analytics)\b/i;
const providerPattern =
  /\b(?:power\s*bi|microsoft fabric|business intelligence|analytics)\b[\s\S]{0,170}\b(?:consulting|consultants?|services?|solutions?|implementation|migration|modernization|managed services?|advisory|development)\b|\b(?:consulting|consultants?|services?|solutions?|implementation|migration|modernization|managed services?|advisory|development)\b[\s\S]{0,170}\b(?:power\s*bi|microsoft fabric|business intelligence|analytics)\b/i;
const firstPartyPattern =
  /\b(?:our services|our clients|our customers|we help|we deliver|we implement|we build|we provide|contact us|talk to us|our team|about us|professional services)\b/i;
const employmentOnlyPattern =
  /\b(?:apply now|open positions?|job openings?|careers at|salary range|employee benefits|submit (?:your )?resume|join our team)\b/i;
const editorialOnlyPattern =
  /\b(?:in this article|in this guide|read more|table of contents|published on|author:|written by|subscribe to our newsletter)\b/i;
const genericNamePattern =
  /^(?:home|homepage|power bi|microsoft fabric|power bi consulting|power bi services|business intelligence|analytics|data analytics|consulting services|professional services)$/i;

function hostOf(value: string) {
  try {
    return new URL(value).hostname.replace(/^www\./i, "").toLowerCase();
  } catch {
    return "";
  }
}

function isBlockedHost(host: string) {
  return blockedHosts.some((blocked) => host === blocked || host.endsWith(`.${blocked}`));
}

function isPrivateHost(host: string) {
  if (!host || host === "localhost" || host.endsWith(".local")) return true;
  if (/^(?:127|10)\./.test(host)) return true;
  if (/^192\.168\./.test(host)) return true;
  const private172 = host.match(/^172\.(\d{1,3})\./);
  if (private172 && Number(private172[1]) >= 16 && Number(private172[1]) <= 31) return true;
  if (/^(?:0|169\.254)\./.test(host)) return true;
  if (host === "::1" || host.startsWith("fc") || host.startsWith("fd") || host.startsWith("fe80:")) return true;
  return false;
}

function safePublicUrl(value: string) {
  try {
    const url = new URL(value);
    if (!/^https?:$/.test(url.protocol)) return null;
    const host = url.hostname.replace(/^www\./i, "").toLowerCase();
    if (isPrivateHost(host) || isBlockedHost(host)) return null;
    return url;
  } catch {
    return null;
  }
}

function decodeHtml(value: string) {
  return value
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&#x27;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function stripHtml(html: string) {
  return cleanText(
    decodeHtml(
      html
        .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
        .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
        .replace(/<noscript\b[\s\S]*?<\/noscript>/gi, " ")
        .replace(/<svg\b[\s\S]*?<\/svg>/gi, " "),
    ),
    24_000,
  );
}

function metaContent(html: string, key: string) {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [
    new RegExp(`<meta[^>]+(?:property|name)=["']${escaped}["'][^>]+content=["']([^"']+)["'][^>]*>`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${escaped}["'][^>]*>`, "i"),
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    const value = cleanText(decodeHtml(match?.[1] || ""), 180);
    if (value) return value;
  }
  return "";
}

function titleText(html: string) {
  return cleanText(decodeHtml(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || ""), 220);
}

function structuredOrganizationName(html: string) {
  const scripts = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)].slice(0, 12);
  for (const script of scripts) {
    const raw = script[1]?.trim();
    if (!raw) continue;
    try {
      const parsed = JSON.parse(raw) as unknown;
      const queue = Array.isArray(parsed) ? [...parsed] : [parsed];
      while (queue.length) {
        const value = queue.shift();
        if (!value || typeof value !== "object") continue;
        const record = value as Record<string, unknown>;
        const type = Array.isArray(record["@type"])
          ? record["@type"].map(String).join(" ")
          : String(record["@type"] || "");
        const name = cleanText(record.name, 160);
        if (/Organization|Corporation|ProfessionalService|LocalBusiness|SoftwareApplication|AccountingService/i.test(type) && name) {
          return name;
        }
        const graph = record["@graph"];
        if (Array.isArray(graph)) queue.push(...graph);
      }
    } catch {
      continue;
    }
  }
  return "";
}

function normalizeEntityCandidate(value: string) {
  return cleanText(value, 140)
    .replace(/\s*\(20\d{2}\)\s*$/i, "")
    .replace(/\s+[|–—-]\s+(?:home|official site)$/i, "")
    .trim();
}

function plausibleEntityName(value: string) {
  const name = normalizeEntityCandidate(value);
  if (name.length < 2 || name.length > 100 || genericNamePattern.test(name)) return false;
  if (/\b(?:guide|tutorial|pricing|salary|jobs?|careers?|course|webinar|certification)\b/i.test(name)) return false;
  if (/\b(?:power\s*bi|microsoft fabric)\b.{0,60}\b(?:consulting|services|implementation|migration)\b/i.test(name)) return false;
  if (/^https?:\/\//i.test(name) || /^[a-z0-9-]+\.[a-z]{2,}$/i.test(name)) return false;
  return true;
}

function titleCandidates(value: string) {
  const normalized = normalizeEntityCandidate(value);
  const parts = normalized
    .split(/\s+(?:\||–|—|»|::)\s+|\s+-\s+/)
    .map(normalizeEntityCandidate)
    .filter(Boolean);
  return [...parts.reverse(), normalized];
}

function hostCandidate(host: string) {
  const label = host.split(".")[0] || "";
  return label
    .split(/[-_]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function resolveEntityName(html: string, searchTitle: string, host: string) {
  const values = [
    structuredOrganizationName(html),
    metaContent(html, "og:site_name"),
    metaContent(html, "application-name"),
    ...titleCandidates(titleText(html)),
    ...titleCandidates(searchTitle),
    hostCandidate(host),
  ];
  return values.map(normalizeEntityCandidate).find(plausibleEntityName) || "";
}

function extractEmail(html: string, host: string) {
  const candidates = [...html.matchAll(/mailto:([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/gi)]
    .map((match) => match[1]?.toLowerCase())
    .filter((value): value is string => Boolean(value));
  const firstParty = candidates.find((email) => email.endsWith(`@${host}`) || host.endsWith(email.split("@")[1] || "__never__"));
  return firstParty || candidates[0] || undefined;
}

function extractPhone(html: string) {
  const raw = html.match(/href=["']tel:([^"']{7,40})["']/i)?.[1];
  return cleanText(raw, 40) || undefined;
}

function extractContactUrl(html: string, pageUrl: URL) {
  const links = [...html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)].slice(0, 400);
  for (const match of links) {
    const href = decodeHtml(match[1] || "").trim();
    const label = stripHtml(match[2] || "").toLowerCase();
    if (!/contact|talk to|speak with|book|schedule|consultation|get started|request/.test(`${href} ${label}`)) continue;
    try {
      const resolved = new URL(href, pageUrl);
      if (resolved.hostname.replace(/^www\./i, "").toLowerCase() !== pageUrl.hostname.replace(/^www\./i, "").toLowerCase()) continue;
      if (!/^https?:$/.test(resolved.protocol)) continue;
      resolved.hash = "";
      return resolved.toString();
    } catch {
      continue;
    }
  }
  return undefined;
}

function partnerType(text: string) {
  if (/\bfractional cfo\b|\bbookkeeping\b|\baccounting (?:firm|services)\b/i.test(text)) {
    return { type: "Fractional finance / accounting firm", tag: "partner-type:fractional-finance" };
  }
  if (/\bmanaged (?:it|technology|analytics|data|cloud) services\b|\bmsp\b/i.test(text)) {
    return { type: "MSP / technology services firm", tag: "partner-type:msp" };
  }
  if (/\b(?:erp|hris|crm)\b.{0,90}\b(?:implementation|consulting|services)\b/i.test(text)) {
    return { type: "Systems implementation consultancy", tag: "partner-type:implementation" };
  }
  return { type: "BI / Microsoft consultancy", tag: "partner-type:bi-consultancy" };
}

export async function verifyDataOpsPartnerResult(
  result: DataOpsPartnerSearchResult,
  search: DataOpsPartnerSearch,
): Promise<PowerBiGigInput | null> {
  const resultUrl = result.url?.trim() || "";
  const pageUrl = safePublicUrl(resultUrl);
  if (!pageUrl || contentPathPattern.test(pageUrl.pathname)) return null;
  const host = pageUrl.hostname.replace(/^www\./i, "").toLowerCase();
  const searchTitle = cleanText(result.title, 260);
  const searchDescription = cleanText(result.description, 900);
  if (!stackPattern.test(`${searchTitle} ${searchDescription}`)) return null;

  let response: Response;
  try {
    response = await fetch(pageUrl, {
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "User-Agent": "Mozilla/5.0 (compatible; Rukh-Leads/1.0; +https://rukhlabs.com)",
      },
      cache: "no-store",
      redirect: "follow",
      signal: AbortSignal.timeout(7_000),
    });
  } catch {
    return null;
  }
  if (!response.ok) return null;
  const contentType = response.headers.get("content-type") || "";
  if (!/text\/html|application\/xhtml\+xml/i.test(contentType)) return null;

  const finalUrl = safePublicUrl(response.url || pageUrl.toString());
  if (!finalUrl) return null;
  const finalHost = finalUrl.hostname.replace(/^www\./i, "").toLowerCase();
  if (finalHost !== host && !finalHost.endsWith(`.${host}`) && !host.endsWith(`.${finalHost}`)) return null;
  if (contentPathPattern.test(finalUrl.pathname)) return null;

  const html = (await response.text()).slice(0, 1_000_000);
  const visible = stripHtml(html);
  const evidence = `${searchTitle} ${searchDescription} ${visible}`.slice(0, 26_000);
  if (!stackPattern.test(evidence) || !providerPattern.test(evidence) || !firstPartyPattern.test(evidence)) return null;
  if (employmentOnlyPattern.test(evidence) && !providerPattern.test(visible.slice(0, 12_000))) return null;
  if (editorialOnlyPattern.test(visible.slice(0, 3_500)) && !firstPartyPattern.test(visible.slice(0, 8_000))) return null;

  const entityName = resolveEntityName(html, searchTitle, finalHost);
  if (!entityName) return null;
  const email = extractEmail(html, finalHost);
  const phone = extractPhone(html);
  const contactUrl = extractContactUrl(html, finalUrl);
  const origin = `${finalUrl.protocol}//${finalUrl.host}`;
  const partner = partnerType(evidence);

  let confidence = 72;
  if (structuredOrganizationName(html)) confidence += 8;
  else if (metaContent(html, "og:site_name")) confidence += 5;
  if (contactUrl || email || phone) confidence += 7;
  if (/\bpower\s*bi\b/i.test(evidence) && /\bmicrosoft fabric\b/i.test(evidence)) confidence += 5;
  if (/\b(?:migration|implementation|managed services?|modernization)\b/i.test(evidence)) confidence += 4;
  confidence = clamp(confidence, 0, 98);
  if (confidence < 75) return null;

  const serviceEvidence = [
    /\bmanaged services?\b/i.test(evidence) ? "managed services" : "",
    /\bmigrat(?:e|ing|ion)\b/i.test(evidence) ? "migration" : "",
    /\bimplementation\b/i.test(evidence) ? "implementation" : "",
    /\bmicrosoft fabric\b/i.test(evidence) ? "Microsoft Fabric" : "",
    /\bpower\s*bi\b/i.test(evidence) ? "Power BI" : "",
  ].filter(Boolean).slice(0, 4);

  return {
    sourceKey: `data-ops-partner:${finalHost}`,
    sourceUrl: finalUrl.toString(),
    companyName: entityName,
    accountKey: finalHost,
    summary: `${entityName} was verified from a first-party company page as a ${partner.type.toLowerCase()} offering ${serviceEvidence.join(", ") || "BI / data consulting services"}.`,
    score: clamp(70 + Math.round((confidence - 70) / 2), 70, 86),
    signals: [
      "First-party company page passed provider and entity-resolution checks",
      `Partner entity confidence: ${confidence}%`,
      `Verified partner category: ${partner.type}`,
      ...(serviceEvidence.length ? [`Published service evidence: ${serviceEvidence.join(", ")}`] : []),
      ...(contactUrl || email || phone ? ["A public first-party contact path was resolved"] : []),
    ],
    risks: ["Verify current delivery capacity and partner appetite before proposing white-label work"],
    tags: [
      "power-bi",
      "data-ops-partner",
      "entity-verified",
      "partner-service-page",
      "source-company-site",
      partner.tag,
      `entity-confidence:${confidence}`,
    ],
    pitch: `I came across ${entityName} through your published BI / data services. Rukh Labs provides white-label Power BI, Power Query, reconciliation, mapping, and migration-QA delivery under NDA. You keep the client relationship and markup; I handle a bounded delivery scope and do not pursue your clients.`,
    contactEmail: email,
    contactPhone: phone,
    contactUrl: contactUrl || origin,
    website: origin,
    discoveredAt: new Date().toISOString(),
    rawPayload: {
      opportunityType: "data-ops-partner",
      organizationVerified: true,
      entityConfidence: confidence,
      organizationType: partner.type,
      sourceType: "first-party-service-page",
      sourceHost: finalHost,
      searchLabel: search.label,
      matchedQuery: search.query,
      serviceEvidence,
    },
  };
}
