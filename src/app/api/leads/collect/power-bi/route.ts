import type { NextRequest } from "next/server";
import { hasValidBasicAuth, hasValidCronAuth } from "@/lib/leads/auth";
import { privateJson } from "@/lib/leads/crawl";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Result = {
  id: string;
  label: string;
  status: "success" | "error" | "needs-setup";
  seen?: number;
  qualified?: number;
  stored?: number;
  message?: string;
};

async function call(request: NextRequest, id: string, label: string, path: string): Promise<Result> {
  try {
    const authorization = request.headers.get("authorization");
    const response = await fetch(new URL(path, request.nextUrl.origin), {
      headers: authorization ? { Authorization: authorization } : undefined,
      cache: "no-store",
      signal: AbortSignal.timeout(50_000),
    });
    const body = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    const message = typeof body.error === "string" ? body.error : undefined;
    if (!response.ok) {
      return {
        id,
        label,
        status: response.status === 428 ? "needs-setup" : "error",
        message: message || `${label} returned ${response.status}.`,
      };
    }
    return {
      id,
      label,
      status: "success",
      seen: typeof body.seen === "number" ? body.seen : undefined,
      qualified: typeof body.qualified === "number" ? body.qualified : undefined,
      stored: typeof body.stored === "number" ? body.stored : undefined,
    };
  } catch (error) {
    return {
      id,
      label,
      status: "error",
      message: error instanceof Error ? error.message : `${label} failed.`,
    };
  }
}

export async function GET(request: NextRequest) {
  if (!hasValidCronAuth(request) && !hasValidBasicAuth(request)) {
    return privateJson({ error: "Collector authentication failed." }, { status: 401 });
  }

  const results = await Promise.all([
    call(request, "power-bi-live", "Live Bluesky & Mastodon", "/api/leads/collect/power-bi-live"),
    call(request, "power-bi-web", "Fresh public web / LinkedIn / X", "/api/leads/collect/power-bi-web"),
    call(request, "power-bi-rfp", "Public Power BI RFPs", "/api/leads/collect/power-bi-rfp"),
    call(request, "power-bi-sam", "SAM.gov BI opportunities", "/api/leads/collect/power-bi-sam"),
    call(request, "data-ops-partners", "Verified white-label partner firms", "/api/leads/collect/data-ops-partners"),
  ]);
  const stored = results.reduce((sum, result) => sum + (result.stored ?? 0), 0);
  const qualified = results.reduce((sum, result) => sum + (result.qualified ?? 0), 0);
  const errors = results.filter((result) => result.status === "error").length;
  const needsSetup = results.filter((result) => result.status === "needs-setup").length;

  return privateJson({
    ok: errors === 0,
    partial: errors > 0,
    sourcesRun: results.length,
    stored,
    qualified,
    errors,
    needsSetup,
    results,
  });
}
