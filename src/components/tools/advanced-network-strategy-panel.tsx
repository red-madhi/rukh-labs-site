"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowUpRight,
  CheckCircle2,
  ChevronDown,
  Compass,
  GitBranch,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAdvancedBlueskyOAuth } from "@/components/tools/advanced-network-oauth";

type Foothold = {
  did: string;
  handle: string;
  displayName: string | null;
  avatar: string | null;
  score: number;
  independentPaths: number;
  reciprocity: number;
  state: string;
  stage: string;
  confidence: string;
  strategy: string;
  targetHandles: string[];
  profileUrl: string;
  bridgeValue: number;
};

type Destination = {
  handle: string;
  wave: number;
  status: string;
  bridgePeople: number;
  validatedBridgePeople: number;
  strongestBridgePaths: number;
};

type StrategyResponse = {
  run: null | {
    id: string;
    completedAt: string | null;
    engine: string;
    goal: string;
    roundTwoStatus: string;
    roundTwoEligibleFootholds: number;
    secondWaveTargets: string[];
    stageCounts: Record<string, number>;
    candidateRouteTotal: number;
    recommendationsReturned: number;
  };
  footholds?: Foothold[];
  evidence?: Array<{
    stage: string;
    confidence: string;
    people: number;
    candidatePaths: number;
    averageScore: number;
  }>;
  destinations?: Destination[];
  error?: string;
};

const STAGES = [
  {
    id: "structural",
    label: "Discovered path",
    description: "A route exists, but there is not enough social activity yet to treat it as a relationship.",
  },
  {
    id: "active",
    label: "Warming",
    description: "There is repeated activity around the route, but your relationship is still developing.",
  },
  {
    id: "activated",
    label: "Active relationship",
    description: "The relationship is creating visible public overlap involving you.",
  },
  {
    id: "converted",
    label: "Reciprocal foothold",
    description: "You follow each other. That is useful relationship capital, but it does not imply a close friendship.",
  },
];

function footholdLabel(stage: string) {
  return stage === "converted" ? "Reciprocal foothold" : "Active relationship";
}

function roundTwoHeading(status: string, count: number) {
  if (status === "expanded") {
    return `Round 2 is unlocked with ${count} validated foothold${count === 1 ? "" : "s"}.`;
  }
  if (status === "no-qualified-destination") {
    return `${count} foothold${count === 1 ? " is" : "s are"} working, but no new destination is worth adding yet.`;
  }
  if (status === "locked-awaiting-activated-foothold") {
    return "Keep strengthening Round 1 before expanding farther.";
  }
  return "Run the network analysis to see your next relationship moves.";
}

function roundTwoInstruction(status: string) {
  if (status === "expanded") {
    return "Your job now is not to chase the new big accounts. Keep building genuine familiarity with the people below; they are the social footholds that opened those circles.";
  }
  if (status === "no-qualified-destination") {
    return "Keep the validated relationships warm. The engine is deliberately waiting instead of inventing a weak second wave.";
  }
  if (status === "locked-awaiting-activated-foothold") {
    return "Use the regular recommendations and Action Center until at least one relationship becomes visibly active or reciprocal.";
  }
  return "The tool will turn graph evidence into specific people and next moves here.";
}

export function AdvancedNetworkStrategyPanel() {
  const oauth = useAdvancedBlueskyOAuth();
  const [data, setData] = useState<StrategyResponse | null>(null);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const connected = oauth.phase === "connected" && Boolean(oauth.did);

  const load = useCallback(async () => {
    if (!oauth.did) return;
    setWorking(true);
    setError("");
    try {
      const response = await fetch(
        `/api/advanced-network/strategy?actor=${encodeURIComponent(oauth.did)}`,
        { cache: "no-store" },
      );
      const result = (await response.json()) as StrategyResponse;
      if (!response.ok) throw new Error(result.error || "Network strategy could not be loaded.");
      setData(result);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Network strategy could not be loaded.");
    } finally {
      setWorking(false);
    }
  }, [oauth.did]);

  useEffect(() => {
    if (!connected) {
      setData(null);
      return;
    }
    void load();
    const interval = window.setInterval(() => void load(), 30_000);
    return () => window.clearInterval(interval);
  }, [connected, load]);

  const stageCounts = useMemo(() => data?.run?.stageCounts ?? {}, [data]);
  const footholds = data?.footholds ?? [];
  const strongestDestinations = useMemo(
    () =>
      [...(data?.destinations ?? [])]
        .sort(
          (a, b) =>
            b.validatedBridgePeople - a.validatedBridgePeople ||
            b.bridgePeople - a.bridgePeople ||
            b.strongestBridgePaths - a.strongestBridgePaths,
        )
        .slice(0, 6),
    [data],
  );

  if (!connected) return null;

  return (
    <Card className="min-w-0 overflow-hidden border-white/10 p-0">
      <div className="flex min-w-0 flex-col gap-4 border-b border-white/8 bg-[radial-gradient(circle_at_100%_0%,rgba(230,189,115,0.09),transparent_34%),radial-gradient(circle_at_0%_0%,rgba(22,200,255,0.07),transparent_30%)] px-5 py-5 sm:flex-row sm:items-start sm:justify-between sm:px-6">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.13em] text-[#f1d49a]">
            <Compass className="size-4" aria-hidden />
            What to do next
          </div>
          <h2 className="mt-2 text-xl font-semibold text-white">Turn network evidence into actual relationship moves.</h2>
          <p className="mt-2 max-w-3xl text-xs leading-5 text-white/42">
            This section is intentionally action-first. The graph math is still available under technical details, but you should not need it to know what to do.
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => void load()} disabled={working}>
          {working ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <RefreshCw className="size-4" aria-hidden />}
          Refresh
        </Button>
      </div>

      {!data?.run ? (
        <div className="px-6 py-8 text-sm text-white/38">
          {error || "Run Find people to follow once to calculate your relationship strategy."}
        </div>
      ) : (
        <div className="min-w-0 p-4 sm:p-6">
          <div className="rounded-2xl border border-[#e6bd73]/20 bg-[linear-gradient(145deg,rgba(230,189,115,0.07),rgba(170,99,255,0.025))] p-5 sm:p-6">
            <div className="flex flex-wrap items-center gap-2">
              {data.run.roundTwoStatus === "expanded" ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[#e6bd73]/24 bg-[#e6bd73]/[0.07] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#f1d49a]">
                  <Sparkles className="size-3" aria-hidden />
                  Round 2 unlocked
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[#16c8ff]/18 bg-[#16c8ff]/[0.045] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#9cecff]">
                  <ShieldCheck className="size-3" aria-hidden />
                  Relationship checkpoint
                </span>
              )}
              <span className="rounded-full border border-white/8 px-2.5 py-1 text-[10px] text-white/38">
                goal: {data.run.goal.replaceAll("-", " ")}
              </span>
            </div>

            <h3 className="mt-4 max-w-3xl text-xl font-semibold leading-snug text-white sm:text-2xl">
              {roundTwoHeading(data.run.roundTwoStatus, data.run.roundTwoEligibleFootholds)}
            </h3>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-white/48">
              {roundTwoInstruction(data.run.roundTwoStatus)}
            </p>
          </div>

          {footholds.length ? (
            <section className="mt-5">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-[#9cecff]">People to cultivate now</p>
                  <h3 className="mt-1 text-lg font-semibold text-white">These are the footholds that earned the next expansion.</h3>
                </div>
                <p className="max-w-md text-[10px] leading-5 text-white/30">
                  Prioritize natural, repeated interaction. You are building familiarity and social proof—not asking these people for access to someone bigger.
                </p>
              </div>

              <div className="mt-4 grid gap-3 xl:grid-cols-2">
                {footholds.map((foothold, index) => (
                  <article key={foothold.did || foothold.handle} className="min-w-0 rounded-2xl border border-white/9 bg-white/[0.018] p-4 sm:p-5">
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-xl border border-white/10 bg-black/25 text-sm font-semibold text-white/70">
                        {foothold.avatar ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={foothold.avatar} alt="" className="size-full object-cover" />
                        ) : (
                          index + 1
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex min-w-0 flex-wrap items-center gap-2">
                          <p className="min-w-0 break-words text-sm font-semibold text-white">
                            {foothold.displayName || `@${foothold.handle}`}
                          </p>
                          <span className={`rounded-full border px-2 py-0.5 text-[9px] font-semibold ${
                            foothold.stage === "converted"
                              ? "border-[#e6bd73]/20 bg-[#e6bd73]/[0.05] text-[#f1d49a]"
                              : "border-[#16c8ff]/18 bg-[#16c8ff]/[0.045] text-[#9cecff]"
                          }`}>
                            {footholdLabel(foothold.stage)}
                          </span>
                        </div>
                        <p className="mt-1 break-all text-[10px] text-white/32">@{foothold.handle}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-lg font-semibold text-white">{foothold.bridgeValue}</p>
                        <p className="text-[8px] uppercase tracking-[0.1em] text-white/24">bridge value</p>
                      </div>
                    </div>

                    <div className="mt-4 rounded-xl border border-[#16c8ff]/10 bg-[#16c8ff]/[0.025] p-3.5">
                      <p className="text-[9px] font-semibold uppercase tracking-[0.11em] text-[#9cecff]/75">Your next move</p>
                      <p className="mt-2 text-xs leading-5 text-white/58">
                        {foothold.strategy || "Keep this relationship warm with genuine, relevant interaction when there is a natural opening."}
                      </p>
                    </div>

                    {foothold.targetHandles.length ? (
                      <div className="mt-3">
                        <p className="text-[9px] font-semibold uppercase tracking-[0.1em] text-white/28">Helps you move toward</p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {foothold.targetHandles.slice(0, 5).map((handle) => (
                            <span key={handle} className="rounded-full border border-[#aa63ff]/15 bg-[#aa63ff]/[0.035] px-2 py-1 text-[9px] text-[#d8b5ff]">
                              @{handle}
                            </span>
                          ))}
                          {foothold.targetHandles.length > 5 ? (
                            <span className="rounded-full border border-white/8 px-2 py-1 text-[9px] text-white/30">
                              +{foothold.targetHandles.length - 5} more
                            </span>
                          ) : null}
                        </div>
                      </div>
                    ) : null}

                    <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-white/7 pt-3">
                      <span className="text-[9px] text-white/28">
                        {foothold.independentPaths} independent route{foothold.independentPaths === 1 ? "" : "s"} from this person
                      </span>
                      <a
                        href={foothold.profileUrl || `https://bsky.app/profile/${foothold.handle}`}
                        target="_blank"
                        rel="noreferrer"
                        className="ml-auto inline-flex items-center gap-1 rounded-lg border border-white/9 px-2.5 py-1.5 text-[10px] font-medium text-white/55 transition hover:text-white"
                      >
                        Open profile
                        <ArrowUpRight className="size-3" aria-hidden />
                      </a>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ) : null}

          {data.run.secondWaveTargets.length ? (
            <section className="mt-5 rounded-2xl border border-[#aa63ff]/15 bg-[#aa63ff]/[0.025] p-4 sm:p-5">
              <div className="flex items-center gap-2">
                <GitBranch className="size-4 text-[#d8b5ff]" aria-hidden />
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#d8b5ff]">New destinations unlocked</p>
              </div>
              <p className="mt-2 max-w-3xl text-xs leading-5 text-white/42">
                These are new circles your validated footholds made reachable. <strong className="font-semibold text-white/62">They are goals, not today's engagement assignments.</strong>
              </p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {data.run.secondWaveTargets.map((handle) => (
                  <div key={handle} className="min-w-0 rounded-xl border border-white/8 bg-black/18 p-3.5">
                    <p className="break-all text-sm font-semibold text-white">@{handle}</p>
                    <p className="mt-1 text-[10px] leading-4 text-white/32">Keep building through the footholds and reachable people around this circle instead of cold-chasing the destination.</p>
                    <a href={`https://bsky.app/profile/${handle}`} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-[10px] font-medium text-[#d8b5ff]">
                      View destination <ArrowUpRight className="size-3" aria-hidden />
                    </a>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          <details className="group mt-5 overflow-hidden rounded-2xl border border-white/8 bg-black/12">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-4 sm:px-5">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-white/72">See technical details</p>
                <p className="mt-1 text-[10px] leading-4 text-white/28">Evidence stages, destination coverage, and the mechanics behind the recommendation.</p>
              </div>
              <ChevronDown className="size-4 shrink-0 text-white/35 transition group-open:rotate-180" aria-hidden />
            </summary>

            <div className="border-t border-white/7 p-4 sm:p-5">
              <div className="grid gap-2 md:grid-cols-4">
                {STAGES.map((stage, index) => (
                  <div key={stage.id} className="rounded-xl border border-white/7 bg-white/[0.015] p-3.5">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[9px] font-semibold uppercase tracking-[0.1em] text-white/34">
                        {index + 1}. {stage.label}
                      </span>
                      <span className="text-base font-semibold text-white">{Number(stageCounts[stage.id] ?? 0)}</span>
                    </div>
                    <p className="mt-2 text-[10px] leading-4 text-white/32">{stage.description}</p>
                  </div>
                ))}
              </div>

              <div className="mt-4 rounded-xl border border-white/7 bg-white/[0.012] p-4">
                <p className="text-[9px] font-semibold uppercase tracking-[0.11em] text-white/30">How to read the old path total</p>
                <p className="mt-2 text-[10px] leading-5 text-white/34">
                  The engine recorded {data.run.candidateRouteTotal} candidate-level independent-route counts across {data.run.recommendationsReturned} recommendations. Those counts can overlap between people, so this is deliberately <strong className="font-semibold text-white/52">not presented as {data.run.candidateRouteTotal} globally unique social paths.</strong>
                </p>
              </div>

              {strongestDestinations.length ? (
                <div className="mt-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.11em] text-white/32">Destination coverage</p>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {strongestDestinations.map((destination) => (
                      <div key={`${destination.wave}:${destination.handle}`} className="min-w-0 rounded-xl border border-white/7 bg-white/[0.014] p-3.5">
                        <p className="break-all text-xs font-semibold text-white">@{destination.handle}</p>
                        <p className="mt-1 text-[9px] text-white/28">wave {destination.wave}</p>
                        <div className="mt-3 flex flex-wrap gap-1.5 text-[9px]">
                          <span className="rounded-full border border-[#e6bd73]/14 px-2 py-1 text-[#f1d49a]/75">
                            {destination.validatedBridgePeople} validated foothold{destination.validatedBridgePeople === 1 ? "" : "s"}
                          </span>
                          <span className="rounded-full border border-white/8 px-2 py-1 text-white/34">
                            {destination.bridgePeople} candidate bridge people
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </details>

          {error ? <p className="mt-4 text-xs text-[#ffb4b8]">{error}</p> : null}
        </div>
      )}
    </Card>
  );
}
