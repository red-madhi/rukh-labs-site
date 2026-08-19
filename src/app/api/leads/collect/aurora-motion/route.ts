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
const LAYER_URL = "https://ags.auroragov.org/aurora/rest/services/OpenData/MapServer/36";
const QUERY_URL = `${LAYER_URL}/query`;
const LOOKBACK_DAYS = 120;
const MAX_CANDIDATES = 120;

type ArcFeature = {
  attributes?: Record<string, string | number | null>;
};
type ArcPayload = {
  features?: ArcFeature[];
  error?: { message?: string; details?: string[] };
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

function priorityFor(days: number, industry: string, homeBased: boolean) {
  let score = days <= 14 ? 88 : days <= 45 ? 80 : days <= 90 ? 72 : 64;
  if (industry !== "Unclassified") score += 6;
  if (homeBased) score -= 5;
  return clamp(score);
}

export async function GET(request: NextRequest) {
  if (!hasValidCronAuth(request) && !hasValidBasicAuth(request)) {
    return privateJson({ error: "Collector authentication failed." }, { status: 401 });
  }

  const runId = await beginCollectorRun(SOURCE_ID);
  try {
    const url = new URL(QUERY_URL);
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

    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "Rukh-Leads/1.0 (+https://rukhlabs.com)",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
    });
    if (!response.ok) throw new Error(`Aurora business layer returned ${response.status}.`);
    const payload = (await response.json()) as ArcPayload;
    if (payload.error) {
      throw new Error(
        `Aurora business layer error: ${payload.error.message || payload.error.details?.join(" ") || "unknown error"}`,
      );
    }

    const candidates = (payload.features ?? [])
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

        return [{
          source: SOURCE_ID,
          sourceKey: license,
          organizationName: name,
          category: industry,
          addressLine1: text(row.Business_Address, 240) || null,
          city: "Aurora",
          state: "CO",
          postalCode: text(row.BusinessAddress_ZIP, 30) || null,
          countryCode: "US",
          contactName: text(row.Business_Owner, 180) || null,
          sourceUrl: LAYER_URL,
          formedAt: startDate || issueDate,
          prioritySeed: priorityFor(days, industry, homeBased),
          metadata: {
            motionSignal: "new-or-recent-business-license",
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
            officialSource: "City of Aurora OpenData Businesses layer",
          },
        }];
      })
      .sort((left, right) => right.prioritySeed - left.prioritySeed)
      .slice(0, MAX_CANDIDATES);

    const upserted = await upsertCandidates(candidates);
    await completeCollectorRun(runId, SOURCE_ID, payload.features?.length ?? 0, upserted, {
      lookbackDays: LOOKBACK_DAYS,
      lastCandidates: candidates.length,
      motionSignal: "new-or-recent-business-license",
    });

    return privateJson({
      ok: true,
      source: SOURCE_ID,
      seen: payload.features?.length ?? 0,
      qualified: candidates.length,
      candidates: upserted,
      stored: 0,
      lookbackDays: LOOKBACK_DAYS,
    });
  } catch (error) {
    const message = await failCollectorRun(runId, SOURCE_ID, error);
    return privateJson({ error: message, source: SOURCE_ID }, { status: 503 });
  }
}
