"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BarChart3,
  GitBranch,
  Loader2,
  Radar,
  Sparkles,
  Target,
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

function compact(value: number) {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

export function AdvancedNetworkDashboard() {
  const oauth = useAdvancedBlueskyOAuth();
  const [mode, setMode] = useState<AdvancedTargetMode>("hybrid");
  const [targetText, setTargetText] = useState("");
  const [categories, setCategories] = useState<string[]>(["gaming", "software"]);
  const [recon, setRecon] = useState<ReconResponse | null>(null);
  const [error, setError] = useState("");
  const [working, setWorking] = useState(false);

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

  async function runRecon() {
    if (!oauth.did) return;
    setWorking(true);
    setError("");
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
                  Named accounts are anchor nodes. Categories let the engine discover its own influential endpoints. Reconnaissance validates targets before expensive graph expansion begins.
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-3 md:grid-cols-4">
              {(Object.keys(modeCopy) as AdvancedTargetMode[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setMode(key)}
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
                  onChange={(event) => setTargetText(event.target.value)}
                  rows={5}
                  placeholder={
                    "markhamillofficial.bsky.social\nexample.bsky.social\nhttps://bsky.app/profile/another.example"
                  }
                  className="mt-2 w-full resize-y rounded-xl border border-white/12 bg-black/20 px-4 py-3 font-mono text-sm text-white outline-none focus:border-[#16c8ff]/55 focus:ring-4 focus:ring-[#16c8ff]/10"
                />
                <p className="mt-2 text-xs text-white/36">
                  One handle or profile URL per line. The live map uses the real target profiles returned by reconnaissance.
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
                        onClick={() =>
                          setCategories((current) =>
                            selected
                              ? current.filter((item) => item !== category.id)
                              : [...current, category.id].slice(0, 8),
                          )
                        }
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
                The deeper worker will compare reachable clusters and recommend directions using warm bridges, expected path compression, category fit, and estimated crawl cost.
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
                Validates named targets before the recursive expansion.
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
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8ce8ff]">
                    Reconnaissance result
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-white">
                    {recon.targets.filter((target) => target.disposition === "deep-analysis").length} selected for deep analysis
                  </h2>
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
                    {target.relationship.mutual ? (
                      <p className="mt-3 text-xs text-emerald-200/80">
                        Already a mutual relationship — extremely warm starting point.
                      </p>
                    ) : null}
                  </div>
                ))}
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
