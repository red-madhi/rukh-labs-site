# Rukh Leads crawler

Rukh Leads is a progressive website-sales intelligence pipeline. It starts with large official organization directories, normalizes and deduplicates those records, searches for likely official domains, verifies organization-to-domain identity, respects robots.txt, audits website need, and promotes only contactable opportunities into the private `/leads` dashboard.

## Live data network

- Colorado official business-entity open data
- Nationwide CMS NPPES organization records across every state
- State and municipal business/license datasets discovered through the Socrata public catalog
- Official IRS Exempt Organizations Business Master File extracts
- Bluesky public Jetstream buying-intent signals
- Brave Search public-web intent and bounded official-domain discovery
- Direct Rukh Labs website inquiries

## Progressive pipeline

```text
Official directories and public APIs
                ↓
Candidate staging + source-key deduplication
                ↓
Recency, operating-status, and contactability ranking
                ↓
Free deterministic domain guesses
                ↓
Strictly budgeted Brave fallback
                ↓
Organization ↔ website identity verification
                ↓
robots.txt-aware homepage/contact-page crawl
                ↓
Technical + conversion + contactability audit
                ↓
Opportunity score and risk checks
                ↓
Promote credible prospects into /leads
```

Raw directory records are stored in `lead_candidates`; they do not appear in the sales queue until they survive discovery, audit, scoring, and contactability checks.

## Website audit signals

The auditor checks website existence, reachability, HTTPS, mobile viewport, title and metadata, canonical URL, conversion calls-to-action, contact form/email/phone availability, stale copyright year, response time, a bounded sample of internal links, image alt-text coverage, parked-domain signals, and under-construction signals.

## Automation without Vercel Pro

GitHub Actions uses short-lived OIDC tokens rather than a repository secret. Vercel verifies the GitHub signature and restricts requests to this repository, the `main` branch, the named workflow, and scheduled/manual events. The server then calls the private collectors with the server-side `CRON_SECRET`.

Primary schedule:

- Bluesky intent: every 10 minutes
- Rukh inbound: every 30 minutes
- Website audits: hourly
- Official-directory rotation: every 6 hours
- Website discovery: every 12 hours
- Broad public-web intent: once daily
- IRS nonprofit extracts: daily
- Vercel full-pipeline cron: daily fallback

## Brave free-credit budget

The automated schedule is intentionally capped around the free monthly Search API allowance:

- direct domain guesses happen before Brave
- automated domain discovery uses at most two Brave searches per run
- automated domain discovery runs twice daily
- broad web-intent search runs once daily
- the Vercel daily fallback provides one additional bounded pass

Manual scans can consume additional requests, but Brave is configured to stop at the account's free-credit limit rather than create surprise charges.

## Security and data handling

- `/leads` and all lead-management APIs remain private
- API keys remain server-side
- GitHub stores no permanent Rukh Leads scheduler secret
- OIDC tokens expire within minutes
- collector responses are no-store/noindex
- raw source payloads are retained for auditability
- robots exclusions are respected
- crawls are bounded by page count, response size, concurrency, and timeout
- outreach is never sent automatically

## Main production routes

- `/leads` — private ranked lead dashboard
- `/api/leads/collect` — complete private scan
- `/api/leads/collect/directories` — official-directory orchestrator
- `/api/leads/collect/discover-v3` — free-credit-aware domain discovery
- `/api/leads/collect/audit-sites-v2` — website audit queue
- `/api/github-crawl-v2` — secretless GitHub OIDC scheduler gateway
- `/api/github-crawl-ingest` — OIDC-protected bulk-ingestion gateway for IRS workers
