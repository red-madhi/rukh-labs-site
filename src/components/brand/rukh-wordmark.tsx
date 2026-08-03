import { cn } from "@/lib/utils";

type RukhWordmarkProps = {
  compact?: boolean;
  className?: string;
};

export function RukhWordmark({ compact = false, className }: RukhWordmarkProps) {
  return (
    <span className={cn("inline-flex min-w-0 flex-col", className)}>
      <span
        className={cn(
          "rukh-display rukh-metal-text block whitespace-nowrap text-center leading-none",
          compact ? "text-[0.78rem] tracking-[0.3em] sm:text-sm" : "text-lg sm:text-xl",
        )}
      >
        RUKH
      </span>
      <span className="mt-1 flex items-center justify-center gap-1.5" aria-hidden="true">
        <span className="h-px w-4 bg-[linear-gradient(90deg,transparent,var(--brand-gold))] sm:w-5" />
        <span
          className={cn(
            "rukh-display rukh-gold-text leading-none",
            compact ? "text-[0.42rem] tracking-[0.42em] sm:text-[0.48rem]" : "text-[0.58rem] tracking-[0.44em]",
          )}
        >
          LABS
        </span>
        <span className="h-px w-4 bg-[linear-gradient(90deg,var(--brand-gold),transparent)] sm:w-5" />
      </span>
    </span>
  );
}
