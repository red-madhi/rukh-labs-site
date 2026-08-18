import { NextRequest, NextResponse } from "next/server";
import { hasValidBasicAuth, hasValidCronAuth } from "@/lib/leads/auth";
import { leadNeonQuery } from "@/lib/leads/neon";
import type { LeadPriority } from "@/lib/leads/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SOURCE_ID = "intent-bluesky";
const LOOKBACK_MINUTES = 10;
const STREAM_MS = 12_000;
const MAX_EVENTS = 25_000;
const MINIMUM_SCORE = 65;

const searchConfigs = [
  { query: "looking for a web designer", match: /looking for (?:a |an )?(?:web|website) designer/i, baseScore: 80, tag: "designer request" },
  { query: "need a web designer", match: /need (?:a |an )?(?:web|website) designer/i, baseScore: 82, tag: "designer request" },
  { query: "recommend a web designer", match: /recommend(?:ation|ations)?(?: for)? (?:a |an )?(?:web|website) designer|recommend (?:a |an )?(?:web|website) designer/i, baseScore: 78, tag: "recommendation request" },
  { query: "looking for a web developer", match: /looking for (?:a |an )?web developer/i, baseScore: 77, tag: "developer request" },
  { query: "need a web developer", match: /need (?:a |an )?web developer/i, baseScore: 78, tag: "developer request" },
  { query: "who can build me a website", match: /who (?:can|could) (?:build|make|create) (?:me |us )?(?:a |our )?website/i, baseScore: 82, tag: "build request" },
  { query: "need a website", match: /(?:i|we|my business|our business) (?:really )?need(?:s)? (?:a |our )?(?:new )?website/i, baseScore: 70, tag: "website need" },
  { query: "website redesign", match: /(?:need|looking for|seeking|want)(?: someone| help)?(?: to| with)? (?:redesign|rebuild|redo)(?:ing)? (?:my|our|the)? ?website|website (?:redesign|rebuild)/i, baseScore: 70, tag: "redesign" },
  { query: "help with my website", match: /(?:need|looking for|could use) help with (?:my|our) website/i, baseScore: 68, tag: "website help" },
] as const;

const selfPromotionPattern = /\b(?:i(?:'|’)m|i am|we are) (?:a |an )?(?:freelance )?(?:web|website) (?:designer|developer)\b|\bi (?:build|design|make|create) websites\b|\b(?:web design|website design) (?:services|commissions) (?:are )?open\b|\bavailable for (?:web|website) (?:design|development) work\b|\blooking for (?:new )?clients\b/i;
const exploratoryPattern = /\b(?:someday|eventually|just curious|hypothetically|for a class|school project)\b/i;
const businessPattern = /\b(?:business|company|startup|studio|agency|shop|store|restaurant|nonprofit|organization|brand|practice|contractor|service)\b/i;
const urgencyPattern = /\b(?:asap|urgent|urgently|soon|this week|this month|deadline|launch(?:ing)?|opening)\b/i;
const paidPattern = /\b(?:paid|budget|hire|hiring|quote|estimate|proposal)\b/i;

type JetstreamEvent = {
  did?: string;
  time_us?: number;
  kind?: string;
  identity?: { did?: string; handle?: string };
  commit?: {
    operation?: string;
    collection?: string;
    rkey?: string;
    cid?: string;
    record?: Record<string, unknown>;
  };
};

type QualifiedLead = {
  source_key: string;
  source_url: string;
  source_published_at: string;
  company_name: string;
  contact_name: string | null;
  contact_url: string;
  location: string;
  industry: string;
  summary: string;
  score: number;
  priority: LeadPriority;
  signals: string[];
  risks: string[];
  tags: string[];
  pitch: string;
  raw_payload: Record<string, unknown>;
};

function privateJson(body: unknown, init?: ResponseInit) {
  const response = NextResponse.json(body, init);
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive, nosnippet");
  return response;
}

function normalizeText(value: string, max = 420) {
  const cleaned = value.replace(/\s+/g, " ").trim();
  return cleaned.length > max ? `${cleaned.slice(0, max - 1).trimEnd()}…` : cleaned;
}

function buildPitch(text: string) {
  const projectAngle = /redesign|rebuild|redo/i.test(text)
    ? "rebuilding the site"
    : /launch|opening|new business|startup/i.test(text)
      ? "getting the site launched"
      : "the website help you mentioned";
  return `Saw your Bluesky post about ${projectAngle}. I build practical, conversion-focused sites and can send a concise scope with a fixed-price route based on what you actually need. No hard sell—just a clear plan you can compare.`;
}

function qualifyEvent(event: JetstreamEvent, handles: Map<string, string>): QualifiedLead | null {
  const commit = event.commit;
  const did = event.did;
  if (
    event.kind !== "commit" ||
    !did ||
    !commit ||
    commit.collection !== "app.bsky.feed.post" ||
    commit.operation !== "create" ||
    !commit.rkey ||
    !commit.record
  ) {
    return null;
  }

  const text = typeof commit.record.text === "string" ? commit.record.text.trim() : "";
  const createdAt = typeof commit.record.createdAt === "string" ? commit.record.createdAt : "";
  if (!text || !createdAt || selfPromotionPattern.test(text)) return null;

  const matches = searchConfigs.filter((config) => config.match.test(text));
  if (!matches.length) return null;

  let score: number = Math.max(...matches.map((match) => match.baseScore));
  const ageMs = Date.now() - new Date(createdAt).getTime();
  if (ageMs <= 15 * 60 * 1000) score += 14;
  else if (ageMs <= 60 * 60 * 1000) score += 10;

  const signals = [
    ...matches.map((match) => `Explicit public phrase matched: “${match.query}”`),
    "Captured directly from the public Bluesky Jetstream",
  ];
  const risks: string[] = [];
  const tags = ["Bluesky", "public intent", ...matches.map((match) => match.tag)];

  if (businessPattern.test(text)) {
    score += 4;
    signals.push("Post includes business or organization context");
    tags.push("business context");
  } else {
    risks.push("Business context and ability to pay are not yet confirmed");
  }
  if (urgencyPattern.test(text)) {
    score += 4;
    signals.push("Post includes a launch, deadline, or urgency signal");
    tags.push("time-sensitive");
  }
  if (paidPattern.test(text)) {
    score += 5;
    signals.push("Post includes a hiring, budget, quote, or paid-work signal");
    tags.push("commercial intent");
  }
  if (exploratoryPattern.test(text)) {
    score -= 12;
    risks.push("Language suggests the need may be exploratory rather than immediate");
  }

  score = Math.max(0, Math.min(97, score));
  if (score < MINIMUM_SCORE) return null;

  const handle = handles.get(did);
  const identity = handle ? `@${handle}` : did;
  const sourceUrl = `https://bsky.app/profile/${encodeURIComponent(handle || did)}/post/${encodeURIComponent(commit.rkey)}`;
  const priority: LeadPriority = score >= 85 ? "hot" : score >= 70 ? "strong" : "watch";

  return {
    source_key: `at://${did}/app.bsky.feed.post/${commit.rkey}`,
    source_url: sourceUrl,
    source_published_at: createdAt,
    company_name: identity,
    contact_name: handle ? identity : null,
    contact_url: sourceUrl,
    location: "Location not confirmed",
    industry: "Unclassified",
    summary: normalizeText(text),
    score,
    priority,
    signals: Array.from(new Set(signals)),
    risks: Array.from(new Set(risks)),
    tags: Array.from(new Set(tags)),
    pitch: buildPitch(text),
    raw_payload: {
      did,
      handle: handle ?? null,
      rkey: commit.rkey,
      cid: commit.cid ?? null,
      timeUs: event.time_us ?? null,
      matchedQueries: matches.map((match) => match.query),
    },
  };
}

function parseMessage(data: unknown): JetstreamEvent | null {
  try {
    if (typeof data === "string") return JSON.parse(data) as JetstreamEvent;
    if (data instanceof ArrayBuffer) return JSON.parse(new TextDecoder().decode(data)) as JetstreamEvent;
    if (ArrayBuffer.isView(data)) {
      return JSON.parse(new TextDecoder().decode(data as ArrayBufferView<ArrayBuffer>)) as JetstreamEvent;
    }
  } catch {
    return null;
  }
  return null;
}

async function streamJetstream(host: string) {
  const cursor = (Date.now() - LOOKBACK_MINUTES * 60_000) * 1000;
  const url = new URL(`wss://${host}/subscribe`);
  url.searchParams.append("wantedCollections", "app.bsky.feed.post");
  url.searchParams.set("cursor", String(cursor));
  url.searchParams.set("maxMessageSizeBytes", "120000");

  return await new Promise<{ events: JetstreamEvent[]; handles: Map<string, string> }>((resolve, reject) => {
    const events: JetstreamEvent[] = [];
    const handles = new Map<string, string>();
    const socket = new WebSocket(url.toString());
    let settled = false;

    const finish = (error?: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try {
        socket.close();
      } catch {
        // Ignore close failures after collection.
      }
      if (error) reject(error);
      else resolve({ events, handles });
    };

    const timer = setTimeout(() => finish(), STREAM_MS);

    socket.addEventListener("message", (message) => {
      const event = parseMessage(message.data);
      if (!event) return;
      if (event.kind === "identity" && event.identity?.did && event.identity.handle) {
        handles.set(event.identity.did, event.identity.handle);
      }
      if (event.kind === "commit") events.push(event);
      if (events.length >= MAX_EVENTS) finish();
    });

    socket.addEventListener("error", () => finish(new Error(`Jetstream connection to ${host} failed.`)));
    socket.addEventListener("close", () => finish());
  });
}

async function collectJetstream() {
  const hosts = [
    "jetstream2.us-east.bsky.network",
    "jetstream1.us-east.bsky.network",
    "jetstream2.us-west.bsky.network",
  ];
  let lastError = "Jetstream collection failed.";

  for (const host of hosts) {
    try {
      return await streamJetstream(host);
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
  }
  throw new Error(lastError);
}

async function upsertLeads(leads: QualifiedLead[]) {
  if (!leads.length) return 0;
  const result = await leadNeonQuery(
    `WITH incoming AS (
       SELECT * FROM jsonb_to_recordset($1::jsonb) AS item(
         source_key text, source_url text, source_published_at timestamptz, company_name text, contact_name text,
         contact_url text, location text, industry text, summary text, score smallint, priority text,
         signals jsonb, risks jsonb, tags jsonb, pitch text, raw_payload jsonb
       )
     )
     INSERT INTO public.lead_opportunities AS existing (
       source, source_key, source_url, source_published_at, company_name, contact_name, contact_url, location, industry,
       summary, score, priority, signals, risks, tags, pitch, raw_payload, last_checked_at
     )
     SELECT 'intent', source_key, source_url, source_published_at, company_name, contact_name, contact_url, location, industry,
       summary, score, priority, signals, risks, tags, pitch, raw_payload, now() FROM incoming
     ON CONFLICT (source, source_key) DO UPDATE SET
       source_url = EXCLUDED.source_url,
       source_published_at = EXCLUDED.source_published_at,
       updated_at = now(),
       company_name = EXCLUDED.company_name,
       contact_name = EXCLUDED.contact_name,
       contact_url = EXCLUDED.contact_url,
       summary = EXCLUDED.summary,
       score = GREATEST(existing.score, EXCLUDED.score),
       priority = CASE WHEN GREATEST(existing.score, EXCLUDED.score) >= 85 THEN 'hot' WHEN GREATEST(existing.score, EXCLUDED.score) >= 70 THEN 'strong' ELSE 'watch' END,
       signals = EXCLUDED.signals,
       risks = EXCLUDED.risks,
       tags = EXCLUDED.tags,
       pitch = EXCLUDED.pitch,
       raw_payload = EXCLUDED.raw_payload,
       last_checked_at = now()
     RETURNING id::text`,
    [JSON.stringify(leads)],
  );
  return result.rows?.length ?? result.rowCount ?? 0;
}

export async function GET(request: NextRequest) {
  if (!hasValidCronAuth(request) && !hasValidBasicAuth(request)) {
    return privateJson({ error: "Collector authentication failed." }, { status: 401 });
  }

  const runId = crypto.randomUUID();
  const startedAt = Date.now();
  try {
    await leadNeonQuery(
      `INSERT INTO public.lead_collector_runs (id, source_id, status) VALUES ($1::uuid, $2, 'running')`,
      [runId, SOURCE_ID],
    );

    const { events, handles } = await collectJetstream();
    const deduplicated = new Map<string, QualifiedLead>();
    for (const event of events) {
      const lead = qualifyEvent(event, handles);
      if (!lead) continue;
      const existing = deduplicated.get(lead.source_key);
      if (!existing || lead.score > existing.score) deduplicated.set(lead.source_key, lead);
    }

    const qualified = Array.from(deduplicated.values()).sort((a, b) => b.score - a.score);
    const stored = await upsertLeads(qualified);

    await Promise.all([
      leadNeonQuery(
        `UPDATE public.lead_collector_runs
         SET status = 'success', completed_at = now(), items_seen = $2::int, items_upserted = $3::int
         WHERE id = $1::uuid`,
        [runId, String(events.length), String(stored)],
      ),
      leadNeonQuery(
        `UPDATE public.lead_source_state
         SET status = 'ready', last_run_at = now(), last_success_at = now(), last_items = $2::int,
             last_error = NULL, updated_at = now()
         WHERE source_id = $1`,
        [SOURCE_ID, String(stored)],
      ),
    ]);

    return privateJson({
      ok: true,
      source: SOURCE_ID,
      transport: "jetstream",
      lookbackMinutes: LOOKBACK_MINUTES,
      eventsSeen: events.length,
      qualified: qualified.length,
      stored,
      durationMs: Date.now() - startedAt,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "The Bluesky Jetstream collector failed.";
    console.error("Rukh Leads Bluesky collector failed", error);
    await Promise.allSettled([
      leadNeonQuery(
        `UPDATE public.lead_collector_runs SET status = 'error', completed_at = now(), error_message = $2 WHERE id = $1::uuid`,
        [runId, message.slice(0, 900)],
      ),
      leadNeonQuery(
        `UPDATE public.lead_source_state SET status = 'error', last_run_at = now(), last_error = $2, updated_at = now() WHERE source_id = $1`,
        [SOURCE_ID, message.slice(0, 900)],
      ),
    ]);
    return privateJson({ error: message, runId, source: SOURCE_ID }, { status: 503 });
  }
}
