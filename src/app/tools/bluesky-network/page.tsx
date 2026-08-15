import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { BlueskyNetworkModeExplorer } from "@/components/tools/bluesky-network-mode-explorer";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { StructuredData } from "@/components/seo/structured-data";
import { Badge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
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

            <div className="mt-7 flex max-w-4xl flex-col gap-4 rounded-2xl border border-[#aa63ff]/22 bg-[radial-gradient(circle_at_100%_0%,rgba(170,99,255,0.13),transparent_42%),rgba(170,99,255,0.035)] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="gold">Advanced Network</Badge>
                  <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-white/35">Persistent strategy workspace</span>
                </div>
                <p className="mt-2 text-sm font-semibold text-white">Want the tool to tell you who to cultivate next?</p>
                <p className="mt-1 text-xs leading-5 text-white/48">
                  Open the Advanced Network app for bridge strategy, follow-back tracking, evidence-weighted paths, action suggestions, network levels, and visual maps.
                </p>
              </div>
              <Link
                href="/tools/bluesky-network-advanced/app"
                className={buttonStyles({ variant: "glass", size: "sm", className: "shrink-0 justify-center" })}
              >
                Open Advanced Network
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            </div>

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

      <Section className="border-t border-[#16c8ff]/15 bg-[radial-gradient(circle_at_90%_10%,rgba(22,200,255,0.09),transparent_35%),rgba(255,255,255,0.008)]">
        <Container className="max-w-5xl">
          <div className="flex flex-col gap-6 rounded-2xl border border-[#16c8ff]/20 bg-black/15 p-6 sm:p-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-3xl">
              <Badge tone="gold">Advanced · Private beta</Badge>
              <h2 className="mt-4 text-2xl font-semibold text-white sm:text-3xl">
                Want the tool to remember the network and tell you where to go next?
              </h2>
              <p className="mt-3 text-sm leading-7 text-white/56">
                Advanced Network adds persistent follow-back tracking, reciprocal
                path analysis, bridge and bestie discovery, targeted influential
                communities, historical network maps, and dynamic importance
                rankings.
              </p>
            </div>
            <Link
              href="/tools/bluesky-network-advanced/app"
              className={buttonStyles({ variant: "glass", size: "lg", className: "shrink-0" })}
            >
              Open Advanced Network
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>
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
