"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  ExternalLink,
  Loader2,
  Network,
  Sparkles,
  Target,
  UsersRound,
} from "lucide-react";
import { AdvancedNetworkActionCenter } from "@/components/tools/advanced-network-action-center";
import { AdvancedNetworkFollowButton } from "@/components/tools/advanced-network-follow-button";
import { AdvancedNetworkLiveMap } from "@/components/tools/advanced-network-live-map";
import { AdvancedNetworkRecommendationDetails } from "@/components/tools/advanced-network-recommendation-details";
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

function RecommendationCard({
  item,
  index,
  campaignId,
}: {
  item: AnalysisRecommendation;
  index: number;
  campaignId: string;
}) {
  return (
    <article className="rounded-2xl border border-white/8 bg-[#08090c] p-5 shadow-[0_18px_60px_rgba(0,0,0,0.12)] sm:p-6">
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
              <p className="mt-1 truncate text-xs text-white/36">
                @{item.handle} · {compact(item.followersCount)} followers
              </p>
            </div>
            {item.alreadyFollowsYou ? (
              <span className="rounded-full border border-emerald-300/18 bg-emerald-300/[0.055] px-2.5 py-1 text-[10px] text-emerald-200">
                follows you
              </span>
            ) : null}
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <AdvancedNetworkFollowButton
              did={item.did}
              handle={item.handle}
              following={item.following}
              campaignId={campaignId}
            />
            <a
              href={item.profileUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.025] px-3 py-2 text-xs font-medium text-white/55 transition hover:border-white/20 hover:text-white"
            >
              Open profile
              <ExternalLink className="size-3.5" aria-hidden />
            </a>
          </div>

          <AdvancedNetworkRecommendationDetails item={item} />
        </div>
      </div>
    </article>
  );
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

  const recommendationColumns = useMemo(() => {
    const items = analysis?.recommendations ?? [];
    return [
      items.filter((_, index) => index % 2 === 0),
      items.filter((_, index) => index % 2 === 1),
    ];
  }, [analysis]);

  useEffect(() => {
    if (!storageKey) return;
    const frame = window.requestAnimationFrame(() => {
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
    });
    return () => window.cancelAnimationFrame(frame);
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
        ? { actor: oauth.did, targets, categories, deepTargetLimit: DEFAULT_DEEP_TARGETS }
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
            : "No strong new target neighborhoods surfaced yet. Try a topic focus or enter specific accounts.",
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
      ? "Choosing destination neighborhoods…"
      : stage === "ranking-follows"
        ? "Finding the people who get you there…"
        : "Find people to follow";

  const strongestRecommendation = analysis?.recommendations?.[0];
  const warmOpportunities =
    analysis?.recommendations.filter((item) => item.alreadyFollowsYou).length ?? 0;

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
                Tell us the direction. We’ll give you the people.
              </h2>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-white/50">
                Pick target accounts if you have them, or let the engine choose destinations from your current graph. The routing logic stays in the background unless you want to inspect it.
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
                  <Sparkles className="size-5 text-[#8ce8ff]" aria-hidden />
                  <p className="mt-4 font-semibold text-white">Choose targets for me</p>
                  <p className="mt-2 text-xs leading-5 text-white/42">
                    Use the network I already have to pick reachable, high-value destinations.
                  </p>
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
                  <Target className="size-5 text-[#f1d49a]" aria-hidden />
                  <p className="mt-4 font-semibold text-white">I have target accounts</p>
                  <p className="mt-2 text-xs leading-5 text-white/42">
                    Enter up to {MAX_EXPLICIT_TARGETS} accounts you want to get closer to.
                  </p>
                </button>
              </div>

              {manualMode ? (
                <div className="mt-6">
                  <label className="text-sm font-medium text-white/72">
                    Target accounts{" "}
                    <span className="text-white/35">({targets.length}/{MAX_EXPLICIT_TARGETS})</span>
                  </label>
                  <textarea
                    value={targetText}
                    onChange={(event) => {
                      setTargetText(event.target.value);
                      invalidateResults();
                    }}
                    rows={4}
                    placeholder={"markhamillofficial.bsky.social\nexample.bsky.social"}
                    className="mt-2 w-full resize-y rounded-xl border border-white/12 bg-black/25 px-4 py-3 font-mono text-sm text-white outline-none focus:border-[#16c8ff]/55 focus:ring-4 focus:ring-[#16c8ff]/10"
                  />
                </div>
              ) : null}

              <details className="mt-6 rounded-xl border border-white/8 bg-white/[0.018] p-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium text-white/65">
                  Optional topic focus
                  <ChevronDown className="size-4 text-white/28" aria-hidden />
                </summary>
                <p className="mt-2 text-xs leading-5 text-white/34">
                  Topics influence ranking but never override strong network evidence.
                </p>
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
                            : "border-white/10 text-white/42 hover:text-white/70"
                        }`}
                      >
                        {category.label}
                      </button>
                    );
                  })}
                </div>
              </details>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Button
                  variant="glass"
                  className="min-w-[220px] justify-center"
                  onClick={() => void findPeopleToFollow()}
                  disabled={running || (manualMode && targets.length === 0)}
                >
                  {running ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                  ) : (
                    <UsersRound className="size-4" aria-hidden />
                  )}
                  {actionLabel}
                </Button>
                <p className="text-xs leading-5 text-white/32">
                  One click chooses destinations and finds the people worth cultivating on the way there.
                </p>
              </div>

              {running ? (
                <div className="mt-5 grid gap-2 sm:grid-cols-2">
                  <div
                    className={`rounded-xl border px-4 py-3 ${
                      stage === "finding-targets"
                        ? "border-[#16c8ff]/25 bg-[#16c8ff]/[0.05]"
                        : "border-emerald-300/12 bg-emerald-300/[0.025]"
                    }`}
                  >
                    <p className="text-xs font-semibold text-white">1. Choose destinations</p>
                    <p className="mt-1 text-[11px] text-white/32">Automatic</p>
                  </div>
                  <div
                    className={`rounded-xl border px-4 py-3 ${
                      stage === "ranking-follows"
                        ? "border-[#e6bd73]/25 bg-[#e6bd73]/[0.05]"
                        : "border-white/8 bg-white/[0.015]"
                    }`}
                  >
                    <p className="text-xs font-semibold text-white">2. Find bridge candidates</p>
                    <p className="mt-1 text-[11px] text-white/32">Automatic</p>
                  </div>
                </div>
              ) : null}

              {error ? (
                <p role="alert" className="mt-4 text-sm text-[#ffb4b8]">
                  {error}
                </p>
              ) : null}
            </div>
          </Card>

          {analysis ? (
            <Card className="overflow-hidden p-0">
              <div className="border-b border-white/10 bg-[radial-gradient(circle_at_100%_0%,rgba(230,189,115,0.09),transparent_38%)] px-5 py-6 sm:px-7">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#f1d49a]">
                  Your next follows
                </p>
                <div className="mt-2 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <h2 className="text-3xl font-semibold tracking-[-0.03em] text-white">
                      Start with the people who can get you there.
                    </h2>
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-white/46">
                      These are bridge candidates worth following and cultivating. They become activated bridges only after a real warm route involving you develops.
                    </p>
                  </div>
                  <span className="text-xs text-white/28">Run {analysis.runId.slice(0, 8)}</span>
                </div>

                <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-xl border border-white/8 bg-black/20 p-4">
                    <p className="text-[10px] uppercase tracking-[0.12em] text-white/28">Recommendations</p>
                    <p className="mt-1 text-2xl font-semibold text-white">{analysis.recommendations.length}</p>
                  </div>
                  <div className="rounded-xl border border-white/8 bg-black/20 p-4">
                    <p className="text-[10px] uppercase tracking-[0.12em] text-white/28">Warm follow-backs</p>
                    <p className="mt-1 text-2xl font-semibold text-emerald-200">{warmOpportunities}</p>
                  </div>
                  <div className="rounded-xl border border-white/8 bg-black/20 p-4">
                    <p className="text-[10px] uppercase tracking-[0.12em] text-white/28">Destination neighborhoods</p>
                    <p className="mt-1 text-2xl font-semibold text-[#d8b5ff]">{analysis.metrics.targetsAnalyzed}</p>
                  </div>
                  <div className="rounded-xl border border-white/8 bg-black/20 p-4">
                    <p className="text-[10px] uppercase tracking-[0.12em] text-white/28">Top bridge candidate</p>
                    <p className="mt-1 truncate text-sm font-semibold text-[#8ce8ff]">
                      {strongestRecommendation ? `@${strongestRecommendation.handle}` : "—"}
                    </p>
                  </div>
                </div>
              </div>

              {analysis.recommendations.length ? (
                <div className="grid gap-3 bg-[#05070a] p-3 lg:grid-cols-2 lg:p-4">
                  {recommendationColumns.map((column, columnIndex) => (
                    <div key={columnIndex} className="flex min-w-0 flex-col gap-3">
                      {column.map((item) => {
                        const originalIndex = analysis.recommendations.findIndex(
                          (candidate) => candidate.did === item.did,
                        );
                        return (
                          <RecommendationCard
                            key={item.did}
                            item={item}
                            index={originalIndex}
                            campaignId={analysis.campaignId}
                          />
                        );
                      })}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="px-6 py-12 text-center text-sm text-white/38">
                  No new follows survived the filters in this run.
                </div>
              )}

              <details className="border-t border-white/8 bg-[#07090c] px-5 py-4 sm:px-7">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-xs font-semibold text-[#d8b5ff]">
                  See destination details
                  <ChevronDown className="size-4 text-white/28" aria-hidden />
                </summary>
                <p className="mt-3 text-xs leading-5 text-white/38">
                  These large accounts are the destinations the bridge analysis is trying to move you toward. They are not automatically people you should spend your engagement time on directly.
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {analysis.targets.map((target) => (
                    <div
                      key={target.did}
                      className="rounded-xl border border-[#aa63ff]/12 bg-[#aa63ff]/[0.025] p-3"
                    >
                      <p className="truncate text-xs font-semibold text-white">
                        {target.displayName || `@${target.handle}`}
                      </p>
                      <p className="mt-1 truncate text-[10px] text-white/30">@{target.handle}</p>
                      <p className="mt-2 text-[10px] text-white/30">
                        {compact(target.followersCount)} followers · destination neighborhood
                      </p>
                    </div>
                  ))}
                </div>
                <p className="mt-4 text-[11px] leading-5 text-white/30">{analysis.note}</p>
              </details>
            </Card>
          ) : null}

          <AdvancedNetworkActionCenter runId={analysis?.runId} />

          <Card className="overflow-hidden p-0">
            <div className="border-b border-white/10 px-5 py-5 sm:px-7">
              <div className="flex items-start gap-3">
                <Network className="mt-0.5 size-5 text-[#8ce8ff]" aria-hidden />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8ce8ff]">
                    Network overview
                  </p>
                  <h2 className="mt-1 text-xl font-semibold text-white">
                    High-level first. Drill down only when you want to.
                  </h2>
                  <p className="mt-2 max-w-3xl text-xs leading-5 text-white/36">
                    The map separates your warm network, activated bridges, and destination neighborhoods so it does not become an endless wall of lines.
                  </p>
                </div>
              </div>
            </div>
            <AdvancedNetworkLiveMap recon={recon} />
          </Card>

          <details className="rounded-2xl border border-white/8 bg-white/[0.015] p-5 sm:p-6">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-white/62">
              How the strategy works
              <ChevronDown className="size-4 text-white/28" aria-hidden />
            </summary>
            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {[
                "1. Choose destination neighborhoods",
                "2. Identify bridge candidates",
                "3. Confirm target-circle connections",
                "4. Activate warm relationships through real interaction",
                "5. Build multiple independent bridges and social proof",
                "6. Expand into new communities when footholds become real",
              ].map((step) => (
                <div
                  key={step}
                  className="rounded-xl border border-white/8 bg-black/15 px-4 py-3 text-xs text-white/42"
                >
                  {step}
                </div>
              ))}
            </div>
          </details>
        </>
      )}
    </div>
  );
}
