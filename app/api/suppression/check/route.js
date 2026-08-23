import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export const runtime = "nodejs";

function validKey(request) {
  const expected = process.env.IAZMA_API_KEY;
  const supplied = request.headers.get("x-iazma-key") ?? "";
  if (!expected || !supplied) return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(supplied);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export async function POST(request) {
  if (!validKey(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const ownerDid = body.ownerDid;
  const dids = Array.isArray(body.dids) ? body.dids.filter((x) => typeof x === "string").slice(0, 1000) : [];
  if (!ownerDid) return NextResponse.json({ error: "ownerDid is required" }, { status: 400 });
  if (!dids.length) return NextResponse.json({ suppressed: [] });
  const rows = await query(
    `SELECT did FROM suppressions
     WHERE owner_did = $1 AND active = true AND did = ANY($2::text[])`,
    [ownerDid, dids],
  );
  return NextResponse.json({ suppressed: rows.map((r) => r.did) });
}
