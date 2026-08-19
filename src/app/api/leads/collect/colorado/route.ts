import type { NextRequest } from "next/server";
import { hasValidBasicAuth, hasValidCronAuth } from "@/lib/leads/auth";
import {
  beginCollectorRun,
  clamp,
  cleanText,
  completeCollectorRun,
  failCollectorRun,
  getSourceConfig,
  inferIndustry,
  looksLikeNonProspectName,
  privateJson,
  upsertCandidates,
} from "@/lib/leads/crawl";
import {
  backpressureLabel,
  blindCandidateAllowance,
  getLeadQueuePressure,
} from "@/lib/leads/backpressure";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SOURCE_ID = "registry-colorado";
const DATASET_URL = "https://data.colorado.gov/resource/4ykn-tg5h.json";
const SOURCE_URL = "https://data.colorado.gov/d/4ykn-tg5h";
const PAGE_SIZE = 500;
const MAX_ROTATING_OFFSET = 25_000;

type ColoradoEntity = {
  entityid?: string;
  entityname?: string;
  principaladdress1?: string;
  principalcity?: string;
  principalstate?: string;
  principalzipcode?: string;
  principalcountry?: string;
  entitystatus?: string;
  entitytype?: string;
  agentfirstname?: string;
  agentlastname?: string;
  agentorganizationname?: string;
  entityformdate?: string;
};

function validDate(value?: string) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) ? parsed.toISOString().slice(0, 10) : null;
}

function consumerFacingBoost(name: string, industry: string) {
  let boost = 0;
  if (industry !== "Unclassified") boost += 10;
  if (
    /\b(?:studio|clinic|salon|spa|restaurant|cafe|coffee|bakery|repair|services?|solutions?|care|therapy|consulting|contracting|construction|landscaping|cleaning|photography|fitness|wellness|academy|preschool|daycare)\b/i.test(
      name,
    )
  ) {
    boost += 8;
  }
  return boost;
}

export async function GET(request: NextRequest) {
  if (!hasValidCronAuth(request) && !hasValidBasicAuth(request)) {
    return privateJson({ error: "Collector authentication failed." }, { status: 401 });
  }

  const runId = await beginCollectorRun(SOURCE_ID);
  try {
    const config = await getSourceConfig(SOURCE_ID, { offset: 0 });
    const offset = Math.max(0, Number(config.offset ?? 0) || 0);
    const newestDate = new Date();
    newestDate.setUTCMonth(newestDate.getUTCMonth() - 24);

    const url = new URL(DATASET_URL);
    url.searchParams.set(
      "$select",
      [
        "entityid",
        "entityname",
        "principaladdress1",
        "principalcity",
        "principalstate",
        "principalzipcode",
        "principalcountry",
        "entitystatus",
        "entitytype",
        "agentfirstname",
        "agentlastname",
        "agentorganizationname",
        "entityformdate",
      ].join(","),
    );
    url.searchParams.set(
      "$where",
      `entitystatus='Good Standing' AND entityformdate >= '${newestDate.toISOString().slice(0, 10)}T00:00:00.000'`,
    );
    url.searchParams.set("$order", "entityformdate DESC, entityid DESC");
    url.searchParams.set("$limit", String(PAGE_SIZE));
    url.searchParams.set("$offset", String(offset));

    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "Rukh-Leads/1.0 (+https://rukhlabs.com)",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
    });
    if (!response.ok) {
      throw new Error(`Colorado registry returned ${response.status}.`);
    }

    const rows = (await response.json()) as ColoradoEntity[];
    const now = Date.now();
    const candidates = rows.flatMap((row) => {
      const id = cleanText(row.entityid, 40);
      const name = cleanText(row.entityname, 260);
      if (!id || !name || looksLikeNonProspectName(name)) return [];
      if (row.principalcountry && cleanText(row.principalcountry, 3).toUpperCase() !== "US") {
        return [];
      }

      const formedAt = validDate(row.entityformdate);
      const formedMs = formedAt ? new Date(`${formedAt}T00:00:00Z`).getTime() : 0;
      const ageDays = formedMs ? Math.max(0, (now - formedMs) / 86_400_000) : 9999;
      const industry = inferIndustry(name);
      const ageScore = ageDays <= 30 ? 72 : ageDays <= 120 ? 60 : ageDays <= 365 ? 50 : 38;
      const agentName = cleanText(
        [row.agentfirstname, row.agentlastname].filter(Boolean).join(" "),
        160,
      );

      return [
        {
          source: SOURCE_ID,
          sourceKey: id,
          organizationName: name,
          category: industry,
          addressLine1: row.principaladdress1,
          city: row.principalcity,
          state: row.principalstate,
          postalCode: row.principalzipcode,
          countryCode: row.principalcountry || "US",
          sourceUrl: SOURCE_URL,
          formedAt,
          prioritySeed: clamp(ageScore + consumerFacingBoost(name, industry)),
          metadata: {
            entityType: cleanText(row.entitytype, 40) || null,
            entityStatus: cleanText(row.entitystatus, 60) || null,
            registeredAgentName: agentName || null,
            registeredAgentOrganization: cleanText(row.agentorganizationname, 180) || null,
            dataset: "Colorado Secretary of State Business Entities",
          },
        },
      ];
    });

    const pressure = await getLeadQueuePressure();
    const allowance = blindCandidateAllowance(candidates.length, pressure);
    const selectedCandidates = candidates
      .sort((left, right) => right.prioritySeed - left.prioritySeed)
      .slice(0, allowance);
    const upserted = await upsertCandidates(selectedCandidates);
    const nextOffset =
      rows.length < PAGE_SIZE || offset + PAGE_SIZE >= MAX_ROTATING_OFFSET
        ? 0
        : offset + PAGE_SIZE;
    await completeCollectorRun(runId, SOURCE_ID, rows.length, upserted, {
      offset: nextOffset,
      windowMonths: 24,
      backpressure: backpressureLabel(pressure),
      domainQueue: pressure.domainQueue,
      generatedCandidates: candidates.length,
      admittedCandidates: selectedCandidates.length,
    });

    return privateJson({
      ok: true,
      source: SOURCE_ID,
      seen: rows.length,
      qualified: selectedCandidates.length,
      candidates: upserted,
      stored: 0,
      nextOffset,
      backpressure: backpressureLabel(pressure),
      domainQueue: pressure.domainQueue,
      generatedCandidates: candidates.length,
      admittedCandidates: selectedCandidates.length,
    });
  } catch (error) {
    const message = await failCollectorRun(runId, SOURCE_ID, error);
    return privateJson({ error: message, source: SOURCE_ID }, { status: 503 });
  }
}
