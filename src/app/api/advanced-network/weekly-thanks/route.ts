import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { runWeeklyThanks } from "@/lib/bluesky-follow-automation";
import { hasValidCronAuth } from "@/lib/leads/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  if (!hasValidCronAuth(request)) {
    return NextResponse.json(
      { error: "Unauthorized" },
      {
        status: 401,
        headers: {
          "Cache-Control": "private, no-store, max-age=0",
          "X-Robots-Tag": "noindex, nofollow, noarchive, nosnippet",
        },
      },
    );
  }

  try {
    const result = await runWeeklyThanks();
    return NextResponse.json(result, {
      headers: {
        "Cache-Control": "private, no-store, max-age=0",
        "X-Content-Type-Options": "nosniff",
        "X-Robots-Tag": "noindex, nofollow, noarchive, nosnippet",
      },
    });
  } catch (error) {
    console.error("Weekly Bluesky thank-you thread failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Weekly thank-you thread failed." },
      {
        status: 500,
        headers: {
          "Cache-Control": "private, no-store, max-age=0",
          "X-Robots-Tag": "noindex, nofollow, noarchive, nosnippet",
        },
      },
    );
  }
}
