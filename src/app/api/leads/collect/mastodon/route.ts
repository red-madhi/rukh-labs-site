import type { NextRequest } from "next/server";
import { hasValidBasicAuth, hasValidCronAuth } from "@/lib/leads/auth";
import {
  beginCollectorRun,
  clamp,
  cleanText,
  completeCollectorRun,
  failCollectorRun,
  privateJson,
} from "@/lib/leads/crawl";
import { upsertIntentOpportunities } from "@/lib/leads/intent-opportunities";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SOURCE_ID = "mastodon-intent";
const INSTANCE_HOSTS = [
  "mastodon.social",
  "hachyderm.io",
  "techhub.social",
  "indieweb.social",
  "fosstodon.org",
] as const;

const intentPattern =
  /\b(?:need|needs|looking for|seeking|recommend|recommendation|who can|anyone know|trying to find|could use help|want someone)\b.{0,130}\b(?:web(?:site)?\s*(?:designer|developer)|website|web design|website design|website redesign|site redesign|web development)\b|\b(?:web(?:site)?\s*(?:designer|developer)|website|web design|website design|website redesign|site redesign|web development)\b.{0,130}\b(?:need|needs|looking for|seeking|recommend|recommendation|who can|anyone know|trying to find|could use help|want someone)\b/i;

const buyerContextPattern =
  /\b(?:i|we|our|my|business|company|startup|brand|shop|store|restaurant|practice|nonprofit|organization|launch|opening|project)\b/i;

const excludePattern =
  /\b(?:i am a web designer|i'm a web designer|we are a web design|our web design services|available for work|hire me|portfolio|job opening|we are hiring|join our team|salary|resume|career|apply now|vacancy|web designer job|web developer job|course|tutorial|guide|template)\b/i;

type MastodonAccount = {
  acct?: string;
  display_name?: string;
  url?: string;
  bot?: boolean;
};

type MastodonStatus = {
  id?: string;
  url?: string;
  uri?: string;
  content?: string;
  created_at?: string;
  language?: string | null;
  sensitive?: boolean;
  account?: MastodonAccount;
  reblog?: unknown;
};

type InstanceResult = {
  host: string;
  statuses: MastodonStatus[];
  skipped?: string;
};

async function readInstance(host: string): Promise<InstanceResult> {
  const url = new URL(`https://${host}/api/v1/timelines/public`);
  url.searchParams.set("local", "true");
  url.searchParams.set("limit", "40");

  try {
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent":
          "Rukh-Leads/1.0 (+https://rukhlabs.com; public-intent monitoring)",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(9_000),
    });

    if ([401, 403].includes(response.status)) {
      return { host, statuses: [], skipped: "Public timeline requires authentication" };
    }
    if (!response.ok) {
      return { host, statuses: [], skipped: `HTTP ${response.status}` };
    }

    const payload = (await response.json()) as unknown;
    return {
      host,
      statuses: Array.isArray(payload) ? (payload as MastodonStatus[]) : [],
    };
  } catch (error) {
    return {
      host,
      statuses: [],
      skipped: error instanceof Error ? error.message : "Instance request failed",
    };
  }
}

function qualify(status: MastodonStatus, host: string) {
  if (status.reblog || status.sensitive || status.account?.bot) return null;
  if (status.language && status.language !== "en") return null;

  const sourceUrl = status.url || status.uri;
  if (!sourceUrl) return null;

  const createdAt = status.created_at ? new Date(status.created_at) : null;
  if (!createdAt || Number.isNaN(createdAt.getTime())) return null;
  if (Date.now() - createdAt.getTime() > 8 * 60 * 60 * 1000) return null;

  const text = cleanText(status.content, 1200);
  if (!text || !intentPattern.test(text)) return null;
  if (!buyerContextPattern.test(text) || excludePattern.test(text)) return null;

  let score = 88;
  const signals = [
    "Fresh public Mastodon post explicitly asks for website-related help",
    "Language appears to describe a buyer request rather than a service promotion",
  ];
  const risks = [
    "Confirm the project scope, budget, and business identity before moving beyond an initial reply",
  ];

  if (/\b(?:urgent|urgently|asap|this week|deadline|launching|opening soon)\b/i.test(text)) {
    score += 4;
    signals.push("Urgency or launch timing was detected");
  }
  if (/\b(?:paid|budget|quote|proposal|freelancer|contractor)\b/i.test(text)) {
    score += 3;
    signals.push("Commercial intent was detected");
  }
  score = clamp(score, 0, 97);

  const displayName =
    cleanText(status.account?.display_name, 100) ||
    cleanText(status.account?.acct, 100) ||
    "Mastodon user";
  const handle = cleanText(status.account?.acct, 120);

  return {
    sourceKey: `mastodon:${sourceUrl}`,
    sourceUrl,
    companyName: handle ? `${displayName} (@${handle})` : displayName,
    summary: text,
    score,
    signals,
    risks,
    tags: ["mastodon", "public social intent", host],
    pitch:
      "I saw your Mastodon post about needing website help. I build practical small-business sites and can send a concise fixed-price route based on what you are trying to launch or improve.",
    contactUrl: status.account?.url,
    discoveredAt: createdAt.toISOString(),
    rawPayload: {
      instance: host,
      account: handle || null,
      statusId: status.id || null,
      language: status.language || null,
    },
  };
}

export async function GET(request: NextRequest) {
  if (!hasValidCronAuth(request) && !hasValidBasicAuth(request)) {
    return privateJson({ error: "Collector authentication failed." }, { status: 401 });
  }

  const runId = await beginCollectorRun(SOURCE_ID);
  try {
    const instanceResults = await Promise.all(INSTANCE_HOSTS.map(readInstance));
    const seen = instanceResults.reduce(
      (total, result) => total + result.statuses.length,
      0,
    );
    const leads = new Map<string, NonNullable<ReturnType<typeof qualify>>>();

    for (const instance of instanceResults) {
      for (const status of instance.statuses) {
        const lead = qualify(status, instance.host);
        if (!lead) continue;
        const current = leads.get(lead.sourceKey);
        if (!current || lead.score > current.score) leads.set(lead.sourceKey, lead);
      }
    }

    const rows = Array.from(leads.values());
    const stored = await upsertIntentOpportunities(rows);
    const skippedInstances = instanceResults
      .filter((result) => result.skipped)
      .map((result) => ({ host: result.host, reason: result.skipped }));

    await completeCollectorRun(runId, SOURCE_ID, seen, stored, {
      instancesChecked: INSTANCE_HOSTS.length,
      instancesAvailable: instanceResults.filter((result) => !result.skipped).length,
      skippedInstances,
    });

    return privateJson({
      ok: true,
      source: SOURCE_ID,
      seen,
      qualified: rows.length,
      stored,
      skippedInstances,
    });
  } catch (error) {
    const message = await failCollectorRun(runId, SOURCE_ID, error);
    return privateJson({ error: message, source: SOURCE_ID }, { status: 503 });
  }
}
