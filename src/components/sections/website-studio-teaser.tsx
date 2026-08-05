import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { DesignPreview } from "@/components/services/web-development/design-preview";
import { FictionalDemoDisclosure } from "@/components/services/web-development/fictional-demo-disclosure";
import { Badge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/ui/reveal";
import { Section } from "@/components/ui/section";
import { designDirections, websitePackages } from "@/lib/web-development";

export function WebsiteStudioTeaser() {
  return (
    <Section className="border-y border-[color:var(--brand-red)]/16 bg-[linear-gradient(180deg,rgba(240,0,28,0.025),rgba(255,255,255,0.018))]">
      <Container>
        <Reveal>
          <div className="grid gap-7 lg:grid-cols-[1fr_auto] lg:items-end">
            <div className="max-w-3xl">
              <Badge tone="red">Rukh Labs Website Studio</Badge>
              <h2 className="mt-5 text-3xl font-semibold text-white sm:text-5xl">
                Websites designed to look intentional.
              </h2>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-white/64">
                The same care behind Glass Squares OS and Farzin, applied to
                distinctive websites for businesses, products, creators, and
                organizations.
              </p>
            </div>
            <Link
              href="/services/web-development"
              className={buttonStyles({
                variant: "secondary",
                size: "lg",
                className: "justify-self-start lg:justify-self-end",
              })}
            >
              Explore Web Development
              <ArrowRight aria-hidden className="size-4" />
            </Link>
          </div>
        </Reveal>

        <div className="mt-9 grid gap-px overflow-hidden rounded-xl border border-white/10 bg-white/10 md:grid-cols-3">
          {websitePackages.map((websitePackage, index) => (
            <Reveal key={websitePackage.id} delay={index * 0.05}>
              <div className="h-full bg-[#09080a] p-5">
                <div className="flex items-baseline justify-between gap-4">
                  <h3 className="font-semibold text-white">{websitePackage.name}</h3>
                  <span className="shrink-0 text-sm font-semibold text-[#ffb4b8]">
                    {websitePackage.price}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-6 text-white/52">
                  {websitePackage.bestFor}
                </p>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal delay={0.08}>
          <>
            <FictionalDemoDisclosure className="mt-8" />
            <div className="mt-5 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-4 lg:grid lg:grid-cols-3 lg:overflow-visible lg:pb-0 xl:grid-cols-6">
              {designDirections.map((direction) => (
                <Link
                  key={direction.slug}
                  href={direction.href}
                  aria-label={`Explore the ${direction.name} website direction`}
                  className="group w-[78vw] max-w-sm shrink-0 snap-start rounded-[1.25rem] border border-white/10 bg-white/[0.025] p-2 transition hover:-translate-y-1 hover:border-[color:var(--brand-red)]/38 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[color:var(--brand-red)] lg:w-auto lg:max-w-none"
                >
                  <div aria-hidden="true">
                    <DesignPreview slug={direction.slug} size="mini" />
                  </div>
                  <div className="flex items-center justify-between gap-3 px-2 pb-1 pt-3">
                    <span className="text-sm font-semibold text-white">{direction.name}</span>
                    <ArrowRight
                      aria-hidden
                      className="size-4 text-white/40 transition group-hover:translate-x-0.5 group-hover:text-[#ffb4b8]"
                    />
                  </div>
                </Link>
              ))}
            </div>
          </>
        </Reveal>
      </Container>
    </Section>
  );
}
