"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Check,
  ChevronLeft,
  EyeOff,
  Eye,
  ExternalLink,
  Filter,
  RefreshCw,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  UserMinus,
  Users,
} from "lucide-react";
import Link from "next/link";

type Evidence = { category?: string; source?: string; label?: string; excerpt?: string };
type AdvancedMetrics = {
  outgoingInteraction?: number;
  incomingInteraction?: number;
  importanceScore?: number;
  expectedBridgeValue?: number;
  visibilityPotential?: number;
  independentPaths?: number;
  sharedBestieClusters?: number;
  interactionAvailable?: boolean;
  recommendationFound?: boolean;
};
type LibGuardItem = {
  did: string;
  handle?: string;
  display_name?: string;
  avatar?: string;
  description?: string;
  followers_count?: number;
  follows_count?: number;
  is_follower?: boolean;
  is_following?: boolean;
  score?: number;
  recommendation?: "keep" | "mute" | "mute_keep" | "unfollow";
  network_value?: number;
  low_network_value?: number;
  ukraine_saturation?: number;
  lib_media_saturation?: number;
  repost_ratio?: number;
  categories?: string[];
  evidence?: Evidence[];
  metrics?: { advanced?: AdvancedMetrics; network?: Record<string, number> };
  muted_at?: string | null;
  muted_days?: number;
  assessed_at?: string;
};
type LibGuardSettings = {
  min_score: number;
  low_value_weight: number;
  ukraine_weight: number;
  lib_media_weight: number;
  repost_weight: number;
  ukraine_threshold: number;
  lib_media_threshold: number;
  quarantine_days: number;
};
type Scan = {
  id?: string;
  status?: "running" | "paused" | "complete";
  total?: number;
  processed?: number;
  flagged?: number;
  errors?: number;
  remaining?: number;
  started_at?: string;
  completed_at?: string;
  retry_after_at?: string | null;
  retry_after_ms?: number;
};
type Dashboard = {
  settings?: LibGuardSettings;
  queue?: LibGuardItem[];
  scan?: Scan | null;
  counts?: { following?: number; candidates?: number; muted?: number };
};
type BulkResult = {
  requested?: number;
  muted?: string[];
  unmuted?: string[];
  unfollowed?: string[];
  skipped?: string[];
  failed?: Array<{ did: string; error: string }>;
  remaining?: string[];
  rateLimited?: boolean;
  retry_after_ms?: number;
};

type ViewMode = "all" | "unmuted" | "muted" | "unfollow" | "strategic";

const categoryLabels: Record<string, string> = {
  lib_guard_candidate: "Lib Guard candidate",
  low_network_value: "Low network value",
  ukraine_saturation: "Ukraine saturation",
  lib_media_saturation: "Lib TV saturation",
  repost_heavy: "Repost-heavy",
};

function errorFromPayload(payload: unknown, fallback: string) {
  if (typeof payload === "object" && payload !== null && "error" in payload) {
    const value = (payload as Record<string, unknown>).error;
    if (typeof value === "string" && value) return value;
  }
  return fallback;
}

async function api<T = unknown>(method: "GET" | "POST" = "GET", body?: Record<string, unknown>): Promise<T> {
  const response = await fetch("/api/guard/lib", {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  const raw = await response.text();
  let payload: unknown = {};
  if (raw) {
    try {
      payload = JSON.parse(raw);
    } catch {
      throw new Error(`Lib Guard request did not finish normally (${response.status}). Your scan progress is saved.`);
    }
  }
  if (!response.ok) throw new Error(errorFromPayload(payload, `Lib Guard request failed (${response.status}).`));
  return payload as T;
}

function pause(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function fmtDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toLocaleString() : "—";
}

function cooldownLabel(ms?: number) {
  if (!ms || !Number.isFinite(ms)) return "a little while";
  const seconds = Math.max(1, Math.ceil(ms / 1000));
  if (seconds < 60) return `about ${seconds} seconds`;
  const minutes = Math.ceil(seconds / 60);
  return minutes === 1 ? "about a minute" : `about ${minutes} minutes`;
}

function retryLabel(value?: string | null) {
  if (!value) return "later";
  const remaining = new Date(value).getTime() - Date.now();
  if (!Number.isFinite(remaining) || remaining <= 0) return "now";
  return cooldownLabel(remaining);
}

function profileHref(item: Pick<LibGuardItem, "did" | "handle">) {
  return `https://bsky.app/profile/${encodeURIComponent(item.handle || item.did)}`;
}

function scoreClasses(score: number) {
  if (score >= 75) return "border-red-300/30 bg-red-300/10 text-red-100";
  if (score >= 60) return "border-amber-300/30 bg-amber-300/10 text-amber-100";
  return "border-[#8ce8ff]/25 bg-[#16c8ff]/10 text-[#b8f2ff]";
}

function recommendationLabel(value?: LibGuardItem["recommendation"]) {
  if (value === "unfollow") return "Unfollow candidate";
  if (value === "mute_keep") return "Mute / keep edge";
  if (value === "mute") return "Mute first";
  return "Keep";
}

const defaultSettings: LibGuardSettings = {
  min_score: 55,
  low_value_weight: 50,
  ukraine_weight: 25,
  lib_media_weight: 20,
  repost_weight: 5,
  ukraine_threshold: 20,
  lib_media_threshold: 18,
  quarantine_days: 30,
};

export function IazmaLibGuardDashboard() {
  const [data, setData] = useState<Dashboard>({});
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [query, setQuery] = useState("");
  const [view, setView] = useState<ViewMode>("all");
  const [scoreFloor, setScoreFloor] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsDraft, setSettingsDraft] = useState<LibGuardSettings>(defaultSettings);

  const refresh = async () => {
    const dashboard = await api<Dashboard>();
    setData(dashboard);
    if (dashboard.settings) setSettingsDraft(dashboard.settings);
    return dashboard;
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void refresh()
        .catch((issue: unknown) => setError(issue instanceof Error ? issue.message : "Could not load Lib Guard."))
        .finally(() => setLoading(false));
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const queue = data.queue ?? [];
  const displayed = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return queue.filter((item) => {
      if ((item.score ?? 0) < scoreFloor) return false;
      if (needle) {
        const haystack = `${item.handle ?? ""} ${item.display_name ?? ""} ${item.description ?? ""}`.toLowerCase();
        if (!haystack.includes(needle)) return false;
      }
      if (view === "unmuted" && item.muted_at) return false;
      if (view === "muted" && !item.muted_at) return false;
      if (view === "unfollow" && item.recommendation !== "unfollow") return false;
      if (view === "strategic" && item.recommendation !== "mute_keep") return false;
      return true;
    });
  }, [queue, query, scoreFloor, view]);

  const selectedItems = useMemo(() => queue.filter((item) => selected.has(item.did)), [queue, selected]);
  const selectedUnmuted = selectedItems.filter((item) => !item.muted_at);
  const selectedMuted = selectedItems.filter((item) => Boolean(item.muted_at));
  const allDisplayedSelected = displayed.length > 0 && displayed.every((item) => selected.has(item.did));
  const scan = data.scan ?? null;

  const updateSelected = (dids: Iterable<string>, checked: boolean) => {
    setSelected((current) => {
      const next = new Set(current);
      for (const did of dids) checked ? next.add(did) : next.delete(did);
      return next;
    });
  };

  const runScan = async () => {
    setWorking("scan");
    setError("");
    setNotice("");
    try {
      let state = await api<Scan>("POST", { action: "scan_start" });
      setData((current) => ({ ...current, scan: { ...current.scan, ...state } }));
      while (state.status === "running") {
        state = await api<Scan>("POST", { action: "scan_batch", scanId: state.id ?? "", limit: 4 });
        setData((current) => ({ ...current, scan: { ...current.scan, ...state } }));
        if (state.status === "running") await pause(700);
      }
      if (state.status === "paused") {
        setNotice(`Bluesky asked Lib Guard to slow down. Progress is saved; resume ${retryLabel(state.retry_after_at)}.`);
      } else {
        await refresh();
        setSelected(new Set());
        setNotice(`Scan complete. ${state.flagged ?? 0} candidates met your current threshold.`);
      }
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : "Lib Guard scan stopped early. Progress is saved.");
    } finally {
      setWorking("");
    }
  };

  const applyBulkResult = (kind: "mute" | "unmute" | "unfollow", result: BulkResult) => {
    const changed = new Set(kind === "mute" ? result.muted ?? [] : kind === "unmute" ? result.unmuted ?? [] : result.unfollowed ?? []);
    const skipped = new Set(result.skipped ?? []);
    if (kind === "unfollow") {
      const removed = new Set([...changed, ...skipped]);
      setData((current) => ({
        ...current,
        queue: (current.queue ?? []).filter((item) => !removed.has(item.did)),
        counts: {
          ...current.counts,
          following: Math.max(0, (current.counts?.following ?? 0) - changed.size),
          candidates: Math.max(0, (current.counts?.candidates ?? 0) - removed.size),
          muted: Math.max(0, (current.counts?.muted ?? 0) - (current.queue ?? []).filter((item) => removed.has(item.did) && item.muted_at).length),
        },
      }));
      updateSelected(removed, false);
      return;
    }

    const now = new Date().toISOString();
    setData((current) => {
      let mutedDelta = 0;
      const nextQueue = (current.queue ?? []).map((item) => {
        if (!changed.has(item.did)) return item;
        if (kind === "mute") {
          if (!item.muted_at) mutedDelta += 1;
          return { ...item, muted_at: item.muted_at ?? now, muted_days: item.muted_days ?? 0 };
        }
        if (item.muted_at) mutedDelta -= 1;
        return { ...item, muted_at: null, muted_days: 0 };
      });
      return {
        ...current,
        queue: nextQueue,
        counts: { ...current.counts, muted: Math.max(0, (current.counts?.muted ?? 0) + mutedDelta) },
      };
    });
    updateSelected([...changed, ...skipped], false);
  };

  const runBulk = async (kind: "mute" | "unmute" | "unfollow", dids: string[]) => {
    const pending = [...new Set(dids)].filter(Boolean);
    if (!pending.length) return;
    if (kind === "mute" && !window.confirm(`Mute ${pending.length} selected account${pending.length === 1 ? "" : "s"} on Bluesky? You will keep following them.`)) return;
    if (kind === "unmute" && !window.confirm(`Unmute ${pending.length} selected account${pending.length === 1 ? "" : "s"}?`)) return;
    if (kind === "unfollow" && !window.confirm(`Actually UNFOLLOW ${pending.length} selected account${pending.length === 1 ? "" : "s"} on Bluesky? This changes your follow graph immediately.`)) return;

    setWorking(`bulk-${kind}`);
    setError("");
    setNotice("");
    let changedCount = 0;
    let skippedCount = 0;
    let failedCount = 0;
    try {
      for (let offset = 0; offset < pending.length; offset += 40) {
        const batch = pending.slice(offset, offset + 40);
        const result = await api<BulkResult>("POST", { action: `bulk_${kind}`, dids: batch });
        applyBulkResult(kind, result);
        changedCount += kind === "mute" ? (result.muted ?? []).length : kind === "unmute" ? (result.unmuted ?? []).length : (result.unfollowed ?? []).length;
        skippedCount += (result.skipped ?? []).length;
        failedCount += (result.failed ?? []).length;
        if (result.rateLimited) {
          setError(`Bluesky paused the bulk ${kind} run. Remaining selections are still checked. Try again in ${cooldownLabel(result.retry_after_ms)}.`);
          break;
        }
        if (offset + 40 < pending.length) await pause(1_000);
      }
      const verb = kind === "mute" ? "muted" : kind === "unmute" ? "unmuted" : "unfollowed";
      const pieces = [`${changedCount} ${verb}`];
      if (skippedCount) pieces.push(`${skippedCount} already done`);
      if (failedCount) pieces.push(`${failedCount} failed`);
      setNotice(`Bulk action: ${pieces.join(" · ")}.`);
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : `Bulk ${kind} failed.`);
    } finally {
      setWorking("");
    }
  };

  const keep = async (did: string) => {
    setWorking(`keep:${did}`);
    setError("");
    try {
      await api("POST", { action: "dismiss", did });
      setData((current) => ({
        ...current,
        queue: (current.queue ?? []).filter((item) => item.did !== did),
        counts: { ...current.counts, candidates: Math.max(0, (current.counts?.candidates ?? 0) - 1) },
      }));
      updateSelected([did], false);
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : "Could not dismiss candidate.");
    } finally {
      setWorking("");
    }
  };

  const saveSettings = async () => {
    setWorking("settings");
    setError("");
    setNotice("");
    try {
      const result = await api<{ settings?: LibGuardSettings }>("POST", { action: "settings", ...settingsDraft });
      const settings = result.settings ?? settingsDraft;
      setData((current) => ({ ...current, settings }));
      setSettingsDraft(settings);
      setNotice("Lib Guard settings saved. Run a new scan to recalculate scores with the new weights.");
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : "Could not save Lib Guard settings.");
    } finally {
      setWorking("");
    }
  };

  if (loading) {
    return <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-sm text-white/50">Loading Lib Guard…</div>;
  }

  const progress = scan?.total
    ? `${scan.processed ?? 0}/${scan.total} checked · ${scan.flagged ?? 0} candidates${scan.errors ? ` · ${scan.errors} errors` : ""}`
    : "No Lib Guard scan yet.";
  const scanLabel = working === "scan"
    ? `Scanning ${scan?.processed ?? 0}/${scan?.total ?? "…"}`
    : scan?.status === "running" || scan?.status === "paused"
      ? "Resume Lib Guard scan"
      : "Run Lib Guard scan";

  return <div className="space-y-6">
    <div className="flex flex-wrap items-center gap-3">
      <Link href="/guard" className="rounded-xl border border-white/10 px-3 py-2 text-sm text-white/55 hover:text-white">
        <ChevronLeft className="mr-1 inline size-4" />Guard
      </Link>
      <div className="rounded-full border border-[#16c8ff]/25 bg-[#16c8ff]/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-[#a9eeff]">Behavior filter · not an ideology detector</div>
    </div>

    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Stat label="Following" value={data.counts?.following ?? 0} icon={Users} />
      <Stat label="Candidates" value={data.counts?.candidates ?? queue.length} icon={Filter} />
      <Stat label="Muted + followed" value={data.counts?.muted ?? 0} icon={EyeOff} />
      <Stat label="Threshold" value={`${data.settings?.min_score ?? 55}+`} icon={ShieldCheck} />
    </div>

    <div className="rounded-2xl border border-[#16c8ff]/20 bg-gradient-to-br from-[#16c8ff]/[0.07] to-transparent p-5 sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-sm font-semibold"><Sparkles className="size-4 text-[#8ce8ff]" />Lib Guard score</div>
          <p className="mt-2 max-w-4xl text-sm leading-6 text-white/55">Ranks accounts you follow by low IAZMA network value, Ukraine-topic saturation, TV/pundit-media saturation, and repost saturation. Existing Advanced Network interaction, importance, bridge, visibility, and reciprocity signals protect useful relationships from being treated like disposable follows.</p>
          <p className="mt-2 text-xs text-white/35">Default weighting: 50% low network value · 25% Ukraine · 20% Lib TV/media · 5% repost saturation.</p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <button onClick={() => void runScan()} disabled={!!working} className="rounded-xl bg-[#16c8ff] px-4 py-2.5 text-sm font-semibold text-black disabled:opacity-40">
            <Search className="mr-1.5 inline size-4" />{scanLabel}
          </button>
          <button onClick={() => setShowSettings((value) => !value)} disabled={!!working} className="rounded-xl border border-white/12 px-4 py-2.5 text-sm text-white/70 disabled:opacity-40">
            <Settings2 className="mr-1.5 inline size-4" />Tune weights
          </button>
        </div>
      </div>
      <div className="mt-4 border-t border-white/8 pt-3 text-xs text-white/40">
        {scan?.status === "paused" ? `Paused by Bluesky · ${progress} · resume ${retryLabel(scan.retry_after_at)}` : progress}
      </div>
    </div>

    {showSettings ? <SettingsPanel value={settingsDraft} onChange={setSettingsDraft} onSave={() => void saveSettings()} disabled={!!working} /> : null}
    {error ? <div className="rounded-xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-100">{error}</div> : null}
    {notice ? <div className="rounded-xl border border-emerald-300/20 bg-emerald-300/10 p-4 text-sm text-emerald-50">{notice}</div> : null}

    <div className="space-y-3 rounded-2xl border border-white/10 bg-black/25 p-4">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/30" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search candidates…" className="w-full rounded-xl border border-white/10 bg-white/[0.035] py-2.5 pl-9 pr-3 text-sm outline-none placeholder:text-white/25 focus:border-[#16c8ff]/40" />
        </div>
        <div className="flex flex-wrap gap-2">
          {(["all", "unmuted", "muted", "unfollow", "strategic"] as ViewMode[]).map((mode) => <button key={mode} onClick={() => setView(mode)} className={`rounded-lg px-3 py-2 text-xs font-medium capitalize ${view === mode ? "bg-white/12 text-white" : "border border-white/8 text-white/45"}`}>{mode}</button>)}
        </div>
        <label className="flex items-center gap-2 text-xs text-white/45">
          Score ≥
          <input type="number" min={0} max={100} value={scoreFloor} onChange={(event) => setScoreFloor(Math.max(0, Math.min(100, Number(event.target.value) || 0)))} className="w-16 rounded-lg border border-white/10 bg-white/[0.035] px-2 py-2 text-white/80 outline-none" />
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-white/8 pt-3">
        <label className="mr-2 flex cursor-pointer items-center gap-2 text-sm text-white/65">
          <input type="checkbox" checked={allDisplayedSelected} disabled={!!working || displayed.length === 0} onChange={(event) => updateSelected(displayed.map((item) => item.did), event.target.checked)} className="size-4 accent-[#16c8ff]" />
          Select shown ({displayed.length})
        </label>
        <button onClick={() => setSelected(new Set(queue.filter((item) => !item.muted_at && ["mute", "mute_keep"].includes(item.recommendation ?? "")).map((item) => item.did)))} disabled={!!working} className="rounded-lg border border-white/10 px-3 py-2 text-xs text-white/55 disabled:opacity-40">Select mute recommendations</button>
        <button onClick={() => setSelected(new Set(queue.filter((item) => item.recommendation === "unfollow").map((item) => item.did)))} disabled={!!working} className="rounded-lg border border-white/10 px-3 py-2 text-xs text-white/55 disabled:opacity-40">Select unfollow recommendations</button>
        <button onClick={() => setSelected(new Set())} disabled={!!working || selected.size === 0} className="rounded-lg border border-white/10 px-3 py-2 text-xs text-white/45 disabled:opacity-30">Clear</button>
        <span className="ml-auto text-xs text-white/35">{selectedItems.length} selected</span>
      </div>
    </div>

    {selectedItems.length > 0 ? <div className="sticky top-3 z-20 flex flex-col gap-3 rounded-2xl border border-[#16c8ff]/30 bg-[#07131a]/95 p-4 shadow-2xl shadow-black/40 backdrop-blur-xl sm:flex-row sm:items-center">
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold">{selectedItems.length} selected</div>
        <div className="mt-0.5 text-xs text-white/40">{selectedUnmuted.length} can be muted · {selectedMuted.length} currently muted · all {selectedItems.length} can be unfollowed</div>
      </div>
      <div className="flex flex-wrap gap-2">
        <button onClick={() => void runBulk("mute", selectedUnmuted.map((item) => item.did))} disabled={!!working || selectedUnmuted.length === 0} className="rounded-xl border border-[#8ce8ff]/30 bg-[#16c8ff]/10 px-4 py-2.5 text-sm font-semibold text-[#b8f2ff] disabled:opacity-35">
          <EyeOff className="mr-1.5 inline size-4" />{working === "bulk-mute" ? "Muting…" : `Mute (${selectedUnmuted.length})`}
        </button>
        <button onClick={() => void runBulk("unmute", selectedMuted.map((item) => item.did))} disabled={!!working || selectedMuted.length === 0} className="rounded-xl border border-white/12 px-4 py-2.5 text-sm text-white/65 disabled:opacity-35">
          <Eye className="mr-1.5 inline size-4" />{working === "bulk-unmute" ? "Unmuting…" : `Unmute (${selectedMuted.length})`}
        </button>
        <button onClick={() => void runBulk("unfollow", selectedItems.map((item) => item.did))} disabled={!!working} className="rounded-xl bg-red-400 px-4 py-2.5 text-sm font-bold text-black disabled:opacity-35">
          <UserMinus className="mr-1.5 inline size-4" />{working === "bulk-unfollow" ? "Unfollowing…" : `Unfollow (${selectedItems.length})`}
        </button>
      </div>
    </div> : null}

    {queue.length === 0 ? <Empty scan={scan} /> : displayed.length === 0 ? <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-8 text-center text-sm text-white/45">No candidates match the current view.</div> : <div className="space-y-3">
      {displayed.map((item) => {
        const score = item.score ?? 0;
        const advanced = item.metrics?.advanced ?? {};
        return <article key={item.did} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-6">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start">
            <div className="flex min-w-0 flex-1 gap-3 sm:gap-4">
              <input aria-label={`Select @${item.handle || item.did}`} type="checkbox" checked={selected.has(item.did)} disabled={!!working} onChange={(event) => updateSelected([item.did], event.target.checked)} className="mt-4 size-4 shrink-0 accent-[#16c8ff]" />
              {item.avatar ? <img src={item.avatar} alt="" className="size-12 shrink-0 rounded-full object-cover" /> : <div className="grid size-12 shrink-0 place-items-center rounded-full bg-white/10">?</div>}
              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 flex-wrap items-start gap-2">
                  <a href={profileHref(item)} target="_blank" rel="noopener noreferrer" className="min-w-0 group">
                    <h2 className="truncate text-lg font-semibold group-hover:text-[#9be9ff]">{item.display_name || `@${item.handle || item.did}`}</h2>
                    <p className="truncate text-sm text-white/40 group-hover:text-white/60">@{item.handle || item.did}</p>
                  </a>
                  <span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${scoreClasses(score)}`}>LG {score}</span>
                  <span className="rounded-full border border-white/10 px-2.5 py-1 text-xs font-semibold text-white/55">{recommendationLabel(item.recommendation)}</span>
                  {item.muted_at ? <span className="rounded-full border border-violet-300/25 bg-violet-300/10 px-2.5 py-1 text-xs font-semibold text-violet-100">Muted {item.muted_days ? `${item.muted_days}d` : "now"}</span> : null}
                  {item.is_follower ? <span className="rounded-full border border-emerald-300/20 bg-emerald-300/8 px-2.5 py-1 text-xs text-emerald-100">follows you</span> : null}
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {(item.categories ?? []).filter((value) => value !== "lib_guard_candidate").map((category) => <span key={category} className="rounded-full border border-white/8 bg-white/[0.025] px-2.5 py-1 text-[11px] text-white/45">{categoryLabels[category] || category}</span>)}
                </div>
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap gap-2">
              <a href={profileHref(item)} target="_blank" rel="noopener noreferrer" className="rounded-xl border border-white/12 px-3 py-2 text-sm text-white/60 hover:text-white"><ExternalLink className="mr-1.5 inline size-4" />Profile</a>
              <button onClick={() => void keep(item.did)} disabled={!!working} className="rounded-xl border border-white/12 px-3 py-2 text-sm text-white/60 disabled:opacity-40"><Check className="mr-1.5 inline size-4" />Keep</button>
              {item.muted_at
                ? <button onClick={() => void runBulk("unmute", [item.did])} disabled={!!working} className="rounded-xl border border-violet-300/25 bg-violet-300/10 px-3 py-2 text-sm text-violet-100 disabled:opacity-40"><Eye className="mr-1.5 inline size-4" />Unmute</button>
                : <button onClick={() => void runBulk("mute", [item.did])} disabled={!!working} className="rounded-xl border border-[#16c8ff]/30 bg-[#16c8ff]/10 px-3 py-2 text-sm text-[#b8f2ff] disabled:opacity-40"><EyeOff className="mr-1.5 inline size-4" />Mute</button>}
              <button onClick={() => void runBulk("unfollow", [item.did])} disabled={!!working} className="rounded-xl border border-red-300/25 bg-red-300/10 px-3 py-2 text-sm text-red-100 disabled:opacity-40"><UserMinus className="mr-1.5 inline size-4" />Unfollow</button>
            </div>
          </div>

          <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <Metric label="Network value" value={item.network_value ?? 0} detail="Higher protects the follow" invert />
            <Metric label="Ukraine" value={item.ukraine_saturation ?? 0} suffix="%" detail="Recent sampled posts" />
            <Metric label="Lib TV / media" value={item.lib_media_saturation ?? 0} suffix="%" detail="Recent sampled posts" />
            <Metric label="Reposts" value={item.repost_ratio ?? 0} suffix="%" detail="Recent sampled feed" />
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-[1.2fr_1fr]">
            <div className="rounded-xl border border-white/8 bg-black/20 p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.12em] text-white/35">Why it scored</div>
              {(item.evidence ?? []).length ? <div className="mt-3 space-y-2">
                {(item.evidence ?? []).slice(0, 5).map((evidence, index) => <div key={`${item.did}-${index}`} className="text-xs leading-5 text-white/50">
                  <span className="font-semibold text-white/65">{evidence.label || categoryLabels[evidence.category ?? ""] || evidence.category}</span>
                  {evidence.excerpt ? <span className="text-white/38"> — {evidence.excerpt}</span> : null}
                </div>)}
              </div> : <p className="mt-2 text-xs text-white/35">Score came from the weighted metrics above.</p>}
            </div>
            <div className="rounded-xl border border-white/8 bg-black/20 p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.12em] text-white/35">IAZMA strategic signals</div>
              <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                <Signal label="Interactions" value={(advanced.outgoingInteraction ?? 0) + (advanced.incomingInteraction ?? 0)} known={advanced.interactionAvailable} />
                <Signal label="Importance" value={advanced.importanceScore ?? 0} known={advanced.recommendationFound} />
                <Signal label="Bridge value" value={advanced.expectedBridgeValue ?? 0} known={advanced.recommendationFound} />
                <Signal label="Visibility" value={advanced.visibilityPotential ?? 0} known={advanced.recommendationFound} />
                <Signal label="Independent paths" value={advanced.independentPaths ?? 0} known={advanced.recommendationFound} raw />
                <Signal label="Target clusters" value={advanced.sharedBestieClusters ?? 0} known={advanced.recommendationFound} raw />
              </div>
            </div>
          </div>
          <div className="mt-3 text-[11px] text-white/25">Assessed {fmtDate(item.assessed_at)}{item.muted_at ? ` · muted ${fmtDate(item.muted_at)}` : ""}</div>
        </article>;
      })}
    </div>}
  </div>;
}

function Stat({ label, value, icon: Icon }: { label: string; value: number | string; icon: typeof Users }) {
  return <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-5">
    <Icon className="size-4 text-[#8ce8ff]" />
    <div className="mt-5 text-3xl font-semibold">{value}</div>
    <div className="mt-1 text-xs uppercase tracking-[0.12em] text-white/40">{label}</div>
  </div>;
}

function Metric({ label, value, suffix = "/100", detail, invert = false }: { label: string; value: number; suffix?: string; detail: string; invert?: boolean }) {
  return <div className="rounded-xl border border-white/8 bg-black/20 p-3.5">
    <div className="text-xs text-white/38">{label}</div>
    <div className={`mt-1 text-xl font-semibold ${invert && value >= 70 ? "text-emerald-200" : value >= 70 ? "text-amber-100" : "text-white"}`}>{Math.round(value)}{suffix}</div>
    <div className="mt-1 text-[11px] text-white/28">{detail}</div>
  </div>;
}

function Signal({ label, value, known, raw = false }: { label: string; value: number; known?: boolean; raw?: boolean }) {
  return <div className="flex items-center justify-between gap-3 border-b border-white/5 pb-1.5">
    <span className="text-white/38">{label}</span>
    <span className="font-semibold text-white/65">{known ? `${Math.round(value)}${raw ? "" : "/100"}` : "no stored signal"}</span>
  </div>;
}

function SettingsPanel({ value, onChange, onSave, disabled }: { value: LibGuardSettings; onChange: (value: LibGuardSettings) => void; onSave: () => void; disabled: boolean }) {
  const set = (key: keyof LibGuardSettings, next: number) => onChange({ ...value, [key]: next });
  return <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-5 sm:p-6">
    <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
      <div className="flex-1">
        <h3 className="font-semibold">Lib Guard tuning</h3>
        <p className="mt-1 text-xs leading-5 text-white/40">Weights are normalized automatically, so they do not have to total 100. Higher candidate threshold = fewer people surfaced.</p>
      </div>
      <button onClick={onSave} disabled={disabled} className="rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-black disabled:opacity-40">Save settings</button>
    </div>
    <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <NumberSetting label="Low network value weight" value={value.low_value_weight} onChange={(next) => set("low_value_weight", next)} />
      <NumberSetting label="Ukraine weight" value={value.ukraine_weight} onChange={(next) => set("ukraine_weight", next)} />
      <NumberSetting label="Lib TV/media weight" value={value.lib_media_weight} onChange={(next) => set("lib_media_weight", next)} />
      <NumberSetting label="Repost weight" value={value.repost_weight} onChange={(next) => set("repost_weight", next)} />
      <NumberSetting label="Candidate score threshold" value={value.min_score} min={25} max={90} onChange={(next) => set("min_score", next)} />
      <NumberSetting label="Ukraine saturation flag %" value={value.ukraine_threshold} min={5} max={90} onChange={(next) => set("ukraine_threshold", next)} />
      <NumberSetting label="Lib TV saturation flag %" value={value.lib_media_threshold} min={5} max={90} onChange={(next) => set("lib_media_threshold", next)} />
      <NumberSetting label="Mute quarantine days" value={value.quarantine_days} min={1} max={180} onChange={(next) => set("quarantine_days", next)} />
    </div>
  </div>;
}

function NumberSetting({ label, value, onChange, min = 0, max = 100 }: { label: string; value: number; onChange: (value: number) => void; min?: number; max?: number }) {
  return <label className="block">
    <span className="text-xs text-white/45">{label}</span>
    <input type="number" min={min} max={max} value={value} onChange={(event) => onChange(Math.max(min, Math.min(max, Number(event.target.value) || 0)))} className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2.5 text-sm text-white outline-none focus:border-[#16c8ff]/40" />
  </label>;
}

function Empty({ scan }: { scan: Scan | null }) {
  return <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-10 text-center">
    <RefreshCw className="mx-auto size-5 text-white/30" />
    <h3 className="mt-4 font-semibold">{scan?.status === "complete" ? "Nobody currently crosses your Lib Guard threshold" : "Run the first Lib Guard scan"}</h3>
    <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-white/40">The scan checks accounts you follow, scores recent public posting behavior against IAZMA network value, and creates a review queue. Nothing is muted or unfollowed until you press an action button.</p>
  </div>;
}
