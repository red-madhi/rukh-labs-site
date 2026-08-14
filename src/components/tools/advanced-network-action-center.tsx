"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowUpRight,
  Heart,
  Loader2,
  MessageCircle,
  Network,
  RefreshCw,
  Sparkles,
  UsersRound,
} from "lucide-react";
import { NetworkTermHelp } from "@/components/tools/advanced-network-terms";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAdvancedBlueskyOAuth } from "@/components/tools/advanced-network-oauth";

type ActionItem = {
  did: string;
  handle: string;
  displayName?: string;
  followersCount: number;
  recommendationType: string;
  relationshipRole: string;
  bridgeLeverage: number;
  independentPaths: number;
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
  independentPaths: number;
  interactionStrength: number;
  bridgeLeverage: number;
  relationshipRole: string;
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
  independentPaths: number;
  bridgeLeverage: number;
  type: string;
  targetHandles: string[];
};

type Cluster = {
  handle: string;
  people: number;
  independentPaths: number;
  strength: number;
};

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
  return `${Math.max(7, Math.min(100, Math.round(value)))}%`;
}

function relativeAge(hours: number) {
  if (hours < 1) return "<1h ago";
  if (hours < 24) return `${Math.round(hours)}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

function bestieLabel(type: string) {
  if (type === "target-bestie") return "Target-circle bestie";
  if (type === "bridge-bestie") return "Bridge-circle bestie";
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
              Cultivate the people around your goals.
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-white/48">
              Big accounts are destinations. This section focuses on reachable bridge people and close-network connections that can create genuine social proof around those destinations.
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => void load()} disabled={working}>
            {working ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <RefreshCw className="size-4" aria-hidden />
            )}
            Refresh actions
          </Button>
        </div>

        {data?.runId ? (
          <div className="mt-5 grid gap-2 sm:grid-cols-3">
            <div className="rounded-xl border border-white/8 bg-black/20 px-4 py-3">
              <p className="inline-flex text-[10px] uppercase tracking-[0.12em] text-white/30">
                Bridge moves now
                <NetworkTermHelp term="bridge" />
              </p>
              <p className="mt-1 text-xl font-semibold text-white">{data.actions.length}</p>
            </div>
            <div className="rounded-xl border border-white/8 bg-black/20 px-4 py-3">
              <p className="inline-flex text-[10px] uppercase tracking-[0.12em] text-white/30">
                Target-circle connections
                <NetworkTermHelp term="targetCircle" />
              </p>
              <p className="mt-1 text-xl font-semibold text-white">{data.bestieSignals.length}</p>
            </div>
            <div className="rounded-xl border border-white/8 bg-black/20 px-4 py-3">
              <p className="inline-flex text-[10px] uppercase tracking-[0.12em] text-white/30">
                Strongest social-proof cluster
                <NetworkTermHelp term="socialProof" />
              </p>
              <p className="mt-1 truncate text-sm font-semibold text-[#d8b5ff]">
                {strongestCluster
                  ? `@${strongestCluster.handle} · ${strongestCluster.independentPaths} paths`
                  : "—"}
              </p>
            </div>
          </div>
        ) : null}
      </div>

      {working && !data ? (
        <div className="grid min-h-[260px] place-items-center px-6 text-center">
          <div>
            <Loader2 className="mx-auto size-5 animate-spin text-[#8ce8ff]" aria-hidden />
            <p className="mt-3 text-sm text-white/50">Scanning bridge relationships and fresh posts…</p>
          </div>
        </div>
      ) : error ? (
        <div className="px-6 py-8 text-sm text-[#ffb4b8]">{error}</div>
      ) : !data?.runId ? (
        <div className="px-6 py-10 text-center">
          <Sparkles className="mx-auto size-5 text-[#e6bd73]" aria-hidden />
          <p className="mt-3 text-sm font-semibold text-white">Your Action Center appears after the first run.</p>
          <p className="mt-2 text-xs leading-5 text-white/38">
            Run Find people to follow once. After that, this section keeps working from the latest saved bridge analysis.
          </p>
        </div>
      ) : (
        <div className="grid gap-px bg-white/8 xl:grid-cols-[1.3fr_0.95fr]">
          <section className="bg-[#07090c] p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8ce8ff]">
                  Best bridge moves now
                </p>
                <p className="mt-1 text-sm text-white/42">
                  Spend attention here—not cold-engaging the destination account.
                </p>
              </div>
              <Network className="size-5 text-[#8ce8ff]" aria-hidden />
            </div>

            <div className="mt-5 grid gap-3">
              {data.actions.length ? (
                data.actions.map((item, index) => (
                  <article
                    key={item.did}
                    className="rounded-2xl border border-white/9 bg-white/[0.025] p-4"
                  >
                    <div className="flex items-start gap-3">
                      <div className="grid size-9 shrink-0 place-items-center rounded-xl border border-[#16c8ff]/18 bg-[#16c8ff]/[0.055] text-xs font-semibold text-[#a9efff]">
                        {index + 1}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-white">
                              {item.displayName || `@${item.handle}`}
                            </p>
                            <p className="mt-1 truncate text-[11px] text-white/35">
                              @{item.handle} · {compact(item.followersCount)} followers
                            </p>
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              <span className="rounded-full border border-[#16c8ff]/15 bg-[#16c8ff]/[0.04] px-2 py-0.5 text-[9px] text-[#9cecff]">
                                {item.relationshipRole}
                              </span>
                              <span className="inline-flex rounded-full border border-[#e6bd73]/15 bg-[#e6bd73]/[0.04] px-2 py-0.5 text-[9px] text-[#f1d49a]">
                                {item.independentPaths} independent path{item.independentPaths === 1 ? "" : "s"}
                                <NetworkTermHelp term="independentPath" />
                              </span>
                              {item.targetHandles[0] ? (
                                <span className="rounded-full border border-[#aa63ff]/15 bg-[#aa63ff]/[0.035] px-2 py-0.5 text-[9px] text-[#d8b5ff]">
                                  toward @{item.targetHandles[0]}
                                </span>
                              ) : null}
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="rounded-full border border-[#e6bd73]/22 bg-[#e6bd73]/[0.06] px-2.5 py-1 text-[10px] font-medium text-[#f1d49a]">
                              {item.action}
                            </span>
                            <p className="mt-2 text-[9px] text-white/28">bridge leverage {item.bridgeLeverage}</p>
                          </div>
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
                            <p className="mt-2 text-xs leading-5 text-white/55">
                              {item.post.text || "Recent post available."}
                            </p>
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
                ))
              ) : (
                <p className="rounded-xl border border-white/8 bg-white/[0.018] p-4 text-xs leading-5 text-white/36">
                  No tactical bridge account cleared the current threshold. Destination accounts are intentionally excluded from this queue.
                </p>
              )}
            </div>
          </section>

          <aside className="grid content-start gap-px bg-white/8">
            <section className="bg-[#08090c] p-5 sm:p-6">
              <div className="flex items-center gap-2">
                <UsersRound className="size-4 text-[#d8b5ff]" aria-hidden />
                <p className="inline-flex text-xs font-semibold uppercase tracking-[0.12em] text-[#d8b5ff]">
                  Bridges to cultivate
                  <NetworkTermHelp term="bridge" />
                </p>
              </div>
              <p className="mt-2 text-[11px] leading-5 text-white/34">
                The people whose familiarity with you adds the most social proof around your destination neighborhoods.
              </p>
              <div className="mt-4 grid gap-3">
                {data.topPeople.slice(0, 7).map((person) => (
                  <div
                    key={person.did}
                    className="rounded-xl border border-white/8 bg-white/[0.02] p-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold text-white">
                          {person.displayName || `@${person.handle}`}
                        </p>
                        <p className="mt-1 truncate text-[10px] text-white/30">
                          @{person.handle} · {person.relationshipRole}
                        </p>
                      </div>
                      <span className="text-[11px] font-semibold text-[#9cecff]">
                        {person.bridgeLeverage}
                      </span>
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/7">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#16c8ff] via-[#7bdcff] to-[#d8b5ff]"
                        style={{ width: barWidth(person.bridgeLeverage) }}
                      />
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5 text-[9px]">
                      <span className="rounded-full border border-[#e6bd73]/14 px-2 py-0.5 text-[#f1d49a]/80">
                        {person.independentPaths} path{person.independentPaths === 1 ? "" : "s"}
                      </span>
                      {person.followedBy ? (
                        <span className="rounded-full border border-emerald-300/15 px-2 py-0.5 text-emerald-200/75">
                          follows you
                        </span>
                      ) : null}
                      {person.targetHandles.slice(0, 2).map((handle) => (
                        <span
                          key={handle}
                          className="rounded-full border border-[#aa63ff]/12 px-2 py-0.5 text-[#d8b5ff]/70"
                        >
                          → @{handle}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="bg-[#08090c] p-5 sm:p-6">
              <div className="flex items-center gap-2">
                <Heart className="size-4 text-[#f1d49a]" aria-hidden />
                <p className="inline-flex text-xs font-semibold uppercase tracking-[0.12em] text-[#f1d49a]">
                  Target-circle connections
                  <NetworkTermHelp term="targetCircle" />
                </p>
              </div>
              <p className="mt-2 text-[11px] leading-5 text-white/34">
                These labels describe where someone sits around a destination or bridge. They do not mean that person is already your bestie.
              </p>
              <div className="mt-4 grid gap-2">
                {data.bestieSignals.length ? (
                  data.bestieSignals.slice(0, 5).map((signal) => (
                    <div
                      key={signal.did}
                      className="rounded-xl border border-white/8 bg-black/18 px-3 py-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-xs font-semibold text-white">
                            {signal.displayName || `@${signal.handle}`}
                          </p>
                          <p className="mt-1 inline-flex text-[10px] text-white/32">
                            {bestieLabel(signal.type)}
                            <NetworkTermHelp
                              term={signal.type === "target-bestie"
                                ? "targetBestie"
                                : signal.type === "bridge-bestie"
                                  ? "bridgeBestie"
                                  : signal.type === "second-wave-bestie"
                                    ? "wave2"
                                    : "bestieOfBestie"}
                            />
                          </p>
                        </div>
                        <span className="rounded-full border border-[#e6bd73]/18 bg-[#e6bd73]/[0.05] px-2 py-0.5 text-[9px] text-[#f1d49a]">
                          {Math.round(signal.signalStrength)}
                        </span>
                      </div>
                      <p className="mt-2 text-[10px] text-white/32">
                        {signal.independentPaths} warm path{signal.independentPaths === 1 ? "" : "s"}
                        {signal.targetHandles[0] ? ` toward @${signal.targetHandles[0]}` : ""}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-xs leading-5 text-white/34">
                    No target-circle connection cleared the current repeated-interaction threshold in this run.
                  </p>
                )}
              </div>
            </section>

            <section className="bg-[#08090c] p-5 sm:p-6">
              <div className="flex items-center gap-2">
                <MessageCircle className="size-4 text-[#8ce8ff]" aria-hidden />
                <p className="inline-flex text-xs font-semibold uppercase tracking-[0.12em] text-[#8ce8ff]">
                  Destination social proof
                  <NetworkTermHelp term="socialProof" />
                </p>
              </div>
              <p className="mt-2 text-[11px] leading-5 text-white/34">
                More independent warm people around the same destination means your name can become familiar through normal social overlap instead of cold outreach.
              </p>
              <div className="mt-4 grid gap-3">
                {data.clusters.slice(0, 5).map((cluster) => (
                  <div key={cluster.handle} className="rounded-xl border border-[#aa63ff]/10 bg-[#aa63ff]/[0.02] p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="truncate text-xs font-semibold text-[#d8b5ff]">@{cluster.handle}</p>
                      <span className="text-[10px] text-white/36">strength {cluster.strength}</span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5 text-[9px]">
                      <span className="rounded-full border border-white/8 px-2 py-0.5 text-white/38">
                        {cluster.people} bridge people
                      </span>
                      <span className="rounded-full border border-[#e6bd73]/14 px-2 py-0.5 text-[#f1d49a]/80">
                        {cluster.independentPaths} independent paths
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </aside>
        </div>
      )}

      {data?.runId ? (
        <div className="border-t border-white/8 bg-[#06080b] px-5 py-4 text-[11px] leading-5 text-white/30 sm:px-7">
          {data.note}
        </div>
      ) : null}
    </Card>
  );
}
