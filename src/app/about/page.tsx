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
  title: "About",
  description:
    "Rukh Labs is an independent software lab focused on clean, powerful, privacy-conscious tools.",
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
    copy: "Glass Squares OS starts with the desktop. Farzin starts with chess training. The lab grows from tools that deserve a higher standard.",
  },
];

export default function AboutPage() {
  return (
    <>
      <PageHeader
        eyebrow="About"
        title="Rukh Labs builds software with sharper standards."
        description="Rukh Labs is an independent software lab focused on clean, powerful, privacy-conscious tools. We care about software that feels fast, looks beautiful, and respects the person using it."
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
