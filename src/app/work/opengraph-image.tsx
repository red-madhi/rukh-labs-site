import { createSocialImage, socialImageContentType, socialImageSize } from "@/components/seo/social-image";

export const size = socialImageSize;
export const contentType = socialImageContentType;

export default function OpenGraphImage() {
  return createSocialImage({
    eyebrow: "Rukh Labs Work",
    title: "Work with a clear source.",
    description: "First-party platform, product, and fictional service demonstration work.",
    accent: "#d6ad5b",
    glow: "rgba(214,173,91,0.25)",
  });
}
