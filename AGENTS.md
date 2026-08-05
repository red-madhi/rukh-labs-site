# Rukh Labs repository guidance

- Preserve the permanent tagline: `Clean tools. Sharper standards.`
- Do not publish the owner's personal name, profile links, resume details, employer information, or confidential work on public routes, metadata, JSON-LD, or social images.
- Keep `/portfolio/brett-gallaher` unlisted and protected with noindex, nofollow, noarchive, and nosnippet; do not link to it from public pages or include it in the sitemap.
- Use `hello@rukhlabs.com` for public contact text, mail links, and structured data. Do not expose an internal forwarding destination.
- Do not invent clients, testimonials, reviews, results, locations, statistics, or legal conclusions.
- Register every indexable route in `src/lib/seo-routes.ts`; keep private and noindex routes out of the sitemap.
- Use explicit, stable content dates. `lastModified` changes only for meaningful public edits; never generate sitemap or article dates from the build clock. Do not treat sitemap priority or change frequency as ranking or crawl-control mechanisms.
- Article structured data uses the Rukh Labs Organization for author and publisher and must not expose a personal name or Person schema.
- Keep user-entered or generated free text out of analytics events.
- Use the existing metadata helper, structured-data serializer, breadcrumbs, and social-image system rather than parallel implementations.
- Run `pnpm run lint`, `pnpm run build`, and `pnpm run seo:audit` before publishing changes.
