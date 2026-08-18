import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Rukh Leads Preview",
  description: "Private Rukh Labs lead intelligence dashboard preview.",
  robots: { index: false, follow: false },
};

const cut = {
  clipPath:
    "polygon(0 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, 16px 100%, 0 calc(100% - 16px))",
};

function Radar() {
  return (
    <div className="relative mx-auto aspect-square w-40 rounded-full border border-[#ef2a26]/50 bg-[#070504] shadow-[0_0_55px_rgba(239,42,38,.14)]">
      <div className="absolute inset-[16%] rounded-full border border-[#ef2a26]/35" />
      <div className="absolute inset-[33%] rounded-full border border-[#ef2a26]/35" />
      <div className="absolute left-1/2 top-0 h-full w-px bg-[#ef2a26]/25" />
      <div className="absolute left-0 top-1/2 h-px w-full bg-[#ef2a26]/25" />
      <div className="absolute left-[26%] top-[32%] size-2 rounded-full bg-[#e7b66b] shadow-[0_0_12px_#e7b66b]" />
      <div className="absolute right-[27%] top-[45%] size-1.5 rounded-full bg-[#f5efe0] shadow-[0_0_10px_#fff]" />
      <div className="absolute bottom-[28%] left-[47%] size-2.5 rounded-full bg-[#ef2a26] shadow-[0_0_14px_#ef2a26]" />
      <div className="absolute inset-0 grid place-items-center">
        <div className="rounded-full border border-white/10 bg-black/80 px-4 py-2 text-center">
          <div className="text-2xl font-black text-[#f5efe0]">7</div>
          <div className="text-[9px] font-bold uppercase tracking-[.22em] text-white/40">hot</div>
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value, note, hot = false }: { label: string; value: string; note: string; hot?: boolean }) {
  return (
    <div className="border border-white/10 bg-[#090807]/90 p-4 shadow-[0_20px_60px_rgba(0,0,0,.3)]" style={cut}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[9px] font-bold uppercase tracking-[.18em] text-white/30">{label}</p>
          <p className={`mt-2 text-3xl font-black tracking-[-.05em] ${hot ? "text-[#ff766b]" : "text-[#f5efe0]"}`}>{value}</p>
          <p className="mt-2 text-xs text-white/35">{note}</p>
        </div>
        <span className={`grid size-9 place-items-center border text-sm ${hot ? "border-[#ef2a26]/35 bg-[#ef2a26]/10 text-[#ff766b]" : "border-[#d7a45f]/25 bg-[#d7a45f]/[.07] text-[#e7b66b]"}`}>
          {hot ? "●" : "◇"}
        </span>
      </div>
    </div>
  );
}

function LeadRow({ score, company, meta, age, summary, tags, active = false, hot = false }: { score: number; company: string; meta: string; age: string; summary: string; tags: string[]; active?: boolean; hot?: boolean }) {
  return (
    <div className={`border-b border-white/7 p-4 sm:p-5 ${active ? "bg-[#d7a45f]/[.06]" : "bg-transparent"}`}>
      <div className="flex items-start gap-3">
        <div className={`mt-1 grid size-9 shrink-0 place-items-center border text-xs font-black ${hot ? "border-[#ef2a26]/30 bg-[#ef2a26]/10 text-[#ff766b]" : "border-[#d7a45f]/25 bg-[#d7a45f]/[.08] text-[#e7b66b]"}`}>
          {hot ? "!" : "◎"}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-semibold text-white">{company}</h3>
                <span className="text-[9px] font-semibold uppercase tracking-[.12em] text-white/28">{age}</span>
              </div>
              <p className="mt-1 text-xs text-white/34">{meta}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="border border-white/10 bg-black/20 px-2.5 py-1 text-[10px] font-semibold text-white/48">New</span>
              <span className={`min-w-12 border px-2.5 py-1 text-center text-sm font-black ${score >= 90 ? "border-[#ef2a26]/45 bg-[#ef2a26]/10 text-[#ff8b80]" : "border-[#d7a45f]/40 bg-[#d7a45f]/10 text-[#f3c77d]"}`}>{score}</span>
            </div>
          </div>
          <p className="mt-3 text-sm leading-6 text-white/44">{summary}</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {tags.map((tag) => <span key={tag} className="border border-white/8 bg-black/20 px-2 py-1 text-[9px] text-white/30">{tag}</span>)}
          </div>
        </div>
        <span className="mt-2 hidden text-[#d7a45f] sm:block">›</span>
      </div>
    </div>
  );
}

export default function LeadsPreviewPage() {
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
      <div className="pointer-events-none fixed inset-x-[-20vw] bottom-[-42vh] h-[78vh] origin-bottom [transform:perspective(500px)_rotateX(64deg)] opacity-20" style={{ backgroundImage: "linear-gradient(rgba(215,164,95,.25)_1px,transparent_1px),linear-gradient(90deg,rgba(239,42,38,.22)_1px,transparent_1px)", backgroundSize: "64px 64px" }} />

      <div className="relative mx-auto min-h-screen max-w-[1840px] p-3 sm:p-5 lg:p-7">
        <header className="relative overflow-hidden border border-white/10 bg-[#090807]/90 px-4 py-5 shadow-[0_25px_80px_rgba(0,0,0,.45)] backdrop-blur-xl sm:px-7" style={cut}>
          <div className="absolute left-0 top-0 h-1 w-32 bg-[#ef2a26]" />
          <div className="absolute right-0 top-0 h-1 w-24 bg-[#d7a45f]" />
          <div className="relative flex items-start justify-between gap-5">
            <div>
              <div className="flex flex-wrap gap-2">
                <span className="border border-[#d7a45f]/25 bg-[#d7a45f]/[.07] px-2.5 py-1 text-[9px] font-bold uppercase tracking-[.2em] text-[#e9ba71]">◆ Private signal room</span>
                <span className="border border-[#ef2a26]/25 bg-[#ef2a26]/[.07] px-2.5 py-1 text-[9px] font-bold uppercase tracking-[.2em] text-[#ff8b80]">● Preview data</span>
              </div>
              <h1 className="mt-3 text-[clamp(2.35rem,7vw,5rem)] font-black uppercase leading-[.86] tracking-[-.075em]">
                <span className="bg-gradient-to-b from-[#fffdf7] via-[#d7d0c2] to-[#fff2d2] bg-clip-text text-transparent">Rukh</span>{" "}
                <span className="bg-gradient-to-b from-[#ffe6ae] via-[#d7a45f] to-[#7f5020] bg-clip-text text-transparent">Leads</span>
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-white/48 sm:text-base">A private radar for businesses most likely to need a website — ranked before you spend time chasing them.</p>
            </div>
            <div className="hidden border border-white/10 bg-black/30 px-4 py-3 text-right md:block">
              <p className="text-[9px] font-bold uppercase tracking-[.18em] text-white/28">System</p>
              <p className="mt-1 text-xs font-semibold text-[#8fd7a6]">● Scanning</p>
            </div>
          </div>
        </header>

        <div className="mt-3 grid gap-3 lg:grid-cols-[235px_minmax(0,1fr)]">
          <aside className="hidden h-fit border border-white/10 bg-[#090807]/90 p-3 backdrop-blur-xl lg:sticky lg:top-3 lg:block" style={cut}>
            <div className="border-b border-white/8 px-3 pb-4 pt-2">
              <p className="text-[9px] font-bold uppercase tracking-[.22em] text-white/28">Lead operations</p>
              <p className="mt-2 text-sm font-semibold text-white/72">Signal console</p>
            </div>
            <nav className="mt-3 space-y-1 text-sm font-semibold">
              <div className="border border-[#d7a45f]/30 bg-[#d7a45f]/[.08] px-3 py-3 text-[#f2c57d]">▦ &nbsp; Overview</div>
              <div className="border border-transparent px-3 py-3 text-white/50">● &nbsp; Hot leads <span className="float-right text-[#ff766b]">7</span></div>
              <div className="border border-transparent px-3 py-3 text-white/50">⌁ &nbsp; Intent signals</div>
              <div className="border border-transparent px-3 py-3 text-white/50">◎ &nbsp; Site audits</div>
              <div className="border border-transparent px-3 py-3 text-white/50">⇢ &nbsp; Pipeline</div>
              <div className="border border-transparent px-3 py-3 text-white/50">◫ &nbsp; Sources</div>
            </nav>
            <div className="mt-5 border-t border-white/8 pt-5">
              <Radar />
              <p className="mt-4 text-center text-[9px] font-bold uppercase tracking-[.2em] text-white/28">Nationwide scan</p>
            </div>
          </aside>

          <main className="min-w-0">
            <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <Metric label="Active leads" value="128" note="Across all sources" />
              <Metric label="Hot right now" value="7" note="Score 85 or higher" hot />
              <Metric label="New today" value="24" note="Not yet contacted" />
              <Metric label="Intent hits" value="11" note="Explicit public asks" />
            </section>

            <section className="mt-3 grid min-w-0 gap-3 xl:grid-cols-[minmax(0,1fr)_390px]">
              <div className="min-w-0 overflow-hidden border border-white/10 bg-[#090807]/90" style={cut}>
                <div className="flex flex-col gap-3 border-b border-white/8 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-[.2em] text-[#d7a45f]">Overview</p>
                    <h2 className="mt-1 text-xl font-bold tracking-[-.03em] text-white">Priority queue</h2>
                  </div>
                  <div className="border border-white/10 bg-black/30 px-3 py-2 text-sm text-white/28">⌕ Search leads...</div>
                </div>
                <LeadRow active hot score={96} company="Front Range Home Services" meta="Home services · Denver, CO" age="8m ago" summary="Public post says they need someone to rebuild an outdated site before a fall campaign launches." tags={["intent", "urgent", "rebuild", "service business"]} />
                <LeadRow hot score={90} company="Hollow Creek Contracting LLC" meta="Specialty contracting · Raleigh, NC" age="41m ago" summary="Recently formed contractor with an active business footprint but no discoverable website." tags={["new business", "no site", "contractor"]} />
                <LeadRow score={84} company="Northstar Wellness Studio" meta="Wellness · Portland, OR" age="1h ago" summary="Strong business signals, but the mobile experience is weak and the booking action is buried." tags={["mobile", "booking", "redesign"]} />
                <LeadRow score={79} company="Morrow & Finch Consulting" meta="Professional services · Chicago, IL" age="2h ago" summary="Direct inquiry requests a modern service site with clear offerings and a lead-capture form." tags={["inbound", "qualified", "service site"]} />
              </div>

              <aside className="h-fit overflow-hidden border border-white/10 bg-[#090807]/94 xl:sticky xl:top-3" style={cut}>
                <div className="relative border-b border-white/8 p-5">
                  <div className="absolute right-0 top-0 h-1 w-20 bg-[#ef2a26]" />
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[9px] font-bold uppercase tracking-[.2em] text-[#d7a45f]">Lead detail</span>
                    <span className="border border-[#ef2a26]/45 bg-[#ef2a26]/10 px-3 py-1 text-sm font-black text-[#ff8b80]">96/100</span>
                  </div>
                  <h2 className="mt-3 text-2xl font-bold tracking-[-.04em] text-white">Front Range Home Services</h2>
                  <p className="mt-2 text-xs text-white/34">Home services · Denver, CO</p>
                  <p className="mt-4 text-sm leading-6 text-white/48">Public post says they need someone to rebuild an outdated site before a fall campaign launches.</p>
                </div>
                <div className="space-y-6 p-5">
                  <section>
                    <h3 className="text-[10px] font-bold uppercase tracking-[.16em] text-white/58"><span className="text-[#ef2a26]">◎</span> Why it scored</h3>
                    <ul className="mt-3 space-y-2 text-xs leading-5 text-white/44">
                      <li><span className="mr-2 text-emerald-200/75">✓</span>Explicit website request</li>
                      <li><span className="mr-2 text-emerald-200/75">✓</span>Posted under 15 minutes ago</li>
                      <li><span className="mr-2 text-emerald-200/75">✓</span>Established service business</li>
                      <li><span className="mr-2 text-emerald-200/75">✓</span>Launch deadline mentioned</li>
                    </ul>
                    <div className="mt-4 border border-[#d7a45f]/16 bg-[#d7a45f]/[.04] p-3 text-[11px] leading-5 text-[#e7b66b]/70"><b className="text-[#f2c57d]">Watch:</b> other designers may respond quickly.</div>
                  </section>
                  <section>
                    <div className="flex items-center justify-between gap-3"><h3 className="text-[10px] font-bold uppercase tracking-[.16em] text-white/58">◈ Suggested opener</h3><span className="text-[10px] font-bold uppercase tracking-[.12em] text-white/30">Copy</span></div>
                    <div className="mt-3 border border-white/9 bg-[#f5efe0] p-4 text-sm leading-6 text-[#17120d]">Saw your post about rebuilding the site before the campaign. I build fast, conversion-focused sites for service businesses, and I can already see a cleaner mobile quote path. I can send a concise plan and fixed-scope estimate.</div>
                  </section>
                  <section className="grid grid-cols-2 gap-2"><div className="border border-[#d7a45f]/30 bg-[#d7a45f]/10 px-4 py-3 text-center text-xs font-semibold text-[#f2c57d]">Open lead ↗</div><div className="border border-white/10 bg-white/[.03] px-4 py-3 text-center text-xs font-semibold text-white/55">Mark contacted ✓</div></section>
                </div>
              </aside>
            </section>

            <footer className="mt-3 flex flex-col gap-2 px-2 pb-3 pt-2 text-[10px] text-white/22 sm:flex-row sm:items-center sm:justify-between"><span>Rukh Leads · Visual preview</span><span>Sample records only · production collectors not connected yet</span></footer>
          </main>
        </div>
      </div>
    </div>
  );
}
