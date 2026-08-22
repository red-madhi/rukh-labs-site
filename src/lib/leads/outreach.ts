import type { LeadOpportunity } from "@/lib/leads/types";
import {
  CONTROLLED_OUTREACH_CAMPAIGN,
  pitchVariantForLead,
  pitchVersionForLead,
  segmentForLead,
  type OutreachSegment,
  type PitchVariant,
} from "@/lib/leads/segments";

export type OutreachTouch = {
  label: string;
  timing: string;
  businessDaysAfterPrevious: number;
  text: string;
  wordCount: number;
};

export type OutreachPlan = {
  subject: string;
  firstEmail: string;
  wordCount: number;
  touches: OutreachTouch[];
  approach: string[];
  tone: string;
  segment: OutreachSegment;
  variant: PitchVariant;
  pitchVersion: string;
  campaignId: string;
};

export const OUTREACH_RESEARCH = {
  averageReply: "3.43%",
  topQuartileReply: "5.5%+",
  topDecileReply: "10.7%+",
  firstTouchReplyShare: "58%",
  followUpReplyShare: "42%",
  targetFirstEmailWords: "50–90",
  hardCeilingWords: 110,
  recommendedTouches: 3,
  followUpSpacing: "3 business days, then 4 business days",
  hardBouncePauseRate: "3% by source",
  emergencyGlobalBounceRate: "10%",
  testDecisions: [
    "50 verified deliveries and zero replies: rewrite the subject and opening.",
    "100 verified deliveries, at least one follow-up, and zero replies: retire the pitch.",
    "150–200 verified deliveries and fewer than two replies: change the offer, targeting, or price.",
  ],
  sources: [
    {
      name: "Gong — 28M+ cold emails",
      href: "https://www.gong.io/blog/does-cold-email-even-work-any-more-heres-what-the-data-says",
    },
    {
      name: "Instantly — billions of cold-email interactions",
      href: "https://instantly.ai/cold-email-benchmark-report-2026",
    },
    {
      name: "Lavender — 231,818 recent cold emails / ~50k inboxes",
      href: "https://www.lavender.ai/blog/the-cold-email-benchmark-report",
    },
    {
      name: "Belkins + Reply.io — 5.5M subject-line emails",
      href: "https://belkins.io/blog/b2b-cold-email-subject-line-statistics",
    },
  ],
} as const;

function words(value: string) {
  return value.trim() ? value.trim().split(/\s+/).length : 0;
}

function withFooter(value: string, path = "") {
  const normalized = value.trimEnd();
  const footer = `rukhlabs.com${path}`;
  if (normalized.toLowerCase().endsWith(footer.toLowerCase())) return normalized;
  return `${normalized}\n\n${footer}`;
}

function firstName(value?: string) {
  const cleaned = value?.trim().replace(/^@/, "");
  if (!cleaned) return "";
  const token = cleaned.split(/[\s,|/]+/)[0] || "";
  return token.length > 1 && !/^(team|staff|owner|manager)$/i.test(token) ? token : "";
}

function greeting(lead: LeadOpportunity) {
  const name = firstName(lead.contactName);
  return name ? `Hi ${name},` : `Hi ${lead.company} team,`;
}

function compact(value: string, max = 150) {
  const cleaned = value.replace(/\s+/g, " ").trim().replace(/[.!?]+$/, "");
  if (cleaned.length <= max) return cleaned;
  return `${cleaned.slice(0, max - 1).replace(/\s+\S*$/, "")}…`;
}

function shortCompany(lead: LeadOpportunity) {
  return lead.company
    .replace(/\b(?:LLC|PLLC|INC\.?|CORP\.?|LTD\.?)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim()
    .split(/\s+/)
    .slice(0, 3)
    .join(" ");
}

function observationFromSignal(signal: string) {
  const lower = signal.toLowerCase();
  const seconds = signal.match(/(\d+(?:\.\d+)?)\s*seconds?/i)?.[1];
  const year = signal.match(/(?:dated|copyright).*?(20\d{2})/i)?.[1];

  if (/parked|for sale|under construction|coming soon/.test(lower)) return "the domain is showing a parked or unfinished page";
  if (/not using https|http instead of https/.test(lower)) return "the site is still loading without HTTPS";
  if (/mobile viewport|mobile configuration/.test(lower)) return "the site is missing the setup that helps it display properly on phones";
  if (/inquiry or booking form|contact form.*missing|no inquiry/.test(lower)) return "there does not appear to be a simple inquiry or booking form";
  if (/call-to-action|clear.*cta|no clear quote|no clear.*contact/.test(lower)) return "the next step for a new customer is not especially obvious";
  if (/response.*slow|took.*seconds|relatively slow/.test(lower)) return seconds ? `the homepage took about ${seconds} seconds to respond` : "the homepage was noticeably slow to respond";
  if (/missing.*page title|no.*page title/.test(lower)) return "the homepage is missing a useful page title";
  if (/meta description/.test(lower)) return "the homepage is missing the description search engines normally use";
  if (/alternative text|alt text/.test(lower)) return "many images are missing accessibility descriptions";
  if (/copyright/.test(lower) && year) return `the site still shows a ${year} copyright date`;
  return compact(signal.charAt(0).toLowerCase() + signal.slice(1), 140);
}

function usableSignals(lead: LeadOpportunity) {
  return lead.signals
    .filter((signal) => !/usable public contact path|organization was formed|captured directly|discovered from/i.test(signal))
    .map(observationFromSignal)
    .filter(Boolean);
}

function finishPlan(input: {
  lead: LeadOpportunity;
  segment: OutreachSegment;
  variant: PitchVariant;
  subjectA: string;
  subjectB: string;
  firstEmail: string;
  followUp1: string;
  followUp2: string;
  approach: string[];
  tone: string;
  footerPath?: string;
}): OutreachPlan {
  const firstEmail = withFooter(input.firstEmail, input.footerPath);
  const followUp1 = withFooter(input.followUp1, input.footerPath);
  const followUp2 = withFooter(input.followUp2, input.footerPath);
  return {
    subject: input.variant === "A" ? input.subjectA : input.subjectB,
    firstEmail,
    wordCount: words(firstEmail),
    touches: [
      { label: "Follow-up 1", timing: "3 business days later", businessDaysAfterPrevious: 3, text: followUp1, wordCount: words(followUp1) },
      { label: "Follow-up 2", timing: "4 business days later", businessDaysAfterPrevious: 4, text: followUp2, wordCount: words(followUp2) },
    ],
    approach: input.approach,
    tone: input.tone,
    segment: input.segment,
    variant: input.variant,
    pitchVersion: pitchVersionForLead(input.segment, input.lead.id),
    campaignId: CONTROLLED_OUTREACH_CAMPAIGN,
  };
}

function websitePlan(lead: LeadOpportunity, variant: PitchVariant) {
  const hello = greeting(lead);
  const observations = usableSignals(lead);
  const primary = observations[0] || "there are a couple of places where the path to contacting you could be clearer";
  const secondary = observations[1] || "I would fix the customer path before adding more features";
  const company = shortCompany(lead);
  const intent = lead.source === "intent";
  const firstEmail = intent
    ? `${hello}\n\nI saw the public post about ${compact(lead.summary, 120)}. I build focused small-business websites, and this looks like a project that can stay straightforward.\n\nI can send the three things I would scope first and what I would leave out. Useful?\n\n— Red\nRukh Labs`
    : `${hello}\n\nI checked ${lead.company}'s site and noticed ${primary}. It is a small issue, but it adds friction for someone trying to become a customer.\n\nI can send the three changes I would prioritize first—no call needed. Useful?\n\n— Red\nRukh Labs`;
  const followUp1 = `${hello}\n\nOne additional observation: ${secondary}. That is the kind of issue I would resolve before suggesting a full rebuild.\n\nShould I send the short list?\n\n— Red`;
  const followUp2 = `${hello}\n\nLast note from me. My first pass would focus on the path from landing on the site to contacting or bookinf—not on adding a pile of features.\n\nI can send the three-point version if it would help.\n\n— Red`;
  return finishPlan({
    lead,
    segment: "website",
    variant,
    subjectA: `${company} website`,
    subjectB: `quick site note for ${company}`,
    firstEmail,
    followUp1,
    followUp2,
    approach: [
      "Test only the subject line between A and B.",
      "Lead with one verified observation.",
      "Offer a useful three-point assessment before asking for a meeting.",
      "Stop after two follow-ups.",
    ],
    tone: "Specific, calm, low-pressure",
  });
}

function powerBiPlan(lead: LeadOpportunity, variant: PitchVariant) {
  const hello = greeting(lead);
  const summary = compact(lead.summary, 140);
  const firstEmail = `${hello}\n\nI came across the Power BI need around ${summary}. My work is hands-on Power BI and Fabric—data modeling, DAX, Power Query, migrations, refresh paths, and production reporting.\n\nI can send the two or three areas I would check first based on the scope. Useful?\n\n— Red\nRukh Labs`;
  const followUp1 = `${hello}\n\nOne reason I followed up: on Power BI work like this, I usually check the model, source grain, and refresh path before touching visuals. That tends to expose the expensive problems early.\n\nShould I send the short checklist?\n\n— Red`;
  const followUp2 = `${hello}\n\nLast note from me. I can keep the first pass focused on the specific reporting problem rather than turning it into a broad consulting engagement.\n\nI can send how I would scope that first pass.\n\n— Red`;
  return finishPlan({
    lead,
    segment: "power-bi",
    variant,
    subjectA: "Power BI scope",
    subjectB: "Power BI first pass",
    firstEmail,
    followUp1,
    followUp2,
    approach: [
      "Test only the subject line between A and B.",
      "Reference the exact Power BI or Fabric need.",
      "Offer a short technical artifact rather than a generic credentials paragraph.",
      "Stop after two follow-ups.",
    ],
    tone: "Concise and technically credible",
    footerPath: "/data-ops",
  });
}

function dataOpsPlan(lead: LeadOpportunity, variant: PitchVariant) {
  const hello = greeting(lead);
  const summary = compact(lead.summary, 135);
  const company = shortCompany(lead);
  const firstEmail = `${hello}\n\nI came across the work around ${summary}. It looks like the kind of reporting, reconciliation, or migration process where someone still has to assemble and check the same output by hand.\n\nI take ownership of one process like that: validated output, an exception list, and evidence the totals reconcile. Want the three-point scope I would test first?\n\n— Red\nRukh Labs`;
  const followUp1 = `${hello}\n\nThe useful first step is usually not a new dashboard. It is mapping the inputs, manual corrections, failure points, and acceptance checks around one recurring output.\n\nShould I send the three-point diagnostic?\n\n— Red`;
  const followUp2 = `${hello}\n\nLast note from me. I would keep this to one process and one measurable result rather than proposing a broad transformation project.\n\nI can send the smallest sensible starting scope.\n\n— Red`;
  return finishPlan({
    lead,
    segment: "data-ops",
    variant,
    subjectA: `${company} reporting process`,
    subjectB: `recurring reporting at ${company}`,
    firstEmail,
    followUp1,
    followUp2,
    approach: [
      "Test only the subject line between A and B.",
      "Sell ownership of one recurring result, not tools or agents.",
      "Name the three outputs: validated result, exceptions, and reconciliation evidence.",
      "Stop after two follow-ups.",
    ],
    tone: "Operational, concrete, no transformation theater",
    footerPath: "/data-ops",
  });
}

function partnerPlan(lead: LeadOpportunity, variant: PitchVariant) {
  const hello = greeting(lead);
  const summary = compact(lead.summary, 125);
  const firstEmail = `${hello}\n\nI came across ${lead.company} while looking at firms working around ${summary}. I provide white-label Power BI, Power Query, reconciliation, migration QA, and reporting-automation delivery for consultancies that need extra capacity.\n\nYou keep the client, relationship, and markup. I work under NDA with fixed wholesale scopes and no poaching. Worth sending a one-page capability map?\n\n— Red\nRukh Labs`;
  const followUp1 = `${hello}\n\nThe most useful fit is usually overflow work that is too specialized or too small to staff internally: model repair, migration reconciliation, mapping, refresh failures, or recurring report automation.\n\nShould I send the wholesale scope examples?\n\n— Red`;
  const followUp2 = `${hello}\n\nLast note from me. This is meant to expand delivery capacity without creating channel conflict—the partner stays client-facing and I stay behind the work.\n\nI can send the one-page outline if relevant.\n\n— Red`;
  return finishPlan({
    lead,
    segment: "partners",
    variant,
    subjectA: "white-label data delivery",
    subjectB: "overflow Power BI support",
    firstEmail,
    followUp1,
    followUp2,
    approach: [
      "Test only the subject line between A and B.",
      "Lead with channel safety: the partner keeps the client and markup.",
      "Offer fixed wholesale scopes, NDA delivery, and no poaching.",
      "Stop after two follow-ups.",
    ],
    tone: "Peer-to-peer, commercially clear, no client-grab anxiety",
    footerPath: "/data-ops",
  });
}

export function buildOutreachPlan(lead: LeadOpportunity, requestedVariant?: PitchVariant): OutreachPlan {
  const segment = segmentForLead(lead);
  const variant = requestedVariant || pitchVariantForLead(lead.id);
  if (segment === "partners") return partnerPlan(lead, variant);
  if (segment === "data-ops") return dataOpsPlan(lead, variant);
  if (segment === "power-bi") return powerBiPlan(lead, variant);
  return websitePlan(lead, variant);
}
