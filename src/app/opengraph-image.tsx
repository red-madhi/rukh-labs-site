import { createSocialImage, socialImageContentType, socialImageSize } from "@/components/seo/social-image";

export const alt = "Rukh Labs custom websites, career portfolios, and software";
export const size = socialImageSize;
export const contentType = socialImageContentType;

export default function Image() {
  return createSocialImage({
    eyebrow: "Independent digital studio + software lab",
    title: "Custom websites. Career proof. Original software.",
    description: "Distinctive digital work built to be understood, remembered, and used.",
    accent: "#f0001c",
    glow: "rgba(240,0,28,0.32)",
  });
}
