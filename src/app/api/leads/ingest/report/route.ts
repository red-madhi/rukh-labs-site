import type { NextRequest } from "next/server";
import { hasValidCronAuth } from "@/lib/leads/auth";
import { privateJson } from "@/lib/leads/crawl";
import { IrsInputError, readIrsPayload } from "@/lib/leads/irs-ingestion-contract";
import { handleIrsPayload } from "@/lib/leads/irs-ingestion-http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  if (!process.env.CRON_SECRET) return privateJson({ error: "IRS ingestion is not configured." }, { status: 503 });
  if (!hasValidCronAuth(request)) return privateJson({ error: "Collector authentication failed." }, { status: 401 });
  try {
    return handleIrsPayload(await readIrsPayload(request), "report");
  } catch (error) {
    if (error instanceof IrsInputError) return privateJson({ error: error.message }, { status: error.status });
    return privateJson({ error: "IRS run reporting failed. Retry the same report." }, { status: 503 });
  }
}
