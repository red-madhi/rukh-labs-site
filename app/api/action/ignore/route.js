import { NextResponse } from "next/server";
import { addAction, query } from "@/lib/db";
import { getSessionDid } from "@/lib/session";

export const runtime = "nodejs";

export async function POST(request) {
  const ownerDid = await getSessionDid(request);
  if (!ownerDid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  if (!body.did) return NextResponse.json({ error: "did is required" }, { status: 400 });
  await query(
    `UPDATE assessments SET status = 'ignored', dismissed_at = now()
     WHERE owner_did = $1 AND did = $2`,
    [ownerDid, body.did],
  );
  await addAction(ownerDid, body.did, "ignore_flag", "Marked as false positive / keep");
  return NextResponse.json({ ok: true });
}
