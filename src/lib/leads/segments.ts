import type { LeadOpportunity } from "@/lib/leads/types";

export type OutreachSegment = "website" | "power-bi" | "data-ops" | "partners";
export type PitchVariant = "A" | "B";

export const CONTROLLED_OUTREACH_CAMPAIGN = "controlled-reset-2026-08";

const partnerPattern = /\b(?:consult(?:ancy|ing|ants?)|managed\s+(?:it|service)|msp\b|implementation\s+(?:firm|partner|consult)|microsoft\s+partner|erp\b|hris\b|crm\b|fractional\s+cfo|bookkeep(?:er|ing)|outsourced\s+(?:finance|operations)|systems?\s+integrator)\b/i;
const dataOpsPattern = /\b(?:reconcil(?:e|iation)|recurring\s+(?:report|workflow|process)|reporting\s+(?:automation|process|workflow|modernization)|spreadsheet\s+automation|data\s+(?:migration|mapping|validation|cleanup|quality)|source[- ]to[- ]target|power\s*query|dataflow|tableau[- ]to[- ]power\s*bi|schema\s+(?:change|mapping)|exception\s+(?:queue|report)|manual\s+report|month[- ]end\s+report|weekly\s+report)\b/i;

export function deriveOutreachSegment(input: {
  source?: string | null;
  tags?: readonly string[];
  company?: string | null;
  summary?: string | null;
  signals?: readonly string[];
}): OutreachSegment {
  if (input.source !== "power-bi") return "website";

  const tags = new Set(
    (input.tags ?? []).map((tag) => tag.trim().toLowerCase()),
  );
  const text = [
    input.company,
    input.summary,
    ...(input.signals ?? []),
    ...(input.tags ?? []),
  ]
    .filter(Boolean)
    .join(" | ");

  if (
    tags.has("channel-partner") ||
    tags.has("partner-prospect") ||
    tags.has("white-label") ||
    partnerPattern.test(text)
  ) {
    return "partners";
  }

  if (
    tags.has("data-ops") ||
    tags.has("process-buyout") ||
    tags.has("migration-proof") ||
    tags.has("reconciliation") ||
    tags.has("reporting-automation") ||
    dataOpsPattern.test(text)
  ) {
    return "data-ops";
  }

  return "power-bi";
}

export function segmentForLead(
  lead: Pick<
    LeadOpportunity,
    "source" | "tags" | "company" | "summary" | "signals"
  >,
) {
  return deriveOutreachSegment({
    source: lead.source,
    tags: lead.tags,
    company: lead.company,
    summary: lead.summary,
    signals: lead.signals,
  });
}

export function segmentLabel(segment: OutreachSegment) {
  if (segment === "power-bi") return "Power BI";
  if (segment === "data-ops") return "Data Ops";
  if (segment === "partners") return "Partners";
  return "Website";
}

function stableHash(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function pitchVariantForLead(leadId: string): PitchVariant {
  return stableHash(leadId || "unassigned") % 2 === 0 ? "A" : "B";
}

export function pitchVersionForLead(
  segment: OutreachSegment,
  leadId: string,
) {
  return `${segment}-2026-08-${pitchVariantForLead(leadId).toLowerCase()}`;
}

export const OUTREACH_SEGMENTS: readonly OutreachSegment[] = [
  "website",
  "power-bi",
  "data-ops",
  "partners",
];
