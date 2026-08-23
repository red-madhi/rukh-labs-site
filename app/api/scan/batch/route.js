import { NextResponse } from "next/server";
import { processScanBatch } from "@/lib/scan";
import { getSessionDid } from "@/lib/session";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request) {
  const ownerDid = getSessionDid(request);
  if (!ownerDid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  if (!body.scanId) return NextResponse.json({ error: "scanId is required" }, { status: 400 });
  try {
    return NextResponse.json(await processScanBatch(ownerDid, body.scanId, body.limit ?? 8));
  } catch (error) {
    return NextResponse.json({ error: String(error?.message ?? error) }, { status: 500 });
  }
}
