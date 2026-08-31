import type { Metadata } from "next";
import Link from "next/link";
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
        <div className="mb-8 flex flex-col gap-4 border-b border-white/10 pb-7">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#8ce8ff]">Rukh Labs / IAZMA</p>
            <h1 className="mt-3 text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">Guard</h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-white/55">Clean the follower graph without guessing. Inactivity and strong bot/spam evidence can be surfaced automatically; political/content flags always show the public evidence for your review before a block.</p>
          </div>
          {allowed ? <div>
            <Link href="/guard/lib" className="inline-flex items-center rounded-xl border border-[#16c8ff]/30 bg-[#16c8ff]/10 px-4 py-2.5 text-sm font-semibold text-[#b8f2ff] transition hover:border-[#16c8ff]/50 hover:bg-[#16c8ff]/15">
              Open Lib Guard →
            </Link>
            <p className="mt-2 text-xs text-white/35">Rank accounts you follow by feed saturation + IAZMA network value, then mass mute or mass unfollow.</p>
          </div> : null}
        </div>
        {allowed ? <IazmaGuardDashboard /> : <AdvancedNetworkAccessGate />}
      </div>
    </main>
  );
}
