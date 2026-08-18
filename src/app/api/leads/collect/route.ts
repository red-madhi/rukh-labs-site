import { NextRequest, NextResponse } from "next/server";
import { hasValidBasicAuth, hasValidCronAuth } from "@/lib/leads/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type CollectorResult = {
  id: string;
  label: string;
  status: "success" | "error" | "needs-setup" | "planned";
  stored?: number;
  qualified?: number;
  message?: string;
};

function privateJson(body: unknown, init?: ResponseInit) {
  const response = NextResponse.json(body, init);
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive, nosnippet");
  return response;
}

async function callCollector(request: NextRequest, id: string, label: string, path: string): Promise<CollectorResult> {
  try {
    const authorization = request.headers.get("authorization");
    const response = await fetch(new URL(path, request.nextUrl.origin), {
      headers: authorization ? { Authorization: authorization } : undefined,
      cache: "no-store",
      signal: AbortSignal.timeout(45_000),
    });

    let body: Record<string, unknown> = {};
    try {
      body = (await response.json()) as Record<string, unknown>;
    } catch {
      body = {};
    }

    if (response.ok) {
      return {
        id,
        label,
        status: "success",
        stored: typeof body.stored === "number" ? body.stored : undefined,
        qualified: typeof body.qualified === "number" ? body.qualified : undefined,
        message: typeof body.message === "string" ? body.message : undefined,
      };
    }

    const message = typeof body.error === "string" ? body.error : `${label} returned ${response.status}.`;
    const needsSetup = response.status === 428 || /app password|api key|not configured|setup/i.test(message);
    return { id, label, status: needsSetup ? "needs-setup" : "error", message };
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
  const results = await Promise.all([
    callCollector(request, "rukh-inbound", "Rukh Labs inbound", "/api/leads/collect/inbound"),
    callCollector(request, "intent-bluesky", "Bluesky intent", "/api/leads/collect/bluesky"),
  ]);

  if (!process.env.BRAVE_SEARCH_API_KEY) {
    results.push({
      id: "web-intent",
      label: "Public web intent",
      status: "needs-setup",
      message: "Add BRAVE_SEARCH_API_KEY to enable fresh public-web lead discovery.",
    });
  } else {
    results.push({
      id: "web-intent",
      label: "Public web intent",
      status: "planned",
      message: "Search credential is present; the public-web collector is next in the source pipeline.",
    });
  }

  results.push(
    {
      id: "business-registries",
      label: "Business registries",
      status: "planned",
      message: "Nationwide state and federal registry adapters are being added independently of social sources.",
    },
    {
      id: "website-auditor",
      label: "Website auditor",
      status: "planned",
      message: "Website discovery and audit scoring will run after external businesses enter the queue.",
    },
  );

  const stored = results.reduce((total, result) => total + (result.stored ?? 0), 0);
  const successes = results.filter((result) => result.status === "success").length;
  const errors = results.filter((result) => result.status === "error").length;

  return privateJson({
    ok: errors === 0,
    partial: errors > 0 && successes > 0,
    stored,
    results,
    durationMs: Date.now() - startedAt,
  });
}
