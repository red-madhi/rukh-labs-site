import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { NotFoundFocus } from "@/components/seo/not-found-focus";
import { Badge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";

export const metadata: Metadata = {
  title: "Page Not Found | Rukh Labs",
  description: "The requested Rukh Labs page could not be found.",
  alternates: {
    canonical: undefined,
  },
  robots: {
    index: false,
    follow: true,
  },
};

const destinations = [
  ["Websites", "/services/web-development"],
  ["Career Portfolios", "/services/career-portfolios"],
  ["Products", "/products"],
  ["Work", "/work"],
  ["Contact", "/contact"],
] as const;

export default function NotFound() {
  return (
    <Section className="relative overflow-hidden border-b border-white/10">
      <div className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,#f0001c_45%,#16c8ff_72%,transparent)]" />
      <Container>
        <Card className="mx-auto max-w-4xl p-7 sm:p-10 lg:p-14">
          <Badge tone="red">404</Badge>
          <NotFoundFocus />
          <h1
            id="not-found-heading"
            tabIndex={-1}
            className="mt-6 text-4xl font-semibold tracking-[-0.04em] text-white outline-none sm:text-6xl"
          >
            This page could not be found.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-white/66">
            The address may be outdated or incomplete. Start from the homepage or
            choose a current Rukh Labs section below.
          </p>
          <div className="mt-8">
            <Link href="/" className={buttonStyles({ size: "lg" })}>
              Go to the homepage
              <ArrowRight aria-hidden className="size-4" />
            </Link>
          </div>
          <nav
            aria-label="Helpful pages"
            className="mt-9 grid gap-3 border-t border-white/10 pt-7 sm:grid-cols-2"
          >
            {destinations.map(([label, href]) => (
              <Link
                key={href}
                href={href}
                className="rounded-xl border border-white/10 bg-white/[0.025] px-4 py-3 text-sm font-medium text-white/68 transition hover:border-[color:var(--brand-red)]/45 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--brand-red)]"
              >
                {label}
              </Link>
            ))}
          </nav>
        </Card>
      </Container>
    </Section>
  );
}
