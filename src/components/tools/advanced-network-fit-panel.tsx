"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Loader2, SlidersHorizontal, X } from "lucide-react";
import {
  HelpPopover,
  PurposeBadge,
} from "@/components/tools/advanced-network-explain";
import { NetworkTermHelp } from "@/components/tools/advanced-network-terms";
import { Card } from "@/components/ui/card";
import { useAdvancedBlueskyOAuth } from "@/components/tools/advanced-network-oauth";
import type { HumanFitLabel } from "@/lib/advanced-network-v2";

type FitRecommendation = {
  did: string;
  handle: string;
  displayName?: string;
  followersCount: number;
  recommendationType: string;
  score: number;
  humanFit: HumanFitLabel | null;
  relationshipStage: string;
  confidenceLevel: string;
  destinationOnly: boolean;
};

type FitResponse = {
  recommendations: FitRecommendation[];
  error?: string;
};

const OPTIONS: Array<{
  id: HumanFitLabel;
  label: string;
  tone: string;
}> = [
  { id: "worth-cultivating", label: "Worth cultivating", tone: "text-emerald-200" },
  { id: "my-kind-of-person", label: "My kind of person", tone: "text-[#9cecff]" },
  { id: "already-know", label: "Already know them", tone: "text-[#f1d49a]" },
  { id: "destination-only", label: "Destination only", tone: "text-[#d8b5ff]" },
  { id: "not-my-audience", label: "Not my audience", tone: "text-white/50" },
  { id: "not-for-me", label: "Do not recommend", tone: "text-[#ffb4b8]" },
];

function compact(value: number) {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

export function AdvancedNetworkFitPanel() {
  const oauth = useAdvancedBlueskyOAuth();
  const [items, setItems] = useState<FitRecommendation[]>([]);
  const [working, setWorking] = useState(false);
  const [savingDid, setSavingDid] = useState("");
  const [error, setError] = useState("");
  const connected = oauth.phase === "connected" && Boolean(oauth.did);

  const load = useCallback(async () => {
    if (!oauth.did) return;
    setWorking(true);
    setError("");
    try {
      const response = await fetch(
        `/api/advanced-network/fit?actor=${encodeURIComponent(oauth.did)}`,
        { cache: "no-store" },
      );
      const result = (await response.json()) as FitResponse;
      if (!response.ok) throw new Error(result.error || "Feedback controls could not be loaded.");
      setItems(result.recommendations ?? []);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Feedback controls could not be loaded.");
    } finally {
      setWorking(false);
    }
  }, [oauth.did]);

  useEffect(() => {
    if (!connected) {
      setItems([]);
      return;
    }
    void load();
  }, [connected, load]);

  async function save(item: FitRecommendation, label: HumanFitLabel | null) {
    if (!oauth.did) return;
    setSavingDid(item.did);
    setError("");
    try {
      const response = await fetch("/api/advanced-network/fit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actor: oauth.did, targetDid: item.did, label }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error || "Feedback could not be saved.");
      setItems((current) =>
        current.map((candidate) =>
          candidate.did === item.did ? { ...candidate, humanFit: label } : candidate,
        ),
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Feedback could not be saved.");
    } finally {
      setSavingDid("");
    }
  }

  if (!connected) return null;

  return (
    <Card className="overflow-hidden border-white/10 p-0">
      <details>
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-5 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid size-9 shrink-0 place-items-center rounded-xl border border-[#e6bd73]/20 bg-[#e6bd73]/[0.05]">
              <SlidersHorizontal className="size-4 text-[#f1d49a]" aria-hidden />
            </div>
            <div>
              <PurposeBadge kind="action" />
              <p className="mt-2 text-xs font-semibold uppercase tracking-[0.13em] text-[#f1d49a]">
                Optional action · teach IAZMA your taste
              </p>
              <p className="mt-1 text-sm text-white/44">
                Tell the ranking engine which recommendations fit you as a person.
              </p>
            </div>
          </div>
          <span className="shrink-0 rounded-full border border-white/8 px-2.5 py-1 text-[10px] text-white/35">
            Open
          </span>
        </summary>

        <div className="border-t border-white/8 px-5 py-5 sm:px-6">
          <div className="flex flex-wrap items-center gap-2">
            <HelpPopover label="Why human-fit feedback matters">
              Network math can find a strategically useful route, but it cannot know whether you actually like the person's work or would want to talk with them. Your labels change future rankings. They do not block, unfollow, mute, or contact anyone on Bluesky.
            </HelpPopover>
            <p className="max-w-3xl text-xs leading-5 text-white/40">
              Open unfamiliar profiles first, then choose the label that best matches your honest judgment. This is how IAZMA learns the difference between technically useful and genuinely relevant.
            </p>
          </div>

          {working ? (
            <div className="mt-5 flex items-center gap-2 text-xs text-white/42">
              <Loader2 className="size-4 animate-spin text-[#8ce8ff]" aria-hidden />
              Loading saved recommendations…
            </div>
          ) : items.length ? (
            <div className="mt-5 grid gap-3 lg:grid-cols-2">
              {items.slice(0, 14).map((item) => (
                <div key={item.did} className="rounded-xl border border-white/8 bg-black/18 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-white">
                        {item.displayName || `@${item.handle}`}
                      </p>
                      <p className="mt-1 inline-flex max-w-full flex-wrap items-center text-[11px] text-white/32">
                        @{item.handle} · {compact(item.followersCount)} followers · {item.relationshipStage}
                        <NetworkTermHelp term="relationshipStage" />
                      </p>
                    </div>
                    <span className="inline-flex shrink-0 items-center rounded-full border border-white/8 px-2 py-1 text-[10px] text-white/42">
                      rank {item.score}
                      <NetworkTermHelp term="importanceScore" />
                    </span>
                  </div>

                  <p className="mt-3 inline-flex items-center text-[10px] font-semibold uppercase tracking-[0.1em] text-white/28">
                    Your feedback
                    <NetworkTermHelp term="humanFit" />
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {OPTIONS.map((option) => {
                      const selected = item.humanFit === option.id;
                      return (
                        <button
                          key={option.id}
                          type="button"
                          disabled={savingDid === item.did}
                          onClick={() => void save(item, selected ? null : option.id)}
                          aria-pressed={selected}
                          className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1.5 text-[10px] transition ${
                            selected
                              ? "border-[#16c8ff]/35 bg-[#16c8ff]/[0.07] text-white"
                              : "border-white/8 bg-white/[0.018] hover:border-white/18"
                          } ${option.tone}`}
                        >
                          {selected ? <Check className="size-3" aria-hidden /> : null}
                          {option.label}
                        </button>
                      );
                    })}
                    {item.humanFit ? (
                      <button
                        type="button"
                        disabled={savingDid === item.did}
                        onClick={() => void save(item, null)}
                        className="inline-flex items-center gap-1 rounded-full border border-white/8 px-2.5 py-1.5 text-[10px] text-white/34 hover:text-white/60"
                      >
                        <X className="size-3" aria-hidden />
                        Clear
                      </button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-5 text-xs text-white/36">
              Run the route finder first. Human-fit controls will appear for the saved recommendations.
            </p>
          )}

          {error ? <p className="mt-4 text-xs text-[#ffb4b8]">{error}</p> : null}
        </div>
      </details>
    </Card>
  );
}
