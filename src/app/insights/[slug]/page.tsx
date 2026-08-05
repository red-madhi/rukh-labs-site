import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArticleHeader } from "@/components/content/article-header";
import { ContentSection } from "@/components/content/content-section";
import { RelatedContent } from "@/components/content/related-content";
import { ServiceCTA } from "@/components/content/content-cta";
import { SourceList } from "@/components/content/source-list";
import { TableOfContents } from "@/components/content/table-of-contents";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { StructuredData } from "@/components/seo/structured-data";
import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import { getInsight, insights } from "@/lib/insights";
import { createPageMetadata, siteConfig } from "@/lib/site-config";

type PageProps = { params: Promise<{ slug: string }> };

export function generateStaticParams() { return insights.map((insight) => ({ slug: insight.slug })); }

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const insight = getInsight((await params).slug);
  if (!insight) return {};
  return createPageMetadata({
    title: insight.metaTitle,
    description: insight.description,
    path: `/insights/${insight.slug}`,
    image: { url: `/insights/${insight.slug}/opengraph-image`, width: 1200, height: 630, alt: insight.title },
    type: "article",
    publishedTime: insight.publishedOn,
    modifiedTime: insight.modifiedOn,
    authors: [siteConfig.name],
  });
}

export default async function InsightPage({ params }: PageProps) {
  const insight = getInsight((await params).slug);
  if (!insight) notFound();
  const path = `/insights/${insight.slug}`;
  const organization = {
    "@type": "Organization",
    "@id": `${siteConfig.url}/#organization`,
    name: siteConfig.name,
    url: `${siteConfig.url}/about`,
  };
  const structuredData = {
    "@context": "https://schema.org",
    "@type": insight.schemaType === "TechArticle" ? ["Article", "TechArticle"] : "Article",
    "@id": `${siteConfig.url}${path}#article`,
    headline: insight.title,
    description: insight.description,
    url: `${siteConfig.url}${path}`,
    datePublished: insight.publishedOn,
    dateModified: insight.modifiedOn,
    image: [`${siteConfig.url}/insights/${insight.slug}/opengraph-image`],
    inLanguage: "en-US",
    isPartOf: { "@id": `${siteConfig.url}/#website` },
    author: organization,
    publisher: organization,
    mainEntityOfPage: { "@type": "WebPage", "@id": `${siteConfig.url}${path}` },
  };

  return (
    <>
      <StructuredData data={structuredData} />
      <div className="border-b border-white/10 bg-black/15"><Container className="py-4"><Breadcrumbs items={[{ name: "Home", path: "/" }, { name: "Insights", path: "/insights" }, { name: insight.title, path }]} /></Container></div>
      <Section><Container><ArticleHeader category={insight.category} title={insight.title} summary={insight.summary} publishedOn={insight.publishedOn} modifiedOn={insight.modifiedOn} /></Container></Section>
      <Section className="border-t border-white/10 bg-white/[0.015]"><Container className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_17rem] lg:items-start"><article className="grid max-w-3xl gap-12">{insight.sections.map((section) => <ContentSection key={section.id} section={section} />)}<SourceList sources={insight.sources} /><RelatedContent links={insight.related} /><ServiceCTA cta={insight.cta} /></article><aside className="lg:sticky lg:top-24"><TableOfContents items={insight.sections.map(({ id, title }) => ({ id, title }))} /></aside></Container></Section>
    </>
  );
}
