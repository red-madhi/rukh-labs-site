# SEO post-launch status

## Production reference

- Review date: August 5, 2026
- Production deployment date: August 5, 2026
- Production URL: https://rukhlabs.com
- Main commit reviewed: `ad5d4c3dabc2c69b57d56183fa027ce93665f87e`
- Sitemap: https://rukhlabs.com/sitemap.xml
- Robots file: https://rukhlabs.com/robots.txt

The live route set, indexing directives, canonical host redirects, sitemap, and
robots file matched the reviewed main commit before this hardening branch was
created.

## Priority indexable routes

- Homepage: https://rukhlabs.com
- Website development: https://rukhlabs.com/services/web-development
- Career portfolios: https://rukhlabs.com/services/career-portfolios
- Products: https://rukhlabs.com/products
- Farzin: https://rukhlabs.com/products/farzin
- Glass Squares OS: https://rukhlabs.com/products/glass-squares-os
- Work: https://rukhlabs.com/work
- Insights: https://rukhlabs.com/insights
- Data analyst career portfolio guide: https://rukhlabs.com/insights/data-analyst-career-portfolio-guide
- Website project brief: https://rukhlabs.com/tools/website-project-brief
- Contact: https://rukhlabs.com/contact

The sitemap remains the source of truth for the complete indexable route set.

## Intentionally noindexed routes

- `/work/farzin` and `/work/glass-squares-os`: public supporting Work pages;
  `noindex, follow`, self-canonical, and excluded from the sitemap.
- `/legal/terms`: interim legal page; `noindex, follow`, excluded from the
  sitemap, and absent from the public footer.
- `/services/career-portfolios/demo`: fictional service demonstration;
  `noindex, follow` and excluded from the sitemap.
- Six `/services/web-development/designs/[slug]/sample` pages: fictional sample
  sites; `noindex, follow` and excluded from the sitemap.
- The unlisted private portfolio: `noindex, nofollow, noarchive, nosnippet` in
  page metadata and the response header; excluded from the sitemap and public
  links.

These routes remain crawlable where a crawler needs to see `noindex`. They are
not blocked in `robots.txt`.

## Stale search-result observations

A public web-search snapshot on August 5, 2026 returned cached snippets that do
not match current production content. Observed examples included the former
software-only homepage and About positioning, older Contact and Download copy,
the earlier Farzin beta language, an interim Terms snippet, and an old privacy
snippet that referenced the former public contact address.

These snippets are external recrawl state, not current production content. The
live pages and current main branch contain the approved service-inclusive
positioning and use `hello@rukhlabs.com`. No page copy was changed merely to
force recrawling, and this document does not claim that any URL is indexed in a
specific webmaster platform.

## Recommended webmaster-platform checks

Google Search Console:

1. Confirm the `https://rukhlabs.com` property is verified by its owner.
2. Resubmit `https://rukhlabs.com/sitemap.xml` and confirm it can be fetched.
3. Use URL Inspection on the homepage, About, Contact, Download, Farzin,
   General Privacy, and Terms URLs.
4. Run a live test before requesting indexing for indexable pages whose cached
   result remains stale.
5. Confirm intentionally noindexed URLs report the expected directive; do not
   request indexing for them.

Bing Webmaster Tools:

1. Confirm site ownership and sitemap ingestion.
2. Inspect the same priority URLs and request a crawl only after the live test
   resolves to the canonical apex URL.
3. Recheck crawl or indexing reports for canonical-host duplication and stale
   snippets without changing current page copy solely for recrawling.

Next indexing review: **August 19, 2026**. Search-result changes depend on each
engine's crawl and processing schedule, so this is a review date rather than a
promised refresh date.

## Separate conversion task: server-side contact delivery

The current contact form truthfully creates a local email draft. Replacing it
with a server-side Resend flow is intentionally outside this SEO hardening work.
That conversion task needs a separate implementation and review covering:

- secret environment-variable setup without placeholder or exposed keys;
- server-side input validation;
- spam protection and rate limiting;
- safe failure handling that does not lose or disclose inquiry content;
- acknowledgement and internal-notification email design; and
- a privacy-policy review before the form behavior changes.
