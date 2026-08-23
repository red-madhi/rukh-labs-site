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
  title: "Custom Websites, Data Operations & Software",
  description:
    "Rukh Labs designs distinctive websites, automates recurring reporting and data workflows, builds recruiter-ready career portfolios, and ships focused software.",
});

const serviceLanes = [
  {
    number: "01",
    eyebrow: "Primary studio service",
    title: "Custom websites",
    description:
      "Distinctive, fast websites for small businesses, creators, and independent teams that need to look credible without looking interchangeable.",
    detail: "Strategy, design, development, career portfolios, launch, and practical support.",
    href: "/services/web-development",
    cta: "Explore website services",
  },
  {
    number: "02",
    eyebrow: "Systems and automation",
    title: "Data operations",
    description:
      "Automation and control for recurring spreadsheet, reporting, reconciliation, and data-migration work—built to reduce manual handling without hiding the evidence.",
    detail: "Power BI, Power Query, validation, exception handling, monitoring, and handoff.",
    href: "/data-ops",
    cta: "Explore data operations",
  },
  {
    number: "03",
    eyebrow: "The product lab",
    title: "Original software",
    description:
      "Focused first-party products built around clarity, user control, and the belief that useful software does not need to be ugly or bloated.",
    detail: "Farzin, Glass Squares OS, IAZMA, and active experiments.",
    href: "/products",
    cta: "Explore products",
  },
] as const;

const principles = [
  {
    number: "01",
    title: "Clean by default",
    description: "No noisy onboarding maze, mystery utilities, or hostile defaults.",
  },
  {
    number: "02",
    title: "Private where it matters",
    description: "Data decisions should be obvious, minimal, and respectful.",
  },
  {
    number: "03",
    title: "Fast enough to feel different",
    description: "Performance is a product feature, not a benchmark footnote.",
  },
  {
    number: "04",
    title: "Designed like beauty matters",
    description: "Power should not require visual punishment.",
  },
] as const;

const additionalWork = [
  {
    title: "Glass Squares OS",
    status: "In development",
    description: "A low-bloat Linux desktop built around glassy surfaces, square layouts, compatibility, and control.",
    href: "/products/glass-squares-os",
  },
  {
    title: "IAZMA",
    status: "Free web app",
    description: "Bluesky network discovery ranked by shared connections, overlap, and reach.",
    href: "/tools/bluesky-network",
  },
  {
    title: "Rukh Labs platform",
    status: "Public · active iteration",
    description: "The design system, technical architecture, privacy controls, and search foundation behind this site.",
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
          Fictional career portfolio · interactive demonstration
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
            Fictional operations portfolio
          </p>
          <h3 className="mt-5 max-w-2xl text-4xl font-semibold leading-[1.03] text-white sm:text-5xl">
            I make complex work easier to run.
          </h3>
          <p className="mt-5 max-w-xl text-sm leading-7 text-white/54 sm:text-base">
            A complete candidate story with case studies, a résumé view, and an interactive scenario dashboard—without exposing a real person or confidential work.
          </p>
          <div className="mt-7 inline-flex items-center gap-2 text-sm font-semibold text-white">
            Explore the work
            <ArrowRight aria-hidden className="size-4 text-[#8aeaff]" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {[
            ["3", "fictional case studies"],
            ["1", "interactive dashboard"],
            ["92", "problem-solving signal"],
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
        <span><strong className="text-white/72">01</strong> Frame the decision</span>
        <span><strong className="text-white/72">02</strong> Model the system</span>
        <span><strong className="text-white/72">03</strong> Make action visible</span>
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
        description: "An independent design and development studio and software lab.",
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
                name: "Data operations automation and reconciliation",
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

        <Container className="relative flex min-h-[calc(100svh-4.5rem)] flex-col justify-between py-16 sm:py-20 lg:py-24">
          <div className="grid gap-14 lg:grid-cols-[minmax(0,1.18fr)_minmax(17rem,0.48fr)] lg:items-end">
            <Reveal>
              <div className="max-w-5xl">
                <Badge tone="red" className="uppercase tracking-[0.18em]">
                  Independent design & development studio
                </Badge>
                <h1 className="mt-8 text-5xl font-semibold leading-[0.98] text-white sm:text-7xl lg:text-[5.8rem] 2xl:text-[6.8rem]">
                  Digital products that actually{" "}
                  <span className="bg-[linear-gradient(105deg,#ffffff_5%,#ff596b_42%,#36d4ff_78%,#9a6dff)] bg-clip-text text-transparent">
                    feel designed.
                  </span>
                </h1>
                <p className="mt-8 max-w-3xl text-lg leading-8 text-white/66 sm:text-xl sm:leading-9">
                  Rukh Labs builds distinctive websites and dependable data workflows for businesses, professionals, and teams—plus focused software of its own. Clear purpose. Clean systems. No template aftertaste.
                </p>
                <div className="mt-10 flex flex-col gap-3 sm:flex-row">
                  <Link href="/contact" className={buttonStyles({ size: "lg" })}>
                    Start a project
                    <ArrowRight aria-hidden className="size-4" />
                  </Link>
                  <Link href="#selected-work" className={buttonStyles({ variant: "secondary", size: "lg" })}>
                    See selected work
                  </Link>
                </div>
              </div>
            </Reveal>

            <Reveal delay={0.12}>
              <div className="relative border-l border-white/14 pl-6 lg:mb-3 lg:pl-8">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#ff8f9a]">
                  Primary studio work
                </p>
                <p className="mt-4 text-3xl font-semibold leading-tight text-white sm:text-4xl">
                  Custom websites.
                </p>
                <p className="mt-4 max-w-sm text-sm leading-7 text-white/52">
                  Designed and built directly—not assembled from a theme and dressed up with adjectives.
                </p>
                <Link
                  href="/services/web-development"
                  className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-white transition hover:text-[#ff8f9a]"
                >
                  Explore the website studio
                  <ArrowRight aria-hidden className="size-4" />
                </Link>
              </div>
            </Reveal>
          </div>

          <Reveal delay={0.18}>
            <div className="mt-20 grid gap-4 border-t border-white/10 pt-6 text-xs font-semibold uppercase tracking-[0.14em] text-white/38 sm:grid-cols-3 lg:mt-24">
              <span><strong className="mr-3 text-white/72">01</strong> Custom websites</span>
              <span><strong className="mr-3 text-white/72">02</strong> Data operations</span>
              <span><strong className="mr-3 text-white/72">03</strong> First-party software</span>
            </div>
          </Reveal>
        </Container>
      </section>

      <Section id="services" className="py-16 sm:py-20">
        <Container>
          <Reveal>
            <div className="grid gap-8 lg:grid-cols-[0.62fr_1.38fr] lg:items-end">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/38">
                  What Rukh Labs does
                </p>
              </div>
              <div>
                <h2 className="max-w-4xl text-4xl font-semibold leading-[1.03] text-white sm:text-6xl">
                  One studio. Three clear lanes.
                </h2>
                <p className="mt-5 max-w-2xl text-lg leading-8 text-white/58">
                  Custom websites lead the studio. Data operations and first-party software extend what the lab can build.
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
                <Badge tone="gold">Selected proof</Badge>
              </div>
              <div>
                <h2 className="max-w-4xl text-4xl font-semibold leading-[1.03] text-white sm:text-6xl">
                  Don’t take the copy’s word for it.
                </h2>
                <p className="mt-5 max-w-2xl text-lg leading-8 text-white/58">
                  Real products and working demonstrations do more for credibility than a wall of feature cards.
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
                  Working service demonstration
                </p>
                <h3 className="mt-5 text-3xl font-semibold leading-tight text-white sm:text-4xl">
                  A portfolio you can actually explore.
                </h3>
                <p className="mt-5 text-base leading-8 text-white/56">
                  The career portfolio demonstration includes a complete fictional candidate story, case studies, a résumé view, and an operable scenario dashboard. It is clearly labeled, privacy-safe, and built to show the service rather than merely describe it.
                </p>
                <Link
                  href="/services/career-portfolios/demo"
                  className={buttonStyles({ variant: "secondary", className: "mt-7" })}
                >
                  Open the interactive demo
                  <ArrowRight aria-hidden className="size-4" />
                </Link>
              </div>
            </Reveal>
          </div>

          <div className="mt-24 grid gap-10 border-t border-white/10 pt-16 lg:grid-cols-[0.62fr_1.38fr] lg:items-center">
            <Reveal>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#f3d99d]">
                  Shipped first-party product
                </p>
                <h3 className="mt-5 text-3xl font-semibold leading-tight text-white sm:text-5xl">
                  Farzin turns chess study into a focused system.
                </h3>
                <p className="mt-5 text-base leading-8 text-white/56">
                  A released Android app for game review, opening preparation, tactical practice, engine-assisted analysis, and progress tracking—designed and shipped by Rukh Labs.
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
                    More from the lab
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
                Clear purpose before decoration. Useful defaults before feature theater. Proof before promises.
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
                  Bring the real problem. Rukh Labs will help shape the right site, data workflow, or next step without burying it under agency theater.
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
