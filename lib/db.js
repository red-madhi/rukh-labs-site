import { neon } from "@neondatabase/serverless";

let client;

export function db() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not configured");
  }
  client ??= neon(process.env.DATABASE_URL);
  return client;
}

export async function query(text, params = []) {
  return db().query(text, params);
}

export async function getSettings(ownerDid) {
  const rows = await query(
    `SELECT inactive_days, bot_threshold, auto_unfollow, filters
     FROM settings WHERE owner_did = $1`,
    [ownerDid],
  );
  return rows[0] ?? {
    inactive_days: 90,
    bot_threshold: 70,
    auto_unfollow: true,
    filters: {
      rightWing: true,
      antiPalestine: true,
      islamophobia: true,
      xenophobia: true,
    },
  };
}

export async function addAction(ownerDid, targetDid, action, reason, metadata = {}) {
  await query(
    `INSERT INTO actions(owner_did, target_did, action, reason, metadata)
     VALUES ($1, $2, $3, $4, $5::jsonb)`,
    [ownerDid, targetDid, action, reason ?? null, JSON.stringify(metadata)],
  );
}

export async function suppress(ownerDid, targetDid, handle, reason, source, evidence = {}) {
  await query(
    `INSERT INTO suppressions(owner_did, did, handle, reason, source, evidence, active)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb, true)
     ON CONFLICT(owner_did, did) DO UPDATE SET
       handle = EXCLUDED.handle,
       reason = EXCLUDED.reason,
       source = EXCLUDED.source,
       evidence = EXCLUDED.evidence,
       active = true,
       updated_at = now()`,
    [ownerDid, targetDid, handle ?? null, reason, source, JSON.stringify(evidence)],
  );
}
