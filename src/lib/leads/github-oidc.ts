const ISSUER = "https://token.actions.githubusercontent.com";
const AUDIENCE = "rukhlabs.com";
const REPOSITORY = "red-madhi/rukh-labs-site";
const REF = "refs/heads/main";

type JwtHeader = { alg?: string; kid?: string };
type JwtPayload = {
  iss?: string;
  aud?: string | string[];
  exp?: number;
  nbf?: number;
  repository?: string;
  ref?: string;
  event_name?: string;
  workflow_ref?: string;
};
type GitHubJwk = JsonWebKey & { kid?: string };
type JwksPayload = { keys?: GitHubJwk[] };

let cachedKeys: GitHubJwk[] = [];
let cachedAt = 0;

function decodePart<T>(part: string): T {
  const normalized = part.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  return JSON.parse(Buffer.from(padded, "base64").toString("utf8")) as T;
}

function decodeBytes(part: string) {
  const normalized = part.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  return new Uint8Array(Buffer.from(padded, "base64"));
}

async function getKeys() {
  if (cachedKeys.length && Date.now() - cachedAt < 60 * 60 * 1000) return cachedKeys;
  const response = await fetch(`${ISSUER}/.well-known/jwks`, {
    headers: { Accept: "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) throw new Error(`GitHub OIDC key service returned ${response.status}.`);
  const payload = (await response.json()) as JwksPayload;
  cachedKeys = Array.isArray(payload.keys) ? payload.keys : [];
  cachedAt = Date.now();
  return cachedKeys;
}

export async function verifyGithubActionsToken(token: string, allowedWorkflowFiles: string[]) {
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const header = decodePart<JwtHeader>(parts[0]);
  const payload = decodePart<JwtPayload>(parts[1]);
  if (header.alg !== "RS256" || !header.kid) return false;

  const now = Math.floor(Date.now() / 1000);
  const audiences = Array.isArray(payload.aud) ? payload.aud : payload.aud ? [payload.aud] : [];
  if (payload.iss !== ISSUER || !audiences.includes(AUDIENCE)) return false;
  if (payload.repository !== REPOSITORY || payload.ref !== REF) return false;
  if (!payload.exp || payload.exp < now - 30 || (payload.nbf && payload.nbf > now + 30)) return false;
  if (!new Set(["schedule", "workflow_dispatch"]).has(payload.event_name || "")) return false;
  const expectedRefs = allowedWorkflowFiles.map((file) => `${REPOSITORY}/.github/workflows/${file}@${REF}`);
  if (!payload.workflow_ref || !expectedRefs.includes(payload.workflow_ref)) return false;

  const key = (await getKeys()).find((item) => item.kid === header.kid);
  if (!key) return false;
  const cryptoKey = await crypto.subtle.importKey(
    "jwk",
    key,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"],
  );
  return crypto.subtle.verify(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    decodeBytes(parts[2]),
    new TextEncoder().encode(`${parts[0]}.${parts[1]}`),
  );
}
