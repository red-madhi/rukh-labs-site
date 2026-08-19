import { leadNeonQuery } from "@/lib/leads/neon";
import { clamp, cleanText } from "@/lib/leads/crawl";

export type IntentOpportunityInput = {
  sourceKey: string;
  sourceUrl: string;
  companyName: string;
  summary: string;
  score: number;
  signals: string[];
  risks?: string[];
  tags: string[];
  pitch: string;
  location?: string;
  industry?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  contactUrl?: string;
  discoveredAt?: string;
  rawPayload?: Record<string, unknown>;
};

export async function upsertIntentOpportunities(inputs: IntentOpportunityInput[]) {
  const rows = inputs
    .map((input) => {
      const score = clamp(input.score);
      return {
        source_key: cleanText(input.sourceKey, 500),
        source_url: cleanText(input.sourceUrl, 1000),
        company_name: cleanText(input.companyName, 260),
        summary: cleanText(input.summary, 900),
        score,
        priority: score >= 85 ? "hot" : score >= 70 ? "strong" : "watch",
        signals: input.signals.map((signal) => cleanText(signal, 300)).filter(Boolean),
        risks: (input.risks ?? []).map((risk) => cleanText(risk, 300)).filter(Boolean),
        tags: input.tags.map((tag) => cleanText(tag, 120)).filter(Boolean),
        pitch: cleanText(input.pitch, 1000),
        location: cleanText(input.location, 180) || "Location not confirmed",
        industry: cleanText(input.industry, 180) || "Unclassified",
        contact_name: cleanText(input.contactName, 180) || null,
        contact_email: cleanText(input.contactEmail, 220).toLowerCase() || null,
        contact_phone: cleanText(input.contactPhone, 80) || null,
        contact_url: cleanText(input.contactUrl, 1000) || null,
        discovered_at: input.discoveredAt || null,
        raw_payload: input.rawPayload ?? {},
      };
    })
    .filter((row) => row.source_key && row.source_url && row.company_name && row.summary);

  if (!rows.length) return 0;

  const result = await leadNeonQuery(
    `WITH incoming AS (
       SELECT *
       FROM jsonb_to_recordset($1::jsonb) AS item(
         source_key text,
         source_url text,
         company_name text,
         summary text,
         score smallint,
         priority text,
         signals jsonb,
         risks jsonb,
         tags jsonb,
         pitch text,
         location text,
         industry text,
         contact_name text,
         contact_email text,
         contact_phone text,
         contact_url text,
         discovered_at timestamptz,
         raw_payload jsonb
       )
     )
     INSERT INTO public.lead_opportunities AS existing (
       source,
       source_key,
       source_url,
       discovered_at,
       company_name,
       contact_name,
       contact_email,
       contact_phone,
       contact_url,
       location,
       industry,
       summary,
       score,
       priority,
       signals,
       risks,
       tags,
       pitch,
       raw_payload,
       last_checked_at
     )
     SELECT
       'intent',
       source_key,
       source_url,
       COALESCE(discovered_at, now()),
       company_name,
       contact_name,
       contact_email,
       contact_phone,
       contact_url,
       location,
       industry,
       summary,
       score,
       priority,
       signals,
       risks,
       tags,
       pitch,
       raw_payload,
       now()
     FROM incoming
     ON CONFLICT (source, source_key) DO UPDATE SET
       source_url = EXCLUDED.source_url,
       company_name = EXCLUDED.company_name,
       contact_name = COALESCE(EXCLUDED.contact_name, existing.contact_name),
       contact_email = COALESCE(EXCLUDED.contact_email, existing.contact_email),
       contact_phone = COALESCE(EXCLUDED.contact_phone, existing.contact_phone),
       contact_url = COALESCE(EXCLUDED.contact_url, existing.contact_url),
       location = CASE
         WHEN EXCLUDED.location <> 'Location not confirmed' THEN EXCLUDED.location
         ELSE existing.location
       END,
       industry = CASE
         WHEN EXCLUDED.industry <> 'Unclassified' THEN EXCLUDED.industry
         ELSE existing.industry
       END,
       summary = EXCLUDED.summary,
       score = GREATEST(existing.score, EXCLUDED.score),
       priority = CASE
         WHEN GREATEST(existing.score, EXCLUDED.score) >= 85 THEN 'hot'
         WHEN GREATEST(existing.score, EXCLUDED.score) >= 70 THEN 'strong'
         ELSE 'watch'
       END,
       signals = EXCLUDED.signals,
       risks = EXCLUDED.risks,
       tags = EXCLUDED.tags,
       pitch = EXCLUDED.pitch,
       raw_payload = EXCLUDED.raw_payload,
       last_checked_at = now(),
       updated_at = now(),
       archived_at = NULL
     RETURNING id::text`,
    [JSON.stringify(rows)],
  );

  return result.rows?.length ?? result.rowCount ?? 0;
}
