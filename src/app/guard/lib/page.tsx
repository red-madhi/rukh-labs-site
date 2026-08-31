import type { Metadata } from "next";
import { AdvancedNetworkAccessGate } from "@/components/tools/advanced-network-access-gate";
import { IazmaLibGuardDashboard } from "@/components/tools/iazma-lib-guard-dashboard";
import { hasAdvancedNetworkAccess } from "@/lib/advanced-network-access";

export const metadata: Metadata = {
  title: "Lib Guard | IAZMA | Rukh Labs",
  description: "Private Bluesky feed hygiene with IAZMA network-value scoring, bulk mute, and bulk unfollow controls.",
  robots: { index: false, follow: false },
};

export default async function IazmaLibGuardPage() {
  const allowed = await hasAdvancedNetworkAccess();
  return (
    <main className="min-h-screen bg-[#05070a] px-4 py-8 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-3 border-b border-white/10 pb-7">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#8ce8ff]">Rukh Labs / IAZMA / Guard</p>
          <h1 className="text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">Lib Guard</h1>
          <p className="max-w-4xl text-sm leading-7 text-white/55">
            Feed hygiene without sacrificing useful network edges. Rank accounts you follow by observable posting patterns and IAZMA relationship value, then mute or unfollow them individually or in bulk.
          </p>
        </div>
        {allowed ? <IazmaLibGuardDashboard /> : <AdvancedNetworkAccessGate />}
      </div>
    </main>
  );
}
