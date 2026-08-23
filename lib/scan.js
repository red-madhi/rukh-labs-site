import crypto from "node:crypto";
import { fetchAuthorFeed, fetchProfile, syncGraph } from "./bluesky.js";
import { assessProfile } from "./classify.js";
import { getSettings, query } from "./db.js";

export async function startScan(ownerDid) {
  const graph = await syncGraph(ownerDid, { automatic: true });
  const scanId = crypto.randomUUID();

  await query(
    `INSERT INTO scans(id, owner_did, status, total, processed, flagged)
     VALUES ($1, $2, 'running', 0, 0, 0)`,
    [scanId, ownerDid],
  );

  await query(
    `INSERT INTO assessments(owner_did, did, scan_id, status, score, categories, confidence, evidence)
     SELECT owner_did, did, $2, 'pending', 0, ARRAY[]::text[], null, '[]'::jsonb
     FROM relationships
     WHERE owner_did = $1 AND is_follower = true
     ON CONFLICT(owner_did, did) DO UPDATE SET
       scan_id = EXCLUDED.scan_id,
       status = CASE
         WHEN assessments.status IN ('ignored', 'blocked') THEN assessments.status
         ELSE 'pending'
       END,
       score = CASE WHEN assessments.status IN ('ignored', 'blocked') THEN assessments.score ELSE 0 END,
       categories = CASE WHEN assessments.status IN ('ignored', 'blocked') THEN assessments.categories ELSE ARRAY[]::text[] END,
       confidence = CASE WHEN assessments.status IN ('ignored', 'blocked') THEN assessments.confidence ELSE null END,
       evidence = CASE WHEN assessments.status IN ('ignored', 'blocked') THEN assessments.evidence ELSE '[]'::jsonb END`,
    [ownerDid, scanId],
  );

  const totals = await query(
    `SELECT count(*)::int AS total
     FROM assessments
     WHERE owner_did = $1 AND scan_id = $2 AND status = 'pending'`,
    [ownerDid, scanId],
  );
  const total = totals[0]?.total ?? 0;
  await query(
    `UPDATE scans SET total = $3, status = CASE WHEN $3 = 0 THEN 'complete' ELSE 'running' END,
       completed_at = CASE WHEN $3 = 0 THEN now() ELSE null END
     WHERE id = $1 AND owner_did = $2`,
    [scanId, ownerDid, total],
  );
  await query(`UPDATE users SET last_scan_at = now() WHERE did = $1`, [ownerDid]);

  return { scanId, total, graph };
}

async function claimBatch(ownerDid, scanId, limit) {
  return query(
    `WITH picked AS (
       SELECT owner_did, did
       FROM assessments
       WHERE owner_did = $1 AND scan_id = $2 AND status = 'pending'
       ORDER BY did
       LIMIT $3
       FOR UPDATE SKIP LOCKED
     )
     UPDATE assessments a
     SET status = 'processing'
     FROM picked p
     WHERE a.owner_did = p.owner_did AND a.did = p.did
     RETURNING a.did`,
    [ownerDid, scanId, limit],
  );
}

async function assessOne(ownerDid, scanId, did, settings) {
  try {
    const relRows = await query(
      `SELECT did, handle, display_name, avatar, description, followers_count, follows_count,
              posts_count, account_created_at
       FROM relationships
       WHERE owner_did = $1 AND did = $2`,
      [ownerDid, did],
    );
    const stored = relRows[0];
    if (!stored) throw new Error("Relationship disappeared during scan");

    const [fresh, feed] = await Promise.all([fetchProfile(did), fetchAuthorFeed(did, 30)]);
    const profile = {
      ...stored,
      handle: fresh.handle ?? stored.handle,
      display_name: fresh.displayName ?? stored.display_name,
      description: fresh.description ?? stored.description,
      followers_count: fresh.followersCount ?? stored.followers_count,
      follows_count: fresh.followsCount ?? stored.follows_count,
      posts_count: fresh.postsCount ?? stored.posts_count,
      account_created_at: fresh.createdAt ?? stored.account_created_at,
    };
    const assessment = assessProfile(profile, feed, settings);

    await query(
      `UPDATE relationships SET handle = $3, display_name = $4, description = $5,
         followers_count = $6, follows_count = $7, posts_count = $8,
         account_created_at = COALESCE($9::timestamptz, account_created_at)
       WHERE owner_did = $1 AND did = $2`,
      [ownerDid, did, profile.handle, profile.display_name, profile.description,
       profile.followers_count, profile.follows_count, profile.posts_count, profile.account_created_at],
    );

    await query(
      `UPDATE assessments SET
         status = $4,
         score = $5,
         categories = $6::text[],
         confidence = $7,
         evidence = $8::jsonb,
         last_activity_at = $9::timestamptz,
         assessed_at = now()
       WHERE owner_did = $1 AND did = $2 AND scan_id = $3`,
      [
        ownerDid,
        did,
        scanId,
        assessment.flagged ? "flagged" : "clear",
        assessment.score,
        assessment.categories,
        assessment.confidence,
        JSON.stringify(assessment.evidence),
        assessment.lastActivity,
      ],
    );
    await query(
      `UPDATE relationships SET last_activity_at = $3::timestamptz
       WHERE owner_did = $1 AND did = $2`,
      [ownerDid, did, assessment.lastActivity],
    );
  } catch (error) {
    await query(
      `UPDATE assessments SET status = 'error', assessed_at = now(), evidence = $4::jsonb
       WHERE owner_did = $1 AND did = $2 AND scan_id = $3`,
      [ownerDid, did, scanId, JSON.stringify([{ category: "error", label: String(error?.message ?? error) }])],
    );
  }
}

export async function processScanBatch(ownerDid, scanId, requestedLimit = 8) {
  const limit = Math.max(1, Math.min(Number(requestedLimit) || 8, 12));
  const settings = await getSettings(ownerDid);
  const claimed = await claimBatch(ownerDid, scanId, limit);

  // Keep concurrency low to avoid hammering the public AppView.
  const queue = [...claimed];
  const workers = Array.from({ length: Math.min(4, queue.length) }, async () => {
    while (queue.length) {
      const row = queue.shift();
      if (row) await assessOne(ownerDid, scanId, row.did, settings);
    }
  });
  await Promise.all(workers);

  const stats = await query(
    `SELECT
       count(*) FILTER (WHERE status IN ('clear','flagged','error'))::int AS processed,
       count(*) FILTER (WHERE status = 'flagged')::int AS flagged,
       count(*) FILTER (WHERE status IN ('pending','processing'))::int AS remaining
     FROM assessments
     WHERE owner_did = $1 AND scan_id = $2`,
    [ownerDid, scanId],
  );
  const stat = stats[0] ?? { processed: 0, flagged: 0, remaining: 0 };
  const complete = stat.remaining === 0;
  await query(
    `UPDATE scans SET processed = $3, flagged = $4,
       status = CASE WHEN $5 THEN 'complete' ELSE 'running' END,
       completed_at = CASE WHEN $5 THEN now() ELSE null END
     WHERE id = $1 AND owner_did = $2`,
    [scanId, ownerDid, stat.processed, stat.flagged, complete],
  );

  const scanRows = await query(
    `SELECT id, status, total, processed, flagged, started_at, completed_at
     FROM scans WHERE id = $1 AND owner_did = $2`,
    [scanId, ownerDid],
  );
  return scanRows[0];
}
