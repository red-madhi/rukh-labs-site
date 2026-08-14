# Rukh Labs

Public website for Rukh Labs, built with Next.js and deployed on Vercel.

## Local development

```bash
pnpm install
pnpm dev
```

## Quality checks

Run these before publishing meaningful changes:

```bash
pnpm run lint
pnpm run build
pnpm run seo:audit
```

## Contact lead capture

The `/contact` form submits to `/api/contact` and stores leads in Neon Postgres.

Required server environment variable in Vercel Production and Preview:

- `DATABASE_URL` — Neon Postgres connection string. Keep this server-only and never expose it through a `NEXT_PUBLIC_` variable.

Optional email notifications use Resend:

- `RESEND_API_KEY`
- `CONTACT_NOTIFICATION_EMAIL`
- `CONTACT_FROM_EMAIL` — optional; defaults to `Rukh Labs <hello@rukhlabs.com>`

Lead notification failures do not discard a successfully stored lead.
