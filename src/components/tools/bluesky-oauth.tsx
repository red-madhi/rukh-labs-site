"use client";

import {
  createContext,
  type FormEvent,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Agent } from "@atproto/api";
import { BrowserOAuthClient } from "@atproto/oauth-client-browser";
import {
  ArrowUpRight,
  Check,
  LoaderCircle,
  LogIn,
  LogOut,
  ShieldCheck,
} from "lucide-react";
import { Button, buttonStyles } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  errorMessage,
  fetchProfile,
  normalizeActorInput,
  type BlueskyProfile,
} from "@/lib/bluesky-network";
import { cn } from "@/lib/utils";

const CLIENT_ID = "https://rukhlabs.com/oauth-client-metadata.json";
const SESSION_DID_KEY = "rukh:bluesky-oauth-session-did";
const PUBLIC_API = "https://public.api.bsky.app";

type AuthPhase = "loading" | "anonymous" | "authenticating" | "connected";
type FollowResult = "followed" | "already-following";

type BlueskyOAuthContextValue = {
  phase: AuthPhase;
  available: boolean;
  did: string | null;
  profile: BlueskyProfile | null;
  error: string;
  signIn: (handle: string) => Promise<void>;
  signOut: () => Promise<void>;
  follow: (did: string) => Promise<FollowResult>;
};

const BlueskyOAuthContext = createContext<BlueskyOAuthContextValue | null>(null);

function isProductionOAuthHost() {
  if (typeof window === "undefined") return false;
  const hostname = window.location.hostname.toLowerCase();
  return hostname === "rukhlabs.com" || hostname === "www.rukhlabs.com";
}

async function relationshipUri(actorDid: string, targetDid: string) {
  const url = new URL("/xrpc/app.bsky.graph.getRelationships", PUBLIC_API);
  url.searchParams.set("actor", actorDid);
  url.searchParams.append("others", targetDid);

  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) return null;

  const payload = (await response.json()) as {
    relationships?: Array<{ did?: string; following?: string }>;
  };
  const relationship = payload.relationships?.find((item) => item.did === targetDid);
  return relationship?.following || null;
}

export function BlueskyOAuthProvider({ children }: { children: ReactNode }) {
  const clientRef = useRef<BrowserOAuthClient | null>(null);
  const agentRef = useRef<Agent | null>(null);
  const [phase, setPhase] = useState<AuthPhase>("loading");
  const [available, setAvailable] = useState(false);
  const [did, setDid] = useState<string | null>(null);
  const [profile, setProfile] = useState<BlueskyProfile | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    const supported = isProductionOAuthHost();
    setAvailable(supported);

    if (!supported) {
      setPhase("anonymous");
      return () => {
        cancelled = true;
      };
    }

    async function attachSession(session: Awaited<ReturnType<BrowserOAuthClient["restore"]>>) {
      const agent = new Agent(session);
      const accountDid = agent.accountDid;
      agentRef.current = agent;
      if (!cancelled) {
        setDid(accountDid);
        setPhase("connected");
        setError("");
      }
      window.localStorage.setItem(SESSION_DID_KEY, accountDid);

      try {
        const nextProfile = await fetchProfile(accountDid);
        if (!cancelled) setProfile(nextProfile);
      } catch {
        if (!cancelled) setProfile(null);
      }
    }

    void (async () => {
      try {
        const client = await BrowserOAuthClient.load({
          clientId: CLIENT_ID,
          handleResolver: "https://bsky.social",
        });
        if (cancelled) return;
        clientRef.current = client;

        const initialized = await client.init();
        if (initialized?.session) {
          await attachSession(initialized.session);
          return;
        }

        const storedDid = window.localStorage.getItem(SESSION_DID_KEY);
        if (storedDid) {
          try {
            const restored = await client.restore(storedDid);
            await attachSession(restored);
            return;
          } catch {
            window.localStorage.removeItem(SESSION_DID_KEY);
          }
        }

        if (!cancelled) setPhase("anonymous");
      } catch (caught) {
        if (caught instanceof Error && caught.name === "LoginContinuedInParentWindowError") {
          return;
        }
        if (!cancelled) {
          setError("Optional Bluesky sign-in is temporarily unavailable. Public scans still work normally.");
          setPhase("anonymous");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  async function signIn(input: string) {
    const client = clientRef.current;
    if (!available || !client) {
      setError("Optional sign-in is available on rukhlabs.com. Public scans do not require it.");
      return;
    }

    const handle = normalizeActorInput(input);
    if (!handle) {
      setError("Enter your Bluesky handle to connect.");
      return;
    }

    setPhase("authenticating");
    setError("");
    try {
      const session = await client.signIn(handle, {
        display: "popup",
        prompt: "login",
        redirect_uri: `${window.location.origin}/tools/bluesky-network`,
      });
      const agent = new Agent(session);
      const accountDid = agent.accountDid;
      agentRef.current = agent;
      setDid(accountDid);
      setPhase("connected");
      window.localStorage.setItem(SESSION_DID_KEY, accountDid);

      try {
        setProfile(await fetchProfile(accountDid));
      } catch {
        setProfile(null);
      }
    } catch (caught) {
      setPhase("anonymous");
      setError(
        caught instanceof Error && /cancel|closed|abort/i.test(caught.message)
          ? "Sign-in was cancelled. Nothing changed; public scans still work without login."
          : errorMessage(caught),
      );
    }
  }

  async function signOut() {
    const client = clientRef.current;
    const accountDid = did;
    setError("");
    try {
      if (client && accountDid) await client.revoke(accountDid);
    } catch {
      // Local sign-out should still succeed if the remote revocation request fails.
    } finally {
      window.localStorage.removeItem(SESSION_DID_KEY);
      agentRef.current = null;
      setDid(null);
      setProfile(null);
      setPhase("anonymous");
    }
  }

  async function follow(targetDid: string): Promise<FollowResult> {
    const agent = agentRef.current;
    const accountDid = did;
    if (!agent || !accountDid) throw new Error("Connect Bluesky before following here.");
    if (targetDid === accountDid) return "already-following";

    const existing = await relationshipUri(accountDid, targetDid);
    if (existing) return "already-following";

    await agent.follow(targetDid);
    return "followed";
  }

  const value = useMemo<BlueskyOAuthContextValue>(
    () => ({ phase, available, did, profile, error, signIn, signOut, follow }),
    [phase, available, did, profile, error],
  );

  return <BlueskyOAuthContext.Provider value={value}>{children}</BlueskyOAuthContext.Provider>;
}

export function useBlueskyOAuth() {
  const value = useContext(BlueskyOAuthContext);
  if (!value) throw new Error("useBlueskyOAuth must be used inside BlueskyOAuthProvider.");
  return value;
}

export function BlueskyOAuthPanel() {
  const { phase, available, did, profile, error, signIn, signOut } = useBlueskyOAuth();
  const [handle, setHandle] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void signIn(handle);
  }

  const connected = phase === "connected" && Boolean(did);
  const busy = phase === "loading" || phase === "authenticating";

  return (
    <Card className="overflow-hidden border-[#16c8ff]/22 bg-[radial-gradient(circle_at_100%_0%,rgba(22,200,255,0.12),transparent_38%),rgba(14,12,14,0.72)] p-5 sm:p-7">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-2xl">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-[#16c8ff]/30 bg-[#16c8ff]/9 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#8ce8ff]">
              Optional
            </span>
            {connected ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300/20 bg-emerald-300/8 px-3 py-1 text-xs text-emerald-100">
                <Check aria-hidden className="size-3.5" /> Connected for follow actions
              </span>
            ) : null}
          </div>
          <h2 className="mt-4 text-xl font-semibold text-white sm:text-2xl">
            {connected ? "Follow discoveries without leaving this tool." : "Want one-click follows inside the tool?"}
          </h2>
          <p className="mt-2 text-sm leading-6 text-white/56">
            Scanning, ranking, filtering, and exporting still work with no login. Connect only if you want the result cards to follow accounts directly from Rukh Labs.
          </p>
          <p className="mt-2 flex items-start gap-2 text-xs leading-5 text-white/40">
            <ShieldCheck aria-hidden className="mt-0.5 size-4 shrink-0 text-[#8ce8ff]" />
            Rukh Labs never asks for or receives your Bluesky password. Authorization happens with your account provider, and the OAuth session is kept in this browser.
          </p>
        </div>

        {connected ? (
          <div className="flex min-w-0 items-center gap-3 rounded-xl border border-white/10 bg-black/15 p-3 lg:min-w-72">
            <span
              aria-hidden
              className="grid size-10 shrink-0 place-items-center rounded-full border border-white/12 bg-[#16c8ff]/10 bg-cover bg-center text-xs font-semibold text-white/70"
              style={profile?.avatar ? { backgroundImage: `url(${profile.avatar})` } : undefined}
            >
              {profile?.avatar ? null : (profile?.displayName || profile?.handle || "B").slice(0, 1).toUpperCase()}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-white">
                {profile?.displayName || profile?.handle || "Bluesky account"}
              </span>
              <span className="block truncate text-xs text-white/42">
                {profile?.handle ? `@${profile.handle}` : did}
              </span>
            </span>
            <Button variant="ghost" size="sm" onClick={() => void signOut()}>
              <LogOut aria-hidden className="size-4" /> Sign out
            </Button>
          </div>
        ) : (
          <form onSubmit={submit} className="grid w-full gap-2 lg:max-w-sm">
            <label htmlFor="bluesky-oauth-handle" className="text-xs font-semibold uppercase tracking-[0.12em] text-white/42">
              Your Bluesky handle
            </label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                id="bluesky-oauth-handle"
                value={handle}
                onChange={(event) => setHandle(event.target.value)}
                placeholder="you.bsky.social"
                autoComplete="username"
                spellCheck={false}
                disabled={busy || !available}
                className="min-w-0 flex-1 rounded-lg border border-white/12 bg-[#090707]/80 px-3.5 py-2.5 text-sm text-white outline-none placeholder:text-white/30 focus:border-[#16c8ff]/60 focus:ring-4 focus:ring-[#16c8ff]/10 disabled:opacity-50"
              />
              <Button type="submit" disabled={busy || !available || !handle.trim()}>
                {busy ? <LoaderCircle aria-hidden className="size-4 animate-spin" /> : <LogIn aria-hidden className="size-4" />}
                {phase === "authenticating" ? "Connecting…" : "Sign in"}
              </Button>
            </div>
            {!available ? (
              <p className="text-xs leading-5 text-[#ffe4a0]/74">
                Optional OAuth follow controls activate on the production rukhlabs.com domain. Public scanning works normally here.
              </p>
            ) : null}
          </form>
        )}
      </div>
      {error ? <p role="alert" className="mt-4 text-sm leading-6 text-[#ffb4b8]">{error}</p> : null}
    </Card>
  );
}

export function BlueskyFollowButton({
  did,
  handle,
  className,
}: {
  did: string;
  handle: string;
  className?: string;
}) {
  const oauth = useBlueskyOAuth();
  const [state, setState] = useState<"idle" | "working" | "following" | "error">("idle");
  const [message, setMessage] = useState("");

  if (oauth.phase !== "connected" || !oauth.did) {
    return (
      <a
        href={`https://bsky.app/profile/${handle}`}
        target="_blank"
        rel="noreferrer"
        className={buttonStyles({ size: "sm", className })}
      >
        Open & follow<ArrowUpRight aria-hidden className="size-4" />
      </a>
    );
  }

  const self = oauth.did === did;

  async function runFollow() {
    if (self || state === "working" || state === "following") return;
    setState("working");
    setMessage("");
    try {
      const result = await oauth.follow(did);
      setState("following");
      setMessage(result === "already-following" ? "Already following" : "Followed");
    } catch (caught) {
      setState("error");
      setMessage(errorMessage(caught));
    }
  }

  return (
    <span className={cn("relative inline-flex", className)} title={message || undefined}>
      <Button
        type="button"
        size="sm"
        className="w-full"
        onClick={() => void runFollow()}
        disabled={self || state === "working" || state === "following"}
        aria-label={self ? `@${handle} is your account` : state === "following" ? `Following @${handle}` : `Follow @${handle} here`}
      >
        {state === "working" ? <LoaderCircle aria-hidden className="size-4 animate-spin" /> : state === "following" ? <Check aria-hidden className="size-4" /> : <LogIn aria-hidden className="size-4" />}
        {self ? "Your account" : state === "working" ? "Following…" : state === "following" ? "Following" : "Follow here"}
      </Button>
      {state === "error" ? <span className="sr-only" role="alert">{message}</span> : null}
    </span>
  );
}
