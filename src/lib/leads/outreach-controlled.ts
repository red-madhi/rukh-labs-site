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
  hardBouncePauseRate: "3% by source or segment",
  emergencyGlobalBounceRate: "10%",
  testDecisions: [
    "50 verified deliveries and zero replies: rewrite the subject and opening.",
    "100 verified deliveries, at least one follow-up, and zero replies: retire the pitch.",
    "150–200 verified deliveries and fewer than two replies: change the offer, targeting, or price.",
  ],
  sources: [
    "Instantly 2025 cold-email benchmark dataset",
    "Gong cold-email research",
    "Outreach sequence follow-up research",
  ],
} as const;

function countWords(value: string) {
  return value.trim() ? value.trim().split(/\s+/).length : 0;
}

function firstName(lead: LeadOpportunity) {
  const raw = (
    lead as LeadOpportunity & { contactName?: string }
  ).contactName
    ?.trim()
    .replace(/^@/, "");
  const token = raw?.split(/[\s,|/]+/)[0] || "";
  return token.length > 1 && !/^(team|staff|owner|manager)$/i.test(token)
    ? token
    : "";
}

function greeting(lead: LeadOpportunity) {
  const name = firstName(lead);
  return name ? `Hi ${name},` : `Hi ${lead.company} team,`;
}

function compact(value: string, max = 140) {
  const cleaned = value
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[.!?]+$/, "");
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

function withFooter(value: string, path = "") {
  const normalized = value.trimEnd();
  const footer = `rukhlabs.com${path}`;
  return normalized.toLowerCase().endsWith(footer.toLowerCase())
    ? normalized
    : `${normalized}\n\n${footer}`;
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
    wordCount: countWords(firstEmail),
    touches: [
      {
        label: "Follow-up 1",
        timing: "3 business days later",
        businessDaysAfterPrevious: 3,
        text: followUp1,
        wordCount: countWords(followUp1),
      },
      {
        label: "Follow-up 2",
        timing: "4 business days later",
        businessDaysAfterPrevious: 4,
        text: followUp2,
        wordCount: countWords(followUp2),
      },
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
  const company = shortCompany(lead);
  const usefulSignal = lead.signals.find(
    (signal) =>
      !/usable public contact path|organization was formed|captured directly|discovered from/i.test(
        signal,
      ),
  );
  const observation = usefulSignal
    ? compact(
        usefulSignal.charAt(0).toLowerCase() + usefulSignal.slice(1),
        125,
      )
    : "the customer path could be clearer";

  return finishPlan({
    lead,
    segment: "website",
    variant,
    subjectA: `${company} website`,
    subjectB: `quick site note for ${company}`,
    firstEmail: `${hello}\n\nI checked ${lead.company}'s site and noticed ${observation}. It is a small issue, but it adds friction for someone trying to become a customer.\n\nI can send the three changes I would prioritize first—no call needed. Useful?\n\n— Red\nRukh Labs`,
    followUp1: `${hello}\n\nOne additional observation: I would fix the customer path before adding more features. That is the kind of issue I would resolve before suggesting a full rebuild.\n\nShould I send the short list?\n\n— Red`,
    followUp2: `${hello}\n\nLast note from me. My first pass would focus on the path from landing on the site to contacting or booking—not on adding a pile of features.\n\nI can send the three-point version if it would help.\n\n— Red`,
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
  const summary = compact(lead.summary);

  return finishPlan({
    lead,
    segment: "power-bi",
    variant,
    subjectA: "Power BI scope",
    subjectB: "Power BI first pass",
    firstEmail: `${hello}\n\nI came across the Power BI need around ${summary}. My work is hands-on Power BI and Fabric—data modeling, DAX, Power Query, migrations, refresh paths, and production reporting.\n\nI can send the two or three areas I would check first based on the scope. Useful?\n\n— Red\nRukh Labs`,
    followUp1: `${hello}\n\nOn Power BI work like this, I usually check the model, source grain, and refresh path before touching visuals. That tends to expose the expensive problems early.\n\nShould I send the short checklist?\n\n— Red`,
    followUp2: `${hello}\n\nLast note from me. I can keep the first pass focused on the specific reporting problem rather than turning it into a broad consulting engagement.\n\nI can send how I would scope that first pass.\n\n— Red`,
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
  const summary = compact(lead.summary, 130);
  const company = shortCompany(lead);

  return finishPlan({
    lead,
    segment: "data-ops",
    variant,
    subjectA: `${company} reporting process`,
    subjectB: `recurring reporting at ${company}`,
    firstEmail: `${hello}\n\nI came across the work around ${summary}. It looks like the kind of reporting, reconciliation, or migration process where someone still has to assemble and check the same output by hand.\n\nI take ownership of one process like that: validated output, an exception list, and evidence the totals reconcile. Want the three-point scope I would test first?\n\n— Red\nRukh Labs`,
    followUp1: `${hello}\n\nThe useful first step is usually not a new dashboard. It is mapping the inputs, manual corrections, failure points, and acceptance checks around one recurring output.\n\nShould I send the three-point diagnostic?\n\n— Red`,
    followUp2: `${hello}\n\nLast note from me. I would keep this to one process and one measurable result rather than proposing a broad transformation project.\n\nI can send the smallest sensible starting scope.\n\n— Red`,
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

  return finishPlan({
    lead,
    segment: "partners",
    variant,
    subjectA: "white-label data delivery",
    subjectB: "overflow Power BI support",
    firstEmail: `${hello}\n\nI came across ${lead.company} while looking at firms working around ${summary}. I provide white-label Power BI, Power Query, reconciliation, migration QA, and reporting-automation delivery for consultancies that need extra capacity.\n\nYou keep the client, relationship, and markup. I work under NDA with fixed wholesale scopes and no poaching. Worth sending a one-page capability map?\n\n— Red\nRukh Labs`,
    followUp1: `${hello}\n\nThe useful fit is usually overflow work that is too specialized or too small to staff internally: model repair, migration reconciliation, mapping, refresh failures, or recurring report automation.\n\nShould I send the wholesale scope examples?\n\n— Red`,
    followUp2: `${hello}\n\nLast note from me. This is meant to expand delivery capacity without creating channel conflict—the partner stays client-facing and I stay behind the work.\n\nI can send the one-page outline if relevant.\n\n— Red`,
    approach: [
      "Test only the subject line between A and B.",
      "Lead with channel safety: the partner keeps the client and markup.",
      "Offer fixed wholesale scopes, NDA delivery, and no poaching.",
      "Stop after two follow-ups.",
    ],
    tone: "Peer-to-peer and commercially clear",
    footerPath: "/data-ops",
  });
}

export function buildOutreachPlan(
  lead: LeadOpportunity,
  requestedVariant?: PitchVariant,
): OutreachPlan {
  const segment = segmentForLead(lead);
  const variant = requestedVariant || pitchVariantForLead(lead.id);

  if (segment === "partners") return partnerPlan(lead, variant);
  if (segment === "data-ops") return dataOpsPlan(lead, variant);
  if (segment === "power-bi") return powerBiPlan(lead, variant);
  return websitePlan(lead, variant);
}
