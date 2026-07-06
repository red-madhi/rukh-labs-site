import Link from "next/link";
import { cn } from "@/lib/utils";

type LogoProps = {
  href?: string;
  className?: string;
};

function LogoMark() {
  return (
    <span className="relative grid size-9 place-items-center rounded-lg border border-[#d6ad5b]/45 bg-[#0c1118] shadow-[0_0_38px_rgba(77,183,255,0.18)]">
      <span className="absolute left-2 top-2 h-1.5 w-1.5 rounded-sm bg-[#f4e8c8]" />
      <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-sm bg-[#f4e8c8]" />
      <span className="absolute bottom-2 left-2 right-2 h-1 rounded-sm bg-[#4db7ff]/75" />
      <span className="absolute left-1/2 top-3 h-4 w-px -translate-x-1/2 bg-white/18" />
      <span className="absolute left-2 right-2 top-1/2 h-px bg-white/18" />
    </span>
  );
}

export function Logo({ href = "/", className }: LogoProps) {
  const content = (
    <>
      <LogoMark />
      <span className="flex flex-col leading-none">
        <span className="text-base font-semibold text-white">Rukh Labs</span>
        <span className="mt-1 text-[11px] font-medium text-white/48">
          Independent software lab
        </span>
      </span>
    </>
  );

  if (!href) {
    return <div className={cn("inline-flex items-center gap-3", className)}>{content}</div>;
  }

  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center gap-3 rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#4db7ff]",
        className,
      )}
    >
      {content}
    </Link>
  );
}
