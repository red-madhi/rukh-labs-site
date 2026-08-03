import Link from "next/link";
import { RukhMark } from "@/components/brand/rukh-mark";
import { RukhWordmark } from "@/components/brand/rukh-wordmark";
import { cn } from "@/lib/utils";

type LogoProps = {
  href?: string;
  className?: string;
};

export function Logo({ href = "/", className }: LogoProps) {
  const content = (
    <span className="inline-flex items-center gap-2.5" aria-label="Rukh Labs">
      <RukhMark size="md" decorative />
      <RukhWordmark compact />
    </span>
  );

  if (!href) {
    return <div className={cn("inline-flex items-center", className)}>{content}</div>;
  }

  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[color:var(--brand-red)]",
        className,
      )}
    >
      {content}
    </Link>
  );
}
