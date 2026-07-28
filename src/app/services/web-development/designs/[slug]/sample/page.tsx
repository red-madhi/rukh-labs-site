import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FullSampleSite } from "@/components/services/web-development/samples/full-sample-site";
import { SampleSiteFrame } from "@/components/services/web-development/samples/sample-site-frame";
import { createPageMetadata } from "@/lib/site-config";
import { designDirections, getDesignDirection } from "@/lib/web-development";

type SampleWebsitePageProps = {
  params: Promise<{ slug: string }>;
};

export const dynamicParams = false;

export function generateStaticParams() {
  return designDirections.map((direction) => ({ slug: direction.slug }));
}

export async function generateMetadata({
  params,
}: SampleWebsitePageProps): Promise<Metadata> {
  const { slug } = await params;
  const direction = getDesignDirection(slug);

  if (!direction) {
    return {
      ...createPageMetadata({
        title: "Sample Website",
        description: "Explore a full sample website from Rukh Labs.",
        path: "/services/web-development",
      }),
      robots: { index: false, follow: true },
    };
  }

  return {
    ...createPageMetadata({
      title: `${direction.sampleName} — ${direction.name} Sample Website`,
      description: `${direction.sampleDescription} A fictional, interactive ${direction.name} website concept by Rukh Labs.`,
      path: direction.sampleHref,
    }),
    robots: { index: false, follow: true },
  };
}

export default async function SampleWebsitePage({
  params,
}: SampleWebsitePageProps) {
  const { slug } = await params;
  const direction = getDesignDirection(slug);

  if (!direction) {
    notFound();
  }

  return (
    <SampleSiteFrame direction={direction}>
      <FullSampleSite slug={direction.slug} />
    </SampleSiteFrame>
  );
}
