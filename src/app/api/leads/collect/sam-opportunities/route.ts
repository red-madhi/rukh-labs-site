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
import { leadNeonQuery } from "@/lib/leads/neon";
import { upsertIntentOpportunities } from "@/lib/leads/intent-opportunities";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SOURCE_ID = "sam-opportunities";
const LOOKBACK_DAYS = 30;
const SEARCH_TITLES = ["website", "web", "digital", "content management"] as const;
const API_ENDPOINTS = [
  "https://api.sam.gov/opportunities/v2/search",
  "https://api.sam.gov/prod/opportunities/v2/search",
] as const;

const websiteTitlePattern =
  /\b(?:website|web site|web design|website design|website redesign|web development|website development|web portal|internet site|public website|content management system|cms)\b/i;
const educationFalsePositivePattern =
  /\b(?:course|courses|curriculum|instructional|training|classroom|student materials?|textbook|digital imaging|digital media|digital publishing|video communications?)\b/i;
const technicalWebServicesPattern =
  /\b(?:api|apis|application programming interface|web services?|soap service|rest services?)\b/i;
const explicitWebsitePattern =
  /\b(?:website|web site|website design|website redesign|website development|web portal|internet site|public website|content management system|cms)\b/i;

type SamPointOfContact = {
  type?: string;
  title?: string;
  fullname?: string;
  email?: string;
  phone?: string;
};

type SamOpportunity = {
  noticeId?: string;
  title?: string;
  solicitationNumber?: string;
  fullParentPathName?: string;
  postedDate?: string;
  type?: string;
  baseType?: string;
  setAside?: string;
  setAsideCode?: string;
  responseDeadLine?: string;
  reponseDeadLine?: string;
  naicsCode?: string;
  active?: string;
  additionalInfoLink?: string;
  uiLink?: string;
  officeAddress?: {
    city?: string;
    state?: string;
    zipcode?: string;
    zip?: string;
  };
  placeOfPerformance?: {
    city?: { name?: string } | string;
    state?: { code?: string; name?: string } | string;
    country?: { code?: string; name?: string } | string;
    zip?: string;
  };
  pointOfContact?: SamPointOfContact[];
  data?: {
    pointOfContact?: SamPointOfContact[];
    officeAddress?: SamOpportunity["officeAddress"];
    placeOfPerformance?: SamOpportunity["placeOfPerformance"];
  };
};

type SamPayload = {
  totalRecords?: number;
  opportunitiesData?: SamOpportunity[];
};

function formatSamDate(date: Date) {
  return `${String(date.getMonth() + 1).padStart(2, "0")}/${String(date.getDate()).padStart(2, "0")}/${date.getFullYear()}`;
}

function firstText(value: unknown) {
  return typeof value === "string" ? cleanText(value, 300) : "";
}

function placeLabel(opportunity: SamOpportunity) {
  const place = opportunity.placeOfPerformance || opportunity.data?.placeOfPerformance;
  const office = opportunity.officeAddress || opportunity.data?.officeAddress;
  const city =
    typeof place?.city === "string"
      ? place.city
      : firstText(place?.city?.name) || firstText(office?.city);
  const state =
    typeof place?.state === "string"
      ? place.state
      : firstText(place?.state?.code) || firstText(place?.state?.name) || firstText(office?.state);
  return [city, state].filter(Boolean).join(", ") || "United States";
}

function contactFor(opportunity: SamOpportunity) {
  const contacts = opportunity.pointOfContact || opportunity.data?.pointOfContact || [];
  return contacts.find((contact) => contact.email || contact.phone) || contacts[0];
}

async function searchSam(apiKey: string, title: string) {
  const now = new Date();
  const from = new Date(now.getTime() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000);
  let lastError = "SAM.gov opportunity search failed.";

  for (const endpoint of API_ENDPOINTS) {
    const url = new URL(endpoint);
    url.searchParams.set("api_key", apiKey);
    url.searchParams.set("postedFrom", formatSamDate(from));
    url.searchParams.set("postedTo", formatSamDate(now));
    url.searchParams.set("title", title);
    url.searchParams.set("limit", "250");
    url.searchParams.set("offset", "0");
    for (const type of ["o", "k", "r", "p"]) url.searchParams.append("ptype", type);

    try {
      const response = await fetch(url, {
        headers: {
          Accept: "application/json",
          "User-Agent": "Rukh-Leads/1.0 (+https://rukhlabs.com)",
        },
        cache: "no-store",
        signal: AbortSignal.timeout(15_000),
      });
      if (response.ok) return (await response.json()) as SamPayload;
      lastError = `SAM.gov returned ${response.status}: ${cleanText(await response.text().catch(() => ""), 220)}`;
      if (![404, 405].includes(response.status)) break;
    } catch (error) {
      lastError = error instanceof Error ? error.message : lastError;
    }
  }

  throw new Error(lastError);
}

function qualify(opportunity: SamOpportunity, matchedTitle: string) {
  const noticeId = cleanText(opportunity.noticeId, 100);
  const title = cleanText(opportunity.title, 300);
  if (!noticeId || !title) return null;
  if (!websiteTitlePattern.test(title)) return null;
  if (educationFalsePositivePattern.test(title)) return null;
  if (technicalWebServicesPattern.test(title) && !explicitWebsitePattern.test(title)) return null;

  const organization = cleanText(opportunity.fullParentPathName, 260) || "Federal procurement office";
  const contact = contactFor(opportunity);
  const contactEmail = cleanText(contact?.email, 220).toLowerCase() || undefined;
  const contactPhone = cleanText(contact?.phone, 80) || undefined;
  const contactName = cleanText(contact?.fullname, 180) || undefined;
  const deadline = cleanText(
    opportunity.responseDeadLine || opportunity.reponseDeadLine,
    120,
  );
  const sourceUrl =
    cleanText(opportunity.additionalInfoLink || opportunity.uiLink, 1000) ||
    `https://sam.gov/opp/${encodeURIComponent(noticeId)}/view`;

  let score = 93;
  const signals = [
    "Active federal procurement notice references website or web-development work",
    `The opportunity was posted within the last ${LOOKBACK_DAYS} days`,
  ];
  const risks = [
    "Read the full solicitation and attachments before deciding whether Rukh Labs is eligible and competitive",
    "Federal opportunities can require registrations, representations, insurance, or past-performance documentation",
  ];

  if (contactEmail || contactPhone) {
    score += 2;
    signals.push("A public contracting contact is available");
  }
  if (opportunity.setAside || opportunity.setAsideCode) {
    score += 2;
    signals.push(
      `Set-aside information is present${opportunity.setAside ? `: ${cleanText(opportunity.setAside, 120)}` : ""}`,
    );
  }
  if (deadline) signals.push(`Response deadline listed: ${deadline}`);
  score = clamp(score, 0, 99);

  return {
    sourceKey: `sam:${noticeId}`,
    sourceUrl,
    companyName: title,
    summary: `${organization} published a federal opportunity for website-related work${deadline ? ` with a listed response deadline of ${deadline}` : ""}. Open the notice for the complete scope, attachments, and submission rules.`,
    score,
    signals,
    risks,
    tags: [
      "sam.gov",
      "federal procurement",
      cleanText(opportunity.type || opportunity.baseType, 80) || "opportunity",
      cleanText(opportunity.setAside || opportunity.setAsideCode, 120),
    ].filter(Boolean),
    pitch:
      "I found your SAM.gov website opportunity and would like to review the full scope, required deliverables, and submission format. Rukh Labs builds maintainable websites and can provide a clear, requirements-mapped proposal where the procurement is a fit.",
    location: placeLabel(opportunity),
    industry: "Federal procurement",
    contactName,
    contactEmail,
    contactPhone,
    contactUrl: sourceUrl,
    discoveredAt: opportunity.postedDate || undefined,
    rawPayload: {
      noticeId,
      solicitationNumber: cleanText(opportunity.solicitationNumber, 120) || null,
      matchedTitle,
      organization,
      postedDate: opportunity.postedDate || null,
      responseDeadline: deadline || null,
      naicsCode: cleanText(opportunity.naicsCode, 30) || null,
      setAside: cleanText(opportunity.setAside || opportunity.setAsideCode, 120) || null,
    },
  };
}

export async function GET(request: NextRequest) {
  if (!hasValidCronAuth(request) && !hasValidBasicAuth(request)) {
    return privateJson({ error: "Collector authentication failed." }, { status: 401 });
  }

  const apiKey = process.env.SAM_GOV_API_KEY?.trim();
  if (!apiKey) {
    const message = "SAM_GOV_API_KEY is not configured.";
    await leadNeonQuery(
      `UPDATE public.lead_source_state
       SET status = 'needs-setup', last_run_at = now(), last_error = $2, updated_at = now()
       WHERE source_id = $1`,
      [SOURCE_ID, message],
    ).catch(() => undefined);
    return privateJson({ error: message, source: SOURCE_ID }, { status: 428 });
  }

  const runId = await beginCollectorRun(SOURCE_ID);
  try {
    const batches = await Promise.all(
      SEARCH_TITLES.map(async (title) => ({ title, payload: await searchSam(apiKey, title) })),
    );
    const seen = batches.reduce(
      (total, batch) => total + (batch.payload.opportunitiesData?.length ?? 0),
      0,
    );
    const leads = new Map<string, NonNullable<ReturnType<typeof qualify>>>();

    for (const batch of batches) {
      for (const opportunity of batch.payload.opportunitiesData ?? []) {
        const lead = qualify(opportunity, batch.title);
        if (!lead) continue;
        const current = leads.get(lead.sourceKey);
        if (!current || lead.score > current.score) leads.set(lead.sourceKey, lead);
      }
    }

    const rows = Array.from(leads.values());
    const stored = await upsertIntentOpportunities(rows);
    await completeCollectorRun(runId, SOURCE_ID, seen, stored, {
      searches: SEARCH_TITLES,
      lookbackDays: LOOKBACK_DAYS,
      totalRecords: batches.map((batch) => ({
        title: batch.title,
        totalRecords: batch.payload.totalRecords ?? 0,
      })),
    });

    return privateJson({
      ok: true,
      source: SOURCE_ID,
      seen,
      qualified: rows.length,
      stored,
      totalRecords: batches.map((batch) => ({
        title: batch.title,
        totalRecords: batch.payload.totalRecords ?? 0,
      })),
    });
  } catch (error) {
    const message = await failCollectorRun(runId, SOURCE_ID, error);
    return privateJson({ error: message, source: SOURCE_ID }, { status: 503 });
  }
}
