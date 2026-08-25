import { NextRequest, NextResponse } from "next/server";
import {
  approveDailyBoosts,
  skipDailyBoosts,
} from "@/lib/advanced-network-daily-boosts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function reviewUrl(request: NextRequest, token: string) {
  const url = new URL(
    "/tools/bluesky-network-advanced/app/daily-boosts",
    request.nextUrl.origin,
  );
  if (token) url.searchParams.set("token", token);
  return url;
}

export async function POST(request: NextRequest) {
  const form = await request.formData();
  const token = String(form.get("token") ?? "").trim();
  const action = String(form.get("action") ?? "approve");
  const destination = reviewUrl(request, token);

  if (!token) {
    destination.searchParams.set("error", "Missing approval token.");
    return NextResponse.redirect(destination, 303);
  }

  try {
    if (action === "skip") {
      await skipDailyBoosts(token);
      destination.searchParams.set("skipped", "1");
    } else {
      await approveDailyBoosts(token);
      destination.searchParams.set("approved", "1");
    }
  } catch (error) {
    destination.searchParams.set(
      "error",
      error instanceof Error ? error.message : "Daily Boost approval failed.",
    );
  }

  return NextResponse.redirect(destination, 303);
}
