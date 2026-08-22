"use client";

import { FormEvent, useRef, useState } from "react";
import {
  Building2,
  CheckCircle2,
  Clock3,
  Database,
  FileQuestion,
  Loader2,
  ShieldCheck,
  Workflow,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { trackEvent } from "@/lib/analytics";
import { DATA_OPS_REASON, dataOpsOffers, type DataOpsOffer } from "@/lib/data-operations";

const workflowTypes = [
  "Recurring spreadsheet or file process",
  "Power BI or reporting workflow",
  "Data reconciliation or record matching",
  "Migration mapping and validation",
  "Broken refresh, query, or automation",
  "Something else",
] as const;

const frequencies = [
  "One-time emergency",
  "Daily",
  "Weekly",
  "Monthly",
  "Quarterly",
  "Irregular / event-driven",
] as const;

const sourceCounts = ["1 source", "2–3 sources", "4–10 sources", "More than 10 sources"] as const;

const toolGroups = [
  "Excel, CSV, or flat files",
  "Power BI or Power Query",
  "SQL or another database",
  "ERP, CRM, HRIS, or finance system",
  "SharePoint, APIs, or mixed systems",
  "Not sure",
] as const;

const manualTimeRanges = [
  "Under 4 hours per cycle",
  "4–8 hours per cycle",
  "8–20 hours per cycle",
  "More than 20 hours per cycle",
  "Unknown",
] as const;

const budgetRanges = [
  "Under $1,000",
  "$1,000–$3,000",
  "$3,000–$7,500",
  "$7,500–$15,000",
  "$15,000+",
  "I need guidance",
] as const;

const deadlines = [
  "This week",
  "Within 2 weeks",
  "Within 30 days",
  "Within 1–3 months",
  "Flexible / planning ahead",
] as const;

const sensitivityOptions = [
  "No sensitive data expected",
  "Confidential business data may be involved",
  "Personal or regulated data may be involved",
  "Not sure — discuss controls first",
] as const;

const controlStyles =
  "mt-2 w-full rounded-lg border border-white/12 bg-[#09090c]/88 px-4 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-[#16c8ff]/58 focus:ring-4 focus:ring-[#16c8ff]/10";
const inputStyles = `${controlStyles} h-12`;
const labelStyles = "text-sm font-medium text-white/78";

function getInitialOffer(value?: string): DataOpsOffer["id"] | "not-sure" {
  return dataOpsOffers.some((offer) => offer.id === value) ? (value as DataOpsOffer["id"]) : "not-sure";
}

type DataOpsIntakeFormProps = {
  initialOffer?: string;
};

type DataOpsFormState = {
  name: string;
  email: string;
  phone: string;
  organization: string;
  offerId: string;
  workflowType: string;
  frequency: string;
  sourceCount: string;
  tools: string;
  manualTime: string;
  budget: string;
  deadline: string;
  sensitivity: string;
  message: string;
  website: string;
};

export function DataOpsIntakeForm({ initialOffer }: DataOpsIntakeFormProps) {
  const [form, setForm] = useState<DataOpsFormState>({
    name: "",
    email: "",
    phone: "",
    organization: "",
    offerId: getInitialOffer(initialOffer),
    workflowType: workflowTypes[0],
    frequency: frequencies[2],
    sourceCount: sourceCounts[1],
    tools: toolGroups[0],
    manualTime: manualTimeRanges[1],
    budget: budgetRanges[2],
    deadline: deadlines[2],
    sensitivity: sensitivityOptions[0],
    message: "",
    website: "",
  });
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [leadId, setLeadId] = useState("");
  const hasTrackedStart = useRef(false);

  function updateField(field: keyof DataOpsFormState, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function handleFormStart() {
    if (hasTrackedStart.current) return;
    hasTrackedStart.current = true;
    trackEvent("contact_form_start", {
      inquiry_type: DATA_OPS_REASON,
      source_page: "/data-ops",
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!form.name.trim()) {
      setError("Enter your name.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      setError("Enter a valid email address.");
      return;
    }
    if (!form.organization.trim()) {
      setError("Enter the organization, team, or project name.");
      return;
    }
    if (form.message.trim().length < 30) {
      setError("Describe what happens now, what keeps breaking, and what a successful result would look like.");
      return;
    }

    setSubmitting(true);

    try {
      const selectedOffer = dataOpsOffers.find((offer) => offer.id === form.offerId);
      const workflowDetails = [
        `Requested service: ${selectedOffer?.name ?? "Not sure yet"}`,
        `Workflow type: ${form.workflowType}`,
        `Frequency: ${form.frequency}`,
        `Source count: ${form.sourceCount}`,
        `Primary tools: ${form.tools}`,
        `Manual effort: ${form.manualTime}`,
        `Data sensitivity: ${form.sensitivity}`,
      ].join("\n");
      const message = `${form.message.trim()}\n\n--- Workflow details ---\n${workflowDetails}`.slice(0, 1800);
      const url = new URL(window.location.href);
      const utm = Object.fromEntries(
        [...url.searchParams.entries()].filter(([key]) => key.toLowerCase().startsWith("utm_")),
      );

      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          phone: form.phone,
          reason: DATA_OPS_REASON,
          organization: form.organization,
          projectType: form.workflowType,
          packageId: selectedOffer?.id ?? "not-sure",
          budget: form.budget,
          timeline: form.deadline,
          referral: [form.frequency, form.sourceCount, form.tools, form.manualTime, form.sensitivity].join(" | "),
          message,
          sourcePage: url.pathname,
          referrer: document.referrer,
          utm,
          website: form.website,
        }),
      });
      const result = (await response.json()) as { error?: string; id?: string };

      if (!response.ok) {
        throw new Error(result.error || "The workflow brief could not be submitted right now.");
      }

      setLeadId(result.id ?? "");
      setSubmitted(true);
      trackEvent("contact_form_submitted", {
        inquiry_type: DATA_OPS_REASON,
        source_page: "/data-ops",
      });
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "The workflow brief could not be submitted right now. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <Card className="border-emerald-300/20 bg-emerald-300/[0.025] p-6 sm:p-8">
        <div className="flex gap-4">
          <span className="grid size-12 shrink-0 place-items-center rounded-full border border-emerald-300/20 bg-emerald-300/10 text-emerald-200">
            <CheckCircle2 aria-hidden className="size-5" />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-200/72">
              Workflow brief received
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-white">The useful details made it through.</h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-white/60">
              Rukh Labs will review the process, determine whether the work is a fit, and reply with practical questions or the clearest next step. Do not send production data until a secure transfer path is agreed.
            </p>
            {leadId ? <p className="mt-4 font-mono text-xs text-white/34">Reference: {leadId}</p> : null}
            <Button variant="ghost" className="mt-6" onClick={() => setSubmitted(false)}>
              Submit another workflow
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden border-[#16c8ff]/18 bg-[linear-gradient(145deg,rgba(8,16,23,0.94),rgba(11,9,13,0.96))] p-5 sm:p-7">
      <form onSubmit={handleSubmit} onFocusCapture={handleFormStart} className="grid gap-6" noValidate>
        <div className="border-b border-white/10 pb-6">
          <div className="flex items-start gap-4">
            <span className="grid size-11 shrink-0 place-items-center rounded-xl border border-[#16c8ff]/24 bg-[#16c8ff]/9 text-[#8ce8ff]">
              <Workflow aria-hidden className="size-5" />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8ce8ff]">Data operations intake</p>
              <h2 className="mt-2 text-2xl font-semibold text-white">Describe the process, not the buzzwords.</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-white/50">
                No files are uploaded here. Start with the workflow, the failure, the effort, and the required outcome.
              </p>
            </div>
          </div>
        </div>

        <fieldset className="grid gap-5">
          <legend className="text-xs font-semibold uppercase tracking-[0.14em] text-[#e6bd73]">Contact</legend>
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="data-ops-name" className={labelStyles}>Name <span className="text-[#ff8994]">*</span></label>
              <input id="data-ops-name" autoComplete="name" value={form.name} onChange={(event) => updateField("name", event.target.value)} className={inputStyles} placeholder="Your name" required />
            </div>
            <div>
              <label htmlFor="data-ops-email" className={labelStyles}>Work email <span className="text-[#ff8994]">*</span></label>
              <input id="data-ops-email" type="email" autoComplete="email" value={form.email} onChange={(event) => updateField("email", event.target.value)} className={inputStyles} placeholder="you@company.com" required />
            </div>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="data-ops-organization" className={labelStyles}>Organization, team, or project <span className="text-[#ff8994]">*</span></label>
              <input id="data-ops-organization" autoComplete="organization" value={form.organization} onChange={(event) => updateField("organization", event.target.value)} className={inputStyles} placeholder="Who owns the workflow?" required />
            </div>
            <div>
              <label htmlFor="data-ops-phone" className={labelStyles}>Phone <span className="text-white/34">(optional)</span></label>
              <input id="data-ops-phone" type="tel" autoComplete="tel" value={form.phone} onChange={(event) => updateField("phone", event.target.value)} className={inputStyles} placeholder="Best number to reach you" />
            </div>
          </div>
        </fieldset>

        <fieldset className="grid gap-5 border-t border-white/10 pt-6">
          <legend className="pr-3 text-xs font-semibold uppercase tracking-[0.14em] text-[#e6bd73]">Workflow</legend>
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="data-ops-offer" className={labelStyles}>Likely service</label>
              <select id="data-ops-offer" value={form.offerId} onChange={(event) => updateField("offerId", event.target.value)} className={inputStyles}>
                <option value="not-sure">Not sure yet</option>
                {dataOpsOffers.map((offer) => <option key={offer.id} value={offer.id}>{offer.name} — {offer.price}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="data-ops-type" className={labelStyles}>Workflow type</label>
              <select id="data-ops-type" value={form.workflowType} onChange={(event) => updateField("workflowType", event.target.value)} className={inputStyles}>
                {workflowTypes.map((value) => <option key={value}>{value}</option>)}
              </select>
            </div>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label htmlFor="data-ops-frequency" className={labelStyles}>Frequency</label>
              <select id="data-ops-frequency" value={form.frequency} onChange={(event) => updateField("frequency", event.target.value)} className={inputStyles}>
                {frequencies.map((value) => <option key={value}>{value}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="data-ops-sources" className={labelStyles}>Input sources</label>
              <select id="data-ops-sources" value={form.sourceCount} onChange={(event) => updateField("sourceCount", event.target.value)} className={inputStyles}>
                {sourceCounts.map((value) => <option key={value}>{value}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="data-ops-tools" className={labelStyles}>Primary tools</label>
              <select id="data-ops-tools" value={form.tools} onChange={(event) => updateField("tools", event.target.value)} className={inputStyles}>
                {toolGroups.map((value) => <option key={value}>{value}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="data-ops-effort" className={labelStyles}>Manual effort</label>
              <select id="data-ops-effort" value={form.manualTime} onChange={(event) => updateField("manualTime", event.target.value)} className={inputStyles}>
                {manualTimeRanges.map((value) => <option key={value}>{value}</option>)}
              </select>
            </div>
          </div>
        </fieldset>

        <fieldset className="grid gap-5 border-t border-white/10 pt-6">
          <legend className="pr-3 text-xs font-semibold uppercase tracking-[0.14em] text-[#e6bd73]">Scope and controls</legend>
          <div className="grid gap-5 sm:grid-cols-3">
            <div>
              <label htmlFor="data-ops-budget" className={labelStyles}>Working budget</label>
              <select id="data-ops-budget" value={form.budget} onChange={(event) => updateField("budget", event.target.value)} className={inputStyles}>
                {budgetRanges.map((value) => <option key={value}>{value}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="data-ops-deadline" className={labelStyles}>Required timing</label>
              <select id="data-ops-deadline" value={form.deadline} onChange={(event) => updateField("deadline", event.target.value)} className={inputStyles}>
                {deadlines.map((value) => <option key={value}>{value}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="data-ops-sensitivity" className={labelStyles}>Data sensitivity</label>
              <select id="data-ops-sensitivity" value={form.sensitivity} onChange={(event) => updateField("sensitivity", event.target.value)} className={inputStyles}>
                {sensitivityOptions.map((value) => <option key={value}>{value}</option>)}
              </select>
            </div>
          </div>
        </fieldset>

        <div className="border-t border-white/10 pt-6">
          <label htmlFor="data-ops-message" className={labelStyles}>
            What happens now, what is failing, and what should happen instead? <span className="text-[#ff8994]">*</span>
          </label>
          <textarea
            id="data-ops-message"
            value={form.message}
            onChange={(event) => updateField("message", event.target.value)}
            rows={8}
            maxLength={1200}
            className={`${controlStyles} min-h-52 resize-y py-3 leading-6`}
            placeholder="Example: Every Monday, 12 locations send separate CSV files. One analyst renames columns, combines them with a master list, removes duplicate customers, fixes missing IDs, and rebuilds a Power BI report. The process takes six hours and breaks when a location changes its export. We need a validated output, an exception list, and clear evidence that totals reconcile."
            required
          />
          <div className="mt-3 flex items-start gap-2 rounded-lg border border-white/8 bg-white/[0.02] p-3 text-xs leading-5 text-white/42">
            <ShieldCheck aria-hidden className="mt-0.5 size-4 shrink-0 text-[#8ce8ff]" />
            Do not paste credentials, personal records, production data, or confidential files into this form. Secure handling is defined before access is granted.
          </div>
        </div>

        <div className="hidden" aria-hidden="true">
          <label htmlFor="data-ops-website">Website</label>
          <input id="data-ops-website" tabIndex={-1} autoComplete="off" value={form.website} onChange={(event) => updateField("website", event.target.value)} />
        </div>

        {error ? (
          <div role="alert" aria-live="polite" className="flex items-start gap-3 rounded-lg border border-[color:var(--brand-red)]/26 bg-[color:var(--brand-red)]/8 p-4 text-sm leading-6 text-[#ffc4ca]">
            <FileQuestion aria-hidden className="mt-0.5 size-4 shrink-0" />
            {error}
          </div>
        ) : null}

        <div className="flex flex-col gap-4 border-t border-white/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 text-xs leading-5 text-white/40">
            <Building2 aria-hidden className="size-4 shrink-0" />
            Best fit: organizations with a real recurring process, accountable owner, and measurable output.
          </div>
          <Button type="submit" size="lg" disabled={submitting} className="w-full shrink-0 sm:w-auto">
            {submitting ? <Loader2 aria-hidden className="size-4 animate-spin" /> : <Workflow aria-hidden className="size-4" />}
            {submitting ? "Submitting…" : "Submit workflow brief"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
