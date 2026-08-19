import { NextRequest, NextResponse } from "next/server";
import { verifyGithubActionsToken } from "@/lib/leads/github-oidc";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const ALLOWED_WORKFLOWS = ["rukh-leads-oidc-scheduler-v2.yml"];
const routes: Record<string, string> = {
  bluesky: "/api/leads/collect/bluesky",
  social: "/api/leads/collect/social-search",
  mastodon: "/api/leads/collect/mastodon",
  inbound: "/api/leads/collect/inbound",
  web: "/api/leads/collect/web-intent",
  procurement: "/api/leads/collect/procurement-rfp",
  sam: "/api/leads/collect/sam-opportunities",
  directories: "/api/leads/collect/pipeline-v3?mode=directories",
  discover: "/api/leads/collect/discover-v3",
  audit: "/api/leads/collect/audit-sites-v2",
  all: "/api/leads/crawl",
};

export async function GET(request: NextRequest) {
  const authorization = request.headers.get("authorization");
  const token = authorization?.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
  try {
    if (!token || !(await verifyGithubActionsToken(token, ALLOWED_WORKFLOWS))) {
      return NextResponse.json({ error: "GitHub Actions OIDC authentication failed." }, { status: 401 });
    }
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "OIDC verification failed." }, { status: 503 });
  }

  const stage = request.nextUrl.searchParams.get("stage") || "all";
  const path = routes[stage];
  const cronSecret = process.env.CRON_SECRET;
  if (!path || !cronSecret) return NextResponse.json({ error: "Requested collector is unavailable." }, { status: 404 });

  const response = await fetch(new URL(path, request.nextUrl.origin), {
    headers: { Authorization: `Bearer ${cronSecret}` },
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
