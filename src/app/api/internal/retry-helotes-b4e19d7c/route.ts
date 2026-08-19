import { NextRequest, NextResponse } from "next/server";
import { listOutreachStates, sendInitialOutreach } from "@/lib/leads/email-outreach";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TEST_KEY = "bf2716ac8e5f4a738d29";
const LEAD_ID = "0434a954-fbb1-4615-a157-828c2fc09b9d";

export async function GET(request: NextRequest) {
  if (request.nextUrl.searchParams.get("key") !== TEST_KEY) {
    return NextResponse.json({ ok: false }, { status: 404 });
  }

  const states = await listOutreachStates();
  const previous = states[LEAD_ID];
  if (!previous?.subject || !previous?.body) {
    return NextResponse.json({ ok: false, error: "Saved outreach draft is unavailable." }, { status: 409 });
  }
  if (previous.state !== "bounced" && previous.state !== "error") {
    return NextResponse.json({ ok: true, skipped: true, state: previous.state || null });
  }

  const state = await sendInitialOutreach({
    leadId: LEAD_ID,
    subject: previous.subject,
    body: previous.body,
    followUpBody: previous.followUpBody,
    autoFollowUp: true,
    followUpDays: previous.followUpDays || 7,
  });

  return NextResponse.json({
    ok: true,
    state: state.state,
    sentAt: state.sentAt,
    gmailMessageId: state.gmailMessageId,
    gmailThreadId: state.gmailThreadId,
    nextFollowUpAt: state.nextFollowUpAt,
  }, { headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" } });
}
