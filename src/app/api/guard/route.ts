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
} from "@/lib/iazma-guard-server";
import {
  bulkUnfollowGuardDids,
  unfollowGuardDidEfficient,
} from "@/lib/iazma-guard-unfollow-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function unauthorized() {
  return NextResponse.json({ error: "IAZMA PRO access required." }, { status: 403 });
}

function isRateLimitMessage(error: unknown) {
  return error instanceof Error && /rate\s*limit|too many requests/i.test(error.message);
}

function failureResponse(error: unknown, action = "unknown") {
  if (isRateLimitMessage(error)) {
    const retryAfterMs = typeof (error as { retryAfterMs?: unknown })?.retryAfterMs === "number"
      ? Number((error as { retryAfterMs: number }).retryAfterMs)
      : 0;
    const scanAction = action === "scan_start" || action === "scan_batch";
    return NextResponse.json({
      error: scanAction
        ? "Bluesky asked Guard to slow down. Your active scan is saved—try Resume scan again when the cooldown ends."
        : "Bluesky is temporarily rate-limiting this Guard action. The action was not retried automatically; try it again after the cooldown.",
      retry_after_ms: retryAfterMs,
    }, { status: 429 });
  }
  return NextResponse.json({ error: error instanceof Error ? error.message : "Guard action failed." }, { status: 500 });
}

export async function GET() {
  if (!(await hasAdvancedNetworkAccess())) return unauthorized();
  try {
    return NextResponse.json(await guardDashboard());
  } catch (error) {
    console.error(JSON.stringify({ event: "guard_dashboard_failed", failure: error instanceof Error ? error.name : "UnknownError" }));
    return failureResponse(error, "dashboard");
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
      case "unfollow": return NextResponse.json(await unfollowGuardDidEfficient(String(body.did ?? "")));
      case "bulk_unfollow": return NextResponse.json(await bulkUnfollowGuardDids(Array.isArray(body.dids) ? body.dids : []));
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
    return failureResponse(error, action);
  }
}
