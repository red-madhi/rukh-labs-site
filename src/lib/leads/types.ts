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
  reachable?: boolean;
  status?: number;
  responseMs?: number;
  htmlBytes?: number;
  hasCta?: boolean;
  contactForm?: "working" | "broken" | "missing" | "unknown";
  title?: string | null;
  description?: string | null;
  technology?: string | null;
  copyrightYear?: number | null;
  checkedAt?: string;
  error?: string;
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

export type LeadCrawlStats = {
  candidates: number;
  websites_found: number;
  domain_queue: number;
  audit_queue: number;
  audited: number;
  qualified: number;
};
