import type { NextRequest } from "next/server";
import { hasValidBasicAuth, hasValidCronAuth } from "@/lib/leads/auth";
import {
  beginCollectorRun,
  clamp,
  cleanText,
  completeCollectorRun,
  failCollectorRun,
  getSourceConfig,
  inferIndustry,
  looksLikeNonProspectName,
  normalizeWebsiteUrl,
  privateJson,
  upsertCandidates,
} from "@/lib/leads/crawl";
import { isBlockedProspectUrl } from "@/lib/leads/site";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SOURCE_ID = "web-business-discovery";

const metros = [
  ["Denver", "CO"], ["Colorado Springs", "CO"], ["Phoenix", "AZ"],
  ["Dallas", "TX"], ["Fort Worth", "TX"], ["Houston", "TX"], ["Austin", "TX"],
  ["San Antonio", "TX"], ["Atlanta", "GA"], ["Charlotte", "NC"], ["Raleigh", "NC"],
  ["Nashville", "TN"], ["Tampa", "FL"], ["Orlando", "FL"], ["Miami", "FL"],
  ["Chicago", "IL"], ["Minneapolis", "MN"], ["Kansas City", "MO"], ["St Louis", "MO"],
  ["Las Vegas", "NV"], ["Salt Lake City", "UT"], ["Portland", "OR"], ["Seattle", "WA"],
  ["Sacramento", "CA"], ["San Diego", "CA"], ["Los Angeles", "CA"],
  ["San Francisco", "CA"], ["Boston", "MA"], ["Philadelphia", "PA"],
  ["New York", "NY"], ["Washington", "DC"], ["Baltimore", "MD"],
  ["Cleveland", "OH"], ["Columbus", "OH"], ["Cincinnati", "OH"],
  ["Indianapolis", "IN"], ["Milwaukee", "WI"], ["New Orleans", "LA"],
  ["Oklahoma City", "OK"], ["Tulsa", "OK"], ["Omaha", "NE"], ["Albuquerque", "NM"],
] as const;

const verticals = [
  "plumber", "electrician", "roofing contractor", "HVAC contractor", "landscaping company",
  "house cleaning service", "general contractor", "auto repair shop", "dentist", "chiropractor",
  "physical therapy clinic", "mental health counseling practice", "veterinary clinic", "daycare",
  "preschool", "hair salon", "barber shop", "spa", "photographer", "accounting firm",
  "small law firm", "property management company", "independent restaurant", "bakery",
  "fitness studio", "music school", "dance studio", "nonprofit organization",
] as const;

const blockedHostPattern =
  /(?:^|\.)(?:yelp|angi|homeadvisor|thumbtack|yellowpages|mapquest|bbb|manta|chamberofcommerce|facebook|instagram|linkedin|indeed|glassdoor|ziprecruiter|clutch|designrush|goodfirms|upcity|expertise|threebestrated|birdeye|nextdoor|alignable|opencorporates|bizapedia|dnb|bloomberg)\./i;

const directoryTextPattern =
  /\b(?:top \d+|best \d+|best .* near me|directory|reviews? and ratings?|compare quotes|find a pro|companies in|business listings?|yellow pages|job|jobs|career|salary|resume|article|guide|how to|marketplace)\b/i;

const genericTitlePattern =
  /\b(?:home|official site|welcome|about us|contact us|services)\b/i;

type BraveResult = {
  title?: string;
  url?: string;
  description?: string;
  age?: string;
  page_age?: string;
};

type BravePayload = {
  web?: { results?: BraveResult[] };
};

function nextCursor(metroIndex: number, verticalIndex: number) {
  const nextVertical = verticalIndex + 1;
  if (nextVertical < verticals.length) return { metroIndex, verticalIndex: nextVertical };
  return { metroIndex: (metroIndex + 1) % metros.length, verticalIndex: 0 };
}

function candidateName(title: string, host: string, vertical: string) {
  const cleaned = cleanText(title, 220)
    .replace(/\s+[|·•]\s+.*$/, "")
    .replace(/\s+[–—-]\s+(?:home|official site|welcome|.*\b(?:plumber|electrician|contractor|dentist|clinic|salon|restaurant|bakery|law firm|accounting firm)\b.*)$/i, "")
    .replace(/\b(?:in|near)\s+[A-Z][A-Za-z .'-]+,?\s+[A-Z]{2}\b.*$/i, "")
    .trim();
  if (cleaned.length >= 3 && !genericTitlePattern.test(cleaned)) return cleaned;
  const hostName = host.split(".")[0]?.replace(/[-_]+/g, " ") || vertical;
  return hostName.replace(/\b\w/g, (value) => value.toUpperCase());
}

function hostFromUrl(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./i, "").toLowerCase();
  } catch {
    return "";
  }
}

export async function GET(request: NextRequest) {
  if (!hasValidCronAuth(request) && !hasValidBasicAuth(request)) {
    return privateJson({ error: "Collector authentication failed." }, { status: 401 });
  }

  const runId = await beginCollectorRun(SOURCE_ID);
  try {
    const apiKey = process.env.BRAVE_SEARCH_API_KEY?.trim();
    if (!apiKey) throw new Error("BRAVE_SEARCH_API_KEY is not configured.");

    const config = await getSourceConfig(SOURCE_ID, { metroIndex: 0, verticalIndex: 0 });
    const metroIndex = Math.max(0, Number(config.metroIndex ?? 0) || 0) % metros.length;
    const verticalIndex = Math.max(0, Number(config.verticalIndex ?? 0) || 0) % verticals.length;
    const [city, state] = metros[metroIndex];
    const vertical = verticals[verticalIndex];

    const query = `${vertical} "${city} ${state}" official website -site:yelp.com -site:angi.com -site:homeadvisor.com -site:thumbtack.com -site:facebook.com -site:yellowpages.com`;
    const url = new URL("https://api.search.brave.com/res/v1/web/search");
    url.searchParams.set("q", query);
    url.searchParams.set("count", "20");
    url.searchParams.set("country", "us");
    url.searchParams.set("search_lang", "en");
    url.searchParams.set("safesearch", "moderate");

    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "X-Subscription-Token": apiKey,
      },
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) throw new Error(`Brave business discovery returned ${response.status}.`);

    const payload = (await response.json()) as BravePayload;
    const rows = payload.web?.results ?? [];
    const candidates = rows.flatMap((result, index) => {
      const website = normalizeWebsiteUrl(result.url);
      if (!website || isBlockedProspectUrl(website)) return [];
      const host = hostFromUrl(website);
      const title = cleanText(result.title, 220);
      const description = cleanText(result.description, 500);
      if (!host || blockedHostPattern.test(host) || directoryTextPattern.test(`${title} ${description}`)) {
        return [];
      }

      const name = candidateName(title, host, vertical);
      if (!name || looksLikeNonProspectName(name)) return [];
      const category = inferIndustry(`${name} ${vertical}`, vertical);
      const contactSignal = /\b(?:call|contact|book|appointment|estimate|quote|schedule)\b/i.test(description);
      const localSignal = new RegExp(`\b${city.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\b`, "i").test(
        `${title} ${description}`,
      );

      return [{
        source: SOURCE_ID,
        sourceKey: host,
        organizationName: name,
        category,
        city,
        state,
        countryCode: "US",
        websiteUrl: website,
        sourceUrl: website,
        prioritySeed: clamp(42 + (contactSignal ? 10 : 0) + (localSignal ? 8 : 0) + Math.max(0, 5 - index)),
        metadata: {
          query,
          resultTitle: title,
          resultDescription: description,
          resultAge: result.age ?? result.page_age ?? null,
          sourceHost: host,
          metro: `${city}, ${state}`,
          vertical,
        },
      }];
    });

    const upserted = await upsertCandidates(candidates);
    const cursor = nextCursor(metroIndex, verticalIndex);
    await completeCollectorRun(runId, SOURCE_ID, rows.length, upserted, cursor);

    return privateJson({
      ok: true,
      source: SOURCE_ID,
      query,
      metro: `${city}, ${state}`,
      vertical,
      seen: rows.length,
      qualified: candidates.length,
      candidates: upserted,
      stored: 0,
      next: cursor,
    });
  } catch (error) {
    const message = await failCollectorRun(runId, SOURCE_ID, error);
    return privateJson({ error: message, source: SOURCE_ID }, { status: 503 });
  }
}
