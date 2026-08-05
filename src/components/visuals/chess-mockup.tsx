import { Badge } from "@/components/ui/badge";
import { OfficialBrandArt } from "@/components/brand/official-brand-art";

const moves = ["1. e4 c5", "2. Nf3 d6", "3. d4 cxd4"];
const pieces: Record<number, { symbol: string; side: "light" | "dark" }> = {
  4: { symbol: "♔", side: "light" },
  9: { symbol: "♘", side: "light" },
  12: { symbol: "♗", side: "light" },
  19: { symbol: "♙", side: "light" },
  28: { symbol: "♕", side: "light" },
  35: { symbol: "♟", side: "dark" },
  44: { symbol: "♞", side: "dark" },
  51: { symbol: "♚", side: "dark" },
};

export function ChessMockup() {
  return (
    <div className="relative overflow-hidden rounded-[2rem] border border-[#f4bd43]/22 bg-[#080706] p-4 shadow-[0_28px_120px_rgba(176,112,0,0.14)]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_22%_18%,rgba(244,189,67,0.2),transparent_34%),radial-gradient(circle_at_82%_80%,rgba(125,76,0,0.16),transparent_36%)]" />
      <div className="absolute right-4 top-4 z-10 opacity-90">
        <OfficialBrandArt brand="farzin" decorative className="size-10 rounded-xl" />
      </div>
      <div className="relative grid items-center gap-4 lg:grid-cols-[minmax(0,1.16fr)_minmax(230px,0.84fr)]">
        <div className="relative mx-auto aspect-square w-full max-w-[32rem] overflow-hidden rounded-xl border border-white/14 bg-[#12100c]">
          <div className="absolute inset-y-3 left-3 z-10 hidden w-3 overflow-hidden rounded-full border border-black/28 bg-black/32 shadow-[0_3px_14px_rgba(0,0,0,0.42)] sm:flex sm:flex-col-reverse">
            {Array.from({ length: 20 }).map((_, index) => (
              <span
                key={index}
                className={index < 11 ? "flex-1 bg-[#f4bd43]" : "flex-1 bg-[#8d5d16]"}
              />
            ))}
          </div>
          <div className="grid h-full w-full grid-cols-8">
            {Array.from({ length: 64 }).map((_, index) => {
              const row = Math.floor(index / 8);
              const isLight = (row + index) % 2 === 0;
              const piece = pieces[index];

              return (
                <span
                  key={index}
                  className={`relative grid place-items-center ${
                    isLight ? "bg-[#c99639]" : "bg-[#12100c]"
                  }`}
                >
                  {piece ? (
                    <span
                      aria-hidden
                      className={`text-2xl leading-none sm:text-3xl ${
                        piece.side === "light"
                          ? "text-[#fff1c7] drop-shadow-[0_2px_1px_rgba(0,0,0,0.72)]"
                          : "text-[#171006] drop-shadow-[0_1px_0_rgba(255,231,174,0.42)]"
                      }`}
                      style={{ fontFamily: '"Segoe UI Symbol", "Noto Sans Symbols 2", serif' }}
                    >
                      {piece.symbol}
                    </span>
                  ) : null}
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
            <h3 className="mt-4 text-lg font-semibold text-white">Analysis line</h3>
            <div className="mt-3 space-y-2.5">
              {moves.map((move) => (
                <div key={move} className="flex items-center justify-between text-sm">
                  <span className="font-mono text-white/68">{move}</span>
                  <span className="text-[#f3d99d]">best</span>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-lg border border-[#d6ad5b]/20 bg-[#d6ad5b]/9 p-4">
            <p className="text-xs font-medium text-[#f3d99d]">Training card</p>
            <h4 className="mt-2 text-base font-semibold text-white">
              Mistake pattern: overloaded defender
            </h4>
            <div className="mt-3 flex flex-wrap gap-2">
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
