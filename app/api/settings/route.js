import { NextResponse } from "next/server";
import { getSettings, query } from "@/lib/db";
import { getSessionDid } from "@/lib/session";

export const runtime = "nodejs";

export async function GET(request) {
  const ownerDid = getSessionDid(request);
  if (!ownerDid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(await getSettings(ownerDid));
}

export async function POST(request) {
  const ownerDid = getSessionDid(request);
  if (!ownerDid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const inactiveDays = Math.max(30, Math.min(365, Number(body.inactive_days) || 90));
  const botThreshold = Math.max(50, Math.min(95, Number(body.bot_threshold) || 70));
  const autoUnfollow = body.auto_unfollow !== false;
  const filters = {
    rightWing: body.filters?.rightWing !== false,
    antiPalestine: body.filters?.antiPalestine !== false,
    islamophobia: body.filters?.islamophobia !== false,
    xenophobia: body.filters?.xenophobia !== false,
  };
  await query(
    `INSERT INTO settings(owner_did, inactive_days, bot_threshold, auto_unfollow, filters, updated_at)
     VALUES ($1, $2, $3, $4, $5::jsonb, now())
     ON CONFLICT(owner_did) DO UPDATE SET
       inactive_days = EXCLUDED.inactive_days,
       bot_threshold = EXCLUDED.bot_threshold,
       auto_unfollow = EXCLUDED.auto_unfollow,
       filters = EXCLUDED.filters,
       updated_at = now()`,
    [ownerDid, inactiveDays, botThreshold, autoUnfollow, JSON.stringify(filters)],
  );
  return NextResponse.json(await getSettings(ownerDid));
}
