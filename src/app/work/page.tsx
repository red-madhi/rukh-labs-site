import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { WorkCard } from "@/components/content/work-card";
import { StructuredData } from "@/components/seo/structured-data";
import { Badge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/ui/reveal";
import { Section } from "@/components/ui/section";
import { createPageMetadata, siteConfig } from "@/lib/site-config";
import { workProjects } from "@/lib/work";

export const metadata: Metadata = createPageMetadata({
  title: "Selected Product, Platform & Website Work",
  description:
    "Explore Rukh Labs product, platform, website, and clearly identified fictional demonstration work, with each project type labeled plainly.",
  path: "/work",
  image: { url: "/work/opengraph-image", width: 1200, height: 630, alt: "Rukh Labs work" },
});

export default function WorkPage() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${siteConfig.url}/work#collection`,
    name: "Rukh Labs work",
    url: `${siteConfig.url}/work`,
    description: "First-party Rukh Labs platform, product, and service demonstration work.",
    isPartOf: { "@id": `${siteConfig.url}/#website` },
    publisher: { "@id": `${siteConfig.url}/#organization` },
  };

  return (
    <>
      <StructuredData data={structuredData} />
      <section className="relative overflow-hidden border-b border-white/10">
        <div className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,#d6ad5b_40%,#16c8ff_72%,transparent)]" />
        <Container className="py-16 sm:py-20 lg:py-24">
          <Reveal>
            <div className="max-w-4xl">
              <Badge tone="gold">Work</Badge>
              <h1 className="mt-6 text-4xl font-semibold leading-[1.04] tracking-[-0.04em] text-white sm:text-6xl">
                Selected product, platform, and demonstration work.
              </h1>
              <p className="mt-6 max-w-3xl text-lg leading-8 text-white/68 sm:text-xl">
                This is a record of Rukh Labs&apos; own platform work, products, and
                fictional service demonstrations. It does not present internal
                projects as client work or imply unnamed client engagements.
              </p>
            </div>
          </Reveal>
        </Container>
      </section>

      <Section>
        <Container>
          <Reveal>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <Badge tone="blue">Studio and product work</Badge>
                <h2 className="mt-5 text-3xl font-semibold text-white sm:text-5xl">Current public work</h2>
              </div>
              <Link href="/insights" className={buttonStyles({ variant: "ghost", className: "self-start sm:self-auto" })}>
                Explore Rukh Labs insights <ArrowRight aria-hidden className="size-4" />
              </Link>
            </div>
          </Reveal>
          <div className="mt-10 grid gap-5 md:grid-cols-2">
            {workProjects.map((project, index) => (
              <Reveal key={project.slug} delay={index * 0.05}><WorkCard project={project} /></Reveal>
            ))}
          </div>
        </Container>
      </Section>

      <Section className="border-t border-white/10 bg-white/[0.02]">
        <Container>
          <Reveal>
            <div className="max-w-3xl">
              <Badge tone="ivory">Client case studies</Badge>
              <h2 className="mt-5 text-3xl font-semibold text-white sm:text-5xl">Published only with permission.</h2>
              <p className="mt-5 text-lg leading-8 text-white/62">
                Rukh Labs will publish real client work only when there is clear permission,
                verified source material, and an honest account of what the work included.
                Until then, the service demonstration is labeled fictional and the products
                are labeled as first-party work.
              </p>
            </div>
          </Reveal>
        </Container>
      </Section>
    </>
  );
}
