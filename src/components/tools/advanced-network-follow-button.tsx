"use client";

import { useState } from "react";
import { Check, Loader2, UserPlus } from "lucide-react";
import { useAdvancedBlueskyOAuth } from "@/components/tools/advanced-network-oauth";
import { Button } from "@/components/ui/button";

type FollowState = "idle" | "working" | "followed" | "error";

export function AdvancedNetworkFollowButton({
  did,
  handle,
  following = false,
  campaignId = null,
}: {
  did: string;
  handle: string;
  following?: boolean;
  campaignId?: string | null;
}) {
  const oauth = useAdvancedBlueskyOAuth();
  const [localState, setState] = useState<FollowState>(following ? "followed" : "idle");
  const [error, setError] = useState("");
  const state: FollowState = following ? "followed" : localState;

  async function followAccount() {
    if (!oauth.did || state === "working" || state === "followed") return;

    setState("working");
    setError("");
    try {
      await oauth.follow(did);
      setState("followed");

      // The Bluesky write already succeeded at this point. Persistence is best-effort
      // so a temporary app/database issue never misrepresents a successful follow.
      void fetch("/api/advanced-network/follow-event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actorDid: oauth.did,
          targetDid: did,
          campaignId,
        }),
      }).catch(() => undefined);

      window.dispatchEvent(
        new CustomEvent("rukh:advanced-network:follow-change", {
          detail: { actorDid: oauth.did, targetDid: did, handle },
        }),
      );
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Follow failed.";
      setError(
        /scope|permission|authoriz/i.test(message)
          ? "Reconnect Bluesky to grant follow permission."
          : message,
      );
      setState("error");
    }
  }

  return (
    <div className="inline-flex flex-col items-start gap-1">
      <Button
        type="button"
        variant={state === "followed" ? "ghost" : "glass"}
        size="sm"
        onClick={() => void followAccount()}
        disabled={state === "working" || state === "followed"}
        className={
          state === "followed"
            ? "border border-emerald-300/18 bg-emerald-300/[0.055] text-emerald-200"
            : undefined
        }
      >
        {state === "working" ? (
          <Loader2 className="size-3.5 animate-spin" aria-hidden />
        ) : state === "followed" ? (
          <Check className="size-3.5" aria-hidden />
        ) : (
          <UserPlus className="size-3.5" aria-hidden />
        )}
        {state === "working" ? "Following…" : state === "followed" ? "Following" : state === "error" ? "Retry follow" : "Follow"}
      </Button>
      {error ? <span className="max-w-52 text-[10px] leading-4 text-[#ffb4b8]">{error}</span> : null}
    </div>
  );
}
