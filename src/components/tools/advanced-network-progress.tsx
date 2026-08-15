"use client";

import { useCallback, useEffect, useState } from "react";
import { History, Loader2, RefreshCw, Sparkles, TrendingUp } from "lucide-react";
import { NetworkTermHelp } from "@/components/tools/advanced-network-terms";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAdvancedBlueskyOAuth } from "@/components/tools/advanced-network-oauth";

type Metrics = {
  followersCount?: number;
  followsCount?: number;
  mutualsCount?: number;
  networkXp?: number;
  baseline?: boolean;
  source?: string;
  mutualsSampled?: boolean;
};

type Snapshot = {
  capturedAt: string;
  metrics: Metrics;
};

type NetworkLevel = {
  xp: number;
  level: number;
  title: string;
  currentLevelXp: number;
  nextLevelXp: number | null;
  nextLevelTitle: string | null;
  progressPercent: number;
  breakdown: {
    followerGrowth: number;
    mutualGrowth: number;
    bridgeGrowth: number;
    pathGrowth: number;
    followBacks: number;
    interactions: number;
  };
  stats: {
    bridgePeople: number;
    independentPaths: number;
    newBridgePeople: number;
    newIndependentPaths: number;
    followBacks: number;
    interactionScore: number;
  };
  scoringNote: string;
};

type ProgressResponse = {
  actor: { did: string; handle: string; displayName?: string };
  baseline: Snapshot;
  current: Snapshot;
  delta: { followers: number; follows: number; mutuals: number };
  continuingExistingHistory: boolean;
  networkLevel: NetworkLevel;
  error?: string;
};

function exact(value: number | undefined) {
  return new Intl.NumberFormat("en-US").format(Math.max(0, value ?? 0));
}

function signed(value: number) {
  return `${value >= 0 ? "+" : ""}${new Intl.NumberFormat("en-US").format(value)}`;
}

function localDate(value: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "baseline";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function AdvancedNetworkProgress() {
  const oauth = useAdvancedBlueskyOAuth();
  const [progress, setProgress] = useState<ProgressResponse | null>(null);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");

  const connected = oauth.phase === "connected" && Boolean(oauth.did);

  const refresh = useCallback(async () => {
    if (!oauth.did) return;
    setWorking(true);
    setError("");
    try {
      const response = await fetch(
        `/api/advanced-network/progress?actor=${encodeURIComponent(oauth.did)}`,
        { cache: "no-store" },
      );
      const result = (await response.json()) as ProgressResponse;
      if (!response.ok) throw new Error(result.error || "Progress could not be refreshed.");
      setProgress(result);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Progress could not be refreshed.");
    } finally {
      setWorking(false);
    }
  }, [oauth.did]);

  useEffect(() => {
    if (!connected) {
      setProgress(null);
      setError("");
      return;
    }
    void refresh();
  }, [connected, refresh]);

  if (!connected) return null;

  if (!progress) {
    return (
      <Card className="min-w-0 max-w-full border-[#16c8ff]/20 p-5 sm:p-6">
        <div className="flex min-w-0 items-center gap-3 text-sm text-white/58">
          <Loader2 className="size-4 shrink-0 animate-spin text-[#8ce8ff]" aria-hidden />
          <span className="min-w-0 break-words">{error || "Reconciling this account with its saved network history…"}</span>
        </div>
      </Card>
    );
  }

  const baseline = progress.baseline.metrics;
  const current = progress.current.metrics;
  const level = progress.networkLevel;
  const metrics = [
    {
      label: "Followers",
      before: baseline.followersCount,
      now: current.followersCount,
      delta: progress.delta.followers,
    },
    {
      label: "Following",
      before: baseline.followsCount,
      now: current.followsCount,
      delta: progress.delta.follows,
    },
    {
      label: "Mutuals",
      before: baseline.mutualsCount,
      now: current.mutualsCount,
      delta: progress.delta.mutuals,
    },
  ];

  const xpBreakdown = [
    ["Mutual growth", level.breakdown.mutualGrowth],
    ["Bridge coverage", level.breakdown.bridgeGrowth],
    ["Independent paths", level.breakdown.pathGrowth],
    ["Follower growth", level.breakdown.followerGrowth],
    ["Follow-backs", level.breakdown.followBacks],
    ["Interaction", level.breakdown.interactions],
  ] as const;

  return (
    <Card className="min-w-0 max-w-full overflow-hidden border-[#16c8ff]/25 bg-[radial-gradient(circle_at_90%_0%,rgba(22,200,255,0.11),transparent_40%),rgba(14,12,14,0.76)] p-4 sm:p-7">
      <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_340px] xl:items-start">
        <div className="min-w-0">
          <div className="flex min-w-0 flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 max-w-3xl">
              <div className="flex min-w-0 items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#8ce8ff]">
                <History className="size-4 shrink-0" aria-hidden />
                <span className="min-w-0 break-words">{progress.continuingExistingHistory ? "Continuing your existing run" : "Saved network history"}</span>
              </div>
              <h2 className="mt-3 break-words text-2xl font-semibold text-white sm:text-3xl">
                {progress.continuingExistingHistory
                  ? "You are not starting over."
                  : "Your progress starts from the saved baseline."}
              </h2>
              <p className="mt-3 break-words text-sm leading-7 text-white/54">
                Baseline: {localDate(progress.baseline.capturedAt)}. Current state: {localDate(progress.current.capturedAt)}.
                {progress.continuingExistingHistory
                  ? " This baseline was seeded from the network-expansion work that began before Advanced Network existed."
                  : " Future runs compare back to this point and later saved snapshots."}
              </p>
            </div>
            <Button variant="ghost" size="sm" className="self-start" onClick={() => void refresh()} disabled={working}>
              {working ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <RefreshCw className="size-4" aria-hidden />}
              Refresh progress
            </Button>
          </div>

          <div className="mt-6 grid min-w-0 gap-3 md:grid-cols-3">
            {metrics.map((item) => (
              <div key={item.label} className="min-w-0 rounded-xl border border-white/10 bg-black/15 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-white/38">{item.label}</p>
                <div className="mt-3 flex min-w-0 flex-wrap items-end gap-2">
                  <span className="text-lg text-white/42">{exact(item.before)}</span>
                  <span className="pb-0.5 text-white/25">→</span>
                  <span className="text-2xl font-semibold text-white">{exact(item.now)}</span>
                </div>
                <p className={`mt-2 inline-flex max-w-full items-center gap-1 break-words text-sm font-medium ${item.delta >= 0 ? "text-emerald-200" : "text-[#ffb4b8]"}`}>
                  <TrendingUp className="size-3.5 shrink-0" aria-hidden />
                  {signed(item.delta)} since baseline
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="min-w-0 max-w-full rounded-2xl border border-[#aa63ff]/18 bg-[radial-gradient(circle_at_50%_0%,rgba(170,99,255,0.12),transparent_50%),rgba(0,0,0,0.18)] p-4 sm:p-5">
          <div className="flex min-w-0 items-center justify-between gap-3">
            <p className="inline-flex min-w-0 items-center text-[10px] font-semibold uppercase tracking-[0.14em] text-[#d8b5ff]">
              Network Level
              <NetworkTermHelp term="networkLevel" />
            </p>
            <Sparkles className="size-4 shrink-0 text-[#f1d49a]" aria-hidden />
          </div>

          <div className="mt-5 flex min-w-0 flex-col items-start gap-4 sm:flex-row sm:items-center sm:gap-5">
            <div
              className="relative grid size-24 shrink-0 place-items-center rounded-full p-[7px] sm:size-28"
              style={{
                background: `conic-gradient(#d8b5ff ${level.progressPercent}%, rgba(255,255,255,0.06) ${level.progressPercent}% 100%)`,
              }}
            >
              <div className="grid size-full place-items-center rounded-full border border-white/8 bg-[#090b0f] text-center">
                <div>
                  <p className="text-[9px] uppercase tracking-[0.14em] text-white/28">Level</p>
                  <p className="text-3xl font-semibold text-white">{level.level}</p>
                </div>
              </div>
            </div>
            <div className="min-w-0 max-w-full">
              <p className="break-words text-lg font-semibold text-white">{level.title}</p>
              <p className="mt-1 text-sm font-semibold text-[#f1d49a]">{exact(level.xp)} XP</p>
              {level.nextLevelXp ? (
                <p className="mt-2 break-words text-[11px] leading-5 text-white/36">
                  {exact(level.nextLevelXp - level.xp)} XP to Level {level.level + 1}
                  {level.nextLevelTitle ? ` · ${level.nextLevelTitle}` : ""}
                </p>
              ) : (
                <p className="mt-2 text-[11px] text-white/36">Top level reached.</p>
              )}
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-2">
            <div className="min-w-0 rounded-xl border border-[#e6bd73]/12 bg-[#e6bd73]/[0.035] p-3">
              <p className="text-xl font-semibold text-[#f1d49a]">{level.stats.bridgePeople}</p>
              <p className="mt-0.5 inline-flex max-w-full flex-wrap text-[9px] uppercase tracking-[0.1em] text-white/27">
                bridge people
                <NetworkTermHelp term="bridge" />
              </p>
            </div>
            <div className="min-w-0 rounded-xl border border-[#aa63ff]/12 bg-[#aa63ff]/[0.03] p-3">
              <p className="text-xl font-semibold text-[#d8b5ff]">{level.stats.independentPaths}</p>
              <p className="mt-0.5 inline-flex max-w-full flex-wrap text-[9px] uppercase tracking-[0.1em] text-white/27">
                warm paths
                <NetworkTermHelp term="independentPath" />
              </p>
            </div>
          </div>

          <details className="mt-4 min-w-0 rounded-xl border border-white/8 bg-black/15 p-3">
            <summary className="cursor-pointer list-none text-[11px] font-semibold text-[#b9f1ff]">
              How did I earn this score?
            </summary>
            <div className="mt-3 grid min-w-0 gap-1.5">
              {xpBreakdown.map(([label, value]) => (
                <div key={label} className="flex min-w-0 items-center justify-between gap-3 rounded-lg bg-white/[0.025] px-3 py-2 text-[10px]">
                  <span className="min-w-0 break-words text-white/40">{label}</span>
                  <span className="shrink-0 font-semibold text-white/70">+{exact(value)} XP</span>
                </div>
              ))}
            </div>
            <p className="mt-3 break-words text-[10px] leading-4 text-white/28">{level.scoringNote}</p>
          </details>
        </div>
      </div>

      {current.mutualsSampled ? (
        <p className="mt-4 break-words text-xs leading-5 text-[#ffe4a0]/70">
          Mutual count is sampled because this account exceeds the current beta scan cap. Follower and following totals remain live profile totals.
        </p>
      ) : null}
      {error ? <p className="mt-4 break-words text-sm text-[#ffb4b8]">{error}</p> : null}
    </Card>
  );
}
