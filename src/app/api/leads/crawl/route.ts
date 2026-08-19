import type { NextRequest } from "next/server";
import { hasValidBasicAuth, hasValidCronAuth } from "@/lib/leads/auth";
import { crawlStats, privateJson } from "@/lib/leads/crawl";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type StepResult = {
  id: string;
  label: string;
  status: "success" | "error" | "needs-setup";
  seen?: number;
  candidates?: number;
  stored?: number;
  qualified?: number;
  audited?: number;
  found?: number;
  message?: string;
};

async function callStep(
  request: NextRequest,
  id: string,
  label: string,
  path: string,
  timeoutMs = 24_000,
): Promise<StepResult> {
  try {
    const authorization = request.headers.get("authorization");
    const response = await fetch(new URL(path, request.nextUrl.origin), {
      headers: authorization ? { Authorization: authorization } : undefined,
      cache: "no-store",
      signal: AbortSignal.timeout(timeoutMs),
    });
    let body: Record<string, unknown> = {};
    try {
      body = (await response.json()) as Record<string, unknown>;
    } catch {
      body = {};
    }

    const message =
      typeof body.error === "string"
        ? body.error
        : typeof body.message === "string"
          ? body.message
          : undefined;
    if (!response.ok) {
      const needsSetup =
        response.status === 428 || /not configured|api key|setup/i.test(message ?? "");
      return {
        id,
        label,
        status: needsSetup ? "needs-setup" : "error",
        message: message || `${label} returned ${response.status}.`,
      };
    }

    const number = (key: string) =>
      typeof body[key] === "number" ? (body[key] as number) : undefined;
    return {
      id,
      label,
      status: "success",
      seen: number("seen"),
      candidates: number("candidates"),
      stored: number("stored"),
      qualified: number("qualified"),
      audited: number("audited"),
      found: number("found"),
      message,
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

  const startedAt = Date.now();
  const mode = request.nextUrl.searchParams.get("mode") || "all";
  const processOnly = mode === "process";
  const seedSteps = processOnly
    ? []
    : [
        ["rukh-inbound", "Rukh Labs inbound", "/api/leads/collect/inbound", 16_000],
        ["intent-bluesky", "Bluesky intent", "/api/leads/collect/bluesky", 24_000],
        ["social-linkedin-x", "Public LinkedIn and X discovery", "/api/leads/collect/social-search", 20_000],
        ["mastodon-intent", "Mastodon public intent", "/api/leads/collect/mastodon", 20_000],
        ["web-intent", "Public web intent", "/api/leads/collect/web-intent", 18_000],
        ["procurement-rfp", "Public website RFPs", "/api/leads/collect/procurement-rfp", 20_000],
        ["sam-opportunities", "SAM.gov opportunities", "/api/leads/collect/sam-opportunities", 24_000],
        ["web-business-discovery", "Public business discovery", "/api/leads/collect/web-businesses", 18_000],
        ["registry-colorado", "Colorado business registry", "/api/leads/collect/colorado", 18_000],
        ["registry-nppes", "National healthcare organizations", "/api/leads/collect/nppes", 18_000],
        ["national-nonprofits", "National nonprofit filings", "/api/leads/collect/irs-nonprofits", 24_000],
        ["openstreetmap-businesses", "OpenStreetMap businesses", "/api/leads/collect/openstreetmap", 24_000],
      ] as const;

  const seedResults = await Promise.all(
    seedSteps.map(([id, label, path, timeout]) =>
      callStep(request, id, label, path, timeout),
    ),
  );

  const domainLimit = processOnly ? 8 : 3;
  const auditLimit = processOnly ? 12 : 4;
  const processResults = await Promise.all([
    callStep(
      request,
      "domain-research",
      "Website discovery",
      `/api/leads/process/domains?limit=${domainLimit}`,
      processOnly ? 34_000 : 18_000,
    ),
    callStep(
      request,
      "website-auditor",
      "Website auditor",
      `/api/leads/process/audits?limit=${auditLimit}`,
      processOnly ? 36_000 : 20_000,
    ),
  ]);

  const results = [...seedResults, ...processResults];
  const stored = results.reduce((total, result) => total + (result.stored ?? 0), 0);
  const candidates = results.reduce(
    (total, result) => total + (result.candidates ?? 0),
    0,
  );
  const qualified = results.reduce(
    (total, result) => total + (result.qualified ?? 0),
    0,
  );
  const errors = results.filter((result) => result.status === "error").length;
  const needsSetup = results.filter((result) => result.status === "needs-setup").length;
  const stats = await crawlStats().catch(() => undefined);

  return privateJson({
    ok: errors === 0,
    partial: errors > 0,
    mode,
    sourcesRun: results.length,
    stored,
    candidates,
    qualified,
    errors,
    needsSetup,
    comingNext: 0,
    results,
    stats,
    durationMs: Date.now() - startedAt,
  });
}
