import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type CardProps = HTMLAttributes<HTMLDivElement> & {
  interactive?: boolean;
};

export function Card({ className, interactive = false, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-lg border border-white/10 bg-[rgba(14,12,14,0.72)] shadow-[0_18px_80px_rgba(0,0,0,0.28)] backdrop-blur",
        interactive &&
          "transition duration-300 hover:-translate-y-1 hover:border-[color:var(--brand-bronze)]/45 hover:bg-[rgba(24,18,18,0.82)] hover:shadow-[0_18px_90px_rgba(183,29,37,0.12)]",
        className,
      )}
      {...props}
    />
  );
}
