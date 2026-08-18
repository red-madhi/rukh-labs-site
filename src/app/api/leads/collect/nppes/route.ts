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
  privateJson,
  upsertCandidates,
} from "@/lib/leads/crawl";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SOURCE_ID = "registry-nppes";
const PAGE_SIZE = 200;

const states = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","DC","FL","GA","HI","ID","IL","IN","IA","KS",
  "KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC",
  "ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY",
] as const;

const taxonomies = [
  "Clinic/Center",
  "Dental",
  "Chiropractic",
  "Physical Therapy",
  "Mental Health",
  "Home Health",
  "Speech-Language Pathology",
  "Optometrist",
  "Podiatrist",
  "Ambulatory Surgical Center",
  "Community/Behavioral Health",
  "Rehabilitation",
] as const;

const largeInstitutionPattern =
  /\b(?:hospital|university|medical center|health system|department of|county of|state of|federal|veterans affairs|kaiser|walgreens|cvs|walmart|costco|rite aid|hca healthcare|tenet|ascension|commonspirit)\b/i;

type NppesAddress = {
  address_purpose?: string;
  address_1?: string;
  address_2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country_code?: string;
  telephone_number?: string;
};

type NppesTaxonomy = {
  code?: string;
  desc?: string;
  primary?: boolean;
  state?: string;
  license?: string;
};

type NppesBasic = {
  organization_name?: string;
  organizational_subpart?: string;
  status?: string;
  enumeration_date?: string;
  last_updated?: string;
  authorized_official_first_name?: string;
  authorized_official_last_name?: string;
  authorized_official_title_or_position?: string;
};

type NppesResult = {
  number?: string;
  enumeration_type?: string;
  basic?: NppesBasic;
  addresses?: NppesAddress[];
  taxonomies?: NppesTaxonomy[];
};

type NppesPayload = {
  result_count?: number;
  results?: NppesResult[];
};

function nextCursor(
  stateIndex: number,
  taxonomyIndex: number,
  skip: number,
  returned: number,
) {
  if (returned >= PAGE_SIZE && skip < 1000) {
    return { stateIndex, taxonomyIndex, skip: skip + PAGE_SIZE };
  }
  const nextTaxonomy = taxonomyIndex + 1;
  if (nextTaxonomy < taxonomies.length) {
    return { stateIndex, taxonomyIndex: nextTaxonomy, skip: 0 };
  }
  return {
    stateIndex: (stateIndex + 1) % states.length,
    taxonomyIndex: 0,
    skip: 0,
  };
}

function recentEnumerationBoost(value?: string) {
  if (!value) return 0;
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) return 0;
  const ageDays = (Date.now() - parsed.getTime()) / 86_400_000;
  return ageDays <= 180 ? 12 : ageDays <= 730 ? 6 : 0;
}

export async function GET(request: NextRequest) {
  if (!hasValidCronAuth(request) && !hasValidBasicAuth(request)) {
    return privateJson({ error: "Collector authentication failed." }, { status: 401 });
  }

  const runId = await beginCollectorRun(SOURCE_ID);
  try {
    const config = await getSourceConfig(SOURCE_ID, {
      stateIndex: 0,
      taxonomyIndex: 0,
      skip: 0,
    });
    const stateIndex = Math.max(0, Number(config.stateIndex ?? 0) || 0) % states.length;
    const taxonomyIndex =
      Math.max(0, Number(config.taxonomyIndex ?? 0) || 0) % taxonomies.length;
    const skip = Math.max(0, Math.min(1000, Number(config.skip ?? 0) || 0));
    const state = states[stateIndex];
    const taxonomy = taxonomies[taxonomyIndex];

    const url = new URL("https://npiregistry.cms.hhs.gov/api/");
    url.searchParams.set("version", "2.1");
    url.searchParams.set("enumeration_type", "NPI-2");
    url.searchParams.set("taxonomy_description", taxonomy);
    url.searchParams.set("state", state);
    url.searchParams.set("limit", String(PAGE_SIZE));
    url.searchParams.set("skip", String(skip));
    url.searchParams.set("pretty", "off");

    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "Rukh-Leads/1.0 (+https://rukhlabs.com)",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
    });
    if (!response.ok) throw new Error(`NPPES returned ${response.status}.`);

    const payload = (await response.json()) as NppesPayload;
    const rows = payload.results ?? [];
    const candidates = rows.flatMap((row) => {
      const npi = cleanText(row.number, 20);
      const name = cleanText(row.basic?.organization_name, 260);
      if (!npi || !name || looksLikeNonProspectName(name) || largeInstitutionPattern.test(name)) {
        return [];
      }
      if (row.enumeration_type && row.enumeration_type !== "NPI-2") return [];
      if (row.basic?.status && row.basic.status !== "A") return [];

      const address =
        row.addresses?.find((item) => item.address_purpose === "LOCATION") ??
        row.addresses?.[0];
      if (!address || (address.country_code && address.country_code !== "US")) return [];
      const taxonomyRow =
        row.taxonomies?.find((item) => item.primary) ?? row.taxonomies?.[0];
      const taxonomyDescription = cleanText(taxonomyRow?.desc, 160) || taxonomy;
      const contactName = cleanText(
        [
          row.basic?.authorized_official_first_name,
          row.basic?.authorized_official_last_name,
        ]
          .filter(Boolean)
          .join(" "),
        180,
      );
      const phone = cleanText(address.telephone_number, 60);
      const category = inferIndustry(`${name} ${taxonomyDescription}`, "Healthcare practice");
      const priority = clamp(
        48 +
          recentEnumerationBoost(row.basic?.enumeration_date) +
          (phone ? 8 : 0) +
          (contactName ? 5 : 0) +
          (/dental|behavioral|mental|therapy|chiropr|optometr|podiatr/i.test(taxonomyDescription)
            ? 8
            : 3),
      );

      return [
        {
          source: SOURCE_ID,
          sourceKey: npi,
          organizationName: name,
          category,
          addressLine1: cleanText(
            [address.address_1, address.address_2].filter(Boolean).join(" "),
            220,
          ),
          city: address.city,
          state: address.state || state,
          postalCode: address.postal_code,
          countryCode: address.country_code || "US",
          contactName: contactName || null,
          phone: phone || null,
          sourceUrl: `https://npiregistry.cms.hhs.gov/provider-view/${encodeURIComponent(npi)}`,
          formedAt: row.basic?.enumeration_date || null,
          prioritySeed: priority,
          metadata: {
            npi,
            taxonomyCode: cleanText(taxonomyRow?.code, 30) || null,
            taxonomyDescription,
            authorizedOfficialTitle:
              cleanText(row.basic?.authorized_official_title_or_position, 180) || null,
            lastUpdated: row.basic?.last_updated || null,
            organizationalSubpart: row.basic?.organizational_subpart || null,
            queryState: state,
            queryTaxonomy: taxonomy,
          },
        },
      ];
    });

    const upserted = await upsertCandidates(candidates);
    const cursor = nextCursor(stateIndex, taxonomyIndex, skip, rows.length);
    await completeCollectorRun(runId, SOURCE_ID, rows.length, upserted, cursor);

    return privateJson({
      ok: true,
      source: SOURCE_ID,
      state,
      taxonomy,
      skip,
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
