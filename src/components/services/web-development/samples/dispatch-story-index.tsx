"use client";

import { useState } from "react";
import { ArrowRight, LockKeyhole, Search } from "lucide-react";

type DispatchCategory = "Cities" | "Work" | "Culture" | "Design";
type DispatchAccess = "Free" | "Supporting members";

type DispatchStory = {
  category: DispatchCategory;
  access: DispatchAccess;
  title: string;
  description: string;
  author: string;
  date: string;
  isoDate: string;
  readTime: string;
  series: string;
};

const stories = [
  {
    category: "Cities",
    access: "Free",
    title: "The third place that costs nothing",
    description:
      "A field guide to rooms, porches, and public tables where staying is not conditional on buying.",
    author: "Lena Ortiz",
    date: "July 19, 2026",
    isoDate: "2026-07-19",
    readTime: "7 min",
    series: "Public Rooms",
  },
  {
    category: "Work",
    access: "Supporting members",
    title: "Who owns the quiet hour?",
    description:
      "What disappears when every empty minute becomes available for work.",
    author: "Malik Foster",
    date: "July 12, 2026",
    isoDate: "2026-07-12",
    readTime: "9 min",
    series: "Work Without Measure",
  },
  {
    category: "Culture",
    access: "Free",
    title: "A library of things people almost threw away",
    description:
      "Inside a repair archive where ordinary objects keep their histories.",
    author: "Iris Chen",
    date: "July 5, 2026",
    isoDate: "2026-07-05",
    readTime: "11 min",
    series: "Useful Objects",
  },
  {
    category: "Design",
    access: "Supporting members",
    title: "Maintenance is the product",
    description:
      "Why the best systems make care visible before something breaks.",
    author: "Evan Rook",
    date: "June 28, 2026",
    isoDate: "2026-06-28",
    readTime: "6 min",
    series: "Designed to Last",
  },
  {
    category: "Cities",
    access: "Free",
    title: "The slow comeback of public benches",
    description:
      "A seat, a patch of shade, and the case for designing a city around pauses.",
    author: "Lena Ortiz",
    date: "June 21, 2026",
    isoDate: "2026-06-21",
    readTime: "8 min",
    series: "Public Rooms",
  },
  {
    category: "Culture",
    access: "Supporting members",
    title: "The neighborhood theater keeps the lights low",
    description:
      "What one stubbornly independent screen understands about belonging.",
    author: "Iris Chen",
    date: "June 14, 2026",
    isoDate: "2026-06-14",
    readTime: "10 min",
    series: "Places That Remain",
  },
] as const satisfies readonly DispatchStory[];

const categories = ["All", "Cities", "Work", "Culture", "Design"] as const;

export function DispatchStoryIndex() {
  const [activeCategory, setActiveCategory] =
    useState<(typeof categories)[number]>("All");
  const [query, setQuery] = useState("");

  const normalizedQuery = query.trim().toLocaleLowerCase();
  const visibleStories = stories.filter((story) => {
    const inCategory =
      activeCategory === "All" || story.category === activeCategory;
    const inSearch =
      normalizedQuery.length === 0 ||
      [
        story.title,
        story.description,
        story.author,
        story.series,
        story.category,
      ]
        .join(" ")
        .toLocaleLowerCase()
        .includes(normalizedQuery);

    return inCategory && inSearch;
  });

  return (
    <div className="mt-10">
      <div className="grid gap-4 rounded-2xl border border-[#151a18]/10 bg-white p-3 shadow-[0_16px_45px_rgba(30,36,33,0.05)] lg:grid-cols-[1fr_auto] lg:items-center">
        <label className="flex min-h-11 items-center gap-3 rounded-xl bg-[#f3f1eb] px-4 text-[#151a18]/64 focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[#b8402d]">
          <Search aria-hidden className="size-4 shrink-0" />
          <span className="sr-only">Search the story archive</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search titles, authors, or series"
            className="min-w-0 flex-1 bg-transparent text-sm text-[#151a18] outline-none placeholder:text-[#151a18]/52"
          />
        </label>
        <div
          aria-label="Filter article archive"
          className="flex gap-1 overflow-x-auto"
          role="group"
        >
          {categories.map((category) => {
            const active = activeCategory === category;

            return (
              <button
                key={category}
                type="button"
                aria-pressed={active}
                onClick={() => setActiveCategory(category)}
                className={`min-h-11 shrink-0 rounded-full px-3.5 text-xs font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#b8402d] ${
                  active
                    ? "bg-[#151a18] text-white"
                    : "text-[#151a18]/64 hover:bg-[#f3f1eb] hover:text-[#151a18]"
                }`}
              >
                {category}
              </button>
            );
          })}
        </div>
      </div>

      <p
        aria-live="polite"
        className="mt-4 text-xs font-medium text-[#151a18]/62"
      >
        {visibleStories.length}{" "}
        {visibleStories.length === 1 ? "story" : "stories"} found
      </p>

      {visibleStories.length > 0 ? (
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visibleStories.map((story) => (
            <details
              key={story.title}
            className="group rounded-[1.35rem] border border-[#151a18]/10 bg-white p-5 shadow-[0_16px_45px_rgba(30,36,33,0.045)] open:border-[#b8402d]/30 sm:p-6"
            >
              <summary className="flex cursor-pointer list-none flex-col sm:min-h-[17rem] [&::-webkit-details-marker]:hidden">
                <div className="flex items-start justify-between gap-4">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#a83b2b]">
                    {story.category}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                      story.access === "Free"
                        ? "bg-[#edf1eb] text-[#446250]"
                        : "bg-[#f8ebe7] text-[#a74431]"
                    }`}
                  >
                    {story.access === "Supporting members" ? (
                      <LockKeyhole aria-hidden className="size-3" />
                    ) : null}
                    {story.access}
                  </span>
                </div>
                <h3 className="mt-7 [font-family:Georgia,'Times_New_Roman',serif] text-3xl font-bold leading-[1.02] tracking-[-0.045em]">
                  {story.title}
                </h3>
                <p className="mt-4 text-sm leading-7 text-[#151a18]/64">
                  {story.description}
                </p>
                <div className="mt-auto flex items-center justify-between gap-4 border-t border-[#151a18]/10 pt-5 text-xs">
                  <span className="font-semibold">{story.author}</span>
                  <span className="inline-flex items-center gap-2 font-semibold text-[#a83b2b]">
                    Preview
                    <ArrowRight
                      aria-hidden
                      className="size-3.5 transition group-open:rotate-90"
                    />
                  </span>
                </div>
              </summary>
              <div className="border-t border-[#151a18]/10 pt-5">
                <p className="[font-family:Georgia,'Times_New_Roman',serif] text-base leading-8 text-[#151a18]/70">
                  {story.description} This archive preview preserves the story
                  context, byline, series, access level, and publication date
                  before a reader opens the full essay.
                </p>
                <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] font-medium text-[#151a18]/62">
                  <time dateTime={story.isoDate}>{story.date}</time>
                  <span>{story.readTime} read</span>
                  <span>{story.series}</span>
                </div>
                <a
                  href={
                    story.access === "Free"
                      ? "#dispatch-reader"
                      : "#dispatch-membership"
                  }
                  className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-full bg-[#151a18] px-4 text-xs font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#b8402d]"
                >
                  {story.access === "Free"
                    ? "Open the featured sample essay"
                    : "Preview supporting membership"}
                  <ArrowRight aria-hidden className="size-3.5" />
                </a>
              </div>
            </details>
          ))}
        </div>
      ) : (
        <div className="mt-5 rounded-2xl border border-dashed border-[#151a18]/18 bg-white/70 p-8 text-center">
          <p className="text-sm font-semibold">No stories match that search.</p>
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setActiveCategory("All");
            }}
            className="mt-3 min-h-11 rounded-full bg-[#151a18] px-4 text-xs font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#b8402d]"
          >
            Clear filters
          </button>
        </div>
      )}
    </div>
  );
}
