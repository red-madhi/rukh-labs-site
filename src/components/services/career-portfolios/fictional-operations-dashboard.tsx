"use client";

import { useMemo, useState } from "react";
import {
  Activity,
  ArrowRight,
  Clock3,
  Gauge,
  ShieldCheck,
  SlidersHorizontal,
  UsersRound,
} from "lucide-react";

type RegionId = "network" | "north" | "central" | "south";
type ScenarioId = "current" | "cross-train" | "flex-pool";
type MetricId = "coverage" | "demand" | "overtime";

const regions = {
  network: {
    label: "All regions",
    demand: 5240,
    capacity: 4875,
    overtime: 468,
    serviceLevel: 0.824,
    trend: [0.88, 0.94, 1.02, 1.08, 1.04, 1.12],
  },
  north: {
    label: "North region",
    demand: 1640,
    capacity: 1585,
    overtime: 126,
    serviceLevel: 0.858,
    trend: [0.91, 0.96, 1.01, 1.04, 1.07, 1.09],
  },
  central: {
    label: "Central region",
    demand: 2080,
    capacity: 1810,
    overtime: 224,
    serviceLevel: 0.776,
    trend: [0.86, 0.92, 1.04, 1.14, 1.08, 1.18],
  },
  south: {
    label: "South region",
    demand: 1520,
    capacity: 1480,
    overtime: 118,
    serviceLevel: 0.847,
    trend: [0.9, 0.95, 1, 1.06, 1.02, 1.08],
  },
} as const;

const scenarios = {
  current: {
    label: "Current model",
    capacityMultiplier: 1,
    overtimeMultiplier: 1,
    serviceLift: 0,
    cost: 0,
  },
  "cross-train": {
    label: "Cross-train specialists",
    capacityMultiplier: 1.065,
    overtimeMultiplier: 0.76,
    serviceLift: 0.035,
    cost: 42000,
  },
  "flex-pool": {
    label: "Add a flex pool",
    capacityMultiplier: 1.115,
    overtimeMultiplier: 0.61,
    serviceLift: 0.058,
    cost: 96000,
  },
} as const;

const weeks = ["W1", "W2", "W3", "W4", "W5", "W6"] as const;

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value);
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPercent(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

export function FictionalOperationsDashboard() {
  const [regionId, setRegionId] = useState<RegionId>("network");
  const [scenarioId, setScenarioId] = useState<ScenarioId>("current");
  const [demandIndex, setDemandIndex] = useState(100);
  const [metricId, setMetricId] = useState<MetricId>("coverage");

  const model = useMemo(() => {
    const region = regions[regionId];
    const scenario = scenarios[scenarioId];
    const demand = region.demand * (demandIndex / 100);
    const capacity = region.capacity * scenario.capacityMultiplier;
    const gap = capacity - demand;
    const coverage = capacity / demand;
    const pressure = Math.max(0.72, demand / region.demand);
    const overtime = region.overtime * pressure * scenario.overtimeMultiplier;
    const serviceLevel = Math.min(
      0.965,
      region.serviceLevel + scenario.serviceLift - Math.max(0, 1 - coverage) * 0.32,
    );
    const weeksData = region.trend.map((trend, index) => {
      const weeklyDemand = demand * trend;
      const weeklyCapacity = capacity * (0.97 + index * 0.011);
      const weeklyCoverage = weeklyCapacity / weeklyDemand;
      const weeklyOvertime = overtime * trend;

      return {
        week: weeks[index],
        demand: weeklyDemand,
        capacity: weeklyCapacity,
        coverage: weeklyCoverage,
        overtime: weeklyOvertime,
      };
    });

    const recommendation =
      coverage < 0.96
        ? "Capacity remains below modeled demand. Test the flex pool or reduce the demand assumption before approving the staffing plan."
        : overtime > region.overtime * 0.84
          ? "Coverage is viable, but overtime remains above the guardrail. Cross-training is the lower-cost next move."
          : "The selected scenario clears the coverage guardrail. Protect service quality and validate the cost before launch.";

    return {
      region,
      scenario,
      demand,
      capacity,
      gap,
      coverage,
      overtime,
      serviceLevel,
      weeksData,
      recommendation,
    };
  }, [demandIndex, regionId, scenarioId]);

  const chartValues = model.weeksData.map((row) => {
    if (metricId === "demand") return row.demand;
    if (metricId === "overtime") return row.overtime;
    return row.coverage;
  });
  const maxValue = Math.max(...chartValues);

  return (
    <div className="overflow-hidden rounded-[1.35rem] border border-[#67e8f9]/18 bg-[#06101a] shadow-[0_24px_90px_rgba(0,0,0,0.38)]">
      <div className="flex flex-col gap-4 border-b border-white/10 bg-[linear-gradient(110deg,rgba(22,200,255,0.12),rgba(109,49,255,0.1),transparent_72%)] px-5 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8aeaff]">
            <Activity aria-hidden className="size-3.5" />
            Live fictional model
          </div>
          <h3 className="mt-2 text-xl font-semibold text-white sm:text-2xl">
            Service Capacity Studio
          </h3>
          <p className="mt-1 text-xs text-white/44">
            Explore staffing decisions under changing demand.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.035] px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.13em] text-white/54">
          <ShieldCheck aria-hidden className="size-3.5 text-[#b49cff]" />
          Synthetic data
        </div>
      </div>

      <div className="grid border-b border-white/10 lg:grid-cols-[1fr_1fr_0.9fr]">
        <label className="border-b border-white/10 p-4 text-xs text-white/48 lg:border-b-0 lg:border-r sm:p-5">
          Region
          <select
            value={regionId}
            onChange={(event) => setRegionId(event.target.value as RegionId)}
            className="mt-2 block h-11 w-full rounded-lg border border-white/12 bg-[#0b1723] px-3 text-sm font-semibold text-white outline-none focus:border-[#67e8f9]/55"
          >
            {Object.entries(regions).map(([id, region]) => (
              <option key={id} value={id}>
                {region.label}
              </option>
            ))}
          </select>
        </label>
        <label className="border-b border-white/10 p-4 text-xs text-white/48 lg:border-b-0 lg:border-r sm:p-5">
          Staffing scenario
          <select
            value={scenarioId}
            onChange={(event) => setScenarioId(event.target.value as ScenarioId)}
            className="mt-2 block h-11 w-full rounded-lg border border-white/12 bg-[#0b1723] px-3 text-sm font-semibold text-white outline-none focus:border-[#67e8f9]/55"
          >
            {Object.entries(scenarios).map(([id, scenario]) => (
              <option key={id} value={id}>
                {scenario.label}
              </option>
            ))}
          </select>
        </label>
        <div className="p-4 text-xs text-white/48 sm:p-5">
          <div className="flex items-center justify-between gap-4">
            Demand assumption
            <strong className="font-mono text-[#8aeaff]">{demandIndex}%</strong>
          </div>
          <div className="mt-4 grid grid-cols-4 gap-1.5" aria-label="Demand assumption">
            {[90, 100, 110, 120].map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={demandIndex === value}
                onClick={() => setDemandIndex(value)}
                className={`rounded-lg border px-2 py-2 text-[10px] font-semibold transition ${
                  demandIndex === value
                    ? "border-[#67e8f9]/45 bg-[#16c8ff]/12 text-white"
                    : "border-white/10 bg-white/[0.025] text-white/42 hover:text-white"
                }`}
              >
                {value}%
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-px bg-white/10 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Capacity coverage",
            value: formatPercent(model.coverage),
            note: model.coverage >= 1 ? "Demand covered" : "Below demand",
            icon: Gauge,
          },
          {
            label: "Weekly demand",
            value: formatNumber(model.demand),
            note: `${model.gap >= 0 ? "+" : ""}${formatNumber(model.gap)} capacity gap`,
            icon: UsersRound,
          },
          {
            label: "Overtime hours",
            value: formatNumber(model.overtime),
            note: "Modeled weekly load",
            icon: Clock3,
          },
          {
            label: "Service level",
            value: formatPercent(model.serviceLevel),
            note: `${formatCurrency(model.scenario.cost)} scenario cost`,
            icon: Activity,
          },
        ].map((metric) => {
          const Icon = metric.icon;
          return (
            <article key={metric.label} className="bg-[#08131f] p-5">
              <Icon aria-hidden className="size-4 text-[#67e8f9]" />
              <span className="mt-5 block text-[10px] font-semibold uppercase tracking-[0.12em] text-white/38">
                {metric.label}
              </span>
              <strong className="mt-2 block text-2xl font-semibold tracking-[-0.04em] text-white">
                {metric.value}
              </strong>
              <span className="mt-1 block text-xs text-white/42">{metric.note}</span>
            </article>
          );
        })}
      </div>

      <div className="grid gap-5 p-5 sm:p-6 xl:grid-cols-[1.35fr_0.65fr]">
        <div className="rounded-xl border border-white/10 bg-white/[0.025] p-4 sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8aeaff]">
                Six-week outlook
              </span>
              <h4 className="mt-1 text-sm font-semibold text-white">
                {metricId === "coverage"
                  ? "Capacity coverage"
                  : metricId === "demand"
                    ? "Demand volume"
                    : "Overtime exposure"}
              </h4>
            </div>
            <div className="flex flex-wrap gap-2" aria-label="Dashboard metric">
              {([
                ["coverage", "Coverage"],
                ["demand", "Demand"],
                ["overtime", "Overtime"],
              ] as const).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  aria-pressed={metricId === id}
                  onClick={() => setMetricId(id)}
                  className={`rounded-full border px-3 py-1.5 text-[10px] font-semibold transition ${
                    metricId === id
                      ? "border-[#67e8f9]/45 bg-[#16c8ff]/12 text-white"
                      : "border-white/10 text-white/42 hover:text-white"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-7 grid h-48 grid-cols-6 items-end gap-2 sm:gap-3" aria-label="Six-week modeled trend">
            {model.weeksData.map((row, index) => {
              const value = chartValues[index];
              const height = Math.max(12, (value / maxValue) * 100);
              const label =
                metricId === "coverage"
                  ? formatPercent(row.coverage)
                  : metricId === "demand"
                    ? formatNumber(row.demand)
                    : formatNumber(row.overtime);

              return (
                <div key={row.week} className="flex h-full min-w-0 flex-col justify-end text-center">
                  <span className="mb-2 truncate font-mono text-[8px] text-white/42 sm:text-[9px]">
                    {label}
                  </span>
                  <span
                    className="min-h-3 rounded-t-md bg-[linear-gradient(180deg,#67e8f9,#6d31ff)] shadow-[0_0_24px_rgba(103,232,249,0.12)]"
                    style={{ height: `${height}%` }}
                  />
                  <span className="mt-2 text-[9px] font-semibold text-white/38">{row.week}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col rounded-xl border border-[#b49cff]/18 bg-[linear-gradient(145deg,rgba(139,92,246,0.1),rgba(22,200,255,0.035))] p-5">
          <SlidersHorizontal aria-hidden className="size-5 text-[#b49cff]" />
          <span className="mt-5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#b49cff]">
            Decision brief
          </span>
          <p className="mt-3 text-sm font-semibold leading-6 text-white">
            {model.recommendation}
          </p>
          <div className="mt-auto pt-6">
            <div className="flex items-center justify-between gap-3 border-t border-white/10 pt-4 text-xs">
              <span className="text-white/42">Active scenario</span>
              <strong className="text-right text-white/72">{model.scenario.label}</strong>
            </div>
            <p className="mt-4 flex items-center gap-2 text-[10px] leading-4 text-white/34">
              Adjust any control to recalculate the KPIs, outlook, and recommendation.
              <ArrowRight aria-hidden className="size-3.5 shrink-0" />
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
