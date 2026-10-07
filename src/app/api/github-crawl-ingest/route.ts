import { NextRequest, NextResponse } from "next/server";
import { verifyGithubActionsRunId } from "@/lib/leads/github-oidc";
import { LEADS_SECURITY_HEADERS } from "@/lib/leads/auth";
import { IrsInputError, readIrsPayload } from "@/lib/leads/irs-ingestion-contract";
import { handleIrsPayload } from "@/lib/leads/irs-ingestion-http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const ALLOWED_WORKFLOWS = ["rukh-leads-irs-oidc.yml"];

function errorResponse(error: string, status: number) {
  return NextResponse.json({ error }, { status, headers: LEADS_SECURITY_HEADERS });
}

export async function POST(request: NextRequest) {
  const authorization = request.headers.get("authorization");
  const token = authorization?.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
  let verifiedRunId: string | null;
  try {
    verifiedRunId = token ? await verifyGithubActionsRunId(token, ALLOWED_WORKFLOWS) : null;
    if (!verifiedRunId) {
      return errorResponse("GitHub Actions OIDC authentication failed.", 401);
    }
  } catch {
    return errorResponse("OIDC verification failed.", 503);
  }

  const stage = request.nextUrl.searchParams.get("stage") || "candidates";
  if (stage !== "candidates" && stage !== "report") return errorResponse("Requested ingestion stage is unavailable.", 404);
  if (!process.env.CRON_SECRET) return errorResponse("IRS ingestion is not configured.", 503);

  try {
    const payload = await readIrsPayload(request);
    if (!payload || typeof payload !== "object" || Array.isArray(payload) ||
        !("runId" in payload) || payload.runId !== verifiedRunId) {
      return errorResponse("IRS runId must match the authenticated GitHub run attempt.", 403);
    }
    // Share the authenticated internal handlers directly. Never forward
    // CRON_SECRET to a URL derived from the request's Host header.
    return handleIrsPayload(payload, stage);
  } catch (error) {
    if (error instanceof IrsInputError) return errorResponse(error.message, error.status);
    return errorResponse("IRS ingestion gateway is temporarily unavailable.", 503);
  }
}
