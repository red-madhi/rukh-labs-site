import { Badge } from "@/components/ui/badge";

const moves = ["1. e4 c5", "2. Nf3 d6", "3. d4 cxd4"];
const pieces: Record<number, string> = {
  4: "K",
  9: "N",
  12: "B",
  19: "P",
  28: "Q",
  35: "p",
  44: "n",
  51: "k",
};

export function ChessMockup() {
  return (
    <div className="relative overflow-hidden rounded-lg border border-white/12 bg-[#080b12] p-4 shadow-[0_28px_120px_rgba(0,0,0,0.42)]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_22%_18%,rgba(214,173,91,0.16),transparent_34%),radial-gradient(circle_at_82%_80%,rgba(77,183,255,0.18),transparent_36%)]" />
      <div className="relative grid gap-4 lg:grid-cols-[1fr_280px]">
        <div className="grid gap-4 sm:grid-cols-[28px_1fr]">
          <div className="hidden overflow-hidden rounded-full border border-white/10 bg-white/[0.04] sm:flex sm:flex-col-reverse">
            {Array.from({ length: 20 }).map((_, index) => (
              <span
                key={index}
                className={index < 11 ? "flex-1 bg-[#4db7ff]" : "flex-1 bg-[#d6ad5b]"}
              />
            ))}
          </div>
          <div className="grid aspect-square grid-cols-8 overflow-hidden rounded-lg border border-white/14">
            {Array.from({ length: 64 }).map((_, index) => {
              const row = Math.floor(index / 8);
              const isLight = (row + index) % 2 === 0;

              return (
                <span
                  key={index}
                  className={`relative grid place-items-center text-lg font-semibold ${
                    isLight ? "bg-[#d6ad5b]/82 text-[#11151d]" : "bg-[#111b28] text-[#f4e8c8]"
                  }`}
                >
                  {pieces[index] ? <span>{pieces[index]}</span> : null}
                </span>
              );
            })}
          </div>
        </div>
        <div className="grid gap-4">
          <div className="rounded-lg border border-white/12 bg-white/[0.045] p-4">
            <div className="flex items-center justify-between">
              <Badge tone="gold">+0.42</Badge>
              <span className="text-xs text-white/42">Depth 22</span>
            </div>
            <h3 className="mt-5 text-lg font-semibold text-white">Analysis line</h3>
            <div className="mt-4 space-y-3">
              {moves.map((move) => (
                <div key={move} className="flex items-center justify-between text-sm">
                  <span className="font-mono text-white/68">{move}</span>
                  <span className="text-[#9fdcff]">best</span>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-lg border border-[#d6ad5b]/20 bg-[#d6ad5b]/9 p-4">
            <p className="text-xs font-medium text-[#f3d99d]">Training card</p>
            <h4 className="mt-3 text-base font-semibold text-white">
              Mistake pattern: overloaded defender
            </h4>
            <div className="mt-4 flex flex-wrap gap-2">
              {["Review", "Drill", "Prep"].map((action) => (
                <span
                  key={action}
                  className="rounded-full border border-white/12 bg-black/18 px-3 py-1 text-xs text-white/68"
                >
                  {action}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
