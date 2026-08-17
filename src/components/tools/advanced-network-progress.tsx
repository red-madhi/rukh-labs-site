"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  History,
  Loader2,
  RefreshCw,
  Sparkles,
  TrendingDown,
  TrendingUp,
  X,
} from "lucide-react";
import {
  HelpPopover,
  PurposeBadge,
  PurposeExplanation,
} from "@/components/tools/advanced-network-explain";
import {
  BaselineChart,
  MiniProgressLine,
  XpBreakdownChart,
} from "@/components/tools/advanced-network-progress-charts";
import {
  exact,
  localDate,
  safe,
  signed,
  type ChartId,
  type ProgressMetric,
  type ProgressResponse,
} from "@/components/tools/advanced-network-progress-model";
import { NetworkTermHelp } from "@/components/tools/advanced-network-terms";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAdvancedBlueskyOAuth } from "@/components/tools/advanced-network-oauth";

export function AdvancedNetworkProgress() {
  const oauth = useAdvancedBlueskyOAuth();
  const [progress, setProgress] = useState<ProgressResponse | null>(null);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [selectedChart, setSelectedChart] = useState<ChartId | null>(null);

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
    const frame = window.requestAnimationFrame(() => {
      if (!connected) {
        setProgress(null);
        setError("");
        setSelectedChart(null);
        return;
      }
      void refresh();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [connected, refresh]);

  const metricDefinitions = useMemo<ProgressMetric[]>(() => {
    if (!progress) return [];
    const baseline = progress.baseline.metrics;
    const current = progress.current.metrics;
    return [
      {
        id: "followers",
        label: "Followers",
        before: safe(baseline.followersCount),
        now: safe(current.followersCount),
        delta: progress.delta.followers,
        measures: "People who currently follow your Bluesky account compared with the saved starting point.",
        why: "Follower growth shows reach, but it does not prove relationship quality. IAZMA keeps it as context instead of treating raw audience size as the goal.",
        next: "No required action. Use the change to understand reach, then judge quality with mutuals, active routes, and the Action Center.",
      },
      {
        id: "following",
        label: "Following",
        before: safe(baseline.followsCount),
        now: safe(current.followsCount),
        delta: progress.delta.follows,
        measures: "How many accounts you follow now compared with the saved starting point.",
        why: "This catches growth caused only by following more people. Network Level deliberately rewards follow-backs and real routes more than raw following volume.",
        next: "No target number is required. Follow only accounts you genuinely want; this card is a guardrail against mistaking mass-following for progress.",
      },
      {
        id: "mutuals",
        label: "Mutuals",
        before: safe(baseline.mutualsCount),
        now: safe(current.mutualsCount),
        delta: progress.delta.mutuals,
        measures: "Accounts where you follow each other, compared with the saved starting point.",
        why: "A mutual follow is stronger than a one-way follow, but it still does not prove an active relationship. IAZMA combines this with interaction and route evidence.",
        next: "Look for people you actually value. A smaller number of relevant mutuals is better than forcing a large number of empty follow-backs.",
      },
    ];
  }, [progress]);

  if (!connected) return null;

  if (!progress) {
    return (
      <Card className="min-w-0 max-w-full border-[#16c8ff]/20 p-5 sm:p-6">
        <div className="flex min-w-0 items-center gap-3 text-sm text-white/58">
          <Loader2 className="size-4 shrink-0 animate-spin text-[#8ce8ff]" aria-hidden />
          <span className="min-w-0 break-words">
            {error || "Comparing this account with its saved starting point…"}
          </span>
        </div>
      </Card>
    );
  }

  const current = progress.current.metrics;
  const level = progress.networkLevel;
  const xpBreakdown = [
    ["Mutual growth", level.breakdown.mutualGrowth],
    ["Bridge coverage", level.breakdown.bridgeGrowth],
    ["Separate warm paths", level.breakdown.pathGrowth],
    ["Follower growth", level.breakdown.followerGrowth],
    ["Follow-backs", level.breakdown.followBacks],
    ["Interaction", level.breakdown.interactions],
  ] as const;
  const activeMetric = metricDefinitions.find((item) => item.id === selectedChart);

  return (
    <Card className="min-w-0 max-w-full overflow-hidden border-[#16c8ff]/25 bg-[radial-gradient(circle_at_90%_0%,rgba(22,200,255,0.11),transparent_40%),rgba(14,12,14,0.76)] p-4 sm:p-7">
      <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_340px] xl:items-start">
        <div className="min-w-0">
          <div className="flex min-w-0 flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 max-w-3xl">
              <div className="flex flex-wrap items-center gap-2">
                <PurposeBadge kind="insight" />
                <HelpPopover label="Why progress is on the screen">
                  These cards compare the account with its saved starting point so you can see what changed. They are information, not targets you must chase. Click any card to open an honest baseline-to-now chart and an explanation of what the number can—and cannot—tell you.
                </HelpPopover>
              </div>
              <div className="mt-3 flex min-w-0 items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#8ce8ff]">
                <History className="size-4 shrink-0" aria-hidden />
                <span className="min-w-0 break-words">
                  Step 3 · {progress.continuingExistingHistory ? "Continuing your existing run" : "Saved network history"}
                </span>
              </div>
              <h2 className="mt-3 break-words text-2xl font-semibold text-white sm:text-3xl">
                Click a card to see what changed—and what it actually means.
              </h2>
              <p className="mt-3 break-words text-sm leading-7 text-white/54">
                Saved baseline: {localDate(progress.baseline.capturedAt)}. Latest snapshot: {localDate(progress.current.capturedAt)}.
                {progress.continuingExistingHistory
                  ? " This continues the network-expansion history that existed before IAZMA PRO."
                  : " Future comparisons keep using this saved starting point."}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="self-start"
              onClick={() => void refresh()}
              disabled={working}
            >
              {working ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <RefreshCw className="size-4" aria-hidden />
              )}
              Refresh progress
            </Button>
          </div>

          <div className="mt-6 grid min-w-0 gap-3 md:grid-cols-3">
            {metricDefinitions.map((item) => {
              const active = selectedChart === item.id;
              const TrendIcon = item.delta >= 0 ? TrendingUp : TrendingDown;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedChart(active ? null : item.id)}
                  aria-expanded={active}
                  className={`group min-w-0 rounded-xl border p-4 text-left transition ${
                    active
                      ? "border-[#16c8ff]/45 bg-[#16c8ff]/[0.065] shadow-[0_0_30px_rgba(22,200,255,0.055)]"
                      : "border-white/10 bg-black/15 hover:border-white/20 hover:bg-white/[0.025]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-white/38">
                        {item.label}
                      </p>
                      <p className="mt-1 text-[10px] text-white/28">Insight · click for chart</p>
                    </div>
                    <MiniProgressLine before={item.before} now={item.now} />
                  </div>
                  <div className="mt-3 flex min-w-0 flex-wrap items-end gap-2">
                    <span className="text-lg text-white/42">{exact(item.before)}</span>
                    <span className="pb-0.5 text-white/25">→</span>
                    <span className="text-2xl font-semibold text-white">{exact(item.now)}</span>
                  </div>
                  <p
                    className={`mt-2 inline-flex max-w-full items-center gap-1 break-words text-sm font-medium ${
                      item.delta >= 0 ? "text-emerald-200" : "text-[#ffb4b8]"
                    }`}
                  >
                    <TrendIcon className="size-3.5 shrink-0" aria-hidden />
                    {signed(item.delta)} since baseline
                  </p>
                </button>
              );
            })}
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
                activated bridges
                <NetworkTermHelp term="bridge" />
              </p>
            </div>
            <div className="min-w-0 rounded-xl border border-[#aa63ff]/12 bg-[#aa63ff]/[0.03] p-3">
              <p className="text-xl font-semibold text-[#d8b5ff]">{level.stats.independentPaths}</p>
              <p className="mt-0.5 inline-flex max-w-full flex-wrap text-[9px] uppercase tracking-[0.1em] text-white/27">
                separate warm paths
                <NetworkTermHelp term="independentPath" />
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setSelectedChart(selectedChart === "level" ? null : "level")}
            aria-expanded={selectedChart === "level"}
            className={`mt-4 flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-3 text-left transition ${
              selectedChart === "level"
                ? "border-[#aa63ff]/30 bg-[#aa63ff]/[0.055]"
                : "border-white/8 bg-black/15 hover:border-white/16"
            }`}
          >
            <span>
              <span className="block text-[11px] font-semibold text-[#d8b5ff]">
                View the XP chart
              </span>
              <span className="mt-1 block text-[10px] text-white/30">
                See which real changes created this score.
              </span>
            </span>
            <BarChart3 className="size-4 shrink-0 text-[#d8b5ff]" aria-hidden />
          </button>
        </div>
      </div>

      {selectedChart ? (
        <div className="mt-6 rounded-2xl border border-[#16c8ff]/18 bg-[radial-gradient(circle_at_0%_0%,rgba(22,200,255,0.07),transparent_35%),rgba(0,0,0,0.18)] p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <PurposeBadge kind="insight" />
                <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/30">
                  Chart opened from the card above
                </span>
              </div>
              <h3 className="mt-2 text-xl font-semibold text-white">
                {selectedChart === "level"
                  ? "Where your Network Level XP came from"
                  : `${activeMetric?.label ?? "Progress"}: saved baseline → latest snapshot`}
              </h3>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setSelectedChart(null)}>
              <X className="size-4" aria-hidden />
              Close chart
            </Button>
          </div>

          {selectedChart === "level" ? (
            <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(280px,0.75fr)]">
              <XpBreakdownChart rows={xpBreakdown} />
              <div className="grid gap-2.5">
                <PurposeExplanation kind="insight" title="What this chart measures">
                  The actual XP contributions returned by the progress engine for mutual growth, bridge coverage, separate warm paths, follower growth, follow-backs, and interaction.
                </PurposeExplanation>
                <PurposeExplanation kind="strategy" title="Why it matters">
                  A healthy score should not come only from adding follows. The chart makes the quality signals visible so you can see whether real relationships and independent routes are doing the work.
                </PurposeExplanation>
                <PurposeExplanation kind="action" title="What you do">
                  Nothing is required. Use this as a diagnostic; the Action Center is where specific people and suggested moves appear.
                </PurposeExplanation>
              </div>
              <p className="break-words text-[10px] leading-5 text-white/28 xl:col-span-2">
                {level.scoringNote}
              </p>
            </div>
          ) : activeMetric ? (
            <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(280px,0.75fr)]">
              <div>
                <BaselineChart metric={activeMetric} />
                <p className="mt-2 text-[10px] leading-5 text-white/30">
                  This is an honest two-point comparison: the saved baseline and the latest snapshot. It is not a made-up day-by-day trend line.
                </p>
              </div>
              <div className="grid gap-2.5">
                <PurposeExplanation kind="insight" title="What this measures">
                  {activeMetric.measures}
                </PurposeExplanation>
                <PurposeExplanation kind="strategy" title="Why it matters">
                  {activeMetric.why}
                </PurposeExplanation>
                <PurposeExplanation kind="action" title="What you do">
                  {activeMetric.next}
                </PurposeExplanation>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {current.mutualsSampled ? (
        <p className="mt-4 break-words text-xs leading-5 text-[#ffe4a0]/70">
          Mutual count is sampled because this account exceeds the current beta scan cap. Follower and following totals remain live profile totals.
        </p>
      ) : null}
      {error ? <p className="mt-4 break-words text-sm text-[#ffb4b8]">{error}</p> : null}
    </Card>
  );
}
