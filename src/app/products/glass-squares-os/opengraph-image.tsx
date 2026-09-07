import { createSocialImage, socialImageContentType, socialImageSize } from "@/components/seo/social-image";

export const alt = "Glass Squares OS: a more human Linux desktop in development";
export const size = socialImageSize;
export const contentType = socialImageContentType;

export default function Image() {
  return createSocialImage({ eyebrow: "Linux desktop in development", title: "Glass Squares OS", description: "A more human computer. First desktop milestone passed in VM testing. Public release still ahead.", accent: "#70dafa", glow: "rgba(240,197,142,0.23)" });
}
