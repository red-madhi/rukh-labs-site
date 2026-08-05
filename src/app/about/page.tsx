import type { Metadata } from "next";
import Link from "next/link";
import { BrandBanner } from "@/components/brand/brand-banner";
import { StructuredData } from "@/components/seo/structured-data";
import { Badge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import { PageHeader } from "@/components/ui/page-header";
import { Reveal } from "@/components/ui/reveal";
import { Section } from "@/components/ui/section";
import { createPageMetadata, siteConfig } from "@/lib/site-config";

export const metadata: Metadata = createPageMetadata({
  title: "About Rukh Labs and Founder Brett Gallaher",
  description:
    "Learn how Rukh Labs approaches websites, career portfolios, and original software as an independent digital studio and software lab.",
  path: "/about",
});

const principles = [
  "Software should feel intentional",
  "Defaults should be clean",
  "Power should not require ugliness",
  "Privacy should not be a luxury feature",
  "Users should not have to fight their tools",
];

const sections = [
  {
    title: "What we believe",
    copy: "Software got too comfortable wasting attention. Rukh Labs is built around the opposite instinct: fewer insults, sharper decisions, cleaner defaults.",
  },
  {
    title: "Why Rukh",
    copy: "The rook is direct, structural, and hard to ignore. That is the tone: disciplined products, clear movement, serious craft.",
  },
  {
    title: "What we are building",
    copy: "Rukh Labs creates distinctive websites, recruiter-ready career portfolios, Glass Squares OS, Farzin, and future software from the lab.",
  },
];

export default function AboutPage() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Person",
    "@id": `${siteConfig.url}/about#brett-gallaher`,
    name: "Brett Gallaher",
    url: `${siteConfig.url}/about`,
    jobTitle: "Founder and operator of Rukh Labs",
    worksFor: {
      "@type": "Organization",
      "@id": `${siteConfig.url}/#organization`,
      name: siteConfig.name,
      url: siteConfig.url,
    },
    knowsAbout: [
      "Business intelligence",
      "Analytics",
      "Data visualization",
      "Technical systems",
      "Power BI",
      "DAX",
      "Power Query",
      "Software development",
      "Product development",
    ],
  };

  return (
    <>
      <StructuredData data={structuredData} />
      <PageHeader
        eyebrow="About"
        title="Rukh Labs builds websites, career portfolios, and software with sharper standards."
        description="An independent digital studio and software lab focused on clear, distinctive, privacy-conscious work that respects the person using it."
      />
      <Section className="pb-0">
        <Container>
          <Reveal>
            <BrandBanner />
          </Reveal>
        </Container>
      </Section>
      <Section>
        <Container>
          <Reveal>
            <Card className="grid gap-8 border-[#16c8ff]/20 bg-[linear-gradient(135deg,rgba(22,200,255,0.07),rgba(240,0,28,0.05),rgba(255,255,255,0.025))] p-6 sm:p-8 lg:grid-cols-[0.72fr_1.28fr] lg:p-10">
              <div>
                <Badge tone="blue">Founder and operator</Badge>
                <h2 className="mt-5 text-3xl font-semibold text-white sm:text-5xl">
                  Brett Gallaher
                </h2>
              </div>
              <div>
                <p className="text-lg leading-8 text-white/68">
                  Rukh Labs is founded and operated by Brett Gallaher. His
                  professional background spans business intelligence, analytics,
                  data visualization, and technical systems, including Power BI,
                  DAX, and Power Query.
                </p>
                <p className="mt-5 text-base leading-7 text-white/58">
                  That analytical foundation now extends into software and product
                  development: custom websites, career portfolios, Farzin, and
                  Glass Squares OS. Rukh Labs works with clients remotely and keeps
                  every engagement founder-led.
                </p>
                <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                  <Link href="/services/web-development" className={buttonStyles({ variant: "secondary" })}>
                    Website design services
                  </Link>
                  <Link href="/services/career-portfolios" className={buttonStyles({ variant: "ghost" })}>
                    Career portfolio services
                  </Link>
                </div>
              </div>
            </Card>
          </Reveal>
        </Container>
      </Section>
      <Section className="pt-0">
        <Container>
          <div className="grid gap-5 lg:grid-cols-3">
            {sections.map((section, index) => (
              <Reveal key={section.title} delay={index * 0.06}>
                <Card interactive className="h-full p-6">
                  <Badge tone={index === 1 ? "gold" : "blue"}>{section.title}</Badge>
                  <p className="mt-6 text-base leading-7 text-white/66">{section.copy}</p>
                </Card>
              </Reveal>
            ))}
          </div>
        </Container>
      </Section>
      <Section className="border-t border-white/10 bg-white/[0.025]">
        <Container>
          <Reveal>
            <div className="max-w-3xl">
              <Badge tone="ivory">Principles</Badge>
              <h2 className="mt-5 text-3xl font-semibold text-white sm:text-5xl">
                Clean tools. Sharper standards.
              </h2>
            </div>
          </Reveal>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {principles.map((principle, index) => (
              <Reveal key={principle} delay={index * 0.04}>
                <Card className="h-full p-5">
                  <span className="text-sm font-semibold text-[#d6ad5b]">
                    0{index + 1}
                  </span>
                  <h3 className="mt-5 text-base font-semibold leading-6 text-white">
                    {principle}
                  </h3>
                </Card>
              </Reveal>
            ))}
          </div>
        </Container>
      </Section>
    </>
  );
}
