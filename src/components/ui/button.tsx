import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost" | "glass" | "gold";
type ButtonSize = "sm" | "md" | "lg";

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "border-transparent bg-[linear-gradient(135deg,#ff5364_0%,#f0001c_48%,#8f0011_100%)] text-white shadow-[0_14px_55px_rgba(240,0,28,0.28)] hover:brightness-110",
  secondary:
    "border-white/14 bg-white/[0.04] text-[#f7f0dd] hover:border-[color:var(--brand-red)]/55 hover:bg-[color:var(--brand-red)]/10",
  ghost:
    "border-transparent bg-transparent text-white/72 hover:bg-white/[0.06] hover:text-white",
  glass:
    "border-[#62ddff]/42 bg-[linear-gradient(135deg,#5fe0ff_0%,#188cff_48%,#6638eb_100%)] text-[#020616] shadow-[0_14px_55px_rgba(24,140,255,0.28)] hover:brightness-110",
  gold:
    "border-[#ffe29c]/38 bg-[linear-gradient(135deg,#fff0b5_0%,#f4bd43_48%,#9a5d00_100%)] text-[#120d04] shadow-[0_14px_55px_rgba(244,189,67,0.22)] hover:brightness-110",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-10 px-4 text-sm",
  md: "h-11 px-5 text-sm",
  lg: "h-12 px-6 text-base",
};

export function buttonStyles({
  variant = "primary",
  size = "md",
  className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
} = {}) {
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-full border font-medium transition duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--brand-red)] disabled:pointer-events-none disabled:opacity-50",
    variantClasses[variant],
    sizeClasses[size],
    className,
  );
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export function Button({
  className,
  variant = "primary",
  size = "md",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonStyles({ variant, size, className })}
      {...props}
    />
  );
}
