"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  ExternalLink,
  GitBranch,
  Loader2,
  RefreshCw,
  Target,
  UserRound,
  UsersRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAdvancedBlueskyOAuth } from "@/components/tools/advanced-network-oauth";
import type { ReconResponse, StartingNetworkScope } from "@/lib/advanced-network";

type LiveNode = {
  id: string;
  did: string;
  handle: string;
  displayName?: string;
  followersCount: number;
  followsCount: number;
  kind: "self" | "follower" | "mutual" | "target";
  score: number;
};

type LiveEdge = {
  source: string;
  target: string;
  kind: "self-mutual" | "self-follower" | "self-target" | "verified-target-bridge";
  reciprocal: boolean;
};

type LiveGraph = {
  actor: { did: string; handle: string; displayName?: string };
  scope: StartingNetworkScope;
  generatedAt: string;
  targetSource?: "current-run" | "saved-campaign" | "none";
  totals: {
    profileFollowers: number;
    observableFollowers: number;
    mutuals: number;
    startingPool: number;
    displayedStartingNodes: number;
    targets: number;
    verifiedTargetBridges: number;
  };
  nodes: LiveNode[];
  edges: LiveEdge[];
  note: string;
  error?: string;
};

type ViewMode = "overview" | "warm" | "bridges" | "targets";

function compact(value: number) {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function currentScope(did: string): StartingNetworkScope {
  const saved = window.localStorage.getItem(`rukh:advanced-network:start-scope:${did}`);
  return saved === "mutuals-only" ? "mutuals-only" : "all-followers";
}

function labelFor(node: LiveNode) {
  return node.displayName || `@${node.handle}`;
}

export function AdvancedNetworkLiveMap({ recon }: { recon: ReconResponse | null }) {
  const oauth = useAdvancedBlueskyOAuth();
  const [graph, setGraph] = useState<LiveGraph | null>(null);
  const [scope, setScope] = useState<StartingNetworkScope>("all-followers");
  const [view, setView] = useState<ViewMode>("overview");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");

  const connected = oauth.phase === "connected" && Boolean(oauth.did);
  const targetHandles = useMemo(
    () =>
      (recon?.targets ?? [])
        .filter((target) => target.disposition === "deep-analysis")
        .map((target) => target.handle),
    [recon],
  );

  const refresh = useCallback(
    async (nextScope?: StartingNetworkScope) => {
      if (!oauth.did) return;
      const resolvedScope = nextScope ?? currentScope(oauth.did);
      setScope(resolvedScope);
      setWorking(true);
      setError("");
      try {
        const response = await fetch("/api/advanced-network/map", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ actor: oauth.did, scope: resolvedScope, targets: targetHandles }),
        });
        const result = (await response.json()) as LiveGraph;
        if (!response.ok) throw new Error(result.error || "Live graph refresh failed.");
        setGraph(result);
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Live graph refresh failed.");
      } finally {
        setWorking(false);
      }
    },
    [oauth.did, targetHandles],
  );

  useEffect(() => {
    if (!connected || !oauth.did) {
      setGraph(null);
      return;
    }
    void refresh();
  }, [connected, oauth.did, refresh]);

  useEffect(() => {
    if (!oauth.did) return;
    const onScope = (event: Event) => {
      const custom = event as CustomEvent<{ did?: string; scope?: StartingNetworkScope }>;
      if (custom.detail?.did !== oauth.did) return;
      const next = custom.detail?.scope;
      if (next === "all-followers" || next === "mutuals-only") void refresh(next);
    };
    window.addEventListener("rukh:advanced-network:scope-change", onScope);
    return () => window.removeEventListener("rukh:advanced-network:scope-change", onScope);
  }, [oauth.did, refresh]);

  const selfNode = useMemo(() => graph?.nodes.find((node) => node.kind === "self") ?? null, [graph]);
  const warmNodes = useMemo(
    () =>
      (graph?.nodes ?? [])
        .filter((node) => node.kind === "mutual" || node.kind === "follower")
        .sort((a, b) => b.score - a.score || b.followersCount - a.followersCount),
    [graph],
  );
  const targetNodes = useMemo(
    () =>
      (graph?.nodes ?? [])
        .filter((node) => node.kind === "target")
        .sort((a, b) => b.score - a.score || b.followersCount - a.followersCount),
    [graph],
  );
  const bridgeIds = useMemo(
    () =>
      new Set(
        (graph?.edges ?? [])
          .filter((edge) => edge.kind === "verified-target-bridge")
          .map((edge) => edge.source),
      ),
    [graph],
  );
  const bridgeNodes = useMemo(
    () => warmNodes.filter((node) => bridgeIds.has(node.id)),
    [warmNodes, bridgeIds],
  );
  const selected = useMemo(
    () => (graph?.nodes ?? []).find((node) => node.id === selectedId) ?? null,
    [graph, selectedId],
  );
  const selectedTargets = useMemo(() => {
    if (!graph || !selected) return [] as LiveNode[];
    const targetIds = new Set(
      graph.edges
        .filter((edge) => edge.kind === "verified-target-bridge" && edge.source === selected.id)
        .map((edge) => edge.target),
    );
    return targetNodes.filter((node) => targetIds.has(node.id));
  }, [graph, selected, targetNodes]);

  if (!connected) return null;

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#05070a]">
      <div className="flex flex-col gap-4 border-b border-white/8 bg-white/[0.018] px-4 py-4 sm:px-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-medium uppercase tracking-[0.13em] text-white/38">
            <span className="rounded-full border border-[#16c8ff]/20 bg-[#16c8ff]/[0.06] px-2.5 py-1 text-[#91eaff]">Live graph</span>
            <span className="rounded-full border border-white/10 bg-white/[0.025] px-2.5 py-1">
              {scope === "mutuals-only" ? "Mutuals only" : "All followers"}
            </span>
            {graph?.totals.verifiedTargetBridges ? (
              <span className="rounded-full border border-[#e6bd73]/25 bg-[#e6bd73]/[0.06] px-2.5 py-1 text-[#f3d28d]">
                {graph.totals.verifiedTargetBridges} activated path{graph.totals.verifiedTargetBridges === 1 ? "" : "s"}
              </span>
            ) : null}
          </div>
          <p className="mt-2 max-w-2xl text-xs leading-5 text-white/38">
            Start high-level, then drill into one layer at a time. The interface deliberately limits visible relationships instead of drawing every edge at once.
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => void refresh()} disabled={working}>
          {working ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <RefreshCw className="size-4" aria-hidden />}
          Refresh
        </Button>
      </div>

      {!graph ? (
        <div className="grid min-h-[320px] place-items-center px-6 text-center">
          <div>
            <Loader2 className="mx-auto size-5 animate-spin text-[#8ce8ff]" aria-hidden />
            <p className="mt-3 text-sm text-white/55">{error || "Loading your live Bluesky network…"}</p>
          </div>
        </div>
      ) : (
        <>
          <div className="grid gap-px border-b border-white/8 bg-white/8 sm:grid-cols-5">
            {[
              ["Followers", graph.totals.profileFollowers],
              ["Observable", graph.totals.observableFollowers],
              ["Mutuals", graph.totals.mutuals],
              ["Activated bridges", bridgeNodes.length],
              ["Targets", graph.totals.targets],
            ].map(([label, value]) => (
              <div key={String(label)} className="bg-[#07090c] px-4 py-3">
                <p className="text-[10px] uppercase tracking-[0.12em] text-white/30">{label}</p>
                <p className="mt-1 text-lg font-semibold text-white">{Number(value).toLocaleString()}</p>
              </div>
            ))}
          </div>

          <div className="border-b border-white/8 px-4 py-3 sm:px-5">
            <div className="flex flex-wrap gap-2">
              {([
                ["overview", "Overview"],
                ["warm", `Warm network (${warmNodes.length})`],
                ["bridges", `Activated bridges (${bridgeNodes.length})`],
                ["targets", `Targets (${targetNodes.length})`],
              ] as Array<[ViewMode, string]>).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    setView(id);
                    setSelectedId(null);
                  }}
                  className={`rounded-full border px-3 py-2 text-xs transition ${
                    view === id
                      ? "border-[#16c8ff]/35 bg-[#16c8ff]/[0.07] text-[#b9f1ff]"
                      : "border-white/8 bg-white/[0.02] text-white/40 hover:text-white/70"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {view === "overview" ? (
            <div className="p-5 sm:p-7">
              <div className="grid gap-3 xl:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr] xl:items-center">
                <button
                  type="button"
                  onClick={() => selfNode && setSelectedId(selfNode.id)}
                  className="rounded-2xl border border-[#16c8ff]/28 bg-[radial-gradient(circle_at_50%_0%,rgba(22,200,255,0.12),transparent_55%),rgba(22,200,255,0.035)] p-5 text-left"
                >
                  <UserRound className="size-5 text-[#8ce8ff]" aria-hidden />
                  <p className="mt-5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8ce8ff]">You</p>
                  <p className="mt-1 truncate text-base font-semibold text-white">@{graph.actor.handle}</p>
                  <p className="mt-2 text-xs text-white/35">{compact(graph.totals.profileFollowers)} followers</p>
                </button>

                <ArrowRight className="mx-auto hidden size-5 text-white/18 xl:block" aria-hidden />

                <button
                  type="button"
                  onClick={() => setView("warm")}
                  className="rounded-2xl border border-[#4bd8ff]/18 bg-[#4bd8ff]/[0.035] p-5 text-left transition hover:border-[#4bd8ff]/32"
                >
                  <UsersRound className="size-5 text-[#8ce8ff]" aria-hidden />
                  <p className="mt-5 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/34">Warm network</p>
                  <p className="mt-1 text-3xl font-semibold text-white">{warmNodes.length}</p>
                  <p className="mt-2 text-xs leading-5 text-white/35">Highest-value visible followers and mutuals. Click to inspect.</p>
                </button>

                <ArrowRight className="mx-auto hidden size-5 text-white/18 xl:block" aria-hidden />

                <button
                  type="button"
                  onClick={() => setView("bridges")}
                  className="rounded-2xl border border-[#e6bd73]/22 bg-[radial-gradient(circle_at_50%_0%,rgba(230,189,115,0.10),transparent_60%),rgba(230,189,115,0.035)] p-5 text-left transition hover:border-[#e6bd73]/36"
                >
                  <GitBranch className="size-5 text-[#f1d49a]" aria-hidden />
                  <p className="mt-5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#f1d49a]">Activated bridges</p>
                  <p className="mt-1 text-3xl font-semibold text-white">{bridgeNodes.length}</p>
                  <p className="mt-2 text-xs leading-5 text-white/35">Accounts whose active or reciprocal relationship with you already creates a validated route into a destination neighborhood.</p>
                </button>

                <ArrowRight className="mx-auto hidden size-5 text-white/18 xl:block" aria-hidden />

                <button
                  type="button"
                  onClick={() => setView("targets")}
                  className="rounded-2xl border border-[#aa63ff]/22 bg-[radial-gradient(circle_at_50%_0%,rgba(170,99,255,0.11),transparent_60%),rgba(170,99,255,0.035)] p-5 text-left transition hover:border-[#aa63ff]/36"
                >
                  <Target className="size-5 text-[#d8b5ff]" aria-hidden />
                  <p className="mt-5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#d8b5ff]">Target neighborhoods</p>
                  <p className="mt-1 text-3xl font-semibold text-white">{targetNodes.length}</p>
                  <p className="mt-2 text-xs leading-5 text-white/35">The large-account destinations currently guiding recommendation ranking.</p>
                </button>
              </div>

              <div className="mt-5 rounded-2xl border border-white/8 bg-white/[0.02] p-4">
                <p className="text-xs font-semibold text-white">How to use this view</p>
                <p className="mt-2 text-xs leading-5 text-white/38">
                  You do not need to read individual lines. Bridge candidates appear in the Action Center first; only relationships with active or reciprocal evidence involving you appear here as activated bridges.
                </p>
              </div>
            </div>
          ) : null}

          {view === "warm" ? (
            <div className="p-5 sm:p-7">
              <div className="mb-4 flex items-end justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8ce8ff]">Warm network</p>
                  <p className="mt-1 text-sm text-white/40">Showing only the strongest visible accounts, not every follower.</p>
                </div>
                <span className="text-xs text-white/28">Top {Math.min(12, warmNodes.length)} shown</span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {warmNodes.slice(0, 12).map((node) => (
                  <button
                    key={node.id}
                    type="button"
                    onClick={() => setSelectedId(node.id)}
                    className={`rounded-2xl border p-4 text-left transition ${
                      selectedId === node.id
                        ? "border-[#16c8ff]/38 bg-[#16c8ff]/[0.055]"
                        : "border-white/8 bg-white/[0.02] hover:border-white/16"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="truncate text-sm font-semibold text-white">{labelFor(node)}</p>
                      {bridgeIds.has(node.id) ? (
                        <span className="rounded-full border border-[#e6bd73]/20 bg-[#e6bd73]/[0.05] px-2 py-0.5 text-[9px] text-[#f1d49a]">activated bridge</span>
                      ) : node.kind === "mutual" ? (
                        <span className="rounded-full border border-[#16c8ff]/16 px-2 py-0.5 text-[9px] text-[#9cecff]">mutual</span>
                      ) : null}
                    </div>
                    <p className="mt-1 truncate text-[11px] text-white/30">@{node.handle}</p>
                    <div className="mt-4 flex items-end justify-between gap-3">
                      <div>
                        <p className="text-lg font-semibold text-white">{compact(node.followersCount)}</p>
                        <p className="text-[9px] uppercase tracking-[0.1em] text-white/28">followers</p>
                      </div>
                      <p className="text-[10px] text-white/28">network score {node.score}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {view === "bridges" ? (
            <div className="p-5 sm:p-7">
              <div className="mb-4">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#f1d49a]">Activated bridges</p>
                <p className="mt-1 text-sm leading-6 text-white/40">These are no longer just candidates. Each account already creates an active or reciprocal route from your warm network into a destination neighborhood.</p>
              </div>
              {bridgeNodes.length ? (
                <div className="grid gap-3 lg:grid-cols-2">
                  {bridgeNodes.slice(0, 10).map((bridge) => {
                    const connectedTargetIds = new Set(
                      graph.edges
                        .filter((edge) => edge.kind === "verified-target-bridge" && edge.source === bridge.id)
                        .map((edge) => edge.target),
                    );
                    const connectedTargets = targetNodes.filter((target) => connectedTargetIds.has(target.id));
                    return (
                      <button
                        key={bridge.id}
                        type="button"
                        onClick={() => setSelectedId(bridge.id)}
                        className={`rounded-2xl border p-4 text-left transition ${
                          selectedId === bridge.id
                            ? "border-[#e6bd73]/40 bg-[#e6bd73]/[0.055]"
                            : "border-[#e6bd73]/14 bg-[#e6bd73]/[0.025] hover:border-[#e6bd73]/28"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-white">{labelFor(bridge)}</p>
                            <p className="mt-1 truncate text-[11px] text-white/30">@{bridge.handle}</p>
                          </div>
                          <span className="rounded-full border border-[#e6bd73]/18 bg-[#e6bd73]/[0.05] px-2.5 py-1 text-[10px] text-[#f1d49a]">
                            {connectedTargets.length} target{connectedTargets.length === 1 ? "" : "s"}
                          </span>
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2">
                          {connectedTargets.map((target) => (
                            <span key={target.id} className="rounded-full border border-[#aa63ff]/16 bg-[#aa63ff]/[0.04] px-2.5 py-1 text-[10px] text-[#d8b5ff]">
                              @{target.handle}
                            </span>
                          ))}
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-2xl border border-white/8 bg-white/[0.02] px-5 py-8 text-center text-sm text-white/38">
                  No activated bridges are visible in this current slice yet. Bridge candidates may still appear in the Action Center while those relationships develop.
                </div>
              )}
            </div>
          ) : null}

          {view === "targets" ? (
            <div className="p-5 sm:p-7">
              <div className="mb-4">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#d8b5ff]">Target neighborhoods</p>
                <p className="mt-1 text-sm leading-6 text-white/40">These are destinations used for ranking—not a separate to-do list.</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {targetNodes.map((node) => {
                  const bridgeCount = graph.edges.filter(
                    (edge) => edge.kind === "verified-target-bridge" && edge.target === node.id,
                  ).length;
                  return (
                    <button
                      key={node.id}
                      type="button"
                      onClick={() => setSelectedId(node.id)}
                      className={`rounded-2xl border p-4 text-left transition ${
                        selectedId === node.id
                          ? "border-[#aa63ff]/38 bg-[#aa63ff]/[0.055]"
                          : "border-[#aa63ff]/14 bg-[#aa63ff]/[0.022] hover:border-[#aa63ff]/28"
                      }`}
                    >
                      <p className="truncate text-sm font-semibold text-white">{labelFor(node)}</p>
                      <p className="mt-1 truncate text-[11px] text-white/30">@{node.handle}</p>
                      <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <p className="text-lg font-semibold text-white">{compact(node.followersCount)}</p>
                          <p className="text-[9px] uppercase tracking-[0.1em] text-white/26">followers</p>
                        </div>
                        <div>
                          <p className="text-lg font-semibold text-[#f1d49a]">{bridgeCount}</p>
                          <p className="text-[9px] uppercase tracking-[0.1em] text-white/26">activated paths</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          {selected ? (
            <div className="border-t border-white/8 bg-[#07090c] px-5 py-5 sm:px-7">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/30">Selected account</p>
                  <p className="mt-1 text-lg font-semibold text-white">{labelFor(selected)}</p>
                  <p className="mt-1 text-xs text-white/34">@{selected.handle} · {compact(selected.followersCount)} followers · {compact(selected.followsCount)} following</p>
                  {selectedTargets.length ? (
                    <p className="mt-3 text-xs text-white/42">
                      Activated bridge into {selectedTargets.map((target) => `@${target.handle}`).join(", ")}.
                    </p>
                  ) : null}
                </div>
                <a
                  href={`https://bsky.app/profile/${selected.handle}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.025] px-3 py-2 text-xs font-medium text-white/55 transition hover:text-white"
                >
                  Open profile
                  <ExternalLink className="size-3.5" aria-hidden />
                </a>
              </div>
            </div>
          ) : null}

          <div className="border-t border-white/8 bg-[#06080b] px-5 py-3 text-[11px] leading-5 text-white/28 sm:px-7">
            {graph.note}
          </div>
        </>
      )}
    </div>
  );
}
