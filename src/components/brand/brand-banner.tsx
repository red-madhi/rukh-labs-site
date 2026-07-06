import { RukhMark } from "@/components/brand/rukh-mark";
import { cn } from "@/lib/utils";

type BrandBannerProps = {
  className?: string;
};

export function BrandBanner({ className }: BrandBannerProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-lg border border-[color:var(--brand-red)]/24 bg-[linear-gradient(135deg,rgba(10,8,9,0.94),rgba(28,21,19,0.82)_48%,rgba(8,7,8,0.94))] p-5 shadow-[0_24px_100px_rgba(0,0,0,0.38)] sm:p-7",
        className,
      )}
    >
      <div className="absolute inset-y-0 right-[-5rem] hidden opacity-20 sm:block">
        <RukhMark size="hero" glow container={false} decorative />
      </div>
      <div className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,var(--brand-bronze),var(--brand-red),transparent)]" />
      <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center">
        <RukhMark size="xl" glow />
        <div>
          <p className="text-sm font-medium text-[color:var(--brand-bronze)]">
            Independent software lab.
          </p>
          <h2 className="mt-2 text-3xl font-semibold leading-[1.05] text-white sm:text-5xl">
            Rukh Labs
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-white/60 sm:text-base">
            Clean tools. Sharper standards. Dark luxury software for people who
            expect their tools to feel powerful, disciplined, and beautifully made.
          </p>
        </div>
      </div>
    </div>
  );
}
