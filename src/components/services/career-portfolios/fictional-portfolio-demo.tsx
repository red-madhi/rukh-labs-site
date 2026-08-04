"use client";

import { useMemo, useState } from "react";
import {
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  CircleGauge,
  LockKeyhole,
  Sparkles,
  Target,
} from "lucide-react";

const caseStudies = [
  {
    id: "capacity",
    label: "Capacity planning",
    title: "Reframed a staffing debate around demand, skills, and service risk.",
    situation:
      "A fictional operations team planned headcount from averages that hid weekly demand swings and specialist constraints.",
    move:
      "Taylor defined the decision, joined demand and skills data, built a scenario model, and facilitated tradeoff reviews with operations and finance.",
    outcome: "11%",
    outcomeLabel: "modeled overtime reduction",
    proof: ["Scenario model", "Decision brief", "Facilitation plan"],
    bars: [46, 58, 53, 72, 65, 84],
  },
  {
    id: "workflow",
    label: "Workflow redesign",
    title: "Found the handoff creating repeat work and made ownership visible.",
    situation:
      "A fictional service workflow crossed four teams, but nobody could see where requests stalled or returned for correction.",
    move:
      "Taylor mapped the lifecycle, created a reason-code taxonomy, and tested a new ownership model with frontline leads.",
    outcome: "29%",
    outcomeLabel: "fewer fictional reopenings",
    proof: ["Journey map", "Measurement plan", "Pilot readout"],
    bars: [78, 72, 64, 57, 54, 49],
  },
  {
    id: "launch",
    label: "Product launch",
    title: "Turned scattered launch work into one operating rhythm.",
    situation:
      "A fictional product team tracked readiness across documents, meetings, and chat threads with no shared definition of done.",
    move:
      "Taylor designed a launch scorecard, clarified decision owners, and created an exception-based weekly review.",
    outcome: "2.4×",
    outcomeLabel: "faster risk resolution",
    proof: ["Readiness scorecard", "RACI", "Retrospective"],
    bars: [35, 44, 59, 68, 79, 91],
  },
] as const;

const strengths = [
  { label: "Structured problem solving", value: 92 },
  { label: "Cross-functional facilitation", value: 86 },
  { label: "Operational analysis", value: 89 },
  { label: "Executive communication", value: 82 },
] as const;

export function FictionalPortfolioDemo() {
  const [activeId, setActiveId] = useState<string>(caseStudies[0].id);
  const active = useMemo(
    () => caseStudies.find((study) => study.id === activeId) ?? caseStudies[0],
    [activeId],
  );

  return (
    <div className="overflow-hidden rounded-[1.6rem] border border-[#6e9dff]/22 bg-[#07101b] shadow-[0_35px_120px_rgba(0,0,0,0.45)]">
      <div className="border-b border-white/10 bg-[linear-gradient(115deg,rgba(22,200,255,0.12),rgba(109,49,255,0.12),transparent_72%)] px-5 py-4 sm:px-7">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-full bg-[linear-gradient(135deg,#67e8f9,#8b5cf6)] text-sm font-bold text-[#06101b]">
              TR
            </span>
            <div>
              <p className="text-sm font-semibold text-white">Taylor Rowan</p>
              <p className="text-xs text-white/46">Operations Strategy Analyst</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8aeaff]">
            <Sparkles aria-hidden className="size-3.5" />
            Fictional demonstration
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-[0.76fr_1.24fr]">
        <aside className="border-b border-white/10 p-5 sm:p-7 lg:border-b-0 lg:border-r">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8aeaff]">
            The positioning
          </p>
          <h2 className="mt-5 text-3xl font-semibold leading-tight text-white sm:text-4xl">
            I make complex work easier to run.
          </h2>
          <p className="mt-5 text-sm leading-7 text-white/58">
            I connect operating data, team behavior, and decision design so
            leaders can see the real constraint and act with confidence.
          </p>

          <div className="mt-8 grid gap-3">
            {strengths.map((strength) => (
              <div key={strength.label}>
                <div className="mb-2 flex items-center justify-between gap-4 text-xs">
                  <span className="text-white/62">{strength.label}</span>
                  <span className="font-mono text-[#8aeaff]">{strength.value}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-white/8">
                  <div
                    className="h-full rounded-full bg-[linear-gradient(90deg,#16c8ff,#8b5cf6)]"
                    style={{ width: `${strength.value}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 rounded-xl border border-white/10 bg-white/[0.035] p-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-white">
              <LockKeyhole aria-hidden className="size-4 text-[#b49cff]" />
              Privacy-safe proof
            </div>
            <p className="mt-2 text-xs leading-5 text-white/45">
              Every organization, metric, artifact, and outcome shown in this
              demo is invented for demonstration.
            </p>
          </div>
        </aside>

        <div className="p-5 sm:p-7">
          <div className="flex flex-wrap gap-2" role="tablist" aria-label="Fictional case studies">
            {caseStudies.map((study) => (
              <button
                key={study.id}
                type="button"
                role="tab"
                aria-selected={study.id === active.id}
                onClick={() => setActiveId(study.id)}
                className={`rounded-full border px-3 py-2 text-xs font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#67e8f9] ${
                  study.id === active.id
                    ? "border-[#67e8f9]/50 bg-[#16c8ff]/12 text-white"
                    : "border-white/10 bg-white/[0.025] text-white/48 hover:text-white"
                }`}
              >
                {study.label}
              </button>
            ))}
          </div>

          <div className="mt-7 grid gap-6 xl:grid-cols-[1fr_15rem]">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#9f8cff]">
                Selected case study
              </p>
              <h3 className="mt-4 text-2xl font-semibold leading-tight text-white sm:text-3xl">
                {active.title}
              </h3>
              <div className="mt-6 grid gap-5 sm:grid-cols-2">
                <div>
                  <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-white/40">
                    <Target aria-hidden className="size-3.5" /> Situation
                  </p>
                  <p className="mt-3 text-sm leading-6 text-white/58">{active.situation}</p>
                </div>
                <div>
                  <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-white/40">
                    <CircleGauge aria-hidden className="size-3.5" /> Move
                  </p>
                  <p className="mt-3 text-sm leading-6 text-white/58">{active.move}</p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-[#67e8f9]/16 bg-[#0a1724] p-5">
              <BarChart3 aria-hidden className="size-5 text-[#67e8f9]" />
              <strong className="mt-5 block text-4xl font-semibold tracking-[-0.05em] text-white">
                {active.outcome}
              </strong>
              <span className="mt-1 block text-xs leading-5 text-white/45">
                {active.outcomeLabel}
              </span>
              <div className="mt-6 flex h-20 items-end gap-2" aria-label="Illustrative outcome trend">
                {active.bars.map((height, index) => (
                  <i
                    key={`${active.id}-${index}`}
                    className="flex-1 rounded-t-sm bg-[linear-gradient(180deg,#67e8f9,#7c3aed)] opacity-80"
                    style={{ height: `${height}%` }}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="mt-7 border-t border-white/10 pt-6">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-white/40">
              Evidence a recruiter could inspect
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {active.proof.map((item) => (
                <span
                  key={item}
                  className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.035] px-3 py-2 text-xs text-white/62"
                >
                  <CheckCircle2 aria-hidden className="size-3.5 text-[#67e8f9]" />
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-7 flex flex-col gap-3 rounded-xl border border-dashed border-white/14 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-white">Contact and files intentionally disabled</p>
              <p className="mt-1 text-xs text-white/42">
                This public sample contains no real identity, submission endpoint, or downloadable artifact.
              </p>
            </div>
            <span className="inline-flex shrink-0 items-center gap-2 text-xs font-semibold text-white/34">
              Demo only <ArrowUpRight aria-hidden className="size-3.5" />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
