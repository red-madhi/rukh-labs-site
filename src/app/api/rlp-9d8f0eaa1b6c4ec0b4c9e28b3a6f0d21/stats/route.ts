import { NextResponse } from "next/server";
import { leadNeonQuery, neonRowsToObjects } from "@/lib/leads/neon";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const [candidateTotal, candidateSources, candidateStatuses, leadTotal, leadSources, crawlState] = await Promise.all([
    leadNeonQuery(`SELECT count(*)::text AS count FROM public.lead_candidates`),
    leadNeonQuery(`SELECT source_id, count(*)::text AS count FROM public.lead_candidates GROUP BY source_id ORDER BY count(*) DESC LIMIT 30`),
    leadNeonQuery(`SELECT status, count(*)::text AS count FROM public.lead_candidates GROUP BY status ORDER BY status`),
    leadNeonQuery(`SELECT count(*)::text AS count FROM public.lead_opportunities WHERE archived_at IS NULL`),
    leadNeonQuery(`SELECT source, count(*)::text AS count FROM public.lead_opportunities WHERE archived_at IS NULL GROUP BY source ORDER BY count(*) DESC`),
    leadNeonQuery(`SELECT source_id, last_success_at::text, last_error, records_seen::text, records_saved::text, cursor::text FROM public.lead_crawl_state ORDER BY source_id`),
  ]);
  const response = NextResponse.json({
    candidates: Number(neonRowsToObjects(candidateTotal)[0]?.count ?? 0),
    candidateSources: neonRowsToObjects(candidateSources),
    candidateStatuses: neonRowsToObjects(candidateStatuses),
    activeLeads: Number(neonRowsToObjects(leadTotal)[0]?.count ?? 0),
    leadSources: neonRowsToObjects(leadSources),
    crawlState: neonRowsToObjects(crawlState),
  });
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  return response;
}
