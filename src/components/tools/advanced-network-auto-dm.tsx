"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Bot,
  CalendarClock,
  KeyRound,
  Loader2,
  RefreshCw,
  Send,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const FALLBACK_MESSAGE =
  "hey comrade, thanks for the follow — i build weird internet stuff. if you’re making something too, send it my way. i’m nosy.";

type AutomationState = {
  actorHandle: string;
  message: string;
  enabled: boolean;
  appPasswordSaved: boolean;
  baselineSeeded: boolean;
  lastSyncAt: string | null;
  lastSyncError: string | null;
  lastWeeklyPostAt: string | null;
  stats: {
    baseline: number;
    sent: number;
    queuedForMonday: number;
    retrying: number;
    failed: number;
  };
};

type ApiResponse = {
  state?: AutomationState;
  error?: string;
  result?: {
    discovered?: number;
    sent?: number;
    queuedForMonday?: number;
    skipped?: boolean;
  };
} & Partial<AutomationState>;

function displayTime(value: string | null) {
  if (!value) return "Never";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "Never";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function AdvancedNetworkAutoDm() {
  const [state, setState] = useState<AutomationState | null>(null);
  const [actorHandle, setActorHandle] = useState("rukhlabs.bsky.social");
  const [message, setMessage] = useState(FALLBACK_MESSAGE);
  const [appPassword, setAppPassword] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [working, setWorking] = useState<"load" | "save" | "sync" | null>("load");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const applyState = useCallback((next: AutomationState) => {
    setState(next);
    setActorHandle(next.actorHandle);
    setMessage(next.message);
    setEnabled(next.enabled);
  }, []);

  const load = useCallback(async () => {
    setWorking("load");
    setError("");
    try {
      const response = await fetch("/api/advanced-network/automation", {
        cache: "no-store",
      });
      const body = (await response.json()) as ApiResponse;
      if (!response.ok) throw new Error(body.error || "Could not load Auto DM.");
      applyState(body as AutomationState);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load Auto DM.");
    } finally {
      setWorking(null);
    }
  }, [applyState]);

  useEffect(() => {
    void load();
  }, [load]);

  async function save() {
    setWorking("save");
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/advanced-network/automation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save",
          actorHandle,
          message,
          enabled,
          ...(appPassword.trim() ? { appPassword: appPassword.trim() } : {}),
        }),
      });
      const body = (await response.json()) as ApiResponse;
      if (!response.ok || !body.state) {
        throw new Error(body.error || "Could not save Auto DM.");
      }
      applyState(body.state);
      setAppPassword("");
      setNotice(
        enabled
          ? "Saved. Current followers are excluded; only future followers can receive the greeting."
          : "Saved. Auto DM is off.",
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save Auto DM.");
    } finally {
      setWorking(null);
    }
  }

  async function syncNow() {
    setWorking("sync");
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/advanced-network/automation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "sync" }),
      });
      const body = (await response.json()) as ApiResponse;
      if (!response.ok || !body.state) {
        throw new Error(body.error || "Follower sync failed.");
      }
      applyState(body.state);
      const result = body.result;
      setNotice(
        result?.skipped
          ? "Sync checked in; nothing needed doing."
          : `Sync complete: ${result?.discovered ?? 0} new · ${result?.sent ?? 0} DMed · ${result?.queuedForMonday ?? 0} queued for Monday.`,
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Follower sync failed.");
    } finally {
      setWorking(null);
    }
  }

  if (working === "load" && !state) {
    return (
      <Card className="min-w-0 max-w-full border-[#16c8ff]/20 p-5 sm:p-6">
        <div className="flex items-center gap-3 text-sm text-white/58">
          <Loader2 className="size-4 animate-spin text-[#8ce8ff]" aria-hidden />
          Loading Auto DM…
        </div>
      </Card>
    );
  }

  return (
    <Card className="min-w-0 max-w-full overflow-hidden border-[#16c8ff]/25 bg-[radial-gradient(circle_at_90%_0%,rgba(22,200,255,0.10),transparent_40%),rgba(14,12,14,0.76)] p-4 sm:p-7">
      <div className="flex min-w-0 flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 max-w-3xl">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#16c8ff]/25 bg-[#16c8ff]/[0.06] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.13em] text-[#8ce8ff]">
              <Bot className="size-3.5" aria-hidden />
              Auto DM
            </span>
            <span
              className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${
                state?.enabled
                  ? "border-emerald-300/25 bg-emerald-300/[0.06] text-emerald-200"
                  : "border-white/10 bg-white/[0.025] text-white/38"
              }`}
            >
              {state?.enabled ? "Running" : "Off"}
            </span>
          </div>
          <h2 className="mt-3 text-2xl font-semibold tracking-[-0.02em] text-white sm:text-3xl">
            New follower → hello. No DMs → Monday roll call.
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-white/54">
            IAZMA checks for new followers in the background. Each DID gets one welcome attempt. If DMs are unavailable on that first check, the account goes into the next Monday 8am Mountain thank-you thread instead.
          </p>
        </div>

        <Button
          variant="ghost"
          size="sm"
          className="self-start"
          onClick={() => void syncNow()}
          disabled={Boolean(working) || !state?.enabled}
        >
          {working === "sync" ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <RefreshCw className="size-4" aria-hidden />
          )}
          Sync now
        </Button>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {[
          ["Excluded baseline", state?.stats.baseline ?? 0],
          ["DMs sent", state?.stats.sent ?? 0],
          ["Monday queue", state?.stats.queuedForMonday ?? 0],
          ["Retrying", state?.stats.retrying ?? 0],
          ["Failed", state?.stats.failed ?? 0],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border border-white/9 bg-black/15 p-3.5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.11em] text-white/32">
              {label}
            </p>
            <p className="mt-1 text-2xl font-semibold text-white">{value}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(280px,0.68fr)]">
        <div className="min-w-0 rounded-2xl border border-white/10 bg-black/15 p-4 sm:p-5">
          <div className="grid gap-4">
            <label className="grid gap-1.5">
              <span className="text-xs font-semibold uppercase tracking-[0.1em] text-white/42">
                Bluesky account
              </span>
              <div className="flex items-center rounded-xl border border-white/10 bg-black/25 px-3 focus-within:border-[#16c8ff]/35">
                <span className="text-white/30">@</span>
                <input
                  value={actorHandle}
                  onChange={(event) => setActorHandle(event.target.value.replace(/^@/, ""))}
                  className="min-w-0 flex-1 bg-transparent px-1 py-3 text-sm text-white outline-none placeholder:text-white/20"
                  placeholder="handle.bsky.social"
                  spellCheck={false}
                />
              </div>
            </label>

            <label className="grid gap-1.5">
              <span className="text-xs font-semibold uppercase tracking-[0.1em] text-white/42">
                Welcome DM
              </span>
              <textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                rows={4}
                className="min-h-28 w-full resize-y rounded-xl border border-white/10 bg-black/25 px-3 py-3 text-sm leading-6 text-white outline-none placeholder:text-white/20 focus:border-[#16c8ff]/35"
              />
            </label>

            <label className="grid gap-1.5">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.1em] text-white/42">
                <KeyRound className="size-3.5" aria-hidden />
                Chat-enabled app password
              </span>
              <input
                type="password"
                value={appPassword}
                onChange={(event) => setAppPassword(event.target.value)}
                autoComplete="new-password"
                className="w-full rounded-xl border border-white/10 bg-black/25 px-3 py-3 text-sm text-white outline-none placeholder:text-white/22 focus:border-[#16c8ff]/35"
                placeholder={
                  state?.appPasswordSaved
                    ? "Saved — leave blank to keep it"
                    : "Paste a Bluesky app password"
                }
              />
              <p className="text-[11px] leading-5 text-white/30">
                The password is validated against this account, encrypted before storage, and never returned to the browser. It must be created with direct-message access enabled.
              </p>
            </label>

            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/9 bg-white/[0.02] p-3.5">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(event) => setEnabled(event.target.checked)}
                className="mt-1 size-4 accent-cyan-300"
              />
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-white">Enable Auto DM</span>
                <span className="mt-1 block text-xs leading-5 text-white/36">
                  The first enable seeds every current follower as baseline. Nobody already following you gets a surprise retroactive DM.
                </span>
              </span>
            </label>

            <div className="flex flex-wrap items-center gap-3">
              <Button onClick={() => void save()} disabled={Boolean(working)}>
                {working === "save" ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : (
                  <Send className="size-4" aria-hidden />
                )}
                Save automation
              </Button>
              {state?.appPasswordSaved ? (
                <span className="inline-flex items-center gap-1.5 text-xs text-emerald-200/80">
                  <ShieldCheck className="size-4" aria-hidden />
                  Credential saved
                </span>
              ) : null}
            </div>
          </div>
        </div>

        <div className="min-w-0 space-y-3">
          <div className="rounded-2xl border border-[#aa63ff]/16 bg-[#aa63ff]/[0.035] p-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.11em] text-[#d8b5ff]">
              <CalendarClock className="size-4" aria-hidden />
              Monday fallback
            </div>
            <p className="mt-3 whitespace-pre-line text-sm leading-6 text-white/66">
              {"Thanks for the #follow, y'all.\n@handle.one\n@handle.two"}
            </p>
            <p className="mt-3 text-xs leading-5 text-white/34">
              Handles are packed vertically under Bluesky's post limit. Overflow becomes replies beginning “And y'all too...”. Successful mentions are marked immediately, so a partial failure cannot tag the same person twice.
            </p>
          </div>

          <div className="rounded-2xl border border-white/9 bg-black/15 p-4 text-xs leading-6 text-white/42">
            <div className="flex justify-between gap-4">
              <span>Baseline ready</span>
              <strong className="font-semibold text-white/72">{state?.baselineSeeded ? "Yes" : "No"}</strong>
            </div>
            <div className="mt-1 flex justify-between gap-4">
              <span>Last follower sync</span>
              <strong className="font-semibold text-white/72">{displayTime(state?.lastSyncAt ?? null)}</strong>
            </div>
            <div className="mt-1 flex justify-between gap-4">
              <span>Last Monday post</span>
              <strong className="font-semibold text-white/72">{displayTime(state?.lastWeeklyPostAt ?? null)}</strong>
            </div>
          </div>

          {state?.lastSyncError ? (
            <div className="rounded-xl border border-red-300/20 bg-red-300/[0.045] px-3.5 py-3 text-xs leading-5 text-red-100/80">
              Last sync error: {state.lastSyncError}
            </div>
          ) : null}
          {error ? (
            <div className="rounded-xl border border-red-300/20 bg-red-300/[0.045] px-3.5 py-3 text-xs leading-5 text-red-100/80">
              {error}
            </div>
          ) : null}
          {notice ? (
            <div className="rounded-xl border border-emerald-300/18 bg-emerald-300/[0.04] px-3.5 py-3 text-xs leading-5 text-emerald-100/80">
              {notice}
            </div>
          ) : null}
        </div>
      </div>
    </Card>
  );
}
