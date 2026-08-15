"use client";

import { useEffect, useMemo, useState } from "react";
import { Compass, Target } from "lucide-react";
import { Card } from "@/components/ui/card";
import {
  NETWORK_GOALS,
  normalizeNetworkGoal,
  type NetworkGoal,
} from "@/lib/advanced-network-v2";

const COOKIE_NAME = "advanced-network-goal";
const STORAGE_KEY = "rukh:advanced-network:goal";

function saveGoal(goal: NetworkGoal) {
  window.localStorage.setItem(STORAGE_KEY, goal);
  document.cookie = `${COOKIE_NAME}=${encodeURIComponent(goal)}; Path=/; Max-Age=31536000; SameSite=Lax`;
}

export function AdvancedNetworkGoal() {
  const [goal, setGoal] = useState<NetworkGoal>("balanced");

  useEffect(() => {
    const saved = normalizeNetworkGoal(window.localStorage.getItem(STORAGE_KEY));
    setGoal(saved);
    saveGoal(saved);
  }, []);

  const selected = useMemo(
    () => NETWORK_GOALS.find((item) => item.id === goal) ?? NETWORK_GOALS[0],
    [goal],
  );

  return (
    <Card className="overflow-hidden border-white/10 p-0">
      <details>
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid size-9 shrink-0 place-items-center rounded-xl border border-[#16c8ff]/20 bg-[#16c8ff]/[0.055]">
              <Compass className="size-4 text-[#8ce8ff]" aria-hidden />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-white/32">
                Growth objective
              </p>
              <p className="mt-1 truncate text-sm font-semibold text-white">{selected.label}</p>
            </div>
          </div>
          <span className="shrink-0 text-xs text-[#9cecff]">Change</span>
        </summary>

        <div className="border-t border-white/8 px-5 py-5 sm:px-6">
          <p className="max-w-3xl text-xs leading-5 text-white/42">
            This changes how the engine balances reciprocity, community access, public visibility,
            topic fit, and reach. Balanced growth is the default, so nobody has to configure this.
          </p>
          <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {NETWORK_GOALS.map((item) => {
              const active = item.id === goal;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setGoal(item.id);
                    saveGoal(item.id);
                  }}
                  className={`rounded-xl border p-4 text-left transition ${
                    active
                      ? "border-[#16c8ff]/38 bg-[#16c8ff]/[0.06] shadow-[0_0_24px_rgba(22,200,255,0.05)]"
                      : "border-white/8 bg-white/[0.018] hover:border-white/16"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Target className={`size-3.5 ${active ? "text-[#8ce8ff]" : "text-white/28"}`} aria-hidden />
                    <p className="text-xs font-semibold text-white">{item.label}</p>
                  </div>
                  <p className="mt-2 text-[11px] leading-5 text-white/38">{item.description}</p>
                </button>
              );
            })}
          </div>
        </div>
      </details>
    </Card>
  );
}
