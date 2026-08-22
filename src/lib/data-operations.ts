export const DATA_OPS_REASON = "Data operations project";
export const DATA_OPS_PATH = "/data-ops";
export const DATA_OPS_INTAKE_HREF = `${DATA_OPS_PATH}#intake`;

export type DataOpsOffer = {
  id: "fire-drill" | "diagnostic" | "process-buyout" | "care" | "migration-proof";
  name: string;
  price: string;
  priceNote: string;
  summary: string;
  bestFor: string;
  features: readonly string[];
  recommended?: boolean;
  minimumPrice: number;
  maximumPrice: number;
  billingUnit?: "project" | "month";
};

export const dataOpsOffers: readonly DataOpsOffer[] = [
  {
    id: "fire-drill",
    name: "Data Fire Drill",
    price: "From $395",
    priceNote: "Fixed-scope emergency repair",
    summary:
      "Repair one broken workbook, query, refresh, reconciliation, report, or recurring file process without turning it into an open-ended consulting engagement.",
    bestFor: "A specific failure with a real deadline and a clearly bounded outcome.",
    features: [
      "Rapid technical triage",
      "One defined repair outcome",
      "Validation of the repaired output",
      "Plain-language handoff notes",
    ],
    minimumPrice: 395,
    maximumPrice: 750,
    billingUnit: "project",
  },
  {
    id: "diagnostic",
    name: "Workflow Diagnostic",
    price: "$750",
    priceNote: "Credited toward an approved implementation",
    summary:
      "Map the process, identify failure points and wasted effort, define controls, and receive a fixed implementation scope instead of a vague discovery deck.",
    bestFor: "Recurring work that is painful but not yet cleanly scoped.",
    features: [
      "Source and output inventory",
      "Current-state process map",
      "Risk and failure analysis",
      "Automation design and fixed quote",
    ],
    minimumPrice: 750,
    maximumPrice: 750,
    billingUnit: "project",
  },
  {
    id: "process-buyout",
    name: "Process Buyout",
    price: "$3k–$10k",
    priceNote: "Fixed implementation scope",
    summary:
      "Turn one recurring spreadsheet, reporting, reconciliation, or file-handling process into a controlled workflow your team does not have to rebuild every cycle.",
    bestFor: "Weekly or monthly work that consumes hours, depends on one person, or fails silently.",
    features: [
      "Up to three input sources",
      "Automated transformation and validation",
      "Exception queue and run logging",
      "Runbook plus 30-day defect warranty",
    ],
    recommended: true,
    minimumPrice: 3000,
    maximumPrice: 10000,
    billingUnit: "project",
  },
  {
    id: "care",
    name: "Data Ops Care",
    price: "$750–$2.5k/mo",
    priceNote: "Managed operation and monitoring",
    summary:
      "Keep an automated process healthy after launch with scheduled runs, failure monitoring, reruns, source-change repair, and small continuous improvements.",
    bestFor: "Teams that want an accountable owner instead of another unattended automation.",
    features: [
      "Run and refresh monitoring",
      "Schema-change alerts",
      "Exception and failure response",
      "Monthly health summary",
    ],
    minimumPrice: 750,
    maximumPrice: 2500,
    billingUnit: "month",
  },
  {
    id: "migration-proof",
    name: "Migration Proof Sprint",
    price: "$5k–$15k",
    priceNote: "Source-to-target validation package",
    summary:
      "Create the mapping, transformation rules, reconciliation evidence, exception log, and sign-off package needed to prove a migration actually worked.",
    bestFor: "ERP, HRIS, CRM, BI, or reporting migrations where incorrect data is expensive.",
    features: [
      "Source-to-target mapping",
      "Transformation and matching rules",
      "Old-versus-new reconciliation",
      "Testing evidence and sign-off package",
    ],
    minimumPrice: 5000,
    maximumPrice: 15000,
    billingUnit: "project",
  },
] as const;

export const dataOpsFaqs = [
  {
    question: "Is this just Power BI consulting?",
    answer:
      "No. Power BI may be part of the solution, but the service is built around owning an operating process: collecting inputs, cleaning and matching data, validating totals, routing exceptions, producing the output, and monitoring what can break.",
  },
  {
    question: "Do you need access to production systems before we talk?",
    answer:
      "No. The first conversation should use a process description, redacted screenshots, sample layouts, or synthetic files. Secure access and data-handling requirements are agreed before any real data is transferred.",
  },
  {
    question: "Can you work with an internal IT team or existing consultant?",
    answer:
      "Yes. Rukh Labs can own a defined workstream, provide white-label delivery, or handle reconciliation and migration QA while another firm manages the broader implementation.",
  },
  {
    question: "What tools do you work with?",
    answer:
      "Typical work uses Excel, CSV files, Power Query, Power BI, SQL, Python, APIs, SharePoint, and exports from ERP, CRM, HRIS, finance, or operational systems. The tool is selected after the process and control requirements are clear.",
  },
  {
    question: "Will AI make decisions about my data?",
    answer:
      "Not by default. AI can accelerate profiling, code generation, documentation, and anomaly review, but deterministic controls, reconciliation rules, human approval points, and audit evidence remain the core of the delivery.",
  },
  {
    question: "What is not a good fit?",
    answer:
      "Unbounded staff augmentation, vague build-us-an-AI requests, unpaid discovery, projects requiring unauthorized access, or regulated production work without an agreed security and compliance path are not a fit.",
  },
] as const;

export function getDataOpsIntakeHref(offerId?: DataOpsOffer["id"]) {
  if (!offerId) return DATA_OPS_INTAKE_HREF;
  return `${DATA_OPS_PATH}?offer=${encodeURIComponent(offerId)}#intake`;
}
