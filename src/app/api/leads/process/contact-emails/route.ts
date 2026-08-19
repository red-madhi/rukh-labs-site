import type { NextRequest } from "next/server";
import { hasValidBasicAuth, hasValidCronAuth } from "@/lib/leads/auth";
import type { CandidateRow } from "@/lib/leads/crawl";
import { privateJson } from "@/lib/leads/crawl";
import { enrichPublicEmail } from "@/lib/leads/contact-enrichment";
import { leadNeonQuery, neonRowsToObjects } from "@/lib/leads/neon";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function parseObject(value: string | null) {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

function toCandidate(row: Record<string, string | null>): CandidateRow {
  return {
    id: row.candidate_id || "",
    source: row.candidate_source || "unknown",
    sourceKey: row.candidate_source_key || "",
    organizationName: row.organization_name || "Unnamed prospect",
    alternateName: row.alternate_name || undefined,
    category: row.category || undefined,
    addressLine1: row.address_line1 || undefined,
    city: row.city || undefined,
    state: row.state || undefined,
    postalCode: row.postal_code || undefined,
    countryCode: row.country_code || "US",
    contactName: row.contact_name || undefined,
    phone: row.phone || undefined,
    email: row.email || undefined,
    websiteUrl: row.website_url || undefined,
    sourceUrl: row.source_url || undefined,
    formedAt: row.formed_at || undefined,
    discoveredAt: row.candidate_discovered_at || new Date(0).toISOString(),
    status: row.candidate_status || "qualified",
    prioritySeed: Number(row.priority_seed ?? 0),
    domainConfidence: Number(row.domain_confidence ?? 0),
    attempts: Number(row.attempts ?? 0),
    audit: parseObject(row.candidate_audit),
    metadata: parseObject(row.candidate_metadata),
  };
}

async function mapWithConcurrency<T, R>(
  values: readonly T[],
  concurrency: number,
  worker: (value: T) => Promise<R>,
) {
  const output = new Array<R>(values.length);
  let next = 0;
  async function run() {
    while (next < values.length) {
      const index = next;
      next += 1;
      output[index] = await worker(values[index]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, values.length) }, () => run()));
  return output;
}

export async function GET(request: NextRequest) {
  if (!hasValidCronAuth(request) && !hasValidBasicAuth(request)) {
    return privateJson({ error: "Collector authentication failed." }, { status: 401 });
  }

  const requestedLimit = Number(request.nextUrl.searchParams.get("limit") ?? 4);
  const limit = Math.max(1, Math.min(8, Number.isFinite(requestedLimit) ? requestedLimit : 4));

  try {
    const result = await leadNeonQuery(
      `SELECT
         o.id::text AS lead_id,
         o.score::text AS lead_score,
         c.id::text AS candidate_id,
         c.source AS candidate_source,
         c.source_key AS candidate_source_key,
         c.organization_name,
         c.alternate_name,
         c.category,
         c.address_line1,
         c.city,
         c.state,
         c.postal_code,
         c.country_code,
         c.contact_name,
         c.phone,
         c.email,
         c.website_url,
         c.source_url,
         c.formed_at::text,
         c.discovered_at::text AS candidate_discovered_at,
         c.status AS candidate_status,
         c.priority_seed::text,
         c.domain_confidence::text,
         c.attempts::text,
         c.audit::text AS candidate_audit,
         c.metadata::text AS candidate_metadata
       FROM public.lead_opportunities o
       JOIN public.lead_candidates c
         ON o.source_key = 'candidate:' || c.id::text
       WHERE o.archived_at IS NULL
         AND o.source IN ('site-audit', 'new-business')
         AND o.contact_email IS NULL
         AND o.score >= 54
         AND c.website_url IS NOT NULL
         AND (
           o.raw_payload->>'emailEnrichmentLastAttempt' IS NULL
           OR (o.raw_payload->>'emailEnrichmentLastAttempt')::timestamptz <= now() - interval '7 days'
         )
       ORDER BY o.score DESC, o.discovered_at DESC
       LIMIT $1::int`,
      [String(limit)],
    );

    const rows = neonRowsToObjects(result);
    const outcomes = await mapWithConcurrency(rows, 2, async (row) => {
      const candidate = toCandidate(row);
      if (!candidate.websiteUrl) return { found: false, candidateId: candidate.id };

      const leadScore = Number(row.lead_score ?? 0);
      const enrichment = await enrichPublicEmail(
        candidate,
        candidate.websiteUrl,
        leadScore >= 70,
      );
      const found = Boolean(enrichment.email);
      const details = {
        emailEnrichmentLastAttempt: new Date().toISOString(),
        emailEnrichmentMethod: enrichment.method || null,
        emailEnrichmentSourceUrl: enrichment.sourceUrl || null,
        emailEnrichmentPagesChecked: enrichment.pagesChecked,
        emailEnrichmentSearchUsed: enrichment.searchUsed,
      };

      await Promise.all([
        leadNeonQuery(
          `UPDATE public.lead_opportunities
           SET contact_email = COALESCE($2, contact_email),
               raw_payload = raw_payload || $3::jsonb,
               updated_at = now()
           WHERE id = $1::uuid`,
          [row.lead_id || "", enrichment.email || null, JSON.stringify(details)],
        ),
        leadNeonQuery(
          `UPDATE public.lead_candidates
           SET email = COALESCE($2, email),
               metadata = metadata || $3::jsonb,
               updated_at = now()
           WHERE id = $1::uuid`,
          [candidate.id, enrichment.email || null, JSON.stringify(details)],
        ),
      ]);

      return {
        found,
        candidateId: candidate.id,
        company: candidate.organizationName,
        email: enrichment.email || null,
        method: enrichment.method || null,
      };
    });

    return privateJson({
      ok: true,
      attempted: outcomes.length,
      found: outcomes.filter((outcome) => outcome.found).length,
      results: outcomes,
    });
  } catch (error) {
    return privateJson(
      { error: error instanceof Error ? error.message : "Email enrichment failed." },
      { status: 503 },
    );
  }
}
