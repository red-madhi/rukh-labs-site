import { Badge } from "@/components/ui/badge";
import { OfficialBrandArt } from "@/components/brand/official-brand-art";

const terminalLines = [
  "$ glass status --clean",
  "shell: square",
  "desktop: glass",
  "analysis: +0.42",
];

export function HeroVisual() {
  return (
    <div className="hero-panel relative mx-auto aspect-[1.02] w-full max-w-[580px] overflow-hidden rounded-[2rem] border border-white/12 bg-[#040407]/82 p-4 shadow-[0_30px_130px_rgba(0,0,0,0.58)] backdrop-blur">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(255,0,29,0.22),transparent_32%),radial-gradient(circle_at_82%_22%,rgba(0,187,255,0.16),transparent_30%),radial-gradient(circle_at_70%_84%,rgba(120,64,255,0.16),transparent_34%)]" />
      <div className="visual-grid absolute inset-0 opacity-40" />
      <div className="relative grid h-full grid-cols-2 gap-3 sm:gap-4">
        <div className="flex flex-col gap-4">
          <div className="overflow-hidden rounded-[1.4rem] border border-[#16c8ff]/30 bg-[#020617]/88 p-3 shadow-[0_0_70px_rgba(18,159,255,0.14)]">
            <OfficialBrandArt brand="glass-squares" priority className="rounded-[1rem]" />
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <Badge tone="blue">Glass Squares OS</Badge>
              <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-cyan-200/55">
                Desktop
              </span>
            </div>
          </div>
          <div className="rounded-[1.4rem] border border-[#16c8ff]/18 bg-black/46 p-4 font-mono text-[11px] leading-6 text-[#74dcff]">
            {terminalLines.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="overflow-hidden rounded-[1.4rem] border border-[#f2ba3b]/30 bg-black/90 p-3 shadow-[0_0_70px_rgba(242,186,59,0.1)]">
            <OfficialBrandArt brand="farzin" priority className="rounded-[1rem]" />
            <div className="mt-3 flex items-center justify-between">
              <Badge tone="gold">Farzin</Badge>
              <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-[#f8d987]/60">
                Chess
              </span>
            </div>
          </div>
          <div className="rounded-[1.4rem] border border-[#f2ba3b]/18 bg-[#090707]/86 p-4">
            <div className="grid aspect-square grid-cols-6 overflow-hidden rounded-md border border-white/10">
              {Array.from({ length: 36 }).map((_, index) => (
                <span
                  key={index}
                  className={(Math.floor(index / 6) + index) % 2 === 0 ? "bg-[#171112]" : "bg-[#b8894d]/78"}
                />
              ))}
            </div>
            <div className="mt-4 flex items-center justify-between">
              <span className="text-xs text-white/48">Live evaluation</span>
              <span className="rounded-full bg-[color:var(--brand-red)]/12 px-3 py-1 text-xs font-semibold text-[#ffb4b8]">
                +0.42
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
