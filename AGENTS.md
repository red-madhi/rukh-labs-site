# Rukh Labs repository guidance

- Preserve the permanent tagline: `Clean tools. Sharper standards.`
- Do not publish the owner's personal name, profile links, resume details, employer information, or confidential work on public routes, metadata, JSON-LD, or social images.
- Keep `/portfolio/brett-gallaher` unlisted and protected with noindex, nofollow, noarchive, and nosnippet; do not link to it from public pages or include it in the sitemap.
- Use `hello@rukhlabs.com` for public contact text, mail links, and structured data. Do not expose an internal forwarding destination.
- Do not invent clients, testimonials, reviews, results, locations, statistics, or legal conclusions.
- Register every indexable route in `src/lib/seo-routes.ts`; keep private and noindex routes out of the sitemap.
- Use the existing metadata helper, structured-data serializer, breadcrumbs, and social-image system rather than parallel implementations.
- Run `pnpm run lint`, `pnpm run build`, and `pnpm run seo:audit` before publishing changes.
