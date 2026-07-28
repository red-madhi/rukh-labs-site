import { OfficialBrandArt } from "@/components/brand/official-brand-art";
import { OSMiniPreview } from "@/components/visuals/os-mockup";
import { cn } from "@/lib/utils";

type HeroTileProps = {
  label: string;
  meta: string;
  tone: "glass" | "farzin";
  children: React.ReactNode;
  bodyClassName?: string;
};

function HeroTile({
  label,
  meta,
  tone,
  children,
  bodyClassName,
}: HeroTileProps) {
  const isGlass = tone === "glass";

  return (
    <div
      className={cn(
        "grid min-h-0 grid-rows-[minmax(0,1fr)_auto] overflow-hidden rounded-[1.1rem] border bg-black/62 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] sm:rounded-[1.35rem]",
        isGlass
          ? "border-[#16c8ff]/28 shadow-[0_0_55px_rgba(18,159,255,0.09),inset_0_1px_0_rgba(255,255,255,0.06)]"
          : "border-[#f2ba3b]/28 shadow-[0_0_55px_rgba(242,186,59,0.08),inset_0_1px_0_rgba(255,255,255,0.06)]",
      )}
    >
      <div
        className={cn(
          "min-h-0 overflow-hidden p-2 sm:p-3",
          bodyClassName,
        )}
      >
        {children}
      </div>
      <div className="flex min-w-0 items-center justify-between gap-2 border-t border-white/10 px-2.5 py-2 sm:px-3 sm:py-2.5">
        <span
          className={cn(
            "truncate text-[9px] font-semibold sm:text-xs",
            isGlass ? "text-[#93ebff]" : "text-[#ffe09a]",
          )}
        >
          {label}
        </span>
        <span
          className={cn(
            "hidden shrink-0 text-[8px] font-semibold uppercase tracking-[0.16em] sm:inline sm:text-[9px]",
            isGlass ? "text-cyan-100/42" : "text-[#f8d987]/42",
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
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(255,0,29,0.22),transparent_32%),radial-gradient(circle_at_82%_22%,rgba(0,187,255,0.16),transparent_30%),radial-gradient(circle_at_70%_84%,rgba(120,64,255,0.16),transparent_34%)]" />
      <div className="relative grid h-full grid-cols-2 grid-rows-2 gap-2.5 sm:gap-4">
        <HeroTile label="Glass Squares OS" meta="Desktop" tone="glass">
          <div className="h-full overflow-hidden rounded-[0.8rem] border border-white/8 bg-[#020617] sm:rounded-[0.95rem]">
            <OfficialBrandArt
              brand="glass-squares"
              priority
              className="h-full w-full scale-[1.05] object-contain"
            />
          </div>
        </HeroTile>

        <HeroTile label="Farzin" meta="Chess" tone="farzin">
          <div className="h-full overflow-hidden rounded-[0.8rem] border border-white/8 bg-[#050403] sm:rounded-[0.95rem]">
            <OfficialBrandArt
              brand="farzin"
              priority
              className="h-full w-full scale-[0.94] object-contain"
            />
          </div>
        </HeroTile>

        <HeroTile
          label="Live desktop"
          meta="Glass shell"
          tone="glass"
          bodyClassName="flex items-center"
        >
          <OSMiniPreview className="aspect-auto h-full w-full rounded-[0.8rem] sm:rounded-[0.95rem]" />
        </HeroTile>

        <HeroTile
          label="Game analysis"
          meta="+0.42"
          tone="farzin"
          bodyClassName="flex items-center justify-center"
        >
          <div className="grid aspect-square h-full max-h-full max-w-full grid-cols-6 overflow-hidden rounded-[0.8rem] border border-white/10 sm:rounded-[0.95rem]">
              {Array.from({ length: 36 }).map((_, index) => (
                <span
                  key={index}
                  className={(Math.floor(index / 6) + index) % 2 === 0 ? "bg-[#171112]" : "bg-[#b8894d]/78"}
                />
              ))}
          </div>
        </HeroTile>
      </div>
    </div>
  );
}
