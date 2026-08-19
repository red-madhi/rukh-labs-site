"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Mail, RefreshCw, Send, ShieldCheck } from "lucide-react";
import type { LeadOpportunity } from "@/lib/leads/types";
import { buildOutreachPlan } from "@/lib/leads/outreach";

type OutreachMessage = {
  direction: "outbound" | "inbound";
  kind: "initial" | "follow-up" | "reply" | "bounce";
  at: string;
  subject?: string;
  body?: string;
  snippet?: string;
  gmailMessageId?: string;
};

type OutreachState = {
  subject?: string;
  body?: string;
  followUpBody?: string;
  state?: string;
  autoFollowUp?: boolean;
  followUpDays?: number;
  sentAt?: string;
  nextFollowUpAt?: string;
  followUpCount?: number;
  lastReplyAt?: string;
  lastReplySnippet?: string;
  lastBounceAt?: string;
  lastBounceReason?: string;
  lastError?: string;
  messages?: OutreachMessage[];
};

type Draft = {
  subject: string;
  body: string;
  followUpBody: string;
  autoFollowUp: boolean;
  followUpDays: number;
};

type Configuration = {
  configured: boolean;
  sender: string;
  requiredSender: string;
  missing: string[];
};

function when(value?: string) {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}

function defaultDraft(lead: LeadOpportunity): Draft {
  const plan = buildOutreachPlan(lead);
  return {
    subject: plan.subject,
    body: plan.firstEmail,
    followUpBody: plan.touches[0]?.text || "",
    autoFollowUp: true,
    followUpDays: 7,
  };
}

export function OutreachCampaign() {
  const [leads, setLeads] = useState<LeadOpportunity[]>([]);
  const [states, setStates] = useState<Record<string, OutreachState>>({});
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [configuration, setConfiguration] = useState<Configuration | null>(null);
  const [feed, setFeed] = useState<"all" | "website" | "power-bi">("all");
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState("");

  async function load() {
    setLoading(true);
    setMessage("");
    try {
      const [websiteResponse, powerBiResponse, outreachResponse] = await Promise.all([
        fetch("/api/leads?feed=website&limit=250", { cache: "no-store", credentials: "same-origin" }),
        fetch("/api/leads?feed=power-bi&limit=250", { cache: "no-store", credentials: "same-origin" }),
        fetch("/api/leads/outreach", { cache: "no-store", credentials: "same-origin" }),
      ]);
      const website = (await websiteResponse.json()) as { leads?: LeadOpportunity[]; error?: string };
      const powerBi = (await powerBiResponse.json()) as { leads?: LeadOpportunity[]; error?: string };
      const outreach = (await outreachResponse.json()) as {
        states?: Record<string, OutreachState>;
        configuration?: Configuration;
        error?: string;
      };
      if (!websiteResponse.ok || !powerBiResponse.ok || !outreachResponse.ok) {
        throw new Error(website.error || powerBi.error || outreach.error || "Could not load outreach queue.");
      }
      const all = [...(website.leads || []), ...(powerBi.leads || [])];
      const nextStates = outreach.states || {};
      setLeads(all);
      setStates(nextStates);
      setConfiguration(outreach.configuration || null);
      setDrafts((current) => {
        const next = { ...current };
        for (const lead of all) {
          if (!lead.contactEmail || next[lead.id]) continue;
          const generated = defaultDraft(lead);
          const saved = nextStates[lead.id];
          next[lead.id] = {
            subject: saved?.subject || generated.subject,
            body: saved?.body || generated.body,
            followUpBody: saved?.followUpBody || generated.followUpBody,
            autoFollowUp: saved?.autoFollowUp ?? generated.autoFollowUp,
            followUpDays: saved?.followUpDays || generated.followUpDays,
          };
        }
        return next;
      });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load outreach queue.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  const eligible = useMemo(() => leads
    .filter((lead) => lead.contactEmail)
    .filter((lead) => feed === "all" || (feed === "power-bi" ? lead.source === "power-bi" : lead.source !== "power-bi"))
    .sort((a, b) => b.score - a.score || new Date(b.discoveredAt).getTime() - new Date(a.discoveredAt).getTime()), [leads, feed]);

  const ready = eligible.filter((lead) => !["sent", "replied", "bounced", "completed"].includes(states[lead.id]?.state || ""));

  function patchDraft(leadId: string, patch: Partial<Draft>) {
    setDrafts((current) => ({ ...current, [leadId]: { ...current[leadId], ...patch } }));
  }

  function toggle(leadId: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(leadId)) next.delete(leadId); else next.add(leadId);
      return next;
    });
  }

  async function save(leadId: string) {
    const draft = drafts[leadId];
    if (!draft) return;
    setWorking(true);
    try {
      const response = await fetch("/api/leads/outreach", {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId, ...draft }),
      });
      const result = (await response.json()) as { state?: OutreachState; error?: string };
      if (!response.ok) throw new Error(result.error || "Draft could not be saved.");
      if (result.state) setStates((current) => ({ ...current, [leadId]: result.state! }));
      setMessage("Draft saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Draft could not be saved.");
    } finally {
      setWorking(false);
    }
  }

  async function sendOne(leadId: string) {
    const draft = drafts[leadId];
    if (!draft) return;
    setWorking(true);
    setMessage("");
    try {
      const response = await fetch("/api/leads/outreach", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "send", leadId, ...draft }),
      });
      const result = (await response.json()) as { state?: OutreachState; error?: string };
      if (!response.ok) throw new Error(result.error || "Email could not be sent.");
      if (result.state) setStates((current) => ({ ...current, [leadId]: result.state! }));
      setSelected((current) => { const next = new Set(current); next.delete(leadId); return next; });
      setMessage("Email accepted by Gmail. Delivery failures will be caught by the reply/bounce check.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Email could not be sent.");
    } finally {
      setWorking(false);
    }
  }

  async function sendSelected() {
    const ids = [...selected].filter((id) => drafts[id] && ready.some((lead) => lead.id === id)).slice(0, 25);
    if (!ids.length) return;
    setWorking(true);
    setMessage(`Sending ${ids.length} individual email${ids.length === 1 ? "" : "s"}…`);
    try {
      const response = await fetch("/api/leads/outreach", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "send-bulk", items: ids.map((leadId) => ({ leadId, ...drafts[leadId] })) }),
      });
      const result = (await response.json()) as { results?: Array<{ leadId: string; ok: boolean; error?: string }>; error?: string };
      if (!response.ok) throw new Error(result.error || "Bulk send failed.");
      const results = result.results || [];
      const sent = results.filter((item) => item.ok).length;
      const failed = results.length - sent;
      setSelected(new Set(results.filter((item) => !item.ok).map((item) => item.leadId)));
      setMessage(`${sent} accepted by Gmail${failed ? ` · ${failed} failed` : ""}. Delivery failures are checked separately.`);
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Bulk send failed.");
    } finally {
      setWorking(false);
    }
  }

  async function syncReplies() {
    setWorking(true);
    setMessage("Checking active Gmail threads for replies, bounces, and due follow-ups…");
    try {
      const response = await fetch("/api/leads/outreach", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cycle", limit: 60 }),
      });
      const result = (await response.json()) as { checked?: number; replies?: number; bounces?: number; followUps?: number; errors?: string[]; error?: string };
      if (!response.ok) throw new Error(result.error || "Reply sync failed.");
      setMessage(`Checked ${result.checked || 0} threads · ${result.replies || 0} replies · ${result.bounces || 0} bounces · ${result.followUps || 0} follow-ups sent${result.errors?.length ? ` · ${result.errors.length} errors` : ""}.`);
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Reply sync failed.");
    } finally {
      setWorking(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#050505] px-3 py-5 text-[#f4efe3] sm:px-5 lg:px-7">
      <div className="mx-auto max-w-[1500px]">
        <header className="border border-white/10 bg-[#090807] p-5 sm:p-7">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[.2em] text-[#d7a45f]"><ShieldCheck className="size-4" /> Private outreach console</div>
              <h1 className="mt-2 text-3xl font-black tracking-[-.05em] sm:text-5xl">Email campaign queue</h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-white/45">Review and edit every message, send individually or in a batch, and let the daily cycle stop follow-ups automatically when a reply or delivery failure appears.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" disabled={working} onClick={() => void syncReplies()} className="inline-flex min-h-10 items-center gap-2 border border-white/12 bg-white/[.035] px-3 py-2 text-xs font-bold text-white/65 disabled:opacity-40"><RefreshCw className={`size-4 ${working ? "animate-spin" : ""}`} /> Check replies now</button>
              <button type="button" disabled={working || selected.size === 0 || !configuration?.configured} onClick={() => void sendSelected()} className="inline-flex min-h-10 items-center gap-2 border border-[#d7a45f]/35 bg-[#d7a45f]/10 px-3 py-2 text-xs font-bold text-[#efc37c] disabled:opacity-35"><Send className="size-4" /> Send selected ({selected.size})</button>
            </div>
          </div>
          <div className={`mt-4 border p-3 text-xs leading-5 ${configuration?.configured ? "border-emerald-300/20 bg-emerald-300/[.05] text-emerald-200/75" : "border-[#d7a45f]/25 bg-[#d7a45f]/[.05] text-[#efc37c]"}`}>
            {configuration?.configured ? `Gmail ready · sender locked to ${configuration.requiredSender}` : `Sending is locked until Gmail is connected for ${configuration?.requiredSender || "hello@rukhlabs.com"}${configuration?.missing?.length ? ` · missing: ${configuration.missing.join(", ")}` : ""}. You can still edit and save drafts.`}
          </div>
          {message ? <div className="mt-3 border border-white/10 bg-black/25 p-3 text-xs text-white/55">{message}</div> : null}
        </header>

        <section className="mt-3 flex flex-wrap items-center justify-between gap-3 border border-white/10 bg-[#090807] p-3">
          <div className="flex flex-wrap gap-2">
            {(["all", "website", "power-bi"] as const).map((item) => <button key={item} type="button" onClick={() => setFeed(item)} className={`border px-3 py-2 text-[10px] font-bold uppercase tracking-[.12em] ${feed === item ? "border-[#d7a45f]/35 bg-[#d7a45f]/10 text-[#efc37c]" : "border-white/10 text-white/40"}`}>{item === "power-bi" ? "Power BI" : item}</button>)}
          </div>
          <button type="button" onClick={() => setSelected(new Set(ready.slice(0, 25).map((lead) => lead.id)))} className="border border-white/10 px-3 py-2 text-[10px] font-bold text-white/50">Select up to 25 ready</button>
        </section>

        {loading ? <div className="mt-3 border border-white/10 bg-[#090807] p-10 text-center text-sm text-white/40">Loading outreach queue…</div> : null}

        <div className="mt-3 space-y-3">
          {eligible.map((lead) => {
            const state = states[lead.id] || {};
            const draft = drafts[lead.id] || defaultDraft(lead);
            const alreadySent = ["sent", "replied", "completed"].includes(state.state || "");
            const bounced = state.state === "bounced";
            const checked = selected.has(lead.id);
            return (
              <article key={lead.id} className="border border-white/10 bg-[#090807] p-4 sm:p-5">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      {!alreadySent ? <button type="button" onClick={() => toggle(lead.id)} className={`grid size-7 place-items-center border ${checked ? "border-[#d7a45f]/50 bg-[#d7a45f]/15 text-[#efc37c]" : "border-white/15 text-transparent"}`}>{checked ? <Check className="size-4" /> : null}</button> : null}
                      <span className="border border-white/10 px-2 py-1 text-[9px] font-black uppercase tracking-[.12em] text-white/45">{lead.source === "power-bi" ? "Power BI" : "Website"}</span>
                      <span className="border border-white/10 px-2 py-1 text-[9px] font-black uppercase tracking-[.12em] text-white/45">Score {lead.score}</span>
                      <span className={`border px-2 py-1 text-[9px] font-black uppercase tracking-[.12em] ${bounced ? "border-red-300/25 text-red-200/80" : "border-[#d7a45f]/20 text-[#e7b66f]"}`}>{state.state || "draft"}</span>
                    </div>
                    <h2 className="mt-2 break-words text-lg font-bold text-white/85">{lead.company}</h2>
                    <p className="mt-1 break-all text-xs text-white/42">{lead.contactName ? `${lead.contactName} · ` : ""}{lead.contactEmail}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {!alreadySent ? <button type="button" disabled={working} onClick={() => void save(lead.id)} className="border border-white/12 px-3 py-2 text-[10px] font-bold text-white/55 disabled:opacity-35">Save draft</button> : null}
                    {!alreadySent ? <button type="button" disabled={working || !configuration?.configured} onClick={() => void sendOne(lead.id)} className="inline-flex items-center gap-2 border border-[#d7a45f]/35 bg-[#d7a45f]/10 px-3 py-2 text-[10px] font-bold text-[#efc37c] disabled:opacity-35"><Mail className="size-3.5" /> {bounced ? "Retry" : "Send"}</button> : null}
                  </div>
                </div>

                {bounced ? <div className="mt-4 border border-red-300/20 bg-red-300/[.05] p-3 text-xs leading-5 text-red-100/75"><strong>Delivery failed.</strong> Automatic follow-up has been cancelled.{state.lastBounceReason ? ` ${state.lastBounceReason}` : ""}</div> : null}

                {!alreadySent ? (
                  <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px]">
                    <div className="space-y-3">
                      <label className="block"><span className="mb-1 block text-[8px] font-bold uppercase tracking-[.14em] text-white/25">Subject</span><input value={draft.subject} onChange={(event) => patchDraft(lead.id, { subject: event.target.value })} className="w-full border border-white/10 bg-black/30 px-3 py-2 text-sm text-white/75 outline-none focus:border-[#d7a45f]/35" /></label>
                      <label className="block"><span className="mb-1 block text-[8px] font-bold uppercase tracking-[.14em] text-white/25">Email</span><textarea value={draft.body} onChange={(event) => patchDraft(lead.id, { body: event.target.value })} className="min-h-44 w-full resize-y border border-white/10 bg-black/30 px-3 py-2 text-xs leading-6 text-white/65 outline-none focus:border-[#d7a45f]/35" /></label>
                      <details className="border border-white/8 bg-black/20 p-3"><summary className="cursor-pointer text-[10px] font-bold text-white/45">Edit automatic follow-up</summary><textarea value={draft.followUpBody} onChange={(event) => patchDraft(lead.id, { followUpBody: event.target.value })} className="mt-3 min-h-32 w-full resize-y border border-white/10 bg-black/30 px-3 py-2 text-xs leading-6 text-white/60 outline-none" /></details>
                    </div>
                    <div className="border border-white/8 bg-black/20 p-3 text-xs text-white/45">
                      <label className="flex items-center gap-2"><input type="checkbox" checked={draft.autoFollowUp} onChange={(event) => patchDraft(lead.id, { autoFollowUp: event.target.checked })} /> Automatic follow-up</label>
                      <label className="mt-4 block"><span className="mb-1 block text-[8px] font-bold uppercase tracking-[.12em] text-white/25">Days after send</span><input type="number" min={1} max={30} value={draft.followUpDays} onChange={(event) => patchDraft(lead.id, { followUpDays: Number(event.target.value) || 7 })} className="w-full border border-white/10 bg-black/30 px-2 py-2 text-white/65" /></label>
                      <p className="mt-4 leading-5 text-white/30">If a reply or bounce is found first, the follow-up is cancelled automatically.</p>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 grid gap-3 lg:grid-cols-2">
                    <div className="border border-white/8 bg-black/20 p-3 text-xs leading-5 text-white/45"><p><strong className="text-white/65">Sent:</strong> {when(state.sentAt)}</p><p className="mt-1"><strong className="text-white/65">Next follow-up:</strong> {when(state.nextFollowUpAt)}</p><p className="mt-1"><strong className="text-white/65">Follow-ups:</strong> {state.followUpCount || 0}</p>{state.lastReplyAt ? <p className="mt-1 text-emerald-200/70"><strong>Reply:</strong> {when(state.lastReplyAt)} · {state.lastReplySnippet}</p> : null}</div>
                    <details className="border border-white/8 bg-black/20 p-3"><summary className="cursor-pointer text-[10px] font-bold text-white/50">Conversation history ({state.messages?.length || 0})</summary><div className="mt-3 space-y-2">{(state.messages || []).map((item, index) => <div key={`${item.gmailMessageId || item.at}-${index}`} className="border border-white/8 p-2 text-[10px] leading-5 text-white/45"><div className="flex justify-between gap-2"><strong className={item.kind === "bounce" ? "text-red-200/80" : item.direction === "inbound" ? "text-emerald-200/75" : "text-[#e7b66f]"}>{item.kind === "bounce" ? "Bounce" : item.direction === "inbound" ? "Reply" : item.kind === "follow-up" ? "Follow-up" : "Sent"}</strong><span>{when(item.at)}</span></div><p className="mt-1 whitespace-pre-wrap break-words">{item.body || item.snippet || "Message recorded"}</p></div>)}</div></details>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </div>
    </main>
  );
}
