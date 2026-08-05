import {
  BriefcaseBusiness,
  ChartNoAxesCombined,
  PanelsTopLeft,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

type StudioTileProps = {
  label: string;
  meta: string;
  tone: "web" | "career";
  children: React.ReactNode;
};

function StudioTile({ label, meta, tone, children }: StudioTileProps) {
  const isWeb = tone === "web";

  return (
    <div
      className={cn(
        "grid min-h-0 grid-rows-[minmax(0,1fr)_auto] overflow-hidden rounded-[1.1rem] border bg-black/62 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] sm:rounded-[1.35rem]",
        isWeb
          ? "border-[#16c8ff]/28 shadow-[0_0_55px_rgba(18,159,255,0.09),inset_0_1px_0_rgba(255,255,255,0.06)]"
          : "border-[#9a6dff]/30 shadow-[0_0_55px_rgba(135,89,255,0.09),inset_0_1px_0_rgba(255,255,255,0.06)]",
      )}
    >
      <div className="min-h-0 overflow-hidden p-2 sm:p-3">{children}</div>
      <div className="flex min-w-0 items-center justify-between gap-2 border-t border-white/10 px-2.5 py-2 sm:px-3 sm:py-2.5">
        <span
          className={cn(
            "truncate text-[9px] font-semibold sm:text-xs",
            isWeb ? "text-[#93ebff]" : "text-[#c8b9ff]",
          )}
        >
          {label}
        </span>
        <span
          className={cn(
            "hidden shrink-0 text-[8px] font-semibold uppercase tracking-[0.16em] sm:inline sm:text-[9px]",
            isWeb ? "text-cyan-100/42" : "text-[#d8ceff]/42",
          )}
        >
          {meta}
        </span>
      </div>
    </div>
  );
}

export function HeroVisual() {
  return (
    <div className="hero-panel relative mx-auto aspect-square w-full max-w-[580px] overflow-hidden rounded-[1.6rem] border border-white/12 bg-[#040407]/82 p-2.5 shadow-[0_30px_130px_rgba(0,0,0,0.58)] backdrop-blur sm:rounded-[2rem] sm:p-4">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(255,0,29,0.22),transparent_32%),radial-gradient(circle_at_82%_22%,rgba(0,187,255,0.16),transparent_30%),radial-gradient(circle_at_70%_84%,rgba(120,64,255,0.2),transparent_34%)]" />
      <div className="relative grid h-full grid-cols-2 grid-rows-2 gap-2.5 sm:gap-4">
        <StudioTile label="Web Development" meta="Design & build" tone="web">
          <div className="flex h-full flex-col rounded-[0.8rem] border border-white/8 bg-[#020617] p-3 sm:rounded-[0.95rem] sm:p-4">
            <div className="flex items-center justify-between text-[#8ce8ff]">
              <PanelsTopLeft aria-hidden className="size-4 sm:size-5" />
              <span className="rounded-full border border-[#16c8ff]/30 bg-[#16c8ff]/10 px-2 py-1 text-[7px] font-semibold uppercase tracking-[0.12em] sm:text-[8px]">
                Live
              </span>
            </div>
            <div className="mt-4 grid flex-1 grid-rows-[auto_1fr_auto] rounded-lg border border-white/10 bg-white/[0.035] p-2.5 sm:mt-5 sm:p-3">
              <div className="flex gap-1.5">
                <span className="size-1.5 rounded-full bg-[#ff596b]" />
                <span className="size-1.5 rounded-full bg-[#f4bd43]" />
                <span className="size-1.5 rounded-full bg-[#55d9ff]" />
              </div>
              <div className="flex flex-col justify-center">
                <span className="h-2.5 w-4/5 rounded-full bg-white/85" />
                <span className="mt-2 h-1.5 w-full rounded-full bg-white/18" />
                <span className="mt-1.5 h-1.5 w-3/4 rounded-full bg-white/12" />
              </div>
              <div className="h-7 rounded-md bg-[linear-gradient(90deg,rgba(22,200,255,0.92),rgba(109,49,255,0.82))]" />
            </div>
          </div>
        </StudioTile>

        <StudioTile label="Career Portfolios" meta="Proof & positioning" tone="career">
          <div className="flex h-full flex-col rounded-[0.8rem] border border-white/8 bg-[#0a0712] p-3 sm:rounded-[0.95rem] sm:p-4">
            <div className="flex items-center justify-between text-[#c8b9ff]">
              <BriefcaseBusiness aria-hidden className="size-4 sm:size-5" />
              <span className="text-[8px] font-semibold uppercase tracking-[0.14em] text-[#d8ceff]/52">
                Profile
              </span>
            </div>
            <div className="mt-4 flex flex-1 flex-col justify-center sm:mt-5">
              <div className="flex items-center gap-2.5">
                <span className="grid size-8 place-items-center rounded-full bg-[linear-gradient(135deg,#cabdff,#8255ef)] text-[9px] font-bold text-[#170d2d] sm:size-10 sm:text-xs">
                  AR
                </span>
                <div className="min-w-0">
                  <span className="block h-2.5 w-20 rounded-full bg-white/85" />
                  <span className="mt-1.5 block h-1.5 w-14 rounded-full bg-white/18" />
                </div>
              </div>
              <div className="mt-4 grid gap-2">
                {[
                  ["Strategy", "88%"],
                  ["Systems", "74%"],
                  ["Impact", "92%"],
                ].map(([label, value]) => (
                  <div key={label} className="grid grid-cols-[1fr_auto] gap-2 text-[8px] sm:text-[9px]">
                    <span className="text-white/52">{label}</span>
                    <span className="font-semibold text-[#c8b9ff]">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </StudioTile>

        <StudioTile label="Clear direction" meta="Before pixels" tone="web">
          <div className="flex h-full flex-col justify-between rounded-[0.8rem] border border-white/8 bg-[#020617] p-3 sm:rounded-[0.95rem] sm:p-4">
            <ChartNoAxesCombined aria-hidden className="size-4 text-[#8ce8ff] sm:size-5" />
            <div>
              <div className="flex h-11 items-end gap-1.5 sm:h-14">
                {[28, 48, 36, 66, 55, 82].map((height, index) => (
                  <span
                    key={height}
                    className="flex-1 rounded-t-sm bg-[linear-gradient(180deg,rgba(85,217,255,0.95),rgba(24,140,255,0.32))]"
                    style={{ height: `${height}%`, opacity: 0.52 + index * 0.08 }}
                  />
                ))}
              </div>
              <p className="mt-3 text-[9px] font-semibold text-white/74 sm:text-xs">
                Strategy before decoration.
              </p>
            </div>
          </div>
        </StudioTile>

        <StudioTile label="Memorable proof" meta="For the right audience" tone="career">
          <div className="flex h-full flex-col justify-between rounded-[0.8rem] border border-white/8 bg-[#0a0712] p-3 sm:rounded-[0.95rem] sm:p-4">
            <Sparkles aria-hidden className="size-4 text-[#c8b9ff] sm:size-5" />
            <div className="rounded-lg border border-[#c8b9ff]/16 bg-[#c8b9ff]/[0.06] p-2.5 sm:p-3">
              <span className="block text-[8px] font-semibold uppercase tracking-[0.15em] text-[#d8ceff]/54">
                The signal
              </span>
              <p className="mt-2 text-[10px] font-semibold leading-4 text-white/82 sm:text-xs sm:leading-5">
                Make the work easier to understand and remember.
              </p>
            </div>
          </div>
        </StudioTile>
      </div>
    </div>
  );
}
