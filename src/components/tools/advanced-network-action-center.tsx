"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowUpRight,
  Heart,
  Loader2,
  MessageCircle,
  Radar,
  RefreshCw,
  Sparkles,
  UsersRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAdvancedBlueskyOAuth } from "@/components/tools/advanced-network-oauth";

type ActionItem = {
  did: string;
  handle: string;
  displayName?: string;
  followersCount: number;
  recommendationType: string;
  opportunityScore: number;
  action: string;
  reason: string;
  targetHandles: string[];
  following: boolean;
  followedBy: boolean;
  post: null | {
    uri: string;
    url: string;
    text: string;
    createdAt: string | null;
    ageHours: number;
    likes: number;
    replies: number;
    reposts: number;
    quotes: number;
  };
};

type TopPerson = {
  did: string;
  handle: string;
  displayName?: string;
  followersCount: number;
  importance: number;
  reciprocity: number;
  interactionStrength: number;
  targetHandles: string[];
  following: boolean;
  followedBy: boolean;
};

type BestieSignal = {
  did: string;
  handle: string;
  displayName?: string;
  followersCount: number;
  signalStrength: number;
  interactionStrength: number;
  type: string;
  targetHandles: string[];
};

type Cluster = { handle: string; people: number; strength: number };

type ActionResponse = {
  runId: string | null;
  generatedAt: string;
  actions: ActionItem[];
  topPeople: TopPerson[];
  bestieSignals: BestieSignal[];
  clusters: Cluster[];
  note: string;
  error?: string;
};

function compact(value: number) {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function barWidth(value: number) {
  return `${Math.max(8, Math.min(100, Math.round(value)))}%`;
}

function relativeAge(hours: number) {
  if (hours < 1) return "<1h ago";
  if (hours < 24) return `${Math.round(hours)}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

function bestieLabel(type: string) {
  if (type === "target-bestie") return "Target bestie";
  if (type === "bridge-bestie") return "Bridge-circle signal";
  if (type === "second-wave-bestie") return "Wave 2 bestie";
  return "Bestie-of-bestie";
}

export function AdvancedNetworkActionCenter({ runId }: { runId?: string }) {
  const oauth = useAdvancedBlueskyOAuth();
  const [data, setData] = useState<ActionResponse | null>(null);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const connected = oauth.phase === "connected" && Boolean(oauth.did);

  async function load() {
    if (!oauth.did) return;
    setWorking(true);
    setError("");
    try {
      const response = await fetch("/api/advanced-network/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actor: oauth.did, runId }),
      });
      const result = (await response.json()) as ActionResponse;
      if (!response.ok) throw new Error(result.error || "Could not build the Action Center.");
      setData(result);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not build the Action Center.");
    } finally {
      setWorking(false);
    }
  }

  useEffect(() => {
    if (!connected) {
      setData(null);
      return;
    }
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected, oauth.did, runId]);

  const strongestCluster = useMemo(() => data?.clusters?.[0], [data]);

  if (!connected) return null;

  return (
    <Card className="overflow-hidden p-0">
      <div className="border-b border-white/10 bg-[radial-gradient(circle_at_0%_0%,rgba(230,189,115,0.10),transparent_35%),radial-gradient(circle_at_100%_0%,rgba(22,200,255,0.08),transparent_34%)] px-5 py-6 sm:px-7">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#f1d49a]">
              <Activity className="size-4" aria-hidden />
              Action Center
            </p>
            <h2 className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-white">
              Who should you interact with right now?
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-white/48">
              Live suggestions combine your latest network ranking, relationship state, repeated-interaction signals, and fresh public posts. Nothing is auto-liked or auto-replied.
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => void load()} disabled={working}>
            {working ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <RefreshCw className="size-4" aria-hidden />}
            Refresh actions
          </Button>
        </div>

        {data?.runId ? (
          <div className="mt-5 grid gap-2 sm:grid-cols-3">
            <div className="rounded-xl border border-white/8 bg-black/20 px-4 py-3">
              <p className="text-[10px] uppercase tracking-[0.12em] text-white/30">Live moves</p>
              <p className="mt-1 text-xl font-semibold text-white">{data.actions.length}</p>
            </div>
            <div className="rounded-xl border border-white/8 bg-black/20 px-4 py-3">
              <p className="text-[10px] uppercase tracking-[0.12em] text-white/30">Bestie signals</p>
              <p className="mt-1 text-xl font-semibold text-white">{data.bestieSignals.length}</p>
            </div>
            <div className="rounded-xl border border-white/8 bg-black/20 px-4 py-3">
              <p className="text-[10px] uppercase tracking-[0.12em] text-white/30">Strongest destination cluster</p>
              <p className="mt-1 truncate text-sm font-semibold text-[#d8b5ff]">
                {strongestCluster ? `@${strongestCluster.handle}` : "—"}
              </p>
            </div>
          </div>
        ) : null}
      </div>

      {working && !data ? (
        <div className="grid min-h-[260px] place-items-center px-6 text-center">
          <div>
            <Loader2 className="mx-auto size-5 animate-spin text-[#8ce8ff]" aria-hidden />
            <p className="mt-3 text-sm text-white/50">Scanning fresh posts and relationship signals…</p>
          </div>
        </div>
      ) : error ? (
        <div className="px-6 py-8 text-sm text-[#ffb4b8]">{error}</div>
      ) : !data?.runId ? (
        <div className="px-6 py-10 text-center">
          <Sparkles className="mx-auto size-5 text-[#e6bd73]" aria-hidden />
          <p className="mt-3 text-sm font-semibold text-white">Your Action Center will appear after the first run.</p>
          <p className="mt-2 text-xs leading-5 text-white/38">Use Find people to follow once; after that this section keeps working from the latest saved run.</p>
        </div>
      ) : (
        <div className="grid gap-px bg-white/8 xl:grid-cols-[1.35fr_0.9fr]">
          <section className="bg-[#07090c] p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8ce8ff]">Best moves now</p>
                <p className="mt-1 text-sm text-white/42">Fresh, specific actions—not another follower list.</p>
              </div>
              <Radar className="size-5 text-[#8ce8ff]" aria-hidden />
            </div>

            <div className="mt-5 grid gap-3">
              {data.actions.map((item, index) => (
                <article key={item.did} className="rounded-2xl border border-white/9 bg-white/[0.025] p-4">
                  <div className="flex items-start gap-3">
                    <div className="grid size-9 shrink-0 place-items-center rounded-xl border border-[#16c8ff]/18 bg-[#16c8ff]/[0.055] text-xs font-semibold text-[#a9efff]">
                      {index + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-white">{item.displayName || `@${item.handle}`}</p>
                          <p className="mt-1 truncate text-[11px] text-white/35">@{item.handle} · {compact(item.followersCount)} followers</p>
                        </div>
                        <span className="rounded-full border border-[#e6bd73]/22 bg-[#e6bd73]/[0.06] px-2.5 py-1 text-[10px] font-medium text-[#f1d49a]">
                          {item.action}
                        </span>
                      </div>

                      <p className="mt-3 text-xs leading-5 text-white/50">{item.reason}</p>

                      {item.post ? (
                        <div className="mt-3 rounded-xl border border-white/8 bg-black/25 p-3">
                          <div className="flex flex-wrap items-center gap-2 text-[10px] text-white/30">
                            <span>{relativeAge(item.post.ageHours)}</span>
                            <span>♥ {item.post.likes}</span>
                            <span>↩ {item.post.replies}</span>
                            <span>↻ {item.post.reposts}</span>
                          </div>
                          <p className="mt-2 text-xs leading-5 text-white/55">{item.post.text || "Recent post available."}</p>
                          <a
                            href={item.post.url}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-[#9cecff] transition hover:text-white"
                          >
                            Open this post
                            <ArrowUpRight className="size-3.5" aria-hidden />
                          </a>
                        </div>
                      ) : (
                        <a
                          href={`https://bsky.app/profile/${item.handle}`}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-[#9cecff] transition hover:text-white"
                        >
                          Open profile
                          <ArrowUpRight className="size-3.5" aria-hidden />
                        </a>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <aside className="grid gap-px bg-white/8">
            <section className="bg-[#08090c] p-5 sm:p-6">
              <div className="flex items-center gap-2">
                <UsersRound className="size-4 text-[#d8b5ff]" aria-hidden />
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#d8b5ff]">Top people to keep warm</p>
              </div>
              <div className="mt-4 grid gap-3">
                {data.topPeople.slice(0, 6).map((person) => {
                  const heat = Math.min(100, person.importance * 0.65 + person.interactionStrength * 0.35);
                  return (
                    <div key={person.did} className="rounded-xl border border-white/8 bg-white/[0.02] p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-xs font-semibold text-white">{person.displayName || `@${person.handle}`}</p>
                          <p className="mt-1 truncate text-[10px] text-white/30">@{person.handle}</p>
                        </div>
                        <span className="text-[10px] font-semibold text-white/45">{Math.round(heat)}</span>
                      </div>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/7">
                        <div className="h-full rounded-full bg-gradient-to-r from-[#16c8ff] via-[#7bdcff] to-[#d8b5ff]" style={{ width: barWidth(heat) }} />
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1.5 text-[9px] text-white/30">
                        {person.followedBy ? <span className="rounded-full border border-emerald-300/15 px-2 py-0.5 text-emerald-200/75">follows you</span> : null}
                        {person.targetHandles.slice(0, 2).map((handle) => (
                          <span key={handle} className="rounded-full border border-white/8 px-2 py-0.5">toward @{handle}</span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="bg-[#08090c] p-5 sm:p-6">
              <div className="flex items-center gap-2">
                <Heart className="size-4 text-[#f1d49a]" aria-hidden />
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#f1d49a]">Emerging bestie signals</p>
              </div>
              <div className="mt-4 grid gap-2">
                {data.bestieSignals.length ? data.bestieSignals.slice(0, 5).map((signal) => (
                  <div key={signal.did} className="rounded-xl border border-white/8 bg-black/18 px-3 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold text-white">{signal.displayName || `@${signal.handle}`}</p>
                        <p className="mt-1 text-[10px] text-white/32">{bestieLabel(signal.type)}</p>
                      </div>
                      <span className="rounded-full border border-[#e6bd73]/18 bg-[#e6bd73]/[0.05] px-2 py-0.5 text-[9px] text-[#f1d49a]">{Math.round(signal.signalStrength)}</span>
                    </div>
                    {signal.targetHandles[0] ? (
                      <p className="mt-2 text-[10px] text-white/32">close-network signal around @{signal.targetHandles[0]}</p>
                    ) : null}
                  </div>
                )) : (
                  <p className="text-xs leading-5 text-white/34">No repeated-interaction bestie signal cleared the current threshold in this run.</p>
                )}
              </div>
            </section>

            <section className="bg-[#08090c] p-5 sm:p-6">
              <div className="flex items-center gap-2">
                <MessageCircle className="size-4 text-[#8ce8ff]" aria-hidden />
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8ce8ff]">Destination clusters</p>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {data.clusters.map((cluster) => (
                  <div key={cluster.handle} className="rounded-xl border border-white/8 bg-white/[0.02] px-3 py-2">
                    <p className="text-[11px] font-semibold text-white">@{cluster.handle}</p>
                    <p className="mt-1 text-[9px] text-white/30">{cluster.people} useful accounts · strength {cluster.strength}</p>
                  </div>
                ))}
              </div>
            </section>
          </aside>
        </div>
      )}

      <div className="border-t border-white/8 bg-[#06080b] px-5 py-3 text-[11px] leading-5 text-white/28 sm:px-7">
        {data?.note ?? ""}
      </div>
    </Card>
  );
}
