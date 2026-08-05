import { createSocialImage, socialImageContentType, socialImageSize } from "@/components/seo/social-image";

export const alt = "Farzin focused chess training application for Android";
export const size = socialImageSize;
export const contentType = socialImageContentType;

export default function Image() {
  return createSocialImage({ eyebrow: "Android chess training", title: "Farzin", description: "Focused game review, opening preparation, tactical training, and progress tracking.", accent: "#f4bd43", glow: "rgba(244,189,67,0.32)" });
}
