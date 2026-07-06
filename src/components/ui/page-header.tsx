import { Badge } from "@/components/ui/badge";
import { Container } from "@/components/ui/container";
import { cn } from "@/lib/utils";

type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  className?: string;
};

export function PageHeader({
  eyebrow,
  title,
  description,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn("relative overflow-hidden border-b border-white/10", className)}>
      <Container className="py-20 sm:py-24 lg:py-28">
        <div className="max-w-4xl">
          {eyebrow ? <Badge tone="gold">{eyebrow}</Badge> : null}
          <h1 className="mt-6 text-4xl font-semibold leading-[1.05] text-white sm:text-6xl">
            {title}
          </h1>
          {description ? (
            <p className="mt-6 max-w-3xl text-lg leading-8 text-white/68 sm:text-xl">
              {description}
            </p>
          ) : null}
        </div>
      </Container>
    </div>
  );
}
