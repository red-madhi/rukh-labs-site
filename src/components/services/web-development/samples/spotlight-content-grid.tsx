"use client";

import { useState } from "react";
import { BookOpen, Clapperboard, Play } from "lucide-react";

type SpotlightContentType = "film" | "guide" | "short";

type SpotlightContentItem = {
  type: SpotlightContentType;
  typeLabel: string;
  title: string;
  description: string;
  meta: string;
  artClass: string;
  accentClass: string;
  marker: string;
};

const contentItems = [
  {
    type: "film",
    typeLabel: "Film",
    title: "Kyoto after the last train",
    description:
      "A quiet 12-hour route through late kitchens, river paths, and the first market of the morning.",
    meta: "12 min · Japan",
    artClass: "bg-[#6657ff]",
    accentClass: "bg-[#c7ee4f] text-[#17133c]",
    marker: "01",
  },
  {
    type: "guide",
    typeLabel: "Field guide",
    title: "Seven days from one carry-on",
    description:
      "The exact packing system, layers, and small tools that earned their place on a three-city rail trip.",
    meta: "9 min read · Packing",
    artClass: "bg-[#ffd552]",
    accentClass: "bg-[#17133c] text-[#fff6ed]",
    marker: "02",
  },
  {
    type: "short",
    typeLabel: "Short",
    title: "The café worth missing a tram for",
    description:
      "A two-minute stop in Lisbon for tiled walls, perfect espresso, and a counter that has not changed in 40 years.",
    meta: "2 min · Portugal",
    artClass: "bg-[#ff654f]",
    accentClass: "bg-[#fff6ed] text-[#17133c]",
    marker: "03",
  },
  {
    type: "guide",
    typeLabel: "Field guide",
    title: "A better first day in Copenhagen",
    description:
      "A low-stress walking route with good bread, harbor light, useful design, and no race across town.",
    meta: "11 min read · Denmark",
    artClass: "bg-[#c7ee4f]",
    accentClass: "bg-[#6657ff] text-white",
    marker: "04",
  },
  {
    type: "film",
    typeLabel: "Film",
    title: "The coast road in winter",
    description:
      "Wind, empty beaches, and the small Atlantic towns that make an off-season trip worth taking.",
    meta: "16 min · Ireland",
    artClass: "bg-[#17133c]",
    accentClass: "bg-[#ff654f] text-[#17133c]",
    marker: "05",
  },
  {
    type: "short",
    typeLabel: "Short",
    title: "Three things I stopped packing",
    description:
      "The bulky, fragile, and overpromised travel gear that stays home now.",
    meta: "90 sec · Gear",
    artClass: "bg-[#f1dfcf]",
    accentClass: "bg-[#ffd552] text-[#17133c]",
    marker: "06",
  },
] as const satisfies readonly SpotlightContentItem[];

const filters = [
  { id: "all", label: "Everything" },
  { id: "film", label: "Films" },
  { id: "guide", label: "Guides" },
  { id: "short", label: "Shorts" },
] as const;

function ContentIcon({ type }: { type: SpotlightContentType }) {
  if (type === "film") {
    return <Clapperboard aria-hidden className="size-4" />;
  }

  if (type === "guide") {
    return <BookOpen aria-hidden className="size-4" />;
  }

  return <Play aria-hidden className="size-4" />;
}

export function SpotlightContentGrid() {
  const [activeFilter, setActiveFilter] = useState<
    (typeof filters)[number]["id"]
  >("all");

  const visibleItems =
    activeFilter === "all"
      ? contentItems
      : contentItems.filter((item) => item.type === activeFilter);

  return (
    <div className="mt-12">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div
          aria-label="Filter creator stories"
          className="flex flex-wrap gap-2"
          role="group"
        >
          {filters.map((filter) => {
            const active = activeFilter === filter.id;

            return (
              <button
                key={filter.id}
                type="button"
                aria-pressed={active}
                onClick={() => setActiveFilter(filter.id)}
                className={`min-h-11 rounded-full border-2 px-4 text-xs font-black uppercase tracking-[0.11em] transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#6657ff] ${
                  active
                    ? "border-[#17133c] bg-[#17133c] text-[#fff6ed]"
                    : "border-[#17133c]/24 bg-transparent text-[#17133c]/64 hover:border-[#17133c] hover:text-[#17133c]"
                }`}
              >
                {filter.label}
              </button>
            );
          })}
        </div>
        <p
          aria-live="polite"
          className="shrink-0 text-[10px] font-black uppercase tracking-[0.13em] text-[#17133c]/64"
        >
          {visibleItems.length} {visibleItems.length === 1 ? "story" : "stories"}
        </p>
      </div>

      <div className="mt-7 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {visibleItems.map((item) => (
          <article
            key={item.title}
            className="group overflow-hidden rounded-[1.75rem] border-2 border-[#17133c] bg-[#fffaf4] shadow-[6px_7px_0_#17133c] transition hover:-translate-y-1 hover:shadow-[9px_11px_0_#17133c]"
          >
            <div
              className={`relative flex min-h-52 items-end overflow-hidden p-5 ${item.artClass}`}
            >
              <span
                aria-hidden
                className="absolute -right-8 -top-8 size-36 rounded-full border-[18px] border-[#fff6ed]/42"
              />
              <span
                aria-hidden
                className="absolute left-7 top-7 h-20 w-28 -rotate-6 border-2 border-[#17133c]/55"
              />
              <span
                className={`relative z-10 grid size-12 place-items-center rounded-full text-sm font-black ${item.accentClass}`}
              >
                {item.marker}
              </span>
            </div>
            <div className="p-6">
              <div className="flex items-center justify-between gap-4 text-[11px] font-black uppercase tracking-[0.12em] text-[#ff4f3b]">
                <span className="inline-flex items-center gap-2">
                  <ContentIcon type={item.type} />
                  {item.typeLabel}
                </span>
                <span className="text-[#17133c]/66">{item.meta}</span>
              </div>
              <h3 className="mt-5 text-2xl font-black leading-[0.98] tracking-[-0.045em] text-[#17133c]">
                {item.title}
              </h3>
              <p className="mt-4 text-sm leading-7 text-[#17133c]/62">
                {item.description}
              </p>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
