"use client";

import { useEffect, useMemo, useState } from "react";
import { Ban, Check, Clock3, RefreshCw, Search, ShieldAlert, ShieldCheck, Undo2, UserMinus, Users } from "lucide-react";

type Evidence = { category?: string; source?: string; label?: string; excerpt?: string };
type QueueItem = {
  did: string;
  handle?: string;
  display_name?: string;
  avatar?: string;
  description?: string;
  followers_count?: number;
  follows_count?: number;
  is_follower?: boolean;
  is_following?: boolean;
  last_activity_at?: string;
  score?: number;
  categories?: string[];
  confidence?: string;
  evidence?: Evidence[];
};
type Scan = {
  id?: string;
  scanId?: string;
  status?: "running" | "paused" | "complete";
  scope?: string;
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
type GuardUser = { last_graph_sync_at?: string };
type GuardFilters = { rightWing?: boolean; antiPalestine?: boolean; islamophobia?: boolean; xenophobia?: boolean };
type GuardSettings = { inactive_days?: number; bot_threshold?: number; auto_unfollow?: boolean; filters?: GuardFilters };
type Suppression = { did: string; handle?: string; reason?: string; source?: string };
type ActionHistory = { id: number; target_did?: string; action: string; reason?: string; handle?: string; created_at?: string };
type Counts = { followers?: number; following?: number; observed_unfollowers?: number };
type Dashboard = {
  user?: GuardUser;
  settings?: GuardSettings;
  queue?: QueueItem[];
  suppressions?: Suppression[];
  actions?: ActionHistory[];
  scan?: Scan | null;
  counts?: Counts;
};

const labels: Record<string, string> = {
  inactive: "Inactive",
  bot_spam: "Bot / spam",
  right_wing_explicit: "Explicit right-wing profile",
  anti_palestine: "Anti-Palestinian content",
  islamophobia: "Islamophobic content",
  xenophobia: "Xenophobic content",
};

function errorFromPayload(payload: unknown, fallback: string) {
  if (typeof payload === "object" && payload !== null && "error" in payload) {
    const value = (payload as Record<string, unknown>).error;
    if (typeof value === "string" && value) return value;
  }
  return fallback;
}

async function api<T = unknown>(method: "GET" | "POST" = "GET", body?: Record<string, unknown>): Promise<T> {
  const response = await fetch("/api/guard", {
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
      if (response.status === 408 || response.status === 504 || response.status === 524) {
        throw new Error("That scan batch timed out. Your progress is saved—use Resume scan to continue.");
      }
      throw new Error(`That Guard request did not finish normally (${response.status}). Your scan progress is saved—use Resume scan to continue.`);
    }
  }
  if (!response.ok) throw new Error(errorFromPayload(payload, `Guard request failed (${response.status}).`));
  return payload as T;
}

function fmtDate(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toLocaleString() : "—";
}

function pause(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function retryLabel(value?: string | null) {
  if (!value) return "in a couple of minutes";
  const remaining = new Date(value).getTime() - Date.now();
  if (!Number.isFinite(remaining) || remaining <= 0) return "now";
  const minutes = Math.ceil(remaining / 60_000);
  return minutes <= 1 ? "in about a minute" : `in about ${minutes} minutes`;
}

export function IazmaGuardDashboard() {
  const [data, setData] = useState<Dashboard>({});
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState("");
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"review" | "suppression" | "history" | "settings">("review");

  const refresh = async () => {
    try {
      setError("");
      setData(await api<Dashboard>());
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : "Could not load Guard.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void api<Dashboard>()
        .then((dashboard) => setData(dashboard))
        .catch((issue: unknown) => setError(issue instanceof Error ? issue.message : "Could not load Guard."))
        .finally(() => setLoading(false));
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const queue = data.queue ?? [];
  const scan = data.scan ?? null;
  const stats = useMemo(
    () => [
      { label: "Followers", value: data.counts?.followers ?? 0, icon: Users },
      { label: "Following", value: data.counts?.following ?? 0, icon: UserMinus },
      { label: "Review", value: queue.length, icon: ShieldAlert },
      { label: "Observed unfollows", value: data.counts?.observed_unfollowers ?? 0, icon: Clock3 },
    ],
    [data, queue.length],
  );

  const saveScanState = (next: Scan) => {
    setData((current) => ({
      ...current,
      scan: { ...current.scan, ...next, id: next.id ?? next.scanId ?? current.scan?.id },
    }));
  };

  const runScan = async () => {
    setWorking("scan");
    setError("");
    try {
      let state = await api<Scan>("POST", { action: "scan_start", scope: "all" });
      saveScanState(state);
      while (state.status === "running") {
        state = await api<Scan>("POST", { action: "scan_batch", scanId: state.id ?? state.scanId ?? "", limit: 4 });
        saveScanState(state);
        if (state.status === "running") await pause(750);
      }
      await refresh();
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : "Scan paused before it could finish.");
    } finally {
      setWorking("");
    }
  };

  const action = async (kind: string, did: string) => {
    setWorking(`${kind}:${did}`);
    setError("");
    try {
      await api("POST", { action: kind, did });
      await refresh();
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : "Action failed.");
    } finally {
      setWorking("");
    }
  };

  const sync = async () => {
    setWorking("sync");
    setError("");
    try {
      await api("POST", { action: "sync" });
      await refresh();
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : "Sync failed.");
    } finally {
      setWorking("");
    }
  };

  const saveSettings = async (form: FormData) => {
    setWorking("settings");
    setError("");
    try {
      await api("POST", {
        action: "settings",
        inactive_days: Number(form.get("inactive_days")),
        bot_threshold: Number(form.get("bot_threshold")),
        auto_unfollow: form.get("auto_unfollow") === "on",
        filters: {
          rightWing: form.get("rightWing") === "on",
          antiPalestine: form.get("antiPalestine") === "on",
          islamophobia: form.get("islamophobia") === "on",
          xenophobia: form.get("xenophobia") === "on",
        },
      });
      await refresh();
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : "Settings failed.");
    } finally {
      setWorking("");
    }
  };

  if (loading) {
    return <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-sm text-white/50">Loading Guard…</div>;
  }

  const progress = scan && scan.total
    ? `${scan.processed ?? 0} of ${scan.total} checked · ${scan.flagged ?? 0} need review${scan.errors ? ` · ${scan.errors} could not be read` : ""}`
    : "No scan has started yet.";
  const scanLabel = working === "scan"
    ? `Scanning ${scan?.processed ?? 0}/${scan?.total ?? "…"}`
    : scan?.status === "running" || scan?.status === "paused"
      ? "Resume scan"
      : "Scan cleanup candidates";

  return <div className="space-y-6">
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map(({ label, value, icon: Icon }) => <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.035] p-5">
        <Icon className="size-4 text-[#8ce8ff]" />
        <div className="mt-5 text-3xl font-semibold">{value}</div>
        <div className="mt-1 text-xs uppercase tracking-[0.12em] text-white/40">{label}</div>
      </div>)}
    </div>

    <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-4">
      <div className="flex flex-wrap items-center gap-3">
        <button onClick={() => void runScan()} disabled={!!working} className="rounded-xl bg-[#16c8ff] px-4 py-2.5 text-sm font-semibold text-black disabled:opacity-50">
          <Search className="mr-2 inline size-4" />
          {scanLabel}
        </button>
        <button onClick={() => void sync()} disabled={!!working} className="rounded-xl border border-white/12 px-4 py-2.5 text-sm text-white/75 disabled:opacity-50">
          <RefreshCw className="mr-2 inline size-4" />
          Sync graph
        </button>
        <div className="ml-auto text-xs text-white/35">Last graph sync: {fmtDate(data.user?.last_graph_sync_at)}</div>
      </div>
      <div role="status" className="mt-3 text-sm text-white/55">
        {scan?.status === "running"
          ? `Cleanup scan in progress · ${progress}`
          : scan?.status === "paused"
            ? `Bluesky asked Guard to slow down · ${progress}. Progress is saved; resume ${retryLabel(scan.retry_after_at)}.`
            : `Scans followers and accounts you follow · ${progress}`}
      </div>
      <p className="mt-1 text-xs leading-5 text-white/35">Guard saves progress after every short batch. You can leave and resume later without restarting.</p>
    </div>

    {error ? <div className="rounded-xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-100">{error}</div> : null}

    <div className="flex gap-1 overflow-x-auto rounded-xl border border-white/10 bg-black/25 p-1">
      {(["review", "suppression", "history", "settings"] as const).map((value) => <button key={value} onClick={() => setTab(value)} className={`rounded-lg px-4 py-2 text-sm capitalize ${tab === value ? "bg-white/10 text-white" : "text-white/45"}`}>{value}</button>)}
    </div>

    {tab === "review" ? <div className="space-y-4">
      {queue.length === 0 ? <Empty text="No current cleanup candidates. Run a scan to review followers and accounts you follow." /> : queue.map((item) => <article key={item.did} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
          <div className="flex min-w-0 flex-1 gap-4">
            {item.avatar ? <img src={item.avatar} alt="" className="size-12 rounded-full object-cover" /> : <div className="grid size-12 shrink-0 place-items-center rounded-full bg-white/10 text-lg">?</div>}
            <div className="min-w-0">
              <h2 className="truncate text-lg font-semibold">{item.display_name || `@${item.handle}`}</h2>
              <p className="truncate text-sm text-white/45">@{item.handle}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {(item.categories ?? []).map((category) => <span key={category} className="rounded-full border border-[#16c8ff]/20 bg-[#16c8ff]/8 px-2.5 py-1 text-xs text-[#9be9ff]">{labels[category] || category}</span>)}
                <span className="rounded-full border border-white/10 px-2.5 py-1 text-xs text-white/45">score {item.score ?? 0}</span>
                {item.is_follower ? <span className="rounded-full border border-white/10 px-2.5 py-1 text-xs text-white/45">follows you</span> : null}
                {item.is_following ? <span className="rounded-full border border-white/10 px-2.5 py-1 text-xs text-white/45">you follow them</span> : null}
              </div>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <button onClick={() => void action("ignore", item.did)} disabled={!!working} className="rounded-xl border border-white/12 px-3 py-2 text-sm text-white/65 disabled:opacity-50"><Check className="mr-1.5 inline size-4" />Keep</button>
            {item.is_following ? <button onClick={() => void action("unfollow", item.did)} disabled={!!working} className="rounded-xl border border-[#16c8ff]/30 bg-[#16c8ff]/10 px-3 py-2 text-sm text-[#b5efff] disabled:opacity-50"><UserMinus className="mr-1.5 inline size-4" />Unfollow</button> : null}
            <button onClick={() => void action("block", item.did)} disabled={!!working} className="rounded-xl bg-red-500/85 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"><Ban className="mr-1.5 inline size-4" />{item.is_following ? "Unfollow + Block" : "Block"}</button>
          </div>
        </div>
        <div className="mt-5 grid gap-2">
          {(item.evidence ?? []).map((evidence, index) => <div key={index} className="rounded-xl border border-white/8 bg-black/20 p-3">
            <div className="text-xs font-semibold text-white/70">{evidence.label || labels[evidence.category || ""] || evidence.category}</div>
            {evidence.excerpt ? <p className="mt-1 text-sm leading-6 text-white/48">“{evidence.excerpt}”</p> : null}
            <div className="mt-1 text-[11px] uppercase tracking-[0.1em] text-white/25">{evidence.source}</div>
          </div>)}
        </div>
        {item.last_activity_at ? <div className="mt-4 text-xs text-white/35">Last public activity: {fmtDate(item.last_activity_at)}</div> : null}
      </article>)}
    </div> : null}

    {tab === "suppression" ? <div className="space-y-3">
      {(data.suppressions ?? []).length === 0 ? <Empty text="IAZMA suppression list is empty." /> : (data.suppressions ?? []).map((item) => <div key={item.did} className="flex flex-col gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1"><div className="font-medium">@{item.handle || item.did}</div><div className="mt-1 text-sm text-white/45">{item.reason} · {item.source}</div></div>
        <button onClick={() => void action("restore", item.did)} className="rounded-lg border border-white/12 px-3 py-2 text-sm text-white/65"><Undo2 className="mr-1.5 inline size-4" />Allow in IAZMA</button>
      </div>)}
    </div> : null}

    {tab === "history" ? <div className="overflow-hidden rounded-2xl border border-white/10">
      {(data.actions ?? []).length === 0 ? <Empty text="No Guard actions yet." /> : (data.actions ?? []).map((item) => <div key={item.id} className="grid gap-1 border-b border-white/8 p-4 last:border-0 sm:grid-cols-[1fr_auto]">
        <div><div className="text-sm font-medium">{item.action.replaceAll("_", " ")} · @{item.handle || item.target_did}</div><div className="mt-1 text-xs text-white/40">{item.reason}</div></div>
        <div className="text-xs text-white/30">{fmtDate(item.created_at)}</div>
      </div>)}
    </div> : null}

    {tab === "settings" ? <form action={async (form) => { await saveSettings(form); }} className="grid gap-5 rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-6">
      <label className="grid gap-2 text-sm text-white/65">Inactive threshold (days)<input name="inactive_days" type="number" min={30} max={365} defaultValue={data.settings?.inactive_days ?? 90} className="rounded-xl border border-white/12 bg-black/25 px-3 py-2.5 text-white" /></label>
      <label className="grid gap-2 text-sm text-white/65">Bot/spam review threshold<input name="bot_threshold" type="number" min={50} max={95} defaultValue={data.settings?.bot_threshold ?? 70} className="rounded-xl border border-white/12 bg-black/25 px-3 py-2.5 text-white" /></label>
      <Toggle name="auto_unfollow" label="Automatically unfollow accounts that Guard observed following you and later detects as unfollowed" checked={data.settings?.auto_unfollow !== false} />
      <div className="border-t border-white/10 pt-4 text-xs uppercase tracking-[0.14em] text-white/35">Evidence review filters</div>
      <Toggle name="rightWing" label="Explicit right-wing self-identification" checked={data.settings?.filters?.rightWing !== false} />
      <Toggle name="antiPalestine" label="Explicit anti-Palestinian content" checked={data.settings?.filters?.antiPalestine !== false} />
      <Toggle name="islamophobia" label="Explicit Islamophobic content" checked={data.settings?.filters?.islamophobia !== false} />
      <Toggle name="xenophobia" label="Explicit xenophobic content" checked={data.settings?.filters?.xenophobia !== false} />
      <button disabled={working === "settings"} className="w-fit rounded-xl bg-[#16c8ff] px-4 py-2.5 text-sm font-semibold text-black disabled:opacity-50">Save settings</button>
      <p className="text-xs leading-5 text-white/30"><ShieldCheck className="mr-1 inline size-3.5" />Content filters flag explicit public evidence for review; they do not infer hidden ideology. Blocks are public AT Protocol records.</p>
    </form> : null}
  </div>;
}

function Empty({ text }: { text: string }) {
  return <div className="rounded-2xl border border-dashed border-white/12 p-8 text-center text-sm text-white/38">{text}</div>;
}

function Toggle({ name, label, checked }: { name: string; label: string; checked: boolean }) {
  return <label className="flex items-start gap-3 text-sm leading-6 text-white/60"><input name={name} type="checkbox" defaultChecked={checked} className="mt-1 size-4 accent-[#16c8ff]" /><span>{label}</span></label>;
}
