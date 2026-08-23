import { Agent } from "@atproto/api";
import { JoseKey } from "@atproto/jwk-jose";
import { NodeOAuthClient } from "@atproto/oauth-client-node";
import { query } from "./db.js";

export const OAUTH_SCOPE = [
  "atproto",
  "repo:app.bsky.graph.follow",
  "repo:app.bsky.graph.block",
].join(" ");

let oauthClientPromise;

function appUrl() {
  const url = (process.env.APP_URL || "").replace(/\/$/, "");
  if (!url) throw new Error("APP_URL is not configured");
  return url;
}

function normalizePem(value) {
  return value?.replace(/\\n/g, "\n");
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
    token_endpoint_auth_method: "private_key_jwt",
    token_endpoint_auth_signing_alg: "ES256",
    dpop_bound_access_tokens: true,
    jwks_uri: `${base}/jwks.json`,
  };
}

export async function getOAuthClient() {
  if (!oauthClientPromise) {
    oauthClientPromise = (async () => {
      const privateKey = normalizePem(process.env.OAUTH_PRIVATE_KEY);
      if (!privateKey) throw new Error("OAUTH_PRIVATE_KEY is not configured");
      const key = await JoseKey.fromImportable(privateKey, "iazma-guard-key");

      return new NodeOAuthClient({
        clientMetadata: getClientMetadata(),
        keyset: [key],
        stateStore: {
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
        },
        sessionStore: {
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
        },
      });
    })();
  }
  return oauthClientPromise;
}

export async function getAgent(ownerDid) {
  const client = await getOAuthClient();
  const session = await client.restore(ownerDid);
  return new Agent(session);
}
