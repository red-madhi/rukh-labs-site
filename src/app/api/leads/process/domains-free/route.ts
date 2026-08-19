import type { NextRequest } from "next/server";
import { hasValidBasicAuth, hasValidCronAuth } from "@/lib/leads/auth";
import { beginCollectorRun, clamp, completeCollectorRun, failCollectorRun, privateJson } from "@/lib/leads/crawl";
import type { CandidateRow } from "@/lib/leads/crawl";
import { leadNeonQuery, neonRowsToObjects } from "@/lib/leads/neon";
import { candidateDomainGuesses, verifyOfficialWebsite } from "@/lib/leads/site";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SOURCE_ID = "domain-research-free";
const DEFAULT_LIMIT = 12;

function parseObject(value: string | null) {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
  } catch { return {}; }
}

function candidate(row: Record<string, string | null>): CandidateRow {
  return {
    id: row.id ?? "", source: row.source ?? "", sourceKey: row.source_key ?? "",
    organizationName: row.organization_name ?? "Unnamed organization", alternateName: row.alternate_name || undefined,
    category: row.category || undefined, addressLine1: row.address_line1 || undefined, city: row.city || undefined,
    state: row.state || undefined, postalCode: row.postal_code || undefined, countryCode: row.country_code || "US",
    contactName: row.contact_name || undefined, phone: row.phone || undefined, email: row.email || undefined,
    websiteUrl: row.website_url || undefined, sourceUrl: row.source_url || undefined, formedAt: row.formed_at || undefined,
    discoveredAt: row.discovered_at ?? new Date(0).toISOString(), status: row.status ?? "domain-pending",
    prioritySeed: Number(row.priority_seed ?? 0), domainConfidence: Number(row.domain_confidence ?? 0),
    attempts: Number(row.attempts ?? 0), audit: parseObject(row.audit), metadata: parseObject(row.metadata),
  };
}

async function claim(limit: number) {
  const result = await leadNeonQuery(
    `WITH picked AS (
       SELECT id
       FROM public.lead_candidates
       WHERE archived_at IS NULL
         AND status IN ('domain-pending','no-website','error')
         AND website_url IS NULL
         AND next_action_at <= now()
       ORDER BY
         CASE WHEN metadata ? 'motionSignal' THEN 0 WHEN email IS NOT NULL THEN 1 WHEN phone IS NOT NULL THEN 2 ELSE 3 END,
         priority_seed DESC, discovered_at DESC
       LIMIT $1::int
       FOR UPDATE SKIP LOCKED
     )
     UPDATE public.lead_candidates c
     SET status='domain-working', last_checked_at=now(), updated_at=now()
     FROM picked
     WHERE c.id=picked.id
     RETURNING c.id::text id,c.source,c.source_key,c.organization_name,c.alternate_name,c.category,c.address_line1,c.city,c.state,c.postal_code,c.country_code,c.contact_name,c.phone,c.email,c.website_url,c.source_url,c.formed_at::text,c.discovered_at::text,c.status,c.priority_seed::text,c.domain_confidence::text,c.attempts::text,c.audit::text,c.metadata::text`,
    [String(Math.max(1, Math.min(30, limit)))],
  );
  return neonRowsToObjects(result).map(candidate);
}

async function found(item: CandidateRow, match: { url: string; confidence: number; title?: string }) {
  await leadNeonQuery(
    `UPDATE public.lead_candidates
     SET website_url=$2, domain_confidence=$3::int, status='audit-pending', next_action_at=now(), last_error=NULL,
         metadata=metadata || $4::jsonb, updated_at=now()
     WHERE id=$1::uuid`,
    [item.id, match.url, String(clamp(match.confidence)), JSON.stringify({ domainResearchMethod: "free-direct", domainResearchTitle: match.title || null, domainResearchAt: new Date().toISOString() })],
  );
}

async function notFound(item: CandidateRow) {
  await leadNeonQuery(
    `UPDATE public.lead_candidates
     SET status='domain-pending',
         next_action_at=now()+interval '2 hours',
         metadata=metadata || jsonb_build_object('freeDomainAttempts', COALESCE((metadata->>'freeDomainAttempts')::int,0)+1, 'lastFreeDomainResearchAt', now()),
         last_error=NULL, updated_at=now()
     WHERE id=$1::uuid`,
    [item.id],
  );
}

export async function GET(request: NextRequest) {
  if (!hasValidCronAuth(request) && !hasValidBasicAuth(request)) return privateJson({ error: "Collector authentication failed." }, { status: 401 });
  const requested = Number(request.nextUrl.searchParams.get("limit") ?? DEFAULT_LIMIT);
  const limit = Math.max(1, Math.min(24, Number.isFinite(requested) ? requested : DEFAULT_LIMIT));
  const runId = await beginCollectorRun(SOURCE_ID);
  try {
    const items = await claim(limit);
    let resolved = 0;
    let errors = 0;
    for (const item of items) {
      try {
        const guesses = candidateDomainGuesses(item).slice(0, 5);
        const results = await Promise.all(guesses.map((guess) => verifyOfficialWebsite(item, guess)));
        const match = results.filter((value): value is NonNullable<typeof value> => Boolean(value)).sort((a,b) => b.confidence-a.confidence)[0];
        if (match) { await found(item, match); resolved += 1; }
        else await notFound(item);
      } catch (error) {
        errors += 1;
        await leadNeonQuery(`UPDATE public.lead_candidates SET status='domain-pending',next_action_at=now()+interval '2 hours',last_error=$2,updated_at=now() WHERE id=$1::uuid`, [item.id, (error instanceof Error ? error.message : "Free domain resolution failed").slice(0,600)]);
      }
    }
    await completeCollectorRun(runId,SOURCE_ID,items.length,resolved,{ lastProcessed: items.length,lastResolved: resolved,lastErrors: errors,braveUsed:0,priorityOrder:"motion > email > phone > blind" });
    return privateJson({ ok: errors===0,partial:errors>0,source:SOURCE_ID,seen:items.length,found:resolved,errors,braveUsed:0 });
  } catch (error) {
    const message=await failCollectorRun(runId,SOURCE_ID,error);
    return privateJson({ error:message,source:SOURCE_ID },{ status:503 });
  }
}
