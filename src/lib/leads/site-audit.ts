import type { CandidateRow } from "@/lib/leads/crawl";
import { clamp } from "@/lib/leads/crawl";
import {
  canCrawlPath,
  fetchPublicPage,
  inspectHtml,
  isBlockedProspectUrl,
  parseSafePublicUrl,
} from "@/lib/leads/site-fetch";
import type { PageSignals, PublicFetchResult } from "@/lib/leads/site-fetch";

export type WebsiteAuditResult = {
  finalUrl: string;
  score: number;
  qualified: boolean;
  summary: string;
  pitch: string;
  signals: string[];
  risks: string[];
  contactEmail?: string;
  contactPhone?: string;
  contactUrl?: string;
  audit: Record<string, unknown>;
};

export async function auditWebsite(candidate: CandidateRow): Promise<WebsiteAuditResult> {
  if (!candidate.websiteUrl) throw new Error("Candidate does not have a website.");
  if (isBlockedProspectUrl(candidate.websiteUrl)) {
    throw new Error("Website is a blocked directory or platform.");
  }

  const parsed = parseSafePublicUrl(candidate.websiteUrl);
  if (!parsed) throw new Error("Website URL is not safe.");
  if (!(await canCrawlPath(parsed.toString(), parsed.pathname || "/"))) {
    throw new Error("Website robots policy does not permit this crawl.");
  }

  let page: PublicFetchResult;
  try {
    page = await fetchPublicPage(parsed.toString(), 12_000, 2_000_000);
  } catch (error) {
    return {
      finalUrl: parsed.toString(),
      score: 45,
      qualified: false,
      summary: "The automated audit could not reach the listed website, so no sales conclusion was made.",
      pitch: "Manual verification required before outreach.",
      signals: ["Automated website request did not complete"],
      risks: [
        "The site may be temporarily unavailable or may block automated requests",
        "Verify the website manually before treating this as an opportunity",
      ],
      contactEmail: candidate.email,
      contactPhone: candidate.phone,
      contactUrl: candidate.sourceUrl,
      audit: {
        reachable: false,
        inconclusive: true,
        error: error instanceof Error ? error.message : "Website request failed",
        checkedAt: new Date().toISOString(),
      },
    };
  }

  if (page.status >= 400 || !page.text) {
    const accessBlocked = [401, 403, 429].includes(page.status);
    const clearlyBroken = page.status === 404 || page.status === 410 || page.status >= 500;
    const score = accessBlocked
      ? 42
      : clearlyBroken
        ? clamp(78 + Math.min(10, candidate.prioritySeed / 10))
        : 50;
    const qualified =
      clearlyBroken && Boolean(candidate.phone || candidate.email || candidate.sourceUrl);

    return {
      finalUrl: page.finalUrl,
      score,
      qualified,
      summary: accessBlocked
        ? `The website returned HTTP ${page.status} to the crawler. That may be bot protection, so the result is inconclusive.`
        : `The listed website returned HTTP ${page.status} instead of a usable homepage.`,
      pitch: qualified
        ? `I came across ${candidate.organizationName} and noticed the public website is returning an error instead of a usable homepage. I build straightforward business sites and can help restore a reliable contact or booking path.`
        : "Manual verification required before outreach.",
      signals: accessBlocked
        ? [`Automated audit was blocked with HTTP ${page.status}`]
        : [
            `Website returned HTTP ${page.status}`,
            clearlyBroken
              ? "Visitors may be unable to reach the business online"
              : "The homepage did not return usable public HTML",
          ],
      risks: accessBlocked
        ? [
            "The website may be healthy and merely blocking automated traffic",
            "Do not contact the business about an outage without checking in a normal browser",
          ]
        : ["The error may be temporary and should be checked once more before contacting"],
      contactEmail: candidate.email,
      contactPhone: candidate.phone,
      contactUrl: candidate.sourceUrl,
      audit: {
        reachable: false,
        inconclusive: accessBlocked,
        status: page.status,
        responseMs: page.responseMs,
        checkedAt: new Date().toISOString(),
      },
    };
  }

  const home = inspectHtml(page.text, page.finalUrl);
  let contactPage: PublicFetchResult | undefined;
  let contactSignals: PageSignals | undefined;
  if (home.contactUrl) {
    try {
      const contactParsed = new URL(home.contactUrl);
      if (
        contactParsed.origin === new URL(page.finalUrl).origin &&
        (await canCrawlPath(page.finalUrl, contactParsed.pathname))
      ) {
        contactPage = await fetchPublicPage(home.contactUrl, 8_000, 800_000);
        if (contactPage.status < 400 && contactPage.text) {
          contactSignals = inspectHtml(contactPage.text, contactPage.finalUrl);
        }
      }
    } catch {
      contactPage = undefined;
    }
  }

  const emails = Array.from(
    new Set([candidate.email, ...home.emails, ...(contactSignals?.emails ?? [])].filter(Boolean)),
  ) as string[];
  const phones = Array.from(
    new Set([candidate.phone, ...home.phones, ...(contactSignals?.phones ?? [])].filter(Boolean)),
  ) as string[];
  const contactUrl = contactPage?.finalUrl || home.contactUrl || candidate.sourceUrl;
  const currentYear = new Date().getFullYear();

  let score = 18 + Math.min(10, candidate.prioritySeed / 8);
  const signals: string[] = [];
  const risks: string[] = [];

  if (!page.finalUrl.startsWith("https://")) {
    score += 20;
    signals.push("Website is not using HTTPS");
  }
  if (!home.hasViewport) {
    score += 13;
    signals.push("No mobile viewport configuration detected");
  }
  if (page.responseMs >= 3_000) {
    score += 12;
    signals.push(`Homepage took ${(page.responseMs / 1000).toFixed(1)} seconds to respond`);
  } else if (page.responseMs >= 1_800) {
    score += 6;
    signals.push(`Homepage response was relatively slow at ${(page.responseMs / 1000).toFixed(1)} seconds`);
  }
  if (page.bytes >= 1_500_000) {
    score += 8;
    signals.push("Homepage HTML payload is unusually large");
  }
  if (!home.title) {
    score += 7;
    signals.push("Homepage is missing a useful page title");
  }
  if (!home.description) {
    score += 6;
    signals.push("Homepage is missing a meta description");
  }
  if (!home.hasCanonical) {
    score += 3;
    signals.push("No canonical page URL was detected");
  }
  if (!home.hasOpenGraph) {
    score += 3;
    signals.push("Social sharing metadata appears incomplete");
  }
  if (!home.hasHtmlLang) {
    score += 3;
    signals.push("Document language is not declared");
  }
  if (home.h1Count === 0) {
    score += 4;
    signals.push("Homepage has no primary heading");
  } else if (home.h1Count > 2) {
    score += 2;
    signals.push("Homepage uses multiple competing primary headings");
  }
  if (home.imageCount >= 4 && home.altImageCount / home.imageCount < 0.5) {
    score += 5;
    signals.push("Most homepage images are missing useful alternative text");
  }
  if (!home.hasForm && !contactSignals?.hasForm) {
    score += 7;
    signals.push("No inquiry or booking form was detected");
  }
  if (!home.hasCta && !contactSignals?.hasCta) {
    score += 6;
    signals.push("No clear quote, booking, or contact call-to-action was detected");
  }
  if (home.copyrightYear && home.copyrightYear <= currentYear - 3) {
    score += 7;
    signals.push(`Visible copyright appears dated ${home.copyrightYear}`);
  }
  if (home.parked) {
    score += 35;
    signals.push("Homepage appears parked, unfinished, or under construction");
  }
  if (home.technology && /Wix|Weebly|GoDaddy/i.test(home.technology)) {
    score += 3;
    signals.push(`Site appears to use ${home.technology}`);
  }
  if (emails.length || phones.length || contactUrl) {
    score += 8;
    signals.push("A usable public contact path was found");
  } else {
    risks.push("No reliable public contact method was found");
  }

  const formedYear = candidate.formedAt
    ? new Date(candidate.formedAt).getFullYear()
    : undefined;
  if (formedYear && formedYear >= currentYear - 1) {
    score += 8;
    signals.push("Organization was formed recently");
  }

  score = clamp(score);
  const qualified = score >= 62 && Boolean(emails.length || phones.length || contactUrl);
  if (!signals.length) signals.push("Website responded normally with no major automated problems");
  if (!qualified && score >= 50) {
    risks.push("The site has some weaknesses, but the current evidence is not strong enough for outreach");
  }

  const topIssues = signals
    .filter((signal) => !/contact path|formed recently/i.test(signal))
    .slice(0, 3);
  const summary = qualified
    ? `${candidate.organizationName} has a reachable website, but the audit found ${
        topIssues.length
          ? topIssues.join("; ").toLowerCase()
          : "multiple practical conversion and maintenance issues"
      }.`
    : `${candidate.organizationName}'s website was audited, but it did not meet the current opportunity threshold.`;

  const pitchIssue =
    topIssues[0]?.replace(/^Website /i, "the website ").toLowerCase() ||
    "a few practical issues that may be costing inquiries";
  const pitch = `I came across ${candidate.organizationName} while reviewing ${candidate.category || "local businesses"} in ${candidate.city || candidate.state || "your area"}. I noticed ${pitchIssue}. I build straightforward, conversion-focused sites and can send a concise fixed-price plan if improving it is already on your radar.`;

  return {
    finalUrl: page.finalUrl,
    score,
    qualified,
    summary,
    pitch,
    signals,
    risks,
    contactEmail: emails[0],
    contactPhone: phones[0],
    contactUrl,
    audit: {
      reachable: true,
      status: page.status,
      responseMs: page.responseMs,
      htmlBytes: page.bytes,
      https: page.finalUrl.startsWith("https://"),
      mobile: home.hasViewport ? 100 : 25,
      performance:
        page.responseMs < 1_000
          ? 90
          : page.responseMs < 2_000
            ? 70
            : page.responseMs < 3_000
              ? 50
              : 25,
      seo: clamp(
        (home.title ? 25 : 0) +
          (home.description ? 25 : 0) +
          (home.hasCanonical ? 20 : 0) +
          (home.hasOpenGraph ? 15 : 0) +
          (home.h1Count === 1 ? 15 : 0),
      ),
      accessibility: clamp(
        (home.hasHtmlLang ? 25 : 0) +
          (home.h1Count >= 1 ? 25 : 0) +
          (home.imageCount === 0
            ? 25
            : Math.round((home.altImageCount / home.imageCount) * 50)) +
          (home.hasViewport ? 25 : 0),
      ),
      contactForm: home.hasForm || contactSignals?.hasForm ? "working" : "missing",
      hasCta: home.hasCta || contactSignals?.hasCta || false,
      title: home.title || null,
      description: home.description || null,
      technology: home.technology || null,
      copyrightYear: home.copyrightYear || null,
      checkedAt: new Date().toISOString(),
    },
  };
}
