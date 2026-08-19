import { NextRequest } from "next/server";
import { collectorAuthorized, privateJson } from "@/lib/leads/pipeline";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Stage = {
  id: string;
  status: "success" | "error";
  seen?: number;
  stored?: number;
  message?: string;
  details?: unknown;
};

async function callStage(request: NextRequest, id: string, path: string): Promise<Stage> {
  try {
    const authorization = request.headers.get("authorization");
    const response = await fetch(new URL(path, request.nextUrl.origin), {
      headers: authorization ? { Authorization: authorization } : undefined,
      cache: "no-store",
      signal: AbortSignal.timeout(55_000),
    });
    const body = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    if (!response.ok) return { id, status: "error", message: typeof body.error === "string" ? body.error : `${id} returned ${response.status}.`, details: body };
    return {
      id,
      status: "success",
      seen: typeof body.seen === "number" ? body.seen : undefined,
      stored: typeof body.stored === "number" ? body.stored : undefined,
      details: body,
    };
  } catch (error) {
    return { id, status: "error", message: error instanceof Error ? error.message : `${id} failed.` };
  }
}

export async function GET(request: NextRequest) {
  if (!collectorAuthorized(request)) return privateJson({ error: "Collector authentication failed." }, { status: 401 });
  const startedAt = Date.now();
  const mode = request.nextUrl.searchParams.get("mode") || "all";
  const stages: Stage[] = [];

  if (mode === "all" || mode === "directories") {
    stages.push(await callStage(request, "directory-seeds", "/api/leads/collect/directories"));
  }
  if (mode === "all" || mode === "enrich") {
    const [discovery, audit] = await Promise.all([
      callStage(request, "domain-research", "/api/leads/process/domains?limit=12"),
      callStage(request, "website-auditor", "/api/leads/collect/audit-sites-v2?limit=12"),
    ]);
    stages.push(discovery, audit);
  }

  const seen = stages.reduce((total, stage) => total + (stage.seen ?? 0), 0);
  const stored = stages.reduce((total, stage) => total + (stage.stored ?? 0), 0);
  const errors = stages.filter((stage) => stage.status === "error").length;
  return privateJson({ ok: errors === 0, partial: errors > 0, source: "lead-pipeline", mode, seen, stored, stages, durationMs: Date.now() - startedAt });
}
