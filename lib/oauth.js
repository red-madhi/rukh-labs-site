import { Agent } from "@atproto/api";
import { NodeOAuthClient } from "@atproto/oauth-client-node";
import { query } from "./db.js";

export const OAUTH_SCOPE = [
  "atproto",
  "repo:app.bsky.graph.follow",
  "repo:app.bsky.graph.block",
].join(" ");

let oauthClientPromise;

function appUrl() {
  return (
    process.env.GUARD_APP_URL ||
    "https://rukh-labs-site-git-iazma-guard-rukh-labs.vercel.app"
  ).replace(/\/$/, "");
}

export function getClientMetadata() {
  const base = appUrl();
  return {
    client_id: `${base}/client-metadata.json`,
    client_name: "IAZMA Guard",
    client_uri: base,
    redirect_uris: [`${base}/api/auth/callback`],
    grant_types: ["authorization_code", "refresh_token"],
    scope: OAUTH_SCOPE,
    response_types: ["code"],
    application_type: "web",
    token_endpoint_auth_method: "none",
    dpop_bound_access_tokens: true,
  };
}

const stateStore = {
  async set(keyName, value) {
    await query(
      `INSERT INTO oauth_state(key, value, created_at)
       VALUES ($1, $2::jsonb, now())
       ON CONFLICT(key) DO UPDATE SET value = EXCLUDED.value, created_at = now()`,
      [keyName, JSON.stringify(value)],
    );
  },
  async get(keyName) {
    const rows = await query(`SELECT value FROM oauth_state WHERE key = $1`, [keyName]);
    return rows[0]?.value;
  },
  async del(keyName) {
    await query(`DELETE FROM oauth_state WHERE key = $1`, [keyName]);
  },
};

const sessionStore = {
  async set(did, value) {
    await query(
      `INSERT INTO oauth_session(did, value, updated_at)
       VALUES ($1, $2::jsonb, now())
       ON CONFLICT(did) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
      [did, JSON.stringify(value)],
    );
  },
  async get(did) {
    const rows = await query(`SELECT value FROM oauth_session WHERE did = $1`, [did]);
    return rows[0]?.value;
  },
  async del(did) {
    await query(`DELETE FROM oauth_session WHERE did = $1`, [did]);
  },
};

export async function getOAuthClient() {
  if (!oauthClientPromise) {
    oauthClientPromise = NodeOAuthClient.fromClientId({
      clientId: getClientMetadata().client_id,
      stateStore,
      sessionStore,
    });
  }
  return oauthClientPromise;
}

export async function getAgent(ownerDid) {
  const client = await getOAuthClient();
  const session = await client.restore(ownerDid);
  return new Agent(session);
}
