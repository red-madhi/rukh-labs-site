import { notFound } from "next/navigation";
import { createSocialImage, socialImageContentType, socialImageSize } from "@/components/seo/social-image";
import { getWorkProject, workProjects } from "@/lib/work";

export const size = socialImageSize;
export const contentType = socialImageContentType;

export function generateStaticParams() { return workProjects.map((project) => ({ slug: project.slug })); }

export default async function OpenGraphImage({ params }: { params: Promise<{ slug: string }> }) {
  const project = getWorkProject((await params).slug);
  if (!project) notFound();
  return createSocialImage({ eyebrow: project.projectType, title: project.title, description: project.summary, accent: "#d6ad5b", glow: "rgba(214,173,91,0.24)" });
}
