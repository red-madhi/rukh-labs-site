import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { randomUUID, webcrypto } from "node:crypto";
import ts from "typescript";
import { NextRequest, NextResponse } from "next/server.js";

export const ROOT = fileURLToPath(new URL("..", import.meta.url));
const require = createRequire(import.meta.url);
const testRequire = process.env.IRS_TEST_MODULES
  ? createRequire(path.join(path.resolve(process.env.IRS_TEST_MODULES), "package.json"))
  : require;
const { PGlite } = testRequire("@electric-sql/pglite");

// Candidate DDL comes from the repository verbatim. These two legacy tables
// have no checked-in DDL; their fixture columns model the existing crawl.ts
// queries, rather than claiming to be a verified production schema snapshot.
const BASE_SCHEMA = `
  CREATE TABLE lead_collector_runs (
    id uuid PRIMARY KEY, source_id text NOT NULL, status text NOT NULL,
    started_at timestamptz DEFAULT now(), completed_at timestamptz,
    items_seen integer, items_upserted integer, error_message text
  );
  CREATE TABLE lead_source_state (
    source_id text PRIMARY KEY, status text, last_run_at timestamptz,
    last_success_at timestamptz, last_items integer, last_error text,
    updated_at timestamptz DEFAULT now(), config jsonb NOT NULL DEFAULT '{}'
  );
  INSERT INTO lead_source_state(source_id, config)
  VALUES ('national-nonprofits', '{"stateIndex":8,"byteOffset":12345,"other":"preserved"}');
`;

export function candidate(index = 1, changes = {}) {
  const now = new Date();
  const month = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  const ein = String(index).padStart(9, "0");
  return {
    source: "national-nonprofits", sourceKey: ein,
    organizationName: `EXAMPLE ARTS ${index}`, alternateName: null,
    category: "Arts and culture nonprofit", addressLine1: "1 EXAMPLE STREET",
    city: "EXAMPLE CITY", state: "CO", postalCode: "00001", countryCode: "US",
    sourceUrl: "https://www.irs.gov/charities-non-profits/exempt-organizations-business-master-file-extract-eo-bmf",
    formedAt: `${month}-01`, prioritySeed: 75,
    metadata: {
      ein, subsection: "03", nteeCode: "A20", ruling: month.replace("-", ""),
      taxPeriod: null, assetAmount: 100000, revenueAmount: 50000,
      incomeAmount: 60000, irsStateFile: "CO",
    },
    ...changes,
  };
}

export function batch({ runId = randomUUID(), batchIndex = 0, start = 1, count = 1, ...rest } = {}) {
  return {
    sourceId: "national-nonprofits", runId, batchIndex,
    cursor: { file: "https://www.irs.gov/pub/irs-soi/eo_co.csv", fileIndex: 5 },
    candidates: Array.from({ length: count }, (_, index) => candidate(start + index)),
    ...rest,
  };
}

export function report(input, changes = {}) {
  return {
    sourceId: input.sourceId, runId: input.runId, cursor: input.cursor,
    seen: input.candidates.length, qualified: input.candidates.length,
    stored: input.candidates.length, ...changes,
  };
}

export function request(pathname, payload, { auth = "Bearer test-cron", headers = {}, origin = "https://example.invalid" } = {}) {
  return new NextRequest(`${origin}${pathname}`, {
    method: "POST", headers: { "content-type": "application/json", ...(auth ? { authorization: auth } : {}), ...headers },
    body: typeof payload === "string" ? payload : JSON.stringify(payload),
  });
}

export async function fixture() {
  const db = new PGlite();
  await db.exec(fs.readFileSync(path.join(ROOT, "docs/rukh-leads-crawl-schema.sql"), "utf8"));
  await db.exec(BASE_SCHEMA);
  const queries = [];
  const environment = { CRON_SECRET: "test-cron", LEADS_USERNAME: "test-user", LEADS_PASSWORD: "test-password" };
  const state = { fetches: [], fetch: () => { throw new Error("Real network is forbidden"); } };
  const cache = new Map();
  async function query(sql, params = []) {
    queries.push({ sql, params });
    const result = await db.query(sql, params);
    return {
      fields: result.fields,
      rows: result.rows.map((row) => result.fields.map((field) => row[field.name] == null ? null : String(row[field.name]))),
      rowCount: result.affectedRows,
    };
  }
  const neon = {
    leadNeonQuery: query,
    neonRowsToObjects: (result) => result.rows.map((row) => Object.fromEntries(result.fields.map((field, i) => [field.name, row[i]]))),
  };
  const context = vm.createContext({
    process: { env: environment }, console, Buffer, URL, URLSearchParams,
    Date, Math, JSON, Object, Array, Set, Map, Promise, Error, TypeError,
    Number, String, Boolean, RegExp, Uint8Array, TextEncoder, TextDecoder,
    Request, Response, Headers, ReadableStream, AbortSignal, crypto: webcrypto,
    atob, btoa, setTimeout, clearTimeout,
    fetch: (...args) => { state.fetches.push(args); return state.fetch(...args); },
  });
  function load(name) {
    const file = path.resolve(ROOT, name.startsWith("@/") ? `src/${name.slice(2)}.ts` : name);
    if (cache.has(file)) return cache.get(file).exports;
    const testModule = { exports: {} };
    cache.set(file, testModule);
    const result = ts.transpileModule(fs.readFileSync(file, "utf8"), {
      compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS }, reportDiagnostics: true,
    });
    if (result.diagnostics.length) throw new Error(`TypeScript transpilation failed: ${file}`);
    const localRequire = (id) => {
      if (id === "@/lib/leads/neon") return neon;
      if (id === "next/server") return { NextRequest, NextResponse };
      if (id.startsWith("@/")) return load(id);
      if (id.startsWith("node:")) return require(id);
      throw new Error(`Unexpected dependency ${id}`);
    };
    const wrapper = vm.runInContext(`(function(require,module,exports){\n${result.outputText}\n})`, context, { filename: file });
    wrapper(localRequire, testModule, testModule.exports);
    return testModule.exports;
  }
  return {
    db, queries, environment, state, load, close: () => db.close(),
    store: () => load("@/lib/leads/irs-ingestion-store"),
    contract: () => load("@/lib/leads/irs-ingestion-contract"),
    async seedPressure(count) {
      await db.query(`INSERT INTO lead_candidates(source,source_key,organization_name,status)
        SELECT 'pressure-fixture', value::text, 'SYNTHETIC PRESSURE', 'domain-pending'
        FROM generate_series(1,$1::int) AS value`, [count]);
    },
  };
}
