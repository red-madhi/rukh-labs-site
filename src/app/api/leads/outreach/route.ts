import { NextRequest, NextResponse } from "next/server";
import {
  listOutreachStates,
  runOutreachCycle,
  saveOutreachDraft,
  sendInitialOutreach,
  syncLeadReply,
} from "@/lib/leads/email-outreach";
import {
  normalizeGmailEnvironment,
  sanitizeGmailError,
  verifyGmailConnection,
} from "@/lib/leads/gmail-connection";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function privateJson(body: unknown, init?: ResponseInit) {
  const response = NextResponse.json(body, init);
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive, nosnippet");
  return response;
}

function validId(value: unknown) {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

async function requireVerifiedGmail() {
  const configuration = await verifyGmailConnection();
  if (configuration.configured) return { configuration, response: null };
  return {
    configuration,
    response: privateJson(
      {
        error: configuration.missing[0] || "Gmail authorization could not be verified.",
        configuration,
      },
      { status: 428 },
    ),
  };
}

export async function GET() {
  normalizeGmailEnvironment();
  try {
    const [configuration, states] = await Promise.all([
      verifyGmailConnection(),
      listOutreachStates(),
    ]);
    return privateJson({ configuration, states });
  } catch (error) {
    console.error("Lead outreach GET failed", sanitizeGmailError(error));
    return privateJson({ error: "Outreach state could not be loaded." }, { status: 503 });
  }
}

export async function PATCH(request: NextRequest) {
  normalizeGmailEnvironment();
  try {
    const body = (await request.json()) as Record<string, unknown>;
    if (!validId(body.leadId)) return privateJson({ error: "Lead ID is invalid." }, { status: 400 });
    const state = await saveOutreachDraft({
      leadId: body.leadId as string,
      subject: typeof body.subject === "string" ? body.subject : "",
      body: typeof body.body === "string" ? body.body : "",
      followUpBody: typeof body.followUpBody === "string" ? body.followUpBody : "",
      autoFollowUp: body.autoFollowUp === true,
      followUpDays: Number(body.followUpDays) || 7,
    });
    return privateJson({ ok: true, state });
  } catch (error) {
    console.error("Lead outreach PATCH failed", sanitizeGmailError(error));
    return privateJson({ error: sanitizeGmailError(error) || "Draft could not be saved." }, { status: 400 });
  }
}

export async function POST(request: NextRequest) {
  normalizeGmailEnvironment();
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const action = typeof body.action === "string" ? body.action : "send";

    if (action === "verify") {
      const configuration = await verifyGmailConnection();
      return privateJson(
        { ok: configuration.configured, configuration, error: configuration.configured ? undefined : configuration.missing[0] },
        { status: configuration.configured ? 200 : 428 },
      );
    }

    if (["cycle", "sync", "send-bulk", "send"].includes(action)) {
      const verification = await requireVerifiedGmail();
      if (verification.response) return verification.response;
    }

    if (action === "cycle") {
      return privateJson(await runOutreachCycle(Number(body.limit) || 40));
    }

    if (action === "sync") {
      if (!validId(body.leadId)) return privateJson({ error: "Lead ID is invalid." }, { status: 400 });
      return privateJson({ ok: true, ...(await syncLeadReply(body.leadId as string)) });
    }

    if (action === "send-bulk") {
      const items = Array.isArray(body.items) ? body.items.slice(0, 25) : [];
      const results: Array<{ leadId: string; ok: boolean; error?: string }> = [];
      for (const raw of items) {
        const item = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
        if (!validId(item.leadId)) continue;
        try {
          await sendInitialOutreach({
            leadId: item.leadId as string,
            subject: typeof item.subject === "string" ? item.subject : "",
            body: typeof item.body === "string" ? item.body : "",
            followUpBody: typeof item.followUpBody === "string" ? item.followUpBody : "",
            autoFollowUp: item.autoFollowUp !== false,
            followUpDays: Number(item.followUpDays) || 7,
          });
          results.push({ leadId: item.leadId as string, ok: true });
        } catch (error) {
          results.push({ leadId: item.leadId as string, ok: false, error: sanitizeGmailError(error) });
        }
      }
      const sent = results.filter((item) => item.ok).length;
      const firstFailure = results.find((item) => !item.ok)?.error;
      return privateJson(
        { ok: sent > 0, results, error: sent === 0 ? firstFailure || "No emails were sent." : undefined },
        { status: results.length > 0 && sent === 0 ? 400 : 200 },
      );
    }

    if (!validId(body.leadId)) return privateJson({ error: "Lead ID is invalid." }, { status: 400 });
    const state = await sendInitialOutreach({
      leadId: body.leadId as string,
      subject: typeof body.subject === "string" ? body.subject : "",
      body: typeof body.body === "string" ? body.body : "",
      followUpBody: typeof body.followUpBody === "string" ? body.followUpBody : "",
      autoFollowUp: body.autoFollowUp !== false,
      followUpDays: Number(body.followUpDays) || 7,
    });
    return privateJson({ ok: true, state });
  } catch (error) {
    const message = sanitizeGmailError(error);
    console.error("Lead outreach POST failed", message);
    return privateJson({ error: message || "Email could not be sent." }, { status: 400 });
  }
}
