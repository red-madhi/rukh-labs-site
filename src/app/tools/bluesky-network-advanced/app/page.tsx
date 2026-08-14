import type { Metadata } from "next";
import Link from "next/link";
import { AdvancedNetworkAccessGate } from "@/components/tools/advanced-network-access-gate";
import { AdvancedNetworkDashboard } from "@/components/tools/advanced-network-dashboard";
import { AdvancedBlueskyOAuthProvider } from "@/components/tools/advanced-network-oauth";
import { AdvancedNetworkStartingScope } from "@/components/tools/advanced-network-starting-scope";
import { buttonStyles } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import { hasAdvancedNetworkAccess } from "@/lib/advanced-network-access";

export const metadata: Metadata = {
  title: "Advanced Bluesky Network Workspace | Rukh Labs",
  robots: { index: false, follow: false },
};

export default async function AdvancedNetworkAppPage() {
  const authorized = await hasAdvancedNetworkAccess();
  if (!authorized) {
    return (
      <Section>
        <Container>
          <div className="mb-8">
            <Link
              href="/tools/bluesky-network-advanced"
              className={buttonStyles({
                variant: "ghost",
                size: "sm",
                className: "px-0",
              })}
            >
              ← Advanced Network overview
            </Link>
          </div>
          <AdvancedNetworkAccessGate />
        </Container>
      </Section>
    );
  }

  return (
    <AdvancedBlueskyOAuthProvider>
      <Section className="border-b border-white/10">
        <Container>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8ce8ff]">
            Advanced Bluesky Network
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-[-0.04em] text-white sm:text-5xl">
            Network growth workspace
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-white/54">
            Private beta shell for target campaigns, cost-aware reconnaissance,
            persistent follow-back intelligence, dynamic importance scoring, and
            before/after network maps.
          </p>
        </Container>
      </Section>
      <Section>
        <Container>
          <div className="grid gap-6">
            <AdvancedNetworkStartingScope />
            <AdvancedNetworkDashboard />
          </div>
        </Container>
      </Section>
    </AdvancedBlueskyOAuthProvider>
  );
}
