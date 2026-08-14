"use client";

import { useCallback, useEffect, useState } from "react";
import { History, Loader2, RefreshCw, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAdvancedBlueskyOAuth } from "@/components/tools/advanced-network-oauth";

type Metrics = {
  followersCount?: number;
  followsCount?: number;
  mutualsCount?: number;
  baseline?: boolean;
  source?: string;
  mutualsSampled?: boolean;
};

type Snapshot = {
  capturedAt: string;
  metrics: Metrics;
};

type ProgressResponse = {
  actor: { did: string; handle: string; displayName?: string };
  baseline: Snapshot;
  current: Snapshot;
  delta: { followers: number; follows: number; mutuals: number };
  continuingExistingHistory: boolean;
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
      <Card className="border-[#16c8ff]/20 p-5 sm:p-6">
        <div className="flex items-center gap-3 text-sm text-white/58">
          <Loader2 className="size-4 animate-spin text-[#8ce8ff]" aria-hidden />
          {error || "Reconciling this account with its saved network history…"}
        </div>
      </Card>
    );
  }

  const baseline = progress.baseline.metrics;
  const current = progress.current.metrics;
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

  return (
    <Card className="overflow-hidden border-[#16c8ff]/25 bg-[radial-gradient(circle_at_90%_0%,rgba(22,200,255,0.11),transparent_40%),rgba(14,12,14,0.76)] p-5 sm:p-7">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#8ce8ff]">
            <History className="size-4" aria-hidden />
            {progress.continuingExistingHistory ? "Continuing your existing run" : "Saved network history"}
          </div>
          <h2 className="mt-3 text-2xl font-semibold text-white sm:text-3xl">
            {progress.continuingExistingHistory
              ? "You are not starting over."
              : "Your progress starts from the saved baseline."}
          </h2>
          <p className="mt-3 text-sm leading-7 text-white/54">
            Baseline: {localDate(progress.baseline.capturedAt)}. Current state: {localDate(progress.current.capturedAt)}.
            {progress.continuingExistingHistory
              ? " This baseline was seeded from the network-expansion work that began before Advanced Network existed."
              : " Future runs will compare back to this point and to later saved snapshots."}
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => void refresh()} disabled={working}>
          {working ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <RefreshCw className="size-4" aria-hidden />}
          Refresh progress
        </Button>
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-3">
        {metrics.map((item) => (
          <div key={item.label} className="rounded-xl border border-white/10 bg-black/15 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-white/38">{item.label}</p>
            <div className="mt-3 flex items-end gap-2">
              <span className="text-lg text-white/42">{exact(item.before)}</span>
              <span className="pb-0.5 text-white/25">→</span>
              <span className="text-2xl font-semibold text-white">{exact(item.now)}</span>
            </div>
            <p className={`mt-2 inline-flex items-center gap-1 text-sm font-medium ${item.delta >= 0 ? "text-emerald-200" : "text-[#ffb4b8]"}`}>
              <TrendingUp className="size-3.5" aria-hidden />
              {signed(item.delta)} since baseline
            </p>
          </div>
        ))}
      </div>

      {current.mutualsSampled ? (
        <p className="mt-4 text-xs leading-5 text-[#ffe4a0]/70">
          Mutual count is sampled because this account exceeds the current beta scan cap. Follower and following totals remain live profile totals.
        </p>
      ) : null}
      {error ? <p className="mt-4 text-sm text-[#ffb4b8]">{error}</p> : null}
    </Card>
  );
}
