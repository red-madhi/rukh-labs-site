import { NextResponse } from "next/server";
import { assertLeadOutreachSafety } from "@/lib/leads/outreach-safety";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const SEND_ACTIONS = new Set([
  "send",
  "follow-up",
  "send-follow-up",
  "send_follow_up",
]);

export async function POST(request: Request) {
  const rawBody = await request.text();

  try {
    const payload = JSON.parse(rawBody) as {
      action?: string;
      leadId?: string;
      id?: string;
    };

    if (SEND_ACTIONS.has(payload.action ?? "")) {
      await assertLeadOutreachSafety(
        String(payload.leadId ?? payload.id ?? ""),
      );
    }

    const target = new URL("/api/leads/outreach", request.url);
    const headers = new Headers(request.headers);
    headers.set("x-rukh-safety-bypass", "1");
    headers.delete("content-length");

    const upstream = await fetch(target, {
      method: "POST",
      headers,
      body: rawBody,
      redirect: "manual",
      cache: "no-store",
    });

    return new NextResponse(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: upstream.headers,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Outreach safety check failed.",
      },
      { status: 400 },
    );
  }
}
