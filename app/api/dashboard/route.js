import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getSessionDid } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request) {
  const ownerDid = getSessionDid(request);
  if (!ownerDid) return NextResponse.json({ authenticated: false }, { status: 401 });

  const [users, settings, queue, actions, suppressions, scans, counts] = await Promise.all([
    query(`SELECT did, handle, display_name, avatar, last_graph_sync_at, last_scan_at FROM users WHERE did = $1`, [ownerDid]),
    query(`SELECT inactive_days, bot_threshold, auto_unfollow, filters FROM settings WHERE owner_did = $1`, [ownerDid]),
    query(
      `SELECT r.did, r.handle, r.display_name, r.avatar, r.description,
              r.followers_count, r.follows_count, r.posts_count, r.is_following,
              r.last_activity_at, a.score, a.categories, a.confidence, a.evidence, a.assessed_at
       FROM assessments a
       JOIN relationships r ON r.owner_did = a.owner_did AND r.did = a.did
       WHERE a.owner_did = $1 AND a.status = 'flagged' AND r.is_follower = true
       ORDER BY a.score DESC, a.assessed_at DESC NULLS LAST
       LIMIT 250`,
      [ownerDid],
    ),
    query(
      `SELECT a.id, a.target_did, a.action, a.reason, a.metadata, a.created_at,
              r.handle, r.display_name, r.avatar
       FROM actions a
       LEFT JOIN relationships r ON r.owner_did = a.owner_did AND r.did = a.target_did
       WHERE a.owner_did = $1
       ORDER BY a.created_at DESC LIMIT 100`,
      [ownerDid],
    ),
    query(
      `SELECT did, handle, reason, source, evidence, created_at, updated_at
       FROM suppressions WHERE owner_did = $1 AND active = true
       ORDER BY updated_at DESC LIMIT 500`,
      [ownerDid],
    ),
    query(
      `SELECT id, status, total, processed, flagged, started_at, completed_at
       FROM scans WHERE owner_did = $1
       ORDER BY started_at DESC LIMIT 1`,
      [ownerDid],
    ),
    query(
      `SELECT
         count(*) FILTER (WHERE is_follower = true)::int AS followers,
         count(*) FILTER (WHERE is_following = true)::int AS following,
         count(*) FILTER (WHERE unfollowed_me_at IS NOT NULL)::int AS observed_unfollowers
       FROM relationships WHERE owner_did = $1`,
      [ownerDid],
    ),
  ]);

  return NextResponse.json({
    authenticated: true,
    user: users[0],
    settings: settings[0],
    queue,
    actions,
    suppressions,
    scan: scans[0] ?? null,
    counts: counts[0] ?? { followers: 0, following: 0, observed_unfollowers: 0 },
  });
}
