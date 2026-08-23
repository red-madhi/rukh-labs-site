import { NextResponse } from "next/server";
import { startScan } from "@/lib/scan";
import { getSessionDid } from "@/lib/session";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request) {
  const ownerDid = await getSessionDid(request);
  if (!ownerDid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    return NextResponse.json(await startScan(ownerDid));
  } catch (error) {
    return NextResponse.json({ error: String(error?.message ?? error) }, { status: 500 });
  }
}
