import { NextRequest, NextResponse } from "next/server";
import { hasAdvancedNetworkAccess } from "@/lib/advanced-network-access";
import {
  getFollowerSourceReport,
  syncFollowerAttribution,
} from "@/lib/bluesky-follower-attribution";

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

function parseDays(value: string | null) {
  const days = Number(value);
  return days === 7 || days === 30 || days === 90 ? days : 30;
}

export async function GET(request: NextRequest) {
  if (!(await hasAdvancedNetworkAccess())) {
    return json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    return json(await getFollowerSourceReport(parseDays(request.nextUrl.searchParams.get("days"))));
  } catch (error) {
    console.error("Could not load follower source attribution", error);
    return json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not load follower source attribution.",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  if (!(await hasAdvancedNetworkAccess())) {
    return json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const action = typeof body.action === "string" ? body.action : "";
    const days =
      body.days === 7 || body.days === 30 || body.days === 90 ? Number(body.days) : 30;

    if (action !== "sync") {
      return json({ error: "Unknown follower-source action." }, { status: 400 });
    }

    const result = await syncFollowerAttribution();
    return json({ result, report: await getFollowerSourceReport(days) });
  } catch (error) {
    console.error("Follower attribution sync failed", error);
    return json(
      {
        error:
          error instanceof Error ? error.message : "Follower attribution sync failed.",
      },
      { status: 500 },
    );
  }
}
