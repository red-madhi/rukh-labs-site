"use client";

import { useState } from "react";

type DispatchCategory = "Cities" | "Work" | "Culture" | "Design";

type DispatchStory = {
  category: DispatchCategory;
  title: string;
  description: string;
  author: string;
  date: string;
  isoDate: string;
  readTime: string;
  issue: string;
};

const stories = [
  {
    category: "Cities",
    title: "The third place that costs nothing",
    description:
      "A field guide to rooms, porches, and public tables where staying is not conditional on buying.",
    author: "Nora Bell",
    date: "July 19, 2026",
    isoDate: "2026-07-19",
    readTime: "7 min",
    issue: "Issue 24",
  },
  {
    category: "Work",
    title: "Who owns the quiet hour?",
    description:
      "What disappears when every empty minute becomes available for work.",
    author: "Malik Foster",
    date: "July 12, 2026",
    isoDate: "2026-07-12",
    readTime: "9 min",
    issue: "Issue 23",
  },
  {
    category: "Culture",
    title: "A library of things people almost threw away",
    description:
      "Inside a repair archive where ordinary objects keep their histories.",
    author: "Iris Chen",
    date: "July 5, 2026",
    isoDate: "2026-07-05",
    readTime: "11 min",
    issue: "Issue 22",
  },
  {
    category: "Design",
    title: "Maintenance is the product",
    description:
      "Why the best systems make care visible before something breaks.",
    author: "Evan Rook",
    date: "June 28, 2026",
    isoDate: "2026-06-28",
    readTime: "6 min",
    issue: "Issue 21",
  },
  {
    category: "Cities",
    title: "The slow comeback of public benches",
    description:
      "A seat, a patch of shade, and the case for designing a city around pauses.",
    author: "Lena Ortiz",
    date: "June 21, 2026",
    isoDate: "2026-06-21",
    readTime: "8 min",
    issue: "Issue 20",
  },
  {
    category: "Culture",
    title: "The neighborhood theater keeps the lights low",
    description:
      "What one stubbornly independent screen understands about belonging.",
    author: "Iris Chen",
    date: "June 14, 2026",
    isoDate: "2026-06-14",
    readTime: "10 min",
    issue: "Issue 19",
  },
] as const satisfies readonly DispatchStory[];

const categories = ["All", "Cities", "Work", "Culture", "Design"] as const;

export function DispatchStoryIndex() {
  const [activeCategory, setActiveCategory] =
    useState<(typeof categories)[number]>("All");

  const visibleStories =
    activeCategory === "All"
      ? stories
      : stories.filter((story) => story.category === activeCategory);

  return (
    <div className="mt-12">
      <div className="flex flex-col gap-4 border-y-[3px] border-[#18352f] py-3 sm:flex-row sm:items-center sm:justify-between">
        <div
          aria-label="Filter article archive"
          className="flex flex-wrap gap-x-5 gap-y-2"
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
                className={`min-h-11 border-b-2 px-1 text-xs font-bold uppercase tracking-[0.14em] transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#d85637] ${
                  active
                  ? "border-[#d85637] text-[#18352f]"
                    : "border-transparent text-[#18352f]/68 hover:border-[#18352f]/35 hover:text-[#18352f]"
                }`}
              >
                {category}
              </button>
            );
          })}
        </div>
        <p
          aria-live="polite"
          className="shrink-0 text-[10px] font-bold uppercase tracking-[0.14em] text-[#18352f]/68"
        >
          {visibleStories.length} {visibleStories.length === 1 ? "story" : "stories"}
        </p>
      </div>

      <div className="grid border-b border-[#18352f]/30 md:grid-cols-2 xl:grid-cols-3">
        {visibleStories.map((story, index) => (
          <article
            key={story.title}
            className="flex min-h-[24rem] flex-col border-b border-[#18352f]/30 p-6 md:odd:border-r xl:border-r xl:[&:nth-child(3n)]:border-r-0"
          >
            <div className="flex items-start justify-between gap-4">
              <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#b33a25]">
                {story.category}
              </span>
              <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#18352f]/68">
                {String(index + 1).padStart(2, "0")}
              </span>
            </div>
            <h3 className="mt-8 [font-family:Georgia,'Times_New_Roman',serif] text-3xl font-bold leading-[0.98] tracking-[-0.04em]">
              {story.title}
            </h3>
            <p className="mt-5 text-sm leading-7 text-[#18352f]/72">
              {story.description}
            </p>
            <div className="mt-auto border-t border-[#18352f]/25 pt-5">
              <p className="text-xs font-semibold">
                {story.author}
                <span className="font-normal text-[#18352f]/66">
                  {" "}
                  · {story.readTime}
                </span>
              </p>
              <div className="mt-2 flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.11em] text-[#18352f]/66">
                <time dateTime={story.isoDate}>{story.date}</time>
                <span>{story.issue}</span>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
