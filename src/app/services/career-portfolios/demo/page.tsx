import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight, ShieldCheck } from "lucide-react";
import { FictionalPortfolioDemo } from "@/components/services/career-portfolios/fictional-portfolio-demo";
import { Badge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/ui/reveal";
import { Section } from "@/components/ui/section";
import { careerPortfolioInquiryHref } from "@/lib/career-portfolios";
import { createPageMetadata } from "@/lib/site-config";

export const metadata: Metadata = createPageMetadata({
  title: "Career Portfolio Demo",
  description:
    "Explore a fictional, privacy-safe demonstration of a custom career portfolio from Rukh Labs.",
  path: "/services/career-portfolios/demo",
});

export default function CareerPortfolioDemoPage() {
  return (
    <>
      <section className="relative overflow-hidden border-b border-white/10">
        <div className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,#16c8ff_40%,#8b5cf6_72%,transparent)]" />
        <Container className="relative py-16 sm:py-20 lg:py-24">
          <Reveal>
            <Link
              href="/services/career-portfolios"
              className="inline-flex items-center gap-2 text-sm font-semibold text-white/52 transition hover:text-white"
            >
              <ArrowLeft aria-hidden className="size-4" />
              Career Portfolio Studio
            </Link>
            <div className="mt-9 grid gap-7 lg:grid-cols-[1fr_0.7fr] lg:items-end">
              <div>
                <Badge tone="blue">Fictional interactive demo</Badge>
                <h1 className="mt-6 max-w-4xl text-4xl font-semibold leading-[1.04] text-white sm:text-6xl">
                  Show the thinking behind the title.
                </h1>
              </div>
              <div>
                <p className="text-lg leading-8 text-white/62">
                  This sample demonstrates how positioning, proof, outcomes, and
                  interaction can help a candidate stand out without exposing a
                  real person or confidential work.
                </p>
                <p className="mt-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.13em] text-[#8aeaff]">
                  <ShieldCheck aria-hidden className="size-4" />
                  No personal data, downloads, or submission endpoint
                </p>
              </div>
            </div>
          </Reveal>
        </Container>
      </section>

      <Section>
        <Container>
          <Reveal>
            <FictionalPortfolioDemo />
          </Reveal>
        </Container>
      </Section>

      <Section className="border-t border-white/10 bg-white/[0.018]">
        <Container>
          <Reveal>
            <div className="flex flex-col gap-6 rounded-[1.4rem] border border-[#16c8ff]/18 bg-[linear-gradient(135deg,rgba(22,200,255,0.08),rgba(109,49,255,0.08))] p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
              <div>
                <h2 className="text-2xl font-semibold text-white">Ready to build yours?</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-white/56">
                  Your version is shaped around your target roles, real evidence,
                  privacy needs, and visual personality.
                </p>
              </div>
              <Link href={careerPortfolioInquiryHref} className={buttonStyles({ size: "lg" })}>
                Start a Career Portfolio
                <ArrowRight aria-hidden className="size-4" />
              </Link>
            </div>
          </Reveal>
        </Container>
      </Section>
    </>
  );
}
