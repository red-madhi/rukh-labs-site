import { createHash } from "node:crypto";
import { contactValueMetadata } from "@/lib/leads/contact-values";
import { clamp, cleanText, normalizeWebsiteUrl } from "@/lib/leads/crawl";
import type { IrsBatch, IrsReport } from "@/lib/leads/irs-ingestion-contract";
import { leadNeonQuery, neonRowsToObjects } from "@/lib/leads/neon";

const SOURCE_ID = "national-nonprofits";

export class IrsConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "IrsConflictError";
  }
}

export type IrsBatchResult = {
  ok: true;
  stored: number;
  received: number;
  runStored: number;
  allowance: number;
  backpressure: string;
  replayed: boolean;
};

export type IrsReportResult = {
  ok: true;
  stored: number;
  status: "success" | "error";
  replayed: boolean;
};

type BatchReceipt = Omit<IrsBatchResult, "ok" | "replayed"> & { hash: string };

// The existing database role needs CREATE on public on first use. A deployment
// may instead provision this exact table ahead of time. Never perform this DDL
// in a build/test: initialization is reached only by authenticated handlers.
// The transaction-scoped schema lock also handles first use on multiple hosts;
// CREATE TABLE IF NOT EXISTS alone can race on PostgreSQL's catalog entries.
const SCHEMA_SQL = `DO $irs_schema$
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('rukh:lead_irs_ingestion_runs:schema', 0));
  CREATE TABLE IF NOT EXISTS public.lead_irs_ingestion_runs (
    run_id text PRIMARY KEY,
    collector_run_id uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
    source_id text NOT NULL DEFAULT 'national-nonprofits'
      CHECK (source_id = 'national-nonprofits'),
    cursor jsonb NOT NULL CHECK (jsonb_typeof(cursor) = 'object'),
    allowance integer NOT NULL CHECK (allowance BETWEEN 0 AND 1500),
    backpressure text NOT NULL CHECK (backpressure IN ('normal','moderate','high','heavy','critical')),
    received_count integer NOT NULL DEFAULT 0 CHECK (received_count BETWEEN 0 AND 1500),
    stored_count integer NOT NULL DEFAULT 0 CHECK (stored_count BETWEEN 0 AND 1500),
    next_batch_index integer NOT NULL DEFAULT 0 CHECK (next_batch_index BETWEEN 0 AND 15),
    received_eins text[] NOT NULL DEFAULT ARRAY[]::text[],
    receipts jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(receipts) = 'object'),
    status text NOT NULL DEFAULT 'running' CHECK (status IN ('running','success','error')),
    report_hash text,
    report jsonb,
    started_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    completed_at timestamptz,
    CHECK (stored_count <= received_count AND stored_count <= allowance),
    CHECK (cardinality(received_eins) = received_count),
    CHECK ((status = 'running' AND report_hash IS NULL AND completed_at IS NULL)
      OR (status <> 'running' AND report_hash IS NOT NULL AND completed_at IS NOT NULL))
  );
END
$irs_schema$;`;

let schemaReady: Promise<void> | undefined;

async function ensureSchema() {
  if (!schemaReady) {
    schemaReady = leadNeonQuery(SCHEMA_SQL).then(() => undefined).catch((error: unknown) => {
      schemaReady = undefined;
      throw error;
    });
  }
  await schemaReady;
}

function stableJson(value: unknown): string {
  const normalize = (item: unknown): unknown => {
    if (Array.isArray(item)) return item.map(normalize);
    if (item && typeof item === "object") {
      return Object.fromEntries(Object.entries(item)
        .filter(([, entry]) => entry !== undefined)
        .sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0)
        .map(([key, entry]) => [key, normalize(entry)]));
    }
    return item;
  };
  return JSON.stringify(normalize(value));
}

function hash(value: unknown) {
  return createHash("sha256").update(stableJson(value)).digest("hex");
}

async function initializeRun(run: Pick<IrsBatch, "runId" | "cursor">) {
  await ensureSchema();
  // This deliberately freezes blindCandidateAllowance(1500, pressure) once for
  // the WHOLE run, not once per upload. Keep these thresholds in sync with
  // backpressure.ts. A conflicting run_id never refreshes its allowance.
  await leadNeonQuery(
    `WITH pressure AS (
       SELECT count(*) AS domain_queue
       FROM public.lead_candidates
       WHERE archived_at IS NULL
         AND status IN ('domain-pending','domain-working','no-website')
         AND NOT EXISTS (
           SELECT 1 FROM public.lead_irs_ingestion_runs WHERE run_id = $1
         )
     ), initialized AS (
       INSERT INTO public.lead_irs_ingestion_runs (run_id, cursor, allowance, backpressure)
       SELECT $1, $2::jsonb,
         CASE WHEN domain_queue >= 75000 THEN 5
              WHEN domain_queue >= 30000 THEN 25
              WHEN domain_queue >= 15000 THEN 75
              WHEN domain_queue >= 5000 THEN 150 ELSE 1500 END,
         CASE WHEN domain_queue >= 75000 THEN 'critical'
              WHEN domain_queue >= 30000 THEN 'heavy'
              WHEN domain_queue >= 15000 THEN 'high'
              WHEN domain_queue >= 5000 THEN 'moderate' ELSE 'normal' END
       FROM pressure
       ON CONFLICT (run_id) DO NOTHING
       RETURNING collector_run_id, source_id
     )
     INSERT INTO public.lead_collector_runs (id, source_id, status)
     SELECT collector_run_id, source_id, 'running' FROM initialized`,
    [run.runId, stableJson(run.cursor)],
  );
}

function normalizedCandidates(batch: IrsBatch) {
  return batch.candidates.map((candidate, position) => {
    const contactValues = contactValueMetadata(candidate.email, candidate.websiteUrl);
    return {
      position,
      source: SOURCE_ID,
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
        ...(contactValues.emailCandidates.length > 1 ? {
          contactEmailCandidates: contactValues.emailCandidates,
          alternateContactEmails: contactValues.alternateContactEmails,
        } : {}),
        ...(contactValues.websiteCandidates.length > 1 ? {
          websiteCandidates: contactValues.websiteCandidates,
          alternateWebsiteUrls: contactValues.alternateWebsiteUrls,
        } : {}),
      },
    };
  });
}

async function readRun(runId: string) {
  const result = await leadNeonQuery(
    `SELECT cursor::text, receipts::text, next_batch_index::text, status,
            received_count::text, stored_count::text, received_eins::text,
            report_hash, to_char(started_at AT TIME ZONE 'UTC', 'YYYY-MM') AS ruling_month
     FROM public.lead_irs_ingestion_runs WHERE run_id = $1`,
    [runId],
  );
  const row = neonRowsToObjects(result)[0];
  if (!row) throw new Error("IRS ingestion run could not be read.");
  return row;
}

function batchResult(receipt: BatchReceipt, replayed: boolean): IrsBatchResult {
  return {
    ok: true,
    stored: receipt.stored,
    received: receipt.received,
    runStored: receipt.runStored,
    allowance: receipt.allowance,
    backpressure: receipt.backpressure,
    replayed,
  };
}

export async function ingestIrsBatch(batch: IrsBatch): Promise<IrsBatchResult> {
  const candidates = normalizedCandidates(batch);
  const eins = candidates.map((candidate) => candidate.source_key);
  // The HTTP contract validates all fields. These accounting invariants are
  // retained at the persistence boundary as defense against internal misuse.
  if (!Number.isInteger(batch.batchIndex) || batch.batchIndex < 0 || batch.batchIndex > 14
      || !candidates.length || candidates.length > 100 || new Set(eins).size !== eins.length
      || candidates.some((candidate) => !candidate.source_key || !candidate.organization_name)) {
    throw new IrsConflictError("IRS batch size, index, or candidate keys are invalid.");
  }
  const digest = hash({ sourceId: SOURCE_ID, runId: batch.runId,
    batchIndex: batch.batchIndex, cursor: batch.cursor, candidates });
  await initializeRun(batch);

  // Only the run-row UPDATE decides admission. Its WHERE and SET expressions
  // use that row directly: PostgreSQL rechecks them on the current row after a
  // concurrent update's lock is released. A stale CTE snapshot is never used
  // to decide quota, next index, or duplicate EIN acceptance.
  // All modifications below are ONE statement/transaction. If any candidate
  // fails, neither the receipt nor its quota/EIN accounting can commit.
  const result = await leadNeonQuery(
    `WITH claimed AS (
       UPDATE public.lead_irs_ingestion_runs AS run
       SET received_count = run.received_count + $4::int,
           stored_count = run.stored_count + LEAST($4::int, run.allowance - run.stored_count),
           next_batch_index = run.next_batch_index + 1,
           received_eins = run.received_eins || ARRAY(SELECT jsonb_array_elements_text($5::jsonb)),
           receipts = run.receipts || jsonb_build_object($2::text, jsonb_build_object(
             'hash', $3::text,
             'stored', LEAST($4::int, run.allowance - run.stored_count),
             'received', $4::int,
             'runStored', run.stored_count + LEAST($4::int, run.allowance - run.stored_count),
             'allowance', run.allowance,
             'backpressure', run.backpressure
           )),
           updated_at = now()
       WHERE run.run_id = $1 AND run.status = 'running'
         AND run.cursor = $6::jsonb
         AND run.next_batch_index = $2::int
         AND NOT (run.receipts ? $2::text)
         AND run.received_count + $4::int <= 1500
         AND NOT (run.received_eins && ARRAY(SELECT jsonb_array_elements_text($5::jsonb)))
         AND NOT EXISTS (
           SELECT 1 FROM jsonb_array_elements($7::jsonb) AS candidate
           WHERE candidate ->> 'formed_at' IS NULL
             OR (candidate ->> 'formed_at')::date <
               (date_trunc('month', run.started_at AT TIME ZONE 'UTC') - interval '59 months')::date
             OR (candidate ->> 'formed_at')::date >
               date_trunc('month', run.started_at AT TIME ZONE 'UTC')::date
         )
       RETURNING run.receipts -> $2::text AS receipt
     ), incoming AS (
       SELECT item.* FROM jsonb_to_recordset($7::jsonb) AS item(
         position integer, source text, source_key text, organization_name text,
         alternate_name text, category text, address_line1 text, city text,
         state text, postal_code text, country_code text, contact_name text,
         phone text, email text, website_url text, source_url text,
         formed_at date, priority_seed smallint, metadata jsonb
       )
     ), upserted AS (
       INSERT INTO public.lead_candidates AS existing (
         source, source_key, organization_name, alternate_name, category,
         address_line1, city, state, postal_code, country_code, contact_name,
         phone, email, website_url, source_url, formed_at, priority_seed,
         metadata, status, next_action_at
       )
       SELECT item.source, item.source_key, item.organization_name,
         item.alternate_name, item.category, item.address_line1, item.city,
         item.state, item.postal_code, item.country_code, item.contact_name,
         item.phone, item.email, item.website_url, item.source_url,
         item.formed_at, item.priority_seed, item.metadata,
         CASE WHEN item.website_url IS NULL THEN 'domain-pending' ELSE 'audit-pending' END,
         now()
       FROM incoming AS item CROSS JOIN claimed
       WHERE item.position < (claimed.receipt ->> 'stored')::int
       ORDER BY item.position
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
           ELSE existing.status END,
         next_action_at = CASE
           WHEN existing.website_url IS NULL AND EXCLUDED.website_url IS NOT NULL THEN now()
           ELSE existing.next_action_at END,
         updated_at = now()
       RETURNING id
     )
     SELECT claimed.receipt::text AS receipt,
       (counts.stored / CASE WHEN counts.stored = (claimed.receipt ->> 'stored')::int
                            THEN 1 ELSE 0 END)::text AS stored
     FROM claimed CROSS JOIN (SELECT count(*) AS stored FROM upserted) AS counts`,
    [batch.runId, batch.batchIndex, digest, candidates.length, JSON.stringify(eins),
      stableJson(batch.cursor), JSON.stringify(candidates)],
  );
  const applied = neonRowsToObjects(result)[0];
  if (applied?.receipt) {
    return batchResult(JSON.parse(applied.receipt) as BatchReceipt, false);
  }

  // A concurrent winner's receipt need not be visible in the failed claim's
  // statement snapshot. Read it in a separate statement after the lock wait.
  const run = await readRun(batch.runId);
  if (stableJson(JSON.parse(run.cursor ?? "null")) !== stableJson(batch.cursor)) {
    throw new IrsConflictError("IRS run cursor cannot change after the run starts.");
  }
  const receipts = JSON.parse(run.receipts ?? "{}") as Record<string, BatchReceipt>;
  const receipt = receipts[String(batch.batchIndex)];
  if (receipt) {
    if (receipt.hash !== digest) {
      throw new IrsConflictError("IRS batch index was already used for a different payload.");
    }
    return batchResult(receipt, true);
  }
  if (run.status !== "running") throw new IrsConflictError("IRS run has already been finalized.");
  if (Number(run.next_batch_index) !== batch.batchIndex) {
    throw new IrsConflictError("IRS batches must be submitted in sequential order.");
  }
  const rulingMonth = run.ruling_month ?? "";
  const runMonth = Number(rulingMonth.slice(0, 4)) * 12 + Number(rulingMonth.slice(5, 7));
  if (candidates.some((candidate) => {
    if (!candidate.formed_at) return true;
    const candidateMonth = Number(candidate.formed_at.slice(0, 4)) * 12
      + Number(candidate.formed_at.slice(5, 7));
    return candidateMonth > runMonth || candidateMonth < runMonth - 59;
  })) {
    throw new IrsConflictError("IRS ruling months must be within the run's start month and previous 59 months.");
  }
  throw new IrsConflictError("IRS batch repeats an EIN or exceeds the run's 1,500-candidate limit.");
}

export async function reportIrsRun(report: IrsReport): Promise<IrsReportResult> {
  const status = report.error ? "error" : "success";
  const digest = hash({ ...report, sourceId: SOURCE_ID });
  await initializeRun(report);
  const result = await leadNeonQuery(
    `WITH finalized AS (
       UPDATE public.lead_irs_ingestion_runs AS run
       SET status = $3, report_hash = $4,
           report = $5::jsonb || jsonb_build_object(
             'stored', run.stored_count, 'reportedStored', $7::int),
           completed_at = now(), updated_at = now()
       WHERE run.run_id = $1 AND run.status = 'running' AND run.cursor = $2::jsonb
         AND (($3 = 'success' AND run.received_count = $6::int AND run.stored_count = $7::int)
           OR ($3 = 'error' AND run.received_count <= $6::int AND run.stored_count >= $7::int))
       RETURNING run.*
     ), history AS (
       UPDATE public.lead_collector_runs AS history
       SET status = finalized.status, completed_at = finalized.completed_at,
           items_seen = $8::int, items_upserted = finalized.stored_count,
           error_message = $9
       FROM finalized
       WHERE history.id = finalized.collector_run_id
       RETURNING history.id
     ), source_state AS (
       UPDATE public.lead_source_state AS state
       SET status = CASE WHEN finalized.status = 'success' THEN 'ready' ELSE 'error' END,
           last_run_at = finalized.started_at,
           last_success_at = CASE WHEN finalized.status = 'success'
             THEN finalized.completed_at ELSE state.last_success_at END,
           last_items = finalized.stored_count,
           last_error = $9,
           updated_at = now()
       FROM finalized
       WHERE state.source_id = finalized.source_id
         AND (state.last_run_at IS NULL OR state.last_run_at <= finalized.started_at)
       RETURNING state.source_id
     )
     SELECT finalized.stored_count::text AS stored, finalized.status
     FROM finalized`,
    [report.runId, stableJson(report.cursor), status, digest, stableJson(report),
      report.qualified, report.stored, report.seen, report.error || null],
  );
  const finalized = neonRowsToObjects(result)[0];
  if (finalized) {
    return { ok: true, stored: Number(finalized.stored ?? 0), status, replayed: false };
  }
  const run = await readRun(report.runId);
  if (run.report_hash === digest && (run.status === "success" || run.status === "error")) {
    return { ok: true, stored: Number(run.stored_count ?? 0), status: run.status, replayed: true };
  }
  if (stableJson(JSON.parse(run.cursor ?? "null")) !== stableJson(report.cursor)) {
    throw new IrsConflictError("IRS report cursor does not match the run.");
  }
  if (run.status !== "running") {
    throw new IrsConflictError("IRS run was already finalized with a different report.");
  }
  throw new IrsConflictError("IRS report counts do not match the server's committed batches.");
}
