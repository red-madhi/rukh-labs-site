import { NextRequest, NextResponse } from "next/server";
import { collectorAuthorized, privateJson } from "@/lib/leads/pipeline";
import { leadNeonQuery } from "@/lib/leads/neon";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  if (!collectorAuthorized(request)) return privateJson({ error: "Collector authentication failed." }, { status: 401 });
  await leadNeonQuery(
    `UPDATE public.lead_candidates
     SET status = 'ready', last_enriched_at = COALESCE(last_enriched_at, now()), updated_at = now()
     WHERE promoted_lead_id IS NULL
       AND website_url IS NOT NULL
       AND status IN ('new', 'error')`,
  );

  const secret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization") || (secret ? `Bearer ${secret}` : null);
  if (!authorization) return privateJson({ error: "Collector authentication failed." }, { status: 401 });
  const response = await fetch(new URL("/api/leads/collect/audit-sites", request.nextUrl.origin), {
    headers: { Authorization: authorization },
    cache: "no-store",
    signal: AbortSignal.timeout(55_000),
  });
  const text = await response.text();
  return new NextResponse(text, {
    status: response.status,
    headers: {
      "Content-Type": response.headers.get("content-type") || "application/json",
      "Cache-Control": "private, no-store, max-age=0",
      "X-Robots-Tag": "noindex, nofollow, noarchive",
    },
  });
}
