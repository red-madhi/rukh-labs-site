import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Brain,
  ClipboardList,
  Crosshair,
  Eye,
  ListChecks,
  ScanSearch,
} from "lucide-react";
import { ComparisonTable } from "@/components/sections/comparison-table";
import { FeatureGrid } from "@/components/sections/feature-grid";
import { Badge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/ui/reveal";
import { Section } from "@/components/ui/section";
import { ChessMockup } from "@/components/visuals/chess-mockup";
import { createPageMetadata } from "@/lib/site-config";

export const metadata: Metadata = createPageMetadata({
  title: "Farzin",
  description:
    "Farzin is a premium chess training app for cleaner analysis, sharper prep, and focused study.",
  path: "/products/farzin",
});

const features = [
  {
    title: "Game review",
    description: "Review games in a focused flow that separates signal from decorative noise.",
    icon: ScanSearch,
  },
  {
    title: "Engine-assisted analysis",
    description: "Use engine insight as a study tool, not a wall of unexplained numbers.",
    icon: Brain,
  },
  {
    title: "Opening prep",
    description: "Build practical lines, review branches, and keep prep organized.",
    icon: BookOpen,
  },
  {
    title: "Tactical drills",
    description: "Turn mistakes into repeatable training patterns and focused exercises.",
    icon: Crosshair,
  },
  {
    title: "Study plans",
    description: "Structure improvement around concrete work, not endless browsing.",
    icon: ClipboardList,
  },
  {
    title: "Mistake patterns",
    description: "Surface recurring problems so training points at the right target.",
    icon: Eye,
  },
  {
    title: "Progress tracking",
    description: "Measure study habits, review quality, and tactical consistency over time.",
    icon: BarChart3,
  },
  {
    title: "Clean board interface",
    description: "A serious board and analysis surface built for calm concentration.",
    icon: ListChecks,
  },
];

const comparisonRows = [
  {
    label: "Distractions",
    other: "Crowded surfaces, constant prompts, and features competing for attention.",
    farzin: "A quieter interface built around study, review, and deliberate training.",
  },
  {
    label: "Study flow",
    other: "Sessions can drift into browsing, puzzles, feeds, and disconnected tools.",
    farzin: "Review, prep, drill, and track progress from one focused training path.",
  },
  {
    label: "Visual clarity",
    other: "Busy panels can make important signals harder to read.",
    farzin: "A premium board, calm analysis panel, and hierarchy that respects focus.",
  },
  {
    label: "Training depth",
    other: "Useful tools, but often scattered across unrelated experiences.",
    farzin: "Training features are organized around improvement and mistake patterns.",
  },
  {
    label: "User respect",
    other: "More engagement is often treated as the goal.",
    farzin: "The goal is stronger study, clearer review, and less wasted time.",
  },
];

export default function FarzinPage() {
  return (
    <>
      <section className="relative overflow-hidden border-b border-white/10">
        <Container className="grid items-center gap-12 py-20 sm:py-24 lg:grid-cols-[0.9fr_1.1fr]">
          <Reveal>
            <div>
              <Badge tone="gold">Farzin</Badge>
              <h1 className="mt-6 text-4xl font-semibold leading-[1.05] text-white sm:text-6xl">
                Serious chess training without the circus.
              </h1>
              <p className="mt-6 max-w-3xl text-lg leading-8 text-white/68">
                Farzin is a premium chess app built for players who want cleaner
                analysis, sharper prep, and study tools that do not waste their time.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href="/download" className={buttonStyles({ size: "lg" })}>
                  Join Farzin Beta
                  <ArrowRight aria-hidden className="size-4" />
                </Link>
                <Link
                  href="#features"
                  className={buttonStyles({ variant: "secondary", size: "lg" })}
                >
                  See Features
                </Link>
              </div>
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <ChessMockup />
          </Reveal>
        </Container>
      </section>

      <Section>
        <Container className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
          <Reveal>
            <div>
              <Badge tone="blue">Positioning</Badge>
              <h2 className="mt-5 text-3xl font-semibold text-white sm:text-5xl">
                Not another noisy chess playground.
              </h2>
            </div>
          </Reveal>
          <Reveal delay={0.08}>
            <Card className="p-6 sm:p-8">
              <p className="text-lg leading-8 text-white/68">
                Farzin is for players who care about getting stronger. Less
                clutter. Better study flow. Cleaner review. More signal.
              </p>
            </Card>
          </Reveal>
        </Container>
      </Section>

      <Section id="features" className="border-y border-white/10 bg-white/[0.025]">
        <Container>
          <Reveal>
            <div className="max-w-3xl">
              <Badge tone="gold">Features</Badge>
              <h2 className="mt-5 text-3xl font-semibold text-white sm:text-5xl">
                Built for players who want to get stronger.
              </h2>
            </div>
          </Reveal>
          <div className="mt-10">
            <FeatureGrid features={features} />
          </div>
        </Container>
      </Section>

      <Section>
        <Container>
          <Reveal>
            <div className="max-w-3xl">
              <Badge tone="blue">Built for focus.</Badge>
              <h2 className="mt-5 text-3xl font-semibold text-white sm:text-5xl">
                Less noise. More signal.
              </h2>
            </div>
          </Reveal>
          <div className="mt-10 overflow-x-auto">
            <ComparisonTable rows={comparisonRows} />
          </div>
        </Container>
      </Section>

      <Section className="border-t border-white/10 bg-white/[0.025]">
        <Container>
          <Reveal>
            <div className="rounded-lg border border-[#d6ad5b]/22 bg-[#d6ad5b]/10 p-6 sm:p-8 lg:p-10">
              <h2 className="text-3xl font-semibold text-white sm:text-5xl">
                Train like your rating matters.
              </h2>
              <Link href="/download" className={buttonStyles({ className: "mt-8", size: "lg" })}>
                Join Farzin Beta
              </Link>
            </div>
          </Reveal>
        </Container>
      </Section>
    </>
  );
}
