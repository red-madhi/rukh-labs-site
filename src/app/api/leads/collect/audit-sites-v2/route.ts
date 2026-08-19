import { NextRequest, NextResponse } from "next/server";
import { collectorAuthorized, privateJson } from "@/lib/leads/pipeline";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const DEFAULT_LIMIT = 6;

export async function GET(request: NextRequest) {
  if (!collectorAuthorized(request)) {
    return privateJson({ error: "Collector authentication failed." }, { status: 401 });
  }

  const requestedLimit = Number(
    request.nextUrl.searchParams.get("limit") ?? DEFAULT_LIMIT,
  );
  const limit = Math.max(
    1,
    Math.min(
      15,
      Number.isFinite(requestedLimit) ? requestedLimit : DEFAULT_LIMIT,
    ),
  );

  const secret = process.env.CRON_SECRET;
  const authorization =
    request.headers.get("authorization") ||
    (secret ? `Bearer ${secret}` : null);
  if (!authorization) {
    return privateJson({ error: "Collector authentication failed." }, { status: 401 });
  }

  const target = new URL("/api/leads/process/audits", request.nextUrl.origin);
  target.searchParams.set("limit", String(limit));

  const response = await fetch(target, {
    headers: { Authorization: authorization },
    cache: "no-store",
    signal: AbortSignal.timeout(55_000),
  });
  const text = await response.text();

  return new NextResponse(text, {
    status: response.status,
    headers: {
      "Content-Type": response.headers.get("content-type") || "application/json",
      "Cache-Control": "private, no-store, max-age=0",
      "X-Robots-Tag": "noindex, nofollow, noarchive",
    },
  });
}
