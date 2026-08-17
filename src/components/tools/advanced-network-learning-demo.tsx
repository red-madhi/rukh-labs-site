"use client";

import { useMemo } from "react";
import {
  EDGES,
  NODES,
  STEPS,
  TONE_STYLES,
  type DemoNodeId,
} from "@/components/tools/advanced-network-learning-data";

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
    <div className="relative overflow-hidden rounded-2xl border border-white/9 bg-[radial-gradient(circle_at_50%_45%,rgba(22,200,255,0.08),transparent_46%),linear-gradient(180deg,rgba(255,255,255,0.025),rgba(0,0,0,0.15))] p-2 sm:p-4">
      <div className="absolute inset-0 opacity-[0.16] [background-image:linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:28px_28px]" aria-hidden />
      <svg
        viewBox="0 0 610 315"
        role="img"
        aria-label="Interactive example showing how existing connections can lead through separate routes to a larger account and create a new network branch"
        className="relative min-h-[260px] w-full sm:min-h-[330px]"
      >
        <defs>
          <filter id="iazma-demo-glow" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <marker
            id="iazma-demo-arrow"
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="5"
            markerHeight="5"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#8ce8ff" opacity="0.8" />
          </marker>
        </defs>

        {EDGES.map((edge) => {
          const from = byId.get(edge.from);
          const to = byId.get(edge.to);
          if (!from || !to || step < edge.minStep) return null;
          const active = edge.activeAt === step;
          return (
            <line
              key={`${edge.from}-${edge.to}`}
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              stroke={active ? "#8ce8ff" : "rgba(255,255,255,0.22)"}
              strokeWidth={active ? 3.2 : 1.7}
              strokeDasharray={edge.dashed ? "8 7" : undefined}
              markerEnd={edge.dashed ? "url(#iazma-demo-arrow)" : undefined}
              className="transition-all duration-500"
            />
          );
        })}

        {NODES.map((node) => {
          if (step < node.minStep) return null;
          const tone = TONE_STYLES[node.tone];
          const active = focus.has(node.id);
          const isSelected = selected === node.id;
          const radius = node.tone === "destination" ? 33 : node.tone === "you" ? 31 : 27;

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
              {active ? (
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={radius + 11}
                  fill="none"
                  stroke={tone.stroke}
                  strokeWidth="1.5"
                  opacity="0.28"
                  className="animate-pulse"
                />
              ) : null}
              <circle
                cx={node.x}
                cy={node.y}
                r={radius}
                fill={tone.fill}
                stroke={isSelected ? "#ffffff" : tone.stroke}
                strokeWidth={isSelected ? 3.5 : active ? 2.8 : 1.7}
                filter={active ? "url(#iazma-demo-glow)" : undefined}
                className="transition-all duration-300"
              />
              <text
                x={node.x}
                y={node.y + 3}
                textAnchor="middle"
                fill={tone.text}
                fontSize={node.shortLabel.length > 9 ? 9 : 10}
                fontWeight="700"
                letterSpacing="0.04em"
              >
                {node.shortLabel}
              </text>
            </g>
          );
        })}
      </svg>

      <div className="relative -mt-1 flex flex-wrap items-center justify-between gap-2 border-t border-white/7 px-2 pb-1 pt-3 text-[10px] text-white/34">
        <span>Tap any node to see why it exists.</span>
        <span>Example only · your real map uses your live Bluesky graph</span>
      </div>
    </div>
  );
}
