"use client";

import { useMemo, useState } from "react";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  CircleGauge,
  FileText,
  Home,
  Layers3,
  LockKeyhole,
  Sparkles,
  Target,
  UserRound,
  Wrench,
} from "lucide-react";
import { FictionalOperationsDashboard } from "@/components/services/career-portfolios/fictional-operations-dashboard";

type PortfolioView = "overview" | "work" | "dashboard" | "about" | "resume";

const portfolioViews = [
  { id: "overview", label: "Overview", icon: Home },
  { id: "work", label: "Work", icon: Layers3 },
  { id: "dashboard", label: "Live dashboard", icon: BarChart3 },
  { id: "about", label: "About", icon: UserRound },
  { id: "resume", label: "Résumé", icon: FileText },
] as const;

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

const methods = [
  {
    number: "01",
    title: "Frame the decision",
    copy: "Start with the choice a team needs to make, the constraints around it, and the evidence that would change the answer.",
  },
  {
    number: "02",
    title: "Model the system",
    copy: "Connect demand, capacity, ownership, risk, and outcomes so the operating story holds together under scrutiny.",
  },
  {
    number: "03",
    title: "Make action visible",
    copy: "Design the review, dashboard, or workflow so the next decision is obvious without flattening the nuance.",
  },
] as const;

const roles = [
  {
    period: "Most recent",
    title: "Operations Strategy Analyst",
    context: "Fictional multi-region service organization",
    bullets: [
      "Built planning models connecting demand, skills, staffing, and service risk.",
      "Designed operating reviews for cross-functional leaders.",
      "Translated analysis into tested workflow changes.",
    ],
  },
  {
    period: "Previously",
    title: "Business Operations Specialist",
    context: "Fictional growth-stage software company",
    bullets: [
      "Created launch readiness and exception-management systems.",
      "Standardized operational definitions across product and support teams.",
      "Built concise leadership briefs from noisy operating data.",
    ],
  },
] as const;

function ViewButton({
  view,
  activeView,
  onSelect,
}: {
  view: (typeof portfolioViews)[number];
  activeView: PortfolioView;
  onSelect: (view: PortfolioView) => void;
}) {
  const Icon = view.icon;
  const active = view.id === activeView;

  return (
    <button
      type="button"
      aria-current={active ? "page" : undefined}
      onClick={() => onSelect(view.id)}
      className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#67e8f9] ${
        active
          ? "border-[#67e8f9]/45 bg-[#16c8ff]/12 text-white"
          : "border-transparent text-white/46 hover:border-white/10 hover:text-white"
      }`}
    >
      <Icon aria-hidden className="size-3.5" />
      {view.label}
    </button>
  );
}

function OverviewView({ onSelect }: { onSelect: (view: PortfolioView) => void }) {
  return (
    <div>
      <section className="grid gap-8 border-b border-white/10 px-5 py-10 sm:px-8 sm:py-14 lg:grid-cols-[1.04fr_0.96fr] lg:items-center lg:px-10">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8aeaff]">
            Fictional operations portfolio
          </p>
          <h2 className="mt-5 max-w-3xl text-4xl font-semibold leading-[1.04] text-white sm:text-6xl">
            I make complex work easier to run.
          </h2>
          <p className="mt-6 max-w-2xl text-base leading-8 text-white/58 sm:text-lg">
            I connect operating data, team behavior, and decision design so leaders
            can see the real constraint and act with confidence.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => onSelect("work")}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[linear-gradient(135deg,#67e8f9,#6d31ff)] px-5 text-sm font-semibold text-[#04101a] transition hover:brightness-110"
            >
              Explore the work <ArrowRight aria-hidden className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => onSelect("dashboard")}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-white/12 bg-white/[0.035] px-5 text-sm font-semibold text-white transition hover:border-[#67e8f9]/38 hover:bg-[#16c8ff]/8"
            >
              Operate the live dashboard <BarChart3 aria-hidden className="size-4" />
            </button>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-[1.4rem] border border-[#67e8f9]/18 bg-[linear-gradient(150deg,rgba(22,200,255,0.1),rgba(109,49,255,0.1),rgba(255,255,255,0.025))] p-5 sm:p-7">
          <div className="absolute -right-16 -top-16 size-52 rounded-full bg-[#6d31ff]/16 blur-3xl" />
          <div className="relative grid gap-3 sm:grid-cols-2">
            {[
              ["3", "fictional case studies"],
              ["1", "interactive dashboard"],
              ["92", "problem-solving signal"],
              ["0", "personal files or data"],
            ].map(([value, label]) => (
              <article key={label} className="rounded-xl border border-white/10 bg-[#07101b]/82 p-5">
                <strong className="block text-3xl font-semibold tracking-[-0.05em] text-white">
                  {value}
                </strong>
                <span className="mt-2 block text-xs leading-5 text-white/42">{label}</span>
              </article>
            ))}
          </div>
          <div className="relative mt-3 flex items-center gap-3 rounded-xl border border-[#b49cff]/18 bg-[#b49cff]/[0.055] p-4">
            <Sparkles aria-hidden className="size-5 shrink-0 text-[#b49cff]" />
            <p className="text-xs leading-5 text-white/54">
              Every name, organization, metric, role, and project is invented for this demonstration.
            </p>
          </div>
        </div>
      </section>

      <section className="px-5 py-9 sm:px-8 lg:px-10">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#b49cff]">
              A simple way in
            </p>
            <h3 className="mt-3 text-2xl font-semibold text-white sm:text-3xl">
              Choose your depth.
            </h3>
          </div>
          <p className="max-w-xl text-sm leading-6 text-white/48">
            The portfolio supports a quick recruiter scan and a deeper review of the work behind the claims.
          </p>
        </div>
        <div className="mt-7 grid gap-3 md:grid-cols-3">
          {[
            { view: "work" as const, time: "Quick review", title: "Scan the evidence", copy: "Compare three decision stories and the proof behind each result." },
            { view: "dashboard" as const, time: "Technical deep dive", title: "Operate the model", copy: "Change region, staffing scenario, demand, and the selected metric." },
            { view: "resume" as const, time: "Role fit", title: "Review the résumé", copy: "See how experience, skills, and positioning reinforce the same story." },
          ].map((item) => (
            <button
              key={item.view}
              type="button"
              onClick={() => onSelect(item.view)}
              className="group rounded-xl border border-white/10 bg-white/[0.025] p-5 text-left transition hover:-translate-y-1 hover:border-[#67e8f9]/28 hover:bg-white/[0.04]"
            >
              <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8aeaff]">{item.time}</span>
              <strong className="mt-4 flex items-center justify-between gap-4 text-base text-white">
                {item.title}
                <ArrowRight aria-hidden className="size-4 text-white/28 transition group-hover:translate-x-1 group-hover:text-[#8aeaff]" />
              </strong>
              <span className="mt-2 block text-xs leading-5 text-white/42">{item.copy}</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

function WorkView() {
  const [activeId, setActiveId] = useState<string>(caseStudies[0].id);
  const active = useMemo(
    () => caseStudies.find((study) => study.id === activeId) ?? caseStudies[0],
    [activeId],
  );

  return (
    <section className="px-5 py-9 sm:px-8 sm:py-11 lg:px-10">
      <div className="max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#8aeaff]">Selected work</p>
        <h2 className="mt-4 text-3xl font-semibold text-white sm:text-4xl">Evidence, not a list of claims.</h2>
        <p className="mt-4 text-sm leading-7 text-white/52">
          Each fictional case shows the operating problem, the move, the result, and the artifacts a hiring team could inspect.
        </p>
      </div>

      <div className="mt-8 flex flex-wrap gap-2" role="tablist" aria-label="Fictional case studies">
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

      <div className="mt-7 grid gap-5 xl:grid-cols-[1fr_17rem]">
        <article className="rounded-xl border border-white/10 bg-white/[0.025] p-5 sm:p-7">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#b49cff]">Selected case study</p>
          <h3 className="mt-4 text-2xl font-semibold leading-tight text-white sm:text-3xl">{active.title}</h3>
          <div className="mt-7 grid gap-6 sm:grid-cols-2">
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
          <div className="mt-7 border-t border-white/10 pt-6">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-white/40">Evidence a recruiter could inspect</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {active.proof.map((item) => (
                <span key={item} className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.035] px-3 py-2 text-xs text-white/62">
                  <CheckCircle2 aria-hidden className="size-3.5 text-[#67e8f9]" />
                  {item}
                </span>
              ))}
            </div>
          </div>
        </article>

        <aside className="rounded-xl border border-[#67e8f9]/16 bg-[#0a1724] p-5">
          <BarChart3 aria-hidden className="size-5 text-[#67e8f9]" />
          <strong className="mt-5 block text-4xl font-semibold tracking-[-0.05em] text-white">{active.outcome}</strong>
          <span className="mt-1 block text-xs leading-5 text-white/45">{active.outcomeLabel}</span>
          <div className="mt-7 flex h-28 items-end gap-2" aria-label="Illustrative outcome trend">
            {active.bars.map((height, index) => (
              <i key={`${active.id}-${index}`} className="flex-1 rounded-t-sm bg-[linear-gradient(180deg,#67e8f9,#7c3aed)] opacity-80" style={{ height: `${height}%` }} />
            ))}
          </div>
        </aside>
      </div>
    </section>
  );
}

function AboutView() {
  return (
    <section className="px-5 py-9 sm:px-8 sm:py-11 lg:px-10">
      <div className="grid gap-8 lg:grid-cols-[0.78fr_1.22fr]">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#8aeaff]">Positioning & method</p>
          <h2 className="mt-4 text-3xl font-semibold leading-tight text-white sm:text-4xl">Good analysis changes the way the work runs.</h2>
          <p className="mt-5 text-sm leading-7 text-white/54">
            Taylor is a fictional operator-analyst positioned between data, workflow design, facilitation, and executive decision support.
          </p>
          <div className="mt-7 rounded-xl border border-white/10 bg-white/[0.025] p-5">
            <Wrench aria-hidden className="size-5 text-[#b49cff]" />
            <p className="mt-4 text-sm font-semibold text-white">What the portfolio is demonstrating</p>
            <p className="mt-2 text-xs leading-6 text-white/46">
              A clear point of view, consistent professional narrative, proof of judgment, and an interface that rewards deeper review.
            </p>
          </div>
        </div>
        <div className="grid gap-3">
          {methods.map((method) => (
            <article key={method.number} className="grid gap-4 rounded-xl border border-white/10 bg-white/[0.025] p-5 sm:grid-cols-[3rem_1fr] sm:p-6">
              <span className="font-mono text-sm font-semibold text-[#8aeaff]">{method.number}</span>
              <div>
                <h3 className="text-lg font-semibold text-white">{method.title}</h3>
                <p className="mt-2 text-sm leading-6 text-white/52">{method.copy}</p>
              </div>
            </article>
          ))}
        </div>
      </div>

      <div className="mt-9 border-t border-white/10 pt-8">
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#b49cff]">Core strengths</p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {strengths.map((strength) => (
            <div key={strength.label}>
              <div className="mb-2 flex items-center justify-between gap-4 text-xs">
                <span className="text-white/62">{strength.label}</span>
                <span className="font-mono text-[#8aeaff]">{strength.value}</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-white/8">
                <div className="h-full rounded-full bg-[linear-gradient(90deg,#16c8ff,#8b5cf6)]" style={{ width: `${strength.value}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ResumeView({ onSelect }: { onSelect: (view: PortfolioView) => void }) {
  return (
    <section className="px-5 py-9 sm:px-8 sm:py-11 lg:px-10">
      <div className="flex flex-col gap-5 border-b border-white/10 pb-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#8aeaff]">Fictional résumé view</p>
          <h2 className="mt-4 text-3xl font-semibold text-white sm:text-4xl">Taylor Rowan</h2>
          <p className="mt-2 text-base text-white/52">Operations Strategy Analyst</p>
        </div>
        <div className="rounded-xl border border-[#b49cff]/18 bg-[#b49cff]/[0.055] px-4 py-3 text-xs text-white/52">
          No contact details or downloadable file in this demo
        </div>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[0.68fr_1.32fr]">
        <aside>
          <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-[#b49cff]">Profile</h3>
          <p className="mt-4 text-sm leading-7 text-white/54">
            Fictional operations professional who turns fragmented data and cross-functional work into clear decisions, practical models, and repeatable operating rhythms.
          </p>
          <h3 className="mt-7 text-xs font-semibold uppercase tracking-[0.14em] text-[#b49cff]">Capabilities</h3>
          <div className="mt-4 flex flex-wrap gap-2">
            {["Scenario planning", "Process design", "Operational analytics", "Facilitation", "Executive briefs", "Measurement design"].map((skill) => (
              <span key={skill} className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-white/54">{skill}</span>
            ))}
          </div>
        </aside>

        <div className="grid gap-4">
          {roles.map((role) => (
            <article key={role.title} className="rounded-xl border border-white/10 bg-white/[0.025] p-5 sm:p-6">
              <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8aeaff]">{role.period}</span>
              <h3 className="mt-3 text-xl font-semibold text-white">{role.title}</h3>
              <p className="mt-1 text-xs text-white/42">{role.context}</p>
              <ul className="mt-5 grid gap-3">
                {role.bullets.map((bullet) => (
                  <li key={bullet} className="flex gap-3 text-sm leading-6 text-white/54">
                    <CheckCircle2 aria-hidden className="mt-1 size-3.5 shrink-0 text-[#67e8f9]" />
                    {bullet}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </div>

      <div className="mt-8 flex flex-col gap-3 rounded-xl border border-dashed border-white/14 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-white">Files intentionally unavailable</p>
          <p className="mt-1 text-xs text-white/42">A client portfolio can include approved résumé and project files; this public demo does not.</p>
        </div>
        <button type="button" onClick={() => onSelect("dashboard")} className="inline-flex shrink-0 items-center gap-2 text-xs font-semibold text-[#8aeaff] transition hover:text-white">
          Open live dashboard <ArrowRight aria-hidden className="size-3.5" />
        </button>
      </div>
    </section>
  );
}

export function FictionalPortfolioDemo() {
  const [activeView, setActiveView] = useState<PortfolioView>("overview");

  return (
    <div className="overflow-hidden rounded-[1.6rem] border border-[#6e9dff]/22 bg-[#07101b] shadow-[0_35px_120px_rgba(0,0,0,0.45)]">
      <div className="border-b border-white/10 bg-[linear-gradient(115deg,rgba(22,200,255,0.12),rgba(109,49,255,0.12),transparent_72%)] px-4 py-4 sm:px-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-full bg-[linear-gradient(135deg,#67e8f9,#8b5cf6)] text-sm font-bold text-[#06101b]">TR</span>
            <div>
              <p className="text-sm font-semibold text-white">Taylor Rowan</p>
              <p className="text-xs text-white/46">Fictional operations strategy analyst</p>
            </div>
          </div>

          <nav className="flex gap-1 overflow-x-auto pb-1 xl:pb-0" aria-label="Fictional portfolio navigation">
            {portfolioViews.map((view) => (
              <ViewButton key={view.id} view={view} activeView={activeView} onSelect={setActiveView} />
            ))}
          </nav>

          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8aeaff]">
            <Sparkles aria-hidden className="size-3.5" />
            Fictional demonstration
          </div>
        </div>
      </div>

      {activeView === "overview" ? <OverviewView onSelect={setActiveView} /> : null}
      {activeView === "work" ? <WorkView /> : null}
      {activeView === "dashboard" ? (
        <section className="px-4 py-7 sm:px-7 sm:py-9">
          <div className="mb-6 max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#8aeaff]">Interactive proof</p>
            <h2 className="mt-3 text-3xl font-semibold text-white sm:text-4xl">Operate the decision, not a screenshot.</h2>
            <p className="mt-4 text-sm leading-7 text-white/52">
              This fictional dashboard demonstrates how a candidate can make analytical work explorable without exposing a confidential employer system.
            </p>
          </div>
          <FictionalOperationsDashboard />
        </section>
      ) : null}
      {activeView === "about" ? <AboutView /> : null}
      {activeView === "resume" ? <ResumeView onSelect={setActiveView} /> : null}

      <div className="flex flex-col gap-3 border-t border-white/10 bg-black/18 px-5 py-4 text-xs text-white/38 sm:flex-row sm:items-center sm:justify-between sm:px-7">
        <span className="inline-flex items-center gap-2">
          <LockKeyhole aria-hidden className="size-3.5 text-[#b49cff]" />
          No real identity, contact endpoint, or downloadable artifact
        </span>
        <span className="inline-flex items-center gap-2">
          Portfolio view: <strong className="text-white/62">{portfolioViews.find((view) => view.id === activeView)?.label}</strong>
        </span>
      </div>
    </div>
  );
}
