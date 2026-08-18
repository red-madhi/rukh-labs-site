import type { NextRequest } from "next/server";
import { hasValidBasicAuth, hasValidCronAuth } from "@/lib/leads/auth";
import {
  beginCollectorRun,
  clamp,
  cleanText,
  completeCollectorRun,
  failCollectorRun,
  getSourceConfig,
  inferIndustry,
  looksLikeNonProspectName,
  privateJson,
  upsertCandidates,
} from "@/lib/leads/crawl";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SOURCE_ID = "national-nonprofits";
const SOURCE_URL =
  "https://www.irs.gov/charities-non-profits/exempt-organizations-business-master-file-extract-eo-bmf";
const MAX_BYTES_PER_RUN = 4_500_000;
const MAX_ROWS_PER_RUN = 2_000;
const MAX_CANDIDATES_PER_RUN = 600;

const states = [
  "al","ak","az","ar","ca","co","ct","de","dc","fl","ga","hi","id","il","in","ia","ks",
  "ky","la","me","md","ma","mi","mn","ms","mo","mt","ne","nv","nh","nj","nm","ny","nc",
  "nd","oh","ok","or","pa","ri","sc","sd","tn","tx","ut","vt","va","wa","wv","wi","wy",
] as const;

const expectedHeaders = [
  "EIN","NAME","ICO","STREET","CITY","STATE","ZIP","GROUP","SUBSECTION","AFFILIATION",
  "CLASSIFICATION","RULING","DEDUCTIBILITY","FOUNDATION","ACTIVITY","ORGANIZATION","STATUS",
  "TAX_PERIOD","ASSET_CD","INCOME_CD","FILING_REQ_CD","PF_FILING_REQ_CD","ACCT_PD",
  "ASSET_AMT","INCOME_AMT","REVENUE_AMT","NTEE_CD","SORT_NAME",
] as const;

const largeInstitutionPattern =
  /\b(?:university|college system|medical center|health system|hospital system|department of|state of |county of |city of |federal|national headquarters)\b/i;

const nteeLabels: Record<string, string> = {
  A: "Arts and culture nonprofit",
  B: "Education nonprofit",
  C: "Environmental nonprofit",
  D: "Animal welfare nonprofit",
  E: "Health nonprofit",
  F: "Mental health nonprofit",
  G: "Disease and disorder nonprofit",
  H: "Medical research nonprofit",
  I: "Crime and legal nonprofit",
  J: "Employment nonprofit",
  K: "Food and agriculture nonprofit",
  L: "Housing nonprofit",
  M: "Public safety nonprofit",
  N: "Recreation and sports nonprofit",
  O: "Youth development nonprofit",
  P: "Human services nonprofit",
  Q: "International nonprofit",
  R: "Civil rights nonprofit",
  S: "Community improvement nonprofit",
  T: "Philanthropy nonprofit",
  U: "Science and technology nonprofit",
  V: "Social science nonprofit",
  W: "Public benefit nonprofit",
  X: "Religious nonprofit",
  Y: "Mutual benefit organization",
  Z: "Unclassified nonprofit",
};

function parseCsvLine(line: string) {
  const values: string[] = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"') {
      if (quoted && line[index + 1] === '"') {
        value += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
      continue;
    }
    if (character === "," && !quoted) {
      values.push(value);
      value = "";
      continue;
    }
    value += character;
  }
  values.push(value);
  return values;
}

function rowObject(headers: readonly string[], values: string[]) {
  return Object.fromEntries(
    headers.map((header, index) => [header, cleanText(values[index] ?? "", 500)]),
  ) as Record<string, string>;
}

function rulingDate(value: string) {
  if (!/^\d{6}$/.test(value)) return null;
  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(4, 6));
  if (year < 1900 || month < 1 || month > 12) return null;
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-01`;
}

function amount(value: string) {
  const parsed = Number(value.replace(/[^\d.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function priorityFor(row: Record<string, string>, category: string) {
  const ruling = rulingDate(row.RULING);
  const rulingYear = ruling ? Number(ruling.slice(0, 4)) : 0;
  const currentYear = new Date().getUTCFullYear();
  const revenue = amount(row.REVENUE_AMT);
  let score = 38;
  if (rulingYear >= currentYear - 1) score += 22;
  else if (rulingYear >= currentYear - 4) score += 14;
  else if (rulingYear >= currentYear - 8) score += 7;
  if (revenue > 0 && revenue <= 2_000_000) score += 8;
  if (/community|animal|arts|recreation|youth|human services|food|housing/i.test(category)) score += 7;
  if (/religious/i.test(category)) score -= 5;
  return clamp(score);
}

export async function GET(request: NextRequest) {
  if (!hasValidCronAuth(request) && !hasValidBasicAuth(request)) {
    return privateJson({ error: "Collector authentication failed." }, { status: 401 });
  }

  const runId = await beginCollectorRun(SOURCE_ID);
  try {
    const config = await getSourceConfig(SOURCE_ID, {
      stateIndex: 0,
      byteOffset: 0,
    });
    const stateIndex = Math.max(0, Number(config.stateIndex ?? 0) || 0) % states.length;
    const requestedOffset = Math.max(0, Number(config.byteOffset ?? 0) || 0);
    const state = states[stateIndex];
    const url = `https://www.irs.gov/pub/irs-soi/eo_${state}.csv`;

    const response = await fetch(url, {
      headers: {
        Accept: "text/csv,*/*;q=0.5",
        "Accept-Encoding": "identity",
        "User-Agent": "Rukh-Leads/1.0 (+https://rukhlabs.com)",
        ...(requestedOffset > 0 ? { Range: `bytes=${requestedOffset}-` } : {}),
      },
      cache: "no-store",
      signal: AbortSignal.timeout(35_000),
    });
    if (!response.ok && response.status !== 206) {
      throw new Error(`IRS nonprofit file ${state.toUpperCase()} returned ${response.status}.`);
    }
    if (!response.body) throw new Error("IRS nonprofit file did not include a response body.");

    const ranged = response.status === 206;
    const effectiveOffset = ranged ? requestedOffset : 0;
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let bytesRead = 0;
    let rawRows = 0;
    let ended = false;
    let headers: readonly string[] = expectedHeaders;
    let headerHandled = effectiveOffset > 0;
    const candidateRows: Array<Record<string, string>> = [];

    while (
      bytesRead < MAX_BYTES_PER_RUN &&
      rawRows < MAX_ROWS_PER_RUN &&
      candidateRows.length < MAX_CANDIDATES_PER_RUN
    ) {
      const { done, value } = await reader.read();
      if (done) {
        ended = true;
        break;
      }
      if (!value) continue;
      bytesRead += value.byteLength;
      buffer += decoder.decode(value, { stream: true });

      let newline = buffer.indexOf("\n");
      while (
        newline >= 0 &&
        rawRows < MAX_ROWS_PER_RUN &&
        candidateRows.length < MAX_CANDIDATES_PER_RUN
      ) {
        const line = buffer.slice(0, newline).replace(/\r$/, "");
        buffer = buffer.slice(newline + 1);
        newline = buffer.indexOf("\n");
        if (!line.trim()) continue;

        const values = parseCsvLine(line);
        if (!headerHandled) {
          const first = cleanText(values[0], 30).toUpperCase();
          if (first === "EIN") headers = values.map((value) => cleanText(value, 50).toUpperCase());
          headerHandled = true;
          continue;
        }

        rawRows += 1;
        const row = rowObject(headers, values);
        const ein = cleanText(row.EIN, 20);
        const name = cleanText(row.NAME, 260);
        if (!ein || !name || looksLikeNonProspectName(name) || largeInstitutionPattern.test(name)) {
          continue;
        }
        if (row.STATUS && !["01", "1"].includes(row.STATUS)) continue;
        const assets = amount(row.ASSET_AMT);
        const revenue = amount(row.REVENUE_AMT);
        if (assets > 100_000_000 || revenue > 50_000_000) continue;
        candidateRows.push(row);
      }
    }

    await reader.cancel().catch(() => undefined);
    const unprocessedBytes = new TextEncoder().encode(buffer).byteLength;
    const nextByteOffset = Math.max(effectiveOffset, effectiveOffset + bytesRead - unprocessedBytes);

    const candidates = candidateRows.map((row) => {
      const ntee = cleanText(row.NTEE_CD, 20).toUpperCase();
      const category =
        nteeLabels[ntee.charAt(0)] ??
        inferIndustry(`${row.NAME} ${row.ACTIVITY}`, "Nonprofit organization");
      const ruling = rulingDate(row.RULING);
      return {
        source: SOURCE_ID,
        sourceKey: row.EIN,
        organizationName: row.NAME,
        alternateName: row.SORT_NAME || row.ICO || null,
        category,
        addressLine1: row.STREET,
        city: row.CITY,
        state: row.STATE || state.toUpperCase(),
        postalCode: row.ZIP,
        countryCode: "US",
        sourceUrl: SOURCE_URL,
        formedAt: ruling,
        prioritySeed: priorityFor(row, category),
        metadata: {
          ein: row.EIN,
          subsection: row.SUBSECTION || null,
          nteeCode: ntee || null,
          ruling: row.RULING || null,
          taxPeriod: row.TAX_PERIOD || null,
          assetAmount: amount(row.ASSET_AMT),
          revenueAmount: amount(row.REVENUE_AMT),
          incomeAmount: amount(row.INCOME_AMT),
          irsStateFile: state.toUpperCase(),
        },
      };
    });

    const upserted = await upsertCandidates(candidates);
    const moveToNextState = ended || (!ranged && requestedOffset > 0);
    const nextConfig = moveToNextState
      ? {
          stateIndex: (stateIndex + 1) % states.length,
          byteOffset: 0,
        }
      : {
          stateIndex,
          byteOffset: nextByteOffset,
        };

    await completeCollectorRun(
      runId,
      SOURCE_ID,
      rawRows,
      upserted,
      nextConfig,
    );

    return privateJson({
      ok: true,
      source: SOURCE_ID,
      state: state.toUpperCase(),
      ranged,
      requestedOffset,
      nextByteOffset: nextConfig.byteOffset,
      seen: rawRows,
      qualified: candidates.length,
      candidates: upserted,
      stored: 0,
      next: nextConfig,
    });
  } catch (error) {
    const message = await failCollectorRun(runId, SOURCE_ID, error);
    return privateJson({ error: message, source: SOURCE_ID }, { status: 503 });
  }
}
