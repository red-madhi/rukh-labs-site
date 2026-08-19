import type { LeadOpportunity } from "@/lib/leads/types";

export type OutreachTouch = {
  label: string;
  timing: string;
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
};

export const OUTREACH_RESEARCH = {
  averageReply: "3.43%",
  topQuartileReply: "5.5%+",
  topDecileReply: "10.7%+",
  firstTouchReplyShare: "58%",
  followUpReplyShare: "42%",
  targetFirstEmailWords: "50–80",
  hardCeilingWords: 100,
  recommendedTouches: "4–7",
  followUpSpacing: "3–4 days",
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

function compact(value: string, max = 155) {
  const cleaned = value.replace(/\s+/g, " ").trim().replace(/[.!?]+$/, "");
  if (cleaned.length <= max) return cleaned;
  return `${cleaned.slice(0, max - 1).replace(/\s+\S*$/, "")}…`;
}

function observationFromSignal(signal: string) {
  const lower = signal.toLowerCase();
  const seconds = signal.match(/(\d+(?:\.\d+)?)\s*seconds?/i)?.[1];
  const year = signal.match(/(?:dated|copyright).*?(20\d{2})/i)?.[1];

  if (/parked|for sale|under construction|coming soon/.test(lower)) {
    return "the domain is showing a parked or unfinished page instead of a normal business website";
  }
  if (/not using https|http instead of https/.test(lower)) {
    return "the site is still loading without HTTPS";
  }
  if (/mobile viewport|mobile configuration/.test(lower)) {
    return "the site is missing the setup that helps it display properly on phones";
  }
  if (/inquiry or booking form|contact form.*missing|no inquiry/.test(lower)) {
    return "there doesn't appear to be a simple inquiry or booking form for a new visitor";
  }
  if (/call-to-action|clear.*cta|no clear quote|no clear.*contact/.test(lower)) {
    return "the next step for a new customer isn't especially obvious on the site";
  }
  if (/response.*slow|took.*seconds|relatively slow/.test(lower)) {
    return seconds
      ? `the homepage took about ${seconds} seconds to respond when I checked it`
      : "the homepage was noticeably slow to respond when I checked it";
  }
  if (/missing.*page title|no.*page title/.test(lower)) {
    return "the homepage is missing a useful page title, which makes the page less clear to search engines and visitors";
  }
  if (/meta description/.test(lower)) {
    return "the homepage is missing the description search engines normally use to understand and preview the page";
  }
  if (/alternative text|alt text/.test(lower)) {
    return "a lot of the site's images are missing accessibility descriptions";
  }
  if (/copyright/.test(lower) && year) {
    return `the site still shows a ${year} copyright date, which can make it look less actively maintained`;
  }
  return compact(signal.charAt(0).toLowerCase() + signal.slice(1), 145);
}

function usableSignals(lead: LeadOpportunity) {
  return lead.signals
    .filter((signal) => !/usable public contact path|organization was formed|captured directly|discovered from/i.test(signal))
    .map(observationFromSignal)
    .filter(Boolean);
}

function websiteSubject(lead: LeadOpportunity) {
  const company = lead.company.replace(/\b(?:LLC|PLLC|INC\.?|CORP\.?|LTD\.?)\b/gi, "").replace(/\s+/g, " ").trim();
  const shortCompany = company.split(/\s+/).slice(0, 3).join(" ");
  return `${shortCompany} website`;
}

function websitePlan(lead: LeadOpportunity): OutreachPlan {
  const hello = greeting(lead);
  const observations = usableSignals(lead);
  const primary = observations[0] || "I found a couple of practical places where the website could make the path to contacting you clearer";
  const secondary = observations[1] || "there are a couple of other small changes I would prioritize before doing anything larger";
  const isIntent = lead.source === "intent";
  const isParked = lead.signals.some((signal) => /parked|for sale|under construction|coming soon/i.test(signal));

  let firstEmail: string;
  if (isIntent) {
    firstEmail = `${hello}\n\nI saw the public post about ${compact(lead.summary, 125)}. I build focused small-business websites, and this looks like the kind of project that can stay pretty straightforward.\n\nIf useful, I can send the 3 things I'd scope first and what I'd leave out. Interested?\n\n— Red\nRukh Labs`;
  } else if (isParked) {
    firstEmail = `${hello}\n\nI came across ${lead.company} and noticed ${primary}. I build straightforward small-business sites, but I don't want to turn this into a sales pitch.\n\nIf a proper site is already on your radar, want me to send the 3 things I'd prioritize first?\n\n— Red\nRukh Labs`;
  } else {
    firstEmail = `${hello}\n\nI was looking at ${lead.company}'s site and noticed ${primary}. It's a small thing, but it can add friction for someone trying to become a customer.\n\nIf useful, I can send the 3 changes I'd prioritize first—no call needed. Interested?\n\n— Red\nRukh Labs`;
  }

  const follow1 = `${hello}\n\nOne other thing I noticed: ${secondary}. That's the kind of fix I'd handle before suggesting a full rebuild.\n\nWant me to send the short list?\n\n— Red`;
  const follow2 = `${hello}\n\nA quick thought on ${lead.company}: I'd focus first on the visitor's path from landing on the site to actually contacting or booking—not on adding a pile of new features.\n\nHappy to send the 3-point version if that would be useful.\n\n— Red`;
  const follow3 = `${hello}\n\nLast note from me. If website changes aren't a priority right now, no problem. If they are, I can send the short list I mentioned and you can decide if any of it is worth acting on.\n\n— Red`;

  return {
    subject: websiteSubject(lead),
    firstEmail,
    wordCount: words(firstEmail),
    touches: [
      { label: "Follow-up 1", timing: "3–4 days later", text: follow1, wordCount: words(follow1) },
      { label: "Follow-up 2", timing: "3–4 days later", text: follow2, wordCount: words(follow2) },
      { label: "Follow-up 3", timing: "3–4 days later", text: follow3, wordCount: words(follow3) },
    ],
    approach: [
      "Lead with one verified problem, not a list of services.",
      "Offer a useful 3-point assessment before asking for a meeting.",
      "Keep one easy yes/no CTA and avoid ROI promises or hype.",
      "Each follow-up adds a new angle; never send a bare 'checking in.'",
    ],
    tone: "Specific, neighborly, low-pressure",
  };
}

function powerBiSubject(lead: LeadOpportunity) {
  if (lead.tags.some((tag) => /job-board|job board/i.test(tag))) return "Power BI role";
  if (lead.tags.some((tag) => /rfp|procurement|sam\.gov/i.test(tag))) return "Power BI project";
  if (lead.tags.some((tag) => /migration|proactive/i.test(tag))) return "Power BI migration";
  return "Power BI help";
}

function powerBiPlan(lead: LeadOpportunity): OutreachPlan {
  const hello = greeting(lead);
  const summary = compact(lead.summary, 145);
  const jobBoard = lead.tags.some((tag) => /job-board|job board/i.test(tag));
  const procurement = lead.tags.some((tag) => /rfp|procurement|sam\.gov/i.test(tag));
  const direct = lead.tags.some((tag) => /direct ask/i.test(tag));
  const proactive = lead.tags.some((tag) => /proactive/i.test(tag));

  let firstEmail: string;
  if (jobBoard) {
    firstEmail = `${hello}\n\nI saw the newly posted Power BI role and the part that stood out was ${summary}. My work is hands-on Power BI/Fabric—data modeling, DAX, Power Query, migrations, and production reporting.\n\nIf useful, I can send 2–3 directly relevant examples rather than a generic skills dump. Interested?\n\n— Red`;
  } else if (procurement) {
    firstEmail = `${hello}\n\nI came across the Power BI opportunity around ${summary}. I work hands-on with Power BI/Fabric implementations and reporting migrations, and the scope looks worth a closer read.\n\nWould it help if I sent a short response outline focused on the highest-risk parts of the work?\n\n— Red`;
  } else if (direct) {
    firstEmail = `${hello}\n\nI saw your post about ${summary}. I work hands-on with Power BI/Fabric, especially data models, DAX, Power Query, migrations, and production dashboards.\n\nIf useful, I can send the 2–3 things I'd check first based on what you described. Interested?\n\n— Red`;
  } else if (proactive) {
    firstEmail = `${hello}\n\nI came across the note about ${summary}. I've worked directly on Tableau-to-Power BI/Fabric reporting migrations, so that caught my attention.\n\nIf useful, I can send a short outline of the first 3 areas I'd de-risk before the build gets expensive. Interested?\n\n— Red`;
  } else {
    firstEmail = `${hello}\n\nI came across the Power BI need around ${summary}. I work hands-on with Power BI/Fabric and reporting modernization, and this looks close to the work I do.\n\nIf useful, I can send the 2–3 things I'd look at first. Interested?\n\n— Red`;
  }

  const follow1 = `${hello}\n\nOne reason I followed up: on Power BI work like this, I usually check the model and refresh path before touching visuals. It tends to expose the expensive problems early.\n\nWant me to send the short checklist?\n\n— Red`;
  const follow2 = `${hello}\n\nAnother angle that may be useful: I can keep this focused on the specific model/reporting problem rather than turning it into a broad consulting engagement.\n\nHappy to send how I'd scope the first pass.\n\n— Red`;
  const follow3 = `${hello}\n\nLast note from me. If the Power BI work is already covered, no worries. If it's still open, I can send the short approach I mentioned and you can decide whether it's relevant.\n\n— Red`;

  return {
    subject: powerBiSubject(lead),
    firstEmail,
    wordCount: words(firstEmail),
    touches: [
      { label: "Follow-up 1", timing: "3–4 days later", text: follow1, wordCount: words(follow1) },
      { label: "Follow-up 2", timing: "3–4 days later", text: follow2, wordCount: words(follow2) },
      { label: "Follow-up 3", timing: "3–4 days later", text: follow3, wordCount: words(follow3) },
    ],
    approach: [
      "Reference the exact Power BI/Fabric need instead of sending a resume paragraph.",
      "Use relevant capability as proof, then offer a useful next artifact.",
      "One interest CTA; don't ask a cold prospect for 15–30 minutes immediately.",
      "For <12h job-board leads, send the first touch immediately while the posting is still fresh.",
    ],
    tone: "Concise, technical enough to be credible, no jargon pile-up",
  };
}

export function buildOutreachPlan(lead: LeadOpportunity): OutreachPlan {
  return lead.source === "power-bi" ? powerBiPlan(lead) : websitePlan(lead);
}
