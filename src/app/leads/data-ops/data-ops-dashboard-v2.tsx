"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowUpRight,
  Building2,
  Check,
  CheckCircle2,
  Clipboard,
  ClipboardCheck,
  Database,
  ExternalLink,
  Filter,
  Handshake,
  Mail,
  MapPin,
  Phone,
  Radar,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  UserRound,
  Workflow,
  XCircle,
  Zap,
} from "lucide-react";
import {
  DATA_OPS_QUALIFIED_SCORE,
  rankDataOpsLeads,
  type DataOpsLeadKind,
  type RankedDataOpsLead,
} from "@/lib/leads/data-ops-scoring";
import type { LeadCollectorState, LeadOpportunity, LeadStatus } from "@/lib/leads/types";

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

const scoreLabels: Record<keyof RankedDataOpsLead["breakdown"], string> = {
  entityVerification: "Entity verification",
  commercialTrigger: "Commercial trigger",
  categoryFit: "Channel / category fit",
  stackFit: "Stack fit",
  workflowFit: "Workflow fit",
  reachability: "Reachability",
  freshness: "Freshness",
  riskPenalty: "Risk penalty",
};

type LeadApiResponse = {
  leads?: LeadOpportunity[];
  collectors?: LeadCollectorState[];
  error?: string;
};

type ScanSourceResult = {
  id?: string;
  label?: string;
  status?: string;
  qualified?: number;
  stored?: number;
};

type ScanResponse = {
  stored?: number;
  qualified?: number;
  results?: ScanSourceResult[];
  error?: string;
};

async function fetchLeadPool() {
  const response = await fetch("/api/leads?feed=power-bi&limit=500", {
    cache: "no-store",
    credentials: "same-origin",
  });
  const body = (await response.json()) as LeadApiResponse;
  if (!response.ok) throw new Error(body.error || "Could not load the Power BI / data-ops signal pool.");
  return {
    leads: body.leads ?? [],
    collectors: body.collectors ?? [],
  };
}

function relativeAge(value: string, now: number) {
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp) || !now) return "Unknown age";
  const hours = Math.max(0, Math.floor((now - timestamp) / (60 * 60 * 1000)));
  if (hours < 1) return "Under 1 hour old";
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} old`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} old`;
}

function scoreTone(score: number) {
  if (score >= 85) return "border-[#ff6e7c]/45 bg-[#f0001c]/10 text-[#ff9ca5]";
  if (score >= DATA_OPS_QUALIFIED_SCORE) return "border-[#16c8ff]/38 bg-[#16c8ff]/9 text-[#9ceaff]";
  return "border-white/12 bg-white/[0.035] text-white/50";
}

function statusTone(status: LeadStatus) {
  if (status === "won") return "border-emerald-300/30 bg-emerald-300/10 text-emerald-200";
  if (["replied", "meeting", "proposal"].includes(status)) {
    return "border-[#e6bd73]/32 bg-[#e6bd73]/8 text-[#f4d99d]";
  }
  if (["lost", "ignored"].includes(status)) return "border-white/10 bg-white/[0.025] text-white/38";
  if (status === "contacted") return "border-sky-300/30 bg-sky-300/[0.08] text-sky-200";
  return "border-[#f0001c]/28 bg-[#f0001c]/7 text-[#ff9ca5]";
}

function Metric({ label, value, note, icon: Icon }: { label: string; value: number; note: string; icon: typeof Target }) {
  return (
    <div className="border border-white/10 bg-[#09090c]/92 p-4 shadow-[0_24px_70px_rgba(0,0,0,0.26)]">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-white/30">{label}</p>
        <Icon aria-hidden className="size-4 text-[#8ce8ff]/68" />
      </div>
      <p className="mt-2 text-3xl font-black tracking-[-0.05em] text-white">{value}</p>
      <p className="mt-2 text-xs leading-5 text-white/38">{note}</p>
    </div>
  );
}

function ContactLink({ href, label, icon: Icon }: { href?: string; label: string; icon: typeof Mail }) {
  if (!href) {
    return (
      <span className="inline-flex min-h-10 items-center gap-2 border border-white/8 bg-white/[0.02] px-3 py-2 text-xs text-white/25">
        <Icon aria-hidden className="size-3.5" />
        {label} unavailable
      </span>
    );
  }

  return (
    <a
      href={href}
      target={href.startsWith("http") ? "_blank" : undefined}
      rel={href.startsWith("http") ? "noreferrer" : undefined}
      className="inline-flex min-h-10 max-w-full items-center gap-2 break-all border border-white/11 bg-white/[0.035] px-3 py-2 text-xs text-white/64 transition hover:border-[#16c8ff]/30 hover:text-white"
    >
      <Icon aria-hidden className="size-3.5 shrink-0 text-[#8ce8ff]" />
      {label}
    </a>
  );
}

function VerificationPill({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 border px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.09em] ${
      ok
        ? "border-emerald-300/22 bg-emerald-300/[0.055] text-emerald-100"
        : "border-[#f0001c]/22 bg-[#f0001c]/[0.055] text-[#ffb2b9]"
    }`}>
      {ok ? <CheckCircle2 aria-hidden className="size-3" /> : <XCircle aria-hidden className="size-3" />}
      {label}
    </span>
  );
}

function LeadCard({ item, selected, onSelect }: { item: RankedDataOpsLead; selected: boolean; onSelect: () => void }) {
  const kindLabel = item.kind === "active-problem" ? "Active problem" : "Partner prospect";
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full border p-4 text-left transition ${
        selected
          ? "border-[#16c8ff]/36 bg-[#16c8ff]/[0.055] shadow-[inset_3px_0_0_#16c8ff]"
          : "border-white/9 bg-white/[0.02] hover:border-white/17 hover:bg-white/[0.04]"
      }`}
    >
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-white">{item.verification.entityName}</p>
          <p className="mt-1 truncate text-[10px] uppercase tracking-[0.12em] text-white/34">
            {kindLabel} · {item.verification.sourceType}
          </p>
        </div>
        <span className={`shrink-0 border px-2 py-1 font-mono text-xs font-bold ${scoreTone(item.score)}`}>
          {item.score}
        </span>
      </div>
      <p className="mt-3 line-clamp-2 text-xs leading-5 text-white/48">{item.lead.summary}</p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        <span className={`border px-2 py-1 text-[9px] font-bold uppercase tracking-[0.1em] ${statusTone(item.lead.status)}`}>
          {item.lead.status}
        </span>
        <span className="border border-[#16c8ff]/20 bg-[#16c8ff]/[0.045] px-2 py-1 text-[9px] font-bold uppercase tracking-[0.1em] text-[#9ceaff]">
          {item.verification.entityConfidence}% entity
        </span>
        {!item.qualified ? (
          <span className="border border-[#f0001c]/20 bg-[#f0001c]/[0.045] px-2 py-1 text-[9px] font-bold uppercase tracking-[0.1em] text-[#ff9ca5]">
            hold
          </span>
        ) : null}
      </div>
    </button>
  );
}

export function DataOpsLeadDashboard() {
  const [leads, setLeads] = useState<LeadOpportunity[]>([]);
  const [collectors, setCollectors] = useState<LeadCollectorState[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<DataOpsLeadKind | "all">("active-problem");
  const [qualifiedOnly, setQualifiedOnly] = useState(true);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState("");
  const [scanMessage, setScanMessage] = useState("");
  const [copiedId, setCopiedId] = useState("");
  const [now, setNow] = useState(0);

  useEffect(() => {
    let cancelled = false;
    void fetchLeadPool()
      .then((result) => {
        if (cancelled) return;
        setLeads(result.leads);
        setCollectors(result.collectors);
        setNow(Date.now());
        setLoading(false);
      })
      .catch((caught: unknown) => {
        if (cancelled) return;
        setError(caught instanceof Error ? caught.message : "Could not load data operations leads.");
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const ranked = useMemo(() => rankDataOpsLeads(leads, now || 1), [leads, now]);
  const visible = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return ranked.filter((item) => {
      if (kind !== "all" && item.kind !== kind) return false;
      if (qualifiedOnly && !item.qualified) return false;
      if (["lost", "ignored"].includes(item.lead.status)) return false;
      if (!normalized) return true;
      return [
        item.verification.entityName,
        item.verification.organizationType,
        item.verification.sourceType,
        item.verification.channel,
        item.lead.location,
        item.lead.summary,
        item.likelyBuyer,
        item.recommendedOffer,
        ...item.matchedSignals,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(normalized);
    });
  }, [kind, qualifiedOnly, query, ranked]);

  const selected = ranked.find((item) => item.lead.id === selectedId) ?? visible[0];
  const activeQualified = ranked.filter((item) => item.kind === "active-problem" && item.qualified).length;
  const partnerQualified = ranked.filter((item) => item.kind === "partner-prospect" && item.qualified).length;
  const urgentCount = ranked.filter((item) => {
    const age = now - new Date(item.lead.discoveredAt).getTime();
    return item.kind === "active-problem" && item.qualified && age >= 0 && age <= 7 * 24 * 60 * 60 * 1000;
  }).length;
  const rejectedNoise = Math.max(0, leads.length - ranked.length);

  async function refresh() {
    setLoading(true);
    setError("");
    try {
      const result = await fetchLeadPool();
      setLeads(result.leads);
      setCollectors(result.collectors);
      setNow(Date.now());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not refresh data operations leads.");
    } finally {
      setLoading(false);
    }
  }

  async function scanActiveSignals() {
    setScanning(true);
    setScanMessage("Scanning explicit buying signals, procurement sources, contract work, and verified first-party partner sites…");
    try {
      const response = await fetch("/api/leads/collect/power-bi", {
        cache: "no-store",
        credentials: "same-origin",
      });
      const body = (await response.json()) as ScanResponse;
      if (!response.ok) throw new Error(body.error || "The verification scan failed.");
      const partnerResult = body.results?.find((result) => result.id === "data-ops-partners");
      setScanMessage(
        `Scan finished · ${body.qualified ?? 0} source-qualified · ${body.stored ?? 0} stored · ${partnerResult?.qualified ?? 0} partner firms passed first-party verification`,
      );
      await refresh();
    } catch (caught) {
      setScanMessage(caught instanceof Error ? caught.message : "The verification scan failed.");
    } finally {
      setScanning(false);
    }
  }

  async function updateStatus(status: LeadStatus) {
    if (!selected) return;
    const previous = selected.lead.status;
    setLeads((current) => current.map((lead) => (lead.id === selected.lead.id ? { ...lead, status } : lead)));
    try {
      const response = await fetch("/api/leads", {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selected.lead.id, status }),
      });
      if (!response.ok) throw new Error("Status update failed.");
    } catch {
      setLeads((current) => current.map((lead) => (lead.id === selected.lead.id ? { ...lead, status: previous } : lead)));
    }
  }

  async function copyOutreach(item: RankedDataOpsLead) {
    if (!item.qualified) return;
    try {
      await navigator.clipboard.writeText(item.outreachMessage);
      setCopiedId(item.lead.id);
      window.setTimeout(() => setCopiedId(""), 1800);
    } catch {
      setCopiedId("");
    }
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_15%_8%,rgba(22,200,255,0.08),transparent_28%),radial-gradient(circle_at_88%_18%,rgba(240,0,28,0.07),transparent_28%),#050507] text-[#f4efe3]">
      <div className="mx-auto max-w-[1920px] px-3 py-4 sm:px-5 lg:px-7">
        <header className="relative overflow-hidden border border-white/10 bg-[#08080b]/95 p-5 shadow-[0_30px_100px_rgba(0,0,0,0.32)] sm:p-7">
          <div className="absolute right-[-6rem] top-[-8rem] size-64 rounded-full bg-[#16c8ff]/9 blur-3xl" aria-hidden />
          <div className="relative flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-4xl">
              <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-2 border border-[#16c8ff]/26 bg-[#16c8ff]/7 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.18em] text-[#9ceaff]">
                  <Radar aria-hidden className="size-3" /> Verification-first pipeline
                </span>
                <span className="inline-flex items-center gap-2 border border-emerald-300/20 bg-emerald-300/[0.055] px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.18em] text-emerald-200">
                  <ShieldCheck aria-hidden className="size-3" /> Entity gate before scoring
                </span>
                <span className="inline-flex items-center gap-2 border border-[#e6bd73]/20 bg-[#e6bd73]/[0.045] px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.18em] text-[#f1d18e]">
                  <Handshake aria-hidden className="size-3" /> Human-approved outreach
                </span>
              </div>
              <h1 className="mt-4 text-[clamp(2.35rem,7vw,5rem)] font-black uppercase leading-[0.88] tracking-[-0.07em]">
                <span className="text-white">Data Ops</span> <span className="text-[#8ce8ff]">Pipeline</span>
              </h1>
              <p className="mt-4 max-w-3xl text-sm leading-6 text-white/50 sm:text-base">
                Entity verified → channel or buying trigger verified → contact path checked → opportunity scored. Generic articles, job titles, social usernames with no resolvable buyer, and mere consulting keywords no longer qualify as partner prospects.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={() => void refresh()}
                disabled={loading}
                className="inline-flex min-h-11 items-center justify-center gap-2 border border-white/12 bg-white/[0.035] px-4 py-2 text-xs font-bold uppercase tracking-[0.1em] text-white/65 transition hover:text-white disabled:opacity-55"
              >
                <RefreshCw aria-hidden className={`size-4 ${loading ? "animate-spin" : ""}`} />
                Refresh database
              </button>
              <button
                type="button"
                onClick={() => void scanActiveSignals()}
                disabled={scanning}
                className="inline-flex min-h-11 items-center justify-center gap-2 border border-[#16c8ff]/34 bg-[#16c8ff]/8 px-4 py-2 text-xs font-bold uppercase tracking-[0.1em] text-[#a7edff] transition hover:bg-[#16c8ff]/12 disabled:opacity-55"
              >
                <Zap aria-hidden className={`size-4 ${scanning ? "animate-pulse" : ""}`} />
                {scanning ? "Verifying" : "Scan + verify"}
              </button>
            </div>
          </div>
          {scanMessage ? (
            <p className="relative mt-5 border border-[#16c8ff]/18 bg-[#16c8ff]/[0.035] px-4 py-3 text-xs leading-5 text-[#b9f1ff]/72">
              {scanMessage}
            </p>
          ) : null}
          {error ? (
            <p className="relative mt-5 flex items-start gap-2 border border-[#f0001c]/24 bg-[#f0001c]/7 px-4 py-3 text-xs leading-5 text-[#ffc0c6]">
              <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0" />
              {error}
            </p>
          ) : null}
        </header>

        <section className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Metric label="Verified problems" value={activeQualified} note="Explicit commercial trigger + resolved buyer" icon={Workflow} />
          <Metric label="Verified partners" value={partnerQualified} note="First-party service page + resolved firm" icon={Handshake} />
          <Metric label="Fresh ≤7 days" value={urgentCount} note="Verified active needs to prioritize now" icon={Zap} />
          <Metric label="Noise rejected" value={rejectedNoise} note="Power BI records rejected before opportunity scoring" icon={XCircle} />
        </section>

        <section className="mt-3 grid min-w-0 gap-3 xl:grid-cols-[360px_minmax(0,1fr)]">
          <aside className="min-w-0 border border-white/10 bg-[#08080b]/94 p-3">
            <div className="grid gap-2">
              <label className="relative block">
                <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/28" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search entity, source, signal, offer…"
                  className="h-11 w-full border border-white/10 bg-black/24 pl-10 pr-3 text-sm text-white outline-none placeholder:text-white/25 focus:border-[#16c8ff]/38"
                />
              </label>
              <div className="grid grid-cols-3 gap-1">
                {([[
                  "active-problem",
                  "Problems",
                ], ["partner-prospect", "Partners"], ["all", "All"]] as const).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setKind(value)}
                    className={`min-h-9 border px-2 text-[9px] font-bold uppercase tracking-[0.1em] transition ${
                      kind === value
                        ? "border-[#16c8ff]/36 bg-[#16c8ff]/8 text-[#a7edff]"
                        : "border-white/9 bg-white/[0.02] text-white/36 hover:text-white/66"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setQualifiedOnly((current) => !current)}
                className={`flex min-h-10 items-center justify-between gap-3 border px-3 text-xs transition ${
                  qualifiedOnly
                    ? "border-emerald-300/24 bg-emerald-300/[0.055] text-emerald-100"
                    : "border-white/9 bg-white/[0.02] text-white/42"
                }`}
              >
                <span className="inline-flex items-center gap-2"><Filter aria-hidden className="size-3.5" /> Outreach-ready only</span>
                <span className="font-mono">{qualifiedOnly ? "ON" : "OFF"}</span>
              </button>
            </div>

            <div className="mt-3 flex items-center justify-between border-b border-white/8 pb-2 text-[9px] font-bold uppercase tracking-[0.13em] text-white/28">
              <span>{visible.length} visible</span>
              <span>{ranked.length} candidates</span>
            </div>
            <div className="mt-2 grid max-h-[76vh] gap-2 overflow-y-auto pr-1">
              {visible.map((item) => (
                <LeadCard
                  key={item.lead.id}
                  item={item}
                  selected={selected?.lead.id === item.lead.id}
                  onSelect={() => setSelectedId(item.lead.id)}
                />
              ))}
              {!loading && visible.length === 0 ? (
                <div className="border border-dashed border-white/12 p-5 text-center">
                  <ShieldCheck aria-hidden className="mx-auto size-5 text-white/24" />
                  <p className="mt-3 text-sm font-semibold text-white/60">No verified lead matches this view.</p>
                  <p className="mt-2 text-xs leading-5 text-white/34">
                    That is better than inventing one. Run Scan + verify, switch queues, or turn off outreach-ready to inspect held candidates.
                  </p>
                </div>
              ) : null}
            </div>
          </aside>

          <div className="min-w-0">
            {selected ? (
              <article className="border border-white/10 bg-[#08080b]/94 p-5 sm:p-7">
                <div className="flex min-w-0 flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap gap-2">
                      <span className={`border px-2.5 py-1 font-mono text-xs font-bold ${scoreTone(selected.score)}`}>Score {selected.score}</span>
                      <span className="border border-[#16c8ff]/22 bg-[#16c8ff]/[0.045] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.11em] text-[#9ceaff]">
                        Entity {selected.verification.entityConfidence}%
                      </span>
                      <span className="border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.11em] text-white/45">
                        {selected.verification.channel}
                      </span>
                      <span className={`border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.11em] ${statusTone(selected.lead.status)}`}>
                        {selected.lead.status}
                      </span>
                    </div>
                    <h2 className="mt-4 break-words text-3xl font-black tracking-[-0.045em] text-white sm:text-5xl">{selected.verification.entityName}</h2>
                    <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-white/42">
                      <span className="inline-flex items-center gap-2"><Building2 aria-hidden className="size-3.5 text-[#8ce8ff]" />{selected.verification.organizationType}</span>
                      <span className="inline-flex items-center gap-2"><Database aria-hidden className="size-3.5 text-[#8ce8ff]" />{selected.verification.sourceType}</span>
                      <span className="inline-flex items-center gap-2"><MapPin aria-hidden className="size-3.5 text-[#8ce8ff]" />{selected.lead.location || "Unknown location"}</span>
                      <span className="inline-flex items-center gap-2"><Sparkles aria-hidden className="size-3.5 text-[#8ce8ff]" />{relativeAge(selected.lead.discoveredAt, now)}</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 lg:max-w-sm lg:justify-end">
                    <select
                      value={selected.lead.status}
                      onChange={(event) => void updateStatus(event.target.value as LeadStatus)}
                      className="h-10 border border-white/12 bg-[#09090c] px-3 text-xs font-semibold text-white/68 outline-none focus:border-[#16c8ff]/40"
                      aria-label="Update lead status"
                    >
                      {statusOptions.map((status) => <option key={status}>{status}</option>)}
                    </select>
                    <ContactLink href={selected.lead.sourceUrl} label="Source" icon={ExternalLink} />
                  </div>
                </div>

                <section className="mt-7 border border-white/10 bg-white/[0.018] p-5">
                  <div className="flex flex-wrap gap-2">
                    <VerificationPill ok={selected.verification.entityVerified} label="Entity verified" />
                    <VerificationPill
                      ok={selected.kind === "partner-prospect" ? selected.verification.categoryVerified : selected.verification.triggerVerified}
                      label={selected.kind === "partner-prospect" ? "Partner category verified" : "Buying trigger verified"}
                    />
                    <VerificationPill ok={selected.verification.contactVerified} label="Reply path found" />
                    <VerificationPill ok={selected.qualified} label="Outreach ready" />
                  </div>
                  {selected.verification.exclusionReason ? (
                    <p className="mt-4 flex items-start gap-2 border border-[#f0001c]/20 bg-[#f0001c]/[0.045] p-3 text-xs leading-5 text-[#ffb8be]">
                      <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0" />
                      HOLD: {selected.verification.exclusionReason}
                    </p>
                  ) : null}
                </section>

                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <ContactLink href={selected.lead.contactEmail ? `mailto:${selected.lead.contactEmail}` : undefined} label={selected.lead.contactEmail || "Email"} icon={Mail} />
                  <ContactLink href={selected.lead.contactPhone ? `tel:${selected.lead.contactPhone}` : undefined} label={selected.lead.contactPhone || "Phone"} icon={Phone} />
                  <ContactLink href={selected.lead.contactUrl || selected.lead.website} label={selected.lead.contactUrl ? "Contact page" : selected.lead.website ? "Website" : "Website"} icon={ArrowUpRight} />
                </div>

                <div className="mt-4 grid gap-4 2xl:grid-cols-[1.18fr_0.82fr]">
                  <div className="grid gap-4">
                    <section className="border border-[#16c8ff]/17 bg-[#16c8ff]/[0.028] p-5">
                      <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-[#8ce8ff]">Pain / capacity hypothesis</p>
                      <p className="mt-3 text-sm leading-7 text-white/62">{selected.painHypothesis}</p>
                    </section>
                    <div className="grid gap-4 md:grid-cols-2">
                      <section className="border border-white/10 bg-white/[0.02] p-5">
                        <div className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-[0.16em] text-white/34"><UserRound aria-hidden className="size-3.5 text-[#e6bd73]" /> Likely buyer</div>
                        <p className="mt-3 text-sm leading-6 text-white/62">{selected.likelyBuyer}</p>
                      </section>
                      <section className="border border-white/10 bg-white/[0.02] p-5">
                        <div className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-[0.16em] text-white/34"><Target aria-hidden className="size-3.5 text-[#e6bd73]" /> Recommended offer</div>
                        <p className="mt-3 text-sm font-semibold leading-6 text-white">{selected.recommendedOffer}</p>
                      </section>
                    </div>
                    <section className="border border-[#e6bd73]/17 bg-[#e6bd73]/[0.025] p-5">
                      <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-[#f1d18e]">Proposed deliverable</p>
                      <p className="mt-3 text-sm leading-7 text-white/62">{selected.proposedDeliverable}</p>
                    </section>
                  </div>

                  <section className="border border-white/10 bg-black/18 p-5">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-white/34">Score after verification</p>
                      <span className="font-mono text-xs text-white/42">{selected.score}/100</span>
                    </div>
                    <div className="mt-4 grid gap-2">
                      {(Object.entries(selected.breakdown) as [keyof RankedDataOpsLead["breakdown"], number][]).map(([key, value]) => (
                        <div key={key} className="grid grid-cols-[minmax(0,1fr)_42px] items-center gap-3">
                          <div>
                            <div className="text-[10px] text-white/42">{scoreLabels[key]}</div>
                            <div className="mt-1 h-1.5 overflow-hidden bg-white/7">
                              <div
                                className={`h-full ${value < 0 ? "bg-[#f0001c]/65" : "bg-[#16c8ff]/72"}`}
                                style={{ width: `${Math.min(100, (Math.abs(value) / 25) * 100)}%` }}
                              />
                            </div>
                          </div>
                          <span className={`text-right font-mono text-xs ${value < 0 ? "text-[#ff8994]" : "text-white/54"}`}>{value > 0 ? `+${value}` : value}</span>
                        </div>
                      ))}
                    </div>
                  </section>
                </div>

                <section className="mt-4 border border-white/10 bg-white/[0.018] p-5">
                  <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-white/34">Why it qualifies</p>
                  <div className="mt-3 grid gap-2">
                    {selected.matchedSignals.length ? selected.matchedSignals.map((signal) => (
                      <div key={signal} className="flex items-start gap-2 text-xs leading-5 text-white/52">
                        <Check aria-hidden className="mt-1 size-3 shrink-0 text-[#8ce8ff]" />
                        {signal}
                      </div>
                    )) : <span className="text-xs text-white/28">No verification evidence is available.</span>}
                  </div>
                </section>

                {selected.qualified ? (
                  <section className="mt-4 border border-emerald-300/16 bg-emerald-300/[0.025] p-5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <div className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-[0.16em] text-emerald-200/70">
                          <ShieldCheck aria-hidden className="size-3.5" /> Verified, human-approved outreach draft
                        </div>
                        <p className="mt-2 text-xs leading-5 text-white/36">Open the source once before sending. The pipeline prepares the message; it never sends automatically.</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => void copyOutreach(selected)}
                        className="inline-flex min-h-10 items-center justify-center gap-2 border border-emerald-300/24 bg-emerald-300/[0.055] px-4 text-xs font-semibold text-emerald-100 transition hover:bg-emerald-300/[0.09]"
                      >
                        {copiedId === selected.lead.id ? <ClipboardCheck aria-hidden className="size-4" /> : <Clipboard aria-hidden className="size-4" />}
                        {copiedId === selected.lead.id ? "Copied" : "Copy outreach"}
                      </button>
                    </div>
                    <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-white/64">{selected.outreachMessage}</p>
                  </section>
                ) : (
                  <section className="mt-4 border border-[#f0001c]/18 bg-[#f0001c]/[0.025] p-5">
                    <div className="flex items-start gap-3">
                      <AlertTriangle aria-hidden className="mt-0.5 size-5 shrink-0 text-[#ff8d98]" />
                      <div>
                        <p className="text-sm font-semibold text-white">No outreach draft is exposed for held records.</p>
                        <p className="mt-2 text-xs leading-5 text-white/42">Resolve the buyer / firm identity or verify the commercial trigger first. This prevents plausible-looking junk from becoming a sales task.</p>
                      </div>
                    </div>
                  </section>
                )}

                <section className="mt-4 border border-white/9 bg-black/16 p-5">
                  <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-white/34">Original source record</p>
                  <p className="mt-3 text-sm leading-7 text-white/50">{selected.lead.summary}</p>
                  <p className="mt-3 text-xs text-white/30">Stored label: {selected.lead.company}</p>
                  {selected.lead.contactName ? (
                    <p className="mt-2 inline-flex items-center gap-2 text-xs text-white/42"><UserRound aria-hidden className="size-3.5 text-[#8ce8ff]" /> Contact: {selected.lead.contactName}</p>
                  ) : null}
                </section>
              </article>
            ) : (
              <div className="grid min-h-[520px] place-items-center border border-dashed border-white/12 bg-[#08080b]/78 p-8 text-center">
                <div>
                  <ShieldCheck aria-hidden className="mx-auto size-7 text-white/24" />
                  <h2 className="mt-4 text-xl font-semibold text-white/66">No verified lead selected.</h2>
                  <p className="mt-2 max-w-md text-sm leading-6 text-white/38">Run Scan + verify or switch queues. The pipeline now prefers an empty queue to a fabricated prospect.</p>
                </div>
              </div>
            )}
          </div>
        </section>

        <footer className="mt-3 grid gap-3 border border-white/9 bg-[#08080b]/88 p-4 text-xs leading-5 text-white/34 md:grid-cols-2">
          <p>
            <ShieldCheck aria-hidden className="mr-2 inline size-3.5 text-emerald-200" />
            Qualification is gated: a high keyword score cannot override failed entity or trigger verification.
          </p>
          <p className="md:text-right">
            <Database aria-hidden className="mr-2 inline size-3.5 text-[#8ce8ff]" />
            {collectors.filter((collector) => collector.status === "ready").length} configured Power BI signal collectors report ready; partner verification runs as a separate first-party discovery pass.
          </p>
        </footer>
      </div>
    </main>
  );
}
