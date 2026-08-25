import { createDecipheriv, createHash } from "node:crypto";
import { neon } from "@neondatabase/serverless";
import { ensureFollowAutomationSchema } from "@/lib/bluesky-follow-automation";

const PUBLIC_API = "https://public.api.bsky.app/xrpc";

type DidDocument = {
  service?: Array<{ id?: string; serviceEndpoint?: unknown }>;
};

type Session = {
  accessJwt: string;
  did: string;
  handle: string;
  pdsUrl: string;
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

async function getJson<T>(url: string) {
  const response = await fetch(url, { headers: { Accept: "application/json" }, cache: "no-store" });
  if (!response.ok) throw new Error(`Bluesky returned ${response.status}.`);
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
  return { handle: current.handle, configured: Boolean(current.handle && current.encryptedPassword) };
}

async function session(): Promise<Session> {
  const current = await settings();
  if (!current.handle || !current.encryptedPassword) {
    throw new Error("Save the Bluesky app password in IAZMA server automation first.");
  }
  const did = await resolveDid(current.handle);
  const document = await getJson<DidDocument>(didDocumentUrl(did));
  const service = document.service?.find(
    (item) => item.id === `${did}#atproto_pds` || item.id?.endsWith("#atproto_pds"),
  );
  if (!service || typeof service.serviceEndpoint !== "string") {
    throw new Error("Could not find this account's Bluesky PDS.");
  }
  const pdsUrl = new URL(service.serviceEndpoint).toString().replace(/\/$/, "");
  const response = await fetch(`${pdsUrl}/xrpc/com.atproto.server.createSession`, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({ identifier: current.handle, password: decrypt(current.encryptedPassword) }),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Bluesky login returned ${response.status}.`);
  const data = (await response.json()) as Omit<Session, "pdsUrl">;
  if (data.did !== did) throw new Error("Bluesky login resolved to a different account.");
  return { ...data, pdsUrl };
}

export async function createAutomationRepost(subject: { uri: string; cid: string }) {
  const auth = await session();
  const response = await fetch(`${auth.pdsUrl}/xrpc/com.atproto.repo.createRecord`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${auth.accessJwt}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      repo: auth.did,
      collection: "app.bsky.feed.repost",
      record: {
        $type: "app.bsky.feed.repost",
        subject,
        createdAt: new Date().toISOString(),
      },
    }),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Bluesky repost returned ${response.status}.`);
  return (await response.json()) as { uri: string; cid: string };
}
