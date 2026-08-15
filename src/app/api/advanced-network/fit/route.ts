import { NextRequest, NextResponse } from "next/server";
import { hasAdvancedNetworkAccess } from "@/lib/advanced-network-access";
import type { HumanFitLabel } from "@/lib/advanced-network-v2";

export const runtime = "nodejs";

const ALLOWED = new Set<HumanFitLabel>([
  "my-kind-of-person",
  "worth-cultivating",
  "already-know",
  "not-for-me",
  "not-my-audience",
  "destination-only",
]);

type NeonResponse = { rows?: Array<Array<string | null>> };

function getNeonEndpoint(connectionString: string) {
  const parsed = new URL(connectionString);
  const parts = parsed.hostname.split(".");
  if (parts.length < 2) throw new Error("Database connection host is invalid.");
  parts[0] = "api";
  return `https://${parts.join(".")}/sql`;
}

async function neonQuery(query: string, params: Array<string | null> = []) {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("Advanced Network storage is not configured.");
  const response = await fetch(getNeonEndpoint(connectionString), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Neon-Connection-String": connectionString,
      "Neon-Raw-Text-Output": "true",
      "Neon-Array-Mode": "true",
    },
    body: JSON.stringify({ query, params }),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Advanced Network storage query failed with ${response.status}.`);
  return (await response.json()) as NeonResponse;
}

async function accountIdFor(actorDid: string) {
  const result = await neonQuery(
    `SELECT id::text FROM public.advanced_network_accounts WHERE bluesky_did=$1 LIMIT 1`,
    [actorDid],
  );
  return result.rows?.[0]?.[0] ?? "";
}

export async function GET(request: NextRequest) {
  try {
    if (!(await hasAdvancedNetworkAccess())) {
      return NextResponse.json({ error: "Private beta access is required." }, { status: 403 });
    }
    const actor = request.nextUrl.searchParams.get("actor")?.trim() ?? "";
    if (!actor.startsWith("did:")) {
      return NextResponse.json({ error: "Connect a Bluesky account first." }, { status: 400 });
    }
    const accountId = await accountIdFor(actor);
    if (!accountId) return NextResponse.json({ recommendations: [] });

    const result = await neonQuery(
      `WITH latest_run AS (
         SELECT r.id
         FROM public.advanced_network_runs r
         JOIN public.advanced_network_campaigns c ON c.id=r.campaign_id
         WHERE c.account_id=$1::uuid AND r.status='completed'
         ORDER BY COALESCE(r.completed_at,r.created_at) DESC
         LIMIT 1
       )
       SELECT rec.target_did,
              rec.target_handle,
              COALESCE(p.display_name,''),
              COALESCE(p.followers_count,0)::text,
              rec.recommendation_type,
              rec.importance_score::text,
              COALESCE(rec.metadata->>'humanFit',''),
              COALESCE(rec.metadata->>'relationshipStage','structural'),
              COALESCE(rec.metadata->>'confidenceLevel','possible'),
              COALESCE(rec.metadata->>'destinationOnly','false')
       FROM public.advanced_network_recommendations rec
       LEFT JOIN public.advanced_network_profiles p ON p.did=rec.target_did
       WHERE rec.account_id=$1::uuid
         AND (rec.run_id=(SELECT id FROM latest_run) OR NOT EXISTS (SELECT 1 FROM latest_run))
       ORDER BY rec.importance_score DESC
       LIMIT 18`,
      [accountId],
    );

    return NextResponse.json({
      recommendations: (result.rows ?? []).map((row) => ({
        did: row[0] ?? "",
        handle: row[1] ?? "",
        displayName: row[2] || undefined,
        followersCount: Number(row[3] ?? 0),
        recommendationType: row[4] ?? "",
        score: Number(row[5] ?? 0),
        humanFit: row[6] || null,
        relationshipStage: row[7] ?? "structural",
        confidenceLevel: row[8] ?? "possible",
        destinationOnly: row[9] === "true",
      })),
    });
  } catch (error) {
    console.error("Advanced Network fit retrieval failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Recommendation feedback could not be loaded." },
      { status: 502 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!(await hasAdvancedNetworkAccess())) {
      return NextResponse.json({ error: "Private beta access is required." }, { status: 403 });
    }
    const body = (await request.json()) as {
      actor?: string;
      targetDid?: string;
      label?: HumanFitLabel | null;
    };
    const actor = String(body.actor ?? "").trim();
    const targetDid = String(body.targetDid ?? "").trim();
    const label = body.label ?? null;
    if (!actor.startsWith("did:") || !targetDid.startsWith("did:")) {
      return NextResponse.json({ error: "A connected account and target are required." }, { status: 400 });
    }
    if (label && !ALLOWED.has(label)) {
      return NextResponse.json({ error: "That feedback label is not supported." }, { status: 400 });
    }
    const accountId = await accountIdFor(actor);
    if (!accountId) return NextResponse.json({ error: "Advanced Network account not found." }, { status: 404 });

    const result = label
      ? await neonQuery(
          `UPDATE public.advanced_network_recommendations
           SET metadata=jsonb_set(metadata,'{humanFit}',to_jsonb($3::text),true),updated_at=now()
           WHERE account_id=$1::uuid AND target_did=$2
           RETURNING id::text`,
          [accountId, targetDid, label],
        )
      : await neonQuery(
          `UPDATE public.advanced_network_recommendations
           SET metadata=metadata-'humanFit',updated_at=now()
           WHERE account_id=$1::uuid AND target_did=$2
           RETURNING id::text`,
          [accountId, targetDid],
        );

    if (!(result.rows ?? []).length) {
      return NextResponse.json({ error: "No saved recommendation was found for that account." }, { status: 404 });
    }
    return NextResponse.json({ ok: true, targetDid, humanFit: label });
  } catch (error) {
    console.error("Advanced Network fit update failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Recommendation feedback could not be saved." },
      { status: 502 },
    );
  }
}
