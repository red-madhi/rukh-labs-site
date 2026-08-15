import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(
    {
      resendApiKeyConfigured: Boolean(process.env.RESEND_API_KEY),
      contactNotificationEmailConfigured: Boolean(process.env.CONTACT_NOTIFICATION_EMAIL),
      contactFromEmailConfigured: Boolean(process.env.CONTACT_FROM_EMAIL),
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
