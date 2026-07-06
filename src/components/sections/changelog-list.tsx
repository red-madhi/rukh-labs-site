"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { ChangelogEntry } from "@/lib/changelog";
import { cn } from "@/lib/utils";

type ChangelogListProps = {
  entries: ChangelogEntry[];
};

const filters = ["All", "Glass Squares OS", "Farzin", "Lab"] as const;

export function ChangelogList({ entries }: ChangelogListProps) {
  const [filter, setFilter] = useState<(typeof filters)[number]>("All");

  const visibleEntries = useMemo(() => {
    if (filter === "All") {
      return entries;
    }

    return entries.filter((entry) => entry.product === filter);
  }, [entries, filter]);

  return (
    <div>
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Changelog filters">
        {filters.map((item) => (
          <button
            key={item}
            type="button"
            role="tab"
            aria-selected={filter === item}
            onClick={() => setFilter(item)}
            className={cn(
              "rounded-full border px-4 py-2 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--brand-red)]",
              filter === item
                ? "border-[#d6ad5b]/45 bg-[#d6ad5b]/12 text-[#f3d99d]"
                : "border-white/12 bg-white/[0.035] text-white/58 hover:border-[color:var(--brand-red)]/40 hover:text-white",
            )}
          >
            {item}
          </button>
        ))}
      </div>
      <div className="mt-8 grid gap-4">
        {visibleEntries.map((entry) => (
          <Card key={`${entry.date}-${entry.title}`} className="p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <time className="text-sm text-white/42" dateTime={entry.date}>
                    {entry.date}
                  </time>
                  <Badge
                    tone={
                      entry.product === "Glass Squares OS"
                        ? "red"
                        : entry.product === "Farzin"
                          ? "gold"
                          : "slate"
                    }
                  >
                    {entry.product}
                  </Badge>
                </div>
                <h2 className="mt-4 text-xl font-semibold text-white">{entry.title}</h2>
              </div>
              <Badge tone="slate">{entry.status}</Badge>
            </div>
            <p className="mt-4 max-w-3xl text-sm leading-6 text-white/60">
              {entry.description}
            </p>
          </Card>
        ))}
      </div>
    </div>
  );
}
