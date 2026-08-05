# Rukh Labs SEO Phase 2 handoff

## Architecture

Phase 2 uses typed TypeScript content records instead of MDX. This repository already keeps products, services, and changelog entries in typed local modules, so the same pattern adds long-form content without a CMS, database, runtime MDX configuration, or client-side content loading.

- Insights live in `src/lib/insights.ts`.
- Work projects live in `src/lib/work.ts`.
- Focused service-page records live in `src/lib/focused-services.ts`.
- Shared server-rendered content components live in `src/components/content/`.
- Dynamic static routes render from those records under `src/app/insights/[slug]`, `src/app/work/[slug]`, and the focused-service route folders.
- The only substantial client component is `src/components/tools/website-project-brief-form.tsx`; it keeps responses in browser memory and creates local copy, download, and print actions.

Each `FocusedService` record owns its evidence eyebrow, heading, description, planning-example title, disclosure, and example items. Optional typed diagram and code fields support the two analytics-focused examples. The shared component must not branch on route paths. Every planning example is server-rendered, visibly labeled `Fictional planning example`, and explicitly states that it is not client work.

The data-analyst guide's fictional worked example is the pattern for substantial first-party instruction: identify the business question, audience, decision, synthetic sources, model grain, quality issue, measure definition, dashboard structure, assumptions, limitations, privacy boundary, and recommended portfolio-page hierarchy. It represents no real company and claims no measured impact.

## Adding an insight

1. Add a typed record to `src/lib/insights.ts` with a stable slug, title, metadata description, summary, category, publication and modified dates, sections, related links, CTA, sources, and schema type. New technical guides emit both `Article` and `TechArticle`; other guides emit `Article`.
2. Use only supported external claims. Add each source to the visible `sources` array and to `docs/seo-phase-2-source-log.md` with title, publisher, URL, access date, and reason.
3. Add the route to `src/lib/seo-routes.ts` with the actual content date.
4. Add relevant internal links from an existing public page or hub. Do not add an article merely to fill a keyword list.
5. The dynamic route and social image are generated automatically from the record. Run the validation commands below.

## Adding a future real client case study

1. Obtain explicit publication permission and keep the approved evidence with the project records outside this repository when appropriate.
2. Add a `WorkProject` record only after facts, dates, terminology, visuals, and claims are verified.
3. Label the project accurately. Do not use a client name, metrics, testimonial, logo, review, location, or result without permission and source material.
4. Include project type, current status, constraints, what was delivered, limitations, related links, and an approved social image.
5. Remove private information, access details, source data, hidden file metadata, and confidential artifacts before publication.

## Required fields and metadata

Every indexable page needs a unique title, description, canonical URL, Open Graph and Twitter image, one H1, meaningful internal links, correct structured data, and a manifest entry. Article JSON-LD requires headline, description, URL, dates, representative image, `en-US`, website membership, Organization author and publisher, and `mainEntityOfPage`. No Person schema is used.

`SEO_PHASE_TWO_DEPLOYMENT_DATE` is the explicit, stable deployment date for materially changed Phase 2 routes. `lastModified` represents a meaningful public change, not a build timestamp. Build-time current dates and `new Date()`-based sitemap dates are prohibited. Article publication dates change only when first published, and modification dates change only after meaningful edits. When both article dates match, the visible Updated label remains hidden. Sitemap `priority` and `changeFrequency` are descriptive metadata and are not relied on for Google ranking or crawl control.

The overlapping `/work/farzin` and `/work/glass-squares-os` routes remain public, self-canonical, noindex/follow, and excluded from the sitemap through the central manifest. Reconsider indexing only after they contain substantially unique architecture, implementation detail, screenshots, iterations, testing, technical tradeoffs, release evidence, or development decisions not duplicated on their primary product pages.

Use the existing organization ID `https://rukhlabs.com/#organization`. Do not add Person structured data or a founder property.

## Privacy rules

- Never add the owner’s personal name, personal profile links, resume details, employers, phone numbers, or confidential work to public pages, metadata, JSON-LD, or social images.
- Keep the private recruiter portfolio unlisted and out of the sitemap and public internal links.
- Use `hello@rukhlabs.com` publicly. Do not expose an internal forwarding address.
- Label fictional and synthetic demonstrations clearly. Noindex is not access control.
- Do not invent clients, testimonials, reviews, addresses, ratings, metrics, results, research, or prices.
- The public `/legal/terms` route is intentionally noindex and excluded from public footer navigation. Its limited website-use copy requires qualified legal review before it is expanded or restored to navigation.

## Image and source rules

Use the existing social-image system for social cards. Images must avoid personal data, fake metrics, client logos, and unapproved screenshots. Prefer current primary sources for externally verifiable claims and paraphrase them. Omit market or legal claims that cannot be supported. External citations use normal absolute `<a>` links opened in a new tab with `rel="noopener noreferrer"`; internal links continue to use Next.js navigation.

## Website project brief privacy and exports

The example brief is static and fictional; it never populates the form. Generated responses stay in browser memory and are available through copy, print, `website-project-brief.md` (`text/markdown;charset=utf-8`), and `website-project-brief.txt` (`text/plain;charset=utf-8`). The `project_brief_download` event may include only `project_type`, `format`, and `source_page`. Never add the generated brief, project name, description, audience, notes, URLs, contact details, or other free text to analytics.

## Validation

Run:

```bash
pnpm install --frozen-lockfile
pnpm run lint
pnpm run build
pnpm run seo:audit
```

The SEO audit checks route status, metadata, sitemap status, internal links, JSON-LD parsing, privacy protections, content-page dates, Phase 2 social images, work labels, public contact email, and the project brief privacy statement.
