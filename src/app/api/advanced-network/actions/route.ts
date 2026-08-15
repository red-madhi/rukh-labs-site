import type { NextRequest } from "next/server";
import { runAdvancedNetworkActionsV2 } from "@/lib/advanced-network-actions-v2";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  return runAdvancedNetworkActionsV2(request);
}
