# IAZMA Guard

A standalone Bluesky graph-cleanup app designed to sit beside IAZMA.

## What it does

- Authenticates with AT Protocol OAuth using narrow repository permissions for `app.bsky.graph.follow` and `app.bsky.graph.block`.
- Builds a follower/following baseline without changing anything on first run.
- Detects accounts that **were observed following you and later stopped**. If `auto_unfollow` is enabled, Guard removes your follow and suppresses that DID from IAZMA.
- Scans current followers in small batches for:
  - no public activity beyond the configured threshold (default 90 days),
  - high-confidence bot/spam signals,
  - explicit right-wing profile self-identification,
  - high-precision public phrase matches for anti-Palestinian, Islamophobic, or xenophobic content.
- Never automatically blocks classifier matches. Every block requires a user click and the UI displays the evidence first.
- If you currently follow a reviewed account, the block action explicitly deletes your follow before creating the Bluesky block record.
- Stores suppression by DID, not handle, so handle changes do not let the account re-enter IAZMA recommendations.
- Keeps an audit log for auto-unfollows, blocks, ignored flags, errors, and IAZMA restores.

## IAZMA integration

Guard exposes a batch suppression endpoint:

```http
POST /api/suppression/check
x-iazma-key: <IAZMA_API_KEY>
content-type: application/json

{
  "ownerDid": "did:plc:...",
  "dids": ["did:plc:one", "did:plc:two"]
}
```

Response:

```json
{ "suppressed": ["did:plc:two"] }
```

IAZMA should call this before ranking/presenting recommendations and discard returned DIDs.

## Environment

Copy `.env.example` to `.env.local` for development or add the variables to the deployment platform.

- `APP_URL` — deployed HTTPS origin, no trailing slash.
- `DATABASE_URL` — Neon/Postgres connection string.
- `OAUTH_PRIVATE_KEY` — P-256 private key in PEM/PKCS8 form.
- `SESSION_SECRET` — random 32+ byte secret used to sign the browser session cookie.
- `CRON_SECRET` — random secret used by the scheduled graph-sync route.
- `IAZMA_API_KEY` — shared secret for IAZMA suppression lookups.

Generate the OAuth key with:

```bash
openssl genpkey -algorithm EC -pkeyopt ec_paramgen_curve:P-256
```

## Database

The schema is in `db/schema.sql`. The production database for this build was provisioned in Neon separately; no database credentials are committed to source control.

## Run

```bash
npm install
npm run dev
```

AT Protocol production OAuth requires the client metadata and JWKS URLs to be publicly reachable, so real Bluesky OAuth should be tested on an HTTPS deployment (or an HTTPS dev tunnel), not plain localhost.

## Verification

The deterministic classifier test suite does not require network access:

```bash
npm run test:classifier
```

The server also exposes `GET /api/health`, which verifies database connectivity after deployment.

## Safety design

- No first-run reciprocal cleanup. An account must have been observed as your follower in a previous graph snapshot before a later absence can trigger automatic unfollow.
- No automatic political/content block. Those signals only create review cards.
- Explicit anti-context such as `anti-MAGA` is excluded from the right-wing profile matcher.
- Content matches are labeled as context-sensitive evidence so quoted/critical text can be dismissed as a false positive.
- Dismissed false positives remain ignored on later scans unless the record is manually changed in the database.
