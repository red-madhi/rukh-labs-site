import Link from "next/link";
import { ArrowRight, Boxes, Crown, LayoutGrid } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { buttonStyles } from "@/components/ui/button";
import type { Product } from "@/lib/products";

type ProductCardProps = {
  product: Pick<
    Product,
    "name" | "category" | "status" | "shortDescription" | "features" | "href" | "slug"
  >;
  cta: string;
};

const iconMap = {
  "glass-squares-os": LayoutGrid,
  farzin: Crown,
  lab: Boxes,
};

export function ProductCard({ product, cta }: ProductCardProps) {
  const Icon = iconMap[product.slug as keyof typeof iconMap] ?? Boxes;

  return (
    <Card interactive className="flex h-full flex-col p-6">
      <div className="flex items-start justify-between gap-4">
        <span className="grid size-12 place-items-center rounded-lg border border-[color:var(--brand-red)]/24 bg-[color:var(--brand-red)]/10 text-[#ffb4b8]">
          <Icon aria-hidden className="size-5" />
        </span>
        <Badge tone={product.status === "Research" ? "slate" : "gold"}>
          {product.status}
        </Badge>
      </div>
      <div className="mt-7">
        <p className="text-sm font-medium text-[#d6ad5b]">{product.category}</p>
        <h2 className="mt-3 text-2xl font-semibold text-white">{product.name}</h2>
        <p className="mt-4 text-sm leading-6 text-white/62">
          {product.shortDescription}
        </p>
      </div>
      <ul className="mt-6 grid gap-2 text-sm text-white/56">
        {product.features.slice(0, 3).map((feature) => (
          <li key={feature} className="flex items-center gap-2">
            <span aria-hidden className="size-1.5 rounded-full bg-[color:var(--brand-red)]" />
            {feature}
          </li>
        ))}
      </ul>
      <Link
        href={product.href}
        className={buttonStyles({
          variant: "secondary",
          className: "mt-8 w-full justify-between",
        })}
      >
        {cta}
        <ArrowRight aria-hidden className="size-4" />
      </Link>
    </Card>
  );
}
