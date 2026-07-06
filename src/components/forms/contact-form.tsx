"use client";

import { FormEvent, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { siteConfig } from "@/lib/site-config";

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function ContactForm() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    reason: siteConfig.contactReasons[0],
    message: "",
  });
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  function updateField(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!form.name.trim()) {
      setError("Enter your name.");
      return;
    }

    if (!isValidEmail(form.email)) {
      setError("Enter a valid email address.");
      return;
    }

    if (form.message.trim().length < 10) {
      setError("Add a little more detail to the message.");
      return;
    }

    setSubmitted(true);
  }

  if (submitted) {
    return (
      <Card className="p-6">
        <div className="flex gap-4">
          <span className="grid size-11 shrink-0 place-items-center rounded-full bg-[#d6ad5b]/12 text-[#f3d99d]">
            <CheckCircle2 aria-hidden className="size-5" />
          </span>
          <div>
            <h2 className="text-xl font-semibold text-white">Message staged.</h2>
            <p className="mt-2 text-sm leading-6 text-white/62">
              This is a frontend-only form for now. The production version can
              connect to email, CRM, or a private intake queue.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <form onSubmit={handleSubmit} className="grid gap-5" noValidate>
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="contact-name" className="text-sm font-medium text-white/78">
              Name
            </label>
            <input
              id="contact-name"
              value={form.name}
              onChange={(event) => updateField("name", event.target.value)}
              className="mt-2 h-12 w-full rounded-lg border border-white/12 bg-[#090707]/80 px-4 text-sm text-white outline-none transition placeholder:text-white/34 focus:border-[color:var(--brand-red)]/65 focus:ring-4 focus:ring-[color:var(--brand-red)]/10"
              required
            />
          </div>
          <div>
            <label htmlFor="contact-email" className="text-sm font-medium text-white/78">
              Email
            </label>
            <input
              id="contact-email"
              type="email"
              value={form.email}
              onChange={(event) => updateField("email", event.target.value)}
              className="mt-2 h-12 w-full rounded-lg border border-white/12 bg-[#090707]/80 px-4 text-sm text-white outline-none transition placeholder:text-white/34 focus:border-[color:var(--brand-red)]/65 focus:ring-4 focus:ring-[color:var(--brand-red)]/10"
              required
            />
          </div>
        </div>
        <div>
          <label htmlFor="contact-reason" className="text-sm font-medium text-white/78">
            Product interest
          </label>
          <select
            id="contact-reason"
            value={form.reason}
            onChange={(event) => updateField("reason", event.target.value)}
            className="mt-2 h-12 w-full rounded-lg border border-white/12 bg-[#090707]/80 px-4 text-sm text-white outline-none transition focus:border-[color:var(--brand-red)]/65 focus:ring-4 focus:ring-[color:var(--brand-red)]/10"
          >
            {siteConfig.contactReasons.map((reason) => (
              <option key={reason}>{reason}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="contact-message" className="text-sm font-medium text-white/78">
            Message
          </label>
          <textarea
            id="contact-message"
            value={form.message}
            onChange={(event) => updateField("message", event.target.value)}
            rows={6}
            className="mt-2 w-full resize-y rounded-lg border border-white/12 bg-[#090707]/80 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/34 focus:border-[color:var(--brand-red)]/65 focus:ring-4 focus:ring-[color:var(--brand-red)]/10"
            required
          />
        </div>
        {error ? <p className="text-sm text-[#ffb4a8]">{error}</p> : null}
        <Button type="submit" size="lg" className="w-full sm:w-auto sm:justify-self-start">
          Send Message
        </Button>
      </form>
    </Card>
  );
}
