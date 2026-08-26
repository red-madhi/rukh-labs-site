import { NextRequest, NextResponse } from "next/server";
import { hasAdvancedNetworkAccess } from "@/lib/advanced-network-access";
import {
  blockGuardDid,
  guardDashboard,
  ignoreGuardDid,
  processGuardBatch,
  restoreGuardDid,
  saveGuardSettings,
  startGuardScan,
  syncIazmaGuardReciprocity,
  unfollowGuardDid,
} from "@/lib/iazma-guard-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function unauthorized() {
  return NextResponse.json({ error: "IAZMA PRO access required." }, { status: 403 });
}

function isRateLimitMessage(error: unknown) {
  return error instanceof Error && /rate limit|too many requests/i.test(error.message);
}

function failureResponse(error: unknown) {
  if (isRateLimitMessage(error)) {
    return NextResponse.json({ error: "Bluesky asked Guard to slow down. Your active scan is saved—try Resume scan again in a couple of minutes." }, { status: 429 });
  }
  return NextResponse.json({ error: error instanceof Error ? error.message : "Guard action failed." }, { status: 500 });
}

export async function GET() {
  if (!(await hasAdvancedNetworkAccess())) return unauthorized();
  try {
    return NextResponse.json(await guardDashboard());
  } catch (error) {
    console.error(JSON.stringify({ event: "guard_dashboard_failed", failure: error instanceof Error ? error.name : "UnknownError" }));
    return failureResponse(error);
  }
}

export async function POST(request: NextRequest) {
  if (!(await hasAdvancedNetworkAccess())) return unauthorized();
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const action = typeof body.action === "string" ? body.action : "unknown";
  const startedAt = Date.now();
  try {
    switch (action) {
      case "scan_start": return NextResponse.json(await startGuardScan(String(body.scope ?? "all")));
      case "scan_batch": return NextResponse.json(await processGuardBatch(String(body.scanId ?? ""), Number(body.limit ?? 4)));
      case "sync": return NextResponse.json(await syncIazmaGuardReciprocity({ automatic: true, force: true }));
      case "block": return NextResponse.json(await blockGuardDid(String(body.did ?? "")));
      case "unfollow": return NextResponse.json(await unfollowGuardDid(String(body.did ?? "")));
      case "ignore": await ignoreGuardDid(String(body.did ?? "")); return NextResponse.json({ ok: true });
      case "restore": await restoreGuardDid(String(body.did ?? "")); return NextResponse.json({ ok: true });
      case "settings": return NextResponse.json(await saveGuardSettings(body));
      default: return NextResponse.json({ error: "Unknown Guard action." }, { status: 400 });
    }
  } catch (error) {
    console.error(JSON.stringify({
      event: "guard_action_failed",
      action,
      failure: error instanceof Error ? error.name : "UnknownError",
      duration_ms: Date.now() - startedAt,
    }));
    return failureResponse(error);
  }
}
