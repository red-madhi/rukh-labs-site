"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Boxes,
  ChevronDown,
  ExternalLink,
  Megaphone,
  Radar,
  RefreshCw,
  Search,
  Sparkles,
  UserPlus,
  Waypoints,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type {
  AttributionMethod,
  FollowerSourceReport,
  FollowerSourceType,
} from "@/lib/bluesky-follower-attribution";

type RangeDays = 7 | 30 | 90;

type SyncResponse = {
  result?: {
    ok?: boolean;
    skipped?: boolean;
    processed?: number;
    notificationsScanned?: number;
    message?: string;
  };
  report?: FollowerSourceReport;
  error?: string;
};

function sourceMeta(sourceType: FollowerSourceType) {
  if (sourceType === "starter_pack") {
    return {
      label: "Starter Pack",
      Icon: Boxes,
      accent: "text-[#8ce8ff]",
      border: "border-[#16c8ff]/22",
      bg: "bg-[#16c8ff]/[0.055]",
      bar: "bg-[#16c8ff]/70",
    };
  }
  if (sourceType === "promotion") {
    return {
      label: "Account amplification",
      Icon: Megaphone,
      accent: "text-[#f1d49a]",
      border: "border-[#e6bd73]/22",
      bg: "bg-[#e6bd73]/[0.05]",
      bar: "bg-[#e6bd73]/70",
    };
  }
  if (sourceType === "post_amplification") {
    return {
      label: "Post activity",
      Icon: Sparkles,
      accent: "text-violet-200",
      border: "border-violet-300/18",
      bg: "bg-violet-300/[0.045]",
      bar: "bg-violet-300/65",
    };
  }
  if (sourceType === "conversation") {
    return {
      label: "Conversation",
      Icon: Waypoints,
      accent: "text-emerald-200",
      border: "border-emerald-300/18",
      bg: "bg-emerald-300/[0.045]",
      bar: "bg-emerald-300/65",
    };
  }
  return {
    label: "Unknown / organic",
    Icon: Radar,
    accent: "text-white/52",
    border: "border-white/10",
    bg: "bg-white/[0.025]",
    bar: "bg-white/25",
  };
}

function methodLabel(method: AttributionMethod) {
  if (method === "exact") return "Exact";
  if (method === "inferred") return "Inferred";
  return "Unknown";
}

function methodClasses(method: AttributionMethod) {
  if (method === "exact") {
    return "border-[#16c8ff]/25 bg-[#16c8ff]/[0.07] text-[#a9efff]";
  }
  if (method === "inferred") {
    return "border-[#e6bd73]/25 bg-[#e6bd73]/[0.06] text-[#f1d49a]";
  }
  return "border-white/10 bg-white/[0.025] text-white/42";
}

function formatDate(value: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function formatSync(value: string | null) {
  if (!value) return "Not synced yet";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "Last sync unavailable";
  return `Synced ${new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date)}`;
}

function StatCard({
  label,
  value,
  detail,
  tone = "neutral",
}: {
  label: string;
  value: number;
  detail: string;
  tone?: "cyan" | "gold" | "neutral";
}) {
  const valueClass =
    tone === "cyan" ? "text-[#a9efff]" : tone === "gold" ? "text-[#f1d49a]" : "text-white";
  return (
    <Card className="min-w-0 p-5 sm:p-6">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/35">{label}</p>
      <p className={`mt-3 text-3xl font-semibold tracking-[-0.04em] ${valueClass}`}>{value}</p>
      <p className="mt-2 text-xs leading-5 text-white/38">{detail}</p>
    </Card>
  );
}

export function AdvancedNetworkFollowerSources() {
  const [days, setDays] = useState<RangeDays>(30);
  const [report, setReport] = useState<FollowerSourceReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async (range: RangeDays) => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/advanced-network/follower-sources?days=${range}`, {
        cache: "no-store",
      });
      const result = (await response.json()) as FollowerSourceReport & { error?: string };
      if (!response.ok) throw new Error(result.error || "Could not load follower sources.");
      setReport(result);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load follower sources.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(days);
  }, [days, load]);

  const maxSourceCount = useMemo(
    () => Math.max(1, ...(report?.sources.map((source) => source.count) ?? [1])),
    [report],
  );

  async function syncNow() {
    setSyncing(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/advanced-network/follower-sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "sync", days }),
      });
      const result = (await response.json()) as SyncResponse;
      if (!response.ok) throw new Error(result.error || "Could not refresh follower attribution.");
      if (result.report) setReport(result.report);
      if (result.result?.skipped) {
        setNotice(result.result.message || "Attribution sync was skipped.");
      } else {
        const processed = result.result?.processed ?? 0;
        const scanned = result.result?.notificationsScanned ?? 0;
        setNotice(
          `Refreshed ${processed} follow${processed === 1 ? "" : "s"} from ${scanned} recent notification${scanned === 1 ? "" : "s"}.`,
        );
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not refresh follower attribution.");
    } finally {
      setSyncing(false);
    }
  }

  if (loading && !report) {
    return (
      <Card className="p-6 sm:p-8">
        <div className="flex items-center gap-3 text-sm text-white/55">
          <RefreshCw className="size-4 animate-spin text-[#8ce8ff]" aria-hidden />
          Loading follower-source history…
        </div>
      </Card>
    );
  }

  return (
    <div className="grid gap-6">
      <Card className="overflow-hidden p-0">
        <div className="border-b border-white/10 bg-[radial-gradient(circle_at_0%_0%,rgba(22,200,255,0.09),transparent_34%),radial-gradient(circle_at_100%_100%,rgba(230,189,115,0.07),transparent_36%)] p-5 sm:p-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8ce8ff]">
                Acquisition intelligence
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-white sm:text-3xl">
                Where your followers are actually coming from.
              </h2>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-white/50">
                Starter Pack attribution is treated as exact only when Bluesky attaches the pack to the follow. Other sources are inferred from public timing and network evidence, never presented as certainty.
              </p>
            </div>
            <div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-center">
              <div className="flex rounded-xl border border-white/10 bg-black/20 p-1">
                {([7, 30, 90] as RangeDays[]).map((range) => (
                  <button
                    key={range}
                    type="button"
                    onClick={() => setDays(range)}
                    className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
                      days === range
                        ? "bg-white/10 text-white"
                        : "text-white/38 hover:bg-white/[0.04] hover:text-white/65"
                    }`}
                  >
                    {range}d
                  </button>
                ))}
              </div>
              <Button type="button" variant="glass" size="sm" onClick={syncNow} disabled={syncing}>
                <RefreshCw className={`size-4 ${syncing ? "animate-spin" : ""}`} aria-hidden />
                {syncing ? "Refreshing…" : "Refresh attribution"}
              </Button>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-white/35">
            <span>{report?.actorHandle ? `@${report.actorHandle}` : "Bluesky account not configured"}</span>
            <span className="hidden size-1 rounded-full bg-white/20 sm:block" />
            <span>{formatSync(report?.lastSyncAt ?? null)}</span>
          </div>
        </div>

        {!report?.configured ? (
          <div className="border-b border-amber-300/15 bg-amber-300/[0.035] px-5 py-4 text-sm leading-6 text-amber-100/75 sm:px-7">
            Exact Starter Pack attribution needs the saved Bluesky app password already used by IAZMA&apos;s follower automation. Configure that account in Auto DM, then refresh this page.
          </div>
        ) : null}

        {report?.lastSyncError ? (
          <div className="border-b border-red-300/15 bg-red-300/[0.035] px-5 py-4 text-sm text-red-100/75 sm:px-7">
            Last attribution sync: {report.lastSyncError}
          </div>
        ) : null}

        {error ? (
          <div className="border-b border-red-300/15 bg-red-300/[0.035] px-5 py-4 text-sm text-red-100/80 sm:px-7">
            {error}
          </div>
        ) : null}
        {notice ? (
          <div className="border-b border-emerald-300/15 bg-emerald-300/[0.035] px-5 py-4 text-sm text-emerald-100/75 sm:px-7">
            {notice}
          </div>
        ) : null}

        <div className="p-5 sm:p-7">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label={`Followers · ${days} days`}
              value={report?.totals.followers ?? 0}
              detail="Follow notifications captured by IAZMA."
            />
            <StatCard
              label="Starter Pack"
              value={report?.totals.starterPack ?? 0}
              detail="Bluesky supplied the exact pack."
              tone="cyan"
            />
            <StatCard
              label="Evidence-based"
              value={report?.totals.inferred ?? 0}
              detail="Strong timing + network evidence."
              tone="gold"
            />
            <StatCard
              label="Unknown"
              value={report?.totals.unknown ?? 0}
              detail="Could be Discover, search, direct, or external."
            />
          </div>
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <Card className="min-w-0 p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/36">
                Source mix
              </p>
              <h3 className="mt-2 text-xl font-semibold text-white">What is driving growth</h3>
            </div>
            <Radar className="size-5 text-[#8ce8ff]" aria-hidden />
          </div>

          {!report?.sources.length ? (
            <div className="mt-6 rounded-xl border border-dashed border-white/10 p-5 text-sm leading-6 text-white/42">
              No attributed follows in this range yet. Refresh attribution to pull the latest Bluesky notifications.
            </div>
          ) : (
            <div className="mt-6 grid gap-3">
              {report.sources.map((source) => {
                const meta = sourceMeta(source.sourceType);
                const width = Math.max(5, Math.round((source.count / maxSourceCount) * 100));
                return (
                  <div
                    key={`${source.sourceType}:${source.sourceLabel}:${source.method}`}
                    className={`rounded-xl border p-4 ${meta.border} ${meta.bg}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-lg border border-white/8 bg-black/20">
                        <meta.Icon className={`size-4 ${meta.accent}`} aria-hidden />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex min-w-0 items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-white">{source.sourceLabel}</p>
                            <p className="mt-1 text-[11px] text-white/35">{meta.label}</p>
                          </div>
                          <div className="shrink-0 text-right">
                            <p className="text-lg font-semibold text-white">{source.count}</p>
                            <p className="text-[10px] text-white/30">
                              {source.method === "unattributed"
                                ? "no score"
                                : `${source.averageConfidence}% avg`}
                            </p>
                          </div>
                        </div>
                        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/[0.055]">
                          <div className={`h-full rounded-full ${meta.bar}`} style={{ width: `${width}%` }} />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card className="min-w-0 p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/36">
                Attribution rules
              </p>
              <h3 className="mt-2 text-xl font-semibold text-white">What IAZMA will and won&apos;t claim</h3>
            </div>
            <Search className="size-5 text-[#f1d49a]" aria-hidden />
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-[#16c8ff]/18 bg-[#16c8ff]/[0.04] p-4">
              <p className="text-xs font-semibold text-[#a9efff]">EXACT</p>
              <p className="mt-2 text-sm font-medium text-white">Starter Pack attached by Bluesky</p>
              <p className="mt-2 text-xs leading-5 text-white/40">100% attribution confidence.</p>
            </div>
            <div className="rounded-xl border border-[#e6bd73]/18 bg-[#e6bd73]/[0.04] p-4">
              <p className="text-xs font-semibold text-[#f1d49a]">INFERRED</p>
              <p className="mt-2 text-sm font-medium text-white">Interaction or promoter evidence</p>
              <p className="mt-2 text-xs leading-5 text-white/40">Timing and public graph signals are shown with a score.</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
              <p className="text-xs font-semibold text-white/45">UNKNOWN</p>
              <p className="mt-2 text-sm font-medium text-white">No defensible attribution</p>
              <p className="mt-2 text-xs leading-5 text-white/40">Discover is never guessed just to fill a chart.</p>
            </div>
          </div>
        </Card>
      </div>

      <Card className="min-w-0 overflow-hidden p-0">
        <div className="border-b border-white/10 px-5 py-5 sm:px-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/36">
                Follower history
              </p>
              <h3 className="mt-2 text-xl font-semibold text-white">Latest acquisitions</h3>
              <p className="mt-2 text-xs leading-5 text-white/38">
                Open any row to see the evidence behind IAZMA&apos;s attribution.
              </p>
            </div>
            <UserPlus className="size-5 text-[#8ce8ff]" aria-hidden />
          </div>
        </div>

        {!report?.followers.length ? (
          <div className="p-6 text-sm leading-6 text-white/42">
            No captured follower events in the selected range yet.
          </div>
        ) : (
          <div className="divide-y divide-white/[0.065]">
            {report.followers.map((follower) => {
              const meta = sourceMeta(follower.sourceType);
              return (
                <details key={`${follower.did}:${follower.followedAt}`} className="group px-5 py-4 sm:px-6">
                  <summary className="flex cursor-pointer list-none items-center gap-4">
                    <div className={`grid size-10 shrink-0 place-items-center rounded-xl border ${meta.border} ${meta.bg}`}>
                      <meta.Icon className={`size-4 ${meta.accent}`} aria-hidden />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <a
                          href={`https://bsky.app/profile/${encodeURIComponent(follower.handle)}`}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(event) => event.stopPropagation()}
                          className="truncate text-sm font-semibold text-white hover:text-[#8ce8ff]"
                        >
                          {follower.displayName || `@${follower.handle}`}
                        </a>
                        {follower.displayName ? (
                          <span className="truncate text-xs text-white/32">@{follower.handle}</span>
                        ) : null}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-white/35">
                        <span>{formatDate(follower.followedAt)}</span>
                        <span>·</span>
                        <span className={meta.accent}>{follower.sourceLabel}</span>
                      </div>
                    </div>
                    <div className="hidden shrink-0 items-center gap-2 sm:flex">
                      <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold ${methodClasses(follower.method)}`}>
                        {methodLabel(follower.method)}
                      </span>
                      {follower.method !== "unattributed" ? (
                        <span className="w-10 text-right text-xs font-semibold text-white/60">{follower.confidence}%</span>
                      ) : null}
                    </div>
                    <ChevronDown className="size-4 shrink-0 text-white/28 transition group-open:rotate-180" aria-hidden />
                  </summary>

                  <div className="ml-0 mt-4 rounded-xl border border-white/8 bg-black/20 p-4 sm:ml-14">
                    <div className="flex flex-wrap items-center gap-2 sm:hidden">
                      <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold ${methodClasses(follower.method)}`}>
                        {methodLabel(follower.method)}
                      </span>
                      {follower.method !== "unattributed" ? (
                        <span className="text-xs font-semibold text-white/60">{follower.confidence}% confidence</span>
                      ) : null}
                    </div>
                    <div className="mt-1 grid gap-2 sm:mt-0">
                      {follower.evidence.map((item, index) => (
                        <p key={`${item.kind}:${index}`} className="text-xs leading-5 text-white/52">
                          {item.text}
                        </p>
                      ))}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-4">
                      <a
                        href={`https://bsky.app/profile/${encodeURIComponent(follower.handle)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#8ce8ff] hover:text-white"
                      >
                        Open follower <ExternalLink className="size-3" aria-hidden />
                      </a>
                      {follower.sourceActorHandle && follower.sourceActorHandle !== follower.handle ? (
                        <a
                          href={`https://bsky.app/profile/${encodeURIComponent(follower.sourceActorHandle)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#f1d49a] hover:text-white"
                        >
                          Open source account <ExternalLink className="size-3" aria-hidden />
                        </a>
                      ) : null}
                    </div>
                  </div>
                </details>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
