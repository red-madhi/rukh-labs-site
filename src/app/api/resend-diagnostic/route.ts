import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  const apiKey = process.env.RESEND_API_KEY;
  const destination = process.env.CONTACT_NOTIFICATION_EMAIL;
  const from = process.env.CONTACT_FROM_EMAIL || "Rukh Labs <hello@rukhlabs.com>";

  if (!apiKey || !destination) {
    return NextResponse.json(
      {
        ok: false,
        reason: "missing_configuration",
        resendApiKeyConfigured: Boolean(apiKey),
        contactNotificationEmailConfigured: Boolean(destination),
      },
      { status: 503, headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" } },
    );
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "User-Agent": "Rukh-Labs-Resend-Diagnostic/1.0",
      "Idempotency-Key": crypto.randomUUID(),
    },
    body: JSON.stringify({
      from,
      to: [destination],
      subject: "Rukh Labs Resend transport verification",
      html: "<p>This is an automated one-time verification of the Rukh Labs contact email transport.</p>",
    }),
    cache: "no-store",
  });

  const responseText = await response.text();
  let resendResponse: unknown = responseText;
  try {
    resendResponse = JSON.parse(responseText);
  } catch {
    // Keep text response when it is not JSON.
  }

  return NextResponse.json(
    {
      ok: response.ok,
      resendStatus: response.status,
      resendResponse,
      senderDomain: from.includes("@") ? from.split("@").pop()?.replace(/[>]/g, "") : null,
    },
    { status: response.ok ? 200 : 502, headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" } },
  );
}
