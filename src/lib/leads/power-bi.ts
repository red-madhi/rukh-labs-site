import { clamp, cleanText } from "@/lib/leads/crawl";
import { leadNeonQuery } from "@/lib/leads/neon";

export type PowerBiGigInput = {
  sourceKey: string;
  sourceUrl: string;
  companyName: string;
  summary: string;
  score: number;
  signals: string[];
  risks?: string[];
  tags: string[];
  pitch: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  contactUrl?: string;
  website?: string;
  location?: string;
  discoveredAt?: string;
  sourcePublishedAt?: string;
  rawPayload?: Record<string, unknown>;
};

export async function expirePowerBiJobBoardGigs() {
  const result = await leadNeonQuery(
    `UPDATE public.lead_opportunities
     SET archived_at = now(), updated_at = now()
     WHERE source = 'power-bi'
       AND archived_at IS NULL
       AND tags ? 'job-board'
       AND COALESCE(source_published_at, discovered_at) <= now() - interval '12 hours'
     RETURNING id::text`,
  );
  return result.rows?.length ?? result.rowCount ?? 0;
}

export async function upsertPowerBiGigs(inputs: PowerBiGigInput[]) {
  const rows = inputs
    .map((input) => {
      const score = clamp(input.score);
      return {
        source_key: cleanText(input.sourceKey, 500),
        source_url: cleanText(input.sourceUrl, 1000),
        source_published_at: input.sourcePublishedAt || null,
        company_name: cleanText(input.companyName, 260),
        summary: cleanText(input.summary, 1200),
        score,
        priority: score >= 85 ? "hot" : score >= 70 ? "strong" : "watch",
        signals: input.signals.map((signal) => cleanText(signal, 320)).filter(Boolean),
        risks: (input.risks ?? []).map((risk) => cleanText(risk, 320)).filter(Boolean),
        tags: input.tags.map((tag) => cleanText(tag, 120)).filter(Boolean),
        pitch: cleanText(input.pitch, 1200),
        contact_name: cleanText(input.contactName, 180) || null,
        contact_email: cleanText(input.contactEmail, 220).toLowerCase() || null,
        contact_phone: cleanText(input.contactPhone, 80) || null,
        contact_url: cleanText(input.contactUrl, 1000) || null,
        website_url: cleanText(input.website, 1000) || null,
        location: cleanText(input.location, 180) || "Remote / location not confirmed",
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
         source_published_at timestamptz,
         company_name text,
         summary text,
         score smallint,
         priority text,
         signals jsonb,
         risks jsonb,
         tags jsonb,
         pitch text,
         contact_name text,
         contact_email text,
         contact_phone text,
         contact_url text,
         website_url text,
         location text,
         discovered_at timestamptz,
         raw_payload jsonb
       )
     )
     INSERT INTO public.lead_opportunities AS existing (
       source, source_key, source_url, source_published_at, discovered_at, company_name,
       contact_name, contact_email, contact_phone, contact_url, website_url,
       location, industry, summary, score, priority, signals, risks, tags,
       pitch, raw_payload, last_checked_at
     )
     SELECT
       'power-bi', source_key, source_url, source_published_at, COALESCE(discovered_at, now()), company_name,
       contact_name, contact_email, contact_phone, contact_url, website_url,
       location, 'Power BI / Business Intelligence', summary, score, priority,
       signals, risks, tags, pitch, raw_payload, now()
     FROM incoming
     ON CONFLICT (source, source_key) DO UPDATE SET
       source_url = EXCLUDED.source_url,
       source_published_at = COALESCE(EXCLUDED.source_published_at, existing.source_published_at),
       company_name = EXCLUDED.company_name,
       contact_name = COALESCE(EXCLUDED.contact_name, existing.contact_name),
       contact_email = COALESCE(EXCLUDED.contact_email, existing.contact_email),
       contact_phone = COALESCE(EXCLUDED.contact_phone, existing.contact_phone),
       contact_url = COALESCE(EXCLUDED.contact_url, existing.contact_url),
       website_url = COALESCE(EXCLUDED.website_url, existing.website_url),
       location = EXCLUDED.location,
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
