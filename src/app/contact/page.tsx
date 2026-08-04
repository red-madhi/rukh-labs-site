import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BriefcaseBusiness, Check, Clock3, Globe2, Mail, Sparkles } from "lucide-react";
import { ContactForm } from "@/components/forms/contact-form";
import { Badge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import { PageHeader } from "@/components/ui/page-header";
import { Reveal } from "@/components/ui/reveal";
import { Section } from "@/components/ui/section";
import { createPageMetadata, siteConfig } from "@/lib/site-config";

export const metadata: Metadata = createPageMetadata({
  title: "Contact & Project Inquiry",
  description:
    "Start a website or career portfolio project with Rukh Labs, or get in touch about products, partnerships, press, and security.",
  path: "/contact",
});

type ContactPageProps = {
  searchParams: Promise<{
    inquiry?: string;
    package?: string;
    design?: string;
  }>;
};

const projectSteps = [
  "Share the project, budget range, and timeline.",
  "Rukh Labs reviews the fit and follows up with practical questions.",
  "You receive a clear scope, price, and next step before work begins.",
] as const;

export default async function ContactPage({ searchParams }: ContactPageProps) {
  const query = await searchParams;

  return (
    <>
      <PageHeader
        eyebrow="Contact Rukh Labs"
        title="Have a project in mind? Let’s talk."
        description="Start a website or career portfolio project, ask a product question, report a security issue, or discuss a serious partnership. Share the useful details below and get a clear next step."
      />
      <Section>
        <Container className="grid gap-8 lg:grid-cols-[0.72fr_1.28fr] lg:items-start">
          <div className="grid gap-6 lg:sticky lg:top-24">
            <Reveal>
              <Card className="overflow-hidden border-[color:var(--brand-red)]/30 bg-[radial-gradient(circle_at_90%_8%,rgba(240,0,28,0.22),transparent_42%),linear-gradient(145deg,rgba(29,11,14,0.96),rgba(10,8,10,0.96))] p-6 sm:p-7">
                <span className="grid size-11 place-items-center rounded-xl border border-[color:var(--brand-red)]/30 bg-[color:var(--brand-red)]/12 text-[#ff8a95]">
                  <Globe2 aria-hidden className="size-5" />
                </span>
                <Badge tone="red" className="mt-6">Website design clients</Badge>
                <h2 className="mt-5 text-2xl font-semibold leading-tight text-white sm:text-3xl">
                  A real site, built around what you need to sell.
                </h2>
                <p className="mt-4 text-sm leading-7 text-white/62">
                  Launch pages start at $995, five-page business sites at $1,995,
                  and custom builds at $3,500. Every project is scoped before work begins.
                </p>
                <ul className="mt-6 grid gap-3">
                  {["Responsive design", "Clear pricing", "Launch support"].map((item) => (
                    <li key={item} className="flex items-center gap-3 text-sm text-white/68">
                      <Check aria-hidden className="size-4 text-[#ff7c88]" />
                      {item}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/services/web-development"
                  className={buttonStyles({ variant: "secondary", className: "mt-7 w-full" })}
                >
                  View packages and designs
                  <ArrowRight aria-hidden className="size-4" />
                </Link>
              </Card>
            </Reveal>

            <Reveal delay={0.04}>
              <Card className="overflow-hidden border-[#16c8ff]/24 bg-[radial-gradient(circle_at_90%_8%,rgba(22,200,255,0.16),transparent_42%),linear-gradient(145deg,rgba(8,23,31,0.96),rgba(10,8,14,0.96))] p-6 sm:p-7">
                <span className="grid size-11 place-items-center rounded-xl border border-[#16c8ff]/28 bg-[#16c8ff]/10 text-[#8aeaff]">
                  <BriefcaseBusiness aria-hidden className="size-5" />
                </span>
                <Badge tone="blue" className="mt-6">Career portfolio clients</Badge>
                <h2 className="mt-5 text-2xl font-semibold leading-tight text-white sm:text-3xl">
                  Turn career claims into visible proof.
                </h2>
                <p className="mt-4 text-sm leading-7 text-white/62">
                  Focused portfolios start at $995, signature builds at $1,995,
                  and custom proof systems at $3,500.
                </p>
                <Link
                  href="/services/career-portfolios"
                  className={buttonStyles({ variant: "secondary", className: "mt-7 w-full" })}
                >
                  View career portfolio packages
                  <ArrowRight aria-hidden className="size-4" />
                </Link>
              </Card>
            </Reveal>

            <Reveal delay={0.06}>
              <Card className="p-6">
                <div className="flex items-center gap-3">
                  <Clock3 aria-hidden className="size-5 text-[#e6bd73]" />
                  <h2 className="text-lg font-semibold text-white">What happens next</h2>
                </div>
                <ol className="mt-5 grid gap-4">
                  {projectSteps.map((step, index) => (
                    <li key={step} className="grid grid-cols-[1.75rem_1fr] gap-3 text-sm leading-6 text-white/58">
                      <span className="font-mono text-xs font-semibold text-[#ff7f8a]">
                        0{index + 1}
                      </span>
                      {step}
                    </li>
                  ))}
                </ol>
              </Card>
            </Reveal>

            <Reveal delay={0.1}>
              <div className="rounded-xl border border-white/10 bg-white/[0.025] p-5">
                <div className="flex items-center gap-3 text-sm font-semibold text-white">
                  <Mail aria-hidden className="size-4 text-[#ff8b96]" />
                  Prefer a plain email?
                </div>
                <a
                  href={siteConfig.links.email}
                  className="mt-2 inline-flex text-sm text-white/56 underline decoration-white/20 underline-offset-4 transition hover:text-white"
                >
                  {siteConfig.contactEmail}
                </a>
              </div>
            </Reveal>
          </div>

          <Reveal delay={0.05}>
            <ContactForm
              initialInquiry={query.inquiry}
              initialPackage={query.package}
              initialDesign={query.design}
            />
          </Reveal>
        </Container>
      </Section>

      <Section className="border-t border-white/10 bg-white/[0.015]">
        <Container>
          <Reveal>
            <div className="flex flex-col gap-5 rounded-[1.4rem] border border-white/10 bg-[linear-gradient(135deg,rgba(24,13,15,0.84),rgba(10,9,11,0.9))] p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
              <div className="flex gap-4">
                <Sparkles aria-hidden className="mt-1 size-5 shrink-0 text-[#e6bd73]" />
                <div>
                  <h2 className="text-xl font-semibold text-white">Not sure what package fits?</h2>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-white/56">
                    Choose “Not sure yet” in the form. The right scope depends on the actual goal—not how many buzzwords fit in a package name.
                  </p>
                </div>
              </div>
              <Link
                href="/services/web-development#designs"
                className={buttonStyles({ variant: "ghost", className: "shrink-0" })}
              >
                Browse the six examples
                <ArrowRight aria-hidden className="size-4" />
              </Link>
            </div>
          </Reveal>
        </Container>
      </Section>
    </>
  );
}
