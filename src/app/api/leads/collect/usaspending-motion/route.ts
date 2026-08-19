import type { NextRequest } from "next/server";
import { hasValidBasicAuth, hasValidCronAuth } from "@/lib/leads/auth";
import { cleanText, privateJson } from "@/lib/leads/crawl";
import { leadNeonQuery } from "@/lib/leads/neon";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SOURCE_ID = "usaspending-business-motion";
const ENDPOINT = "https://api.usaspending.gov/api/v2/search/spending_by_award/";
const LOOKBACK_DAYS = 14;

type Award = {
  "Award ID"?: string;
  "Recipient Name"?: string;
  "Award Amount"?: number;
  "Start Date"?: string;
  "Awarding Agency"?: string;
};
type Payload = { results?: Award[] };

function dateOnly(date: Date) {
  return date.toISOString().slice(0, 10);
}

function normalizedName(value: string) {
  return cleanText(value, 300)
    .toLowerCase()
    .replace(/\b(?:llc|l\.l\.c\.?|incorporated|inc\.?|corp(?:oration)?\.?|company|co\.?|limited|ltd\.?)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export async function GET(request: NextRequest) {
  if (!hasValidCronAuth(request) && !hasValidBasicAuth(request)) {
    return privateJson({ error: "Collector authentication failed." }, { status: 401 });
  }

  try {
    const end = new Date();
    const start = new Date(end.getTime() - LOOKBACK_DAYS * 86_400_000);
    const response = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "User-Agent": "Rukh-Leads/1.0 (+https://rukhlabs.com)",
      },
      body: JSON.stringify({
        filters: {
          time_period: [{ start_date: dateOnly(start), end_date: dateOnly(end), date_type: "new_awards_only" }],
          award_type_codes: ["A", "B", "C", "D", "02", "03", "04", "05"],
          recipient_scope: "domestic",
        },
        fields: ["Award ID", "Recipient Name", "Award Amount", "Start Date", "Awarding Agency"],
        page: 1,
        limit: 100,
        sort: "Start Date",
        order: "desc",
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
    });
    if (!response.ok) {
      const detail = cleanText(await response.text().catch(() => ""), 240);
      throw new Error(`USAspending returned ${response.status}${detail ? `: ${detail}` : ""}`);
    }
    const payload = (await response.json()) as Payload;
    const awards = (payload.results ?? [])
      .map((award) => ({
        accountKey: normalizedName(award["Recipient Name"] || ""),
        recipientName: cleanText(award["Recipient Name"], 260),
        awardId: cleanText(award["Award ID"], 160),
        amount: Number(award["Award Amount"] ?? 0) || 0,
        startDate: cleanText(award["Start Date"], 50) || null,
        awardingAgency: cleanText(award["Awarding Agency"], 220) || null,
      }))
      .filter((award) => award.accountKey && award.recipientName && award.awardId);

    if (!awards.length) return privateJson({ ok: true, source: SOURCE_ID, seen: 0, matched: 0 });

    const result = await leadNeonQuery(
      `WITH awards AS (
         SELECT * FROM jsonb_to_recordset($1::jsonb) AS a(
           "accountKey" text,
           "recipientName" text,
           "awardId" text,
           amount numeric,
           "startDate" date,
           "awardingAgency" text
         )
       ), candidate_keys AS (
         SELECT
           candidate.id,
           lower(trim(regexp_replace(
             regexp_replace(candidate.organization_name, '\\m(llc|l\\.l\\.c\\.?|incorporated|inc\\.?|corp(oration)?\\.?|company|co\\.?|limited|ltd\\.?)\\M', ' ', 'gi'),
             '[^a-zA-Z0-9]+', ' ', 'g'
           ))) AS account_key
         FROM public.lead_candidates candidate
         WHERE candidate.archived_at IS NULL
       ), unique_names AS (
         SELECT account_key, count(*) AS matches
         FROM candidate_keys
         WHERE account_key <> ''
         GROUP BY account_key
       ), matched AS (
         SELECT ck.id, a.*
         FROM candidate_keys ck
         JOIN unique_names u ON u.account_key = ck.account_key AND u.matches = 1
         JOIN awards a ON a."accountKey" = ck.account_key
       )
       UPDATE public.lead_candidates candidate
       SET metadata = candidate.metadata || jsonb_build_object(
             'federalAwardSignal', jsonb_build_object(
               'recipientName', matched."recipientName",
               'awardId', matched."awardId",
               'amount', matched.amount,
               'startDate', matched."startDate",
               'awardingAgency', matched."awardingAgency",
               'source', 'USAspending.gov',
               'interpretation', 'business activity context only; award funds may be restricted'
             )
           ),
           updated_at = now()
       FROM matched
       WHERE candidate.id = matched.id
       RETURNING candidate.id::text`,
      [JSON.stringify(awards)],
    );

    return privateJson({
      ok: true,
      source: SOURCE_ID,
      seen: awards.length,
      matched: result.rows?.length ?? result.rowCount ?? 0,
      interpretation: "Context only; no assumption that federal award funds are available for website or BI work.",
    });
  } catch (error) {
    return privateJson({ error: error instanceof Error ? error.message : "USAspending collector failed.", source: SOURCE_ID }, { status: 503 });
  }
}
