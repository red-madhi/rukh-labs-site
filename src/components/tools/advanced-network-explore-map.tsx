"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ExternalLink,
  Focus,
  Loader2,
  Minus,
  Move,
  Plus,
  RefreshCw,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAdvancedBlueskyOAuth } from "@/components/tools/advanced-network-oauth";
import type { StartingNetworkScope } from "@/lib/advanced-network";

const VIEW_W = 1200;
const VIEW_H = 720;
const WORLD_W = 1800;
const WORLD_H = 1200;
const CENTER_X = WORLD_W / 2;
const CENTER_Y = WORLD_H / 2;
const MIN_SCALE = 0.42;
const MAX_SCALE = 3.2;
const INITIAL_VIEW = { scale: 0.58, x: 78, y: 12 };

type ExploreNode = {
  id: string;
  did: string;
  handle: string;
  displayName?: string;
  followersCount: number;
  followsCount: number;
  kind: "self" | "follower" | "mutual" | "target";
  score: number;
};

type ExploreEdge = {
  source: string;
  target: string;
  kind:
    | "self-mutual"
    | "self-follower"
    | "self-target"
    | "verified-target-bridge"
    | "known-peer-edge";
  reciprocal: boolean;
};

type ExploreGraph = {
  actor: { did: string; handle: string; displayName?: string };
  scope: StartingNetworkScope;
  generatedAt: string;
  totals: {
    profileFollowers: number;
    observableFollowers: number;
    mutuals: number;
    startingPool: number;
    displayedStartingNodes: number;
    targets: number;
    verifiedTargetBridges: number;
    knownPeerEdges?: number;
  };
  nodes: ExploreNode[];
  edges: ExploreEdge[];
  note: string;
  error?: string;
};

type PositionedNode = ExploreNode & {
  x: number;
  y: number;
  r: number;
  isBridge: boolean;
  targetIds: string[];
};

type ViewTransform = { scale: number; x: number; y: number };

type DragState = {
  pointerId: number;
  clientX: number;
  clientY: number;
  startX: number;
  startY: number;
};

function compact(value: number) {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function hash01(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return ((hash >>> 0) % 10000) / 10000;
}

function nodeRadius(node: ExploreNode, bridge: boolean) {
  if (node.kind === "self") return 28;
  if (node.kind === "target") return clamp(15 + Math.log10(node.followersCount + 10) * 1.5, 18, 25);
  if (bridge) return clamp(10 + Math.log10(node.followersCount + 10) * 0.9, 12, 17);
  return clamp(5.5 + Math.log10(node.followersCount + 10) * 0.7, 6, 11.5);
}

function strokeFor(node: PositionedNode) {
  if (node.kind === "self") return "#64e3ff";
  if (node.kind === "target") return "#ca91ff";
  if (node.isBridge) return "#f0c56e";
  if (node.kind === "mutual") return "#66dfff";
  return "#8293a2";
}

function fillFor(node: PositionedNode) {
  if (node.kind === "self") return "#071b25";
  if (node.kind === "target") return "#1c1028";
  if (node.isBridge) return "#241a0b";
  if (node.kind === "mutual") return "#0a1c24";
  return "#11161b";
}

function buildPositions(graph: ExploreGraph): PositionedNode[] {
  const bridgeTargets = new Map<string, string[]>();
  for (const edge of graph.edges) {
    if (edge.kind !== "verified-target-bridge") continue;
    const current = bridgeTargets.get(edge.source) ?? [];
    current.push(edge.target);
    bridgeTargets.set(edge.source, current);
  }

  const targets = graph.nodes
    .filter((node) => node.kind === "target")
    .sort((a, b) => b.followersCount - a.followersCount);
  const targetPosition = new Map<string, { x: number; y: number }>();
  targets.forEach((target, index) => {
    const angle = -Math.PI / 2 + (index / Math.max(1, targets.length)) * Math.PI * 2;
    const radiusX = 650;
    const radiusY = 455;
    targetPosition.set(target.id, {
      x: CENTER_X + Math.cos(angle) * radiusX,
      y: CENTER_Y + Math.sin(angle) * radiusY,
    });
  });

  const warm = graph.nodes
    .filter((node) => node.kind === "mutual" || node.kind === "follower")
    .sort((a, b) => b.score - a.score || b.followersCount - a.followersCount);
  const positioned: PositionedNode[] = [];

  const self = graph.nodes.find((node) => node.kind === "self");
  if (self) {
    positioned.push({
      ...self,
      x: CENTER_X,
      y: CENTER_Y,
      r: nodeRadius(self, false),
      isBridge: false,
      targetIds: [],
    });
  }

  warm.forEach((node, index) => {
    const targetIds = bridgeTargets.get(node.id) ?? [];
    const isBridge = targetIds.length > 0;
    const jitter = (hash01(node.did) - 0.5) * 120;

    if (isBridge) {
      const connected = targetIds
        .map((id) => targetPosition.get(id))
        .filter((value): value is { x: number; y: number } => Boolean(value));
      const average = connected.length
        ? {
            x: connected.reduce((sum, point) => sum + point.x, 0) / connected.length,
            y: connected.reduce((sum, point) => sum + point.y, 0) / connected.length,
          }
        : { x: CENTER_X + 360, y: CENTER_Y };
      const dx = average.x - CENTER_X;
      const dy = average.y - CENTER_Y;
      const length = Math.max(1, Math.hypot(dx, dy));
      const nx = -dy / length;
      const ny = dx / length;
      const fraction = 0.57 + (hash01(`${node.did}:fraction`) - 0.5) * 0.12;
      positioned.push({
        ...node,
        x: CENTER_X + dx * fraction + nx * jitter,
        y: CENTER_Y + dy * fraction + ny * jitter,
        r: nodeRadius(node, true),
        isBridge: true,
        targetIds,
      });
      return;
    }

    const golden = Math.PI * (3 - Math.sqrt(5));
    const angle = index * golden + hash01(node.did) * 0.45;
    const normalized = warm.length <= 1 ? 0 : index / (warm.length - 1);
    const radius = 170 + normalized * 330 + (hash01(`${node.did}:r`) - 0.5) * 55;
    positioned.push({
      ...node,
      x: CENTER_X + Math.cos(angle) * radius,
      y: CENTER_Y + Math.sin(angle) * radius * 0.78,
      r: nodeRadius(node, false),
      isBridge: false,
      targetIds,
    });
  });

  targets.forEach((node) => {
    const point = targetPosition.get(node.id)!;
    positioned.push({
      ...node,
      ...point,
      r: nodeRadius(node, false),
      isBridge: false,
      targetIds: [],
    });
  });

  return positioned;
}

function roleLabel(node: PositionedNode) {
  if (node.kind === "self") return "You";
  if (node.kind === "target") return "Destination target";
  if (node.isBridge) return "Verified bridge";
  if (node.kind === "mutual") return "Mutual";
  return "Follower";
}

export function AdvancedNetworkExploreMap({
  scope,
  targetHandles,
}: {
  scope: StartingNetworkScope;
  targetHandles: string[];
}) {
  const oauth = useAdvancedBlueskyOAuth();
  const svgRef = useRef<SVGSVGElement | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const [graph, setGraph] = useState<ExploreGraph | null>(null);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [transform, setTransform] = useState<ViewTransform>(INITIAL_VIEW);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showPeerEdges, setShowPeerEdges] = useState(true);

  const refresh = useCallback(async () => {
    if (!oauth.did) return;
    setWorking(true);
    setError("");
    try {
      const response = await fetch("/api/advanced-network/map", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actor: oauth.did,
          scope,
          targets: targetHandles,
          explore: true,
        }),
      });
      const result = (await response.json()) as ExploreGraph;
      if (!response.ok) throw new Error(result.error || "Explore map failed to load.");
      setGraph(result);
      setSelectedId(null);
      setTransform(INITIAL_VIEW);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Explore map failed to load.");
    } finally {
      setWorking(false);
    }
  }, [oauth.did, scope, targetHandles]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => void refresh());
    return () => window.cancelAnimationFrame(frame);
  }, [refresh]);

  const positioned = useMemo(() => (graph ? buildPositions(graph) : []), [graph]);
  const byId = useMemo(() => new Map(positioned.map((node) => [node.id, node])), [positioned]);
  const selected = selectedId ? byId.get(selectedId) ?? null : null;
  const neighborIds = useMemo(() => {
    const result = new Set<string>();
    if (!graph || !selectedId) return result;
    for (const edge of graph.edges) {
      if (edge.source === selectedId) result.add(edge.target);
      if (edge.target === selectedId) result.add(edge.source);
    }
    return result;
  }, [graph, selectedId]);
  const targetById = useMemo(
    () => new Map(positioned.filter((node) => node.kind === "target").map((node) => [node.id, node])),
    [positioned],
  );

  const zoomAt = useCallback((nextScale: number, px = VIEW_W / 2, py = VIEW_H / 2) => {
    setTransform((current) => {
      const scale = clamp(nextScale, MIN_SCALE, MAX_SCALE);
      const worldX = (px - current.x) / current.scale;
      const worldY = (py - current.y) / current.scale;
      return {
        scale,
        x: px - worldX * scale,
        y: py - worldY * scale,
      };
    });
  }, []);

  function resetView() {
    setTransform(INITIAL_VIEW);
    setSelectedId(null);
  }

  function focusNode(node: PositionedNode) {
    const scale = node.kind === "target" ? 1.35 : node.kind === "self" ? 1.15 : 1.65;
    setTransform({
      scale,
      x: VIEW_W / 2 - node.x * scale,
      y: VIEW_H / 2 - node.y * scale,
    });
    setSelectedId(node.id);
  }

  function onWheel(event: React.WheelEvent<SVGSVGElement>) {
    event.preventDefault();
    const rect = event.currentTarget.getBoundingClientRect();
    const px = ((event.clientX - rect.left) / rect.width) * VIEW_W;
    const py = ((event.clientY - rect.top) / rect.height) * VIEW_H;
    const factor = event.deltaY < 0 ? 1.13 : 0.885;
    zoomAt(transform.scale * factor, px, py);
  }

  function onPointerDown(event: React.PointerEvent<SVGSVGElement>) {
    if (event.button !== 0) return;
    dragRef.current = {
      pointerId: event.pointerId,
      clientX: event.clientX,
      clientY: event.clientY,
      startX: transform.x,
      startY: transform.y,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event: React.PointerEvent<SVGSVGElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const dx = ((event.clientX - drag.clientX) / rect.width) * VIEW_W;
    const dy = ((event.clientY - drag.clientY) / rect.height) * VIEW_H;
    setTransform((current) => ({ ...current, x: drag.startX + dx, y: drag.startY + dy }));
  }

  function endDrag(event: React.PointerEvent<SVGSVGElement>) {
    if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null;
  }

  if (!oauth.did) return null;

  const labelsForAll = transform.scale >= 1.38;
  const labelsForBridges = transform.scale >= 0.72;
  const lineScale = clamp((transform.scale - 0.35) / 1.4, 0.28, 1);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#03060a]">
      <div className="flex flex-col gap-3 border-b border-white/8 bg-black/30 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-[#16c8ff]/22 bg-[#16c8ff]/[0.06] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#9cecff]">
              Explore map
            </span>
            {graph ? (
              <>
                <span className="text-[11px] text-white/35">{graph.nodes.length} accounts</span>
                <span className="text-[11px] text-white/35">{graph.edges.length} relationship lines</span>
              </>
            ) : null}
          </div>
          <p className="mt-1 text-[11px] leading-5 text-white/32">
            Drag to pan. Scroll to zoom. Double-click any node to fly into it.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowPeerEdges((value) => !value)}
            className={`rounded-lg border px-2.5 py-2 text-[10px] transition ${
              showPeerEdges
                ? "border-[#16c8ff]/22 bg-[#16c8ff]/[0.05] text-[#a9efff]"
                : "border-white/8 text-white/35"
            }`}
          >
            {showPeerEdges ? "Peer lines on" : "Peer lines off"}
          </button>
          <Button variant="ghost" size="sm" onClick={() => void refresh()} disabled={working}>
            {working ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <RefreshCw className="size-4" aria-hidden />}
            Refresh
          </Button>
        </div>
      </div>

      {!graph ? (
        <div className="grid min-h-[520px] place-items-center px-6 text-center">
          <div>
            <Loader2 className="mx-auto size-6 animate-spin text-[#8ce8ff]" aria-hidden />
            <p className="mt-3 text-sm text-white/48">{error || "Building the larger visual graph…"}</p>
          </div>
        </div>
      ) : (
        <div className="relative">
          <svg
            ref={svgRef}
            viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
            className="block h-[520px] w-full touch-none select-none sm:h-[620px] lg:h-[700px]"
            role="img"
            aria-label="Interactive zoomable Bluesky network map"
            onWheel={onWheel}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            onDoubleClick={(event) => event.preventDefault()}
            style={{ cursor: "grab" }}
          >
            <defs>
              <pattern id="explore-grid" width="36" height="36" patternUnits="userSpaceOnUse">
                <path d="M36 0H0V36" fill="none" stroke="#ffffff" strokeOpacity="0.024" />
              </pattern>
              <radialGradient id="explore-core-halo">
                <stop offset="0" stopColor="#16c8ff" stopOpacity="0.13" />
                <stop offset="1" stopColor="#16c8ff" stopOpacity="0" />
              </radialGradient>
              <radialGradient id="explore-target-halo">
                <stop offset="0" stopColor="#aa63ff" stopOpacity="0.13" />
                <stop offset="1" stopColor="#aa63ff" stopOpacity="0" />
              </radialGradient>
              <filter id="explore-glow" x="-100%" y="-100%" width="300%" height="300%">
                <feGaussianBlur stdDeviation="5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            <rect width={VIEW_W} height={VIEW_H} fill="#03060a" />
            <rect width={VIEW_W} height={VIEW_H} fill="url(#explore-grid)" />

            <g transform={`translate(${transform.x} ${transform.y}) scale(${transform.scale})`}>
              <circle cx={CENTER_X} cy={CENTER_Y} r="430" fill="url(#explore-core-halo)" />
              <circle cx={CENTER_X} cy={CENTER_Y} r="185" fill="none" stroke="#16c8ff" strokeOpacity="0.06" strokeWidth="2" />
              <circle cx={CENTER_X} cy={CENTER_Y} r="340" fill="none" stroke="#16c8ff" strokeOpacity="0.04" strokeWidth="2" />
              <ellipse cx={CENTER_X} cy={CENTER_Y} rx="690" ry="500" fill="none" stroke="#aa63ff" strokeOpacity="0.045" strokeWidth="2" />

              {graph.edges.map((edge, index) => {
                if (!showPeerEdges && edge.kind === "known-peer-edge") return null;
                const source = byId.get(edge.source);
                const target = byId.get(edge.target);
                if (!source || !target) return null;
                const bridge = edge.kind === "verified-target-bridge";
                const peer = edge.kind === "known-peer-edge";
                const active = !selectedId || edge.source === selectedId || edge.target === selectedId;
                const dimmed = selectedId && !active;
                const color = bridge
                  ? "#f0c56e"
                  : edge.kind === "self-target"
                    ? "#bd79ff"
                    : peer
                      ? edge.reciprocal
                        ? "#7aa7b8"
                        : "#51626f"
                      : edge.kind === "self-mutual"
                        ? "#55d7ff"
                        : "#667785";
                const baseOpacity = bridge ? 0.8 : peer ? (edge.reciprocal ? 0.18 : 0.1) : 0.27;
                return (
                  <line
                    key={`${edge.source}-${edge.target}-${edge.kind}-${index}`}
                    x1={source.x}
                    y1={source.y}
                    x2={target.x}
                    y2={target.y}
                    stroke={color}
                    strokeWidth={(bridge ? 2.8 : peer ? 1.2 : 1.6) / Math.sqrt(transform.scale)}
                    strokeOpacity={dimmed ? 0.025 : baseOpacity * lineScale}
                    strokeDasharray={edge.kind === "self-follower" ? "5 7" : undefined}
                  />
                );
              })}

              {positioned.map((node) => {
                const isSelected = selectedId === node.id;
                const related = !selectedId || isSelected || neighborIds.has(node.id);
                const labelVisible =
                  node.kind === "self" ||
                  node.kind === "target" ||
                  isSelected ||
                  (node.isBridge && labelsForBridges) ||
                  labelsForAll;
                const bridgeCount = node.kind === "target"
                  ? graph.edges.filter((edge) => edge.kind === "verified-target-bridge" && edge.target === node.id).length
                  : 0;
                return (
                  <g
                    key={node.id}
                    transform={`translate(${node.x} ${node.y})`}
                    opacity={related ? 1 : 0.16}
                    onPointerDown={(event) => event.stopPropagation()}
                    onClick={(event) => {
                      event.stopPropagation();
                      setSelectedId((current) => (current === node.id ? null : node.id));
                    }}
                    onDoubleClick={(event) => {
                      event.stopPropagation();
                      focusNode(node);
                    }}
                    style={{ cursor: "pointer" }}
                  >
                    {node.kind === "target" ? (
                      <circle r={node.r * 2.65} fill="url(#explore-target-halo)" />
                    ) : node.isBridge ? (
                      <circle r={node.r * 2.2} fill="#e6bd73" fillOpacity="0.045" />
                    ) : null}
                    {isSelected ? (
                      <circle
                        r={node.r + 11 / transform.scale}
                        fill="none"
                        stroke={strokeFor(node)}
                        strokeWidth={2.2 / transform.scale}
                        strokeOpacity="0.75"
                        filter="url(#explore-glow)"
                      />
                    ) : null}
                    <circle
                      r={node.r}
                      fill={fillFor(node)}
                      stroke={strokeFor(node)}
                      strokeWidth={(node.kind === "self" || node.kind === "target" || node.isBridge ? 2.4 : 1.5) / Math.sqrt(transform.scale)}
                    />
                    {node.kind === "self" ? (
                      <text
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fill="#ffffff"
                        fontSize={11 / Math.sqrt(transform.scale)}
                        fontWeight="800"
                      >
                        YOU
                      </text>
                    ) : null}
                    {node.kind === "target" && bridgeCount ? (
                      <g transform={`translate(${node.r * 0.75} ${-node.r * 0.8})`}>
                        <circle r={8 / Math.sqrt(transform.scale)} fill="#e6bd73" />
                        <text
                          textAnchor="middle"
                          dominantBaseline="middle"
                          fill="#111111"
                          fontSize={7.5 / Math.sqrt(transform.scale)}
                          fontWeight="800"
                        >
                          {bridgeCount}
                        </text>
                      </g>
                    ) : null}
                    {labelVisible ? (
                      <g transform={`translate(0 ${node.r + 15 / transform.scale})`}>
                        <rect
                          x={-64 / transform.scale}
                          y={-9 / transform.scale}
                          width={128 / transform.scale}
                          height={18 / transform.scale}
                          rx={7 / transform.scale}
                          fill="#03060a"
                          fillOpacity="0.88"
                          stroke={strokeFor(node)}
                          strokeOpacity="0.18"
                          strokeWidth={0.8 / transform.scale}
                        />
                        <text
                          textAnchor="middle"
                          dominantBaseline="middle"
                          fill={node.kind === "target" ? "#e7d4ff" : node.isBridge ? "#f6d794" : "#d8e8ee"}
                          fontSize={8.2 / transform.scale}
                          fontWeight={node.kind === "target" || node.isBridge ? "650" : "500"}
                        >
                          @{node.handle.length > 22 ? `${node.handle.slice(0, 21)}…` : node.handle}
                        </text>
                      </g>
                    ) : null}
                  </g>
                );
              })}
            </g>
          </svg>

          <div className="pointer-events-none absolute left-3 top-3 flex flex-col gap-2 sm:left-4 sm:top-4">
            <div className="pointer-events-auto flex items-center gap-1 rounded-xl border border-white/10 bg-[#05080c]/90 p-1 shadow-xl backdrop-blur-md">
              <button
                type="button"
                onClick={() => zoomAt(transform.scale * 1.22)}
                className="grid size-8 place-items-center rounded-lg text-white/55 transition hover:bg-white/8 hover:text-white"
                aria-label="Zoom in"
              >
                <Plus className="size-4" aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => zoomAt(transform.scale / 1.22)}
                className="grid size-8 place-items-center rounded-lg text-white/55 transition hover:bg-white/8 hover:text-white"
                aria-label="Zoom out"
              >
                <Minus className="size-4" aria-hidden />
              </button>
              <button
                type="button"
                onClick={resetView}
                className="grid size-8 place-items-center rounded-lg text-white/55 transition hover:bg-white/8 hover:text-white"
                aria-label="Reset map"
              >
                <RotateCcw className="size-4" aria-hidden />
              </button>
            </div>
            <div className="rounded-lg border border-white/8 bg-[#05080c]/80 px-2.5 py-1.5 text-[10px] text-white/38 backdrop-blur-md">
              {Math.round(transform.scale * 100)}% zoom
            </div>
          </div>

          <div className="pointer-events-none absolute bottom-3 left-3 hidden rounded-xl border border-white/9 bg-[#05080c]/88 p-3 text-[10px] text-white/42 shadow-xl backdrop-blur-md sm:block">
            <div className="grid gap-1.5">
              <span><i className="mr-2 inline-block size-2 rounded-full bg-[#66dfff]" />mutual</span>
              <span><i className="mr-2 inline-block size-2 rounded-full bg-[#f0c56e]" />bridge</span>
              <span><i className="mr-2 inline-block size-2 rounded-full bg-[#ca91ff]" />destination</span>
              <span><i className="mr-2 inline-block size-2 rounded-full bg-[#8293a2]" />follower / peer</span>
            </div>
          </div>

          {selected ? (
            <div className="absolute bottom-3 right-3 w-[min(360px,calc(100%-24px))] rounded-2xl border border-white/10 bg-[#070a0e]/94 p-4 shadow-2xl backdrop-blur-xl sm:bottom-4 sm:right-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-white/30">{roleLabel(selected)}</p>
                  <p className="mt-1 truncate text-sm font-semibold text-white">{selected.displayName || `@${selected.handle}`}</p>
                  <p className="mt-1 truncate text-[10px] text-white/34">@{selected.handle}</p>
                </div>
                <button
                  type="button"
                  onClick={() => focusNode(selected)}
                  className="grid size-8 shrink-0 place-items-center rounded-lg border border-white/8 text-white/45 transition hover:text-white"
                  aria-label="Focus this node"
                >
                  <Focus className="size-3.5" aria-hidden />
                </button>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2">
                <div className="rounded-lg border border-white/7 bg-white/[0.025] p-2.5">
                  <p className="text-sm font-semibold text-white">{compact(selected.followersCount)}</p>
                  <p className="text-[8px] uppercase tracking-[0.1em] text-white/25">followers</p>
                </div>
                <div className="rounded-lg border border-white/7 bg-white/[0.025] p-2.5">
                  <p className="text-sm font-semibold text-white">{neighborIds.size}</p>
                  <p className="text-[8px] uppercase tracking-[0.1em] text-white/25">shown links</p>
                </div>
                <div className="rounded-lg border border-white/7 bg-white/[0.025] p-2.5">
                  <p className="text-sm font-semibold text-[#f1d49a]">{selected.targetIds.length}</p>
                  <p className="text-[8px] uppercase tracking-[0.1em] text-white/25">targets</p>
                </div>
              </div>
              {selected.targetIds.length ? (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {selected.targetIds.map((targetId) => {
                    const target = targetById.get(targetId);
                    return target ? (
                      <span key={targetId} className="rounded-full border border-[#aa63ff]/18 bg-[#aa63ff]/[0.04] px-2 py-1 text-[9px] text-[#d8b5ff]">
                        → @{target.handle}
                      </span>
                    ) : null;
                  })}
                </div>
              ) : null}
              <div className="mt-4 flex items-center gap-2">
                <a
                  href={`https://bsky.app/profile/${selected.handle}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-white/9 bg-white/[0.025] px-3 py-2 text-[10px] font-medium text-white/55 transition hover:text-white"
                >
                  Open profile
                  <ExternalLink className="size-3" aria-hidden />
                </a>
                <span className="inline-flex items-center gap-1 text-[9px] text-white/26">
                  <Move className="size-3" aria-hidden /> drag map
                </span>
              </div>
            </div>
          ) : null}
        </div>
      )}

      <div className="border-t border-white/8 bg-[#05080b] px-4 py-3 text-[10px] leading-5 text-white/28 sm:px-5">
        {graph?.note ?? "Explore mode uses the same real Bluesky graph data as the drill-down views."}
      </div>
    </div>
  );
}
