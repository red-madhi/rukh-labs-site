import type { NextRequest } from "next/server";
import { secureEqual } from "@/lib/leads/auth";
import { leadNeonQuery, neonRowsToObjects } from "@/lib/leads/neon";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function privateJson(body: unknown, init?: ResponseInit) {
  const response = Response.json(body, init);
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive, nosnippet");
  return response;
}

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token") || "";
  if (!token || token.length < 40) {
    return privateJson({ error: "Invalid bootstrap token." }, { status: 401 });
  }

  const result = await leadNeonQuery(
    `SELECT config::text FROM public.lead_source_state WHERE source_id = 'bootstrap-crawl'`,
  );
  const row = neonRowsToObjects(result)[0];
  if (!row?.config) {
    return privateJson({ error: "Bootstrap token is no longer available." }, { status: 410 });
  }

  let config: { tokenHash?: string; expiresAt?: string } = {};
  try {
    config = JSON.parse(row.config) as typeof config;
  } catch {
    return privateJson({ error: "Bootstrap token is invalid." }, { status: 410 });
  }

  const expiresAt = config.expiresAt ? new Date(config.expiresAt).getTime() : 0;
  const suppliedHash = await sha256(token);
  if (!config.tokenHash || !secureEqual(suppliedHash, config.tokenHash) || Date.now() > expiresAt) {
    return privateJson({ error: "Bootstrap token is invalid or expired." }, { status: 401 });
  }

  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return privateJson({ error: "CRON_SECRET is not configured." }, { status: 503 });
  }

  await leadNeonQuery(
    `DELETE FROM public.lead_source_state WHERE source_id = 'bootstrap-crawl'`,
  );

  const stage = request.nextUrl.searchParams.get("stage") || "all";
  const allowedTargets: Record<string, string> = {
    all: "/api/leads/crawl",
    process: "/api/leads/crawl?mode=process",
    sam: "/api/leads/collect/sam-opportunities",
    powerbi: "/api/leads/collect/power-bi",
  };
  const selected = allowedTargets[stage];
  if (!selected) {
    return privateJson({ error: "Requested bootstrap stage is not allowed." }, { status: 400 });
  }

  const target = new URL(selected, request.nextUrl.origin);
  const response = await fetch(target, {
    headers: { Authorization: `Bearer ${cronSecret}` },
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
}
