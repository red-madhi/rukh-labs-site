import { createDecipheriv, createHash } from "node:crypto";
import { neon } from "@neondatabase/serverless";

const PUBLIC_API = "https://public.api.bsky.app/xrpc";
const MAX_NOTIFICATION_PAGES = 5;
const MAX_PROMOTION_WINDOW_MINUTES = 6 * 60;
const MAX_DIRECT_WINDOW_MINUTES = 72 * 60;

function databaseUrl() {
  const value = process.env.DATABASE_URL?.trim();
  if (!value) throw new Error("DATABASE_URL is not configured.");
  return value;
}

function getSql() {
  return neon(databaseUrl());
}

type Sql = ReturnType<typeof getSql>;

type ActorView = {
  did: string;
  handle: string;
  displayName?: string;
};

type StarterPackView = {
  uri: string;
  cid?: string;
  record?: unknown;
  creator?: ActorView;
  indexedAt?: string;
};

type BskyNotification = {
  uri: string;
  cid: string;
  author: ActorView;
  reason: string;
  reasonSubject?: string;
  record?: unknown;
  starterPack?: StarterPackView;
  indexedAt: string;
};

type NotificationPage = {
  cursor?: string;
  notifications: BskyNotification[];
};

type ResolveHandleResponse = {
  did: string;
};

type DidService = {
  id?: string;
  type?: string;
  serviceEndpoint?: unknown;
};

type DidDocument = {
  id?: string;
  service?: DidService[];
};

type BskySession = {
  accessJwt: string;
  did: string;
  handle: string;
  pdsUrl: string;
};

type Relationship = {
  did?: string;
  following?: string;
  followedBy?: string;
  actor?: string;
  notFound?: boolean;
};

type RelationshipResponse = {
  actor?: string;
  relationships: Relationship[];
};

type AutomationCredential = {
  actorHandle: string;
  encryptedPassword: string;
};

export type FollowerSourceType =
  | "starter_pack"
  | "promotion"
  | "post_amplification"
  | "conversation"
  | "unknown";

export type AttributionMethod = "exact" | "inferred" | "unattributed";

export type FollowerAttributionEvidence = {
  kind: string;
  text: string;
  subjectUri?: string;
  actorHandle?: string;
  minutesBeforeFollow?: number;
};

type Attribution = {
  followerDid: string;
  followerHandle: string;
  profileName: string | null;
  followedAt: string;
  sourceType: FollowerSourceType;
  sourceLabel: string;
  sourceUri: string | null;
  sourceActorDid: string | null;
  sourceActorHandle: string | null;
  method: AttributionMethod;
  confidence: number;
  evidence: FollowerAttributionEvidence[];
  notificationUri: string;
};

export type FollowerSourceReport = {
  configured: boolean;
  actorHandle: string | null;
  generatedAt: string;
  lastSyncAt: string | null;
  lastSyncError: string | null;
  days: number;
  totals: {
    followers: number;
    exact: number;
    inferred: number;
    unknown: number;
    starterPack: number;
  };
  sources: Array<{
    sourceType: FollowerSourceType;
    sourceLabel: string;
    method: AttributionMethod;
    count: number;
    averageConfidence: number;
  }>;
  followers: Array<{
    did: string;
    handle: string;
    displayName: string | null;
    followedAt: string;
    sourceType: FollowerSourceType;
    sourceLabel: string;
    sourceUri: string | null;
    sourceActorHandle: string | null;
    method: AttributionMethod;
    confidence: number;
    evidence: FollowerAttributionEvidence[];
  }>;
};

function normalizeHandle(value: string) {
  return value.trim().replace(/^@/, "").toLowerCase();
}

function encryptionSecret() {
  const value = process.env.ADVANCED_NETWORK_ACCESS_SECRET?.trim();
  if (!value) {
    throw new Error(
      "ADVANCED_NETWORK_ACCESS_SECRET is required to read the saved Bluesky credential.",
    );
  }
  return value;
}

function encryptionKey() {
  return createHash("sha256")
    .update(`rukh-bluesky-follow-automation:${encryptionSecret()}`)
    .digest();
}

function decryptSavedPassword(value: string) {
  const [version, ivText, tagText, encryptedText] = value.split(".");
  if (version !== "v1" || !ivText || !tagText || !encryptedText) {
    throw new Error("The saved Bluesky credential is not readable.");
  }
  const decipher = createDecipheriv(
    "aes-256-gcm",
    encryptionKey(),
    Buffer.from(ivText, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(tagText, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedText, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

async function fetchJson<T>(url: URL | string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, cache: "no-store" });
  if (!response.ok) {
    let message = `Bluesky returned ${response.status}.`;
    try {
      const body = (await response.json()) as { message?: string };
      if (body.message) message = body.message;
    } catch {
      // Upstream failures are not always JSON.
    }
    throw new Error(message);
  }
  return (await response.json()) as T;
}

async function resolveDid(identifier: string) {
  if (identifier.startsWith("did:")) return identifier;
  const url = new URL(`${PUBLIC_API}/com.atproto.identity.resolveHandle`);
  url.searchParams.set("handle", normalizeHandle(identifier));
  const resolved = await fetchJson<ResolveHandleResponse>(url);
  if (!resolved.did.startsWith("did:")) {
    throw new Error("Bluesky returned an invalid DID for this account.");
  }
  return resolved.did;
}

function didDocumentUrl(did: string) {
  if (did.startsWith("did:plc:")) return `https://plc.directory/${did}`;
  if (did.startsWith("did:web:")) {
    const parts = did
      .slice("did:web:".length)
      .split(":")
      .map((part) => decodeURIComponent(part));
    const host = parts.shift();
    if (!host) throw new Error("The Bluesky DID document host is invalid.");
    if (!parts.length) return `https://${host}/.well-known/did.json`;
    return `https://${host}/${parts.map((part) => encodeURIComponent(part)).join("/")}/did.json`;
  }
  throw new Error(`Unsupported Bluesky DID method: ${did.split(":").slice(0, 2).join(":")}`);
}

async function resolvePds(identifier: string) {
  const did = await resolveDid(identifier);
  const document = await fetchJson<DidDocument>(didDocumentUrl(did));
  const service = document.service?.find(
    (item) => item.id === `${did}#atproto_pds` || item.id?.endsWith("#atproto_pds"),
  );
  if (!service || typeof service.serviceEndpoint !== "string") {
    throw new Error("Could not find this account's AT Protocol PDS.");
  }
  const endpoint = new URL(service.serviceEndpoint);
  if (endpoint.protocol !== "https:") throw new Error("The account PDS must use HTTPS.");
  return { did, pdsUrl: endpoint.toString().replace(/\/$/, "") };
}

async function createSession(identifier: string, password: string) {
  const { did, pdsUrl } = await resolvePds(identifier);
  const session = await fetchJson<Omit<BskySession, "pdsUrl">>(
    `${pdsUrl}/xrpc/com.atproto.server.createSession`,
    {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({ identifier, password }),
    },
  );
  if (session.did !== did) throw new Error("Bluesky login resolved to a different account.");
  return { ...session, pdsUrl };
}

async function ensureAttributionSchema(sql: Sql = getSql()) {
  await sql`
    create table if not exists bluesky_follower_attribution_state (
      id smallint primary key check (id = 1),
      last_sync_at timestamptz,
      last_sync_error text,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )
  `;
  await sql`
    insert into bluesky_follower_attribution_state (id)
    values (1)
    on conflict (id) do nothing
  `;
  await sql`
    create table if not exists bluesky_follower_attribution (
      follower_did text primary key,
      follower_handle text not null,
      profile_name text,
      followed_at timestamptz not null,
      source_type text not null default 'unknown',
      source_label text not null default 'Unknown / organic',
      source_uri text,
      source_actor_did text,
      source_actor_handle text,
      attribution_method text not null default 'unattributed',
      confidence integer not null default 0 check (confidence between 0 and 100),
      evidence jsonb not null default '[]'::jsonb,
      notification_uri text,
      attributed_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )
  `;
  await sql`
    create index if not exists bluesky_follower_attribution_followed_idx
      on bluesky_follower_attribution (followed_at desc)
  `;
  await sql`
    create index if not exists bluesky_follower_attribution_source_idx
      on bluesky_follower_attribution (source_type, source_label)
  `;
  return sql;
}

async function loadCredential(sql: Sql): Promise<AutomationCredential | null> {
  try {
    const rows = await sql`
      select actor_handle, app_password_enc
      from bluesky_follow_automation_settings
      where id = 1
    `;
    const row = rows[0] as Record<string, unknown> | undefined;
    const actorHandle = String(row?.actor_handle ?? "").trim();
    const encryptedPassword = String(row?.app_password_enc ?? "").trim();
    if (!actorHandle || !encryptedPassword) return null;
    return { actorHandle, encryptedPassword };
  } catch {
    return null;
  }
}

async function listRecentNotifications(session: BskySession) {
  const notifications: BskyNotification[] = [];
  let cursor: string | undefined;
  for (let page = 0; page < MAX_NOTIFICATION_PAGES; page += 1) {
    const url = new URL(`${session.pdsUrl}/xrpc/app.bsky.notification.listNotifications`);
    url.searchParams.set("limit", "100");
    if (cursor) url.searchParams.set("cursor", cursor);
    const result = await fetchJson<NotificationPage>(url, {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${session.accessJwt}`,
      },
    });
    notifications.push(...result.notifications);
    cursor = result.cursor;
    if (!cursor || result.notifications.length === 0) break;
  }
  return notifications;
}

function minutesBetween(earlier: string, later: string) {
  const delta = new Date(later).getTime() - new Date(earlier).getTime();
  if (!Number.isFinite(delta) || delta < 0) return null;
  return Math.round(delta / 60_000);
}

function recordName(record: unknown) {
  if (!record || typeof record !== "object") return null;
  const value = (record as Record<string, unknown>).name;
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function directReasonLabel(reason: string) {
  if (reason === "reply" || reason === "mention") return "Conversation";
  if (reason === "like-via-repost" || reason === "repost-via-repost") {
    return "Post amplification via repost";
  }
  if (reason === "quote") return "Your quoted post";
  if (reason === "repost") return "Your reposted post";
  return "Your post";
}

function directConfidence(reason: string, minutes: number) {
  const base =
    reason === "like-via-repost" || reason === "repost-via-repost"
      ? 89
      : reason === "repost" || reason === "quote"
        ? 84
        : reason === "reply" || reason === "mention"
          ? 78
          : 70;
  if (minutes <= 30) return base;
  if (minutes <= 180) return Math.max(64, base - 5);
  if (minutes <= 1_440) return Math.max(58, base - 10);
  return Math.max(52, base - 16);
}

const DIRECT_REASONS = new Set([
  "like",
  "repost",
  "quote",
  "reply",
  "mention",
  "like-via-repost",
  "repost-via-repost",
]);

const AMPLIFIER_REASONS = new Set(["repost", "quote", "repost-via-repost"]);

function nearestPriorNotification(
  notifications: BskyNotification[],
  follow: BskyNotification,
  predicate: (notification: BskyNotification) => boolean,
  maxMinutes: number,
) {
  return notifications
    .map((notification) => ({
      notification,
      minutes: minutesBetween(notification.indexedAt, follow.indexedAt),
    }))
    .filter(
      (item): item is { notification: BskyNotification; minutes: number } =>
        item.minutes !== null && item.minutes <= maxMinutes && predicate(item.notification),
    )
    .sort((a, b) => a.minutes - b.minutes)[0];
}

async function relationships(actorDid: string, others: ActorView[]) {
  const unique = Array.from(new Map(others.map((actor) => [actor.did, actor])).values()).slice(0, 30);
  if (!unique.length) return new Map<string, Relationship>();
  const url = new URL(`${PUBLIC_API}/app.bsky.graph.getRelationships`);
  url.searchParams.set("actor", actorDid);
  for (const actor of unique) url.searchParams.append("others", actor.did);
  const result = await fetchJson<RelationshipResponse>(url);
  return new Map(
    result.relationships
      .filter((item) => typeof item.did === "string")
      .map((item) => [String(item.did), item]),
  );
}

async function classifyFollow(
  follow: BskyNotification,
  notifications: BskyNotification[],
): Promise<Attribution> {
  const base = {
    followerDid: follow.author.did,
    followerHandle: normalizeHandle(follow.author.handle),
    profileName: follow.author.displayName?.trim() || null,
    followedAt: follow.indexedAt,
    notificationUri: follow.uri,
  };

  if (follow.starterPack) {
    const packName = recordName(follow.starterPack.record);
    const creatorHandle = follow.starterPack.creator?.handle
      ? normalizeHandle(follow.starterPack.creator.handle)
      : null;
    return {
      ...base,
      sourceType: "starter_pack",
      sourceLabel: packName || (creatorHandle ? `Starter Pack by @${creatorHandle}` : "Starter Pack"),
      sourceUri: follow.starterPack.uri,
      sourceActorDid: follow.starterPack.creator?.did ?? null,
      sourceActorHandle: creatorHandle,
      method: "exact",
      confidence: 100,
      evidence: [
        {
          kind: "starter-pack",
          text: "Bluesky attached this Starter Pack directly to the follow notification.",
          subjectUri: follow.starterPack.uri,
          actorHandle: creatorHandle ?? undefined,
        },
      ],
    };
  }

  const direct = nearestPriorNotification(
    notifications,
    follow,
    (notification) =>
      notification.author.did === follow.author.did && DIRECT_REASONS.has(notification.reason),
    MAX_DIRECT_WINDOW_MINUTES,
  );

  if (direct) {
    const conversation = direct.notification.reason === "reply" || direct.notification.reason === "mention";
    return {
      ...base,
      sourceType: conversation ? "conversation" : "post_amplification",
      sourceLabel: directReasonLabel(direct.notification.reason),
      sourceUri: direct.notification.reasonSubject ?? null,
      sourceActorDid: follow.author.did,
      sourceActorHandle: normalizeHandle(follow.author.handle),
      method: "inferred",
      confidence: directConfidence(direct.notification.reason, direct.minutes),
      evidence: [
        {
          kind: "direct-interaction",
          text: `@${normalizeHandle(follow.author.handle)} ${direct.notification.reason.replaceAll("-", " ")} ${direct.minutes} minute${direct.minutes === 1 ? "" : "s"} before following.`,
          subjectUri: direct.notification.reasonSubject,
          actorHandle: normalizeHandle(follow.author.handle),
          minutesBeforeFollow: direct.minutes,
        },
      ],
    };
  }

  const amplifierCandidates = notifications
    .map((notification) => ({
      notification,
      minutes: minutesBetween(notification.indexedAt, follow.indexedAt),
    }))
    .filter(
      (item): item is { notification: BskyNotification; minutes: number } =>
        item.minutes !== null &&
        item.minutes <= MAX_PROMOTION_WINDOW_MINUTES &&
        item.notification.author.did !== follow.author.did &&
        AMPLIFIER_REASONS.has(item.notification.reason),
    )
    .sort((a, b) => a.minutes - b.minutes)
    .slice(0, 30);

  if (amplifierCandidates.length) {
    try {
      const relationMap = await relationships(
        follow.author.did,
        amplifierCandidates.map((item) => item.notification.author),
      );
      const promotedBy = amplifierCandidates.find((candidate) =>
        Boolean(relationMap.get(candidate.notification.author.did)?.following),
      );
      if (promotedBy) {
        const promoter = promotedBy.notification.author;
        const promoterHandle = normalizeHandle(promoter.handle);
        const confidence =
          promotedBy.minutes <= 30 ? 86 : promotedBy.minutes <= 120 ? 79 : 70;
        return {
          ...base,
          sourceType: "promotion",
          sourceLabel: `@${promoterHandle} amplification`,
          sourceUri: promotedBy.notification.reasonSubject ?? null,
          sourceActorDid: promoter.did,
          sourceActorHandle: promoterHandle,
          method: "inferred",
          confidence,
          evidence: [
            {
              kind: "promotion",
              text: `The follower already follows @${promoterHandle} and followed you ${promotedBy.minutes} minute${promotedBy.minutes === 1 ? "" : "s"} after that account ${promotedBy.notification.reason.replaceAll("-", " ")} your content.`,
              subjectUri: promotedBy.notification.reasonSubject,
              actorHandle: promoterHandle,
              minutesBeforeFollow: promotedBy.minutes,
            },
          ],
        };
      }
    } catch {
      // A relationship lookup failure should not turn uncertain evidence into a claim.
    }
  }

  return {
    ...base,
    sourceType: "unknown",
    sourceLabel: "Unknown / organic",
    sourceUri: null,
    sourceActorDid: null,
    sourceActorHandle: null,
    method: "unattributed",
    confidence: 0,
    evidence: [
      {
        kind: "unknown",
        text: "Bluesky did not expose a Starter Pack or enough public evidence to attribute this follow. It may be Discover, search, a direct profile visit, an external link, or another source.",
      },
    ],
  };
}

async function saveAttribution(sql: Sql, attribution: Attribution) {
  const evidence = JSON.stringify(attribution.evidence);
  await sql`
    insert into bluesky_follower_attribution (
      follower_did, follower_handle, profile_name, followed_at,
      source_type, source_label, source_uri, source_actor_did,
      source_actor_handle, attribution_method, confidence, evidence,
      notification_uri, attributed_at, updated_at
    ) values (
      ${attribution.followerDid}, ${attribution.followerHandle}, ${attribution.profileName},
      ${attribution.followedAt}, ${attribution.sourceType}, ${attribution.sourceLabel},
      ${attribution.sourceUri}, ${attribution.sourceActorDid}, ${attribution.sourceActorHandle},
      ${attribution.method}, ${attribution.confidence}, ${evidence}::jsonb,
      ${attribution.notificationUri}, now(), now()
    )
    on conflict (follower_did) do update set
      follower_handle = excluded.follower_handle,
      profile_name = excluded.profile_name,
      followed_at = excluded.followed_at,
      source_type = excluded.source_type,
      source_label = excluded.source_label,
      source_uri = excluded.source_uri,
      source_actor_did = excluded.source_actor_did,
      source_actor_handle = excluded.source_actor_handle,
      attribution_method = excluded.attribution_method,
      confidence = excluded.confidence,
      evidence = excluded.evidence,
      notification_uri = excluded.notification_uri,
      attributed_at = now(),
      updated_at = now()
    where excluded.followed_at >= bluesky_follower_attribution.followed_at
  `;
}

function latestFollows(notifications: BskyNotification[]) {
  const follows = notifications
    .filter((notification) => notification.reason === "follow" && notification.author?.did)
    .sort(
      (a, b) => new Date(b.indexedAt).getTime() - new Date(a.indexedAt).getTime(),
    );
  const latest = new Map<string, BskyNotification>();
  for (const follow of follows) {
    if (!latest.has(follow.author.did)) latest.set(follow.author.did, follow);
  }
  return Array.from(latest.values()).sort(
    (a, b) => new Date(a.indexedAt).getTime() - new Date(b.indexedAt).getTime(),
  );
}

export async function syncFollowerAttribution() {
  const sql = await ensureAttributionSchema();
  const credential = await loadCredential(sql);
  if (!credential) {
    return {
      ok: true,
      skipped: true,
      processed: 0,
      message: "A saved Bluesky app password is required for follower attribution.",
    };
  }

  try {
    const session = await createSession(
      credential.actorHandle,
      decryptSavedPassword(credential.encryptedPassword),
    );
    const notifications = await listRecentNotifications(session);
    const follows = latestFollows(notifications);
    for (const follow of follows) {
      await saveAttribution(sql, await classifyFollow(follow, notifications));
    }
    await sql`
      update bluesky_follower_attribution_state
      set last_sync_at = now(), last_sync_error = null, updated_at = now()
      where id = 1
    `;
    return {
      ok: true,
      skipped: false,
      processed: follows.length,
      notificationsScanned: notifications.length,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 900) : "Follower attribution failed.";
    await sql`
      update bluesky_follower_attribution_state
      set last_sync_at = now(), last_sync_error = ${message}, updated_at = now()
      where id = 1
    `;
    throw error;
  }
}

function parseEvidence(value: unknown): FollowerAttributionEvidence[] {
  if (Array.isArray(value)) return value as FollowerAttributionEvidence[];
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? (parsed as FollowerAttributionEvidence[]) : [];
    } catch {
      return [];
    }
  }
  return [];
}

function safeDays(value: number) {
  if (value === 7 || value === 30 || value === 90) return value;
  return 30;
}

export async function getFollowerSourceReport(daysInput = 30): Promise<FollowerSourceReport> {
  const days = safeDays(daysInput);
  const sql = await ensureAttributionSchema();
  const credential = await loadCredential(sql);
  const stateRows = await sql`
    select last_sync_at, last_sync_error
    from bluesky_follower_attribution_state
    where id = 1
  `;
  const state = (stateRows[0] ?? {}) as Record<string, unknown>;
  const summaryRows = await sql`
    select
      count(*)::int as followers,
      count(*) filter (where attribution_method = 'exact')::int as exact,
      count(*) filter (where attribution_method = 'inferred')::int as inferred,
      count(*) filter (where attribution_method = 'unattributed')::int as unknown,
      count(*) filter (where source_type = 'starter_pack')::int as starter_pack
    from bluesky_follower_attribution
    where followed_at >= now() - (${days} * interval '1 day')
  `;
  const summary = (summaryRows[0] ?? {}) as Record<string, unknown>;
  const sourceRows = await sql`
    select source_type, source_label, attribution_method,
           count(*)::int as count,
           round(avg(confidence))::int as average_confidence
    from bluesky_follower_attribution
    where followed_at >= now() - (${days} * interval '1 day')
    group by source_type, source_label, attribution_method
    order by count(*) desc, source_label asc
  `;
  const followerRows = await sql`
    select follower_did, follower_handle, profile_name, followed_at,
           source_type, source_label, source_uri, source_actor_handle,
           attribution_method, confidence, evidence
    from bluesky_follower_attribution
    where followed_at >= now() - (${days} * interval '1 day')
    order by followed_at desc
    limit 200
  `;
  const number = (key: string) => Number(summary[key] ?? 0);

  return {
    configured: Boolean(credential),
    actorHandle: credential?.actorHandle ?? null,
    generatedAt: new Date().toISOString(),
    lastSyncAt: state.last_sync_at ? String(state.last_sync_at) : null,
    lastSyncError: state.last_sync_error ? String(state.last_sync_error) : null,
    days,
    totals: {
      followers: number("followers"),
      exact: number("exact"),
      inferred: number("inferred"),
      unknown: number("unknown"),
      starterPack: number("starter_pack"),
    },
    sources: sourceRows.map((row) => ({
      sourceType: String(row.source_type) as FollowerSourceType,
      sourceLabel: String(row.source_label),
      method: String(row.attribution_method) as AttributionMethod,
      count: Number(row.count ?? 0),
      averageConfidence: Number(row.average_confidence ?? 0),
    })),
    followers: followerRows.map((row) => ({
      did: String(row.follower_did),
      handle: String(row.follower_handle),
      displayName: row.profile_name ? String(row.profile_name) : null,
      followedAt: String(row.followed_at),
      sourceType: String(row.source_type) as FollowerSourceType,
      sourceLabel: String(row.source_label),
      sourceUri: row.source_uri ? String(row.source_uri) : null,
      sourceActorHandle: row.source_actor_handle ? String(row.source_actor_handle) : null,
      method: String(row.attribution_method) as AttributionMethod,
      confidence: Number(row.confidence ?? 0),
      evidence: parseEvidence(row.evidence),
    })),
  };
}
