import Link from "next/link";
import { ArrowRight, BriefcaseBusiness, FileSearch, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/ui/reveal";
import { Section } from "@/components/ui/section";

const proofPoints = [
  {
    title: "Positioning",
    copy: "Make the role, level, and value clear in seconds.",
    icon: BriefcaseBusiness,
  },
  {
    title: "Evidence",
    copy: "Turn claims into case studies, outcomes, and proof.",
    icon: FileSearch,
  },
  {
    title: "Presence",
    copy: "Give recruiters a memorable destination beyond a PDF.",
    icon: Sparkles,
  },
] as const;

export function CareerPortfolioTeaser() {
  return (
    <Section className="border-y border-[#16c8ff]/14 bg-[linear-gradient(180deg,rgba(22,200,255,0.025),rgba(109,49,255,0.025))]">
      <Container>
        <Reveal>
          <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
            <div className="max-w-3xl">
              <Badge tone="blue">Career Portfolio Studio</Badge>
              <h2 className="mt-5 text-3xl font-semibold text-white sm:text-5xl">
                A resume says it. A portfolio proves it.
              </h2>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-white/64">
                Make your experience easier to believe. Custom career portfolio
                websites show recruiters how you think, what you built, and why
                it mattered.
              </p>
            </div>
            <Link
              href="/services/career-portfolios"
              className={buttonStyles({
                variant: "secondary",
                size: "lg",
                className: "justify-self-start lg:justify-self-end",
              })}
            >
              Explore Career Portfolios
              <ArrowRight aria-hidden className="size-4" />
            </Link>
          </div>
        </Reveal>

        <div className="mt-9 grid gap-4 md:grid-cols-3">
          {proofPoints.map((item, index) => {
            const Icon = item.icon;
            return (
              <Reveal key={item.title} delay={index * 0.05}>
                <Card className="h-full border-[#16c8ff]/14 p-5">
                  <Icon aria-hidden className="size-5 text-[#55d9ff]" />
                  <h3 className="mt-5 text-lg font-semibold text-white">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-white/56">{item.copy}</p>
                </Card>
              </Reveal>
            );
          })}
        </div>
      </Container>
    </Section>
  );
}
