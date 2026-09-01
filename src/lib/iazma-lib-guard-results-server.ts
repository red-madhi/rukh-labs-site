/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import { neon } from "@neondatabase/serverless";

const PUBLIC_API = "https://public.api.bsky.app/xrpc";
const REQUEST_TIMEOUT_MS = 12_000;

function getSql() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not configured.");
  return neon(process.env.DATABASE_URL);
}

async function fetchJson(url: string | URL) {
  const response = await fetch(url, {
    cache: "no-store",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    headers: { Accept: "application/json" },
  });
  if (!response.ok) throw new Error(`Bluesky returned ${response.status}.`);
  return response.json();
}

async function ownerDid(sql) {
  const rows = await sql`
    SELECT actor_handle
    FROM bluesky_follow_automation_settings
    WHERE id=1
  `;
  const handle = String(rows[0]?.actor_handle ?? "").trim();
  if (!handle) throw new Error("Bluesky account is not configured.");
  const resolved = await fetchJson(`${PUBLIC_API}/com.atproto.identity.resolveHandle?handle=${encodeURIComponent(handle)}`);
  if (!resolved?.did) throw new Error("Could not resolve the configured Bluesky account.");
  return String(resolved.did);
}

export async function libGuardResultsOverlay() {
  const sql = getSql();
  const owner = await ownerDid(sql);
  const settings = (await sql`
    SELECT min_score,low_value_weight,ukraine_weight,lib_media_weight,repost_weight,
           ukraine_threshold,lib_media_threshold,quarantine_days
    FROM lib_guard_settings
    WHERE owner_did=${owner}
  `)[0] ?? {
    min_score: 55,
    low_value_weight: 50,
    ukraine_weight: 25,
    lib_media_weight: 20,
    repost_weight: 5,
    ukraine_threshold: 20,
    lib_media_threshold: 18,
    quarantine_days: 30,
  };

  const minScore = Number(settings.min_score ?? 55);
  const lowValueWeight = Math.max(0, Number(settings.low_value_weight ?? 50));
  const ukraineWeight = Math.max(0, Number(settings.ukraine_weight ?? 25));
  const libMediaWeight = Math.max(0, Number(settings.lib_media_weight ?? 20));
  const repostWeight = Math.max(0, Number(settings.repost_weight ?? 5));
  const totalWeight = Math.max(1, lowValueWeight + ukraineWeight + libMediaWeight + repostWeight);
  const ukraineThreshold = Number(settings.ukraine_threshold ?? 20);
  const libMediaThreshold = Number(settings.lib_media_threshold ?? 18);
  const quarantineDays = Number(settings.quarantine_days ?? 30);

  await sql`
    WITH rescored AS (
      SELECT
        l.owner_did,
        l.did,
        ROUND((
          l.low_network_value * ${lowValueWeight}
          + l.ukraine_saturation * ${ukraineWeight}
          + l.lib_media_saturation * ${libMediaWeight}
          + l.repost_ratio * ${repostWeight}
        ) / ${totalWeight})::int AS recalculated_score,
        l.low_network_value,
        l.ukraine_saturation,
        l.lib_media_saturation,
        l.repost_ratio,
        l.network_value,
        l.muted_at
      FROM lib_guard_assessments l
      WHERE l.owner_did=${owner}
        AND l.status IN ('clear','flagged')
    ),
    scored AS (
      SELECT
        r.*,
        (
          r.ukraine_saturation >= ${ukraineThreshold}
          OR r.lib_media_saturation >= ${libMediaThreshold}
          OR (
            (r.ukraine_saturation > 0 OR r.lib_media_saturation > 0)
            AND r.recalculated_score >= ${minScore}
          )
        ) AS candidate,
        CASE
          WHEN r.muted_at IS NOT NULL
            AND floor(extract(epoch FROM (now()-r.muted_at))/86400) >= ${quarantineDays}
            AND r.network_value < 58
            AND r.recalculated_score >= GREATEST(55, ${minScore})
            THEN 'unfollow'
          WHEN r.network_value <= 30
            AND r.recalculated_score >= ${minScore}
            THEN 'unfollow'
          WHEN r.network_value >= 65
            THEN 'mute_keep'
          ELSE 'mute'
        END AS candidate_recommendation
      FROM rescored r
    )
    UPDATE lib_guard_assessments l
    SET score=scored.recalculated_score,
        status=CASE WHEN scored.candidate THEN 'flagged' ELSE 'clear' END,
        recommendation=CASE WHEN scored.candidate THEN scored.candidate_recommendation ELSE 'keep' END,
        categories=CASE
          WHEN scored.candidate AND NOT ('lib_guard_candidate'=ANY(l.categories))
            THEN array_prepend('lib_guard_candidate',l.categories)
          WHEN NOT scored.candidate
            THEN array_remove(l.categories,'lib_guard_candidate')
          ELSE l.categories
        END
    FROM scored
    WHERE l.owner_did=scored.owner_did AND l.did=scored.did
  `;

  const [queue, counts] = await Promise.all([
    sql`
      SELECT
        r.did,r.handle,r.display_name,r.avatar,r.description,r.followers_count,r.follows_count,
        r.is_follower,r.is_following,l.score,l.recommendation,l.network_value,l.low_network_value,
        l.ukraine_saturation,l.lib_media_saturation,l.repost_ratio,l.metrics,l.categories,l.evidence,
        l.muted_at,l.assessed_at,true AS is_candidate,
        CASE WHEN l.muted_at IS NULL THEN 0 ELSE floor(extract(epoch FROM (now()-l.muted_at))/86400)::int END AS muted_days
      FROM lib_guard_assessments l
      JOIN relationships r ON r.owner_did=l.owner_did AND r.did=l.did
      WHERE l.owner_did=${owner}
        AND l.status='flagged'
        AND r.is_following=true
      ORDER BY GREATEST(l.ukraine_saturation,l.lib_media_saturation) DESC,l.score DESC,l.network_value ASC,l.assessed_at DESC NULLS LAST
      LIMIT 500
    `,
    sql`
      SELECT
        count(*) FILTER(WHERE l.status='flagged' AND r.is_following=true)::int AS candidates,
        count(*) FILTER(WHERE l.status IN ('clear','flagged') AND r.is_following=true)::int AS scored,
        count(*) FILTER(WHERE l.muted_at IS NOT NULL AND r.is_following=true)::int AS muted
      FROM lib_guard_assessments l
      JOIN relationships r ON r.owner_did=l.owner_did AND r.did=l.did
      WHERE l.owner_did=${owner}
    `,
  ]);

  return {
    queue,
    counts: counts[0] ?? { candidates: 0, scored: 0, muted: 0 },
  };
}
