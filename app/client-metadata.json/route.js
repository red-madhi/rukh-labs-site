import { NextResponse } from "next/server";
import { getClientMetadata } from "@/lib/oauth";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(getClientMetadata(), {
    headers: { "cache-control": "public, max-age=300" },
  });
}
