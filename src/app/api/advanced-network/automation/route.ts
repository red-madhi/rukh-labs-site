import { NextRequest, NextResponse } from "next/server";
import { hasAdvancedNetworkAccess } from "@/lib/advanced-network-access";
import {
  getFollowAutomationPublicState,
  saveFollowAutomationSettings,
  syncFollowAutomation,
} from "@/lib/bluesky-follow-automation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const PRIVATE_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
  "X-Content-Type-Options": "nosniff",
  "X-Robots-Tag": "noindex, nofollow, noarchive, nosnippet",
} as const;

function json(body: unknown, init?: ResponseInit) {
  return NextResponse.json(body, {
    ...init,
    headers: { ...PRIVATE_HEADERS, ...(init?.headers ?? {}) },
  });
}

async function authorized() {
  return hasAdvancedNetworkAccess();
}

export async function GET() {
  if (!(await authorized())) return json({ error: "Unauthorized" }, { status: 401 });
  try {
    return json(await getFollowAutomationPublicState());
  } catch (error) {
    console.error("Could not load Bluesky follower automation", error);
    return json(
      { error: error instanceof Error ? error.message : "Could not load Auto DM." },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  if (!(await authorized())) return json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const action = typeof body.action === "string" ? body.action : "";

    if (action === "sync") {
      const result = await syncFollowAutomation({ force: true });
      return json({ result, state: await getFollowAutomationPublicState() });
    }

    if (action === "save") {
      const state = await saveFollowAutomationSettings({
        actorHandle: typeof body.actorHandle === "string" ? body.actorHandle : "",
        message: typeof body.message === "string" ? body.message : "",
        enabled: body.enabled === true,
        appPassword: typeof body.appPassword === "string" ? body.appPassword : undefined,
      });
      return json({ state });
    }

    return json({ error: "Unknown Auto DM action." }, { status: 400 });
  } catch (error) {
    console.error("Bluesky follower automation action failed", error);
    return json(
      { error: error instanceof Error ? error.message : "Auto DM action failed." },
      { status: 500 },
    );
  }
}
