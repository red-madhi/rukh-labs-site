export type LeadSource =
  | "intent"
  | "new-business"
  | "site-audit"
  | "inbound"
  | "referral";

export type LeadStatus =
  | "new"
  | "contacted"
  | "replied"
  | "meeting"
  | "proposal"
  | "won"
  | "lost"
  | "ignored";

export type LeadPriority = "hot" | "strong" | "watch";

export type LeadAudit = {
  performance?: number;
  accessibility?: number;
  seo?: number;
  mobile?: number;
  https?: boolean;
  contactForm?: "working" | "broken" | "missing" | "unknown";
};

export type LeadOpportunity = {
  id: string;
  source: LeadSource;
  sourceLabel: string;
  sourceUrl?: string;
  discoveredAt: string;
  company: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  contactUrl?: string;
  website?: string;
  location: string;
  industry: string;
  summary: string;
  score: number;
  priority: LeadPriority;
  status: LeadStatus;
  signals: string[];
  risks: string[];
  tags: string[];
  pitch: string;
  audit?: LeadAudit;
  sample?: boolean;
};

export type LeadCollectorStatus = "ready" | "needs-setup" | "planned" | "error";

export type LeadCollectorState = {
  id: string;
  name: string;
  description: string;
  cadence: string;
  status: LeadCollectorStatus;
  lastRun?: string;
  lastSuccess?: string;
  lastItems?: number;
  lastError?: string;
};
