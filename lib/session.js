import crypto from "node:crypto";

export const SESSION_COOKIE = "iazma_guard_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

function secret() {
  const value = process.env.SESSION_SECRET;
  if (!value || value.length < 24) {
    throw new Error("SESSION_SECRET must be configured and at least 24 characters");
  }
  return value;
}

function sign(data) {
  return crypto.createHmac("sha256", secret()).update(data).digest("base64url");
}

export function createSessionToken(did) {
  const payload = Buffer.from(
    JSON.stringify({ did, exp: Math.floor(Date.now() / 1000) + MAX_AGE_SECONDS }),
  ).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function verifySessionToken(token) {
  if (!token || !token.includes(".")) return null;
  const [payload, signature] = token.split(".");
  const expected = sign(payload);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (!parsed.did || parsed.exp < Math.floor(Date.now() / 1000)) return null;
    return parsed.did;
  } catch {
    return null;
  }
}

export function getSessionDid(request) {
  const token = request.cookies?.get?.(SESSION_COOKIE)?.value;
  return verifySessionToken(token);
}

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: MAX_AGE_SECONDS,
};
