import type { CandidateInput } from "@/lib/leads/crawl";

export const IRS_SOURCE_ID = "national-nonprofits" as const;
export const IRS_MAX_CANDIDATES = 1500;
export const IRS_BATCH_SIZE = 100;
export const IRS_MAX_BATCHES = IRS_MAX_CANDIDATES / IRS_BATCH_SIZE;
export const IRS_MAX_BODY_BYTES = 256 * 1024;
export const IRS_SOURCE_URL = "https://www.irs.gov/charities-non-profits/exempt-organizations-business-master-file-extract-eo-bmf";
export const IRS_STATES = [
  "al", "ak", "az", "ar", "ca", "co", "ct", "de", "dc", "fl", "ga", "hi",
  "id", "il", "in", "ia", "ks", "ky", "la", "me", "md", "ma", "mi", "mn",
  "ms", "mo", "mt", "ne", "nv", "nh", "nj", "nm", "ny", "nc", "nd", "oh",
  "ok", "or", "pa", "ri", "sc", "sd", "tn", "tx", "ut", "vt", "va", "wa",
  "wv", "wi", "wy",
] as const;

export type IrsCursor = { file: string; fileIndex: number };
export type IrsBatch = {
  sourceId: typeof IRS_SOURCE_ID;
  runId: string;
  batchIndex: number;
  cursor: IrsCursor;
  candidates: CandidateInput[];
};
export type IrsReport = {
  sourceId: typeof IRS_SOURCE_ID;
  runId: string;
  cursor: IrsCursor;
  seen: number;
  qualified: number;
  stored: number;
  error?: string;
};

export class IrsInputError extends Error {
  constructor(message: string, readonly status = 400) {
    super(message);
  }
}

function object(value: unknown, keys: string[], name: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new IrsInputError(`${name} must be an object.`);
  }
  if (Object.keys(value).some((key) => !keys.includes(key))) {
    throw new IrsInputError(`${name} contains unsupported fields.`);
  }
  return value as Record<string, unknown>;
}

function text(value: unknown, name: string, limit: number, nullable = false) {
  if (nullable && (value === undefined || value === null)) return null;
  if (typeof value !== "string" || value.length > limit) {
    throw new IrsInputError(`${name} must be text of at most ${limit} characters.`);
  }
  return value.replace(/\s+/g, " ").trim();
}

function integer(value: unknown, name: string, maximum: number) {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0 || value > maximum) {
    throw new IrsInputError(`${name} is outside the allowed integer range.`);
  }
  return value;
}

function sourceId(value: unknown) {
  if (value !== IRS_SOURCE_ID && value !== "irs-nonprofits") {
    throw new IrsInputError("Only IRS nonprofit ingestion is supported.");
  }
  return IRS_SOURCE_ID;
}

function runId(value: unknown) {
  if (typeof value !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
    throw new IrsInputError("runId must be a UUID.");
  }
  return value.toLowerCase();
}

function cursor(value: unknown): IrsCursor {
  const input = object(value, ["file", "fileIndex"], "cursor");
  const fileIndex = integer(input.fileIndex, "fileIndex", IRS_STATES.length - 1);
  const expected = `https://www.irs.gov/pub/irs-soi/eo_${IRS_STATES[fileIndex]}.csv`;
  if (input.file !== expected) throw new IrsInputError("cursor must identify the matching official IRS state file.");
  return { file: expected, fileIndex };
}

function candidate(value: unknown, selectedFile: IrsCursor): CandidateInput {
  const input = object(value, [
    "source", "sourceKey", "organizationName", "alternateName", "category",
    "addressLine1", "city", "state", "postalCode", "countryCode", "sourceUrl",
    "formedAt", "prioritySeed", "metadata",
  ], "candidate");
  sourceId(input.source);
  const ein = text(input.sourceKey, "sourceKey", 9);
  if (!ein || !/^[0-9]{9}$/.test(ein)) throw new IrsInputError("sourceKey must be a nine-digit EIN.");
  const organizationName = text(input.organizationName, "organizationName", 260);
  if (!organizationName || organizationName.length < 3) throw new IrsInputError("organizationName is required.");
  const formedAt = text(input.formedAt, "formedAt", 10);
  if (!formedAt || !/^\d{4}-\d{2}-01$/.test(formedAt)) throw new IrsInputError("formedAt must be a ruling month.");
  const year = Number(formedAt.slice(0, 4));
  const month = Number(formedAt.slice(5, 7));
  if (year < 1900 || month < 1 || month > 12) {
    throw new IrsInputError("Candidate ruling month is invalid.");
  }
  // Recency is enforced atomically against the persisted run's UTC start
  // month. Validating against today's month here would break exact receipt
  // replays when a request straddles a month boundary.
  if (input.countryCode !== "US" || input.sourceUrl !== IRS_SOURCE_URL) {
    throw new IrsInputError("Candidates must identify the US official IRS source.");
  }
  const state = text(input.state, "state", 2)?.toLowerCase();
  if (!IRS_STATES.some((item) => item === state)) throw new IrsInputError("state must be a supported US state code.");
  const metadata = object(input.metadata, [
    "ein", "subsection", "nteeCode", "ruling", "taxPeriod", "assetAmount",
    "revenueAmount", "incomeAmount", "irsStateFile",
  ], "candidate metadata");
  if (metadata.ein !== ein || metadata.ruling !== formedAt.slice(0, 7).replace("-", "") ||
      metadata.irsStateFile !== IRS_STATES[selectedFile.fileIndex].toUpperCase()) {
    throw new IrsInputError("Candidate metadata must match its EIN, ruling month, and source file.");
  }
  for (const field of ["assetAmount", "revenueAmount", "incomeAmount"]) {
    if (typeof metadata[field] !== "number" || !Number.isFinite(metadata[field])) {
      throw new IrsInputError(`${field} must be a finite number.`);
    }
  }
  if ((metadata.assetAmount as number) > 100_000_000 || (metadata.revenueAmount as number) > 50_000_000) {
    throw new IrsInputError("Candidate exceeds the IRS prospect asset or revenue limits.");
  }
  return {
    source: IRS_SOURCE_ID,
    sourceKey: ein,
    organizationName,
    alternateName: text(input.alternateName, "alternateName", 260, true),
    category: text(input.category, "category", 160, true),
    addressLine1: text(input.addressLine1, "addressLine1", 220, true),
    city: text(input.city, "city", 120, true),
    state: state!.toUpperCase(),
    postalCode: text(input.postalCode, "postalCode", 24, true),
    countryCode: "US",
    sourceUrl: IRS_SOURCE_URL,
    formedAt,
    prioritySeed: integer(input.prioritySeed, "prioritySeed", 100),
    metadata: {
      ein,
      subsection: text(metadata.subsection, "subsection", 20, true),
      nteeCode: text(metadata.nteeCode, "nteeCode", 20, true),
      ruling: metadata.ruling,
      taxPeriod: text(metadata.taxPeriod, "taxPeriod", 20, true),
      assetAmount: metadata.assetAmount,
      revenueAmount: metadata.revenueAmount,
      incomeAmount: metadata.incomeAmount,
      irsStateFile: metadata.irsStateFile,
    },
  };
}

export function validateIrsBatch(value: unknown): IrsBatch {
  const input = object(value, ["sourceId", "runId", "batchIndex", "cursor", "candidates"], "batch");
  const selectedFile = cursor(input.cursor);
  if (!Array.isArray(input.candidates) || !input.candidates.length || input.candidates.length > IRS_BATCH_SIZE) {
    throw new IrsInputError(`A batch must contain 1–${IRS_BATCH_SIZE} candidates.`);
  }
  const candidates = input.candidates.map((item) => candidate(item, selectedFile));
  if (new Set(candidates.map((item) => item.sourceKey)).size !== candidates.length) {
    throw new IrsInputError("A batch must not contain duplicate EINs.");
  }
  return {
    sourceId: sourceId(input.sourceId), runId: runId(input.runId),
    batchIndex: integer(input.batchIndex, "batchIndex", IRS_MAX_BATCHES - 1),
    cursor: selectedFile, candidates,
  };
}

export function validateIrsReport(value: unknown): IrsReport {
  const input = object(value, ["sourceId", "runId", "cursor", "seen", "qualified", "stored", "error"], "report");
  const seen = integer(input.seen, "seen", 2_147_483_647);
  const qualified = integer(input.qualified, "qualified", IRS_MAX_CANDIDATES);
  const stored = integer(input.stored, "stored", IRS_MAX_CANDIDATES);
  if (qualified > seen || stored > qualified) throw new IrsInputError("Report counts are inconsistent.");
  const error = text(input.error, "error", 900, true);
  if (input.error !== undefined && !error) throw new IrsInputError("An error report requires a nonempty error message.");
  return {
    sourceId: sourceId(input.sourceId), runId: runId(input.runId), cursor: cursor(input.cursor),
    seen, qualified, stored, ...(error ? { error } : {}),
  };
}

export async function readIrsPayload(request: Request): Promise<unknown> {
  if (!/^application\/json(?:\s*;|$)/i.test(request.headers.get("content-type") || "")) {
    throw new IrsInputError("Content-Type must be application/json.", 415);
  }
  const length = request.headers.get("content-length");
  if (length && (!/^\d+$/.test(length) || Number(length) > IRS_MAX_BODY_BYTES)) {
    throw new IrsInputError("IRS request body is too large.", 413);
  }
  const reader = request.body?.getReader();
  if (!reader) throw new IrsInputError("A JSON request body is required.");
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > IRS_MAX_BODY_BYTES) {
        await reader.cancel();
        throw new IrsInputError("IRS request body is too large.", 413);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  try {
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch {
    throw new IrsInputError("Request body must be valid UTF-8 JSON.");
  }
}
