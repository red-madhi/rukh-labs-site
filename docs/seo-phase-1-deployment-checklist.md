# Rukh Labs SEO Phase 1 handoff

Implementation date: 2026-08-04  
Canonical origin: `https://rukhlabs.com`

## Route inventory and indexing decisions

The source of truth is `src/lib/seo-routes.ts`. Query strings are never canonical pages and are not included in the sitemap.

| Classification | Routes | Follow | Sitemap |
| --- | --- | --- | --- |
| Indexable | `/`, `/products`, `/products/farzin`, `/products/farzin/privacy`, `/products/glass-squares-os`, `/services/web-development`, `/services/career-portfolios`, `/download`, `/changelog`, `/security`, `/about`, `/contact`, `/legal/privacy` | Yes | Yes |
| Indexable design directions | `/services/web-development/designs/obsidian`, `/signal`, `/atelier`, `/main-street`, `/spotlight`, `/dispatch` under the same parent path | Yes | Yes |
| Noindex, follow | `/legal/terms`, `/services/career-portfolios/demo`, and each of the six design-direction `/sample` children | Yes | No |
| Unlisted/noindex/nofollow | `/portfolio/brett-gallaher` and the nested static portfolio routes protected by response headers | No | No |
| Redirect | `/farzin`, `/farzin-chess`, `/apps/farzin`, `/products/farzin-chess`, `/farzin/privacy`, `/legal/farzin-privacy`, `/rukh-os`, `/products/rukh-os` | Not applicable | No |
| Technical metadata | `/robots.txt`, `/sitemap.xml` | Not applicable | Not applicable |
| Query-string variation | `/contact?inquiry=website`, `/contact?inquiry=career-portfolio`, and optional `package` or `design` parameters | Canonicalizes to `/contact` | No |
| Missing | None after Phase 1. `/sitemap.xml` was missing in the baseline and is now generated. | Not applicable | Not applicable |

Fictional samples are deliberately crawlable so search engines can see `noindex, follow`. They carry visible fictional-sample labeling and a service link, but no business or review schema. The unlisted portfolio is also crawlable so its meta and `X-Robots-Tag` directives can be honored. These directives are not authentication and must not be treated as access control.

The six design-direction overview pages remain indexable because each has distinct copy, metadata, a self-canonical, and a full visible design explanation. A future phase should reconsider audience-intent landing pages instead of relying indefinitely on style-name pages.

## Redirect map

| Old URL | Destination | Status | Reason |
| --- | --- | --- | --- |
| `https://www.rukhlabs.com/:path*` | `https://rukhlabs.com/:path*` | 308 | Canonical host; path and query are preserved |
| `/farzin` | `/products/farzin` | 308 | First-party product architecture |
| `/farzin-chess` | `/products/farzin` | 308 | Obsolete product alias |
| `/apps/farzin` | `/products/farzin` | 308 | Obsolete app path |
| `/products/farzin-chess` | `/products/farzin` | 308 | Obsolete product-name path |
| `/farzin/privacy` | `/products/farzin/privacy` | 308 | Stable app-privacy alias |
| `/legal/farzin-privacy` | `/products/farzin/privacy` | 308 | Stable app-privacy alias |
| `/rukh-os` | `/products/glass-squares-os` | 308 | Product rename |
| `/products/rukh-os` | `/products/glass-squares-os` | 308 | Product rename |

Vercel terminates TLS before the Next.js application, so HTTP-to-HTTPS enforcement belongs at the hosting layer. The application adds the safe `www` host redirect and canonical URLs; Vercel must still be configured as described below.

## Structured data inventory

| Route | Schema |
| --- | --- |
| `/` | `Organization`, `WebSite`, supporting `OfferCatalog`, `Service`, and `SoftwareApplication` nodes |
| `/about` | No person schema; the page intentionally presents Rukh Labs without individual identity metadata |
| `/services/web-development` | `Service`, `Audience`, and truthful visible package `Offer` data |
| `/services/career-portfolios` | `Service`, `Audience`, and truthful visible package `Offer` data |
| `/products/farzin` | `SoftwareApplication` |
| `/products/glass-squares-os` | `SoftwareApplication` limited to the product's documented development state |
| Product, legal, design-direction, and career-demo detail pages | `BreadcrumbList` matching visible breadcrumbs |

All JSON-LD is rendered through the reusable safe serializer in `src/components/seo/structured-data.tsx`.

## Performance decisions

- Replaced the repeated Framer Motion viewport observers used by `Reveal` with a server-rendered CSS entrance treatment. This removes the Framer Motion runtime from the dependency graph and keeps reduced-motion behavior.
- Lazy-loaded the heavy interactive fictional career demo on the main career-service landing page. The dedicated demo route still renders the complete experience directly.
- Kept the interactive header, forms, changelog filter, and demos as client components because they provide real client behavior.
- Kept the existing font and visual system. Existing raster brand art continues to use `next/image` with explicit dimensions.
- No Core Web Vitals score is claimed; field performance must be measured after deployment.

## Deployment and external-account checklist

- [ ] In Vercel, make `rukhlabs.com` the primary production domain.
- [ ] Add or verify `www.rukhlabs.com`, then permanently redirect it to `rukhlabs.com`; verify that arbitrary paths and query strings are preserved.
- [ ] Verify that Vercel forces HTTP requests to HTTPS for both hosts.
- [ ] Deploy this branch only after the repository checks pass and review the production deployment before merging.
- [ ] Verify ownership of `https://rukhlabs.com` in Google Search Console.
- [ ] Submit `https://rukhlabs.com/sitemap.xml` in Google Search Console.
- [ ] Use URL Inspection and request indexing for `/`, both service pages, both product pages, `/about`, and `/contact`.
- [ ] Verify the domain in Bing Webmaster Tools and submit the same sitemap.
- [ ] Configure and verify an IndexNow key or endpoint if the selected Bing/Vercel integration requires account-level setup.
- [ ] In Google Play Console, change Farzin's privacy-policy URL from `/legal/privacy` if it is still set there to `https://rukhlabs.com/products/farzin/privacy`. The old general URL remains live and links visibly to the app policy, while `/farzin/privacy` and `/legal/farzin-privacy` are permanent aliases.
- [ ] Verify `hello@rukhlabs.com` remains the public contact address, forwards as intended, and preserve the current inbox during any transition.
- [ ] Have a qualified attorney review and finalize website terms and client contract documents.
- [ ] Have qualified counsel review both privacy policies for the applicable jurisdictions and actual production providers.
- [ ] Baseline field Core Web Vitals after deployment using Search Console and Vercel Analytics; do not infer field performance from local builds.
- [ ] Confirm custom analytics events in Vercel without sending names, email addresses, phone numbers, messages, résumé data, or other form contents.

## Deferred to Phase 2

- Real case studies and a work-portfolio architecture
- Testimonials supported by real clients
- Insights or content hub
- Industry landing pages
- Career-role landing pages
- Website cost guide
- Career portfolio guides
- Backlink outreach
- Local-business profile setup
- Search Console performance optimization
- Large-scale content creation

These items are intentionally outside Phase 1 and should begin only with verified source material and a separate plan.
