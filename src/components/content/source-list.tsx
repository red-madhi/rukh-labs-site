import { ExternalLink } from "lucide-react";
import type { ContentSource } from "@/lib/content";
import { formatPublicationDate } from "@/components/content/publication-meta";

export function SourceList({ sources }: { sources: readonly ContentSource[] }) {
  if (!sources.length) return null;

  return (
    <section aria-labelledby="sources" className="border-t border-white/10 pt-10">
      <h2 id="sources" className="text-2xl font-semibold text-white">Sources</h2>
      <ul className="mt-5 grid gap-4">
        {sources.map((source) => (
          <li key={source.href} className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
            <a href={source.href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 font-medium text-[#9feaff] underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[color:var(--brand-red)]">
              {source.title}<ExternalLink aria-hidden className="size-3.5" />
            </a>
            <p className="mt-2 text-sm leading-6 text-white/58">{source.publisher} · Accessed {formatPublicationDate(source.accessedOn)}. {source.reason}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
