import type { LeadOpportunity } from "@/lib/leads/types";

export type DataOpsLeadKind = "active-problem" | "partner-prospect";

export type DataOpsScoreBreakdown = {
  activeTrigger: number;
  recurringWorkflow: number;
  budgetEvidence: number;
  stackFit: number;
  targetFit: number;
  reachability: number;
  industryFit: number;
  agePenalty: number;
  riskPenalty: number;
};

export type RankedDataOpsLead = {
  lead: LeadOpportunity;
  kind: DataOpsLeadKind;
  score: number;
  qualified: boolean;
  breakdown: DataOpsScoreBreakdown;
  matchedSignals: string[];
  painHypothesis: string;
  likelyBuyer: string;
  recommendedOffer: string;
  proposedDeliverable: string;
  outreachMessage: string;
};

const QUALIFIED_SCORE = 65;
const DAY_MS = 24 * 60 * 60 * 1000;

const activeTriggerTerms = [
  "migration",
  "migrate",
  "implementation",
  "implementing",
  "broken",
  "failing",
  "failure",
  "refresh",
  "urgent",
  "deadline",
  "reconcile",
  "reconciliation",
  "manual reporting",
  "spreadsheet",
  "dashboard",
  "data cleanup",
  "data quality",
  "duplicate",
  "mapping",
  "integration",
  "consolidat",
  "automation",
  "consultant",
  "contractor",
  "freelance",
];

const recurringTerms = [
  "daily",
  "weekly",
  "monthly",
  "quarterly",
  "recurring",
  "repeat",
  "ongoing",
  "reporting cycle",
  "close process",
  "manual",
  "spreadsheet",
  "export",
  "reconciliation",
  "refresh",
  "multiple files",
  "multiple sources",
  "locations",
  "entities",
];

const budgetTerms = [
  "rfp",
  "procurement",
  "sam.gov",
  "contract",
  "contractor",
  "consultant",
  "freelance",
  "paid",
  "budget",
  "proposal",
  "implementation partner",
  "job-board",
  "job board",
];

const stackTerms = [
  "power bi",
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
];

const partnerTerms = [
  "consulting",
  "consultancy",
  "consultant",
  "managed service",
  "managed services",
  "msp",
  "systems integrator",
  "implementation partner",
  "microsoft partner",
  "power bi partner",
  "erp implementation",
  "hris implementation",
  "crm implementation",
  "fractional cfo",
  "bookkeeping",
  "accounting firm",
  "outsourced operations",
  "technology services",
  "it services",
];

const industryFitTerms = [
  "professional services",
  "finance",
  "accounting",
  "manufacturing",
  "healthcare",
  "logistics",
  "distribution",
  "construction",
  "retail",
  "multi-location",
  "nonprofit",
  "operations",
  "technology",
  "consulting",
];

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
];

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
    .toLowerCase();
}

function hasAny(text: string, terms: readonly string[]) {
  return terms.some((term) => text.includes(term));
}

function matchedTerms(text: string, terms: readonly string[], limit = 5) {
  return terms.filter((term) => text.includes(term)).slice(0, limit);
}

function clampScore(value: number) {
  return Math.max(0, Math.min(100, value));
}

function getAgeDays(lead: LeadOpportunity, now: number) {
  const timestamp = new Date(lead.discoveredAt).getTime();
  if (!Number.isFinite(timestamp)) return Number.POSITIVE_INFINITY;
  return Math.max(0, (now - timestamp) / DAY_MS);
}

function inferKind(text: string, lead: LeadOpportunity): DataOpsLeadKind {
  const partnerMatches = matchedTerms(text, partnerTerms, 10).length;
  const activeMatches = matchedTerms(text, activeTriggerTerms, 10).length;

  if (
    partnerMatches >= 2 ||
    (partnerMatches >= 1 && !lead.tags.some((tag) => ["direct ask", "rfp", "procurement", "sam.gov"].includes(tag)))
  ) {
    return "partner-prospect";
  }

  return activeMatches > 0 || lead.source === "power-bi" ? "active-problem" : "partner-prospect";
}

function inferBuyer(text: string, kind: DataOpsLeadKind) {
  if (kind === "partner-prospect") {
    if (text.includes("fractional cfo") || text.includes("accounting") || text.includes("bookkeeping")) {
      return "Owner, managing partner, or fractional CFO practice lead";
    }
    if (text.includes("msp") || text.includes("managed service") || text.includes("it services")) {
      return "Owner, services director, or solutions practice lead";
    }
    return "Owner, managing partner, delivery director, or practice lead";
  }

  if (text.includes("migration") || text.includes("implementation")) {
    return "Implementation lead, data lead, program manager, or operations sponsor";
  }
  if (text.includes("finance") || text.includes("close") || text.includes("reconciliation")) {
    return "Controller, finance operations lead, or reporting owner";
  }
  if (text.includes("power bi") || text.includes("fabric") || text.includes("dashboard")) {
    return "BI manager, analytics lead, operations director, or report owner";
  }
  return "Operations director, data owner, or manager accountable for the recurring output";
}

function inferOffer(text: string, kind: DataOpsLeadKind) {
  if (kind === "partner-prospect") {
    return {
      offer: "White-label delivery partnership",
      deliverable:
        "A fixed wholesale work package for Power BI, Power Query, reconciliation, mapping, or migration QA under NDA and a no-poaching boundary.",
    };
  }
  if (text.includes("migration") || text.includes("mapping") || text.includes("implementation")) {
    return {
      offer: "Migration Proof Sprint",
      deliverable:
        "Source-to-target mapping, transformation rules, old-versus-new reconciliation, an exception log, and a sign-off evidence package.",
    };
  }
  if (text.includes("broken") || text.includes("failing") || text.includes("failure") || text.includes("urgent")) {
    return {
      offer: "Data Fire Drill",
      deliverable:
        "A fixed-scope repair of the failing query, refresh, workbook, report, or reconciliation, followed by validation and handoff notes.",
    };
  }
  if (hasAny(text, recurringTerms)) {
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

function buildPainHypothesis(lead: LeadOpportunity, text: string, kind: DataOpsLeadKind) {
  if (kind === "partner-prospect") {
    return `${lead.company} appears to serve clients with technology, finance, or operational workflows and may need overflow capacity for data cleanup, reporting, reconciliation, or migration validation without hiring another full-time specialist.`;
  }
  if (text.includes("migration") || text.includes("implementation")) {
    return `${lead.company} appears to be moving data or reporting logic between systems. The likely risk is not the new interface—it is incomplete mappings, undocumented transformation rules, mismatched totals, and weak sign-off evidence.`;
  }
  if (text.includes("refresh") || text.includes("gateway") || text.includes("dataflow")) {
    return `${lead.company} appears to have a reporting pipeline that can fail when credentials, schemas, gateways, or upstream exports change. The useful offer is dependable output plus controls, not another isolated dashboard.`;
  }
  if (text.includes("reconciliation") || text.includes("reconcile") || text.includes("duplicate")) {
    return `${lead.company} appears to be spending human time matching records, explaining discrepancies, or correcting duplicate and missing data. That is a strong candidate for deterministic matching plus a human exception queue.`;
  }
  return `${lead.company} has a visible data or reporting need that likely includes recurring manual assembly, fragile transformations, or insufficient validation. The first objective is to define one measurable operating result and remove the repetitive mechanics.`;
}

function buildOutreach(
  lead: LeadOpportunity,
  kind: DataOpsLeadKind,
  offer: string,
  deliverable: string,
) {
  if (kind === "partner-prospect") {
    return `I came across ${lead.company} while researching firms that already advise or implement systems for business clients. Rukh Labs provides white-label Power BI, Power Query, reconciliation, mapping, and migration-QA delivery under NDA—you keep the relationship and markup, and I do not pursue your clients. A practical first step would be one fixed wholesale scope for ${deliverable.charAt(0).toLowerCase()}${deliverable.slice(1)}`;
  }

  const trigger = lead.summary.trim().replace(/\s+/g, " ");
  const evidence = trigger.length > 180 ? `${trigger.slice(0, 177)}…` : trigger;
  return `I noticed ${lead.company}'s public need around ${evidence || "data and reporting operations"}. That usually means someone is still rebuilding, correcting, or validating the same output by hand. I would approach it as a ${offer}: ${deliverable.charAt(0).toLowerCase()}${deliverable.slice(1)} If useful, I can outline the control points and a fixed first scope without requiring production data up front.`;
}

export function rankDataOpsLead(lead: LeadOpportunity, now = Date.now()): RankedDataOpsLead {
  const text = normalizeLead(lead);
  const kind = inferKind(text, lead);
  const ageDays = getAgeDays(lead, now);
  const triggerMatches = matchedTerms(text, kind === "partner-prospect" ? partnerTerms : activeTriggerTerms);
  const recurringMatches = matchedTerms(text, recurringTerms);
  const budgetMatches = matchedTerms(text, budgetTerms);
  const stackMatches = matchedTerms(text, stackTerms);
  const industryMatches = matchedTerms(text, industryFitTerms);
  const risks = matchedTerms(text, riskTerms);

  const strongTaggedTrigger = lead.tags.some((tag) =>
    ["direct ask", "rfp", "procurement", "sam.gov", "proactive signal", "proactive opportunity"].includes(tag),
  );
  const activeTrigger = strongTaggedTrigger || triggerMatches.length >= 2 ? 30 : triggerMatches.length ? 18 : 0;
  const recurringWorkflow = recurringMatches.length >= 2 ? 20 : recurringMatches.length ? 10 : 0;
  const budgetEvidence = budgetMatches.length >= 2 || lead.tags.some((tag) => ["rfp", "procurement", "sam.gov"].includes(tag)) ? 15 : budgetMatches.length ? 8 : 0;
  const stackFit = stackMatches.length >= 2 ? 10 : stackMatches.length ? 6 : 0;
  const targetFit = kind === "partner-prospect" && triggerMatches.length >= 2 ? 10 : lead.company && lead.industry ? 6 : 3;
  const reachability = lead.contactEmail || lead.contactPhone ? 10 : lead.contactUrl || lead.website || lead.sourceUrl ? 6 : lead.contactName ? 4 : 0;
  const industryFit = industryMatches.length ? 5 : kind === "partner-prospect" ? 3 : 0;
  const agePenalty = kind === "active-problem" && ageDays > 7 ? -15 : 0;
  const riskPenalty = risks.length ? -20 : lead.risks.length >= 3 ? -10 : 0;

  const breakdown: DataOpsScoreBreakdown = {
    activeTrigger,
    recurringWorkflow,
    budgetEvidence,
    stackFit,
    targetFit,
    reachability,
    industryFit,
    agePenalty,
    riskPenalty,
  };
  const score = clampScore(Object.values(breakdown).reduce((sum, value) => sum + value, 0));
  const { offer, deliverable } = inferOffer(text, kind);
  const matchedSignals = [
    ...triggerMatches.map((term) => `Trigger: ${term}`),
    ...recurringMatches.slice(0, 3).map((term) => `Recurring: ${term}`),
    ...budgetMatches.slice(0, 2).map((term) => `Budget: ${term}`),
    ...stackMatches.slice(0, 3).map((term) => `Stack: ${term}`),
    ...(lead.contactEmail || lead.contactPhone || lead.contactUrl ? ["Reachable contact path"] : []),
    ...(agePenalty ? ["Older than seven days"] : []),
    ...risks.map((term) => `Risk: ${term}`),
  ].slice(0, 10);

  return {
    lead,
    kind,
    score,
    qualified: score >= QUALIFIED_SCORE,
    breakdown,
    matchedSignals,
    painHypothesis: buildPainHypothesis(lead, text, kind),
    likelyBuyer: inferBuyer(text, kind),
    recommendedOffer: offer,
    proposedDeliverable: deliverable,
    outreachMessage: buildOutreach(lead, kind, offer, deliverable),
  };
}

export function rankDataOpsLeads(leads: LeadOpportunity[], now = Date.now()) {
  return leads
    .map((lead) => rankDataOpsLead(lead, now))
    .sort(
      (a, b) =>
        Number(b.qualified) - Number(a.qualified) ||
        b.score - a.score ||
        new Date(b.lead.discoveredAt).getTime() - new Date(a.lead.discoveredAt).getTime(),
    );
}

export const DATA_OPS_QUALIFIED_SCORE = QUALIFIED_SCORE;
