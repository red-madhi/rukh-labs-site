"use client";

import { useEffect, useState } from "react";
import { Check, Network, UsersRound } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useAdvancedBlueskyOAuth } from "@/components/tools/advanced-network-oauth";
import {
  STARTING_NETWORK_SCOPE_COPY,
  type StartingNetworkScope,
} from "@/lib/advanced-network";

const scopes: StartingNetworkScope[] = ["all-followers", "mutuals-only"];

export function AdvancedNetworkStartingScope() {
  const oauth = useAdvancedBlueskyOAuth();
  const [scope, setScope] = useState<StartingNetworkScope>("all-followers");
  const storageKey = oauth.did
    ? `rukh:advanced-network:start-scope:${oauth.did}`
    : "";

  useEffect(() => {
    if (!storageKey) return;
    const saved = window.localStorage.getItem(storageKey);
    if (saved === "all-followers" || saved === "mutuals-only") {
      setScope(saved);
    }
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
    <Card className="p-5 sm:p-7">
      <div className="flex items-start gap-3">
        <Network className="mt-1 size-5 shrink-0 text-[#8ce8ff]" aria-hidden />
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8ce8ff]">
            Starting network
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-white">
            How broad should the first layer be?
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-white/52">
            This controls which of your followers the recursive engine can use as
            its starting bridge pool. Mutual-only paths are still used when the
            engine measures reciprocal degrees of separation deeper in the graph.
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {scopes.map((key) => {
          const copy = STARTING_NETWORK_SCOPE_COPY[key];
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
                  ? "border-[#16c8ff]/55 bg-[#16c8ff]/8"
                  : "border-white/10 bg-white/[0.02] hover:border-white/20"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="grid size-10 place-items-center rounded-xl border border-white/10 bg-black/20 text-[#8ce8ff]">
                    <Icon className="size-4" aria-hidden />
                  </span>
                  <div>
                    <p className="font-semibold text-white">{copy.label}</p>
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
                    Pros
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
                <span className="font-semibold text-white/55">Best for:</span>{" "}
                {copy.recommendedFor}
              </p>
            </button>
          );
        })}
      </div>

      <div className="mt-5 rounded-xl border border-[#e6bd73]/16 bg-[#e6bd73]/[0.035] p-4 text-xs leading-6 text-white/48">
        <span className="font-semibold text-[#f1d49a]">Recommended default:</span>{" "}
        start with <strong className="text-white/70">All followers</strong> when
        discovery is the goal. Switch to <strong className="text-white/70">Mutuals only</strong>{" "}
        when you want a cheaper, cleaner run built entirely from established
        reciprocal relationships.
      </div>
    </Card>
  );
}
