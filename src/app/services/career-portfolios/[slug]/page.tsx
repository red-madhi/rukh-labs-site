import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FocusedServiceDetail } from "@/components/content/focused-service-detail";
import { getFocusedService, focusedServices } from "@/lib/focused-services";
import { createPageMetadata } from "@/lib/site-config";

type PageProps = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return focusedServices.filter((service) => service.parent === "career-portfolios").map((service) => ({ slug: service.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const service = getFocusedService("career-portfolios", (await params).slug);
  if (!service) return {};
  return createPageMetadata({ title: service.metaTitle, description: service.description, path: service.path, image: { url: `${service.path}/opengraph-image`, width: 1200, height: 630, alt: service.title } });
}

export default async function CareerPortfolioFocusedServicePage({ params }: PageProps) {
  const service = getFocusedService("career-portfolios", (await params).slug);
  if (!service) notFound();
  return <FocusedServiceDetail service={service} />;
}
