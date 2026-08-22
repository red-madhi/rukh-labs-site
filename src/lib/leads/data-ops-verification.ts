import type { LeadOpportunity } from "@/lib/leads/types";

export type DataOpsLeadKind = "active-problem" | "partner-prospect";
export type DataOpsChannel = "Direct opportunity" | "White-label partner";

export type DataOpsVerification = {
  candidate: boolean;
  kind: DataOpsLeadKind;
  channel: DataOpsChannel;
  entityName: string;
  entityVerified: boolean;
  entityConfidence: number;
  categoryVerified: boolean;
  triggerVerified: boolean;
  contactVerified: boolean;
  organizationType: string;
  sourceType: string;
  whyQualified: string[];
  exclusionReason?: string;
};

const genericEntityPattern = /^(?:unnamed prospect|bluesky user|mastodon user|public web|linkedin|x|twitter|indeed|upwork|ziprecruiter|dice|federal contracting office)$/i;
const urlLikePattern = /^(?:https?:\/\/)?(?:www\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)+(?:\/.*)?$/i;
const pageTitlePattern =
  /\b(?:power\s*bi|microsoft fabric|business intelligence|data analyst|data engineer|developer|consultant|consulting|implementation|migration|job|vacancy|position|career|hiring)\b.{0,100}(?:\||—| - )|(?:\||—| - ).{0,100}\b(?:power\s*bi|microsoft fabric|business intelligence|developer|analyst|consultant|job|career)\b/i;
const employmentPattern =
  /\b(?:full[- ]time|part[- ]time|salary|benefits|w2|resume|apply now|job opening|job posting|vacancy|position available|recruiter|candidate)\b/i;

function normalizedTags(lead: LeadOpportunity) {
  return new Set(lead.tags.map((tag) => tag.trim().toLowerCase()).filter(Boolean));
}

function textFor(lead: LeadOpportunity) {
  return [
    lead.company,
    lead.industry,
    lead.summary,
    lead.pitch,
    ...lead.tags,
    ...lead.signals,
    ...lead.risks,
  ]
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function sourceHost(lead: LeadOpportunity) {
  for (const value of [lead.website, lead.contactUrl, lead.sourceUrl]) {
    if (!value) continue;
    try {
      return new URL(value).hostname.replace(/^www\./i, "").toLowerCase();
    } catch {
      continue;
    }
  }
  return "";
}

function readableHost(host: string) {
  const label = host.split(".")[0] || host;
  return label
    .split(/[-_]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function isGovernmentOrEducationHost(host: string) {
  return /\.(?:gov|edu)$/i.test(host);
}

function isSocialHandle(value: string) {
  return /^@[a-z0-9._-]+(?:\.[a-z0-9._-]+)*$/i.test(value.trim());
}

function socialIdentityName(lead: LeadOpportunity, tags: Set<string>) {
  if (lead.contactName && isSocialHandle(lead.contactName)) return lead.contactName;
  if (isSocialHandle(lead.company)) return lead.company;

  const sourceUrl = lead.sourceUrl || lead.contactUrl;
  if (!sourceUrl) return "";
  try {
    const url = new URL(sourceUrl);
    if (tags.has("bluesky") || url.hostname === "bsky.app") {
      const actor = decodeURIComponent(url.pathname.match(/\/profile\/([^/]+)(?:\/|$)/i)?.[1] || "");
      if (!actor) return "";
      if (actor.startsWith("did:")) {
        const compact = actor.length > 24 ? `${actor.slice(0, 21)}…` : actor;
        return `Bluesky account ${compact}`;
      }
      return actor.startsWith("@") ? actor : `@${actor}`;
    }
    if (tags.has("mastodon")) {
      const account = decodeURIComponent(url.pathname.split("/").find((part) => part.startsWith("@")) || "");
      return account ? `${account}@${url.hostname.replace(/^www\./i, "")}` : "";
    }
  } catch {
    return "";
  }
  return "";
}

export function looksLikeResolvedEntityName(value: string) {
  const name = value.trim().replace(/\s+/g, " ");
  if (name.length < 2 || name.length > 120) return false;
  if (genericEntityPattern.test(name) || urlLikePattern.test(name)) return false;
  if (pageTitlePattern.test(name)) return false;
  if (/\(20\d{2}\)\s*$/.test(name) && /\b(?:consulting|implementation|guide|jobs?)\b/i.test(name)) return false;
  if (/\b(?:senior|junior|lead|principal|manager|director)\b.{0,55}\b(?:developer|analyst|engineer|consultant|architect|specialist)\b/i.test(name)) return false;
  return true;
}

function evidenceEntityName(lead: LeadOpportunity) {
  for (const signal of lead.signals) {
    const hiring = signal.match(/Hiring organization resolved from job-page metadata:\s*(.+)$/i)?.[1]?.trim();
    if (hiring && looksLikeResolvedEntityName(hiring)) return hiring;
  }

  const federal = lead.summary.match(/^(.{2,180}?)\s+published a federal\b/i)?.[1]?.trim();
  if (federal) {
    const shortened = federal.length > 120 ? federal.split(/[.|>]/).filter(Boolean).slice(-2).join(" · ").slice(0, 120) : federal;
    if (looksLikeResolvedEntityName(shortened)) return shortened;
  }

  const namedBuyer = lead.summary.match(/^(.{2,140}?)\s+(?:issued|published|posted|released)\s+(?:an?\s+)?(?:rfp|rfq|solicitation|procurement|bid)\b/i)?.[1]?.trim();
  if (namedBuyer && looksLikeResolvedEntityName(namedBuyer)) return namedBuyer;

  return "";
}

function hasPositiveExternalServicesEvidence(lead: LeadOpportunity, tags: Set<string>) {
  if (tags.has("external-services-intent")) return true;
  return lead.signals.some((signal) =>
    /contract, freelance, consulting, temporary, or project-based language was detected|outside (?:consulting|contract|freelance) help|project-based outside help/i.test(signal),
  );
}

function sourceTypeFor(lead: LeadOpportunity, tags: Set<string>) {
  if (tags.has("data-ops-partner") || tags.has("partner-service-page")) return "Verified company service page";
  if (tags.has("sam.gov")) return "SAM.gov procurement notice";
  if (tags.has("rfp") || tags.has("procurement")) return "Public procurement notice";
  if (tags.has("job-board")) return "Job / contract posting";
  if (tags.has("bluesky")) return "Bluesky post";
  if (tags.has("mastodon")) return "Mastodon post";
  if (tags.has("linkedin")) return "LinkedIn result";
  if (tags.has("x") || tags.has("twitter")) return "X result";
  return lead.sourceLabel || "Public lead source";
}

function organizationTypeFor(lead: LeadOpportunity, tags: Set<string>, kind: DataOpsLeadKind) {
  const text = textFor(lead).toLowerCase();
  if (kind === "partner-prospect") {
    if (tags.has("partner-type:fractional-finance")) return "Fractional finance / accounting firm";
    if (tags.has("partner-type:msp")) return "MSP / technology services firm";
    if (tags.has("partner-type:implementation")) return "Systems implementation consultancy";
    if (tags.has("partner-type:bi-consultancy")) return "BI / Microsoft consultancy";
    if (/fractional cfo|bookkeep|accounting/.test(text)) return "Fractional finance / accounting firm";
    if (/managed services|\bmsp\b|it services/.test(text)) return "MSP / technology services firm";
    return "Data / implementation consultancy";
  }
  if (tags.has("sam.gov")) return "Federal procurement buyer";
  if (tags.has("rfp") || tags.has("procurement")) return "Public procurement buyer";
  if (tags.has("job-board")) return "Organization with an active project / role";
  if (tags.has("bluesky") || tags.has("mastodon") || tags.has("linkedin") || tags.has("x")) {
    return "Direct public buyer / operator";
  }
  return "Organization with an active data-operations need";
}

export function verifyDataOpsLead(lead: LeadOpportunity): DataOpsVerification {
  const tags = normalizedTags(lead);
  const text = textFor(lead);
  const lower = text.toLowerCase();
  const host = sourceHost(lead);

  const partnerTagged =
    tags.has("data-ops-partner") &&
    tags.has("entity-verified") &&
    tags.has("partner-service-page");
  const procurementTrigger = tags.has("sam.gov") || tags.has("rfp") || tags.has("procurement");
  const directTrigger = tags.has("explicit-buying-trigger") || tags.has("direct ask");
  const servicesTrigger = tags.has("job-board") && hasPositiveExternalServicesEvidence(lead, tags);
  const activeTrigger = procurementTrigger || directTrigger || servicesTrigger;
  const kind: DataOpsLeadKind = partnerTagged ? "partner-prospect" : "active-problem";
  const candidate = partnerTagged || activeTrigger;
  const evidenceName = evidenceEntityName(lead);
  const socialName = directTrigger ? socialIdentityName(lead, tags) : "";
  const explicitEntityTag = tags.has("entity-verified") || tags.has("organization-resolved");
  const storedName = lead.company.trim().replace(/\s+/g, " ");
  const storedNameResolved = looksLikeResolvedEntityName(storedName);

  let entityName = "Unresolved entity";
  if (partnerTagged && storedNameResolved) {
    entityName = storedName;
  } else if (evidenceName) {
    entityName = evidenceName;
  } else if (procurementTrigger) {
    if (tags.has("sam.gov")) entityName = "Federal buyer via SAM.gov";
    else if (isGovernmentOrEducationHost(host)) entityName = readableHost(host);
    else entityName = "Unresolved procurement buyer";
  } else if (directTrigger && socialName) {
    entityName = socialName;
  } else if (directTrigger && explicitEntityTag && storedNameResolved) {
    entityName = storedName;
  } else if (tags.has("job-board") && evidenceName) {
    entityName = evidenceName;
  }

  const resolvedEntityName = looksLikeResolvedEntityName(entityName) || Boolean(socialName);
  let entityVerified = false;
  if (partnerTagged) {
    entityVerified = explicitEntityTag && storedNameResolved;
  } else if (procurementTrigger) {
    entityVerified =
      Boolean(evidenceName) ||
      (tags.has("sam.gov") && host === "sam.gov") ||
      (isGovernmentOrEducationHost(host) && Boolean(host));
  } else if (tags.has("job-board")) {
    entityVerified = Boolean(evidenceName) || (explicitEntityTag && storedNameResolved);
  } else if (directTrigger && (tags.has("bluesky") || tags.has("mastodon"))) {
    entityVerified = Boolean(socialName);
  } else if (directTrigger) {
    entityVerified = explicitEntityTag && storedNameResolved;
  }

  const categoryVerified = kind === "partner-prospect" ? partnerTagged : true;
  const triggerVerified = kind === "active-problem" ? activeTrigger : true;
  const contactVerified = Boolean(
    lead.contactEmail ||
      lead.contactPhone ||
      lead.contactUrl ||
      (directTrigger && lead.sourceUrl),
  );

  let entityConfidence = 0;
  if (partnerTagged) entityConfidence = 82;
  else if (procurementTrigger && entityVerified) {
    entityConfidence = evidenceName ? 91 : tags.has("sam.gov") ? 80 : 82;
  } else if (tags.has("job-board") && entityVerified) entityConfidence = evidenceName ? 86 : 78;
  else if (directTrigger && socialName) entityConfidence = socialName.includes("did:") ? 72 : 78;
  else if (entityVerified) entityConfidence = 72;
  else if (resolvedEntityName) entityConfidence = 48;
  else entityConfidence = 20;

  if (lead.website) entityConfidence += 6;
  if (lead.contactEmail || lead.contactPhone) entityConfidence += 6;
  else if (lead.contactUrl) entityConfidence += 3;
  if (host && partnerTagged) entityConfidence += 4;
  if (pageTitlePattern.test(lead.company) || urlLikePattern.test(lead.company)) {
    if (!evidenceName && !socialName && !procurementTrigger) entityConfidence -= 35;
  }
  entityConfidence = Math.max(0, Math.min(99, entityConfidence));

  const whyQualified: string[] = [];
  if (partnerTagged) whyQualified.push("Company service page explicitly verified as a delivery-partner category");
  if (procurementTrigger) whyQualified.push("Source contains a formal procurement / solicitation trigger");
  if (directTrigger) whyQualified.push("Source contains an explicit public request for outside help");
  if (servicesTrigger) whyQualified.push("Positive contract / freelance / project evidence indicates outside-service intent");
  if (evidenceName) whyQualified.push(`Organization resolved from source evidence: ${evidenceName}`);
  else if (socialName) whyQualified.push(`Public social identity resolved from the source URL: ${socialName}`);
  else if (entityVerified && procurementTrigger) whyQualified.push("Procurement source domain independently verifies the buyer channel");
  else if (entityVerified) whyQualified.push("Buyer or partner identity passed entity-resolution checks");
  if (contactVerified) whyQualified.push("A usable public contact or reply path is available");
  if (lead.website && kind === "partner-prospect") whyQualified.push("A first-party company website was resolved");

  let exclusionReason: string | undefined;
  if (!candidate) {
    exclusionReason = "No verified buying trigger or purpose-built partner verification was found.";
  } else if (!entityVerified) {
    exclusionReason = "The buyer / company identity could not be verified strongly enough for outreach.";
  } else if (!categoryVerified) {
    exclusionReason = "The organization was not verified as a white-label partner category.";
  } else if (!triggerVerified) {
    exclusionReason = "No explicit commercial data-operations trigger was verified.";
  } else if (kind === "active-problem" && tags.has("job-board") && employmentPattern.test(lower) && !servicesTrigger) {
    exclusionReason = "This appears to be ordinary employment rather than outside project work.";
  }

  return {
    candidate,
    kind,
    channel: kind === "partner-prospect" ? "White-label partner" : "Direct opportunity",
    entityName,
    entityVerified,
    entityConfidence,
    categoryVerified,
    triggerVerified,
    contactVerified,
    organizationType: organizationTypeFor(lead, tags, kind),
    sourceType: sourceTypeFor(lead, tags),
    whyQualified,
    exclusionReason,
  };
}
