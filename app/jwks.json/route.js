import { NextResponse } from "next/server";
import { getOAuthClient } from "@/lib/oauth";

export const runtime = "nodejs";

export async function GET() {
  const client = await getOAuthClient();
  return NextResponse.json(client.jwks, {
    headers: { "cache-control": "public, max-age=300" },
  });
}
