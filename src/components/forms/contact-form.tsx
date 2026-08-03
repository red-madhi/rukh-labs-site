"use client";

import { FormEvent, useState } from "react";
import { CheckCircle2, ExternalLink, Globe2, Mail } from "lucide-react";
import { Button, buttonStyles } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { siteConfig } from "@/lib/site-config";
import { designDirections, websitePackages } from "@/lib/web-development";

const WEBSITE_REASON = "Website design project";

const projectTypes = [
  "A new website",
  "A redesign of an existing website",
  "A landing page or campaign site",
  "A creator, portfolio, or publication site",
  "New features for an existing website",
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
const inputStyles = `${controlStyles} h-12`;
const labelStyles = "text-sm font-medium text-white/78";

type ContactFormProps = {
  initialInquiry?: string;
  initialPackage?: string;
  initialDesign?: string;
};

export function ContactForm({
  initialInquiry,
  initialPackage,
  initialDesign,
}: ContactFormProps) {
  const selectedPackage = websitePackages.some(
    (websitePackage) => websitePackage.id === initialPackage,
  )
    ? initialPackage
    : "Not sure yet";
  const selectedDesign = designDirections.some(
    (direction) => direction.slug === initialDesign,
  )
    ? initialDesign
    : "Not sure yet";

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    reason: initialInquiry === "website" ? WEBSITE_REASON : siteConfig.contactReasons[0],
    organization: "",
    projectType: projectTypes[0],
    websitePackage: selectedPackage ?? "Not sure yet",
    designDirection: selectedDesign ?? "Not sure yet",
    currentWebsite: "",
    budget: budgetRanges[1],
    timeline: timelines[2],
    referral: "",
    message: "",
  });
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const isWebsiteProject = form.reason === WEBSITE_REASON;

  function updateField(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function openEmailDraft() {
    const packageLabel =
      websitePackages.find((websitePackage) => websitePackage.id === form.websitePackage)
        ?.name ?? form.websitePackage;
    const designLabel =
      designDirections.find((direction) => direction.slug === form.designDirection)
        ?.name ?? form.designDirection;
    const subject = isWebsiteProject
      ? `Website project inquiry${form.organization.trim() ? ` — ${form.organization.trim()}` : ""}`
      : `${form.reason} — ${form.name.trim()}`;

    const lines = isWebsiteProject
      ? [
          "WEBSITE PROJECT INQUIRY",
          "",
          `Name: ${form.name.trim()}`,
          `Email: ${form.email.trim()}`,
          `Phone: ${form.phone.trim() || "Not provided"}`,
          `Business / brand: ${form.organization.trim() || "Not provided"}`,
          "",
          `Project type: ${form.projectType}`,
          `Package interest: ${packageLabel}`,
          `Design direction: ${designLabel}`,
          `Current website: ${form.currentWebsite.trim() || "None / not provided"}`,
          `Budget: ${form.budget}`,
          `Preferred timeline: ${form.timeline}`,
          "",
          "PROJECT GOALS / DETAILS",
          form.message.trim(),
          "",
          `How they found Rukh Labs: ${form.referral.trim() || "Not provided"}`,
        ]
      : [
          form.reason.toUpperCase(),
          "",
          `Name: ${form.name.trim()}`,
          `Email: ${form.email.trim()}`,
          `Phone: ${form.phone.trim() || "Not provided"}`,
          "",
          form.message.trim(),
        ];

    window.location.href = `mailto:${siteConfig.contactEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join("\n"))}`;
    setSubmitted(true);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
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

    if (isWebsiteProject && !form.organization.trim()) {
      setError("Enter your business, brand, or project name.");
      return;
    }

    if (form.message.trim().length < 20) {
      setError(
        isWebsiteProject
          ? "Tell me a little more about what the website needs to accomplish."
          : "Add a little more detail to the message.",
      );
      return;
    }

    openEmailDraft();
  }

  if (submitted) {
    return (
      <Card className="border-[color:var(--brand-red)]/25 p-6 sm:p-8">
        <div className="flex gap-4">
          <span className="grid size-11 shrink-0 place-items-center rounded-full bg-[#d6ad5b]/12 text-[#f3d99d]">
            <CheckCircle2 aria-hidden className="size-5" />
          </span>
          <div>
            <h2 className="text-xl font-semibold text-white">Your email draft is ready.</h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-white/62">
              Review it in your email app and press send. If the draft did not
              open, use either option below—your project details are still here.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Button onClick={openEmailDraft}>
                <ExternalLink aria-hidden className="size-4" />
                Open draft again
              </Button>
              <a
                href={siteConfig.links.email}
                className={buttonStyles({ variant: "secondary" })}
              >
                <Mail aria-hidden className="size-4" />
                {siteConfig.contactEmail}
              </a>
              <Button variant="ghost" onClick={() => setSubmitted(false)}>
                Edit details
              </Button>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="border-white/12 p-5 sm:p-7">
      <form onSubmit={handleSubmit} className="grid gap-6" noValidate>
        <div className="border-b border-white/10 pb-6">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-lg border border-[color:var(--brand-red)]/28 bg-[color:var(--brand-red)]/10 text-[#ff8e99]">
              {isWebsiteProject ? (
                <Globe2 aria-hidden className="size-4" />
              ) : (
                <Mail aria-hidden className="size-4" />
              )}
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#ff8994]">
                {isWebsiteProject ? "New client inquiry" : "General contact"}
              </p>
              <h2 className="mt-1 text-xl font-semibold text-white">
                {isWebsiteProject ? "Tell me about your website." : "Send Rukh Labs a message."}
              </h2>
            </div>
          </div>
        </div>

        <div>
          <label htmlFor="contact-reason" className={labelStyles}>
            What can I help with?
          </label>
          <select
            id="contact-reason"
            value={form.reason}
            onChange={(event) => updateField("reason", event.target.value)}
            className={inputStyles}
          >
            {siteConfig.contactReasons.map((reason) => (
              <option key={reason}>{reason}</option>
            ))}
          </select>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="contact-name" className={labelStyles}>
              Name <span className="text-[#ff8994]">*</span>
            </label>
            <input
              id="contact-name"
              autoComplete="name"
              value={form.name}
              onChange={(event) => updateField("name", event.target.value)}
              className={inputStyles}
              placeholder="Your name"
              required
            />
          </div>
          <div>
            <label htmlFor="contact-email" className={labelStyles}>
              Email <span className="text-[#ff8994]">*</span>
            </label>
            <input
              id="contact-email"
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={(event) => updateField("email", event.target.value)}
              className={inputStyles}
              placeholder="you@example.com"
              required
            />
          </div>
        </div>

        <div>
          <label htmlFor="contact-phone" className={labelStyles}>
            Phone <span className="text-white/34">(optional)</span>
          </label>
          <input
            id="contact-phone"
            type="tel"
            autoComplete="tel"
            value={form.phone}
            onChange={(event) => updateField("phone", event.target.value)}
            className={inputStyles}
            placeholder="Best number to reach you"
          />
        </div>

        {isWebsiteProject ? (
          <>
            <div className="border-t border-white/10 pt-6">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#e6bd73]">
                Project basics
              </p>
            </div>
            <div>
              <label htmlFor="contact-organization" className={labelStyles}>
                Business, brand, or project name <span className="text-[#ff8994]">*</span>
              </label>
              <input
                id="contact-organization"
                autoComplete="organization"
                value={form.organization}
                onChange={(event) => updateField("organization", event.target.value)}
                className={inputStyles}
                placeholder="What should the website represent?"
                required
              />
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="contact-project-type" className={labelStyles}>
                  Project type
                </label>
                <select
                  id="contact-project-type"
                  value={form.projectType}
                  onChange={(event) => updateField("projectType", event.target.value)}
                  className={inputStyles}
                >
                  {projectTypes.map((projectType) => (
                    <option key={projectType}>{projectType}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="contact-current-website" className={labelStyles}>
                  Current website <span className="text-white/34">(optional)</span>
                </label>
                <input
                  id="contact-current-website"
                  type="url"
                  inputMode="url"
                  value={form.currentWebsite}
                  onChange={(event) => updateField("currentWebsite", event.target.value)}
                  className={inputStyles}
                  placeholder="https://"
                />
              </div>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="contact-package" className={labelStyles}>
                  Package interest
                </label>
                <select
                  id="contact-package"
                  value={form.websitePackage}
                  onChange={(event) => updateField("websitePackage", event.target.value)}
                  className={inputStyles}
                >
                  <option>Not sure yet</option>
                  {websitePackages.map((websitePackage) => (
                    <option key={websitePackage.id} value={websitePackage.id}>
                      {websitePackage.name} — {websitePackage.price}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="contact-design" className={labelStyles}>
                  Design direction
                </label>
                <select
                  id="contact-design"
                  value={form.designDirection}
                  onChange={(event) => updateField("designDirection", event.target.value)}
                  className={inputStyles}
                >
                  <option>Not sure yet</option>
                  {designDirections.map((direction) => (
                    <option key={direction.slug} value={direction.slug}>
                      {direction.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="contact-budget" className={labelStyles}>
                  Estimated budget
                </label>
                <select
                  id="contact-budget"
                  value={form.budget}
                  onChange={(event) => updateField("budget", event.target.value)}
                  className={inputStyles}
                >
                  {budgetRanges.map((budget) => (
                    <option key={budget}>{budget}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="contact-timeline" className={labelStyles}>
                  Preferred timeline
                </label>
                <select
                  id="contact-timeline"
                  value={form.timeline}
                  onChange={(event) => updateField("timeline", event.target.value)}
                  className={inputStyles}
                >
                  {timelines.map((timeline) => (
                    <option key={timeline}>{timeline}</option>
                  ))}
                </select>
              </div>
            </div>
          </>
        ) : null}

        <div>
          <label htmlFor="contact-message" className={labelStyles}>
            {isWebsiteProject ? "What should the website accomplish?" : "Message"}{" "}
            <span className="text-[#ff8994]">*</span>
          </label>
          <textarea
            id="contact-message"
            value={form.message}
            onChange={(event) => updateField("message", event.target.value)}
            rows={isWebsiteProject ? 7 : 6}
            maxLength={1800}
            className={`${controlStyles} min-h-44 resize-y py-3 leading-6`}
            placeholder={
              isWebsiteProject
                ? "Describe your audience, goals, must-have pages or features, and anything that would make the project a success."
                : "How can Rukh Labs help?"
            }
            required
          />
        </div>

        {isWebsiteProject ? (
          <div>
            <label htmlFor="contact-referral" className={labelStyles}>
              How did you find Rukh Labs? <span className="text-white/34">(optional)</span>
            </label>
            <input
              id="contact-referral"
              value={form.referral}
              onChange={(event) => updateField("referral", event.target.value)}
              className={inputStyles}
              placeholder="Search, social media, referral…"
            />
          </div>
        ) : null}

        {error ? (
          <p role="alert" className="rounded-lg border border-[#ff7f73]/20 bg-[#ff7f73]/8 px-4 py-3 text-sm text-[#ffc0b8]">
            {error}
          </p>
        ) : null}

        <div className="flex flex-col gap-3 border-t border-white/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-sm text-xs leading-5 text-white/40">
            This opens a populated draft in your email app. Nothing is sent until you review and send it.
          </p>
          <Button type="submit" size="lg" className="shrink-0">
            <Mail aria-hidden className="size-4" />
            {isWebsiteProject ? "Send Project Inquiry" : "Send Message"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
