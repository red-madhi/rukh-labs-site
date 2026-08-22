import { selectPrimaryEmail } from "@/lib/leads/contact-values";
import { leadNeonQuery, neonRowsToObjects } from "@/lib/leads/neon";
import { getOutreachSafetySnapshot } from "@/lib/leads/outreach-safety";
import { deriveOutreachSegment, type OutreachSegment } from "@/lib/leads/segments";

export type LeadDashboardStatus =
  | "ready"
  | "sent"
  | "contacted"
  | "replied"
  | "bounced"
  | "paused"
  | "completed"
  | "meeting"
  | "proposal"
  | "won"
  | "lost"
  | "ignored"
  | "no-email";

export type LeadDashboardRow = {
  id: string;
  company: string;
  contactEmail: string;
  source: string;
  feed: OutreachSegment;
  score: number;
  crmStatus: string;
  status: LeadDashboardStatus;
  outreachStatus: string;
  pitchVersion?: string;
  campaignId?: string;
  verificationStatus: "unknown" | "valid" | "invalid";
  verifiedAt?: string;
  sentAt?: string;
  lastReplyAt?: string;
  lastBounceAt?: string;
  lastBounceReason?: string;
  nextFollowUpAt?: string;
  followUpCount: number;
  autoFollowUp: boolean;
  suppressed: boolean;
  discoveredAt?: string;
  updatedAt?: string;
};

export type LeadDashboardMetrics = {
  total: number;
  ready: number;
  sent: number;
  activeSent: number;
  bounced: number;
  replied: number;
  paused: number;
  verified: number;
  unverified: number;
  followUps: number;
  noEmail: number;
  replyRate: number;
  bounceRate: number;
};

function bool(value: string | null | undefined) {
  return value === "true" || value === "t" || value === "1";
}

function parseJsonArray(value: string | null) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function displayStatus(input: {
  hasEmail: boolean;
  suppressed: boolean;
  outreachStatus: string;
  crmStatus: string;
}): LeadDashboardStatus {
  if (input.suppressed) return "bounced";
  if (input.outreachStatus === "replied" || input.crmStatus === "replied") return "replied";
  if (input.crmStatus === "won") return "won";
  if (input.crmStatus === "proposal") return "proposal";
  if (input.crmStatus === "meeting") return "meeting";
  if (input.crmStatus === "lost") return "lost";
  if (input.crmStatus === "ignored") return "ignored";
  if (input.outreachStatus === "paused") return "paused";
  if (input.outreachStatus === "completed") return "completed";
  if (input.outreachStatus === "sent") return "sent";
  if (input.crmStatus === "contacted") return "contacted";
  if (!input.hasEmail) return "no-email";
  return "ready";
}

export async function listLeadStatusDashboard() {
  const [result, suppressedResult, safety] = await Promise.all([
    leadNeonQuery(`
      SELECT
        l.id::text,
        COALESCE(l.company_name, 'Unknown lead') AS company,
        COALESCE(l.contact_email, '') AS contact_email,
        COALESCE(l.website_url, '') AS website_url,
        COALESCE(l.source, '') AS source,
        COALESCE(l.summary, '') AS summary,
        COALESCE(l.tags, '[]'::jsonb)::text AS tags,
        COALESCE(l.signals, '[]'::jsonb)::text AS signals,
        COALESCE(l.score, 0)::text AS score,
        COALESCE(l.status, 'new') AS crm_status,
        COALESCE(l.raw_payload->'outreach'->>'recipientEmail', '') AS recipient_email,
        COALESCE(l.raw_payload->'outreach'->>'state', '') AS outreach_status,
        COALESCE(l.raw_payload->'outreach'->>'pitchVersion', '') AS pitch_version,
        COALESCE(l.raw_payload->'outreach'->>'campaignId', '') AS campaign_id,
        COALESCE(l.raw_payload->'outreach'->>'verificationStatus', 'unknown') AS verification_status,
        COALESCE(l.raw_payload->'outreach'->>'verifiedAt', '') AS verified_at,
        COALESCE(l.raw_payload->'outreach'->>'sentAt', '') AS sent_at,
        COALESCE(l.raw_payload->'outreach'->>'lastReplyAt', '') AS last_reply_at,
        COALESCE(l.raw_payload->'outreach'->>'lastBounceAt', '') AS last_bounce_at,
        COALESCE(l.raw_payload->'outreach'->>'lastBounceReason', '') AS last_bounce_reason,
        COALESCE(l.raw_payload->'outreach'->>'nextFollowUpAt', '') AS next_follow_up_at,
        COALESCE(l.raw_payload->'outreach'->>'followUpCount', '0') AS follow_up_count,
        COALESCE(l.raw_payload->'outreach'->>'autoFollowUp', 'false') AS auto_follow_up,
        COALESCE(l.raw_payload->'outreach'->>'emailSuppressed', 'false') AS email_suppressed,
        COALESCE(l.discovered_at::text, '') AS discovered_at,
        COALESCE(l.updated_at::text, '') AS updated_at
      FROM public.lead_opportunities l
      WHERE l.archived_at IS NULL
      ORDER BY l.updated_at DESC, l.discovered_at DESC
    `),
    leadNeonQuery(`
      SELECT
        COALESCE(raw_payload->'outreach'->>'recipientEmail', '') AS recipient_email,
        COALESCE(contact_email, '') AS contact_email,
        COALESCE(website_url, '') AS website_url
      FROM public.lead_opportunities
      WHERE contact_email IS NOT NULL
        AND (
          COALESCE(raw_payload->'outreach'->>'state', '') = 'bounced'
          OR COALESCE(raw_payload->'outreach'->>'emailSuppressed', 'false') = 'true'
          OR raw_payload->'outreach'->>'lastBounceAt' IS NOT NULL
        )
    `),
    getOutreachSafetySnapshot(),
  ]);

  const rawRows = neonRowsToObjects(result);
  const suppressedEmails = new Set(
    neonRowsToObjects(suppressedResult)
      .map(
        (row) =>
          (row.recipient_email || selectPrimaryEmail(row.contact_email, row.website_url) || "")
            .trim()
            .toLowerCase(),
      )
      .filter(Boolean),
  );

  const rows: LeadDashboardRow[] = rawRows.map((row) => {
    const contactEmail = selectPrimaryEmail(row.contact_email, row.website_url) || "";
    const storedRecipient = (row.recipient_email || "").trim().toLowerCase();
    const exactAddressMatches = Boolean(contactEmail && storedRecipient === contactEmail.toLowerCase());
    const suppressed = Boolean(contactEmail && suppressedEmails.has(contactEmail.toLowerCase()));
    const rawVerification = exactAddressMatches ? row.verification_status : "unknown";
    const verificationStatus = rawVerification === "valid" || rawVerification === "invalid"
      ? rawVerification
      : "unknown";
    const outreachStatus = row.outreach_status || "";
    const crmStatus = row.crm_status || "new";

    return {
      id: row.id || "",
      company: row.company || "Unknown lead",
      contactEmail,
      source: row.source || "",
      feed: deriveOutreachSegment({
        source: row.source,
        company: row.company,
        summary: row.summary,
        tags: parseJsonArray(row.tags),
        signals: parseJsonArray(row.signals),
      }),
      score: Number(row.score || 0),
      crmStatus,
      status: displayStatus({ hasEmail: Boolean(contactEmail), suppressed, outreachStatus, crmStatus }),
      outreachStatus,
      pitchVersion: row.pitch_version || undefined,
      campaignId: row.campaign_id || undefined,
      verificationStatus,
      verifiedAt: exactAddressMatches ? row.verified_at || undefined : undefined,
      sentAt: row.sent_at || undefined,
      lastReplyAt: row.last_reply_at || undefined,
      lastBounceAt: row.last_bounce_at || undefined,
      lastBounceReason: row.last_bounce_reason || undefined,
      nextFollowUpAt: row.next_follow_up_at || undefined,
      followUpCount: Number(row.follow_up_count || 0),
      autoFollowUp: bool(row.auto_follow_up),
      suppressed,
      discoveredAt: row.discovered_at || undefined,
      updatedAt: row.updated_at || undefined,
    };
  });

  const sent = rows.filter((row) => Boolean(row.sentAt)).length;
  const bounced = rows.filter((row) => Boolean(row.lastBounceAt) || row.suppressed).length;
  const delivered = Math.max(0, sent - bounced);
  const replied = rows.filter((row) => Boolean(row.lastReplyAt) || row.outreachStatus === "replied").length;
  const metrics: LeadDashboardMetrics = {
    total: rows.length,
    ready: rows.filter((row) => row.status === "ready").length,
    sent,
    activeSent: rows.filter((row) => row.status === "sent" || row.status === "contacted").length,
    bounced,
    replied,
    paused: rows.filter((row) => row.status === "paused").length,
    verified: rows.filter((row) => row.verificationStatus === "valid").length,
    unverified: rows.filter((row) => Boolean(row.contactEmail) && row.verificationStatus !== "valid" && !row.suppressed).length,
    followUps: rows.reduce((sum, row) => sum + row.followUpCount, 0),
    noEmail: rows.filter((row) => row.status === "no-email").length,
    replyRate: delivered ? Math.round((replied / delivered) * 1000) / 10 : 0,
    bounceRate: sent ? Math.round((bounced / sent) * 1000) / 10 : 0,
  };

  return { rows, metrics, safety };
}
