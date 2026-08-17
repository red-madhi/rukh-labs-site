"use client";

import { useEffect, useState } from "react";
import { Orbit, Sparkles } from "lucide-react";
import {
  HelpPopover,
  PurposeBadge,
} from "@/components/tools/advanced-network-explain";
import { AdvancedNetworkExploreMapV4 } from "@/components/tools/advanced-network-explore-map-v4";
import { useAdvancedBlueskyOAuth } from "@/components/tools/advanced-network-oauth";
import type { StartingNetworkScope } from "@/lib/advanced-network";

function readScope(did: string): StartingNetworkScope {
  const saved = window.localStorage.getItem(`rukh:advanced-network:start-scope:${did}`);
  return saved === "mutuals-only" ? "mutuals-only" : "all-followers";
}

export function AdvancedNetworkExplorePanel() {
  const oauth = useAdvancedBlueskyOAuth();
  const [scope, setScope] = useState<StartingNetworkScope>("all-followers");
  const connected = oauth.phase === "connected" && Boolean(oauth.did);

  useEffect(() => {
    const did = oauth.did;
    if (!did) return;
    const frame = window.requestAnimationFrame(() => setScope(readScope(did)));

    const onScope = (event: Event) => {
      const custom = event as CustomEvent<{ did?: string; scope?: StartingNetworkScope }>;
      if (custom.detail?.did !== did) return;
      const next = custom.detail.scope;
      if (next === "all-followers" || next === "mutuals-only") setScope(next);
    };

    window.addEventListener("rukh:advanced-network:scope-change", onScope);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("rukh:advanced-network:scope-change", onScope);
    };
  }, [oauth.did]);

  if (!connected) return null;

  return (
    <section
      data-iazma-premium-map="true"
      className="relative min-w-0 max-w-full overflow-hidden rounded-[24px] border border-[#aa63ff]/24 bg-[radial-gradient(circle_at_8%_0%,rgba(22,200,255,0.12),transparent_30%),radial-gradient(circle_at_92%_4%,rgba(170,99,255,0.15),transparent_34%),linear-gradient(160deg,rgba(10,13,18,0.96),rgba(8,7,12,0.98))] shadow-[0_28px_90px_rgba(0,0,0,0.36),0_0_55px_rgba(170,99,255,0.045),inset_0_1px_0_rgba(255,255,255,0.045)]"
    >
      <div className="pointer-events-none absolute inset-x-[14%] top-0 h-32 bg-[#aa63ff]/[0.055] blur-3xl" aria-hidden />
      <div className="relative flex min-w-0 flex-col gap-5 border-b border-white/8 px-4 py-5 sm:px-7 sm:py-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <span className="relative grid size-12 shrink-0 place-items-center rounded-2xl border border-[#aa63ff]/30 bg-[radial-gradient(circle_at_35%_25%,rgba(216,181,255,0.2),transparent_55%),rgba(170,99,255,0.07)] text-[#d8b5ff] shadow-[0_0_30px_rgba(170,99,255,0.10)]">
            <Orbit className="size-6" aria-hidden />
            <span className="absolute -right-1 -top-1 size-3 rounded-full border-2 border-[#0b0b10] bg-emerald-300 shadow-[0_0_12px_rgba(110,231,183,0.7)]" aria-hidden />
          </span>
          <div className="min-w-0 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <PurposeBadge kind="insight" />
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#aa63ff]/20 bg-[#aa63ff]/[0.055] px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.13em] text-[#d8b5ff]">
                <Sparkles className="size-3" aria-hidden />
                Live map
              </span>
              <span className="rounded-full border border-emerald-300/15 bg-emerald-300/[0.045] px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.13em] text-emerald-200/80">
                Visible by default
              </span>
            </div>
            <h2 className="mt-3 break-words text-xl font-semibold tracking-[-0.025em] text-white sm:text-2xl">
              Your full network constellation
            </h2>
            <p className="mt-2 max-w-3xl text-[12px] leading-6 text-white/46 sm:text-sm sm:leading-6">
              Explore the real routes, bridges, destinations, and branches IAZMA can currently see. This is the structural view of your network; the Action Center remains the place for specific next moves.
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2 self-start lg:self-center">
          <span className="rounded-xl border border-white/9 bg-black/20 px-3 py-2 text-[10px] font-medium text-white/48">
            Pinch · zoom · drag · tap
          </span>
          <HelpPopover label="How to use the live map">
            Pinch or zoom to spread the map apart, drag to move around, and tap either a circle or its name to inspect that Bluesky account. The map is for understanding structure; recommendations and actions stay in the Action Center.
          </HelpPopover>
        </div>
      </div>

      <div className="relative min-w-0 max-w-full p-2 sm:p-4">
        <div className="rounded-[20px] bg-[linear-gradient(135deg,rgba(22,200,255,0.36),rgba(170,99,255,0.28),rgba(241,212,154,0.18))] p-px shadow-[0_18px_60px_rgba(0,0,0,0.34),0_0_42px_rgba(22,200,255,0.045)]">
          <div className="overflow-hidden rounded-[19px] bg-[#03060a]">
            <AdvancedNetworkExploreMapV4 scope={scope} targetHandles={[]} />
          </div>
        </div>
      </div>

      <div className="relative flex flex-col gap-2 border-t border-white/7 bg-black/10 px-4 py-4 text-[10px] leading-5 text-white/34 sm:flex-row sm:items-center sm:justify-between sm:px-7">
        <span>Every visible account and route comes from your live Bluesky graph data.</span>
        <span className="text-white/26">Map exploration is context, not an obligation to contact anyone.</span>
      </div>
    </section>
  );
}