import { ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { TrackedLink } from "@/components/analytics/tracked-link";
import type { WorkProject } from "@/lib/work";

export function WorkCard({ project }: { project: WorkProject }) {
  return (
    <article className="group flex h-full flex-col rounded-2xl border border-white/10 bg-white/[0.02] p-6 transition hover:border-[#d6ad5b]/35 hover:bg-[#d6ad5b]/[0.035]">
      <div className="flex flex-wrap gap-2"><Badge tone="gold">{project.projectType}</Badge><Badge tone="ivory">{project.status}</Badge></div>
      <h2 className="mt-5 text-xl font-semibold leading-7 text-white">{project.title}</h2>
      <p className="mt-3 text-sm leading-6 text-white/58">{project.summary}</p>
      <TrackedLink href={`/work/${project.slug}`} eventName="work_project_open" eventProperties={{ project_slug: project.slug, source_page: "work_card" }} className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-[#f3d99d] underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[color:var(--brand-red)]">
        Explore the work<ArrowRight aria-hidden className="size-4 transition group-hover:translate-x-0.5" />
      </TrackedLink>
    </article>
  );
}
