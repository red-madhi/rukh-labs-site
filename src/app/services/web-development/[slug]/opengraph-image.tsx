import { notFound } from "next/navigation";
import { createSocialImage, socialImageContentType, socialImageSize } from "@/components/seo/social-image";
import { focusedServices, getFocusedService } from "@/lib/focused-services";

export const size = socialImageSize;
export const contentType = socialImageContentType;

export function generateStaticParams() { return focusedServices.filter((service) => service.parent === "web-development").map((service) => ({ slug: service.slug })); }

export default async function OpenGraphImage({ params }: { params: Promise<{ slug: string }> }) {
  const service = getFocusedService("web-development", (await params).slug);
  if (!service) notFound();
  return createSocialImage({ eyebrow: "Rukh Labs Websites", title: service.title, description: service.summary, accent: "#16c8ff", glow: "rgba(22,200,255,0.24)" });
}
