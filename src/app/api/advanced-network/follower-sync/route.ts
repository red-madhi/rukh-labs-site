import { NextResponse } from "next/server";
import { syncFollowAutomation } from "@/lib/bluesky-follow-automation";
import { syncIazmaGuardReciprocity } from "@/lib/iazma-guard-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET() {
  try {
    const result = await syncFollowAutomation();
    let guard: Record<string, unknown> = { skipped: true };
    try {
      guard = await syncIazmaGuardReciprocity({ automatic: true, force: false });
    } catch (error) {
      console.error("IAZMA Guard reciprocal sync failed", error);
      guard = { ok: false };
    }
    return NextResponse.json(
      { ok: result.ok, skipped: result.skipped ?? false, guard },
      {
        status: result.ok ? 200 : 503,
        headers: {
          "Cache-Control": "no-store, max-age=0",
          "X-Content-Type-Options": "nosniff",
          "X-Robots-Tag": "noindex, nofollow, noarchive, nosnippet",
        },
      },
    );
  } catch (error) {
    console.error("Scheduled Bluesky follower sync failed", error);
    return NextResponse.json(
      { ok: false },
      { status: 500, headers: { "Cache-Control": "no-store, max-age=0", "X-Robots-Tag": "noindex, nofollow, noarchive, nosnippet" } },
    );
  }
}
