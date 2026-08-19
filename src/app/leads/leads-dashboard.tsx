"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowUpRight,
  Check,
  Database,
  ExternalLink,
  Flame,
  Globe2,
  Link2,
  LockKeyhole,
  Mail,
  MapPin,
  Phone,
  Radar,
  RadioTower,
  RefreshCw,
  Search,
  ShieldCheck,
  Target,
  UserRound,
  Zap,
} from "lucide-react";
import type {
  LeadCollectorState,
  LeadOpportunity,
  LeadStatus,
} from "@/lib/leads/types";
import { OutreachPlaybook } from "./outreach-playbook";
import styles from "./leads.module.css";

const statusOptions: LeadStatus[] = [
  "new",
  "contacted",
  "replied",
  "meeting",
  "proposal",
  "won",
  "lost",
  "ignored",
];

type ScanResult = {
  id: string;
  label: string;
  status: "success" | "error" | "needs-setup" | "planned";
  stored?: number;
  qualified?: number;
  message?: string;
};

function relativeTime(value?: string) {
  if (!value) return "Never";
  const ms = Date.now() - new Date(value).getTime();
  const minutes = Math.max(1, Math.floor(ms / 60_000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function scoreTone(score: number) {
  if (score >= 85) return "border-[#ef2a26]/50 bg-[#ef2a26]/12 text-[#ff8f84]";
  if (score >= 70) return "border-[#d7a45f]/40 bg-[#d7a45f]/10 text-[#efc37c]";
  return "border-white/12 bg-white/[0.04] text-white/65";
}

function statusTone(status: LeadStatus) {
  if (status === "won") return "border-emerald-300/30 bg-emerald-300/10 text-emerald-200";
  if (["replied", "meeting", "proposal"].includes(status)) {
    return "border-[#d7a45f]/35 bg-[#d7a45f]/10 text-[#efc37c]";
  }
  if (["lost", "ignored"].includes(status)) {
    return "border-white/10 bg-white/[.025] text-white/40";
  }
  if (status === "contacted") return "border-sky-300/30 bg-sky-300/[.08] text-sky-200";
  return "border-[#ef2a26]/30 bg-[#ef2a26]/[.08] text-[#ff9288]";
}

function collectorTone(status: LeadCollectorState["status"]) {
  if (status === "ready") return "bg-emerald-300";
  if (status === "error") return "bg-[#ef2a26]";
  if (status === "needs-setup") return "bg-[#d7a45f]";
  return "bg-white/25";
}

function SourceIcon({ source }: { source: LeadOpportunity["source"] }) {
  if (source === "intent") return <RadioTower className="size-4" aria-hidden />;
  if (source === "new-business") return <Target className="size-4" aria-hidden />;
  if (source === "site-audit") return <Globe2 className="size-4" aria-hidden />;
  return <Activity className="size-4" aria-hidden />;
}

function Metric({
  label,
  value,
  note,
  hot = false,
}: {
  label: string;
  value: string | number;
  note: string;
  hot?: boolean;
}) {
  return (
    <div className={`${styles.cut} border border-white/10 bg-[#090807]/90 p-4 shadow-[0_25px_70px_rgba(0,0,0,.28)]`}>
      <p className="text-[9px] font-bold uppercase tracking-[.2em] text-white/30">{label}</p>
      <p className={`mt-2 text-3xl font-black tracking-[-.05em] ${hot ? "text-[#ff766b]" : "text-[#f5efe0]"}`}>{value}</p>
      <p className="mt-2 text-xs text-white/38">{note}</p>
    </div>
  );
}

function ActionLink({
  href,
  label,
  icon: Icon,
  primary = false,
}: {
  href: string;
  label: string;
  icon: typeof ExternalLink;
  primary?: boolean;
}) {
  return (
    <a
      href={href}
      target={href.startsWith("http") ? "_blank" : undefined}
      rel={href.startsWith("http") ? "noreferrer" : undefined}
      className={`inline-flex min-h-9 max-w-full items-center gap-2 break-all border px-3 py-2 text-[11px] font-semibold leading-5 transition ${
        primary
          ? "border-[#d7a45f]/35 bg-[#d7a45f]/[.08] text-[#efc37c] hover:bg-[#d7a45f]/[.13]"
          : "border-white/10 bg-white/[.025] text-white/60 hover:bg-white/[.055] hover:text-white/85"
      }`}
    >
      <Icon className="size-3.5 shrink-0" aria-hidden />
      <span className="min-w-0 break-all">{label}</span>
    </a>
  );
}

function ContactRow({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: typeof Mail;
  label: string;
  value?: string;
  href?: string;
}) {
  return (
    <div className="grid min-w-0 grid-cols-[20px_minmax(0,1fr)] gap-x-2 gap-y-1 border-b border-white/7 py-2.5 last:border-b-0 sm:grid-cols-[20px_82px_minmax(0,1fr)]">
      <Icon className="mt-0.5 size-4 text-[#d7a45f]/70" aria-hidden />
      <span className="text-[9px] font-bold uppercase tracking-[.13em] text-white/28">{label}</span>
      {value ? (
        href ? (
          <a
            href={href}
            target={href.startsWith("http") ? "_blank" : undefined}
            rel={href.startsWith("http") ? "noreferrer" : undefined}
            className="col-span-2 min-w-0 break-all text-xs leading-5 text-[#e8c487] underline decoration-[#d7a45f]/25 underline-offset-4 hover:text-[#f7d8a3] sm:col-span-1"
          >
            {value}
          </a>
        ) : (
          <span className="col-span-2 min-w-0 break-words text-xs leading-5 text-white/65 sm:col-span-1">{value}</span>
        )
      ) : (
        <span className="col-span-2 text-xs text-white/25 sm:col-span-1">Not found yet</span>
      )}
    </div>
  );
}

export function LeadsDashboard() {
  const [leads, setLeads] = useState<LeadOpportunity[]>([]);
  const [collectors, setCollectors] = useState<LeadCollectorState[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [query, setQuery] = useState("");
  const [view, setView] = useState<"overview" | "hot" | "intent" | "sources">("overview");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [scanning, setScanning] = useState(false);
  const [scanMessage, setScanMessage] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/leads?limit=250", {
        cache: "no-store",
        credentials: "same-origin",
      });
      const body = (await response.json()) as {
        leads?: LeadOpportunity[];
        collectors?: LeadCollectorState[];
        error?: string;
      };
      if (!response.ok) throw new Error(body.error || "Could not load lead data.");
      const nextLeads = Array.isArray(body.leads) ? body.leads : [];
      setLeads(nextLeads);
      setCollectors(Array.isArray(body.collectors) ? body.collectors : []);
      setSelectedId((current) =>
        current && nextLeads.some((lead) => lead.id === current)
          ? current
          : nextLeads[0]?.id || "",
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load lead data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const visibleLeads = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return leads
      .filter((lead) => {
        if (view === "hot" && lead.score < 85) return false;
        if (view === "intent" && lead.source !== "intent") return false;
        if (view === "sources") return false;
        if (!normalized) return true;
        return [
          lead.company,
          lead.location,
          lead.industry,
          lead.summary,
          lead.contactName,
          lead.contactEmail,
          lead.contactPhone,
          lead.website,
          ...lead.tags,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(normalized);
      })
      .sort(
        (a, b) =>
          b.score - a.score ||
          new Date(b.discoveredAt).getTime() - new Date(a.discoveredAt).getTime(),
      );
  }, [leads, query, view]);

  const selected = leads.find((lead) => lead.id === selectedId) || visibleLeads[0];
  const hotCount = leads.filter(
    (lead) => lead.score >= 85 && !["lost", "ignored"].includes(lead.status),
  ).length;
  const newCount = leads.filter((lead) => lead.status === "new").length;
  const intentCount = leads.filter((lead) => lead.source === "intent").length;

  async function runScan() {
    setScanning(true);
    setScanMessage("Scanning every configured source…");
    try {
      const response = await fetch("/api/leads/collect", {
        cache: "no-store",
        credentials: "same-origin",
      });
      const body = (await response.json()) as {
        stored?: number;
        results?: ScanResult[];
        error?: string;
      };
      if (!response.ok) throw new Error(body.error || "Multi-source collector failed.");

      const results = Array.isArray(body.results) ? body.results : [];
      const successCount = results.filter((result) => result.status === "success").length;
      const errorCount = results.filter((result) => result.status === "error").length;
      const setupCount = results.filter((result) => result.status === "needs-setup").length;
      const plannedCount = results.filter((result) => result.status === "planned").length;
      const details = results
        .filter((result) => result.status === "error" || result.status === "needs-setup")
        .map((result) => `${result.label}: ${result.message || result.status}`)
        .join(" · ");

      setScanMessage(
        `Scan finished · ${successCount} source${successCount === 1 ? "" : "s"} ran · ${body.stored ?? 0} stored` +
          (errorCount ? ` · ${errorCount} error${errorCount === 1 ? "" : "s"}` : "") +
          (setupCount ? ` · ${setupCount} need setup` : "") +
          (plannedCount ? ` · ${plannedCount} coming next` : "") +
          (details ? ` — ${details}` : ""),
      );
      await load();
    } catch (caught) {
      setScanMessage(caught instanceof Error ? caught.message : "Multi-source collector failed.");
    } finally {
      setScanning(false);
    }
  }

  async function updateStatus(status: LeadStatus) {
    if (!selected) return;
    const previous = selected.status;
    setLeads((current) =>
      current.map((lead) => (lead.id === selected.id ? { ...lead, status } : lead)),
    );
    try {
      const response = await fetch("/api/leads", {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selected.id, status }),
      });
      if (!response.ok) throw new Error("Status update failed.");
    } catch {
      setLeads((current) =>
        current.map((lead) =>
          lead.id === selected.id ? { ...lead, status: previous } : lead,
        ),
      );
    }
  }

  return (
    <div className={`${styles.shell} min-h-screen text-[#f4efe3]`}>
      <div className={styles.stars} aria-hidden />
      <div className="relative z-10 mx-auto max-w-[1920px] px-3 py-3 sm:px-5 sm:py-5 lg:px-7">
        <header className={`${styles.cut} relative overflow-hidden border border-white/10 bg-[#080706]/95 px-5 py-5 sm:px-7 lg:px-9`}>
          <div className={`${styles.radarRings} pointer-events-none absolute -left-14 -top-16 size-64 opacity-80`} aria-hidden />
          <div className="relative flex flex-col justify-between gap-5 md:flex-row md:items-center">
            <div className="md:pl-20">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2 border border-[#d7a45f]/30 bg-[#d7a45f]/[.07] px-2.5 py-1 text-[9px] font-bold uppercase tracking-[.2em] text-[#e9ba72]">
                  <LockKeyhole className="size-3" aria-hidden /> Private signal room
                </span>
                <span className="inline-flex items-center gap-2 border border-emerald-300/20 bg-emerald-300/[.06] px-2.5 py-1 text-[9px] font-bold uppercase tracking-[.18em] text-emerald-200">
                  <span className="size-1.5 rounded-full bg-emerald-300 shadow-[0_0_12px_rgba(110,231,183,.8)]" /> Live database
                </span>
                <span className="inline-flex items-center gap-2 border border-[#d7a45f]/20 bg-[#d7a45f]/[.04] px-2.5 py-1 text-[9px] font-bold uppercase tracking-[.18em] text-[#e9ba72]">
                  <Mail className="size-3" aria-hidden /> Data-backed outreach
                </span>
              </div>
              <h1 className="mt-3 text-[clamp(2.4rem,7vw,5rem)] font-black uppercase leading-[.88] tracking-[-.07em]">
                <span className="text-[#f2eee2]">Rukh</span> <span className="text-[#d7a45f]">Leads</span>
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-white/48 sm:text-base">
                Nationwide website lead intelligence with ranked opportunities, verified contact paths, and per-lead outreach sequences built from large-scale cold-email research.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button onClick={() => void load()} disabled={loading} className="inline-flex min-h-11 items-center gap-2 border border-white/12 bg-white/[.035] px-4 py-2 text-xs font-bold uppercase tracking-[.12em] text-white/65 hover:bg-white/[.06] disabled:opacity-50">
                <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} aria-hidden /> Refresh
              </button>
              <button onClick={() => void runScan()} disabled={scanning} className="inline-flex min-h-11 items-center gap-2 border border-[#ef2a26]/45 bg-[#ef2a26]/12 px-4 py-2 text-xs font-bold uppercase tracking-[.12em] text-[#ff9288] hover:bg-[#ef2a26]/18 disabled:opacity-50">
                <Zap className={`size-4 ${scanning ? "animate-pulse" : ""}`} aria-hidden /> {scanning ? "Scanning all" : "Scan all sources"}
              </button>
            </div>
          </div>
          {scanMessage ? <p className="relative mt-4 break-words border border-[#d7a45f]/20 bg-[#d7a45f]/[.05] px-4 py-3 text-xs leading-5 text-[#efd09b] md:ml-20">{scanMessage}</p> : null}
        </header>

        <section className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Metric label="Active leads" value={leads.length} note="Stored opportunities" />
          <Metric label="Hot right now" value={hotCount} note="Score 85 or higher" hot />
          <Metric label="New queue" value={newCount} note="Not yet contacted" />
          <Metric label="Intent hits" value={intentCount} note="Explicit public asks" />
        </section>

        <div className="mt-3 grid min-w-0 gap-3 lg:grid-cols-[230px_minmax(0,1fr)]">
          <aside className={`${styles.cut} h-fit border border-white/10 bg-[#090807]/95 p-3 lg:sticky lg:top-3`}>
            <p className="px-3 pb-3 pt-2 text-[9px] font-bold uppercase tracking-[.22em] text-white/28">Operations</p>
            {([
              ["overview", "Overview", Activity],
              ["hot", "Hot leads", Flame],
              ["intent", "Intent signals", RadioTower],
              ["sources", "Sources", Database],
            ] as const).map(([id, label, Icon]) => (
              <button key={id} onClick={() => setView(id)} className={`mb-1 flex w-full items-center gap-3 border px-3 py-3 text-left text-sm font-semibold transition ${view === id ? "border-[#d7a45f]/35 bg-[#d7a45f]/[.08] text-white" : "border-transparent text-white/48 hover:border-white/8 hover:bg-white/[.025] hover:text-white/75"}`}>
                <Icon className={`size-4 ${view === id ? "text-[#e6b66e]" : "text-white/30"}`} aria-hidden /> {label}
              </button>
            ))}
            <div className="mt-5 border-t border-white/8 px-3 pt-4">
              <div className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-[.18em] text-emerald-200/70"><ShieldCheck className="size-4" aria-hidden /> Protected</div>
              <p className="mt-2 text-[11px] leading-5 text-white/28">Server-side credentials protect this route and every lead API endpoint.</p>
            </div>
            <div className="mt-5 grid place-items-center border-t border-white/8 pt-5">
              <div className={`${styles.miniRadar} relative size-36 rounded-full border border-[#ef2a26]/45`}>
                <span className="absolute left-[27%] top-[33%] size-2 rounded-full bg-[#d7a45f]" />
                <span className="absolute right-[27%] top-[47%] size-1.5 rounded-full bg-[#f4efe3]" />
                <span className="absolute bottom-[28%] left-[48%] size-2 rounded-full bg-[#ef2a26] shadow-[0_0_12px_rgba(239,42,38,.8)]" />
                <div className="absolute inset-0 grid place-items-center text-center"><div><Radar className="mx-auto size-5 text-[#ef2a26]"/><p className="mt-1 text-xl font-black">{hotCount}</p><p className="text-[8px] uppercase tracking-[.2em] text-white/30">hot</p></div></div>
              </div>
            </div>
          </aside>

          <main className="min-w-0">
            {view === "sources" ? (
              <section className={`${styles.cut} border border-white/10 bg-[#090807]/95 p-5 sm:p-6`}>
                <div className="flex flex-col gap-3 border-b border-white/8 pb-4 sm:flex-row sm:items-end sm:justify-between">
                  <div><p className="text-[9px] font-bold uppercase tracking-[.2em] text-[#d7a45f]">Collector network</p><h2 className="mt-2 text-2xl font-black tracking-[-.04em]">Sources & automation</h2></div>
                  <button onClick={() => void runScan()} disabled={scanning} className="border border-[#ef2a26]/40 bg-[#ef2a26]/10 px-3 py-2 text-xs font-bold text-[#ff9288]">Scan all sources</button>
                </div>
                <div className="mt-4 grid gap-3 xl:grid-cols-2">
                  {collectors.map((collector) => (
                    <div key={collector.id} className="border border-white/9 bg-black/20 p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div><div className="flex items-center gap-2"><span className={`size-2 rounded-full ${collectorTone(collector.status)}`} /><h3 className="font-semibold text-white/85">{collector.name}</h3></div><p className="mt-2 text-sm leading-6 text-white/42">{collector.description}</p></div>
                        <span className="border border-white/10 px-2 py-1 text-[9px] uppercase tracking-[.16em] text-white/38">{collector.status}</span>
                      </div>
                      <div className="mt-4 grid grid-cols-2 gap-3 border-t border-white/7 pt-3 text-xs text-white/38"><div><span className="block text-[8px] uppercase tracking-[.15em] text-white/24">Cadence</span><span className="mt-1 block">{collector.cadence}</span></div><div><span className="block text-[8px] uppercase tracking-[.15em] text-white/24">Last success</span><span className="mt-1 block">{relativeTime(collector.lastSuccess)}</span></div></div>
                      {collector.lastError ? <p className="mt-3 break-words text-xs text-[#ff8177]">{collector.lastError}</p> : null}
                    </div>
                  ))}
                </div>
              </section>
            ) : (
              <section className="grid min-w-0 gap-3 2xl:grid-cols-[minmax(0,1fr)_540px]">
                <div className={`${styles.cut} min-w-0 border border-white/10 bg-[#090807]/95`}>
                  <div className="flex flex-col gap-3 border-b border-white/8 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div><p className="text-[9px] font-bold uppercase tracking-[.2em] text-[#d7a45f]">Ranked queue</p><h2 className="mt-1 text-xl font-black tracking-[-.03em]">{view === "hot" ? "Highest-priority leads" : view === "intent" ? "Public intent leads" : "Best current opportunities"}</h2></div>
                    <label className="flex min-h-10 min-w-0 items-center gap-2 border border-white/10 bg-black/30 px-3 sm:w-72"><Search className="size-4 shrink-0 text-white/25" aria-hidden /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search leads, contacts, websites" className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/22" /></label>
                  </div>

                  {error ? <div className="m-4 border border-[#ef2a26]/30 bg-[#ef2a26]/8 p-4 text-sm text-[#ff9a91]">{error}</div> : null}
                  {!loading && !error && visibleLeads.length === 0 ? (
                    <div className="px-6 py-20 text-center"><Target className="mx-auto size-9 text-white/22"/><h3 className="mt-4 text-lg font-semibold">No leads in this queue yet.</h3><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-white/38">Run a multi-source scan. As each collector finds qualifying opportunities, they will appear here automatically.</p></div>
                  ) : null}

                  <div className="divide-y divide-white/7">
                    {visibleLeads.map((lead) => (
                      <article key={lead.id} className={`${selected?.id === lead.id ? "bg-[#d7a45f]/[.06]" : "hover:bg-white/[.018]"} p-4 transition`}>
                        <button onClick={() => setSelectedId(lead.id)} className="grid w-full gap-3 text-left sm:grid-cols-[64px_minmax(0,1fr)_auto]">
                          <div className={`grid h-14 w-14 place-items-center border text-lg font-black ${scoreTone(lead.score)}`}>{lead.score}</div>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="inline-flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[.15em] text-[#e1b36d]"><SourceIcon source={lead.source}/>{lead.sourceLabel}</span>
                              <span className={`border px-2 py-0.5 text-[8px] font-bold uppercase tracking-[.13em] ${statusTone(lead.status)}`}>{lead.status}</span>
                              <span className="inline-flex items-center gap-1 border border-[#d7a45f]/15 bg-[#d7a45f]/[.035] px-2 py-0.5 text-[8px] font-bold uppercase tracking-[.12em] text-[#dfb36f]"><Mail className="size-2.5" /> email playbook</span>
                            </div>
                            <h3 className="mt-2 break-words text-base font-semibold leading-6 text-white/88">{lead.company}</h3>
                            <p className="mt-1 whitespace-normal break-words text-xs leading-5 text-white/45">{lead.summary}</p>
                            <p className="mt-2 flex flex-wrap items-center gap-1.5 text-[10px] text-white/28"><MapPin className="size-3" aria-hidden />{lead.location}<span>·</span>{lead.industry}<span>·</span>{relativeTime(lead.discoveredAt)}</p>
                          </div>
                          <div className="hidden self-start text-right sm:block"><p className="text-[9px] uppercase tracking-[.15em] text-white/22">Priority</p><p className={`mt-1 text-xs font-bold uppercase ${lead.score >= 85 ? "text-[#ff766b]" : "text-[#e3b46c]"}`}>{lead.priority}</p></div>
                        </button>
                        <div className="mt-3 flex flex-wrap gap-2 sm:ml-[76px]">
                          {lead.website ? <ActionLink href={lead.website} label="Website" icon={Globe2} primary /> : null}
                          {lead.contactEmail ? <ActionLink href={`mailto:${lead.contactEmail}`} label={lead.contactEmail} icon={Mail} /> : null}
                          {lead.contactPhone ? <ActionLink href={`tel:${lead.contactPhone}`} label={lead.contactPhone} icon={Phone} /> : null}
                          {lead.contactUrl && lead.contactUrl !== lead.sourceUrl ? <ActionLink href={lead.contactUrl} label="Contact page" icon={Link2} /> : null}
                          {lead.sourceUrl ? <ActionLink href={lead.sourceUrl} label="Source" icon={ExternalLink} /> : null}
                          <button onClick={() => setSelectedId(lead.id)} className="inline-flex min-h-9 items-center gap-2 border border-white/10 bg-white/[.025] px-3 py-2 text-[11px] font-semibold text-white/55 hover:bg-white/[.055] hover:text-white/85">Full details <ArrowUpRight className="size-3.5" aria-hidden /></button>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>

                <aside className={`${styles.cut} h-fit max-h-none overflow-visible border border-white/10 bg-[#090807]/95 p-5 2xl:sticky 2xl:top-3 2xl:max-h-[calc(100vh-1.5rem)] 2xl:overflow-y-auto`}>
                  {selected ? (
                    <>
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0"><p className="text-[9px] font-bold uppercase tracking-[.18em] text-[#d7a45f]">Lead detail</p><h2 className="mt-2 break-words text-xl font-black leading-7 tracking-[-.035em]">{selected.company}</h2><p className="mt-1 text-xs leading-5 text-white/35">{selected.location} · {selected.industry}</p></div>
                        <div className={`grid size-14 shrink-0 place-items-center border text-xl font-black ${scoreTone(selected.score)}`}>{selected.score}</div>
                      </div>

                      <p className="mt-4 whitespace-normal break-words text-sm leading-6 text-white/52">{selected.summary}</p>

                      <div className="mt-5 border border-white/9 bg-black/20 p-3">
                        <div className="mb-1 flex items-center justify-between gap-3"><p className="text-[9px] font-bold uppercase tracking-[.18em] text-[#d7a45f]">Contact & links</p><span className="text-[9px] text-white/22">Click any available item</span></div>
                        <ContactRow icon={UserRound} label="Contact" value={selected.contactName} />
                        <ContactRow icon={Mail} label="Email" value={selected.contactEmail} href={selected.contactEmail ? `mailto:${selected.contactEmail}` : undefined} />
                        <ContactRow icon={Phone} label="Phone" value={selected.contactPhone} href={selected.contactPhone ? `tel:${selected.contactPhone}` : undefined} />
                        <ContactRow icon={Globe2} label="Website" value={selected.website} href={selected.website} />
                        <ContactRow icon={Link2} label="Contact URL" value={selected.contactUrl} href={selected.contactUrl} />
                        <ContactRow icon={ExternalLink} label="Source" value={selected.sourceUrl} href={selected.sourceUrl} />
                      </div>

                      <div className="mt-5"><p className="text-[8px] font-bold uppercase tracking-[.18em] text-white/25">Why it scored</p><ul className="mt-2 space-y-2">{selected.signals.map((signal) => <li key={signal} className="flex gap-2 text-xs leading-5 text-white/52"><Check className="mt-0.5 size-3.5 shrink-0 text-emerald-200/70" aria-hidden /><span className="break-words">{signal}</span></li>)}</ul></div>

                      {selected.risks.length ? <div className="mt-5"><p className="text-[8px] font-bold uppercase tracking-[.18em] text-white/25">Risks / verify first</p><ul className="mt-2 space-y-2">{selected.risks.map((risk) => <li key={risk} className="break-words text-xs leading-5 text-[#e9b36b]/75">• {risk}</li>)}</ul></div> : null}

                      {selected.audit ? (
                        <div className="mt-5 border-t border-white/8 pt-4">
                          <p className="text-[8px] font-bold uppercase tracking-[.18em] text-white/25">Website audit</p>
                          <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-white/48">
                            {typeof selected.audit.https === "boolean" ? <div className="border border-white/8 bg-black/20 p-2"><span className="block text-[8px] uppercase tracking-[.12em] text-white/24">HTTPS</span>{selected.audit.https ? "Yes" : "No"}</div> : null}
                            {typeof selected.audit.mobile === "number" ? <div className="border border-white/8 bg-black/20 p-2"><span className="block text-[8px] uppercase tracking-[.12em] text-white/24">Mobile</span>{selected.audit.mobile}/100</div> : null}
                            {typeof selected.audit.seo === "number" ? <div className="border border-white/8 bg-black/20 p-2"><span className="block text-[8px] uppercase tracking-[.12em] text-white/24">SEO</span>{selected.audit.seo}/100</div> : null}
                            {typeof selected.audit.accessibility === "number" ? <div className="border border-white/8 bg-black/20 p-2"><span className="block text-[8px] uppercase tracking-[.12em] text-white/24">Accessibility</span>{selected.audit.accessibility}/100</div> : null}
                            {typeof selected.audit.performance === "number" ? <div className="border border-white/8 bg-black/20 p-2"><span className="block text-[8px] uppercase tracking-[.12em] text-white/24">Performance</span>{selected.audit.performance}/100</div> : null}
                            {selected.audit.contactForm ? <div className="border border-white/8 bg-black/20 p-2"><span className="block text-[8px] uppercase tracking-[.12em] text-white/24">Contact form</span>{selected.audit.contactForm}</div> : null}
                          </div>
                        </div>
                      ) : null}

                      <OutreachPlaybook lead={selected} />

                      <div className="mt-5 grid gap-2 sm:grid-cols-2"><label className="border border-white/10 bg-black/25 px-3 py-2"><span className="block text-[8px] uppercase tracking-[.15em] text-white/24">Pipeline status</span><select value={selected.status} onChange={(event) => void updateStatus(event.target.value as LeadStatus)} className="mt-1 w-full bg-transparent text-xs text-white/70 outline-none">{statusOptions.map((status) => <option key={status} value={status} className="bg-[#090807]">{status}</option>)}</select></label>{selected.website ? <ActionLink href={selected.website} label="Open website" icon={Globe2} primary /> : selected.sourceUrl ? <ActionLink href={selected.sourceUrl} label="Open source" icon={ExternalLink} primary /> : null}</div>
                    </>
                  ) : <div className="py-16 text-center text-sm text-white/35">Select a lead to inspect it.</div>}
                </aside>
              </section>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
