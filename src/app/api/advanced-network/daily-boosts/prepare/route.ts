import { NextRequest, NextResponse } from "next/server";
import { prepareDailyBoosts } from "@/lib/advanced-network-daily-boosts-v2";
import { verifyGithubActionsToken } from "@/lib/leads/github-oidc";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const ALLOWED_WORKFLOWS = [
  "iazma-daily-boosts.yml",
  "bluesky-follow-automation.yml",
  "iazma-social-automation-v2.yml",
  "rukh-leads-contact-enrichment.yml",
];
const ALLOWED_EVENTS = ["schedule", "workflow_dispatch", "push"];

function bounded(value: unknown, fallback: number, maximum: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 && parsed <= maximum ? parsed : fallback;
}
function scheduleDiagnostics() {
  const notificationHour = bounded(process.env.DAILY_BOOST_NOTIFICATION_HOUR ?? 8, 8, 23);
  const sourceTime = (prefix: string, minute: number) => ({
    hour: bounded(process.env[`${prefix}_REPOST_HOUR`] ?? process.env.DAILY_BOOST_NOTIFICATION_HOUR ?? 8, 8, 23),
    minute: bounded(process.env[`${prefix}_REPOST_MINUTE`] ?? minute, minute, 59),
  });
  const firstDeveloperHour = bounded(process.env.DEV_PROJECT_FIRST_REPOST_HOUR ?? 13, 13, 23);
  return {
    timeZone: "America/Denver",
    checkedAt: new Date().toISOString(),
    localTime: new Intl.DateTimeFormat("en-US", { timeZone: "America/Denver", dateStyle: "short", timeStyle: "long" }).format(new Date()),
    morningApprovalHour: notificationHour,
    dropSite: sourceTime("DROP_SITE", 30),
    fightBack: sourceTime("FIGHTBACK", 45),
    developerHours: [firstDeveloperHour, Math.max(firstDeveloperHour + 1, bounded(process.env.DEV_PROJECT_SECOND_REPOST_HOUR ?? 18, 18, 23))],
  };
}

export async function GET(request: NextRequest) {
  const authorization = request.headers.get("authorization");
  const token = authorization?.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
  try {
    if (!token || !(await verifyGithubActionsToken(token, ALLOWED_WORKFLOWS, ALLOWED_EVENTS))) {
      return NextResponse.json({ error: "GitHub Actions OIDC authentication failed." }, { status: 401 });
    }
    const headers = { "Cache-Control": "no-store, max-age=0", "X-Robots-Tag": "noindex, nofollow, noarchive, nosnippet" };
    if (request.nextUrl.searchParams.get("diagnostics") === "1") {
      return NextResponse.json({ ok: true, skipped: true, message: "Read-only schedule diagnostics.", schedule: scheduleDiagnostics(), automationRevision: "2026-09-10.1" }, { headers });
    }
    const result = await prepareDailyBoosts({
      force: request.nextUrl.searchParams.get("force") === "1",
      regenerate: request.nextUrl.searchParams.get("regenerate") === "1",
    });
    return NextResponse.json({ ...result, schedule: scheduleDiagnostics(), automationRevision: "2026-09-10.1" }, {
      status: result.ok ? 200 : 500,
      headers,
    });
  } catch (error) {
    console.error("Daily Boost preparation failed", error);
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Daily Boost preparation failed." }, {
      status: 500,
      headers: { "Cache-Control": "no-store, max-age=0", "X-Robots-Tag": "noindex, nofollow, noarchive, nosnippet" },
    });
  }
}
