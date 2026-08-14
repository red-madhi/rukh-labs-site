"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
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

type PositionedNode = LiveNode & { x: number; y: number; r: number; isBridge: boolean };

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

function truncate(value: string, max = 17) {
  return value.length <= max ? value : `${value.slice(0, max - 1)}…`;
}

function nodeRadius(node: LiveNode) {
  if (node.kind === "self") return 30;
  if (node.kind === "target") {
    return Math.min(24, 16 + Math.log10(node.followersCount + 10) * 1.8);
  }
  return Math.min(18, 9 + Math.log10(node.followersCount + 10) * 1.5);
}

function positions(graph: LiveGraph): PositionedNode[] {
  const bridgeIds = new Set(
    graph.edges
      .filter((edge) => edge.kind === "verified-target-bridge")
      .map((edge) => edge.source),
  );
  const self = graph.nodes.find((node) => node.kind === "self");
  const starts = graph.nodes
    .filter((node) => node.kind === "mutual" || node.kind === "follower")
    .sort((a, b) => b.score - a.score || b.followersCount - a.followersCount);
  const targets = graph.nodes
    .filter((node) => node.kind === "target")
    .sort((a, b) => b.score - a.score || b.followersCount - a.followersCount);

  const output: PositionedNode[] = [];
  if (self) {
    output.push({ ...self, x: 110, y: 260, r: nodeRadius(self), isBridge: false });
  }

  starts.forEach((node, index) => {
    const firstRing = index < 9;
    const localIndex = firstRing ? index : index - 9;
    const count = firstRing ? Math.min(9, starts.length) : Math.max(1, starts.length - 9);
    const angle = -Math.PI / 2 + (localIndex / count) * Math.PI * 2;
    const rx = firstRing ? 122 : 190;
    const ry = firstRing ? 142 : 205;
    output.push({
      ...node,
      x: 220 + Math.cos(angle) * rx,
      y: 260 + Math.sin(angle) * ry,
      r: nodeRadius(node),
      isBridge: bridgeIds.has(node.id),
    });
  });

  targets.forEach((node, index) => {
    const count = Math.max(1, targets.length);
    const angle = -Math.PI / 2 + (index / count) * Math.PI * 2;
    output.push({
      ...node,
      x: 820 + Math.cos(angle) * 125,
      y: 260 + Math.sin(angle) * 178,
      r: nodeRadius(node),
      isBridge: false,
    });
  });

  return output;
}

function strokeFor(node: PositionedNode) {
  if (node.kind === "self") return "#45d8ff";
  if (node.kind === "target") return "#bd79ff";
  if (node.isBridge) return "#f2c46e";
  if (node.kind === "mutual") return "#67dfff";
  return "#7c91a4";
}

function fillFor(node: PositionedNode) {
  if (node.kind === "self") return "#071822";
  if (node.kind === "target") return "#1a0f25";
  if (node.isBridge) return "#241a0b";
  if (node.kind === "mutual") return "#0a1c25";
  return "#11161b";
}

export function AdvancedNetworkLiveMap({ recon }: { recon: ReconResponse | null }) {
  const oauth = useAdvancedBlueskyOAuth();
  const [graph, setGraph] = useState<LiveGraph | null>(null);
  const [scope, setScope] = useState<StartingNetworkScope>("all-followers");
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
          body: JSON.stringify({
            actor: oauth.did,
            scope: resolvedScope,
            targets: targetHandles,
          }),
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
      const custom = event as CustomEvent<{
        did?: string;
        scope?: StartingNetworkScope;
      }>;
      if (custom.detail?.did !== oauth.did) return;
      const next = custom.detail?.scope;
      if (next === "all-followers" || next === "mutuals-only") {
        void refresh(next);
      }
    };
    window.addEventListener("rukh:advanced-network:scope-change", onScope);
    return () => window.removeEventListener("rukh:advanced-network:scope-change", onScope);
  }, [oauth.did, refresh]);

  const positioned = useMemo(() => (graph ? positions(graph) : []), [graph]);
  const byId = useMemo(
    () => new Map(positioned.map((node) => [node.id, node])),
    [positioned],
  );
  const selfNode = useMemo(
    () => positioned.find((node) => node.kind === "self"),
    [positioned],
  );
  const uniqueBridgeAccounts = useMemo(
    () =>
      new Set(
        (graph?.edges ?? [])
          .filter((edge) => edge.kind === "verified-target-bridge")
          .map((edge) => edge.source),
      ).size,
    [graph],
  );

  if (!connected) return null;

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#05070a]">
      <div className="flex flex-col gap-3 border-b border-white/8 bg-white/[0.018] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-medium uppercase tracking-[0.13em] text-white/38">
            <span className="rounded-full border border-[#16c8ff]/20 bg-[#16c8ff]/[0.06] px-2.5 py-1 text-[#91eaff]">
              Live Bluesky graph
            </span>
            <span className="rounded-full border border-white/10 bg-white/[0.025] px-2.5 py-1">
              {scope === "mutuals-only" ? "Mutuals only" : "All followers"}
            </span>
            {graph?.targetSource === "saved-campaign" ? (
              <span className="rounded-full border border-[#aa63ff]/20 bg-[#aa63ff]/[0.06] px-2.5 py-1 text-[#d8b5ff]">
                Saved target campaign
              </span>
            ) : null}
            {graph?.totals.verifiedTargetBridges ? (
              <span className="rounded-full border border-[#e6bd73]/25 bg-[#e6bd73]/[0.06] px-2.5 py-1 text-[#f3d28d]">
                {graph.totals.verifiedTargetBridges} verified 2-hop path
                {graph.totals.verifiedTargetBridges === 1 ? "" : "s"}
              </span>
            ) : null}
          </div>
          <p className="mt-2 text-xs text-white/38">
            No decorative accounts or invented edges. Every node below is a real Bluesky profile returned by the live graph request.
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => void refresh()} disabled={working}>
          {working ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <RefreshCw className="size-4" aria-hidden />
          )}
          Refresh map
        </Button>
      </div>

      {!graph ? (
        <div className="grid min-h-[360px] place-items-center px-6 text-center">
          <div>
            <Loader2 className="mx-auto size-5 animate-spin text-[#8ce8ff]" aria-hidden />
            <p className="mt-3 text-sm text-white/55">
              {error || "Loading your live Bluesky network…"}
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-px border-b border-white/8 bg-white/8 sm:grid-cols-3 lg:grid-cols-6">
            {[
              ["Profile followers", graph.totals.profileFollowers],
              ["Observable graph", graph.totals.observableFollowers],
              ["Mutuals", graph.totals.mutuals],
              ["Shown", graph.totals.displayedStartingNodes],
              ["Targets", graph.totals.targets],
              ["2-hop paths", graph.totals.verifiedTargetBridges],
            ].map(([label, value]) => (
              <div key={String(label)} className="bg-[#07090c] px-4 py-3">
                <p className="text-[10px] uppercase tracking-[0.12em] text-white/30">
                  {label}
                </p>
                <p className="mt-1 text-lg font-semibold text-white">
                  {Number(value).toLocaleString()}
                </p>
              </div>
            ))}
          </div>

          <svg
            viewBox="0 0 1000 520"
            className="block h-auto w-full"
            role="img"
            aria-label="Live Bluesky relationship graph for the connected account"
          >
            <defs>
              <pattern id="live-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M40 0H0V40" fill="none" stroke="#ffffff" strokeOpacity="0.024" />
              </pattern>
              <radialGradient id="core-halo">
                <stop offset="0" stopColor="#16c8ff" stopOpacity="0.12" />
                <stop offset="1" stopColor="#16c8ff" stopOpacity="0" />
              </radialGradient>
              <radialGradient id="target-halo">
                <stop offset="0" stopColor="#a95cff" stopOpacity="0.12" />
                <stop offset="1" stopColor="#a95cff" stopOpacity="0" />
              </radialGradient>
            </defs>
            <rect width="1000" height="520" fill="#05070a" />
            <rect width="1000" height="520" fill="url(#live-grid)" />
            <ellipse cx="220" cy="260" rx="270" ry="245" fill="url(#core-halo)" />
            {graph.totals.targets ? (
              <ellipse cx="820" cy="260" rx="205" ry="225" fill="url(#target-halo)" />
            ) : null}

            <text
              x="36"
              y="34"
              fill="#8ce8ff"
              fontSize="10"
              fontWeight="700"
              letterSpacing="2.2"
            >
              YOUR LIVE STARTING NETWORK
            </text>
            <text
              x="704"
              y="34"
              fill="#cba5ff"
              fontSize="10"
              fontWeight="700"
              letterSpacing="2.2"
            >
              MAPPED TARGETS
            </text>

            {graph.edges.map((edge, index) => {
              const source = byId.get(edge.source);
              const target = byId.get(edge.target);
              if (!source || !target) return null;
              const bridge = edge.kind === "verified-target-bridge";
              const selfMutual = edge.kind === "self-mutual";
              const selfFollower = edge.kind === "self-follower";
              const stroke = bridge
                ? "#f0c56e"
                : edge.kind === "self-target"
                  ? "#b879ff"
                  : selfMutual
                    ? "#55d7ff"
                    : "#647482";
              return (
                <line
                  key={`${edge.source}-${edge.target}-${index}`}
                  x1={source.x}
                  y1={source.y}
                  x2={target.x}
                  y2={target.y}
                  stroke={stroke}
                  strokeWidth={bridge ? 2.1 : selfMutual ? 1.25 : 1}
                  strokeOpacity={bridge ? 0.78 : selfMutual ? 0.34 : 0.2}
                  strokeDasharray={selfFollower ? "4 6" : undefined}
                />
              );
            })}

            {graph.totals.targets === 0 ? (
              <g>
                <rect
                  x="690"
                  y="190"
                  width="250"
                  height="130"
                  rx="18"
                  fill="#0b0d11"
                  stroke="#ffffff"
                  strokeOpacity="0.09"
                />
                <text
                  x="815"
                  y="235"
                  textAnchor="middle"
                  fill="#ffffff"
                  fillOpacity="0.68"
                  fontSize="14"
                  fontWeight="700"
                >
                  NO TARGETS MAPPED YET
                </text>
                <text
                  x="815"
                  y="262"
                  textAnchor="middle"
                  fill="#ffffff"
                  fillOpacity="0.36"
                  fontSize="11"
                >
                  Run reconnaissance on named profiles
                </text>
                <text
                  x="815"
                  y="280"
                  textAnchor="middle"
                  fill="#ffffff"
                  fillOpacity="0.36"
                  fontSize="11"
                >
                  to add real target nodes here.
                </text>
              </g>
            ) : null}

            {positioned
              .filter((node) => node.kind !== "self")
              .map((node, index) => {
                const stroke = strokeFor(node);
                const fill = fillFor(node);
                const showLabel =
                  node.kind === "target" ||
                  node.isBridge ||
                  (node.kind === "mutual" && index < 9);
                return (
                  <g key={node.id}>
                    <title>{`${node.displayName || node.handle} · @${node.handle} · ${node.followersCount.toLocaleString()} followers${node.isBridge ? " · verified target bridge" : node.kind === "mutual" ? " · mutual" : node.kind === "follower" ? " · follows you" : ""}`}</title>
                    {node.isBridge ? (
                      <circle
                        cx={node.x}
                        cy={node.y}
                        r={node.r + 8}
                        fill="#e6bd73"
                        opacity="0.07"
                      />
                    ) : null}
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r={node.r}
                      fill={fill}
                      stroke={stroke}
                      strokeWidth={node.isBridge ? 2 : 1.4}
                    />
                    <circle
                      cx={node.x}
                      cy={node.y - 2.5}
                      r="3"
                      fill={stroke}
                      opacity="0.9"
                    />
                    <path
                      d={`M ${node.x - 5} ${node.y + 5} Q ${node.x} ${node.y + 0.5} ${node.x + 5} ${node.y + 5}`}
                      fill="none"
                      stroke={stroke}
                      strokeWidth="1.4"
                      strokeLinecap="round"
                    />
                    {showLabel ? (
                      <>
                        <rect
                          x={node.x - 54}
                          y={node.y + node.r + 7}
                          width="108"
                          height="29"
                          rx="8"
                          fill="#05070a"
                          fillOpacity="0.93"
                          stroke={stroke}
                          strokeOpacity="0.2"
                        />
                        <text
                          x={node.x}
                          y={node.y + node.r + 19}
                          textAnchor="middle"
                          fill="white"
                          fillOpacity="0.84"
                          fontSize="8.5"
                          fontWeight="700"
                        >
                          @{truncate(node.handle, 15)}
                        </text>
                        <text
                          x={node.x}
                          y={node.y + node.r + 30}
                          textAnchor="middle"
                          fill={stroke}
                          fillOpacity="0.82"
                          fontSize="7.5"
                        >
                          {compact(node.followersCount)} followers
                        </text>
                      </>
                    ) : null}
                  </g>
                );
              })}

            <g>
              <rect
                x="397"
                y="218"
                width="208"
                height="84"
                rx="16"
                fill="#080a0d"
                fillOpacity="0.95"
                stroke={graph.totals.verifiedTargetBridges ? "#e6bd73" : "#ffffff"}
                strokeOpacity={graph.totals.verifiedTargetBridges ? 0.28 : 0.09}
              />
              <text
                x="501"
                y="246"
                textAnchor="middle"
                fill={graph.totals.verifiedTargetBridges ? "#f0cf8c" : "#ffffff"}
                fillOpacity={graph.totals.verifiedTargetBridges ? 0.9 : 0.45}
                fontSize="10"
                fontWeight="700"
                letterSpacing="1.4"
              >
                VERIFIED 2-HOP PATHS
              </text>
              <text
                x="501"
                y="278"
                textAnchor="middle"
                fill="white"
                fontSize="24"
                fontWeight="800"
              >
                {graph.totals.verifiedTargetBridges}
              </text>
              <text
                x="501"
                y="293"
                textAnchor="middle"
                fill="white"
                fillOpacity="0.3"
                fontSize="8"
              >
                {uniqueBridgeAccounts} unique bridge account{uniqueBridgeAccounts === 1 ? "" : "s"}
              </text>
            </g>

            {selfNode ? (
              <g>
                <title>{`${selfNode.displayName || selfNode.handle} · @${selfNode.handle} · ${selfNode.followersCount.toLocaleString()} followers`}</title>
                <rect
                  x="68"
                  y="211"
                  width="270"
                  height="98"
                  rx="20"
                  fill="#071016"
                  fillOpacity="0.98"
                  stroke="#45d8ff"
                  strokeOpacity="0.38"
                  strokeWidth="1.4"
                />
                <rect
                  x="69"
                  y="212"
                  width="268"
                  height="96"
                  rx="19"
                  fill="none"
                  stroke="#ffffff"
                  strokeOpacity="0.035"
                />
                <circle cx="109" cy="260" r="35" fill="#16c8ff" opacity="0.07" />
                <circle
                  cx="109"
                  cy="260"
                  r="29"
                  fill="#071822"
                  stroke="#45d8ff"
                  strokeWidth="2.4"
                />
                <text
                  x="109"
                  y="265"
                  textAnchor="middle"
                  fill="white"
                  fontSize="13"
                  fontWeight="800"
                >
                  YOU
                </text>
                <text
                  x="154"
                  y="230"
                  fill="#8ce8ff"
                  fontSize="7.5"
                  fontWeight="700"
                  letterSpacing="1.4"
                >
                  CONNECTED ACCOUNT
                </text>
                <text
                  x="154"
                  y="251"
                  fill="white"
                  fillOpacity="0.94"
                  fontSize="12"
                  fontWeight="750"
                >
                  {selfNode.displayName && selfNode.displayName !== selfNode.handle
                    ? truncate(selfNode.displayName, 24)
                    : `@${truncate(selfNode.handle, 22)}`}
                </text>
                <text
                  x="154"
                  y="269"
                  fill="#8ce8ff"
                  fillOpacity="0.8"
                  fontSize="9"
                >
                  {selfNode.displayName && selfNode.displayName !== selfNode.handle
                    ? `@${truncate(selfNode.handle, 24)}`
                    : "Bluesky identity"}
                </text>
                <text x="154" y="290" fill="white" fillOpacity="0.5" fontSize="8.5">
                  {selfNode.followersCount.toLocaleString()} followers  ·  {selfNode.followsCount.toLocaleString()} following
                </text>
              </g>
            ) : null}
          </svg>

          <div className="grid gap-px border-t border-white/8 bg-white/8 md:grid-cols-3">
            <div className="bg-[#07090c] p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8ce8ff]">
                Blue
              </p>
              <p className="mt-1 text-xs leading-5 text-white/42">
                Mutual relationships in your selected starting pool. The profile total can be larger than the observable public graph; the counters above show both numbers separately.
              </p>
            </div>
            <div className="bg-[#07090c] p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#f0cf8c]">
                Gold
              </p>
              <p className="mt-1 text-xs leading-5 text-white/42">
                A starting account becomes gold only when Bluesky verifies a reciprocal edge between it and a mapped target. One bridge account can create more than one verified path.
              </p>
            </div>
            <div className="bg-[#07090c] p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#d0a9ff]">
                Purple
              </p>
              <p className="mt-1 text-xs leading-5 text-white/42">
                Real target profiles from the current run or your saved campaign. Deeper bestie paths stay absent until the recursive worker verifies them.
              </p>
            </div>
          </div>
        </>
      )}
      {error && graph ? (
        <p className="border-t border-white/8 px-5 py-3 text-xs text-[#ffb4b8]">{error}</p>
      ) : null}
    </div>
  );
}
