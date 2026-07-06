import type { Metadata } from "next";
import Link from "next/link";
import {
  AppWindow,
  Archive,
  ArrowRight,
  Cloud,
  FileText,
  Gauge,
  Grid2X2,
  KeyRound,
  Layers3,
  LockKeyhole,
  MonitorCog,
  PackageCheck,
  ShieldCheck,
  Sparkles,
  Terminal,
} from "lucide-react";
import { ProductBrandLockup } from "@/components/brand/product-brand-lockup";
import { FeatureGrid } from "@/components/sections/feature-grid";
import { RoadmapTimeline } from "@/components/sections/roadmap-timeline";
import { Badge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/ui/reveal";
import { Section } from "@/components/ui/section";
import { OSMockup } from "@/components/visuals/os-mockup";
import { createPageMetadata } from "@/lib/site-config";

export const metadata: Metadata = createPageMetadata({
  title: "Glass Squares OS",
  description:
    "Glass Squares OS is a Linux-based desktop experience built around glassy surfaces, square-based layouts, low bloat, and practical compatibility.",
  path: "/products/glass-squares-os",
});

const features = [
  {
    title: "Glass shell interface",
    description: "Frosted surfaces, translucent panels, and a desktop shell with a sharper visual identity.",
    icon: Sparkles,
  },
  {
    title: "Square-based layout system",
    description: "A geometric UI language built around tiles, grids, and clean desktop structure.",
    icon: Grid2X2,
  },
  {
    title: "Low-bloat default apps",
    description: "Default tools selected for usefulness, clarity, and restraint.",
    icon: PackageCheck,
  },
  {
    title: "Familiar desktop workflow",
    description: "Approachable patterns for normal users without copying a competing OS.",
    icon: AppWindow,
  },
  {
    title: "Privacy-respecting defaults",
    description: "Settings that favor user control and plain-language choices.",
    icon: ShieldCheck,
  },
  {
    title: "Security-conscious foundation",
    description: "A Linux base with a careful direction for permissions, updates, and storage.",
    icon: LockKeyhole,
  },
  {
    title: "Practical compatibility paths",
    description: "Common files, web workflows, Linux apps, compatibility layers, and VM paths.",
    icon: Layers3,
  },
  {
    title: "Power-user escape hatches",
    description: "Terminal access and advanced controls without forcing everyone into them.",
    icon: Terminal,
  },
];

const compatibility = [
  {
    title: "Documents & media",
    copy: "Common document, media, archive, and day-to-day desktop workflows are the first priority.",
    icon: FileText,
  },
  {
    title: "Browser workflows",
    copy: "Modern browser and productivity workflows matter because normal computing lives across local and web surfaces.",
    icon: AppWindow,
  },
  {
    title: "Linux apps",
    copy: "Native Linux software is the natural starting point for the application ecosystem.",
    icon: PackageCheck,
  },
  {
    title: "Windows compatibility paths",
    copy: "Compatibility layers may help some workflows, but they are not magic and will be tested honestly.",
    icon: MonitorCog,
  },
  {
    title: "Virtual machines",
    copy: "Virtualization remains a practical path for workflows that need a different operating environment.",
    icon: Layers3,
  },
  {
    title: "Cloud and sync services",
    copy: "File sync and web-backed productivity need clean integration without hidden background clutter.",
    icon: Cloud,
  },
];

const security = [
  {
    title: "Sane defaults",
    copy: "Start from conservative behavior and make tradeoffs clear.",
    icon: ShieldCheck,
  },
  {
    title: "App permissions direction",
    copy: "Permission surfaces should be legible, practical, and hard to miss.",
    icon: KeyRound,
  },
  {
    title: "Encrypted storage direction",
    copy: "Storage protection is part of the roadmap, not a decorative bullet.",
    icon: Archive,
  },
  {
    title: "Clear updates",
    copy: "Updates need visible notes, minimal drama, and no mystery bundles.",
    icon: Gauge,
  },
];

const roadmap = [
  {
    title: "Brand system",
    description: "Define the Glass Squares OS name, desktop identity, surfaces, and product language.",
    status: "Active" as const,
  },
  {
    title: "Desktop shell prototype",
    description: "Prototype the glass-panel shell, square grid UI, app surfaces, and desktop workflow.",
    status: "Active" as const,
  },
  {
    title: "Installer research",
    description: "Explore approachable install paths without hiding important system decisions.",
    status: "Research" as const,
  },
  {
    title: "Compatibility testing",
    description: "Test common file, browser, Linux app, compatibility layer, and VM workflows.",
    status: "Upcoming" as const,
  },
  {
    title: "Beta image",
    description: "Prepare an early image for qualified testers and feedback loops.",
    status: "Upcoming" as const,
  },
  {
    title: "Public preview",
    description: "Open a broader preview once quality, compatibility notes, and security docs are ready.",
    status: "Upcoming" as const,
  },
];

export default function GlassSquaresOSPage() {
  return (
    <>
      <section className="relative overflow-hidden border-b border-white/10">
        <Container className="grid items-center gap-12 py-20 sm:py-24 lg:grid-cols-[0.9fr_1.1fr]">
          <Reveal>
            <div>
              <ProductBrandLockup product="Glass Squares OS" />
              <Badge tone="red" className="mt-6">
                Glass Squares OS
              </Badge>
              <h1 className="mt-6 text-4xl font-semibold leading-[1.05] text-white sm:text-6xl">
                A cleaner desktop made of glass, speed, and control.
              </h1>
              <p className="mt-6 max-w-3xl text-lg leading-8 text-white/68">
                Glass Squares OS is a Linux-based desktop experience built around
                glassy surfaces, square-based layouts, low bloat, practical
                compatibility, and a familiar workflow that does not force normal
                users to live in a terminal.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href="/download" className={buttonStyles({ size: "lg" })}>
                  Join OS Beta
                  <ArrowRight aria-hidden className="size-4" />
                </Link>
                <Link
                  href="/changelog"
                  className={buttonStyles({ variant: "secondary", size: "lg" })}
                >
                  View Roadmap
                </Link>
              </div>
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <OSMockup />
          </Reveal>
        </Container>
      </section>

      <Section>
        <Container className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
          <Reveal>
            <div>
              <Badge tone="gold">Why another OS?</Badge>
              <h2 className="mt-5 text-3xl font-semibold text-white sm:text-5xl">
                Because the desktop should feel intentional again.
              </h2>
            </div>
          </Reveal>
          <Reveal delay={0.08}>
            <Card className="p-6 sm:p-8">
              <p className="text-lg leading-8 text-white/68">
                Because most desktops have become bloated, noisy, and weirdly
                hostile to the people using them. Glass Squares OS is Rukh Labs&apos;
                attempt to make the desktop feel clean, beautiful, fast, and
                intentional again.
              </p>
            </Card>
          </Reveal>
        </Container>
      </Section>

      <Section id="features" className="border-y border-white/10 bg-white/[0.025]">
        <Container>
          <Reveal>
            <div className="max-w-3xl">
              <Badge tone="red">Features</Badge>
              <h2 className="mt-5 text-3xl font-semibold text-white sm:text-5xl">
                Glassy surfaces. Square layouts. Practical control.
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
            <div className="max-w-4xl">
              <Badge tone="gold">Compatibility</Badge>
              <h2 className="mt-5 text-3xl font-semibold text-white sm:text-5xl">
                Practical compatibility, not magic.
              </h2>
              <p className="mt-6 text-lg leading-8 text-white/64">
                Glass Squares OS is designed around practical compatibility, not
                magic. The goal is to support common document, media, archive,
                browser, and productivity workflows first, with Windows application
                support explored through compatibility layers, virtualization, and
                curated alternatives.
              </p>
            </div>
          </Reveal>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {compatibility.map((item, index) => {
              const Icon = item.icon;

              return (
                <Reveal key={item.title} delay={index * 0.04}>
                  <Card interactive className="h-full p-5">
                    <Icon aria-hidden className="size-5 text-[#d8b47a]" />
                    <h3 className="mt-5 text-lg font-semibold text-white">{item.title}</h3>
                    <p className="mt-3 text-sm leading-6 text-white/58">{item.copy}</p>
                  </Card>
                </Reveal>
              );
            })}
          </div>
        </Container>
      </Section>

      <Section className="border-y border-white/10 bg-white/[0.025]">
        <Container>
          <Reveal>
            <div className="max-w-3xl">
              <Badge tone="ivory">Security direction</Badge>
              <h2 className="mt-5 text-3xl font-semibold text-white sm:text-5xl">
                No mystery bloat. Clear updates. Real release notes.
              </h2>
            </div>
          </Reveal>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {security.map((item, index) => {
              const Icon = item.icon;

              return (
                <Reveal key={item.title} delay={index * 0.04}>
                  <Card className="h-full p-5">
                    <Icon aria-hidden className="size-5 text-[#ffb4b8]" />
                    <h3 className="mt-5 text-lg font-semibold text-white">{item.title}</h3>
                    <p className="mt-3 text-sm leading-6 text-white/58">{item.copy}</p>
                  </Card>
                </Reveal>
              );
            })}
          </div>
        </Container>
      </Section>

      <Section>
        <Container className="grid gap-10 lg:grid-cols-[0.75fr_1.25fr]">
          <Reveal>
            <div>
              <Badge tone="red">Roadmap</Badge>
              <h2 className="mt-5 text-3xl font-semibold text-white sm:text-5xl">
                From brand system to public preview.
              </h2>
            </div>
          </Reveal>
          <Reveal delay={0.08}>
            <RoadmapTimeline items={roadmap} />
          </Reveal>
        </Container>
      </Section>

      <Section className="pt-0">
        <Container>
          <Reveal>
            <div className="rounded-lg border border-[color:var(--brand-red)]/22 bg-[color:var(--brand-red)]/10 p-6 sm:p-8 lg:p-10">
              <h2 className="text-3xl font-semibold text-white sm:text-5xl">
                Help shape the desktop Glass Squares OS becomes.
              </h2>
              <Link href="/download" className={buttonStyles({ className: "mt-8", size: "lg" })}>
                Join OS Beta
              </Link>
            </div>
          </Reveal>
        </Container>
      </Section>
    </>
  );
}
