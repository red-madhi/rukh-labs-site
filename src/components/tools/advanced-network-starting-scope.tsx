"use client";

import { useEffect, useState } from "react";
import { Check, Network, UsersRound } from "lucide-react";
import {
  HelpPopover,
  PurposeBadge,
} from "@/components/tools/advanced-network-explain";
import { Card } from "@/components/ui/card";
import { useAdvancedBlueskyOAuth } from "@/components/tools/advanced-network-oauth";
import type { StartingNetworkScope } from "@/lib/advanced-network";

const scopes: StartingNetworkScope[] = ["all-followers", "mutuals-only"];

const SCOPE_COPY: Record<
  StartingNetworkScope,
  {
    label: string;
    description: string;
    pros: string[];
    cons: string[];
    recommendedFor: string;
  }
> = {
  "all-followers": {
    label: "All followers",
    description:
      "Start from everyone who follows you, including people you do not follow back. This gives IAZMA the widest first circle to explore.",
    pros: [
      "Finds routes through overlooked followers",
      "Best chance of discovering new communities",
    ],
    cons: [
      "Takes a broader scan",
      "Includes some weaker starting connections",
    ],
    recommendedFor: "Most people, especially when discovery is the goal.",
  },
  "mutuals-only": {
    label: "Mutuals only",
    description:
      "Start only from people you follow and who follow you back. This makes the first circle smaller and more established.",
    pros: [
      "Smaller, cleaner starting set",
      "Begins with reciprocal follow relationships",
    ],
    cons: [
      "Can miss useful routes through other followers",
      "Finds fewer new branches",
    ],
    recommendedFor: "A tighter scan around relationships that are already reciprocal.",
  },
};

export function AdvancedNetworkStartingScope() {
  const oauth = useAdvancedBlueskyOAuth();
  const [scope, setScope] = useState<StartingNetworkScope>("all-followers");
  const storageKey = oauth.did
    ? `rukh:advanced-network:start-scope:${oauth.did}`
    : "";

  useEffect(() => {
    if (!storageKey) return;
    const saved = window.localStorage.getItem(storageKey);
    if (saved !== "all-followers" && saved !== "mutuals-only") return;
    const frame = window.requestAnimationFrame(() => setScope(saved));
    return () => window.cancelAnimationFrame(frame);
  }, [storageKey]);

  function choose(next: StartingNetworkScope) {
    setScope(next);
    if (storageKey) window.localStorage.setItem(storageKey, next);
    if (oauth.did) {
      window.dispatchEvent(
        new CustomEvent("rukh:advanced-network:scope-change", {
          detail: { did: oauth.did, scope: next },
        }),
      );
    }
  }

  if (oauth.phase !== "connected" || !oauth.did) return null;

  return (
    <Card id="iazma-first-action" className="scroll-mt-24 p-5 sm:p-7">
      <div className="flex items-start gap-3">
        <Network className="mt-1 size-5 shrink-0 text-[#8ce8ff]" aria-hidden />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <PurposeBadge kind="action" />
            <HelpPopover label="Why this choice is on the screen">
              IAZMA needs to know which people count as its first circle. A wider first circle finds more hidden routes; a mutual-only circle is smaller and starts from reciprocal follows. This setting changes analysis only. It never follows, messages, or posts for you.
            </HelpPopover>
          </div>
          <p className="mt-3 text-xs font-semibold uppercase tracking-[0.14em] text-[#8ce8ff]">
            Step 1 · Choose where the scan begins
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-white">
            Which people should IAZMA start from?
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-white/52">
            Pick a first circle. IAZMA will look outward from those people to find the hidden routes shown in the tutorial. Nothing is changed on Bluesky.
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {scopes.map((key) => {
          const copy = SCOPE_COPY[key];
          const selected = scope === key;
          const Icon = key === "all-followers" ? UsersRound : Network;

          return (
            <button
              key={key}
              type="button"
              onClick={() => choose(key)}
              aria-pressed={selected}
              className={`rounded-2xl border p-5 text-left transition ${
                selected
                  ? "border-[#16c8ff]/55 bg-[#16c8ff]/8 shadow-[0_0_30px_rgba(22,200,255,0.055)]"
                  : "border-white/10 bg-white/[0.02] hover:border-white/20"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="grid size-10 place-items-center rounded-xl border border-white/10 bg-black/20 text-[#8ce8ff]">
                    <Icon className="size-4" aria-hidden />
                  </span>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-white">{copy.label}</p>
                      {key === "all-followers" ? (
                        <span className="rounded-full border border-emerald-300/16 bg-emerald-300/[0.045] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.09em] text-emerald-200">
                          Recommended
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-xs leading-5 text-white/42">
                      {copy.description}
                    </p>
                  </div>
                </div>
                {selected ? (
                  <span className="grid size-7 shrink-0 place-items-center rounded-full bg-[#16c8ff]/15 text-[#8ce8ff]">
                    <Check className="size-4" aria-hidden />
                  </span>
                ) : null}
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-200/75">
                    What you gain
                  </p>
                  <ul className="mt-2 grid gap-2 text-xs leading-5 text-white/50">
                    {copy.pros.map((item) => (
                      <li key={item}>+ {item}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#ffb4b8]/75">
                    Tradeoffs
                  </p>
                  <ul className="mt-2 grid gap-2 text-xs leading-5 text-white/50">
                    {copy.cons.map((item) => (
                      <li key={item}>− {item}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <p className="mt-5 border-t border-white/10 pt-4 text-xs leading-5 text-white/38">
                <span className="font-semibold text-white/55">Choose this when:</span>{" "}
                {copy.recommendedFor}
              </p>
            </button>
          );
        })}
      </div>

      <div className="mt-5 flex flex-col gap-2 rounded-xl border border-[#e6bd73]/16 bg-[#e6bd73]/[0.035] p-4 text-xs leading-6 text-white/48 sm:flex-row sm:items-start sm:justify-between">
        <p>
          <span className="font-semibold text-[#f1d49a]">Current choice:</span>{" "}
          <strong className="text-white/72">{SCOPE_COPY[scope].label}</strong>. You can change it before any run.
        </p>
        <span className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.1em] text-white/28">
          Analysis setting only
        </span>
      </div>
    </Card>
  );
}
