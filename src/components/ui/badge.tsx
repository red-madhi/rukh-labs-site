import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type BadgeTone = "gold" | "red" | "blue" | "ivory" | "slate";

const toneClasses: Record<BadgeTone, string> = {
  gold: "border-[color:var(--brand-bronze)]/40 bg-[color:var(--brand-bronze)]/10 text-[#f3d99d]",
  red: "border-[color:var(--brand-red)]/42 bg-[color:var(--brand-red)]/12 text-[#ffb4b8]",
  blue: "border-[#4f8fbf]/28 bg-[#4f8fbf]/8 text-[#b7d7ea]",
  ivory: "border-[#f4e8c8]/30 bg-[#f4e8c8]/10 text-[#fff6dc]",
  slate: "border-white/12 bg-white/[0.05] text-white/70",
};

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: BadgeTone;
};

export function Badge({ className, tone = "slate", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium",
        toneClasses[tone],
        className,
      )}
      {...props}
    />
  );
}
