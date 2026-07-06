import { Badge } from "@/components/ui/badge";

const terminalLines = [
  "$ rukh status --clean",
  "kernel: lean",
  "desktop: intentional",
  "analysis: +0.42",
];

const moves = ["1. e4 c5", "2. Nf3 d6", "3. d4 cxd4"];

export function HeroVisual() {
  return (
    <div className="hero-panel relative mx-auto aspect-[1.02] w-full max-w-[560px] overflow-hidden rounded-lg border border-white/12 bg-[#07101a]/72 p-4 shadow-[0_30px_130px_rgba(0,0,0,0.45)] backdrop-blur">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_10%,rgba(77,183,255,0.22),transparent_34%),radial-gradient(circle_at_78%_84%,rgba(214,173,91,0.18),transparent_36%)]" />
      <div className="visual-grid absolute inset-0 opacity-40" />
      <div className="relative grid h-full gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="flex flex-col gap-4">
          <div className="rounded-lg border border-white/12 bg-[#08121e]/84 p-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex gap-1.5" aria-hidden>
                <span className="size-2 rounded-full bg-[#ff6b6b]" />
                <span className="size-2 rounded-full bg-[#d6ad5b]" />
                <span className="size-2 rounded-full bg-[#4db7ff]" />
              </div>
              <Badge tone="blue">Rukh Shell</Badge>
            </div>
            <div className="mt-4 grid gap-3">
              <div className="h-24 rounded-lg border border-white/10 bg-[linear-gradient(135deg,#0b1723,#111827_45%,#0a0d12)] p-3">
                <div className="h-2 w-24 rounded-full bg-[#f4e8c8]/62" />
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {["Files", "Terminal", "Updates"].map((item) => (
                    <div key={item} className="rounded-md border border-white/10 bg-white/[0.045] p-2">
                      <div className="h-2 w-8 rounded-full bg-[#4db7ff]/55" />
                      <p className="mt-3 text-[10px] text-white/58">{item}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {["Low bloat", "Private", "Fast"].map((chip) => (
                  <span
                    key={chip}
                    className="rounded-full border border-[#d6ad5b]/22 bg-[#d6ad5b]/9 px-2 py-1 text-center text-[10px] text-[#f3d99d]"
                  >
                    {chip}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <div className="rounded-lg border border-white/12 bg-black/40 p-4 font-mono text-[11px] leading-6 text-[#9fdcff]">
            {terminalLines.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="rounded-lg border border-white/12 bg-[#090e15]/86 p-4">
            <div className="grid aspect-square grid-cols-6 overflow-hidden rounded-md border border-white/10">
              {Array.from({ length: 36 }).map((_, index) => (
                <span
                  key={index}
                  className={(Math.floor(index / 6) + index) % 2 === 0 ? "bg-[#172332]" : "bg-[#d6ad5b]/78"}
                />
              ))}
            </div>
            <div className="mt-4 flex items-center justify-between">
              <Badge tone="gold">Farzin</Badge>
              <span className="rounded-full bg-[#4db7ff]/12 px-3 py-1 text-xs font-semibold text-[#9fdcff]">
                +0.42
              </span>
            </div>
          </div>
          <div className="rounded-lg border border-white/12 bg-white/[0.045] p-4">
            <p className="text-xs font-semibold text-white">Candidate line</p>
            <div className="mt-3 space-y-2">
              {moves.map((move) => (
                <div key={move} className="flex items-center justify-between text-xs text-white/58">
                  <span>{move}</span>
                  <span className="text-[#f3d99d]">review</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
