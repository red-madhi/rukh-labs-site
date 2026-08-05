import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { RelatedContent } from "@/components/content/related-content";
import { ServiceCTA } from "@/components/content/content-cta";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { StructuredData } from "@/components/seo/structured-data";
import { Badge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/ui/reveal";
import { Section } from "@/components/ui/section";
import type { FocusedService } from "@/lib/focused-services";
import { siteConfig } from "@/lib/site-config";

export function FocusedServiceDetail({ service }: { service: FocusedService }) {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Service",
    "@id": `${siteConfig.url}${service.path}#service`,
    name: service.title,
    serviceType: service.title,
    description: service.description,
    url: `${siteConfig.url}${service.path}`,
    provider: { "@type": "Organization", "@id": `${siteConfig.url}/#organization`, name: siteConfig.name, url: siteConfig.url, email: siteConfig.contactEmail },
    audience: { "@type": "Audience", audienceType: service.title.replace("Career Portfolios for ", "").replace("Website Design for ", "") },
  };

  return (
    <>
      <StructuredData data={structuredData} />
      <div className="border-b border-white/10 bg-black/15"><Container className="py-4"><Breadcrumbs items={[{ name: "Home", path: "/" }, { name: service.parentLabel, path: service.parentPath }, { name: service.title, path: service.path }]} /></Container></div>
      <section className="relative overflow-hidden border-b border-white/10"><div className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,#16c8ff_40%,#9a6dff_74%,transparent)]" /><Container className="py-16 sm:py-20 lg:py-24"><Reveal><div className="max-w-4xl"><Badge tone="blue">{service.eyebrow}</Badge><h1 className="mt-6 text-4xl font-semibold leading-[1.04] tracking-[-0.04em] text-white sm:text-6xl">{service.title}</h1><p className="mt-6 max-w-3xl text-lg leading-8 text-white/68 sm:text-xl">{service.summary}</p><div className="mt-8 flex flex-col gap-3 sm:flex-row"><Link href={service.cta.href} className={buttonStyles({ size: "lg" })}>{service.cta.label}<ArrowRight aria-hidden className="size-4" /></Link><Link href={service.parentPath} className={buttonStyles({ variant: "secondary", size: "lg" })}>View {service.parentLabel} packages</Link></div></div></Reveal></Container></section>
      <Section><Container><div className="grid gap-5 lg:grid-cols-3">{service.focus.map((item, index) => <Reveal key={item.title} delay={index * 0.05}><Card className="h-full p-6"><span className="text-sm font-semibold text-[#67e8f9]">0{index + 1}</span><h2 className="mt-5 text-xl font-semibold text-white">{item.title}</h2><p className="mt-3 text-sm leading-7 text-white/60">{item.copy}</p></Card></Reveal>)}</div></Container></Section>
      <Section className="border-y border-white/10 bg-white/[0.02]"><Container className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr]"><Reveal><div><Badge tone="gold">What the portfolio or site can hold</Badge><h2 className="mt-5 text-3xl font-semibold text-white sm:text-5xl">A structure built around the real work.</h2><p className="mt-5 text-lg leading-8 text-white/62">The aim is not a generic template with a different industry name. It is a clear system for the evidence, questions, and decisions this kind of work needs to carry.</p></div></Reveal><Reveal delay={0.08}><ul className="grid gap-4">{service.approach.map((item) => <li key={item} className="flex items-start gap-3 text-base leading-7 text-white/68"><Check aria-hidden className="mt-1 size-4 shrink-0 text-[#67e8f9]" />{item}</li>)}</ul></Reveal></Container></Section>
      <Section><Container className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_19rem]"><div><RelatedContent links={service.related} /><div className="mt-10"><ServiceCTA cta={service.cta} /></div></div><aside><Card className="p-6"><Badge tone="ivory">Pricing and scope</Badge><p className="mt-4 text-sm leading-7 text-white/62">{service.pricingNote}</p><Link href={`${service.parentPath}#packages`} className="mt-5 inline-flex text-sm font-semibold text-[#9feaff] underline-offset-4 hover:underline">View current packages</Link></Card></aside></Container></Section>
    </>
  );
}
