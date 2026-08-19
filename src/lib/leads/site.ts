import type { CandidateRow } from "@/lib/leads/crawl";
import { clamp } from "@/lib/leads/crawl";
import { enrichPublicEmail } from "@/lib/leads/contact-enrichment";
import { auditWebsite as baseAuditWebsite } from "@/lib/leads/site-audit";
import type { WebsiteAuditResult } from "@/lib/leads/site-audit";

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

export async function auditWebsite(candidate: CandidateRow): Promise<WebsiteAuditResult> {
  const audit = await baseAuditWebsite(candidate);
  if (audit.contactEmail || !candidate.websiteUrl) return audit;

  // Free page-level enrichment is worthwhile for near-qualified opportunities too,
  // because finding a real contact path can be the difference between a useful lead
  // and a dead end. Search-API fallback is reserved for stronger opportunities.
  if (!audit.qualified && audit.score < 54) return audit;

  const enrichment = await enrichPublicEmail(
    candidate,
    audit.finalUrl || candidate.websiteUrl,
    audit.qualified || audit.score >= 70,
  );

  const enrichmentAudit = {
    ...audit.audit,
    emailEnrichment: {
      found: Boolean(enrichment.email),
      method: enrichment.method || null,
      sourceUrl: enrichment.sourceUrl || null,
      pagesChecked: enrichment.pagesChecked,
      searchUsed: enrichment.searchUsed,
      checkedAt: new Date().toISOString(),
    },
  };

  if (!enrichment.email) {
    return { ...audit, audit: enrichmentAudit };
  }

  const alreadyContactable = Boolean(audit.contactPhone || audit.contactUrl);
  const score = alreadyContactable ? audit.score : clamp(audit.score + 8);
  const qualified = audit.qualified || score >= 62;
  const signal = enrichment.method === "indexed-public-page"
    ? "A public business email was found on an indexed page related to the organization"
    : enrichment.method === "related-platform"
      ? "A public business email was found on a related booking, directory, or business platform"
      : "A public business email was found on an additional page of the organization's website";

  return {
    ...audit,
    score,
    qualified,
    contactEmail: enrichment.email,
    signals: Array.from(new Set([...audit.signals, signal])),
    risks: audit.risks.filter((risk) => !/no reliable public contact method/i.test(risk)),
    audit: enrichmentAudit,
  };
}

export type { WebsiteAuditResult } from "@/lib/leads/site-audit";
