"use client";

import { FormEvent, useRef, useState } from "react";
import { BriefcaseBusiness, CheckCircle2, Globe2, Loader2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { careerPortfolioPackages } from "@/lib/career-portfolios";
import { siteConfig } from "@/lib/site-config";
import { designDirections, websitePackages } from "@/lib/web-development";
import { trackEvent } from "@/lib/analytics";

const WEBSITE_REASON = "Website design project";
const CAREER_REASON = "Career portfolio project";

const websiteProjectTypes = [
  "A new website",
  "A redesign of an existing website",
  "A landing page or campaign site",
  "A creator, portfolio, or publication site",
  "New features for an existing website",
  "Not sure yet",
] as const;

const careerProjectTypes = [
  "A new career portfolio",
  "A redesign of an existing portfolio",
  "A private or unlisted recruiter portfolio",
  "Case studies for an existing site",
  "Not sure yet",
] as const;

const budgetRanges = [
  "Under $1,000",
  "$1,000–$2,000",
  "$2,000–$3,500",
  "$3,500–$5,000",
  "$5,000+",
  "I need guidance",
] as const;

const timelines = [
  "As soon as possible",
  "Within 1 month",
  "Within 2–3 months",
  "Within 3–6 months",
  "Flexible / just exploring",
] as const;

const controlStyles =
  "mt-2 w-full rounded-lg border border-white/12 bg-[#090707]/80 px-4 text-sm text-white outline-none transition placeholder:text-white/34 focus:border-[color:var(--brand-red)]/65 focus:ring-4 focus:ring-[color:var(--brand-red)]/10";
const inputStyles = controlStyles + " h-12";
const labelStyles = "text-sm font-medium text-white/78";

type ContactFormProps = {
  initialInquiry?: string;
  initialPackage?: string;
  initialDesign?: string;
};

export function ContactForm({ initialInquiry, initialPackage, initialDesign }: ContactFormProps) {
  const initialReason =
    initialInquiry === "career-portfolio"
      ? CAREER_REASON
      : initialInquiry === "website"
        ? WEBSITE_REASON
        : siteConfig.contactReasons[0];
  const validWebsitePackage = websitePackages.some(
    (websitePackage) => websitePackage.id === initialPackage,
  );
  const validCareerPackage = careerPortfolioPackages.some(
    (careerPackage) => careerPackage.id === initialPackage,
  );
  const validDesign = designDirections.some((direction) => direction.slug === initialDesign);

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    reason: initialReason,
    organization: "",
    projectType:
      initialReason === CAREER_REASON ? careerProjectTypes[0] : websiteProjectTypes[0],
    packageId:
      initialReason === CAREER_REASON
        ? validCareerPackage
          ? initialPackage ?? "Not sure yet"
          : "Not sure yet"
        : validWebsitePackage
          ? initialPackage ?? "Not sure yet"
          : "Not sure yet",
    designDirection: validDesign ? initialDesign ?? "Not sure yet" : "Not sure yet",
    currentWebsite: "",
    budget: budgetRanges[1],
    timeline: timelines[2],
    referral: "",
    message: "",
    website: "",
  });
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [leadId, setLeadId] = useState("");
  const hasTrackedStart = useRef(false);

  const isWebsiteProject = form.reason === WEBSITE_REASON;
  const isCareerProject = form.reason === CAREER_REASON;
  const isProject = isWebsiteProject || isCareerProject;

  function handleFormStart() {
    if (hasTrackedStart.current) return;
    hasTrackedStart.current = true;
    trackEvent("contact_form_start", {
      inquiry_type: form.reason,
      source_page: "/contact",
    });
  }

  function updateField(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function updateReason(reason: string) {
    setForm((current) => ({
      ...current,
      reason,
      projectType: reason === CAREER_REASON ? careerProjectTypes[0] : websiteProjectTypes[0],
      packageId: "Not sure yet",
    }));
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
    if (isProject && !form.organization.trim()) {
      setError(
        isCareerProject
          ? "Enter your current role or the role you are targeting."
          : "Enter your business, brand, or project name.",
      );
      return;
    }
    if (form.message.trim().length < 20) {
      setError(
        isCareerProject
          ? "Tell me a little more about the roles you want and what the portfolio should prove."
          : isWebsiteProject
            ? "Tell me a little more about what the website needs to accomplish."
            : "Add a little more detail to the message.",
      );
      return;
    }

    setSubmitting(true);
    try {
      const url = new URL(window.location.href);
      const utm = Object.fromEntries(
        [...url.searchParams.entries()].filter(([key]) => key.toLowerCase().startsWith("utm_")),
      );
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          sourcePage: url.pathname,
          referrer: document.referrer,
          utm,
        }),
      });
      const result = (await response.json()) as { error?: string; id?: string };

      if (!response.ok) {
        throw new Error(result.error || "The form could not be submitted right now.");
      }

      setLeadId(result.id ?? "");
      setSubmitted(true);
      trackEvent("contact_form_submitted", {
        inquiry_type: form.reason,
        source_page: "/contact",
      });
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "The form could not be submitted right now. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <Card className="border-[color:var(--brand-red)]/25 p-6 sm:p-8">
        <div className="flex gap-4">
          <span className="grid size-11 shrink-0 place-items-center rounded-full bg-[#d6ad5b]/12 text-[#f3d99d]">
            <CheckCircle2 aria-hidden className="size-5" />
          </span>
          <div>
            <h2 className="text-xl font-semibold text-white">Message received.</h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-white/62">
              Your inquiry has been securely submitted to Rukh Labs. You do not need to open an email app or send anything else.
            </p>
            {leadId ? (
              <p className="mt-4 font-mono text-xs text-white/36">Reference: {leadId}</p>
            ) : null}
            <Button variant="ghost" className="mt-6" onClick={() => setSubmitted(false)}>
              Send another message
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  const projectTypeOptions = isCareerProject ? careerProjectTypes : websiteProjectTypes;
  const packageOptions = isCareerProject ? careerPortfolioPackages : websitePackages;

  return (
    <Card className="border-white/12 p-5 sm:p-7">
      <form onSubmit={handleSubmit} onFocusCapture={handleFormStart} className="grid gap-6" noValidate>
        <div className="border-b border-white/10 pb-6">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-lg border border-[color:var(--brand-red)]/28 bg-[color:var(--brand-red)]/10 text-[#ff8e99]">
              {isCareerProject ? (
                <BriefcaseBusiness aria-hidden className="size-4" />
              ) : isWebsiteProject ? (
                <Globe2 aria-hidden className="size-4" />
              ) : (
                <Mail aria-hidden className="size-4" />
              )}
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#ff8994]">
                {isCareerProject
                  ? "New career portfolio inquiry"
                  : isWebsiteProject
                    ? "New client inquiry"
                    : "General contact"}
              </p>
              <h2 className="mt-1 text-xl font-semibold text-white">
                {isCareerProject
                  ? "Tell me where you want your career to go."
                  : isWebsiteProject
                    ? "Tell me about your website."
                    : "Send Rukh Labs a message."}
              </h2>
            </div>
          </div>
        </div>

        <div>
          <label htmlFor="contact-reason" className={labelStyles}>What can I help with?</label>
          <select id="contact-reason" value={form.reason} onChange={(event) => updateReason(event.target.value)} className={inputStyles}>
            {siteConfig.contactReasons.map((reason) => <option key={reason}>{reason}</option>)}
          </select>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="contact-name" className={labelStyles}>Name <span className="text-[#ff8994]">*</span></label>
            <input id="contact-name" autoComplete="name" value={form.name} onChange={(event) => updateField("name", event.target.value)} className={inputStyles} placeholder="Your name" required />
          </div>
          <div>
            <label htmlFor="contact-email" className={labelStyles}>Email <span className="text-[#ff8994]">*</span></label>
            <input id="contact-email" type="email" autoComplete="email" value={form.email} onChange={(event) => updateField("email", event.target.value)} className={inputStyles} placeholder="you@example.com" required />
          </div>
        </div>

        <div>
          <label htmlFor="contact-phone" className={labelStyles}>Phone <span className="text-white/34">(optional)</span></label>
          <input id="contact-phone" type="tel" autoComplete="tel" value={form.phone} onChange={(event) => updateField("phone", event.target.value)} className={inputStyles} placeholder="Best number to reach you" />
        </div>

        {isProject ? (
          <>
            <div className="border-t border-white/10 pt-6"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#e6bd73]">Project basics</p></div>
            <div>
              <label htmlFor="contact-organization" className={labelStyles}>
                {isCareerProject ? "Current or target role" : "Business, brand, or project name"} <span className="text-[#ff8994]">*</span>
              </label>
              <input id="contact-organization" autoComplete="organization" value={form.organization} onChange={(event) => updateField("organization", event.target.value)} className={inputStyles} placeholder={isCareerProject ? "What role are you in or pursuing?" : "What should the website represent?"} required />
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="contact-project-type" className={labelStyles}>Project type</label>
                <select id="contact-project-type" value={form.projectType} onChange={(event) => updateField("projectType", event.target.value)} className={inputStyles}>
                  {projectTypeOptions.map((projectType) => <option key={projectType}>{projectType}</option>)}
                </select>
              </div>
              {isWebsiteProject ? (
                <div>
                  <label htmlFor="contact-current-website" className={labelStyles}>Current website <span className="text-white/34">(optional)</span></label>
                  <input id="contact-current-website" type="url" inputMode="url" value={form.currentWebsite} onChange={(event) => updateField("currentWebsite", event.target.value)} className={inputStyles} placeholder="https://" />
                </div>
              ) : null}
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="contact-package" className={labelStyles}>Package interest</label>
                <select id="contact-package" value={form.packageId} onChange={(event) => updateField("packageId", event.target.value)} className={inputStyles}>
                  <option>Not sure yet</option>
                  {packageOptions.map((projectPackage) => (
                    <option key={projectPackage.id} value={projectPackage.id}>{projectPackage.name} — {projectPackage.price}</option>
                  ))}
                </select>
              </div>
              {isWebsiteProject ? (
                <div>
                  <label htmlFor="contact-design" className={labelStyles}>Design direction</label>
                  <select id="contact-design" value={form.designDirection} onChange={(event) => updateField("designDirection", event.target.value)} className={inputStyles}>
                    <option>Not sure yet</option>
                    {designDirections.map((direction) => <option key={direction.slug} value={direction.slug}>{direction.name}</option>)}
                  </select>
                </div>
              ) : null}
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="contact-budget" className={labelStyles}>Estimated budget</label>
                <select id="contact-budget" value={form.budget} onChange={(event) => updateField("budget", event.target.value)} className={inputStyles}>
                  {budgetRanges.map((budget) => <option key={budget}>{budget}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="contact-timeline" className={labelStyles}>Preferred timeline</label>
                <select id="contact-timeline" value={form.timeline} onChange={(event) => updateField("timeline", event.target.value)} className={inputStyles}>
                  {timelines.map((timeline) => <option key={timeline}>{timeline}</option>)}
                </select>
              </div>
            </div>
          </>
        ) : null}

        <div>
          <label htmlFor="contact-message" className={labelStyles}>
            {isCareerProject ? "What should the portfolio prove?" : isWebsiteProject ? "What should the website accomplish?" : "Message"} <span className="text-[#ff8994]">*</span>
          </label>
          <textarea id="contact-message" value={form.message} onChange={(event) => updateField("message", event.target.value)} rows={isProject ? 7 : 6} maxLength={1800} className={controlStyles + " min-h-44 resize-y py-3 leading-6"} placeholder={isCareerProject ? "Describe the roles you are targeting, the experience or projects you can show, privacy constraints, and what would make the portfolio successful." : isWebsiteProject ? "Describe your audience, goals, must-have pages or features, and anything that would make the project a success." : "How can Rukh Labs help?"} required />
        </div>

        {isProject ? (
          <div>
            <label htmlFor="contact-referral" className={labelStyles}>How did you find Rukh Labs? <span className="text-white/34">(optional)</span></label>
            <input id="contact-referral" value={form.referral} onChange={(event) => updateField("referral", event.target.value)} className={inputStyles} placeholder="Search, social media, referral…" />
          </div>
        ) : null}

        <div className="absolute left-[-10000px] top-auto h-px w-px overflow-hidden" aria-hidden="true">
          <label htmlFor="contact-website">Website</label>
          <input id="contact-website" tabIndex={-1} autoComplete="off" value={form.website} onChange={(event) => updateField("website", event.target.value)} />
        </div>

        {error ? <p role="alert" className="rounded-lg border border-[#ff7f73]/20 bg-[#ff7f73]/8 px-4 py-3 text-sm text-[#ffc0b8]">{error}</p> : null}

        <div className="flex flex-col gap-3 border-t border-white/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-sm text-xs leading-5 text-white/40">Your message is submitted directly and stored securely. No email app is required.</p>
          <Button type="submit" size="lg" className="shrink-0" disabled={submitting}>
            {submitting ? <Loader2 aria-hidden className="size-4 animate-spin" /> : <Mail aria-hidden className="size-4" />}
            {submitting ? "Submitting…" : isCareerProject ? "Send Career Portfolio Inquiry" : isWebsiteProject ? "Send Project Inquiry" : "Send Message"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
