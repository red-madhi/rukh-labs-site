import { NextRequest, NextResponse } from "next/server";
import { runDailyDropSiteRepost } from "@/lib/bluesky-dropsite-daily";
import { verifyGithubActionsToken } from "@/lib/leads/github-oidc";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const ALLOWED_WORKFLOWS = [
  "bluesky-follow-automation.yml",
  "iazma-social-automation-v2.yml",
];
const ALLOWED_EVENTS = ["schedule", "workflow_dispatch", "push"];

export async function GET(request: NextRequest) {
  const authorization = request.headers.get("authorization");
  const token = authorization?.startsWith("Bearer ")
    ? authorization.slice(7).trim()
    : "";

  try {
    if (
      !token ||
      !(await verifyGithubActionsToken(token, ALLOWED_WORKFLOWS, ALLOWED_EVENTS))
    ) {
      return NextResponse.json(
        { error: "GitHub Actions OIDC authentication failed." },
        { status: 401 },
      );
    }

    const result = await runDailyDropSiteRepost({
      force: request.nextUrl.searchParams.get("force") === "1",
    });
    return NextResponse.json(result, {
      status: result.ok ? 200 : 500,
      headers: {
        "Cache-Control": "no-store, max-age=0",
        "X-Robots-Tag": "noindex, nofollow, noarchive, nosnippet",
      },
    });
  } catch (error) {
    console.error("Drop Site daily repost failed", error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Drop Site daily repost failed.",
      },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store, max-age=0",
          "X-Robots-Tag": "noindex, nofollow, noarchive, nosnippet",
        },
      },
    );
  }
}
