import { NextResponse, type NextRequest } from "next/server";
import { runSuggestedDirectionV2 } from "@/lib/advanced-network-suggest-v2";
import { getGuardSuppressedDids } from "@/lib/iazma-guard-suppression";

export const runtime = "nodejs";
export const maxDuration = 60;

type SuggestedPayload = {
  actor?: { did?: string };
  targets?: Array<{ did?: string; disposition?: string }>;
  deferredCount?: number;
  discovery?: Record<string, unknown>;
};

export async function POST(request: NextRequest) {
  const response = await runSuggestedDirectionV2(request);
  if (!response.ok) return response;

  try {
    const payload = (await response.clone().json()) as SuggestedPayload;
    const ownerDid = payload.actor?.did;
    const targets = Array.isArray(payload.targets) ? payload.targets : null;
    if (!ownerDid || !targets?.length) return response;

    const guard = await getGuardSuppressedDids(
      ownerDid,
      targets.map((target) => target.did ?? ""),
    );
    if (!guard.enabled || guard.suppressed.size === 0) return response;

    const filteredTargets = targets.filter(
      (target) => !target.did || !guard.suppressed.has(target.did),
    );
    const removed = targets.length - filteredTargets.length;
    if (!removed) return response;

    return NextResponse.json({
      ...payload,
      targets: filteredTargets,
      deferredCount: filteredTargets.filter((target) => target.disposition === "deferred").length,
      discovery: {
        ...(payload.discovery ?? {}),
        guardSuppressed: removed,
      },
    });
  } catch (error) {
    console.warn("IAZMA Guard response filtering failed; returning unfiltered suggestions.", error);
    return response;
  }
}
