import type { NextRequest } from "next/server";
import { hasValidBasicAuth, hasValidCronAuth } from "@/lib/leads/auth";
import { privateJson } from "@/lib/leads/crawl";
import { leadNeonQuery } from "@/lib/leads/neon";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  if (!hasValidCronAuth(request) && !hasValidBasicAuth(request)) {
    return privateJson({ error: "Collector authentication failed." }, { status: 401 });
  }

  const results = await Promise.all([
    leadNeonQuery(
      `UPDATE public.lead_opportunities
       SET archived_at = now(), updated_at = now()
       WHERE archived_at IS NULL
         AND status = 'new'
         AND source = 'power-bi'
         AND tags ? 'job-board'
         AND COALESCE(source_published_at, discovered_at) <= now() - interval '12 hours'
       RETURNING id::text`,
    ),
    leadNeonQuery(
      `UPDATE public.lead_opportunities
       SET archived_at = now(), updated_at = now()
       WHERE archived_at IS NULL
         AND status = 'new'
         AND source = 'intent'
         AND EXISTS (
           SELECT 1 FROM jsonb_array_elements_text(tags) tag
           WHERE lower(tag) IN ('bluesky','mastodon','linkedin','x','public intent','extreme fresh')
         )
         AND COALESCE(source_published_at, discovered_at) <= now() - interval '72 hours'
       RETURNING id::text`,
    ),
    leadNeonQuery(
      `UPDATE public.lead_opportunities
       SET archived_at = now(), updated_at = now()
       WHERE archived_at IS NULL
         AND status = 'new'
         AND source = 'power-bi'
         AND NOT (tags ? 'job-board')
         AND EXISTS (
           SELECT 1 FROM jsonb_array_elements_text(tags) tag
           WHERE lower(tag) IN ('direct ask','extreme fresh','bluesky','mastodon')
         )
         AND COALESCE(source_published_at, discovered_at) <= now() - interval '72 hours'
       RETURNING id::text`,
    ),
    leadNeonQuery(
      `UPDATE public.lead_opportunities
       SET archived_at = now(), updated_at = now()
       WHERE archived_at IS NULL
         AND status = 'new'
         AND source = 'power-bi'
         AND EXISTS (
           SELECT 1 FROM jsonb_array_elements_text(tags) tag
           WHERE lower(tag) = 'proactive signal'
         )
         AND NOT EXISTS (
           SELECT 1 FROM jsonb_array_elements_text(tags) tag
           WHERE lower(tag) IN ('procurement','sam.gov','rfp')
         )
         AND COALESCE(source_published_at, discovered_at) <= now() - interval '30 days'
       RETURNING id::text`,
    ),
  ]);

  const staleAuditCandidates = await leadNeonQuery(
    `WITH stale AS (
       SELECT id, raw_payload->>'candidateId' AS candidate_id
       FROM public.lead_opportunities
       WHERE archived_at IS NULL
         AND status = 'new'
         AND source = 'site-audit'
         AND last_checked_at <= now() - interval '90 days'
         AND raw_payload ? 'candidateId'
     ), requeued AS (
       UPDATE public.lead_candidates candidate
       SET status = 'audit-pending', next_action_at = now(), updated_at = now()
       FROM stale
       WHERE candidate.id::text = stale.candidate_id
         AND candidate.website_url IS NOT NULL
       RETURNING candidate.id
     )
     UPDATE public.lead_opportunities lead
     SET archived_at = now(), updated_at = now()
     FROM stale
     WHERE lead.id = stale.id
     RETURNING lead.id::text`,
  );

  const staleNoWebsite = await leadNeonQuery(
    `WITH stale AS (
       SELECT id, raw_payload->>'candidateId' AS candidate_id
       FROM public.lead_opportunities
       WHERE archived_at IS NULL
         AND status = 'new'
         AND source = 'new-business'
         AND last_checked_at <= now() - interval '180 days'
         AND raw_payload ? 'candidateId'
     ), requeued AS (
       UPDATE public.lead_candidates candidate
       SET status = 'domain-pending', next_action_at = now(), attempts = 0, updated_at = now()
       FROM stale
       WHERE candidate.id::text = stale.candidate_id
         AND candidate.website_url IS NULL
       RETURNING candidate.id
     )
     UPDATE public.lead_opportunities lead
     SET archived_at = now(), updated_at = now()
     FROM stale
     WHERE lead.id = stale.id
     RETURNING lead.id::text`,
  );

  const counts = {
    jobBoard12h: results[0].rows?.length ?? results[0].rowCount ?? 0,
    publicIntent72h: results[1].rows?.length ?? results[1].rowCount ?? 0,
    powerBiDirect72h: results[2].rows?.length ?? results[2].rowCount ?? 0,
    powerBiProactive30d: results[3].rows?.length ?? results[3].rowCount ?? 0,
    websiteAuditRecheck90d: staleAuditCandidates.rows?.length ?? staleAuditCandidates.rowCount ?? 0,
    noWebsiteRecheck180d: staleNoWebsite.rows?.length ?? staleNoWebsite.rowCount ?? 0,
  };

  return privateJson({ ok: true, source: "signal-expiry", counts, expired: Object.values(counts).reduce((a, b) => a + b, 0) });
}
