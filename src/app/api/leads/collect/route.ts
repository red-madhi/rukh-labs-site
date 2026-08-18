import type { NextRequest } from "next/server";
import { privateJson } from "@/lib/leads/crawl";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const target = new URL("/api/leads/crawl", request.nextUrl.origin);
  target.search = request.nextUrl.search;
  const authorization = request.headers.get("authorization");
  try {
    const response = await fetch(target, {
      headers: authorization ? { Authorization: authorization } : undefined,
      cache: "no-store",
      signal: AbortSignal.timeout(58_000),
    });
    const body = await response.text();
    return new Response(body, {
      status: response.status,
      headers: {
        "Content-Type": response.headers.get("content-type") || "application/json",
        "Cache-Control": "private, no-store, max-age=0",
        "X-Robots-Tag": "noindex, nofollow, noarchive, nosnippet",
      },
    });
  } catch (error) {
    return privateJson(
      { error: error instanceof Error ? error.message : "Lead crawl proxy failed." },
      { status: 503 },
    );
  }
}
