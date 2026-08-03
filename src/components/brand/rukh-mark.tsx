import { cn } from "@/lib/utils";

type RukhMarkSize = "sm" | "md" | "lg" | "xl" | "hero";

type RukhMarkProps = {
  size?: RukhMarkSize;
  glow?: boolean;
  container?: boolean;
  decorative?: boolean;
  label?: string;
  className?: string;
};

const sizeClasses: Record<RukhMarkSize, string> = {
  sm: "size-8",
  md: "size-10",
  lg: "size-14",
  xl: "size-24",
  hero: "size-44 sm:size-64",
};

export function RukhMark({
  size = "md",
  glow = false,
  container = true,
  decorative = false,
  label = "Rukh Labs mark",
  className,
}: RukhMarkProps) {
  return (
    <span
      role={decorative ? undefined : "img"}
      aria-label={decorative ? undefined : label}
      aria-hidden={decorative ? true : undefined}
      className={cn(
        "relative inline-grid shrink-0 place-items-center",
        sizeClasses[size],
        container &&
          "overflow-hidden rounded-[28%] border border-[color:var(--brand-gold)]/42 bg-[#08090b] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1)]",
        glow && "shadow-[0_0_42px_rgba(240,0,28,0.32),0_0_70px_rgba(216,159,50,0.16),inset_0_0_0_1px_rgba(255,255,255,0.08)]",
        className,
      )}
    >
      <svg
        viewBox="0 0 64 64"
        fill="none"
        className={cn(
          "drop-shadow-[0_7px_15px_rgba(0,0,0,0.62)]",
          container ? "size-[92%]" : "size-full",
        )}
      >
        <rect x="2" y="2" width="60" height="60" rx="14" fill="url(#rukhPanel)" />
        <rect x="4.25" y="4.25" width="55.5" height="55.5" rx="12" stroke="url(#rukhFrame)" strokeWidth="1.1" />
        <path d="M5 18L31.8 44.7L59 17.5" stroke="#fff" strokeOpacity="0.14" strokeWidth="0.7" />
        <path d="M4.5 38L19.7 52.8L32 44.8L44.4 53L59.5 38" stroke="#f4bd43" strokeOpacity="0.52" strokeWidth="0.7" />
        <path
          d="M15 12H24V19H28V12H36V19H40V12H49V27.5L42 34L32 44.5L22 34L15 27.5V12Z"
          fill="url(#rukhRook)"
        />
        <path d="M32 44.5L19.5 57H44.5L32 44.5Z" fill="#090a0c" fillOpacity="0.82" stroke="url(#rukhFrame)" strokeWidth="0.65" />
        <path d="M18.5 57H45.5V61H18.5V57Z" fill="#090a0c" stroke="url(#rukhFrame)" strokeWidth="0.65" />
        <path d="M15 12H24V19H28V12H36V19H40V12H49V27.5L42 34L32 44.5L22 34L15 27.5V12Z" stroke="#fff" strokeOpacity="0.58" strokeWidth="0.65" />
        <path d="M6 5H31C23 7 13 12 6 24V5Z" fill="#fff" fillOpacity="0.12" />
        <defs>
          <linearGradient id="rukhPanel" x1="8" y1="4" x2="57" y2="60" gradientUnits="userSpaceOnUse">
            <stop stopColor="#393b3e" />
            <stop offset="0.34" stopColor="#111317" />
            <stop offset="0.72" stopColor="#050608" />
            <stop offset="1" stopColor="#16100a" />
          </linearGradient>
          <linearGradient id="rukhFrame" x1="7" y1="6" x2="58" y2="58" gradientUnits="userSpaceOnUse">
            <stop stopColor="#fff5d4" />
            <stop offset="0.36" stopColor="#8e9092" />
            <stop offset="0.7" stopColor="#f4bd43" />
            <stop offset="1" stopColor="#8d5b10" />
          </linearGradient>
          <linearGradient id="rukhRook" x1="20" y1="10" x2="43" y2="43" gradientUnits="userSpaceOnUse">
            <stop stopColor="#ffffff" />
            <stop offset="0.56" stopColor="#f2eee5" />
            <stop offset="1" stopColor="#d6b978" />
          </linearGradient>
        </defs>
      </svg>
    </span>
  );
}
