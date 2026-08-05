import { notFound } from "next/navigation";
import {
  createSocialImage,
  socialImageContentType,
  socialImageSize,
} from "@/components/seo/social-image";
import { designDirections, getDesignDirection } from "@/lib/web-development";

export const size = socialImageSize;
export const contentType = socialImageContentType;

export function generateStaticParams() {
  return designDirections.map((direction) => ({ slug: direction.slug }));
}

export default async function OpenGraphImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const direction = getDesignDirection((await params).slug);

  if (!direction) {
    notFound();
  }

  return createSocialImage({
    eyebrow: "Rukh Labs Website Studio",
    title: `${direction.name} website direction`,
    description: direction.summary,
    accent: "#f0001c",
    glow: "rgba(240,0,28,0.30)",
  });
}
