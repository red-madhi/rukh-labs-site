"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowUpRight,
  BriefcaseBusiness,
  Check,
  Clipboard,
  Database,
  ExternalLink,
  Flame,
  Link2,
  Mail,
  MapPin,
  Phone,
  Radar,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  UserRound,
  Zap,
} from "lucide-react";
import type { LeadCollectorState, LeadOpportunity, LeadStatus } from "@/lib/leads/types";
import styles from "../leads.module.css";

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
  status: "success" | "error" | "needs-setup";
  seen?: number;
  qualified?: number;
  stored?: number;
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
  if (score >= 90) return "border-[#ef2a26]/50 bg-[#ef2a26]/12 text-[#ff8f84]";
  if (score >= 80) return "border-sky-300/35 bg-sky-300/[.08] text-sky-200";
  return "border-[#d7a45f]/40 bg-[#d7a45f]/10 text-[#efc37c]";
}

function statusTone(status: LeadStatus) {
  if (status === "won") return "border-emerald-300/30 bg-emerald-300/10 text-emerald-200";
  if (["replied", "meeting", "proposal"].includes(status)) return "border-[#d7a45f]/35 bg-[#d7a45f]/10 text-[#efc37c]";
  if (["lost", "ignored"].includes(status)) return "border-white/10 bg-white/[.025] text-white/40";
  if (status === "contacted") return "border-sky-300/30 bg-sky-300/[.08] text-sky-200";
  return "border-[#ef2a26]/30 bg-[#ef2a26]/[.08] text-[#ff9288]";
}

function collectorTone(status: LeadCollectorState["status"]) {
  if (status === "ready") return "bg-emerald-300";
  if (status === "error") return "bg-[#ef2a26]";
  if (status === "needs-setup") return "bg-[#d7a45f]";
  return "bg-white/25";
}

function Metric({ label, value, note, hot = false }: { label: string; value: string | number; note: string; hot?: boolean }) {
  return (
    <div className={`${styles.cut} border border-white/10 bg-[#090807]/90 p-4`}>
      <p className="text-[9px] font-bold uppercase tracking-[.18em] text-white/30">{label}</p>
      <p className={`mt-2 text-3xl font-black tracking-[-.05em] ${hot ? "text-[#ff766b]" : "text-[#f5efe0]"}`}>{value}</p>
      <p className="mt-2 break-words text-xs leading-5 text-white/38">{note}</p>
    </div>
  );
}

function ActionLink({ href, label, icon: Icon, primary = false }: { href: string; label: string; icon: typeof ExternalLink; primary?: boolean }) {
  return (
    <a
      href={href}
      target={href.startsWith("http") ? "_blank" : undefined}
      rel={href.startsWith("http") ? "noreferrer" : undefined}
      className={`inline-flex min-h-10 max-w-full items-center gap-2 break-all border px-3 py-2 text-[11px] font-semibold leading-5 transition ${
        primary
          ? "border-sky-300/30 bg-sky-300/[.08] text-sky-200 hover:bg-sky-300/[.13]"
          : "border-white/10 bg-white/[.025] text-white/60 hover:bg-white/[.055] hover:text-white/85"
      }`}
    >
      <Icon className="size-3.5 shrink-0" aria-hidden />
      <span className="min-w-0 break-all">{label}</span>
    </a>
  );
}

function ContactRow({ icon: Icon, label, value, href }: { icon: typeof Mail; label: string; value?: string; href?: string }) {
  return (
    <div className="grid min-w-0 grid-cols-[20px_minmax(0,1fr)] gap-x-2 gap-y-1 border-b border-white/7 py-2.5 last:border-b-0 sm:grid-cols-[20px_82px_minmax(0,1fr)]">
      <Icon className="mt-0.5 size-4 text-sky-200/70" aria-hidden />
      <span className="text-[9px] font-bold uppercase tracking-[.13em] text-white/28">{label}</span>
      {value ? (
        href ? (
          <a href={href} target={href.startsWith("http") ? "_blank" : undefined} rel={href.startsWith("http") ? "noreferrer" : undefined} className="col-span-2 min-w-0 break-all text-xs leading-5 text-sky-200 underline decoration-sky-300/20 underline-offset-4 sm:col-span-1">
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

function opportunityType(lead: LeadOpportunity) {
  if (lead.tags.includes("direct ask")) return "Direct ask";
  if (lead.tags.includes("rfp") || lead.tags.includes("procurement") || lead.tags.includes("sam.gov")) return "Procurement";
  if (lead.tags.includes("proactive signal") || lead.tags.includes("proactive opportunity")) return "Proactive";
  return "Opportunity";
}

export function PowerBiGigsDashboard() {
  const [leads, setLeads] = useState<LeadOpportunity[]>([]);
  const [collectors, setCollectors] = useState<LeadCollectorState[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [query, setQuery] = useState("");
  const [view, setView] = useState<"gigs" | "sources">("gigs");
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState("");
  const [scanMessage, setScanMessage] = useState("");
  const [copied, setCopied] = useState(false);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/leads?feed=power-bi&limit=250", { cache: "no-store", credentials: "same-origin" });
      const body = (await response.json()) as { leads?: LeadOpportunity[]; collectors?: LeadCollectorState[]; error?: string };
      if (!response.ok) throw new Error(body.error || "Could not load Power BI gigs.");
      const nextLeads = Array.isArray(body.leads) ? body.leads : [];
      setLeads(nextLeads);
      setCollectors(Array.isArray(body.collectors) ? body.collectors : []);
      setSelectedId((current) => current && nextLeads.some((lead) => lead.id === current) ? current : nextLeads[0]?.id || "");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load Power BI gigs.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  const visibleLeads = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return leads
      .filter((lead) => !normalized || [lead.company, lead.summary, lead.location, ...lead.tags].join(" ").toLowerCase().includes(normalized))
      .sort((a, b) => b.score - a.score || new Date(b.discoveredAt).getTime() - new Date(a.discoveredAt).getTime());
  }, [leads, query]);

  const selected = leads.find((lead) => lead.id === selectedId) || visibleLeads[0];
  const freshCount = leads.filter((lead) => Date.now() - new Date(lead.discoveredAt).getTime() <= 24 * 60 * 60 * 1000).length;
  const directCount = leads.filter((lead) => lead.tags.includes("direct ask")).length;
  const proactiveCount = leads.filter((lead) => lead.tags.some((tag) => ["proactive signal", "proactive opportunity", "procurement", "rfp", "sam.gov"].includes(tag))).length;
  const hotCount = leads.filter((lead) => lead.score >= 85 && !["lost", "ignored"].includes(lead.status)).length;

  async function runScan() {
    setScanning(true);
    setScanMessage("Scanning fresh public Power BI signals, RFPs, and federal opportunities…");
    try {
      const response = await fetch("/api/leads/collect/power-bi", { cache: "no-store", credentials: "same-origin" });
      const body = (await response.json()) as { stored?: number; qualified?: number; results?: ScanResult[]; error?: string };
      if (!response.ok) throw new Error(body.error || "Power BI scan failed.");
      const results = Array.isArray(body.results) ? body.results : [];
      const success = results.filter((result) => result.status === "success").length;
      const setup = results.filter((result) => result.status === "needs-setup").length;
      const failures = results.filter((result) => result.status === "error").length;
      setScanMessage(`Scan finished · ${success} sources ran · ${body.qualified ?? 0} qualified · ${body.stored ?? 0} stored${setup ? ` · ${setup} need setup` : ""}${failures ? ` · ${failures} errors` : ""}`);
      await load();
    } catch (caught) {
      setScanMessage(caught instanceof Error ? caught.message : "Power BI scan failed.");
    } finally {
      setScanning(false);
    }
  }

  async function updateStatus(status: LeadStatus) {
    if (!selected) return;
    const previous = selected.status;
    setLeads((current) => current.map((lead) => lead.id === selected.id ? { ...lead, status } : lead));
    try {
      const response = await fetch("/api/leads", {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selected.id, status }),
      });
      if (!response.ok) throw new Error("Status update failed.");
    } catch {
      setLeads((current) => current.map((lead) => lead.id === selected.id ? { ...lead, status: previous } : lead));
    }
  }

  async function copyPitch() {
    if (!selected) return;
    await navigator.clipboard.writeText(selected.pitch);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className={`${styles.shell} min-h-screen text-[#f4efe3]`}>
      <div className={styles.stars} aria-hidden />
      <div className="relative z-10 mx-auto max-w-[1920px] px-3 py-3 sm:px-5 sm:py-5 lg:px-7">
        <header className={`${styles.cut} border border-white/10 bg-[#080706]/95 p-5 sm:p-7`}>
          <div className="flex min-w-0 flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-2 border border-sky-300/25 bg-sky-300/[.06] px-2.5 py-1 text-[9px] font-bold uppercase tracking-[.18em] text-sky-200"><BriefcaseBusiness className="size-3" /> Separate freelance feed</span>
                <span className="inline-flex items-center gap-2 border border-emerald-300/20 bg-emerald-300/[.06] px-2.5 py-1 text-[9px] font-bold uppercase tracking-[.18em] text-emerald-200"><span className="size-1.5 rounded-full bg-emerald-300" /> Low-saturation focus</span>
              </div>
              <h1 className="mt-3 break-words text-[clamp(2.2rem,8vw,4.8rem)] font-black uppercase leading-[.9] tracking-[-.06em]"><span className="text-[#f2eee2]">Power BI</span> <span className="text-sky-300">Gigs</span></h1>
              <p className="mt-3 max-w-3xl break-words text-sm leading-6 text-white/48 sm:text-base">Fresh public asks, direct social posts, Power BI/Fabric migration signals, RFPs and federal BI opportunities. Normal saturated job-board listings are deliberately excluded.</p>
            </div>
            <div className="flex min-w-0 flex-col gap-2 sm:flex-row">
              <button onClick={() => void load()} disabled={loading} className="inline-flex min-h-11 items-center justify-center gap-2 border border-white/12 bg-white/[.035] px-4 py-2 text-xs font-bold uppercase tracking-[.1em] text-white/65"><RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} /> Refresh</button>
              <button onClick={() => void runScan()} disabled={scanning} className="inline-flex min-h-11 items-center justify-center gap-2 border border-sky-300/35 bg-sky-300/[.08] px-4 py-2 text-xs font-bold uppercase tracking-[.1em] text-sky-200"><Zap className={`size-4 ${scanning ? "animate-pulse" : ""}`} /> {scanning ? "Scanning" : "Scan Power BI sources"}</button>
            </div>
          </div>
          {scanMessage ? <p className="mt-4 break-words border border-sky-300/20 bg-sky-300/[.04] px-4 py-3 text-xs leading-5 text-sky-100/75">{scanMessage}</p> : null}
        </header>

        <section className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Metric label="Active gigs" value={leads.length} note="Separate from website leads" />
          <Metric label="Fresh <24h" value={freshCount} note="Extreme-fresh public signals" hot={freshCount > 0} />
          <Metric label="Direct asks" value={directCount} note="Someone publicly asking for BI help" />
          <Metric label="Proactive / RFP" value={proactiveCount} note="Migration signals and procurement" />
        </section>

        <div className="mt-3 grid min-w-0 gap-3 lg:grid-cols-[210px_minmax(0,1fr)]">
          <aside className={`${styles.cut} h-fit border border-white/10 bg-[#090807]/95 p-3 lg:sticky lg:top-3`}>
            <p className="px-3 pb-3 pt-2 text-[9px] font-bold uppercase tracking-[.2em] text-white/28">Power BI feed</p>
            <button onClick={() => setView("gigs")} className={`mb-1 flex w-full items-center gap-3 border px-3 py-3 text-left text-sm font-semibold ${view === "gigs" ? "border-sky-300/30 bg-sky-300/[.07] text-white" : "border-transparent text-white/48"}`}><Sparkles className="size-4 text-sky-200/70" /> Opportunities</button>
            <button onClick={() => setView("sources")} className={`mb-1 flex w-full items-center gap-3 border px-3 py-3 text-left text-sm font-semibold ${view === "sources" ? "border-sky-300/30 bg-sky-300/[.07] text-white" : "border-transparent text-white/48"}`}><Database className="size-4 text-sky-200/70" /> Sources</button>
            <div className="mt-5 border-t border-white/8 px-3 pt-4">
              <div className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-[.15em] text-emerald-200/70"><ShieldCheck className="size-4" /> Filtered</div>
              <p className="mt-2 break-words text-[11px] leading-5 text-white/28">Job boards, staffing spam, generic full-time openings and freelance marketplaces are rejected before storage.</p>
            </div>
            <div className="mt-5 border-t border-white/8 px-3 pt-4"><p className="text-[8px] uppercase tracking-[.16em] text-white/25">Hot opportunities</p><p className="mt-1 text-3xl font-black text-[#ff766b]">{hotCount}</p></div>
          </aside>

          <main className="min-w-0">
            {view === "sources" ? (
              <section className={`${styles.cut} border border-white/10 bg-[#090807]/95 p-4 sm:p-6`}>
                <div><p className="text-[9px] font-bold uppercase tracking-[.18em] text-sky-300">Collector network</p><h2 className="mt-2 break-words text-2xl font-black">Power BI sources</h2></div>
                <div className="mt-4 grid gap-3 xl:grid-cols-2">
                  {collectors.map((collector) => (
                    <div key={collector.id} className="min-w-0 border border-white/9 bg-black/20 p-4">
                      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0"><div className="flex min-w-0 items-start gap-2"><span className={`mt-1.5 size-2 shrink-0 rounded-full ${collectorTone(collector.status)}`} /><h3 className="min-w-0 break-words font-semibold text-white/85">{collector.name}</h3></div><p className="mt-2 break-words text-sm leading-6 text-white/42">{collector.description}</p></div>
                        <span className="self-start break-words border border-white/10 px-2 py-1 text-[9px] uppercase tracking-[.12em] text-white/38">{collector.status}</span>
                      </div>
                      <div className="mt-4 grid gap-3 border-t border-white/7 pt-3 text-xs text-white/38 sm:grid-cols-2"><div><span className="block text-[8px] uppercase tracking-[.13em] text-white/24">Cadence</span><span className="mt-1 block break-words">{collector.cadence}</span></div><div><span className="block text-[8px] uppercase tracking-[.13em] text-white/24">Last success</span><span className="mt-1 block break-words">{relativeTime(collector.lastSuccess)}</span></div></div>
                      {collector.lastError ? <p className="mt-3 break-words text-xs leading-5 text-[#ff8177]">{collector.lastError}</p> : null}
                    </div>
                  ))}
                </div>
              </section>
            ) : (
              <section className="grid min-w-0 gap-3 2xl:grid-cols-[minmax(0,1fr)_500px]">
                <div className={`${styles.cut} min-w-0 border border-white/10 bg-[#090807]/95`}>
                  <div className="flex min-w-0 flex-col gap-3 border-b border-white/8 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0"><p className="text-[9px] font-bold uppercase tracking-[.18em] text-sky-300">Ranked feed</p><h2 className="mt-1 break-words text-xl font-black">Best current Power BI opportunities</h2></div>
                    <label className="flex min-h-10 min-w-0 items-center gap-2 border border-white/10 bg-black/30 px-3 sm:w-72"><Search className="size-4 shrink-0 text-white/25" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search gigs" className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/22" /></label>
                  </div>
                  {error ? <div className="m-4 break-words border border-[#ef2a26]/30 bg-[#ef2a26]/8 p-4 text-sm leading-6 text-[#ff9a91]">{error}</div> : null}
                  {!loading && !error && visibleLeads.length === 0 ? <div className="px-5 py-16 text-center"><Radar className="mx-auto size-9 text-white/22" /><h3 className="mt-4 text-lg font-semibold">No qualifying Power BI gigs yet.</h3><p className="mx-auto mt-2 max-w-lg break-words text-sm leading-6 text-white/38">That means the filters are doing their job. This feed intentionally ignores ordinary job boards and waits for fresh public asks, proactive migration signals, or procurement work.</p></div> : null}
                  <div className="divide-y divide-white/7">
                    {visibleLeads.map((lead) => (
                      <article key={lead.id} className={`${selected?.id === lead.id ? "bg-sky-300/[.045]" : "hover:bg-white/[.018]"} min-w-0 p-4`}>
                        <button onClick={() => setSelectedId(lead.id)} className="grid min-w-0 w-full gap-3 text-left sm:grid-cols-[64px_minmax(0,1fr)_auto]">
                          <div className={`grid h-14 w-14 place-items-center border text-lg font-black ${scoreTone(lead.score)}`}>{lead.score}</div>
                          <div className="min-w-0">
                            <div className="flex min-w-0 flex-wrap items-center gap-2"><span className="break-words text-[9px] font-bold uppercase tracking-[.13em] text-sky-200">{opportunityType(lead)}</span><span className={`border px-2 py-0.5 text-[8px] font-bold uppercase tracking-[.11em] ${statusTone(lead.status)}`}>{lead.status}</span>{lead.tags.includes("extreme fresh") ? <span className="border border-emerald-300/20 bg-emerald-300/[.05] px-2 py-0.5 text-[8px] font-bold uppercase tracking-[.11em] text-emerald-200">Fresh</span> : null}</div>
                            <h3 className="mt-2 break-words text-base font-semibold leading-6 text-white/88">{lead.company}</h3>
                            <p className="mt-1 whitespace-normal break-words text-xs leading-5 text-white/45">{lead.summary}</p>
                            <p className="mt-2 flex min-w-0 flex-wrap items-center gap-1.5 break-words text-[10px] text-white/28"><MapPin className="size-3 shrink-0" />{lead.location}<span>·</span>{relativeTime(lead.discoveredAt)}</p>
                          </div>
                          <div className="hidden self-start text-right sm:block"><p className="text-[9px] uppercase tracking-[.13em] text-white/22">Priority</p><p className={`mt-1 text-xs font-bold uppercase ${lead.score >= 85 ? "text-[#ff766b]" : "text-sky-200"}`}>{lead.priority}</p></div>
                        </button>
                        <div className="mt-3 flex min-w-0 flex-wrap gap-2 sm:ml-[76px]">
                          {lead.sourceUrl ? <ActionLink href={lead.sourceUrl} label="Open source" icon={ExternalLink} primary /> : null}
                          {lead.contactEmail ? <ActionLink href={`mailto:${lead.contactEmail}`} label={lead.contactEmail} icon={Mail} /> : null}
                          {lead.contactPhone ? <ActionLink href={`tel:${lead.contactPhone}`} label={lead.contactPhone} icon={Phone} /> : null}
                          {lead.contactUrl && lead.contactUrl !== lead.sourceUrl ? <ActionLink href={lead.contactUrl} label="Contact" icon={Link2} /> : null}
                          <button onClick={() => setSelectedId(lead.id)} className="inline-flex min-h-10 items-center gap-2 border border-white/10 bg-white/[.025] px-3 py-2 text-[11px] font-semibold text-white/55">Full details <ArrowUpRight className="size-3.5" /></button>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>

                <aside className={`${styles.cut} h-fit min-w-0 border border-white/10 bg-[#090807]/95 p-4 sm:p-5 2xl:sticky 2xl:top-3 2xl:max-h-[calc(100vh-1.5rem)] 2xl:overflow-y-auto`}>
                  {selected ? <>
                    <div className="flex min-w-0 items-start justify-between gap-3"><div className="min-w-0"><p className="text-[9px] font-bold uppercase tracking-[.16em] text-sky-300">{opportunityType(selected)}</p><h2 className="mt-2 break-words text-xl font-black leading-7">{selected.company}</h2><p className="mt-1 break-words text-xs leading-5 text-white/35">{selected.location} · {relativeTime(selected.discoveredAt)}</p></div><div className={`grid size-14 shrink-0 place-items-center border text-xl font-black ${scoreTone(selected.score)}`}>{selected.score}</div></div>
                    <p className="mt-4 break-words text-sm leading-6 text-white/52">{selected.summary}</p>
                    <div className="mt-5 min-w-0 border border-white/9 bg-black/20 p-3"><p className="mb-1 text-[9px] font-bold uppercase tracking-[.16em] text-sky-300">Contact & source</p><ContactRow icon={UserRound} label="Contact" value={selected.contactName} /><ContactRow icon={Mail} label="Email" value={selected.contactEmail} href={selected.contactEmail ? `mailto:${selected.contactEmail}` : undefined} /><ContactRow icon={Phone} label="Phone" value={selected.contactPhone} href={selected.contactPhone ? `tel:${selected.contactPhone}` : undefined} /><ContactRow icon={Link2} label="Contact URL" value={selected.contactUrl} href={selected.contactUrl} /><ContactRow icon={ExternalLink} label="Source" value={selected.sourceUrl} href={selected.sourceUrl} /></div>
                    <div className="mt-5"><p className="text-[8px] font-bold uppercase tracking-[.16em] text-white/25">Why it scored</p><ul className="mt-2 space-y-2">{selected.signals.map((signal) => <li key={signal} className="flex min-w-0 gap-2 text-xs leading-5 text-white/52"><Check className="mt-0.5 size-3.5 shrink-0 text-emerald-200/70" /><span className="min-w-0 break-words">{signal}</span></li>)}</ul></div>
                    {selected.risks.length ? <div className="mt-5"><p className="text-[8px] font-bold uppercase tracking-[.16em] text-white/25">Verify first</p><ul className="mt-2 space-y-2">{selected.risks.map((risk) => <li key={risk} className="break-words text-xs leading-5 text-[#e9b36b]/75">• {risk}</li>)}</ul></div> : null}
                    <div className="mt-5 border-t border-white/8 pt-4"><div className="flex items-center justify-between gap-3"><p className="text-[8px] font-bold uppercase tracking-[.16em] text-white/25">Suggested opener</p><button onClick={() => void copyPitch()} className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-sky-200">{copied ? <Check className="size-3" /> : <Clipboard className="size-3" />}{copied ? "Copied" : "Copy"}</button></div><p className="mt-2 break-words border border-white/8 bg-black/25 p-3 text-xs leading-6 text-white/52">{selected.pitch}</p></div>
                    <label className="mt-5 block min-w-0 border border-white/10 bg-black/25 px-3 py-2"><span className="block text-[8px] uppercase tracking-[.14em] text-white/24">Pipeline status</span><select value={selected.status} onChange={(event) => void updateStatus(event.target.value as LeadStatus)} className="mt-1 w-full min-w-0 bg-transparent text-xs text-white/70 outline-none">{statusOptions.map((status) => <option key={status} value={status} className="bg-[#090807]">{status}</option>)}</select></label>
                  </> : <div className="py-16 text-center text-sm text-white/35">Select a gig to inspect it.</div>}
                </aside>
              </section>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
