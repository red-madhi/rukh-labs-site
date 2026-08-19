import { NextRequest } from "next/server";
import {
  beginCollector,
  collectorAuthorized,
  failCollector,
  finishCollector,
  mapLimit,
  privateJson,
} from "@/lib/leads/pipeline";
import { leadNeonQuery, neonRowsToObjects } from "@/lib/leads/neon";
import { BRAVE_MONTHLY_REQUEST_LIMIT, reserveMonthlyApiUsage } from "@/lib/leads/api-budget";
import {
  candidateDomainGuesses,
  cleanSearchResultUrl,
  extractPageFacts,
  fetchPage,
  pageMatchesBusiness,
  robotsAllows,
} from "@/lib/leads/websites";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SOURCE_ID = "domain-discovery";
const CANDIDATE_LIMIT = 24;
const BRAVE_LIMIT = 2;

type Candidate = Record<string, string | null>;
type BravePayload = { web?: { results?: Array<{ url?: string }> } };
type Discovery = { website: string; email: string | null; phone: string | null; signal: string };

async function verifyUrl(url: string, candidate: Candidate): Promise<Discovery | null> {
  try {
    if (!(await robotsAllows(url))) return null;
    const page = await fetchPage(url, 7_000, 700_000);
    if (!pageMatchesBusiness(page, candidate.company_name || "", candidate.city, candidate.contact_phone)) return null;
    const facts = extractPageFacts(page.html, page.finalUrl);
    return { website: page.finalUrl, email: facts.email, phone: facts.phone, signal: "Likely official website found and verified against the organization" };
  } catch {
    return null;
  }
}

async function freeGuess(candidate: Candidate) {
  for (const guess of candidateDomainGuesses(candidate.company_name || "").slice(0, 4)) {
    const match = await verifyUrl(guess, candidate);
    if (match) return match;
  }
  return null;
}

async function paidSearch(candidate: Candidate, apiKey: string) {
  const location = [candidate.city, candidate.state].filter(Boolean).join(" ");
  const url = new URL("https://api.search.brave.com/res/v1/web/search");
  url.searchParams.set("q", `"${candidate.company_name || ""}" ${location} official website`.trim());
  url.searchParams.set("count", "6");
  url.searchParams.set("country", "us");
  url.searchParams.set("search_lang", "en");
  url.searchParams.set("safesearch", "moderate");
  const response = await fetch(url, {
    headers: { Accept: "application/json", "X-Subscription-Token": apiKey },
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) return null;
  const payload = (await response.json()) as BravePayload;
  for (const result of payload.web?.results ?? []) {
    const resultUrl = result.url ? cleanSearchResultUrl(result.url) : null;
    if (!resultUrl) continue;
    const match = await verifyUrl(resultUrl, candidate);
    if (match) return { ...match, signal: "Official website found through constrained web search and independently verified" };
  }
  return null;
}

async function save(candidate: Candidate, discovery: Discovery | null) {
  const exhausted = Number(candidate.discovery_attempts ?? 0) + 1 >= 2;
  const signal = discovery?.signal || (exhausted
    ? "No credible official website was found after repeated discovery passes"
    : "Website discovery pass did not find a verified match");
  await leadNeonQuery(
    `UPDATE public.lead_candidates
     SET website_url = COALESCE($2, website_url),
         contact_email = COALESCE(contact_email, $3),
         contact_phone = COALESCE(contact_phone, $4),
         discovery_attempts = discovery_attempts + 1,
         last_enriched_at = now(), last_error = NULL,
         signals = signals || $5::jsonb,
         status = CASE WHEN $2::text IS NOT NULL OR discovery_attempts + 1 >= 2 THEN 'ready' ELSE 'new' END,
         updated_at = now()
     WHERE id = $1::uuid`,
    [candidate.id, discovery?.website ?? null, discovery?.email ?? null, discovery?.phone ?? null, JSON.stringify([signal])],
  );
  return Boolean(discovery);
}

export async function GET(request: NextRequest) {
  if (!collectorAuthorized(request)) return privateJson({ error: "Collector authentication failed." }, { status: 401 });
  const runId = await beginCollector(SOURCE_ID);
  try {
    const result = await leadNeonQuery(
      `SELECT id::text, company_name, city, state, contact_phone, contact_email, source_score::text,
              discovery_attempts::text, formed_at::text, source_id, source_key
       FROM public.lead_candidates
       WHERE promoted_lead_id IS NULL
         AND website_url IS NULL
         AND status IN ('new', 'ready', 'error')
         AND discovery_attempts < 3
       ORDER BY
         CASE WHEN contact_phone IS NOT NULL OR contact_email IS NOT NULL THEN 0 ELSE 1 END,
         CASE WHEN source_id IN ('nppes-organizations', 'irs-nonprofits') THEN 0 ELSE 1 END,
         source_score DESC,
         formed_at DESC NULLS LAST,
         discovered_at DESC
       LIMIT $1::int`,
      [String(CANDIDATE_LIMIT)],
    );
    const candidates = neonRowsToObjects(result);
    const guesses = await mapLimit(candidates, 4, async (candidate) => ({ candidate, discovery: await freeGuess(candidate) }));
    const apiKey = process.env.BRAVE_SEARCH_API_KEY?.trim();
    const budget = apiKey
      ? await reserveMonthlyApiUsage("brave-search", BRAVE_LIMIT, BRAVE_MONTHLY_REQUEST_LIMIT)
      : { allowed: false, used: 0, limit: BRAVE_MONTHLY_REQUEST_LIMIT };
    let braveUsed = 0;
    let found = 0;
    for (const item of guesses) {
      let discovery = item.discovery;
      if (!discovery && apiKey && budget.allowed && braveUsed < BRAVE_LIMIT) {
        braveUsed += 1;
        discovery = await paidSearch(item.candidate, apiKey);
      }
      if (await save(item.candidate, discovery)) found += 1;
    }
    await finishCollector(runId, SOURCE_ID, candidates.length, found, { braveUsed, monthlyBudgetMode: "free-credits" });
    return privateJson({ ok: true, source: SOURCE_ID, seen: candidates.length, qualified: found, stored: found, braveUsed, braveLimit: BRAVE_LIMIT });
  } catch (error) {
    const message = await failCollector(runId, SOURCE_ID, error);
    return privateJson({ error: message, source: SOURCE_ID }, { status: 503 });
  }
}
