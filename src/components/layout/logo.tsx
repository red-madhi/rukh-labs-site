import Link from "next/link";
import { RukhMark } from "@/components/brand/rukh-mark";
import { cn } from "@/lib/utils";

type LogoProps = {
  href?: string;
  className?: string;
};

export function Logo({ href = "/", className }: LogoProps) {
  const content = (
    <>
      <RukhMark size="md" glow decorative />
      <span className="flex flex-col leading-none">
        <span className="text-lg font-semibold text-white">Rukh Labs</span>
        <span className="mt-1 text-[11px] font-medium text-[#b8894d]">
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
        "inline-flex items-center gap-3 rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[color:var(--brand-red)]",
        className,
      )}
    >
      {content}
    </Link>
  );
}
