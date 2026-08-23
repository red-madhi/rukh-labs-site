import { cn } from "@/lib/utils";

type IazmaBrandArtProps = {
  variant?: "wide" | "square" | "compact";
  className?: string;
  decorative?: boolean;
};

export function IazmaBrandArt({
  variant = "wide",
  className,
  decorative = false,
}: IazmaBrandArtProps) {
  const isSquare = variant === "square";
  const isCompact = variant === "compact";

  return (
    <div
      role={decorative ? undefined : "img"}
      aria-hidden={decorative || undefined}
      aria-label={decorative ? undefined : "IAZMA"}
      className={cn(
        "relative isolate w-full min-w-0 overflow-hidden border border-[#77e9ff]/30 bg-[#086cff] shadow-[0_22px_80px_rgba(0,126,255,0.24)]",
        isSquare ? "aspect-square rounded-[2rem]" : isCompact ? "aspect-[1.7/1] rounded-2xl" : "aspect-[2/1] rounded-[2rem]",
        className,
      )}
    >
      <div className="absolute inset-0 bg-[linear-gradient(180deg,#0658ec_0%,#078af8_48%,#19d8f4_100%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_92%,rgba(255,255,255,0.72),transparent_25%),radial-gradient(circle_at_48%_38%,rgba(27,222,255,0.2),transparent_48%)]" />

      <div
        className={cn(
          "absolute left-1/2 top-[8%] -translate-x-1/2 rounded-full border border-[#75f5ff]/85 shadow-[0_0_18px_rgba(77,240,255,0.85),inset_0_0_28px_rgba(0,199,255,0.16)]",
          isSquare ? "size-[86%]" : "h-[128%] w-[72%]",
        )}
      />
      <div className="absolute left-[19%] top-[11%] size-2 rounded-full bg-white shadow-[0_0_16px_6px_rgba(255,255,255,0.7)]" />

      <svg
        aria-hidden="true"
        viewBox="0 0 1000 500"
        preserveAspectRatio="none"
        className="absolute inset-0 size-full opacity-90"
      >
        <path d="M-80 328 C170 230 240 495 505 430 S820 245 1080 305" fill="none" stroke="rgba(231,254,255,.92)" strokeWidth="2" />
        <path d="M-40 380 C235 270 320 500 535 452 S805 318 1040 245" fill="none" stroke="rgba(104,245,255,.86)" strokeWidth="2" />
        <path d="M-20 420 C180 312 325 506 540 467 S820 380 1040 280" fill="none" stroke="rgba(255,255,255,.48)" strokeWidth="1.2" />
        <circle cx="174" cy="322" r="5" fill="white" />
        <circle cx="292" cy="411" r="5" fill="white" />
        <circle cx="782" cy="346" r="5" fill="white" />
      </svg>

      <div className="absolute inset-x-[-4%] bottom-[-10%] h-[38%]">
        <div className="absolute bottom-0 left-0 h-[70%] w-[34%] rounded-[50%] bg-[radial-gradient(circle_at_58%_25%,#ffffff_0%,#d9f7ff_26%,#86dcff_57%,#0879ea_100%)] blur-[0.2px]" />
        <div className="absolute bottom-[8%] left-[16%] h-[58%] w-[28%] rounded-[50%] bg-[radial-gradient(circle_at_52%_24%,#ffffff_0%,#dffaff_29%,#7fd9ff_62%,#0877e8_100%)]" />
        <div className="absolute bottom-0 right-0 h-[72%] w-[35%] rounded-[50%] bg-[radial-gradient(circle_at_42%_24%,#ffffff_0%,#dcf8ff_26%,#88ddff_58%,#0877e8_100%)]" />
        <div className="absolute bottom-[7%] right-[16%] h-[58%] w-[28%] rounded-[50%] bg-[radial-gradient(circle_at_50%_22%,#ffffff_0%,#e3fbff_28%,#80d9ff_62%,#0877e8_100%)]" />
        <div className="absolute inset-x-[22%] bottom-[3%] h-[42%] rounded-[50%] bg-[radial-gradient(ellipse_at_50%_25%,#ffffff_0%,#ddf9ff_34%,#76d9ff_68%,rgba(6,115,232,.2)_100%)]" />
      </div>

      <div className="absolute inset-x-0 top-1/2 z-10 -translate-y-[54%] text-center">
        <span
          className={cn(
            "inline-block font-sans font-medium lowercase tracking-[-0.075em] text-white [text-shadow:0_0_10px_rgba(255,255,255,.55),0_0_26px_rgba(59,229,255,.68)]",
            isSquare ? "text-[clamp(3.5rem,18vw,8.5rem)]" : isCompact ? "text-[clamp(2.3rem,8vw,5.5rem)]" : "text-[clamp(3.2rem,11vw,8rem)]",
          )}
        >
          iazma
        </span>
      </div>

      <div className="absolute inset-x-[18%] bottom-[5%] h-[8%] rounded-full bg-white/55 blur-2xl" />
      <div className="absolute inset-0 ring-1 ring-inset ring-white/10" />
    </div>
  );
}
