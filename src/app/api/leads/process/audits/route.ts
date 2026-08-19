import type { NextRequest } from "next/server";
import { hasValidBasicAuth, hasValidCronAuth } from "@/lib/leads/auth";
import {
  beginCollectorRun,
  claimAuditCandidates,
  completeCollectorRun,
  failCollectorRun,
  locationLabel,
  privateJson,
} from "@/lib/leads/crawl";
import type { CandidateRow } from "@/lib/leads/crawl";
import { leadNeonQuery } from "@/lib/leads/neon";
import { auditWebsite } from "@/lib/leads/site";
import type { WebsiteAuditResult } from "@/lib/leads/site";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SOURCE_ID = "website-auditor";
const DEFAULT_LIMIT = 6;

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

  const parked = isParkedAudit(audit);
  const leadSource = parked ? "new-business" : "site-audit";
  const sourceKey = `candidate:${candidate.id}`;
  const priority = audit.score >= 85 ? "hot" : audit.score >= 70 ? "strong" : "watch";
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
    : audit.signals;
  const risks = parked
    ? Array.from(
        new Set([
          ...audit.risks,
          "The organization may use another official domain; verify that before outreach",
        ]),
      )
    : audit.risks;
  const tags = parked
    ? ["parked domain", "no usable website", candidate.source, candidate.category || "unclassified"]
    : ["website audit", candidate.source, candidate.category || "unclassified"];
  const auditPayload = parkedAuditPayload(audit, parked);

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
      String(audit.score),
      priority,
      JSON.stringify(signals),
      JSON.stringify(risks),
      JSON.stringify(tags),
      pitch,
      JSON.stringify(auditPayload),
      JSON.stringify({
        candidateId: candidate.id,
        candidateSource: candidate.source,
        domainConfidence: candidate.domainConfidence,
        prioritySeed: candidate.prioritySeed,
        parkedDomain: parked ? audit.finalUrl : null,
      }),
    ],
  );
  return true;
}

async function handleCandidate(candidate: CandidateRow) {
  try {
    const audit = await auditWebsite(candidate);
    await saveAudit(candidate, audit);
    const promoted = await promoteAudit(candidate, audit);
    return { promoted, qualified: audit.qualified, error: false };
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
    return { promoted: false, qualified: false, error: true };
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

    await completeCollectorRun(
      runId,
      SOURCE_ID,
      candidates.length,
      promoted,
      {
        lastProcessed: candidates.length,
        lastQualified: qualified,
        lastErrors: errors,
      },
    );

    return privateJson({
      ok: errors === 0,
      partial: errors > 0,
      source: SOURCE_ID,
      seen: candidates.length,
      audited: candidates.length - errors,
      qualified,
      stored: promoted,
      errors,
    });
  } catch (error) {
    const message = await failCollectorRun(runId, SOURCE_ID, error);
    return privateJson({ error: message, source: SOURCE_ID }, { status: 503 });
  }
}
