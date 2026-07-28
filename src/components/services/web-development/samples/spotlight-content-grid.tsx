"use client";

import { useState } from "react";
import {
  Bookmark,
  Camera,
  Clapperboard,
  Heart,
  MessageCircle,
  Music2,
  Play,
  Sparkles,
} from "lucide-react";

type SpotlightCategory = "style" | "travel" | "beauty" | "life";
type SpotlightPlatform = "Instagram" | "TikTok" | "YouTube";

type SpotlightContentItem = {
  id: string;
  category: SpotlightCategory;
  categoryLabel: string;
  platform: SpotlightPlatform;
  title: string;
  hook: string;
  views: string;
  saves: string;
  duration: string;
  tone: string;
  accent: string;
};

const contentItems = [
  {
    id: "lisbon",
    category: "travel",
    categoryLabel: "Weekend guide",
    platform: "Instagram",
    title: "48 hours in Lisbon without speed-running the city",
    hook: "Save this for the tram route, tiny hotel, and late dinner alone.",
    views: "1.8M",
    saves: "42.7K",
    duration: "0:46",
    tone:
      "bg-[radial-gradient(circle_at_64%_18%,rgba(255,255,255,0.46),transparent_17%),radial-gradient(circle_at_25%_65%,rgba(255,211,173,0.55),transparent_22%),linear-gradient(155deg,#ff9b86,#f05282_45%,#6a57d9)]",
    accent: "bg-[#ffec7a] text-[#1b1824]",
  },
  {
    id: "repeat",
    category: "style",
    categoryLabel: "Outfit repeat",
    platform: "TikTok",
    title: "Three pieces I wore all month",
    hook: "No haul. Just the things that kept making it out of the closet.",
    views: "842K",
    saves: "18.3K",
    duration: "0:31",
    tone:
      "bg-[radial-gradient(circle_at_35%_20%,rgba(255,255,255,0.3),transparent_18%),linear-gradient(155deg,#9585ff,#5546d8_48%,#211d3a)]",
    accent: "bg-white text-[#4f40cc]",
  },
  {
    id: "shelf",
    category: "beauty",
    categoryLabel: "The shelf",
    platform: "TikTok",
    title: "Five empties I actually repurchased",
    hook: "The routine is short. The opinions are not.",
    views: "614K",
    saves: "27.1K",
    duration: "0:52",
    tone:
      "bg-[radial-gradient(circle_at_70%_20%,rgba(255,255,255,0.4),transparent_17%),linear-gradient(160deg,#ffd8cb,#ff9d84_50%,#ed567f)]",
    accent: "bg-[#1b1824] text-white",
  },
  {
    id: "carry-on",
    category: "travel",
    categoryLabel: "One bag",
    platform: "YouTube",
    title: "Seven days, one carry-on, zero fantasy packing",
    hook: "Every layer, charger, and tiny thing that earned the space.",
    views: "386K",
    saves: "11.6K",
    duration: "8:14",
    tone:
      "bg-[radial-gradient(circle_at_28%_24%,rgba(255,255,255,0.34),transparent_18%),linear-gradient(155deg,#63c8bc,#357d9a_50%,#26334c)]",
    accent: "bg-[#ffec7a] text-[#1b1824]",
  },
  {
    id: "under-fifty",
    category: "style",
    categoryLabel: "Under $50",
    platform: "Instagram",
    title: "Small upgrades that made getting dressed easier",
    hook: "The belt, bag insert, and tailor fix I keep sending to friends.",
    views: "711K",
    saves: "36.4K",
    duration: "0:39",
    tone:
      "bg-[radial-gradient(circle_at_72%_26%,rgba(255,255,255,0.36),transparent_18%),linear-gradient(145deg,#e7b877,#b9706c_52%,#4e355e)]",
    accent: "bg-white text-[#1b1824]",
  },
  {
    id: "sunday-reset",
    category: "life",
    categoryLabel: "Real life",
    platform: "TikTok",
    title: "The Sunday reset that does not eat Sunday",
    hook: "Forty minutes, one playlist, and absolutely no color-coded bins.",
    views: "929K",
    saves: "54.2K",
    duration: "0:44",
    tone:
      "bg-[radial-gradient(circle_at_30%_18%,rgba(255,255,255,0.42),transparent_18%),linear-gradient(155deg,#ffcc8a,#f47a68_48%,#bf406e)]",
    accent: "bg-[#5a43d8] text-white",
  },
] as const satisfies readonly SpotlightContentItem[];

const filters = [
  { id: "all", label: "For you" },
  { id: "style", label: "Style" },
  { id: "travel", label: "Travel" },
  { id: "beauty", label: "Beauty" },
  { id: "life", label: "Real life" },
] as const;

function PlatformIcon({ platform }: { platform: SpotlightPlatform }) {
  if (platform === "Instagram") {
    return <Camera aria-hidden className="size-4" />;
  }

  if (platform === "YouTube") {
    return <Clapperboard aria-hidden className="size-4" />;
  }

  return <Music2 aria-hidden className="size-4" />;
}

export function SpotlightContentGrid() {
  const [activeFilter, setActiveFilter] = useState<
    (typeof filters)[number]["id"]
  >("all");
  const [selectedId, setSelectedId] = useState<
    (typeof contentItems)[number]["id"]
  >(contentItems[0].id);

  const visibleItems =
    activeFilter === "all"
      ? contentItems
      : contentItems.filter((item) => item.category === activeFilter);
  const selectedItem =
    visibleItems.find((item) => item.id === selectedId) ?? visibleItems[0];

  return (
    <div className="mt-12">
      <div className="flex flex-col gap-4 border-y border-[#1b1824]/10 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div
          aria-label="Filter creator content"
          className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1"
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
                className={`min-h-11 shrink-0 rounded-full border px-4 text-xs font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#5a43d8] ${
                  active
                    ? "border-[#1b1824] bg-[#1b1824] text-white"
                    : "border-[#1b1824]/14 bg-white/70 text-[#1b1824]/62 hover:border-[#1b1824]/36 hover:text-[#1b1824]"
                }`}
              >
                {filter.label}
              </button>
            );
          })}
        </div>
        <p
          aria-live="polite"
          className="shrink-0 text-[11px] font-semibold text-[#1b1824]/62"
        >
          {visibleItems.length} posts in this edit
        </p>
      </div>

      <div className="mt-7 grid gap-7 lg:grid-cols-[0.82fr_1.18fr]">
        <article
          className={`relative min-h-[34rem] overflow-hidden rounded-[2rem] text-white shadow-[0_28px_75px_rgba(45,32,72,0.2)] sm:min-h-[42rem] lg:sticky lg:top-24 lg:h-[calc(100vh-7rem)] lg:min-h-0 lg:max-h-[46rem] ${selectedItem.tone}`}
        >
          <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(12,10,20,0.86)_0%,rgba(12,10,20,0.08)_58%,rgba(12,10,20,0.22)_100%)]" />
          <div className="relative flex h-full min-h-[34rem] flex-col p-5 sm:min-h-[42rem] sm:p-7 lg:min-h-0">
            <div className="flex items-center justify-between gap-4">
              <span className="inline-flex items-center gap-2 rounded-full bg-black/24 px-3 py-2 text-[11px] font-semibold backdrop-blur-md">
                <PlatformIcon platform={selectedItem.platform} />
                {selectedItem.platform}
              </span>
              <span className="rounded-full bg-black/24 px-3 py-2 text-[11px] font-semibold backdrop-blur-md">
                {selectedItem.duration}
              </span>
            </div>

            <div className="mt-auto max-w-xl">
              <span
                className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-bold ${selectedItem.accent}`}
              >
                <Sparkles aria-hidden className="size-3.5" />
                {selectedItem.categoryLabel}
              </span>
              <h3 className="mt-5 text-4xl font-semibold leading-[0.96] tracking-[-0.055em] sm:text-5xl">
                {selectedItem.title}
              </h3>
              <p className="mt-4 max-w-lg text-sm leading-7 text-white/76">
                {selectedItem.hook}
              </p>
              <div className="mt-6 flex items-center gap-5 text-xs font-semibold text-white/78">
                <span className="inline-flex items-center gap-2">
                  <Play aria-hidden className="size-4 fill-current" />
                  {selectedItem.views}
                </span>
                <span className="inline-flex items-center gap-2">
                  <Bookmark aria-hidden className="size-4" />
                  {selectedItem.saves} saves
                </span>
              </div>
            </div>

            <div
              aria-hidden
              className="absolute bottom-7 right-5 hidden flex-col gap-3 sm:flex"
            >
              {[Heart, MessageCircle, Bookmark].map((Icon, index) => (
                <span
                  key={index}
                  className="grid size-11 place-items-center rounded-full bg-black/26 backdrop-blur-md"
                >
                  <Icon className="size-4" />
                </span>
              ))}
            </div>
          </div>
        </article>

        <div className="grid content-start gap-4 sm:grid-cols-2">
          {visibleItems.map((item) => {
            const active = item.id === selectedItem.id;

            return (
              <button
                key={item.id}
                type="button"
                aria-pressed={active}
                onClick={() => setSelectedId(item.id)}
                className={`group relative aspect-[9/12] min-w-0 overflow-hidden rounded-[1.5rem] border text-left text-white shadow-[0_14px_40px_rgba(45,32,72,0.11)] transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#5a43d8] ${
                  active
                    ? "border-[#5a43d8] ring-2 ring-[#5a43d8]/22"
                    : "border-white/70 hover:-translate-y-1 hover:border-[#1b1824]/20"
                } ${item.tone}`}
              >
                <div className="absolute inset-0 bg-gradient-to-t from-black/78 via-black/8 to-black/18" />
                <div className="relative flex h-full flex-col p-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-black/24 px-2.5 py-1.5 text-[10px] font-semibold backdrop-blur">
                      <PlatformIcon platform={item.platform} />
                      {item.platform}
                    </span>
                    <span className="text-[10px] font-semibold text-white/78">
                      {item.views}
                    </span>
                  </div>
                  <span className="absolute left-1/2 top-[42%] grid size-11 -translate-x-1/2 place-items-center rounded-full bg-white/86 text-[#1b1824] shadow-lg">
                    <Play aria-hidden className="ml-0.5 size-4 fill-current" />
                  </span>
                  <div className="mt-auto">
                    <span className="text-[10px] font-semibold text-white/68">
                      {item.categoryLabel}
                    </span>
                    <h4 className="mt-2 text-xl font-semibold leading-[1.02] tracking-[-0.04em]">
                      {item.title}
                    </h4>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
