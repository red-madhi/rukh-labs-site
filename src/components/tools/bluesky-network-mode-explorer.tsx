"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { BlueskyFollowingExplorer } from "@/components/tools/bluesky-following-explorer";
import { BlueskyNetworkExplorer } from "@/components/tools/bluesky-network-explorer";
import { Card } from "@/components/ui/card";
import { SCAN_SOURCE_COPY, type ScanSource } from "@/lib/bluesky-network";
import { cn } from "@/lib/utils";

export function BlueskyNetworkModeExplorer() {
  const [source, setSource] = useState<ScanSource>("followers");

  return (
    <div className="grid gap-6">
      <Card className="p-5 sm:p-7">
        <fieldset>
          <legend className="text-sm font-medium text-white/78">
            Build people-to-follow recommendations from
          </legend>
          <div className="mt-3 grid gap-3 lg:grid-cols-2">
            {(Object.keys(SCAN_SOURCE_COPY) as ScanSource[]).map((key) => {
              const copy = SCAN_SOURCE_COPY[key];
              const selected = source === key;

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSource(key)}
                  aria-pressed={selected}
                  className={cn(
                    "rounded-xl border p-4 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#16c8ff]",
                    selected
                      ? "border-[#16c8ff]/55 bg-[#16c8ff]/10"
                      : "border-white/10 bg-white/[0.025] hover:border-white/20",
                  )}
                >
                  <span className="flex items-start justify-between gap-3">
                    <span>
                      <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-[#8ce8ff]">
                        {copy.eyebrow}
                      </span>
                      <span className="mt-1 block font-semibold text-white">
                        {copy.name}
                      </span>
                    </span>
                    {selected ? (
                      <Check aria-hidden className="mt-1 size-4 text-[#8ce8ff]" />
                    ) : null}
                  </span>
                  <span className="mt-3 block text-sm leading-6 text-white/56">
                    {copy.description}
                  </span>
                  <span className="mt-2 block text-xs leading-5 text-white/36">
                    {copy.detail}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="mt-3 rounded-xl border border-[#16c8ff]/18 bg-[#16c8ff]/6 p-4 text-sm leading-6 text-white/58">
            <p className="font-semibold text-white">
              This recommends people to follow—not individual posts.
            </p>
            <p className="mt-1">
              Follow relationships are a strong signal for account discovery.
              Likes and activity are generally better signals for deciding which
              posts belong in a feed.
            </p>
          </div>
        </fieldset>
      </Card>

      {source === "followers" ? (
        <BlueskyNetworkExplorer key="followers" />
      ) : (
        <BlueskyFollowingExplorer key="following" />
      )}
    </div>
  );
}
