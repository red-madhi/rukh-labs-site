# Rukh Labs Site

Production-quality marketing website for Rukh Labs, an independent software lab building Glass Squares OS and Farzin.

## Stack

- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- Framer Motion
- Lucide React
- Custom shadcn/ui-style primitives

## Install

```bash
pnpm install
```

## Run Development Server

```bash
pnpm dev
```

Open `http://localhost:3000`.

## Build

```bash
pnpm build
```

## Lint

```bash
pnpm lint
```

## Deployment

The project is ready for Vercel deployment. Import the repo, keep the default Next.js settings, and use `pnpm build` as the build command.

## Editing Content

Primary brand, product, and roadmap content lives in:

- `src/lib/site-config.ts`
- `src/lib/products.ts`
- `src/lib/changelog.ts`

Shared UI lives in `src/components`. Product mockups are CSS/HTML based and live in `src/components/visuals`.

## Forms

The waitlist and contact forms are frontend-only placeholders. They validate input locally and show polished success states, but they do not send data to a backend yet.
