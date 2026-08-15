import type { NextRequest } from "next/server";
import { runSuggestedDirectionV2 } from "@/lib/advanced-network-suggest-v2";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  return runSuggestedDirectionV2(request);
}
