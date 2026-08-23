import { NextResponse } from "next/server";
import { createBlockRecord, deleteFollowRecord } from "@/lib/bluesky";
import { addAction, query, suppress } from "@/lib/db";
import { getAgent } from "@/lib/oauth";
import { getSessionDid } from "@/lib/session";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(request) {
  const ownerDid = getSessionDid(request);
  if (!ownerDid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const targetDid = body.did;
  if (!targetDid) return NextResponse.json({ error: "did is required" }, { status: 400 });

  const rows = await query(
    `SELECT r.handle, r.is_following, r.follow_uri, a.categories, a.evidence
     FROM relationships r
     LEFT JOIN assessments a ON a.owner_did = r.owner_did AND a.did = r.did
     WHERE r.owner_did = $1 AND r.did = $2`,
    [ownerDid, targetDid],
  );
  const target = rows[0];
  if (!target) return NextResponse.json({ error: "Target is not in your follower graph." }, { status: 404 });

  try {
    const agent = await getAgent(ownerDid);
    let unfollowed = false;
    if (target.is_following && target.follow_uri) {
      unfollowed = await deleteFollowRecord(agent, ownerDid, target.follow_uri);
    }
    const blockUri = await createBlockRecord(agent, ownerDid, targetDid);
    const reason = (target.categories ?? []).join(", ") || "Manual moderation";

    await suppress(ownerDid, targetDid, target.handle, reason, "cleanup", {
      categories: target.categories ?? [],
      blockUri,
    });
    await addAction(ownerDid, targetDid, unfollowed ? "unfollow_block" : "block", reason, {
      blockUri,
      evidence: target.evidence ?? [],
    });
    await query(
      `UPDATE assessments SET status = 'blocked', blocked_at = now()
       WHERE owner_did = $1 AND did = $2`,
      [ownerDid, targetDid],
    );
    await query(
      `UPDATE relationships SET is_follower = false, is_following = false, follow_uri = null
       WHERE owner_did = $1 AND did = $2`,
      [ownerDid, targetDid],
    );

    return NextResponse.json({ ok: true, unfollowed, blocked: true, blockUri });
  } catch (error) {
    return NextResponse.json({ error: String(error?.message ?? error) }, { status: 500 });
  }
}
