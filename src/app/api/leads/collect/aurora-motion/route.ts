import type { NextRequest } from "next/server";
import { hasValidBasicAuth, hasValidCronAuth } from "@/lib/leads/auth";
import {
  beginCollectorRun,
  clamp,
  cleanText,
  completeCollectorRun,
  failCollectorRun,
  inferIndustry,
  looksLikeNonProspectName,
  privateJson,
  upsertCandidates,
} from "@/lib/leads/crawl";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SOURCE_ID = "aurora-business-motion";
const BUSINESS_LAYER_URL = "https://ags.auroragov.org/aurora/rest/services/OpenData/MapServer/36";
const BUSINESS_QUERY_URL = `${BUSINESS_LAYER_URL}/query`;
const OCCUPANCY_LAYER_URL = "https://ags.auroragov.org/aurora/rest/services/OpenData/MapServer/6";
const OCCUPANCY_QUERY_URL = `${OCCUPANCY_LAYER_URL}/query`;
const LOOKBACK_DAYS = 120;
const OCCUPANCY_LOOKBACK_DAYS = 365;
const MAX_CANDIDATES = 120;

type ArcFeature = {
  attributes?: Record<string, string | number | null>;
};
type ArcPayload = {
  features?: ArcFeature[];
  error?: { message?: string; details?: string[] };
};

type OccupancySignal = {
  date: string;
  days: number;
  address: string;
};

function text(value: unknown, max = 260) {
  return cleanText(typeof value === "string" || typeof value === "number" ? String(value) : "", max);
}

function arcDate(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return new Date(value);
  }
  const raw = text(value, 80);
  if (!raw) return null;
  const parsed = new Date(raw);
  return Number.isFinite(parsed.getTime()) ? parsed : null;
}

function isoDate(value: unknown) {
  const parsed = arcDate(value);
  return parsed ? parsed.toISOString().slice(0, 10) : null;
}

function freshnessDays(value: unknown) {
  const parsed = arcDate(value);
  if (!parsed) return 9999;
  return Math.max(0, Math.floor((Date.now() - parsed.getTime()) / 86_400_000));
}

function addressKey(value: unknown) {
  return text(value, 300)
    .toUpperCase()
    .replace(/\b(?:SUITE|STE|UNIT|APT|APARTMENT)\b.*$/i, "")
    .replace(/#\s*[A-Z0-9-]+.*$/i, "")
    .replace(/\bSTREET\b/g, "ST")
    .replace(/\bAVENUE\b/g, "AVE")
    .replace(/\bBOULEVARD\b/g, "BLVD")
    .replace(/\bROAD\b/g, "RD")
    .replace(/\bDRIVE\b/g, "DR")
    .replace(/\bLANE\b/g, "LN")
    .replace(/\bCOURT\b/g, "CT")
    .replace(/\bPARKWAY\b/g, "PKWY")
    .replace(/\bHIGHWAY\b/g, "HWY")
    .replace(/[^A-Z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function priorityFor(
  days: number,
  industry: string,
  homeBased: boolean,
  occupancy?: OccupancySignal,
) {
  let score = days <= 14 ? 88 : days <= 45 ? 80 : days <= 90 ? 72 : 64;
  if (industry !== "Unclassified") score += 6;
  if (homeBased) score -= 5;
  if (occupancy) score += occupancy.days <= 180 ? 12 : 7;
  return clamp(score);
}

function businessQueryUrl() {
  const url = new URL(BUSINESS_QUERY_URL);
  url.searchParams.set("where", "1=1");
  url.searchParams.set(
    "outFields",
    [
      "License_Number",
      "Business_Owner",
      "NAICS_Title",
      "NAICS_Sector",
      "NAICS_SubSector",
      "Business_Name",
      "Business_Address",
      "Start_Date",
      "Issue_Date",
      "BusinessAddress_ZIP",
      "naics_code",
      "home_based",
      "OBJECTID",
    ].join(","),
  );
  url.searchParams.set("returnGeometry", "false");
  url.searchParams.set("orderByFields", "Start_Date DESC");
  url.searchParams.set("resultRecordCount", "500");
  url.searchParams.set("f", "json");
  return url;
}

function occupancyQueryUrl() {
  const url = new URL(OCCUPANCY_QUERY_URL);
  url.searchParams.set("where", "1=1");
  url.searchParams.set("outFields", "ADDRESS,CO_ISSUED,CO_DATE,OBJECTID");
  url.searchParams.set("returnGeometry", "false");
  url.searchParams.set("orderByFields", "OBJECTID DESC");
  url.searchParams.set("resultRecordCount", "2000");
  url.searchParams.set("f", "json");
  return url;
}

async function fetchLayer(url: URL, label: string) {
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "Rukh-Leads/1.0 (+https://rukhlabs.com)",
    },
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) throw new Error(`${label} returned ${response.status}.`);
  const payload = (await response.json()) as ArcPayload;
  if (payload.error) {
    throw new Error(
      `${label} error: ${payload.error.message || payload.error.details?.join(" ") || "unknown error"}`,
    );
  }
  return payload;
}

function occupancyByAddress(payload: ArcPayload) {
  const matches = new Map<string, OccupancySignal>();
  for (const feature of payload.features ?? []) {
    const row = feature.attributes ?? {};
    const key = addressKey(row.ADDRESS);
    if (!key) continue;
    const rawDate = row.CO_DATE || row.CO_ISSUED;
    const date = isoDate(rawDate);
    const days = freshnessDays(rawDate);
    if (!date || days > OCCUPANCY_LOOKBACK_DAYS) continue;
    const current = matches.get(key);
    if (!current || days < current.days) {
      matches.set(key, {
        date,
        days,
        address: text(row.ADDRESS, 240),
      });
    }
  }
  return matches;
}

export async function GET(request: NextRequest) {
  if (!hasValidCronAuth(request) && !hasValidBasicAuth(request)) {
    return privateJson({ error: "Collector authentication failed." }, { status: 401 });
  }

  const runId = await beginCollectorRun(SOURCE_ID);
  try {
    const [businessPayload, occupancyPayload] = await Promise.all([
      fetchLayer(businessQueryUrl(), "Aurora business layer"),
      fetchLayer(occupancyQueryUrl(), "Aurora Certificate of Occupancy layer"),
    ]);
    const occupancy = occupancyByAddress(occupancyPayload);
    let occupancyMatches = 0;

    const candidates = (businessPayload.features ?? [])
      .flatMap((feature) => {
        const row = feature.attributes ?? {};
        const name = text(row.Business_Name);
        const license = text(row.License_Number, 120) || text(row.OBJECTID, 80);
        if (!name || !license || looksLikeNonProspectName(name)) return [];

        const days = freshnessDays(row.Start_Date || row.Issue_Date);
        if (days > LOOKBACK_DAYS) return [];
        const naicsTitle = text(row.NAICS_Title, 240);
        const naicsSector = text(row.NAICS_Sector, 240);
        const industry = inferIndustry(`${name} ${naicsTitle} ${naicsSector}`);
        const homeBased = ["1", "true", "yes"].includes(text(row.home_based, 20).toLowerCase());
        const startDate = isoDate(row.Start_Date);
        const issueDate = isoDate(row.Issue_Date);
        const businessAddress = text(row.Business_Address, 240);
        const occupancySignal = occupancy.get(addressKey(businessAddress));
        if (occupancySignal) occupancyMatches += 1;

        return [{
          source: SOURCE_ID,
          sourceKey: license,
          organizationName: name,
          category: industry,
          addressLine1: businessAddress || null,
          city: "Aurora",
          state: "CO",
          postalCode: text(row.BusinessAddress_ZIP, 30) || null,
          countryCode: "US",
          contactName: text(row.Business_Owner, 180) || null,
          sourceUrl: BUSINESS_LAYER_URL,
          formedAt: startDate || issueDate,
          prioritySeed: priorityFor(days, industry, homeBased, occupancySignal),
          metadata: {
            motionSignal: occupancySignal
              ? "recent-business-license+occupancy-at-address"
              : "new-or-recent-business-license",
            signalDate: startDate || issueDate,
            startDate,
            issueDate,
            motionFreshnessDays: days,
            businessLicense: license,
            naicsTitle: naicsTitle || null,
            naicsSector: naicsSector || null,
            naicsSubSector: text(row.NAICS_SubSector, 240) || null,
            naicsCode: text(row.naics_code, 80) || null,
            homeBased,
            occupancySignal: occupancySignal
              ? "recent-certificate-of-occupancy-at-same-address"
              : null,
            occupancyDate: occupancySignal?.date ?? null,
            occupancyFreshnessDays: occupancySignal?.days ?? null,
            occupancyAddress: occupancySignal?.address ?? null,
            occupancyMatchCaveat: occupancySignal
              ? "Address-level match indicates activity at the location; it is not proof that the certificate belongs to this specific business."
              : null,
            officialSource: "City of Aurora OpenData Businesses + Certificate of Occupancy layers",
          },
        }];
      })
      .sort((left, right) => right.prioritySeed - left.prioritySeed)
      .slice(0, MAX_CANDIDATES);

    const upserted = await upsertCandidates(candidates);
    await completeCollectorRun(runId, SOURCE_ID, businessPayload.features?.length ?? 0, upserted, {
      lookbackDays: LOOKBACK_DAYS,
      occupancyLookbackDays: OCCUPANCY_LOOKBACK_DAYS,
      lastCandidates: candidates.length,
      occupancyMatches,
      motionSignal: "business-license with optional occupancy-at-address convergence",
    });

    return privateJson({
      ok: true,
      source: SOURCE_ID,
      seen: businessPayload.features?.length ?? 0,
      occupancySeen: occupancyPayload.features?.length ?? 0,
      occupancyMatches,
      qualified: candidates.length,
      candidates: upserted,
      stored: 0,
      lookbackDays: LOOKBACK_DAYS,
      occupancyLookbackDays: OCCUPANCY_LOOKBACK_DAYS,
    });
  } catch (error) {
    const message = await failCollectorRun(runId, SOURCE_ID, error);
    return privateJson({ error: message, source: SOURCE_ID }, { status: 503 });
  }
}
