"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Clipboard, Clock3, ExternalLink, Mail, Save, ShieldCheck } from "lucide-react";
import type { LeadOpportunity, LeadStatus } from "@/lib/leads/types";
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

function SignalProfile({ lead }: { lead: LeadOpportunity }) {
  const dimensions = lead.audit?.dimensions;
  if (!dimensions) return null;
  const metrics = [
    ["Pain", dimensions.pain],
    ["Fit", dimensions.fit],
    ["Timing", dimensions.timing],
    ["Reachability", dimensions.reachability],
    ["Convergence", dimensions.convergence],
  ] as const;
  const responseMs = lead.audit?.serverResponseMs ?? lead.audit?.responseMs;
  const form = lead.audit?.contactForm === "working" ? "detected" : lead.audit?.contactForm;
  const stack = lead.audit?.commercialStack ?? [];

  return (
    <div className="mt-5 border-t border-white/8 pt-4">
      <div className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-[.18em] text-[#e7b66f]">
        <ShieldCheck className="size-3.5" aria-hidden /> Signal profile
      </div>
      <p className="mt-1 text-[10px] leading-5 text-white/34">
        The rank can stay simple; these dimensions preserve what the evidence actually means instead of treating every point as the same kind of signal.
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
        {metrics.map(([label, value]) => (
          <div key={label} className="border border-white/8 bg-black/20 p-2.5">
            <span className="block text-[8px] font-bold uppercase tracking-[.13em] text-white/25">{label}</span>
            <strong className="mt-1 block text-lg text-white/75">{typeof value === "number" ? value : "—"}</strong>
          </div>
        ))}
      </div>
      <div className="mt-2 space-y-1.5 text-[10px] leading-5 text-white/38">
        {typeof responseMs === "number" ? (
          <p><strong className="text-white/55">Server response:</strong> {responseMs} ms. This is crawl/server response time, not Lighthouse or Core Web Vitals.</p>
        ) : null}
        {form ? (
          <p><strong className="text-white/55">Form:</strong> {form}. “Detected” means HTML evidence of a form; the crawler does not submit it.</p>
        ) : null}
        {stack.length ? (
          <p><strong className="text-white/55">Commercial web stack:</strong> {stack.join(", ")}. This suggests booking/payment/marketing infrastructure, not proof of active ad spend.</p>
        ) : null}
      </div>
    </div>
  );
}

function OutcomeCapture({ lead, suggestedMessage, blue }: { lead: LeadOpportunity; suggestedMessage: string; blue: boolean }) {
  const [status, setStatus] = useState<LeadStatus>(lead.status);
  const [channel, setChannel] = useState(lead.contactEmail ? "email" : lead.contactPhone ? "phone" : "contact-form");
  const [message, setMessage] = useState(suggestedMessage);
  const [estimatedValue, setEstimatedValue] = useState("");
  const [lossReason, setLossReason] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState("");

  useEffect(() => {
    setStatus(lead.status);
    setChannel(lead.contactEmail ? "email" : lead.contactPhone ? "phone" : "contact-form");
    setMessage(suggestedMessage);
    setEstimatedValue("");
    setLossReason("");
    setNote("");
    setResult("");
  }, [lead.id, lead.status, lead.contactEmail, lead.contactPhone, suggestedMessage]);

  async function save() {
    setSaving(true);
    setResult("");
    try {
      const response = await fetch("/api/leads", {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: lead.id,
          status,
          channel,
          message,
          estimatedValue: estimatedValue || undefined,
          lossReason: lossReason || undefined,
          note: note || undefined,
        }),
      });
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(body.error || "Could not save outcome.");
      setResult("Saved. The score, active signals, actual message, channel and outcome context were snapshotted.");
      window.setTimeout(() => window.location.reload(), 650);
    } catch (error) {
      setResult(error instanceof Error ? error.message : "Could not save outcome.");
    } finally {
      setSaving(false);
    }
  }

  const accent = blue ? "text-sky-200" : "text-[#e7b66f]";
  const border = blue ? "border-sky-300/20" : "border-[#d7a45f]/20";
  const field = "w-full border border-white/10 bg-black/30 px-2.5 py-2 text-xs text-white/70 outline-none focus:border-white/20";

  return (
    <div className={`mt-5 border ${border} bg-black/20 p-3`}>
      <div className="flex items-center gap-2">
        <Save className={`size-3.5 ${accent}`} aria-hidden />
        <p className={`text-[9px] font-bold uppercase tracking-[.16em] ${accent}`}>Record actual outreach / outcome</p>
      </div>
      <p className="mt-1 text-[10px] leading-5 text-white/35">
        This is the training data that matters later: what you actually sent, where you sent it, what happened, and which signals were active at the time.
      </p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <label><span className="mb-1 block text-[8px] uppercase tracking-[.12em] text-white/25">Status</span><select className={field} value={status} onChange={(event) => setStatus(event.target.value as LeadStatus)}>{["new","contacted","replied","meeting","proposal","won","lost","ignored"].map((item) => <option key={item} value={item} className="bg-[#090807]">{item}</option>)}</select></label>
        <label><span className="mb-1 block text-[8px] uppercase tracking-[.12em] text-white/25">Channel</span><select className={field} value={channel} onChange={(event) => setChannel(event.target.value)}>{["email","phone","contact-form","linkedin","bluesky","x","other"].map((item) => <option key={item} value={item} className="bg-[#090807]">{item}</option>)}</select></label>
        <label><span className="mb-1 block text-[8px] uppercase tracking-[.12em] text-white/25">Estimated value</span><input className={field} inputMode="decimal" value={estimatedValue} onChange={(event) => setEstimatedValue(event.target.value)} placeholder="$995" /></label>
        <label><span className="mb-1 block text-[8px] uppercase tracking-[.12em] text-white/25">Loss / ignore reason</span><input className={field} value={lossReason} onChange={(event) => setLossReason(event.target.value)} placeholder="Only if relevant" /></label>
      </div>
      <label className="mt-2 block"><span className="mb-1 block text-[8px] uppercase tracking-[.12em] text-white/25">Actual message used</span><textarea className={`${field} min-h-28 resize-y`} value={message} onChange={(event) => setMessage(event.target.value)} /></label>
      <label className="mt-2 block"><span className="mb-1 block text-[8px] uppercase tracking-[.12em] text-white/25">Notes</span><textarea className={`${field} min-h-16 resize-y`} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Reply quality, objection, next step, anything useful" /></label>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button type="button" disabled={saving} onClick={() => void save()} className={`inline-flex min-h-9 items-center gap-2 border px-3 py-2 text-[10px] font-bold ${border} ${accent} disabled:opacity-50`}><Save className="size-3.5" />{saving ? "Saving…" : "Save outcome"}</button>
        {result ? <span className="text-[10px] leading-5 text-white/45">{result}</span> : null}
      </div>
    </div>
  );
}

export function OutreachPlaybook({ lead }: { lead: LeadOpportunity }) {
  const plan = useMemo(() => buildOutreachPlan(lead), [lead]);
  const blue = lead.source === "power-bi";
  const urgent =
    lead.source === "intent" ||
    lead.tags.some((tag) => /extreme fresh|fresh <12h|job-board|job board/i.test(tag));
  const accent = blue ? "text-sky-200" : "text-[#e7b66f]";
  const accentBorder = blue ? "border-sky-300/20" : "border-[#d7a45f]/20";
  const accentBg = blue ? "bg-sky-300/[.035]" : "bg-[#d7a45f]/[.035]";
  const fullSequence = [
    `SUBJECT: ${plan.subject}`,
    `FIRST EMAIL\n${plan.firstEmail}`,
    ...plan.touches.map((touch) => `${touch.label.toUpperCase()} — ${touch.timing}\n${touch.text}`),
  ].join("\n\n---\n\n");

  return (
    <>
      <SignalProfile lead={lead} />
      <div className="mt-5 border-t border-white/8 pt-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className={`flex items-center gap-2 text-[9px] font-bold uppercase tracking-[.18em] ${accent}`}>
              <Mail className="size-3.5" aria-hidden /> Research-backed email playbook
            </div>
            <p className="mt-1 text-[11px] leading-5 text-white/35">
              One verified signal, one useful offer, one low-friction CTA, then follow-ups that add something new.
            </p>
          </div>
          <CopyButton value={fullSequence} label="Copy sequence" blue={blue} />
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div className="border border-white/8 bg-black/20 p-2.5"><span className="block text-[8px] font-bold uppercase tracking-[.13em] text-white/25">Instantly avg</span><strong className="mt-1 block text-sm text-white/70">{OUTREACH_RESEARCH.averageReply}</strong></div>
          <div className="border border-white/8 bg-black/20 p-2.5"><span className="block text-[8px] font-bold uppercase tracking-[.13em] text-white/25">Instantly top 25%</span><strong className="mt-1 block text-sm text-white/70">{OUTREACH_RESEARCH.topQuartileReply}</strong></div>
          <div className="border border-white/8 bg-black/20 p-2.5"><span className="block text-[8px] font-bold uppercase tracking-[.13em] text-white/25">Instantly top 10%</span><strong className="mt-1 block text-sm text-white/70">{OUTREACH_RESEARCH.topDecileReply}</strong></div>
          <div className="border border-white/8 bg-black/20 p-2.5"><span className="block text-[8px] font-bold uppercase tracking-[.13em] text-white/25">Replies after step 1</span><strong className="mt-1 block text-sm text-white/70">{OUTREACH_RESEARCH.followUpReplyShare}</strong></div>
        </div>
        <p className="mt-2 text-[9px] leading-4 text-white/24">Platform benchmarks use different audiences and denominators. Treat them as directional reference points, never promised results.</p>

        <div className={`mt-4 border ${accentBorder} ${accentBg} p-3`}><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-[8px] font-bold uppercase tracking-[.15em] text-white/28">Subject · 2–4 words when practical</p><p className={`mt-1 break-words text-sm font-bold ${accent}`}>{plan.subject}</p></div><CopyButton value={plan.subject} label="Copy" blue={blue} /></div></div>

        <div className="mt-2 border border-white/9 bg-black/25 p-3"><div className="flex items-center justify-between gap-3"><div><p className="text-[8px] font-bold uppercase tracking-[.15em] text-white/28">First email</p><p className={`mt-1 text-[10px] font-semibold ${plan.wordCount <= OUTREACH_RESEARCH.hardCeilingWords ? "text-emerald-200/70" : "text-[#ff8f84]"}`}>{plan.wordCount} words · target {OUTREACH_RESEARCH.targetFirstEmailWords} · hard ceiling {OUTREACH_RESEARCH.hardCeilingWords}</p></div><CopyButton value={plan.firstEmail} label="Copy" blue={blue} /></div><p className="mt-3 whitespace-pre-wrap break-words text-xs leading-6 text-white/58">{plan.firstEmail}</p></div>

        <div className={`mt-2 flex items-start gap-2 border ${accentBorder} bg-black/20 p-3`}><Clock3 className={`mt-0.5 size-3.5 shrink-0 ${accent}`} aria-hidden /><div><p className="text-[8px] font-bold uppercase tracking-[.15em] text-white/28">Send strategy</p><p className="mt-1 text-[10px] leading-5 text-white/42">{urgent ? "Freshness wins here: send the first touch as soon as the contact/source is verified. Do not hold a ≤12-hour job-board or explicit buyer-intent lead for an ideal weekday." : "For non-urgent outreach, favor the recipient's morning and Monday–Wednesday. Instantly found Wednesday strongest for engagement; keep follow-ups 3–4 days apart."}</p></div></div>

        <div className="mt-3 space-y-2">{plan.touches.map((touch) => <details key={touch.label} className="border border-white/8 bg-black/20 open:bg-black/30"><summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2.5 text-xs text-white/55"><span><strong className="font-semibold text-white/70">{touch.label}</strong> · {touch.timing} · {touch.wordCount} words</span><span className={accent}>Open</span></summary><div className="border-t border-white/7 p-3"><div className="flex justify-end"><CopyButton value={touch.text} label="Copy" blue={blue} /></div><p className="mt-2 whitespace-pre-wrap break-words text-xs leading-6 text-white/55">{touch.text}</p></div></details>)}</div>

        <div className="mt-4 grid gap-3 xl:grid-cols-2">
          <div className="border border-white/8 bg-black/20 p-3"><div className="flex items-center gap-2"><ShieldCheck className="size-3.5 text-emerald-200/70" aria-hidden /><p className="text-[8px] font-bold uppercase tracking-[.15em] text-white/28">Why this wording</p></div><ul className="mt-2 space-y-1.5">{plan.approach.map((item) => <li key={item} className="text-[11px] leading-5 text-white/45">• {item}</li>)}</ul><p className="mt-2 text-[10px] text-white/28">Tone: {plan.tone}</p></div>
          <div className="border border-white/8 bg-black/20 p-3"><p className="text-[8px] font-bold uppercase tracking-[.15em] text-white/28">Research basis</p><div className="mt-2 space-y-2 text-[10px] leading-4 text-white/40"><p>Gong: 28M+ cold emails; pitching cut replies by up to 57%; highest replies at ≤100 words / 3–4 sentences.</p><p>Gong CTA study: 304,174 emails; asking for interest instead of time was 2×+ more likely to lead to a booked meeting.</p><p>Instantly: billions of interactions; elite campaigns average &lt;80 words with one CTA; 42% of replies arrive after the first touch.</p><p>Lavender: 231,818 recent emails / ~50k inboxes; mobile-friendly formatting produced 83% more replies on average.</p><p>Belkins/Reply.io: 5.5M emails; personalized subjects moved replies from 3% to 7%, and 2–4 word subjects had the highest opens in that dataset.</p></div><div className="mt-3 flex flex-wrap gap-2">{OUTREACH_RESEARCH.sources.map((source) => <a key={source.href} href={source.href} target="_blank" rel="noreferrer" className={`inline-flex items-center gap-1 text-[9px] font-semibold ${accent}`}>{source.name}<ExternalLink className="size-2.5" aria-hidden /></a>)}</div></div>
        </div>
      </div>
      <OutcomeCapture lead={lead} suggestedMessage={plan.firstEmail} blue={blue} />
    </>
  );
}
