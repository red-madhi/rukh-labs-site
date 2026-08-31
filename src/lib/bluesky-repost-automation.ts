import { createDecipheriv, createHash } from "node:crypto";
import { neon } from "@neondatabase/serverless";
import { ensureFollowAutomationSchema } from "@/lib/bluesky-follow-automation";

const PUBLIC_API = "https://public.api.bsky.app/xrpc";
const REPOST_COLLECTION = "app.bsky.feed.repost";
const REPOST_SCAN_PAGE_LIMIT = 100;
const REPOST_SCAN_MAX_PAGES = 10;
const AUTHOR_FEED_PAGE_LIMIT = 100;
const AUTHOR_FEED_MAX_PAGES = 5;
const REPOSTED_BY_MAX_PAGES = 10;
const PUBLIC_VISIBILITY_DELAYS_MS = [0, 400, 1_200, 2_500] as const;
const REPOSITORY_VERIFY_DELAYS_MS = [0, 200, 600, 1_200] as const;

type DidDocument = {
  service?: Array<{ id?: string; serviceEndpoint?: unknown }>;
};

type Session = {
  accessJwt: string;
  did: string;
  handle: string;
  pdsUrl: string;
};

type ActorIdentity = {
  did: string;
  handle: string;
  pdsUrl: string;
};

type RepostSubject = {
  uri: string;
  cid: string;
};

type RepostRecordValue = {
  $type?: string;
  subject?: {
    uri?: string;
    cid?: string;
  };
  createdAt?: string;
};

type RepoRecord = {
  uri: string;
  cid: string;
  value?: RepostRecordValue;
};

type ListRecordsResponse = {
  records?: RepoRecord[];
  cursor?: string;
};

type RepostedByResponse = {
  repostedBy?: Array<{ did?: string }>;
  cursor?: string;
};

type AuthorFeedResponse = {
  feed?: Array<{
    reason?: {
      $type?: string;
      by?: { did?: string };
    };
    post: { uri: string };
  }>;
  cursor?: string;
};

type VisibilityResult = {
  publicVisible: boolean | null;
  visibilityError: string | null;
};

export type AutomationRepostInspection = VisibilityResult & {
  actorDid: string;
  actorHandle: string;
  found: boolean;
  repositoryVerified: boolean;
  uri: string | null;
  cid: string | null;
  createdAt: string | null;
  recovered: boolean;
};

export type AutomationRepostResult = VisibilityResult & {
  actorDid: string;
  actorHandle: string;
  uri: string;
  cid: string;
  createdAt: string | null;
  created: boolean;
  repositoryVerified: true;
  recovered: boolean;
};

function sql() {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) throw new Error("DATABASE_URL is not configured.");
  return neon(url);
}

function secret() {
  const value = process.env.ADVANCED_NETWORK_ACCESS_SECRET?.trim();
  if (!value) throw new Error("ADVANCED_NETWORK_ACCESS_SECRET is not configured.");
  return value;
}

function decrypt(value: string) {
  const [version, ivText, tagText, encryptedText] = value.split(".");
  if (version !== "v1" || !ivText || !tagText || !encryptedText) {
    throw new Error("The saved Bluesky credential is not readable.");
  }
  const key = createHash("sha256")
    .update(`rukh-bluesky-follow-automation:${secret()}`)
    .digest();
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(ivText, "base64url"));
  decipher.setAuthTag(Buffer.from(tagText, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedText, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

function sleep(milliseconds: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, milliseconds));
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

async function responseDetail(response: Response) {
  try {
    const text = (await response.text()).trim();
    if (!text) return "";
    try {
      const parsed = JSON.parse(text) as { error?: unknown; message?: unknown };
      const detail = parsed.message ?? parsed.error;
      return detail ? String(detail).slice(0, 400) : text.slice(0, 400);
    } catch {
      return text.slice(0, 400);
    }
  } catch {
    return "";
  }
}

async function failedResponse(response: Response, label: string) {
  const detail = await responseDetail(response);
  return new Error(`${label} returned ${response.status}${detail ? `: ${detail}` : ""}.`);
}

async function getJson<T>(url: string) {
  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  if (!response.ok) throw await failedResponse(response, "Bluesky");
  return (await response.json()) as T;
}

async function resolveDid(handle: string) {
  const url = new URL(`${PUBLIC_API}/com.atproto.identity.resolveHandle`);
  url.searchParams.set("handle", handle);
  const result = await getJson<{ did: string }>(url.toString());
  return result.did;
}

function didDocumentUrl(did: string) {
  if (did.startsWith("did:plc:")) return `https://plc.directory/${did}`;
  if (did.startsWith("did:web:")) {
    const parts = did.slice(8).split(":").map(decodeURIComponent);
    const host = parts.shift();
    if (!host) throw new Error("Invalid did:web identifier.");
    return parts.length
      ? `https://${host}/${parts.map(encodeURIComponent).join("/")}/did.json`
      : `https://${host}/.well-known/did.json`;
  }
  throw new Error("Unsupported Bluesky DID method.");
}

async function resolveIdentity(handle: string): Promise<ActorIdentity> {
  const did = await resolveDid(handle);
  const document = await getJson<DidDocument>(didDocumentUrl(did));
  const service = document.service?.find(
    (item) => item.id === `${did}#atproto_pds` || item.id?.endsWith("#atproto_pds"),
  );
  if (!service || typeof service.serviceEndpoint !== "string") {
    throw new Error("Could not find this account's Bluesky PDS.");
  }
  return {
    did,
    handle,
    pdsUrl: new URL(service.serviceEndpoint).toString().replace(/\/$/, ""),
  };
}

async function settings() {
  await ensureFollowAutomationSchema();
  const db = sql();
  const rows = await db`
    select actor_handle, app_password_enc
    from bluesky_follow_automation_settings
    where id = 1
  `;
  const handle = String(rows[0]?.actor_handle ?? "").trim();
  const encryptedPassword = String(rows[0]?.app_password_enc ?? "").trim();
  return { handle, encryptedPassword };
}

export async function getAutomationBlueskyActor() {
  const current = await settings();
  if (!current.handle || !current.encryptedPassword) {
    return {
      handle: current.handle,
      did: null,
      pdsUrl: null,
      configured: false as const,
    };
  }
  const identity = await resolveIdentity(current.handle);
  return { ...identity, configured: true as const };
}

async function session(): Promise<Session> {
  const current = await settings();
  if (!current.handle || !current.encryptedPassword) {
    throw new Error("Save the Bluesky app password in IAZMA server automation first.");
  }
  const identity = await resolveIdentity(current.handle);
  const response = await fetch(`${identity.pdsUrl}/xrpc/com.atproto.server.createSession`, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({
      identifier: current.handle,
      password: decrypt(current.encryptedPassword),
    }),
    cache: "no-store",
  });
  if (!response.ok) throw await failedResponse(response, "Bluesky login");
  const data = (await response.json()) as Omit<Session, "pdsUrl">;
  if (data.did !== identity.did) {
    throw new Error("Bluesky login resolved to a different account.");
  }
  return { ...data, pdsUrl: identity.pdsUrl };
}

function parseAtUri(uri: string) {
  if (!uri.startsWith("at://")) return null;
  const [repo, collection, rkey] = uri.slice(5).split("/");
  if (!repo || !collection || !rkey) return null;
  return { repo, collection, rkey };
}

function matchesSubject(record: RepoRecord | null, subject: RepostSubject) {
  return Boolean(
    record &&
      record.value?.$type === REPOST_COLLECTION &&
      record.value.subject?.uri === subject.uri &&
      record.value.subject?.cid === subject.cid,
  );
}

async function readRepostRecord(
  actor: ActorIdentity,
  repostUri: string,
  subject: RepostSubject,
) {
  const parsed = parseAtUri(repostUri);
  if (
    !parsed ||
    parsed.repo !== actor.did ||
    parsed.collection !== REPOST_COLLECTION
  ) {
    return null;
  }

  const url = new URL(`${actor.pdsUrl}/xrpc/com.atproto.repo.getRecord`);
  url.searchParams.set("repo", actor.did);
  url.searchParams.set("collection", REPOST_COLLECTION);
  url.searchParams.set("rkey", parsed.rkey);
  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  if (!response.ok) {
    const detail = await responseDetail(response);
    if (
      response.status === 404 ||
      (response.status === 400 && /not.?found|recordnotfound/i.test(detail))
    ) {
      return null;
    }
    throw new Error(
      `Bluesky repost verification returned ${response.status}${detail ? `: ${detail}` : ""}.`,
    );
  }
  const record = (await response.json()) as RepoRecord;
  return matchesSubject(record, subject) ? record : null;
}

async function findRepostRecord(actor: ActorIdentity, subject: RepostSubject) {
  let cursor: string | undefined;
  for (let page = 0; page < REPOST_SCAN_MAX_PAGES; page += 1) {
    const url = new URL(`${actor.pdsUrl}/xrpc/com.atproto.repo.listRecords`);
    url.searchParams.set("repo", actor.did);
    url.searchParams.set("collection", REPOST_COLLECTION);
    url.searchParams.set("limit", String(REPOST_SCAN_PAGE_LIMIT));
    url.searchParams.set("reverse", "true");
    if (cursor) url.searchParams.set("cursor", cursor);

    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!response.ok) throw await failedResponse(response, "Bluesky repost scan");
    const payload = (await response.json()) as ListRecordsResponse;
    const match = (payload.records ?? []).find((record) => matchesSubject(record, subject));
    if (match) return match;
    if (!payload.cursor || payload.cursor === cursor) break;
    cursor = payload.cursor;
  }
  return null;
}

async function checkPublicVisibility(actorDid: string, subjectUri: string) {
  let cursor: string | undefined;
  for (let page = 0; page < AUTHOR_FEED_MAX_PAGES; page += 1) {
    const url = new URL(`${PUBLIC_API}/app.bsky.feed.getAuthorFeed`);
    url.searchParams.set("actor", actorDid);
    url.searchParams.set("limit", String(AUTHOR_FEED_PAGE_LIMIT));
    url.searchParams.set("filter", "posts_with_replies");
    url.searchParams.set("includePins", "false");
    if (cursor) url.searchParams.set("cursor", cursor);

    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!response.ok) throw await failedResponse(response, "Bluesky public feed check");
    const payload = (await response.json()) as AuthorFeedResponse;
    const visible = (payload.feed ?? []).some(
      (item) =>
        item.post.uri === subjectUri &&
        item.reason?.$type === "app.bsky.feed.defs#reasonRepost" &&
        item.reason.by?.did === actorDid,
    );
    if (visible) return true;
    if (!payload.cursor || payload.cursor === cursor) break;
    cursor = payload.cursor;
  }
  cursor = undefined;
  for (let page = 0; page < REPOSTED_BY_MAX_PAGES; page += 1) {
    const url = new URL(`${PUBLIC_API}/app.bsky.feed.getRepostedBy`);
    url.searchParams.set("uri", subjectUri);
    url.searchParams.set("limit", String(AUTHOR_FEED_PAGE_LIMIT));
    if (cursor) url.searchParams.set("cursor", cursor);

    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!response.ok) throw await failedResponse(response, "Bluesky repost index check");
    const payload = (await response.json()) as RepostedByResponse;
    if ((payload.repostedBy ?? []).some((actor) => actor.did === actorDid)) return true;
    if (!payload.cursor || payload.cursor === cursor) break;
    cursor = payload.cursor;
  }
  return false;
}

async function visibilityOnce(actorDid: string, subjectUri: string): Promise<VisibilityResult> {
  try {
    return {
      publicVisible: await checkPublicVisibility(actorDid, subjectUri),
      visibilityError: null,
    };
  } catch (error) {
    return { publicVisible: null, visibilityError: errorMessage(error).slice(0, 500) };
  }
}

async function waitForPublicVisibility(
  actorDid: string,
  subjectUri: string,
): Promise<VisibilityResult> {
  let sawDefinitiveCheck = false;
  let lastError: string | null = null;
  for (const delay of PUBLIC_VISIBILITY_DELAYS_MS) {
    if (delay) await sleep(delay);
    const result = await visibilityOnce(actorDid, subjectUri);
    if (result.publicVisible === true) return result;
    if (result.publicVisible === false) sawDefinitiveCheck = true;
    if (result.visibilityError) lastError = result.visibilityError;
  }
  return {
    publicVisible: sawDefinitiveCheck ? false : null,
    visibilityError: lastError,
  };
}

export async function inspectAutomationRepost(
  subject: RepostSubject,
  repostUri?: string | null,
): Promise<AutomationRepostInspection> {
  const configured = await getAutomationBlueskyActor();
  if (!configured.configured) {
    throw new Error("Bluesky server automation is not configured.");
  }
  const actor: ActorIdentity = configured;

  let record = repostUri
    ? await readRepostRecord(actor, repostUri, subject)
    : null;
  let recovered = false;
  if (!record) {
    record = await findRepostRecord(actor, subject);
    recovered = Boolean(record);
  }
  if (!record) {
    return {
      actorDid: actor.did,
      actorHandle: actor.handle,
      found: false,
      repositoryVerified: false,
      uri: null,
      cid: null,
      createdAt: null,
      recovered: false,
      publicVisible: false,
      visibilityError: null,
    };
  }

  const visibility = await visibilityOnce(actor.did, subject.uri);
  return {
    actorDid: actor.did,
    actorHandle: actor.handle,
    found: true,
    repositoryVerified: true,
    uri: record.uri,
    cid: record.cid,
    createdAt: record.value?.createdAt ?? null,
    recovered,
    ...visibility,
  };
}

export async function createAutomationRepost(
  subject: RepostSubject,
): Promise<AutomationRepostResult> {
  const auth = await session();
  const actor: ActorIdentity = auth;

  const preexisting = await findRepostRecord(actor, subject);
  if (preexisting) {
    const visibility = await waitForPublicVisibility(auth.did, subject.uri);
    return {
      actorDid: auth.did,
      actorHandle: auth.handle,
      uri: preexisting.uri,
      cid: preexisting.cid,
      createdAt: preexisting.value?.createdAt ?? null,
      created: false,
      repositoryVerified: true,
      recovered: true,
      ...visibility,
    };
  }

  const response = await fetch(`${auth.pdsUrl}/xrpc/com.atproto.repo.createRecord`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${auth.accessJwt}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      repo: auth.did,
      collection: REPOST_COLLECTION,
      validate: true,
      record: {
        $type: REPOST_COLLECTION,
        subject,
        createdAt: new Date().toISOString(),
      },
    }),
    cache: "no-store",
  });
  if (!response.ok) {
    const recovered = await findRepostRecord(actor, subject);
    if (recovered) {
      const visibility = await waitForPublicVisibility(auth.did, subject.uri);
      return {
        actorDid: auth.did,
        actorHandle: auth.handle,
        uri: recovered.uri,
        cid: recovered.cid,
        createdAt: recovered.value?.createdAt ?? null,
        created: false,
        repositoryVerified: true,
        recovered: true,
        ...visibility,
      };
    }
    throw await failedResponse(response, "Bluesky repost");
  }

  const created = (await response.json()) as { uri: string; cid: string };
  let verified: RepoRecord | null = null;
  for (const delay of REPOSITORY_VERIFY_DELAYS_MS) {
    if (delay) await sleep(delay);
    verified = await readRepostRecord(actor, created.uri, subject);
    if (verified) break;
  }
  if (!verified) verified = await findRepostRecord(actor, subject);
  if (!verified) {
    throw new Error(
      "Bluesky accepted the repost write, but the record could not be read back from the account repository.",
    );
  }

  const visibility = await waitForPublicVisibility(auth.did, subject.uri);
  return {
    actorDid: auth.did,
    actorHandle: auth.handle,
    uri: verified.uri,
    cid: verified.cid,
    createdAt: verified.value?.createdAt ?? null,
    created: true,
    repositoryVerified: true,
    recovered: verified.uri !== created.uri,
    ...visibility,
  };
}
