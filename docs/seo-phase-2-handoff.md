# Rukh Labs SEO Phase 2 handoff

## Architecture

Phase 2 uses typed TypeScript content records instead of MDX. This repository already keeps products, services, and changelog entries in typed local modules, so the same pattern adds long-form content without a CMS, database, runtime MDX configuration, or client-side content loading.

- Insights live in `src/lib/insights.ts`.
- Work projects live in `src/lib/work.ts`.
- Focused service-page records live in `src/lib/focused-services.ts`.
- Shared server-rendered content components live in `src/components/content/`.
- Dynamic static routes render from those records under `src/app/insights/[slug]`, `src/app/work/[slug]`, and the focused-service route folders.
- The only substantial client component is `src/components/tools/website-project-brief-form.tsx`; it keeps responses in browser memory and creates local copy, download, and print actions.

## Adding an insight

1. Add a typed record to `src/lib/insights.ts` with a stable slug, title, metadata description, summary, category, publication and modified dates, sections, related links, CTA, sources, and schema type.
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

Every indexable page needs a unique title, description, canonical URL, Open Graph and Twitter image, one H1, meaningful internal links, correct structured data, and a manifest entry. Article records require publication and modified dates. Dates should change only when content changes materially.

Use the existing organization ID `https://rukhlabs.com/#organization`. Do not add Person structured data or a founder property.

## Privacy rules

- Never add the owner’s personal name, personal profile links, resume details, employers, phone numbers, or confidential work to public pages, metadata, JSON-LD, or social images.
- Keep the private recruiter portfolio unlisted and out of the sitemap and public internal links.
- Use `hello@rukhlabs.com` publicly. Do not expose an internal forwarding address.
- Label fictional and synthetic demonstrations clearly. Noindex is not access control.

## Image and source rules

Use the existing social-image system for social cards. Images must avoid personal data, fake metrics, client logos, and unapproved screenshots. Prefer current primary sources for externally verifiable claims and paraphrase them. Omit market or legal claims that cannot be supported.

## Validation

Run:

```bash
pnpm install
pnpm run lint
pnpm run build
pnpm run seo:audit
```

The SEO audit checks route status, metadata, sitemap status, internal links, JSON-LD parsing, privacy protections, content-page dates, Phase 2 social images, work labels, public contact email, and the project brief privacy statement.
