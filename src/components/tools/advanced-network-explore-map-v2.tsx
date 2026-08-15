"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ExternalLink,
  Focus,
  Loader2,
  Minus,
  Plus,
  RefreshCw,
  RotateCcw,
  X,
} from "lucide-react";
import { useAdvancedBlueskyOAuth } from "@/components/tools/advanced-network-oauth";
import type { StartingNetworkScope } from "@/lib/advanced-network";

const VIEW_W = 1200;
const VIEW_H = 720;
const WORLD_W = 1800;
const WORLD_H = 1160;
const CENTER_X = WORLD_W / 2;
const CENTER_Y = WORLD_H / 2;
const MIN_SCALE = 0.38;
const MAX_SCALE = 10;
const INITIAL_VIEW = { scale: 0.6, x: 58, y: 8 };
const TAP_SLOP_PX = 10;

type NodeKind = "self" | "follower" | "mutual" | "target";

type ExploreNode = {
  id: string;
  did: string;
  handle: string;
  displayName?: string;
  followersCount: number;
  followsCount: number;
  kind: NodeKind;
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
type PointerPoint = {
  clientX: number;
  clientY: number;
  startClientX: number;
  startClientY: number;
};
type PanStart = {
  pointerId: number;
  clientX: number;
  clientY: number;
  x: number;
  y: number;
};
type PinchStart = {
  distance: number;
  worldX: number;
  worldY: number;
  scale: number;
};

function compact(value: number) {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(Math.max(0, value));
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

function radiusFor(node: ExploreNode, bridge: boolean) {
  if (node.kind === "self") return 30;
  if (node.kind === "target") {
    return clamp(18 + Math.log10(node.followersCount + 10) * 1.45, 21, 29);
  }
  if (bridge) {
    return clamp(12 + Math.log10(node.followersCount + 10) * 0.85, 14, 20);
  }
  return clamp(7 + Math.log10(node.followersCount + 10) * 0.7, 7.5, 13.5);
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

function roleLabel(node: PositionedNode) {
  if (node.kind === "self") return "You";
  if (node.kind === "target") return "Destination";
  if (node.isBridge) return "Verified bridge";
  if (node.kind === "mutual") return "Mutual";
  return "Follower / peer";
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

  const targetPositions = new Map<string, { x: number; y: number }>();
  targets.forEach((target, index) => {
    const angle = -Math.PI / 2 + (index / Math.max(1, targets.length)) * Math.PI * 2;
    targetPositions.set(target.id, {
      x: CENTER_X + Math.cos(angle) * 650,
      y: CENTER_Y + Math.sin(angle) * 430,
    });
  });

  const result: PositionedNode[] = [];
  const self = graph.nodes.find((node) => node.kind === "self");
  if (self) {
    result.push({
      ...self,
      x: CENTER_X,
      y: CENTER_Y,
      r: radiusFor(self, false),
      isBridge: false,
      targetIds: [],
    });
  }

  const warm = graph.nodes
    .filter((node) => node.kind === "mutual" || node.kind === "follower")
    .sort((a, b) => b.score - a.score || b.followersCount - a.followersCount);

  warm.forEach((node, index) => {
    const targetIds = bridgeTargets.get(node.id) ?? [];
    const isBridge = targetIds.length > 0;

    if (isBridge) {
      const connected = targetIds
        .map((id) => targetPositions.get(id))
        .filter((item): item is { x: number; y: number } => Boolean(item));
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
      const jitter = (hash01(node.did) - 0.5) * 115;
      const fraction = 0.55 + (hash01(`${node.did}:fraction`) - 0.5) * 0.13;
      result.push({
        ...node,
        x: CENTER_X + dx * fraction + nx * jitter,
        y: CENTER_Y + dy * fraction + ny * jitter,
        r: radiusFor(node, true),
        isBridge: true,
        targetIds,
      });
      return;
    }

    const golden = Math.PI * (3 - Math.sqrt(5));
    const angle = index * golden + hash01(node.did) * 0.45;
    const normalized = warm.length <= 1 ? 0 : index / (warm.length - 1);
    const distance = 150 + normalized * 360 + (hash01(`${node.did}:r`) - 0.5) * 56;
    result.push({
      ...node,
      x: CENTER_X + Math.cos(angle) * distance,
      y: CENTER_Y + Math.sin(angle) * distance * 0.78,
      r: radiusFor(node, false),
      isBridge: false,
      targetIds,
    });
  });

  targets.forEach((node) => {
    const point = targetPositions.get(node.id)!;
    result.push({
      ...node,
      ...point,
      r: radiusFor(node, false),
      isBridge: false,
      targetIds: [],
    });
  });

  return result;
}

export function AdvancedNetworkExploreMapV2({
  scope,
  targetHandles,
}: {
  scope: StartingNetworkScope;
  targetHandles: string[];
}) {
  const oauth = useAdvancedBlueskyOAuth();
  const svgRef = useRef<SVGSVGElement | null>(null);
  const pointersRef = useRef(new Map<number, PointerPoint>());
  const panRef = useRef<PanStart | null>(null);
  const pinchRef = useRef<PinchStart | null>(null);
  const pinchingRef = useRef(false);
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
    void refresh();
  }, [refresh]);

  const positioned = useMemo(() => (graph ? buildPositions(graph) : []), [graph]);
  const byId = useMemo(
    () => new Map(positioned.map((node) => [node.id, node])),
    [positioned],
  );
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
    () =>
      new Map(
        positioned
          .filter((node) => node.kind === "target")
          .map((node) => [node.id, node]),
      ),
    [positioned],
  );

  const clientToView = useCallback((clientX: number, clientY: number) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0 || rect.height === 0) {
      return { x: VIEW_W / 2, y: VIEW_H / 2 };
    }
    return {
      x: ((clientX - rect.left) / rect.width) * VIEW_W,
      y: ((clientY - rect.top) / rect.height) * VIEW_H,
    };
  }, []);

  const zoomAt = useCallback(
    (nextScale: number, px = VIEW_W / 2, py = VIEW_H / 2) => {
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
    },
    [],
  );

  function resetView() {
    pointersRef.current.clear();
    panRef.current = null;
    pinchRef.current = null;
    pinchingRef.current = false;
    setTransform(INITIAL_VIEW);
    setSelectedId(null);
  }

  function focusNode(node: PositionedNode) {
    const scale = node.kind === "target" ? 4.2 : node.kind === "self" ? 3.3 : 5.2;
    setTransform({
      scale,
      x: VIEW_W / 2 - node.x * scale,
      y: VIEW_H / 2 - node.y * scale,
    });
    setSelectedId(node.id);
  }

  function beginPointer(event: React.PointerEvent<SVGSVGElement>) {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    pointersRef.current.set(event.pointerId, {
      clientX: event.clientX,
      clientY: event.clientY,
      startClientX: event.clientX,
      startClientY: event.clientY,
    });
    event.currentTarget.setPointerCapture(event.pointerId);

    const points = [...pointersRef.current.values()];
    if (points.length === 1) {
      pinchingRef.current = false;
      panRef.current = {
        pointerId: event.pointerId,
        clientX: event.clientX,
        clientY: event.clientY,
        x: transform.x,
        y: transform.y,
      };
      pinchRef.current = null;
      return;
    }

    if (points.length >= 2) {
      pinchingRef.current = true;
      panRef.current = null;
      const [a, b] = points;
      const distance = Math.max(
        1,
        Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY),
      );
      const midpoint = clientToView(
        (a.clientX + b.clientX) / 2,
        (a.clientY + b.clientY) / 2,
      );
      pinchRef.current = {
        distance,
        worldX: (midpoint.x - transform.x) / transform.scale,
        worldY: (midpoint.y - transform.y) / transform.scale,
        scale: transform.scale,
      };
    }
  }

  function movePointer(event: React.PointerEvent<SVGSVGElement>) {
    const point = pointersRef.current.get(event.pointerId);
    if (!point) return;
    point.clientX = event.clientX;
    point.clientY = event.clientY;
    pointersRef.current.set(event.pointerId, point);

    const points = [...pointersRef.current.values()];
    if (points.length >= 2 && pinchRef.current) {
      event.preventDefault();
      pinchingRef.current = true;
      const [a, b] = points;
      const distance = Math.max(
        1,
        Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY),
      );
      const midpoint = clientToView(
        (a.clientX + b.clientX) / 2,
        (a.clientY + b.clientY) / 2,
      );
      const scale = clamp(
        pinchRef.current.scale * (distance / pinchRef.current.distance),
        MIN_SCALE,
        MAX_SCALE,
      );
      setTransform({
        scale,
        x: midpoint.x - pinchRef.current.worldX * scale,
        y: midpoint.y - pinchRef.current.worldY * scale,
      });
      return;
    }

    const pan = panRef.current;
    if (!pan || pan.pointerId !== event.pointerId) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const dx = ((event.clientX - pan.clientX) / rect.width) * VIEW_W;
    const dy = ((event.clientY - pan.clientY) / rect.height) * VIEW_H;
    setTransform((current) => ({
      ...current,
      x: pan.x + dx,
      y: pan.y + dy,
    }));
  }

  function endPointer(event: React.PointerEvent<SVGSVGElement>) {
    const tracked = pointersRef.current.get(event.pointerId);
    const wasSinglePointer = pointersRef.current.size === 1;
    const movedPx = tracked
      ? Math.hypot(
          event.clientX - tracked.startClientX,
          event.clientY - tracked.startClientY,
        )
      : Number.POSITIVE_INFINITY;

    if (wasSinglePointer && !pinchingRef.current && movedPx <= TAP_SLOP_PX) {
      const target = event.target as Element | null;
      const nodeElement = target?.closest?.("[data-network-node-id]");
      const nodeId = nodeElement?.getAttribute("data-network-node-id");
      if (nodeId && byId.has(nodeId)) {
        setSelectedId(nodeId);
      } else {
        setSelectedId(null);
      }
    }

    pointersRef.current.delete(event.pointerId);
    pinchRef.current = null;
    panRef.current = null;

    const remaining = [...pointersRef.current.entries()];
    if (remaining.length === 1) {
      const [pointerId, remainingPoint] = remaining[0];
      panRef.current = {
        pointerId,
        clientX: remainingPoint.clientX,
        clientY: remainingPoint.clientY,
        x: transform.x,
        y: transform.y,
      };
    } else if (remaining.length === 0) {
      pinchingRef.current = false;
    }
  }

  function onWheel(event: React.WheelEvent<SVGSVGElement>) {
    event.preventDefault();
    const point = clientToView(event.clientX, event.clientY);
    zoomAt(
      transform.scale * (event.deltaY < 0 ? 1.18 : 0.845),
      point.x,
      point.y,
    );
  }

  if (!oauth.did) return null;

  const labelsForAll = transform.scale >= 1.15;
  const labelsForBridges = transform.scale >= 0.68;

  return (
    <div className="min-w-0 max-w-full overflow-hidden rounded-2xl border border-white/10 bg-[#03060a]">
      <div className="flex min-w-0 flex-col gap-3 border-b border-white/8 bg-black/30 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-[#16c8ff]/22 bg-[#16c8ff]/[0.06] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#9cecff]">
              Explore map
            </span>
            {graph ? (
              <span className="text-[11px] text-white/35">
                {graph.nodes.length} accounts · {graph.edges.length} lines
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-[11px] leading-5 text-white/46">
            <strong className="text-white/65">Tap a circle for account details.</strong>{" "}
            Drag with one finger to pan. Pinch with two fingers to zoom up to 10×.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowPeerEdges((value) => !value)}
            className="rounded-lg border border-white/10 bg-white/[0.025] px-3 py-2 text-[10px] text-white/55"
          >
            {showPeerEdges ? "Hide peer lines" : "Show peer lines"}
          </button>
          <button
            type="button"
            onClick={() => void refresh()}
            disabled={working}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.025] px-3 py-2 text-[10px] text-white/55 disabled:opacity-50"
          >
            {working ? (
              <Loader2 className="size-3.5 animate-spin" aria-hidden />
            ) : (
              <RefreshCw className="size-3.5" aria-hidden />
            )}
            Refresh
          </button>
        </div>
      </div>

      {!graph ? (
        <div className="grid min-h-[420px] place-items-center px-5 text-center">
          <div>
            <Loader2 className="mx-auto size-5 animate-spin text-[#8ce8ff]" aria-hidden />
            <p className="mt-3 text-sm text-white/48">
              {error || "Loading the network constellation…"}
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className="relative w-full overflow-hidden">
            <svg
              ref={svgRef}
              viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
              className="block h-[68svh] min-h-[520px] max-h-[760px] w-full select-none sm:h-[680px]"
              style={{ touchAction: "none", cursor: pointersRef.current.size ? "grabbing" : "grab" }}
              role="img"
              aria-label="Interactive Bluesky network map. Tap a node for account details, drag to pan, pinch to zoom."
              onWheel={onWheel}
              onPointerDownCapture={beginPointer}
              onPointerMoveCapture={movePointer}
              onPointerUpCapture={endPointer}
              onPointerCancelCapture={endPointer}
            >
              <defs>
                <pattern id="explore-v2-grid" width="36" height="36" patternUnits="userSpaceOnUse">
                  <path d="M36 0H0V36" fill="none" stroke="#ffffff" strokeOpacity="0.024" />
                </pattern>
                <radialGradient id="explore-v2-core-halo">
                  <stop offset="0" stopColor="#16c8ff" stopOpacity="0.14" />
                  <stop offset="1" stopColor="#16c8ff" stopOpacity="0" />
                </radialGradient>
                <radialGradient id="explore-v2-target-halo">
                  <stop offset="0" stopColor="#aa63ff" stopOpacity="0.15" />
                  <stop offset="1" stopColor="#aa63ff" stopOpacity="0" />
                </radialGradient>
              </defs>

              <rect width={VIEW_W} height={VIEW_H} fill="#03060a" />
              <rect width={VIEW_W} height={VIEW_H} fill="url(#explore-v2-grid)" />

              <g transform={`translate(${transform.x} ${transform.y}) scale(${transform.scale})`}>
                <circle cx={CENTER_X} cy={CENTER_Y} r="430" fill="url(#explore-v2-core-halo)" />
                <circle cx={CENTER_X} cy={CENTER_Y} r="190" fill="none" stroke="#16c8ff" strokeOpacity="0.055" strokeWidth="2" />
                <circle cx={CENTER_X} cy={CENTER_Y} r="350" fill="none" stroke="#16c8ff" strokeOpacity="0.035" strokeWidth="2" />
                <ellipse cx={CENTER_X} cy={CENTER_Y} rx="690" ry="480" fill="none" stroke="#aa63ff" strokeOpacity="0.05" strokeWidth="2" />

                {graph.edges.map((edge, index) => {
                  if (!showPeerEdges && edge.kind === "known-peer-edge") return null;
                  const source = byId.get(edge.source);
                  const target = byId.get(edge.target);
                  if (!source || !target) return null;
                  const active = !selectedId || edge.source === selectedId || edge.target === selectedId;
                  const bridge = edge.kind === "verified-target-bridge";
                  const peer = edge.kind === "known-peer-edge";
                  const color = bridge
                    ? "#f0c56e"
                    : edge.kind === "self-target"
                      ? "#bd79ff"
                      : peer
                        ? "#637b88"
                        : edge.kind === "self-mutual"
                          ? "#55d7ff"
                          : "#667785";
                  const opacity = bridge ? 0.8 : peer ? 0.14 : 0.28;
                  return (
                    <line
                      key={`${edge.source}-${edge.target}-${edge.kind}-${index}`}
                      x1={source.x}
                      y1={source.y}
                      x2={target.x}
                      y2={target.y}
                      stroke={color}
                      strokeWidth={(bridge ? 2.8 : peer ? 1.2 : 1.6) / Math.sqrt(transform.scale)}
                      strokeOpacity={active ? opacity : 0.018}
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
                  const touchRadius = Math.max(node.r + 8 / transform.scale, 24 / transform.scale);

                  return (
                    <g
                      key={node.id}
                      data-network-node-id={node.id}
                      transform={`translate(${node.x} ${node.y})`}
                      opacity={related ? 1 : 0.14}
                      style={{ cursor: "pointer" }}
                    >
                      <circle r={touchRadius} fill="transparent" pointerEvents="all" />
                      {node.kind === "target" ? (
                        <circle r={node.r * 2.8} fill="url(#explore-v2-target-halo)" />
                      ) : node.isBridge ? (
                        <circle r={node.r * 2.2} fill="#e6bd73" fillOpacity="0.05" />
                      ) : null}
                      {isSelected ? (
                        <circle
                          r={node.r + 11 / transform.scale}
                          fill="none"
                          stroke={strokeFor(node)}
                          strokeWidth={2.2 / transform.scale}
                          strokeOpacity="0.95"
                        />
                      ) : null}
                      <circle
                        r={node.r}
                        fill={fillFor(node)}
                        stroke={strokeFor(node)}
                        strokeWidth={(node.kind === "self" || node.kind === "target" || node.isBridge ? 2.5 : 1.5) / Math.sqrt(transform.scale)}
                      />
                      {node.kind === "self" ? (
                        <text
                          textAnchor="middle"
                          dominantBaseline="middle"
                          fill="#fff"
                          fontSize={11 / Math.sqrt(transform.scale)}
                          fontWeight="800"
                          pointerEvents="none"
                        >
                          YOU
                        </text>
                      ) : null}
                      {labelVisible ? (
                        <g
                          transform={`translate(0 ${node.r + 17 / transform.scale})`}
                          pointerEvents="none"
                        >
                          <rect
                            x={-76 / transform.scale}
                            y={-11 / transform.scale}
                            width={152 / transform.scale}
                            height={22 / transform.scale}
                            rx={8 / transform.scale}
                            fill="#03060a"
                            fillOpacity="0.94"
                            stroke={strokeFor(node)}
                            strokeOpacity="0.24"
                            strokeWidth={0.9 / transform.scale}
                          />
                          <text
                            textAnchor="middle"
                            dominantBaseline="middle"
                            fill={node.kind === "target" ? "#e7d4ff" : node.isBridge ? "#f6d794" : "#d8e8ee"}
                            fontSize={10.5 / transform.scale}
                            fontWeight={node.kind === "target" || node.isBridge ? "700" : "550"}
                          >
                            @{node.handle.length > 24 ? `${node.handle.slice(0, 23)}…` : node.handle}
                          </text>
                        </g>
                      ) : null}
                    </g>
                  );
                })}
              </g>
            </svg>

            <div className="pointer-events-none absolute left-3 top-3 z-20 flex flex-col gap-2">
              <div className="pointer-events-auto flex items-center gap-1 rounded-xl border border-white/10 bg-[#05080c]/94 p-1 shadow-xl backdrop-blur-md">
                <button
                  type="button"
                  onClick={() => zoomAt(transform.scale * 1.45)}
                  className="grid size-10 place-items-center rounded-lg text-white/70 active:bg-white/10"
                  aria-label="Zoom in"
                >
                  <Plus className="size-4" aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={() => zoomAt(transform.scale / 1.45)}
                  className="grid size-10 place-items-center rounded-lg text-white/70 active:bg-white/10"
                  aria-label="Zoom out"
                >
                  <Minus className="size-4" aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={resetView}
                  className="grid size-10 place-items-center rounded-lg text-white/70 active:bg-white/10"
                  aria-label="Reset map"
                >
                  <RotateCcw className="size-4" aria-hidden />
                </button>
              </div>
              <div className="rounded-lg border border-white/8 bg-[#05080c]/88 px-2.5 py-1.5 text-[10px] text-white/50 backdrop-blur-md">
                {transform.scale.toFixed(transform.scale >= 4 ? 1 : 2)}× zoom
              </div>
            </div>

            {selected ? (
              <div className="absolute inset-x-3 bottom-3 z-30 max-h-[48%] overflow-y-auto rounded-2xl border border-white/12 bg-[#070a0e]/97 p-4 shadow-2xl backdrop-blur-xl sm:inset-x-auto sm:bottom-4 sm:right-4 sm:w-[360px]">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[#8ce8ff]">
                      {roleLabel(selected)}
                    </p>
                    <p className="mt-1 break-words text-base font-semibold text-white">
                      {selected.displayName || `@${selected.handle}`}
                    </p>
                    <p className="mt-1 break-all text-[11px] text-white/42">@{selected.handle}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedId(null)}
                    className="grid size-9 shrink-0 place-items-center rounded-lg border border-white/9 text-white/55"
                    aria-label="Close account details"
                  >
                    <X className="size-4" aria-hidden />
                  </button>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  <div className="rounded-lg border border-white/7 bg-white/[0.025] p-3">
                    <p className="text-base font-semibold text-white">{compact(selected.followersCount)}</p>
                    <p className="text-[8px] uppercase tracking-[0.1em] text-white/28">followers</p>
                  </div>
                  <div className="rounded-lg border border-white/7 bg-white/[0.025] p-3">
                    <p className="text-base font-semibold text-white">{compact(selected.followsCount)}</p>
                    <p className="text-[8px] uppercase tracking-[0.1em] text-white/28">following</p>
                  </div>
                  <div className="rounded-lg border border-white/7 bg-white/[0.025] p-3">
                    <p className="text-base font-semibold text-[#f1d49a]">{neighborIds.size}</p>
                    <p className="text-[8px] uppercase tracking-[0.1em] text-white/28">shown links</p>
                  </div>
                </div>

                {selected.targetIds.length ? (
                  <div className="mt-3">
                    <p className="text-[9px] font-semibold uppercase tracking-[0.1em] text-white/30">
                      Connects toward
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {selected.targetIds.slice(0, 5).map((targetId) => {
                        const target = targetById.get(targetId);
                        return target ? (
                          <span
                            key={targetId}
                            className="rounded-full border border-[#aa63ff]/18 bg-[#aa63ff]/[0.04] px-2 py-1 text-[9px] text-[#d8b5ff]"
                          >
                            @{target.handle}
                          </span>
                        ) : null;
                      })}
                    </div>
                  </div>
                ) : null}

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => focusNode(selected)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[#16c8ff]/20 bg-[#16c8ff]/[0.045] px-3 py-2 text-[11px] font-medium text-[#9cecff]"
                  >
                    <Focus className="size-3.5" aria-hidden />
                    Zoom to person
                  </button>
                  <a
                    href={`https://bsky.app/profile/${selected.handle}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-white/9 bg-white/[0.025] px-3 py-2 text-[11px] font-medium text-white/60"
                  >
                    Open profile
                    <ExternalLink className="size-3.5" aria-hidden />
                  </a>
                </div>
              </div>
            ) : (
              <div className="pointer-events-none absolute inset-x-3 bottom-3 z-10 rounded-xl border border-white/8 bg-[#05080c]/82 px-3 py-2 text-center text-[10px] text-white/45 backdrop-blur-sm sm:left-auto sm:right-4 sm:w-auto">
                Tap any circle to see who it is.
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2 border-t border-white/7 bg-[#05080b] px-4 py-3 text-[10px] text-white/42">
            <span><i className="mr-1.5 inline-block size-2 rounded-full bg-[#66dfff]" />mutual</span>
            <span><i className="mr-1.5 inline-block size-2 rounded-full bg-[#f0c56e]" />bridge</span>
            <span><i className="mr-1.5 inline-block size-2 rounded-full bg-[#ca91ff]" />destination</span>
            <span><i className="mr-1.5 inline-block size-2 rounded-full bg-[#8293a2]" />follower / peer</span>
          </div>
        </>
      )}

      <div className="border-t border-white/8 bg-[#05080b] px-4 py-3 text-[10px] leading-5 text-white/30">
        {graph?.note ?? "Explore mode uses the same real Bluesky graph data as the guided views."}
      </div>
    </div>
  );
}
