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
import { WaitlistForm } from "@/components/forms/waitlist-form";
import { ProductCard } from "@/components/sections/product-card";
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
import { createPageMetadata } from "@/lib/site-config";

export const metadata: Metadata = createPageMetadata({
  title: "Rukh Labs",
  description:
    "Rukh Labs builds clean, secure, beautifully designed software for people who expect more from their tools.",
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
  "Familiar desktop patterns",
  "Low-bloat default apps",
  "Security-conscious architecture",
  "Compatibility-first workflow",
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
  return (
    <>
      <section className="relative overflow-hidden border-b border-white/10">
        <Container className="grid min-h-[calc(100vh-4.5rem)] items-center gap-12 py-16 sm:py-20 lg:grid-cols-[0.95fr_1.05fr] lg:py-24">
          <Reveal>
            <div className="max-w-3xl">
              <Badge tone="gold">Clean tools. Sharper standards.</Badge>
              <h1 className="mt-7 text-5xl font-semibold leading-[1.02] text-white sm:text-7xl">
                Software should feel powerful again.
              </h1>
              <p className="mt-7 max-w-2xl text-lg leading-8 text-white/68 sm:text-xl">
                Rukh Labs builds clean, secure, beautifully designed software
                for people who expect more from their tools.
              </p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Link href="/download" className={buttonStyles({ size: "lg" })}>
                  Join the Beta
                  <ArrowRight aria-hidden className="size-4" />
                </Link>
                <Link
                  href="/products"
                  className={buttonStyles({ variant: "secondary", size: "lg" })}
                >
                  Explore Products
                </Link>
              </div>
              <div className="mt-10 grid gap-3 text-sm text-white/50 sm:grid-cols-3">
                <span>Linux-based OS concept</span>
                <span>Premium chess training</span>
                <span>Independent software lab</span>
              </div>
            </div>
          </Reveal>
          <Reveal delay={0.12}>
            <HeroVisual />
          </Reveal>
        </Container>
      </section>

      <Section>
        <Container>
          <Reveal>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <Badge tone="blue">Products</Badge>
                <h2 className="mt-5 text-3xl font-semibold text-white sm:text-5xl">
                  Premium software with teeth.
                </h2>
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
                  cta={product.slug === "lab" ? "Follow the Changelog" : `View ${product.name}`}
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
                    <span className="grid size-11 place-items-center rounded-lg border border-[#4db7ff]/24 bg-[#4db7ff]/10 text-[#9fdcff]">
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
              <Badge tone="blue">Rukh OS</Badge>
              <h2 className="mt-5 text-3xl font-semibold text-white sm:text-5xl">
                A desktop OS without the usual mess.
              </h2>
              <p className="mt-6 text-lg leading-8 text-white/64">
                Rukh OS is a Linux-based desktop experience designed around
                speed, clarity, compatibility, and control.
              </p>
              <ul className="mt-7 grid gap-3">
                {osBullets.map((item) => (
                  <li key={item} className="flex items-center gap-3 text-sm text-white/68">
                    <ShieldCheck aria-hidden className="size-4 text-[#9fdcff]" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link
                href="/products/rukh-os"
                className={buttonStyles({ variant: "secondary", className: "mt-8" })}
              >
                Explore Rukh OS
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
                Serious chess training. Less noise.
              </h2>
              <p className="mt-6 text-lg leading-8 text-white/64">
                Farzin is built for players who want sharper review, cleaner
                study, and an interface that respects their time.
              </p>
              <ul className="mt-7 grid gap-3">
                {farzinBullets.map((item) => (
                  <li key={item} className="flex items-center gap-3 text-sm text-white/68">
                    <Gauge aria-hidden className="size-4 text-[#f3d99d]" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link
                href="/products/farzin"
                className={buttonStyles({ variant: "secondary", className: "mt-8" })}
              >
                Explore Farzin
              </Link>
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
                  Respect the user. Protect the machine.
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
                      <Icon aria-hidden className="size-5 text-[#9fdcff]" />
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
                  <Badge tone="gold">Beta waitlist</Badge>
                  <h2 className="mt-5 text-3xl font-semibold text-white sm:text-5xl">
                    Get in before it gets loud.
                  </h2>
                </div>
                <WaitlistForm />
              </div>
            </div>
          </Reveal>
        </Container>
      </Section>
    </>
  );
}
