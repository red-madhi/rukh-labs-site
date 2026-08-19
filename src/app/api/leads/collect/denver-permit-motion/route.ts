import type { NextRequest } from "next/server";
import { hasValidBasicAuth, hasValidCronAuth } from "@/lib/leads/auth";
import { cleanText, privateJson } from "@/lib/leads/crawl";
import { leadNeonQuery } from "@/lib/leads/neon";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SOURCE_ID = "denver-commercial-permit-motion";
const QUERY_URL = "https://services1.arcgis.com/zdB7qR0BtYrg0Xpl/arcgis/rest/services/ODC_DEV_COMMERCIALCONSTPERMIT_P/FeatureServer/317/query";
const LOOKBACK_DAYS = 180;

type ArcFeature = { attributes?: Record<string, unknown> };
type ArcPayload = { features?: ArcFeature[]; error?: { message?: string } };

function text(value: unknown, max = 260) {
  return cleanText(typeof value === "string" || typeof value === "number" ? String(value) : "", max);
}

function dateIso(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return new Date(value).toISOString();
  const parsed = Date.parse(text(value, 80));
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : null;
}

function addressKey(value: unknown) {
  return text(value, 250)
    .toUpperCase()
    .replace(/\b(?:SUITE|STE|UNIT|APT|APARTMENT)\b.*$/i, "")
    .replace(/#\s*[A-Z0-9-]+.*$/i, "")
    .replace(/[^A-Z0-9]+/g, "")
    .trim();
}

export async function GET(request: NextRequest) {
  if (!hasValidCronAuth(request) && !hasValidBasicAuth(request)) {
    return privateJson({ error: "Collector authentication failed." }, { status: 401 });
  }

  try {
    const url = new URL(QUERY_URL);
    url.searchParams.set("where", "1=1");
    url.searchParams.set("outFields", "DATE_ISSUED,PERMIT_NUM,ADDRESS,CLASS,VALUATION,CONTRACTOR_NAME,CO_REQUIRED,DATE_CO_ISSUED,OBJECTID");
    url.searchParams.set("returnGeometry", "false");
    url.searchParams.set("orderByFields", "DATE_ISSUED DESC");
    url.searchParams.set("resultRecordCount", "1500");
    url.searchParams.set("f", "json");

    const response = await fetch(url, {
      headers: { Accept: "application/json", "User-Agent": "Rukh-Leads/1.0 (+https://rukhlabs.com)" },
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
    });
    if (!response.ok) throw new Error(`Denver commercial permit layer returned ${response.status}.`);
    const payload = (await response.json()) as ArcPayload;
    if (payload.error) throw new Error(payload.error.message || "Denver commercial permit layer returned an error.");

    const cutoff = Date.now() - LOOKBACK_DAYS * 86_400_000;
    const newestByAddress = new Map<string, Record<string, unknown>>();
    for (const feature of payload.features ?? []) {
      const row = feature.attributes ?? {};
      const issuedAt = dateIso(row.DATE_ISSUED);
      const key = addressKey(row.ADDRESS);
      if (!issuedAt || !key || Date.parse(issuedAt) < cutoff) continue;
      const current = newestByAddress.get(key);
      if (!current || Date.parse(issuedAt) > Date.parse(String(current.issuedAt))) {
        newestByAddress.set(key, {
          addressKey: key,
          issuedAt,
          permitNumber: text(row.PERMIT_NUM, 100) || null,
          permitClass: text(row.CLASS, 120) || null,
          valuation: typeof row.VALUATION === "number" ? row.VALUATION : Number(row.VALUATION) || null,
          contractor: text(row.CONTRACTOR_NAME, 220) || null,
          coRequired: text(row.CO_REQUIRED, 40) || null,
          coIssuedAt: dateIso(row.DATE_CO_ISSUED),
          source: "City and County of Denver commercial construction permits",
        });
      }
    }

    const permitRows = Array.from(newestByAddress.values());
    if (!permitRows.length) {
      return privateJson({ ok: true, source: SOURCE_ID, seen: payload.features?.length ?? 0, matched: 0 });
    }

    const result = await leadNeonQuery(
      `WITH permits AS (
         SELECT * FROM jsonb_to_recordset($1::jsonb) AS p(
           "addressKey" text,
           "issuedAt" timestamptz,
           "permitNumber" text,
           "permitClass" text,
           valuation numeric,
           contractor text,
           "coRequired" text,
           "coIssuedAt" timestamptz,
           source text
         )
       ), matched AS (
         SELECT DISTINCT ON (candidate.id)
           candidate.id,
           p.*
         FROM public.lead_candidates candidate
         JOIN permits p
           ON regexp_replace(upper(split_part(COALESCE(candidate.address_line1,''), '#', 1)), '[^A-Z0-9]', '', 'g') = p."addressKey"
         WHERE candidate.archived_at IS NULL
           AND lower(COALESCE(candidate.city,'')) = 'denver'
           AND upper(COALESCE(candidate.state,'')) = 'CO'
         ORDER BY candidate.id, p."issuedAt" DESC
       )
       UPDATE public.lead_candidates candidate
       SET priority_seed = LEAST(100, GREATEST(candidate.priority_seed, 76)),
           metadata = candidate.metadata || jsonb_build_object(
             'commercialPermitSignal', jsonb_build_object(
               'issuedAt', matched."issuedAt",
               'permitNumber', matched."permitNumber",
               'permitClass', matched."permitClass",
               'valuation', matched.valuation,
               'contractor', matched.contractor,
               'coRequired', matched."coRequired",
               'coIssuedAt', matched."coIssuedAt",
               'evidenceLevel', 'address-level',
               'source', matched.source
             ),
             'motionSignal', 'recent-commercial-permit-at-address',
             'motionSignalDate', matched."issuedAt"
           ),
           next_action_at = LEAST(candidate.next_action_at, now()),
           updated_at = now()
       FROM matched
       WHERE candidate.id = matched.id
       RETURNING candidate.id::text`,
      [JSON.stringify(permitRows)],
    );

    return privateJson({
      ok: true,
      source: SOURCE_ID,
      seen: payload.features?.length ?? 0,
      recentPermits: permitRows.length,
      matched: result.rows?.length ?? result.rowCount ?? 0,
      evidence: "Address-level permit timing only; not proof the permit belongs to the tenant.",
    });
  } catch (error) {
    return privateJson({ error: error instanceof Error ? error.message : "Denver permit motion collector failed.", source: SOURCE_ID }, { status: 503 });
  }
}
