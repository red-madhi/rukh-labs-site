import type { Metadata } from "next";
import { AdvancedNetworkAccessGate } from "@/components/tools/advanced-network-access-gate";
import { IazmaGuardDashboard } from "@/components/tools/iazma-guard-dashboard";
import { hasAdvancedNetworkAccess } from "@/lib/advanced-network-access";

export const metadata: Metadata = {
  title: "IAZMA Guard | Rukh Labs",
  description: "Private Bluesky follower hygiene, spam review, inactivity cleanup, and IAZMA suppression.",
  robots: { index: false, follow: false },
};

export default async function IazmaGuardPage() {
  const allowed = await hasAdvancedNetworkAccess();
  return (
    <main className="min-h-screen bg-[#05070a] px-4 py-8 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-3 border-b border-white/10 pb-7">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#8ce8ff]">Rukh Labs / IAZMA</p>
          <h1 className="text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">Guard</h1>
          <p className="max-w-3xl text-sm leading-7 text-white/55">Clean the follower graph without guessing. Inactivity and strong bot/spam evidence can be surfaced automatically; political/content flags always show the public evidence for your review before a block.</p>
        </div>
        {allowed ? <IazmaGuardDashboard /> : <AdvancedNetworkAccessGate />}
      </div>
    </main>
  );
}
