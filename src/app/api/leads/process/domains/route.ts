import type { NextRequest } from "next/server";
import { hasValidBasicAuth, hasValidCronAuth } from "@/lib/leads/auth";
import {
  beginCollectorRun,
  clamp,
  claimDomainCandidates,
  completeCollectorRun,
  failCollectorRun,
  locationLabel,
  privateJson,
} from "@/lib/leads/crawl";
import type { CandidateRow } from "@/lib/leads/crawl";
import { leadNeonQuery } from "@/lib/leads/neon";
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
  const summary = `${candidate.organizationName} appears to be an active ${candidate.category || "organization"} in ${location}, but no official website was found after domain and public-web checks.`;
  const pitch = `I found ${candidate.organizationName} while reviewing ${candidate.category || "businesses"} in ${location}. I could not find a clear official website, even though the organization appears active. I build straightforward small-business sites and can send a fixed-price launch plan if a proper web presence is still on the list.`;

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
      JSON.stringify([
        "No official website found after repeated direct-domain checks",
        verifiedSearch
          ? "Public web search did not identify a verified official domain"
          : "Multiple likely domains were checked without a match",
        candidate.phone || candidate.email
          ? "A direct public contact method is available"
          : "Contact details require additional research",
      ]),
      JSON.stringify([
        "The organization may use a social profile or an unindexed website",
        "Confirm the absence of an official site manually before outreach",
      ]),
      JSON.stringify([
        "no website",
        candidate.source,
        candidate.category || "unclassified",
      ]),
      pitch,
      JSON.stringify({
        candidateId: candidate.id,
        candidateSource: candidate.source,
        domainAttempts: candidate.attempts,
        verifiedSearch,
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
    const candidates = await claimDomainCandidates(limit);
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
    });
  } catch (error) {
    const message = await failCollectorRun(runId, SOURCE_ID, error);
    return privateJson({ error: message, source: SOURCE_ID }, { status: 503 });
  }
}
