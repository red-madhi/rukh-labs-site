import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getSessionDid } from "@/lib/session";

export const runtime = "nodejs";

function validApiKey(request) {
  const expected = process.env.IAZMA_API_KEY;
  const supplied = request.headers.get("x-iazma-key") ?? "";
  if (!expected || !supplied) return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(supplied);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export async function GET(request) {
  const sessionDid = await getSessionDid(request);
  const ownerDid = sessionDid || request.nextUrl.searchParams.get("ownerDid");
  if (!ownerDid || (!sessionDid && !validApiKey(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const did = request.nextUrl.searchParams.get("did");
  if (did) {
    const rows = await query(
      `SELECT did, handle, reason, source, active, updated_at
       FROM suppressions WHERE owner_did = $1 AND did = $2`,
      [ownerDid, did],
    );
    return NextResponse.json({ suppressed: rows[0]?.active === true, record: rows[0] ?? null });
  }
  const rows = await query(
    `SELECT did, handle, reason, source, updated_at
     FROM suppressions WHERE owner_did = $1 AND active = true
     ORDER BY updated_at DESC`,
    [ownerDid],
  );
  return NextResponse.json({ suppressions: rows });
}
