import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowUpRight,
  BarChart3,
  BookOpen,
  Brain,
  ClipboardList,
  Crosshair,
  Eye,
  ListChecks,
  ScanSearch,
} from "lucide-react";
import { ProductBrandLockup } from "@/components/brand/product-brand-lockup";
import { TrackedAnchor } from "@/components/analytics/tracked-link";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { StructuredData } from "@/components/seo/structured-data";
import { ComparisonTable } from "@/components/sections/comparison-table";
import { FeatureGrid } from "@/components/sections/feature-grid";
import { Badge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/ui/reveal";
import { Section } from "@/components/ui/section";
import { ChessMockup } from "@/components/visuals/chess-mockup";
import { createPageMetadata, siteConfig } from "@/lib/site-config";

export const metadata: Metadata = createPageMetadata({
  title: "Farzin Chess Training App for Android",
  description:
    "Farzin is a premium Android chess training app for focused game review, opening preparation, tactical practice, and progress tracking.",
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
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "@id": `${siteConfig.url}/products/farzin#software`,
    name: "Farzin",
    description:
      "Farzin is a premium Android chess training app for focused game review, opening preparation, tactical practice, and progress tracking.",
    applicationCategory: "EducationalApplication",
    operatingSystem: "Android",
    softwareVersion: "1.0.0",
    url: `${siteConfig.url}/products/farzin`,
    downloadUrl: siteConfig.links.farzinGooglePlay,
    publisher: {
      "@type": "Organization",
      "@id": `${siteConfig.url}/#organization`,
      name: "Rukh Labs",
      url: siteConfig.url,
    },
  };

  return (
    <>
      <StructuredData data={structuredData} />
      <div className="border-b border-white/10 bg-black/15">
        <Container className="py-4">
          <Breadcrumbs
            items={[
              { name: "Home", path: "/" },
              { name: "Products", path: "/products" },
              { name: "Farzin", path: "/products/farzin" },
            ]}
          />
        </Container>
      </div>
      <section className="relative overflow-hidden border-b border-[#f4bd43]/15 bg-[radial-gradient(circle_at_82%_22%,rgba(244,189,67,0.1),transparent_30%)]">
        <div className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,#f4bd43,#fff0b5,transparent)]" />
        <Container className="grid items-center gap-12 py-20 sm:py-24 lg:grid-cols-[0.9fr_1.1fr]">
          <Reveal>
            <div>
              <ProductBrandLockup product="Farzin" />
              <Badge tone="gold" className="mt-6">
                Available now · v1.0.0
              </Badge>
              <h1 className="mt-6 text-4xl font-semibold leading-[1.05] text-white sm:text-6xl">
                Serious chess training without the circus.
              </h1>
              <p className="mt-6 max-w-3xl text-lg leading-8 text-white/68">
                Farzin is a premium Android chess training app built for players
                who want cleaner analysis, sharper preparation, focused practice,
                and less wasted time.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <TrackedAnchor
                  href={siteConfig.links.farzinGooglePlay}
                  eventName="google_play_click"
                  eventProperties={{ product: "farzin", source_page: "/products/farzin" }}
                  aria-label="Get Farzin 1.0.0 on Google Play"
                  className={buttonStyles({ variant: "gold", size: "lg" })}
                >
                  Get Farzin on Google Play
                  <ArrowUpRight aria-hidden className="size-4" />
                </TrackedAnchor>
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
                Built for focused improvement.
              </h2>
            </div>
          </Reveal>
          <Reveal delay={0.08}>
            <Card className="p-6 sm:p-8">
              <p className="text-lg leading-8 text-white/68">
                Farzin keeps game review, preparation, and practice organized
                around the work that helps a player improve.
              </p>
            </Card>
          </Reveal>
        </Container>
      </Section>

      <Section className="border-y border-[#f4bd43]/14 bg-[rgba(244,189,67,0.035)]">
        <Container>
          <Reveal>
            <Card className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[0.7fr_1.3fr] lg:p-10">
              <div>
                <Badge tone="gold">A complete training loop</Badge>
                <h2 className="mt-5 text-3xl font-semibold text-white sm:text-5xl">
                  Review. Prepare. Practice. Improve.
                </h2>
              </div>
              <div>
                <p className="text-lg leading-8 text-white/68">
                  Farzin connects game review, opening preparation, tactical
                  practice, mistake patterns, and progress tracking in one focused
                  workflow.
                </p>
                <p className="mt-5 text-sm font-medium text-[color:var(--brand-bronze)]">
                  Move from analysis to the next useful training action without
                  stitching together disconnected tools.
                </p>
              </div>
            </Card>
          </Reveal>
        </Container>
      </Section>

      <Section id="features" className="border-y border-[#f4bd43]/12 bg-[#120e07]/52">
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
            <FeatureGrid features={features} tone="farzin" />
          </div>
        </Container>
      </Section>

      <Section>
        <Container>
          <Reveal>
            <div className="max-w-3xl">
              <Badge tone="blue">Comparison</Badge>
              <h2 className="mt-5 text-3xl font-semibold text-white sm:text-5xl">
                A focused alternative to crowded chess apps.
              </h2>
            </div>
          </Reveal>
          <div className="mt-10 overflow-x-auto">
            <ComparisonTable rows={comparisonRows} />
          </div>
        </Container>
      </Section>

      <Section className="border-y border-white/10 bg-white/[0.02]">
        <Container>
          <Reveal>
            <div className="max-w-3xl">
              <Badge tone="gold">Current release</Badge>
              <h2 className="mt-5 text-3xl font-semibold text-white sm:text-5xl">
                Farzin 1.0.0 is available on Google Play.
              </h2>
              <p className="mt-5 text-lg leading-8 text-white/62">
                Version 1.0.0 is the current known Android release. Rukh Labs
                publishes product updates and support information on this site.
              </p>
            </div>
          </Reveal>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <Card className="p-5">
              <h3 className="font-semibold text-white">Privacy</h3>
              <p className="mt-3 text-sm leading-6 text-white/56">
                Read the app-specific privacy policy for Farzin.
              </p>
              <Link href="/products/farzin/privacy" className={buttonStyles({ variant: "ghost", size: "sm", className: "mt-4" })}>
                Farzin privacy policy
              </Link>
            </Card>
            <Card className="p-5">
              <h3 className="font-semibold text-white">Support</h3>
              <p className="mt-3 text-sm leading-6 text-white/56">
                Contact Rukh Labs with a question, bug report, or product feedback.
              </p>
              <Link href="/contact" className={buttonStyles({ variant: "ghost", size: "sm", className: "mt-4" })}>
                Contact Farzin support
              </Link>
            </Card>
            <Card className="p-5">
              <h3 className="font-semibold text-white">Release notes</h3>
              <p className="mt-3 text-sm leading-6 text-white/56">
                Follow Rukh Labs product updates and version notes.
              </p>
              <Link href="/changelog" className={buttonStyles({ variant: "ghost", size: "sm", className: "mt-4" })}>
                View the changelog
              </Link>
            </Card>
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
              <TrackedAnchor
                href={siteConfig.links.farzinGooglePlay}
                eventName="google_play_click"
                eventProperties={{ product: "farzin", source_page: "/products/farzin" }}
                aria-label="Get Farzin 1.0.0 on Google Play"
                className={buttonStyles({
                  variant: "gold",
                  className: "mt-8",
                  size: "lg",
                })}
              >
                Get Farzin on Google Play
                <ArrowUpRight aria-hidden className="size-4" />
              </TrackedAnchor>
            </div>
          </Reveal>
        </Container>
      </Section>
    </>
  );
}
