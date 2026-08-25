import type { Metadata } from "next";
import Link from "next/link";
import { AdvancedNetworkAccessGate } from "@/components/tools/advanced-network-access-gate";
import { AdvancedNetworkFollowerSources } from "@/components/tools/advanced-network-follower-sources";
import { buttonStyles } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import { hasAdvancedNetworkAccess } from "@/lib/advanced-network-access";

export const metadata: Metadata = {
  title: "Follower Sources | IAZMA PRO",
  robots: { index: false, follow: false, noarchive: true, nosnippet: true },
};

export default async function FollowerSourcesPage() {
  const authorized = await hasAdvancedNetworkAccess();

  if (!authorized) {
    return (
      <Section className="overflow-x-clip py-12 sm:py-16">
        <Container className="min-w-0 max-w-full px-4 sm:px-6 lg:px-8">
          <AdvancedNetworkAccessGate />
        </Container>
      </Section>
    );
  }

  return (
    <>
      <Section className="relative overflow-x-clip border-b border-white/10 py-12 sm:py-16">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_82%_18%,rgba(22,200,255,0.12),transparent_34%),radial-gradient(circle_at_12%_85%,rgba(230,189,115,0.07),transparent_32%)]" />
        <Container className="relative min-w-0 max-w-full px-4 sm:px-6 lg:px-8">
          <Link
            href="/tools/bluesky-network-advanced/app"
            className={buttonStyles({ variant: "ghost", size: "sm", className: "px-0" })}
          >
            ← IAZMA PRO
          </Link>
          <p className="mt-8 text-xs font-semibold uppercase tracking-[0.14em] text-[#8ce8ff]">
            IAZMA PRO · Follower Sources
          </p>
          <h1 className="mt-3 max-w-4xl text-4xl font-semibold tracking-[-0.04em] text-white sm:text-5xl">
            Stop guessing what made people follow you.
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-white/54">
            IAZMA captures follow events, preserves exact Starter Pack attribution when Bluesky exposes it, and reconstructs other likely acquisition paths from public interaction and relationship evidence.
          </p>
        </Container>
      </Section>

      <Section className="overflow-x-clip py-10 sm:py-14">
        <Container className="min-w-0 max-w-full px-4 sm:px-6 lg:px-8">
          <AdvancedNetworkFollowerSources />
        </Container>
      </Section>
    </>
  );
}
