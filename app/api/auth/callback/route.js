import { NextResponse } from "next/server";
import { fetchProfile } from "@/lib/bluesky";
import { query } from "@/lib/db";
import { getOAuthClient } from "@/lib/oauth";
import { createSessionToken, SESSION_COOKIE, sessionCookieOptions } from "@/lib/session";

export const runtime = "nodejs";

export async function GET(request) {
  try {
    const client = await getOAuthClient();
    const params = new URLSearchParams(request.nextUrl.searchParams);
    const { session } = await client.callback(params);
    let profile = {};
    try {
      profile = await fetchProfile(session.did);
    } catch {
      profile = { did: session.did };
    }

    await query(
      `INSERT INTO users(did, handle, display_name, avatar, last_login_at)
       VALUES ($1, $2, $3, $4, now())
       ON CONFLICT(did) DO UPDATE SET
         handle = EXCLUDED.handle,
         display_name = EXCLUDED.display_name,
         avatar = EXCLUDED.avatar,
         last_login_at = now()`,
      [session.did, profile.handle ?? null, profile.displayName ?? null, profile.avatar ?? null],
    );
    await query(
      `INSERT INTO settings(owner_did) VALUES ($1)
       ON CONFLICT(owner_did) DO NOTHING`,
      [session.did],
    );

    const response = NextResponse.redirect(new URL("/", request.url));
    response.cookies.set(SESSION_COOKIE, createSessionToken(session.did), sessionCookieOptions);
    return response;
  } catch (error) {
    const response = NextResponse.redirect(new URL("/?auth=failed", request.url));
    response.cookies.delete(SESSION_COOKIE);
    return response;
  }
}
