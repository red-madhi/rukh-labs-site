import type { Metadata } from "next";
import { BlueskyNetworkModeExplorer } from "@/components/tools/bluesky-network-mode-explorer";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { StructuredData } from "@/components/seo/structured-data";
import { Badge } from "@/components/ui/badge";
import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import { createPageMetadata, siteConfig } from "@/lib/site-config";

export const metadata: Metadata = createPageMetadata({
  title: "Free Bluesky Network Explorer",
  description:
    "Analyze Bluesky through followers or accounts followed, rank people by network overlap and reach, and optionally sign in to follow discoveries inside the tool.",
  path: "/tools/bluesky-network",
  image: {
    url: "/opengraph-image",
    width: 1200,
    height: 630,
    alt: "Rukh Labs Bluesky Network Explorer",
  },
  keywords: [
    "Bluesky network explorer",
    "Bluesky follower analysis",
    "Bluesky following analysis",
    "AT Protocol tool",
    "Bluesky discovery tool",
    "social graph analysis",
  ],
});

export default function BlueskyNetworkPage() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "@id": `${siteConfig.url}/tools/bluesky-network#application`,
    name: "Bluesky Network Explorer",
    applicationCategory: "UtilitiesApplication",
    operatingSystem: "Any",
    url: `${siteConfig.url}/tools/bluesky-network`,
    description:
      "A free browser-based tool that analyzes public Bluesky follower or following connections, ranks second-degree accounts by network overlap and follower reach, and offers optional OAuth follow actions.",
    provider: {
      "@type": "Organization",
      "@id": `${siteConfig.url}/#organization`,
      name: siteConfig.name,
    },
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    featureList: [
      "Public Bluesky follower graph scanning",
      "Public Bluesky following graph scanning",
      "People-to-follow recommendations",
      "Network overlap ranking",
      "Follower reach ranking",
      "Local resumable scans",
      "CSV export",
      "Optional Bluesky OAuth follow actions",
    ],
  };

  return (
    <>
      <StructuredData data={structuredData} />
      <div className="border-b border-white/10 bg-black/15">
        <Container className="py-4">
          <Breadcrumbs
            items={[
              { name: "Home", path: "/" },
              { name: "Products", path: "/products" },
              {
                name: "Bluesky Network Explorer",
                path: "/tools/bluesky-network",
              },
            ]}
          />
        </Container>
      </div>

      <Section className="relative overflow-hidden border-b border-white/10">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,#f0001c_35%,#16c8ff_65%,transparent)]" />
        <Container>
          <div className="max-w-5xl">
            <Badge tone="blue">Free · Public scans · Optional sign-in</Badge>
            <h1 className="mt-6 text-4xl font-semibold leading-[1.02] tracking-[-0.045em] text-white sm:text-6xl lg:text-7xl">
              Find the accounts your network already knows.
            </h1>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-white/68 sm:text-xl">
              Choose followers to see who your audience already knows, or choose
              following to use the accounts you deliberately follow as human
              curators. Then rank people by overlap, shared connections, and
              public reach.
            </p>
            <div className="mt-8 grid gap-3 text-sm text-white/54 sm:grid-cols-3">
              <span className="rounded-xl border border-white/10 bg-white/[0.025] px-4 py-3">
                Followers or following graph
              </span>
              <span className="rounded-xl border border-white/10 bg-white/[0.025] px-4 py-3">
                Scan progress stays in your browser
              </span>
              <span className="rounded-xl border border-white/10 bg-white/[0.025] px-4 py-3">
                Optional sign-in for in-tool follows
              </span>
            </div>
          </div>
        </Container>
      </Section>

      <Section className="bg-white/[0.012]">
        <Container>
          <BlueskyNetworkModeExplorer />
        </Container>
      </Section>

      <Section className="border-t border-white/10">
        <Container className="max-w-4xl">
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 text-sm leading-7 text-white/54 sm:p-7">
            <p className="font-semibold text-white">
              Important limits and affiliation
            </p>
            <p className="mt-3">
              Full social graphs can be extremely large. Quick and Balanced
              modes intentionally sample the selected source graph; Complete
              Graph mode may take substantial browser time and public API
              traffic. Percentages always use the number of source accounts
              successfully scanned, which is shown beside the results.
            </p>
            <p className="mt-3">
              This tool recommends accounts, not posts. Follow relationships are
              useful for people-to-follow discovery, while likes and activity
              would usually be better signals for ranking individual posts.
            </p>
            <p className="mt-3">
              Rukh Labs is not affiliated with Bluesky Social PBC. Public scans
              require no login. Optional OAuth sign-in is used only when you
              choose to follow an account inside the tool; Rukh Labs never asks
              for your Bluesky password, and the tool does not perform bulk
              follows.
            </p>
          </div>
        </Container>
      </Section>
    </>
  );
}
