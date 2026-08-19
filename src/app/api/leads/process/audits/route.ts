import type { NextRequest } from "next/server";
import { hasValidBasicAuth, hasValidCronAuth } from "@/lib/leads/auth";
import {
  beginCollectorRun,
  clamp,
  claimAuditCandidates,
  completeCollectorRun,
  failCollectorRun,
  locationLabel,
  privateJson,
} from "@/lib/leads/crawl";
import type { CandidateRow } from "@/lib/leads/crawl";
import { leadNeonQuery, neonRowsToObjects } from "@/lib/leads/neon";
import { auditWebsite } from "@/lib/leads/site";
import type { WebsiteAuditResult } from "@/lib/leads/site";
import { isThirdPartyBusinessUrl } from "@/lib/leads/site-fetch";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SOURCE_ID = "website-auditor";
const DEFAULT_LIMIT = 6;
const MOTION_SIGNAL_MAX_AGE_DAYS = 365;

type AccountContext = {
  matchedCandidates: number;
  sources: string[];
  activeMotionSignal: boolean;
};

async function mapWithConcurrency<T, R>(
  values: readonly T[],
  concurrency: number,
  worker: (value: T) => Promise<R>,
) {
  const results = new Array<R>(values.length);
  let next = 0;
  async function run() {
    while (next < values.length) {
      const index = next;
      next += 1;
      results[index] = await worker(values[index]);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(concurrency, values.length) }, () => run()),
  );
  return results;
}

function phoneDigits(value?: string) {
  return (value ?? "").replace(/\D/g, "").slice(-10);
}

function parseStringArray(value: string | null) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
}

function candidateHasActiveMotion(candidate: CandidateRow) {
  if (typeof candidate.metadata.motionSignal !== "string" || !candidate.formedAt) return false;
  const formed = new Date(`${candidate.formedAt}T00:00:00Z`).getTime();
  if (!Number.isFinite(formed)) return false;
  const ageDays = Math.max(0, (Date.now() - formed) / 86_400_000);
  return ageDays <= MOTION_SIGNAL_MAX_AGE_DAYS;
}

async function strictAccountContext(candidate: CandidateRow): Promise<AccountContext> {
  const phone = phoneDigits(candidate.phone);
  const result = await leadNeonQuery(
    `SELECT
       count(*)::text AS matched_candidates,
       COALESCE(to_jsonb(array_agg(DISTINCT source))::text, '[]') AS sources,
       bool_or(
         (metadata ? 'motionSignal')
         AND formed_at IS NOT NULL
         AND formed_at >= current_date - interval '365 days'
       )::text AS active_motion_signal
     FROM public.lead_candidates
     WHERE archived_at IS NULL
       AND id <> $1::uuid
       AND (
         ($2::text IS NOT NULL AND email IS NOT NULL AND lower(email) = lower($2))
         OR (
           $3::text <> ''
           AND phone IS NOT NULL
           AND right(regexp_replace(phone, '[^0-9]', '', 'g'), 10) = $3
         )
         OR (
           lower(regexp_replace(trim(organization_name), '\\s+', ' ', 'g')) =
             lower(regexp_replace(trim($4::text), '\\s+', ' ', 'g'))
           AND lower(COALESCE(city, '')) = lower(COALESCE($5::text, ''))
           AND lower(COALESCE(state, '')) = lower(COALESCE($6::text, ''))
         )
       )`,
    [
      candidate.id,
      candidate.email || null,
      phone,
      candidate.organizationName,
      candidate.city || null,
      candidate.state || null,
    ],
  );
  const row = neonRowsToObjects(result)[0] ?? {};
  return {
    matchedCandidates: Number(row.matched_candidates ?? 0),
    sources: parseStringArray(row.sources ?? null),
    activeMotionSignal: row.active_motion_signal === "true",
  };
}

function isParkedAudit(audit: WebsiteAuditResult) {
  return audit.signals.some((signal) =>
    /\b(?:parked|for sale|under construction|coming soon)\b/i.test(signal),
  );
}

function parkedAuditPayload(audit: WebsiteAuditResult, parked: boolean) {
  return parked
    ? {
        ...audit.audit,
        parked: true,
        usableWebsite: false,
        parkedDomain: audit.finalUrl,
      }
    : {
        ...audit.audit,
        parked: false,
        usableWebsite: true,
      };
}

async function saveAudit(candidate: CandidateRow, audit: WebsiteAuditResult) {
  const parked = isParkedAudit(audit);
  await leadNeonQuery(
    `UPDATE public.lead_candidates
     SET website_url = $2,
         email = COALESCE($3, email),
         phone = COALESCE($4, phone),
         audit = $5::jsonb,
         status = $6,
         next_action_at = CASE WHEN $7::boolean THEN now() ELSE now() + interval '90 days' END,
         last_error = NULL,
         metadata = metadata || $8::jsonb,
         updated_at = now()
     WHERE id = $1::uuid`,
    [
      candidate.id,
      parked ? null : audit.finalUrl,
      audit.contactEmail || null,
      audit.contactPhone || null,
      JSON.stringify(parkedAuditPayload(audit, parked)),
      parked ? "domain-pending" : audit.qualified ? "qualified" : "audited",
      parked ? "true" : "false",
      JSON.stringify(
        parked
          ? {
              parkedDomain: audit.finalUrl,
              parkedDomainDetectedAt: new Date().toISOString(),
            }
          : {},
      ),
    ],
  );
}

async function promoteAudit(candidate: CandidateRow, audit: WebsiteAuditResult) {
  if (!audit.qualified) return false;

  const account = await strictAccountContext(candidate);
  const independentSources = Array.from(new Set([candidate.source, ...account.sources].filter(Boolean)));
  const activeMotion = candidateHasActiveMotion(candidate) || account.activeMotionSignal;
  // Duplicate registry/source records corroborate identity, but they are not separate
  // buying-intent signals. Only a still-active temporal motion event gets a modest boost.
  const convergenceBonus = activeMotion ? 5 : 0;
  const adjustedScore = clamp(audit.score + convergenceBonus);
  const parked = isParkedAudit(audit);
  const leadSource = parked ? "new-business" : "site-audit";
  const sourceKey = `candidate:${candidate.id}`;
  const priority = adjustedScore >= 85 ? "hot" : adjustedScore >= 70 ? "strong" : "watch";
  const location = locationLabel(candidate);
  const websiteUrl = parked ? null : audit.finalUrl;
  const contactUrl = audit.contactUrl || candidate.sourceUrl || (parked ? null : audit.finalUrl);
  const summary = parked
    ? `${candidate.organizationName} has a matching domain that currently resolves to a parked or for-sale page rather than a usable business website. Domain research is continuing in case the organization uses another official domain.`
    : audit.summary;
  const pitch = parked
    ? `I came across ${candidate.organizationName} while reviewing ${candidate.category || "local businesses"} in ${candidate.city || candidate.state || "your area"}. I noticed the matching domain is currently parked or for sale instead of serving a business website. If a proper web presence is still on your list, I can send a concise fixed-price launch plan.`
    : audit.pitch;
  const signals = parked
    ? Array.from(
        new Set([
          "Matching domain is parked or listed for sale instead of serving a usable business website",
          ...audit.signals.filter((signal) => !/missing|viewport|heading|meta description|canonical|open graph|call-to-action|form/i.test(signal)),
        ]),
      )
    : [...audit.signals];
  if (independentSources.length >= 2) {
    signals.push(
      `Account identity is corroborated across ${independentSources.length} independent sources: ${independentSources.slice(0, 5).join(", ")}`,
    );
  }
  if (activeMotion) {
    signals.push(`A still-active official business-activity signal overlaps the current website evidence (≤${MOTION_SIGNAL_MAX_AGE_DAYS} days old)`);
  }
  const risks = parked
    ? Array.from(
        new Set([
          ...audit.risks,
          "The organization may use another official domain; verify that before outreach",
        ]),
      )
    : [...audit.risks];
  if (independentSources.length >= 2) {
    risks.push("Cross-source matching is intentionally strict; name/location, email, or phone must agree. Source count corroborates identity and does not increase rank by itself.");
  }
  const tags = parked
    ? ["parked domain", "no usable website", candidate.source, candidate.category || "unclassified"]
    : ["website audit", candidate.source, candidate.category || "unclassified"];
  if (independentSources.length >= 2) tags.push("account-corroborated");
  if (activeMotion) tags.push("business-in-motion", "signal-convergence");

  const auditPayload = parkedAuditPayload(audit, parked);
  const dimensions =
    auditPayload.dimensions && typeof auditPayload.dimensions === "object"
      ? (auditPayload.dimensions as Record<string, unknown>)
      : {};
  auditPayload.dimensions = {
    ...dimensions,
    convergence: activeMotion
      ? Math.max(Number(dimensions.convergence ?? 0), 80)
      : Number(dimensions.convergence ?? 0),
  };
  auditPayload.accountSignals = {
    strictMatchedCandidates: account.matchedCandidates,
    independentSources,
    accountCorroborated: independentSources.length >= 2,
    activeMotionSignal: activeMotion,
    motionMaxAgeDays: MOTION_SIGNAL_MAX_AGE_DAYS,
    convergenceBonus,
  };

  await leadNeonQuery(
    `UPDATE public.lead_opportunities
     SET archived_at = now(), updated_at = now()
     WHERE source_key = $1 AND source <> $2 AND archived_at IS NULL`,
    [sourceKey, leadSource],
  );

  await leadNeonQuery(
    `INSERT INTO public.lead_opportunities AS existing (
       source,
       source_key,
       source_url,
       discovered_at,
       company_name,
       contact_name,
       contact_email,
       contact_phone,
       contact_url,
       website_url,
       location,
       industry,
       summary,
       score,
       priority,
       signals,
       risks,
       tags,
       pitch,
       audit,
       raw_payload,
       last_checked_at
     )
     VALUES (
       $1,
       $2,
       $3,
       now(),
       $4,
       $5,
       $6,
       $7,
       $8,
       $9,
       $10,
       $11,
       $12,
       $13::int,
       $14,
       $15::jsonb,
       $16::jsonb,
       $17::jsonb,
       $18,
       $19::jsonb,
       $20::jsonb,
       now()
     )
     ON CONFLICT (source, source_key) DO UPDATE SET
       source_url = EXCLUDED.source_url,
       updated_at = now(),
       company_name = EXCLUDED.company_name,
       contact_name = COALESCE(EXCLUDED.contact_name, existing.contact_name),
       contact_email = COALESCE(EXCLUDED.contact_email, existing.contact_email),
       contact_phone = COALESCE(EXCLUDED.contact_phone, existing.contact_phone),
       contact_url = COALESCE(EXCLUDED.contact_url, existing.contact_url),
       website_url = EXCLUDED.website_url,
       location = EXCLUDED.location,
       industry = EXCLUDED.industry,
       summary = EXCLUDED.summary,
       score = EXCLUDED.score,
       priority = EXCLUDED.priority,
       signals = EXCLUDED.signals,
       risks = EXCLUDED.risks,
       tags = EXCLUDED.tags,
       pitch = EXCLUDED.pitch,
       audit = EXCLUDED.audit,
       raw_payload = EXCLUDED.raw_payload,
       last_checked_at = now(),
       archived_at = NULL`,
    [
      leadSource,
      sourceKey,
      candidate.sourceUrl || audit.finalUrl,
      candidate.organizationName,
      candidate.contactName || null,
      audit.contactEmail || candidate.email || null,
      audit.contactPhone || candidate.phone || null,
      contactUrl,
      websiteUrl,
      location,
      candidate.category || "Unclassified",
      summary,
      String(adjustedScore),
      priority,
      JSON.stringify(Array.from(new Set(signals))),
      JSON.stringify(Array.from(new Set(risks))),
      JSON.stringify(Array.from(new Set(tags))),
      pitch,
      JSON.stringify(auditPayload),
      JSON.stringify({
        candidateId: candidate.id,
        candidateSource: candidate.source,
        domainConfidence: candidate.domainConfidence,
        prioritySeed: candidate.prioritySeed,
        parkedDomain: parked ? audit.finalUrl : null,
        accountSignalCount: independentSources.length,
        accountSources: independentSources,
        accountCorroborated: independentSources.length >= 2,
        activeMotionSignal: activeMotion,
        motionMaxAgeDays: MOTION_SIGNAL_MAX_AGE_DAYS,
        convergenceBonus,
      }),
    ],
  );
  return true;
}

async function requeueThirdPartyPage(candidate: CandidateRow) {
  if (!candidate.websiteUrl || !isThirdPartyBusinessUrl(candidate.websiteUrl)) return false;
  const page = candidate.websiteUrl;
  await Promise.all([
    leadNeonQuery(
      `UPDATE public.lead_candidates
       SET website_url = NULL,
           domain_confidence = 0,
           status = 'domain-pending',
           next_action_at = now(),
           last_error = NULL,
           metadata = metadata || $2::jsonb,
           updated_at = now()
       WHERE id = $1::uuid`,
      [
        candidate.id,
        JSON.stringify({
          thirdPartyBusinessPage: page,
          thirdPartyPageDetectedAt: new Date().toISOString(),
          ownedWebsiteStillNeeded: true,
        }),
      ],
    ),
    leadNeonQuery(
      `UPDATE public.lead_opportunities
       SET archived_at = now(), updated_at = now()
       WHERE source_key = $1 AND source = 'site-audit' AND archived_at IS NULL`,
      [`candidate:${candidate.id}`],
    ),
  ]);
  return true;
}

async function handleCandidate(candidate: CandidateRow) {
  try {
    if (await requeueThirdPartyPage(candidate)) {
      return { promoted: false, qualified: false, error: false, requeuedThirdParty: true };
    }

    const audit = await auditWebsite(candidate);
    await saveAudit(candidate, audit);
    const promoted = await promoteAudit(candidate, audit);
    return { promoted, qualified: audit.qualified, error: false, requeuedThirdParty: false };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Website audit failed.";
    const terminal = /robots policy|blocked directory|not safe/i.test(message);
    await leadNeonQuery(
      `UPDATE public.lead_candidates
       SET status = $2,
           next_action_at = now() + CASE WHEN $2 = 'rejected' THEN interval '365 days' ELSE interval '1 day' END,
           last_error = $3,
           updated_at = now()
       WHERE id = $1::uuid`,
      [candidate.id, terminal ? "rejected" : "error", message.slice(0, 700)],
    );
    return { promoted: false, qualified: false, error: true, requeuedThirdParty: false };
  }
}

export async function GET(request: NextRequest) {
  if (!hasValidCronAuth(request) && !hasValidBasicAuth(request)) {
    return privateJson({ error: "Collector authentication failed." }, { status: 401 });
  }

  const requestedLimit = Number(request.nextUrl.searchParams.get("limit") ?? DEFAULT_LIMIT);
  const limit = Math.max(
    1,
    Math.min(15, Number.isFinite(requestedLimit) ? requestedLimit : DEFAULT_LIMIT),
  );
  const runId = await beginCollectorRun(SOURCE_ID);

  try {
    const candidates = await claimAuditCandidates(limit);
    const outcomes = await mapWithConcurrency(candidates, 3, handleCandidate);
    const promoted = outcomes.filter((outcome) => outcome.promoted).length;
    const qualified = outcomes.filter((outcome) => outcome.qualified).length;
    const errors = outcomes.filter((outcome) => outcome.error).length;
    const requeuedThirdParty = outcomes.filter((outcome) => outcome.requeuedThirdParty).length;

    await completeCollectorRun(
      runId,
      SOURCE_ID,
      candidates.length,
      promoted,
      {
        lastProcessed: candidates.length,
        lastQualified: qualified,
        lastErrors: errors,
        lastThirdPartyPagesRequeued: requeuedThirdParty,
        accountMatching: "strict email/phone or exact normalized name+location",
        sourceCountEffect: "identity corroboration only; no rank boost",
        motionSignalMaxAgeDays: MOTION_SIGNAL_MAX_AGE_DAYS,
      },
    );

    return privateJson({
      ok: errors === 0,
      partial: errors > 0,
      source: SOURCE_ID,
      seen: candidates.length,
      audited: candidates.length - errors - requeuedThirdParty,
      qualified,
      stored: promoted,
      requeuedThirdParty,
      errors,
    });
  } catch (error) {
    const message = await failCollectorRun(runId, SOURCE_ID, error);
    return privateJson({ error: message, source: SOURCE_ID }, { status: 503 });
  }
}
