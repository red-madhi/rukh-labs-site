import { ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PublicationMeta } from "@/components/content/publication-meta";
import { TrackedLink } from "@/components/analytics/tracked-link";
import type { Insight } from "@/lib/insights";

export function InsightCard({ insight }: { insight: Insight }) {
  return (
    <article className="group flex h-full flex-col rounded-2xl border border-white/10 bg-white/[0.02] p-6 transition hover:border-[#16c8ff]/35 hover:bg-[#16c8ff]/[0.035]">
      <Badge tone="blue">{insight.category}</Badge>
      <h2 className="mt-5 text-xl font-semibold leading-7 text-white">{insight.title}</h2>
      <p className="mt-3 text-sm leading-6 text-white/58">{insight.summary}</p>
      <div className="mt-5"><PublicationMeta publishedOn={insight.publishedOn} modifiedOn={insight.modifiedOn} /></div>
      <TrackedLink href={`/insights/${insight.slug}`} eventName="insight_article_open" eventProperties={{ article_slug: insight.slug, source_page: "insight_card" }} className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-[#9feaff] underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[color:var(--brand-red)]">
        Read {insight.title}<ArrowRight aria-hidden className="size-4 transition group-hover:translate-x-0.5" />
      </TrackedLink>
    </article>
  );
}
