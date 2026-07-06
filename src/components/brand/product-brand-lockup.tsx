import { RukhMark } from "@/components/brand/rukh-mark";
import { cn } from "@/lib/utils";

type ProductBrandLockupProps = {
  product: string;
  line?: string;
  className?: string;
};

export function ProductBrandLockup({
  product,
  line = "by Rukh Labs",
  className,
}: ProductBrandLockupProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-3 rounded-lg border border-[color:var(--brand-red)]/20 bg-black/30 px-3 py-2",
        className,
      )}
    >
      <RukhMark size="sm" glow container={false} decorative />
      <span className="leading-none">
        <span className="block text-sm font-semibold text-white">{product}</span>
        <span className="mt-1 block text-xs text-white/46">{line}</span>
      </span>
    </div>
  );
}
