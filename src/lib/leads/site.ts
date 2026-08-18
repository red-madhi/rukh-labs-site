export {
  canCrawlPath,
  fetchPublicPage,
  inspectHtml,
  isBlockedProspectUrl,
  parseSafePublicUrl,
} from "@/lib/leads/site-fetch";
export type { PageSignals, PublicFetchResult } from "@/lib/leads/site-fetch";

export {
  candidateDomainGuesses,
  searchOfficialWebsite,
  verifyOfficialWebsite,
} from "@/lib/leads/site-discovery";

export { auditWebsite } from "@/lib/leads/site-audit";
export type { WebsiteAuditResult } from "@/lib/leads/site-audit";
