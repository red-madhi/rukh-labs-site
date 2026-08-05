import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  ChevronDown,
  Code2,
  Gauge,
  Globe2,
  LayoutTemplate,
  Mail,
  MonitorSmartphone,
  Search,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { DesignPreview } from "@/components/services/web-development/design-preview";
import { FictionalDemoDisclosure } from "@/components/services/web-development/fictional-demo-disclosure";
import { WebsiteHeroVisual } from "@/components/services/web-development/website-hero-visual";
import { TrackedAnchor, TrackedLink } from "@/components/analytics/tracked-link";
import { StructuredData } from "@/components/seo/structured-data";
import { CareerPortfolioTeaser } from "@/components/sections/career-portfolio-teaser";
import { Badge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/ui/reveal";
import { Section } from "@/components/ui/section";
import { createPageMetadata, siteConfig } from "@/lib/site-config";
import {
  designDirections,
  getWebsiteProjectHref,
  websiteAddOns,
  websiteDeliverables,
  websiteFaqs,
  websitePackages,
  websiteProcess,
  websiteProjectEmail,
  websiteProjectHref,
  type WebsitePackage,
} from "@/lib/web-development";

const pageDescription =
  "Rukh Labs provides distinctive website design and development for businesses, products, creators, and organizations, from focused launch pages to custom builds.";

export const metadata: Metadata = createPageMetadata({
  title: "Custom Website Design for Businesses & Creators",
  description: pageDescription,
  path: "/services/web-development",
});

const directionAccents = {
  obsidian: "border-[#c8ff41]/24",
  signal: "border-[#4f83ff]/25",
  atelier: "border-[#b86d5d]/28",
  "main-street": "border-[#efb84c]/28",
  spotlight: "border-[#ff4f72]/30",
  dispatch: "border-[#d65237]/30",
} as const;

const deliverableIcons = [
  MonitorSmartphone,
  ShieldCheck,
  Gauge,
  Search,
  Globe2,
  Code2,
  LayoutTemplate,
  Check,
] as const;

function PackageCard({ websitePackage }: { websitePackage: WebsitePackage }) {
  const placement = {
    launch: "lg:col-span-5 lg:col-start-1 lg:row-start-1",
    business:
      "lg:col-span-7 lg:col-start-6 lg:row-span-2 lg:row-start-1",
    custom: "lg:col-span-5 lg:col-start-1 lg:row-start-2",
  }[websitePackage.id];

  return (
    <article
      className={`${placement} relative flex h-full flex-col overflow-hidden rounded-[1.4rem] border p-6 sm:p-7 ${
        websitePackage.recommended
          ? "border-[color:var(--brand-red)]/48 bg-[radial-gradient(circle_at_86%_8%,rgba(240,0,28,0.2),transparent_36%),linear-gradient(145deg,rgba(30,12,15,0.96),rgba(12,9,11,0.95))] shadow-[0_26px_90px_rgba(240,0,28,0.13)]"
          : websitePackage.id === "custom"
            ? "border-dashed border-white/20 bg-white/[0.025]"
            : "border-white/12 bg-[rgba(14,12,14,0.76)]"
      }`}
    >
      {websitePackage.recommended ? (
        <Badge tone="red" className="mb-5 self-start uppercase tracking-[0.12em]">
          Most popular
        </Badge>
      ) : null}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="text-2xl font-semibold text-white">{websitePackage.name}</h3>
          <p className="mt-2 text-sm text-white/48">{websitePackage.priceNote}</p>
        </div>
        <span
          className={`font-semibold tracking-[-0.045em] text-white ${
            websitePackage.recommended ? "text-4xl sm:text-5xl" : "text-3xl"
          }`}
        >
          {websitePackage.price}
        </span>
      </div>
      <p className="mt-6 text-base leading-7 text-white/64">
        {websitePackage.summary}
      </p>
      <p className="mt-3 text-sm leading-6 text-[#e1b7b9]">
        {websitePackage.bestFor}
      </p>
      <ul
        className={`mt-7 grid gap-3 ${
          websitePackage.recommended ? "sm:grid-cols-2" : ""
        }`}
      >
        {websitePackage.features.map((feature) => (
          <li key={feature} className="flex items-start gap-3 text-sm leading-6 text-white/66">
            <Check
              aria-hidden
              className="mt-1 size-4 shrink-0 text-[#ff7b88]"
              strokeWidth={2.2}
            />
            <span>{feature}</span>
          </li>
        ))}
      </ul>
      <TrackedLink
        href={getWebsiteProjectHref({ packageId: websitePackage.id })}
        eventName="website_package_click"
        eventProperties={{
          package_id: websitePackage.id,
          source_page: "/services/web-development",
        }}
        className={buttonStyles({
          variant: websitePackage.recommended ? "primary" : "secondary",
          className: "mt-8 w-full sm:w-auto sm:self-start",
        })}
      >
        Discuss {websitePackage.name}
        <ArrowRight aria-hidden className="size-4" />
      </TrackedLink>
    </article>
  );
}

export default function WebDevelopmentPage() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "Website design and development",
    serviceType: "Website design and development",
    description: pageDescription,
    url: `${siteConfig.url}/services/web-development`,
    provider: {
      "@type": "Organization",
      "@id": `${siteConfig.url}/#organization`,
      name: siteConfig.name,
      url: siteConfig.url,
      email: websiteProjectEmail,
    },
    audience: {
      "@type": "Audience",
      audienceType: "Businesses, products, creators, and organizations",
    },
    serviceOutput: "A responsive website and approved project deliverables",
    offers: websitePackages.map((websitePackage) => ({
      "@type": "Offer",
      name: websitePackage.name,
      priceCurrency: "USD",
      price: websitePackage.price.replace(/[^0-9]/g, ""),
      description: `${websitePackage.summary} ${websitePackage.priceNote}`,
      url: `${siteConfig.url}${getWebsiteProjectHref({ packageId: websitePackage.id })}`,
    })),
  };

  return (
    <>
      <StructuredData data={structuredData} />

      <section className="relative overflow-hidden border-b border-white/10">
        <div className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,#f0001c_42%,#f7f0dd_74%,transparent)]" />
        <div className="absolute left-[-12rem] top-[-10rem] size-[32rem] rounded-full bg-[color:var(--brand-red)]/12 blur-3xl" />
        <Container className="relative grid min-h-[calc(100vh-4.5rem)] items-center gap-10 py-16 sm:py-20 lg:grid-cols-[0.93fr_1.07fr] lg:py-24">
          <Reveal>
            <div className="max-w-3xl">
              <Badge tone="red" className="uppercase tracking-[0.16em]">
                Rukh Labs Website Studio
              </Badge>
              <h1 className="mt-7 text-5xl font-semibold leading-[1.01] tracking-[-0.045em] text-white sm:text-7xl">
                Websites designed to look{" "}
                <span className="text-[#ff6d7b]">intentional.</span>
              </h1>
              <p className="mt-7 max-w-2xl text-lg leading-8 text-white/68 sm:text-xl">
                Distinctive website design and development for businesses,
                products, creators, and organizations. Start with a proven visual
                direction or commission something original—without agency-sized
                overhead.
              </p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Link href={websiteProjectHref} className={buttonStyles({ size: "lg" })}>
                  Start a Project
                  <ArrowRight aria-hidden className="size-4" />
                </Link>
                <Link
                  href="#designs"
                  className={buttonStyles({ variant: "secondary", size: "lg" })}
                >
                  Explore Designs
                </Link>
              </div>
              <div className="mt-9 flex flex-wrap gap-x-6 gap-y-2 text-xs font-semibold uppercase tracking-[0.14em] text-white/42">
                <span>Design</span>
                <span>Development</span>
                <span>Launch support</span>
              </div>
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <WebsiteHeroVisual />
          </Reveal>
        </Container>
      </section>

      <Section id="designs" className="scroll-mt-24">
        <Container>
          <Reveal>
            <div className="grid gap-6 lg:grid-cols-[0.86fr_1.14fr] lg:items-end">
              <div>
                <Badge tone="ivory">Design directions</Badge>
                <h2 className="mt-5 text-3xl font-semibold text-white sm:text-5xl">
                  Choose a direction. Make it yours.
                </h2>
              </div>
              <p className="max-w-2xl text-lg leading-8 text-white/62 lg:justify-self-end">
                These are visual starting systems, not rigid templates. Every
                project is shaped around the client&apos;s content, goals, brand,
                and audience. Open any direction to explore a complete working
                sample site.
              </p>
            </div>
          </Reveal>

          <FictionalDemoDisclosure className="mt-8" />

          <div className="mt-12 grid gap-6 lg:grid-cols-2">
            {designDirections.map((direction, index) => (
              <Reveal key={direction.slug} delay={(index % 2) * 0.06}>
                <article
                  className={`group h-full overflow-hidden rounded-[1.4rem] border bg-white/[0.025] p-3 transition duration-300 hover:-translate-y-1 hover:bg-white/[0.04] ${directionAccents[direction.slug]}`}
                >
                  <DesignPreview slug={direction.slug} size="card" />
                  <div className="p-4 sm:p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-2xl font-semibold text-white">
                          {direction.name}
                        </h3>
                        <p className="mt-3 max-w-2xl text-sm leading-6 text-white/60">
                          {direction.summary}
                        </p>
                      </div>
                      <span className="hidden size-10 shrink-0 place-items-center rounded-full border border-white/12 text-white/44 transition group-hover:border-[color:var(--brand-red)]/36 group-hover:text-[#ff8b96] sm:grid">
                        <ArrowRight aria-hidden className="size-4" />
                      </span>
                    </div>
                    <ul className="mt-5 flex flex-wrap gap-2" aria-label={`Best uses for ${direction.name}`}>
                      {direction.bestFor.map((useCase) => (
                        <li
                          key={useCase}
                          className="rounded-full border border-white/10 bg-black/16 px-2.5 py-1 text-[11px] font-medium text-white/48"
                        >
                          {useCase}
                        </li>
                      ))}
                    </ul>
                    <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center">
                      <TrackedLink
                        href={direction.sampleHref}
                        eventName="sample_site_open"
                        eventProperties={{
                          design_direction: direction.slug,
                          source_page: "/services/web-development",
                        }}
                        className={buttonStyles({
                          variant: "secondary",
                          size: "sm",
                        })}
                      >
                        Open full sample
                        <ArrowRight aria-hidden className="size-4" />
                      </TrackedLink>
                      <Link
                        href={direction.href}
                        className={buttonStyles({
                          variant: "ghost",
                          size: "sm",
                        })}
                      >
                        Direction details
                      </Link>
                    </div>
                  </div>
                </article>
              </Reveal>
            ))}
          </div>
        </Container>
      </Section>

      <Section
        id="packages"
        className="scroll-mt-24 border-y border-white/10 bg-white/[0.02]"
      >
        <Container>
          <Reveal>
            <div className="max-w-4xl">
              <Badge tone="red">Website packages</Badge>
              <h2 className="mt-5 text-3xl font-semibold text-white sm:text-5xl">
                A clear starting scope. No mystery proposal.
              </h2>
              <p className="mt-6 max-w-3xl text-lg leading-8 text-white/62">
                Choose the package closest to the project. Final estimates reflect
                confirmed content, functionality, integrations, and migration needs.
              </p>
            </div>
          </Reveal>
          <div className="mt-12 grid gap-5 lg:grid-cols-12">
            {websitePackages.map((websitePackage) => (
              <PackageCard key={websitePackage.id} websitePackage={websitePackage} />
            ))}
          </div>
        </Container>
      </Section>

      <Section>
        <Container className="grid gap-10 lg:grid-cols-[0.72fr_1.28fr]">
          <Reveal>
            <div>
              <Badge tone="gold">Optional services</Badge>
              <h2 className="mt-5 text-3xl font-semibold text-white sm:text-5xl">
                Add what the project actually needs.
              </h2>
              <p className="mt-6 text-base leading-7 text-white/58">
                A restrained set of practical additions—scoped cleanly, without
                turning the project into a wall of line items.
              </p>
            </div>
          </Reveal>
          <Reveal delay={0.08}>
            <Card className="divide-y divide-white/10">
              {websiteAddOns.map((addOn) => (
                <div
                  key={addOn.name}
                  className="grid gap-2 p-5 sm:grid-cols-[1fr_auto] sm:gap-x-8 sm:p-6"
                >
                  <div>
                    <h3 className="font-semibold text-white">{addOn.name}</h3>
                    <p className="mt-2 text-sm leading-6 text-white/52">{addOn.note}</p>
                  </div>
                  <span className="text-sm font-semibold text-[#e6bd73] sm:text-right">
                    {addOn.price}
                  </span>
                </div>
              ))}
              <p className="p-5 text-xs leading-5 text-white/42 sm:p-6">
                Third-party platform, domain, hosting, payment-processing, and
                subscription costs are billed separately by their providers.
              </p>
            </Card>
          </Reveal>
        </Container>
      </Section>

      <Section className="border-y border-[color:var(--brand-red)]/14 bg-[color:var(--brand-red)]/[0.025]">
        <Container>
          <Reveal>
            <div className="max-w-3xl">
              <Badge tone="red">Process</Badge>
              <h2 className="mt-5 text-3xl font-semibold text-white sm:text-5xl">
                Straightforward from direction to launch.
              </h2>
            </div>
          </Reveal>
          <ol className="mt-12 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {websiteProcess.map((step, index) => (
              <Reveal key={step.number} delay={index * 0.05}>
                <li className="relative h-full rounded-xl border border-white/10 bg-[#0b090b]/72 p-5">
                  <span className="font-mono text-xs font-semibold tracking-[0.16em] text-[#ff7c89]">
                    {step.number}
                  </span>
                  <h3 className="mt-6 text-lg font-semibold text-white">{step.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-white/56">{step.description}</p>
                </li>
              </Reveal>
            ))}
          </ol>
        </Container>
      </Section>

      <Section>
        <Container>
          <Reveal>
            <div className="max-w-3xl">
              <Badge tone="ivory">What clients receive</Badge>
              <h2 className="mt-5 text-3xl font-semibold text-white sm:text-5xl">
                A polished site with a solid foundation.
              </h2>
            </div>
          </Reveal>
          <div className="mt-11 grid gap-x-8 gap-y-9 sm:grid-cols-2 lg:grid-cols-4">
            {websiteDeliverables.map((deliverable, index) => {
              const Icon = deliverableIcons[index];

              return (
                <Reveal key={deliverable.title} delay={(index % 4) * 0.04}>
                  <div>
                    <span className="grid size-10 place-items-center rounded-lg border border-[color:var(--brand-red)]/24 bg-[color:var(--brand-red)]/9 text-[#ff929c]">
                      <Icon aria-hidden className="size-4" />
                    </span>
                    <h3 className="mt-5 font-semibold text-white">{deliverable.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-white/52">
                      {deliverable.description}
                    </p>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </Container>
      </Section>

      <CareerPortfolioTeaser />

      <Section className="border-y border-white/10 bg-white/[0.018]">
        <Container>
          <Reveal>
            <div className="max-w-3xl">
              <Badge tone="blue">Website planning resources</Badge>
              <h2 className="mt-5 text-3xl font-semibold text-white sm:text-5xl">
                Plan the scope before the build starts.
              </h2>
              <p className="mt-5 text-lg leading-8 text-white/62">
                Explore focused website pages, a practical cost guide, and a browser-based project brief generator before choosing a direction.
              </p>
            </div>
          </Reveal>
          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[
              ["Small-business website design", "/services/web-development/small-business", "Clarify services, mobile actions, and practical ownership."],
              ["Professional-services website design", "/services/web-development/professional-services", "Explain complex work for decision-makers."],
              ["Small-business website cost guide", "/insights/small-business-website-cost-guide", "Compare scope before comparing proposals."],
              ["Create a website project brief", "/tools/website-project-brief", "Turn planning inputs into a shareable brief."],
            ].map(([title, href, copy]) => <Card key={href} className="h-full p-5"><h3 className="font-semibold text-white">{title}</h3><p className="mt-3 text-sm leading-6 text-white/56">{copy}</p><Link href={href} className="mt-5 inline-flex text-sm font-semibold text-[#ff9aa4] underline-offset-4 hover:underline">{title}</Link></Card>)}
          </div>
        </Container>
      </Section>

      <Section className="border-y border-white/10 bg-white/[0.02]">
        <Container className="grid gap-10 lg:grid-cols-[0.7fr_1.3fr]">
          <Reveal>
            <div>
              <Badge tone="gold">FAQ</Badge>
              <h2 className="mt-5 text-3xl font-semibold text-white sm:text-5xl">
                Website design questions, answered.
              </h2>
            </div>
          </Reveal>
          <div className="grid gap-3">
            {websiteFaqs.map((faq, index) => (
              <Reveal key={faq.question} delay={(index % 4) * 0.025}>
                <details className="group rounded-xl border border-white/10 bg-[#0b090b]/80 open:border-[color:var(--brand-red)]/30">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-5 rounded-xl p-5 text-left font-semibold text-white transition hover:bg-white/[0.025] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--brand-red)] [&::-webkit-details-marker]:hidden">
                    {faq.question}
                    <ChevronDown
                      aria-hidden
                      className="size-4 shrink-0 text-white/42 transition group-open:rotate-180 group-open:text-[#ff8e99]"
                    />
                  </summary>
                  <p className="px-5 pb-5 text-sm leading-7 text-white/58">{faq.answer}</p>
                </details>
              </Reveal>
            ))}
          </div>
        </Container>
      </Section>

      <Section>
        <Container>
          <Reveal>
            <div className="relative overflow-hidden rounded-[1.6rem] border border-[color:var(--brand-red)]/32 bg-[radial-gradient(circle_at_86%_20%,rgba(240,0,28,0.24),transparent_34%),linear-gradient(135deg,rgba(34,11,15,0.94),rgba(10,8,10,0.96))] p-6 shadow-[0_30px_100px_rgba(0,0,0,0.42)] sm:p-8 lg:p-11">
              <Sparkles
                aria-hidden
                className="absolute right-7 top-7 size-7 text-[#ff7582]/40"
              />
              <div className="max-w-4xl">
                <Badge tone="red">Start a project</Badge>
                <h2 className="mt-6 text-3xl font-semibold leading-tight text-white sm:text-5xl">
                  Let&apos;s build something that looks like it belongs to you.
                </h2>
                <p className="mt-5 max-w-2xl text-lg leading-8 text-white/62">
                  Tell Rukh Labs what you are building, who it needs to reach,
                  and what the website needs to do.
                </p>
                <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                  <Link href={websiteProjectHref} className={buttonStyles({ size: "lg" })}>
                    Start a Project
                    <ArrowRight aria-hidden className="size-4" />
                  </Link>
                  <TrackedAnchor
                    href={`mailto:${websiteProjectEmail}`}
                    eventName="email_click"
                    eventProperties={{ source_page: "/services/web-development" }}
                    className={buttonStyles({ variant: "secondary", size: "lg" })}
                  >
                    <Mail aria-hidden className="size-4" />
                    Email Rukh Labs
                  </TrackedAnchor>
                  <Link
                    href="/about"
                    className={buttonStyles({ variant: "ghost", size: "lg" })}
                  >
                    About Rukh Labs
                  </Link>
                </div>
              </div>
            </div>
          </Reveal>
        </Container>
      </Section>
    </>
  );
}
