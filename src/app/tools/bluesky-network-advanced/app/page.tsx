import type { Metadata } from "next";
import Link from "next/link";
import { AdvancedNetworkAccessGate } from "@/components/tools/advanced-network-access-gate";
import { AdvancedNetworkDashboard } from "@/components/tools/advanced-network-dashboard";
import { AdvancedNetworkExplorePanel } from "@/components/tools/advanced-network-explore-panel";
import { AdvancedNetworkFitPanel } from "@/components/tools/advanced-network-fit-panel";
import { AdvancedNetworkGoal } from "@/components/tools/advanced-network-goal";
import { AdvancedNetworkPeopleGuide } from "@/components/tools/advanced-network-people-guide";
import { AdvancedNetworkProgress } from "@/components/tools/advanced-network-progress";
import { AdvancedNetworkStrategyPanel } from "@/components/tools/advanced-network-strategy-panel";
import { AdvancedNetworkTerms } from "@/components/tools/advanced-network-terms";
import { AdvancedNetworkUsabilityEnhancer } from "@/components/tools/advanced-network-usability-enhancer";
import { AdvancedBlueskyOAuthProvider } from "@/components/tools/advanced-network-oauth";
import { AdvancedNetworkStartingScope } from "@/components/tools/advanced-network-starting-scope";
import { buttonStyles } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import { hasAdvancedNetworkAccess } from "@/lib/advanced-network-access";

export const metadata: Metadata = {
  title: "IAZMA PRO | Rukh Labs",
  robots: { index: false, follow: false },
};

export default async function AdvancedNetworkAppPage() {
  const authorized = await hasAdvancedNetworkAccess();
  if (!authorized) {
    return (
      <Section className="overflow-x-clip">
        <Container className="min-w-0 max-w-full px-4 sm:px-6 lg:px-8">
          <div className="mb-8 min-w-0">
            <Link
              href="/tools/bluesky-network-advanced"
              className={buttonStyles({
                variant: "ghost",
                size: "sm",
                className: "px-0",
              })}
            >
              ← IAZMA PRO overview
            </Link>
          </div>
          <AdvancedNetworkAccessGate />
        </Container>
      </Section>
    );
  }

  return (
    <AdvancedBlueskyOAuthProvider>
      <Section className="overflow-x-clip border-b border-white/10 py-14 sm:py-20">
        <Container className="min-w-0 max-w-full px-4 sm:px-6 lg:px-8">
          <div className="min-w-0 max-w-full">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8ce8ff]">
              IAZMA PRO
            </p>
            <h1 className="mt-3 break-words text-4xl font-semibold tracking-[-0.04em] text-white sm:text-5xl">
              Network growth workspace
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-white/54">
              Build several genuine, independent relationships toward the communities and accounts that matter. The evidence-weighted engine separates mathematical paths from active, activated, and converted relationships before it expands into round two.
            </p>
          </div>
        </Container>
      </Section>
      <Section className="overflow-x-clip py-12 sm:py-20">
        <Container className="min-w-0 max-w-full px-4 sm:px-6 lg:px-8">
          <div
            id="iazma-pro-workspace"
            className="grid min-w-0 max-w-full gap-6 [&>*]:min-w-0 [&>*]:max-w-full"
          >
            <AdvancedNetworkUsabilityEnhancer />
            <AdvancedNetworkStartingScope />
            <AdvancedNetworkGoal />
            <AdvancedNetworkProgress />
            <AdvancedNetworkPeopleGuide />
            <AdvancedNetworkDashboard />
            <AdvancedNetworkStrategyPanel />
            <AdvancedNetworkFitPanel />
            <AdvancedNetworkExplorePanel />
            <AdvancedNetworkTerms />
          </div>
        </Container>
      </Section>
    </AdvancedBlueskyOAuthProvider>
  );
}
