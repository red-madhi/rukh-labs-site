import { NextRequest, NextResponse } from "next/server";
import { hasAdvancedNetworkAccess } from "@/lib/advanced-network-access";

export const runtime = "nodejs";

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

function parseJson(value: string | null) {
  try {
    return value ? (JSON.parse(value) as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function parseStringArray(value: string | null) {
  try {
    const parsed = value ? JSON.parse(value) : [];
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
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

    const runResult = await neonQuery(
      `SELECT r.id::text,r.metrics::text,r.config::text,r.completed_at::text
       FROM public.advanced_network_runs r
       JOIN public.advanced_network_campaigns c ON c.id=r.campaign_id
       JOIN public.advanced_network_accounts a ON a.id=c.account_id
       WHERE a.bluesky_did=$1 AND r.status='completed'
       ORDER BY COALESCE(r.completed_at,r.created_at) DESC
       LIMIT 1`,
      [actor],
    );
    const runRow = runResult.rows?.[0];
    if (!runRow) return NextResponse.json({ run: null });

    const recommendationResult = await neonQuery(
      `SELECT COALESCE(metadata->>'relationshipStage','structural') AS stage,
              COALESCE(metadata->>'confidenceLevel','possible') AS confidence,
              COUNT(*)::text,
              COALESCE(SUM(independent_paths),0)::text,
              COALESCE(AVG(importance_score),0)::text
       FROM public.advanced_network_recommendations
       WHERE run_id=$1::uuid
       GROUP BY stage,confidence
       ORDER BY stage,confidence`,
      [runRow[0]],
    );

    // Round Two in the engine is allowed to expand from at most four candidates
    // that have reached activated/converted and score at least 52. Reconstruct the
    // same user-facing shortlist from the persisted recommendations so existing v2
    // runs become useful immediately without requiring a rerun.
    const footholdResult = await neonQuery(
      `SELECT rec.target_did,
              rec.target_handle,
              COALESCE(p.display_name,''),
              COALESCE(p.avatar,''),
              COALESCE(rec.importance_score,0)::text,
              COALESCE(rec.independent_paths,0)::text,
              COALESCE(rec.follow_back_likelihood,0)::text,
              COALESCE(rec.state,'recommended'),
              COALESCE(rec.metadata->>'relationshipStage','structural'),
              COALESCE(rec.metadata->>'confidenceLevel','possible'),
              COALESCE(rec.metadata->>'strategy',''),
              COALESCE((rec.metadata->'targetHandles')::text,'[]'),
              COALESCE(rec.metadata->>'profileUrl',''),
              COALESCE(rec.metadata->>'expectedBridgeValue',COALESCE(rec.importance_score,0)::text)
       FROM public.advanced_network_recommendations rec
       LEFT JOIN public.advanced_network_profiles p ON p.did=rec.target_did
       WHERE rec.run_id=$1::uuid
         AND COALESCE(rec.metadata->>'relationshipStage','structural') IN ('activated','converted')
         AND COALESCE(rec.importance_score,0) >= 52
         AND COALESCE(rec.metadata->>'destinationOnly','false') <> 'true'
       ORDER BY rec.importance_score DESC, rec.independent_paths DESC, rec.target_handle
       LIMIT 4`,
      [runRow[0]],
    );

    const targetResult = await neonQuery(
      `SELECT t.target_handle,
              t.wave::text,
              t.status,
              COUNT(DISTINCT rec.target_did)::text,
              COUNT(DISTINCT rec.target_did) FILTER (
                WHERE COALESCE(rec.metadata->>'relationshipStage','structural') IN ('activated','converted')
              )::text,
              COALESCE(MAX(rec.independent_paths),0)::text
       FROM public.advanced_network_targets t
       JOIN public.advanced_network_campaigns c ON c.id=t.campaign_id
       LEFT JOIN public.advanced_network_recommendations rec
         ON rec.campaign_id=c.id
        AND rec.metadata->'targetHandles' ? t.target_handle
       WHERE c.id=(SELECT campaign_id FROM public.advanced_network_runs WHERE id=$1::uuid)
       GROUP BY t.target_handle,t.wave,t.status
       ORDER BY t.wave,t.target_handle
       LIMIT 16`,
      [runRow[0]],
    );

    const metrics = parseJson(runRow[1]);
    const config = parseJson(runRow[2]);
    return NextResponse.json({
      run: {
        id: runRow[0],
        completedAt: runRow[3],
        engine: metrics.engine ?? config.engine ?? "legacy",
        goal: metrics.goal ?? config.goal ?? "balanced",
        roundTwoStatus: metrics.roundTwoStatus ?? "not-evaluated",
        roundTwoEligibleFootholds: Number(metrics.roundTwoEligibleFootholds ?? 0),
        secondWaveTargets: Array.isArray(metrics.secondWaveTargets) ? metrics.secondWaveTargets : [],
        stageCounts:
          metrics.relationshipStages && typeof metrics.relationshipStages === "object"
            ? metrics.relationshipStages
            : {},
        // This is a sum of recommendation-level route counts, not a global count of
        // unique social paths. Keep it available only for explicitly technical UI.
        candidateRouteTotal: Number(metrics.nodeIndependentPaths ?? 0),
        recommendationsReturned: Number(metrics.recommendationsReturned ?? 0),
      },
      footholds: (footholdResult.rows ?? []).map((row) => ({
        did: row[0] ?? "",
        handle: row[1] ?? "",
        displayName: row[2] || null,
        avatar: row[3] || null,
        score: Math.round(Number(row[4] ?? 0)),
        independentPaths: Number(row[5] ?? 0),
        reciprocity: Math.round(Number(row[6] ?? 0)),
        state: row[7] ?? "recommended",
        stage: row[8] ?? "structural",
        confidence: row[9] ?? "possible",
        strategy: row[10] ?? "",
        targetHandles: parseStringArray(row[11]),
        profileUrl: row[12] || `https://bsky.app/profile/${row[1] ?? ""}`,
        bridgeValue: Math.round(Number(row[13] ?? row[4] ?? 0)),
      })),
      evidence: (recommendationResult.rows ?? []).map((row) => ({
        stage: row[0] ?? "structural",
        confidence: row[1] ?? "possible",
        people: Number(row[2] ?? 0),
        candidatePaths: Number(row[3] ?? 0),
        averageScore: Math.round(Number(row[4] ?? 0)),
      })),
      destinations: (targetResult.rows ?? []).map((row) => ({
        handle: row[0] ?? "",
        wave: Number(row[1] ?? 1),
        status: row[2] ?? "candidate",
        bridgePeople: Number(row[3] ?? 0),
        validatedBridgePeople: Number(row[4] ?? 0),
        strongestBridgePaths: Number(row[5] ?? 0),
      })),
    });
  } catch (error) {
    console.error("Advanced Network strategy status failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Strategy status could not be loaded." },
      { status: 502 },
    );
  }
}
