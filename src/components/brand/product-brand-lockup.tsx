import { OfficialBrandArt } from "@/components/brand/official-brand-art";
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
  const brand = product === "Farzin" ? "farzin" : "glass-squares";

  return (
    <div
      className={cn(
        "inline-flex items-center gap-3 rounded-2xl border border-white/12 bg-black/35 p-2 pr-4 backdrop-blur-xl",
        className,
      )}
    >
      <OfficialBrandArt brand={brand} decorative className="size-11 rounded-xl" />
      <span className="leading-none">
        <span className="block text-sm font-semibold text-white">{product}</span>
        <span className="mt-1 block text-xs text-white/46">{line}</span>
      </span>
    </div>
  );
}
