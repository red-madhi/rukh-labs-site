import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";

type RevealProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
};

type RevealStyle = CSSProperties & { "--reveal-delay": string };

export function Reveal({ children, className, delay = 0 }: RevealProps) {
  return (
    <div
      className={cn("reveal-enter", className)}
      style={{ "--reveal-delay": `${delay}s` } as RevealStyle}
    >
      {children}
    </div>
  );
}
