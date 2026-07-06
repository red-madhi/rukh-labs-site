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
          "rounded-lg border border-[color:var(--brand-red)]/35 bg-black/55 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)]",
        glow && "shadow-[0_0_42px_rgba(183,29,37,0.42),inset_0_0_0_1px_rgba(255,255,255,0.05)]",
        className,
      )}
    >
      <svg
        viewBox="0 0 64 64"
        fill="none"
        className="size-[72%] drop-shadow-[0_0_14px_rgba(255,43,54,0.65)]"
      >
        <path
          d="M9 8H35.5L50 20.5V31L42.8 36.2L55 56H39.2L29.4 39.2H23.5V56H9V8Z"
          fill="url(#rukhMarkFill)"
        />
        <path
          d="M23.5 20.5V28.2H34.4L39.8 24.5L34.4 20.5H23.5Z"
          fill="#090607"
          fillOpacity="0.82"
        />
        <path
          d="M34.5 8L50 20.5H36.8L27.8 8H34.5Z"
          fill="#ff4a52"
          fillOpacity="0.82"
        />
        <path
          d="M25 38.8L39.2 56H31.2L20.6 38.8H25Z"
          fill="#6d0d14"
          fillOpacity="0.78"
        />
        <path
          d="M9 8H35.5L50 20.5V31L42.8 36.2L55 56H39.2L29.4 39.2H23.5V56H9V8Z"
          stroke="#ff6a70"
          strokeOpacity="0.55"
          strokeWidth="1.2"
        />
        <defs>
          <linearGradient id="rukhMarkFill" x1="9" y1="6" x2="56" y2="58" gradientUnits="userSpaceOnUse">
            <stop stopColor="#ff343f" />
            <stop offset="0.44" stopColor="#b41420" />
            <stop offset="1" stopColor="#5d070d" />
          </linearGradient>
        </defs>
      </svg>
    </span>
  );
}
