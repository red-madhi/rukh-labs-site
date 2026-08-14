import { NextRequest, NextResponse } from "next/server";
import { hasAdvancedNetworkAccess } from "@/lib/advanced-network-access";

export const runtime = "nodejs";

type NeonResponse = {
  rows?: Array<Array<string | null>>;
};

function getNeonEndpoint(connectionString: string) {
  const parsed = new URL(connectionString);
  const hostParts = parsed.hostname.split(".");
  if (hostParts.length < 2) throw new Error("Database connection host is invalid.");
  hostParts[0] = "api";
  return `https://${hostParts.join(".")}/sql`;
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

  if (!response.ok) {
    throw new Error(`Advanced Network storage query failed with ${response.status}.`);
  }
  return (await response.json()) as NeonResponse;
}

export async function POST(request: NextRequest) {
  if (!(await hasAdvancedNetworkAccess())) {
    return NextResponse.json({ error: "Private beta access is required." }, { status: 403 });
  }

  try {
    const body = (await request.json()) as {
      actorDid?: string;
      targetDid?: string;
      campaignId?: string | null;
    };

    const actorDid = String(body.actorDid ?? "").trim();
    const targetDid = String(body.targetDid ?? "").trim();
    const campaignId = body.campaignId ? String(body.campaignId).trim() : null;

    if (!actorDid.startsWith("did:") || !targetDid.startsWith("did:")) {
      return NextResponse.json({ error: "A valid connected account and target are required." }, { status: 400 });
    }

    await neonQuery(
      `INSERT INTO public.advanced_network_follow_edges
         (source_did,target_did,active,first_seen_at,last_seen_at)
       VALUES ($1,$2,true,now(),now())
       ON CONFLICT (source_did,target_did) DO UPDATE SET
         active=true,
         last_seen_at=now()`,
      [actorDid, targetDid],
    );

    await neonQuery(
      `UPDATE public.advanced_network_recommendations r
       SET state=CASE WHEN r.state='followed_back' THEN 'followed_back' ELSE 'followed' END,
           followed_at=COALESCE(r.followed_at,now()),
           updated_at=now()
       FROM public.advanced_network_accounts a
       WHERE r.account_id=a.id
         AND a.bluesky_did=$1
         AND r.target_did=$2
         AND ($3::uuid IS NULL OR r.campaign_id=$3::uuid)`,
      [actorDid, targetDid, campaignId],
    );

    return NextResponse.json({ ok: true, actorDid, targetDid });
  } catch (error) {
    console.error("Advanced Network follow-event persistence failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not save the follow event." },
      { status: 502 },
    );
  }
}
