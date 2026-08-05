import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  EyeOff,
  Gauge,
  Gem,
  LockKeyhole,
  MonitorCog,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import { BrandBanner } from "@/components/brand/brand-banner";
import { InsightCard } from "@/components/content/insight-card";
import { WorkCard } from "@/components/content/work-card";
import { TrackedAnchor } from "@/components/analytics/tracked-link";
import { RukhMark } from "@/components/brand/rukh-mark";
import { StructuredData } from "@/components/seo/structured-data";
import { ProductCard } from "@/components/sections/product-card";
import { WebsiteStudioTeaser } from "@/components/sections/website-studio-teaser";
import { CareerPortfolioTeaser } from "@/components/sections/career-portfolio-teaser";
import { Badge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/ui/reveal";
import { Section } from "@/components/ui/section";
import { ChessMockup } from "@/components/visuals/chess-mockup";
import { HeroVisual } from "@/components/visuals/hero-visual";
import { OSMockup } from "@/components/visuals/os-mockup";
import { labProduct, products } from "@/lib/products";
import { insights } from "@/lib/insights";
import { createPageMetadata, siteConfig } from "@/lib/site-config";
import { workProjects } from "@/lib/work";

export const metadata: Metadata = createPageMetadata({
  title: "Custom Websites, Career Portfolios & Software",
  description:
    "Rukh Labs creates distinctive websites, recruiter-ready career portfolios, and original software including Farzin and Glass Squares OS.",
});

const philosophy = [
  {
    title: "Clean by default",
    description: "No noisy onboarding maze, mystery utilities, or hostile defaults.",
    icon: Sparkles,
  },
  {
    title: "Private where it matters",
    description: "Data decisions should be obvious, minimal, and respectful.",
    icon: EyeOff,
  },
  {
    title: "Fast enough to feel different",
    description: "Performance is a product feature, not a benchmark footnote.",
    icon: Zap,
  },
  {
    title: "Designed like beauty matters",
    description: "Power should not require visual punishment.",
    icon: Gem,
  },
];

const osBullets = [
  "Glass-panel desktop shell",
  "Square-based layout system",
  "Low-bloat default apps",
  "Practical compatibility paths",
  "Clean visual system",
];

const farzinBullets = [
  "Game review",
  "Opening prep",
  "Tactical drills",
  "Engine-assisted analysis",
  "Progress tracking",
];

export default function Home() {
  const featuredWorkProjects = ["rukh-labs-website", "career-portfolio-demo"].map((slug) => {
    const project = workProjects.find((candidate) => candidate.slug === slug);
    if (!project) throw new Error(`Missing featured Work project: ${slug}`);
    return project;
  });
  const featuredProduct = products.find((product) => product.slug === "farzin");

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
        description: "An independent digital studio and software lab.",
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
        <div className="absolute left-[-7rem] top-24 hidden opacity-[0.08] lg:block">
          <RukhMark size="hero" glow container={false} decorative />
        </div>
        <div className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,#f0001c_45%,#16c8ff_70%,transparent)]" />
        <Container className="grid min-h-[calc(100vh-4.5rem)] items-center gap-12 py-16 sm:py-20 lg:grid-cols-[0.95fr_1.05fr] lg:py-24">
          <Reveal>
            <div className="max-w-3xl">
              <Badge tone="red" className="uppercase tracking-[0.18em]">
                Independent digital studio & software lab
              </Badge>
              <h1 className="mt-7 text-5xl font-semibold leading-[1.02] text-white sm:text-6xl 2xl:text-7xl">
                Websites, career portfolios, and software built to{" "}
                <span className="bg-[linear-gradient(105deg,#ffffff_5%,#ff596b_45%,#36d4ff_78%,#9a6dff)] bg-clip-text text-transparent">
                  do more than exist.
                </span>
              </h1>
              <p className="mt-7 max-w-2xl text-lg leading-8 text-white/68 sm:text-xl">
                Rukh Labs designs distinctive websites and recruiter-ready career
                portfolios, and builds original software including Glass Squares
                OS and Farzin.
              </p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/services/web-development"
                  className={buttonStyles({ size: "lg" })}
                >
                  Build your website
                  <ArrowRight aria-hidden className="size-4" />
                </Link>
                <Link
                  href="/services/career-portfolios"
                  className={buttonStyles({ variant: "secondary", size: "lg" })}
                >
                  Build a career portfolio
                </Link>
              </div>
              <div className="mt-10 grid gap-3 text-xs font-medium uppercase tracking-[0.14em] text-white/42 sm:grid-cols-3">
                <span className="border-l border-[#16c8ff]/50 pl-3">Web development</span>
                <span className="border-l border-[#9a6dff]/50 pl-3">Career portfolios</span>
                <span className="border-l border-[#f0001c]/50 pl-3">Original software</span>
              </div>
            </div>
          </Reveal>
          <Reveal delay={0.12}>
            <HeroVisual />
          </Reveal>
        </Container>
      </section>

      <Section className="py-8 sm:py-10">
        <Container>
          <Reveal>
            <BrandBanner />
          </Reveal>
        </Container>
      </Section>

      <WebsiteStudioTeaser />
      <CareerPortfolioTeaser />

      <Section className="border-y border-white/10 bg-white/[0.02]">
        <Container>
          <Reveal>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <Badge tone="gold">Selected work</Badge>
                <h2 className="mt-5 text-3xl font-semibold text-white sm:text-5xl">
                  Selected work from the lab.
                </h2>
                <p className="mt-4 max-w-2xl text-lg leading-8 text-white/64">
                  Explore the Rukh Labs platform, original products, and a clearly identified fictional career-portfolio demonstration.
                </p>
              </div>
              <Link href="/work" className={buttonStyles({ variant: "ghost", className: "self-start sm:self-auto" })}>
                Explore all work <ArrowRight aria-hidden className="size-4" />
              </Link>
            </div>
          </Reveal>
          <div className="mt-10 grid gap-5 lg:grid-cols-3">
            {featuredWorkProjects.map((project, index) => <Reveal key={project.slug} delay={index * 0.05}><WorkCard project={project} /></Reveal>)}
            {featuredProduct ? <Reveal delay={0.1}><ProductCard product={featuredProduct} cta="View Farzin" /></Reveal> : null}
          </div>
        </Container>
      </Section>

      <Section>
        <Container>
          <Reveal>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <Badge tone="blue">Featured insights</Badge>
                <h2 className="mt-5 text-3xl font-semibold text-white sm:text-5xl">
                  Practical guidance for the work ahead.
                </h2>
              </div>
              <Link href="/insights" className={buttonStyles({ variant: "ghost", className: "self-start sm:self-auto" })}>
                Explore insights <ArrowRight aria-hidden className="size-4" />
              </Link>
            </div>
          </Reveal>
          <div className="mt-10 grid gap-5 lg:grid-cols-3">
            {insights.map((insight, index) => <Reveal key={insight.slug} delay={index * 0.05}><InsightCard insight={insight} /></Reveal>)}
          </div>
        </Container>
      </Section>

      <Section>
        <Container>
          <Reveal>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <Badge tone="slate">Products from the lab</Badge>
                <h2 className="mt-5 text-3xl font-semibold text-white sm:text-5xl">
                  Original software built with sharper standards.
                </h2>
                <p className="mt-4 max-w-2xl text-lg leading-8 text-white/64">
                  Glass Squares OS and Farzin apply the same standards used across
                  Rukh Labs services and products: clarity, control, and distinctive design.
                </p>
              </div>
              <Link
                href="/products"
                className={buttonStyles({ variant: "ghost", className: "self-start sm:self-auto" })}
              >
                View all products
                <ArrowRight aria-hidden className="size-4" />
              </Link>
            </div>
          </Reveal>
          <div className="mt-10 grid gap-5 lg:grid-cols-3">
            {[...products, labProduct].map((product, index) => (
              <Reveal key={product.slug} delay={index * 0.06}>
                <ProductCard
                  product={product}
                  cta={
                    product.slug === "lab"
                      ? "Follow the Changelog"
                      : product.slug === "farzin"
                        ? "Get Farzin on Google Play"
                        : `View ${product.name}`
                  }
                />
              </Reveal>
            ))}
          </div>
        </Container>
      </Section>

      <Section className="border-y border-white/10 bg-white/[0.025]">
        <Container>
          <Reveal>
            <div className="max-w-3xl">
              <Badge tone="gold">Built against bloat.</Badge>
              <h2 className="mt-5 text-3xl font-semibold text-white sm:text-5xl">
                The standard is simple: respect the user.
              </h2>
            </div>
          </Reveal>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {philosophy.map((item, index) => {
              const Icon = item.icon;

              return (
                <Reveal key={item.title} delay={index * 0.05}>
                  <Card interactive className="h-full p-5">
                    <span className="grid size-11 place-items-center rounded-lg border border-[color:var(--brand-red)]/24 bg-[color:var(--brand-red)]/10 text-[#ffb4b8]">
                      <Icon aria-hidden className="size-5" />
                    </span>
                    <h3 className="mt-5 text-lg font-semibold text-white">{item.title}</h3>
                    <p className="mt-3 text-sm leading-6 text-white/58">{item.description}</p>
                  </Card>
                </Reveal>
              );
            })}
          </div>
        </Container>
      </Section>

      <Section>
        <Container className="grid items-center gap-10 lg:grid-cols-[0.9fr_1.1fr]">
          <Reveal>
            <div>
              <Badge tone="blue">Glass Squares OS</Badge>
              <h2 className="mt-5 text-3xl font-semibold text-white sm:text-5xl">
                A desktop OS without the usual mess.
              </h2>
              <p className="mt-6 text-lg leading-8 text-white/64">
                Glass Squares OS is a Linux-based desktop operating system designed
                around glassy surfaces, square layouts, speed, compatibility, and
                control.
              </p>
              <ul className="mt-7 grid gap-3">
                {osBullets.map((item) => (
                  <li key={item} className="flex items-center gap-3 text-sm text-white/68">
                    <ShieldCheck aria-hidden className="size-4 text-[#55d9ff]" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link
                href="/products/glass-squares-os"
                className={buttonStyles({ variant: "secondary", className: "mt-8" })}
              >
                Explore Glass Squares OS
              </Link>
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <OSMockup />
          </Reveal>
        </Container>
      </Section>

      <Section className="border-y border-white/10 bg-white/[0.025]">
        <Container className="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
          <Reveal>
            <ChessMockup />
          </Reveal>
          <Reveal delay={0.1}>
            <div>
              <Badge tone="gold">Farzin</Badge>
              <h2 className="mt-5 text-3xl font-semibold text-white sm:text-5xl">
                Serious chess training without the circus.
              </h2>
              <p className="mt-6 text-lg leading-8 text-white/64">
                Farzin is a premium Android chess training app for focused game
                review, opening preparation, tactical practice, and progress
                tracking.
              </p>
              <ul className="mt-7 grid gap-3">
                {farzinBullets.map((item) => (
                  <li key={item} className="flex items-center gap-3 text-sm text-white/68">
                    <Gauge aria-hidden className="size-4 text-[#f3d99d]" />
                    {item}
                  </li>
                ))}
              </ul>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/products/farzin"
                  className={buttonStyles({ variant: "secondary" })}
                >
                  Explore Farzin
                </Link>
                <TrackedAnchor
                  href={siteConfig.links.farzinGooglePlay}
                  eventName="google_play_click"
                  eventProperties={{ product: "farzin", source_page: "/" }}
                  aria-label="Get Farzin 1.0.0 on Google Play"
                  className={buttonStyles({ variant: "ghost" })}
                >
                  Install on Google Play
                </TrackedAnchor>
              </div>
            </div>
          </Reveal>
        </Container>
      </Section>

      <Section>
        <Container>
          <Reveal>
            <Card className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[0.85fr_1.15fr] lg:p-10">
              <div>
                <Badge tone="ivory">Trust</Badge>
                <h2 className="mt-5 text-3xl font-semibold text-white sm:text-5xl">
                  How trust shows up in the product.
                </h2>
              </div>
              <div className="grid gap-5 sm:grid-cols-3">
                {[
                  {
                    title: "Clear defaults",
                    copy: "Products should explain what they do and stay quiet when they should.",
                    icon: MonitorCog,
                  },
                  {
                    title: "Security direction",
                    copy: "Sane update paths, minimal bloat, and transparent release notes.",
                    icon: LockKeyhole,
                  },
                  {
                    title: "Privacy stance",
                    copy: "Collect less, disclose more, and avoid manipulative product behavior.",
                    icon: ShieldCheck,
                  },
                ].map((item) => {
                  const Icon = item.icon;

                  return (
                    <div key={item.title}>
                      <Icon aria-hidden className="size-5 text-[#ffb4b8]" />
                      <h3 className="mt-4 text-base font-semibold text-white">{item.title}</h3>
                      <p className="mt-3 text-sm leading-6 text-white/58">{item.copy}</p>
                    </div>
                  );
                })}
              </div>
            </Card>
          </Reveal>
        </Container>
      </Section>

      <Section className="pt-0">
        <Container>
          <Reveal>
            <div className="rounded-lg border border-[#d6ad5b]/20 bg-[linear-gradient(135deg,rgba(214,173,91,0.12),rgba(77,183,255,0.08)_54%,rgba(255,255,255,0.035))] p-6 shadow-[0_24px_100px_rgba(0,0,0,0.35)] sm:p-8 lg:p-10">
              <div className="grid gap-8 lg:grid-cols-[0.75fr_1.25fr] lg:items-center">
                <div>
                  <Badge tone="gold">Start a project</Badge>
                  <h2 className="mt-5 text-3xl font-semibold text-white sm:text-5xl">
                    Start a project with Rukh Labs.
                  </h2>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row lg:justify-end">
                  <Link
                    href="/services/web-development"
                    className={buttonStyles({ size: "lg" })}
                  >
                    Plan a website
                    <ArrowRight aria-hidden className="size-4" />
                  </Link>
                  <Link
                    href="/services/career-portfolios"
                    className={buttonStyles({ variant: "secondary", size: "lg" })}
                  >
                    Build a career portfolio
                    <ArrowRight aria-hidden className="size-4" />
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
