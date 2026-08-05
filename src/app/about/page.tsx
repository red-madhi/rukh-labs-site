import type { Metadata } from "next";
import { BrandBanner } from "@/components/brand/brand-banner";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import { PageHeader } from "@/components/ui/page-header";
import { Reveal } from "@/components/ui/reveal";
import { Section } from "@/components/ui/section";
import { createPageMetadata } from "@/lib/site-config";

export const metadata: Metadata = createPageMetadata({
  title: "About Rukh Labs",
  description:
    "Learn how Rukh Labs approaches websites, career portfolios, and original software as an independent digital studio and software lab.",
  path: "/about",
  image: {
    url: "/opengraph-image",
    width: 1200,
    height: 630,
    alt: "About Rukh Labs",
  },
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
  return (
    <>
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
                <Badge tone="blue">Independent studio</Badge>
                <h2 className="mt-5 text-3xl font-semibold text-white sm:text-5xl">
                  Built around the work.
                </h2>
              </div>
              <div>
                <p className="text-lg leading-8 text-white/68">
                  Rukh Labs combines analytical thinking, technical systems, and
                  product craft to make websites and software that are clear,
                  distinctive, and useful.
                </p>
                <p className="mt-5 text-base leading-7 text-white/58">
                  The studio works remotely across custom websites, career
                  portfolios, Farzin, Glass Squares OS, and future software from
                  the lab. Every project starts with what needs to be understood,
                  then gives it a sharper shape.
                </p>
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
