"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { GitBranch, Loader2, RefreshCw, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAdvancedBlueskyOAuth } from "@/components/tools/advanced-network-oauth";

type StrategyResponse = {
  run: null | {
    id: string;
    completedAt: string | null;
    engine: string;
    goal: string;
    roundTwoStatus: string;
    roundTwoEligibleFootholds: number;
    secondWaveTargets: string[];
    stageCounts: Record<string, number>;
    nodeIndependentPaths: number;
    recommendationsReturned: number;
  };
  evidence?: Array<{
    stage: string;
    confidence: string;
    people: number;
    independentPaths: number;
    averageScore: number;
  }>;
  destinations?: Array<{
    handle: string;
    wave: number;
    status: string;
    bridgePeople: number;
    independentPaths: number;
  }>;
  error?: string;
};

const STAGES = [
  {
    id: "structural",
    label: "Structural",
    description: "The follow path exists, but it has not shown meaningful social activity yet.",
  },
  {
    id: "active",
    label: "Active",
    description: "People on the route repeatedly interact with one another.",
  },
  {
    id: "activated",
    label: "Activated",
    description: "The relationship has begun creating visible overlap involving you.",
  },
  {
    id: "converted",
    label: "Converted",
    description: "The relationship is reciprocal and can support a durable warm route.",
  },
];

function roundTwoCopy(status: string) {
  if (status === "expanded") return "Round two expanded from validated footholds.";
  if (status === "no-qualified-destination") {
    return "Round one has validated footholds, but no new destination cleared the relevance and confidence gates yet.";
  }
  if (status === "locked-awaiting-activated-foothold") {
    return "Round two is intentionally locked until at least one round-one relationship becomes activated or converted.";
  }
  return "Round two has not been evaluated by the evidence-weighted engine yet.";
}

export function AdvancedNetworkStrategyPanel() {
  const oauth = useAdvancedBlueskyOAuth();
  const [data, setData] = useState<StrategyResponse | null>(null);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const connected = oauth.phase === "connected" && Boolean(oauth.did);

  const load = useCallback(async () => {
    if (!oauth.did) return;
    setWorking(true);
    setError("");
    try {
      const response = await fetch(
        `/api/advanced-network/strategy?actor=${encodeURIComponent(oauth.did)}`,
        { cache: "no-store" },
      );
      const result = (await response.json()) as StrategyResponse;
      if (!response.ok) throw new Error(result.error || "Evidence status could not be loaded.");
      setData(result);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Evidence status could not be loaded.");
    } finally {
      setWorking(false);
    }
  }, [oauth.did]);

  useEffect(() => {
    if (!connected) {
      setData(null);
      return;
    }
    void load();
    const interval = window.setInterval(() => void load(), 30_000);
    return () => window.clearInterval(interval);
  }, [connected, load]);

  const stageCounts = useMemo(() => data?.run?.stageCounts ?? {}, [data]);
  const strongestDestinations = useMemo(
    () =>
      [...(data?.destinations ?? [])]
        .sort(
          (a, b) =>
            b.independentPaths - a.independentPaths || b.bridgePeople - a.bridgePeople,
        )
        .slice(0, 4),
    [data],
  );

  if (!connected) return null;

  return (
    <Card className="overflow-hidden border-white/10 p-0">
      <div className="flex flex-col gap-4 border-b border-white/8 bg-[radial-gradient(circle_at_100%_0%,rgba(170,99,255,0.08),transparent_38%)] px-5 py-5 sm:flex-row sm:items-start sm:justify-between sm:px-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.13em] text-[#d8b5ff]">
            <ShieldCheck className="size-4" aria-hidden />
            Evidence quality
          </div>
          <h2 className="mt-2 text-xl font-semibold text-white">A path has to become social before it unlocks round two.</h2>
          <p className="mt-2 max-w-3xl text-xs leading-5 text-white/40">
            The engine now separates a mathematical follow chain from an active, visible, and reciprocal relationship.
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => void load()} disabled={working}>
          {working ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <RefreshCw className="size-4" aria-hidden />}
          Refresh
        </Button>
      </div>

      {!data?.run ? (
        <div className="px-6 py-8 text-sm text-white/38">
          {error || "Run Find people to follow once to calculate evidence stages."}
        </div>
      ) : (
        <div className="p-5 sm:p-6">
          <div className="grid gap-3 md:grid-cols-4">
            {STAGES.map((stage, index) => (
              <div key={stage.id} className="relative rounded-xl border border-white/8 bg-black/16 p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/34">
                    {index + 1}. {stage.label}
                  </span>
                  <span className="text-lg font-semibold text-white">{Number(stageCounts[stage.id] ?? 0)}</span>
                </div>
                <p className="mt-3 text-[11px] leading-5 text-white/36">{stage.description}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="rounded-2xl border border-[#e6bd73]/16 bg-[#e6bd73]/[0.025] p-5">
              <div className="flex items-center gap-2">
                <GitBranch className="size-4 text-[#f1d49a]" aria-hidden />
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#f1d49a]">Round two gate</p>
              </div>
              <p className="mt-3 text-sm font-semibold text-white">{roundTwoCopy(data.run.roundTwoStatus)}</p>
              <div className="mt-4 flex flex-wrap gap-2 text-[10px]">
                <span className="rounded-full border border-white/8 px-2.5 py-1 text-white/42">
                  {data.run.roundTwoEligibleFootholds} eligible foothold{data.run.roundTwoEligibleFootholds === 1 ? "" : "s"}
                </span>
                <span className="rounded-full border border-[#16c8ff]/14 px-2.5 py-1 text-[#9cecff]/80">
                  {data.run.nodeIndependentPaths} node-independent paths
                </span>
                <span className="rounded-full border border-[#aa63ff]/14 px-2.5 py-1 text-[#d8b5ff]/80">
                  goal: {data.run.goal.replaceAll("-", " ")}
                </span>
              </div>
              {data.run.secondWaveTargets.length ? (
                <p className="mt-4 text-xs leading-5 text-white/42">
                  New destinations unlocked: {data.run.secondWaveTargets.map((handle) => `@${handle}`).join(", ")}.
                </p>
              ) : null}
            </div>

            <div className="rounded-2xl border border-white/8 bg-white/[0.018] p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-white/36">Strongest destination coverage</p>
              <div className="mt-3 grid gap-2">
                {strongestDestinations.length ? strongestDestinations.map((destination) => (
                  <div key={`${destination.wave}:${destination.handle}`} className="flex items-center justify-between gap-3 rounded-lg border border-white/7 bg-black/18 px-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-white">@{destination.handle}</p>
                      <p className="mt-1 text-[9px] text-white/28">wave {destination.wave} · {destination.bridgePeople} bridge people</p>
                    </div>
                    <span className="shrink-0 text-xs font-semibold text-[#f1d49a]">{destination.independentPaths} paths</span>
                  </div>
                )) : (
                  <p className="text-xs text-white/34">No destination coverage has been saved yet.</p>
                )}
              </div>
            </div>
          </div>

          {error ? <p className="mt-4 text-xs text-[#ffb4b8]">{error}</p> : null}
        </div>
      )}
    </Card>
  );
}
