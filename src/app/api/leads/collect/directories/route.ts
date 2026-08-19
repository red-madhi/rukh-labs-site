import type { NextRequest } from "next/server";
import { hasValidBasicAuth, hasValidCronAuth } from "@/lib/leads/auth";
import { privateJson } from "@/lib/leads/crawl";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type StageResult = {
  id: string;
  status: "success" | "error";
  seen?: number;
  candidates?: number;
  stored?: number;
  message?: string;
};

async function callStage(
  request: NextRequest,
  id: string,
  path: string,
  timeoutMs: number,
): Promise<StageResult> {
  try {
    const authorization = request.headers.get("authorization");
    const response = await fetch(new URL(path, request.nextUrl.origin), {
      headers: authorization ? { Authorization: authorization } : undefined,
      cache: "no-store",
      signal: AbortSignal.timeout(timeoutMs),
    });
    const body = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    if (!response.ok) {
      return {
        id,
        status: "error",
        message: typeof body.error === "string" ? body.error : `${id} returned ${response.status}.`,
      };
    }
    return {
      id,
      status: "success",
      seen: typeof body.seen === "number" ? body.seen : undefined,
      candidates: typeof body.candidates === "number" ? body.candidates : undefined,
      stored: typeof body.stored === "number" ? body.stored : undefined,
    };
  } catch (error) {
    return {
      id,
      status: "error",
      message: error instanceof Error ? error.message : `${id} failed.`,
    };
  }
}

export async function GET(request: NextRequest) {
  if (!hasValidCronAuth(request) && !hasValidBasicAuth(request)) {
    return privateJson({ error: "Collector authentication failed." }, { status: 401 });
  }

  // Contact-rich/known-domain sources remain active. The blind Colorado and IRS
  // sources apply their own queue backpressure before admitting new candidates.
  const [colorado, nppes, nonprofits, openstreetmap] = await Promise.all([
    callStage(request, "registry-colorado", "/api/leads/collect/colorado", 24_000),
    callStage(request, "registry-nppes", "/api/leads/collect/nppes", 24_000),
    callStage(request, "national-nonprofits", "/api/leads/collect/irs-nonprofits", 36_000),
    callStage(request, "openstreetmap-businesses", "/api/leads/collect/openstreetmap", 32_000),
  ]);

  const results = [colorado, nppes, nonprofits, openstreetmap];
  const errors = results.filter((result) => result.status === "error").length;
  const seen = results.reduce((sum, result) => sum + (result.seen ?? 0), 0);
  const candidates = results.reduce((sum, result) => sum + (result.candidates ?? 0), 0);
  const stored = results.reduce((sum, result) => sum + (result.stored ?? 0), 0);

  return privateJson({
    ok: errors === 0,
    partial: errors > 0,
    source: "directory-seeds",
    seen,
    candidates,
    stored,
    errors,
    results,
  });
}
