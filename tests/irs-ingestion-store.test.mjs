import test from "node:test";
import assert from "node:assert/strict";
import { fixture, batch, report, candidate } from "./irs-test-utils.mjs";

const plain = (value) => JSON.parse(JSON.stringify(value));

function monthStart(offset = 0) {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + offset, 1))
    .toISOString().slice(0, 10);
}

function candidateAtMonth(index, formedAt) {
  const input = candidate(index, { formedAt });
  input.metadata.ruling = formedAt.slice(0, 7).replace("-", "");
  return input;
}

async function runRow(f, runId) {
  return (await f.db.query("SELECT * FROM lead_irs_ingestion_runs WHERE run_id=$1", [runId])).rows[0];
}

async function sourceRow(f) {
  return (await f.db.query("SELECT * FROM lead_source_state WHERE source_id='national-nonprofits'")).rows[0];
}

async function assertConflict(f, action, message) {
  await assert.rejects(action, (error) => error instanceof f.store().IrsConflictError
    && (!message || message.test(error.message)));
}

test("fixed allowance matches every backpressure threshold boundary", async (t) => {
  const f = await fixture();
  t.after(() => f.close());
  const pressurePolicy = f.load("@/lib/leads/backpressure");
  for (const [pressure, allowance, label] of [
    [0, 1500, "normal"], [4999, 1500, "normal"],
    [5000, 150, "moderate"], [14999, 150, "moderate"],
    [15000, 75, "high"], [29999, 75, "high"],
    [30000, 25, "heavy"], [74999, 25, "heavy"],
    [75000, 5, "critical"],
  ]) {
    await f.db.exec("TRUNCATE lead_candidates");
    await f.seedPressure(pressure);
    const input = batch({ count: 100 });
    const result = await f.store().ingestIrsBatch(input);
    const queue = { domainQueue: pressure, auditQueue: 0, qualified: 0 };
    assert.equal(result.allowance, pressurePolicy.blindCandidateAllowance(1500, queue));
    assert.equal(result.backpressure, pressurePolicy.backpressureLabel(queue));
    assert.equal(result.allowance, allowance, `pressure ${pressure}`);
    assert.equal(result.backpressure, label, `pressure ${pressure}`);
    assert.equal(result.stored, Math.min(100, allowance));
    const run = await runRow(f, input.runId);
    assert.equal(run.allowance, allowance);
    assert.equal(run.received_count, 100);
    assert.equal(run.stored_count, Math.min(100, allowance));
    const actual = (await f.db.query("SELECT count(*)::int AS count FROM lead_candidates WHERE source='national-nonprofits'")).rows[0].count;
    assert.equal(actual, Math.min(100, allowance));
  }
});

test("pressure includes working and no-website queues but excludes archived and audit rows", async (t) => {
  const f = await fixture();
  t.after(() => f.close());
  await f.seedPressure(4998);
  await f.db.exec(`INSERT INTO lead_candidates(source,source_key,organization_name,status,archived_at)
    VALUES ('other','working','WORKING','domain-working',NULL),
           ('other','missing','MISSING','no-website',NULL),
           ('other','archived','ARCHIVED','domain-pending',now()),
           ('other','audit','AUDIT','audit-pending',NULL),
           ('other','qualified','QUALIFIED','qualified',NULL)`);
  const result = await f.store().ingestIrsBatch(batch());
  assert.equal(result.allowance, 150);
  assert.equal(result.backpressure, "moderate");
});

test("three batches share one fixed 150 allowance and retain historical replay totals", async (t) => {
  const f = await fixture();
  t.after(() => f.close());
  await f.seedPressure(5000);
  const first = batch({ count: 100 });
  const second = batch({ runId: first.runId, batchIndex: 1, start: 101, count: 100 });
  const third = batch({ runId: first.runId, batchIndex: 2, start: 201, count: 100 });
  const one = await f.store().ingestIrsBatch(first);
  // Changing current pressure must not refresh or lower the original cap.
  await f.db.exec("DELETE FROM lead_candidates WHERE source='pressure-fixture'");
  const two = await f.store().ingestIrsBatch(second);
  const three = await f.store().ingestIrsBatch(third);
  assert.deepEqual([one.stored, two.stored, three.stored], [100, 50, 0]);
  assert.deepEqual([one.runStored, two.runStored, three.runStored], [100, 150, 150]);
  assert.deepEqual([one.allowance, two.allowance, three.allowance], [150, 150, 150]);
  const finalized = await f.store().reportIrsRun(report(first, { seen: 400, qualified: 300, stored: 150 }));
  assert.deepEqual(plain(finalized), { ok: true, stored: 150, status: "success", replayed: false });
  const replay = await f.store().ingestIrsBatch(first);
  assert.deepEqual(plain(replay), { ...plain(one), replayed: true });
  assert.equal(replay.runStored, 100);
  const zeroReplay = await f.store().ingestIrsBatch(third);
  assert.equal(zeroReplay.stored, 0);
  assert.equal(zeroReplay.replayed, true);
  const row = await runRow(f, first.runId);
  assert.equal(row.received_count, 300);
  assert.equal(row.stored_count, 150);
  assert.equal(row.received_eins.length, 300);
  assert.equal(Object.keys(row.receipts).length, 3);
  assert.equal((await f.db.query("SELECT count(*)::int AS count FROM lead_candidates")).rows[0].count, 150);
  await assertConflict(f, () => f.store().ingestIrsBatch(batch({ runId: first.runId, batchIndex: 3, start: 301 })), /finalized/);
});

test("all fifteen batches admit 1,500 candidates in a normal-pressure run", async (t) => {
  const f = await fixture();
  t.after(() => f.close());
  const first = batch({ count: 100 });
  for (let index = 0; index < 15; index += 1) {
    const input = batch({ runId: first.runId, batchIndex: index, start: index * 100 + 1, count: 100 });
    const result = await f.store().ingestIrsBatch(input);
    assert.equal(result.stored, 100);
    assert.equal(result.runStored, (index + 1) * 100);
  }
  const row = await runRow(f, first.runId);
  assert.equal(row.received_count, 1500);
  assert.equal(row.stored_count, 1500);
  assert.equal(row.next_batch_index, 15);
  await assertConflict(f, () => f.store().ingestIrsBatch(batch({ runId: first.runId, batchIndex: 15, start: 1501 })));
  const result = await f.store().reportIrsRun(report(first, { seen: 2000, qualified: 1500, stored: 1500 }));
  assert.equal(result.stored, 1500);
});

test("canonical payload replay is stable but changed hash, cursor, index and repeated EINs conflict", async (t) => {
  const f = await fixture();
  t.after(() => f.close());
  const input = batch({ count: 2 });
  const first = await f.store().ingestIrsBatch(input);
  const reordered = plain(input);
  reordered.candidates[0].metadata = Object.fromEntries(Object.entries(reordered.candidates[0].metadata).reverse());
  reordered.cursor = { fileIndex: input.cursor.fileIndex, file: input.cursor.file };
  assert.deepEqual(plain(await f.store().ingestIrsBatch(reordered)), { ...plain(first), replayed: true });
  const changed = plain(input);
  changed.candidates[0].organizationName = "DIFFERENT ORGANIZATION";
  await assertConflict(f, () => f.store().ingestIrsBatch(changed), /different payload/);
  await assertConflict(f, () => f.store().ingestIrsBatch({ ...input,
    cursor: { file: "https://www.irs.gov/pub/irs-soi/eo_al.csv", fileIndex: 0 } }), /cursor/);
  await assertConflict(f, () => f.store().ingestIrsBatch(batch({ runId: input.runId, batchIndex: 2, start: 3 })), /sequential/);
  await assertConflict(f, () => f.store().ingestIrsBatch(batch({ runId: input.runId, batchIndex: 1, start: 2 })), /repeats an EIN/);
  const next = await f.store().ingestIrsBatch(batch({ runId: input.runId, batchIndex: 1, start: 3 }));
  assert.equal(next.stored, 1);
  const row = await runRow(f, input.runId);
  assert.equal(row.received_count, 3);
  assert.equal(row.next_batch_index, 2);
  assert.equal((await f.db.query("SELECT count(*)::int AS count FROM lead_collector_runs")).rows[0].count, 1);
});

test("overlapping calls for the same batch produce one write and one exact replay", async (t) => {
  const f = await fixture();
  t.after(() => f.close());
  const input = batch({ count: 100 });
  const results = await Promise.all([
    f.store().ingestIrsBatch(input), f.store().ingestIrsBatch(plain(input)),
  ]);
  assert.deepEqual(results.map((result) => result.replayed).sort(), [false, true]);
  assert.equal((await runRow(f, input.runId)).stored_count, 100);
  assert.equal((await f.db.query("SELECT count(*)::int AS count FROM lead_candidates")).rows[0].count, 100);
  // PGlite uses one PostgreSQL session. This covers interleaved application
  // calls; separate-session lock contention needs integration coverage too.
});

test("candidate failure atomically rolls back batch receipt, EINs and counters", async (t) => {
  const f = await fixture();
  t.after(() => f.close());
  await f.db.exec("ALTER TABLE lead_candidates ADD CONSTRAINT reject_fixture CHECK (organization_name <> 'FORCE_FAILURE')");
  const input = batch({ candidates: [candidate(1), candidate(2, { organizationName: "FORCE_FAILURE" })] });
  await assert.rejects(() => f.store().ingestIrsBatch(input), /reject_fixture/);
  const row = await runRow(f, input.runId);
  assert.equal(row.received_count, 0);
  assert.equal(row.stored_count, 0);
  assert.equal(row.next_batch_index, 0);
  assert.deepEqual(row.received_eins, []);
  assert.deepEqual(row.receipts, {});
  assert.equal((await f.db.query("SELECT count(*)::int AS count FROM lead_candidates")).rows[0].count, 0);
  const fixed = { ...input, candidates: [candidate(1), candidate(2)] };
  assert.equal((await f.store().ingestIrsBatch(fixed)).stored, 2);
  assert.equal(f.queries.filter(({ sql }) => sql.includes("WITH claimed AS")).length, 2);
});

test("actual-upsert count mismatch rolls back rather than committing a false receipt", async (t) => {
  const f = await fixture();
  t.after(() => f.close());
  await f.db.exec(`CREATE FUNCTION skip_fixture_row() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN IF NEW.organization_name = 'FORCE_SKIP' THEN RETURN NULL; END IF; RETURN NEW; END $$;
    CREATE TRIGGER skip_fixture BEFORE INSERT ON lead_candidates
    FOR EACH ROW EXECUTE FUNCTION skip_fixture_row()`);
  const input = batch({ candidates: [candidate(1), candidate(2, { organizationName: "FORCE_SKIP" })] });
  await assert.rejects(() => f.store().ingestIrsBatch(input), /division by zero/);
  const row = await runRow(f, input.runId);
  assert.equal(row.received_count, 0);
  assert.equal(row.stored_count, 0);
  assert.deepEqual(row.receipts, {});
  assert.equal((await f.db.query("SELECT count(*)::int AS count FROM lead_candidates")).rows[0].count, 0);
});

test("upserts preserve qualified/rejected outcomes, existing website, metadata and stronger score", async (t) => {
  const f = await fixture();
  t.after(() => f.close());
  await f.db.exec(`INSERT INTO lead_candidates
    (source,source_key,organization_name,status,website_url,priority_seed,metadata,next_action_at,alternate_name)
    VALUES ('national-nonprofits','000000001','OLD QUALIFIED','qualified','https://existing.example/',95,
      '{"retained":"yes","replace":"old"}','2030-01-01T00:00:00Z','KEEP ALIAS'),
      ('national-nonprofits','000000002','OLD REJECTED','rejected','https://rejected.example/',90,
      '{"reason":"kept"}','2030-01-02T00:00:00Z',NULL),
      ('national-nonprofits','000000003','OLD DOMAIN','domain-pending',NULL,20,
      '{}','2030-01-03T00:00:00Z',NULL)`);
  const firstCandidate = candidate(1, { websiteUrl: "https://incoming.example/", prioritySeed: 30,
    metadata: { ...candidate(1).metadata, replace: "new" } });
  const input = batch({ candidates: [firstCandidate,
    candidate(2, { websiteUrl: "https://also-incoming.example/", prioritySeed: 20 }),
    candidate(3, { websiteUrl: "https://resolved.example/" })] });
  assert.equal((await f.store().ingestIrsBatch(input)).stored, 3);
  const rows = (await f.db.query("SELECT * FROM lead_candidates ORDER BY source_key")).rows;
  assert.equal(rows[0].status, "qualified");
  assert.equal(rows[0].website_url, "https://existing.example/");
  assert.equal(rows[0].priority_seed, 95);
  assert.equal(rows[0].alternate_name, "KEEP ALIAS");
  assert.equal(rows[0].organization_name, firstCandidate.organizationName);
  assert.equal(rows[0].metadata.retained, "yes");
  assert.equal(rows[0].metadata.replace, "new");
  assert.equal(new Date(rows[0].next_action_at).toISOString(), "2030-01-01T00:00:00.000Z");
  assert.equal(rows[1].status, "rejected");
  assert.equal(rows[1].website_url, "https://rejected.example/");
  assert.equal(rows[1].metadata.reason, "kept");
  assert.equal(rows[1].priority_seed, 90);
  assert.equal(new Date(rows[1].next_action_at).toISOString(), "2030-01-02T00:00:00.000Z");
  assert.equal(rows[2].status, "audit-pending");
  assert.equal(rows[2].website_url, "https://resolved.example/");
  assert.equal(rows[2].priority_seed, 75);
  assert.notEqual(new Date(rows[2].next_action_at).toISOString(), "2030-01-03T00:00:00.000Z");
});

test("success report validates committed counts and is idempotent without moving timestamps", async (t) => {
  const f = await fixture();
  t.after(() => f.close());
  const input = batch({ count: 2 });
  await f.store().ingestIrsBatch(input);
  for (const changes of [{ qualified: 1, stored: 1 }, { qualified: 3, stored: 2 }, { stored: 1 }, { stored: 3 }]) {
    await assertConflict(f, () => f.store().reportIrsRun(report(input, changes)), /counts/);
    assert.equal((await runRow(f, input.runId)).status, "running");
  }
  const summary = report(input, { seen: 20 });
  const first = await f.store().reportIrsRun(summary);
  assert.deepEqual(plain(first), { ok: true, stored: 2, status: "success", replayed: false });
  const before = await sourceRow(f);
  const runBefore = await runRow(f, input.runId);
  const historyBefore = (await f.db.query("SELECT * FROM lead_collector_runs")).rows[0];
  assert.equal(historyBefore.status, "success");
  assert.equal(historyBefore.items_seen, 20);
  assert.equal(historyBefore.items_upserted, 2);
  assert.equal(historyBefore.error_message, null);
  assert.deepEqual(plain(await f.store().reportIrsRun(summary)), { ...plain(first), replayed: true });
  assert.deepEqual(await sourceRow(f), before);
  assert.deepEqual(await runRow(f, input.runId), runBefore);
  assert.deepEqual((await f.db.query("SELECT * FROM lead_collector_runs")).rows[0], historyBefore);
  await assertConflict(f, () => f.store().reportIrsRun({ ...summary, seen: 21 }), /different report/);
  await assertConflict(f, () => f.store().reportIrsRun({ ...summary, error: "LATE ERROR" }), /different report/);
  assert.equal((await sourceRow(f)).status, "ready");
});

test("error report reconciles a lost batch response against authoritative committed counts", async (t) => {
  const f = await fixture();
  t.after(() => f.close());
  const input = batch({ count: 2 });
  await f.store().ingestIrsBatch(input);
  await assertConflict(f, () => f.store().reportIrsRun(report(input, { qualified: 1, stored: 0, error: "FAILED" })), /counts/);
  await assertConflict(f, () => f.store().reportIrsRun(report(input, { qualified: 3, stored: 3, error: "FAILED" })), /counts/);
  const summary = report(input, { seen: 50, qualified: 3, stored: 0, error: "Upload response was lost" });
  const result = await f.store().reportIrsRun(summary);
  assert.deepEqual(plain(result), { ok: true, stored: 2, status: "error", replayed: false });
  const row = await runRow(f, input.runId);
  assert.equal(row.report.stored, 2);
  assert.equal(row.report.reportedStored, 0);
  const history = (await f.db.query("SELECT * FROM lead_collector_runs")).rows[0];
  assert.equal(history.items_upserted, 2);
  assert.equal(history.items_seen, 50);
  assert.equal(history.error_message, summary.error);
  assert.equal((await sourceRow(f)).last_items, 2);
  assert.equal((await sourceRow(f)).last_error, summary.error);
  assert.deepEqual(plain(await f.store().reportIrsRun(summary)), { ...plain(result), replayed: true });
  assert.equal((await f.store().ingestIrsBatch(input)).replayed, true);
  await assertConflict(f, () => f.store().ingestIrsBatch(batch({ runId: input.runId, batchIndex: 1, start: 3 })), /finalized/);
  await assertConflict(f, () => f.store().reportIrsRun(report(input)), /different report/);
});

test("empty successful run is recorded and report failure rolls back all finalization writes", async (t) => {
  const f = await fixture();
  t.after(() => f.close());
  const empty = batch({ count: 0 });
  const summary = report(empty);
  await f.db.exec("ALTER TABLE lead_collector_runs ADD CONSTRAINT reject_success_fixture CHECK(status <> 'success')");
  await assert.rejects(() => f.store().reportIrsRun(summary), /reject_success_fixture/);
  const row = await runRow(f, empty.runId);
  assert.equal(row.status, "running");
  assert.equal(row.report_hash, null);
  assert.equal(row.completed_at, null);
  assert.equal((await sourceRow(f)).last_run_at, null);
  await f.db.exec("ALTER TABLE lead_collector_runs DROP CONSTRAINT reject_success_fixture");
  assert.deepEqual(plain(await f.store().reportIrsRun(summary)), { ok: true, stored: 0, status: "success", replayed: false });
  assert.equal((await f.db.query("SELECT count(*)::int AS count FROM lead_collector_runs")).rows[0].count, 1);
});

test("reports leave source cursor configuration unchanged and older reports cannot overwrite newer status", async (t) => {
  const f = await fixture();
  t.after(() => f.close());
  const before = await sourceRow(f);
  const older = batch();
  const newer = batch({ start: 2, count: 2 });
  await f.store().ingestIrsBatch(older);
  await f.store().ingestIrsBatch(newer);
  await f.db.query("UPDATE lead_irs_ingestion_runs SET started_at='2020-01-01T00:00:00Z' WHERE run_id=$1", [older.runId]);
  await f.db.query("UPDATE lead_irs_ingestion_runs SET started_at='2021-01-01T00:00:00Z' WHERE run_id=$1", [newer.runId]);
  await f.store().reportIrsRun(report(newer));
  const newestState = await sourceRow(f);
  assert.deepEqual(newestState.config, before.config);
  assert.equal(newestState.last_items, 2);
  assert.equal(newestState.status, "ready");
  await f.store().reportIrsRun(report(older, { error: "OLDER FAILURE" }));
  assert.deepEqual(await sourceRow(f), newestState);
  assert.equal((await runRow(f, older.runId)).status, "error");
  assert.equal((await runRow(f, newer.runId)).status, "success");
});

test("invalid accounting inputs are rejected before any database initialization", async (t) => {
  const f = await fixture();
  t.after(() => f.close());
  for (const input of [batch({ count: 0 }), batch({ count: 101 }), batch({ batchIndex: -1 }),
    batch({ batchIndex: 15 }), batch({ batchIndex: 0.5 }),
    batch({ candidates: [candidate(1), candidate(1)] }),
    batch({ candidates: [candidate(1, { organizationName: "<b></b>" })] })]) {
    await assertConflict(f, () => f.store().ingestIrsBatch(input));
  }
  assert.equal(f.queries.length, 0);
});

test("old and future rulings are rejected atomically against the run's UTC start month", async (t) => {
  const f = await fixture();
  t.after(() => f.close());
  for (const ruling of [monthStart(-60), monthStart(1)]) {
    const input = batch({ candidates: [candidateAtMonth(1, ruling)] });
    await assertConflict(f, () => f.store().ingestIrsBatch(input), /start month and previous 59 months/);
    const row = await runRow(f, input.runId);
    assert.equal(row.received_count, 0);
    assert.equal(row.stored_count, 0);
    assert.equal(row.next_batch_index, 0);
    assert.deepEqual(row.receipts, {});
    assert.deepEqual(row.received_eins, []);
  }
  assert.equal((await f.db.query("SELECT count(*)::int AS count FROM lead_candidates")).rows[0].count, 0);
  const valid = batch({ candidates: [candidateAtMonth(1, monthStart(-59)), candidateAtMonth(2, monthStart())] });
  assert.equal((await f.store().ingestIrsBatch(valid)).stored, 2);
});

test("month-rollover replay and later batches retain the original run's sixty-month window", async (t) => {
  const f = await fixture();
  t.after(() => f.close());
  const input = batch({ candidates: [candidateAtMonth(1, monthStart(-60))] });
  // Initialize without committing a batch, then model a run that began just
  // before the current month. UTC midnight also exercises a local-timezone
  // month boundary when PostgreSQL uses a negative timezone offset.
  await assertConflict(f, () => f.store().ingestIrsBatch({ ...input, batchIndex: 1 }), /sequential/);
  await f.db.query("UPDATE lead_irs_ingestion_runs SET started_at=$2::timestamptz WHERE run_id=$1",
    [input.runId, `${monthStart(-1)}T00:05:00Z`]);
  const first = await f.store().ingestIrsBatch(input);
  assert.equal(first.stored, 1);
  assert.deepEqual(plain(await f.store().ingestIrsBatch(input)), { ...plain(first), replayed: true });
  const second = batch({ runId: input.runId, batchIndex: 1,
    candidates: [candidateAtMonth(2, monthStart(-60)), candidateAtMonth(3, monthStart(-1))] });
  assert.equal((await f.store().ingestIrsBatch(second)).stored, 2);
  await assertConflict(f, () => f.store().ingestIrsBatch(batch({ runId: input.runId, batchIndex: 2,
    candidates: [candidateAtMonth(4, monthStart())] })), /start month and previous 59 months/);
  const row = await runRow(f, input.runId);
  assert.equal(row.received_count, 3);
  assert.equal(row.stored_count, 3);
  assert.equal(row.next_batch_index, 2);
  await f.store().reportIrsRun(report(input, { seen: 3, qualified: 3, stored: 3 }));
  assert.deepEqual(plain(await f.store().ingestIrsBatch(input)), { ...plain(first), replayed: true });
});
