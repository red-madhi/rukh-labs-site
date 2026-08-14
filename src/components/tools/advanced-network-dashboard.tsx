"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BarChart3,
  ExternalLink,
  GitBranch,
  Loader2,
  Radar,
  Sparkles,
  Target,
  UserPlus,
  UsersRound,
} from "lucide-react";
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

const modeCopy: Record<AdvancedTargetMode, { label: string; description: string }> = {
  profiles: {
    label: "Specific profiles",
    description: "Aim at up to 10 named Bluesky accounts.",
  },
  categories: {
    label: "Categories",
    description: "Let the engine discover influential accounts in selected areas.",
  },
  hybrid: {
    label: "Hybrid",
    description: "Use named anchors plus category discovery around them.",
  },
  suggested: {
    label: "Suggested direction",
    description: "Let your existing graph reveal the cheapest high-value direction.",
  },
};

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
  const [mode, setMode] = useState<AdvancedTargetMode>("hybrid");
  const [targetText, setTargetText] = useState("");
  const [categories, setCategories] = useState<string[]>(["gaming", "software"]);
  const [recon, setRecon] = useState<ReconResponse | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);
  const [error, setError] = useState("");
  const [working, setWorking] = useState(false);
  const [analysisWorking, setAnalysisWorking] = useState(false);
  const [analysisError, setAnalysisError] = useState("");

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
      if (saved?.mode) setMode(saved.mode);
      if (typeof saved?.targetText === "string") setTargetText(saved.targetText);
      if (Array.isArray(saved?.categories)) setCategories(saved.categories);
    } catch {
      // Ignore malformed drafts.
    }
  }, [storageKey]);

  useEffect(() => {
    if (!storageKey) return;
    window.localStorage.setItem(
      storageKey,
      JSON.stringify({ mode, targetText, categories }),
    );
  }, [storageKey, mode, targetText, categories]);

  function invalidateAnalysis() {
    setRecon(null);
    setAnalysis(null);
    setError("");
    setAnalysisError("");
  }

  async function runRecon() {
    if (!oauth.did) return;
    setWorking(true);
    setError("");
    setAnalysis(null);
    setAnalysisError("");
    try {
      const response = await fetch("/api/advanced-network/recon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actor: oauth.did,
          targets,
          categories,
          deepTargetLimit: DEFAULT_DEEP_TARGETS,
        }),
      });
      const result = (await response.json()) as ReconResponse & { error?: string };
      if (!response.ok) throw new Error(result.error || "Reconnaissance failed.");
      setRecon(result);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Reconnaissance failed.");
    } finally {
      setWorking(false);
    }
  }

  async function runAdvancedAnalysis() {
    if (!oauth.did || !deepTargets.length) return;
    setAnalysisWorking(true);
    setAnalysisError("");
    try {
      const response = await fetch("/api/advanced-network/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actor: oauth.did,
          targets: deepTargets.map((target) => target.handle),
          categories,
          scope: getStartingScope(oauth.did),
        }),
      });
      const result = (await response.json()) as AnalysisResponse;
      if (!response.ok) throw new Error(result.error || "Advanced analysis failed.");
      setAnalysis(result);
    } catch (caught) {
      setAnalysisError(caught instanceof Error ? caught.message : "Advanced analysis failed.");
    } finally {
      setAnalysisWorking(false);
    }
  }

  return (
    <div className="grid gap-6">
      <RequiredBlueskyConnection />

      {!connected ? null : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              {
                icon: Target,
                label: "Named targets",
                value: String(targets.length),
                note: `up to ${MAX_EXPLICIT_TARGETS}`,
              },
              {
                icon: GitBranch,
                label: "Deep targets/run",
                value: String(DEFAULT_DEEP_TARGETS),
                note: "cost-aware selection",
              },
              {
                icon: UsersRound,
                label: "Live graph",
                value: "On",
                note: "verified Bluesky edges",
              },
              {
                icon: BarChart3,
                label: "Historical comparison",
                value: "On",
                note: "baseline + snapshots",
              },
            ].map((metric) => (
              <Card key={metric.label} className="p-5">
                <metric.icon className="size-5 text-[#8ce8ff]" aria-hidden />
                <p className="mt-4 text-xs uppercase tracking-[0.12em] text-white/38">
                  {metric.label}
                </p>
                <p className="mt-1 text-2xl font-semibold text-white">{metric.value}</p>
                <p className="mt-1 text-xs text-white/35">{metric.note}</p>
              </Card>
            ))}
          </div>

          <Card className="p-5 sm:p-7">
            <div className="flex items-start gap-3">
              <Radar className="mt-1 size-5 text-[#e6bd73]" aria-hidden />
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#e6bd73]">
                  Target configuration
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-white">
                  Tell the engine where you want to move.
                </h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-white/52">
                  Named accounts are anchor nodes. Reconnaissance validates them cheaply first; the Advanced Analysis button then crawls reciprocal bridge and bestie neighborhoods and returns the accounts worth following.
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-3 md:grid-cols-4">
              {(Object.keys(modeCopy) as AdvancedTargetMode[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    setMode(key);
                    invalidateAnalysis();
                  }}
                  className={`rounded-xl border p-4 text-left transition ${
                    mode === key
                      ? "border-[#16c8ff]/50 bg-[#16c8ff]/9"
                      : "border-white/10 bg-white/[0.02] hover:border-white/20"
                  }`}
                >
                  <span className="block text-sm font-semibold text-white">
                    {modeCopy[key].label}
                  </span>
                  <span className="mt-2 block text-xs leading-5 text-white/40">
                    {modeCopy[key].description}
                  </span>
                </button>
              ))}
            </div>

            {mode !== "categories" && mode !== "suggested" ? (
              <div className="mt-6">
                <label className="text-sm font-medium text-white/72">
                  Profile targets{" "}
                  <span className="text-white/35">
                    ({targets.length}/{MAX_EXPLICIT_TARGETS})
                  </span>
                </label>
                <textarea
                  value={targetText}
                  onChange={(event) => {
                    setTargetText(event.target.value);
                    invalidateAnalysis();
                  }}
                  rows={5}
                  placeholder={
                    "markhamillofficial.bsky.social\nexample.bsky.social\nhttps://bsky.app/profile/another.example"
                  }
                  className="mt-2 w-full resize-y rounded-xl border border-white/12 bg-black/20 px-4 py-3 font-mono text-sm text-white outline-none focus:border-[#16c8ff]/55 focus:ring-4 focus:ring-[#16c8ff]/10"
                />
                <p className="mt-2 text-xs text-white/36">
                  One handle or profile URL per line. Up to six of the strongest targets are expanded deeply in a single run.
                </p>
              </div>
            ) : null}

            {mode !== "profiles" ? (
              <div className="mt-6">
                <p className="text-sm font-medium text-white/72">Category directions</p>
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
                          invalidateAnalysis();
                        }}
                        className={`rounded-full border px-3 py-2 text-xs transition ${
                          selected
                            ? "border-[#16c8ff]/45 bg-[#16c8ff]/10 text-[#b9f1ff]"
                            : "border-white/10 bg-white/[0.02] text-white/48 hover:text-white"
                        }`}
                      >
                        {category.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {mode === "suggested" ? (
              <div className="mt-6 rounded-xl border border-[#e6bd73]/18 bg-[#e6bd73]/[0.045] p-4 text-sm leading-6 text-white/54">
                <Sparkles className="mb-2 size-4 text-[#e6bd73]" aria-hidden />
                Suggested-direction discovery is still being expanded. Named target analysis below is live and persists its recommendations and runs.
              </div>
            ) : null}

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Button
                variant="glass"
                onClick={() => void runRecon()}
                disabled={
                  working ||
                  ((mode === "profiles" || mode === "hybrid") && targets.length === 0)
                }
              >
                {working ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : (
                  <Radar className="size-4" aria-hidden />
                )}
                {working ? "Running reconnaissance…" : "Run cheap reconnaissance"}
              </Button>
              <span className="text-xs text-white/34">
                First pass: validates and cost-ranks named targets.
              </span>
            </div>
            {error ? (
              <p role="alert" className="mt-3 text-sm text-[#ffb4b8]">
                {error}
              </p>
            ) : null}
          </Card>

          {recon ? (
            <Card className="p-5 sm:p-7">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8ce8ff]">
                    Reconnaissance result
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-white">
                    {deepTargets.length} selected for deep analysis
                  </h2>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-white/48">
                    These targets passed the cheap validation step. The next button performs the reciprocal bestie/bridge crawl and builds the ranked follow list.
                  </p>
                </div>
                <p className="text-sm text-white/42">{recon.deferredCount} deferred</p>
              </div>

              <div className="mt-6 grid gap-3 lg:grid-cols-2">
                {recon.targets.map((target) => (
                  <div
                    key={target.did}
                    className="rounded-xl border border-white/10 bg-white/[0.02] p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-white">
                          {target.displayName || `@${target.handle}`}
                        </p>
                        <p className="mt-1 text-xs text-white/40">@{target.handle}</p>
                      </div>
                      <span
                        className={`rounded-full border px-2.5 py-1 text-[11px] ${
                          target.disposition === "deep-analysis"
                            ? "border-emerald-300/20 bg-emerald-300/8 text-emerald-100"
                            : "border-white/10 text-white/42"
                        }`}
                      >
                        {target.disposition === "deep-analysis" ? "Deep run" : "Deferred"}
                      </span>
                    </div>
                    <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
                      <span>
                        <b className="block text-white">{compact(target.followersCount)}</b>
                        <span className="text-white/35">followers</span>
                      </span>
                      <span>
                        <b className="block text-white">{target.priorityScore}</b>
                        <span className="text-white/35">priority</span>
                      </span>
                      <span>
                        <b className="block capitalize text-white">{target.estimatedCost}</b>
                        <span className="text-white/35">cost</span>
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {deepTargets.length ? (
                <div className="mt-6 rounded-2xl border border-[#e6bd73]/28 bg-[radial-gradient(circle_at_100%_0%,rgba(230,189,115,0.12),transparent_42%),rgba(230,189,115,0.035)] p-5 sm:flex sm:items-center sm:justify-between sm:gap-6">
                  <div>
                    <p className="flex items-center gap-2 text-sm font-semibold text-[#f1d49a]">
                      <UserPlus className="size-4" aria-hidden />
                      Ready to find the people to follow
                    </p>
                    <p className="mt-2 max-w-2xl text-xs leading-6 text-white/45">
                      This runs the real bounded recursive engine: current followers/mutuals → verified bridges → target besties → besties-of-besties → bridge besties → fresh second-wave large accounts and their besties. A run can take tens of seconds.
                    </p>
                  </div>
                  <Button
                    variant="glass"
                    className="mt-4 shrink-0 sm:mt-0"
                    onClick={() => void runAdvancedAnalysis()}
                    disabled={analysisWorking}
                  >
                    {analysisWorking ? (
                      <Loader2 className="size-4 animate-spin" aria-hidden />
                    ) : (
                      <Sparkles className="size-4" aria-hidden />
                    )}
                    {analysisWorking ? "Analyzing network…" : "Run Advanced Analysis"}
                  </Button>
                </div>
              ) : null}

              {analysisWorking ? (
                <div className="mt-4 rounded-xl border border-[#16c8ff]/16 bg-[#16c8ff]/[0.035] px-4 py-3 text-xs leading-6 text-white/45">
                  Checking reciprocal target bridges, sampling repeated public interactions, verifying besties, expanding one level deeper, and performing the second large-account search. Keep this tab open until the run completes.
                </div>
              ) : null}
              {analysisError ? (
                <p role="alert" className="mt-4 text-sm text-[#ffb4b8]">
                  {analysisError}
                </p>
              ) : null}
            </Card>
          ) : null}

          {analysis ? (
            <Card className="overflow-hidden p-0">
              <div className="border-b border-white/10 px-5 py-6 sm:px-7">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#f1d49a]">
                      Advanced Analysis complete
                    </p>
                    <h2 className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-white">
                      Accounts to follow next
                    </h2>
                    <p className="mt-3 max-w-3xl text-sm leading-6 text-white/48">
                      Ranked by reciprocal proximity, independent paths, repeated interaction strength, target-cluster overlap, influence, reciprocity potential, and mass-follow penalties. Accounts you already follow are tracked in the run but removed from this follow-now list.
                    </p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/[0.025] px-4 py-3 text-xs text-white/42">
                    Run {analysis.runId.slice(0, 8)}
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
                  {[
                    ["Recommendations", analysis.metrics.recommendationsReturned],
                    ["Candidates", analysis.metrics.candidateAccounts],
                    ["Targets", analysis.metrics.targetsAnalyzed],
                    ["Starting bridges", analysis.metrics.verifiedStartingBridges],
                    ["Target besties", analysis.metrics.targetBesties],
                    ["Wave 2 targets", analysis.metrics.secondWaveTargets.length],
                  ].map(([label, value]) => (
                    <div key={String(label)} className="rounded-xl border border-white/8 bg-black/20 px-3 py-3">
                      <p className="text-[10px] uppercase tracking-[0.1em] text-white/30">{label}</p>
                      <p className="mt-1 text-lg font-semibold text-white">{Number(value).toLocaleString()}</p>
                    </div>
                  ))}
                </div>

                {analysis.metrics.secondWaveTargets.length ? (
                  <p className="mt-4 text-xs leading-5 text-white/38">
                    <span className="font-semibold text-[#d8b5ff]">Fresh Wave 2 endpoints:</span>{" "}
                    {analysis.metrics.secondWaveTargets.map((handle) => `@${handle}`).join(", ")}
                  </p>
                ) : null}
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
                              Engagement approach
                            </p>
                            <p className="mt-1 text-xs leading-5 text-white/45">{item.strategy}</p>
                          </div>

                          <div className="mt-5 flex flex-wrap items-center gap-3">
                            <a
                              href={item.profileUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-2 rounded-lg border border-[#16c8ff]/24 bg-[#16c8ff]/[0.06] px-3 py-2 text-xs font-medium text-[#a9efff] transition hover:bg-[#16c8ff]/10"
                            >
                              <ExternalLink className="size-3.5" aria-hidden />
                              Open on Bluesky
                            </a>
                            <span className="text-[11px] text-white/28">
                              Toward {item.targetHandles.slice(0, 3).map((handle) => `@${handle}`).join(", ")}
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
                    The useful candidates found in this run are already accounts you follow. Try another target or broaden the starting network.
                  </p>
                </div>
              )}

              <div className="border-t border-white/8 bg-[#07090c] px-5 py-4 text-xs leading-5 text-white/34 sm:px-7">
                {analysis.note}
              </div>
            </Card>
          ) : null}

          <Card className="overflow-hidden p-0">
            <div className="flex flex-col gap-3 border-b border-white/10 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
              <div className="flex items-center gap-3">
                <GitBranch className="size-5 text-[#ff7e8a]" aria-hidden />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#ff8994]">
                    Dynamic network map
                  </p>
                  <h2 className="mt-1 text-xl font-semibold text-white">
                    Live accounts and verified relationship edges
                  </h2>
                </div>
              </div>
              <p className="max-w-md text-xs leading-5 text-white/35">
                This visualization is regenerated from Bluesky data whenever the connected account, starting scope, or mapped targets change.
              </p>
            </div>
            <AdvancedNetworkLiveMap recon={recon} />
          </Card>

          <Card className="p-5 sm:p-7">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#e6bd73]">
              Recursive engine
            </p>
            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {[
                "1. Large-account wave #1",
                "2. Shortest mutual paths + bridges",
                "3. Bridge besties + endpoint besties",
                "4. Besties-of-besties + follower bridges",
                "5. Follow / follow-back outcome scoring",
                "6. Fresh large-account wave #2, then repeat",
              ].map((step) => (
                <div
                  key={step}
                  className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 text-sm text-white/58"
                >
                  <span>{step}</span>
                  <ArrowRight className="size-4 text-white/22" aria-hidden />
                </div>
              ))}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
