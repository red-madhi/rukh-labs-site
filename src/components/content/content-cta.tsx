import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import type { ContentCta } from "@/lib/content";

function ContentCta({ cta }: { cta: ContentCta }) {
  return (
    <aside className="rounded-2xl border border-[#16c8ff]/20 bg-[linear-gradient(135deg,rgba(22,200,255,0.09),rgba(109,49,255,0.06),rgba(255,255,255,0.025))] p-6 sm:p-8">
      <Badge tone={cta.variant === "product" ? "gold" : "blue"}>{cta.eyebrow}</Badge>
      <h2 className="mt-5 text-2xl font-semibold text-white sm:text-3xl">{cta.title}</h2>
      <p className="mt-3 max-w-2xl text-base leading-7 text-white/62">{cta.description}</p>
      <Link href={cta.href} className={buttonStyles({ className: "mt-6" })}>{cta.label}<ArrowRight aria-hidden className="size-4" /></Link>
    </aside>
  );
}

export function ServiceCTA({ cta }: { cta: ContentCta }) {
  return <ContentCta cta={{ ...cta, variant: "service" }} />;
}

export function ProductCTA({ cta }: { cta: ContentCta }) {
  return <ContentCta cta={{ ...cta, variant: "product" }} />;
}
