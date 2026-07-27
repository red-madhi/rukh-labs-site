import { OfficialBrandArt } from "@/components/brand/official-brand-art";
import { RukhMark } from "@/components/brand/rukh-mark";
import { cn } from "@/lib/utils";

type BrandBannerProps = {
  className?: string;
};

export function BrandBanner({ className }: BrandBannerProps) {
  return (
    <div
      className={cn(
        "brand-frame relative overflow-hidden rounded-[1.75rem] border border-[color:var(--brand-red)]/32 bg-[linear-gradient(115deg,#050506_0%,#130608_48%,#050506_100%)] p-5 shadow-[0_24px_100px_rgba(0,0,0,0.48)] sm:p-8",
        className,
      )}
    >
      <div className="absolute inset-y-0 right-[-5rem] hidden opacity-25 sm:block">
        <RukhMark size="hero" glow container={false} decorative />
      </div>
      <div className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,#ff001d,var(--brand-red),transparent)]" />
      <div className="relative grid gap-6 sm:grid-cols-[minmax(0,1.15fr)_minmax(260px,0.85fr)] sm:items-center">
        <div>
          <OfficialBrandArt
            brand="rukh-labs"
            className="w-full max-w-[560px]"
          />
          <p className="mt-3 max-w-xl text-sm leading-6 text-white/58 sm:text-base">
            Independent software with a sharper standard for design, privacy,
            and control.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="overflow-hidden rounded-2xl border border-[#16c8ff]/25 bg-[#020617] p-2 shadow-[0_0_45px_rgba(18,159,255,0.12)]">
            <OfficialBrandArt brand="glass-squares" decorative className="rounded-xl" />
          </div>
          <div className="overflow-hidden rounded-2xl border border-[#f2ba3b]/25 bg-black p-2 shadow-[0_0_45px_rgba(242,186,59,0.1)]">
            <OfficialBrandArt brand="farzin" decorative className="rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}
