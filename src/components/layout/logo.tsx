import Link from "next/link";
import { OfficialBrandArt } from "@/components/brand/official-brand-art";
import { cn } from "@/lib/utils";

type LogoProps = {
  href?: string;
  className?: string;
};

export function Logo({ href = "/", className }: LogoProps) {
  const content = (
    <OfficialBrandArt
      brand="rukh-labs"
      priority
      className="w-[176px] sm:w-[202px]"
    />
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
