import { NextResponse } from "next/server";
import { verifyGmailConnection } from "@/lib/leads/gmail-connection";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const configuration = await verifyGmailConnection();
  const response = NextResponse.json({
    ok: configuration.configured,
    reason: configuration.configured ? null : configuration.missing[0] || "Gmail verification failed.",
  });
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive, nosnippet");
  return response;
}
