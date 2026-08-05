import { notFound } from "next/navigation";
import { createSocialImage, socialImageContentType, socialImageSize } from "@/components/seo/social-image";
import { getInsight, insights } from "@/lib/insights";

export const size = socialImageSize;
export const contentType = socialImageContentType;

export function generateStaticParams() { return insights.map((insight) => ({ slug: insight.slug })); }

export default async function OpenGraphImage({ params }: { params: Promise<{ slug: string }> }) {
  const insight = getInsight((await params).slug);
  if (!insight) notFound();
  return createSocialImage({ eyebrow: insight.category, title: insight.title, description: insight.summary, accent: "#16c8ff", glow: "rgba(22,200,255,0.24)" });
}
