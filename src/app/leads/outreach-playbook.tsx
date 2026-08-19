"use client";

import { useMemo, useState } from "react";
import { Check, Clipboard, ExternalLink, Mail, ShieldCheck } from "lucide-react";
import type { LeadOpportunity } from "@/lib/leads/types";
import { buildOutreachPlan, OUTREACH_RESEARCH } from "@/lib/leads/outreach";

function CopyButton({ value, label, blue = false }: { value: string; label: string; blue?: boolean }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  return (
    <button
      type="button"
      onClick={() => void copy()}
      className={`inline-flex min-h-8 items-center gap-1.5 border px-2.5 py-1.5 text-[10px] font-semibold transition ${
        blue
          ? "border-sky-300/20 bg-sky-300/[.05] text-sky-200 hover:bg-sky-300/[.1]"
          : "border-[#d7a45f]/20 bg-[#d7a45f]/[.05] text-[#e7b66f] hover:bg-[#d7a45f]/[.1]"
      }`}
    >
      {copied ? <Check className="size-3" aria-hidden /> : <Clipboard className="size-3" aria-hidden />}
      {copied ? "Copied" : label}
    </button>
  );
}

export function OutreachPlaybook({ lead }: { lead: LeadOpportunity }) {
  const plan = useMemo(() => buildOutreachPlan(lead), [lead]);
  const blue = lead.source === "power-bi";
  const accent = blue ? "text-sky-200" : "text-[#e7b66f]";
  const accentBorder = blue ? "border-sky-300/20" : "border-[#d7a45f]/20";
  const accentBg = blue ? "bg-sky-300/[.035]" : "bg-[#d7a45f]/[.035]";
  const fullSequence = [
    `SUBJECT: ${plan.subject}`,
    `FIRST EMAIL\n${plan.firstEmail}`,
    ...plan.touches.map((touch) => `${touch.label.toUpperCase()} — ${touch.timing}\n${touch.text}`),
  ].join("\n\n---\n\n");

  return (
    <div className={`mt-5 border-t border-white/8 pt-4`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className={`flex items-center gap-2 text-[9px] font-bold uppercase tracking-[.18em] ${accent}`}>
            <Mail className="size-3.5" aria-hidden /> Research-backed email playbook
          </div>
          <p className="mt-1 text-[11px] leading-5 text-white/35">
            Built for one problem, one CTA, mobile scanning, and a 4-touch minimum sequence.
          </p>
        </div>
        <CopyButton value={fullSequence} label="Copy sequence" blue={blue} />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="border border-white/8 bg-black/20 p-2.5">
          <span className="block text-[8px] font-bold uppercase tracking-[.13em] text-white/25">Avg reply</span>
          <strong className="mt-1 block text-sm text-white/70">{OUTREACH_RESEARCH.averageReply}</strong>
        </div>
        <div className="border border-white/8 bg-black/20 p-2.5">
          <span className="block text-[8px] font-bold uppercase tracking-[.13em] text-white/25">Top 25%</span>
          <strong className="mt-1 block text-sm text-white/70">{OUTREACH_RESEARCH.topQuartileReply}</strong>
        </div>
        <div className="border border-white/8 bg-black/20 p-2.5">
          <span className="block text-[8px] font-bold uppercase tracking-[.13em] text-white/25">Top 10%</span>
          <strong className="mt-1 block text-sm text-white/70">{OUTREACH_RESEARCH.topDecileReply}</strong>
        </div>
        <div className="border border-white/8 bg-black/20 p-2.5">
          <span className="block text-[8px] font-bold uppercase tracking-[.13em] text-white/25">Replies from follow-ups</span>
          <strong className="mt-1 block text-sm text-white/70">{OUTREACH_RESEARCH.followUpReplyShare}</strong>
        </div>
      </div>
      <p className="mt-2 text-[9px] leading-4 text-white/24">Benchmarks are dataset-wide reference points, not a promised result for any individual lead.</p>

      <div className={`mt-4 border ${accentBorder} ${accentBg} p-3`}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[8px] font-bold uppercase tracking-[.15em] text-white/28">Subject · 2–4 words when practical</p>
            <p className={`mt-1 break-words text-sm font-bold ${accent}`}>{plan.subject}</p>
          </div>
          <CopyButton value={plan.subject} label="Copy" blue={blue} />
        </div>
      </div>

      <div className="mt-2 border border-white/9 bg-black/25 p-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[8px] font-bold uppercase tracking-[.15em] text-white/28">First email</p>
            <p className={`mt-1 text-[10px] font-semibold ${plan.wordCount <= OUTREACH_RESEARCH.hardCeilingWords ? "text-emerald-200/70" : "text-[#ff8f84]"}`}>
              {plan.wordCount} words · target {OUTREACH_RESEARCH.targetFirstEmailWords} · hard ceiling {OUTREACH_RESEARCH.hardCeilingWords}
            </p>
          </div>
          <CopyButton value={plan.firstEmail} label="Copy" blue={blue} />
        </div>
        <p className="mt-3 whitespace-pre-wrap break-words text-xs leading-6 text-white/58">{plan.firstEmail}</p>
      </div>

      <div className="mt-3 space-y-2">
        {plan.touches.map((touch) => (
          <details key={touch.label} className="border border-white/8 bg-black/20 open:bg-black/30">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2.5 text-xs text-white/55">
              <span><strong className="font-semibold text-white/70">{touch.label}</strong> · {touch.timing} · {touch.wordCount} words</span>
              <span className={accent}>Open</span>
            </summary>
            <div className="border-t border-white/7 p-3">
              <div className="flex justify-end"><CopyButton value={touch.text} label="Copy" blue={blue} /></div>
              <p className="mt-2 whitespace-pre-wrap break-words text-xs leading-6 text-white/55">{touch.text}</p>
            </div>
          </details>
        ))}
      </div>

      <div className="mt-4 grid gap-3 xl:grid-cols-2">
        <div className="border border-white/8 bg-black/20 p-3">
          <div className="flex items-center gap-2"><ShieldCheck className="size-3.5 text-emerald-200/70" aria-hidden /><p className="text-[8px] font-bold uppercase tracking-[.15em] text-white/28">Why this wording</p></div>
          <ul className="mt-2 space-y-1.5">
            {plan.approach.map((item) => <li key={item} className="text-[11px] leading-5 text-white/45">• {item}</li>)}
          </ul>
          <p className="mt-2 text-[10px] text-white/28">Tone: {plan.tone}</p>
        </div>
        <div className="border border-white/8 bg-black/20 p-3">
          <p className="text-[8px] font-bold uppercase tracking-[.15em] text-white/28">Research basis</p>
          <div className="mt-2 space-y-2 text-[10px] leading-4 text-white/40">
            <p>Gong: 28M+ cold emails; pitching cut replies by up to 57%; highest replies at ≤100 words / 3–4 sentences.</p>
            <p>Instantly: billions of interactions; elite campaigns average &lt;80 words, one CTA; 42% of replies come after touch one.</p>
            <p>Lavender: 231,818 recent emails; mobile-friendly formatting correlated with 83% more replies overall.</p>
            <p>Belkins/Reply.io: 5.5M emails; personalized subjects moved replies from 3% to 7% in their dataset.</p>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {OUTREACH_RESEARCH.sources.map((source) => (
              <a key={source.href} href={source.href} target="_blank" rel="noreferrer" className={`inline-flex items-center gap-1 text-[9px] font-semibold ${accent}`}>
                {source.name}<ExternalLink className="size-2.5" aria-hidden />
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
