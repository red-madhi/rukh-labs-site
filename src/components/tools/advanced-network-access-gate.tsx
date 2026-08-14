"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { KeyRound, Loader2, ShieldCheck } from "lucide-react";
import { Button, buttonStyles } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function AdvancedNetworkAccessGate() {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [working, setWorking] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setWorking(true);
    try {
      const response = await fetch("/api/advanced-network/access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error || "Access could not be verified.");
      window.location.reload();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Access could not be verified.");
      setWorking(false);
    }
  }

  return (
    <Card className="mx-auto max-w-xl border-[#16c8ff]/24 p-6 sm:p-8">
      <span className="grid size-12 place-items-center rounded-xl border border-[#16c8ff]/25 bg-[#16c8ff]/10 text-[#8ce8ff]"><ShieldCheck className="size-5" aria-hidden /></span>
      <h2 className="mt-5 text-2xl font-semibold text-white">Private-beta access required</h2>
      <p className="mt-3 text-sm leading-7 text-white/56">This is the protected Advanced Network workspace. Enter the access code supplied by Rukh Labs, then connect the Bluesky account the analysis belongs to.</p>
      <form onSubmit={submit} className="mt-6 grid gap-3">
        <label htmlFor="advanced-access-code" className="text-xs font-semibold uppercase tracking-[0.12em] text-white/42">Access code</label>
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1"><KeyRound className="pointer-events-none absolute left-3.5 top-3.5 size-4 text-white/35" aria-hidden /><input id="advanced-access-code" type="password" autoComplete="current-password" value={code} onChange={(e) => setCode(e.target.value)} className="h-11 w-full rounded-xl border border-white/12 bg-black/25 pl-10 pr-4 text-sm text-white outline-none focus:border-[#16c8ff]/55 focus:ring-4 focus:ring-[#16c8ff]/10" /></div>
          <Button type="submit" variant="glass" disabled={!code || working}>{working ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}{working ? "Checking…" : "Enter workspace"}</Button>
        </div>
        {error ? <p role="alert" className="text-sm text-[#ffb4b8]">{error}</p> : null}
      </form>
      <div className="mt-7 border-t border-white/10 pt-5"><p className="text-sm text-white/48">No code yet?</p><Link href="/tools/bluesky-network-advanced#request-access" className={buttonStyles({ variant: "ghost", size: "sm", className: "mt-2 px-0" })}>Request private-beta access</Link></div>
    </Card>
  );
}
