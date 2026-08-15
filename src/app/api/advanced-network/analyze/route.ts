import type { NextRequest } from "next/server";
import { runAdvancedNetworkAnalysisV2 } from "@/lib/advanced-network-engine-v2";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  return runAdvancedNetworkAnalysisV2(request);
}
