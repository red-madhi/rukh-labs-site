"use client";

import { useEffect, useMemo, useState } from "react";
import { Compass, Target } from "lucide-react";
import {
  HelpPopover,
  PurposeBadge,
} from "@/components/tools/advanced-network-explain";
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
              <PurposeBadge kind="action" />
              <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.13em] text-white/32">
                Step 2 · Set the ranking priority
              </p>
              <p className="mt-1 truncate text-sm font-semibold text-white">
                Current goal: {selected.label}
              </p>
            </div>
          </div>
          <span className="shrink-0 rounded-full border border-white/8 px-2.5 py-1 text-[10px] font-semibold text-[#9cecff]">
            Change
          </span>
        </summary>

        <div className="border-t border-white/8 px-5 py-5 sm:px-6">
          <h2 className="text-lg font-semibold text-white">
            What should “a better network” mean for this run?
          </h2>
          <div className="mt-2 flex max-w-3xl items-start gap-2">
            <HelpPopover label="Why choose a ranking goal?">
              Different people want different outcomes. This choice tells IAZMA which useful routes should rise to the top. It changes the order of recommendations only; it does not perform any Bluesky action.
            </HelpPopover>
            <p className="text-xs leading-5 text-white/42">
              IAZMA always uses real route evidence. This setting only changes which strong results it prefers: likely two-way connections, access to new communities, visibility, topic fit, reach, or a balanced mix. Leave it on Balanced when you do not care.
            </p>
          </div>
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
                  aria-pressed={active}
                  className={`rounded-xl border p-4 text-left transition ${
                    active
                      ? "border-[#16c8ff]/38 bg-[#16c8ff]/[0.06] shadow-[0_0_24px_rgba(22,200,255,0.05)]"
                      : "border-white/8 bg-white/[0.018] hover:border-white/16"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Target
                        className={`size-3.5 ${active ? "text-[#8ce8ff]" : "text-white/28"}`}
                        aria-hidden
                      />
                      <p className="text-xs font-semibold text-white">{item.label}</p>
                    </div>
                    {active ? (
                      <span className="text-[9px] font-semibold uppercase tracking-[0.09em] text-[#9cecff]">
                        Selected
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-2 text-[11px] leading-5 text-white/38">
                    {item.description}
                  </p>
                </button>
              );
            })}
          </div>
          <p className="mt-4 text-[10px] leading-5 text-white/30">
            This is an optional preference. The tool will work without opening this section.
          </p>
        </div>
      </details>
    </Card>
  );
}
