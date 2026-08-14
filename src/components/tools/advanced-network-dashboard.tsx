"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRight, BarChart3, GitBranch, Loader2, Radar, Sparkles, Target, UsersRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { RequiredBlueskyConnection, useAdvancedBlueskyOAuth } from "@/components/tools/advanced-network-oauth";
import {
  ADVANCED_NETWORK_CATEGORIES,
  DEFAULT_DEEP_TARGETS,
  MAX_EXPLICIT_TARGETS,
  type AdvancedTargetMode,
  type ReconResponse,
} from "@/lib/advanced-network";

const modeCopy: Record<AdvancedTargetMode, { label: string; description: string }> = {
  profiles: { label: "Specific profiles", description: "Aim at up to 10 named Bluesky accounts." },
  categories: { label: "Categories", description: "Let the engine discover influential accounts in selected areas." },
  hybrid: { label: "Hybrid", description: "Use named anchors plus category discovery around them." },
  suggested: { label: "Suggested direction", description: "Let your existing graph reveal the cheapest high-value direction." },
};

function compact(value: number) {
  return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

function NetworkPreview({ actor, recon }: { actor: string; recon: ReconResponse | null }) {
  const targets = (recon?.targets ?? []).slice(0, 6);
  const ys = [55, 115, 175, 235, 295, 355];
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/20 p-3">
      <svg viewBox="0 0 900 410" className="h-auto w-full" role="img" aria-label="Advanced network path preview">
        <defs><linearGradient id="edge" x1="0" x2="1"><stop offset="0" stopColor="#16c8ff" stopOpacity=".7"/><stop offset="1" stopColor="#f0001c" stopOpacity=".55"/></linearGradient></defs>
        <line x1="155" y1="205" x2="430" y2="205" stroke="url(#edge)" strokeWidth="2" />
        {targets.map((target, index) => <line key={target.did} x1="470" y1="205" x2="720" y2={ys[index]} stroke="url(#edge)" strokeWidth="1.5" strokeOpacity=".65" />)}
        <circle cx="120" cy="205" r="54" fill="#07151c" stroke="#16c8ff" strokeWidth="2"/><text x="120" y="199" fill="white" textAnchor="middle" fontSize="18" fontWeight="700">YOU</text><text x="120" y="222" fill="#8ce8ff" textAnchor="middle" fontSize="11">@{actor.slice(0, 18)}</text>
        <circle cx="450" cy="205" r="42" fill="#171015" stroke="#e6bd73" strokeWidth="2"/><text x="450" y="201" fill="white" textAnchor="middle" fontSize="14" fontWeight="700">WAVE</text><text x="450" y="219" fill="#e6bd73" textAnchor="middle" fontSize="11">bridges + besties</text>
        {targets.length ? targets.map((target, index) => <g key={target.did}><circle cx="760" cy={ys[index]} r="35" fill="#190b0e" stroke={target.disposition === "deep-analysis" ? "#ff5364" : "#666"} strokeWidth="1.5"/><text x="760" y={ys[index]-2} fill="white" textAnchor="middle" fontSize="10" fontWeight="700">@{target.handle.slice(0, 12)}</text><text x="760" y={ys[index]+14} fill="#aaa" textAnchor="middle" fontSize="9">score {target.priorityScore}</text></g>) : <g><circle cx="760" cy="205" r="44" fill="#111" stroke="#555"/><text x="760" y="201" fill="#ddd" textAnchor="middle" fontSize="12">TARGET</text><text x="760" y="218" fill="#777" textAnchor="middle" fontSize="10">first run</text></g>}
      </svg>
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

  const targets = useMemo(() => Array.from(new Set(targetText.split(/[\n,]+/).map((item) => item.trim()).filter(Boolean))).slice(0, MAX_EXPLICIT_TARGETS), [targetText]);
  const connected = oauth.phase === "connected" && Boolean(oauth.did);
  const storageKey = oauth.did ? `rukh:advanced-network:draft:${oauth.did}` : "";

  useEffect(() => {
    if (!storageKey) return;
    try {
      const saved = JSON.parse(window.localStorage.getItem(storageKey) ?? "null") as { mode?: AdvancedTargetMode; targetText?: string; categories?: string[] } | null;
      if (saved?.mode) setMode(saved.mode);
      if (typeof saved?.targetText === "string") setTargetText(saved.targetText);
      if (Array.isArray(saved?.categories)) setCategories(saved.categories);
    } catch { /* ignore malformed draft */ }
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
        body: JSON.stringify({ actor: oauth.did, targets, categories, deepTargetLimit: DEFAULT_DEEP_TARGETS }),
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
            {[{ icon: Target, label: "Named targets", value: String(targets.length), note: `up to ${MAX_EXPLICIT_TARGETS}` }, { icon: GitBranch, label: "Deep targets/run", value: String(DEFAULT_DEEP_TARGETS), note: "cost-aware selection" }, { icon: UsersRound, label: "Follow-back tracking", value: "Ready", note: "persistent schema next" }, { icon: BarChart3, label: "Historical comparison", value: "Ready", note: "snapshots + deltas" }].map((metric) => <Card key={metric.label} className="p-5"><metric.icon className="size-5 text-[#8ce8ff]" aria-hidden/><p className="mt-4 text-xs uppercase tracking-[0.12em] text-white/38">{metric.label}</p><p className="mt-1 text-2xl font-semibold text-white">{metric.value}</p><p className="mt-1 text-xs text-white/35">{metric.note}</p></Card>)}
          </div>

          <Card className="p-5 sm:p-7">
            <div className="flex items-start gap-3"><Radar className="mt-1 size-5 text-[#e6bd73]" aria-hidden/><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#e6bd73]">Target configuration</p><h2 className="mt-2 text-2xl font-semibold text-white">Tell the engine where you want to move.</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-white/52">Named accounts are anchor nodes. Categories let the engine discover its own influential endpoints. A full run can defer expensive targets when another path is likely to make them cheaper later.</p></div></div>
            <div className="mt-6 grid gap-3 md:grid-cols-4">{(Object.keys(modeCopy) as AdvancedTargetMode[]).map((key) => <button key={key} type="button" onClick={() => setMode(key)} className={`rounded-xl border p-4 text-left transition ${mode === key ? "border-[#16c8ff]/50 bg-[#16c8ff]/9" : "border-white/10 bg-white/[0.02] hover:border-white/20"}`}><span className="block text-sm font-semibold text-white">{modeCopy[key].label}</span><span className="mt-2 block text-xs leading-5 text-white/40">{modeCopy[key].description}</span></button>)}</div>

            {mode !== "categories" && mode !== "suggested" ? <div className="mt-6"><label className="text-sm font-medium text-white/72">Profile targets <span className="text-white/35">({targets.length}/{MAX_EXPLICIT_TARGETS})</span></label><textarea value={targetText} onChange={(e) => setTargetText(e.target.value)} rows={5} placeholder={"markhamillofficial.bsky.social\nexample.bsky.social\nhttps://bsky.app/profile/another.example"} className="mt-2 w-full resize-y rounded-xl border border-white/12 bg-black/20 px-4 py-3 font-mono text-sm text-white outline-none focus:border-[#16c8ff]/55 focus:ring-4 focus:ring-[#16c8ff]/10"/><p className="mt-2 text-xs text-white/36">One handle or profile URL per line. Cheap reconnaissance validates all of them before the expensive graph expansion begins.</p></div> : null}

            {mode !== "profiles" ? <div className="mt-6"><p className="text-sm font-medium text-white/72">Category directions</p><div className="mt-3 flex flex-wrap gap-2">{ADVANCED_NETWORK_CATEGORIES.map((category) => { const selected = categories.includes(category.id); return <button key={category.id} type="button" onClick={() => setCategories((current) => selected ? current.filter((item) => item !== category.id) : [...current, category.id].slice(0, 8))} className={`rounded-full border px-3 py-2 text-xs transition ${selected ? "border-[#16c8ff]/45 bg-[#16c8ff]/10 text-[#b9f1ff]" : "border-white/10 bg-white/[0.02] text-white/48 hover:text-white"}`}>{category.label}</button>; })}</div></div> : null}

            {mode === "suggested" ? <div className="mt-6 rounded-xl border border-[#e6bd73]/18 bg-[#e6bd73]/[0.045] p-4 text-sm leading-6 text-white/54"><Sparkles className="mb-2 size-4 text-[#e6bd73]" aria-hidden/>The deep worker will compare reachable clusters and recommend 3–5 directions using warm bridges, expected path compression, category fit, and estimated crawl cost.</div> : null}

            <div className="mt-6 flex flex-wrap items-center gap-3"><Button variant="glass" onClick={() => void runRecon()} disabled={working || ((mode === "profiles" || mode === "hybrid") && targets.length === 0)}>{working ? <Loader2 className="size-4 animate-spin" aria-hidden/> : <Radar className="size-4" aria-hidden/>}{working ? "Running reconnaissance…" : "Run cheap reconnaissance"}</Button><span className="text-xs text-white/34">This is the inexpensive target-validation pass, not the full recursive graph run.</span></div>
            {error ? <p role="alert" className="mt-3 text-sm text-[#ffb4b8]">{error}</p> : null}
          </Card>

          {recon ? <Card className="p-5 sm:p-7"><div className="flex items-center justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8ce8ff]">Reconnaissance result</p><h2 className="mt-2 text-2xl font-semibold text-white">{recon.targets.filter((target) => target.disposition === "deep-analysis").length} selected for deep analysis</h2></div><p className="text-sm text-white/42">{recon.deferredCount} deferred</p></div><div className="mt-6 grid gap-3 lg:grid-cols-2">{recon.targets.map((target) => <div key={target.did} className="rounded-xl border border-white/10 bg-white/[0.02] p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-semibold text-white">{target.displayName || `@${target.handle}`}</p><p className="mt-1 text-xs text-white/40">@{target.handle}</p></div><span className={`rounded-full border px-2.5 py-1 text-[11px] ${target.disposition === "deep-analysis" ? "border-emerald-300/20 bg-emerald-300/8 text-emerald-100" : "border-white/10 text-white/42"}`}>{target.disposition === "deep-analysis" ? "Deep run" : "Deferred"}</span></div><div className="mt-4 grid grid-cols-3 gap-2 text-xs"><span><b className="block text-white">{compact(target.followersCount)}</b><span className="text-white/35">followers</span></span><span><b className="block text-white">{target.priorityScore}</b><span className="text-white/35">priority</span></span><span><b className="block capitalize text-white">{target.estimatedCost}</b><span className="text-white/35">cost</span></span></div>{target.relationship.mutual ? <p className="mt-3 text-xs text-emerald-200/80">Already a mutual relationship — extremely warm starting point.</p> : null}</div>)}</div></Card> : null}

          <Card className="p-5 sm:p-7"><div className="flex items-center gap-3"><GitBranch className="size-5 text-[#ff7e8a]" aria-hidden/><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#ff8994]">Network map</p><h2 className="mt-1 text-xl font-semibold text-white">Before → bridges → target clusters</h2></div></div><div className="mt-5"><NetworkPreview actor={oauth.profile?.handle ?? oauth.did ?? "account"} recon={recon}/></div><p className="mt-3 text-xs leading-5 text-white/35">The persistent version stores snapshots so this map can animate path compression, new mutual edges, and progress between runs.</p></Card>

          <Card className="p-5 sm:p-7"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#e6bd73]">Recursive engine</p><div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{["1. Large-account wave #1", "2. Shortest mutual paths + bridges", "3. Bridge besties + endpoint besties", "4. Besties-of-besties + follower bridges", "5. Follow / follow-back outcome scoring", "6. Fresh large-account wave #2, then repeat"].map((step) => <div key={step} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 text-sm text-white/58"><span>{step}</span><ArrowRight className="size-4 text-white/22" aria-hidden/></div>)}</div></Card>
        </>
      )}
    </div>
  );
}
