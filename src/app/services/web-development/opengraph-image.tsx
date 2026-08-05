import { createSocialImage, socialImageContentType, socialImageSize } from "@/components/seo/social-image";

export const alt = "Custom website design and development by Rukh Labs";
export const size = socialImageSize;
export const contentType = socialImageContentType;

export default function Image() {
  return createSocialImage({ eyebrow: "Website studio", title: "Custom Website Design", description: "Distinctive websites for businesses, products, creators, and organizations.", accent: "#ff5364", glow: "rgba(240,0,28,0.34)" });
}
