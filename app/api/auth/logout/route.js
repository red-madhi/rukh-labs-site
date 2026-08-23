import { NextResponse } from "next/server";
import { getOAuthClient } from "@/lib/oauth";
import { getSessionDid, SESSION_COOKIE } from "@/lib/session";

export const runtime = "nodejs";

export async function POST(request) {
  const did = await getSessionDid(request);
  if (did) {
    try {
      const client = await getOAuthClient();
      const session = await client.restore(did);
      await session.signOut();
    } catch {
      // The local cookie still gets cleared if the remote OAuth session is already gone.
    }
  }
  const response = NextResponse.json({ ok: true });
  response.cookies.delete(SESSION_COOKIE);
  return response;
}
