"use client";

import { type ChangeEvent, type FormEvent, useMemo, useState } from "react";
import { Check, Clipboard, Download, Printer, RotateCcw } from "lucide-react";
import { Button, buttonStyles } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { TrackedLink } from "@/components/analytics/tracked-link";
import { trackEvent } from "@/lib/analytics";

const pageOptions = ["Home", "About", "Services", "Individual service pages", "Work or case studies", "Insights or resources", "Contact", "Privacy or terms"];
const featureOptions = ["Contact form", "Call or email action", "Booking", "E-commerce", "Membership or account", "Newsletter", "Analytics", "Third-party integration"];
const projectTypes = ["New website", "Website redesign", "Campaign or landing page", "Portfolio or publication", "New feature for an existing site", "Not sure yet"];
const budgetRanges = ["Under $1,000", "$1,000-$2,000", "$2,000-$3,500", "$3,500-$5,000", "$5,000+", "I need guidance"];
const timelines = ["As soon as possible", "Within 1 month", "Within 2-3 months", "Within 3-6 months", "Flexible or exploring"];

type BriefForm = {
  projectType: string;
  projectName: string;
  description: string;
  primaryGoal: string;
  secondaryGoals: string;
  audience: string;
  existingSite: string;
  requiredPages: string[];
  features: string[];
  integrations: string;
  contentReadiness: string;
  brandReadiness: string;
  assets: string;
  references: string;
  competitors: string;
  timeline: string;
  budget: string;
  maintenance: string;
  successMeasures: string;
  notes: string;
};

const initialForm: BriefForm = {
  projectType: "",
  projectName: "",
  description: "",
  primaryGoal: "",
  secondaryGoals: "",
  audience: "",
  existingSite: "",
  requiredPages: [],
  features: [],
  integrations: "",
  contentReadiness: "",
  brandReadiness: "",
  assets: "",
  references: "",
  competitors: "",
  timeline: "",
  budget: "",
  maintenance: "",
  successMeasures: "",
  notes: "",
};

const inputClass = "mt-2 w-full rounded-lg border border-white/12 bg-[#090707]/80 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/34 focus:border-[#16c8ff]/65 focus:ring-4 focus:ring-[#16c8ff]/10";
const labelClass = "text-sm font-medium text-white/78";

function valueOrUnanswered(value: string) {
  return value.trim() || "Not provided";
}

function listOrUnanswered(values: string[]) {
  return values.length ? values.join(", ") : "Not selected";
}

function buildBrief(form: BriefForm) {
  return [
    "# Website Project Brief",
    "",
    "## Project overview",
    `- Project type: ${valueOrUnanswered(form.projectType)}`,
    `- Business, organization, or project name: ${valueOrUnanswered(form.projectName)}`,
    `- Short project description: ${valueOrUnanswered(form.description)}`,
    `- Primary goal: ${valueOrUnanswered(form.primaryGoal)}`,
    `- Secondary goals: ${valueOrUnanswered(form.secondaryGoals)}`,
    `- Target audience: ${valueOrUnanswered(form.audience)}`,
    `- Existing website status: ${valueOrUnanswered(form.existingSite)}`,
    "",
    "## Scope and functionality",
    `- Required pages: ${listOrUnanswered(form.requiredPages)}`,
    `- Required functionality: ${listOrUnanswered(form.features)}`,
    `- Third-party integrations: ${valueOrUnanswered(form.integrations)}`,
    `- Content readiness: ${valueOrUnanswered(form.contentReadiness)}`,
    `- Brand readiness: ${valueOrUnanswered(form.brandReadiness)}`,
    `- Existing assets: ${valueOrUnanswered(form.assets)}`,
    "",
    "## Planning inputs",
    `- Reference sites: ${valueOrUnanswered(form.references)}`,
    `- Competitors or alternatives: ${valueOrUnanswered(form.competitors)}`,
    `- Timeline: ${valueOrUnanswered(form.timeline)}`,
    `- Budget range: ${valueOrUnanswered(form.budget)}`,
    `- Maintenance needs: ${valueOrUnanswered(form.maintenance)}`,
    `- Success measures: ${valueOrUnanswered(form.successMeasures)}`,
    `- Additional notes: ${valueOrUnanswered(form.notes)}`,
    "",
    "## Notes",
    "This brief contains user-provided responses and selected options. It is a planning document, not an exact quote or project agreement.",
  ].join("\n");
}

export function WebsiteProjectBriefForm() {
  const [form, setForm] = useState<BriefForm>(initialForm);
  const [brief, setBrief] = useState("");
  const [feedback, setFeedback] = useState("");
  const [started, setStarted] = useState(false);
  const generatedBrief = useMemo(() => (brief ? brief : ""), [brief]);

  function begin() {
    if (started) return;
    setStarted(true);
    trackEvent("project_brief_start", { source_page: "/tools/website-project-brief" });
  }

  function setValue(field: Exclude<keyof BriefForm, "requiredPages" | "features">, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function toggleValue(field: "requiredPages" | "features", value: string) {
    setForm((current) => ({ ...current, [field]: current[field].includes(value) ? current[field].filter((item) => item !== value) : [...current[field], value] }));
  }

  function handleGenerate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.projectType) {
      setFeedback("Choose a project type before generating the brief.");
      return;
    }
    const nextBrief = buildBrief(form);
    setBrief(nextBrief);
    setFeedback("Brief generated. You can copy, download, print, or reset it below.");
    trackEvent("project_brief_complete", {
      project_type: form.projectType,
      selected_budget_range: form.budget || "not_selected",
      selected_timeline_range: form.timeline || "not_selected",
      number_of_selected_pages: form.requiredPages.length,
      number_of_selected_features: form.features.length,
      source_page: "/tools/website-project-brief",
    });
  }

  async function copyBrief() {
    try {
      if (navigator.clipboard?.writeText) {
        try {
          await navigator.clipboard.writeText(generatedBrief);
        } catch {
          copyWithSelection(generatedBrief);
        }
      } else {
        copyWithSelection(generatedBrief);
      }
      setFeedback("Brief copied to your clipboard.");
      trackEvent("project_brief_copy", { project_type: form.projectType, source_page: "/tools/website-project-brief" });
    } catch {
      setFeedback("Copy was not available. Select the generated text and copy it manually.");
    }
  }

  function downloadBrief() {
    const blob = new Blob([generatedBrief], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "website-project-brief.md";
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
    setFeedback("Markdown download started.");
    trackEvent("project_brief_download", { project_type: form.projectType, source_page: "/tools/website-project-brief" });
  }

  function printBrief() {
    window.print();
    setFeedback("Print dialog opened.");
    trackEvent("project_brief_print", { project_type: form.projectType, source_page: "/tools/website-project-brief" });
  }

  function resetBrief() {
    setForm(initialForm);
    setBrief("");
    setFeedback("Brief form reset. No information was sent or stored.");
    setStarted(false);
  }

  return (
    <div onFocusCapture={begin}>
      <p className="sr-only" aria-live="polite">{feedback}</p>
      <form onSubmit={handleGenerate} className="grid gap-8" noValidate>
        <Fieldset title="Project overview" description="Start with the purpose of the work. Required fields are marked.">
          <label className={labelClass}>Project type <span className="text-[#ff8994]">*</span><select value={form.projectType} onChange={(event) => setValue("projectType", event.target.value)} className={inputClass} required><option value="">Choose a project type</option>{projectTypes.map((option) => <option key={option}>{option}</option>)}</select></label>
          <TextField label="Business, organization, or project name" value={form.projectName} onChange={(value) => setValue("projectName", value)} placeholder="Optional planning label" />
          <TextArea label="Short project description" value={form.description} onChange={(value) => setValue("description", value)} placeholder="What are you building or changing?" />
          <TextField label="Primary goal" value={form.primaryGoal} onChange={(value) => setValue("primaryGoal", value)} placeholder="What should the site help someone do?" />
          <TextField label="Secondary goals" value={form.secondaryGoals} onChange={(value) => setValue("secondaryGoals", value)} placeholder="What else should improve?" />
          <TextArea label="Target audience" value={form.audience} onChange={(value) => setValue("audience", value)} placeholder="Who needs to understand or use the site?" />
          <TextField label="Existing website status" value={form.existingSite} onChange={(value) => setValue("existingSite", value)} placeholder="New site, redesign, existing platform, or relevant URL" />
        </Fieldset>

        <Fieldset title="Scope and functionality" description="Select only the pages and capabilities that are relevant right now.">
          <OptionList label="Required pages" options={pageOptions} selected={form.requiredPages} onToggle={(value) => toggleValue("requiredPages", value)} />
          <OptionList label="Required functionality" options={featureOptions} selected={form.features} onToggle={(value) => toggleValue("features", value)} />
          <TextArea label="Third-party integrations" value={form.integrations} onChange={(value) => setValue("integrations", value)} placeholder="Booking, payments, CRM, email, existing systems, or other integrations" />
          <TextField label="Content readiness" value={form.contentReadiness} onChange={(value) => setValue("contentReadiness", value)} placeholder="What copy, photography, video, or documents are ready?" />
          <TextField label="Brand readiness" value={form.brandReadiness} onChange={(value) => setValue("brandReadiness", value)} placeholder="Existing identity, visual direction, or work still needed" />
          <TextField label="Existing assets" value={form.assets} onChange={(value) => setValue("assets", value)} placeholder="Logos, photography, illustrations, testimonials, case studies, or files" />
        </Fieldset>

        <Fieldset title="Timeline and decision inputs" description="These inputs help you define scope; the tool does not calculate an exact quote.">
          <TextArea label="Reference sites" value={form.references} onChange={(value) => setValue("references", value)} placeholder="What do you like or want to avoid?" />
          <TextField label="Competitors or alternatives" value={form.competitors} onChange={(value) => setValue("competitors", value)} placeholder="Optional context" />
          <OptionList label="Timeline" options={timelines} selected={form.timeline ? [form.timeline] : []} single onToggle={(value) => setValue("timeline", value)} />
          <OptionList label="Budget range" options={budgetRanges} selected={form.budget ? [form.budget] : []} single onToggle={(value) => setValue("budget", value)} />
          <TextField label="Maintenance needs" value={form.maintenance} onChange={(value) => setValue("maintenance", value)} placeholder="Who will own updates, hosting, and future changes?" />
          <TextArea label="Success measures" value={form.successMeasures} onChange={(value) => setValue("successMeasures", value)} placeholder="How will you know the site is helping?" />
          <TextArea label="Additional notes" value={form.notes} onChange={(value) => setValue("notes", value)} placeholder="Constraints, stakeholders, approvals, or anything else to consider" />
        </Fieldset>

        <div className="flex flex-wrap gap-3"><Button type="submit"><Check aria-hidden className="size-4" />Generate brief</Button><Button variant="secondary" onClick={resetBrief}><RotateCcw aria-hidden className="size-4" />Reset</Button></div>
      </form>

      {generatedBrief ? <Card className="mt-10 border-[#16c8ff]/25 p-5 sm:p-7"><div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between"><div><h2 className="text-2xl font-semibold text-white">Generated project brief</h2><p className="mt-2 text-sm leading-6 text-white/58">Includes your provided responses, selected options, and clear labels for unanswered fields.</p></div><div className="flex flex-wrap gap-2"><Button variant="secondary" onClick={copyBrief}><Clipboard aria-hidden className="size-4" />Copy</Button><Button variant="secondary" onClick={downloadBrief}><Download aria-hidden className="size-4" />Download</Button><Button variant="secondary" onClick={printBrief}><Printer aria-hidden className="size-4" />Print</Button></div></div><pre className="mt-6 overflow-x-auto whitespace-pre-wrap rounded-xl border border-white/10 bg-black/20 p-5 font-mono text-xs leading-6 text-white/72">{generatedBrief}</pre><TrackedLink href="/contact?inquiry=website" eventName="project_brief_contact_click" eventProperties={{ project_type: form.projectType, source_page: "/tools/website-project-brief" }} className={buttonStyles({ className: "mt-6" })}>Discuss this project with Rukh Labs</TrackedLink></Card> : null}
      <p className="mt-6 text-sm leading-6 text-white/50">Privacy note: this generator runs in your browser. It does not submit, store, email, or send your brief text to Rukh Labs or analytics.</p>
    </div>
  );
}

function copyWithSelection(text: string) {
  const textArea = document.createElement("textarea");
  textArea.value = text;
  textArea.setAttribute("readonly", "");
  textArea.style.position = "fixed";
  textArea.style.opacity = "0";
  document.body.append(textArea);
  textArea.select();
  const copied = document.execCommand("copy");
  textArea.remove();
  if (!copied) throw new Error("Copy command was unavailable.");
}

function Fieldset({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return <fieldset className="grid gap-5 rounded-2xl border border-white/10 bg-white/[0.02] p-5 sm:grid-cols-2 sm:p-7"><legend className="sr-only">{title}</legend><div className="sm:col-span-2"><h2 className="text-xl font-semibold text-white">{title}</h2><p className="mt-2 text-sm leading-6 text-white/58">{description}</p></div>{children}</fieldset>;
}

function TextField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder: string }) {
  return <label className={labelClass}>{label}<input value={value} onChange={(event) => onChange(event.target.value)} className={inputClass} placeholder={placeholder} /></label>;
}

function TextArea({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder: string }) {
  return <label className={`${labelClass} sm:col-span-2`}>{label}<textarea value={value} onChange={(event: ChangeEvent<HTMLTextAreaElement>) => onChange(event.target.value)} className={`${inputClass} min-h-28 resize-y`} placeholder={placeholder} /></label>;
}

function OptionList({ label, options, selected, onToggle, single = false }: { label: string; options: readonly string[]; selected: readonly string[]; onToggle: (value: string) => void; single?: boolean }) {
  return <fieldset className="sm:col-span-2"><legend className={labelClass}>{label}</legend><div className="mt-3 grid gap-3 sm:grid-cols-2">{options.map((option) => { const checked = selected.includes(option); return <label key={option} className="flex cursor-pointer items-start gap-3 rounded-lg border border-white/10 bg-black/15 p-3 text-sm leading-6 text-white/68 transition hover:border-[#16c8ff]/35"><input type={single ? "radio" : "checkbox"} name={single ? label : undefined} checked={checked} onChange={() => onToggle(option)} className="mt-1 size-4 accent-[#16c8ff]" />{option}</label>; })}</div></fieldset>;
}
