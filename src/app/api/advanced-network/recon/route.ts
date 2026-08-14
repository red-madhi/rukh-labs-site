import { NextRequest, NextResponse } from "next/server";
import {
  DEFAULT_DEEP_TARGETS,
  MAX_EXPLICIT_TARGETS,
  estimateGraphCost,
  targetPriorityScore,
  type ReconResponse,
} from "@/lib/advanced-network";
import { hasAdvancedNetworkAccess } from "@/lib/advanced-network-access";

export const runtime = "nodejs";
const XRPC = "https://public.api.bsky.app/xrpc";

type Profile = {
  did: string;
  handle: string;
  displayName?: string;
  followersCount?: number;
  followsCount?: number;
};

type Relationship = {
  did: string;
  following?: string;
  followedBy?: string;
};

function normalize(input: string) {
  let value = input.trim();
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) {
    try {
      const url = new URL(value);
      const parts = url.pathname.split("/").filter(Boolean);
      const profileIndex = parts.indexOf("profile");
      value = profileIndex >= 0 ? parts[profileIndex + 1] ?? "" : parts.at(-1) ?? "";
    } catch {
      return "";
    }
  }
  return value.replace(/^@/, "").replace(/[/?#].*$/, "").trim();
}

async function xrpc<T>(method: string, params: URLSearchParams) {
  const response = await fetch(`${XRPC}/${method}?${params.toString()}`, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Bluesky ${method} returned ${response.status}.`);
  return (await response.json()) as T;
}

async function getProfile(actor: string) {
  const params = new URLSearchParams({ actor });
  return xrpc<Profile>("app.bsky.actor.getProfile", params);
}

export async function POST(request: NextRequest) {
  if (!(await hasAdvancedNetworkAccess())) {
    return NextResponse.json({ error: "Private beta access is required." }, { status: 403 });
  }

  try {
    const body = (await request.json()) as {
      actor?: string;
      targets?: string[];
      categories?: string[];
      deepTargetLimit?: number;
    };
    const actorInput = normalize(String(body.actor ?? ""));
    if (!actorInput) {
      return NextResponse.json({ error: "Connect a Bluesky account first." }, { status: 400 });
    }

    const targetInputs = Array.from(
      new Set((body.targets ?? []).map((item) => normalize(String(item))).filter(Boolean)),
    ).slice(0, MAX_EXPLICIT_TARGETS);
    const categories = Array.from(new Set((body.categories ?? []).map(String))).slice(0, 12);
    const deepTargetLimit = Math.min(
      MAX_EXPLICIT_TARGETS,
      Math.max(1, Math.floor(body.deepTargetLimit ?? DEFAULT_DEEP_TARGETS)),
    );

    const actor = await getProfile(actorInput);
    const profiles = (
      await Promise.all(
        targetInputs.map(async (target) => {
          try {
            return await getProfile(target);
          } catch {
            return null;
          }
        }),
      )
    ).filter((profile): profile is Profile => Boolean(profile && profile.did !== actor.did));

    let relationships: Relationship[] = [];
    if (profiles.length) {
      const params = new URLSearchParams({ actor: actor.did });
      for (const profile of profiles) params.append("others", profile.did);
      const payload = await xrpc<{ relationships?: Relationship[] }>(
        "app.bsky.graph.getRelationships",
        params,
      );
      relationships = payload.relationships ?? [];
    }

    const relationByDid = new Map(relationships.map((relationship) => [relationship.did, relationship]));
    const ranked = profiles
      .map((profile) => {
        const relation = relationByDid.get(profile.did);
        const following = Boolean(relation?.following);
        const followedBy = Boolean(relation?.followedBy);
        const followersCount = Math.max(0, profile.followersCount ?? 0);
        const followsCount = Math.max(0, profile.followsCount ?? 0);
        return {
          did: profile.did,
          handle: profile.handle,
          displayName: profile.displayName,
          followersCount,
          followsCount,
          priorityScore: targetPriorityScore({
            followersCount,
            followsCount,
            mutual: following && followedBy,
            oneWay: following || followedBy,
          }),
          estimatedCost: estimateGraphCost(followersCount, followsCount),
          disposition: "deep-analysis" as const,
          relationship: { following, followedBy, mutual: following && followedBy },
        };
      })
      .sort((a, b) => b.priorityScore - a.priorityScore)
      .map((target, index) => ({
        ...target,
        disposition: index < deepTargetLimit ? ("deep-analysis" as const) : ("deferred" as const),
      }));

    const payload: ReconResponse = {
      actor: { did: actor.did, handle: actor.handle, displayName: actor.displayName },
      categories,
      requestedTargetCount: targetInputs.length,
      deepTargetLimit,
      targets: ranked,
      deferredCount: ranked.filter((target) => target.disposition === "deferred").length,
    };
    return NextResponse.json(payload);
  } catch (error) {
    console.error("Advanced network reconnaissance failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Reconnaissance failed." },
      { status: 502 },
    );
  }
}
