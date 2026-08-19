import type { NextRequest } from "next/server";
import { hasValidBasicAuth, hasValidCronAuth } from "@/lib/leads/auth";
import { cleanText, privateJson } from "@/lib/leads/crawl";
import { leadNeonQuery, neonRowsToObjects } from "@/lib/leads/neon";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SOURCE_ID = "los-angeles-commercial-permit-motion";
const DATA_URL = "https://data.lacity.org/resource/pi9x-tg5x.json";
const SOURCE_URL = "https://data.lacity.org/d/pi9x-tg5x";
const LOOKBACK_DAYS = 180;

type PermitRow = {
  permit_nbr?: string;
  primary_address?: string;
  zip_code?: string;
  permit_group?: string;
  permit_type?: string;
  permit_sub_type?: string;
  use_desc?: string;
  issue_date?: string;
  cofo_date?: string;
  valuation?: string | number;
  construction?: string;
  work_desc?: string;
};

function text(value: unknown, max = 500) {
  return cleanText(typeof value === "string" || typeof value === "number" ? String(value) : "", max);
}

function addressKey(value: unknown) {
  return text(value, 260)
    .toUpperCase()
    .replace(/\b(?:SUITE|STE|UNIT|APT|APARTMENT)\b.*$/i, "")
    .replace(/#\s*[A-Z0-9-]+.*$/i, "")
    .replace(/[^A-Z0-9]+/g, "")
    .trim();
}

function commercialEnough(row: PermitRow) {
  const evidence = `${text(row.permit_group)} ${text(row.permit_type)} ${text(row.permit_sub_type)} ${text(row.use_desc)} ${text(row.work_desc, 1000)}`;
  if (/\b(?:1 or 2 family|single family|duplex|accessory dwelling|adu|residential dwelling)\b/i.test(evidence)) return false;
  return /\b(?:commercial|tenant improvement|change of use|restaurant|retail|office|store|shop|gym|fitness|clinic|medical|dental|salon|spa|school|daycare|warehouse|hotel|motel|business|alteration|remodel|addition|new building)\b/i.test(evidence);
}

export async function GET(request: NextRequest) {
  if (!hasValidCronAuth(request) && !hasValidBasicAuth(request)) {
    return privateJson({ error: "Collector authentication failed." }, { status: 401 });
  }

  try {
    const cutoff = new Date(Date.now() - LOOKBACK_DAYS * 86_400_000).toISOString().slice(0, 10);
    const url = new URL(DATA_URL);
    url.searchParams.set("$select", "permit_nbr,primary_address,zip_code,permit_group,permit_type,permit_sub_type,use_desc,issue_date,cofo_date,valuation,construction,work_desc");
    url.searchParams.set("$where", `issue_date >= '${cutoff}T00:00:00.000'`);
    url.searchParams.set("$order", "issue_date DESC");
    url.searchParams.set("$limit", "2500");

    const response = await fetch(url, {
      headers: { Accept: "application/json", "User-Agent": "Rukh-Leads/1.0 (+https://rukhlabs.com)" },
      cache: "no-store",
      signal: AbortSignal.timeout(25_000),
    });
    if (!response.ok) throw new Error(`Los Angeles LADBS permit feed returned ${response.status}.`);
    const rows = (await response.json()) as PermitRow[];

    const recent = new Map<string, Record<string, unknown>>();
    for (const row of rows) {
      if (!commercialEnough(row)) continue;
      const key = addressKey(row.primary_address);
      const issuedAt = text(row.issue_date, 60);
      if (!key || !issuedAt) continue;
      const existing = recent.get(key);
      if (!existing || Date.parse(issuedAt) > Date.parse(String(existing.issuedAt))) {
        recent.set(key, {
          addressKey: key,
          issuedAt,
          permitNumber: text(row.permit_nbr, 120) || null,
          permitGroup: text(row.permit_group, 100) || null,
          permitType: text(row.permit_type, 120) || null,
          permitSubType: text(row.permit_sub_type, 120) || null,
          useDescription: text(row.use_desc, 220) || null,
          workDescription: text(row.work_desc, 700) || null,
          valuation: Number(row.valuation) || null,
          construction: text(row.construction, 180) || null,
          certificateOfOccupancyDate: text(row.cofo_date, 60) || null,
        });
      }
    }

    const permits = Array.from(recent.values());
    if (!permits.length) return privateJson({ ok: true, source: SOURCE_ID, seen: rows.length, commercialPermits: 0, matched: 0 });

    const result = await leadNeonQuery(
      `WITH permits AS (
         SELECT * FROM jsonb_to_recordset($1::jsonb) AS p(
           "addressKey" text,
           "issuedAt" timestamptz,
           "permitNumber" text,
           "permitGroup" text,
           "permitType" text,
           "permitSubType" text,
           "useDescription" text,
           "workDescription" text,
           valuation numeric,
           construction text,
           "certificateOfOccupancyDate" timestamptz
         )
       ), matched AS (
         SELECT DISTINCT ON (c.id)
           c.id,c.organization_name,c.alternate_name,c.category,c.address_line1,c.city,c.state,c.postal_code,c.country_code,
           c.contact_name,c.phone,c.email,c.website_url,c.priority_seed,p.*
         FROM public.lead_candidates c
         JOIN permits p ON regexp_replace(upper(split_part(COALESCE(c.address_line1,''),'#',1)), '[^A-Z0-9]', '', 'g') = p."addressKey"
         WHERE c.archived_at IS NULL
           AND c.source <> '${SOURCE_ID}'
           AND upper(COALESCE(c.state,''))='CA'
           AND c.source='city-los-angeles-businesses'
         ORDER BY c.id,p."issuedAt" DESC
       ), updated AS (
         UPDATE public.lead_candidates c
         SET priority_seed=LEAST(100,GREATEST(c.priority_seed,78)),
             metadata=c.metadata || jsonb_build_object(
               'losAngelesPermitSignal',jsonb_build_object(
                 'issuedAt',matched."issuedAt",'permitNumber',matched."permitNumber",'permitType',matched."permitType",
                 'permitSubType',matched."permitSubType",'useDescription',matched."useDescription",'workDescription',matched."workDescription",
                 'valuation',matched.valuation,'construction',matched.construction,'certificateOfOccupancyDate',matched."certificateOfOccupancyDate",
                 'evidenceLevel','address-level','source','LADBS'
               ),
               'motionSignal','recent-los-angeles-commercial-permit-at-address',
               'motionSignalDate',matched."issuedAt"
             ),
             next_action_at=LEAST(c.next_action_at,now()),updated_at=now()
         FROM matched WHERE c.id=matched.id RETURNING c.id
       ), signal_events AS (
         INSERT INTO public.lead_candidates AS existing(
           source,source_key,organization_name,alternate_name,category,address_line1,city,state,postal_code,country_code,
           contact_name,phone,email,website_url,source_url,formed_at,status,priority_seed,domain_confidence,attempts,next_action_at,metadata,updated_at
         )
         SELECT '${SOURCE_ID}',COALESCE(matched."permitNumber",matched."issuedAt"::text)||':'||matched.id::text,
           matched.organization_name,matched.alternate_name,matched.category,matched.address_line1,matched.city,matched.state,matched.postal_code,matched.country_code,
           matched.contact_name,matched.phone,matched.email,matched.website_url,$2,matched."issuedAt"::date,'rejected',GREATEST(matched.priority_seed,78),0,0,now()+interval '365 days',
           jsonb_build_object('signalOnly',true,'motionSignal','recent-los-angeles-commercial-permit-at-address','motionSignalDate',matched."issuedAt",'parentCandidateId',matched.id,
             'permitSignal',jsonb_build_object('issuedAt',matched."issuedAt",'permitNumber',matched."permitNumber",'workDescription',matched."workDescription",'valuation',matched.valuation,'evidenceLevel','address-level')),
           now()
         FROM matched
         ON CONFLICT(source,source_key) DO UPDATE SET formed_at=EXCLUDED.formed_at,metadata=existing.metadata||EXCLUDED.metadata,archived_at=NULL,updated_at=now()
         RETURNING id
       )
       SELECT (SELECT count(*)::text FROM updated) matched,(SELECT count(*)::text FROM signal_events) signal_events`,
      [JSON.stringify(permits), SOURCE_URL],
    );
    const stats = neonRowsToObjects(result)[0] ?? {};
    return privateJson({
      ok: true, source: SOURCE_ID, seen: rows.length, commercialPermits: permits.length,
      matched: Number(stats.matched ?? 0), signalEvents: Number(stats.signal_events ?? 0),
      evidence: "Address-level timing only; a permit match does not prove the permit belongs to that tenant/business."
    });
  } catch (error) {
    return privateJson({ error: error instanceof Error ? error.message : "Los Angeles permit motion collector failed.", source: SOURCE_ID }, { status: 503 });
  }
}
