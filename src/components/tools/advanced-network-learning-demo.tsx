"use client";

import { useMemo } from "react";
import {
  EDGES,
  NODES,
  STEPS,
  TONE_STYLES,
  type DemoNodeId,
} from "@/components/tools/advanced-network-learning-data";

function nodeRadius(id: DemoNodeId) {
  if (id === "destination") return 39;
  if (id === "new-branch") return 35;
  if (id === "connector-one" || id === "connector-two") return 34;
  if (id === "you") return 33;
  return 31;
}

function nodeFontSize(label: string) {
  if (label.length >= 11) return 8.2;
  if (label.length >= 10) return 8.6;
  if (label.length >= 9) return 9;
  return 10;
}

export function DemoNetwork({
  step,
  selected,
  onSelect,
}: {
  step: number;
  selected: DemoNodeId;
  onSelect: (id: DemoNodeId) => void;
}) {
  const byId = useMemo(
    () => new Map(NODES.map((node) => [node.id, node])),
    [],
  );
  const focus = new Set(STEPS[step].focus);

  return (
    <div className="relative overflow-hidden rounded-[22px] border border-white/10 bg-[radial-gradient(circle_at_48%_42%,rgba(22,200,255,0.10),transparent_38%),radial-gradient(circle_at_86%_28%,rgba(255,102,154,0.07),transparent_30%),linear-gradient(145deg,rgba(10,15,20,0.98),rgba(12,9,14,0.98))] p-2 shadow-[0_24px_80px_rgba(0,0,0,0.32),inset_0_1px_0_rgba(255,255,255,0.035)] sm:p-4">
      <div
        className="absolute inset-0 opacity-[0.18] [background-image:linear-gradient(rgba(255,255,255,0.07)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.07)_1px,transparent_1px)] [background-size:28px_28px]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-x-[12%] top-[15%] h-24 rounded-full bg-[#16c8ff]/[0.055] blur-3xl"
        aria-hidden
      />
      <svg
        viewBox="0 0 610 315"
        role="img"
        aria-label="Interactive example showing how existing connections can lead through separate routes to a larger account and create a new network branch"
        className="relative min-h-[260px] w-full sm:min-h-[330px]"
      >
        <defs>
          <filter id="iazma-demo-glow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="5.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="iazma-demo-soft-glow" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="2.2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <radialGradient id="iazma-you-fill" cx="34%" cy="24%" r="88%">
            <stop offset="0%" stopColor="#153745" />
            <stop offset="58%" stopColor="#0b1e28" />
            <stop offset="100%" stopColor="#07131a" />
          </radialGradient>
          <radialGradient id="iazma-warm-fill" cx="34%" cy="24%" r="88%">
            <stop offset="0%" stopColor="#163a2d" />
            <stop offset="58%" stopColor="#0d241b" />
            <stop offset="100%" stopColor="#081811" />
          </radialGradient>
          <radialGradient id="iazma-connector-fill" cx="34%" cy="24%" r="88%">
            <stop offset="0%" stopColor="#302044" />
            <stop offset="58%" stopColor="#1a1427" />
            <stop offset="100%" stopColor="#100c18" />
          </radialGradient>
          <radialGradient id="iazma-destination-fill" cx="34%" cy="24%" r="88%">
            <stop offset="0%" stopColor="#43341e" />
            <stop offset="58%" stopColor="#271e12" />
            <stop offset="100%" stopColor="#171108" />
          </radialGradient>
          <radialGradient id="iazma-branch-fill" cx="34%" cy="24%" r="88%">
            <stop offset="0%" stopColor="#3d2137" />
            <stop offset="58%" stopColor="#231425" />
            <stop offset="100%" stopColor="#160b17" />
          </radialGradient>
          <marker
            id="iazma-demo-arrow"
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="5"
            markerHeight="5"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#8ce8ff" opacity="0.88" />
          </marker>
        </defs>

        {EDGES.map((edge) => {
          const from = byId.get(edge.from);
          const to = byId.get(edge.to);
          if (!from || !to || step < edge.minStep) return null;
          const active = edge.activeAt === step;
          return (
            <g key={`${edge.from}-${edge.to}`}>
              {active ? (
                <line
                  x1={from.x}
                  y1={from.y}
                  x2={to.x}
                  y2={to.y}
                  stroke="#16c8ff"
                  strokeOpacity="0.15"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={edge.dashed ? "8 7" : undefined}
                  pointerEvents="none"
                />
              ) : null}
              <line
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                stroke={active ? "#8ce8ff" : "rgba(222,236,242,0.24)"}
                strokeWidth={active ? 3 : 1.6}
                strokeLinecap="round"
                strokeDasharray={edge.dashed ? "8 7" : undefined}
                markerEnd={edge.dashed ? "url(#iazma-demo-arrow)" : undefined}
                filter={active ? "url(#iazma-demo-soft-glow)" : undefined}
                className="transition-all duration-500"
              />
            </g>
          );
        })}

        {NODES.map((node) => {
          if (step < node.minStep) return null;
          const tone = TONE_STYLES[node.tone];
          const active = focus.has(node.id);
          const isSelected = selected === node.id;
          const radius = nodeRadius(node.id);
          const fontSize = nodeFontSize(node.shortLabel);

          return (
            <g
              key={node.id}
              role="button"
              tabIndex={0}
              aria-label={`${node.label}. Select to read why it appears in the diagram.`}
              onClick={() => onSelect(node.id)}
              onKeyDown={(event: { key: string; preventDefault: () => void }) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onSelect(node.id);
                }
              }}
              className="cursor-pointer outline-none"
            >
              <circle
                cx={node.x}
                cy={node.y}
                r={radius + (active ? 10 : 7)}
                fill={tone.stroke}
                fillOpacity={active ? 0.075 : 0.035}
                stroke={tone.stroke}
                strokeWidth="1"
                strokeOpacity={active ? 0.42 : 0.14}
                className={active ? "animate-pulse" : undefined}
              />
              {isSelected ? (
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={radius + 5}
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth="1.25"
                  strokeOpacity="0.5"
                />
              ) : null}
              <circle
                cx={node.x}
                cy={node.y}
                r={radius}
                fill={`url(#iazma-${node.tone}-fill)`}
                stroke={isSelected ? "#ffffff" : tone.stroke}
                strokeWidth={isSelected ? 3.2 : active ? 2.5 : 1.7}
                filter={active || isSelected ? "url(#iazma-demo-glow)" : undefined}
                className="transition-all duration-300"
              />
              <circle
                cx={node.x}
                cy={node.y}
                r={radius - 4.5}
                fill="none"
                stroke="#ffffff"
                strokeWidth="0.65"
                strokeOpacity="0.07"
                pointerEvents="none"
              />
              <path
                d={`M ${node.x - radius * 0.42} ${node.y - radius * 0.54} Q ${node.x} ${node.y - radius * 0.78} ${node.x + radius * 0.42} ${node.y - radius * 0.54}`}
                fill="none"
                stroke="#ffffff"
                strokeWidth="1.2"
                strokeLinecap="round"
                strokeOpacity="0.12"
                pointerEvents="none"
              />
              <text
                x={node.x}
                y={node.y + 3}
                textAnchor="middle"
                fill={tone.text}
                fontSize={fontSize}
                fontWeight="750"
                letterSpacing="0.02em"
                paintOrder="stroke"
                stroke="rgba(0,0,0,0.52)"
                strokeWidth="1.6"
                strokeLinejoin="round"
                pointerEvents="none"
              >
                {node.shortLabel}
              </text>
            </g>
          );
        })}
      </svg>

      <div className="relative -mt-1 flex flex-wrap items-center justify-between gap-2 border-t border-white/8 px-2 pb-1 pt-3 text-[10px] text-white/38">
        <span className="inline-flex items-center gap-2">
          <i className="grid size-4 place-items-center rounded-full border border-[#16c8ff]/30 bg-[#16c8ff]/[0.06] not-italic text-[9px] font-semibold text-[#8ce8ff]">i</i>
          Tap any node to see why it exists.
        </span>
        <span className="inline-flex items-center gap-2">
          <i className="size-1.5 rounded-full bg-[#aa63ff]/70" />
          Example only · your real map uses your live Bluesky graph
        </span>
      </div>
    </div>
  );
}