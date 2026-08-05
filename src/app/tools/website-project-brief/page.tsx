import type { Metadata } from "next";
import { WebsiteProjectBriefForm } from "@/components/tools/website-project-brief-form";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { StructuredData } from "@/components/seo/structured-data";
import { Badge } from "@/components/ui/badge";
import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import { createPageMetadata, siteConfig } from "@/lib/site-config";

export const metadata: Metadata = createPageMetadata({
  title: "Website Project Brief Generator",
  description: "Create, copy, download, or print a private browser-based website project brief before requesting a proposal.",
  path: "/tools/website-project-brief",
  image: { url: "/tools/website-project-brief/opengraph-image", width: 1200, height: 630, alt: "Website project brief generator" },
});

export default function WebsiteProjectBriefPage() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "@id": `${siteConfig.url}/tools/website-project-brief#application`,
    name: "Website Project Brief Generator",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Any",
    url: `${siteConfig.url}/tools/website-project-brief`,
    description: "A browser-based tool for creating a website project brief without submitting the entered text to Rukh Labs.",
    provider: { "@type": "Organization", "@id": `${siteConfig.url}/#organization`, name: siteConfig.name },
  };

  return <><StructuredData data={structuredData} /><div className="border-b border-white/10 bg-black/15"><Container className="py-4"><Breadcrumbs items={[{ name: "Home", path: "/" }, { name: "Website project brief generator", path: "/tools/website-project-brief" }]} /></Container></div><Section><Container><div className="max-w-4xl"><Badge tone="blue">Free planning tool</Badge><h1 className="mt-6 text-4xl font-semibold leading-[1.04] tracking-[-0.04em] text-white sm:text-6xl">Create a website project brief before you ask for a quote.</h1><p className="mt-6 max-w-3xl text-lg leading-8 text-white/68 sm:text-xl">A project brief gives your goals, audience, pages, functionality, timing, and constraints a clearer starting point. This tool works in your browser and does not submit your responses to Rukh Labs.</p></div></Container></Section><Section className="border-t border-white/10 bg-white/[0.015]"><Container><WebsiteProjectBriefForm /></Container></Section></>;
}
