import { NextRequest, NextResponse } from "next/server";
import { hasAdvancedNetworkAccess } from "@/lib/advanced-network-access";
import {
  bulkMuteLibGuardDids,
  bulkUnfollowLibGuardDids,
  bulkUnmuteLibGuardDids,
  dismissLibGuardDid,
  libGuardDashboard,
  processLibGuardBatch,
  saveLibGuardSettings,
  startLibGuardScan,
} from "@/lib/iazma-lib-guard-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function unauthorized() {
  return NextResponse.json({ error: "IAZMA PRO access required." }, { status: 403 });
}

function failureResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "Lib Guard action failed.";
  const retryAfterMs = typeof (error as { retryAfterMs?: unknown })?.retryAfterMs === "number"
    ? Number((error as { retryAfterMs: number }).retryAfterMs)
    : 0;
  if (/rate\s*limit|too many requests/i.test(message)) {
    return NextResponse.json({ error: message, retry_after_ms: retryAfterMs }, { status: 429 });
  }
  return NextResponse.json({ error: message }, { status: 500 });
}

export async function GET() {
  if (!(await hasAdvancedNetworkAccess())) return unauthorized();
  try {
    return NextResponse.json(await libGuardDashboard());
  } catch (error) {
    console.error(JSON.stringify({ event: "lib_guard_dashboard_failed", failure: error instanceof Error ? error.name : "UnknownError" }));
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
      case "scan_start": return NextResponse.json(await startLibGuardScan());
      case "scan_batch": return NextResponse.json(await processLibGuardBatch(String(body.scanId ?? ""), Number(body.limit ?? 4)));
      case "settings": return NextResponse.json(await saveLibGuardSettings(body));
      case "bulk_mute": return NextResponse.json(await bulkMuteLibGuardDids(Array.isArray(body.dids) ? body.dids : []));
      case "bulk_unmute": return NextResponse.json(await bulkUnmuteLibGuardDids(Array.isArray(body.dids) ? body.dids : []));
      case "bulk_unfollow": return NextResponse.json(await bulkUnfollowLibGuardDids(Array.isArray(body.dids) ? body.dids : []));
      case "dismiss": return NextResponse.json(await dismissLibGuardDid(String(body.did ?? "")));
      default: return NextResponse.json({ error: "Unknown Lib Guard action." }, { status: 400 });
    }
  } catch (error) {
    console.error(JSON.stringify({
      event: "lib_guard_action_failed",
      action,
      failure: error instanceof Error ? error.name : "UnknownError",
      duration_ms: Date.now() - startedAt,
    }));
    return failureResponse(error);
  }
}
