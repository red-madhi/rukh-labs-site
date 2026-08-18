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

const SOURCE_ID = "openstreetmap-businesses";

const metros = [
  { name: "Denver", state: "CO", bbox: [39.55, -105.15, 39.91, -104.60] },
  { name: "Colorado Springs", state: "CO", bbox: [38.70, -104.95, 39.00, -104.60] },
  { name: "Phoenix", state: "AZ", bbox: [33.25, -112.35, 33.75, -111.75] },
  { name: "Dallas-Fort Worth", state: "TX", bbox: [32.55, -97.55, 33.15, -96.55] },
  { name: "Houston", state: "TX", bbox: [29.45, -95.85, 30.15, -95.00] },
  { name: "Austin", state: "TX", bbox: [30.05, -98.00, 30.55, -97.45] },
  { name: "San Antonio", state: "TX", bbox: [29.15, -98.85, 29.75, -98.25] },
  { name: "Atlanta", state: "GA", bbox: [33.45, -84.75, 34.10, -83.95] },
  { name: "Charlotte", state: "NC", bbox: [34.95, -81.20, 35.50, -80.55] },
  { name: "Raleigh-Durham", state: "NC", bbox: [35.55, -79.15, 36.15, -78.25] },
  { name: "Nashville", state: "TN", bbox: [35.75, -87.05, 36.45, -86.35] },
  { name: "Tampa Bay", state: "FL", bbox: [27.55, -82.90, 28.25, -82.20] },
  { name: "Orlando", state: "FL", bbox: [28.20, -81.65, 28.75, -81.10] },
  { name: "Miami-Fort Lauderdale", state: "FL", bbox: [25.50, -80.50, 26.35, -80.00] },
  { name: "Chicago", state: "IL", bbox: [41.55, -88.10, 42.10, -87.45] },
  { name: "Minneapolis-Saint Paul", state: "MN", bbox: [44.70, -93.55, 45.20, -92.85] },
  { name: "Kansas City", state: "MO", bbox: [38.75, -95.00, 39.45, -94.25] },
  { name: "St. Louis", state: "MO", bbox: [38.30, -90.75, 39.05, -89.85] },
  { name: "Las Vegas", state: "NV", bbox: [35.85, -115.45, 36.40, -114.90] },
  { name: "Salt Lake City", state: "UT", bbox: [40.40, -112.20, 41.10, -111.65] },
  { name: "Portland", state: "OR", bbox: [45.25, -123.10, 45.80, -122.30] },
  { name: "Seattle", state: "WA", bbox: [47.25, -122.60, 47.85, -121.95] },
  { name: "Sacramento", state: "CA", bbox: [38.25, -121.80, 38.85, -121.10] },
  { name: "San Diego", state: "CA", bbox: [32.45, -117.35, 33.15, -116.80] },
  { name: "Los Angeles", state: "CA", bbox: [33.55, -118.75, 34.35, -117.65] },
  { name: "San Francisco Bay Area", state: "CA", bbox: [37.20, -122.65, 38.10, -121.70] },
  { name: "Boston", state: "MA", bbox: [42.10, -71.45, 42.65, -70.75] },
  { name: "Philadelphia", state: "PA", bbox: [39.65, -75.55, 40.25, -74.75] },
  { name: "New York City", state: "NY", bbox: [40.35, -74.35, 41.10, -73.55] },
  { name: "Washington DC", state: "DC", bbox: [38.65, -77.35, 39.15, -76.75] },
] as const;

const allowedCategoryPattern =
  /\b(?:restaurant|cafe|coffee|bakery|barber|beauty|hairdresser|spa|dentist|clinic|doctors|chiropractor|physiotherapist|veterinary|lawyer|accountant|insurance|real_estate_agent|travel_agent|cleaning|landscaper|plumber|electrician|hvac|construction|photographer|fitness_centre|car_repair|childcare|kindergarten|music_school|dance|art|craft|shop|office)\b/i;

const excludedNamePattern =
  /\b(?:walmart|target|costco|starbucks|mcdonald|subway|walgreens|cvs|home depot|lowe's|bank of america|wells fargo|chase bank|university|hospital|government|department|city hall|public library)\b/i;

type OsmElement = {
  type?: "node" | "way" | "relation";
  id?: number;
  lat?: number;
  lon?: number;
  center?: { lat?: number; lon?: number };
  tags?: Record<string, string>;
};

type OsmPayload = { elements?: OsmElement[] };

function categoryFromTags(tags: Record<string, string>) {
  const raw =
    tags.amenity || tags.shop || tags.craft || tags.office || tags.healthcare ||
    tags.leisure || tags.tourism || "business";
  return cleanText(raw.replace(/_/g, " "), 120);
}

function locationAddress(tags: Record<string, string>) {
  return cleanText(
    [
      tags["addr:housenumber"],
      tags["addr:street"],
      tags["addr:unit"] ? `Unit ${tags["addr:unit"]}` : "",
    ].filter(Boolean).join(" "),
    220,
  );
}

async function overpass(query: string) {
  const endpoints = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
  ];
  let lastError = "Overpass request failed.";
  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
          "User-Agent": "Rukh-Leads/1.0 (+https://rukhlabs.com)",
        },
        body: new URLSearchParams({ data: query }),
        cache: "no-store",
        signal: AbortSignal.timeout(28_000),
      });
      if (!response.ok) {
        lastError = `Overpass returned ${response.status}.`;
        continue;
      }
      return (await response.json()) as OsmPayload;
    } catch (error) {
      lastError = error instanceof Error ? error.message : lastError;
    }
  }
  throw new Error(lastError);
}

export async function GET(request: NextRequest) {
  if (!hasValidCronAuth(request) && !hasValidBasicAuth(request)) {
    return privateJson({ error: "Collector authentication failed." }, { status: 401 });
  }

  const runId = await beginCollectorRun(SOURCE_ID);
  try {
    const config = await getSourceConfig(SOURCE_ID, { metroIndex: 0 });
    const metroIndex = Math.max(0, Number(config.metroIndex ?? 0) || 0) % metros.length;
    const metro = metros[metroIndex];
    const bbox = metro.bbox.join(",");
    const query = `
      [out:json][timeout:22];
      (
        nwr["name"]["website"](${bbox});
        nwr["name"]["contact:website"](${bbox});
      );
      out center tags 850;
    `;

    const payload = await overpass(query);
    const rows = payload.elements ?? [];
    const candidates = rows.flatMap((element) => {
      if (!element.id || !element.type || !element.tags) return [];
      const tags = element.tags;
      const name = cleanText(tags.name || tags["brand:name"], 260);
      const website = normalizeWebsiteUrl(tags.website || tags["contact:website"]);
      if (
        !name || !website || looksLikeNonProspectName(name) ||
        excludedNamePattern.test(name) || isBlockedProspectUrl(website)
      ) return [];

      const rawCategory = [
        tags.amenity, tags.shop, tags.craft, tags.office, tags.healthcare,
        tags.leisure, tags.tourism,
      ].filter(Boolean).join(" ");
      if (rawCategory && !allowedCategoryPattern.test(rawCategory)) return [];

      const categoryLabel = categoryFromTags(tags);
      const industry = inferIndustry(`${name} ${categoryLabel}`, categoryLabel);
      const phone = cleanText(tags.phone || tags["contact:phone"], 60);
      const email = cleanText(tags.email || tags["contact:email"], 220);
      const city = tags["addr:city"] || tags["addr:suburb"] || tags["addr:town"] || metro.name;
      const state = tags["addr:state"] || metro.state;
      const lat = element.lat ?? element.center?.lat;
      const lon = element.lon ?? element.center?.lon;
      const contactBonus = phone || email ? 8 : 0;
      const consumerBonus = allowedCategoryPattern.test(rawCategory) ? 10 : 0;

      return [{
        source: SOURCE_ID,
        sourceKey: `${element.type}/${element.id}`,
        organizationName: name,
        category: industry,
        addressLine1: locationAddress(tags) || null,
        city,
        state,
        postalCode: tags["addr:postcode"] || null,
        countryCode: (tags["addr:country"] || "US").toUpperCase(),
        phone: phone || null,
        email: email || null,
        websiteUrl: website,
        sourceUrl: `https://www.openstreetmap.org/${element.type}/${element.id}`,
        prioritySeed: clamp(42 + contactBonus + consumerBonus),
        metadata: {
          osmType: element.type,
          osmId: element.id,
          latitude: lat ?? null,
          longitude: lon ?? null,
          metro: metro.name,
          rawCategory,
        },
      }];
    });

    const upserted = await upsertCandidates(candidates);
    const nextConfig = { metroIndex: (metroIndex + 1) % metros.length };
    await completeCollectorRun(runId, SOURCE_ID, rows.length, upserted, nextConfig);

    return privateJson({
      ok: true,
      source: SOURCE_ID,
      metro: metro.name,
      seen: rows.length,
      qualified: candidates.length,
      candidates: upserted,
      stored: 0,
      next: nextConfig,
    });
  } catch (error) {
    const message = await failCollectorRun(runId, SOURCE_ID, error);
    return privateJson({ error: message, source: SOURCE_ID }, { status: 503 });
  }
}
