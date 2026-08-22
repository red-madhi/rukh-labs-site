import {
  verifyDataOpsLead,
  type DataOpsLeadKind,
  type DataOpsVerification,
} from "@/lib/leads/data-ops-verification";
import type { LeadOpportunity } from "@/lib/leads/types";

export type { DataOpsLeadKind } from "@/lib/leads/data-ops-verification";

export type DataOpsScoreBreakdown = {
  entityVerification: number;
  commercialTrigger: number;
  categoryFit: number;
  stackFit: number;
  workflowFit: number;
  reachability: number;
  freshness: number;
  riskPenalty: number;
};

export type RankedDataOpsLead = {
  lead: LeadOpportunity;
  kind: DataOpsLeadKind;
  score: number;
  qualified: boolean;
  breakdown: DataOpsScoreBreakdown;
  verification: DataOpsVerification;
  matchedSignals: string[];
  painHypothesis: string;
  likelyBuyer: string;
  recommendedOffer: string;
  proposedDeliverable: string;
  outreachMessage: string;
};

const QUALIFIED_SCORE = 65;
const DAY_MS = 24 * 60 * 60 * 1000;

const recurringTerms = [
  "daily",
  "weekly",
  "monthly",
  "quarterly",
  "recurring",
  "repeat",
  "ongoing",
  "manual reporting",
  "spreadsheet",
  "export",
  "reconciliation",
  "refresh",
  "multiple files",
  "multiple sources",
  "locations",
  "entities",
  "close process",
] as const;

const stackTerms = [
  "power bi",
  "microsoft fabric",
  "fabric",
  "power query",
  "excel",
  "sql",
  "tableau",
  "sharepoint",
  "sap",
  "workday",
  "netsuite",
  "salesforce",
  "dynamics",
  "erp",
  "hris",
  "crm",
  "csv",
  "dataflow",
  "gateway",
] as const;

const migrationTerms = [
  "migration",
  "migrate",
  "mapping",
  "source-to-target",
  "implementation",
  "reconciliation",
  "old-versus-new",
] as const;

const emergencyTerms = [
  "broken",
  "failing",
  "failure",
  "urgent",
  "asap",
  "blocked",
  "deadline",
  "refresh failed",
  "gateway",
] as const;

const riskTerms = [
  "full-time only",
  "w2 only",
  "no agencies",
  "no consultants",
  "no contractors",
  "unpaid",
  "commission only",
  "equity only",
  "security clearance required",
] as const;

function normalizeLead(lead: LeadOpportunity) {
  return [
    lead.company,
    lead.industry,
    lead.location,
    lead.summary,
    lead.pitch,
    lead.sourceLabel,
    ...lead.tags,
    ...lead.signals,
    ...lead.risks,
  ]
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function matchedTerms(text: string, terms: readonly string[], limit = 6) {
  return terms.filter((term) => text.includes(term)).slice(0, limit);
}

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function getAgeDays(lead: LeadOpportunity, now: number) {
  const timestamp = new Date(lead.discoveredAt).getTime();
  if (!Number.isFinite(timestamp)) return Number.POSITIVE_INFINITY;
  return Math.max(0, (now - timestamp) / DAY_MS);
}

function inferBuyer(text: string, verification: DataOpsVerification) {
  if (verification.kind === "partner-prospect") {
    if (/fractional cfo|accounting|bookkeep/.test(text)) {
      return "Owner, managing partner, or fractional-CFO practice lead";
    }
    if (/managed services|\bmsp\b|it services/.test(text)) {
      return "Owner, services director, or solutions practice lead";
    }
    return "Owner, managing partner, delivery director, or data / analytics practice lead";
  }

  if (/migration|implementation|mapping|source-to-target/.test(text)) {
    return "Implementation lead, data lead, program manager, or operations sponsor";
  }
  if (/finance|close process|reconciliation/.test(text)) {
    return "Controller, finance-operations lead, or reporting owner";
  }
  if (/power bi|fabric|dashboard|reporting/.test(text)) {
    return "BI manager, analytics lead, operations director, or report owner";
  }
  return "Operations director, data owner, or manager accountable for the recurring output";
}

function inferOffer(text: string, verification: DataOpsVerification) {
  if (verification.kind === "partner-prospect") {
    return {
      offer: "White-label delivery partnership",
      deliverable:
        "One fixed wholesale work package for Power BI, Power Query, reconciliation, mapping, or migration QA under NDA and a no-poaching boundary.",
    };
  }
  if (migrationTerms.some((term) => text.includes(term))) {
    return {
      offer: "Migration Proof Sprint",
      deliverable:
        "Source-to-target mapping, transformation rules, old-versus-new reconciliation, an exception log, and a sign-off evidence package.",
    };
  }
  if (emergencyTerms.some((term) => text.includes(term))) {
    return {
      offer: "Data Fire Drill",
      deliverable:
        "A fixed-scope repair of the failing query, refresh, workbook, report, or reconciliation, followed by validation and handoff notes.",
    };
  }
  if (recurringTerms.some((term) => text.includes(term))) {
    return {
      offer: "Process Buyout",
      deliverable:
        "A controlled recurring workflow with automated transformation, validation, exception handling, run logging, and a documented handoff.",
    };
  }
  return {
    offer: "Workflow Diagnostic",
    deliverable:
      "A current-state process map, source inventory, failure analysis, control design, and fixed implementation quote.",
  };
}

function buildPainHypothesis(
  lead: LeadOpportunity,
  text: string,
  verification: DataOpsVerification,
) {
  const entity = verification.entityName;
  if (verification.kind === "partner-prospect") {
    return `${entity} has been verified from a first-party service page as a firm that already delivers BI, data, implementation, or adjacent client work. The opportunity is overflow / specialist capacity: Rukh Labs can take bounded Power BI, Power Query, reconciliation, mapping, and migration-QA work without competing for the client relationship.`;
  }
  if (/migration|implementation|mapping|source-to-target/.test(text)) {
    return `${entity} has a verified active migration or implementation trigger. The likely delivery risk is incomplete field mappings, undocumented transformations, mismatched totals, and weak acceptance evidence—not merely the new interface.`;
  }
  if (/refresh|gateway|dataflow|broken|failing|blocked/.test(text)) {
    return `${entity} has a verified active reporting / data problem. The useful offer is a repaired output plus controls that detect missing files, schema drift, failed refreshes, duplicates, or reconciliation gaps.`;
  }
  if (/reconciliation|reconcile|duplicate|matching/.test(text)) {
    return `${entity} has a verified commercial signal involving matching or reconciliation. The likely win is deterministic matching for routine records plus a human exception queue for ambiguous cases.`;
  }
  return `${entity} has a verified public buying trigger for data or reporting work. The first objective is to define one measurable operating result, remove the repetitive mechanics, and prove the resulting output with explicit controls.`;
}

function buildOutreach(
  lead: LeadOpportunity,
  verification: DataOpsVerification,
  offer: string,
  deliverable: string,
) {
  const entity = verification.entityName;
  if (verification.kind === "partner-prospect") {
    return `I came across ${entity} through your company’s published BI / data services. Rukh Labs provides white-label Power BI, Power Query, reconciliation, mapping, and migration-QA delivery under NDA—you keep the client relationship and markup, and I do not pursue your clients. If overflow or specialist capacity ever becomes useful, I can start with one fixed wholesale scope: ${deliverable.charAt(0).toLowerCase()}${deliverable.slice(1)}`;
  }

  const trigger = lead.summary.trim().replace(/\s+/g, " ");
  const evidence = trigger.length > 180 ? `${trigger.slice(0, 177)}…` : trigger;
  return `I saw the public ${verification.sourceType.toLowerCase()} tied to ${entity}: ${evidence || "an active data / reporting need"} I’d approach it as a ${offer}: ${deliverable.charAt(0).toLowerCase()}${deliverable.slice(1)} If the need is still active, I can outline the control points and a fixed first scope without requiring production data up front.`;
}

function canonicalHost(value?: string) {
  if (!value) return "";
  try {
    return new URL(value).hostname.replace(/^www\./i, "").toLowerCase();
  } catch {
    return "";
  }
}

function dedupeKey(item: RankedDataOpsLead) {
  if (item.kind === "partner-prospect") {
    const host = canonicalHost(item.lead.website) || canonicalHost(item.lead.contactUrl) || canonicalHost(item.lead.sourceUrl);
    return `partner:${host || item.verification.entityName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  }
  return `active:${item.lead.sourceUrl || item.lead.id}`;
}

export function rankDataOpsLead(lead: LeadOpportunity, now = Date.now()): RankedDataOpsLead {
  const text = normalizeLead(lead);
  const verification = verifyDataOpsLead(lead);
  const ageDays = getAgeDays(lead, now);
  const recurringMatches = matchedTerms(text, recurringTerms);
  const stackMatches = matchedTerms(text, stackTerms);
  const riskMatches = matchedTerms(text, riskTerms);

  const entityVerification = verification.entityVerified
    ? verification.entityConfidence >= 90
      ? 25
      : verification.entityConfidence >= 80
        ? 23
        : 20
    : 0;
  const commercialTrigger = verification.kind === "active-problem"
    ? verification.triggerVerified
      ? 25
      : 0
    : verification.categoryVerified
      ? 20
      : 0;
  const categoryFit = verification.kind === "partner-prospect"
    ? verification.categoryVerified
      ? 15
      : 0
    : lead.tags.some((tag) => ["rfp", "procurement", "sam.gov", "external-services-intent"].includes(tag.toLowerCase()))
      ? 12
      : 8;
  const stackFit = stackMatches.length >= 2 ? 10 : stackMatches.length ? 7 : 0;
  const workflowFit = recurringMatches.length >= 2 ? 10 : recurringMatches.length ? 6 : 3;
  const reachability = lead.contactEmail || lead.contactPhone
    ? 10
    : verification.contactVerified
      ? 7
      : 0;
  const freshness = verification.kind === "partner-prospect"
    ? ageDays <= 30
      ? 5
      : 2
    : ageDays <= 1
      ? 5
      : ageDays <= 7
        ? 3
        : 0;
  const riskPenalty = riskMatches.length ? -20 : lead.risks.length >= 3 ? -10 : 0;

  const breakdown: DataOpsScoreBreakdown = {
    entityVerification,
    commercialTrigger,
    categoryFit,
    stackFit,
    workflowFit,
    reachability,
    freshness,
    riskPenalty,
  };
  const score = clampScore(Object.values(breakdown).reduce((sum, value) => sum + value, 0));
  const qualified =
    verification.candidate &&
    verification.entityVerified &&
    verification.entityConfidence >= 70 &&
    verification.categoryVerified &&
    verification.triggerVerified &&
    !verification.exclusionReason &&
    score >= QUALIFIED_SCORE;
  const { offer, deliverable } = inferOffer(text, verification);
  const matchedSignals = [
    ...verification.whyQualified,
    ...stackMatches.slice(0, 4).map((term) => `Stack evidence: ${term}`),
    ...recurringMatches.slice(0, 3).map((term) => `Workflow evidence: ${term}`),
    ...(verification.exclusionReason ? [`Excluded: ${verification.exclusionReason}`] : []),
    ...riskMatches.map((term) => `Risk: ${term}`),
  ].slice(0, 12);

  return {
    lead,
    kind: verification.kind,
    score,
    qualified,
    breakdown,
    verification,
    matchedSignals,
    painHypothesis: buildPainHypothesis(lead, text, verification),
    likelyBuyer: inferBuyer(text, verification),
    recommendedOffer: offer,
    proposedDeliverable: deliverable,
    outreachMessage: buildOutreach(lead, verification, offer, deliverable),
  };
}

export function rankDataOpsLeads(leads: LeadOpportunity[], now = Date.now()) {
  const ranked = leads
    .map((lead) => rankDataOpsLead(lead, now))
    .filter((item) => item.verification.candidate)
    .sort(
      (a, b) =>
        Number(b.qualified) - Number(a.qualified) ||
        b.score - a.score ||
        b.verification.entityConfidence - a.verification.entityConfidence ||
        new Date(b.lead.discoveredAt).getTime() - new Date(a.lead.discoveredAt).getTime(),
    );

  const deduped = new Map<string, RankedDataOpsLead>();
  for (const item of ranked) {
    const key = dedupeKey(item);
    const existing = deduped.get(key);
    if (!existing || item.score > existing.score) deduped.set(key, item);
  }
  return [...deduped.values()].sort(
    (a, b) =>
      Number(b.qualified) - Number(a.qualified) ||
      b.score - a.score ||
      b.verification.entityConfidence - a.verification.entityConfidence,
  );
}

export const DATA_OPS_QUALIFIED_SCORE = QUALIFIED_SCORE;
