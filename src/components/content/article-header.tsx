import { Badge } from "@/components/ui/badge";
import { PublicationMeta } from "@/components/content/publication-meta";

export function ArticleHeader({
  category,
  title,
  summary,
  publishedOn,
  modifiedOn,
}: {
  category: string;
  title: string;
  summary: string;
  publishedOn: string;
  modifiedOn: string;
}) {
  return (
    <header className="max-w-4xl">
      <Badge tone="blue">{category}</Badge>
      <h1 className="mt-6 text-4xl font-semibold leading-[1.04] tracking-[-0.04em] text-white sm:text-6xl">
        {title}
      </h1>
      <p className="mt-6 max-w-3xl text-lg leading-8 text-white/68 sm:text-xl">{summary}</p>
      <div className="mt-7 border-t border-white/10 pt-5">
        <PublicationMeta publishedOn={publishedOn} modifiedOn={modifiedOn} />
      </div>
    </header>
  );
}
