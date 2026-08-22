import Link from "next/link";
import { VerificationConsole } from "./verification-console";
import {
  getOutreachSafetySnapshot,
  type OutreachPerformance,
} from "@/lib/leads/outreach-safety";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function MetricCard({ metric }: { metric: OutreachPerformance }) {
  const tone =
    metric.health === "paused"
      ? "border-rose-400/30 bg-rose-400/10"
      : metric.health === "warning"
        ? "border-amber-300/30 bg-amber-300/10"
        : metric.health === "healthy"
          ? "border-emerald-300/30 bg-emerald-300/10"
          : "border-white/10 bg-white/[0.035]";

  return (
    <article className={`rounded-2xl border p-5 ${tone}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
            {metric.health}
          </p>
          <h3 className="mt-1 text-lg font-semibold text-white">
            {metric.label}
          </h3>
        </div>
        <span className="rounded-full border border-white/10 px-2.5 py-1 text-xs text-slate-300">
          {metric.sent} sent
        </span>
      </div>

      <dl className="mt-5 grid grid-cols-3 gap-3 text-sm">
        <div>
          <dt className="text-slate-500">Bounce</dt>
          <dd className="mt-1 text-xl font-semibold text-white">
            {metric.bounceRate}%
          </dd>
        </div>
        <div>
          <dt className="text-slate-500">Reply</dt>
          <dd className="mt-1 text-xl font-semibold text-white">
            {metric.replyRate}%
          </dd>
        </div>
        <div>
          <dt className="text-slate-500">Verified</dt>
          <dd className="mt-1 text-xl font-semibold text-white">
            {metric.verified}
          </dd>
        </div>
      </dl>

      <p className="mt-4 text-sm leading-6 text-slate-300">
        {metric.decision}
      </p>
    </article>
  );
}

export default async function OutreachSafetyPage() {
  const snapshot = await getOutreachSafetySnapshot();

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-300">
            Deliverability control
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-white sm:text-4xl">
            Outreach Safety
          </h1>
          <p className="mt-3 max-w-3xl text-slate-400">
            Exact-address verification, historical quarantine, source-level
            pause rules, and pitch-level decisions. Unverified or suppressed
            addresses cannot send.
          </p>
        </div>

        <div className="flex gap-3">
          <Link
            href="/leads/outreach"
            className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-200"
          >
            Campaign
          </Link>
          <Link
            href="/leads/outreach/safety"
            className="rounded-xl bg-white/10 px-4 py-2 text-sm text-white"
          >
            Refresh
          </Link>
        </div>
      </div>

      <section
        className={`mt-8 rounded-2xl border p-5 ${
          snapshot.sendingAllowed
            ? "border-emerald-300/25 bg-emerald-300/10"
            : "border-rose-400/30 bg-rose-400/10"
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">
              Controlled campaign
            </p>
            <h2 className="mt-1 text-xl font-semibold text-white">
              {snapshot.sendingAllowed
                ? "Global sending available"
                : "Global sending paused"}
            </h2>
          </div>
          <code className="rounded-lg bg-black/25 px-3 py-1.5 text-xs text-slate-300">
            {snapshot.campaignId}
          </code>
        </div>
        <p className="mt-3 text-sm text-slate-200">
          {snapshot.blockReason ||
            "Segment rules still apply. Every lead also needs an exact, current verification record."}
        </p>
      </section>

      {snapshot.historicalWarning ? (
        <section className="mt-5 rounded-2xl border border-amber-300/25 bg-amber-300/10 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-200">
            Historical campaign quarantined
          </p>
          <p className="mt-2 text-sm leading-6 text-amber-50">
            {snapshot.historicalWarning}
          </p>
        </section>
      ) : null}

      <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard metric={snapshot.global} />
        {Object.values(snapshot.segments).map((metric) => (
          <MetricCard key={metric.key} metric={metric} />
        ))}
      </section>

      <section className="mt-10">
        <h2 className="text-2xl font-semibold text-white">
          Pitch-level performance
        </h2>
        {snapshot.pitches.length ? (
          <div className="mt-4 grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
            {snapshot.pitches.map((metric) => (
              <MetricCard key={metric.key} metric={metric} />
            ))}
          </div>
        ) : (
          <div className="mt-4 rounded-2xl border border-dashed border-white/10 p-8 text-sm text-slate-400">
            No controlled-campaign sends yet. The failed campaign is not being
            disguised as a clean baseline.
          </div>
        )}
      </section>

      <section className="mt-10">
        <VerificationConsole />
      </section>

      <section className="mt-10 grid gap-4 lg:grid-cols-3">
        {[
          [
            "50 delivered, zero replies",
            "Rewrite only the subject and opening.",
          ],
          [
            "100 plus follow-up, zero replies",
            "Retire the pitch.",
          ],
          [
            "150–200, fewer than two replies",
            "Change the offer, targeting, or price.",
          ],
        ].map(([title, text]) => (
          <article
            key={title}
            className="rounded-2xl border border-white/10 bg-white/[0.035] p-5"
          >
            <h3 className="font-semibold text-white">{title}</h3>
            <p className="mt-2 text-sm text-slate-400">{text}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
