import { NextResponse } from "next/server";
import { runWeeklyThanks } from "@/lib/bluesky-follow-automation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET() {
  try {
    const result = await runWeeklyThanks();
    return NextResponse.json(
      {
        ok: result.ok,
        skipped: "skipped" in result ? Boolean(result.skipped) : false,
        posted: "posted" in result ? result.posted : undefined,
        mentioned: "mentioned" in result ? result.mentioned : undefined,
      },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0",
          "X-Content-Type-Options": "nosniff",
          "X-Robots-Tag": "noindex, nofollow, noarchive, nosnippet",
        },
      },
    );
  } catch (error) {
    console.error("Weekly Bluesky thank-you thread failed", error);
    return NextResponse.json(
      { ok: false },
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
