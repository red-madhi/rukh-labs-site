import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ContentSection } from "@/components/content/content-section";
import { ProductCTA, ServiceCTA } from "@/components/content/content-cta";
import { RelatedContent } from "@/components/content/related-content";
import { TableOfContents } from "@/components/content/table-of-contents";
import { WorkHeader } from "@/components/content/work-header";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { StructuredData } from "@/components/seo/structured-data";
import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import { createPageMetadata, siteConfig } from "@/lib/site-config";
import { getWorkProject, workProjects } from "@/lib/work";

type PageProps = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return workProjects.map((project) => ({ slug: project.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const project = getWorkProject((await params).slug);
  if (!project) return {};
  return createPageMetadata({
    title: project.metaTitle,
    description: project.description,
    path: `/work/${project.slug}`,
    image: { url: `/work/${project.slug}/opengraph-image`, width: 1200, height: 630, alt: project.title },
    type: "article",
    modifiedTime: "2026-08-05",
    authors: [siteConfig.name],
  });
}

export default async function WorkProjectPage({ params }: PageProps) {
  const project = getWorkProject((await params).slug);
  if (!project) notFound();

  const path = `/work/${project.slug}`;
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    "@id": `${siteConfig.url}${path}#work`,
    name: project.title,
    description: project.description,
    url: `${siteConfig.url}${path}`,
    author: { "@type": "Organization", "@id": `${siteConfig.url}/#organization`, name: siteConfig.name },
    publisher: { "@type": "Organization", "@id": `${siteConfig.url}/#organization`, name: siteConfig.name },
    dateModified: "2026-08-05",
    creativeWorkStatus: project.status,
  };

  return (
    <>
      <StructuredData data={structuredData} />
      <div className="border-b border-white/10 bg-black/15"><Container className="py-4"><Breadcrumbs items={[{ name: "Home", path: "/" }, { name: "Work", path: "/work" }, { name: project.title, path }]} /></Container></div>
      <Section><Container><WorkHeader projectType={project.projectType} status={project.status} title={project.title} summary={project.summary} /></Container></Section>
      <Section className="border-t border-white/10 bg-white/[0.015]"><Container className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_17rem] lg:items-start"><article className="grid max-w-3xl gap-12">{project.sections.map((section) => <ContentSection key={section.id} section={section} />)}<RelatedContent links={project.related} />{project.cta.variant === "product" ? <ProductCTA cta={project.cta} /> : <ServiceCTA cta={project.cta} />}</article><aside className="lg:sticky lg:top-24"><TableOfContents items={project.sections.map(({ id, title }) => ({ id, title }))} /></aside></Container></Section>
    </>
  );
}
