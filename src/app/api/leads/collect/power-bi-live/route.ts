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
import { upsertPowerBiGigs } from "@/lib/leads/power-bi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SOURCE_ID = "power-bi-live";
const LOOKBACK_MINUTES = 20;
const STREAM_MS = 9_000;
const MAX_EVENTS = 18_000;
const MASTODON_HOSTS = [
  "mastodon.social",
  "hachyderm.io",
  "techhub.social",
  "indieweb.social",
  "fosstodon.org",
] as const;

const powerBiPattern = /\b(?:power\s*bi|microsoft fabric|power query|\bdax\b|semantic model|business intelligence dashboard)\b/i;
const directAskPattern =
  /\b(?:need|looking for|seeking|recommend|recommendation|anyone know|who can|could use|want to hire|need to hire|help with)\b.{0,150}\b(?:power\s*bi|microsoft fabric|power query|\bdax\b|dashboard|business intelligence)\b|\b(?:power\s*bi|microsoft fabric|power query|\bdax\b|dashboard|business intelligence)\b.{0,150}\b(?:help|consultant|freelancer|contractor|expert|specialist)\b/i;
const proactivePattern =
  /\b(?:migrat(?:e|ing|ion)|replace|rebuild|moderniz(?:e|ing|ation)|rolling out|implement(?:ing|ation)|moving from tableau|moving to power bi|fabric adoption|dashboard overhaul|reporting overhaul)\b.{0,180}\b(?:power\s*bi|microsoft fabric|dashboard|reporting|analytics)\b|\b(?:power\s*bi|microsoft fabric)\b.{0,180}\b(?:migration|implementation|rollout|modernization|overhaul|rebuild)\b/i;
const selfPromoPattern =
  /\b(?:i am|i'm|we are|our company|our agency)\b.{0,80}\b(?:power\s*bi|business intelligence)\b.{0,80}\b(?:consultant|consulting|services|freelancer|expert)\b|\bavailable for (?:power\s*bi|bi) work\b|\bhire me\b/i;
const jobPattern =
  /\b(?:job opening|full[- ]time|part[- ]time|salary|benefits|apply now|careers?|vacancy|position available|recruiter|resume|candidate|w2|c2c)\b/i;
const paidPattern = /\b(?:paid|budget|quote|proposal|contract|contractor|freelance|consultant|consulting|hourly|project fee)\b/i;

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

type MastodonStatus = {
  id?: string;
  url?: string;
  uri?: string;
  content?: string;
  created_at?: string;
  language?: string | null;
  sensitive?: boolean;
  reblog?: unknown;
  account?: {
    acct?: string;
    display_name?: string;
    url?: string;
    bot?: boolean;
  };
};

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

  return new Promise<{ events: JetstreamEvent[]; handles: Map<string, string> }>((resolve, reject) => {
    const events: JetstreamEvent[] = [];
    const handles = new Map<string, string>();
    const socket = new WebSocket(url.toString());
    let settled = false;
    const finish = (error?: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try { socket.close(); } catch { /* ignore */ }
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
  for (const host of [
    "jetstream2.us-east.bsky.network",
    "jetstream1.us-east.bsky.network",
    "jetstream2.us-west.bsky.network",
  ]) {
    try {
      return await streamJetstream(host);
    } catch {
      continue;
    }
  }
  return { events: [] as JetstreamEvent[], handles: new Map<string, string>() };
}

async function readMastodon(host: string) {
  try {
    const url = new URL(`https://${host}/api/v1/timelines/public`);
    url.searchParams.set("local", "true");
    url.searchParams.set("limit", "40");
    const response = await fetch(url, {
      headers: { Accept: "application/json", "User-Agent": "Rukh-Leads/1.0 (+https://rukhlabs.com)" },
      cache: "no-store",
      signal: AbortSignal.timeout(7_000),
    });
    if (!response.ok) return [] as MastodonStatus[];
    const payload = (await response.json()) as unknown;
    return Array.isArray(payload) ? (payload as MastodonStatus[]) : [];
  } catch {
    return [] as MastodonStatus[];
  }
}

function classifyText(text: string) {
  if (!powerBiPattern.test(text) || selfPromoPattern.test(text) || jobPattern.test(text)) return null;
  const direct = directAskPattern.test(text);
  const proactive = proactivePattern.test(text);
  if (!direct && !proactive) return null;

  let score = direct ? 90 : 70;
  const signals = [
    direct
      ? "Very fresh public post appears to request Power BI / Fabric help"
      : "Very fresh public post signals a Power BI / Fabric migration or implementation that may need outside help",
  ];
  if (paidPattern.test(text)) {
    score += 5;
    signals.push("Commercial consulting, contract, or budget language was detected");
  }
  if (/\b(?:urgent|asap|immediately|stuck|blocked|deadline|this week)\b/i.test(text)) {
    score += 4;
    signals.push("Urgency or an active blocker was detected");
  }
  if (/\b(?:tableau|qlik|excel|manual reports?|legacy reports?)\b/i.test(text)) {
    score += 3;
    signals.push("Migration or reporting-modernization context was detected");
  }
  return { direct, score: clamp(score, 0, 98), signals };
}

function blueskyGig(event: JetstreamEvent, handles: Map<string, string>) {
  const commit = event.commit;
  const did = event.did;
  if (
    event.kind !== "commit" || !did || !commit || commit.operation !== "create" ||
    commit.collection !== "app.bsky.feed.post" || !commit.rkey || !commit.record
  ) return null;

  const text = typeof commit.record.text === "string" ? cleanText(commit.record.text, 1200) : "";
  const createdAt = typeof commit.record.createdAt === "string" ? commit.record.createdAt : "";
  if (!text || !createdAt) return null;
  const classified = classifyText(text);
  if (!classified) return null;
  const ageMs = Date.now() - new Date(createdAt).getTime();
  if (ageMs > LOOKBACK_MINUTES * 60_000 + 120_000) return null;
  const handle = handles.get(did);
  const sourceUrl = `https://bsky.app/profile/${encodeURIComponent(handle || did)}/post/${encodeURIComponent(commit.rkey)}`;
  const identity = handle ? `@${handle}` : "Bluesky user";

  return {
    sourceKey: `power-bi:bsky:${did}:${commit.rkey}`,
    sourceUrl,
    companyName: identity,
    contactName: handle ? identity : undefined,
    contactUrl: sourceUrl,
    summary: text,
    score: classified.score,
    signals: [...classified.signals, "Captured directly from the public Bluesky Jetstream"],
    risks: [classified.direct ? "Confirm the gig is still open before replying" : "Proactive signal; outside help has not been explicitly confirmed"],
    tags: ["power-bi", "bluesky", classified.direct ? "direct ask" : "proactive signal", "extreme fresh"],
    pitch: classified.direct
      ? "Saw your Bluesky post about Power BI/Fabric. I work hands-on with DAX, Power Query, data modeling, Fabric migrations and dashboard builds. If the problem is still open, I can scope it quickly and give you a practical fixed-scope or hourly option."
      : "I saw your post about the Power BI/Fabric migration or reporting work. I handle focused Power BI/Fabric builds and migrations and can jump in on a specific model, DAX, Power Query, or dashboard problem without a long consulting engagement.",
    discoveredAt: createdAt,
    rawPayload: { platform: "Bluesky", did, handle: handle ?? null, rkey: commit.rkey },
  };
}

function mastodonGig(status: MastodonStatus, host: string) {
  if (status.reblog || status.sensitive || status.account?.bot) return null;
  if (status.language && status.language !== "en") return null;
  const sourceUrl = status.url || status.uri;
  if (!sourceUrl || !status.created_at) return null;
  const ageMs = Date.now() - new Date(status.created_at).getTime();
  if (ageMs > 2 * 60 * 60 * 1000) return null;
  const text = cleanText(status.content, 1200);
  const classified = classifyText(text);
  if (!classified) return null;
  const name = cleanText(status.account?.display_name, 100) || cleanText(status.account?.acct, 100) || "Mastodon user";

  return {
    sourceKey: `power-bi:mastodon:${sourceUrl}`,
    sourceUrl,
    companyName: name,
    contactName: name,
    contactUrl: status.account?.url || sourceUrl,
    summary: text,
    score: classified.score,
    signals: [...classified.signals, `Captured from the public ${host} timeline`],
    risks: [classified.direct ? "Confirm the gig is still open before replying" : "Proactive signal; outside help has not been explicitly confirmed"],
    tags: ["power-bi", "mastodon", classified.direct ? "direct ask" : "proactive signal", "extreme fresh"],
    pitch: "I saw your Mastodon post about Power BI/Fabric. I work hands-on with DAX, Power Query, data modeling, Fabric migrations and dashboard builds. If the work is still open, I can scope it quickly and suggest a focused way to tackle it.",
    discoveredAt: status.created_at,
    rawPayload: { platform: "Mastodon", instance: host, account: status.account?.acct ?? null },
  };
}

export async function GET(request: NextRequest) {
  if (!hasValidCronAuth(request) && !hasValidBasicAuth(request)) {
    return privateJson({ error: "Collector authentication failed." }, { status: 401 });
  }
  const runId = await beginCollectorRun(SOURCE_ID);
  try {
    const [jetstream, mastodonBatches] = await Promise.all([
      collectJetstream(),
      Promise.all(MASTODON_HOSTS.map(async (host) => ({ host, statuses: await readMastodon(host) }))),
    ]);
    const gigs = new Map<string, NonNullable<ReturnType<typeof blueskyGig>> | NonNullable<ReturnType<typeof mastodonGig>>>();
    for (const event of jetstream.events) {
      const gig = blueskyGig(event, jetstream.handles);
      if (gig) gigs.set(gig.sourceKey, gig);
    }
    for (const batch of mastodonBatches) {
      for (const status of batch.statuses) {
        const gig = mastodonGig(status, batch.host);
        if (gig) gigs.set(gig.sourceKey, gig);
      }
    }
    const rows = Array.from(gigs.values());
    const stored = await upsertPowerBiGigs(rows);
    const seen = jetstream.events.length + mastodonBatches.reduce((total, batch) => total + batch.statuses.length, 0);
    await completeCollectorRun(runId, SOURCE_ID, seen, stored, {
      blueskyEvents: jetstream.events.length,
      mastodonStatuses: mastodonBatches.reduce((total, batch) => total + batch.statuses.length, 0),
    });
    return privateJson({ ok: true, source: SOURCE_ID, seen, qualified: rows.length, stored });
  } catch (error) {
    const message = await failCollectorRun(runId, SOURCE_ID, error);
    return privateJson({ error: message, source: SOURCE_ID }, { status: 503 });
  }
}
