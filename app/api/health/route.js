import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await query("SELECT 1 AS ok");
    return NextResponse.json({ ok: true, service: "iazma-guard" });
  } catch (error) {
    return NextResponse.json({ ok: false, error: String(error?.message ?? error) }, { status: 503 });
  }
}
