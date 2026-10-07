# IRS nonprofit ingestion

The daily IRS workflow selects one of the existing 50-state-plus-DC EO BMF
extracts, streams its CSV, and selects at most 1,500 distinct EINs with recent
ruling months. It stages candidates; it does not promote leads or send outreach.

## Selection and limits

- Standard-library-only Python; no pip install is required.
- `IRS_MAX_CANDIDATES`: positive integer, maximum 1,500 (default 1,500).
- `IRS_RECENT_MONTHS`: positive integer, maximum 60 (default 60).
- The 60-month window includes the current UTC calendar month and preceding
  59 months. Missing, invalid, or future ruling months are excluded.
- Existing prospect name, active-status, asset, revenue, NTEE, and scoring rules
  come from the repository's IRS collector. EINs must contain exactly nine
  digits and retain leading zeros.
- Required CSV columns are validated. Empty/HTML responses, duplicate or missing
  headers, malformed quoting, and mismatched column counts fail the run instead
  of being reported as a successful empty extract. A valid header-only file can
  report zero candidates.
- Uploads contain at most 100 candidates; one run accepts at most 15 sequential
  batches and 1,500 distinct EINs. Request bodies are limited to 256 KiB.
- The server applies the existing backlog allowance once per run: 1,500 under
  normal pressure, then 150/75/25/5 at the existing queue thresholds. Thus the
  selected count can exceed the stored count. `stored` means candidate upserts,
  including refreshes of existing candidates, not newly promoted opportunities.

## Authentication and request path

`/api/github-crawl-ingest?stage=candidates|report` verifies the existing GitHub
issuer, audience, repository, `main` ref, IRS workflow, allowed event, expiry,
and RS256 signature. It additionally binds the request's UUID to the signed
GitHub `run_id` and `run_attempt`, so changing a payload UUID cannot reset a
run's allowance. The Python worker derives the same UUID5 identity.

The gateway calls shared ingestion handlers in-process. It does not forward
`CRON_SECRET` to a URL derived from the incoming Host header.

The internal `/api/leads/ingest/candidates` and `/api/leads/ingest/report`
endpoints require the existing server CRON bearer. Only those exact paths join
the proxy's automation allowlist. Basic authentication alone cannot write to
these endpoints. The gateway also retains the requirement that CRON automation
is configured. There are no new credentials, OAuth scopes, or permissions.

## Persistence, retries, and reporting

The canonical source is `national-nonprofits`; the older `irs-nonprofits`
envelope alias is normalized. Candidate uniqueness remains `(source, source_key)`.
Upserts preserve existing websites, qualified/rejected status, stronger priority,
and unrelated metadata, matching the existing candidate writer's behavior.

One scoped table, `public.lead_irs_ingestion_runs`, stores the run identity,
selected file, fixed allowance, committed counts, received EINs, sequential batch
receipts, final report, and timestamps. Each batch's receipt, accounting, and
candidate upserts commit together in a single PostgreSQL statement. Failed
upserts roll back the receipt and quota as well. Repeating an identical batch
returns its original response; changing an already-used batch fails with 409.

Recency is checked against the persisted run's UTC start month, so exact retries
and later batches do not change their eligibility at a month boundary. Existing
receipts remain replayable after finalization. New batches cannot extend a
finalized run, and repeated EINs in a different batch are rejected.

The worker retries transient transport failures, 429s, and 5xx responses with
identical serialized payloads and refreshed short-lived tokens. It does not
retry permanent validation/authentication conflicts or bypass TLS failures.
Malformed successful responses are errors. An ambiguous final success report is
retried unchanged rather than replaced with a conflicting failure report.

Final reporting atomically updates the run, existing collector history, and
eligible source status. Server-committed counts are authoritative when an upload
reply was lost. Existing `lead_source_state.config` is left untouched, including
the direct collector's `stateIndex` and `byteOffset`. An older run's late report
cannot overwrite newer source status. Errors returned to the worker are bounded
and sanitized; arbitrary service response bodies and authentication tokens are
not copied into reports.

A new GitHub run attempt has a new identity. Reinvoking the same attempt with a
changed file or changed CSV content produces a conflict rather than silently
replacing committed data. Daily default file selection is unchanged; an unusual
same-attempt process restart on another UTC date can therefore conflict. Exact
HTTP retries within the running worker keep the original cursor and payload.

## Database and deployment requirements

This change does not alter the existing candidate, collector-history, or
source-state schemas. Those existing tables and the `national-nonprofits`
source-state record must already be provisioned.

The new run table is created lazily on the first authenticated, validated
ingestion request using the schema in `src/lib/leads/irs-ingestion-store.ts`.
A transaction-scoped advisory lock protects concurrent first-use DDL. The
database role needs `CREATE` in the `public` schema for initial provisioning
and normal access to the resulting table, plus its existing candidate/history/
source-state privileges. An authorized deployment can provision that exact table
ahead of time instead. No credential or permission changes are made by this code.

Deploy the server changes before running the updated worker protocol. A build
does not create the table or perform ingestion. Before a separately authorized
production rollout, verify the actual database schema/role, deployed OIDC claims,
and runtime route reachability; none of these production checks is established
by local fixtures. Do not treat a passing build as a production ingestion run.

## Offline verification

```sh
PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover -s tests -p 'test_irs_nonprofits.py' -v
npm install --ignore-scripts --no-audit --no-fund
npm install --prefix /tmp/irs-db-tests @electric-sql/pglite@0.5.8 --ignore-scripts --no-audit --no-fund
IRS_TEST_MODULES=/tmp/irs-db-tests node --test tests/irs-ingestion-*.test.mjs
```

The dedicated IRS test workflow runs these checks without production tokens or
database credentials. Python tests deny public network access. Server tests use
an isolated PGlite PostgreSQL engine, synthetic records, and locally generated
test signing keys. The end-to-end test uses only a loopback HTTP server and
simulates a committed upload whose reply is lost. Candidate-table DDL is loaded
verbatim from `docs/rukh-leads-crawl-schema.sql`; the legacy history/source-state
fixtures model existing `crawl.ts` queries because their DDL is not checked in.
They are not a verified production schema snapshot. PGlite verifies PostgreSQL
statement behavior and interleaved calls, but its single session does not prove
separate-connection lock contention in deployed PostgreSQL.
