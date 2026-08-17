"use client";

import { useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  GitBranch,
  Network,
  Play,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import {
  HelpPopover,
  PurposeBadge,
  PurposeExplanation,
} from "@/components/tools/advanced-network-explain";
import { DemoNetwork } from "@/components/tools/advanced-network-learning-demo";
import {
  NODES,
  STEPS,
  type DemoNodeId,
} from "@/components/tools/advanced-network-learning-data";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const STORAGE_KEY = "rukh:iazma-pro:visual-tour:v1";

export function AdvancedNetworkLearningSystem() {
  const [step, setStep] = useState(0);
  const [expanded, setExpanded] = useState(true);
  const [selectedNode, setSelectedNode] = useState<DemoNodeId>("you");
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    const done = window.localStorage.getItem(STORAGE_KEY) === "complete";
    setCompleted(done);
    if (done) setExpanded(false);
  }, []);

  const selected = NODES.find((node) => node.id === selectedNode) ?? NODES[0];
  const current = STEPS[step];
  const last = step === STEPS.length - 1;

  function chooseStep(next: number) {
    const safe = Math.max(0, Math.min(STEPS.length - 1, next));
    setStep(safe);
    setSelectedNode(STEPS[safe].focus[0] ?? "you");
  }

  function finish() {
    window.localStorage.setItem(STORAGE_KEY, "complete");
    setCompleted(true);
    setExpanded(false);
    window.requestAnimationFrame(() => {
      document.getElementById("iazma-first-action")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }

  function replay() {
    setExpanded(true);
    chooseStep(0);
  }

  return (
    <Card className="min-w-0 overflow-hidden border-[#16c8ff]/24 p-0">
      <div className="border-b border-white/8 bg-[radial-gradient(circle_at_10%_0%,rgba(22,200,255,0.12),transparent_36%),radial-gradient(circle_at_92%_0%,rgba(170,99,255,0.1),transparent_34%),rgba(7,9,13,0.82)] px-5 py-6 sm:px-7 sm:py-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 max-w-4xl">
            <div className="flex flex-wrap items-center gap-2">
              <PurposeBadge kind="demo" />
              <HelpPopover label="Why this tutorial is here">
                This is the mental model for the entire workspace. Learn this once, then the labels on later cards tell you whether a section needs an action, runs automatically, or is only strategic context.
              </HelpPopover>
            </div>
            <h2 className="mt-3 text-2xl font-semibold tracking-[-0.025em] text-white sm:text-3xl">
              See what IAZMA is actually doing.
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-white/55">
              Your existing followers may already sit only a few relationships away from large accounts and communities you care about. IAZMA finds those hidden routes, ranks the reachable people along them, and watches for genuine new connections that create new branches.
            </p>
          </div>

          <Button
            variant={expanded ? "ghost" : "glass"}
            size="sm"
            className="self-start"
            onClick={() => (expanded ? setExpanded(false) : replay())}
          >
            {expanded ? (
              <>
                <CheckCircle2 className="size-4" aria-hidden />
                Hide tutorial
              </>
            ) : (
              <>
                {completed ? <RotateCcw className="size-4" aria-hidden /> : <Play className="size-4" aria-hidden />}
                {completed ? "Replay visual tour" : "Start visual tour"}
              </>
            )}
          </Button>
        </div>

        <div className="mt-5 rounded-2xl border border-white/8 bg-black/20 p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-[#8ce8ff]">
            The whole tool in one sentence
          </p>
          <p className="mt-2 text-sm leading-6 text-white/72">
            <strong className="font-semibold text-white">People you already know</strong>
            {" → "}
            <strong className="font-semibold text-[#b9f1ff]">hidden relationship routes</strong>
            {" → "}
            <strong className="font-semibold text-[#d8b5ff]">reachable people near your goals</strong>
            {" → "}
            <strong className="font-semibold text-[#f1d49a]">new genuine connections</strong>
            {" → "}
            <strong className="font-semibold text-[#ffc8f0]">new branches to explore</strong>.
          </p>
        </div>
      </div>

      {expanded ? (
        <div className="p-4 sm:p-6">
          <div className="flex gap-2 overflow-x-auto pb-2" aria-label="Tutorial steps">
            {STEPS.map((item, index) => {
              const active = index === step;
              const visited = index < step;
              return (
                <button
                  key={item.title}
                  type="button"
                  onClick={() => chooseStep(index)}
                  aria-current={active ? "step" : undefined}
                  className={`flex min-w-[118px] flex-1 items-center gap-2 rounded-xl border px-3 py-2.5 text-left transition ${
                    active
                      ? "border-[#16c8ff]/45 bg-[#16c8ff]/[0.075] text-white"
                      : visited
                        ? "border-emerald-300/14 bg-emerald-300/[0.025] text-white/58"
                        : "border-white/8 bg-white/[0.018] text-white/38 hover:border-white/16 hover:text-white/60"
                  }`}
                >
                  <span
                    className={`grid size-6 shrink-0 place-items-center rounded-full text-[10px] font-semibold ${
                      active
                        ? "bg-[#16c8ff]/16 text-[#b9f1ff]"
                        : visited
                          ? "bg-emerald-300/10 text-emerald-200"
                          : "bg-white/[0.045] text-white/40"
                    }`}
                  >
                    {visited ? "✓" : index + 1}
                  </span>
                  <span className="text-[10px] font-semibold uppercase tracking-[0.08em]">
                    {index === 0
                      ? "Start"
                      : index === 1
                        ? "Trace"
                        : index === 2
                          ? "Compare"
                          : index === 3
                            ? "Act"
                            : "Branch"}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
            <div className="min-w-0">
              <DemoNetwork
                step={step}
                selected={selectedNode}
                onSelect={setSelectedNode}
              />
              <div className="mt-3 rounded-xl border border-white/8 bg-white/[0.018] p-3.5">
                <div className="flex items-center gap-2">
                  <Network className="size-4 text-[#8ce8ff]" aria-hidden />
                  <p className="text-xs font-semibold text-white">{selected.label}</p>
                </div>
                <p className="mt-2 text-[11px] leading-5 text-white/45">{selected.description}</p>
              </div>
            </div>

            <div className="min-w-0 rounded-2xl border border-white/9 bg-[#07090d] p-4 sm:p-5">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[10px] font-semibold uppercase tracking-[0.13em] text-white/34">
                  Step {step + 1} of {STEPS.length}
                </span>
                <Sparkles className="size-4 text-[#f1d49a]" aria-hidden />
              </div>
              <h3 className="mt-3 text-xl font-semibold leading-snug text-white">
                {current.title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-white/55">{current.sentence}</p>

              <div className="mt-5 grid gap-2.5">
                <PurposeExplanation kind="insight" title="What just happened">
                  {current.whatHappened}
                </PurposeExplanation>
                <PurposeExplanation kind="strategy" title="Why it matters">
                  {current.whyItMatters}
                </PurposeExplanation>
                <PurposeExplanation kind={current.yourPartKind} title="What you do">
                  {current.yourPart}
                </PurposeExplanation>
              </div>

              <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => chooseStep(step - 1)}
                  disabled={step === 0}
                >
                  <ArrowLeft className="size-4" aria-hidden />
                  Back
                </Button>
                {last ? (
                  <Button variant="glass" size="sm" onClick={finish}>
                    Go to the first action
                    <ArrowRight className="size-4" aria-hidden />
                  </Button>
                ) : (
                  <Button variant="glass" size="sm" onClick={() => chooseStep(step + 1)}>
                    Next step
                    <ArrowRight className="size-4" aria-hidden />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <div className="border-t border-white/8 bg-black/15 p-4 sm:p-5">
        <div className="flex items-center gap-2">
          <GitBranch className="size-4 text-[#d8b5ff]" aria-hidden />
          <p className="text-xs font-semibold text-white">How to read the rest of the workspace</p>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          <PurposeExplanation kind="action" title="You make a choice">
            Buttons, profile checks, feedback, and relationship decisions. Nothing happens on Bluesky unless you choose it.
          </PurposeExplanation>
          <PurposeExplanation kind="automatic" title="IAZMA calculates">
            Scans, route comparisons, ranking, and progress reconciliation. Watch it; you do not need to manage the math.
          </PurposeExplanation>
          <PurposeExplanation kind="insight" title="Read the result">
            Counts, charts, and maps explain what the tool found. They are not automatic instructions.
          </PurposeExplanation>
          <PurposeExplanation kind="strategy" title="Use judgment">
            Context about why a route matters and how to grow naturally without treating people as stepping stones.
          </PurposeExplanation>
        </div>
      </div>
    </Card>
  );
}
