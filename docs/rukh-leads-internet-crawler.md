# Rukh Leads internet-scale crawler

Rukh Leads is a progressive lead-intelligence pipeline for website sales. It does not attempt a wasteful, indiscriminate crawl of every URL. It starts with large official organization directories, spends more resources only on promising records, verifies likely official domains, respects crawler controls, audits real website need, and promotes only contactable opportunities into the private dashboard.

## Pipeline

```text
Official registries and directories
             ↓
Normalize + deduplicate candidate organizations
             ↓
Prioritize recent, operating, and contactable records
             ↓
Direct domain guesses
             ↓
Bounded Brave Search fallback
             ↓
Verify organization ↔ website identity
             ↓
Respect robots.txt
             ↓
Homepage/contact-page audit
             ↓
Opportunity score + risk checks
             ↓
Promote strong candidates into /leads
```

## Live sources

- Colorado official business-entity open data
- Nationwide CMS NPPES organization records across all states
- Official state and municipal business/license datasets discovered through the Socrata public catalog
- Official IRS Exempt Organizations Business Master File extracts
- Bluesky public Jetstream intent signals
- Brave Search public-web intent signals and bounded official-domain discovery
- Rukh Labs inbound website inquiries

## Candidate staging

Large directory records are stored in `lead_candidates`, not immediately shown as leads. Each candidate tracks:

- original source and stable source key
- organization name, type, formation/ruling date, and location
- public contact methods
- website discovery attempts
- website audit attempts
- source, audit, and opportunity scores
- positive signals and risks
- promotion state and resulting lead ID

This keeps the dashboard from becoming a raw directory dump.

## Website discovery

The discovery worker:

1. Tries deterministic domain guesses without spending API credits.
2. Fetches only a small bounded set of likely domains.
3. Uses Brave Search only for the highest-priority unresolved candidates.
4. Rejects social networks, directories, job boards, agency rankings, and other non-official pages.
5. Verifies the page against organization-name tokens, location, and public phone data.
6. Extracts public email, phone, and contact-page links.
7. Marks repeated no-match candidates as possible no-website opportunities.

## Website audit

The auditor checks:

- whether a verified website exists
- robots.txt permission
- reachability and HTTP status
- HTTPS
- mobile viewport declaration
- title, description, canonical URL, and basic metadata
- booking, quote, appointment, and contact calls-to-action
- form/email/phone contactability
- stale visible copyright year
- homepage response time
- a bounded sample of internal links
- image alt-text coverage
- parked-domain and under-construction signals

Audits are deliberately bounded so a single site cannot consume the entire worker run.

## Promotion rules

A candidate is promoted only when:

- it reaches the opportunity-score threshold,
- it is not blocked from crawling,
- it has a credible outreach route,
- and the evidence represents a website sales opportunity rather than an article, directory, résumé page, or job listing.

Promoted records use either `new-business` or `site-audit` as their lead source.

## Automation

The primary scheduler is `.github/workflows/rukh-leads-oidc-scheduler.yml`.

It uses GitHub Actions OIDC rather than a stored GitHub repository secret. Each workflow run receives a short-lived signed token. The Vercel gateway verifies the token's signature and restricts it to:

- issuer: GitHub Actions
- audience: `rukhlabs.com`
- repository: `red-madhi/rukh-labs-site`
- branch: `main`
- workflow: `rukh-leads-oidc-scheduler.yml`
- events: scheduled and manual workflow runs

After verification, the gateway calls the existing private collectors with the server-side `CRON_SECRET`.

Current cadence:

- Bluesky intent: every 10 minutes
- Rukh inbound: every 30 minutes
- candidate discovery and website audits: hourly
- Brave public-web intent: every 4 hours
- official directory rotation: every 6 hours
- full catch-all pass: daily
- Vercel cron: daily fallback

## Cost controls

- GitHub Actions schedules the system without Vercel Pro.
- Government/public directory sources are free.
- Direct domain guesses happen before paid search.
- Brave domain discovery is capped per worker run.
- Website pages and internal links are size-, count-, concurrency-, and time-bounded.
- The database retains crawl cursors so sources advance instead of repeatedly starting at the first page.

## Data handling

- The private dashboard and lead APIs remain protected.
- Search and source API keys are server-side only.
- Collector responses are `no-store` and `noindex`.
- Organization records are normalized and deduplicated by source key.
- Raw source payloads are retained for auditability.
- Robots exclusions are respected by the website crawler.
- The system does not send outreach automatically.

## Main routes

- `/leads` — private ranked lead dashboard
- `/api/leads` — private lead read/update API
- `/api/leads/collect` — full private scan
- `/api/leads/collect/pipeline-v3` — directory/enrichment pipeline
- `/api/leads/collect/directories` — official directory orchestrator
- `/api/leads/collect/discover-v2` — prioritized website discovery
- `/api/leads/collect/audit-sites-v2` — website audit queue wrapper
- `/api/github-crawl` — GitHub OIDC scheduler gateway

## Operational principle

The system is designed to keep expanding. New official registries and permitted directories should feed `lead_candidates`; they should not bypass staging and dump raw records directly into `lead_opportunities`.
