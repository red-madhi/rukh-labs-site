import type { NextRequest } from "next/server";
import { hasValidBasicAuth, hasValidCronAuth } from "@/lib/leads/auth";
import {
  beginCollectorRun,
  clamp,
  completeCollectorRun,
  failCollectorRun,
  locationLabel,
  privateJson,
} from "@/lib/leads/crawl";
import type { CandidateRow } from "@/lib/leads/crawl";
import { leadNeonQuery, neonRowsToObjects } from "@/lib/leads/neon";
import {
  BRAVE_MONTHLY_REQUEST_LIMIT,
  reserveMonthlyApiUsage,
} from "@/lib/leads/api-budget";
import {
  candidateDomainGuesses,
  searchOfficialWebsite,
  verifyOfficialWebsite,
} from "@/lib/leads/site";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SOURCE_ID = "domain-research";
const DEFAULT_LIMIT = 5;
const BRAVE_LOOKUPS_PER_RUN = 2;

function parseObject(value: string | null) {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

function candidateFromRow(row: Record<string, string | null>): CandidateRow {
  return {
    id: row.id ?? "",
    source: row.source ?? "",
    sourceKey: row.source_key ?? "",
    organizationName: row.organization_name ?? "Unnamed organization",
    alternateName: row.alternate_name || undefined,
    category: row.category || undefined,
    addressLine1: row.address_line1 || undefined,
    city: row.city || undefined,
    state: row.state || undefined,
    postalCode: row.postal_code || undefined,
    countryCode: row.country_code || "US",
    contactName: row.contact_name || undefined,
    phone: row.phone || undefined,
    email: row.email || undefined,
    websiteUrl: row.website_url || undefined,
    sourceUrl: row.source_url || undefined,
    formedAt: row.formed_at || undefined,
    discoveredAt: row.discovered_at ?? new Date(0).toISOString(),
    status: row.status ?? "domain-pending",
    prioritySeed: Number(row.priority_seed ?? 0),
    domainConfidence: Number(row.domain_confidence ?? 0),
    attempts: Number(row.attempts ?? 0),
    audit: parseObject(row.audit),
    metadata: parseObject(row.metadata),
  };
}

async function claimPrioritizedDomainCandidates(limit: number) {
  const result = await leadNeonQuery(
    `WITH picked AS (
       SELECT id
       FROM public.lead_candidates
       WHERE archived_at IS NULL
         AND status IN ('domain-pending', 'no-website', 'error')
         AND website_url IS NULL
         AND next_action_at <= now()
         AND attempts < 6
       ORDER BY
         CASE
           WHEN metadata ? 'motionSignal' THEN 0
           WHEN email IS NOT NULL THEN 1
           WHEN phone IS NOT NULL THEN 2
           ELSE 3
         END,
         priority_seed DESC,
         discovered_at DESC
       LIMIT $1::int
       FOR UPDATE SKIP LOCKED
     )
     UPDATE public.lead_candidates AS candidate
     SET status = 'domain-working',
         attempts = attempts + 1,
         last_checked_at = now(),
         updated_at = now()
     FROM picked
     WHERE candidate.id = picked.id
     RETURNING
       candidate.id::text AS id,
       candidate.source AS source,
       candidate.source_key AS source_key,
       candidate.organization_name AS organization_name,
       candidate.alternate_name AS alternate_name,
       candidate.category AS category,
       candidate.address_line1 AS address_line1,
       candidate.city AS city,
       candidate.state AS state,
       candidate.postal_code AS postal_code,
       candidate.country_code AS country_code,
       candidate.contact_name AS contact_name,
       candidate.phone AS phone,
       candidate.email AS email,
       candidate.website_url AS website_url,
       candidate.source_url AS source_url,
       candidate.formed_at::text AS formed_at,
       candidate.discovered_at::text AS discovered_at,
       candidate.status AS status,
       candidate.priority_seed::text AS priority_seed,
       candidate.domain_confidence::text AS domain_confidence,
       candidate.attempts::text AS attempts,
       candidate.audit::text AS audit,
       candidate.metadata::text AS metadata`,
    [String(Math.max(1, Math.min(30, limit)))],
  );
  return neonRowsToObjects(result).map(candidateFromRow);
}

async function markFound(
  candidate: CandidateRow,
  result: { url: string; confidence: number; title?: string },
  method: "direct-guess" | "brave-search",
) {
  await leadNeonQuery(
    `UPDATE public.lead_candidates
     SET website_url = $2,
         domain_confidence = $3::int,
         status = 'audit-pending',
         next_action_at = now(),
         last_error = NULL,
         metadata = metadata || $4::jsonb,
         updated_at = now()
     WHERE id = $1::uuid`,
    [
      candidate.id,
      result.url,
      String(clamp(result.confidence)),
      JSON.stringify({
        domainResearchMethod: method,
        domainResearchTitle: result.title || null,
        domainResearchAt: new Date().toISOString(),
      }),
    ],
  );
}

async function promoteNoWebsite(candidate: CandidateRow, verifiedSearch: boolean) {
  if (!candidate.phone && !candidate.email) return false;
  if (!verifiedSearch && candidate.attempts < 5) return false;

  const score = clamp(
    72 +
      Math.min(12, candidate.prioritySeed / 6) +
      (candidate.phone ? 5 : 0) +
      (candidate.email ? 5 : 0) +
      (candidate.formedAt &&
      new Date(candidate.formedAt).getUTCFullYear() >= new Date().getUTCFullYear() - 1
        ? 8
        : 0),
  );
  const priority = score >= 85 ? "hot" : score >= 70 ? "strong" : "watch";
  const location = locationLabel(candidate);
  const motionSignal = typeof candidate.metadata.motionSignal === "string"
    ? candidate.metadata.motionSignal
    : "";
  const motionFreshness = Number(candidate.metadata.motionFreshnessDays ?? NaN);
  const summary = `${candidate.organizationName} appears to be an active ${candidate.category || "organization"} in ${location}, but no official website was found after domain and public-web checks.`;
  const pitch = `I found ${candidate.organizationName} while reviewing ${candidate.category || "businesses"} in ${location}. I could not find a clear official website, even though the organization appears active. I build straightforward small-business sites and can send a fixed-price launch plan if a proper web presence is still on the list.`;
  const signals = [
    "No official website found after repeated direct-domain checks",
    verifiedSearch
      ? "Public web search did not identify a verified official domain"
      : "Multiple likely domains were checked without a match",
    candidate.phone || candidate.email
      ? "A direct public contact method is available"
      : "Contact details require additional research",
  ];
  if (motionSignal) {
    signals.unshift(
      Number.isFinite(motionFreshness)
        ? `Official business activity signal is ${Math.max(0, Math.round(motionFreshness))} days old`
        : "A recent official business activity signal is present",
    );
  }

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
       location,
       industry,
       summary,
       score,
       priority,
       signals,
       risks,
       tags,
       pitch,
       raw_payload,
       last_checked_at
     )
     VALUES (
       'new-business',
       $1,
       $2,
       now(),
       $3,
       $4,
       $5,
       $6,
       $2,
       $7,
       $8,
       $9,
       $10::int,
       $11,
       $12::jsonb,
       $13::jsonb,
       $14::jsonb,
       $15,
       $16::jsonb,
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
       location = EXCLUDED.location,
       industry = EXCLUDED.industry,
       summary = EXCLUDED.summary,
       score = GREATEST(existing.score, EXCLUDED.score),
       priority = CASE
         WHEN GREATEST(existing.score, EXCLUDED.score) >= 85 THEN 'hot'
         WHEN GREATEST(existing.score, EXCLUDED.score) >= 70 THEN 'strong'
         ELSE 'watch'
       END,
       signals = EXCLUDED.signals,
       risks = EXCLUDED.risks,
       tags = EXCLUDED.tags,
       pitch = EXCLUDED.pitch,
       raw_payload = EXCLUDED.raw_payload,
       last_checked_at = now()`,
    [
      `candidate:${candidate.id}`,
      candidate.sourceUrl || null,
      candidate.organizationName,
      candidate.contactName || null,
      candidate.email || null,
      candidate.phone || null,
      location,
      candidate.category || "Unclassified",
      summary,
      String(score),
      priority,
      JSON.stringify(signals),
      JSON.stringify([
        "The organization may use a social profile or an unindexed website",
        "Confirm the absence of an official site manually before outreach",
      ]),
      JSON.stringify([
        "no website",
        candidate.source,
        ...(motionSignal ? ["business-in-motion"] : []),
        candidate.category || "unclassified",
      ]),
      pitch,
      JSON.stringify({
        candidateId: candidate.id,
        candidateSource: candidate.source,
        domainAttempts: candidate.attempts,
        verifiedSearch,
        motionSignal: motionSignal || null,
        motionFreshnessDays: Number.isFinite(motionFreshness) ? motionFreshness : null,
      }),
    ],
  );

  await leadNeonQuery(
    `UPDATE public.lead_candidates
     SET status = 'qualified',
         next_action_at = now() + interval '90 days',
         last_error = NULL,
         updated_at = now()
     WHERE id = $1::uuid`,
    [candidate.id],
  );
  return true;
}

async function markNotFound(candidate: CandidateRow, verifiedSearch: boolean) {
  const promoted = await promoteNoWebsite(candidate, verifiedSearch);
  if (promoted) return { promoted: true, noWebsite: true };

  const exhausted = candidate.attempts >= 5;
  await leadNeonQuery(
    `UPDATE public.lead_candidates
     SET status = $2,
         next_action_at = now() + CASE WHEN $2 = 'no-website' THEN interval '90 days' ELSE interval '3 days' END,
         last_error = NULL,
         metadata = metadata || $3::jsonb,
         updated_at = now()
     WHERE id = $1::uuid`,
    [
      candidate.id,
      exhausted ? "no-website" : "domain-pending",
      JSON.stringify({
        lastDomainResearchAt: new Date().toISOString(),
        publicSearchAttempted: verifiedSearch,
      }),
    ],
  );
  return { promoted: false, noWebsite: exhausted };
}

async function markError(candidate: CandidateRow, error: unknown) {
  const message = error instanceof Error ? error.message : "Domain research failed.";
  await leadNeonQuery(
    `UPDATE public.lead_candidates
     SET status = 'error',
         next_action_at = now() + interval '1 day',
         last_error = $2,
         updated_at = now()
     WHERE id = $1::uuid`,
    [candidate.id, message.slice(0, 700)],
  );
}

export async function GET(request: NextRequest) {
  if (!hasValidCronAuth(request) && !hasValidBasicAuth(request)) {
    return privateJson({ error: "Collector authentication failed." }, { status: 401 });
  }

  const requestedLimit = Number(request.nextUrl.searchParams.get("limit") ?? DEFAULT_LIMIT);
  const limit = Math.max(1, Math.min(12, Number.isFinite(requestedLimit) ? requestedLimit : DEFAULT_LIMIT));
  const runId = await beginCollectorRun(SOURCE_ID);

  try {
    const candidates = await claimPrioritizedDomainCandidates(limit);
    const braveKey = process.env.BRAVE_SEARCH_API_KEY?.trim();
    let braveLookups = 0;
    let braveBudgetBlocked = false;
    let found = 0;
    let promoted = 0;
    let noWebsite = 0;
    let errors = 0;

    for (const candidate of candidates) {
      try {
        const guesses = candidateDomainGuesses(candidate).slice(0, 4);
        const directResults = await Promise.all(
          guesses.map((guess) => verifyOfficialWebsite(candidate, guess)),
        );
        const direct = directResults
          .filter((result): result is NonNullable<typeof result> => Boolean(result))
          .sort((left, right) => right.confidence - left.confidence)[0];

        if (direct) {
          await markFound(candidate, direct, "direct-guess");
          found += 1;
          continue;
        }

        let searched = false;
        if (braveKey && braveLookups < BRAVE_LOOKUPS_PER_RUN && !braveBudgetBlocked) {
          const budget = await reserveMonthlyApiUsage(
            "brave-search",
            1,
            BRAVE_MONTHLY_REQUEST_LIMIT,
          );
          if (budget.allowed) {
            braveLookups += 1;
            searched = true;
            const result = await searchOfficialWebsite(candidate, braveKey);
            if (result) {
              await markFound(candidate, result, "brave-search");
              found += 1;
              continue;
            }
          } else {
            braveBudgetBlocked = true;
          }
        }

        const outcome = await markNotFound(candidate, searched);
        if (outcome.promoted) promoted += 1;
        if (outcome.noWebsite) noWebsite += 1;
      } catch (error) {
        errors += 1;
        await markError(candidate, error);
      }
    }

    await completeCollectorRun(
      runId,
      SOURCE_ID,
      candidates.length,
      found + promoted,
      {
        lastBraveLookups: braveLookups,
        braveBudgetBlocked,
        lastProcessed: candidates.length,
        lastPriorityOrder: "motion > email > phone > blind",
      },
    );

    return privateJson({
      ok: errors === 0,
      partial: errors > 0,
      source: SOURCE_ID,
      seen: candidates.length,
      found,
      promoted,
      noWebsite,
      errors,
      stored: promoted,
      braveLookups,
      braveBudgetBlocked,
      priorityOrder: "motion > email > phone > blind",
    });
  } catch (error) {
    const message = await failCollectorRun(runId, SOURCE_ID, error);
    return privateJson({ error: message, source: SOURCE_ID }, { status: 503 });
  }
}
