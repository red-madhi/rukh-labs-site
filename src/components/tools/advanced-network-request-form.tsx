"use client";

import { FormEvent, useState } from "react";
import { CheckCircle2, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const fieldClass =
  "mt-2 w-full rounded-xl border border-white/12 bg-[#090707]/80 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-[#16c8ff]/55 focus:ring-4 focus:ring-[#16c8ff]/10";

export function AdvancedNetworkRequestForm() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    blueskyHandle: "",
    organization: "",
    goals: "",
    direction: "",
    website: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!form.name.trim()) return setError("Enter your name.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return setError("Enter a valid email.");
    if (!form.blueskyHandle.trim()) return setError("Enter the Bluesky account you want to grow.");
    if (form.goals.trim().length < 20) return setError("Tell us a little more about what you want to accomplish.");

    setSubmitting(true);
    try {
      const message = [
        `Bluesky handle: ${form.blueskyHandle.trim()}`,
        form.organization.trim() ? `Organization / project: ${form.organization.trim()}` : "",
        form.direction.trim() ? `Desired network direction: ${form.direction.trim()}` : "",
        "",
        "Growth goals:",
        form.goals.trim(),
      ].filter(Boolean).join("\n");
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          reason: "Advanced Bluesky Network access",
          organization: form.organization,
          projectType: "Private beta access",
          message,
          sourcePage: "/tools/bluesky-network-advanced",
          referrer: document.referrer,
          website: form.website,
          utm: Object.fromEntries(
            [...new URL(window.location.href).searchParams.entries()].filter(([key]) => key.startsWith("utm_")),
          ),
        }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error || "Request could not be submitted.");
      setSubmitted(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Request could not be submitted.");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <Card className="border-[#16c8ff]/25 p-6 sm:p-8">
        <CheckCircle2 className="size-8 text-[#8ce8ff]" aria-hidden />
        <h3 className="mt-4 text-2xl font-semibold text-white">Access request received.</h3>
        <p className="mt-3 text-sm leading-7 text-white/58">
          Rukh Labs has your Bluesky account and goals. Private-beta access is reviewed manually so the early cohort stays manageable while the analysis engine is being calibrated.
        </p>
      </Card>
    );
  }

  return (
    <Card className="border-[#16c8ff]/22 p-5 sm:p-7">
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8ce8ff]">Private beta</p>
        <h3 className="mt-2 text-2xl font-semibold text-white">Request Advanced Network access</h3>
        <p className="mt-2 text-sm leading-6 text-white/52">Tell us where you want your Bluesky network to go. This is also the waitlist for paid access.</p>
      </div>
      <form onSubmit={submit} className="grid gap-5" noValidate>
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="text-sm text-white/72">Name<input className={fieldClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
          <label className="text-sm text-white/72">Email<input type="email" className={fieldClass} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
        </div>
        <label className="text-sm text-white/72">Bluesky handle<input className={fieldClass} placeholder="you.bsky.social" value={form.blueskyHandle} onChange={(e) => setForm({ ...form, blueskyHandle: e.target.value })} /></label>
        <label className="text-sm text-white/72">Business, project, publication, or creator name <span className="text-white/35">(optional)</span><input className={fieldClass} value={form.organization} onChange={(e) => setForm({ ...form, organization: e.target.value })} /></label>
        <label className="text-sm text-white/72">Where do you want to expand? <span className="text-white/35">(optional)</span><input className={fieldClass} placeholder="Film & TV, indie games, politics, a specific account…" value={form.direction} onChange={(e) => setForm({ ...form, direction: e.target.value })} /></label>
        <label className="text-sm text-white/72">What would make this useful for you?<textarea rows={5} className={fieldClass + " resize-y"} value={form.goals} onChange={(e) => setForm({ ...form, goals: e.target.value })} placeholder="Who are you trying to reach, and what outcome are you hoping for?" /></label>
        <input aria-hidden tabIndex={-1} autoComplete="off" className="hidden" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} />
        {error ? <p role="alert" className="text-sm text-[#ffb4b8]">{error}</p> : null}
        <Button type="submit" variant="glass" disabled={submitting} className="w-full sm:w-fit">
          {submitting ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Send className="size-4" aria-hidden />}
          {submitting ? "Sending…" : "Request access"}
        </Button>
      </form>
    </Card>
  );
}
