import { NextResponse } from "next/server";
import { syncGraph } from "@/lib/bluesky";
import { addAction, query } from "@/lib/db";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request) {
  const expected = process.env.CRON_SECRET;
  if (!expected || request.headers.get("authorization") !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const users = await query(
    `SELECT u.did FROM users u
     JOIN oauth_session s ON s.did = u.did
     JOIN settings st ON st.owner_did = u.did
     WHERE st.auto_unfollow = true
     ORDER BY u.last_graph_sync_at ASC NULLS FIRST
     LIMIT 8`,
  );
  const results = [];
  for (const user of users) {
    try {
      results.push({ did: user.did, ok: true, ...(await syncGraph(user.did, { automatic: true })) });
    } catch (error) {
      const message = String(error?.message ?? error);
      results.push({ did: user.did, ok: false, error: message });
      await addAction(user.did, user.did, "cron_sync_error", message).catch(() => {});
    }
  }
  return NextResponse.json({ ok: true, results });
}
