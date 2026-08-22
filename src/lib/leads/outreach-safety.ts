import { selectPrimaryEmail } from "@/lib/leads/contact-values";
import { leadNeonQuery, neonRowsToObjects } from "@/lib/leads/neon";
import {
  CONTROLLED_OUTREACH_CAMPAIGN,
  deriveOutreachSegment,
  pitchVersionForLead,
  type OutreachSegment,
} from "@/lib/leads/segments";

export type OutreachHealth = "monitoring" | "healthy" | "warning" | "paused";

export type OutreachPerformance = {
  key: string;
  label: string;
  sent: number;
  delivered: number;
  bounced: number;
  replied: number;
  followUps: number;
  verified: number;
  bounceRate: number;
  replyRate: number;
  health: OutreachHealth;
  decision: string;
};

export type OutreachSafetySnapshot = {
  generatedAt: string;
  campaignId: string;
  resetAt?: string;
  historical: OutreachPerformance;
  historicalQuarantined: boolean;
  historicalWarning?: string;
  global: OutreachPerformance;
  segments: Record<OutreachSegment, OutreachPerformance>;
  pitches: OutreachPerformance[];
  sendingAllowed: boolean;
  blockReason?: string;
};

type StoredOutreach = {
  recipientEmail?: string;
  state?: string;
  sentAt?: string;
  lastBounceAt?: string;
  lastReplyAt?: string;
  followUpCount?: number;
  pitchVersion?: string;
  campaignId?: string;
  verificationStatus?: string;
  verifiedAt?: string;
  emailSuppressed?: boolean;
};

type SafetyRow = {
  id: string;
  segment: OutreachSegment;
  outreach: StoredOutreach;
};

const SEGMENTS: readonly OutreachSegment[] = ["website", "power-bi", "data-ops", "partners"];

function parseJsonArray(value: string | null) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function parseOutreach(value: string | null): StoredOutreach {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value) as StoredOutreach;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function roundRate(value: number) {
  return Math.round(value * 10) / 10;
}

function decisionFor(metric: {
  sent: number;
  delivered: number;
  bounced: number;
  replied: number;
  followUps: number;
  bounceRate: number;
}) {
  if (metric.bounced > 0 && metric.bounceRate > 3) {
    return "Pause this source. Suppress failed addresses, verify every remaining address, and do not resume until the list-generation problem is fixed.";
  }
  if (metric.delivered >= 150 && metric.replied < 2) {
    return "Materially change the offer, targeting, or price before sending another batch.";
  }
  if (metric.delivered >= 100 && metric.replied === 0 && metric.followUps > 0) {
    return "Retire this pitch. It has enough delivered volume and follow-up exposure to call the test.";
  }
  if (metric.delivered >= 50 && metric.replied === 0) {
    return "Rewrite the subject and opening while keeping the audience, offer, and CTA stable for the next controlled test.";
  }
  if (metric.sent < 10) {
    return "Not enough delivery data yet. Keep the batch small and verified.";
  }
  return "Continue the controlled test. Do not combine this result with another service or pitch version.";
}

function performance(
  rows: SafetyRow[],
  key: string,
  label: string,
  pauseThreshold: number,
): OutreachPerformance {
  const sent = rows.length;
  const bounced = rows.filter((row) => Boolean(row.outreach.lastBounceAt) || row.outreach.state === "bounced").length;
  const delivered = Math.max(0, sent - bounced);
  const replied = rows.filter((row) => Boolean(row.outreach.lastReplyAt) || row.outreach.state === "replied").length;
  const followUps = rows.reduce((sum, row) => sum + Math.max(0, Number(row.outreach.followUpCount) || 0), 0);
  const verified = rows.filter((row) => row.outreach.verificationStatus === "valid").length;
  const bounceRate = sent ? roundRate((bounced / sent) * 100) : 0;
  const replyRate = delivered ? roundRate((replied / delivered) * 100) : 0;
  const health: OutreachHealth =
    bounced > 0 && bounceRate > pauseThreshold
      ? "paused"
      : sent < 10
        ? "monitoring"
        : bounceRate > 1.5
          ? "warning"
          : "healthy";

  return {
    key,
    label,
    sent,
    delivered,
    bounced,
    replied,
    followUps,
    verified,
    bounceRate,
    replyRate,
    health,
    decision: decisionFor({ sent, delivered, bounced, replied, followUps, bounceRate }),
  };
}

function configuredResetAt() {
  const value = process.env.OUTREACH_SAFETY_RESET_AT?.trim();
  if (!value) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
}

async function safetyRows() {
  const result = await leadNeonQuery(`
    SELECT
      id::text,
      COALESCE(source, '') AS source,
      COALESCE(company_name, '') AS company_name,
      COALESCE(summary, '') AS summary,
      COALESCE(tags, '[]'::jsonb)::text AS tags,
      COALESCE(signals, '[]'::jsonb)::text AS signals,
      COALESCE(raw_payload->'outreach', '{}'::jsonb)::text AS outreach
    FROM public.lead_opportunities
    WHERE raw_payload->'outreach'->>'sentAt' IS NOT NULL
  `);

  return neonRowsToObjects(result)
    .map((row): SafetyRow | null => {
      const outreach = parseOutreach(row.outreach);
      const sentMs = outreach.sentAt ? new Date(outreach.sentAt).getTime() : Number.NaN;
      if (!Number.isFinite(sentMs) || !row.id) return null;
      const tags = parseJsonArray(row.tags);
      const signals = parseJsonArray(row.signals);
      return {
        id: row.id,
        segment: deriveOutreachSegment({
          source: row.source,
          tags,
          company: row.company_name,
          summary: row.summary,
          signals,
        }),
        outreach,
      };
    })
    .filter((row): row is SafetyRow => Boolean(row));
}

export async function getOutreachSafetySnapshot(): Promise<OutreachSafetySnapshot> {
  const rows = await safetyRows();
  const resetAt = configuredResetAt();
  const resetMs = resetAt ? new Date(resetAt).getTime() : Number.NEGATIVE_INFINITY;
  const currentRows = rows.filter((row) => {
    const sentMs = row.outreach.sentAt ? new Date(row.outreach.sentAt).getTime() : Number.NaN;
    return (
      row.outreach.campaignId === CONTROLLED_OUTREACH_CAMPAIGN &&
      Number.isFinite(sentMs) &&
      sentMs >= resetMs
    );
  });

  const historical = performance(rows, "historical", "Historical outreach", 3);
  const historicalQuarantined = historical.sent >= 10 && historical.bounceRate > 3;
  const historicalWarning = historicalQuarantined
    ? `The previous campaign is quarantined at ${historical.bounceRate}% hard bounces (${historical.bounced} of ${historical.sent} attempts). Its addresses and outcomes remain visible, but they do not count as a clean baseline for the controlled campaign.`
    : undefined;

  const global = performance(currentRows, CONTROLLED_OUTREACH_CAMPAIGN, "Controlled campaign", 10);
  const segments = Object.fromEntries(
    SEGMENTS.map((segment) => [
      segment,
      performance(
        currentRows.filter((row) => row.segment === segment),
        segment,
        segment === "power-bi" ? "Power BI" : segment === "data-ops" ? "Data Ops" : segment === "partners" ? "Partners" : "Website",
        3,
      ),
    ]),
  ) as Record<OutreachSegment, OutreachPerformance>;

  const pitchGroups = new Map<string, SafetyRow[]>();
  for (const row of currentRows) {
    const version = row.outreach.pitchVersion || pitchVersionForLead(row.segment, row.id);
    const group = pitchGroups.get(version) || [];
    group.push(row);
    pitchGroups.set(version, group);
  }
  const pitches = [...pitchGroups.entries()]
    .map(([version, items]) => performance(items, version, version, 3))
    .sort((a, b) => b.sent - a.sent || a.label.localeCompare(b.label));

  const emergency = global.health === "paused";
  const pausedSegments = SEGMENTS.filter((segment) => segments[segment].health === "paused");
  const blockReason = emergency
    ? `All controlled sending is paused: the current hard-bounce rate is ${global.bounceRate}% across ${global.sent} sent messages.`
    : pausedSegments.length
      ? `Controlled sending is paused for: ${pausedSegments.map((segment) => segments[segment].label).join(", ")}.`
      : undefined;

  return {
    generatedAt: new Date().toISOString(),
    campaignId: CONTROLLED_OUTREACH_CAMPAIGN,
    resetAt,
    historical,
    historicalQuarantined,
    historicalWarning,
    global,
    segments,
    pitches,
    sendingAllowed: !emergency,
    blockReason,
  };
}

export async function assertLeadOutreachSafety(leadId: string) {
  const result = await leadNeonQuery(
    `SELECT
       id::text,
       COALESCE(source, '') AS source,
       COALESCE(company_name, '') AS company_name,
       COALESCE(contact_email, '') AS contact_email,
       COALESCE(website_url, '') AS website_url,
       COALESCE(summary, '') AS summary,
       COALESCE(tags, '[]'::jsonb)::text AS tags,
       COALESCE(signals, '[]'::jsonb)::text AS signals,
       COALESCE(raw_payload->'outreach', '{}'::jsonb)::text AS outreach
     FROM public.lead_opportunities
     WHERE id = $1::uuid AND archived_at IS NULL`,
    [leadId],
  );
  const row = neonRowsToObjects(result)[0];
  if (!row) throw new Error("Lead was not found.");

  const outreach = parseOutreach(row.outreach);
  const currentEmail = selectPrimaryEmail(row.contact_email, row.website_url);
  if (!currentEmail) {
    throw new Error("This lead does not have a valid email address.");
  }
  if (!outreach.recipientEmail || outreach.recipientEmail.toLowerCase() !== currentEmail.toLowerCase()) {
    throw new Error("The current email address does not match the address that was verified. Verify this exact address before sending.");
  }
  if (outreach.emailSuppressed || outreach.state === "bounced" || outreach.lastBounceAt) {
    throw new Error("This address is suppressed because it previously bounced.");
  }
  if (outreach.verificationStatus !== "valid" || !outreach.verifiedAt) {
    throw new Error("Sending is blocked until this exact address is recorded as valid by an external verifier or confirmed correspondence.");
  }
  const verifiedMs = new Date(outreach.verifiedAt).getTime();
  if (!Number.isFinite(verifiedMs) || verifiedMs < Date.now() - 90 * 86_400_000) {
    throw new Error("Email verification is older than 90 days. Re-verify the address before sending.");
  }

  const segment = deriveOutreachSegment({
    source: row.source,
    tags: parseJsonArray(row.tags),
    company: row.company_name,
    summary: row.summary,
    signals: parseJsonArray(row.signals),
  });
  const snapshot = await getOutreachSafetySnapshot();

  if (snapshot.global.health === "paused") {
    throw new Error(snapshot.blockReason || "All outreach is paused by the deliverability safety rule.");
  }
  const segmentHealth = snapshot.segments[segment];
  if (segmentHealth.health === "paused") {
    throw new Error(`${segmentHealth.label} outreach is paused because its hard-bounce rate is ${segmentHealth.bounceRate}%.`);
  }

  return { segment, snapshot, verificationStatus: outreach.verificationStatus };
}
