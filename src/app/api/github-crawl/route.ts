import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const EXPECTED_ISSUER = "https://token.actions.githubusercontent.com";
const EXPECTED_AUDIENCE = "rukhlabs.com";
const EXPECTED_REPOSITORY = "red-madhi/rukh-labs-site";
const EXPECTED_REF = "refs/heads/main";

const routes: Record<string, string> = {
  bluesky: "/api/leads/collect/bluesky",
  inbound: "/api/leads/collect/inbound",
  web: "/api/leads/collect/web-intent",
  directories: "/api/leads/collect/pipeline-v3?mode=directories",
  enrich: "/api/leads/collect/pipeline-v3?mode=enrich",
  all: "/api/leads/collect/mega",
};

type JwtHeader = { alg?: string; kid?: string; typ?: string };
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
type JwksPayload = { keys?: JsonWebKey[] };

let cachedKeys: JsonWebKey[] = [];
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
  const response = await fetch(`${EXPECTED_ISSUER}/.well-known/jwks`, {
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

async function verifyToken(token: string) {
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const header = decodePart<JwtHeader>(parts[0]);
  const payload = decodePart<JwtPayload>(parts[1]);
  if (header.alg !== "RS256" || !header.kid) return false;

  const now = Math.floor(Date.now() / 1000);
  const audiences = Array.isArray(payload.aud) ? payload.aud : payload.aud ? [payload.aud] : [];
  if (payload.iss !== EXPECTED_ISSUER) return false;
  if (!audiences.includes(EXPECTED_AUDIENCE)) return false;
  if (payload.repository !== EXPECTED_REPOSITORY || payload.ref !== EXPECTED_REF) return false;
  if (!payload.exp || payload.exp < now - 30 || (payload.nbf && payload.nbf > now + 30)) return false;
  if (!payload.workflow_ref?.startsWith(`${EXPECTED_REPOSITORY}/.github/workflows/rukh-leads-oidc-scheduler.yml@${EXPECTED_REF}`)) return false;
  if (!new Set(["schedule", "workflow_dispatch"]).has(payload.event_name || "")) return false;

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

export async function GET(request: NextRequest) {
  const authorization = request.headers.get("authorization");
  const token = authorization?.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
  try {
    if (!token || !(await verifyToken(token))) {
      return NextResponse.json({ error: "GitHub Actions OIDC authentication failed." }, { status: 401 });
    }
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "OIDC verification failed." }, { status: 503 });
  }

  const stage = request.nextUrl.searchParams.get("stage") || "all";
  const path = routes[stage];
  const cronSecret = process.env.CRON_SECRET;
  if (!path || !cronSecret) return NextResponse.json({ error: "Requested collector is unavailable." }, { status: 404 });

  const response = await fetch(new URL(path, request.nextUrl.origin), {
    headers: { Authorization: `Bearer ${cronSecret}` },
    cache: "no-store",
    signal: AbortSignal.timeout(55_000),
  });
  const text = await response.text();
  return new NextResponse(text, {
    status: response.status,
    headers: {
      "Content-Type": response.headers.get("content-type") || "application/json",
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex, nofollow, noarchive",
    },
  });
}
