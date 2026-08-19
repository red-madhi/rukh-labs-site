import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TEST_KEY = "9d23f7e4b81a4c5fb0d8";
const FROM = "rukh.labs@gmail.com";
const REPLY_TO = "hello@rukhlabs.com";

function cleanEnv(value: string | undefined) {
  const trimmed = (value || "").trim();
  if (trimmed.length >= 2 && ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'")))) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

export async function GET(request: NextRequest) {
  if (request.nextUrl.searchParams.get("key") !== TEST_KEY) {
    return NextResponse.json({ ok: false }, { status: 404 });
  }

  const clientId = cleanEnv(process.env.GMAIL_CLIENT_ID || process.env.GOOGLE_CLIENT_ID);
  const clientSecret = cleanEnv(process.env.GMAIL_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET);
  const refreshToken = cleanEnv(process.env.GMAIL_REFRESH_TOKEN);
  if (!clientId || !clientSecret || !refreshToken) {
    return NextResponse.json({ ok: false, stage: "config" }, { status: 500 });
  }

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
    cache: "no-store",
  });
  const token = (await tokenResponse.json().catch(() => ({}))) as { access_token?: string; error?: string };
  if (!tokenResponse.ok || !token.access_token) {
    return NextResponse.json({ ok: false, stage: "token", error: token.error || "unknown" }, { status: 500 });
  }

  const subject = `Rukh Labs app-path self-test ${new Date().toISOString()}`;
  const mime = [
    `From: Rukh Labs <${FROM}>`,
    `Reply-To: Rukh Labs <${REPLY_TO}>`,
    `To: ${REPLY_TO}`,
    `Subject: ${subject}`,
    "MIME-Version: 1.0",
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: 8bit",
    "",
    "App-path Gmail API self-test. No action needed.",
  ].join("\r\n");

  const sendResponse = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token.access_token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ raw: Buffer.from(mime, "utf8").toString("base64url") }),
    cache: "no-store",
  });
  const sent = (await sendResponse.json().catch(() => ({}))) as { id?: string; threadId?: string; error?: { message?: string } };
  return NextResponse.json(
    { ok: sendResponse.ok, stage: "send", subject, messageId: sent.id, threadId: sent.threadId, error: sent.error?.message },
    { status: sendResponse.ok ? 200 : 500, headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" } },
  );
}
