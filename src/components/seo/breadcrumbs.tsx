import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { StructuredData } from "@/components/seo/structured-data";
import { siteConfig } from "@/lib/site-config";
import { cn } from "@/lib/utils";

export type BreadcrumbItem = {
  name: string;
  path: string;
};

export function Breadcrumbs({
  items,
  className,
}: {
  items: readonly BreadcrumbItem[];
  className?: string;
}) {
  const data = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: new URL(item.path, siteConfig.url).toString(),
    })),
  };

  return (
    <>
      <StructuredData data={data} />
      <nav aria-label="Breadcrumb" className={cn("text-sm", className)}>
        <ol className="flex flex-wrap items-center gap-2 text-white/48">
          {items.map((item, index) => {
            const current = index === items.length - 1;
            return (
              <li key={item.path} className="flex items-center gap-2">
                {index > 0 ? (
                  <ChevronRight aria-hidden className="size-3.5 text-white/28" />
                ) : null}
                {current ? (
                  <span aria-current="page" className="font-medium text-white/72">
                    {item.name}
                  </span>
                ) : (
                  <Link
                    href={item.path}
                    className="rounded-sm transition hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[color:var(--brand-red)]"
                  >
                    {item.name}
                  </Link>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    </>
  );
}
