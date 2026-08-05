import { Badge } from "@/components/ui/badge";

export function WorkHeader({
  projectType,
  status,
  title,
  summary,
}: {
  projectType: string;
  status: string;
  title: string;
  summary: string;
}) {
  return (
    <header className="max-w-4xl">
      <div className="flex flex-wrap gap-3">
        <Badge tone="blue">{projectType}</Badge>
        <Badge tone="ivory">{status}</Badge>
      </div>
      <h1 className="mt-6 text-4xl font-semibold leading-[1.04] tracking-[-0.04em] text-white sm:text-6xl">
        {title}
      </h1>
      <p className="mt-6 max-w-3xl text-lg leading-8 text-white/68 sm:text-xl">{summary}</p>
    </header>
  );
}
