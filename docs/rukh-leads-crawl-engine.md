# Rukh Leads crawl engine

Rukh Leads is a bounded, continuously rotating lead-discovery pipeline. It does not attempt a reckless all-at-once crawl. It incrementally covers broad public data sources, stages candidates, discovers official websites, respects public crawl controls, audits practical website weaknesses, and promotes only contactable opportunities into the private sales queue.

## Live source layers

- Direct Rukh Labs inquiries
- Bluesky public buying-intent stream
- Brave public-web buying-intent search
- Brave direct-business discovery across rotating metros and service categories
- Colorado Secretary of State open business data
- CMS NPPES nationwide organization-provider directory
- IRS Exempt Organizations Business Master File state files
- OpenStreetMap business records with official websites/contact fields

## Processing layers

1. Normalize and deduplicate candidates in `lead_candidates`.
2. Find/verify official domains for records without a website.
3. Respect `robots.txt` before auditing public pages.
4. Inspect homepage/contact paths with bounded requests and strict byte/time limits.
5. Score HTTPS, mobile configuration, reachability, response time, SEO basics, accessibility basics, inquiry paths, CTA quality, stale copyright, and unfinished/parked states.
6. Promote only contactable, evidence-backed opportunities into `lead_opportunities`.

## Safety and cost controls

- Server-side authentication protects all collection and processing routes.
- URLs are restricted to public HTTP(S) targets; common directories, social networks, job boards, and website-builder marketing pages are rejected.
- Page downloads, redirects, concurrency, and execution time are bounded.
- Brave lookups are deliberately rationed; free/public datasets do most of the volume work.
- Collectors maintain cursors in `lead_source_state.config`, so repeated runs advance instead of rereading the same first page.
- GitHub Actions runs source-specific schedules; Vercel retains one daily recovery crawl.

## Operations

The private dashboard exposes both promoted leads and the larger crawl universe: total candidates, websites found, domain queue, audit queue, and audited records. The queue is intentionally conservative. A high candidate count with a smaller sales queue means the filters are doing their job.
