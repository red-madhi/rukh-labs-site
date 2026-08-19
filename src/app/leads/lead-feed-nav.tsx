import Link from "next/link";

export function LeadFeedNav({ active }: { active: "websites" | "power-bi" | "outreach" }) {
  return (
    <nav className="border-b border-white/10 bg-[#050505] px-3 py-2 sm:px-5" aria-label="Lead feeds">
      <div className="mx-auto flex max-w-[1920px] flex-wrap items-center gap-2">
        <span className="mr-1 text-[9px] font-black uppercase tracking-[.2em] text-white/28">Lead feeds</span>
        <Link
          href="/leads"
          className={`border px-3 py-2 text-[11px] font-bold uppercase tracking-[.12em] transition ${
            active === "websites"
              ? "border-[#d7a45f]/45 bg-[#d7a45f]/10 text-[#efc37c]"
              : "border-white/10 bg-white/[.025] text-white/45 hover:text-white/75"
          }`}
        >
          Website leads
        </Link>
        <Link
          href="/leads/power-bi"
          className={`border px-3 py-2 text-[11px] font-bold uppercase tracking-[.12em] transition ${
            active === "power-bi"
              ? "border-sky-300/40 bg-sky-300/[.08] text-sky-200"
              : "border-white/10 bg-white/[.025] text-white/45 hover:text-white/75"
          }`}
        >
          Power BI gigs
        </Link>
        <Link
          href="/leads/outreach"
          className={`border px-3 py-2 text-[11px] font-bold uppercase tracking-[.12em] transition ${
            active === "outreach"
              ? "border-emerald-300/35 bg-emerald-300/[.08] text-emerald-200"
              : "border-white/10 bg-white/[.025] text-white/45 hover:text-white/75"
          }`}
        >
          Outreach
        </Link>
      </div>
    </nav>
  );
}
