import { selectPrimaryEmail } from "@/lib/leads/contact-values";
import { leadNeonQuery, neonRowsToObjects } from "@/lib/leads/neon";
import {
  CONTROLLED_OUTREACH_CAMPAIGN,
  deriveOutreachSegment,
  OUTREACH_SEGMENTS,
  pitchVariantForLead,
  pitchVersionForLead,
  segmentLabel,
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
  historical: OutreachPerformance;
  historicalQuarantined: boolean;
  historicalWarning?: string;
  global: OutreachPerformance;
  segments: Record<OutreachSegment, OutreachPerformance>;
  pitches: OutreachPerformance[];
  sendingAllowed: boolean;
  blockReason?: string;
  manualKillSwitch: boolean;
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

function parseObject(value: unknown): StoredOutreach {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as StoredOutreach;
  }
  if (typeof value !== "string") return {};
  try {
    const parsed = JSON.parse(value) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as StoredOutreach)
      : {};
  } catch {
    return {};
  }
}

function parseArray(value: unknown) {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string");
  }
  if (typeof value !== "string") return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
}

function roundRate(value: number) {
  return Math.round(value * 10) / 10;
}

function decisionFor(metric: {
  delivered: number;
  replied: number;
  followUps: number;
  bounced: number;
  bounceRate: number;
}) {
  if (metric.bounced > 0 && metric.bounceRate > 3) {
    return "Pause this source. Suppress failed addresses, verify every remaining address, and fix list generation before resuming.";
  }
  if (metric.delivered >= 150 && metric.replied < 2) {
    return "Materially change the offer, targeting, or price before another batch.";
  }
  if (
    metric.delivered >= 100 &&
    metric.replied === 0 &&
    metric.followUps > 0
  ) {
    return "Retire this pitch. It has enough delivered volume and follow-up exposure to call the test.";
  }
  if (metric.delivered >= 50 && metric.replied === 0) {
    return "Rewrite the subject and opening while holding the audience, offer, and CTA stable.";
  }
  if (metric.delivered < 10) {
    return "Not enough delivery data yet. Keep the batch small and verified.";
  }
  return "Continue the controlled test. Do not blend this result with another service or pitch version.";
}

function performance(
  rows: SafetyRow[],
  key: string,
  label: string,
  pauseThreshold: number,
): OutreachPerformance {
  const sent = rows.length;
  const bounced = rows.filter(
    (row) =>
      Boolean(row.outreach.lastBounceAt) || row.outreach.state === "bounced",
  ).length;
  const delivered = Math.max(0, sent - bounced);
  const replied = rows.filter(
    (row) =>
      Boolean(row.outreach.lastReplyAt) || row.outreach.state === "replied",
  ).length;
  const followUps = rows.reduce(
    (sum, row) =>
      sum + Math.max(0, Number(row.outreach.followUpCount) || 0),
    0,
  );
  const verified = rows.filter(
    (row) => row.outreach.verificationStatus === "valid",
  ).length;
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
    decision: decisionFor({
      delivered,
      replied,
      followUps,
      bounced,
      bounceRate,
    }),
  };
}

async function getSentRows(): Promise<SafetyRow[]> {
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
      const outreach = parseObject(row.outreach);
      if (!row.id || !outreach.sentAt) return null;
      const tags = parseArray(row.tags);
      const signals = parseArray(row.signals);
      return {
        id: String(row.id),
        outreach,
        segment: deriveOutreachSegment({
          source: String(row.source || ""),
          company: String(row.company_name || ""),
          summary: String(row.summary || ""),
          tags,
          signals,
        }),
      };
    })
    .filter((row): row is SafetyRow => Boolean(row));
}

export async function getOutreachSafetySnapshot(): Promise<OutreachSafetySnapshot> {
  const rows = await getSentRows();
  const currentRows = rows.filter(
    (row) => row.outreach.campaignId === CONTROLLED_OUTREACH_CAMPAIGN,
  );
  const historicalRows = rows.filter(
    (row) => row.outreach.campaignId !== CONTROLLED_OUTREACH_CAMPAIGN,
  );

  const historical = performance(
    historicalRows,
    "historical",
    "Historical outreach",
    3,
  );
  const historicalQuarantined =
    historical.sent >= 10 && historical.bounceRate > 3;
  const global = performance(
    currentRows,
    CONTROLLED_OUTREACH_CAMPAIGN,
    "Controlled campaign",
    10,
  );
  const segments = Object.fromEntries(
    OUTREACH_SEGMENTS.map((segment) => [
      segment,
      performance(
        currentRows.filter((row) => row.segment === segment),
        segment,
        segmentLabel(segment),
        3,
      ),
    ]),
  ) as Record<OutreachSegment, OutreachPerformance>;

  const pitchGroups = new Map<string, SafetyRow[]>();
  for (const row of currentRows) {
    const version =
      row.outreach.pitchVersion ||
      pitchVersionForLead(row.segment, row.id);
    pitchGroups.set(version, [...(pitchGroups.get(version) || []), row]);
  }
  const pitches = [...pitchGroups.entries()]
    .map(([version, items]) => performance(items, version, version, 3))
    .sort((a, b) => b.sent - a.sent);

  const manualKillSwitch = /^(1|true|yes|on)$/i.test(
    process.env.OUTREACH_SEND_DISABLED?.trim() || "",
  );
  const emergency = global.health === "paused";
  const pausedSegments = OUTREACH_SEGMENTS.filter(
    (segment) => segments[segment].health === "paused",
  );
  const blockReason = manualKillSwitch
    ? "All outreach is paused by OUTREACH_SEND_DISABLED."
    : emergency
      ? `All controlled sending is paused at ${global.bounceRate}% hard bounces.`
      : pausedSegments.length
        ? `Controlled sending is paused for: ${pausedSegments
            .map((segment) => segmentLabel(segment))
            .join(", ")}.`
        : undefined;

  return {
    generatedAt: new Date().toISOString(),
    campaignId: CONTROLLED_OUTREACH_CAMPAIGN,
    historical,
    historicalQuarantined,
    historicalWarning: historicalQuarantined
      ? `The previous campaign is quarantined at ${historical.bounceRate}% hard bounces (${historical.bounced} of ${historical.sent}). It remains visible but does not count as a clean baseline.`
      : undefined,
    global,
    segments,
    pitches,
    sendingAllowed: !manualKillSwitch && !emergency,
    blockReason,
    manualKillSwitch,
  };
}

export async function recordLeadEmailVerification(input: {
  leadId: string;
  email: string;
  status: "valid" | "invalid";
  source: string;
  evidence: string;
}) {
  const leadId = input.leadId.trim();
  const email = input.email.trim().toLowerCase();
  if (!leadId || !/^\S+@\S+\.\S+$/.test(email)) {
    throw new Error("A lead ID and valid exact email are required.");
  }
  if (input.source.trim().length < 3 || input.evidence.trim().length < 8) {
    throw new Error("Record the verification source and evidence.");
  }

  const result = await leadNeonQuery(
    `
      SELECT
        id::text,
        COALESCE(contact_email, '') AS contact_email,
        COALESCE(website_url, '') AS website_url
      FROM public.lead_opportunities
      WHERE id = $1::uuid AND archived_at IS NULL
    `,
    [leadId],
  );
  const row = neonRowsToObjects(result)[0];
  if (!row) throw new Error("Lead was not found.");

  const currentEmail = selectPrimaryEmail(
    String(row.contact_email || ""),
    String(row.website_url || ""),
  );
  if (!currentEmail || currentEmail.toLowerCase() !== email) {
    throw new Error(
      "The verification address must exactly match the lead's current primary email.",
    );
  }

  const verifiedAt = new Date().toISOString();
  await leadNeonQuery(
    `
      UPDATE public.lead_opportunities
      SET
        raw_payload = COALESCE(raw_payload, '{}'::jsonb) || jsonb_build_object(
          'outreach',
          COALESCE(raw_payload->'outreach', '{}'::jsonb) || jsonb_build_object(
            'recipientEmail', $2::text,
            'verificationStatus', $3::text,
            'verifiedAt', $4::text,
            'verificationSource', $5::text,
            'verificationEvidence', $6::text,
            'emailSuppressed', $7::boolean
          )
        ),
        updated_at = NOW()
      WHERE id = $1::uuid
    `,
    [
      leadId,
      email,
      input.status,
      verifiedAt,
      input.source.trim(),
      input.evidence.trim(),
      input.status === "invalid",
    ],
  );

  return { leadId, email, status: input.status, verifiedAt };
}

export async function assertLeadOutreachSafety(leadId: string) {
  const result = await leadNeonQuery(
    `
      SELECT
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
      WHERE id = $1::uuid AND archived_at IS NULL
    `,
    [leadId],
  );
  const row = neonRowsToObjects(result)[0];
  if (!row) throw new Error("Lead was not found.");

  const outreach = parseObject(row.outreach);
  const currentEmail = selectPrimaryEmail(
    String(row.contact_email || ""),
    String(row.website_url || ""),
  );
  if (!currentEmail) throw new Error("This lead does not have a valid email.");
  if (
    !outreach.recipientEmail ||
    outreach.recipientEmail.toLowerCase() !== currentEmail.toLowerCase()
  ) {
    throw new Error("Verify this exact current address before sending.");
  }
  if (
    outreach.emailSuppressed ||
    outreach.state === "bounced" ||
    outreach.lastBounceAt
  ) {
    throw new Error(
      "This address is suppressed because it bounced or was marked invalid.",
    );
  }
  if (
    outreach.verificationStatus !== "valid" ||
    !outreach.verifiedAt
  ) {
    throw new Error(
      "Sending is blocked until this exact address is externally verified or confirmed by correspondence.",
    );
  }
  const verifiedAt = new Date(outreach.verifiedAt).getTime();
  if (
    !Number.isFinite(verifiedAt) ||
    verifiedAt < Date.now() - 90 * 86_400_000
  ) {
    throw new Error(
      "Email verification is older than 90 days. Re-verify the address before sending.",
    );
  }

  const tags = parseArray(row.tags);
  const signals = parseArray(row.signals);
  const segment = deriveOutreachSegment({
    source: String(row.source || ""),
    company: String(row.company_name || ""),
    summary: String(row.summary || ""),
    tags,
    signals,
  });
  const snapshot = await getOutreachSafetySnapshot();
  if (snapshot.manualKillSwitch || snapshot.global.health === "paused") {
    throw new Error(snapshot.blockReason || "All outreach is paused.");
  }
  if (snapshot.segments[segment].health === "paused") {
    throw new Error(
      `${segmentLabel(segment)} outreach is paused at ${snapshot.segments[segment].bounceRate}% hard bounces.`,
    );
  }

  const variant = pitchVariantForLead(String(row.id));
  const pitchVersion = pitchVersionForLead(segment, String(row.id));
  await leadNeonQuery(
    `
      UPDATE public.lead_opportunities
      SET
        raw_payload = COALESCE(raw_payload, '{}'::jsonb) || jsonb_build_object(
          'outreach',
          COALESCE(raw_payload->'outreach', '{}'::jsonb) || jsonb_build_object(
            'recipientEmail', $2::text,
            'campaignId', $3::text,
            'segment', $4::text,
            'pitchVariant', $5::text,
            'pitchVersion', $6::text,
            'safetyCheckedAt', $7::text
          )
        ),
        updated_at = NOW()
      WHERE id = $1::uuid
    `,
    [
      String(row.id),
      currentEmail.toLowerCase(),
      CONTROLLED_OUTREACH_CAMPAIGN,
      segment,
      variant,
      pitchVersion,
      new Date().toISOString(),
    ],
  );

  return {
    segment,
    variant,
    pitchVersion,
    campaignId: CONTROLLED_OUTREACH_CAMPAIGN,
  };
}
