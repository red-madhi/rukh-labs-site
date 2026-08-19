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
import { upsertPowerBiGigs } from "@/lib/leads/power-bi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SOURCE_ID = "power-bi-sam";
const LOOKBACK_DAYS = 30;
const SEARCH_TITLES = [
  "Power BI",
  "business intelligence",
  "data visualization",
  "dashboard",
  "Microsoft Fabric",
] as const;
const API_ENDPOINTS = [
  "https://api.sam.gov/opportunities/v2/search",
  "https://api.sam.gov/prod/opportunities/v2/search",
] as const;

const relevantPattern =
  /\b(?:power\s*bi|microsoft fabric|business intelligence|data visualization|analytics dashboard|reporting dashboard|dashboard development|dashboard modernization|data analytics|reporting analytics)\b/i;
const falsePositivePattern =
  /\b(?:training course|training services|curriculum|instructional materials?|student|classroom|medical imaging|digital imaging|vehicle dashboard|instrument panel|dashboard camera|web dashboard camera)\b/i;

type SamContact = { fullname?: string; email?: string; phone?: string };
type SamOpportunity = {
  noticeId?: string;
  title?: string;
  solicitationNumber?: string;
  fullParentPathName?: string;
  postedDate?: string;
  responseDeadLine?: string;
  reponseDeadLine?: string;
  type?: string;
  baseType?: string;
  setAside?: string;
  setAsideCode?: string;
  naicsCode?: string;
  additionalInfoLink?: string;
  uiLink?: string;
  pointOfContact?: SamContact[];
  officeAddress?: { city?: string; state?: string };
  data?: { pointOfContact?: SamContact[]; officeAddress?: { city?: string; state?: string } };
};
type SamPayload = { totalRecords?: number; opportunitiesData?: SamOpportunity[] };

function formatSamDate(date: Date) {
  return `${String(date.getMonth() + 1).padStart(2, "0")}/${String(date.getDate()).padStart(2, "0")}/${date.getFullYear()}`;
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function searchSam(apiKey: string, title: string) {
  const now = new Date();
  const from = new Date(now.getTime() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000);
  let lastError = "SAM.gov Power BI search failed.";
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
        headers: { Accept: "application/json", "User-Agent": "Rukh-Leads/1.0 (+https://rukhlabs.com)" },
        cache: "no-store",
        signal: AbortSignal.timeout(15_000),
      });
      if (response.ok) return (await response.json()) as SamPayload;
      lastError = `SAM.gov returned ${response.status}.`;
      if (![404, 405].includes(response.status)) break;
    } catch (error) {
      lastError = error instanceof Error ? error.message : lastError;
    }
  }
  throw new Error(lastError);
}

function qualify(opportunity: SamOpportunity, matchedTitle: string) {
  const noticeId = cleanText(opportunity.noticeId, 120);
  const title = cleanText(opportunity.title, 360);
  if (!noticeId || !title || !relevantPattern.test(title) || falsePositivePattern.test(title)) return null;

  const organization = cleanText(opportunity.fullParentPathName, 280) || "Federal contracting office";
  const contacts = opportunity.pointOfContact || opportunity.data?.pointOfContact || [];
  const contact = contacts.find((item) => item.email || item.phone) || contacts[0];
  const deadline = cleanText(opportunity.responseDeadLine || opportunity.reponseDeadLine, 120);
  const sourceUrl =
    cleanText(opportunity.additionalInfoLink || opportunity.uiLink, 1000) ||
    `https://sam.gov/opp/${encodeURIComponent(noticeId)}/view`;
  const office = opportunity.officeAddress || opportunity.data?.officeAddress;
  const location = [cleanText(office?.city, 100), cleanText(office?.state, 60)].filter(Boolean).join(", ") || "United States";

  let score = 92;
  const signals = [
    "Active federal procurement notice is explicitly related to Power BI, business intelligence, data visualization, or analytics dashboards",
    `Posted within the last ${LOOKBACK_DAYS} days`,
  ];
  if (contact?.email || contact?.phone) {
    score += 3;
    signals.push("A public contracting contact is available");
  }
  if (deadline) {
    score += 2;
    signals.push(`Response deadline listed: ${deadline}`);
  }
  if (opportunity.setAside || opportunity.setAsideCode) {
    score += 2;
    signals.push("Set-aside information is present");
  }
  score = clamp(score, 0, 99);

  return {
    sourceKey: `power-bi:sam:${noticeId}`,
    sourceUrl,
    companyName: title,
    summary: `${organization} published a federal Power BI / BI opportunity${deadline ? ` with a listed response deadline of ${deadline}` : ""}. Open the SAM.gov notice for the complete scope and submission requirements.`,
    score,
    signals,
    risks: [
      "Federal opportunities can require SAM registration, representations, insurance, past performance, or specific contract eligibility",
      "Review the full solicitation and attachments before investing proposal time",
    ],
    tags: [
      "power-bi",
      "sam.gov",
      "procurement",
      "proactive opportunity",
      cleanText(opportunity.type || opportunity.baseType, 80) || "federal opportunity",
    ],
    pitch: "I found your SAM.gov Power BI / analytics opportunity and would like to review the scope and required deliverables. I work hands-on with Power BI, DAX, Power Query, data modeling and Microsoft Fabric, and can provide a concise requirements-mapped proposal where the procurement is a fit.",
    contactName: cleanText(contact?.fullname, 180) || undefined,
    contactEmail: cleanText(contact?.email, 220).toLowerCase() || undefined,
    contactPhone: cleanText(contact?.phone, 80) || undefined,
    contactUrl: sourceUrl,
    location,
    discoveredAt: opportunity.postedDate || undefined,
    rawPayload: {
      noticeId,
      solicitationNumber: cleanText(opportunity.solicitationNumber, 120) || null,
      organization,
      matchedTitle,
      responseDeadline: deadline || null,
      naicsCode: cleanText(opportunity.naicsCode, 40) || null,
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
    return privateJson({ error: "SAM_GOV_API_KEY is not configured.", source: SOURCE_ID }, { status: 428 });
  }

  const runId = await beginCollectorRun(SOURCE_ID);
  try {
    const batches: Array<{ title: string; payload: SamPayload }> = [];
    for (const title of SEARCH_TITLES) {
      const payload = await searchSam(apiKey, title);
      batches.push({ title, payload });
      await wait(850);
    }

    const seen = batches.reduce((total, batch) => total + (batch.payload.opportunitiesData?.length ?? 0), 0);
    const gigs = new Map<string, NonNullable<ReturnType<typeof qualify>>>();
    for (const batch of batches) {
      for (const opportunity of batch.payload.opportunitiesData ?? []) {
        const gig = qualify(opportunity, batch.title);
        if (!gig) continue;
        const current = gigs.get(gig.sourceKey);
        if (!current || gig.score > current.score) gigs.set(gig.sourceKey, gig);
      }
    }
    const rows = Array.from(gigs.values());
    const stored = await upsertPowerBiGigs(rows);
    await completeCollectorRun(runId, SOURCE_ID, seen, stored, {
      lookbackDays: LOOKBACK_DAYS,
      searches: SEARCH_TITLES,
    });
    return privateJson({ ok: true, source: SOURCE_ID, seen, qualified: rows.length, stored });
  } catch (error) {
    const message = await failCollectorRun(runId, SOURCE_ID, error);
    return privateJson({ error: message, source: SOURCE_ID }, { status: 503 });
  }
}
