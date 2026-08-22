import type { NextRequest } from "next/server";
import { hasValidBasicAuth, hasValidCronAuth } from "@/lib/leads/auth";
import {
  BRAVE_MONTHLY_REQUEST_LIMIT,
  reserveMonthlyApiUsage,
} from "@/lib/leads/api-budget";
import { privateJson } from "@/lib/leads/crawl";
import {
  DATA_OPS_PARTNER_SEARCHES,
  verifyDataOpsPartnerResult,
  type DataOpsPartnerSearchResult,
} from "@/lib/leads/data-ops-partners";
import { mapLimit } from "@/lib/leads/pipeline";
import { upsertPowerBiGigs } from "@/lib/leads/power-bi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SOURCE_ID = "data-ops-partners";
const MAX_PAGE_CHECKS = 12;

type BravePayload = {
  web?: {
    results?: DataOpsPartnerSearchResult[];
  };
};

function activeSearch() {
  const sixHourBucket = Math.floor(Date.now() / (6 * 60 * 60 * 1000));
  return DATA_OPS_PARTNER_SEARCHES[sixHourBucket % DATA_OPS_PARTNER_SEARCHES.length];
}

async function braveSearch(apiKey: string, query: string) {
  const url = new URL("https://api.search.brave.com/res/v1/web/search");
  url.searchParams.set("q", query);
  url.searchParams.set("count", "20");
  url.searchParams.set("country", "us");
  url.searchParams.set("search_lang", "en");
  url.searchParams.set("safesearch", "moderate");
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "Accept-Encoding": "gzip",
      "X-Subscription-Token": apiKey,
    },
    cache: "no-store",
    signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) throw new Error(`Brave partner search returned ${response.status}.`);
  const payload = (await response.json()) as BravePayload;
  return payload.web?.results ?? [];
}

export async function GET(request: NextRequest) {
  if (!hasValidCronAuth(request) && !hasValidBasicAuth(request)) {
    return privateJson({ error: "Collector authentication failed." }, { status: 401 });
  }

  const apiKey = process.env.BRAVE_SEARCH_API_KEY?.trim();
  if (!apiKey) {
    return privateJson(
      { error: "BRAVE_SEARCH_API_KEY is not configured.", source: SOURCE_ID },
      { status: 428 },
    );
  }

  const budget = await reserveMonthlyApiUsage(
    "brave-search",
    1,
    BRAVE_MONTHLY_REQUEST_LIMIT,
  );
  if (!budget.allowed) {
    return privateJson(
      { error: "Monthly Brave Search budget reached.", source: SOURCE_ID, budget },
      { status: 429 },
    );
  }

  try {
    const search = activeSearch();
    const results = await braveSearch(apiKey, search.query);
    const candidates = results.slice(0, MAX_PAGE_CHECKS);
    const checked = await mapLimit(candidates, 4, async (result) =>
      verifyDataOpsPartnerResult(result, search),
    );
    const deduped = new Map<string, NonNullable<(typeof checked)[number]>>();
    for (const partner of checked) {
      if (!partner) continue;
      const existing = deduped.get(partner.sourceKey);
      if (!existing || partner.score > existing.score) deduped.set(partner.sourceKey, partner);
    }
    const verified = [...deduped.values()];
    const stored = await upsertPowerBiGigs(verified);

    return privateJson({
      ok: true,
      source: SOURCE_ID,
      seen: results.length,
      checked: candidates.length,
      qualified: verified.length,
      verified: verified.length,
      stored,
      search: search.label,
      budget,
    });
  } catch (error) {
    return privateJson(
      {
        error: error instanceof Error ? error.message : "Partner discovery failed.",
        source: SOURCE_ID,
      },
      { status: 503 },
    );
  }
}
