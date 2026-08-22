"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertOctagon,
  CheckCircle2,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import type { LeadDashboardMetrics, LeadDashboardRow, LeadDashboardStatus } from "@/lib/leads/outreach-dashboard";
import type { OutreachPerformance, OutreachSafetySnapshot } from "@/lib/leads/outreach-safety";
import type { OutreachSegment } from "@/lib/leads/segments";

type DashboardResponse = {
  rows?: LeadDashboardRow[];
  metrics?: LeadDashboardMetrics;
  safety?: OutreachSafetySnapshot;
  error?: string;
};

type StatusFilter = "all" | LeadDashboardStatus;
type FeedFilter = "all" | OutreachSegment;

const STATUS_ORDER: Array<{ value: StatusFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "ready", label: "Ready" },
  { value: "sent", label: "Sent" },
  { value: "contacted", label: "Contacted" },
  { value: "replied", label: "Replied" },
  { value: "bounced", label: "Bounced" },
  { value: "paused", label: "Paused" },
  { value: "meeting", label: "Meeting" },
  { value: "proposal", label: "Proposal" },
  { value: "won", label: "Won" },
  { value: "lost", label: "Lost" },
  { value: "completed", label: "Completed" },
  { value: "no-email", label: "No email" },
  { value: "ignored", label: "Ignored" },
];

const feeds: Array<{ value: FeedFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "website", label: "Website" },
  { value: "power-bi", label: "Power BI" },
  { value: "data-ops", label: "Data Ops" },
  { value: "partners", label: "Partners" },
];

function when(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString();
}

function feedLabel(feed: OutreachSegment) {
  if (feed === "power-bi") return "Power BI";
  if (feed === "data-ops") return "Data Ops";
  if (feed === "partners") return "Partners";
  return "Website";
}

function statusClass(status: LeadDashboardStatus) {
  if (status === "bounced" || status === "paused") return "border-red-300/30 bg-red-300/[.08] text-red-200";
  if (status === "replied" || status === "won") return "border-emerald-300/30 bg-emerald-300/[.08] text-emerald-200";
  if (status === "sent" || status === "contacted") return "border-sky-300/25 bg-sky-300/[.07] text-sky-200";
  if (status === "meeting" || status === "proposal") return "border-violet-300/25 bg-violet-300/[.07] text-violet-200";
  if (status === "lost" || status === "ignored") return "border-white/12 bg-white/[.03] text-white/45";
  if (status === "no-email") return "border-orange-300/25 bg-orange-300/[.06] text-orange-200";
  return "border-[#d7a45f]/25 bg-[#d7a45f]/[.07] text-[#efc37c]";
}

function healthClass(metric: OutreachPerformance) {
  if (metric.health === "paused") return "border-red-300/25 bg-red-300/[.045]";
  if (metric.health === "warning") return "border-orange-300/20 bg-orange-300/[.035]";
  if (metric.health === "healthy") return "border-emerald-300/20 bg-emerald-300/[.03]";
  return "border-white/10 bg-white/[.018]";
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

function SegmentCard({ metric }: { metric: OutreachPerformance }) {
  const Icon = metric.health === "paused" ? ShieldAlert : metric.health === "healthy" ? ShieldCheck : CheckCircle2;
  return (
    <article className={`border p-4 ${healthClass(metric)}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[9px] font-black uppercase tracking-[.14em] text-white/30">{metric.label}</p>
          <p className="mt-1 text-xl font-black text-white/82">{metric.sent} sent</p>
        </div>
        <Icon className={`size-4 ${metric.health === "paused" ? "text-red-200" : metric.health === "healthy" ? "text-emerald-200" : "text-white/35"}`} />
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <div className="border border-white/8 p-2"><div className="text-lg font-black text-white/75">{metric.bounceRate}%</div><div className="text-[8px] uppercase tracking-[.1em] text-white/25">bounce</div></div>
        <div className="border border-white/8 p-2"><div className="text-lg font-black text-white/75">{metric.replyRate}%</div><div className="text-[8px] uppercase tracking-[.1em] text-white/25">reply</div></div>
        <div className="border border-white/8 p-2"><div className="text-lg font-black text-white/75">{metric.followUps}</div><div className="text-[8px] uppercase tracking-[.1em] text-white/25">follow-ups</div></div>
      </div>
      <p className="mt-3 text-[10px] leading-4 text-white/40">{metric.decision}</p>
    </article>
  );
}

export function LeadStatusDashboard() {
  const [rows, setRows] = useState<LeadDashboardRow[]>([]);
  const [metrics, setMetrics] = useState<LeadDashboardMetrics | null>(null);
  const [safety, setSafety] = useState<OutreachSafetySnapshot | null>(null);
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
      setSafety(result.safety || null);
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
      return `${row.company} ${row.contactEmail} ${row.source} ${row.status} ${row.feed} ${row.pitchVersion || ""}`.toLowerCase().includes(term);
    });
  }, [rows, status, feed, search]);

  const emergency = safety?.global.health === "paused";

  return (
    <main className="min-h-screen bg-[#050505] px-3 py-5 text-[#f4efe3] sm:px-5 lg:px-7">
      <div className="mx-auto max-w-[1700px]">
        <header className="border border-white/10 bg-[#090807] p-5 sm:p-7">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="text-[9px] font-black uppercase tracking-[.2em] text-[#d7a45f]">Lead outcomes</div>
              <h1 className="mt-2 text-3xl font-black tracking-[-.05em] sm:text-5xl">Statuses, delivery & pitch tests</h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-white/45">Every active lead, exact-address verification state, segment-level delivery health, and pitch decision in one place.</p>
            </div>
            <button type="button" disabled={loading} onClick={() => void load()} className="inline-flex min-h-10 items-center gap-2 self-start border border-white/12 bg-white/[.035] px-3 py-2 text-xs font-bold text-white/65 disabled:opacity-40">
              <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} /> Refresh
            </button>
          </div>
          {message ? <div className="mt-4 border border-red-300/20 bg-red-300/[.05] p-3 text-xs text-red-200/80">{message}</div> : null}
        </header>

        {safety?.historicalQuarantined ? (
          <section className="mt-3 border border-orange-300/30 bg-orange-300/[.055] p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex gap-3">
                <AlertOctagon className="mt-0.5 size-6 shrink-0 text-orange-200" />
                <div>
                  <p className="text-sm font-black uppercase tracking-[.14em] text-orange-100">Historical campaign quarantined</p>
                  <p className="mt-2 max-w-4xl text-sm leading-6 text-orange-100/68">{safety.historicalWarning}</p>
                  <p className="mt-2 text-xs leading-5 text-orange-100/48">The legacy results stay visible below. New sends are evaluated only inside {safety.campaignId}, and every exact address must be verified first.</p>
                </div>
              </div>
              <div className="grid shrink-0 grid-cols-2 gap-2 text-center">
                <div className="border border-orange-200/15 px-4 py-2"><div className="text-2xl font-black text-orange-100">{safety.historical.bounceRate}%</div><div className="text-[9px] uppercase tracking-[.12em] text-orange-100/40">legacy bounce</div></div>
                <div className="border border-orange-200/15 px-4 py-2"><div className="text-2xl font-black text-orange-100">{safety.historical.replied}</div><div className="text-[9px] uppercase tracking-[.12em] text-orange-100/40">legacy replies</div></div>
              </div>
            </div>
          </section>
        ) : null}

        {emergency ? (
          <section className="mt-3 border border-red-300/35 bg-red-300/[.075] p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex gap-3">
                <AlertOctagon className="mt-0.5 size-6 shrink-0 text-red-200" />
                <div>
                  <p className="text-sm font-black uppercase tracking-[.14em] text-red-100">Sending paused</p>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-red-100/70">{safety?.blockReason}</p>
                  <p className="mt-2 text-xs leading-5 text-red-100/50">The API rejects new sends and scheduled follow-ups while the controlled campaign is over its safety threshold. Repair the source before resuming.</p>
                </div>
              </div>
              <div className="grid shrink-0 grid-cols-2 gap-2 text-center">
                <div className="border border-red-200/15 px-4 py-2"><div className="text-2xl font-black text-red-100">{safety?.global.bounceRate}%</div><div className="text-[9px] uppercase tracking-[.12em] text-red-100/40">bounce rate</div></div>
                <div className="border border-red-200/15 px-4 py-2"><div className="text-2xl font-black text-red-100">{safety?.global.bounced}</div><div className="text-[9px] uppercase tracking-[.12em] text-red-100/40">hard bounces</div></div>
              </div>
            </div>
          </section>
        ) : null}

        <section className="mt-3">
          <div className="mb-2 flex items-end justify-between gap-3"><div><div className="text-[9px] font-black uppercase tracking-[.15em] text-white/35">All-time lead and delivery record</div><div className="mt-1 text-xs text-white/25">Includes the quarantined historical campaign.</div></div></div>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-8">
          <Metric label="All leads" value={metrics?.total ?? "—"} />
          <Metric label="Verified" value={metrics?.verified ?? "—"} />
          <Metric label="Unverified" value={metrics?.unverified ?? "—"} />
          <Metric label="Emails sent" value={metrics?.sent ?? "—"} />
          <Metric label="Bounced" value={metrics?.bounced ?? "—"} note={metrics ? `${metrics.bounceRate}% bounce rate` : undefined} />
          <Metric label="Replied" value={metrics?.replied ?? "—"} note={metrics ? `${metrics.replyRate}% reply rate` : undefined} />
          <Metric label="Paused" value={metrics?.paused ?? "—"} />
          <Metric label="Follow-ups" value={metrics?.followUps ?? "—"} />
          </div>
        </section>

        {safety ? (
          <section className="mt-3">
            <div className="mb-2 flex items-end justify-between gap-3"><div><div className="text-[9px] font-black uppercase tracking-[.15em] text-emerald-200/55">Controlled campaign health</div><div className="mt-1 text-xs text-white/25">Only verified sends in {safety.campaignId} count toward these stop rules.</div></div><div className="text-[10px] text-white/25">{safety.global.sent} sent</div></div>
            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
            {(["website", "power-bi", "data-ops", "partners"] as const).map((segment) => <SegmentCard key={segment} metric={safety.segments[segment]} />)}
            </div>
          </section>
        ) : null}

        {safety?.pitches.length ? (
          <section className="mt-3 border border-white/10 bg-[#090807] p-4">
            <div className="flex items-end justify-between gap-3">
              <div><div className="text-[9px] font-black uppercase tracking-[.16em] text-[#d7a45f]">Pitch decisions</div><h2 className="mt-1 text-xl font-black text-white/82">Do not blend these results</h2></div>
              <div className="text-[10px] text-white/28">Each version is evaluated separately</div>
            </div>
            <div className="mt-4 overflow-x-auto">
              <div className="min-w-[820px]">
                <div className="grid grid-cols-[minmax(180px,1.4fr)_80px_90px_90px_90px_minmax(300px,2fr)] gap-3 border-b border-white/8 px-2 py-2 text-[9px] font-black uppercase tracking-[.12em] text-white/24">
                  <div>Pitch</div><div>Sent</div><div>Bounce</div><div>Reply</div><div>Health</div><div>Decision</div>
                </div>
                {safety.pitches.map((pitch) => (
                  <div key={pitch.key} className="grid grid-cols-[minmax(180px,1.4fr)_80px_90px_90px_90px_minmax(300px,2fr)] gap-3 border-b border-white/7 px-2 py-3 text-xs last:border-b-0">
                    <div className="font-mono text-white/64">{pitch.label}</div>
                    <div className="text-white/45">{pitch.sent}</div>
                    <div className={pitch.bounceRate > 3 ? "font-bold text-red-200" : "text-white/45"}>{pitch.bounceRate}%</div>
                    <div className="text-white/45">{pitch.replyRate}%</div>
                    <div className="uppercase text-white/42">{pitch.health}</div>
                    <div className="leading-5 text-white/38">{pitch.decision}</div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        ) : null}

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
              <div className="flex gap-2 overflow-x-auto">
                {feeds.map((item) => (
                  <button key={item.value} type="button" onClick={() => setFeed(item.value)} className={`shrink-0 border px-3 py-2 text-[10px] font-bold uppercase tracking-[.1em] ${feed === item.value ? "border-sky-300/30 bg-sky-300/[.07] text-sky-200" : "border-white/10 text-white/40"}`}>
                    {item.label}
                  </button>
                ))}
              </div>
              <label className="flex min-w-0 items-center gap-2 border border-white/10 bg-black/30 px-3 py-2 sm:min-w-72">
                <Search className="size-4 shrink-0 text-white/25" />
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search company, email, or pitch" className="min-w-0 flex-1 bg-transparent text-xs text-white/70 outline-none placeholder:text-white/20" />
              </label>
            </div>
          </div>
        </section>

        <div className="mt-3 border border-white/10 bg-[#090807]">
          <div className="hidden grid-cols-[minmax(200px,1.25fr)_minmax(210px,1.15fr)_100px_100px_120px_130px_145px] gap-3 border-b border-white/8 px-4 py-3 text-[9px] font-black uppercase tracking-[.12em] text-white/25 xl:grid">
            <div>Lead</div><div>Email</div><div>Segment</div><div>Status</div><div>Verification</div><div>Pitch</div><div>Last / next</div>
          </div>

          {loading ? <div className="p-10 text-center text-sm text-white/35">Loading lead statuses…</div> : null}
          {!loading && filtered.length === 0 ? <div className="p-10 text-center text-sm text-white/35">No leads match these filters.</div> : null}

          {!loading ? filtered.map((row) => (
            <article key={row.id} className="border-b border-white/8 p-4 last:border-b-0 xl:grid xl:grid-cols-[minmax(200px,1.25fr)_minmax(210px,1.15fr)_100px_100px_120px_130px_145px] xl:items-start xl:gap-3">
              <div className="min-w-0"><div className="break-words text-sm font-bold text-white/80">{row.company}</div><div className="mt-1 text-[10px] text-white/30">Score {row.score} · CRM {row.crmStatus}</div></div>
              <div className="mt-2 min-w-0 xl:mt-0"><div className="break-all text-xs text-white/55">{row.contactEmail || "No email"}</div>{row.suppressed ? <div className="mt-1 text-[10px] font-bold text-red-200/80">PERMANENTLY SUPPRESSED</div> : null}{row.lastBounceReason ? <div className="mt-1 text-[10px] leading-4 text-red-200/55">{row.lastBounceReason}</div> : null}</div>
              <div className="mt-3 text-[10px] font-bold uppercase tracking-[.1em] text-white/40 xl:mt-0">{feedLabel(row.feed)}</div>
              <div className="mt-2 xl:mt-0"><span className={`inline-block border px-2 py-1 text-[9px] font-black uppercase tracking-[.1em] ${statusClass(row.status)}`}>{row.status.replace("-", " ")}</span></div>
              <div className="mt-2 xl:mt-0"><span className={`inline-block border px-2 py-1 text-[9px] font-black uppercase tracking-[.1em] ${row.verificationStatus === "valid" ? "border-emerald-300/20 text-emerald-200/80" : row.verificationStatus === "invalid" ? "border-red-300/20 text-red-200/80" : "border-orange-300/18 text-orange-200/65"}`}>{row.verificationStatus}</span><div className="mt-1 text-[9px] text-white/25">{when(row.verifiedAt)}</div></div>
              <div className="mt-2 break-all font-mono text-[9px] leading-4 text-white/38 xl:mt-0">{row.pitchVersion || "unassigned"}</div>
              <div className="mt-3 text-[10px] leading-4 text-white/35 xl:mt-0">{row.lastBounceAt ? `Bounced ${when(row.lastBounceAt)}` : row.lastReplyAt ? `Replied ${when(row.lastReplyAt)}` : row.sentAt ? `Sent ${when(row.sentAt)}` : `Updated ${when(row.updatedAt)}`}<br />{row.nextFollowUpAt ? <><span className="text-[#efc37c]">Next {when(row.nextFollowUpAt)}</span></> : row.followUpCount ? `${row.followUpCount} follow-up${row.followUpCount === 1 ? "" : "s"}` : "No follow-up"}</div>
            </article>
          )) : null}
        </div>
      </div>
    </main>
  );
}
