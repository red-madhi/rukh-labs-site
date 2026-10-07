import test from "node:test";
import assert from "node:assert/strict";
import { generateKeyPairSync, sign } from "node:crypto";
import { spawn, spawnSync } from "node:child_process";
import http from "node:http";
import { once } from "node:events";
import { fixture, batch, candidate, report, request, ROOT } from "./irs-test-utils.mjs";

const keys = generateKeyPairSync("rsa", { modulusLength: 2048 });
const jwk = { ...keys.publicKey.export({ format: "jwk" }), kid: "offline-irs-key", alg: "RS256" };
const identity = { GITHUB_REPOSITORY: "red-madhi/rukh-labs-site", GITHUB_RUN_ID: "1234567890", GITHUB_RUN_ATTEMPT: "1" };
const pythonId = spawnSync("python3", ["-c", "import uuid; print(uuid.uuid5(uuid.NAMESPACE_URL, 'rukh-irs:red-madhi/rukh-labs-site/1234567890/1'))"], { encoding: "utf8" });
assert.equal(pythonId.status, 0);
const RUN_ID = pythonId.stdout.trim();

function token(changes = {}, signingKey = keys.privateKey) {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: "https://token.actions.githubusercontent.com", aud: "rukhlabs.com",
    exp: now + 300, nbf: now - 30, repository: identity.GITHUB_REPOSITORY,
    ref: "refs/heads/main", event_name: "schedule",
    workflow_ref: "red-madhi/rukh-labs-site/.github/workflows/rukh-leads-irs-oidc.yml@refs/heads/main",
    run_id: identity.GITHUB_RUN_ID, run_attempt: identity.GITHUB_RUN_ATTEMPT,
    ...changes,
  };
  const header = Buffer.from(JSON.stringify({ alg: "RS256", kid: jwk.kid })).toString("base64url");
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = sign("RSA-SHA256", Buffer.from(`${header}.${body}`), signingKey).toString("base64url");
  return `${header}.${body}.${signature}`;
}

function allowLocalJwks(f) {
  f.state.fetch = async (url) => {
    assert.equal(String(url), "https://token.actions.githubusercontent.com/.well-known/jwks");
    return Response.json({ keys: [jwk] });
  };
}

test("OIDC: signed GitHub run identity matches Python UUID5 and rejects wrong claims/signature", async (t) => {
  const f = await fixture(); t.after(() => f.close()); allowLocalJwks(f);
  const oidc = f.load("@/lib/leads/github-oidc");
  assert.equal(await oidc.verifyGithubActionsRunId(token(), ["rukh-leads-irs-oidc.yml"]), RUN_ID);
  for (const changes of [
    { iss: "https://attacker.invalid" }, { aud: "other" }, { repository: "other/repo" },
    { ref: "refs/heads/feature" }, { event_name: "pull_request" },
    { workflow_ref: "red-madhi/rukh-labs-site/.github/workflows/other.yml@refs/heads/main" },
    { exp: 1 }, { nbf: Math.floor(Date.now() / 1000) + 600 },
    { run_id: "" }, { run_attempt: "" }, { run_id: "not-a-run" },
  ]) assert.equal(await oidc.verifyGithubActionsRunId(token(changes), ["rukh-leads-irs-oidc.yml"]), null);
  const otherKey = generateKeyPairSync("rsa", { modulusLength: 2048 }).privateKey;
  assert.equal(await oidc.verifyGithubActionsRunId(token({}, otherKey), ["rukh-leads-irs-oidc.yml"]), null);
  assert.equal(f.queries.length, 0);
});

test("HTTP: internal endpoints require CRON bearer before parsing or database writes", async (t) => {
  const f = await fixture(); t.after(() => f.close());
  for (const stage of ["candidates", "report"]) {
    const endpoint = f.load(`src/app/api/leads/ingest/${stage}/route.ts`);
    for (const auth of [null, "Bearer wrong", `Basic ${Buffer.from("test-user:test-password").toString("base64")}`]) {
      const response = await endpoint.POST(request(`/api/leads/ingest/${stage}`, "bad json", { auth }));
      assert.equal(response.status, 401);
      assert.match(response.headers.get("cache-control"), /no-store/);
    }
  }
  assert.equal(f.queries.length, 0);
  delete f.environment.CRON_SECRET;
  assert.equal((await f.load("src/app/api/leads/ingest/candidates/route.ts").POST(request("/api/leads/ingest/candidates", batch()))).status, 503);
});

test("Proxy: only the two IRS ingest paths gain existing automation authentication", async (t) => {
  const f = await fixture(); t.after(() => f.close());
  const proxy = f.load("src/proxy.ts").proxy;
  for (const path of ["/api/leads/ingest/candidates", "/api/leads/ingest/report"]) {
    assert.equal(proxy(request(path, {})).status, 200);
    assert.equal(proxy(request(path, {}, { auth: null })).status, 401);
  }
  assert.equal(proxy(request("/api/leads/ingest/unrelated", {})).status, 401);
  assert.equal(proxy(request("/api/leads/statuses", {})).status, 401);
  assert.equal(f.queries.length, 0);
});

test("HTTP: invalid payloads, oversized streams, unsupported sources and dates never reach persistence", async (t) => {
  const f = await fixture(); t.after(() => f.close());
  const endpoint = f.load("src/app/api/leads/ingest/candidates/route.ts");
  const valid = batch();
  const invalid = [
    null, [], { ...valid, sourceId: "other" }, { ...valid, runId: "bad" },
    { ...valid, batchIndex: -1 }, { ...valid, batchIndex: 15 }, { ...valid, batchIndex: 0.5 },
    { ...valid, candidates: [] }, { ...valid, candidates: Array.from({ length: 101 }, (_, i) => candidate(i + 1)) },
    { ...valid, candidates: [candidate(), candidate()] },
    { ...valid, cursor: { ...valid.cursor, fileIndex: 6 } },
    { ...valid, cursor: { ...valid.cursor, file: "https://attacker.invalid/eo_co.csv" } },
    { ...valid, extra: true },
    ...[
      { source: "other" }, { sourceKey: "abc" }, { organizationName: "AB" },
      { formedAt: "2026-13-01" }, { formedAt: "1899-01-01" },
      { countryCode: "CA" }, { state: "ZZ" }, { websiteUrl: "https://example.invalid" },
      { prioritySeed: 101 }, { prioritySeed: 1.5 },
      { sourceUrl: "https://example.invalid" },
      { metadata: { ...candidate().metadata, ein: "000000002" } },
      { metadata: { ...candidate().metadata, irsStateFile: "NY" } },
      { metadata: { ...candidate().metadata, assetAmount: 100000001 } },
      { metadata: { ...candidate().metadata, revenueAmount: 50000001 } },
      { metadata: { ...candidate().metadata, incomeAmount: null } },
    ].map((changes) => ({ ...valid, candidates: [candidate(1, changes)] })),
  ];
  for (const payload of invalid) {
    assert.equal((await endpoint.POST(request("/api/leads/ingest/candidates", payload))).status, 400);
  }
  assert.equal((await endpoint.POST(request("/api/leads/ingest/candidates", "bad JSON"))).status, 400);
  assert.equal((await endpoint.POST(request("/api/leads/ingest/candidates", valid, { headers: { "content-type": "text/plain" } }))).status, 415);
  assert.equal((await endpoint.POST(request("/api/leads/ingest/candidates", " ".repeat(256 * 1024 + 1)))).status, 413);
  assert.equal((await endpoint.POST(request("/api/leads/ingest/candidates", valid, { headers: { "content-length": "262145" } }))).status, 413);
  assert.equal(f.queries.length, 0);
});

test("Contract: valid ruling months and IRS source alias normalize before run-anchored recency", async (t) => {
  const f = await fixture(); t.after(() => f.close());
  const contract = f.contract();
  const value = batch({ sourceId: "irs-nonprofits" });
  value.candidates[0].source = "irs-nonprofits";
  for (const [formedAt, accepted] of [["2026-10-01", true], ["2021-11-01", true], ["2026-13-01", false], ["2026-00-01", false]]) {
    value.candidates[0].formedAt = formedAt;
    value.candidates[0].metadata.ruling = formedAt.slice(0, 7).replace("-", "");
    if (accepted) {
      const result = contract.validateIrsBatch(value);
      assert.equal(result.sourceId, "national-nonprofits");
      assert.equal(result.candidates[0].source, "national-nonprofits");
    } else assert.throws(() => contract.validateIrsBatch(value));
  }
  for (const changes of [{ stored: 2 }, { seen: 0 }, { qualified: 1501 }, { error: "" }, { error: "x".repeat(901) }]) {
    assert.throws(() => contract.validateIrsReport(report(batch(), changes)));
  }
});

test("Gateway: authentication, signed run binding and stage checks precede writes", async (t) => {
  const f = await fixture(); t.after(() => f.close()); allowLocalJwks(f);
  const gateway = f.load("src/app/api/github-crawl-ingest/route.ts");
  assert.equal((await gateway.POST(request("/api/github-crawl-ingest", batch(), { auth: null }))).status, 401);
  assert.equal((await gateway.POST(request("/api/github-crawl-ingest", batch(), { auth: `Bearer ${token({ ref: "refs/heads/other" })}` }))).status, 401);
  assert.equal((await gateway.POST(request("/api/github-crawl-ingest", batch(), { auth: `Bearer ${token()}` }))).status, 403);
  assert.equal((await gateway.POST(request("/api/github-crawl-ingest?stage=constructor", batch({ runId: RUN_ID }), { auth: `Bearer ${token()}` }))).status, 404);
  assert.equal(f.queries.length, 0);
  const response = await gateway.POST(request("/api/github-crawl-ingest?stage=candidates", batch({ runId: RUN_ID }), {
    auth: `Bearer ${token()}`, origin: "https://attacker.invalid",
  }));
  assert.equal(response.status, 200);
  assert.equal((await response.json()).stored, 1);
  assert.equal(f.state.fetches.length, 1);
  assert.equal(f.state.fetches[0][0], "https://token.actions.githubusercontent.com/.well-known/jwks");
  assert.equal((await f.db.query("SELECT count(*)::int AS count FROM lead_candidates")).rows[0].count, 1);
});

test("Endpoints: success, replay, conflict and report operate on real PostgreSQL", async (t) => {
  const f = await fixture(); t.after(() => f.close());
  const candidates = f.load("src/app/api/leads/ingest/candidates/route.ts");
  const reports = f.load("src/app/api/leads/ingest/report/route.ts");
  const input = batch({ count: 2 });
  const first = await candidates.POST(request("/api/leads/ingest/candidates", input));
  assert.equal(first.status, 200); assert.equal((await first.json()).stored, 2);
  const again = await candidates.POST(request("/api/leads/ingest/candidates", input));
  assert.equal((await again.json()).replayed, true);
  const changed = structuredClone(input); changed.candidates[0].organizationName = "CHANGED ARTS";
  assert.equal((await candidates.POST(request("/api/leads/ingest/candidates", changed))).status, 409);
  const completed = await reports.POST(request("/api/leads/ingest/report", report(input)));
  assert.equal(completed.status, 200); assert.equal((await completed.json()).status, "success");
  assert.equal((await f.db.query("SELECT items_upserted FROM lead_collector_runs")).rows[0].items_upserted, 2);
});

test("End to end: Python CSV worker, signed OIDC gateway, PostgreSQL, lost upload reply and final report", async (t) => {
  const f = await fixture(); t.after(() => f.close()); allowLocalJwks(f);
  const gateway = f.load("src/app/api/github-crawl-ingest/route.ts");
  const signed = token();
  const calls = [];
  let droppedReply = false;
  const server = http.createServer(async (incoming, outgoing) => {
    try {
      const url = new URL(incoming.url, "http://127.0.0.1");
      if (url.pathname === "/oidc") {
        assert.equal(incoming.headers.authorization, "bearer offline-request-token");
        assert.equal(url.searchParams.get("audience"), "rukhlabs.com");
        outgoing.writeHead(200, { "content-type": "application/json" }); outgoing.end(JSON.stringify({ value: signed })); return;
      }
      assert.equal(url.pathname, "/api/github-crawl-ingest");
      const chunks = []; for await (const chunk of incoming) chunks.push(chunk);
      const body = Buffer.concat(chunks).toString("utf8");
      calls.push({ stage: url.searchParams.get("stage"), body });
      const response = await gateway.POST(request(incoming.url, body, { auth: incoming.headers.authorization }));
      if (!droppedReply && url.searchParams.get("stage") === "candidates" && response.status === 200) {
        droppedReply = true; outgoing.writeHead(503); outgoing.end("Synthetic response loss after commit"); return;
      }
      outgoing.writeHead(response.status, Object.fromEntries(response.headers)); outgoing.end(await response.text());
    } catch (error) {
      outgoing.writeHead(500); outgoing.end(String(error));
    }
  });
  server.listen(0, "127.0.0.1"); await once(server, "listening");
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  const wrapper = `
import csv, datetime as dt, io, os, sys, urllib.request
sys.path.insert(0, 'scripts/leads')
import run_irs_nonprofits_oidc as worker
month = dt.datetime.now(dt.timezone.utc).strftime('%Y%m')
stream = io.StringIO(newline='')
writer = csv.DictWriter(stream, fieldnames=['EIN','NAME','STATUS','RULING','NTEE_CD','STATE','ASSET_AMT','REVENUE_AMT'])
writer.writeheader()
for ein, status in [('000000001','01'),('000000001','01'),('000000002','01'),('000000003','02')]:
    writer.writerow(dict(EIN=ein, NAME='EXAMPLE CAFÉ, ARTS', STATUS=status, RULING=month, NTEE_CD='A20', STATE='CO', ASSET_AMT='100000', REVENUE_AMT='50000'))
def csv_request(url, timeout):
    assert url == 'https://www.irs.gov/pub/irs-soi/eo_co.csv'
    return io.BytesIO(stream.getvalue().encode('latin-1'))
worker.request = csv_request
worker.time.sleep = lambda seconds: None
original = urllib.request.urlopen
def loopback_only(req, **kwargs):
    assert req.full_url.startswith(os.environ['LEADS_BASE_URL'] + '/'), 'PUBLIC NETWORK FORBIDDEN'
    return original(req, **kwargs)
urllib.request.urlopen = loopback_only
raise SystemExit(worker.main())
`;
  const child = spawn("python3", ["-c", wrapper], {
    cwd: ROOT, env: {
      PATH: process.env.PATH, PYTHONDONTWRITEBYTECODE: "1", ...identity,
      IRS_FILE_INDEX: "5", LEADS_BASE_URL: base,
      ACTIONS_ID_TOKEN_REQUEST_URL: `${base}/oidc`, ACTIONS_ID_TOKEN_REQUEST_TOKEN: "offline-request-token",
    },
  });
  let stdout = "", stderr = "";
  child.stdout.on("data", (chunk) => { stdout += chunk; }); child.stderr.on("data", (chunk) => { stderr += chunk; });
  const [code] = await once(child, "exit");
  assert.equal(code, 0, stderr);
  assert.equal(calls.length, 3);
  assert.equal(calls[0].body, calls[1].body);
  const summary = JSON.parse(stdout.trim().split("\n").at(-1));
  assert.equal(summary.runId, RUN_ID); assert.equal(summary.seen, 4);
  assert.equal(summary.qualified, 2); assert.equal(summary.stored, 2);
  assert.equal((await f.db.query("SELECT count(*)::int AS count FROM lead_candidates")).rows[0].count, 2);
  assert.equal((await f.db.query("SELECT status FROM lead_irs_ingestion_runs")).rows[0].status, "success");
  assert.equal((await f.db.query("SELECT count(*)::int AS count FROM lead_collector_runs")).rows[0].count, 1);
  assert.doesNotMatch(stdout + stderr, /offline-request-token|test-cron/);
});
