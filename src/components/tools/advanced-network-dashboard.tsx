"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ExternalLink,
  GitBranch,
  Loader2,
  Sparkles,
  Target,
  UserPlus,
  UsersRound,
} from "lucide-react";
import { AdvancedNetworkFollowButton } from "@/components/tools/advanced-network-follow-button";
import { AdvancedNetworkLiveMap } from "@/components/tools/advanced-network-live-map";
import {
  RequiredBlueskyConnection,
  useAdvancedBlueskyOAuth,
} from "@/components/tools/advanced-network-oauth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  ADVANCED_NETWORK_CATEGORIES,
  DEFAULT_DEEP_TARGETS,
  MAX_EXPLICIT_TARGETS,
  type AdvancedTargetMode,
  type ReconResponse,
  type StartingNetworkScope,
} from "@/lib/advanced-network";

type AnalysisPath = {
  kind: string;
  targetHandle: string;
  viaHandles: string[];
  distanceAfterReciprocity: number;
  interactionStrength: number;
};

type AnalysisRecommendation = {
  did: string;
  handle: string;
  displayName?: string;
  description?: string;
  avatar?: string;
  followersCount: number;
  followsCount: number;
  importanceScore: number;
  reciprocityPotential: number;
  shortestDistanceAfterReciprocity: number;
  independentPaths: number;
  sharedTargetClusters: number;
  recommendationType: string;
  types: string[];
  targetHandles: string[];
  reason: string;
  strategy: string;
  paths: AnalysisPath[];
  alreadyFollowsYou: boolean;
  following: boolean;
  followedBy: boolean;
  profileUrl: string;
};

type AnalysisResponse = {
  runId: string;
  campaignId: string;
  engine: string;
  generatedAt: string;
  targets: Array<{
    did: string;
    handle: string;
    displayName?: string;
    followersCount: number;
  }>;
  metrics: {
    scope: StartingNetworkScope;
    observableFollowers: number;
    startingPool: number;
    targetsAnalyzed: number;
    verifiedStartingBridges: number;
    targetBesties: number;
    firstHopExpansions: number;
    candidateAccounts: number;
    recommendationsReturned: number;
    alreadyFollowingCandidates: number;
    secondWaveTargets: string[];
  };
  recommendations: AnalysisRecommendation[];
  note: string;
  error?: string;
};

type DiscoveryTarget = ReconResponse["targets"][number] & {
  source?: "expanded-graph";
  warmPathHandles?: string[];
  warmPathCount?: number;
  categoryMatches?: string[];
  discoveryReason?: string;
};

type ExtendedReconResponse = Omit<ReconResponse, "targets"> & {
  targets: DiscoveryTarget[];
  discovery?: {
    mode: "expanded-graph";
    scope: StartingNetworkScope;
    observableFollowers: number;
    startingAnchorsScanned: number;
    reciprocalInteractionEndpoints: number;
    freshLargeDirections: number;
    existingTargetsExcluded: number;
  };
  error?: string;
};

type RunStage = "idle" | "finding-targets" | "ranking-follows";

const typeLabels: Record<string, string> = {
  "warm-follower-bridge": "Warm follower bridge",
  "target-bestie": "Target bestie",
  "bestie-of-bestie": "Bestie of bestie",
  "bridge-bestie": "Bridge bestie",
  "second-wave-large-target": "Wave 2 large account",
  "second-wave-bestie": "Wave 2 bestie",
};

function compact(value: number) {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function getStartingScope(did: string): StartingNetworkScope {
  const saved = window.localStorage.getItem(`rukh:advanced-network:start-scope:${did}`);
  return saved === "mutuals-only" ? "mutuals-only" : "all-followers";
}

function pathText(path: AnalysisPath) {
  return path.viaHandles.map((handle) => `@${handle}`).join("  ↔  ");
}

export function AdvancedNetworkDashboard() {
  const oauth = useAdvancedBlueskyOAuth();
  const [mode, setMode] = useState<AdvancedTargetMode>("suggested");
  const [targetText, setTargetText] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [recon, setRecon] = useState<ExtendedReconResponse | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);
  const [stage, setStage] = useState<RunStage>("idle");
  const [error, setError] = useState("");

  const targets = useMemo(
    () =>
      Array.from(
        new Set(
          targetText
            .split(/[\n,]+/)
            .map((item) => item.trim())
            .filter(Boolean),
        ),
      ).slice(0, MAX_EXPLICIT_TARGETS),
    [targetText],
  );

  const connected = oauth.phase === "connected" && Boolean(oauth.did);
  const storageKey = oauth.did ? `rukh:advanced-network:draft:${oauth.did}` : "";
  const manualMode = mode === "profiles";
  const running = stage !== "idle";
  const deepTargets = useMemo(
    () => (recon?.targets ?? []).filter((target) => target.disposition === "deep-analysis"),
    [recon],
  );

  useEffect(() => {
    if (!storageKey) return;
    try {
      const saved = JSON.parse(window.localStorage.getItem(storageKey) ?? "null") as {
        mode?: AdvancedTargetMode;
        targetText?: string;
        categories?: string[];
      } | null;
      if (saved?.mode) {
        setMode(saved.mode === "profiles" || saved.mode === "hybrid" ? "profiles" : "suggested");
      }
      if (typeof saved?.targetText === "string") setTargetText(saved.targetText);
      if (Array.isArray(saved?.categories)) setCategories(saved.categories);
    } catch {
      // Ignore malformed drafts.
    }
  }, [storageKey]);

  useEffect(() => {
    if (!storageKey) return;
    window.localStorage.setItem(storageKey, JSON.stringify({ mode, targetText, categories }));
  }, [storageKey, mode, targetText, categories]);

  function invalidateResults() {
    setRecon(null);
    setAnalysis(null);
    setError("");
  }

  async function findPeopleToFollow() {
    if (!oauth.did || (manualMode && targets.length === 0)) return;

    setError("");
    setRecon(null);
    setAnalysis(null);
    setStage("finding-targets");

    try {
      const targetEndpoint = manualMode
        ? "/api/advanced-network/recon"
        : "/api/advanced-network/suggest";
      const targetBody = manualMode
        ? {
            actor: oauth.did,
            targets,
            categories,
            deepTargetLimit: DEFAULT_DEEP_TARGETS,
          }
        : {
            actor: oauth.did,
            categories,
            scope: getStartingScope(oauth.did),
            deepTargetLimit: DEFAULT_DEEP_TARGETS,
          };

      const targetResponse = await fetch(targetEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(targetBody),
      });
      const targetResult = (await targetResponse.json()) as ExtendedReconResponse;
      if (!targetResponse.ok) {
        throw new Error(targetResult.error || "Could not choose target neighborhoods.");
      }

      const selectedTargets = targetResult.targets
        .filter((target) => target.disposition === "deep-analysis")
        .slice(0, DEFAULT_DEEP_TARGETS);
      if (!selectedTargets.length) {
        throw new Error(
          manualMode
            ? "None of those target accounts could be analyzed. Check the handles and try again."
            : "No strong new target neighborhoods surfaced from this graph yet. Try adding a topic focus or use specific accounts.",
        );
      }

      setRecon(targetResult);
      setStage("ranking-follows");

      const analysisResponse = await fetch("/api/advanced-network/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actor: oauth.did,
          targets: selectedTargets.map((target) => target.handle),
          categories,
          scope: getStartingScope(oauth.did),
        }),
      });
      const analysisResult = (await analysisResponse.json()) as AnalysisResponse;
      if (!analysisResponse.ok) {
        throw new Error(analysisResult.error || "Could not rank the next accounts to follow.");
      }
      setAnalysis(analysisResult);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Network analysis failed.");
    } finally {
      setStage("idle");
    }
  }

  const actionLabel =
    stage === "finding-targets"
      ? "Choosing the best target neighborhoods…"
      : stage === "ranking-follows"
        ? "Ranking your best next follows…"
        : "Find people to follow";

  return (
    <div className="grid gap-6">
      <RequiredBlueskyConnection />

      {!connected ? null : (
        <>
          <Card className="overflow-hidden p-0">
            <div className="border-b border-white/10 bg-[radial-gradient(circle_at_100%_0%,rgba(22,200,255,0.08),transparent_36%),radial-gradient(circle_at_0%_100%,rgba(230,189,115,0.07),transparent_36%)] px-5 py-6 sm:px-7 sm:py-7">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8ce8ff]">
                Find your next follows
              </p>
              <h2 className="mt-2 max-w-3xl text-3xl font-semibold tracking-[-0.03em] text-white">
                Pick a direction. The engine handles the rest.
              </h2>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-white/50">
                You can name accounts you want to get closer to, or let your current network choose the most reachable high-value destinations. Either way, one click finds and ranks the actual people worth following next.
              </p>
            </div>

            <div className="p-5 sm:p-7">
              <div className="grid gap-3 md:grid-cols-2">
                <button
                  type="button"
                  onClick={() => {
                    setMode("suggested");
                    invalidateResults();
                  }}
                  className={`rounded-2xl border p-5 text-left transition ${
                    !manualMode
                      ? "border-[#16c8ff]/45 bg-[#16c8ff]/[0.075] shadow-[0_0_28px_rgba(22,200,255,0.06)]"
                      : "border-white/10 bg-white/[0.02] hover:border-white/20"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="grid size-10 place-items-center rounded-xl border border-[#16c8ff]/20 bg-[#16c8ff]/[0.07] text-[#a9efff]">
                      <Sparkles className="size-4" aria-hidden />
                    </span>
                    <div>
                      <p className="font-semibold text-white">Choose targets for me</p>
                      <p className="mt-1 text-xs leading-5 text-white/42">
                        Use my existing network to find reachable, high-value destination accounts.
                      </p>
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMode("profiles");
                    invalidateResults();
                  }}
                  className={`rounded-2xl border p-5 text-left transition ${
                    manualMode
                      ? "border-[#e6bd73]/40 bg-[#e6bd73]/[0.065] shadow-[0_0_28px_rgba(230,189,115,0.05)]"
                      : "border-white/10 bg-white/[0.02] hover:border-white/20"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="grid size-10 place-items-center rounded-xl border border-[#e6bd73]/20 bg-[#e6bd73]/[0.07] text-[#f1d49a]">
                      <Target className="size-4" aria-hidden />
                    </span>
                    <div>
                      <p className="font-semibold text-white">I have target accounts</p>
                      <p className="mt-1 text-xs leading-5 text-white/42">
                        Tell me who you want to get closer to and I’ll find the strongest route.
                      </p>
                    </div>
                  </div>
                </button>
              </div>

              {manualMode ? (
                <div className="mt-6">
                  <label className="text-sm font-medium text-white/72">
                    Accounts you want to get closer to{" "}
                    <span className="text-white/35">
                      ({targets.length}/{MAX_EXPLICIT_TARGETS})
                    </span>
                  </label>
                  <textarea
                    value={targetText}
                    onChange={(event) => {
                      setTargetText(event.target.value);
                      invalidateResults();
                    }}
                    rows={4}
                    placeholder={
                      "markhamillofficial.bsky.social\nexample.bsky.social\nhttps://bsky.app/profile/another.example"
                    }
                    className="mt-2 w-full resize-y rounded-xl border border-white/12 bg-black/25 px-4 py-3 font-mono text-sm text-white outline-none focus:border-[#16c8ff]/55 focus:ring-4 focus:ring-[#16c8ff]/10"
                  />
                  <p className="mt-2 text-xs text-white/34">
                    One handle or profile URL per line. The engine automatically picks the strongest targets for the deeper run.
                  </p>
                </div>
              ) : (
                <div className="mt-6 rounded-xl border border-[#16c8ff]/14 bg-[#16c8ff]/[0.03] p-4 text-xs leading-6 text-white/45">
                  No target entry needed. The engine will expand your current warm network, ignore destinations already used in your saved campaign, and choose fresh large accounts with the strongest reachable paths.
                </div>
              )}

              <div className="mt-6">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-sm font-medium text-white/72">Optional topic focus</p>
                    <p className="mt-1 text-xs text-white/34">
                      These gently influence ranking. Leave everything off if you want the network itself to decide.
                    </p>
                  </div>
                  {categories.length ? (
                    <button
                      type="button"
                      onClick={() => {
                        setCategories([]);
                        invalidateResults();
                      }}
                      className="text-xs text-white/38 transition hover:text-white/70"
                    >
                      Clear topics
                    </button>
                  ) : null}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {ADVANCED_NETWORK_CATEGORIES.map((category) => {
                    const selected = categories.includes(category.id);
                    return (
                      <button
                        key={category.id}
                        type="button"
                        onClick={() => {
                          setCategories((current) =>
                            selected
                              ? current.filter((item) => item !== category.id)
                              : [...current, category.id].slice(0, 8),
                          );
                          invalidateResults();
                        }}
                        className={`rounded-full border px-3 py-2 text-xs transition ${
                          selected
                            ? "border-[#16c8ff]/45 bg-[#16c8ff]/10 text-[#b9f1ff]"
                            : "border-white/10 bg-white/[0.02] text-white/45 hover:border-white/20 hover:text-white/72"
                        }`}
                      >
                        {category.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-7 rounded-2xl border border-white/10 bg-black/20 p-4 sm:flex sm:items-center sm:justify-between sm:gap-6">
                <div className="mb-4 sm:mb-0">
                  <p className="text-sm font-semibold text-white">One click from here.</p>
                  <p className="mt-1 text-xs leading-5 text-white/38">
                    We’ll choose or validate destination accounts, trace reciprocal bridge/bestie paths, discover deeper neighborhoods, and return a ranked follow list automatically.
                  </p>
                </div>
                <Button
                  variant="glass"
                  className="min-w-52 shrink-0"
                  onClick={() => void findPeopleToFollow()}
                  disabled={running || (manualMode && targets.length === 0)}
                >
                  {running ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                  ) : (
                    <UserPlus className="size-4" aria-hidden />
                  )}
                  {actionLabel}
                </Button>
              </div>

              {running ? (
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  <div
                    className={`rounded-xl border px-4 py-3 text-xs transition ${
                      stage === "finding-targets"
                        ? "border-[#16c8ff]/30 bg-[#16c8ff]/[0.05] text-[#b9f1ff]"
                        : "border-emerald-300/16 bg-emerald-300/[0.035] text-emerald-200/80"
                    }`}
                  >
                    <span className="font-semibold">1. Choose target neighborhoods</span>
                    <span className="mt-1 block opacity-70">
                      {stage === "finding-targets" ? "Working…" : "Done"}
                    </span>
                  </div>
                  <div
                    className={`rounded-xl border px-4 py-3 text-xs transition ${
                      stage === "ranking-follows"
                        ? "border-[#e6bd73]/30 bg-[#e6bd73]/[0.05] text-[#f1d49a]"
                        : "border-white/8 bg-white/[0.015] text-white/30"
                    }`}
                  >
                    <span className="font-semibold">2. Rank your best next follows</span>
                    <span className="mt-1 block opacity-70">
                      {stage === "ranking-follows" ? "Working…" : "Up next"}
                    </span>
                  </div>
                </div>
              ) : null}

              {error ? (
                <div role="alert" className="mt-4 rounded-xl border border-[#ff7e8a]/20 bg-[#ff7e8a]/[0.04] px-4 py-3 text-sm text-[#ffb4b8]">
                  {error}
                </div>
              ) : null}
            </div>
          </Card>

          {analysis ? (
            <Card className="overflow-hidden p-0">
              <div className="border-b border-white/10 bg-[radial-gradient(circle_at_0%_0%,rgba(22,200,255,0.07),transparent_38%)] px-5 py-6 sm:px-7">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8ce8ff]">
                      Your next follows
                    </p>
                    <h2 className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-white">
                      These are the accounts worth acting on.
                    </h2>
                    <p className="mt-3 max-w-3xl text-sm leading-6 text-white/48">
                      Ranked by reciprocal proximity, independent paths, repeated interaction strength, target-neighborhood overlap, influence, reciprocity potential, and mass-follow penalties. You can follow directly from each card.
                    </p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/[0.025] px-4 py-3 text-xs text-white/42">
                    Run {analysis.runId.slice(0, 8)}
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {[
                    ["People to follow", analysis.metrics.recommendationsReturned],
                    ["Target neighborhoods", analysis.metrics.targetsAnalyzed],
                    ["Verified bridges", analysis.metrics.verifiedStartingBridges],
                    ["Fresh Wave 2", analysis.metrics.secondWaveTargets.length],
                  ].map(([label, value]) => (
                    <div key={String(label)} className="rounded-xl border border-white/8 bg-black/20 px-3 py-3">
                      <p className="text-[10px] uppercase tracking-[0.1em] text-white/30">{label}</p>
                      <p className="mt-1 text-lg font-semibold text-white">{Number(value).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              </div>

              {analysis.recommendations.length ? (
                <div className="grid gap-px bg-white/8 lg:grid-cols-2">
                  {analysis.recommendations.map((item, index) => (
                    <article key={item.did} className="bg-[#08090c] p-5 sm:p-6">
                      <div className="flex items-start gap-4">
                        <div className="grid size-10 shrink-0 place-items-center rounded-xl border border-[#16c8ff]/20 bg-[#16c8ff]/[0.06] text-sm font-semibold text-[#a9efff]">
                          {index + 1}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-base font-semibold text-white">
                                {item.displayName || `@${item.handle}`}
                              </p>
                              <p className="mt-1 truncate text-xs text-white/38">@{item.handle}</p>
                            </div>
                            <div className="flex flex-wrap justify-end gap-1.5">
                              <span className="rounded-full border border-[#e6bd73]/18 bg-[#e6bd73]/[0.055] px-2.5 py-1 text-[10px] text-[#f1d49a]">
                                {typeLabels[item.recommendationType] || item.recommendationType}
                              </span>
                              {item.alreadyFollowsYou ? (
                                <span className="rounded-full border border-emerald-300/18 bg-emerald-300/[0.055] px-2.5 py-1 text-[10px] text-emerald-200">
                                  Already follows you
                                </span>
                              ) : null}
                            </div>
                          </div>

                          <div className="mt-4 grid grid-cols-4 gap-2 text-xs">
                            <div>
                              <b className="block text-white">{compact(item.followersCount)}</b>
                              <span className="text-white/30">followers</span>
                            </div>
                            <div>
                              <b className="block text-[#8ce8ff]">{item.importanceScore}</b>
                              <span className="text-white/30">importance</span>
                            </div>
                            <div>
                              <b className="block text-emerald-200">{item.reciprocityPotential}</b>
                              <span className="text-white/30">reciprocity</span>
                            </div>
                            <div>
                              <b className="block text-[#d8b5ff]">{item.independentPaths}</b>
                              <span className="text-white/30">paths</span>
                            </div>
                          </div>

                          <p className="mt-4 text-sm leading-6 text-white/58">{item.reason}</p>

                          {item.paths[0] ? (
                            <div className="mt-4 rounded-xl border border-white/8 bg-black/20 p-3">
                              <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-white/30">
                                Strongest verified path
                              </p>
                              <p className="mt-2 overflow-x-auto whitespace-nowrap font-mono text-xs text-[#b9f1ff]">
                                {pathText(item.paths[0])}
                              </p>
                              <p className="mt-2 text-[11px] text-white/30">
                                Potential reciprocal distance: {item.shortestDistanceAfterReciprocity} · {item.sharedTargetClusters} target cluster{item.sharedTargetClusters === 1 ? "" : "s"}
                              </p>
                            </div>
                          ) : null}

                          <div className="mt-4 border-l-2 border-[#e6bd73]/35 pl-3">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#f1d49a]">
                              Best way to approach
                            </p>
                            <p className="mt-1 text-xs leading-5 text-white/45">{item.strategy}</p>
                          </div>

                          <div className="mt-5 flex flex-wrap items-start gap-3">
                            <AdvancedNetworkFollowButton
                              did={item.did}
                              handle={item.handle}
                              following={item.following}
                              campaignId={analysis.campaignId}
                            />
                            <a
                              href={item.profileUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.025] px-3 py-2 text-xs font-medium text-white/55 transition hover:border-white/20 hover:text-white"
                            >
                              <ExternalLink className="size-3.5" aria-hidden />
                              View profile
                            </a>
                            <span className="self-center text-[11px] text-white/28">
                              Helps toward {item.targetHandles.slice(0, 3).map((handle) => `@${handle}`).join(", ")}
                              {item.targetHandles.length > 3 ? ` +${item.targetHandles.length - 3}` : ""}
                            </span>
                          </div>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="px-6 py-12 text-center">
                  <p className="text-sm font-semibold text-white">No new follows survived the filters.</p>
                  <p className="mt-2 text-xs text-white/38">
                    The useful accounts found in this run are already people you follow. Try another direction or broaden the starting network.
                  </p>
                </div>
              )}

              {recon ? (
                <div className="border-t border-white/8 bg-[#07090c] px-5 py-5 sm:px-7">
                  <details className="group rounded-xl border border-white/8 bg-white/[0.015]">
                    <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium text-white/58 transition hover:text-white">
                      Why these recommendations? <span className="text-white/28">· {deepTargets.length} destination account{deepTargets.length === 1 ? "" : "s"} analyzed</span>
                    </summary>
                    <div className="border-t border-white/8 px-4 py-4">
                      <p className="max-w-3xl text-xs leading-5 text-white/38">
                        These are the destination neighborhoods the engine used to calculate your routes. They are context, not a second to-do list. Your actionable follow list is above.
                      </p>
                      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                        {deepTargets.map((target) => (
                          <div key={target.did} className="rounded-xl border border-white/8 bg-black/20 p-3">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-white">
                                  {target.displayName || `@${target.handle}`}
                                </p>
                                <p className="mt-1 truncate text-[11px] text-white/36">@{target.handle}</p>
                              </div>
                              <span className="shrink-0 text-[11px] text-white/36">{compact(target.followersCount)}</span>
                            </div>
                            {target.discoveryReason ? (
                              <p className="mt-3 text-[11px] leading-5 text-white/38">{target.discoveryReason}</p>
                            ) : null}
                            <a
                              href={`https://bsky.app/profile/${target.handle}`}
                              target="_blank"
                              rel="noreferrer"
                              className="mt-3 inline-flex items-center gap-1.5 text-[11px] text-[#a9efff]/70 transition hover:text-[#a9efff]"
                            >
                              <ExternalLink className="size-3" aria-hidden />
                              View destination
                            </a>
                          </div>
                        ))}
                      </div>
                    </div>
                  </details>
                </div>
              ) : null}
            </Card>
          ) : null}

          <Card className="overflow-hidden p-0">
            <div className="flex flex-col gap-3 border-b border-white/10 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
              <div className="flex items-center gap-3">
                <GitBranch className="size-5 text-[#ff7e8a]" aria-hidden />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#ff8994]">
                    Network map
                  </p>
                  <h2 className="mt-1 text-xl font-semibold text-white">
                    The real relationships behind your recommendations
                  </h2>
                </div>
              </div>
              <p className="max-w-md text-xs leading-5 text-white/35">
                Real Bluesky accounts and verified relationship edges only. The map refreshes when your network, scope, or target neighborhoods change.
              </p>
            </div>
            <AdvancedNetworkLiveMap recon={recon} />
          </Card>

          <details className="rounded-2xl border border-white/8 bg-white/[0.015]">
            <summary className="cursor-pointer list-none px-5 py-4 text-sm font-medium text-white/42 transition hover:text-white/70 sm:px-7">
              How the engine works
            </summary>
            <div className="border-t border-white/8 px-5 py-5 sm:px-7">
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {[
                  "Choose the strongest destination accounts",
                  "Find shortest reciprocal paths and bridges",
                  "Expand bridge besties and destination besties",
                  "Expand besties-of-besties and warm follower routes",
                  "Score follow-back leverage and network value",
                  "Discover a fresh large-account Wave 2 and repeat",
                ].map((step, index) => (
                  <div key={step} className="rounded-xl border border-white/8 bg-black/20 px-4 py-3 text-xs leading-5 text-white/42">
                    <span className="mr-2 text-[#e6bd73]">{index + 1}.</span>
                    {step}
                  </div>
                ))}
              </div>
            </div>
          </details>
        </>
      )}
    </div>
  );
}
