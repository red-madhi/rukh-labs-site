import type { NextRequest } from "next/server";
import { hasValidBasicAuth, hasValidCronAuth } from "@/lib/leads/auth";
import { runOutreachCycle } from "@/lib/leads/email-outreach";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function privateJson(body: unknown, init?: ResponseInit) {
  const response = NextResponse.json(body, init);
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive, nosnippet");
  return response;
}

export async function GET(request: NextRequest) {
  if (!hasValidCronAuth(request) && !hasValidBasicAuth(request)) {
    return privateJson({ error: "Outreach automation authentication failed." }, { status: 401 });
  }
  try {
    return privateJson(await runOutreachCycle(60));
  } catch (error) {
    console.error("Scheduled outreach cycle failed", error);
    return privateJson({ error: error instanceof Error ? error.message : "Outreach cycle failed." }, { status: 503 });
  }
}
