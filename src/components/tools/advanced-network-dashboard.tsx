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
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  RequiredBlueskyConnection,
  useAdvancedBlueskyOAuth,
} from "@/components/tools/advanced-network-oauth";
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

const mutualNodes = [
  { x: 72, y: 158 },
  { x: 118, y: 96 },
  { x: 198, y: 82 },
  { x: 255, y: 132 },
  { x: 65, y: 280 },
  { x: 92, y: 374 },
  { x: 176, y: 414 },
  { x: 258, y: 374 },
  { x: 276, y: 265 },
];

const bridgeNodes = [
  { x: 380, y: 112 },
  { x: 456, y: 84 },
  { x: 535, y: 118 },
  { x: 570, y: 210 },
  { x: 552, y: 342 },
  { x: 472, y: 408 },
  { x: 390, y: 365 },
  { x: 354, y: 238 },
];

const placeholderTargetNodes = [
  { x: 710, y: 112 },
  { x: 790, y: 82 },
  { x: 874, y: 126 },
  { x: 916, y: 220 },
  { x: 902, y: 336 },
  { x: 820, y: 410 },
  { x: 728, y: 372 },
  { x: 684, y: 254 },
];

function MiniNode({
  x,
  y,
  stroke,
  fill,
  active = false,
}: {
  x: number;
  y: number;
  stroke: string;
  fill: string;
  active?: boolean;
}) {
  return (
    <g>
      {active ? <circle cx={x} cy={y} r="17" fill={stroke} opacity="0.08" /> : null}
      <circle cx={x} cy={y} r="10" fill={fill} stroke={stroke} strokeWidth="1.4" />
      <circle cx={x} cy={y - 2.5} r="2.6" fill={stroke} opacity="0.9" />
      <path
        d={`M ${x - 4.8} ${y + 4.2} Q ${x} ${y + 0.5} ${x + 4.8} ${y + 4.2}`}
        fill="none"
        stroke={stroke}
        strokeWidth="1.4"
        strokeLinecap="round"
        opacity="0.9"
      />
    </g>
  );
}

function NetworkPreview({ actor, recon }: { actor: string; recon: ReconResponse | null }) {
  const targets = (recon?.targets ?? []).slice(0, 6);
  const activeTargets = targets.filter((target) => target.disposition === "deep-analysis");
  const targetCount = activeTargets.length || targets.length;
  const targetPositions = [
    { x: 728, y: 134 },
    { x: 824, y: 92 },
    { x: 902, y: 170 },
    { x: 900, y: 320 },
    { x: 820, y: 398 },
    { x: 720, y: 354 },
  ];

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#05070a] shadow-[inset_0_1px_0_rgba(255,255,255,0.035),0_24px_80px_rgba(0,0,0,0.28)]">
      <div className="flex flex-col gap-3 border-b border-white/8 bg-white/[0.018] px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="flex flex-wrap items-center gap-2 text-[11px] font-medium uppercase tracking-[0.13em] text-white/38">
          <span className="rounded-full border border-[#16c8ff]/20 bg-[#16c8ff]/[0.06] px-2.5 py-1 text-[#91eaff]">
            Current network
          </span>
          <span>→</span>
          <span className="rounded-full border border-[#e6bd73]/20 bg-[#e6bd73]/[0.06] px-2.5 py-1 text-[#f3d28d]">
            Bridge layer
          </span>
          <span>→</span>
          <span className="rounded-full border border-[#aa63ff]/20 bg-[#aa63ff]/[0.06] px-2.5 py-1 text-[#d9b6ff]">
            Target cluster
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs text-white/35">
          <span className="size-1.5 rounded-full bg-emerald-300 shadow-[0_0_12px_rgba(110,231,183,0.85)]" />
          {targets.length ? `${targetCount} target${targetCount === 1 ? "" : "s"} mapped` : "Waiting for first reconnaissance"}
        </div>
      </div>

      <svg
        viewBox="0 0 980 500"
        className="block h-auto w-full"
        role="img"
        aria-label="Advanced network map showing current mutuals, bridge and bestie layer, and target cluster"
      >
        <defs>
          <pattern id="network-grid" width="42" height="42" patternUnits="userSpaceOnUse">
            <path d="M 42 0 L 0 0 0 42" fill="none" stroke="#ffffff" strokeOpacity="0.025" strokeWidth="1" />
          </pattern>
          <radialGradient id="blue-cluster" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#16c8ff" stopOpacity="0.16" />
            <stop offset="60%" stopColor="#16c8ff" stopOpacity="0.04" />
            <stop offset="100%" stopColor="#16c8ff" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="gold-cluster" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#e6bd73" stopOpacity="0.15" />
            <stop offset="60%" stopColor="#e6bd73" stopOpacity="0.035" />
            <stop offset="100%" stopColor="#e6bd73" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="purple-cluster" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#a95cff" stopOpacity="0.17" />
            <stop offset="60%" stopColor="#a95cff" stopOpacity="0.04" />
            <stop offset="100%" stopColor="#a95cff" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="main-flow" x1="0" x2="1">
            <stop offset="0%" stopColor="#16c8ff" />
            <stop offset="48%" stopColor="#e6bd73" />
            <stop offset="100%" stopColor="#a95cff" />
          </linearGradient>
          <filter id="blue-glow" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="9" result="blur" />
            <feFlood floodColor="#16c8ff" floodOpacity="0.42" />
            <feComposite in2="blur" operator="in" />
            <feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="gold-glow" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="8" result="blur" />
            <feFlood floodColor="#e6bd73" floodOpacity="0.36" />
            <feComposite in2="blur" operator="in" />
            <feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="purple-glow" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="8" result="blur" />
            <feFlood floodColor="#a95cff" floodOpacity="0.38" />
            <feComposite in2="blur" operator="in" />
            <feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <marker id="flow-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto" markerUnits="strokeWidth">
            <path d="M0,0 L0,6 L6,3 z" fill="#f5dfaa" />
          </marker>
        </defs>

        <rect width="980" height="500" fill="#05070a" />
        <rect width="980" height="500" fill="url(#network-grid)" />
        <ellipse cx="168" cy="256" rx="205" ry="222" fill="url(#blue-cluster)" />
        <ellipse cx="470" cy="250" rx="190" ry="218" fill="url(#gold-cluster)" />
        <ellipse cx="820" cy="250" rx="210" ry="225" fill="url(#purple-cluster)" />

        <text x="52" y="38" fill="#8ce8ff" fontSize="10" fontWeight="700" letterSpacing="2.4">01 · YOUR SOCIAL CORE</text>
        <text x="372" y="38" fill="#e6bd73" fontSize="10" fontWeight="700" letterSpacing="2.4">02 · BRIDGES + BESTIES</text>
        <text x="708" y="38" fill="#caa0ff" fontSize="10" fontWeight="700" letterSpacing="2.4">03 · TARGET NEIGHBORHOOD</text>

        {mutualNodes.map((node, index) => (
          <line key={`mutual-line-${index}`} x1="166" y1="252" x2={node.x} y2={node.y} stroke="#4abfe9" strokeOpacity={index % 3 === 0 ? 0.5 : 0.24} strokeWidth={index % 3 === 0 ? 1.4 : 1} strokeDasharray={index % 3 === 0 ? undefined : "4 5"} />
        ))}
        {mutualNodes.slice(0, 8).map((node, index) => {
          const next = mutualNodes[(index + 1) % mutualNodes.length];
          return <line key={`mutual-ring-${index}`} x1={node.x} y1={node.y} x2={next.x} y2={next.y} stroke="#3fa8d0" strokeOpacity="0.16" strokeWidth="1" />;
        })}

        {bridgeNodes.map((node, index) => (
          <line key={`bridge-line-${index}`} x1="470" y1="250" x2={node.x} y2={node.y} stroke="#e6bd73" strokeOpacity={index % 2 === 0 ? 0.42 : 0.22} strokeWidth={index % 2 === 0 ? 1.35 : 1} strokeDasharray={index % 2 === 0 ? undefined : "3 5"} />
        ))}
        {bridgeNodes.slice(0, 7).map((node, index) => {
          const next = bridgeNodes[(index + 1) % bridgeNodes.length];
          return <line key={`bridge-ring-${index}`} x1={node.x} y1={node.y} x2={next.x} y2={next.y} stroke="#e6bd73" strokeOpacity="0.15" strokeWidth="1" />;
        })}

        <path d="M 216 236 C 315 170, 334 322, 417 262" fill="none" stroke="#16c8ff" strokeOpacity="0.55" strokeWidth="1.8" />
        <path d="M 218 256 C 316 274, 340 204, 417 244" fill="none" stroke="#74dfff" strokeOpacity="0.34" strokeWidth="1.2" />
        <path d="M 220 274 C 310 346, 352 302, 420 270" fill="none" stroke="#e6bd73" strokeOpacity="0.32" strokeWidth="1.2" strokeDasharray="5 6" />

        <path d="M 522 246 C 622 174, 652 326, 753 260" fill="none" stroke="#e6bd73" strokeOpacity="0.46" strokeWidth="1.8" markerEnd="url(#flow-arrow)" />
        <path d="M 520 262 C 620 326, 672 180, 754 242" fill="none" stroke="#b989ff" strokeOpacity="0.34" strokeWidth="1.35" />
        <path d="M 518 278 C 625 358, 678 352, 758 278" fill="none" stroke="#a95cff" strokeOpacity="0.25" strokeWidth="1.1" strokeDasharray="5 6" />

        <path d="M 224 250 C 320 250, 364 250, 414 250 C 555 250, 655 250, 754 250" fill="none" stroke="url(#main-flow)" strokeOpacity="0.78" strokeWidth="2.4" />
        <circle cx="320" cy="250" r="3" fill="#8ce8ff" />
        <circle cx="620" cy="250" r="3" fill="#f0cf8e" />

        {mutualNodes.map((node, index) => (
          <MiniNode key={`mutual-node-${index}`} x={node.x} y={node.y} stroke="#63d8ff" fill="#0b1e29" active={index === 1 || index === 7} />
        ))}
        {bridgeNodes.map((node, index) => (
          <MiniNode key={`bridge-node-${index}`} x={node.x} y={node.y} stroke="#f0c56e" fill="#251b0c" active={index === 0 || index === 3 || index === 6} />
        ))}

        {targets.length
          ? targets.map((target, index) => {
              const pos = targetPositions[index];
              const selected = target.disposition === "deep-analysis";
              return (
                <g key={target.did}>
                  <line x1="812" y1="250" x2={pos.x} y2={pos.y} stroke={selected ? "#b875ff" : "#6f6479"} strokeOpacity={selected ? 0.48 : 0.2} strokeWidth={selected ? 1.4 : 1} strokeDasharray={selected ? undefined : "4 5"} />
                  <circle cx={pos.x} cy={pos.y} r={selected ? 18 : 15} fill={selected ? "#241136" : "#131117"} stroke={selected ? "#b875ff" : "#746b7a"} strokeWidth="1.4" />
                  <text x={pos.x} y={pos.y - 2} fill="white" textAnchor="middle" fontSize="7.5" fontWeight="700">{index + 1}</text>
                  <text x={pos.x} y={pos.y + 30} fill={selected ? "#d7b0ff" : "#847b8b"} textAnchor="middle" fontSize="8.5">@{target.handle.slice(0, 15)}</text>
                </g>
              );
            })
          : placeholderTargetNodes.map((node, index) => (
              <g key={`target-placeholder-${index}`}>
                <line x1="812" y1="250" x2={node.x} y2={node.y} stroke="#a95cff" strokeOpacity="0.15" strokeWidth="1" strokeDasharray="3 6" />
                <MiniNode x={node.x} y={node.y} stroke="#9e70cf" fill="#17101e" active={index === 1 || index === 5} />
              </g>
            ))}

        <g filter="url(#blue-glow)">
          <circle cx="166" cy="252" r="62" fill="#07151d" stroke="#16c8ff" strokeWidth="2.2" />
          <circle cx="166" cy="252" r="50" fill="none" stroke="#16c8ff" strokeOpacity="0.22" />
        </g>
        <circle cx="166" cy="226" r="7" fill="#5fdcff" />
        <path d="M153 244 Q166 232 179 244" fill="none" stroke="#5fdcff" strokeWidth="3" strokeLinecap="round" />
        <text x="166" y="267" fill="white" textAnchor="middle" fontSize="20" fontWeight="800">YOU</text>
        <text x="166" y="286" fill="#8ce8ff" textAnchor="middle" fontSize="10.5">@{actor.slice(0, 24)}</text>
        <rect x="132" y="300" width="68" height="22" rx="11" fill="#16c8ff" fillOpacity="0.08" stroke="#16c8ff" strokeOpacity="0.32" />
        <text x="166" y="315" fill="#9beaff" textAnchor="middle" fontSize="9.5" fontWeight="600">SOCIAL CORE</text>

        <g filter="url(#gold-glow)">
          <circle cx="470" cy="250" r="57" fill="#1a1309" stroke="#e6bd73" strokeWidth="2.1" />
          <circle cx="470" cy="250" r="46" fill="none" stroke="#e6bd73" strokeOpacity="0.18" />
        </g>
        <circle cx="463" cy="225" r="4.5" fill="#f0c56e" />
        <circle cx="477" cy="225" r="4.5" fill="#f0c56e" />
        <path d="M451 239 Q463 228 470 239 Q477 228 489 239" fill="none" stroke="#f0c56e" strokeWidth="2.2" strokeLinecap="round" />
        <text x="470" y="263" fill="white" textAnchor="middle" fontSize="17" fontWeight="800">WAVE</text>
        <text x="470" y="281" fill="#efd18d" textAnchor="middle" fontSize="10">bridges + besties</text>
        <rect x="439" y="294" width="62" height="21" rx="10.5" fill="#e6bd73" fillOpacity="0.08" stroke="#e6bd73" strokeOpacity="0.28" />
        <text x="470" y="308" fill="#f2d99d" textAnchor="middle" fontSize="9" fontWeight="600">PATH ENGINE</text>

        <g filter="url(#purple-glow)">
          <circle cx="812" cy="250" r="59" fill="#160b20" stroke="#a95cff" strokeWidth="2.1" />
          <circle cx="812" cy="250" r="47" fill="none" stroke="#a95cff" strokeOpacity="0.2" />
        </g>
        <circle cx="812" cy="224" r="9" fill="none" stroke="#bd83ff" strokeWidth="2" />
        <circle cx="812" cy="224" r="3" fill="#bd83ff" />
        <path d="M812 211 V216 M812 232 V237 M799 224 H804 M820 224 H825" stroke="#bd83ff" strokeWidth="1.5" strokeLinecap="round" />
        <text x="812" y="265" fill="white" textAnchor="middle" fontSize="18" fontWeight="800">TARGET</text>
        <text x="812" y="283" fill="#d3afff" textAnchor="middle" fontSize="10">{targets.length ? `${targetCount} prioritized` : "next cluster"}</text>
        <rect x="778" y="296" width="68" height="21" rx="10.5" fill="#a95cff" fillOpacity="0.09" stroke="#a95cff" strokeOpacity="0.3" />
        <text x="812" y="310" fill="#d9b9ff" textAnchor="middle" fontSize="9" fontWeight="600">{targets.length ? "ACTIVE MAP" : "AWAITING RUN"}</text>

        <text x="294" y="224" fill="#8ce8ff" fontSize="8.5" fontWeight="600">WARM PATHS</text>
        <text x="612" y="224" fill="#e7c77f" fontSize="8.5" fontWeight="600">RECIPROCAL ROUTES</text>

        <g opacity="0.72">
          <circle cx="42" cy="458" r="3.5" fill="#16c8ff" />
          <text x="53" y="462" fill="#9aa1aa" fontSize="9">mutual</text>
          <circle cx="112" cy="458" r="3.5" fill="#e6bd73" />
          <text x="123" y="462" fill="#9aa1aa" fontSize="9">bridge / bestie</text>
          <circle cx="216" cy="458" r="3.5" fill="#a95cff" />
          <text x="227" y="462" fill="#9aa1aa" fontSize="9">target</text>
          <line x1="302" y1="458" x2="338" y2="458" stroke="#d4d8de" strokeOpacity="0.65" strokeWidth="1.3" />
          <text x="346" y="462" fill="#9aa1aa" fontSize="9">strong</text>
          <line x1="402" y1="458" x2="438" y2="458" stroke="#d4d8de" strokeOpacity="0.5" strokeWidth="1" strokeDasharray="4 4" />
          <text x="446" y="462" fill="#9aa1aa" fontSize="9">weak / potential</text>
        </g>
      </svg>

      <div className="grid gap-px border-t border-white/8 bg-white/8 sm:grid-cols-3">
        <div className="bg-[#07090c] px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-[#8ce8ff]">Your core</p>
          <p className="mt-1 text-xs leading-5 text-white/45">Existing reciprocal relationships and warm follower edges.</p>
        </div>
        <div className="bg-[#07090c] px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-[#e6bd73]">Leverage layer</p>
          <p className="mt-1 text-xs leading-5 text-white/45">Accounts that collapse distance through bridges, besties, and overlap.</p>
        </div>
        <div className="bg-[#07090c] px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-[#c69bff]">Destination</p>
          <p className="mt-1 text-xs leading-5 text-white/45">Specific profiles or influential clusters the engine is moving you toward.</p>
        </div>
      </div>
    </div>
  );
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
      /* ignore malformed draft */
    }
  }, [storageKey]);

  useEffect(() => {
    if (!storageKey) return;
    window.localStorage.setItem(storageKey, JSON.stringify({ mode, targetText, categories }));
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
              { icon: Target, label: "Named targets", value: String(targets.length), note: `up to ${MAX_EXPLICIT_TARGETS}` },
              { icon: GitBranch, label: "Deep targets/run", value: String(DEFAULT_DEEP_TARGETS), note: "cost-aware selection" },
              { icon: UsersRound, label: "Follow-back tracking", value: "Ready", note: "persistent history" },
              { icon: BarChart3, label: "Historical comparison", value: "Ready", note: "snapshots + deltas" },
            ].map((metric) => (
              <Card key={metric.label} className="p-5">
                <metric.icon className="size-5 text-[#8ce8ff]" aria-hidden />
                <p className="mt-4 text-xs uppercase tracking-[0.12em] text-white/38">{metric.label}</p>
                <p className="mt-1 text-2xl font-semibold text-white">{metric.value}</p>
                <p className="mt-1 text-xs text-white/35">{metric.note}</p>
              </Card>
            ))}
          </div>

          <Card className="p-5 sm:p-7">
            <div className="flex items-start gap-3">
              <Radar className="mt-1 size-5 text-[#e6bd73]" aria-hidden />
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#e6bd73]">Target configuration</p>
                <h2 className="mt-2 text-2xl font-semibold text-white">Tell the engine where you want to move.</h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-white/52">
                  Named accounts are anchor nodes. Categories let the engine discover its own influential endpoints. A full run can defer expensive targets when another path is likely to make them cheaper later.
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
                      ? "border-[#16c8ff]/50 bg-[#16c8ff]/[0.09]"
                      : "border-white/10 bg-white/[0.02] hover:border-white/20"
                  }`}
                >
                  <span className="block text-sm font-semibold text-white">{modeCopy[key].label}</span>
                  <span className="mt-2 block text-xs leading-5 text-white/40">{modeCopy[key].description}</span>
                </button>
              ))}
            </div>

            {mode !== "categories" && mode !== "suggested" ? (
              <div className="mt-6">
                <label className="text-sm font-medium text-white/72">
                  Profile targets <span className="text-white/35">({targets.length}/{MAX_EXPLICIT_TARGETS})</span>
                </label>
                <textarea
                  value={targetText}
                  onChange={(event) => setTargetText(event.target.value)}
                  rows={5}
                  placeholder={"markhamillofficial.bsky.social\nexample.bsky.social\nhttps://bsky.app/profile/another.example"}
                  className="mt-2 w-full resize-y rounded-xl border border-white/12 bg-black/20 px-4 py-3 font-mono text-sm text-white outline-none focus:border-[#16c8ff]/55 focus:ring-4 focus:ring-[#16c8ff]/10"
                />
                <p className="mt-2 text-xs text-white/36">
                  One handle or profile URL per line. Cheap reconnaissance validates all of them before the expensive graph expansion begins.
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
                The deep worker will compare reachable clusters and recommend 3–5 directions using warm bridges, expected path compression, category fit, and estimated crawl cost.
              </div>
            ) : null}

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Button
                variant="glass"
                onClick={() => void runRecon()}
                disabled={working || ((mode === "profiles" || mode === "hybrid") && targets.length === 0)}
              >
                {working ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Radar className="size-4" aria-hidden />}
                {working ? "Running reconnaissance…" : "Run cheap reconnaissance"}
              </Button>
              <span className="text-xs text-white/34">This is the inexpensive target-validation pass, not the full recursive graph run.</span>
            </div>
            {error ? <p role="alert" className="mt-3 text-sm text-[#ffb4b8]">{error}</p> : null}
          </Card>

          {recon ? (
            <Card className="p-5 sm:p-7">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8ce8ff]">Reconnaissance result</p>
                  <h2 className="mt-2 text-2xl font-semibold text-white">
                    {recon.targets.filter((target) => target.disposition === "deep-analysis").length} selected for deep analysis
                  </h2>
                </div>
                <p className="text-sm text-white/42">{recon.deferredCount} deferred</p>
              </div>
              <div className="mt-6 grid gap-3 lg:grid-cols-2">
                {recon.targets.map((target) => (
                  <div key={target.did} className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-white">{target.displayName || `@${target.handle}`}</p>
                        <p className="mt-1 text-xs text-white/40">@{target.handle}</p>
                      </div>
                      <span className={`rounded-full border px-2.5 py-1 text-[11px] ${target.disposition === "deep-analysis" ? "border-emerald-300/20 bg-emerald-300/8 text-emerald-100" : "border-white/10 text-white/42"}`}>
                        {target.disposition === "deep-analysis" ? "Deep run" : "Deferred"}
                      </span>
                    </div>
                    <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
                      <span><b className="block text-white">{compact(target.followersCount)}</b><span className="text-white/35">followers</span></span>
                      <span><b className="block text-white">{target.priorityScore}</b><span className="text-white/35">priority</span></span>
                      <span><b className="block capitalize text-white">{target.estimatedCost}</b><span className="text-white/35">cost</span></span>
                    </div>
                    {target.relationship.mutual ? <p className="mt-3 text-xs text-emerald-200/80">Already a mutual relationship — extremely warm starting point.</p> : null}
                  </div>
                ))}
              </div>
            </Card>
          ) : null}

          <Card className="overflow-hidden border-white/10 bg-[linear-gradient(180deg,rgba(14,12,14,0.86),rgba(8,9,12,0.9))] p-0">
            <div className="flex flex-col gap-4 border-b border-white/8 px-5 py-5 sm:flex-row sm:items-end sm:justify-between sm:px-7">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 grid size-9 place-items-center rounded-xl border border-[#ff7e8a]/20 bg-[#ff7e8a]/[0.07]">
                  <GitBranch className="size-4 text-[#ff8994]" aria-hidden />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#ff8994]">Network map</p>
                  <h2 className="mt-1 text-xl font-semibold text-white sm:text-2xl">Your shortest routes into influential neighborhoods</h2>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-white/42">
                    Reciprocal relationships stay visible as the backbone. Warm followers can seed discovery, while bridge and bestie layers show where a new mutual would collapse the most distance.
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-xs text-white/42">
                  {recon ? "Recon mapped" : "Pre-run topology"}
                </span>
              </div>
            </div>
            <div className="p-3 sm:p-5">
              <NetworkPreview actor={oauth.profile?.handle ?? oauth.did ?? "account"} recon={recon} />
            </div>
          </Card>

          <Card className="p-5 sm:p-7">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#e6bd73]">Recursive engine</p>
            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {[
                "1. Large-account wave #1",
                "2. Shortest mutual paths + bridges",
                "3. Bridge besties + endpoint besties",
                "4. Besties-of-besties + follower bridges",
                "5. Follow / follow-back outcome scoring",
                "6. Fresh large-account wave #2, then repeat",
              ].map((step) => (
                <div key={step} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 text-sm text-white/58">
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
