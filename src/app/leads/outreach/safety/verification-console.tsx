"use client";

import { FormEvent, useState } from "react";

export function VerificationConsole() {
  const [leadId, setLeadId] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"valid" | "invalid">("valid");
  const [source, setSource] = useState("external-verifier");
  const [evidence, setEvidence] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");

    try {
      const response = await fetch("/api/leads/outreach/safety", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "verify",
          leadId,
          email,
          status,
          source,
          evidence,
        }),
      });
      const data = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Verification could not be saved.");
      }
      setMessage(`${email} recorded as ${status}.`);
      setEvidence("");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Verification could not be saved.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="grid gap-4 rounded-2xl border border-white/10 bg-white/[0.035] p-5 lg:grid-cols-2"
    >
      <div className="lg:col-span-2">
        <h2 className="text-lg font-semibold text-white">
          Record exact-address verification
        </h2>
        <p className="mt-1 text-sm text-slate-400">
          This records a result; it does not verify an address by itself. Use an
          external verifier, provider-confirmed address, or confirmed
          correspondence.
        </p>
      </div>

      <label className="grid gap-1.5 text-sm text-slate-300">
        Lead ID
        <input
          required
          value={leadId}
          onChange={(event) => setLeadId(event.target.value)}
          className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-white"
        />
      </label>

      <label className="grid gap-1.5 text-sm text-slate-300">
        Exact email
        <input
          required
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-white"
        />
      </label>

      <label className="grid gap-1.5 text-sm text-slate-300">
        Result
        <select
          value={status}
          onChange={(event) =>
            setStatus(event.target.value as "valid" | "invalid")
          }
          className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-white"
        >
          <option value="valid">Valid</option>
          <option value="invalid">Invalid / suppress</option>
        </select>
      </label>

      <label className="grid gap-1.5 text-sm text-slate-300">
        Verification source
        <select
          value={source}
          onChange={(event) => setSource(event.target.value)}
          className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-white"
        >
          <option value="external-verifier">External verifier</option>
          <option value="provider-confirmed">Provider-confirmed</option>
          <option value="confirmed-correspondence">
            Confirmed correspondence
          </option>
        </select>
      </label>

      <label className="grid gap-1.5 text-sm text-slate-300 lg:col-span-2">
        Evidence note
        <textarea
          required
          minLength={8}
          rows={3}
          value={evidence}
          onChange={(event) => setEvidence(event.target.value)}
          className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-white"
        />
      </label>

      <div className="flex items-center gap-3 lg:col-span-2">
        <button
          disabled={saving}
          className="rounded-xl bg-cyan-300 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Record verification"}
        </button>
        {message ? <p className="text-sm text-slate-300">{message}</p> : null}
      </div>
    </form>
  );
}
