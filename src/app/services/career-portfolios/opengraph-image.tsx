import { createSocialImage, socialImageContentType, socialImageSize } from "@/components/seo/social-image";

export const alt = "Career portfolio websites for analysts and technical professionals";
export const size = socialImageSize;
export const contentType = socialImageContentType;

export default function Image() {
  return createSocialImage({ eyebrow: "Career portfolio studio", title: "Turn experience into visible proof.", description: "Recruiter-ready portfolio websites for analysts and technical professionals.", accent: "#67e8f9", glow: "rgba(22,200,255,0.3)" });
}
