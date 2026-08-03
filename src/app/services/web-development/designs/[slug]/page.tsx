import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, Palette } from "lucide-react";
import { DesignPreview } from "@/components/services/web-development/design-preview";
import { Badge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/ui/reveal";
import { Section } from "@/components/ui/section";
import { createPageMetadata } from "@/lib/site-config";
import {
  designDirections,
  getDesignDirection,
  getWebsiteProjectHref,
} from "@/lib/web-development";

type DesignDirectionPageProps = {
  params: Promise<{ slug: string }>;
};

export const dynamicParams = false;

export function generateStaticParams() {
  return designDirections.map((direction) => ({ slug: direction.slug }));
}

export async function generateMetadata({
  params,
}: DesignDirectionPageProps): Promise<Metadata> {
  const { slug } = await params;
  const direction = getDesignDirection(slug);

  if (!direction) {
    return createPageMetadata({
      title: "Website Design Direction",
      description: "Explore website design directions from Rukh Labs.",
      path: "/services/web-development",
    });
  }

  return createPageMetadata({
    title: `${direction.name} Website Direction`,
    description: `${direction.summary} Explore the ${direction.name} website design direction from Rukh Labs.`,
    path: direction.href,
  });
}

export default async function DesignDirectionPage({
  params,
}: DesignDirectionPageProps) {
  const { slug } = await params;
  const direction = getDesignDirection(slug);

  if (!direction) {
    notFound();
  }

  return (
    <>
      <section className="relative overflow-hidden border-b border-white/10">
        <div className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,#f0001c_48%,transparent)]" />
        <Container className="py-16 sm:py-20 lg:py-24">
          <Reveal>
            <Link
              href="/services/web-development#designs"
              className="inline-flex items-center gap-2 rounded-full text-sm font-medium text-white/56 transition hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[color:var(--brand-red)]"
            >
              <ArrowLeft aria-hidden className="size-4" />
              All design directions
            </Link>
            <div className="mt-10 grid gap-8 lg:grid-cols-[0.75fr_1.25fr] lg:items-end">
              <div>
                <Badge tone="red">Website direction</Badge>
                <h1 className="mt-6 text-5xl font-semibold tracking-[-0.045em] text-white sm:text-7xl">
                  {direction.name}
                </h1>
              </div>
              <div>
                <p className="max-w-2xl text-lg leading-8 text-white/66 sm:text-xl">
                  {direction.summary}
                </p>
                <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                  <Link
                    href={direction.sampleHref}
                    className={buttonStyles({ size: "lg" })}
                  >
                    Open full sample site
                    <ArrowRight aria-hidden className="size-4" />
                  </Link>
                  <Link
                    href={getWebsiteProjectHref({ design: direction.slug })}
                    className={buttonStyles({ variant: "secondary", size: "lg" })}
                  >
                    Start with {direction.name}
                  </Link>
                </div>
              </div>
            </div>
          </Reveal>
        </Container>
      </section>

      <Section className="pb-12 sm:pb-14">
        <Container>
          <Reveal>
            <DesignPreview slug={direction.slug} size="full" />
            <div className="mt-5 flex flex-col gap-5 rounded-[1.15rem] border border-white/12 bg-white/[0.03] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#ff8d98]">
                  Full working example
                </p>
                <h2 className="mt-2 text-xl font-semibold text-white">
                  Explore {direction.sampleName} beyond the mockup.
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-white/54">
                  Navigate a complete responsive sample with real sections,
                  working interactions, and purposeful content.
                </p>
              </div>
              <Link
                href={direction.sampleHref}
                className={buttonStyles({
                  variant: "secondary",
                  className: "shrink-0",
                })}
              >
                Launch sample website
                <ArrowRight aria-hidden className="size-4" />
              </Link>
            </div>
          </Reveal>
        </Container>
      </Section>

      <Section className="pt-8 sm:pt-10">
        <Container className="grid gap-8 lg:grid-cols-[0.75fr_1.25fr]">
          <Reveal>
            <div>
              <Badge tone="ivory">Best suited for</Badge>
              <ul className="mt-6 flex flex-wrap gap-2">
                {direction.bestFor.map((useCase) => (
                  <li
                    key={useCase}
                    className="rounded-full border border-white/12 bg-white/[0.035] px-3 py-1.5 text-sm text-white/62"
                  >
                    {useCase}
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
          <Reveal delay={0.08}>
            <Card className="p-6 sm:p-8">
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-lg border border-[color:var(--brand-red)]/25 bg-[color:var(--brand-red)]/10 text-[#ff939d]">
                  <Palette aria-hidden className="size-4" />
                </span>
                <h2 className="text-2xl font-semibold text-white">
                  What this direction emphasizes
                </h2>
              </div>
              <ul className="mt-7 grid gap-4 sm:grid-cols-2">
                {direction.traits.map((trait) => (
                  <li key={trait} className="flex items-start gap-3 text-sm leading-6 text-white/62">
                    <Check
                      aria-hidden
                      className="mt-1 size-4 shrink-0 text-[#ff8590]"
                    />
                    {trait}
                  </li>
                ))}
              </ul>
            </Card>
          </Reveal>
        </Container>
      </Section>

      <Section className="border-y border-white/10 bg-white/[0.02]">
        <Container>
          <Reveal>
            <div className="mx-auto max-w-4xl text-center">
              <Badge tone="gold">A direction, not a clone</Badge>
              <h2 className="mt-6 text-3xl font-semibold text-white sm:text-5xl">
                Keep the design logic. Change what makes it yours.
              </h2>
              <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-white/62">
                The palette, typography, layout, imagery, content, and individual
                components are adapted to the project. The goal is a clear
                starting language—not copies of the same website.
              </p>
              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                <Link
                  href={getWebsiteProjectHref({ design: direction.slug })}
                  className={buttonStyles({ size: "lg" })}
                >
                  Start a Project
                  <ArrowRight aria-hidden className="size-4" />
                </Link>
                <Link
                  href="/services/web-development#designs"
                  className={buttonStyles({ variant: "secondary", size: "lg" })}
                >
                  Compare directions
                </Link>
              </div>
            </div>
          </Reveal>
        </Container>
      </Section>
    </>
  );
}
