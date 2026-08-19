import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const routes: Record<string, string> = {
  directories: "/api/leads/collect/pipeline-v2?mode=directories",
  enrich: "/api/leads/collect/pipeline-v2?mode=enrich",
  full: "/api/leads/collect/mega",
  colorado: "/api/leads/collect/directories/colorado",
  nppes: "/api/leads/collect/directories/nppes",
  socrata: "/api/leads/collect/directories/socrata",
  discover: "/api/leads/collect/discover",
  audit: "/api/leads/collect/audit-sites",
};

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const stage = request.nextUrl.searchParams.get("stage") || "full";
  const path = routes[stage];
  if (!secret || !path) return NextResponse.json({ error: "Unavailable stage." }, { status: 404 });

  const response = await fetch(new URL(path, request.nextUrl.origin), {
    headers: { Authorization: `Bearer ${secret}` },
    cache: "no-store",
    signal: AbortSignal.timeout(55_000),
  });
  const text = await response.text();
  return new NextResponse(text, {
    status: response.status,
    headers: {
      "Content-Type": response.headers.get("content-type") || "application/json",
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex, nofollow, noarchive",
    },
  });
}
