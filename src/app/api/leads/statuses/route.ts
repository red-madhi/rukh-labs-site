import { NextResponse } from "next/server";
import { listLeadStatusDashboard } from "@/lib/leads/outreach-dashboard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function privateJson(body: unknown, init?: ResponseInit) {
  const response = NextResponse.json(body, init);
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive, nosnippet");
  return response;
}

export async function GET() {
  try {
    return privateJson(await listLeadStatusDashboard());
  } catch (error) {
    console.error("Lead status dashboard failed", error);
    return privateJson({ error: "Lead status dashboard could not be loaded." }, { status: 503 });
  }
}
