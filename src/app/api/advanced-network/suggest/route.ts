import { neon } from "@neondatabase/serverless";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { runSuggestedDirectionV2 } from "@/lib/advanced-network-suggest-v2";

export const runtime = "nodejs";
export const maxDuration = 60;

type SuggestionTarget = {
  did?: string;
  disposition?: string;
  [key: string]: unknown;
};

type SuggestionPayload = {
  actor?: { did?: string };
  targets?: SuggestionTarget[];
  deferredCount?: number;
  discovery?: Record<string, unknown>;
  [key: string]: unknown;
};

async function filterGuardSuppressions(payload: SuggestionPayload) {
  const ownerDid = payload.actor?.did;
  const targets = Array.isArray(payload.targets) ? payload.targets : [];
  if (!ownerDid || !targets.length || !process.env.DATABASE_URL) return payload;

  try {
    const sql = neon(process.env.DATABASE_URL);
    const rows = await sql`
      SELECT did
      FROM public.suppressions
      WHERE owner_did = ${ownerDid}
        AND active = true
    `;
    const suppressed = new Set(rows.map((row) => String(row.did)));
    if (!suppressed.size) return payload;

    const filteredTargets = targets.filter((target) => !target.did || !suppressed.has(target.did));
    const removed = targets.length - filteredTargets.length;
    return {
      ...payload,
      targets: filteredTargets,
      deferredCount: filteredTargets.filter((target) => target.disposition === "deferred").length,
      discovery: {
        ...(payload.discovery ?? {}),
        guardSuppressionsExcluded: removed,
      },
    };
  } catch (error) {
    console.warn("IAZMA Guard suppression filter failed open", error);
    return payload;
  }
}

export async function POST(request: NextRequest) {
  const response = await runSuggestedDirectionV2(request);
  if (!response.ok) return response;

  try {
    const payload = (await response.json()) as SuggestionPayload;
    return NextResponse.json(await filterGuardSuppressions(payload), { status: response.status });
  } catch (error) {
    console.warn("IAZMA Guard response filtering failed open", error);
    return response;
  }
}
