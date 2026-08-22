import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Database,
  FileSpreadsheet,
  ListChecks,
  RefreshCw,
} from "lucide-react";

const pipelineSteps = [
  { label: "Standardize", detail: "Headers, types, dates, IDs" },
  { label: "Match", detail: "Deterministic rules first" },
  { label: "Validate", detail: "Counts, totals, nulls, duplicates" },
  { label: "Route", detail: "Only unresolved exceptions" },
] as const;

const demoMetrics = [
  { value: "12", label: "mock source files" },
  { value: "2,840", label: "synthetic rows" },
  { value: "37", label: "flagged exceptions" },
  { value: "100%", label: "control totals matched" },
] as const;

export function DataOpsPipelineVisual() {
  return (
    <div className="relative overflow-hidden rounded-[1.5rem] border border-[#16c8ff]/22 bg-[linear-gradient(145deg,rgba(7,18,26,0.96),rgba(13,8,13,0.98))] p-4 shadow-[0_28px_100px_rgba(0,0,0,0.42)] sm:p-5">
      <div className="absolute right-[-7rem] top-[-7rem] size-56 rounded-full bg-[#16c8ff]/12 blur-3xl" />
      <div className="absolute bottom-[-8rem] left-[-5rem] size-56 rounded-full bg-[color:var(--brand-red)]/10 blur-3xl" />

      <div className="relative flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8ce8ff]">
            Synthetic workflow lab
          </p>
          <p className="mt-1 text-sm font-semibold text-white">Monthly operations close</p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-300/8 px-3 py-1 text-[11px] font-medium text-emerald-100">
          <span className="size-1.5 rounded-full bg-emerald-300" />
          Controls passed
        </span>
      </div>

      <div className="relative mt-5 grid gap-4 xl:grid-cols-[0.82fr_auto_1.25fr_auto_0.9fr] xl:items-center">
        <div className="rounded-xl border border-white/10 bg-black/20 p-4">
          <div className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-lg border border-[#16c8ff]/24 bg-[#16c8ff]/9 text-[#8ce8ff]">
              <FileSpreadsheet aria-hidden className="size-4" />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-white/38">Inputs</p>
              <p className="text-sm font-semibold text-white">Messy source files</p>
            </div>
          </div>
          <div className="mt-4 grid gap-2 text-xs text-white/58">
            <div className="flex items-center justify-between rounded-lg border border-white/8 bg-white/[0.025] px-3 py-2">
              <span>Location CSVs</span>
              <span className="font-mono text-[#8ce8ff]">12</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-white/8 bg-white/[0.025] px-3 py-2">
              <span>Master reference</span>
              <span className="font-mono text-[#8ce8ff]">1</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-amber-300/15 bg-amber-300/[0.04] px-3 py-2 text-amber-100/76">
              <span>Schema variants</span>
              <span className="font-mono">4</span>
            </div>
          </div>
        </div>

        <ArrowRight aria-hidden className="mx-auto hidden size-5 text-white/22 xl:block" />

        <div className="rounded-xl border border-[color:var(--brand-red)]/20 bg-[color:var(--brand-red)]/[0.035] p-4">
          <div className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-lg border border-[color:var(--brand-red)]/26 bg-[color:var(--brand-red)]/10 text-[#ff9aa4]">
              <RefreshCw aria-hidden className="size-4" />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-white/38">Controlled workflow</p>
              <p className="text-sm font-semibold text-white">Automate the mechanics</p>
            </div>
          </div>
          <ol className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
            {pipelineSteps.map((step, index) => (
              <li key={step.label} className="rounded-lg border border-white/9 bg-black/18 p-3">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] font-semibold text-[#ff8f9a]">0{index + 1}</span>
                  <span className="text-xs font-semibold text-white">{step.label}</span>
                </div>
                <p className="mt-1 pl-6 text-[11px] leading-4 text-white/42">{step.detail}</p>
              </li>
            ))}
          </ol>
        </div>

        <ArrowRight aria-hidden className="mx-auto hidden size-5 text-white/22 xl:block" />

        <div className="rounded-xl border border-[#e6bd73]/18 bg-[#e6bd73]/[0.035] p-4">
          <div className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-lg border border-[#e6bd73]/24 bg-[#e6bd73]/8 text-[#f5d895]">
              <BarChart3 aria-hidden className="size-4" />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-white/38">Outputs</p>
              <p className="text-sm font-semibold text-white">Review only exceptions</p>
            </div>
          </div>
          <div className="mt-4 grid gap-2 text-xs">
            <div className="flex items-center gap-2 rounded-lg border border-emerald-300/14 bg-emerald-300/[0.035] px-3 py-2 text-emerald-100/78">
              <CheckCircle2 aria-hidden className="size-4 shrink-0" />
              Validated management output
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-amber-300/14 bg-amber-300/[0.035] px-3 py-2 text-amber-100/78">
              <AlertTriangle aria-hidden className="size-4 shrink-0" />
              Human exception queue
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-white/8 bg-white/[0.025] px-3 py-2 text-white/58">
              <ListChecks aria-hidden className="size-4 shrink-0" />
              Run log and evidence
            </div>
          </div>
        </div>
      </div>

      <div className="relative mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-white/10 bg-white/10 sm:grid-cols-4">
        {demoMetrics.map((metric) => (
          <div key={metric.label} className="bg-[#09090c] p-3 sm:p-4">
            <p className="font-mono text-lg font-semibold text-white sm:text-xl">{metric.value}</p>
            <p className="mt-1 text-[10px] uppercase tracking-[0.1em] text-white/36">{metric.label}</p>
          </div>
        ))}
      </div>

      <div className="relative mt-3 flex items-start gap-2 text-[11px] leading-5 text-white/34">
        <Database aria-hidden className="mt-0.5 size-3.5 shrink-0" />
        All names, files, records, counts, and outcomes shown here are fictional demonstration data.
      </div>
    </div>
  );
}
