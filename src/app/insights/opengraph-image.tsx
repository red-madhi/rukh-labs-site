import { createSocialImage, socialImageContentType, socialImageSize } from "@/components/seo/social-image";

export const size = socialImageSize;
export const contentType = socialImageContentType;

export default function OpenGraphImage() {
  return createSocialImage({ eyebrow: "Rukh Labs Insights", title: "Useful guidance. Clearer decisions.", description: "Practical resources on websites, career portfolios, privacy, and proof.", accent: "#16c8ff", glow: "rgba(22,200,255,0.24)" });
}
