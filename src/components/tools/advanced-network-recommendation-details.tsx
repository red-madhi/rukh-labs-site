"use client";

import { ChevronDown, Route, Sparkles } from "lucide-react";

type AnalysisPath = {
  kind: string;
  targetHandle: string;
  viaHandles: string[];
  distanceAfterReciprocity: number;
  interactionStrength: number;
};

type RecommendationDetails = {
  importanceScore: number;
  reciprocityPotential: number;
  independentPaths: number;
  sharedTargetClusters: number;
  recommendationType: string;
  targetHandles: string[];
  reason: string;
  strategy: string;
  paths: AnalysisPath[];
};

const typeLabels: Record<string, string> = {
  "warm-follower-bridge": "Warm follower bridge",
  "target-bestie": "Target bestie",
  "bestie-of-bestie": "Bestie of bestie",
  "bridge-bestie": "Bridge bestie",
  "second-wave-large-target": "Wave 2 large account",
  "second-wave-bestie": "Wave 2 bestie",
};

function Path({ path }: { path: AnalysisPath }) {
  return (
    <div className="mt-2 flex flex-wrap items-center gap-1.5">
      {path.viaHandles.map((handle, index) => (
        <div key={`${handle}-${index}`} className="flex min-w-0 items-center gap-1.5">
          {index > 0 ? <span className="text-[10px] text-[#8ce8ff]/35">↔</span> : null}
          <span className="max-w-full break-all rounded-md border border-[#16c8ff]/14 bg-[#16c8ff]/[0.045] px-2 py-1 font-mono text-[10px] leading-4 text-[#b9f1ff]">
            @{handle}
          </span>
        </div>
      ))}
    </div>
  );
}

export function AdvancedNetworkRecommendationDetails({
  item,
}: {
  item: RecommendationDetails;
}) {
  const strongestPath = item.paths[0];

  return (
    <details className="group mt-4 overflow-hidden rounded-xl border border-white/8 bg-[#05070a]/80 transition open:border-[#16c8ff]/16 open:bg-[#06090d]">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3.5 py-3 text-xs font-medium text-[#b9f1ff] transition hover:bg-white/[0.025]">
        <span className="flex items-center gap-2">
          <span className="grid size-6 place-items-center rounded-md border border-[#16c8ff]/14 bg-[#16c8ff]/[0.045]">
            <Sparkles className="size-3 text-[#8ce8ff]" aria-hidden />
          </span>
          See details
        </span>
        <ChevronDown className="size-3.5 text-white/30 transition-transform duration-200 group-open:rotate-180" aria-hidden />
      </summary>

      <div className="border-t border-white/7 px-3.5 pb-3.5 pt-3">
        <div className="flex flex-wrap gap-2">
          {[
            ["Importance", item.importanceScore, "text-white"],
            ["Reciprocity", item.reciprocityPotential, "text-emerald-200"],
            ["Paths", item.independentPaths, "text-[#d8b5ff]"],
            ["Clusters", item.sharedTargetClusters, "text-[#f1d49a]"],
          ].map(([label, value, tone]) => (
            <div
              key={String(label)}
              className="min-w-[88px] rounded-lg border border-white/7 bg-white/[0.018] px-2.5 py-2"
            >
              <p className={`text-sm font-semibold ${tone}`}>{value}</p>
              <p className="mt-0.5 text-[9px] uppercase tracking-[0.08em] text-white/27">{label}</p>
            </div>
          ))}
        </div>

        <div className="mt-3 grid gap-2.5 xl:grid-cols-2">
          <div className="rounded-lg border border-white/7 bg-white/[0.015] p-3">
            <p className="text-[9px] font-semibold uppercase tracking-[0.11em] text-[#8ce8ff]">
              Why this person
            </p>
            <p className="mt-1.5 text-[11px] leading-5 text-white/48">{item.reason}</p>
          </div>

          <div className="rounded-lg border border-[#e6bd73]/12 bg-[#e6bd73]/[0.025] p-3">
            <p className="text-[9px] font-semibold uppercase tracking-[0.11em] text-[#f1d49a]">
              What to do
            </p>
            <p className="mt-1.5 text-[11px] leading-5 text-white/46">{item.strategy}</p>
          </div>
        </div>

        {strongestPath ? (
          <div className="mt-2.5 rounded-lg border border-white/7 bg-black/20 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.1em] text-white/30">
                <Route className="size-3 text-[#8ce8ff]" aria-hidden />
                Strongest verified path
              </p>
              <span className="text-[9px] text-white/25">
                distance {strongestPath.distanceAfterReciprocity} · strength {strongestPath.interactionStrength}
              </span>
            </div>
            <Path path={strongestPath} />
          </div>
        ) : null}

        <div className="mt-2.5 flex flex-wrap gap-1.5">
          <span className="rounded-full border border-white/8 bg-white/[0.018] px-2 py-1 text-[9px] text-white/38">
            {typeLabels[item.recommendationType] || item.recommendationType}
          </span>
          {item.targetHandles.slice(0, 3).map((handle) => (
            <span
              key={handle}
              className="rounded-full border border-[#aa63ff]/14 bg-[#aa63ff]/[0.025] px-2 py-1 text-[9px] text-[#d8b5ff]/80"
            >
              toward @{handle}
            </span>
          ))}
          {item.targetHandles.length > 3 ? (
            <span className="rounded-full border border-white/8 px-2 py-1 text-[9px] text-white/30">
              +{item.targetHandles.length - 3} more
            </span>
          ) : null}
        </div>
      </div>
    </details>
  );
}
