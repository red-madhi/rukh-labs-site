import { createSocialImage, socialImageContentType, socialImageSize } from "@/components/seo/social-image";

export const size = socialImageSize;
export const contentType = socialImageContentType;

export default function OpenGraphImage() { return createSocialImage({ eyebrow: "Rukh Labs Tool", title: "Website project brief generator", description: "Organize scope before you request a proposal.", accent: "#16c8ff", glow: "rgba(22,200,255,0.24)" }); }
