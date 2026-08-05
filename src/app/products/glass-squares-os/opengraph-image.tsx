import { createSocialImage, socialImageContentType, socialImageSize } from "@/components/seo/social-image";

export const alt = "Glass Squares OS low-bloat Linux desktop from Rukh Labs";
export const size = socialImageSize;
export const contentType = socialImageContentType;

export default function Image() {
  return createSocialImage({ eyebrow: "Linux desktop in development", title: "Glass Squares OS", description: "A low-bloat desktop direction built around glassy surfaces, square layouts, and user control.", accent: "#16c8ff", glow: "rgba(109,49,255,0.34)" });
}
