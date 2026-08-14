"use client";

import { useEffect, useState } from "react";
import { Orbit } from "lucide-react";
import { AdvancedNetworkExploreMap } from "@/components/tools/advanced-network-explore-map";
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
    if (!oauth.did) return;
    setScope(readScope(oauth.did));

    const onScope = (event: Event) => {
      const custom = event as CustomEvent<{ did?: string; scope?: StartingNetworkScope }>;
      if (custom.detail?.did !== oauth.did) return;
      const next = custom.detail.scope;
      if (next === "all-followers" || next === "mutuals-only") setScope(next);
    };

    window.addEventListener("rukh:advanced-network:scope-change", onScope);
    return () => window.removeEventListener("rukh:advanced-network:scope-change", onScope);
  }, [oauth.did]);

  if (!connected) return null;

  return (
    <details className="overflow-hidden rounded-2xl border border-[#aa63ff]/16 bg-[radial-gradient(circle_at_50%_0%,rgba(170,99,255,0.08),transparent_35%),rgba(255,255,255,0.012)]">
      <summary className="group flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-5 sm:px-7">
        <span className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl border border-[#aa63ff]/18 bg-[#aa63ff]/[0.05] text-[#d8b5ff]">
            <Orbit className="size-5 transition group-hover:rotate-12" aria-hidden />
          </span>
          <span>
            <span className="block text-sm font-semibold text-white">Explore the full network map</span>
            <span className="mt-1 block text-[11px] leading-5 text-white/36">
              Zoom out for the constellation. Zoom in for individual nodes, labels, bridges, peer links, and destination paths.
            </span>
          </span>
        </span>
        <span className="rounded-full border border-[#aa63ff]/15 bg-[#aa63ff]/[0.035] px-3 py-1.5 text-[10px] font-semibold text-[#d8b5ff]">
          Open visual map ✦
        </span>
      </summary>

      <div className="border-t border-white/8 p-3 sm:p-4">
        <AdvancedNetworkExploreMap scope={scope} targetHandles={[]} />
      </div>
    </details>
  );
}
