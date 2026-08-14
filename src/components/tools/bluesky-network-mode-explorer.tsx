"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { BlueskyFollowingExplorer } from "@/components/tools/bluesky-following-explorer";
import { BlueskyNetworkExplorer } from "@/components/tools/bluesky-network-explorer";
import {
  BlueskyOAuthPanel,
  BlueskyOAuthProvider,
} from "@/components/tools/bluesky-oauth";
import { Card } from "@/components/ui/card";
import {
  DEFAULT_ACCOUNT_QUALITY_FILTERS,
  SCAN_SOURCE_COPY,
  setAccountQualityFilters,
  type AccountQualityFilters,
  type ScanSource,
} from "@/lib/bluesky-network";
import { cn } from "@/lib/utils";

export function BlueskyNetworkModeExplorer() {
  const [source, setSource] = useState<ScanSource>("followers");
  const [filters, setFilters] = useState<AccountQualityFilters>(() => ({
    ...DEFAULT_ACCOUNT_QUALITY_FILTERS,
  }));
  const [filterRevision, setFilterRevision] = useState(0);

  function updateFilters(patch: Partial<AccountQualityFilters>) {
    const next = { ...filters, ...patch };
    setFilters(next);
    setAccountQualityFilters(next);
    setFilterRevision((revision) => revision + 1);
  }

  return (
    <BlueskyOAuthProvider>
      <div className="grid gap-6">
        <BlueskyOAuthPanel />

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

            <div className="mt-5 border-t border-white/10 pt-5">
              <p className="text-sm font-semibold text-white">Recommendation cleanup</p>
              <p className="mt-1 text-xs leading-5 text-white/42">
                Set these before starting a scan. All three are enabled by default.
                Unknown activity status stays visible instead of being guessed inactive.
              </p>

              <div className="mt-4 grid gap-3 lg:grid-cols-3">
                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/10 bg-white/[0.025] p-4 text-left">
                  <input
                    type="checkbox"
                    checked={filters.excludeAdultContent}
                    onChange={(event) => updateFilters({ excludeAdultContent: event.target.checked })}
                    className="mt-1 size-4 shrink-0 accent-[#16c8ff]"
                  />
                  <span>
                    <span className="block text-sm font-semibold text-white">Hide adult-content accounts</span>
                    <span className="mt-1 block text-xs leading-5 text-white/42">Uses Bluesky&apos;s native content labels.</span>
                  </span>
                </label>

                <div className="rounded-xl border border-white/10 bg-white/[0.025] p-4">
                  <label className="flex cursor-pointer items-start gap-3 text-left">
                    <input
                      type="checkbox"
                      checked={filters.excludeInactive}
                      onChange={(event) => updateFilters({ excludeInactive: event.target.checked })}
                      className="mt-1 size-4 shrink-0 accent-[#16c8ff]"
                    />
                    <span>
                      <span className="block text-sm font-semibold text-white">Hide inactive accounts</span>
                      <span className="mt-1 block text-xs leading-5 text-white/42">Checks public author-feed activity.</span>
                    </span>
                  </label>
                  <label className="mt-3 grid gap-1.5 text-xs text-white/46">
                    Inactive after
                    <select
                      value={filters.inactiveDays}
                      disabled={!filters.excludeInactive}
                      onChange={(event) => updateFilters({ inactiveDays: Number(event.target.value) })}
                      className="rounded-lg border border-white/12 bg-[#090707]/80 px-3 py-2 text-sm text-white outline-none disabled:opacity-45"
                    >
                      <option value={30}>30 days</option>
                      <option value={60}>60 days</option>
                      <option value={90}>90 days</option>
                      <option value={180}>180 days</option>
                      <option value={365}>365 days</option>
                    </select>
                  </label>
                </div>

                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/10 bg-white/[0.025] p-4 text-left">
                  <input
                    type="checkbox"
                    checked={filters.excludeBots}
                    onChange={(event) => updateFilters({ excludeBots: event.target.checked })}
                    className="mt-1 size-4 shrink-0 accent-[#16c8ff]"
                  />
                  <span>
                    <span className="block text-sm font-semibold text-white">Hide bots</span>
                    <span className="mt-1 block text-xs leading-5 text-white/42">Uses Bluesky&apos;s bot label plus conservative automation signals.</span>
                  </span>
                </label>
              </div>
            </div>
          </fieldset>
        </Card>

        {source === "followers" ? (
          <BlueskyNetworkExplorer key={`followers-${filterRevision}`} />
        ) : (
          <BlueskyFollowingExplorer key={`following-${filterRevision}`} />
        )}
      </div>
    </BlueskyOAuthProvider>
  );
}
