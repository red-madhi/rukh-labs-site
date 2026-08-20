"use client";

import { useEffect, useMemo, useState } from "react";
import { RefreshCw, Search } from "lucide-react";
import type { LeadDashboardMetrics, LeadDashboardRow, LeadDashboardStatus } from "@/lib/leads/outreach-dashboard";

type DashboardResponse = {
  rows?: LeadDashboardRow[];
  metrics?: LeadDashboardMetrics;
  error?: string;
};

type StatusFilter = "all" | LeadDashboardStatus;
type FeedFilter = "all" | "website" | "power-bi";

const STATUS_ORDER: Array<{ value: StatusFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "ready", label: "Ready" },
  { value: "sent", label: "Sent" },
  { value: "contacted", label: "Contacted" },
  { value: "replied", label: "Replied" },
  { value: "bounced", label: "Bounced" },
  { value: "meeting", label: "Meeting" },
  { value: "proposal", label: "Proposal" },
  { value: "won", label: "Won" },
  { value: "lost", label: "Lost" },
  { value: "completed", label: "Completed" },
  { value: "no-email", label: "No email" },
  { value: "ignored", label: "Ignored" },
];

function when(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString();
}

function statusClass(status: LeadDashboardStatus) {
  if (status === "bounced") return "border-red-300/30 bg-red-300/[.08] text-red-200";
  if (status === "replied" || status === "won") return "border-emerald-300/30 bg-emerald-300/[.08] text-emerald-200";
  if (status === "sent" || status === "contacted") return "border-sky-300/25 bg-sky-300/[.07] text-sky-200";
  if (status === "meeting" || status === "proposal") return "border-violet-300/25 bg-violet-300/[.07] text-violet-200";
  if (status === "lost" || status === "ignored") return "border-white/12 bg-white/[.03] text-white/45";
  if (status === "no-email") return "border-orange-300/25 bg-orange-300/[.06] text-orange-200";
  return "border-[#d7a45f]/25 bg-[#d7a45f]/[.07] text-[#efc37c]";
}

function Metric({ label, value, note }: { label: string; value: string | number; note?: string }) {
  return (
    <div className="border border-white/10 bg-[#090807] p-4">
      <div className="text-[9px] font-black uppercase tracking-[.16em] text-white/30">{label}</div>
      <div className="mt-1 text-3xl font-black tracking-[-.04em] text-white/90">{value}</div>
      {note ? <div className="mt-1 text-[10px] text-white/30">{note}</div> : null}
    </div>
  );
}

export function LeadStatusDashboard() {
  const [rows, setRows] = useState<LeadDashboardRow[]>([]);
  const [metrics, setMetrics] = useState<LeadDashboardMetrics | null>(null);
  const [status, setStatus] = useState<StatusFilter>("all");
  const [feed, setFeed] = useState<FeedFilter>("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  async function load() {
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch("/api/leads/statuses", { cache: "no-store", credentials: "same-origin" });
      const result = (await response.json()) as DashboardResponse;
      if (!response.ok) throw new Error(result.error || "Could not load lead statuses.");
      setRows(result.rows || []);
      setMetrics(result.metrics || null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load lead statuses.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    map.set("all", rows.length);
    for (const row of rows) map.set(row.status, (map.get(row.status) || 0) + 1);
    return map;
  }, [rows]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (status !== "all" && row.status !== status) return false;
      if (feed !== "all" && row.feed !== feed) return false;
      if (!term) return true;
      return `${row.company} ${row.contactEmail} ${row.source} ${row.status}`.toLowerCase().includes(term);
    });
  }, [rows, status, feed, search]);

  return (
    <main className="min-h-screen bg-[#050505] px-3 py-5 text-[#f4efe3] sm:px-5 lg:px-7">
      <div className="mx-auto max-w-[1600px]">
        <header className="border border-white/10 bg-[#090807] p-5 sm:p-7">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="text-[9px] font-black uppercase tracking-[.2em] text-[#d7a45f]">Lead outcomes</div>
              <h1 className="mt-2 text-3xl font-black tracking-[-.05em] sm:text-5xl">Statuses & delivery</h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-white/45">Every active lead in one place. Bounced addresses are suppressed automatically and cannot be emailed again from the outreach queue.</p>
            </div>
            <button type="button" disabled={loading} onClick={() => void load()} className="inline-flex min-h-10 items-center gap-2 self-start border border-white/12 bg-white/[.035] px-3 py-2 text-xs font-bold text-white/65 disabled:opacity-40">
              <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} /> Refresh
            </button>
          </div>
          {message ? <div className="mt-4 border border-red-300/20 bg-red-300/[.05] p-3 text-xs text-red-200/80">{message}</div> : null}
        </header>

        <section className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-8">
          <Metric label="All leads" value={metrics?.total ?? "—"} />
          <Metric label="Ready" value={metrics?.ready ?? "—"} />
          <Metric label="Emails sent" value={metrics?.sent ?? "—"} />
          <Metric label="Active sent" value={metrics?.activeSent ?? "—"} />
          <Metric label="Bounced" value={metrics?.bounced ?? "—"} note={metrics ? `${metrics.bounceRate}% bounce rate` : undefined} />
          <Metric label="Replied" value={metrics?.replied ?? "—"} note={metrics ? `${metrics.replyRate}% reply rate` : undefined} />
          <Metric label="Follow-ups" value={metrics?.followUps ?? "—"} />
          <Metric label="No email" value={metrics?.noEmail ?? "—"} />
        </section>

        <section className="mt-3 border border-white/10 bg-[#090807] p-3">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex gap-2 overflow-x-auto pb-1">
              {STATUS_ORDER.map((item) => (
                <button key={item.value} type="button" onClick={() => setStatus(item.value)} className={`shrink-0 border px-3 py-2 text-[10px] font-bold uppercase tracking-[.1em] ${status === item.value ? "border-[#d7a45f]/40 bg-[#d7a45f]/10 text-[#efc37c]" : "border-white/10 text-white/40"}`}>
                  {item.label} <span className="ml-1 opacity-60">{counts.get(item.value) || 0}</span>
                </button>
              ))}
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="flex gap-2">
                {(["all", "website", "power-bi"] as const).map((item) => (
                  <button key={item} type="button" onClick={() => setFeed(item)} className={`border px-3 py-2 text-[10px] font-bold uppercase tracking-[.1em] ${feed === item ? "border-sky-300/30 bg-sky-300/[.07] text-sky-200" : "border-white/10 text-white/40"}`}>
                    {item === "power-bi" ? "Power BI" : item}
                  </button>
                ))}
              </div>
              <label className="flex min-w-0 items-center gap-2 border border-white/10 bg-black/30 px-3 py-2 sm:min-w-72">
                <Search className="size-4 shrink-0 text-white/25" />
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search company or email" className="min-w-0 flex-1 bg-transparent text-xs text-white/70 outline-none placeholder:text-white/20" />
              </label>
            </div>
          </div>
        </section>

        <div className="mt-3 border border-white/10 bg-[#090807]">
          <div className="hidden grid-cols-[minmax(220px,1.5fr)_minmax(220px,1.2fr)_100px_110px_150px_150px] gap-3 border-b border-white/8 px-4 py-3 text-[9px] font-black uppercase tracking-[.12em] text-white/25 lg:grid">
            <div>Lead</div><div>Email</div><div>Feed</div><div>Status</div><div>Last activity</div><div>Next</div>
          </div>

          {loading ? <div className="p-10 text-center text-sm text-white/35">Loading lead statuses…</div> : null}
          {!loading && filtered.length === 0 ? <div className="p-10 text-center text-sm text-white/35">No leads match these filters.</div> : null}

          {!loading ? filtered.map((row) => (
            <article key={row.id} className="border-b border-white/8 p-4 last:border-b-0 lg:grid lg:grid-cols-[minmax(220px,1.5fr)_minmax(220px,1.2fr)_100px_110px_150px_150px] lg:items-start lg:gap-3">
              <div className="min-w-0">
                <div className="break-words text-sm font-bold text-white/80">{row.company}</div>
                <div className="mt-1 text-[10px] text-white/30">Score {row.score} · CRM {row.crmStatus}</div>
              </div>
              <div className="mt-2 min-w-0 lg:mt-0">
                <div className="break-all text-xs text-white/55">{row.contactEmail || "No email"}</div>
                {row.suppressed ? <div className="mt-1 text-[10px] font-bold text-red-200/80">SUPPRESSED — no future sends</div> : null}
                {row.lastBounceReason ? <div className="mt-1 text-[10px] leading-4 text-red-200/55">{row.lastBounceReason}</div> : null}
              </div>
              <div className="mt-3 text-[10px] font-bold uppercase tracking-[.1em] text-white/40 lg:mt-0">{row.feed === "power-bi" ? "Power BI" : "Website"}</div>
              <div className="mt-2 lg:mt-0"><span className={`inline-block border px-2 py-1 text-[9px] font-black uppercase tracking-[.1em] ${statusClass(row.status)}`}>{row.status.replace("-", " ")}</span></div>
              <div className="mt-3 text-[10px] leading-4 text-white/35 lg:mt-0">{row.lastBounceAt ? `Bounced ${when(row.lastBounceAt)}` : row.lastReplyAt ? `Replied ${when(row.lastReplyAt)}` : row.sentAt ? `Sent ${when(row.sentAt)}` : `Updated ${when(row.updatedAt)}`}</div>
              <div className="mt-2 text-[10px] leading-4 text-white/35 lg:mt-0">{row.nextFollowUpAt ? <><span className="text-[#efc37c]">Follow-up</span><br />{when(row.nextFollowUpAt)}</> : row.followUpCount ? `${row.followUpCount} follow-up${row.followUpCount === 1 ? "" : "s"} sent` : "—"}</div>
            </article>
          )) : null}
        </div>
      </div>
    </main>
  );
}
