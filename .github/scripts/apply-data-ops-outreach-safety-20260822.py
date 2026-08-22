from __future__ import annotations

import re
import textwrap
from pathlib import Path

ROOT = Path.cwd()


def write(path: str, content: str) -> None:
    target = ROOT / path
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(textwrap.dedent(content).lstrip(), encoding="utf-8")


write("src/lib/leads/segments.ts", r'''
import type { LeadOpportunity } from "@/lib/leads/types";

export type OutreachSegment = "website" | "power-bi" | "data-ops" | "partners";
export type PitchVariant = "A" | "B";
export const CONTROLLED_OUTREACH_CAMPAIGN = "controlled-reset-2026-08";

const partnerPattern = /\b(?:consult(?:ancy|ing|ants?)|managed\s+(?:it|service)|msp\b|implementation\s+(?:firm|partner|consult)|microsoft\s+partner|erp\b|hris\b|crm\b|fractional\s+cfo|bookkeep(?:er|ing)|outsourced\s+(?:finance|operations)|systems?\s+integrator)\b/i;
const dataOpsPattern = /\b(?:reconcil(?:e|iation)|recurring\s+(?:report|workflow|process)|reporting\s+(?:automation|process|workflow|modernization)|spreadsheet\s+automation|data\s+(?:migration|mapping|validation|cleanup|quality)|source[- ]to[- ]target|power\s*query|dataflow|tableau[- ]to[- ]power\s*bi|schema\s+(?:change|mapping)|exception\s+(?:queue|report)|manual\s+report|month[- ]end\s+report|weekly\s+report)\b/i;

export function deriveOutreachSegment(input: { source?: string | null; tags?: readonly string[]; company?: string | null; summary?: string | null; signals?: readonly string[] }): OutreachSegment {
  if (input.source !== "power-bi") return "website";
  const tags = new Set((input.tags ?? []).map((tag) => tag.trim().toLowerCase()));
  const text = [input.company, input.summary, ...(input.signals ?? []), ...(input.tags ?? [])].filter(Boolean).join(" | ");
  if (tags.has("channel-partner") || tags.has("partner-prospect") || tags.has("white-label") || partnerPattern.test(text)) return "partners";
  if (tags.has("data-ops") || tags.has("process-buyout") || tags.has("migration-proof") || tags.has("reconciliation") || tags.has("reporting-automation") || dataOpsPattern.test(text)) return "data-ops";
  return "power-bi";
}

export function segmentForLead(lead: Pick<LeadOpportunity, "source" | "tags" | "company" | "summary" | "signals">) {
  return deriveOutreachSegment({ source: lead.source, tags: lead.tags, company: lead.company, summary: lead.summary, signals: lead.signals });
}

export function segmentLabel(segment: OutreachSegment) {
  if (segment === "power-bi") return "Power BI";
  if (segment === "data-ops") return "Data Ops";
  if (segment === "partners") return "Partners";
  return "Website";
}

function stableHash(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) { hash ^= value.charCodeAt(index); hash = Math.imul(hash, 16777619); }
  return hash >>> 0;
}

export function pitchVariantForLead(leadId: string): PitchVariant { return stableHash(leadId || "unassigned") % 2 === 0 ? "A" : "B"; }
export function pitchVersionForLead(segment: OutreachSegment, leadId: string) { return `${segment}-2026-08-${pitchVariantForLead(leadId).toLowerCase()}`; }
export const OUTREACH_SEGMENTS: readonly OutreachSegment[] = ["website", "power-bi", "data-ops", "partners"];
''')

write("src/lib/leads/outreach.ts", r'''
import type { LeadOpportunity } from "@/lib/leads/types";
import { CONTROLLED_OUTREACH_CAMPAIGN, pitchVariantForLead, pitchVersionForLead, segmentForLead, type OutreachSegment, type PitchVariant } from "@/lib/leads/segments";

export type OutreachTouch = { label: string; timing: string; businessDaysAfterPrevious: number; text: string; wordCount: number };
export type OutreachPlan = { subject: string; firstEmail: string; wordCount: number; touches: OutreachTouch[]; approach: string[]; tone: string; segment: OutreachSegment; variant: PitchVariant; pitchVersion: string; campaignId: string };

export const OUTREACH_RESEARCH = {
  averageReply: "3.43%", topQuartileReply: "5.5%+", topDecileReply: "10.7%+", firstTouchReplyShare: "58%", followUpReplyShare: "42%",
  targetFirstEmailWords: "50–90", hardCeilingWords: 110, recommendedTouches: 3, followUpSpacing: "3 business days, then 4 business days",
  hardBouncePauseRate: "3% by segment", emergencyGlobalBounceRate: "10%",
  testDecisions: ["50 verified deliveries and zero replies: rewrite the subject and opening.", "100 verified deliveries, at least one follow-up, and zero replies: retire the pitch.", "150–200 verified deliveries and fewer than two replies: change the offer, targeting, or price."],
  sources: ["Instantly 2025 cold-email benchmark dataset", "Gong cold-email research", "Outreach sequence follow-up research"],
} as const;

function countWords(value: string) { return value.trim() ? value.trim().split(/\s+/).length : 0; }
function firstName(lead: LeadOpportunity) { const raw = (lead as LeadOpportunity & { contactName?: string }).contactName?.trim().replace(/^@/, ""); const token = raw?.split(/[\s,|/]+/)[0] || ""; return token.length > 1 && !/^(team|staff|owner|manager)$/i.test(token) ? token : ""; }
function hello(lead: LeadOpportunity) { const name = firstName(lead); return name ? `Hi ${name},` : `Hi ${lead.company} team,`; }
function compact(value: string, max = 140) { const clean = value.replace(/\s+/g, " ").trim().replace(/[.!?]+$/, ""); return clean.length <= max ? clean : `${clean.slice(0, max - 1).replace(/\s+\S*$/, "")}…`; }
function shortCompany(lead: LeadOpportunity) { return lead.company.replace(/\b(?:LLC|PLLC|INC\.?|CORP\.?|LTD\.?)\b/gi, "").replace(/\s+/g, " ").trim().split(/\s+/).slice(0, 3).join(" "); }
function footer(body: string, path = "") { return `${body.trimEnd()}\n\nrukhlabs.com${path}`; }
function finish(input: { lead: LeadOpportunity; segment: OutreachSegment; variant: PitchVariant; subjectA: string; subjectB: string; first: string; follow1: string; follow2: string; approach: string[]; tone: string; path?: string }): OutreachPlan {
  const firstEmail = footer(input.first, input.path); const one = footer(input.follow1, input.path); const two = footer(input.follow2, input.path);
  return { subject: input.variant === "A" ? input.subjectA : input.subjectB, firstEmail, wordCount: countWords(firstEmail), touches: [
    { label: "Follow-up 1", timing: "3 business days later", businessDaysAfterPrevious: 3, text: one, wordCount: countWords(one) },
    { label: "Follow-up 2", timing: "4 business days later", businessDaysAfterPrevious: 4, text: two, wordCount: countWords(two) },
  ], approach: input.approach, tone: input.tone, segment: input.segment, variant: input.variant, pitchVersion: pitchVersionForLead(input.segment, input.lead.id), campaignId: CONTROLLED_OUTREACH_CAMPAIGN };
}

function websitePlan(lead: LeadOpportunity, variant: PitchVariant) {
  const greeting = hello(lead); const company = shortCompany(lead); const signal = lead.signals.find((item) => !/contact path|organization was formed|captured directly|discovered from/i.test(item));
  const observation = signal ? compact(signal.charAt(0).toLowerCase() + signal.slice(1), 125) : "the customer path could be clearer";
  return finish({ lead, segment: "website", variant, subjectA: `${company} website`, subjectB: `quick site note for ${company}`,
    first: `${greeting}\n\nI checked ${lead.company}'s site and noticed ${observation}. It is a small issue, but it adds friction for someone trying to become a customer.\n\nI can send the three changes I would prioritize first—no call needed. Useful?\n\n— Red\nRukh Labs`,
    follow1: `${greeting}\n\nOne additional observation: I would fix the customer path before adding more features. That is the kind of issue I would resolve before suggesting a full rebuild.\n\nShould I send the short list?\n\n— Red`,
    follow2: `${greeting}\n\nLast note from me. My first pass would focus on the path from landing on the site to contacting or booking—not on adding a pile of features.\n\nI can send the three-point version if it would help.\n\n— Red`,
    approach: ["Test only the subject line between A and B.", "Lead with one verified observation.", "Offer a three-point assessment before asking for a meeting.", "Stop after two follow-ups."], tone: "Specific, calm, low-pressure" });
}

function powerBiPlan(lead: LeadOpportunity, variant: PitchVariant) {
  const greeting = hello(lead); const summary = compact(lead.summary);
  return finish({ lead, segment: "power-bi", variant, subjectA: "Power BI scope", subjectB: "Power BI first pass",
    first: `${greeting}\n\nI came across the Power BI need around ${summary}. My work is hands-on Power BI and Fabric—data modeling, DAX, Power Query, migrations, refresh paths, and production reporting.\n\nI can send the two or three areas I would check first based on the scope. Useful?\n\n— Red\nRukh Labs`,
    follow1: `${greeting}\n\nOn Power BI work like this, I usually check the model, source grain, and refresh path before touching visuals. That tends to expose the expensive problems early.\n\nShould I send the short checklist?\n\n— Red`,
    follow2: `${greeting}\n\nLast note from me. I can keep the first pass focused on the specific reporting problem rather than turning it into a broad consulting engagement.\n\nI can send how I would scope that first pass.\n\n— Red`,
    approach: ["Test only the subject line between A and B.", "Reference the exact Power BI or Fabric need.", "Offer a short technical artifact.", "Stop after two follow-ups."], tone: "Concise and technically credible", path: "/data-ops" });
}

function dataOpsPlan(lead: LeadOpportunity, variant: PitchVariant) {
  const greeting = hello(lead); const summary = compact(lead.summary, 130); const company = shortCompany(lead);
  return finish({ lead, segment: "data-ops", variant, subjectA: `${company} reporting process`, subjectB: `recurring reporting at ${company}`,
    first: `${greeting}\n\nI came across the work around ${summary}. It looks like the kind of reporting, reconciliation, or migration process where someone still has to assemble and check the same output by hand.\n\nI take ownership of one process like that: validated output, an exception list, and evidence the totals reconcile. Want the three-point scope I would test first?\n\n— Red\nRukh Labs`,
    follow1: `${greeting}\n\nThe useful first step is usually not a new dashboard. It is mapping the inputs, manual corrections, failure points, and acceptance checks around one recurring output.\n\nShould I send the three-point diagnostic?\n\n— Red`,
    follow2: `${greeting}\n\nLast note from me. I would keep this to one process and one measurable result rather than proposing a broad transformation project.\n\nI can send the smallest sensible starting scope.\n\n— Red`,
    approach: ["Test only the subject line between A and B.", "Sell ownership of one recurring result, not tools or agents.", "Name validated output, exceptions, and reconciliation evidence.", "Stop after two follow-ups."], tone: "Operational, concrete, no transformation theater", path: "/data-ops" });
}

function partnerPlan(lead: LeadOpportunity, variant: PitchVariant) {
  const greeting = hello(lead); const summary = compact(lead.summary, 120);
  return finish({ lead, segment: "partners", variant, subjectA: "white-label data delivery", subjectB: "overflow Power BI support",
    first: `${greeting}\n\nI came across ${lead.company} while looking at firms working around ${summary}. I provide white-label Power BI, Power Query, reconciliation, migration QA, and reporting-automation delivery for consultancies that need extra capacity.\n\nYou keep the client, relationship, and markup. I work under NDA with fixed wholesale scopes and no poaching. Worth sending a one-page capability map?\n\n— Red\nRukh Labs`,
    follow1: `${greeting}\n\nThe useful fit is usually overflow work that is too specialized or too small to staff internally: model repair, migration reconciliation, mapping, refresh failures, or recurring report automation.\n\nShould I send the wholesale scope examples?\n\n— Red`,
    follow2: `${greeting}\n\nLast note from me. This is meant to expand delivery capacity without creating channel conflict—the partner stays client-facing and I stay behind the work.\n\nI can send the one-page outline if relevant.\n\n— Red`,
    approach: ["Test only the subject line between A and B.", "Lead with channel safety.", "Offer fixed wholesale scopes, NDA delivery, and no poaching.", "Stop after two follow-ups."], tone: "Peer-to-peer and commercially clear", path: "/data-ops" });
}

export function buildOutreachPlan(lead: LeadOpportunity, requestedVariant?: PitchVariant): OutreachPlan {
  const segment = segmentForLead(lead); const variant = requestedVariant || pitchVariantForLead(lead.id);
  if (segment === "partners") return partnerPlan(lead, variant); if (segment === "data-ops") return dataOpsPlan(lead, variant); if (segment === "power-bi") return powerBiPlan(lead, variant); return websitePlan(lead, variant);
}
''')

write("src/lib/leads/outreach-safety.ts", r'''
import { selectPrimaryEmail } from "@/lib/leads/contact-values";
import { leadNeonQuery, neonRowsToObjects } from "@/lib/leads/neon";
import { CONTROLLED_OUTREACH_CAMPAIGN, deriveOutreachSegment, OUTREACH_SEGMENTS, pitchVariantForLead, pitchVersionForLead, segmentLabel, type OutreachSegment } from "@/lib/leads/segments";

export type OutreachHealth = "monitoring" | "healthy" | "warning" | "paused";
export type OutreachPerformance = { key: string; label: string; sent: number; delivered: number; bounced: number; replied: number; followUps: number; verified: number; bounceRate: number; replyRate: number; health: OutreachHealth; decision: string };
export type OutreachSafetySnapshot = { generatedAt: string; campaignId: string; historical: OutreachPerformance; historicalQuarantined: boolean; historicalWarning?: string; global: OutreachPerformance; segments: Record<OutreachSegment, OutreachPerformance>; pitches: OutreachPerformance[]; sendingAllowed: boolean; blockReason?: string; manualKillSwitch: boolean };
type StoredOutreach = { recipientEmail?: string; state?: string; sentAt?: string; lastBounceAt?: string; lastReplyAt?: string; followUpCount?: number; pitchVersion?: string; campaignId?: string; verificationStatus?: string; verifiedAt?: string; emailSuppressed?: boolean };
type Row = { id: string; segment: OutreachSegment; outreach: StoredOutreach };

function object(value: unknown): StoredOutreach { if (value && typeof value === "object" && !Array.isArray(value)) return value as StoredOutreach; if (typeof value !== "string") return {}; try { const parsed = JSON.parse(value) as unknown; return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as StoredOutreach : {}; } catch { return {}; } }
function array(value: unknown) { if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string"); if (typeof value !== "string") return []; try { const parsed = JSON.parse(value) as unknown; return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : []; } catch { return []; } }
function rate(value: number) { return Math.round(value * 10) / 10; }
function decision(m: { delivered: number; replied: number; followUps: number; bounced: number; bounceRate: number }) { if (m.bounced && m.bounceRate > 3) return "Pause this segment, suppress failed addresses, and fix list generation before resuming."; if (m.delivered >= 150 && m.replied < 2) return "Materially change the offer, targeting, or price."; if (m.delivered >= 100 && !m.replied && m.followUps) return "Retire this pitch."; if (m.delivered >= 50 && !m.replied) return "Rewrite the subject and opening while holding audience, offer, and CTA stable."; return m.delivered < 10 ? "Not enough delivery data yet. Keep the batch small and verified." : "Continue the controlled test without blending this result with another pitch."; }
function performance(rows: Row[], key: string, label: string, threshold: number): OutreachPerformance { const sent = rows.length; const bounced = rows.filter((row) => Boolean(row.outreach.lastBounceAt) || row.outreach.state === "bounced").length; const delivered = Math.max(0, sent - bounced); const replied = rows.filter((row) => Boolean(row.outreach.lastReplyAt) || row.outreach.state === "replied").length; const followUps = rows.reduce((sum, row) => sum + Math.max(0, Number(row.outreach.followUpCount) || 0), 0); const verified = rows.filter((row) => row.outreach.verificationStatus === "valid").length; const bounceRate = sent ? rate((bounced / sent) * 100) : 0; const replyRate = delivered ? rate((replied / delivered) * 100) : 0; const health: OutreachHealth = bounced && bounceRate > threshold ? "paused" : sent < 10 ? "monitoring" : bounceRate > 1.5 ? "warning" : "healthy"; return { key, label, sent, delivered, bounced, replied, followUps, verified, bounceRate, replyRate, health, decision: decision({ delivered, replied, followUps, bounced, bounceRate }) }; }

async function sentRows(): Promise<Row[]> { const result = await leadNeonQuery(`SELECT id::text, COALESCE(source,'') AS source, COALESCE(company_name,'') AS company_name, COALESCE(summary,'') AS summary, COALESCE(tags,'[]'::jsonb)::text AS tags, COALESCE(signals,'[]'::jsonb)::text AS signals, COALESCE(raw_payload->'outreach','{}'::jsonb)::text AS outreach FROM public.lead_opportunities WHERE raw_payload->'outreach'->>'sentAt' IS NOT NULL`); return neonRowsToObjects(result).map((row): Row | null => { const outreach = object(row.outreach); if (!row.id || !outreach.sentAt) return null; const tags = array(row.tags); const signals = array(row.signals); return { id: String(row.id), outreach, segment: deriveOutreachSegment({ source: String(row.source || ""), company: String(row.company_name || ""), summary: String(row.summary || ""), tags, signals }) }; }).filter((row): row is Row => Boolean(row)); }

export async function getOutreachSafetySnapshot(): Promise<OutreachSafetySnapshot> { const rows = await sentRows(); const current = rows.filter((row) => row.outreach.campaignId === CONTROLLED_OUTREACH_CAMPAIGN); const historicalRows = rows.filter((row) => row.outreach.campaignId !== CONTROLLED_OUTREACH_CAMPAIGN); const historical = performance(historicalRows, "historical", "Historical outreach", 3); const historicalQuarantined = historical.sent >= 10 && historical.bounceRate > 3; const global = performance(current, CONTROLLED_OUTREACH_CAMPAIGN, "Controlled campaign", 10); const segments = Object.fromEntries(OUTREACH_SEGMENTS.map((segment) => [segment, performance(current.filter((row) => row.segment === segment), segment, segmentLabel(segment), 3)])) as Record<OutreachSegment, OutreachPerformance>; const groups = new Map<string, Row[]>(); for (const row of current) { const key = row.outreach.pitchVersion || pitchVersionForLead(row.segment, row.id); groups.set(key, [...(groups.get(key) || []), row]); } const pitches = [...groups].map(([key, items]) => performance(items, key, key, 3)).sort((a,b) => b.sent-a.sent); const manualKillSwitch = /^(1|true|yes|on)$/i.test(process.env.OUTREACH_SEND_DISABLED?.trim() || ""); const emergency = global.health === "paused"; const paused = OUTREACH_SEGMENTS.filter((segment) => segments[segment].health === "paused"); const blockReason = manualKillSwitch ? "All outreach is paused by OUTREACH_SEND_DISABLED." : emergency ? `All controlled sending is paused at ${global.bounceRate}% hard bounces.` : paused.length ? `Sending is paused for: ${paused.map((segment) => segmentLabel(segment)).join(", ")}.` : undefined; return { generatedAt: new Date().toISOString(), campaignId: CONTROLLED_OUTREACH_CAMPAIGN, historical, historicalQuarantined, historicalWarning: historicalQuarantined ? `The previous campaign is quarantined at ${historical.bounceRate}% hard bounces (${historical.bounced} of ${historical.sent}). It remains visible but is not treated as a clean baseline.` : undefined, global, segments, pitches, sendingAllowed: !manualKillSwitch && !emergency, blockReason, manualKillSwitch }; }

export async function recordLeadEmailVerification(input: { leadId: string; email: string; status: "valid" | "invalid"; source: string; evidence: string }) { const leadId = input.leadId.trim(); const email = input.email.trim().toLowerCase(); if (!leadId || !/^\S+@\S+\.\S+$/.test(email)) throw new Error("A lead ID and valid exact email are required."); if (input.source.trim().length < 3 || input.evidence.trim().length < 8) throw new Error("Record the verification source and evidence."); const result = await leadNeonQuery(`SELECT id::text, COALESCE(contact_email,'') AS contact_email, COALESCE(website_url,'') AS website_url FROM public.lead_opportunities WHERE id=$1::uuid AND archived_at IS NULL`, [leadId]); const row = neonRowsToObjects(result)[0]; if (!row) throw new Error("Lead was not found."); const current = selectPrimaryEmail(String(row.contact_email || ""), String(row.website_url || "")); if (!current || current.toLowerCase() !== email) throw new Error("The verification address must exactly match the lead's current primary email."); const verifiedAt = new Date().toISOString(); await leadNeonQuery(`UPDATE public.lead_opportunities SET raw_payload=COALESCE(raw_payload,'{}'::jsonb)||jsonb_build_object('outreach',COALESCE(raw_payload->'outreach','{}'::jsonb)||jsonb_build_object('recipientEmail',$2::text,'verificationStatus',$3::text,'verifiedAt',$4::text,'verificationSource',$5::text,'verificationEvidence',$6::text,'emailSuppressed',$7::boolean)),updated_at=NOW() WHERE id=$1::uuid`, [leadId,email,input.status,verifiedAt,input.source.trim(),input.evidence.trim(),input.status === "invalid"]); return { leadId,email,status:input.status,verifiedAt }; }

export async function assertLeadOutreachSafety(leadId: string) { const result = await leadNeonQuery(`SELECT id::text, COALESCE(source,'') AS source, COALESCE(company_name,'') AS company_name, COALESCE(contact_email,'') AS contact_email, COALESCE(website_url,'') AS website_url, COALESCE(summary,'') AS summary, COALESCE(tags,'[]'::jsonb)::text AS tags, COALESCE(signals,'[]'::jsonb)::text AS signals, COALESCE(raw_payload->'outreach','{}'::jsonb)::text AS outreach FROM public.lead_opportunities WHERE id=$1::uuid AND archived_at IS NULL`, [leadId]); const row = neonRowsToObjects(result)[0]; if (!row) throw new Error("Lead was not found."); const outreach = object(row.outreach); const current = selectPrimaryEmail(String(row.contact_email || ""), String(row.website_url || "")); if (!current) throw new Error("This lead does not have a valid email."); if (!outreach.recipientEmail || outreach.recipientEmail.toLowerCase() !== current.toLowerCase()) throw new Error("Verify this exact current address before sending."); if (outreach.emailSuppressed || outreach.state === "bounced" || outreach.lastBounceAt) throw new Error("This address is suppressed because it bounced or was marked invalid."); if (outreach.verificationStatus !== "valid" || !outreach.verifiedAt) throw new Error("Sending is blocked until this exact address is externally verified or confirmed by correspondence."); const verified = new Date(outreach.verifiedAt).getTime(); if (!Number.isFinite(verified) || verified < Date.now()-90*86_400_000) throw new Error("Email verification is older than 90 days."); const tags = array(row.tags); const signals = array(row.signals); const segment = deriveOutreachSegment({ source:String(row.source||""),company:String(row.company_name||""),summary:String(row.summary||""),tags,signals }); const snapshot = await getOutreachSafetySnapshot(); if (snapshot.manualKillSwitch || snapshot.global.health === "paused") throw new Error(snapshot.blockReason || "All outreach is paused."); if (snapshot.segments[segment].health === "paused") throw new Error(`${segmentLabel(segment)} outreach is paused at ${snapshot.segments[segment].bounceRate}% hard bounces.`); const variant = pitchVariantForLead(String(row.id)); const version = pitchVersionForLead(segment,String(row.id)); await leadNeonQuery(`UPDATE public.lead_opportunities SET raw_payload=COALESCE(raw_payload,'{}'::jsonb)||jsonb_build_object('outreach',COALESCE(raw_payload->'outreach','{}'::jsonb)||jsonb_build_object('recipientEmail',$2::text,'campaignId',$3::text,'segment',$4::text,'pitchVariant',$5::text,'pitchVersion',$6::text,'safetyCheckedAt',$7::text)),updated_at=NOW() WHERE id=$1::uuid`, [String(row.id),current.toLowerCase(),CONTROLLED_OUTREACH_CAMPAIGN,segment,variant,version,new Date().toISOString()]); return { segment,variant,pitchVersion:version,campaignId:CONTROLLED_OUTREACH_CAMPAIGN }; }
''')

write("src/app/api/leads/outreach/safety/route.ts", r'''
import { NextResponse } from "next/server";
import { getOutreachSafetySnapshot, recordLeadEmailVerification } from "@/lib/leads/outreach-safety";
export const dynamic = "force-dynamic";
export async function GET() { try { return NextResponse.json(await getOutreachSafetySnapshot()); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Could not load outreach safety metrics." }, { status: 500 }); } }
export async function POST(request: Request) { try { const payload = await request.json() as { action?:string;leadId?:string;email?:string;status?:string;source?:string;evidence?:string }; if (payload.action !== "verify" || (payload.status !== "valid" && payload.status !== "invalid")) return NextResponse.json({ error:"Invalid verification request." },{status:400}); const verification = await recordLeadEmailVerification({ leadId:payload.leadId||"",email:payload.email||"",status:payload.status,source:payload.source||"",evidence:payload.evidence||"" }); return NextResponse.json({ok:true,verification}); } catch (error) { return NextResponse.json({ error:error instanceof Error ? error.message : "Could not record verification." },{status:400}); } }
''')

write("src/app/leads/outreach/safety/verification-console.tsx", r'''
"use client";
import { FormEvent, useState } from "react";
export function VerificationConsole() { const [leadId,setLeadId]=useState(""); const [email,setEmail]=useState(""); const [status,setStatus]=useState<"valid"|"invalid">("valid"); const [source,setSource]=useState("external-verifier"); const [evidence,setEvidence]=useState(""); const [message,setMessage]=useState(""); const [saving,setSaving]=useState(false); async function submit(event:FormEvent<HTMLFormElement>){event.preventDefault();setSaving(true);setMessage("");try{const response=await fetch("/api/leads/outreach/safety",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({action:"verify",leadId,email,status,source,evidence})});const data=await response.json() as {ok?:boolean;error?:string};if(!response.ok||!data.ok)throw new Error(data.error||"Verification could not be saved.");setMessage(`${email} recorded as ${status}.`);setEvidence("");}catch(error){setMessage(error instanceof Error?error.message:"Verification could not be saved.");}finally{setSaving(false)}} return <form onSubmit={submit} className="grid gap-4 rounded-2xl border border-white/10 bg-white/[0.035] p-5 lg:grid-cols-2"><div className="lg:col-span-2"><h2 className="text-lg font-semibold text-white">Record exact-address verification</h2><p className="mt-1 text-sm text-slate-400">This records a result; it does not verify an address by itself. Use an external verifier, provider-confirmed address, or confirmed correspondence.</p></div><label className="grid gap-1.5 text-sm text-slate-300">Lead ID<input required value={leadId} onChange={e=>setLeadId(e.target.value)} className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-white"/></label><label className="grid gap-1.5 text-sm text-slate-300">Exact email<input required type="email" value={email} onChange={e=>setEmail(e.target.value)} className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-white"/></label><label className="grid gap-1.5 text-sm text-slate-300">Result<select value={status} onChange={e=>setStatus(e.target.value as "valid"|"invalid")} className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-white"><option value="valid">Valid</option><option value="invalid">Invalid / suppress</option></select></label><label className="grid gap-1.5 text-sm text-slate-300">Verification source<select value={source} onChange={e=>setSource(e.target.value)} className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-white"><option value="external-verifier">External verifier</option><option value="provider-confirmed">Provider-confirmed</option><option value="confirmed-correspondence">Confirmed correspondence</option></select></label><label className="grid gap-1.5 text-sm text-slate-300 lg:col-span-2">Evidence note<textarea required minLength={8} rows={3} value={evidence} onChange={e=>setEvidence(e.target.value)} className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-white"/></label><div className="flex items-center gap-3 lg:col-span-2"><button disabled={saving} className="rounded-xl bg-cyan-300 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50">{saving?"Saving…":"Record verification"}</button>{message?<p className="text-sm text-slate-300">{message}</p>:null}</div></form> }
''')

write("src/app/leads/outreach/safety/page.tsx", r'''
import Link from "next/link";
import { VerificationConsole } from "./verification-console";
import { getOutreachSafetySnapshot, type OutreachPerformance } from "@/lib/leads/outreach-safety";
export const dynamic = "force-dynamic";
function Card({metric}:{metric:OutreachPerformance}){const tone=metric.health==="paused"?"border-rose-400/30 bg-rose-400/10":metric.health==="warning"?"border-amber-300/30 bg-amber-300/10":metric.health==="healthy"?"border-emerald-300/30 bg-emerald-300/10":"border-white/10 bg-white/[0.035]";return <article className={`rounded-2xl border p-5 ${tone}`}><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">{metric.health}</p><h3 className="mt-1 text-lg font-semibold text-white">{metric.label}</h3></div><span className="rounded-full border border-white/10 px-2.5 py-1 text-xs text-slate-300">{metric.sent} sent</span></div><dl className="mt-5 grid grid-cols-3 gap-3 text-sm"><div><dt className="text-slate-500">Bounce</dt><dd className="mt-1 text-xl font-semibold text-white">{metric.bounceRate}%</dd></div><div><dt className="text-slate-500">Reply</dt><dd className="mt-1 text-xl font-semibold text-white">{metric.replyRate}%</dd></div><div><dt className="text-slate-500">Verified</dt><dd className="mt-1 text-xl font-semibold text-white">{metric.verified}</dd></div></dl><p className="mt-4 text-sm leading-6 text-slate-300">{metric.decision}</p></article>}
export default async function Page(){const snapshot=await getOutreachSafetySnapshot();return <main className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8"><div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-300">Deliverability control</p><h1 className="mt-2 text-3xl font-semibold text-white sm:text-4xl">Outreach Safety</h1><p className="mt-3 max-w-3xl text-slate-400">Exact-address verification, historical quarantine, source-level pause rules, and pitch-level decisions. Unverified or suppressed addresses cannot send.</p></div><div className="flex gap-3"><Link href="/leads/outreach" className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-200">Campaign</Link><Link href="/leads/outreach/safety" className="rounded-xl bg-white/10 px-4 py-2 text-sm text-white">Refresh</Link></div></div><section className={`mt-8 rounded-2xl border p-5 ${snapshot.sendingAllowed?"border-emerald-300/25 bg-emerald-300/10":"border-rose-400/30 bg-rose-400/10"}`}><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">Controlled campaign</p><h2 className="mt-1 text-xl font-semibold text-white">{snapshot.sendingAllowed?"Global sending available":"Global sending paused"}</h2></div><code className="rounded-lg bg-black/25 px-3 py-1.5 text-xs text-slate-300">{snapshot.campaignId}</code></div><p className="mt-3 text-sm text-slate-200">{snapshot.blockReason||"Segment rules still apply. Every lead also needs an exact, current verification record."}</p></section>{snapshot.historicalWarning?<section className="mt-5 rounded-2xl border border-amber-300/25 bg-amber-300/10 p-5"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-200">Historical campaign quarantined</p><p className="mt-2 text-sm leading-6 text-amber-50">{snapshot.historicalWarning}</p></section>:null}<section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-5"><Card metric={snapshot.global}/>{Object.values(snapshot.segments).map(metric=><Card key={metric.key} metric={metric}/>)}</section><section className="mt-10"><h2 className="text-2xl font-semibold text-white">Pitch-level performance</h2>{snapshot.pitches.length?<div className="mt-4 grid gap-4 lg:grid-cols-2 xl:grid-cols-3">{snapshot.pitches.map(metric=><Card key={metric.key} metric={metric}/>)}</div>:<div className="mt-4 rounded-2xl border border-dashed border-white/10 p-8 text-sm text-slate-400">No controlled-campaign sends yet. The failed campaign is not being disguised as a clean baseline.</div>}</section><section className="mt-10"><VerificationConsole/></section><section className="mt-10 grid gap-4 lg:grid-cols-3">{[["50 delivered, zero replies","Rewrite only the subject and opening."],["100 plus follow-up, zero replies","Retire the pitch."],["150–200, fewer than two replies","Change the offer, targeting, or price."]].map(([title,text])=><article key={title} className="rounded-2xl border border-white/10 bg-white/[0.035] p-5"><h3 className="font-semibold text-white">{title}</h3><p className="mt-2 text-sm text-slate-400">{text}</p></article>)}</section></main>}
''')

write("src/app/leads/partners/page.tsx", r'''
import Link from "next/link";
import { leadNeonQuery, neonRowsToObjects } from "@/lib/leads/neon";
export const dynamic = "force-dynamic";
async function partners(){const result=await leadNeonQuery(`SELECT id::text,COALESCE(company_name,'') AS company_name,COALESCE(summary,'') AS summary,COALESCE(website_url,'') AS website_url,COALESCE(contact_email,'') AS contact_email,COALESCE(score,0)::int AS score FROM public.lead_opportunities WHERE archived_at IS NULL AND source='power-bi' AND (COALESCE(tags,'[]'::jsonb)::text~*'(partner|white-label|consult|msp|implementation|fractional-cfo|bookkeep|integrator)' OR COALESCE(signals,'[]'::jsonb)::text~*'(consultancy|managed IT|implementation firm|Microsoft partner|ERP|HRIS|CRM|fractional CFO|bookkeeping|systems integrator)' OR COALESCE(summary,'')~*'(consultancy|managed IT|implementation firm|Microsoft partner|ERP|HRIS|CRM|fractional CFO|bookkeeping|systems integrator)') ORDER BY score DESC,discovered_at DESC LIMIT 100`);return neonRowsToObjects(result)}
export default async function Page(){const rows=await partners();return <main className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8"><div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-300">Channel acquisition</p><h1 className="mt-2 text-3xl font-semibold text-white">Partner Prospects</h1><p className="mt-3 max-w-3xl text-slate-400">Microsoft, Power BI, MSP, ERP, HRIS, CRM, finance, and operations firms get a separate white-label pitch and separate results.</p></div><Link href="/leads/outreach/safety" className="rounded-xl border border-white/10 px-4 py-2 text-sm text-white">Outreach safety</Link></div><div className="mt-8 grid gap-4 lg:grid-cols-2">{rows.map(row=><article key={String(row.id)} className="rounded-2xl border border-white/10 bg-white/[0.035] p-5"><div className="flex items-start justify-between gap-3"><div><h2 className="text-lg font-semibold text-white">{String(row.company_name||"Unknown company")}</h2><p className="mt-1 text-xs text-slate-500">Lead {String(row.id)}</p></div><span className="rounded-full bg-violet-300/10 px-3 py-1 text-xs text-violet-100">Score {Number(row.score)||0}</span></div><p className="mt-4 text-sm leading-6 text-slate-400">{String(row.summary||"")}</p><div className="mt-4 flex flex-wrap gap-2">{row.website_url?<a href={String(row.website_url)} target="_blank" rel="noreferrer" className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-slate-200">Website</a>:null}{row.contact_email?<span className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-slate-400">{String(row.contact_email)}</span>:null}</div></article>)}</div>{!rows.length?<div className="mt-8 rounded-2xl border border-dashed border-white/10 p-10 text-center text-sm text-slate-400">No partner prospects are tagged yet. The next crawler pass can score partner signals into this feed.</div>:null}</main>}
''')

# Make the existing send route fail closed before the provider is called.
route = ROOT / "src/app/api/leads/outreach/route.ts"
text = route.read_text(encoding="utf-8")
if "assertLeadOutreachSafety" not in text:
    imports = list(re.finditer(r"^import .*?;\s*$", text, re.M))
    if not imports:
        raise RuntimeError("Could not locate outreach route imports")
    text = text[:imports[-1].end()] + '\nimport { assertLeadOutreachSafety } from "@/lib/leads/outreach-safety";' + text[imports[-1].end():]
if "await assertLeadOutreachSafety" not in text:
    body = re.search(r"const\s+(\w+)\s*=\s*(?:\([^\n]+\)\s+as\s+[^;]+|await\s+request\.json\(\)|request\.json\(\))", text)
    body_name = body.group(1) if body else None
    candidates = []
    if body_name:
        candidates.append((rf'(if\s*\(\s*{re.escape(body_name)}\.action\s*===?\s*["\']send["\']\s*\)\s*\{{)', rf'\1\n      await assertLeadOutreachSafety(String({body_name}.leadId ?? {body_name}.id ?? ""));'))
    candidates += [(r'(if\s*\(\s*action\s*===?\s*["\']send["\']\s*\)\s*\{)', r'\1\n      await assertLeadOutreachSafety(String(leadId));'), (r'(case\s+["\']send["\']\s*:\s*\{?)', r'\1\n        await assertLeadOutreachSafety(String(leadId));')]
    changed = False
    for pattern, replacement in candidates:
        text, count = re.subn(pattern, replacement, text, count=1)
        if count:
            changed = True
            break
    if not changed:
        send_call = re.search(r'(?m)^(\s*)(?:const\s+\w+\s*=\s*)?await\s+\w*send\w*\(', text, re.I)
        if not send_call:
            raise RuntimeError("Could not locate send branch")
        text = text[:send_call.start()] + send_call.group(1) + 'await assertLeadOutreachSafety(String(leadId));\n' + text[send_call.start():]
route.write_text(text, encoding="utf-8")

# Add direct nav links where the existing structure is a simple href/label array.
nav = ROOT / "src/app/leads/lead-feed-nav.tsx"
if nav.exists():
    text = nav.read_text(encoding="utf-8")
    if "/leads/outreach/safety" not in text and re.search(r'\{\s*href:\s*["\']', text):
        match = re.search(r'(const\s+\w*(?:nav|feed|link)\w*\s*=\s*\[)(.*?)(\n\];)', text, re.I|re.S)
        if match:
            insertion = '\n  { href: "/leads/partners", label: "Partners" },\n  { href: "/leads/outreach/safety", label: "Safety" },'
            text = text[:match.end(2)] + insertion + text[match.end(2):]
            nav.write_text(text, encoding="utf-8")

schema = ROOT / "docs/rukh-leads-crawl-schema.sql"
if schema.exists():
    text = schema.read_text(encoding="utf-8")
    marker = "-- Outreach safety metadata is stored in raw_payload.outreach"
    if marker not in text:
        schema.write_text(text + "\n\n" + marker + " so verification, suppression, campaign, segment, pitch, bounce, reply, and follow-up state can ship without a destructive table migration. Production sends must pass src/lib/leads/outreach-safety.ts before the provider is called.\n", encoding="utf-8")
