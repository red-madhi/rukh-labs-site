import { NextRequest, NextResponse } from "next/server";
import {
  listOutreachStates,
  recordEmailVerification,
  runOutreachCycle,
  saveOutreachDraft,
  sendInitialOutreach,
  syncLeadReply,
  type EmailVerificationMethod,
  type EmailVerificationStatus,
} from "@/lib/leads/email-outreach";
import {
  normalizeGmailEnvironment,
  sanitizeGmailError,
  verifyGmailConnection,
} from "@/lib/leads/gmail-connection";
import { getOutreachSafetySnapshot } from "@/lib/leads/outreach-safety";
import { assertLeadEmailSendable } from "@/lib/leads/outreach-suppression";
import type { OutreachSegment } from "@/lib/leads/segments";

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

function hasActiveOutreach(state: { sentAt?: string; state?: string } | undefined) {
  return Boolean(state?.sentAt && ["sent", "replied", "completed", "paused", "bounced"].includes(state.state || ""));
}

function strings(value: unknown, maxItems = 2) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string").slice(0, maxItems)
    : [];
}

function numbers(value: unknown, maxItems = 2) {
  return Array.isArray(value)
    ? value.map((item) => Number(item)).filter(Number.isFinite).slice(0, maxItems)
    : [];
}

function segment(value: unknown): OutreachSegment | undefined {
  return value === "website" || value === "power-bi" || value === "data-ops" || value === "partners"
    ? value
    : undefined;
}

function verificationStatus(value: unknown): EmailVerificationStatus | undefined {
  return value === "unknown" || value === "valid" || value === "invalid" ? value : undefined;
}

function verificationMethod(value: unknown): EmailVerificationMethod | undefined {
  return value === "external-verifier" || value === "existing-correspondence" || value === "confirmed-by-recipient"
    ? value
    : undefined;
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
    const [configuration, states, safety] = await Promise.all([
      verifyGmailConnection(),
      listOutreachStates(),
      getOutreachSafetySnapshot(),
    ]);
    return privateJson({ configuration, states, safety });
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
      followUpBodies: strings(body.followUpBodies),
      followUpBusinessDays: numbers(body.followUpBusinessDays),
      autoFollowUp: body.autoFollowUp === true,
      followUpDays: Number(body.followUpDays) || 7,
      segment: segment(body.segment),
      pitchVersion: typeof body.pitchVersion === "string" ? body.pitchVersion : "",
      campaignId: typeof body.campaignId === "string" ? body.campaignId : "",
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

    if (action === "record-verification") {
      if (!validId(body.leadId)) return privateJson({ error: "Lead ID is invalid." }, { status: 400 });
      const status = verificationStatus(body.status);
      if (!status) return privateJson({ error: "Verification status is invalid." }, { status: 400 });
      const method = verificationMethod(body.method);
      const state = await recordEmailVerification({
        leadId: body.leadId as string,
        status,
        method,
        note: typeof body.note === "string" ? body.note : "",
      });
      return privateJson({ ok: true, state, safety: await getOutreachSafetySnapshot() });
    }

    if (action === "safety") {
      return privateJson({ ok: true, safety: await getOutreachSafetySnapshot() });
    }

    if (["cycle", "sync", "send-bulk", "send"].includes(action)) {
      const verification = await requireVerifiedGmail();
      if (verification.response) return verification.response;
    }

    if (action === "cycle") {
      return privateJson({ ...(await runOutreachCycle(Number(body.limit) || 40)), safety: await getOutreachSafetySnapshot() });
    }

    if (action === "sync") {
      if (!validId(body.leadId)) return privateJson({ error: "Lead ID is invalid." }, { status: 400 });
      return privateJson({ ok: true, ...(await syncLeadReply(body.leadId as string)), safety: await getOutreachSafetySnapshot() });
    }

    if (action === "send-bulk") {
      const items = Array.isArray(body.items) ? body.items.slice(0, 10) : [];
      const existingStates = await listOutreachStates();
      const results: Array<{ leadId: string; ok: boolean; error?: string }> = [];
      for (const raw of items) {
        const item = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
        if (!validId(item.leadId)) continue;
        const leadId = item.leadId as string;
        if (hasActiveOutreach(existingStates[leadId])) {
          results.push({ leadId, ok: false, error: `Sequence already ${existingStates[leadId]?.state || "active"}.` });
          continue;
        }
        try {
          await assertLeadEmailSendable(leadId);
          await sendInitialOutreach({
            leadId,
            subject: typeof item.subject === "string" ? item.subject : "",
            body: typeof item.body === "string" ? item.body : "",
            followUpBody: typeof item.followUpBody === "string" ? item.followUpBody : "",
            followUpBodies: strings(item.followUpBodies),
            followUpBusinessDays: numbers(item.followUpBusinessDays),
            autoFollowUp: item.autoFollowUp !== false,
            followUpDays: Number(item.followUpDays) || 7,
            segment: segment(item.segment),
            pitchVersion: typeof item.pitchVersion === "string" ? item.pitchVersion : "",
            campaignId: typeof item.campaignId === "string" ? item.campaignId : "",
          });
          results.push({ leadId, ok: true });
        } catch (error) {
          results.push({ leadId, ok: false, error: sanitizeGmailError(error) });
        }
      }
      const sent = results.filter((item) => item.ok).length;
      const firstFailure = results.find((item) => !item.ok)?.error;
      return privateJson(
        { ok: sent > 0, results, safety: await getOutreachSafetySnapshot(), error: sent === 0 ? firstFailure || "No emails were sent." : undefined },
        { status: results.length > 0 && sent === 0 ? 400 : 200 },
      );
    }

    if (!validId(body.leadId)) return privateJson({ error: "Lead ID is invalid." }, { status: 400 });
    const leadId = body.leadId as string;
    const existingState = (await listOutreachStates())[leadId];
    if (hasActiveOutreach(existingState)) {
      return privateJson({ ok: true, state: existingState, alreadyActive: true, safety: await getOutreachSafetySnapshot() });
    }

    await assertLeadEmailSendable(leadId);
    const state = await sendInitialOutreach({
      leadId,
      subject: typeof body.subject === "string" ? body.subject : "",
      body: typeof body.body === "string" ? body.body : "",
      followUpBody: typeof body.followUpBody === "string" ? body.followUpBody : "",
      followUpBodies: strings(body.followUpBodies),
      followUpBusinessDays: numbers(body.followUpBusinessDays),
      autoFollowUp: body.autoFollowUp !== false,
      followUpDays: Number(body.followUpDays) || 7,
      segment: segment(body.segment),
      pitchVersion: typeof body.pitchVersion === "string" ? body.pitchVersion : "",
      campaignId: typeof body.campaignId === "string" ? body.campaignId : "",
    });
    return privateJson({ ok: true, state, safety: await getOutreachSafetySnapshot() });
  } catch (error) {
    const message = sanitizeGmailError(error);
    console.error("Lead outreach POST failed", message);
    return privateJson({ error: message || "Email could not be sent." }, { status: 400 });
  }
}
