import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type CardProps = HTMLAttributes<HTMLDivElement> & {
  interactive?: boolean;
};

export function Card({ className, interactive = false, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-lg border border-white/10 bg-white/[0.045] shadow-[0_18px_80px_rgba(0,0,0,0.28)] backdrop-blur",
        interactive &&
          "transition duration-300 hover:-translate-y-1 hover:border-[#d6ad5b]/40 hover:bg-white/[0.065]",
        className,
      )}
      {...props}
    />
  );
}
