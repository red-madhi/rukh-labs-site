import {
  exact,
  signed,
  type ProgressMetric,
} from "@/components/tools/advanced-network-progress-model";

function chartGeometry(before: number, now: number) {
  const low = Math.min(before, now);
  const high = Math.max(before, now);
  const rawRange = high - low;
  const padding = Math.max(1, rawRange * 0.35, high * 0.04);
  const min = Math.max(0, low - padding);
  const max = high + padding;
  const range = Math.max(1, max - min);
  const y = (value: number) => 150 - ((value - min) / range) * 105;
  return { yBefore: y(before), yNow: y(now), min, max };
}

export function MiniProgressLine({ before, now }: { before: number; now: number }) {
  const { yBefore, yNow } = chartGeometry(before, now);
  const positive = now >= before;
  const line = positive ? "#7fe5ad" : "#ffb4b8";
  const startY = Math.max(6, Math.min(39, yBefore / 4));
  const endY = Math.max(6, Math.min(39, yNow / 4));

  return (
    <svg viewBox="0 0 120 46" className="h-10 w-28" aria-hidden>
      <defs>
        <linearGradient id="iazma-mini-line" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#8ce8ff" stopOpacity="0.7" />
          <stop offset="100%" stopColor={line} stopOpacity="1" />
        </linearGradient>
        <filter id="iazma-mini-glow" x="-50%" y="-80%" width="200%" height="260%">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <line x1="8" y1="38" x2="112" y2="38" stroke="rgba(255,255,255,0.07)" />
      <path
        d={`M 12 ${startY} C 42 ${startY}, 72 ${endY}, 108 ${endY}`}
        fill="none"
        stroke="url(#iazma-mini-line)"
        strokeWidth="3"
        strokeLinecap="round"
        filter="url(#iazma-mini-glow)"
      />
      <circle cx="12" cy={startY} r="3.5" fill="#0a0d11" stroke="#8ce8ff" strokeOpacity="0.62" />
      <circle cx="108" cy={endY} r="4.5" fill="#0a0d11" stroke={line} strokeWidth="2.5" />
    </svg>
  );
}

export function BaselineChart({ metric }: { metric: ProgressMetric }) {
  const { yBefore, yNow } = chartGeometry(metric.before, metric.now);
  const positive = metric.delta >= 0;
  const line = positive ? "#7fe5ad" : "#ffb4b8";
  const gradientId = `iazma-progress-${metric.id}`;
  const glowId = `${gradientId}-glow`;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/9 bg-[radial-gradient(circle_at_80%_0%,rgba(22,200,255,0.08),transparent_35%),rgba(0,0,0,0.24)] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.025)] sm:p-4">
      <div className="pointer-events-none absolute inset-x-[20%] top-0 h-20 bg-[#16c8ff]/[0.04] blur-2xl" aria-hidden />
      <svg
        viewBox="0 0 520 205"
        className="relative min-h-[190px] w-full"
        role="img"
        aria-label={`${metric.label} changed from ${exact(metric.before)} at the saved baseline to ${exact(metric.now)} now, a change of ${signed(metric.delta)}.`}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#8ce8ff" stopOpacity="0.78" />
            <stop offset="55%" stopColor="#aa63ff" stopOpacity="0.78" />
            <stop offset="100%" stopColor={line} stopOpacity="0.96" />
          </linearGradient>
          <filter id={glowId} x="-30%" y="-80%" width="160%" height="260%">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {[45, 97, 150].map((y) => (
          <line
            key={y}
            x1="58"
            y1={y}
            x2="470"
            y2={y}
            stroke="rgba(255,255,255,0.065)"
            strokeDasharray="3 8"
          />
        ))}
        <path
          d={`M 92 ${yBefore} C 210 ${yBefore}, 330 ${yNow}, 438 ${yNow}`}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth="9"
          strokeLinecap="round"
          strokeOpacity="0.22"
          filter={`url(#${glowId})`}
        />
        <path
          d={`M 92 ${yBefore} C 210 ${yBefore}, 330 ${yNow}, 438 ${yNow}`}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth="2.8"
          strokeLinecap="round"
        />
        <circle cx="92" cy={yBefore} r="10" fill="#080c11" stroke="#8ce8ff" strokeWidth="3" />
        <circle cx="92" cy={yBefore} r="4" fill="#8ce8ff" fillOpacity="0.82" />
        <circle cx="438" cy={yNow} r="12" fill="#080c11" stroke={line} strokeWidth="4" />
        <circle cx="438" cy={yNow} r="4.5" fill={line} />
        <text x="92" y={Math.max(18, yBefore - 18)} textAnchor="middle" fill="#d9f8ff" fontSize="15" fontWeight="700">
          {exact(metric.before)}
        </text>
        <text x="438" y={Math.max(18, yNow - 20)} textAnchor="middle" fill={positive ? "#c9ffe0" : "#ffd8da"} fontSize="17" fontWeight="700">
          {exact(metric.now)}
        </text>
        <text x="92" y="182" textAnchor="middle" fill="rgba(255,255,255,0.42)" fontSize="11" fontWeight="600">
          SAVED BASELINE
        </text>
        <text x="438" y="182" textAnchor="middle" fill="rgba(255,255,255,0.62)" fontSize="11" fontWeight="600">
          LATEST SNAPSHOT
        </text>
        <text x="265" y="198" textAnchor="middle" fill={line} fontSize="12" fontWeight="700">
          {signed(metric.delta)} CHANGE
        </text>
      </svg>
    </div>
  );
}

export function XpBreakdownChart({
  rows,
}: {
  rows: ReadonlyArray<readonly [string, number]>;
}) {
  const max = Math.max(1, ...rows.map(([, value]) => value));
  const total = rows.reduce((sum, [, value]) => sum + Math.max(0, value), 0);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-[#aa63ff]/20 bg-[radial-gradient(circle_at_14%_0%,rgba(22,200,255,0.10),transparent_30%),radial-gradient(circle_at_88%_8%,rgba(170,99,255,0.13),transparent_34%),rgba(0,0,0,0.24)] p-4 shadow-[0_18px_55px_rgba(0,0,0,0.24),inset_0_1px_0_rgba(255,255,255,0.03)] sm:p-5">
      <div className="pointer-events-none absolute inset-x-[15%] top-0 h-24 bg-[#aa63ff]/[0.05] blur-3xl" aria-hidden />
      <div className="relative mb-5 flex items-end justify-between gap-4 border-b border-white/7 pb-4">
        <div>
          <p className="text-[9px] font-semibold uppercase tracking-[0.15em] text-[#d8b5ff]">XP composition</p>
          <p className="mt-1 text-sm font-semibold text-white">What is actually powering your level</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-2xl font-semibold tracking-[-0.03em] text-[#f1d49a]">{exact(total)}</p>
          <p className="text-[8px] font-semibold uppercase tracking-[0.14em] text-white/28">earned XP</p>
        </div>
      </div>

      <div className="relative grid gap-3">
        {rows.map(([label, value], index) => {
          const width = value === 0 ? 0 : Math.max(6, (value / max) * 100);
          const share = total > 0 ? Math.round((Math.max(0, value) / total) * 100) : 0;
          return (
            <div
              key={label}
              className="rounded-xl border border-white/[0.065] bg-white/[0.018] p-3 transition hover:border-[#aa63ff]/18 hover:bg-white/[0.026]"
            >
              <div className="mb-2 flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className="grid size-6 shrink-0 place-items-center rounded-lg border border-white/8 bg-black/25 text-[9px] font-semibold text-white/42">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="min-w-0 truncate text-[11px] font-medium text-white/58">{label}</span>
                </div>
                <div className="flex shrink-0 items-baseline gap-2">
                  <span className="text-[9px] text-white/24">{share}%</span>
                  <span className="text-[11px] font-semibold text-[#f1d49a]">+{exact(value)} XP</span>
                </div>
              </div>
              <div className="relative h-3 overflow-hidden rounded-full border border-white/[0.035] bg-black/30">
                <div
                  className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-[#16c8ff] via-[#aa63ff] to-[#e6bd73] shadow-[0_0_18px_rgba(170,99,255,0.22)] transition-[width] duration-500"
                  style={{ width: `${width}%` }}
                />
                <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/10" aria-hidden />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}