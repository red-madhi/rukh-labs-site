import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { RukhMark } from "@/components/brand/rukh-mark";
import { StructuredData } from "@/components/seo/structured-data";
import { Badge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/ui/reveal";
import { Section } from "@/components/ui/section";
import { ChessMockup } from "@/components/visuals/chess-mockup";
import { createPageMetadata, siteConfig } from "@/lib/site-config";

export const metadata: Metadata = createPageMetadata({
  title: "Custom Websites, Data Tools & Software",
  description:
    "Rukh Labs builds custom websites, automates recurring reports and data work, creates career portfolios, and develops useful software.",
});

const serviceLanes = [
  {
    number: "01",
    eyebrow: "Main service",
    title: "Custom websites",
    description:
      "Fast, custom websites for small businesses, creators, and independent teams that need to look professional and stand out from competitors.",
    detail: "Planning, design, development, career portfolios, launch, and practical support.",
    href: "/services/web-development",
    cta: "See website services",
  },
  {
    number: "02",
    eyebrow: "Reports and data tools",
    title: "Data operations",
    description:
      "We automate recurring spreadsheet, reporting, and data-migration work so teams spend less time copying, checking, and fixing data by hand.",
    detail: "Power BI, Power Query, data checks, error reports, monitoring, and documentation.",
    href: "/data-ops",
    cta: "See data services",
  },
  {
    number: "03",
    eyebrow: "Software by Rukh Labs",
    title: "Original software",
    description:
      "Apps and tools built by Rukh Labs to solve specific problems without unnecessary clutter or confusing settings.",
    detail: "Farzin, Glass Squares OS, IAZMA, and other projects in development.",
    href: "/products",
    cta: "See our software",
  },
] as const;

const principles = [
  {
    number: "01",
    title: "Clean by default",
    description: "Easy to start, easy to understand, and never designed to work against you.",
  },
  {
    number: "02",
    title: "Private where it matters",
    description: "We collect as little data as possible and explain what happens to it.",
  },
  {
    number: "03",
    title: "Fast enough to feel different",
    description: "Pages and tools should load quickly and respond without making you wait.",
  },
  {
    number: "04",
    title: "Good design matters",
    description: "Useful tools should also be pleasant to look at and easy to use.",
  },
] as const;

const additionalWork = [
  {
    title: "Glass Squares OS",
    status: "In development",
    description: "A lightweight Linux desktop with a glass-style look, square layouts, broad compatibility, and more user control.",
    href: "/products/glass-squares-os",
  },
  {
    title: "IAZMA",
    status: "Free web app",
    description: "A Bluesky tool that helps you find useful accounts through shared connections and network reach.",
    href: "/tools/bluesky-network",
  },
  {
    title: "RukhLabs.com",
    status: "Live website",
    description: "The site you’re using now—designed, built, and maintained by Rukh Labs.",
    href: "/work/rukh-labs-website",
  },
] as const;

function PortfolioPreview() {
  return (
    <div className="overflow-hidden rounded-[1.6rem] border border-[#16c8ff]/20 bg-[#07101b] shadow-[0_30px_120px_rgba(0,0,0,0.48)]">
      <div className="flex items-center gap-2 border-b border-white/10 bg-black/25 px-4 py-3 sm:px-5">
        <span className="size-2.5 rounded-full bg-white/18" />
        <span className="size-2.5 rounded-full bg-white/12" />
        <span className="size-2.5 rounded-full bg-white/8" />
        <span className="ml-3 truncate text-[0.68rem] font-medium uppercase tracking-[0.14em] text-white/28">
          Fictional career portfolio · live example
        </span>
      </div>

      <div className="border-b border-white/10 px-5 py-4 sm:px-7">
        <div className="flex gap-5 overflow-hidden text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-white/32">
          <span className="text-[#8aeaff]">Overview</span>
          <span>Work</span>
          <span>Live dashboard</span>
          <span>About</span>
          <span>Résumé</span>
        </div>
      </div>

      <div className="grid gap-8 px-5 py-8 sm:px-8 sm:py-10 lg:grid-cols-[1.08fr_0.92fr] lg:items-center lg:px-10 lg:py-12">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8aeaff]">
            Fictional career portfolio
          </p>
          <h3 className="mt-5 max-w-2xl text-4xl font-semibold leading-[1.03] text-white sm:text-5xl">
            I make complex work easier to run.
          </h3>
          <p className="mt-5 max-w-xl text-sm leading-7 text-white/54 sm:text-base">
            A complete example with case studies, a résumé, and a working dashboard—without using a real person&apos;s private information.
          </p>
          <div className="mt-7 inline-flex items-center gap-2 text-sm font-semibold text-white">
            Explore the example
            <ArrowRight aria-hidden className="size-4 text-[#8aeaff]" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {[
            ["3", "fictional case studies"],
            ["1", "working dashboard"],
            ["5", "portfolio sections"],
            ["0", "personal files or data"],
          ].map(([value, label]) => (
            <div key={label} className="border-l border-[#67e8f9]/24 py-3 pl-4 sm:py-4 sm:pl-5">
              <strong className="block text-3xl font-semibold tracking-[-0.05em] text-white sm:text-4xl">
                {value}
              </strong>
              <span className="mt-2 block text-xs leading-5 text-white/38">{label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-4 border-t border-white/10 bg-white/[0.018] px-5 py-5 text-xs leading-5 text-white/42 sm:grid-cols-3 sm:px-8 lg:px-10">
        <span><strong className="text-white/72">01</strong> Define the problem</span>
        <span><strong className="text-white/72">02</strong> Build the solution</span>
        <span><strong className="text-white/72">03</strong> Show the result</span>
      </div>
    </div>
  );
}

export default function Home() {
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${siteConfig.url}/#organization`,
        name: siteConfig.name,
        url: siteConfig.url,
        logo: {
          "@type": "ImageObject",
          url: `${siteConfig.url}/brand/rukh-labs-primary.png`,
        },
        email: siteConfig.contactEmail,
        description: "An independent website, data, and software studio.",
        contactPoint: {
          "@type": "ContactPoint",
          contactType: "customer support",
          email: siteConfig.contactEmail,
          availableLanguage: ["English"],
        },
        sameAs: [siteConfig.links.patreon],
        hasOfferCatalog: {
          "@type": "OfferCatalog",
          name: "Rukh Labs services and software",
          itemListElement: [
            {
              "@type": "Offer",
              itemOffered: {
                "@type": "Service",
                name: "Website design and development",
                url: `${siteConfig.url}/services/web-development`,
              },
            },
            {
              "@type": "Offer",
              itemOffered: {
                "@type": "Service",
                name: "Reporting and data automation",
                url: `${siteConfig.url}/data-ops`,
              },
            },
            {
              "@type": "Offer",
              itemOffered: {
                "@type": "Service",
                name: "Career portfolio website design",
                url: `${siteConfig.url}/services/career-portfolios`,
              },
            },
            {
              "@type": "Offer",
              itemOffered: {
                "@type": "SoftwareApplication",
                name: "Farzin",
                url: `${siteConfig.url}/products/farzin`,
              },
            },
            {
              "@type": "Offer",
              itemOffered: {
                "@type": "SoftwareApplication",
                name: "Glass Squares OS",
                url: `${siteConfig.url}/products/glass-squares-os`,
              },
            },
          ],
        },
      },
      {
        "@type": "WebSite",
        "@id": `${siteConfig.url}/#website`,
        name: siteConfig.name,
        url: siteConfig.url,
        publisher: { "@id": `${siteConfig.url}/#organization` },
        inLanguage: "en-US",
      },
    ],
  };

  return (
    <>
      <StructuredData data={structuredData} />

      <section className="relative overflow-hidden border-b border-white/10">
        <div className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,#f0001c_40%,#16c8ff_72%,transparent)]" />
        <div className="absolute -right-48 top-1/2 hidden -translate-y-1/2 opacity-[0.12] lg:block">
          <RukhMark size="hero" glow container={false} decorative />
        </div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_82%_42%,rgba(240,0,28,0.11),transparent_27%),radial-gradient(circle_at_68%_70%,rgba(22,200,255,0.08),transparent_29%)]" />

        <Container className="relative flex flex-col justify-between py-10 sm:py-20 lg:min-h-[calc(100svh-4.5rem)] lg:py-24">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1.18fr)_minmax(17rem,0.48fr)] lg:items-end lg:gap-14">
            <Reveal>
              <div className="max-w-5xl">
                <Badge tone="red" className="whitespace-nowrap text-[0.6rem] leading-4 tracking-[0.12em] sm:text-xs sm:tracking-[0.18em]">
                  Independent website, data & software studio
                </Badge>
                <h1 className="mt-7 text-[2rem] font-semibold leading-[1.02] tracking-[-0.055em] text-white min-[360px]:text-[2.15rem] min-[390px]:text-[2.35rem] sm:mt-8 sm:text-7xl sm:tracking-[-0.04em] lg:text-[5.8rem] 2xl:text-[6.8rem]">
                  <span className="block sm:inline">Websites, custom.</span>{" "}
                  <span className="block sm:inline">Data work, automated.</span>{" "}
                  <span className="block bg-[linear-gradient(105deg,#ffffff_5%,#ff596b_42%,#36d4ff_78%,#9a6dff)] bg-clip-text text-transparent sm:inline">
                    Software, purposeful.
                  </span>
                </h1>
                <p className="mt-6 max-w-3xl text-base leading-7 text-white/66 sm:mt-8 sm:text-xl sm:leading-9">
                  Rukh Labs builds custom websites, automated reports, and purposeful software for small businesses, professionals, and teams. Everything is made to be clear, fast, and easy to use.
                </p>
                <div className="mt-8 flex flex-col gap-3 sm:mt-10 sm:flex-row">
                  <Link href="/contact" className={buttonStyles({ size: "lg" })}>
                    Start a project
                    <ArrowRight aria-hidden className="size-4" />
                  </Link>
                  <Link href="#selected-work" className={buttonStyles({ variant: "secondary", size: "lg" })}>
                    See examples
                  </Link>
                </div>
              </div>
            </Reveal>

            <Reveal delay={0.12}>
              <div className="relative border-l border-white/14 pl-6 lg:mb-3 lg:pl-8">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#ff8f9a]">
                  Main service
                </p>
                <p className="mt-4 text-3xl font-semibold leading-tight text-white sm:text-4xl">
                  Custom websites.
                </p>
                <p className="mt-4 max-w-sm text-sm leading-7 text-white/52">
                  Built around your business, not copied from a generic template.
                </p>
                <Link
                  href="/services/web-development"
                  className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-white transition hover:text-[#ff8f9a]"
                >
                  See website services
                  <ArrowRight aria-hidden className="size-4" />
                </Link>
              </div>
            </Reveal>
          </div>

          <Reveal delay={0.18}>
            <div className="mt-14 grid gap-4 border-t border-white/10 pt-6 text-xs font-semibold uppercase tracking-[0.14em] text-white/38 sm:mt-20 sm:grid-cols-3 lg:mt-24">
              <span><strong className="mr-3 text-white/72">01</strong> Custom websites</span>
              <span><strong className="mr-3 text-white/72">02</strong> Reports and data tools</span>
              <span><strong className="mr-3 text-white/72">03</strong> Software we build</span>
            </div>
          </Reveal>
        </Container>
      </section>

      <Section id="services" className="py-16 sm:py-20">
        <Container>
          <Reveal>
            <div className="grid gap-8 lg:grid-cols-[0.62fr_1.38fr] lg:items-end">
              <div aria-hidden="true" />
              <div>
                <h2 className="max-w-4xl text-4xl font-semibold leading-[1.03] text-white sm:text-6xl">
                  What we do.
                </h2>
                <p className="mt-5 max-w-2xl text-lg leading-8 text-white/58">
                  We build custom websites, automate repetitive reporting and data work, and create our own software.
                </p>
              </div>
            </div>
          </Reveal>

          <div className="mt-14 border-y border-white/10">
            {serviceLanes.map((service, index) => (
              <Reveal key={service.title} delay={index * 0.05}>
                <Link
                  href={service.href}
                  className={`group grid gap-6 py-9 transition sm:py-11 lg:grid-cols-[0.25fr_0.75fr_1.1fr_0.55fr] lg:items-start ${
                    index < serviceLanes.length - 1 ? "border-b border-white/10" : ""
                  } ${
                    index === 0
                      ? "bg-[linear-gradient(90deg,rgba(240,0,28,0.07),transparent_64%)]"
                      : "hover:bg-white/[0.018]"
                  }`}
                >
                  <span className="text-xs font-semibold tracking-[0.16em] text-white/32">{service.number}</span>
                  <div>
                    <p className={`text-[0.68rem] font-semibold uppercase tracking-[0.15em] ${index === 0 ? "text-[#ff8f9a]" : "text-white/34"}`}>
                      {service.eyebrow}
                    </p>
                    <h3 className="mt-3 text-3xl font-semibold text-white sm:text-4xl">{service.title}</h3>
                  </div>
                  <div>
                    <p className="max-w-2xl text-base leading-7 text-white/58">{service.description}</p>
                    <p className="mt-3 text-sm leading-6 text-white/34">{service.detail}</p>
                  </div>
                  <span className="inline-flex items-center gap-2 text-sm font-semibold text-white transition group-hover:text-[#ff8f9a] lg:justify-self-end">
                    {service.cta}
                    <ArrowRight aria-hidden className="size-4 transition-transform group-hover:translate-x-1" />
                  </span>
                </Link>
              </Reveal>
            ))}
          </div>
        </Container>
      </Section>

      <Section id="selected-work" className="border-y border-white/10 bg-white/[0.018]">
        <Container>
          <Reveal>
            <div className="grid gap-8 lg:grid-cols-[0.72fr_1.28fr] lg:items-end">
              <div>
                <Badge tone="gold">Real examples</Badge>
              </div>
              <div>
                <h2 className="max-w-4xl text-4xl font-semibold leading-[1.03] text-white sm:text-6xl">
                  See the work.
                </h2>
                <p className="mt-5 max-w-2xl text-lg leading-8 text-white/58">
                  Explore a live portfolio, a released Android app, and other Rukh Labs projects.
                </p>
              </div>
            </div>
          </Reveal>

          <div className="mt-16 grid gap-10 lg:grid-cols-[1.35fr_0.65fr] lg:items-center">
            <Reveal>
              <PortfolioPreview />
            </Reveal>
            <Reveal delay={0.1}>
              <div className="lg:pl-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8aeaff]">
                  Live portfolio example
                </p>
                <h3 className="mt-5 text-3xl font-semibold leading-tight text-white sm:text-4xl">
                  A portfolio you can actually explore.
                </h3>
                <p className="mt-5 text-base leading-8 text-white/56">
                  This fictional example includes case studies, a résumé, and a working dashboard. It shows exactly what a client can receive without using anyone&apos;s private information.
                </p>
                <Link
                  href="/services/career-portfolios/demo"
                  className={buttonStyles({ variant: "secondary", className: "mt-7" })}
                >
                  Open the live example
                  <ArrowRight aria-hidden className="size-4" />
                </Link>
              </div>
            </Reveal>
          </div>

          <div className="mt-24 grid gap-10 border-t border-white/10 pt-16 lg:grid-cols-[0.62fr_1.38fr] lg:items-center">
            <Reveal>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#f3d99d]">
                  Available on Google Play
                </p>
                <h3 className="mt-5 text-3xl font-semibold leading-tight text-white sm:text-5xl">
                  Farzin makes chess study easier to organize.
                </h3>
                <p className="mt-5 text-base leading-8 text-white/56">
                  An Android app for reviewing games, studying openings, practicing tactics, using chess-engine analysis, and tracking progress.
                </p>
                <div className="mt-7 flex flex-wrap items-center gap-4">
                  <Link href="/products/farzin" className={buttonStyles({ variant: "secondary" })}>
                    View Farzin
                    <ArrowRight aria-hidden className="size-4" />
                  </Link>
                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-white/34">
                    Google Play · v1.0.0
                  </span>
                </div>
              </div>
            </Reveal>
            <Reveal delay={0.1}>
              <ChessMockup />
            </Reveal>
          </div>

          <div className="mt-20 border-t border-white/10 pt-10">
            <Reveal>
              <div className="grid gap-6 lg:grid-cols-[0.55fr_1.45fr]">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/38">
                    More projects
                  </p>
                </div>
                <div className="border-t border-white/10">
                  {additionalWork.map((item) => (
                    <Link
                      key={item.title}
                      href={item.href}
                      className="group grid gap-3 border-b border-white/10 py-6 transition hover:pl-2 sm:grid-cols-[0.7fr_1.2fr_auto] sm:items-center"
                    >
                      <div>
                        <h3 className="text-lg font-semibold text-white">{item.title}</h3>
                        <p className="mt-1 text-[0.68rem] font-semibold uppercase tracking-[0.13em] text-white/30">
                          {item.status}
                        </p>
                      </div>
                      <p className="text-sm leading-6 text-white/48">{item.description}</p>
                      <ArrowRight aria-hidden className="size-4 text-white/42 transition group-hover:translate-x-1 group-hover:text-white" />
                    </Link>
                  ))}
                </div>
              </div>
            </Reveal>
          </div>
        </Container>
      </Section>

      <Section className="overflow-hidden">
        <div className="absolute -left-44 top-12 hidden opacity-[0.06] lg:block">
          <RukhMark size="hero" container={false} decorative />
        </div>
        <Container className="relative grid gap-16 lg:grid-cols-[0.9fr_1.1fr]">
          <Reveal>
            <div className="lg:sticky lg:top-28 lg:self-start">
              <Badge tone="red">Why Rukh</Badge>
              <h2 className="mt-6 max-w-2xl text-4xl font-semibold leading-[1.03] text-white sm:text-6xl">
                The standard is simple: respect the user.
              </h2>
              <p className="mt-6 max-w-xl text-lg leading-8 text-white/56">
                Make it useful first. Make it easy to understand. Show the work instead of making empty promises.
              </p>
            </div>
          </Reveal>

          <div className="border-t border-white/10">
            {principles.map((principle, index) => (
              <Reveal key={principle.title} delay={index * 0.05}>
                <div className="grid gap-5 border-b border-white/10 py-9 sm:grid-cols-[0.2fr_0.8fr_1fr] sm:py-11">
                  <span className="text-xs font-semibold tracking-[0.15em] text-white/30">{principle.number}</span>
                  <h3 className="text-2xl font-semibold text-white sm:text-3xl">{principle.title}</h3>
                  <p className="text-sm leading-7 text-white/50 sm:text-base">{principle.description}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </Container>
      </Section>

      <Section className="border-t border-white/10 bg-[linear-gradient(135deg,rgba(240,0,28,0.10),rgba(214,173,91,0.07)_48%,rgba(22,200,255,0.07))]">
        <Container>
          <Reveal>
            <div className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#ff8f9a]">
                  Start a project
                </p>
                <h2 className="mt-6 max-w-4xl text-5xl font-semibold leading-[0.98] text-white sm:text-7xl">
                  Have something worth building?
                </h2>
              </div>
              <div>
                <p className="max-w-xl text-lg leading-8 text-white/58">
                  Tell us what you need. Rukh Labs will help plan the right website, data tool, or next step without vague sales talk or wasted time.
                </p>
                <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                  <Link href="/contact" className={buttonStyles({ size: "lg" })}>
                    Start the conversation
                    <ArrowRight aria-hidden className="size-4" />
                  </Link>
                  <Link href="/services/web-development" className={buttonStyles({ variant: "secondary", size: "lg" })}>
                    Website services
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
