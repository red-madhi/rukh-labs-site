"use client";

import { FormEvent, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { siteConfig } from "@/lib/site-config";

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function WaitlistForm({ defaultInterest }: { defaultInterest?: string }) {
  const [email, setEmail] = useState("");
  const [interest, setInterest] = useState(
    defaultInterest ?? siteConfig.productInterestOptions[0],
  );
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!isValidEmail(email)) {
      setError("Enter a valid email address.");
      return;
    }

    setSubmitted(true);
  }

  if (submitted) {
    return (
      <Card className="p-6">
        <div className="flex gap-4">
          <span className="grid size-11 shrink-0 place-items-center rounded-full bg-[#4db7ff]/12 text-[#9fdcff]">
            <CheckCircle2 aria-hidden className="size-5" />
          </span>
          <div>
            <h3 className="text-lg font-semibold text-white">You&apos;re on the list.</h3>
            <p className="mt-2 text-sm leading-6 text-white/62">
              We&apos;ll contact you when access opens.
            </p>
            <p className="mt-3 text-xs text-white/42">Interest: {interest}</p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-[1fr_220px_auto]">
        <div>
          <label htmlFor="waitlist-email" className="sr-only">
            Email address
          </label>
          <input
            id="waitlist-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            className="h-12 w-full rounded-lg border border-white/12 bg-[#070b12]/80 px-4 text-sm text-white outline-none transition placeholder:text-white/34 focus:border-[#4db7ff]/65 focus:ring-4 focus:ring-[#4db7ff]/10"
            aria-describedby={error ? "waitlist-error" : "waitlist-note"}
            required
          />
        </div>
        <div>
          <label htmlFor="waitlist-interest" className="sr-only">
            Product interest
          </label>
          <select
            id="waitlist-interest"
            value={interest}
            onChange={(event) => setInterest(event.target.value)}
            className="h-12 w-full rounded-lg border border-white/12 bg-[#070b12]/80 px-4 text-sm text-white outline-none transition focus:border-[#4db7ff]/65 focus:ring-4 focus:ring-[#4db7ff]/10"
          >
            {siteConfig.productInterestOptions.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
        </div>
        <Button type="submit" size="lg" className="w-full sm:w-auto">
          Join Beta
        </Button>
      </div>
      {error ? (
        <p id="waitlist-error" className="text-sm text-[#ffb4a8]">
          {error}
        </p>
      ) : (
        <p id="waitlist-note" className="text-sm text-white/46">
          No spam. Just product access, release notes, and major updates.
        </p>
      )}
    </form>
  );
}
