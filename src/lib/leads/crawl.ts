import { contactValueMetadata, selectPrimaryWebsite } from "@/lib/leads/contact-values";
import { leadNeonQuery, neonRowsToObjects } from "@/lib/leads/neon";

export type CandidateInput = {
  source: string;
  sourceKey: string;
  organizationName: string;
  alternateName?: string | null;
  category?: string | null;
  addressLine1?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  countryCode?: string | null;
  contactName?: string | null;
  phone?: string | null;
  email?: string | null;
  websiteUrl?: string | null;
  sourceUrl?: string | null;
  formedAt?: string | null;
  prioritySeed?: number;
  metadata?: Record<string, unknown>;
};

export type CandidateRow = {
  id: string;
  source: string;
  sourceKey: string;
  organizationName: string;
  alternateName?: string;
  category?: string;
  addressLine1?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  countryCode: string;
  contactName?: string;
  phone?: string;
  email?: string;
  websiteUrl?: string;
  sourceUrl?: string;
  formedAt?: string;
  discoveredAt: string;
  status: string;
  prioritySeed: number;
  domainConfidence: number;
  attempts: number;
  audit: Record<string, unknown>;
  metadata: Record<string, unknown>;
};

export const CRAWLER_USER_AGENT =
  "Rukh-Leads/1.0 (+https://rukhlabs.com; public-data research and respectful website auditing)";

export function privateJson(body: unknown, init?: ResponseInit) {
  const response = Response.json(body, init);
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive, nosnippet");
  return response;
}

export function clamp(value: number, minimum = 0, maximum = 100) {
  return Math.min(maximum, Math.max(minimum, Math.round(value)));
}

export function cleanText(value: unknown, max = 320) {
  const normalized = typeof value === "string"
    ? value
        .replace(/<[^>]*>/g, " ")
        .replace(/&#x27;|&#39;|&apos;/gi, "'")
        .replace(/&quot;|&#34;/gi, '"')
        .replace(/&amp;/gi, "&")
        .replace(/&lt;/gi, "<")
        .replace(/&gt;/gi, ">")
        .replace(/&nbsp;/gi, " ")
        .replace(/\s+/g, " ")
        .trim()
    : "";
  return normalized.length > max
    ? `${normalized.slice(0, max - 1).trimEnd()}…`
    : normalized;
}

export function normalizeWebsiteUrl(value?: string | null) {
  return selectPrimaryWebsite(value);
}

export function canonicalHost(value?: string | null) {
  const url = normalizeWebsiteUrl(value);
  if (!url) return "";
  try {
    return new URL(url).hostname.replace(/^www\./i, "").toLowerCase();
  } catch {
    return "";
  }
}

const legalSuffixPattern =
  /\b(?:llc|l\.l\.c\.|incorporated|inc|corp(?:oration)?|company|co|limited|ltd|pllc|pc|p\.c\.|lp|llp|dba|the)\b/gi;

export function organizationTokens(value: string) {
  return cleanText(value, 220)
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(legalSuffixPattern, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter((token) => token.length >= 3 && !["group", "services", "service"].includes(token));
}

export function tokenSimilarity(organizationName: string, candidateText: string) {
  const left = new Set(organizationTokens(organizationName));
  const right = new Set(organizationTokens(candidateText));
  if (!left.size || !right.size) return 0;
  let overlap = 0;
  for (const token of left) if (right.has(token)) overlap += 1;
  return overlap / Math.max(1, Math.min(left.size, right.size));
}

export function inferIndustry(name: string, fallback = "Unclassified") {
  const text = name.toLowerCase();
  const rules: Array<[RegExp, string]> = [
    [/\b(dent|orthodont|oral surgery|endodont|periodont)\b/, "Dental practice"],
    [/\b(therapy|therapist|counsel|behavioral|mental health|psycholog)\b/, "Behavioral health"],
    [/\b(chiro|physical therapy|rehab|wellness)\b/, "Health and wellness"],
    [/\b(clinic|medical|healthcare|health care|family medicine|pediatr)\b/, "Healthcare practice"],
    [/\b(vet|veterinary|animal hospital|pet care)\b/, "Veterinary services"],
    [/\b(plumb|electric|roof|hvac|heating|cooling|landscap|contract|construction)\b/, "Home services"],
    [/\b(cleaning|janitorial|maid)\b/, "Cleaning services"],
    [/\b(restaurant|cafe|coffee|bakery|kitchen|grill|bistro|tavern)\b/, "Food and hospitality"],
    [/\b(salon|barber|spa|beauty|nail)\b/, "Personal services"],
    [/\b(law|legal|attorney)\b/, "Legal services"],
    [/\b(account|bookkeep|tax service|payroll)\b/, "Financial services"],
    [/\b(nonprofit|foundation|association|society|coalition|alliance|ministry|church)\b/, "Nonprofit organization"],
    [/\b(daycare|child care|preschool|academy|learning center)\b/, "Education and childcare"],
    [/\b(realty|real estate|property management)\b/, "Real estate"],
    [/\b(auto|automotive|collision|tire|garage)\b/, "Automotive services"],
    [/\b(photo|creative|studio|design|media|marketing)\b/, "Creative services"],
  ];
  return rules.find(([pattern]) => pattern.test(text))?.[1] ?? fallback;
}

const nonProspectNamePattern =
  /\b(?:registered agent|statutory agent|holdings?|investment holdings?|property holdings?|series llc|trust|estate of|condominium association|homeowners? association|hoa|capital management|acquisition|special purpose|management company)\b/i;

export function looksLikeNonProspectName(name: string) {
  const clean = cleanText(name, 240);
  return clean.length < 3 || nonProspectNamePattern.test(clean);
}

export function locationLabel(candidate: Pick<CandidateRow, "city" | "state" | "countryCode">) {
  const parts = [candidate.city, candidate.state].filter(Boolean);
  return parts.length ? parts.join(", ") : candidate.countryCode || "Location not confirmed";
}

function parseJsonObject(value: string | null) {
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

function toCandidate(row: Record<string, string | null>): CandidateRow {
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
    audit: parseJsonObject(row.audit),
    metadata: parseJsonObject(row.metadata),
  };
}

const candidateReturningColumns = `
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
  candidate.metadata::text AS metadata
`;

export async function getSourceConfig<T extends Record<string, unknown>>(
  sourceId: string,
  fallback: T,
) {
  const result = await leadNeonQuery(
    `SELECT config::text FROM public.lead_source_state WHERE source_id = $1`,
    [sourceId],
  );
  const row = neonRowsToObjects(result)[0];
  return { ...fallback, ...parseJsonObject(row?.config ?? null) } as T;
}

export async function setSourceConfig(sourceId: string, config: Record<string, unknown>) {
  await leadNeonQuery(
    `UPDATE public.lead_source_state
     SET config = $2::jsonb, updated_at = now()
     WHERE source_id = $1`,
    [sourceId, JSON.stringify(config)],
  );
}

export async function beginCollectorRun(sourceId: string) {
  const runId = crypto.randomUUID();
  await Promise.all([
    leadNeonQuery(
      `INSERT INTO public.lead_collector_runs (id, source_id, status)
       VALUES ($1::uuid, $2, 'running')`,
      [runId, sourceId],
    ),
    leadNeonQuery(
      `UPDATE public.lead_source_state
       SET last_run_at = now(), last_error = NULL, updated_at = now()
       WHERE source_id = $1`,
      [sourceId],
    ),
  ]);
  return runId;
}

export async function completeCollectorRun(
  runId: string,
  sourceId: string,
  seen: number,
  upserted: number,
  config?: Record<string, unknown>,
) {
  await Promise.all([
    leadNeonQuery(
      `UPDATE public.lead_collector_runs
       SET status = 'success', completed_at = now(), items_seen = $2::int, items_upserted = $3::int
       WHERE id = $1::uuid`,
      [runId, String(seen), String(upserted)],
    ),
    leadNeonQuery(
      `UPDATE public.lead_source_state
       SET status = 'ready',
           last_run_at = now(),
           last_success_at = now(),
           last_items = $2::int,
           last_error = NULL,
           config = COALESCE($3::jsonb, config),
           updated_at = now()
       WHERE source_id = $1`,
      [sourceId, String(upserted), config ? JSON.stringify(config) : null],
    ),
  ]);
}

export async function failCollectorRun(
  runId: string,
  sourceId: string,
  error: unknown,
) {
  const message = error instanceof Error ? error.message : "Unknown collector error";
  await Promise.allSettled([
    leadNeonQuery(
      `UPDATE public.lead_collector_runs
       SET status = 'error', completed_at = now(), error_message = $2
       WHERE id = $1::uuid`,
      [runId, message.slice(0, 900)],
    ),
    leadNeonQuery(
      `UPDATE public.lead_source_state
       SET status = 'error', last_run_at = now(), last_error = $2, updated_at = now()
       WHERE source_id = $1`,
      [sourceId, message.slice(0, 900)],
    ),
  ]);
  return message;
}

export async function upsertCandidates(candidates: CandidateInput[]) {
  if (!candidates.length) return 0;
  const normalized = candidates
    .map((candidate) => {
      const contactValues = contactValueMetadata(candidate.email, candidate.websiteUrl);
      return {
        source: cleanText(candidate.source, 80),
        source_key: cleanText(candidate.sourceKey, 300),
        organization_name: cleanText(candidate.organizationName, 260),
        alternate_name: cleanText(candidate.alternateName, 260) || null,
        category: cleanText(candidate.category, 160) || null,
        address_line1: cleanText(candidate.addressLine1, 220) || null,
        city: cleanText(candidate.city, 120) || null,
        state: cleanText(candidate.state, 80) || null,
        postal_code: cleanText(candidate.postalCode, 24) || null,
        country_code: cleanText(candidate.countryCode, 3).toUpperCase() || "US",
        contact_name: cleanText(candidate.contactName, 180) || null,
        phone: cleanText(candidate.phone, 60) || null,
        email: contactValues.primaryEmail,
        website_url: contactValues.primaryWebsite,
        source_url: normalizeWebsiteUrl(candidate.sourceUrl),
        formed_at: candidate.formedAt || null,
        priority_seed: clamp(candidate.prioritySeed ?? 0),
        metadata: {
          ...(candidate.metadata ?? {}),
          ...(contactValues.emailCandidates.length > 1
            ? {
                contactEmailCandidates: contactValues.emailCandidates,
                alternateContactEmails: contactValues.alternateContactEmails,
              }
            : {}),
          ...(contactValues.websiteCandidates.length > 1
            ? {
                websiteCandidates: contactValues.websiteCandidates,
                alternateWebsiteUrls: contactValues.alternateWebsiteUrls,
              }
            : {}),
        },
      };
    })
    .filter((candidate) => candidate.source && candidate.source_key && candidate.organization_name);

  if (!normalized.length) return 0;

  const result = await leadNeonQuery(
    `WITH incoming AS (
       SELECT *
       FROM jsonb_to_recordset($1::jsonb) AS item(
         source text,
         source_key text,
         organization_name text,
         alternate_name text,
         category text,
         address_line1 text,
         city text,
         state text,
         postal_code text,
         country_code text,
         contact_name text,
         phone text,
         email text,
         website_url text,
         source_url text,
         formed_at date,
         priority_seed smallint,
         metadata jsonb
       )
     )
     INSERT INTO public.lead_candidates AS existing (
       source,
       source_key,
       organization_name,
       alternate_name,
       category,
       address_line1,
       city,
       state,
       postal_code,
       country_code,
       contact_name,
       phone,
       email,
       website_url,
       source_url,
       formed_at,
       priority_seed,
       metadata,
       status,
       next_action_at
     )
     SELECT
       source,
       source_key,
       organization_name,
       alternate_name,
       category,
       address_line1,
       city,
       state,
       postal_code,
       country_code,
       contact_name,
       phone,
       email,
       website_url,
       source_url,
       formed_at,
       priority_seed,
       metadata,
       CASE WHEN website_url IS NULL THEN 'domain-pending' ELSE 'audit-pending' END,
       now()
     FROM incoming
     ON CONFLICT (source, source_key) DO UPDATE SET
       organization_name = EXCLUDED.organization_name,
       alternate_name = COALESCE(EXCLUDED.alternate_name, existing.alternate_name),
       category = COALESCE(EXCLUDED.category, existing.category),
       address_line1 = COALESCE(EXCLUDED.address_line1, existing.address_line1),
       city = COALESCE(EXCLUDED.city, existing.city),
       state = COALESCE(EXCLUDED.state, existing.state),
       postal_code = COALESCE(EXCLUDED.postal_code, existing.postal_code),
       country_code = COALESCE(EXCLUDED.country_code, existing.country_code),
       contact_name = COALESCE(EXCLUDED.contact_name, existing.contact_name),
       phone = COALESCE(EXCLUDED.phone, existing.phone),
       email = COALESCE(EXCLUDED.email, existing.email),
       website_url = COALESCE(existing.website_url, EXCLUDED.website_url),
       source_url = COALESCE(EXCLUDED.source_url, existing.source_url),
       formed_at = COALESCE(EXCLUDED.formed_at, existing.formed_at),
       priority_seed = GREATEST(existing.priority_seed, EXCLUDED.priority_seed),
       metadata = existing.metadata || EXCLUDED.metadata,
       status = CASE
         WHEN existing.status IN ('qualified', 'rejected') THEN existing.status
         WHEN existing.website_url IS NULL AND EXCLUDED.website_url IS NOT NULL THEN 'audit-pending'
         ELSE existing.status
       END,
       next_action_at = CASE
         WHEN existing.website_url IS NULL AND EXCLUDED.website_url IS NOT NULL THEN now()
         ELSE existing.next_action_at
       END,
       updated_at = now()
     RETURNING id::text`,
    [JSON.stringify(normalized)],
  );
  return result.rows?.length ?? result.rowCount ?? 0;
}

export async function claimDomainCandidates(limit: number) {
  const result = await leadNeonQuery(
    `WITH picked AS (
       SELECT id
       FROM public.lead_candidates
       WHERE archived_at IS NULL
         AND status IN ('domain-pending', 'no-website', 'error')
         AND website_url IS NULL
         AND next_action_at <= now()
         AND attempts < 6
       ORDER BY priority_seed DESC, discovered_at DESC
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
     RETURNING ${candidateReturningColumns}`,
    [String(Math.max(1, Math.min(30, limit)))],
  );
  return neonRowsToObjects(result).map(toCandidate);
}

export async function claimAuditCandidates(limit: number) {
  const result = await leadNeonQuery(
    `WITH picked AS (
       SELECT id
       FROM public.lead_candidates
       WHERE archived_at IS NULL
         AND status IN ('audit-pending', 'error')
         AND website_url IS NOT NULL
         AND next_action_at <= now()
         AND attempts < 8
       ORDER BY priority_seed DESC, discovered_at DESC
       LIMIT $1::int
       FOR UPDATE SKIP LOCKED
     )
     UPDATE public.lead_candidates AS candidate
     SET status = 'audit-working',
         attempts = attempts + 1,
         last_checked_at = now(),
         updated_at = now()
     FROM picked
     WHERE candidate.id = picked.id
     RETURNING ${candidateReturningColumns}`,
    [String(Math.max(1, Math.min(30, limit)))],
  );
  return neonRowsToObjects(result).map(toCandidate);
}

export async function crawlStats() {
  const result = await leadNeonQuery(
    `SELECT
       count(*) FILTER (WHERE archived_at IS NULL)::text AS candidates,
       count(*) FILTER (WHERE archived_at IS NULL AND website_url IS NOT NULL)::text AS websites_found,
       count(*) FILTER (WHERE archived_at IS NULL AND status IN ('domain-pending','domain-working','no-website'))::text AS domain_queue,
       count(*) FILTER (WHERE archived_at IS NULL AND status IN ('audit-pending','audit-working'))::text AS audit_queue,
       count(*) FILTER (WHERE archived_at IS NULL AND status IN ('audited','qualified'))::text AS audited,
       count(*) FILTER (WHERE archived_at IS NULL AND status = 'qualified')::text AS qualified
     FROM public.lead_candidates`,
  );
  const row = neonRowsToObjects(result)[0] ?? {};
  return Object.fromEntries(
    Object.entries(row).map(([key, value]) => [key, Number(value ?? 0)]),
  );
}
