import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { getOAuthClient, OAUTH_SCOPE } from "@/lib/oauth";

export const runtime = "nodejs";

export async function GET(request) {
  const handle = request.nextUrl.searchParams.get("handle")?.trim();
  if (!handle) return NextResponse.json({ error: "A Bluesky handle is required." }, { status: 400 });

  try {
    const client = await getOAuthClient();
    const state = crypto.randomUUID();
    const url = await client.authorize(handle.replace(/^@/, ""), {
      state,
      scope: OAUTH_SCOPE,
    });
    return NextResponse.redirect(url);
  } catch (error) {
    return NextResponse.json(
      { error: String(error?.message ?? error) },
      { status: 500 },
    );
  }
}
