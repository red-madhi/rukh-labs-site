import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { InsightCard } from "@/components/content/insight-card";
import { StructuredData } from "@/components/seo/structured-data";
import { Badge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/ui/reveal";
import { Section } from "@/components/ui/section";
import { insights } from "@/lib/insights";
import { createPageMetadata, siteConfig } from "@/lib/site-config";

export const metadata: Metadata = createPageMetadata({
  title: "Insights",
  description:
    "Practical Rukh Labs guides on website planning, career portfolios, analytics careers, privacy, and proof.",
  path: "/insights",
  image: { url: "/insights/opengraph-image", width: 1200, height: 630, alt: "Rukh Labs insights" },
});

const categories = ["Website planning", "Career portfolios", "Analytics careers", "Privacy and proof", "Product development"];

export default function InsightsPage() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${siteConfig.url}/insights#collection`,
    name: "Rukh Labs insights",
    url: `${siteConfig.url}/insights`,
    description: "Practical guides on website planning, career portfolios, analytics careers, privacy, and proof.",
    isPartOf: { "@id": `${siteConfig.url}/#website` },
    publisher: { "@id": `${siteConfig.url}/#organization` },
  };

  return (
    <>
      <StructuredData data={structuredData} />
      <section className="relative overflow-hidden border-b border-white/10"><div className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,#16c8ff_42%,#9a6dff_72%,transparent)]" /><Container className="py-16 sm:py-20 lg:py-24"><Reveal><div className="max-w-4xl"><Badge tone="blue">Insights</Badge><h1 className="mt-6 text-4xl font-semibold leading-[1.04] tracking-[-0.04em] text-white sm:text-6xl">Useful guidance for decisions that deserve more than a template.</h1><p className="mt-6 max-w-3xl text-lg leading-8 text-white/68 sm:text-xl">Rukh Labs publishes practical resources about website planning, career portfolios, analytics evidence, privacy, and product development. The goal is a clearer next decision, not more noise.</p></div></Reveal></Container></section>
      <Section><Container><Reveal><div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><Badge tone="ivory">Featured guides</Badge><h2 className="mt-5 text-3xl font-semibold text-white sm:text-5xl">Start with the question in front of you.</h2></div><Link href="/work" className={buttonStyles({ variant: "ghost", className: "self-start sm:self-auto" })}>Explore Rukh Labs work <ArrowRight aria-hidden className="size-4" /></Link></div></Reveal><div className="mt-10 grid gap-5 lg:grid-cols-3">{insights.map((insight, index) => <Reveal key={insight.slug} delay={index * 0.05}><InsightCard insight={insight} /></Reveal>)}</div></Container></Section>
      <Section className="border-t border-white/10 bg-white/[0.02]"><Container><Reveal><div className="max-w-3xl"><Badge tone="gold">Topics</Badge><h2 className="mt-5 text-3xl font-semibold text-white sm:text-5xl">A small resource library, built to grow carefully.</h2></div></Reveal><div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">{categories.map((category, index) => <Reveal key={category} delay={index * 0.04}><Card className="h-full p-5"><span className="text-sm font-semibold text-[#d6ad5b]">0{index + 1}</span><h3 className="mt-4 text-base font-semibold text-white">{category}</h3></Card></Reveal>)}</div></Container></Section>
    </>
  );
}
