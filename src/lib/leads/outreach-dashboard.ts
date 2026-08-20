import { leadNeonQuery, neonRowsToObjects } from "@/lib/leads/neon";

export type LeadDashboardStatus =
  | "ready"
  | "sent"
  | "contacted"
  | "replied"
  | "bounced"
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
  feed: "website" | "power-bi";
  score: number;
  crmStatus: string;
  status: LeadDashboardStatus;
  outreachStatus: string;
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
  followUps: number;
  noEmail: number;
  replyRate: number;
  bounceRate: number;
};

function bool(value: string | null | undefined) {
  return value === "true" || value === "t" || value === "1";
}

export async function listLeadStatusDashboard() {
  const result = await leadNeonQuery(`
    WITH suppressed_emails AS (
      SELECT DISTINCT lower(trim(contact_email)) AS email
      FROM public.lead_opportunities
      WHERE archived_at IS NULL
        AND contact_email IS NOT NULL
        AND (
          COALESCE(raw_payload->'outreach'->>'state', '') = 'bounced'
          OR COALESCE(raw_payload->'outreach'->>'emailSuppressed', 'false') = 'true'
          OR raw_payload->'outreach'->>'lastBounceAt' IS NOT NULL
        )
    )
    SELECT
      l.id::text,
      COALESCE(l.company_name, 'Unknown lead') AS company,
      COALESCE(l.contact_email, '') AS contact_email,
      COALESCE(l.source, '') AS source,
      COALESCE(l.score, 0)::text AS score,
      COALESCE(l.status, 'new') AS crm_status,
      COALESCE(l.raw_payload->'outreach'->>'state', '') AS outreach_status,
      COALESCE(l.raw_payload->'outreach'->>'sentAt', '') AS sent_at,
      COALESCE(l.raw_payload->'outreach'->>'lastReplyAt', '') AS last_reply_at,
      COALESCE(l.raw_payload->'outreach'->>'lastBounceAt', '') AS last_bounce_at,
      COALESCE(l.raw_payload->'outreach'->>'lastBounceReason', '') AS last_bounce_reason,
      COALESCE(l.raw_payload->'outreach'->>'nextFollowUpAt', '') AS next_follow_up_at,
      COALESCE(l.raw_payload->'outreach'->>'followUpCount', '0') AS follow_up_count,
      COALESCE(l.raw_payload->'outreach'->>'autoFollowUp', 'false') AS auto_follow_up,
      CASE
        WHEN l.contact_email IS NOT NULL AND lower(trim(l.contact_email)) IN (SELECT email FROM suppressed_emails) THEN 'true'
        ELSE 'false'
      END AS suppressed,
      COALESCE(l.discovered_at::text, '') AS discovered_at,
      COALESCE(l.updated_at::text, '') AS updated_at,
      CASE
        WHEN l.contact_email IS NOT NULL AND lower(trim(l.contact_email)) IN (SELECT email FROM suppressed_emails) THEN 'bounced'
        WHEN COALESCE(l.raw_payload->'outreach'->>'state', '') = 'replied' OR l.status = 'replied' THEN 'replied'
        WHEN l.status = 'won' THEN 'won'
        WHEN l.status = 'proposal' THEN 'proposal'
        WHEN l.status = 'meeting' THEN 'meeting'
        WHEN l.status = 'lost' THEN 'lost'
        WHEN l.status = 'ignored' THEN 'ignored'
        WHEN COALESCE(l.raw_payload->'outreach'->>'state', '') = 'completed' THEN 'completed'
        WHEN COALESCE(l.raw_payload->'outreach'->>'state', '') = 'sent' THEN 'sent'
        WHEN l.status = 'contacted' THEN 'contacted'
        WHEN l.contact_email IS NULL OR trim(l.contact_email) = '' THEN 'no-email'
        ELSE 'ready'
      END AS display_status
    FROM public.lead_opportunities l
    WHERE l.archived_at IS NULL
    ORDER BY l.updated_at DESC, l.discovered_at DESC
  `);

  const rows: LeadDashboardRow[] = neonRowsToObjects(result).map((row) => ({
    id: row.id || "",
    company: row.company || "Unknown lead",
    contactEmail: row.contact_email || "",
    source: row.source || "",
    feed: row.source === "power-bi" ? "power-bi" : "website",
    score: Number(row.score || 0),
    crmStatus: row.crm_status || "new",
    status: (row.display_status || "ready") as LeadDashboardStatus,
    outreachStatus: row.outreach_status || "",
    sentAt: row.sent_at || undefined,
    lastReplyAt: row.last_reply_at || undefined,
    lastBounceAt: row.last_bounce_at || undefined,
    lastBounceReason: row.last_bounce_reason || undefined,
    nextFollowUpAt: row.next_follow_up_at || undefined,
    followUpCount: Number(row.follow_up_count || 0),
    autoFollowUp: bool(row.auto_follow_up),
    suppressed: bool(row.suppressed),
    discoveredAt: row.discovered_at || undefined,
    updatedAt: row.updated_at || undefined,
  }));

  const sent = rows.filter((row) => Boolean(row.sentAt)).length;
  const bounced = rows.filter((row) => Boolean(row.lastBounceAt)).length;
  const replied = rows.filter((row) => row.status === "replied").length;
  const metrics: LeadDashboardMetrics = {
    total: rows.length,
    ready: rows.filter((row) => row.status === "ready").length,
    sent,
    activeSent: rows.filter((row) => row.status === "sent" || row.status === "contacted").length,
    bounced,
    replied,
    followUps: rows.reduce((sum, row) => sum + row.followUpCount, 0),
    noEmail: rows.filter((row) => row.status === "no-email").length,
    replyRate: sent ? Math.round((replied / sent) * 1000) / 10 : 0,
    bounceRate: sent ? Math.round((bounced / sent) * 1000) / 10 : 0,
  };

  return { rows, metrics };
}
