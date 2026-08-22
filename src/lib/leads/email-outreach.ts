import { selectPrimaryEmail } from "@/lib/leads/contact-values";
import { leadNeonQuery, neonRowsToObjects } from "@/lib/leads/neon";
import { assertLeadOutreachSafety } from "@/lib/leads/outreach-safety";
import type { OutreachSegment } from "@/lib/leads/segments";

export type OutreachMessage = {
  direction: "outbound" | "inbound";
  kind: "initial" | "follow-up" | "reply" | "bounce";
  at: string;
  subject?: string;
  body?: string;
  snippet?: string;
  gmailMessageId?: string;
};

export type EmailVerificationStatus = "unknown" | "valid" | "invalid";
export type EmailVerificationMethod =
  | "external-verifier"
  | "confirmed-by-recipient"
  | "existing-correspondence";

export type LeadOutreachState = {
  recipientEmail?: string;
  subject?: string;
  body?: string;
  followUpBody?: string;
  followUpBodies?: string[];
  followUpBusinessDays?: number[];
  state?: "draft" | "ready" | "sent" | "replied" | "bounced" | "paused" | "completed" | "error";
  autoFollowUp?: boolean;
  followUpDays?: number;
  gmailThreadId?: string;
  gmailMessageId?: string;
  rfcMessageId?: string;
  sentAt?: string;
  nextFollowUpAt?: string;
  followUpCount?: number;
  lastReplyAt?: string;
  lastReplySnippet?: string;
  lastBounceAt?: string;
  lastBounceReason?: string;
  lastError?: string;
  emailSuppressed?: boolean;
  verificationStatus?: EmailVerificationStatus;
  verifiedAt?: string;
  verificationMethod?: EmailVerificationMethod;
  verificationNote?: string;
  segment?: OutreachSegment;
  pitchVersion?: string;
  campaignId?: string;
  messages?: OutreachMessage[];
};

type GmailMessage = {
  id?: string;
  threadId?: string;
  internalDate?: string;
  snippet?: string;
  payload?: { headers?: Array<{ name?: string; value?: string }> };
};

type GmailThread = { id?: string; messages?: GmailMessage[] };

const PRIMARY_FROM = "rukh.labs@gmail.com";
const REPLY_TO = "hello@rukhlabs.com";
const MAX_MESSAGES = 30;
const DEFAULT_FOLLOW_UP_BUSINESS_DAYS = [3, 4] as const;

function clean(value: unknown, max = 8000) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function cleanBodies(value: unknown) {
  return Array.isArray(value)
    ? value.map((item) => clean(item, 8000)).filter(Boolean).slice(0, 2)
    : [];
}

function cleanBusinessDaySchedule(value: unknown) {
  const items = Array.isArray(value) ? value : DEFAULT_FOLLOW_UP_BUSINESS_DAYS;
  const cleaned = items
    .map((item) => Math.min(10, Math.max(1, Number(item) || 0)))
    .filter(Boolean)
    .slice(0, 2);
  return cleaned.length ? cleaned : [...DEFAULT_FOLLOW_UP_BUSINESS_DAYS];
}

function addBusinessDays(input: Date | string, businessDays: number) {
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return new Date().toISOString();
  let remaining = Math.max(1, Math.floor(businessDays));
  while (remaining > 0) {
    date.setUTCDate(date.getUTCDate() + 1);
    const day = date.getUTCDay();
    if (day !== 0 && day !== 6) remaining -= 1;
  }
  return date.toISOString();
}

function gmailConfig() {
  const clientId = process.env.GMAIL_CLIENT_ID || process.env.GOOGLE_CLIENT_ID || "";
  const clientSecret = process.env.GMAIL_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET || "";
  const refreshToken = process.env.GMAIL_REFRESH_TOKEN || "";
  return { clientId, clientSecret, refreshToken, fromEmail: PRIMARY_FROM, replyToEmail: REPLY_TO };
}

export function getOutreachConfiguration() {
  const config = gmailConfig();
  const configured = Boolean(config.clientId && config.clientSecret && config.refreshToken);
  return {
    configured,
    sender: config.fromEmail,
    requiredSender: config.fromEmail,
    replyTo: config.replyToEmail,
    missing: [
      !config.clientId ? "GMAIL_CLIENT_ID" : "",
      !config.clientSecret ? "GMAIL_CLIENT_SECRET" : "",
      !config.refreshToken ? "GMAIL_REFRESH_TOKEN" : "",
    ].filter(Boolean),
  };
}

async function getAccessToken() {
  const config = gmailConfig();
  if (!config.clientId || !config.clientSecret || !config.refreshToken) {
    throw new Error("Gmail API credentials are not configured.");
  }

  const body = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    refresh_token: config.refreshToken,
    grant_type: "refresh_token",
  });
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });
  const result = (await response.json().catch(() => ({}))) as { access_token?: string; error_description?: string };
  if (!response.ok || !result.access_token) {
    throw new Error(result.error_description || "Could not refresh Gmail authorization.");
  }
  return result.access_token;
}

async function gmailRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await getAccessToken();
  const response = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init?.headers || {}),
    },
    cache: "no-store",
  });
  const result = (await response.json().catch(() => ({}))) as T & { error?: { message?: string } };
  if (!response.ok) {
    const message = result.error?.message || `Gmail returned ${response.status}.`;
    throw new Error(message);
  }
  return result;
}

function base64Url(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function header(message: GmailMessage, name: string) {
  return message.payload?.headers?.find((item) => item.name?.toLowerCase() === name.toLowerCase())?.value || "";
}

function isBounceMessage(message: GmailMessage) {
  const from = header(message, "From").toLowerCase();
  const subject = header(message, "Subject").toLowerCase();
  const snippet = (message.snippet || "").toLowerCase();
  return (
    from.includes("mailer-daemon") ||
    from.includes("postmaster") ||
    subject.includes("delivery status notification") ||
    subject.includes("undeliverable") ||
    snippet.includes("message not delivered") ||
    snippet.includes("delivery failed")
  );
}

function bounceReason(message: GmailMessage) {
  const snippet = clean(message.snippet, 1000);
  return snippet || header(message, "Subject") || "Message delivery failed.";
}

function mimeMessage({
  to,
  subject,
  body,
  inReplyTo,
  references,
}: {
  to: string;
  subject: string;
  body: string;
  inReplyTo?: string;
  references?: string;
}) {
  const lines = [
    `From: Rukh Labs <${PRIMARY_FROM}>`,
    `Reply-To: Rukh Labs <${REPLY_TO}>`,
    `To: ${to}`,
    `Subject: ${subject.replace(/[\r\n]+/g, " ")}`,
    "MIME-Version: 1.0",
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: 8bit",
  ];
  if (inReplyTo) lines.push(`In-Reply-To: ${inReplyTo}`);
  if (references) lines.push(`References: ${references}`);
  lines.push("", body.replace(/\r?\n/g, "\r\n"));
  return lines.join("\r\n");
}

async function getMessageMetadata(messageId: string) {
  const params = new URLSearchParams({ format: "metadata" });
  ["From", "To", "Reply-To", "Subject", "Message-ID", "Date"].forEach((name) => params.append("metadataHeaders", name));
  return gmailRequest<GmailMessage>(`/messages/${encodeURIComponent(messageId)}?${params}`);
}

async function sendGmail({
  to,
  subject,
  body,
  threadId,
  inReplyTo,
  references,
}: {
  to: string;
  subject: string;
  body: string;
  threadId?: string;
  inReplyTo?: string;
  references?: string;
}) {
  const raw = base64Url(mimeMessage({ to, subject, body, inReplyTo, references }));
  const sent = await gmailRequest<GmailMessage>("/messages/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ raw, ...(threadId ? { threadId } : {}) }),
  });
  if (!sent.id || !sent.threadId) throw new Error("Gmail did not return a sent message ID.");
  const metadata = await getMessageMetadata(sent.id).catch(() => sent);
  return {
    id: sent.id,
    threadId: sent.threadId,
    rfcMessageId: header(metadata, "Message-ID") || undefined,
  };
}

function parseOutreach(value: string | null): LeadOutreachState {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value) as LeadOutreachState;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function nextState(previous: LeadOutreachState, patch: Partial<LeadOutreachState>): LeadOutreachState {
  const messages = patch.messages ?? previous.messages ?? [];
  return {
    ...previous,
    ...patch,
    messages: messages.slice(-MAX_MESSAGES),
  };
}

async function persist(leadId: string, state: LeadOutreachState, action: string, status?: string) {
  const serialized = JSON.stringify(state);
  await leadNeonQuery(
    `WITH updated AS (
       UPDATE public.lead_opportunities
       SET raw_payload = jsonb_set(COALESCE(raw_payload, '{}'::jsonb), '{outreach}', $2::jsonb, true),
           status = COALESCE($4::text, status),
           updated_at = now()
       WHERE id = $1::uuid
       RETURNING id
     )
     INSERT INTO public.lead_activity (lead_id, action, from_status, to_status, note)
     SELECT id, $3, NULL, $4, jsonb_build_object(
       'outreachState', $2::jsonb->>'state',
       'followUpCount', COALESCE(($2::jsonb->>'followUpCount')::int, 0),
       'pitchVersion', $2::jsonb->>'pitchVersion',
       'segment', $2::jsonb->>'segment',
       'verificationStatus', $2::jsonb->>'verificationStatus'
     )::text
     FROM updated`,
    [leadId, serialized, action, status ?? null],
  );
}

export async function listOutreachStates() {
  const result = await leadNeonQuery(
    `SELECT id::text, COALESCE(raw_payload->'outreach', '{}'::jsonb)::text AS outreach
     FROM public.lead_opportunities
     WHERE archived_at IS NULL AND contact_email IS NOT NULL`,
  );
  return Object.fromEntries(
    neonRowsToObjects(result).map((row) => [row.id || "", parseOutreach(row.outreach)]),
  );
}

export async function recordEmailVerification(input: {
  leadId: string;
  status: EmailVerificationStatus;
  method?: EmailVerificationMethod;
  note?: string;
}) {
  const result = await leadNeonQuery(
    `SELECT contact_email, website_url, COALESCE(raw_payload->'outreach', '{}'::jsonb)::text AS outreach
     FROM public.lead_opportunities WHERE id = $1::uuid AND archived_at IS NULL`,
    [input.leadId],
  );
  const row = neonRowsToObjects(result)[0];
  if (!row) throw new Error("Lead was not found.");
  const recipientEmail = selectPrimaryEmail(row.contact_email, row.website_url);
  if (!recipientEmail) throw new Error("This lead does not have a valid email address.");

  const previous = parseOutreach(row.outreach);
  if (previous.lastBounceAt || previous.state === "bounced") {
    throw new Error("This lead record is permanently suppressed after a bounce or invalid verification. Create a new lead record for a replacement contact.");
  }

  const status = input.status;
  if (!(["unknown", "valid", "invalid"] as const).includes(status)) {
    throw new Error("Verification status is invalid.");
  }
  if (status === "valid" && !input.method) {
    throw new Error("A verification method is required before an address can be marked valid.");
  }

  const state = nextState(previous, {
    recipientEmail,
    verificationStatus: status,
    verifiedAt: status === "unknown" ? undefined : new Date().toISOString(),
    verificationMethod: status === "valid" ? input.method : undefined,
    verificationNote: clean(input.note, 500) || undefined,
    emailSuppressed: status === "invalid" ? true : previous.emailSuppressed,
    autoFollowUp: status === "invalid" ? false : previous.autoFollowUp,
    nextFollowUpAt: status === "invalid" ? undefined : previous.nextFollowUpAt,
    state: status === "invalid" ? "paused" : previous.sentAt ? previous.state : "ready",
    lastError: status === "invalid" ? "Address was marked invalid during verification." : undefined,
  });
  await persist(input.leadId, state, status === "valid" ? "email_verified" : status === "invalid" ? "email_invalidated" : "email_verification_cleared");
  return state;
}

export async function saveOutreachDraft(input: {
  leadId: string;
  subject: string;
  body: string;
  followUpBody?: string;
  followUpBodies?: string[];
  followUpBusinessDays?: number[];
  autoFollowUp?: boolean;
  followUpDays?: number;
  segment?: OutreachSegment;
  pitchVersion?: string;
  campaignId?: string;
}) {
  const result = await leadNeonQuery(
    `SELECT contact_email, website_url, COALESCE(raw_payload->'outreach', '{}'::jsonb)::text AS outreach
     FROM public.lead_opportunities WHERE id = $1::uuid AND archived_at IS NULL`,
    [input.leadId],
  );
  const row = neonRowsToObjects(result)[0];
  if (!row) throw new Error("Lead was not found.");
  const recipientEmail = selectPrimaryEmail(row.contact_email, row.website_url);
  if (!recipientEmail) throw new Error("This lead does not have a valid email address.");
  const previous = parseOutreach(row.outreach);
  const followUpBodies = cleanBodies(input.followUpBodies);
  const legacyFollowUp = clean(input.followUpBody, 8000);
  const state = nextState(previous, {
    recipientEmail,
    subject: clean(input.subject, 300),
    body: clean(input.body, 8000),
    followUpBody: legacyFollowUp || followUpBodies[0] || previous.followUpBody,
    followUpBodies: followUpBodies.length ? followUpBodies : previous.followUpBodies,
    followUpBusinessDays: cleanBusinessDaySchedule(input.followUpBusinessDays),
    autoFollowUp: Boolean(input.autoFollowUp),
    followUpDays: Math.min(30, Math.max(1, Number(input.followUpDays) || 7)),
    segment: input.segment || previous.segment,
    pitchVersion: clean(input.pitchVersion, 120) || previous.pitchVersion,
    campaignId: clean(input.campaignId, 120) || previous.campaignId,
    state: previous.sentAt ? previous.state : "ready",
    lastError: undefined,
  });
  if (!state.subject || !state.body) throw new Error("Subject and email body are required.");
  await persist(input.leadId, state, "outreach_draft_saved");
  return state;
}

export async function sendInitialOutreach(input: {
  leadId: string;
  subject: string;
  body: string;
  followUpBody?: string;
  followUpBodies?: string[];
  followUpBusinessDays?: number[];
  autoFollowUp?: boolean;
  followUpDays?: number;
  segment?: OutreachSegment;
  pitchVersion?: string;
  campaignId?: string;
}) {
  const result = await leadNeonQuery(
    `SELECT contact_email, website_url, status, COALESCE(raw_payload->'outreach', '{}'::jsonb)::text AS outreach
     FROM public.lead_opportunities WHERE id = $1::uuid AND archived_at IS NULL`,
    [input.leadId],
  );
  const row = neonRowsToObjects(result)[0];
  if (!row) throw new Error("Lead was not found.");
  const recipientEmail = selectPrimaryEmail(row.contact_email, row.website_url);
  if (!recipientEmail) throw new Error("This lead does not have a valid email address.");
  const previous = parseOutreach(row.outreach);
  if (previous.sentAt && ["sent", "replied"].includes(previous.state || "")) return previous;

  const subject = clean(input.subject, 300);
  const body = clean(input.body, 8000);
  if (!subject || !body) throw new Error("Subject and email body are required.");

  const followUpBodies = cleanBodies(input.followUpBodies);
  const legacyFollowUp = clean(input.followUpBody, 8000);
  const schedule = cleanBusinessDaySchedule(input.followUpBusinessDays);
  const autoFollowUp = Boolean(input.autoFollowUp && (followUpBodies.length || legacyFollowUp));
  const sent = await sendGmail({ to: recipientEmail, subject, body });
  const sentAt = new Date().toISOString();
  const nextFollowUpAt = autoFollowUp ? addBusinessDays(sentAt, schedule[0] || 3) : undefined;
  const messages = [
    ...(previous.messages ?? []),
    { direction: "outbound" as const, kind: "initial" as const, at: sentAt, subject, body, gmailMessageId: sent.id },
  ];
  const state = nextState(previous, {
    recipientEmail,
    subject,
    body,
    followUpBody: legacyFollowUp || followUpBodies[0] || previous.followUpBody,
    followUpBodies: followUpBodies.length ? followUpBodies : previous.followUpBodies,
    followUpBusinessDays: schedule,
    state: "sent",
    autoFollowUp,
    followUpDays: Math.min(30, Math.max(1, Number(input.followUpDays) || 7)),
    gmailThreadId: sent.threadId,
    gmailMessageId: sent.id,
    rfcMessageId: sent.rfcMessageId,
    sentAt,
    nextFollowUpAt,
    followUpCount: 0,
    lastBounceAt: undefined,
    lastBounceReason: undefined,
    lastError: undefined,
    emailSuppressed: false,
    segment: input.segment || previous.segment,
    pitchVersion: clean(input.pitchVersion, 120) || previous.pitchVersion,
    campaignId: clean(input.campaignId, 120) || previous.campaignId,
    messages,
  });
  await persist(input.leadId, state, "email_sent", "contacted");
  return state;
}

async function threadOutcome(state: LeadOutreachState) {
  if (!state.gmailThreadId || !state.sentAt) return null;
  const params = new URLSearchParams({ format: "metadata" });
  ["From", "To", "Subject", "Message-ID", "Date"].forEach((name) => params.append("metadataHeaders", name));
  const thread = await gmailRequest<GmailThread>(`/threads/${encodeURIComponent(state.gmailThreadId)}?${params}`);
  const sentMs = new Date(state.sentAt).getTime();
  const candidates = (thread.messages ?? []).filter((message) => {
    const from = header(message, "From").toLowerCase();
    const when = Number(message.internalDate || 0);
    return when > sentMs && !from.includes(PRIMARY_FROM) && !from.includes(REPLY_TO);
  });
  if (!candidates.length) return null;
  const latest = candidates.sort((a, b) => Number(b.internalDate || 0) - Number(a.internalDate || 0))[0];
  return { type: isBounceMessage(latest) ? ("bounce" as const) : ("reply" as const), message: latest };
}

export async function syncLeadReply(leadId: string) {
  const result = await leadNeonQuery(
    `SELECT COALESCE(raw_payload->'outreach', '{}'::jsonb)::text AS outreach
     FROM public.lead_opportunities WHERE id = $1::uuid AND archived_at IS NULL`,
    [leadId],
  );
  const row = neonRowsToObjects(result)[0];
  if (!row) throw new Error("Lead was not found.");
  const previous = parseOutreach(row.outreach);
  const outcome = await threadOutcome(previous);
  if (!outcome) return { replied: false, bounced: false, state: previous };

  const item = outcome.message;
  if (item.id && previous.messages?.some((message) => message.gmailMessageId === item.id)) {
    return {
      replied: previous.state === "replied",
      bounced: previous.state === "bounced",
      state: previous,
    };
  }

  const at = new Date(Number(item.internalDate || Date.now())).toISOString();
  if (outcome.type === "bounce") {
    const reason = bounceReason(item);
    const messages = [
      ...(previous.messages ?? []),
      { direction: "inbound" as const, kind: "bounce" as const, at, subject: header(item, "Subject"), snippet: reason, gmailMessageId: item.id },
    ];
    const state = nextState(previous, {
      state: "bounced",
      autoFollowUp: false,
      nextFollowUpAt: undefined,
      lastBounceAt: at,
      lastBounceReason: reason,
      lastError: reason,
      emailSuppressed: true,
      verificationStatus: "invalid",
      verifiedAt: at,
      verificationMethod: undefined,
      messages,
    });
    await persist(leadId, state, "email_bounce_detected", "new");
    return { replied: false, bounced: true, state };
  }

  const messages = [
    ...(previous.messages ?? []),
    { direction: "inbound" as const, kind: "reply" as const, at, subject: header(item, "Subject"), snippet: item.snippet || "Reply received", gmailMessageId: item.id },
  ];
  const state = nextState(previous, {
    state: "replied",
    autoFollowUp: false,
    nextFollowUpAt: undefined,
    lastReplyAt: at,
    lastReplySnippet: item.snippet || "Reply received",
    lastError: undefined,
    verificationStatus: "valid",
    verifiedAt: previous.verifiedAt || at,
    verificationMethod: previous.verificationMethod || "confirmed-by-recipient",
    messages,
  });
  await persist(leadId, state, "email_reply_detected", "replied");
  return { replied: true, bounced: false, state };
}

export async function runOutreachCycle(limit = 40) {
  const configured = getOutreachConfiguration();
  if (!configured.configured) return { configured: false, checked: 0, replies: 0, bounces: 0, followUps: 0, blocked: 0, errors: configured.missing };

  const result = await leadNeonQuery(
    `SELECT id::text, contact_email, COALESCE(raw_payload->'outreach', '{}'::jsonb)::text AS outreach
     FROM public.lead_opportunities
     WHERE archived_at IS NULL
       AND raw_payload->'outreach'->>'sentAt' IS NOT NULL
       AND COALESCE(raw_payload->'outreach'->>'state', '') = 'sent'
     ORDER BY updated_at ASC
     LIMIT $1::int`,
    [String(Math.min(100, Math.max(1, limit)))],
  );

  let checked = 0;
  let replies = 0;
  let bounces = 0;
  let followUps = 0;
  let blocked = 0;
  const errors: string[] = [];
  for (const row of neonRowsToObjects(result)) {
    if (!row.id) continue;
    try {
      checked += 1;
      const synced = await syncLeadReply(row.id);
      if (synced.bounced) {
        bounces += 1;
        continue;
      }
      if (synced.replied) {
        replies += 1;
        continue;
      }
      const state = synced.state;
      if (!state.autoFollowUp || !state.nextFollowUpAt || !state.gmailThreadId || !state.recipientEmail) continue;
      if (new Date(state.nextFollowUpAt).getTime() > Date.now()) continue;

      try {
        await assertLeadOutreachSafety(row.id);
      } catch (safetyError) {
        blocked += 1;
        const paused = nextState(state, {
          state: "paused",
          autoFollowUp: false,
          nextFollowUpAt: undefined,
          lastError: safetyError instanceof Error ? safetyError.message : "Follow-up blocked by outreach safety.",
        });
        await persist(row.id, paused, "followup_blocked_by_safety");
        continue;
      }

      const bodies = state.followUpBodies?.filter(Boolean) || (state.followUpBody ? [state.followUpBody, state.followUpBody] : []);
      const maxFollowUps = Math.min(2, bodies.length);
      const currentCount = state.followUpCount ?? 0;
      if (currentCount >= maxFollowUps) {
        const completed = nextState(state, { autoFollowUp: false, nextFollowUpAt: undefined, state: "completed" });
        await persist(row.id, completed, "followup_sequence_completed");
        continue;
      }

      const body = clean(bodies[currentCount], 8000);
      if (!body) {
        const completed = nextState(state, { autoFollowUp: false, nextFollowUpAt: undefined, state: "completed" });
        await persist(row.id, completed, "followup_sequence_completed");
        continue;
      }
      const subject = state.subject?.startsWith("Re:") ? state.subject : `Re: ${state.subject || "Quick follow-up"}`;
      const sent = await sendGmail({
        to: state.recipientEmail,
        subject,
        body,
        threadId: state.gmailThreadId,
        inReplyTo: state.rfcMessageId,
        references: state.rfcMessageId,
      });
      const at = new Date().toISOString();
      const count = currentCount + 1;
      const schedule = state.followUpBusinessDays?.length ? state.followUpBusinessDays : [...DEFAULT_FOLLOW_UP_BUSINESS_DAYS];
      const nextAt = count < maxFollowUps ? addBusinessDays(at, schedule[count] || 4) : undefined;
      const messages = [
        ...(state.messages ?? []),
        { direction: "outbound" as const, kind: "follow-up" as const, at, subject, body, gmailMessageId: sent.id },
      ];
      const updated = nextState(state, {
        state: nextAt ? "sent" : "completed",
        gmailMessageId: sent.id,
        rfcMessageId: sent.rfcMessageId || state.rfcMessageId,
        followUpCount: count,
        nextFollowUpAt: nextAt,
        autoFollowUp: Boolean(nextAt),
        lastError: undefined,
        messages,
      });
      await persist(row.id, updated, "followup_sent", "contacted");
      followUps += 1;
    } catch (error) {
      errors.push(`${row.id}: ${error instanceof Error ? error.message : "Outreach cycle failed."}`);
    }
  }
  return { configured: true, checked, replies, bounces, followUps, blocked, errors: errors.slice(0, 10) };
}
