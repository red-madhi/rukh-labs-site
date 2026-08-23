import type { Metadata } from "next";
import Link from "next/link";
import { IazmaBrandArt } from "@/components/brand/iazma-brand-art";
import { AdvancedNetworkAccessGate } from "@/components/tools/advanced-network-access-gate";
import { AdvancedNetworkAutoDm } from "@/components/tools/advanced-network-auto-dm";
import { AdvancedNetworkDashboard } from "@/components/tools/advanced-network-dashboard";
import { AdvancedNetworkExplorePanel } from "@/components/tools/advanced-network-explore-panel";
import { AdvancedNetworkFitPanel } from "@/components/tools/advanced-network-fit-panel";
import { AdvancedNetworkGoal } from "@/components/tools/advanced-network-goal";
import { AdvancedNetworkLearningSystem } from "@/components/tools/advanced-network-learning-system";
import { AdvancedNetworkProgress } from "@/components/tools/advanced-network-progress";
import { AdvancedNetworkStrategyPanel } from "@/components/tools/advanced-network-strategy-panel";
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
          <div className="mb-8 grid min-w-0 gap-6 lg:grid-cols-[1fr_18rem] lg:items-center">
            <div>
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
            <IazmaBrandArt variant="compact" className="max-w-[18rem]" />
          </div>
          <AdvancedNetworkAccessGate />
        </Container>
      </Section>
    );
  }

  return (
    <AdvancedBlueskyOAuthProvider>
      <Section className="relative overflow-x-clip border-b border-white/10 py-14 sm:py-20">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_82%_18%,rgba(22,200,255,0.11),transparent_34%)]" />
        <Container className="relative min-w-0 max-w-full px-4 sm:px-6 lg:px-8">
          <div className="grid min-w-0 max-w-full gap-8 lg:grid-cols-[1fr_20rem] lg:items-center">
            <div className="min-w-0 max-w-full">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8ce8ff]">
                IAZMA PRO
              </p>
              <h1 className="mt-3 max-w-5xl break-words text-4xl font-semibold tracking-[-0.04em] text-white sm:text-5xl">
                See the hidden routes already inside your Bluesky network.
              </h1>
              <p className="mt-4 max-w-3xl text-base leading-7 text-white/54">
                IAZMA starts with people already connected to you, traces the strongest public relationship routes toward larger accounts and communities, and turns those routes into a short list of reachable people worth checking. Genuine new connections create new branches for the next round of discovery.
              </p>
            </div>
            <IazmaBrandArt variant="compact" className="w-full max-w-[20rem] lg:justify-self-end" />
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
            <AdvancedNetworkLearningSystem />
            <AdvancedNetworkStartingScope />
            <AdvancedNetworkGoal />
            <AdvancedNetworkProgress />
            <AdvancedNetworkAutoDm />
            <AdvancedNetworkExplorePanel />
            <AdvancedNetworkDashboard />
            <AdvancedNetworkStrategyPanel />
            <AdvancedNetworkFitPanel />
          </div>
        </Container>
      </Section>
    </AdvancedBlueskyOAuthProvider>
  );
}
