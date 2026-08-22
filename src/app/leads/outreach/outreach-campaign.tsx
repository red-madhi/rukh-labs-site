"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertOctagon,
  CheckCircle2,
  Copy,
  ExternalLink,
  Mail,
  RefreshCw,
  Save,
  Send,
  ShieldAlert,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import type {
  EmailVerificationMethod,
  LeadOutreachState,
} from "@/lib/leads/email-outreach";
import { buildOutreachPlan } from "@/lib/leads/outreach";
import type { OutreachSafetySnapshot } from "@/lib/leads/outreach-safety";
import { segmentForLead, type OutreachSegment } from "@/lib/leads/segments";
import type { LeadOpportunity } from "@/lib/leads/types";

type GmailConfiguration = {
  configured: boolean;
  sender: string;
  requiredSender: string;
  replyTo: string;
  missing: string[];
  error?: string;
};

type OutreachResponse = {
  configuration?: GmailConfiguration;
  states?: Record<string, LeadOutreachState>;
  safety?: OutreachSafetySnapshot;
  state?: LeadOutreachState;
  error?: string;
  results?: Array<{ leadId: string; ok: boolean; error?: string }>;
  checked?: number;
  replies?: number;
  bounces?: number;
  followUps?: number;
  blocked?: number;
};

type LeadResponse = { leads?: LeadOpportunity[]; error?: string };

type Draft = {
  subject: string;
  body: string;
  followUpBodies: string[];
  autoFollowUp: boolean;
  segment: OutreachSegment;
  pitchVersion: string;
  campaignId: string;
};

type FeedFilter = "all" | OutreachSegment;

const feeds: Array<{ value: FeedFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "website", label: "Website" },
  { value: "power-bi", label: "Power BI" },
  { value: "data-ops", label: "Data Ops" },
  { value: "partners", label: "Partners" },
];

const verificationMethods: Array<{ value: EmailVerificationMethod; label: string }> = [
  { value: "external-verifier", label: "External verifier" },
  { value: "existing-correspondence", label: "Existing correspondence" },
  { value: "confirmed-by-recipient", label: "Recipient confirmed" },
];

function active(state?: LeadOutreachState) {
  return Boolean(state?.sentAt && ["sent", "replied", "completed", "paused", "bounced"].includes(state.state || ""));
}

function defaultDraft(lead: LeadOpportunity, state?: LeadOutreachState): Draft {
  const plan = buildOutreachPlan(lead);
  const storedBodies = state?.followUpBodies?.filter(Boolean) || [];
  const followUpBodies = storedBodies.length
    ? storedBodies
    : [state?.followUpBody || plan.touches[0]?.text || "", plan.touches[1]?.text || ""];
  return {
    subject: state?.subject || plan.subject,
    body: state?.body || plan.firstEmail,
    followUpBodies: [followUpBodies[0] || "", followUpBodies[1] || ""],
    autoFollowUp: state?.autoFollowUp ?? true,
    segment: state?.segment || plan.segment,
    pitchVersion: state?.pitchVersion || plan.pitchVersion,
    campaignId: state?.campaignId || plan.campaignId,
  };
}

function segmentLabel(segment: OutreachSegment) {
  if (segment === "power-bi") return "Power BI";
  if (segment === "data-ops") return "Data Ops";
  if (segment === "partners") return "Partners";
  return "Website";
}

function stateBadge(state?: LeadOutreachState) {
  if (state?.state === "bounced") return "border-red-300/25 bg-red-300/[.07] text-red-200";
  if (state?.state === "paused") return "border-orange-300/25 bg-orange-300/[.07] text-orange-200";
  if (state?.state === "replied") return "border-emerald-300/25 bg-emerald-300/[.07] text-emerald-200";
  if (state?.sentAt) return "border-sky-300/25 bg-sky-300/[.07] text-sky-200";
  return "border-white/10 bg-white/[.025] text-white/40";
}

function copy(value: string) {
  return navigator.clipboard.writeText(value);
}

export function OutreachCampaign() {
  const [leads, setLeads] = useState<LeadOpportunity[]>([]);
  const [states, setStates] = useState<Record<string, LeadOutreachState>>({});
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [configuration, setConfiguration] = useState<GmailConfiguration | null>(null);
  const [safety, setSafety] = useState<OutreachSafetySnapshot | null>(null);
  const [feed, setFeed] = useState<FeedFilter>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [verificationMethod, setVerificationMethod] = useState<Record<string, EmailVerificationMethod>>({});
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState("");
  const [message, setMessage] = useState("");

  async function load() {
    setLoading(true);
    setMessage("");
    try {
      const leadFeeds = ["website", "power-bi"] as const;
      const [leadResults, outreachResponse] = await Promise.all([
        Promise.all(leadFeeds.map(async (item) => {
          const response = await fetch(`/api/leads?feed=${item}&limit=250`, { cache: "no-store", credentials: "same-origin" });
          const result = (await response.json()) as LeadResponse;
          if (!response.ok) throw new Error(result.error || `Could not load ${item} leads.`);
          return result.leads || [];
        })),
        fetch("/api/leads/outreach", { cache: "no-store", credentials: "same-origin" }),
      ]);
      const outreach = (await outreachResponse.json()) as OutreachResponse;
      if (!outreachResponse.ok) throw new Error(outreach.error || "Could not load outreach state.");
      const merged = leadResults.flat();
      const unique = [...new Map(merged.map((lead) => [lead.id, lead])).values()];
      const nextStates = outreach.states || {};
      setLeads(unique);
      setStates(nextStates);
      setConfiguration(outreach.configuration || null);
      setSafety(outreach.safety || null);
      setDrafts(Object.fromEntries(unique.map((lead) => [lead.id, defaultDraft(lead, nextStates[lead.id])])));
      setSelected(new Set());
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load outreach.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  const filtered = useMemo(
    () => leads.filter((lead) => feed === "all" || drafts[lead.id]?.segment === feed || segmentForLead(lead) === feed),
    [leads, drafts, feed],
  );

  function blockReason(lead: LeadOpportunity) {
    const state = states[lead.id];
    const draft = drafts[lead.id] || defaultDraft(lead, state);
    if (!lead.contactEmail) return "No email address";
    if (state?.state === "bounced" || state?.emailSuppressed) return "Permanently suppressed after bounce or invalid verification";
    if (!state?.recipientEmail || state.recipientEmail.toLowerCase() !== lead.contactEmail.toLowerCase()) return "Current address does not match the verified address";
    if (state.verificationStatus !== "valid" || !state.verifiedAt) return "Exact address has not been verified";
    const verifiedAt = new Date(state.verifiedAt).getTime();
    if (!safety) return "Safety status unavailable";
    const safetyGeneratedAt = new Date(safety.generatedAt).getTime();
    if (!Number.isFinite(safetyGeneratedAt)) return "Safety timestamp unavailable";
    if (!Number.isFinite(verifiedAt) || verifiedAt < safetyGeneratedAt - 90 * 86_400_000) return "Email verification is older than 90 days";
    if (safety.global.health === "paused") return safety.blockReason || "Global sending pause";
    if (safety?.segments[draft.segment]?.health === "paused") return `${segmentLabel(draft.segment)} source is paused at ${safety.segments[draft.segment].bounceRate}% hard bounces`;
    if (active(state)) return `Sequence already ${state?.state || "active"}`;
    return "";
  }

  const ready = filtered.filter((lead) => !blockReason(lead));

  function updateDraft(leadId: string, patch: Partial<Draft>) {
    setDrafts((current) => ({ ...current, [leadId]: { ...current[leadId], ...patch } }));
  }

  function updateFollowUp(leadId: string, index: number, value: string) {
    setDrafts((current) => {
      const currentDraft = current[leadId];
      if (!currentDraft) return current;
      const bodies = [...currentDraft.followUpBodies];
      bodies[index] = value;
      return { ...current, [leadId]: { ...currentDraft, followUpBodies: bodies } };
    });
  }

  async function request(body: Record<string, unknown>, method = "POST") {
    const response = await fetch("/api/leads/outreach", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const result = (await response.json()) as OutreachResponse;
    if (!response.ok) throw new Error(result.error || "Outreach action failed.");
    if (result.safety) setSafety(result.safety);
    return result;
  }

  function payload(lead: LeadOpportunity) {
    const draft = drafts[lead.id] || defaultDraft(lead, states[lead.id]);
    return {
      leadId: lead.id,
      subject: draft.subject,
      body: draft.body,
      followUpBody: draft.followUpBodies[0],
      followUpBodies: draft.followUpBodies,
      followUpBusinessDays: [3, 4],
      autoFollowUp: draft.autoFollowUp,
      followUpDays: 7,
      segment: draft.segment,
      pitchVersion: draft.pitchVersion,
      campaignId: draft.campaignId,
    };
  }

  async function save(lead: LeadOpportunity) {
    setWorking(`save-${lead.id}`);
    setMessage("");
    try {
      const result = await request(payload(lead), "PATCH");
      if (result.state) setStates((current) => ({ ...current, [lead.id]: result.state! }));
      setMessage(`Saved ${lead.company}'s controlled sequence.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Draft could not be saved.");
    } finally {
      setWorking("");
    }
  }

  async function verifyAddress(lead: LeadOpportunity, status: "valid" | "invalid") {
    const method = verificationMethod[lead.id] || "external-verifier";
    const note = status === "valid"
      ? window.prompt("Record the verifier/provider result or evidence. Do not mark valid based only on finding the address on a webpage.", "")
      : window.prompt("Why is this address invalid?", "Invalid or undeliverable address");
    if (note === null) return;
    setWorking(`verify-${lead.id}`);
    setMessage("");
    try {
      const result = await request({ action: "record-verification", leadId: lead.id, status, method, note });
      if (result.state) setStates((current) => ({ ...current, [lead.id]: result.state! }));
      setMessage(status === "valid" ? `${lead.contactEmail} is recorded as verified for 90 days.` : `${lead.contactEmail} is suppressed as invalid.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Verification could not be recorded.");
    } finally {
      setWorking("");
    }
  }

  async function sendOne(lead: LeadOpportunity) {
    const reason = blockReason(lead);
    if (reason) return setMessage(reason);
    setWorking(`send-${lead.id}`);
    setMessage("");
    try {
      const result = await request({ action: "send", ...payload(lead) });
      if (result.state) setStates((current) => ({ ...current, [lead.id]: result.state! }));
      setSelected((current) => { const next = new Set(current); next.delete(lead.id); return next; });
      setMessage(`Sent the ${drafts[lead.id]?.pitchVersion || "tracked"} sequence to ${lead.company}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Email could not be sent.");
    } finally {
      setWorking("");
    }
  }

  async function sendSelected() {
    const items = ready.filter((lead) => selected.has(lead.id)).slice(0, 10);
    if (!items.length) return setMessage("Select at least one verified, safety-cleared lead.");
    setWorking("bulk");
    setMessage("");
    try {
      const result = await request({ action: "send-bulk", items: items.map(payload) });
      const failures = result.results?.filter((item) => !item.ok) || [];
      setMessage(failures.length ? `Batch finished with ${failures.length} blocked or failed item(s). ${failures[0]?.error || ""}` : `Sent ${items.length} controlled message${items.length === 1 ? "" : "s"}.`);
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Batch could not be sent.");
    } finally {
      setWorking("");
    }
  }

  async function runCycle() {
    setWorking("cycle");
    setMessage("");
    try {
      const result = await request({ action: "cycle", limit: 60 });
      setMessage(`Cycle checked ${result.checked || 0}: ${result.replies || 0} replies, ${result.bounces || 0} bounces, ${result.followUps || 0} follow-ups, ${result.blocked || 0} blocked by safety.`);
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Cycle failed.");
    } finally {
      setWorking("");
    }
  }

  function toggle(leadId: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(leadId)) next.delete(leadId);
      else if (next.size < 10) next.add(leadId);
      return next;
    });
  }

  const emergency = safety?.global.health === "paused";

  return (
    <main className="min-h-screen bg-[#050505] px-3 py-5 text-[#f4efe3] sm:px-5 lg:px-7">
      <div className="mx-auto max-w-[1780px]">
        <header className="border border-white/10 bg-[#090807] p-5 sm:p-7">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <div className="text-[9px] font-black uppercase tracking-[.2em] text-emerald-200/70">Controlled outreach</div>
              <h1 className="mt-2 text-3xl font-black tracking-[-.05em] sm:text-5xl">Verified addresses. Separate pitches. Hard stop rules.</h1>
              <p className="mt-3 max-w-4xl text-sm leading-6 text-white/45">Every service has its own sequence and metrics. Each email must be explicitly verified. Bulk is capped at ten. Follow-ups run after 3 business days and 4 more business days, then stop.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/leads/statuses" className="inline-flex min-h-10 items-center gap-2 border border-violet-300/20 bg-violet-300/[.045] px-3 py-2 text-xs font-bold text-violet-100/70">Delivery metrics</Link>
              <button type="button" onClick={() => void runCycle()} disabled={working === "cycle" || !configuration?.configured} className="inline-flex min-h-10 items-center gap-2 border border-sky-300/20 bg-sky-300/[.045] px-3 py-2 text-xs font-bold text-sky-100/70 disabled:opacity-35"><RefreshCw className={`size-4 ${working === "cycle" ? "animate-spin" : ""}`} /> Sync & follow up</button>
              <button type="button" onClick={() => void load()} disabled={loading} className="inline-flex min-h-10 items-center gap-2 border border-white/12 bg-white/[.03] px-3 py-2 text-xs font-bold text-white/60 disabled:opacity-35"><RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} /> Reload</button>
            </div>
          </div>
          <div className="mt-5 grid gap-2 text-[10px] sm:grid-cols-2 xl:grid-cols-5">
            <div className="border border-white/9 p-3"><div className="uppercase tracking-[.12em] text-white/25">Gmail sender</div><div className="mt-1 break-all font-mono text-white/55">{configuration?.sender || "Checking…"}</div></div>
            <div className="border border-white/9 p-3"><div className="uppercase tracking-[.12em] text-white/25">Reply-to</div><div className="mt-1 break-all font-mono text-white/55">{configuration?.replyTo || "Checking…"}</div></div>
            <div className="border border-white/9 p-3"><div className="uppercase tracking-[.12em] text-white/25">Cleared queue</div><div className="mt-1 font-mono text-white/55">{ready.length} of {filtered.length}</div></div>
            <div className="border border-white/9 p-3"><div className="uppercase tracking-[.12em] text-white/25">Selected</div><div className="mt-1 font-mono text-white/55">{selected.size} / 10</div></div>
            <div className="border border-white/9 p-3"><div className="uppercase tracking-[.12em] text-white/25">Campaign</div><div className="mt-1 break-all font-mono text-white/55">{safety?.campaignId || "Loading…"}</div></div>
          </div>
          {message ? <div className="mt-4 border border-white/10 bg-black/25 p-3 text-xs leading-5 text-white/60">{message}</div> : null}
        </header>

        {safety?.historicalQuarantined ? (
          <section className="mt-3 border border-orange-300/30 bg-orange-300/[.055] p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex gap-3">
                <AlertOctagon className="mt-0.5 size-6 shrink-0 text-orange-200" />
                <div>
                  <p className="text-sm font-black uppercase tracking-[.14em] text-orange-100">Historical campaign quarantined</p>
                  <p className="mt-2 max-w-4xl text-sm leading-6 text-orange-100/68">{safety.historicalWarning}</p>
                  <p className="mt-2 text-xs leading-5 text-orange-100/48">The controlled campaign can only send to an exact address with a recorded verification result. Historical addresses are not silently treated as clean.</p>
                </div>
              </div>
              <div className="grid shrink-0 grid-cols-2 gap-2 text-center">
                <div className="border border-orange-200/15 px-4 py-2"><div className="text-2xl font-black text-orange-100">{safety.historical.bounceRate}%</div><div className="text-[9px] uppercase tracking-[.12em] text-orange-100/40">legacy bounce</div></div>
                <div className="border border-orange-200/15 px-4 py-2"><div className="text-2xl font-black text-orange-100">{safety.historical.bounced}/{safety.historical.sent}</div><div className="text-[9px] uppercase tracking-[.12em] text-orange-100/40">failed / sent</div></div>
              </div>
            </div>
          </section>
        ) : null}

        {emergency ? (
          <section className="mt-3 border border-red-300/35 bg-red-300/[.075] p-5">
            <div className="flex gap-3">
              <AlertOctagon className="mt-0.5 size-6 shrink-0 text-red-200" />
              <div>
                <p className="text-sm font-black uppercase tracking-[.14em] text-red-100">New sends and follow-ups are blocked</p>
                <p className="mt-2 text-sm leading-6 text-red-100/68">{safety?.blockReason}</p>
                <p className="mt-2 text-xs leading-5 text-red-100/48">Fix the source, permanently suppress failures, and verify the next test list before setting a new safety baseline. The application will not let better copy disguise a deliverability failure.</p>
              </div>
            </div>
          </section>
        ) : null}

        {!configuration?.configured && !loading ? (
          <section className="mt-3 border border-orange-300/25 bg-orange-300/[.045] p-4 text-xs leading-5 text-orange-100/65">Gmail is not configured or could not be verified. Missing: {configuration?.missing?.join(", ") || configuration?.error || "authorization"}.</section>
        ) : null}

        {safety ? (
          <section className="mt-3">
            <div className="mb-2 flex items-end justify-between gap-3"><div><div className="text-[9px] font-black uppercase tracking-[.15em] text-emerald-200/55">Controlled campaign health</div><div className="mt-1 text-xs text-white/30">Only verified sends in {safety.campaignId} count here.</div></div><div className="text-[10px] text-white/25">{safety.global.sent} total sent</div></div>
            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
            {(["website", "power-bi", "data-ops", "partners"] as const).map((segment) => {
              const metric = safety.segments[segment];
              const paused = metric.health === "paused";
              return <div key={segment} className={`border p-4 ${paused ? "border-red-300/25 bg-red-300/[.04]" : "border-white/10 bg-[#090807]"}`}><div className="flex items-center justify-between gap-2"><span className="text-[10px] font-black uppercase tracking-[.13em] text-white/35">{metric.label}</span>{paused ? <ShieldAlert className="size-4 text-red-200" /> : <ShieldCheck className="size-4 text-emerald-200/50" />}</div><div className="mt-2 text-xl font-black text-white/80">{metric.bounceRate}% bounce</div><div className="mt-1 text-xs text-white/35">{metric.sent} sent · {metric.replyRate}% reply</div></div>;
            })}
            </div>
          </section>
        ) : null}

        <section className="mt-3 border border-white/10 bg-[#090807] p-3">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex gap-2 overflow-x-auto">
              {feeds.map((item) => <button key={item.value} type="button" onClick={() => setFeed(item.value)} className={`shrink-0 border px-3 py-2 text-[10px] font-bold uppercase tracking-[.1em] ${feed === item.value ? "border-emerald-300/30 bg-emerald-300/[.07] text-emerald-200" : "border-white/10 text-white/40"}`}>{item.label}</button>)}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={() => setSelected(new Set(ready.slice(0, 10).map((lead) => lead.id)))} disabled={!ready.length} className="border border-white/10 px-3 py-2 text-[10px] font-bold uppercase tracking-[.1em] text-white/45 disabled:opacity-30">Select cleared</button>
              <button type="button" onClick={() => setSelected(new Set())} className="border border-white/10 px-3 py-2 text-[10px] font-bold uppercase tracking-[.1em] text-white/45">Clear</button>
              <button type="button" onClick={() => void sendSelected()} disabled={!selected.size || working === "bulk" || emergency || !configuration?.configured} className="inline-flex items-center gap-2 border border-emerald-300/25 bg-emerald-300/[.07] px-3 py-2 text-[10px] font-black uppercase tracking-[.1em] text-emerald-100 disabled:opacity-30"><Send className="size-3.5" /> Send selected</button>
            </div>
          </div>
        </section>

        {loading ? <div className="mt-3 border border-white/10 bg-[#090807] p-12 text-center text-sm text-white/35">Loading leads and delivery state…</div> : null}
        {!loading && filtered.length === 0 ? <div className="mt-3 border border-white/10 bg-[#090807] p-12 text-center text-sm text-white/35">No leads in this segment.</div> : null}

        <section className="mt-3 grid gap-3 xl:grid-cols-2">
          {!loading ? filtered.map((lead) => {
            const state = states[lead.id];
            const draft = drafts[lead.id] || defaultDraft(lead, state);
            const blocked = blockReason(lead);
            const method = verificationMethod[lead.id] || "external-verifier";
            return (
              <article key={lead.id} className={`border bg-[#090807] p-5 ${blocked && !active(state) ? "border-white/8" : "border-white/12"}`}>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <label className={`grid size-7 place-items-center border ${blocked ? "border-white/8 text-white/15" : "border-emerald-300/25 text-emerald-200"}`}><input type="checkbox" className="size-3.5 accent-emerald-400" checked={selected.has(lead.id)} disabled={Boolean(blocked)} onChange={() => toggle(lead.id)} /></label>
                      <span className="border border-[#d7a45f]/25 bg-[#d7a45f]/[.06] px-2 py-1 text-[9px] font-black uppercase tracking-[.1em] text-[#efc37c]">Score {lead.score}</span>
                      <span className="border border-white/10 px-2 py-1 text-[9px] font-black uppercase tracking-[.1em] text-white/38">{segmentLabel(draft.segment)}</span>
                      <span className={`border px-2 py-1 text-[9px] font-black uppercase tracking-[.1em] ${stateBadge(state)}`}>{state?.state || "draft"}</span>
                    </div>
                    <h2 className="mt-3 break-words text-xl font-black tracking-[-.03em] text-white/88">{lead.company}</h2>
                    <p className="mt-1 break-all text-xs text-white/38">{lead.contactEmail || "No email address"}</p>
                  </div>
                  <div className="flex gap-2">
                    {lead.sourceUrl ? <a href={lead.sourceUrl} target="_blank" rel="noreferrer" className="grid size-9 place-items-center border border-white/10 text-white/40"><ExternalLink className="size-4" /></a> : null}
                    <button type="button" onClick={() => void copy(`Subject: ${draft.subject}\n\n${draft.body}`)} className="grid size-9 place-items-center border border-white/10 text-white/40"><Copy className="size-4" /></button>
                  </div>
                </div>

                <p className="mt-4 text-xs leading-5 text-white/40">{lead.summary}</p>

                <div className={`mt-4 border p-3 ${state?.verificationStatus === "valid" ? "border-emerald-300/18 bg-emerald-300/[.025]" : state?.verificationStatus === "invalid" || state?.emailSuppressed ? "border-red-300/18 bg-red-300/[.025]" : "border-orange-300/16 bg-orange-300/[.02]"}`}>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[.13em] text-white/35">{state?.verificationStatus === "valid" ? <CheckCircle2 className="size-3.5 text-emerald-200" /> : state?.verificationStatus === "invalid" ? <XCircle className="size-3.5 text-red-200" /> : <ShieldAlert className="size-3.5 text-orange-200" />} Email verification</div>
                      <p className="mt-2 text-xs text-white/48">{state?.verificationStatus === "valid" ? `Valid via ${state.verificationMethod || "recorded method"}${state.verifiedAt ? ` on ${new Date(state.verifiedAt).toLocaleDateString()}` : ""}.` : state?.verificationStatus === "invalid" ? "Invalid and suppressed. Replace the contact; do not re-enable this address." : "Required before save-to-send becomes sendable."}</p>
                    </div>
                    {!active(state) && state?.verificationStatus !== "invalid" ? <div className="flex flex-col gap-2 sm:flex-row"><select value={method} onChange={(event) => setVerificationMethod((current) => ({ ...current, [lead.id]: event.target.value as EmailVerificationMethod }))} className="min-h-9 border border-white/10 bg-black/30 px-2 text-[10px] text-white/55">{verificationMethods.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select><button type="button" disabled={!lead.contactEmail || working === `verify-${lead.id}`} onClick={() => void verifyAddress(lead, "valid")} className="border border-emerald-300/20 px-3 py-2 text-[10px] font-bold text-emerald-200/70 disabled:opacity-30">Record valid</button><button type="button" disabled={!lead.contactEmail || working === `verify-${lead.id}`} onClick={() => void verifyAddress(lead, "invalid")} className="border border-red-300/18 px-3 py-2 text-[10px] font-bold text-red-200/65 disabled:opacity-30">Mark invalid</button></div> : null}
                  </div>
                </div>

                {blocked ? <div className="mt-3 border border-red-300/15 bg-red-300/[.025] p-3 text-xs leading-5 text-red-100/55"><strong className="text-red-100/75">Blocked:</strong> {blocked}</div> : null}

                <div className="mt-4 grid gap-3">
                  <label className="text-[9px] font-black uppercase tracking-[.13em] text-white/30">Subject · {draft.pitchVersion}<input value={draft.subject} onChange={(event) => updateDraft(lead.id, { subject: event.target.value })} className="mt-2 h-10 w-full border border-white/10 bg-black/25 px-3 text-xs text-white/68 outline-none focus:border-emerald-300/30" /></label>
                  <label className="text-[9px] font-black uppercase tracking-[.13em] text-white/30">Initial email<textarea value={draft.body} onChange={(event) => updateDraft(lead.id, { body: event.target.value })} rows={8} className="mt-2 w-full resize-y border border-white/10 bg-black/25 p-3 text-xs leading-5 text-white/62 outline-none focus:border-emerald-300/30" /></label>
                  <div className="grid gap-3 lg:grid-cols-2">
                    <label className="text-[9px] font-black uppercase tracking-[.13em] text-white/30">Follow-up 1 · +3 business days<textarea value={draft.followUpBodies[0] || ""} onChange={(event) => updateFollowUp(lead.id, 0, event.target.value)} rows={7} className="mt-2 w-full resize-y border border-white/10 bg-black/25 p-3 text-xs leading-5 text-white/58 outline-none focus:border-emerald-300/30" /></label>
                    <label className="text-[9px] font-black uppercase tracking-[.13em] text-white/30">Follow-up 2 · +4 business days<textarea value={draft.followUpBodies[1] || ""} onChange={(event) => updateFollowUp(lead.id, 1, event.target.value)} rows={7} className="mt-2 w-full resize-y border border-white/10 bg-black/25 p-3 text-xs leading-5 text-white/58 outline-none focus:border-emerald-300/30" /></label>
                  </div>
                  <label className="flex items-center gap-2 text-xs text-white/45"><input type="checkbox" checked={draft.autoFollowUp} onChange={(event) => updateDraft(lead.id, { autoFollowUp: event.target.checked })} className="size-4 accent-emerald-400" /> Send the two follow-ups automatically only while safety remains clear</label>
                </div>

                <div className="mt-4 flex flex-wrap gap-2 border-t border-white/8 pt-4">
                  <button type="button" onClick={() => void save(lead)} disabled={working === `save-${lead.id}`} className="inline-flex min-h-9 items-center gap-2 border border-white/10 px-3 py-2 text-[10px] font-bold uppercase tracking-[.1em] text-white/52 disabled:opacity-30"><Save className="size-3.5" /> Save</button>
                  <button type="button" onClick={() => void sendOne(lead)} disabled={Boolean(blocked) || working === `send-${lead.id}` || !configuration?.configured} className="inline-flex min-h-9 items-center gap-2 border border-emerald-300/25 bg-emerald-300/[.07] px-3 py-2 text-[10px] font-black uppercase tracking-[.1em] text-emerald-100 disabled:opacity-30"><Mail className="size-3.5" /> Send</button>
                </div>
              </article>
            );
          }) : null}
        </section>
      </div>
    </main>
  );
}
