import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronDown,
  Eye,
  FileSearch,
  Fingerprint,
  Layers3,
  SearchCheck,
  ShieldCheck,
  Sparkles,
  Target,
} from "lucide-react";
import { LazyFictionalPortfolioDemo } from "@/components/services/career-portfolios/lazy-fictional-portfolio-demo";
import { TrackedLink } from "@/components/analytics/tracked-link";
import { StructuredData } from "@/components/seo/structured-data";
import { Badge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/ui/reveal";
import { Section } from "@/components/ui/section";
import {
  careerPortfolioFaqs,
  careerPortfolioPackages,
  careerPortfolioProcess,
  getCareerPortfolioInquiryHref,
} from "@/lib/career-portfolios";
import { createPageMetadata, siteConfig } from "@/lib/site-config";

const pageDescription =
  "Rukh Labs creates recruiter-ready career portfolio websites for job searches, turning professional experience into credible case studies and visible proof.";

export const metadata: Metadata = createPageMetadata({
  title: "Career Portfolio Websites for Analysts & Technical Professionals",
  description: pageDescription,
  path: "/services/career-portfolios",
});

const valueLayers = [
  {
    title: "Positioning",
    copy: "Clarify the role, level, strengths, and through-line a hiring team should remember.",
    icon: Target,
  },
  {
    title: "Proof",
    copy: "Translate resume bullets into case studies with context, choices, constraints, and outcomes.",
    icon: FileSearch,
  },
  {
    title: "Identity",
    copy: "Create a visual system that feels specific to the candidate instead of another template.",
    icon: Fingerprint,
  },
  {
    title: "Control",
    copy: "Choose what is public, redacted, fictionalized, unlisted, or excluded from search.",
    icon: ShieldCheck,
  },
] as const;

const portfolioParts = [
  "A direct role and value proposition",
  "A recruiter-friendly career narrative",
  "Outcome-led case studies",
  "Skills connected to visible evidence",
  "Responsive, accessible presentation",
  "Clear next steps for interview or contact",
] as const;

function PackageCard({
  careerPackage,
}: {
  careerPackage: (typeof careerPortfolioPackages)[number];
}) {
  const packageClasses = careerPackage.recommended
    ? "border-[#16c8ff]/42 bg-[radial-gradient(circle_at_86%_8%,rgba(22,200,255,0.16),transparent_38%),linear-gradient(145deg,rgba(8,22,31,0.97),rgba(10,9,18,0.96))] shadow-[0_26px_90px_rgba(22,200,255,0.09)]"
    : "border-white/12 bg-white/[0.025]";

  return (
    <article
      className={
        "relative flex h-full flex-col overflow-hidden rounded-[1.4rem] border p-6 sm:p-7 " +
        packageClasses
      }
    >
      {careerPackage.recommended ? (
        <Badge tone="blue" className="mb-5 self-start uppercase tracking-[0.12em]">
          Best for an active job search
        </Badge>
      ) : null}
      <h3 className="text-2xl font-semibold text-white">{careerPackage.name}</h3>
      <div className="mt-5 flex items-end justify-between gap-4 border-b border-white/10 pb-5">
        <strong className="text-3xl font-semibold tracking-[-0.045em] text-white sm:text-4xl">
          {careerPackage.price}
        </strong>
        <span className="max-w-32 text-right text-xs leading-5 text-white/40">
          {careerPackage.priceNote}
        </span>
      </div>
      <p className="mt-6 text-base leading-7 text-white/64">{careerPackage.summary}</p>
      <p className="mt-3 text-sm leading-6 text-[#9fdff0]">{careerPackage.bestFor}</p>
      <ul className="mt-7 grid gap-3">
        {careerPackage.features.map((feature) => (
          <li key={feature} className="flex items-start gap-3 text-sm leading-6 text-white/64">
            <Check aria-hidden className="mt-1 size-4 shrink-0 text-[#67e8f9]" />
            {feature}
          </li>
        ))}
      </ul>
      <TrackedLink
        href={getCareerPortfolioInquiryHref(careerPackage.id)}
        eventName="career_package_click"
        eventProperties={{
          package_id: careerPackage.id,
          source_page: "/services/career-portfolios",
        }}
        className={buttonStyles({
          variant: careerPackage.recommended ? "primary" : "secondary",
          className: "mt-8 w-full sm:w-auto sm:self-start",
        })}
      >
        Discuss {careerPackage.name}
        <ArrowRight aria-hidden className="size-4" />
      </TrackedLink>
    </article>
  );
}

export default function CareerPortfoliosPage() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "Career portfolio website design and development",
    serviceType: "Career portfolio website design and development",
    description: pageDescription,
    url: siteConfig.url + "/services/career-portfolios",
    provider: {
      "@type": "Organization",
      "@id": `${siteConfig.url}/#organization`,
      name: siteConfig.name,
      url: siteConfig.url,
      email: siteConfig.contactEmail,
    },
    audience: {
      "@type": "Audience",
      audienceType: "Analysts, technical professionals, leaders, and consultants",
    },
    serviceOutput: "A responsive career portfolio website and approved project deliverables",
    offers: careerPortfolioPackages.map((careerPackage) => ({
      "@type": "Offer",
      name: careerPackage.name,
      priceCurrency: "USD",
      price: careerPackage.price.replace(/[^0-9]/g, ""),
      description: careerPackage.summary,
    })),
  };

  return (
    <>
      <StructuredData data={structuredData} />

      <section className="relative overflow-hidden border-b border-white/10">
        <div className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,#16c8ff_38%,#8b5cf6_70%,transparent)]" />
        <div className="absolute right-[-10rem] top-[-12rem] size-[38rem] rounded-full bg-[#16c8ff]/8 blur-3xl" />
        <Container className="relative grid min-h-[calc(100vh-4.5rem)] items-center gap-12 py-16 sm:py-20 lg:grid-cols-[0.96fr_1.04fr] lg:py-24">
          <Reveal>
            <div className="max-w-3xl">
              <Badge tone="blue" className="uppercase tracking-[0.16em]">
                Rukh Labs Career Portfolio Studio
              </Badge>
              <h1 className="mt-7 text-5xl font-semibold leading-[1.01] tracking-[-0.05em] text-white sm:text-7xl">
                A resume says it. A portfolio{" "}
                <span className="bg-[linear-gradient(100deg,#67e8f9,#a78bfa)] bg-clip-text text-transparent">
                  proves it.
                </span>
              </h1>
              <p className="mt-7 max-w-2xl text-lg leading-8 text-white/68 sm:text-xl">
                Custom career portfolio websites that help recruiters understand
                how you think, what you can do, and why your work mattered—before
                the first interview.
              </p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Link
                  href={getCareerPortfolioInquiryHref()}
                  className={buttonStyles({ size: "lg" })}
                >
                  Start Your Portfolio
                  <ArrowRight aria-hidden className="size-4" />
                </Link>
                <TrackedLink
                  href="/services/career-portfolios/demo"
                  eventName="career_demo_open"
                  eventProperties={{ source_page: "/services/career-portfolios" }}
                  className={buttonStyles({ variant: "secondary", size: "lg" })}
                >
                  Explore Fictional Demo
                </TrackedLink>
              </div>
              <p className="mt-7 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.13em] text-white/40">
                <Layers3 aria-hidden className="size-4 text-[#67e8f9]" />
                Use your current domain, a subdomain, or a new domain—your choice
              </p>
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <div className="relative rounded-[1.6rem] border border-[#16c8ff]/22 bg-[linear-gradient(145deg,rgba(9,25,35,0.96),rgba(10,8,18,0.96))] p-5 shadow-[0_34px_110px_rgba(0,0,0,0.42)] sm:p-7">
              <div className="flex items-center justify-between border-b border-white/10 pb-5">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#8aeaff]">
                    Recruiter scan
                  </p>
                  <p className="mt-2 text-sm text-white/48">What becomes clear, fast</p>
                </div>
                <Eye aria-hidden className="size-5 text-[#a78bfa]" />
              </div>
              <div className="mt-5 grid gap-3">
                {[
                  ["10 sec", "Who you are and where you fit"],
                  ["60 sec", "The outcomes and strengths worth remembering"],
                  ["5 min", "How you approached real, difficult work"],
                  ["Deep dive", "Artifacts, demos, methods, and technical detail"],
                ].map(([time, value], index) => (
                  <div
                    key={time}
                    className="grid grid-cols-[5rem_1fr] gap-4 rounded-xl border border-white/9 bg-white/[0.025] p-4"
                  >
                    <span className="font-mono text-xs font-semibold text-[#67e8f9]">{time}</span>
                    <div>
                      <p className="text-sm font-medium text-white">{value}</p>
                      <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/8">
                        <i
                          className="block h-full rounded-full bg-[linear-gradient(90deg,#16c8ff,#8b5cf6)]"
                          style={{ width: String(52 + index * 13) + "%" }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </Container>
      </section>

      <Section>
        <Container>
          <Reveal>
            <div className="max-w-3xl">
              <Badge tone="ivory">Built for the hiring decision</Badge>
              <h2 className="mt-5 text-3xl font-semibold text-white sm:text-5xl">
                More than a prettier resume.
              </h2>
              <p className="mt-5 text-lg leading-8 text-white/62">
                The work starts with the role you want and ends with a coherent
                evidence system. Every section has a job: orient, prove,
                differentiate, or move the conversation forward.
              </p>
            </div>
          </Reveal>
          <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {valueLayers.map((item, index) => {
              const Icon = item.icon;
              return (
                <Reveal key={item.title} delay={index * 0.05}>
                  <Card className="h-full p-5">
                    <Icon aria-hidden className="size-5 text-[#67e8f9]" />
                    <h3 className="mt-5 text-lg font-semibold text-white">{item.title}</h3>
                    <p className="mt-3 text-sm leading-6 text-white/56">{item.copy}</p>
                  </Card>
                </Reveal>
              );
            })}
          </div>
        </Container>
      </Section>

      <Section className="border-y border-white/10 bg-white/[0.018]">
        <Container className="grid gap-10 lg:grid-cols-[0.82fr_1.18fr] lg:items-center">
          <Reveal>
            <div>
              <Badge tone="gold">What the site can include</Badge>
              <h2 className="mt-5 text-3xl font-semibold text-white sm:text-5xl">
                One story, several depths.
              </h2>
              <p className="mt-5 text-lg leading-8 text-white/62">
                Recruiters can scan. Hiring managers can inspect. Technical
                reviewers can go deep. The structure respects all three.
              </p>
            </div>
          </Reveal>
          <Reveal delay={0.08}>
            <div className="grid gap-px overflow-hidden rounded-xl border border-white/10 bg-white/10 sm:grid-cols-2">
              {portfolioParts.map((part, index) => (
                <div key={part} className="flex min-h-24 gap-4 bg-[#09090d] p-5">
                  <span className="font-mono text-xs font-semibold text-[#8aeaff]">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <p className="text-sm leading-6 text-white/66">{part}</p>
                </div>
              ))}
            </div>
          </Reveal>
        </Container>
      </Section>

      <Section>
        <Container>
          <Reveal>
            <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <Badge tone="blue">Fictional demonstration</Badge>
                <h2 className="mt-5 text-3xl font-semibold text-white sm:text-5xl">
                  Explore a working career portfolio demo.
                </h2>
              </div>
              <TrackedLink
                href="/services/career-portfolios/demo"
                eventName="career_demo_open"
                eventProperties={{ source_page: "/services/career-portfolios" }}
                className={buttonStyles({ variant: "ghost" })}
              >
                Open full demo
                <ArrowRight aria-hidden className="size-4" />
              </TrackedLink>
            </div>
          </Reveal>
          <Reveal delay={0.08}>
            <div className="mt-10">
              <LazyFictionalPortfolioDemo />
            </div>
          </Reveal>
        </Container>
      </Section>

      <Section className="border-y border-white/10 bg-white/[0.018]">
        <Container>
          <Reveal>
            <div className="max-w-3xl">
              <Badge tone="ivory">Packages</Badge>
              <h2 className="mt-5 text-3xl font-semibold text-white sm:text-5xl">
                Start focused. Add depth where it earns attention.
              </h2>
              <p className="mt-5 text-lg leading-8 text-white/62">
                Every engagement is confirmed in writing before work begins.
                Hosting, domain, paid media, and unusual integrations are scoped separately.
              </p>
            </div>
          </Reveal>
          <div className="mt-10 grid gap-5 lg:grid-cols-3">
            {careerPortfolioPackages.map((careerPackage, index) => (
              <Reveal key={careerPackage.id} delay={index * 0.05}>
                <PackageCard careerPackage={careerPackage} />
              </Reveal>
            ))}
          </div>
        </Container>
      </Section>

      <Section>
        <Container className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
          <Reveal>
            <div>
              <Badge tone="gold">Why these prices</Badge>
              <h2 className="mt-5 text-3xl font-semibold text-white sm:text-5xl">
                Professional portfolio design, scoped for a focused hiring goal.
              </h2>
              <p className="mt-5 text-base leading-7 text-white/60">
                Published benchmarks span cheap DIY tools through large agency
                engagements. These packages sit in the professional freelance
                range and concentrate the budget on positioning, evidence,
                custom presentation, and launch quality.
              </p>
            </div>
          </Reveal>
          <Reveal delay={0.08}>
            <div className="grid gap-4 sm:grid-cols-3">
              {[
                {
                  label: "Portfolio specialists",
                  value: "$500–$5,000+",
                  copy: "Wix’s current guide for a professionally built portfolio.",
                  href: "https://www.wix.com/blog/how-much-does-a-portfolio-website-cost",
                },
                {
                  label: "Freelance web design",
                  value: "$15–$75/hr",
                  copy: "Upwork’s stated range, with custom work toward the top.",
                  href: "https://www.upwork.com/hire/web-designers/",
                },
                {
                  label: "Agency web design",
                  value: "$2K–$100K",
                  copy: "Clutch’s 2026 range across broader agency engagements.",
                  href: "https://clutch.co/web-designers/pricing",
                },
              ].map((source) => (
                <a
                  key={source.label}
                  href={source.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group rounded-xl border border-white/10 bg-white/[0.025] p-5 transition hover:-translate-y-1 hover:border-[#16c8ff]/36"
                >
                  <span className="text-xs font-semibold uppercase tracking-[0.12em] text-white/40">
                    {source.label}
                  </span>
                  <strong className="mt-5 block text-2xl font-semibold text-white">{source.value}</strong>
                  <p className="mt-3 text-sm leading-6 text-white/52">{source.copy}</p>
                  <span className="mt-5 inline-flex items-center gap-2 text-xs font-semibold text-[#8aeaff]">
                    View source <ArrowUpRight aria-hidden className="size-3.5" />
                  </span>
                </a>
              ))}
            </div>
          </Reveal>
        </Container>
      </Section>

      <Section className="border-y border-white/10 bg-white/[0.018]">
        <Container>
          <Reveal>
            <Badge tone="red">Process</Badge>
            <h2 className="mt-5 max-w-3xl text-3xl font-semibold text-white sm:text-5xl">
              Built from evidence outward.
            </h2>
          </Reveal>
          <div className="mt-10 grid gap-px overflow-hidden rounded-xl border border-white/10 bg-white/10 md:grid-cols-2 xl:grid-cols-4">
            {careerPortfolioProcess.map((step, index) => (
              <Reveal key={step.number} delay={index * 0.04}>
                <div className="h-full bg-[#09080b] p-6">
                  <span className="font-mono text-xs font-semibold text-[#67e8f9]">{step.number}</span>
                  <h3 className="mt-7 text-xl font-semibold text-white">{step.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-white/54">{step.copy}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </Container>
      </Section>

      <Section>
        <Container className="grid gap-10 lg:grid-cols-[0.7fr_1.3fr]">
          <Reveal>
            <div>
              <Badge tone="ivory">Questions</Badge>
              <h2 className="mt-5 text-3xl font-semibold text-white sm:text-5xl">
                Career portfolio questions, answered.
              </h2>
              <p className="mt-5 text-base leading-7 text-white/58">
                Your current domain is usually enough. Privacy and evidence depth
                are design choices, not afterthoughts.
              </p>
            </div>
          </Reveal>
          <div className="grid gap-3">
            {careerPortfolioFaqs.map((faq, index) => (
              <Reveal key={faq.question} delay={index * 0.04}>
                <details className="group rounded-xl border border-white/10 bg-white/[0.025] p-5 open:border-[#16c8ff]/24 open:bg-[#16c8ff]/[0.035]">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-5 text-base font-semibold text-white">
                    {faq.question}
                    <ChevronDown
                      aria-hidden
                      className="size-4 shrink-0 text-white/38 transition group-open:rotate-180"
                    />
                  </summary>
                  <p className="mt-4 max-w-3xl text-sm leading-7 text-white/58">{faq.answer}</p>
                </details>
              </Reveal>
            ))}
          </div>
        </Container>
      </Section>

      <Section className="pt-0">
        <Container>
          <Reveal>
            <div className="grid gap-8 rounded-[1.5rem] border border-[#16c8ff]/22 bg-[linear-gradient(135deg,rgba(22,200,255,0.1),rgba(109,49,255,0.09),rgba(255,255,255,0.025))] p-6 sm:p-8 lg:grid-cols-[1fr_auto] lg:items-center lg:p-10">
              <div>
                <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#8aeaff]">
                  <SearchCheck aria-hidden className="size-4" />
                  Career portfolio project
                </p>
                <h2 className="mt-5 text-3xl font-semibold text-white sm:text-5xl">
                  Turn career claims into visible proof.
                </h2>
                <p className="mt-4 max-w-2xl text-base leading-7 text-white/60">
                  Share the roles you are targeting and the proof you already
                  have. Rukh Labs will recommend the smallest useful scope.
                </p>
              </div>
              <div className="flex flex-col gap-3 lg:items-end">
                <Link
                  href={getCareerPortfolioInquiryHref()}
                  className={buttonStyles({ size: "lg", className: "justify-self-start" })}
                >
                  Start a Project
                  <Sparkles aria-hidden className="size-4" />
                </Link>
                <Link href="/about" className={buttonStyles({ variant: "ghost", size: "sm" })}>
                  Meet the founder
                </Link>
              </div>
            </div>
          </Reveal>
        </Container>
      </Section>
    </>
  );
}
