import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FocusedServiceDetail } from "@/components/content/focused-service-detail";
import { getFocusedService, focusedServices } from "@/lib/focused-services";
import { createPageMetadata } from "@/lib/site-config";

type PageProps = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return focusedServices.filter((service) => service.parent === "web-development").map((service) => ({ slug: service.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const service = getFocusedService("web-development", (await params).slug);
  if (!service) return {};
  return createPageMetadata({ title: service.metaTitle, description: service.description, path: service.path, image: { url: `${service.path}/opengraph-image`, width: 1200, height: 630, alt: service.title } });
}

export default async function WebsiteFocusedServicePage({ params }: PageProps) {
  const service = getFocusedService("web-development", (await params).slug);
  if (!service) notFound();
  return <FocusedServiceDetail service={service} />;
}
