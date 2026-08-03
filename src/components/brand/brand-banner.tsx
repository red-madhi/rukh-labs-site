import { OfficialBrandArt } from "@/components/brand/official-brand-art";
import { cn } from "@/lib/utils";

type BrandBannerProps = {
  className?: string;
};

export function BrandBanner({ className }: BrandBannerProps) {
  return (
    <div
      className={cn(
        "brand-frame group relative overflow-hidden rounded-[1.75rem] border border-[color:var(--brand-red)]/32 bg-[#08090b] p-1.5 shadow-[0_24px_100px_rgba(0,0,0,0.52),0_0_54px_rgba(240,0,28,0.08)] sm:p-2",
        className,
      )}
    >
      <div className="absolute inset-x-[8%] top-0 z-10 h-px bg-[linear-gradient(90deg,transparent,var(--brand-red),var(--brand-gold),transparent)]" />
      <OfficialBrandArt
        brand="rukh-labs"
        className="hidden w-full rounded-[1.35rem] sm:block"
      />
      <OfficialBrandArt
        brand="rukh-labs-stacked"
        className="aspect-square w-full rounded-[1.35rem] object-cover sm:hidden"
      />
      <div className="pointer-events-none absolute inset-0 rounded-[1.75rem] ring-1 ring-inset ring-white/8" />
    </div>
  );
}
