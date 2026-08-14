"use client";

import { createContext, FormEvent, ReactNode, useContext, useEffect, useRef, useState } from "react";
import { Agent } from "@atproto/api";
import { BrowserOAuthClient } from "@atproto/oauth-client-browser";
import { Check, Loader2, LogIn, LogOut, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { fetchProfile, normalizeActorInput, type BlueskyProfile } from "@/lib/bluesky-network";

const CLIENT_ID = "https://rukhlabs.com/oauth-client-metadata.json";
const SESSION_DID_KEY = "rukh:bluesky-oauth-session-did";

type Phase = "loading" | "anonymous" | "authenticating" | "connected";
type ContextValue = {
  phase: Phase;
  available: boolean;
  did: string | null;
  profile: BlueskyProfile | null;
  error: string;
  signIn: (handle: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const Context = createContext<ContextValue | null>(null);

function isProductionHost() {
  if (typeof window === "undefined") return false;
  return ["rukhlabs.com", "www.rukhlabs.com"].includes(window.location.hostname.toLowerCase());
}

export function AdvancedBlueskyOAuthProvider({ children }: { children: ReactNode }) {
  const clientRef = useRef<BrowserOAuthClient | null>(null);
  const [phase, setPhase] = useState<Phase>("loading");
  const [available, setAvailable] = useState(false);
  const [did, setDid] = useState<string | null>(null);
  const [profile, setProfile] = useState<BlueskyProfile | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function attach(session: Awaited<ReturnType<BrowserOAuthClient["restore"]>>) {
      const agent = new Agent(session);
      const nextDid = agent.accountDid;
      if (!cancelled) {
        setDid(nextDid);
        setPhase("connected");
        try { setProfile(await fetchProfile(nextDid)); } catch { setProfile(null); }
      }
      window.localStorage.setItem(SESSION_DID_KEY, nextDid);
    }

    void (async () => {
      const supported = isProductionHost();
      if (!cancelled) setAvailable(supported);
      if (!supported) return setPhase("anonymous");
      try {
        const client = await BrowserOAuthClient.load({ clientId: CLIENT_ID, handleResolver: "https://bsky.social" });
        if (cancelled) return;
        clientRef.current = client;
        const initialized = await client.init();
        if (initialized?.session) return void (await attach(initialized.session));
        const storedDid = window.localStorage.getItem(SESSION_DID_KEY);
        if (storedDid) {
          try { return void (await attach(await client.restore(storedDid))); } catch { window.localStorage.removeItem(SESSION_DID_KEY); }
        }
        if (!cancelled) setPhase("anonymous");
      } catch {
        if (!cancelled) {
          setError("Bluesky sign-in is temporarily unavailable.");
          setPhase("anonymous");
        }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  async function signIn(input: string) {
    const client = clientRef.current;
    const handle = normalizeActorInput(input);
    if (!available || !client) return setError("Bluesky OAuth activates on rukhlabs.com.");
    if (!handle) return setError("Enter your Bluesky handle.");
    setPhase("authenticating");
    setError("");
    try {
      const redirectUri = `${window.location.origin}/tools/bluesky-network-advanced/app`;
      const session = await client.signIn(handle, { display: "popup", prompt: "login", redirect_uri: redirectUri });
      const agent = new Agent(session);
      const nextDid = agent.accountDid;
      setDid(nextDid);
      setPhase("connected");
      window.localStorage.setItem(SESSION_DID_KEY, nextDid);
      try { setProfile(await fetchProfile(nextDid)); } catch { setProfile(null); }
    } catch (caught) {
      setPhase("anonymous");
      setError(caught instanceof Error ? caught.message : "Bluesky sign-in failed.");
    }
  }

  async function signOut() {
    try { if (clientRef.current && did) await clientRef.current.revoke(did); } catch { /* local sign-out still succeeds */ }
    window.localStorage.removeItem(SESSION_DID_KEY);
    setDid(null);
    setProfile(null);
    setPhase("anonymous");
  }

  return <Context.Provider value={{ phase, available, did, profile, error, signIn, signOut }}>{children}</Context.Provider>;
}

export function useAdvancedBlueskyOAuth() {
  const value = useContext(Context);
  if (!value) throw new Error("useAdvancedBlueskyOAuth must be inside AdvancedBlueskyOAuthProvider.");
  return value;
}

export function RequiredBlueskyConnection() {
  const oauth = useAdvancedBlueskyOAuth();
  const [handle, setHandle] = useState("");
  const connected = oauth.phase === "connected" && Boolean(oauth.did);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void oauth.signIn(handle);
  }

  if (connected) {
    return (
      <Card className="border-emerald-300/18 bg-emerald-300/[0.035] p-4 sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-full bg-emerald-300/10 text-emerald-200"><Check className="size-4" aria-hidden /></span><div><p className="text-sm font-semibold text-white">Bluesky account connected</p><p className="text-xs text-white/45">@{oauth.profile?.handle ?? oauth.did}</p></div></div>
          <Button variant="ghost" size="sm" onClick={() => void oauth.signOut()}><LogOut className="size-4" aria-hidden />Disconnect</Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="border-[#16c8ff]/25 p-5 sm:p-7">
      <div className="flex gap-4"><ShieldCheck className="mt-1 size-6 shrink-0 text-[#8ce8ff]" aria-hidden /><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8ce8ff]">Required</p><h2 className="mt-2 text-2xl font-semibold text-white">Connect the Bluesky account this workspace belongs to.</h2><p className="mt-2 text-sm leading-6 text-white/54">Advanced Network is persistent and account-specific. Rukh Labs never asks for your Bluesky password; authorization happens through AT Protocol OAuth.</p></div></div>
      <form onSubmit={submit} className="mt-6 flex flex-col gap-3 sm:flex-row"><input value={handle} onChange={(e) => setHandle(e.target.value)} placeholder="you.bsky.social" disabled={!oauth.available || oauth.phase === "authenticating"} className="h-11 flex-1 rounded-xl border border-white/12 bg-black/25 px-4 text-sm text-white outline-none focus:border-[#16c8ff]/55 focus:ring-4 focus:ring-[#16c8ff]/10 disabled:opacity-45" /><Button type="submit" variant="glass" disabled={!handle.trim() || !oauth.available || oauth.phase === "authenticating"}>{oauth.phase === "authenticating" ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <LogIn className="size-4" aria-hidden />}{oauth.phase === "authenticating" ? "Connecting…" : "Connect Bluesky"}</Button></form>
      {!oauth.available ? <p className="mt-3 text-xs text-[#ffe4a0]/70">OAuth activates on the production rukhlabs.com domain. Preview deployments can still render and test the rest of the workspace.</p> : null}
      {oauth.error ? <p role="alert" className="mt-3 text-sm text-[#ffb4b8]">{oauth.error}</p> : null}
    </Card>
  );
}
