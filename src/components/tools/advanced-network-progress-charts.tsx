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
  return (
    <svg viewBox="0 0 120 46" className="h-10 w-28" aria-hidden>
      <line x1="8" y1="38" x2="112" y2="38" stroke="rgba(255,255,255,0.08)" />
      <path
        d={`M 12 ${Math.max(6, Math.min(39, yBefore / 4))} L 108 ${Math.max(6, Math.min(39, yNow / 4))}`}
        fill="none"
        stroke={now >= before ? "#7fe5ad" : "#ffb4b8"}
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <circle
        cx="12"
        cy={Math.max(6, Math.min(39, yBefore / 4))}
        r="3.5"
        fill="#101318"
        stroke="rgba(255,255,255,0.45)"
      />
      <circle
        cx="108"
        cy={Math.max(6, Math.min(39, yNow / 4))}
        r="4"
        fill={now >= before ? "#7fe5ad" : "#ffb4b8"}
      />
    </svg>
  );
}

export function BaselineChart({ metric }: { metric: ProgressMetric }) {
  const { yBefore, yNow } = chartGeometry(metric.before, metric.now);
  const positive = metric.delta >= 0;
  const line = positive ? "#7fe5ad" : "#ffb4b8";
  const gradientId = `iazma-progress-${metric.id}`;

  return (
    <div className="rounded-2xl border border-white/8 bg-black/20 p-3 sm:p-4">
      <svg
        viewBox="0 0 520 205"
        className="min-h-[190px] w-full"
        role="img"
        aria-label={`${metric.label} changed from ${exact(metric.before)} at the saved baseline to ${exact(metric.now)} now, a change of ${signed(metric.delta)}.`}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="rgba(140,232,255,0.35)" />
            <stop offset="100%" stopColor={positive ? "rgba(127,229,173,0.45)" : "rgba(255,180,184,0.45)"} />
          </linearGradient>
        </defs>
        {[45, 97, 150].map((y) => (
          <line
            key={y}
            x1="58"
            y1={y}
            x2="470"
            y2={y}
            stroke="rgba(255,255,255,0.07)"
            strokeDasharray="4 7"
          />
        ))}
        <path
          d={`M 92 ${yBefore} C 210 ${yBefore}, 330 ${yNow}, 438 ${yNow}`}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth="7"
          strokeLinecap="round"
        />
        <path
          d={`M 92 ${yBefore} C 210 ${yBefore}, 330 ${yNow}, 438 ${yNow}`}
          fill="none"
          stroke={line}
          strokeWidth="2.4"
          strokeLinecap="round"
        />
        <circle cx="92" cy={yBefore} r="9" fill="#090c11" stroke="#8ce8ff" strokeWidth="3" />
        <circle cx="438" cy={yNow} r="11" fill="#090c11" stroke={line} strokeWidth="4" />
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
  return (
    <div className="grid gap-2.5 rounded-2xl border border-white/8 bg-black/20 p-4">
      {rows.map(([label, value]) => (
        <div key={label} className="grid grid-cols-[110px_minmax(0,1fr)_58px] items-center gap-3">
          <span className="text-[10px] leading-4 text-white/42">{label}</span>
          <div className="h-3 overflow-hidden rounded-full bg-white/[0.055]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#16c8ff] via-[#aa63ff] to-[#e6bd73] transition-[width] duration-500"
              style={{ width: `${value === 0 ? 0 : Math.max(5, (value / max) * 100)}%` }}
            />
          </div>
          <span className="text-right text-[10px] font-semibold text-white/68">
            +{exact(value)} XP
          </span>
        </div>
      ))}
    </div>
  );
}
