import { NextRequest, NextResponse } from "next/server";
import { hasValidBasicAuth, hasValidCronAuth } from "@/lib/leads/auth";
import { leadNeonQuery } from "@/lib/leads/neon";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SOURCE_ID = "rukh-inbound";

function privateJson(body: unknown, init?: ResponseInit) {
  const response = NextResponse.json(body, init);
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive, nosnippet");
  return response;
}

export async function GET(request: NextRequest) {
  if (!hasValidCronAuth(request) && !hasValidBasicAuth(request)) {
    return privateJson({ error: "Collector authentication failed." }, { status: 401 });
  }

  const runId = crypto.randomUUID();
  try {
    await leadNeonQuery(
      `INSERT INTO public.lead_collector_runs (id, source_id, status)
       VALUES ($1::uuid, $2, 'running')`,
      [runId, SOURCE_ID],
    );

    const result = await leadNeonQuery(
      `WITH source_rows AS (
         SELECT
           id,
           submitted_at,
           status,
           name,
           email,
           phone,
           reason,
           organization,
           project_type,
           package_id,
           design_direction,
           current_website,
           budget,
           timeline,
           referral,
           message,
           source_page,
           referrer,
           utm
         FROM public.contact_leads
         WHERE reason = 'Website design project'
       ), upserted AS (
         INSERT INTO public.lead_opportunities AS existing (
           source,
           source_key,
           source_url,
           source_published_at,
           company_name,
           contact_name,
           contact_email,
           contact_phone,
           contact_url,
           website_url,
           location,
           industry,
           summary,
           score,
           priority,
           status,
           signals,
           risks,
           tags,
           pitch,
           raw_payload,
           last_checked_at
         )
         SELECT
           'inbound',
           'contact:' || id::text,
           CASE
             WHEN source_page IS NOT NULL AND source_page <> ''
               THEN 'https://rukhlabs.com' || source_page
             ELSE 'https://rukhlabs.com/contact'
           END,
           submitted_at,
           COALESCE(NULLIF(organization, ''), name, 'Rukh Labs inquiry'),
           name,
           email,
           NULLIF(phone, ''),
           NULL,
           NULLIF(current_website, ''),
           'Location not confirmed',
           COALESCE(NULLIF(project_type, ''), 'Website project'),
           COALESCE(NULLIF(message, ''), 'Inbound website project inquiry.'),
           CASE
             WHEN budget IS NOT NULL AND budget <> '' THEN 98
             WHEN timeline IS NOT NULL AND timeline <> '' THEN 96
             ELSE 94
           END,
           'hot',
           CASE WHEN status IN ('new','contacted','replied','meeting','proposal','won','lost','ignored') THEN status ELSE 'new' END,
           jsonb_build_array(
             'Submitted directly through the Rukh Labs website',
             CASE WHEN budget IS NOT NULL AND budget <> '' THEN 'Budget information provided' ELSE 'Website project explicitly requested' END,
             CASE WHEN timeline IS NOT NULL AND timeline <> '' THEN 'Timeline information provided' ELSE 'Direct contact information provided' END
           ),
           '[]'::jsonb,
           jsonb_strip_nulls(jsonb_build_array('inbound', 'website project', NULLIF(project_type, ''), NULLIF(package_id, ''), NULLIF(design_direction, ''))),
           'This is an inbound Rukh Labs inquiry. Reply directly using the contact details they provided and reference the project details in their submission.',
           jsonb_build_object(
             'contactLeadId', id::text,
             'budget', budget,
             'timeline', timeline,
             'referral', referral,
             'referrer', referrer,
             'utm', utm
           ),
           now()
         FROM source_rows
         ON CONFLICT (source, source_key) DO UPDATE SET
           updated_at = now(),
           company_name = EXCLUDED.company_name,
           contact_name = EXCLUDED.contact_name,
           contact_email = EXCLUDED.contact_email,
           contact_phone = EXCLUDED.contact_phone,
           website_url = EXCLUDED.website_url,
           summary = EXCLUDED.summary,
           score = EXCLUDED.score,
           priority = EXCLUDED.priority,
           signals = EXCLUDED.signals,
           tags = EXCLUDED.tags,
           raw_payload = EXCLUDED.raw_payload,
           last_checked_at = now()
         RETURNING id
       )
       SELECT COUNT(*)::text FROM upserted`,
    );

    const stored = Number(result.rows?.[0]?.[0] ?? 0);
    await Promise.all([
      leadNeonQuery(
        `UPDATE public.lead_collector_runs
         SET status = 'success', completed_at = now(), items_seen = $2::int, items_upserted = $2::int
         WHERE id = $1::uuid`,
        [runId, String(stored)],
      ),
      leadNeonQuery(
        `UPDATE public.lead_source_state
         SET status = 'ready', last_run_at = now(), last_success_at = now(), last_items = $2::int,
             last_error = NULL, updated_at = now()
         WHERE source_id = $1`,
        [SOURCE_ID, String(stored)],
      ),
    ]);

    return privateJson({ ok: true, source: SOURCE_ID, stored });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Inbound collector failed.";
    await Promise.allSettled([
      leadNeonQuery(
        `UPDATE public.lead_collector_runs SET status = 'error', completed_at = now(), error_message = $2 WHERE id = $1::uuid`,
        [runId, message.slice(0, 900)],
      ),
      leadNeonQuery(
        `UPDATE public.lead_source_state SET status = 'error', last_run_at = now(), last_error = $2, updated_at = now() WHERE source_id = $1`,
        [SOURCE_ID, message.slice(0, 900)],
      ),
    ]);
    return privateJson({ error: message, source: SOURCE_ID }, { status: 503 });
  }
}
