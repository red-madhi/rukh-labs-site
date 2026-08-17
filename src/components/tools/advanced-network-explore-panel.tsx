"use client";

import { useEffect, useState } from "react";
import { Orbit } from "lucide-react";
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
    if (!oauth.did) return;
    const frame = window.requestAnimationFrame(() => setScope(readScope(oauth.did)));

    const onScope = (event: Event) => {
      const custom = event as CustomEvent<{ did?: string; scope?: StartingNetworkScope }>;
      if (custom.detail?.did !== oauth.did) return;
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
    <details className="min-w-0 max-w-full overflow-hidden rounded-2xl border border-[#aa63ff]/16 bg-[radial-gradient(circle_at_50%_0%,rgba(170,99,255,0.08),transparent_35%),rgba(255,255,255,0.012)]">
      <summary className="group flex min-w-0 cursor-pointer list-none flex-col items-start gap-4 px-4 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
        <span className="flex min-w-0 items-start gap-3 sm:items-center">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-[#aa63ff]/18 bg-[#aa63ff]/[0.05] text-[#d8b5ff]">
            <Orbit className="size-5 transition group-hover:rotate-12" aria-hidden />
          </span>
          <span className="min-w-0">
            <PurposeBadge kind="insight" />
            <span className="mt-2 block text-sm font-semibold text-white">
              Optional: explore the full live network map
            </span>
            <span className="mt-1 block text-[11px] leading-5 text-white/36">
              This is a visual explanation of the routes—not a list of people you are expected to contact.
            </span>
          </span>
        </span>
        <span className="shrink-0 rounded-full border border-[#aa63ff]/15 bg-[#aa63ff]/[0.035] px-3 py-1.5 text-[10px] font-semibold text-[#d8b5ff]">
          Open visual map ✦
        </span>
      </summary>

      <div className="min-w-0 max-w-full border-t border-white/8 p-2 sm:p-4">
        <div className="mb-2 flex flex-col gap-3 rounded-xl border border-white/8 bg-black/20 p-3 sm:mb-4 sm:flex-row sm:items-start sm:justify-between">
          <p className="max-w-3xl text-[11px] leading-5 text-white/42">
            Pinch or zoom to spread the map apart. Drag to move around. Tap either a circle or its name to open that Bluesky account. Use the map to understand where routes and branches exist; use the Action Center for actual next moves.
          </p>
          <HelpPopover label="Why the full map is optional">
            A large network map is useful for exploration but can overwhelm a new user. The route finder and Action Center already turn the graph into practical recommendations, so you only need this view when you want to inspect the structure yourself.
          </HelpPopover>
        </div>
        <AdvancedNetworkExploreMapV4 scope={scope} targetHandles={[]} />
      </div>
    </details>
  );
}
