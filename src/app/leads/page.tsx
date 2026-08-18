"use client";

import { useMemo, useState } from "react";
import {
  Activity,
  ArrowUpRight,
  Building2,
  Check,
  ChevronRight,
  Clipboard,
  Flame,
  Globe2,
  LayoutDashboard,
  LockKeyhole,
  Menu,
  MessageSquareText,
  RadioTower,
  ScanSearch,
  Search,
  Target,
  Workflow,
  X,
} from "lucide-react";

type Lead = {
  id: string;
  company: string;
  location: string;
  industry: string;
  source: "Intent" | "New business" | "Site audit" | "Inbound";
  score: number;
  age: string;
  status: "New" | "Contacted" | "Replied" | "Meeting" | "Proposal";
  summary: string;
  signals: string[];
  risks: string[];
  tags: string[];
  pitch: string;
  audit?: { performance: number; mobile: number; seo: number; accessibility: number };
};

const leads: Lead[] = [
  {
    id: "l1",
    company: "Front Range Home Services",
    location: "Denver, CO",
    industry: "Home services",
    source: "Intent",
    score: 96,
    age: "8m ago",
    status: "New",
    summary: "Public post says they need someone to rebuild an outdated site before a fall campaign launches.",
    signals: ["Explicit website request", "Posted under 15 minutes ago", "Established local service business", "Launch deadline mentioned"],
    risks: ["Other designers may respond quickly"],
    tags: ["intent", "urgent", "rebuild", "service business"],
    pitch: "Saw your post about rebuilding the site before the campaign. I build fast, conversion-focused sites for service businesses, and I can already see a cleaner mobile quote path. I can send a concise plan and fixed-scope estimate.",
  },
  {
    id: "l2",
    company: "Hollow Creek Contracting LLC",
    location: "Raleigh, NC",
    industry: "Specialty contracting",
    source: "New business",
    score: 90,
    age: "41m ago",
    status: "New",
    summary: "Recently formed contractor with an active business footprint but no discoverable website.",
    signals: ["Recently formed business", "No website found", "Local-search dependent category", "Public contact route available"],
    risks: ["Budget and launch timing unknown"],
    tags: ["new business", "no site", "contractor"],
    pitch: "I came across your new company while reviewing recently launched service businesses. I couldn't find a website yet, so I mapped out a lean launch path: one strong site, quote capture, local-search basics, and room to expand later.",
  },
  {
    id: "l3",
    company: "Northstar Wellness Studio",
    location: "Portland, OR",
    industry: "Wellness",
    source: "Site audit",
    score: 84,
    age: "1h ago",
    status: "Contacted",
    summary: "Strong business signals, but the mobile experience is weak and the booking action is buried.",
    signals: ["Mobile performance is weak", "Booking CTA hard to find", "Business appears active", "Brand assets reusable"],
    risks: ["Redesign may not be immediate priority"],
    tags: ["mobile", "booking", "redesign"],
    pitch: "Your studio already has the hard part: a clear service and an established brand. The current mobile site makes booking take more work than it should. I can show you a compact redesign that puts scheduling first without changing the character of the business.",
    audit: { performance: 39, mobile: 42, seo: 61, accessibility: 76 },
  },
  {
    id: "l4",
    company: "Morrow & Finch Consulting",
    location: "Chicago, IL",
    industry: "Professional services",
    source: "Inbound",
    score: 79,
    age: "2h ago",
    status: "Replied",
    summary: "Direct inquiry requests a modern service site with clear offerings and a lead-capture form.",
    signals: ["Direct inquiry", "Scope is understandable", "Decision-maker contact provided"],
    risks: ["Budget not confirmed"],
    tags: ["inbound", "qualified", "service site"],
    pitch: "Based on the scope you described, I'd structure this around a clear service path, strong proof points, and one low-friction inquiry flow. I can send a fixed-scope recommendation with the fastest realistic launch path.",
  },
  {
    id: "l5",
    company: "Common Thread Mercantile",
    location: "Savannah, GA",
    industry: "Retail",
    source: "Site audit",
    score: 73,
    age: "4h ago",
    status: "New",
    summary: "Site loads slowly, product navigation is inconsistent, and store information is hard to find on mobile.",
    signals: ["Slow mobile experience", "Store details buried", "Navigation dead ends"],
    risks: ["E-commerce scope may exceed starter engagement"],
    tags: ["retail", "performance", "navigation"],
    pitch: "I reviewed the site from a phone-sized view. The store is clearly worth visiting, but the site makes basic details and product discovery harder than they need to be. I can outline a phased fix so the highest-impact issues are handled first.",
    audit: { performance: 31, mobile: 35, seo: 58, accessibility: 68 },
  },
];

const nav = [
  { label: "Overview", icon: LayoutDashboard },
  { label: "Hot leads", icon: Flame },
  { label: "Intent signals", icon: RadioTower },
  { label: "Site audits", icon: ScanSearch },
  { label: "Pipeline", icon: Workflow },
];

const cut = { clipPath: "polygon(0 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, 16px 100%, 0 calc(100% - 16px))" };

function Radar({ count }: { count: number }) {
  return (
    <div className="relative mx-auto aspect-square w-40 rounded-full border border-[#ef2a26]/50 bg-[#070504] shadow-[0_0_55px_rgba(239,42,38,.12)]">
      <div className="absolute inset-[16%] rounded-full border border-[#ef2a26]/35" />
      <div className="absolute inset-[33%] rounded-full border border-[#ef2a26]/35" />
      <div className="absolute left-1/2 top-0 h-full w-px bg-[#ef2a26]/25" />
      <div className="absolute left-0 top-1/2 h-px w-full bg-[#ef2a26]/25" />
      <div className="absolute left-[26%] top-[32%] size-2 rounded-full bg-[#e7b66b] shadow-[0_0_12px_#e7b66b]" />
      <div className="absolute right-[27%] top-[45%] size-1.5 rounded-full bg-[#f5efe0] shadow-[0_0_10px_#fff]" />
      <div className="absolute bottom-[28%] left-[47%] size-2.5 rounded-full bg-[#ef2a26] shadow-[0_0_14px_#ef2a26]" />
      <div className="absolute inset-0 grid place-items-center">
        <div className="rounded-full border border-white/10 bg-black/80 px-4 py-2 text-center">
          <div className="text-2xl font-black text-[#f5efe0]">{count}</div>
          <div className="text-[9px] font-bold uppercase tracking-[.22em] text-white/40">hot</div>
        </div>
      </div>
    </div>
  );
}

function Score({ value }: { value: number }) {
  const cls = value >= 90 ? "border-[#ef2a26]/45 bg-[#ef2a26]/10 text-[#ff8b80]" : value >= 80 ? "border-[#d7a45f]/40 bg-[#d7a45f]/10 text-[#f3c77d]" : "border-white/10 bg-white/[.03] text-white/60";
  return <span className={`min-w-12 border px-2.5 py-1 text-center text-sm font-black ${cls}`}>{value}</span>;
}

export default function LeadsPage() {
  const [selectedId, setSelectedId] = useState(leads[0].id);
  const [active, setActive] = useState("Overview");
  const [query, setQuery] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const selected = leads.find((lead) => lead.id === selectedId) ?? leads[0];
  const hotCount = leads.filter((lead) => lead.score >= 85).length;

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return leads.filter((lead) => {
      if (active === "Hot leads" && lead.score < 85) return false;
      if (active === "Intent signals" && lead.source !== "Intent") return false;
      if (active === "Site audits" && lead.source !== "Site audit") return false;
      if (!q) return true;
      return [lead.company, lead.location, lead.industry, lead.summary, ...lead.tags].join(" ").toLowerCase().includes(q);
    });
  }, [active, query]);

  async function copyPitch() {
    await navigator.clipboard.writeText(selected.pitch);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-[#020202] text-[#f5efe0]">
      <div
        className="pointer-events-none fixed inset-0 opacity-60"
        style={{
          backgroundImage:
            "radial-gradient(circle at 12% 16%,rgba(239,42,38,.18),transparent 20rem),radial-gradient(circle at 82% 8%,rgba(215,164,95,.12),transparent 26rem),radial-gradient(circle,#f5efe0 0 1px,transparent 1.5px),radial-gradient(circle,#d7a45f 0 1px,transparent 1.5px),radial-gradient(circle,#ef2a26 0 1px,transparent 1.6px)",
          backgroundSize: "auto,auto,119px 113px,173px 167px,239px 227px",
          backgroundPosition: "center,center,13px 21px,54px 71px,93px 34px",
        }}
      />
      <div className="pointer-events-none fixed inset-x-[-20vw] bottom-[-42vh] h-[78vh] origin-bottom [transform:perspective(500px)_rotateX(64deg)] opacity-20" style={{backgroundImage:"linear-gradient(rgba(215,164,95,.25)_1px,transparent_1px),linear-gradient(90deg,rgba(239,42,38,.22)_1px,transparent_1px)",backgroundSize:"64px 64px"}} />

      <div className="relative mx-auto min-h-screen max-w-[1840px] p-3 sm:p-5 lg:p-7">
        <header className="relative overflow-hidden border border-white/10 bg-[#090807]/90 px-4 py-5 shadow-[0_25px_80px_rgba(0,0,0,.45)] backdrop-blur-xl sm:px-7" style={cut}>
          <div className="absolute left-0 top-0 h-1 w-32 bg-[#ef2a26]" />
          <div className="absolute right-0 top-0 h-1 w-24 bg-[#d7a45f]" />
          <div className="relative flex items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 border border-[#d7a45f]/25 bg-[#d7a45f]/[.07] px-2.5 py-1 text-[9px] font-bold uppercase tracking-[.2em] text-[#e9ba71]"><LockKeyhole className="size-3"/> Private signal room</span>
                <span className="inline-flex items-center gap-1.5 border border-[#ef2a26]/25 bg-[#ef2a26]/[.07] px-2.5 py-1 text-[9px] font-bold uppercase tracking-[.2em] text-[#ff8b80]"><span className="size-1.5 rounded-full bg-[#ef2a26] shadow-[0_0_10px_#ef2a26]"/> Preview data</span>
              </div>
              <h1 className="mt-3 text-[clamp(2.35rem,7vw,5rem)] font-black uppercase leading-[.86] tracking-[-.075em]">
                <span className="bg-gradient-to-b from-[#fffdf7] via-[#d7d0c2] to-[#fff2d2] bg-clip-text text-transparent">Rukh</span>{" "}
                <span className="bg-gradient-to-b from-[#ffe6ae] via-[#d7a45f] to-[#7f5020] bg-clip-text text-transparent">Leads</span>
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-white/48 sm:text-base">A private radar for people and businesses that are most likely to need a website — ranked before you spend time chasing them.</p>
            </div>
            <button onClick={() => setMenuOpen((v) => !v)} className="grid size-11 shrink-0 place-items-center border border-white/10 bg-white/[.035] text-white/70 lg:hidden">{menuOpen ? <X className="size-5"/> : <Menu className="size-5"/>}</button>
          </div>
        </header>

        <div className="mt-3 grid gap-3 lg:grid-cols-[235px_minmax(0,1fr)]">
          <aside className={`${menuOpen ? "block" : "hidden"} h-fit border border-white/10 bg-[#090807]/90 p-3 backdrop-blur-xl lg:sticky lg:top-3 lg:block`} style={cut}>
            <div className="border-b border-white/8 px-3 pb-4 pt-2">
              <p className="text-[9px] font-bold uppercase tracking-[.22em] text-white/28">Lead operations</p>
              <p className="mt-2 text-sm font-semibold text-white/72">Signal console</p>
            </div>
            <nav className="mt-3 space-y-1">
              {nav.map(({label,icon:Icon}) => {
                const isActive = active === label;
                return <button key={label} onClick={() => {setActive(label);setMenuOpen(false)}} className={`flex w-full items-center gap-3 border px-3 py-3 text-left transition ${isActive ? "border-[#d7a45f]/30 bg-[#d7a45f]/[.08] text-[#f2c57d]" : "border-transparent text-white/50 hover:border-white/8 hover:bg-white/[.025] hover:text-white/80"}`}>
                  <Icon className="size-4"/>
                  <span className="flex-1 text-sm font-semibold">{label}</span>
                  {label === "Hot leads" && <span className="border border-[#ef2a26]/30 bg-[#ef2a26]/10 px-1.5 py-0.5 text-[9px] font-black text-[#ff8b80]">{hotCount}</span>}
                </button>
              })}
            </nav>
            <div className="mt-5 border-t border-white/8 pt-5">
              <Radar count={hotCount}/>
              <p className="mt-4 text-center text-[9px] font-bold uppercase tracking-[.2em] text-white/28">Nationwide scan</p>
            </div>
          </aside>

          <main className="min-w-0">
            <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {[
                ["Active leads", "128", "Across all sources", Activity, false],
                ["Hot right now", String(hotCount), "Score 85 or higher", Flame, true],
                ["New today", "24", "Not yet contacted", Target, false],
                ["Intent hits", "11", "Explicit public asks", RadioTower, false],
              ].map(([label,value,note,Icon,hot]) => <div key={String(label)} className="border border-white/10 bg-[#090807]/90 p-4 shadow-[0_20px_60px_rgba(0,0,0,.3)]" style={cut}>
                <div className="flex items-start justify-between gap-3"><div><p className="text-[9px] font-bold uppercase tracking-[.18em] text-white/30">{String(label)}</p><p className={`mt-2 text-3xl font-black tracking-[-.05em] ${hot ? "text-[#ff766b]" : "text-[#f5efe0]"}`}>{String(value)}</p><p className="mt-2 text-xs text-white/35">{String(note)}</p></div><span className={`grid size-9 place-items-center border ${hot ? "border-[#ef2a26]/35 bg-[#ef2a26]/10 text-[#ff766b]" : "border-[#d7a45f]/25 bg-[#d7a45f]/[.07] text-[#e7b66b]"}`}><Icon className="size-4"/></span></div>
              </div>)}
            </section>

            <section className="mt-3 grid min-w-0 gap-3 xl:grid-cols-[minmax(0,1fr)_390px]">
              <div className="min-w-0 border border-white/10 bg-[#090807]/90" style={cut}>
                <div className="flex flex-col gap-3 border-b border-white/8 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div><p className="text-[9px] font-bold uppercase tracking-[.2em] text-[#d7a45f]">{active}</p><h2 className="mt-1 text-xl font-bold tracking-[-.03em] text-white">Priority queue</h2></div>
                  <div className="relative w-full sm:w-72"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/28"/><input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="Search leads..." className="h-10 w-full border border-white/10 bg-black/30 pl-9 pr-3 text-sm text-white/70 outline-none placeholder:text-white/25 focus:border-[#d7a45f]/40"/></div>
                </div>
                <div className="divide-y divide-white/7">
                  {visible.map((lead) => {
                    const activeLead = lead.id === selected.id;
                    return <button key={lead.id} onClick={()=>setSelectedId(lead.id)} className={`group w-full p-4 text-left transition sm:p-5 ${activeLead ? "bg-[#d7a45f]/[.06]" : "hover:bg-white/[.025]"}`}>
                      <div className="flex items-start gap-3">
                        <div className={`mt-1 grid size-9 shrink-0 place-items-center border ${lead.source === "Intent" ? "border-[#ef2a26]/30 bg-[#ef2a26]/10 text-[#ff766b]" : lead.source === "Site audit" ? "border-[#d7a45f]/25 bg-[#d7a45f]/[.08] text-[#e7b66b]" : "border-white/10 bg-white/[.03] text-white/48"}`}>{lead.source === "Intent" ? <RadioTower className="size-4"/> : lead.source === "Site audit" ? <Globe2 className="size-4"/> : <Building2 className="size-4"/>}</div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between"><div><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold text-white">{lead.company}</h3><span className="text-[9px] font-semibold uppercase tracking-[.12em] text-white/28">{lead.age}</span></div><p className="mt-1 text-xs text-white/34">{lead.industry} · {lead.location}</p></div><div className="flex items-center gap-2"><span className="border border-white/10 bg-black/20 px-2.5 py-1 text-[10px] font-semibold text-white/48">{lead.status}</span><Score value={lead.score}/></div></div>
                          <p className="mt-3 line-clamp-2 text-sm leading-6 text-white/44">{lead.summary}</p>
                          <div className="mt-3 flex flex-wrap gap-1.5">{lead.tags.map(tag=><span key={tag} className="border border-white/8 bg-black/20 px-2 py-1 text-[9px] text-white/30">{tag}</span>)}</div>
                        </div>
                        <ChevronRight className={`mt-2 hidden size-5 shrink-0 sm:block ${activeLead ? "text-[#d7a45f]" : "text-white/16"}`}/>
                      </div>
                    </button>
                  })}
                </div>
              </div>

              <aside className="h-fit overflow-hidden border border-white/10 bg-[#090807]/94 xl:sticky xl:top-3" style={cut}>
                <div className="relative border-b border-white/8 p-5">
                  <div className="absolute right-0 top-0 h-1 w-20 bg-[#ef2a26]"/>
                  <div className="flex items-center justify-between gap-3"><span className="text-[9px] font-bold uppercase tracking-[.2em] text-[#d7a45f]">Lead detail</span><Score value={selected.score}/></div>
                  <h2 className="mt-3 text-2xl font-bold tracking-[-.04em] text-white">{selected.company}</h2>
                  <p className="mt-2 text-xs text-white/34">{selected.industry} · {selected.location}</p>
                  <p className="mt-4 text-sm leading-6 text-white/48">{selected.summary}</p>
                </div>
                <div className="space-y-6 p-5">
                  <section><h3 className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.16em] text-white/58"><Target className="size-4 text-[#ef2a26]"/> Why it scored</h3><ul className="mt-3 space-y-2">{selected.signals.map(signal=><li key={signal} className="flex gap-2.5 text-xs leading-5 text-white/44"><Check className="mt-0.5 size-3.5 shrink-0 text-emerald-200/75"/>{signal}</li>)}</ul>{selected.risks.length>0 && <div className="mt-4 border border-[#d7a45f]/16 bg-[#d7a45f]/[.04] p-3 text-[11px] leading-5 text-[#e7b66b]/70"><b className="text-[#f2c57d]">Watch:</b> {selected.risks.join(" · ")}</div>}</section>
                  {selected.audit && <section><h3 className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.16em] text-white/58"><ScanSearch className="size-4 text-[#d7a45f]"/> Site audit</h3><div className="mt-3 grid grid-cols-2 gap-2">{Object.entries(selected.audit).map(([label,value])=><div key={label} className="border border-white/8 bg-black/20 p-3"><p className="text-[9px] uppercase tracking-[.12em] text-white/26">{label}</p><p className={`mt-1 text-xl font-black ${value < 50 ? "text-[#ff766b]" : "text-[#f2c57d]"}`}>{value}</p></div>)}</div></section>}
                  <section><div className="flex items-center justify-between gap-3"><h3 className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.16em] text-white/58"><MessageSquareText className="size-4 text-[#d7a45f]"/> Suggested opener</h3><button onClick={()=>void copyPitch()} className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[.12em] text-white/34 hover:text-[#f2c57d]">{copied ? <Check className="size-3.5"/> : <Clipboard className="size-3.5"/>}{copied ? "Copied" : "Copy"}</button></div><div className="mt-3 border border-white/9 bg-[#f5efe0] p-4 text-sm leading-6 text-[#17120d]">{selected.pitch}</div></section>
                  <section className="grid grid-cols-2 gap-2"><button className="inline-flex h-11 items-center justify-center gap-2 border border-[#d7a45f]/30 bg-[#d7a45f]/10 px-4 text-xs font-semibold text-[#f2c57d]">Open lead <ArrowUpRight className="size-4"/></button><button className="inline-flex h-11 items-center justify-center gap-2 border border-white/10 bg-white/[.03] px-4 text-xs font-semibold text-white/55">Mark contacted <Check className="size-4"/></button></section>
                </div>
              </aside>
            </section>

            <footer className="mt-3 flex flex-col gap-2 px-2 pb-3 pt-2 text-[10px] text-white/22 sm:flex-row sm:items-center sm:justify-between"><span>Rukh Leads · Visual preview</span><span>Sample records only · private production data not connected yet</span></footer>
          </main>
        </div>
      </div>
    </div>
  );
}
