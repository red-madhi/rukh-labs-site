import { NextResponse } from "next/server";
import {
  getOutreachSafetySnapshot,
  recordLeadEmailVerification,
} from "@/lib/leads/outreach-safety";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    return NextResponse.json(await getOutreachSafetySnapshot());
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not load outreach safety metrics.",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as {
      action?: string;
      leadId?: string;
      email?: string;
      status?: string;
      source?: string;
      evidence?: string;
    };

    if (
      payload.action !== "verify" ||
      (payload.status !== "valid" && payload.status !== "invalid")
    ) {
      return NextResponse.json(
        { error: "Invalid verification request." },
        { status: 400 },
      );
    }

    const verification = await recordLeadEmailVerification({
      leadId: payload.leadId || "",
      email: payload.email || "",
      status: payload.status,
      source: payload.source || "",
      evidence: payload.evidence || "",
    });

    return NextResponse.json({ ok: true, verification });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not record verification.",
      },
      { status: 400 },
    );
  }
}
