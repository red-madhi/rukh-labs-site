import { NextRequest, NextResponse } from "next/server";
import { verifyGithubActionsToken } from "@/lib/leads/github-oidc";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const ALLOWED_WORKFLOWS = ["rukh-leads-irs-oidc.yml"];
const routes: Record<string, string> = {
  candidates: "/api/leads/ingest/candidates",
  report: "/api/leads/ingest/report",
};

export async function POST(request: NextRequest) {
  const authorization = request.headers.get("authorization");
  const token = authorization?.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
  try {
    if (!token || !(await verifyGithubActionsToken(token, ALLOWED_WORKFLOWS))) {
      return NextResponse.json({ error: "GitHub Actions OIDC authentication failed." }, { status: 401 });
    }
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "OIDC verification failed." }, { status: 503 });
  }

  const stage = request.nextUrl.searchParams.get("stage") || "candidates";
  const path = routes[stage];
  const cronSecret = process.env.CRON_SECRET;
  if (!path || !cronSecret) return NextResponse.json({ error: "Requested ingestion stage is unavailable." }, { status: 404 });

  const body = await request.text();
  const response = await fetch(new URL(path, request.nextUrl.origin), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${cronSecret}`,
      "Content-Type": "application/json",
    },
    body,
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
