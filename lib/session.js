import crypto from "node:crypto";
import { query } from "./db.js";

export const SESSION_COOKIE = "iazma_guard_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

function hash(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function createSessionToken(did) {
  const token = crypto.randomBytes(32).toString("base64url");
  await query(
    `INSERT INTO web_sessions(token_hash, did, expires_at)
     VALUES ($1, $2, now() + interval '30 days')`,
    [hash(token), did],
  );
  return token;
}

export async function verifySessionToken(token) {
  if (!token) return null;
  const rows = await query(
    `SELECT did FROM web_sessions
     WHERE token_hash = $1 AND expires_at > now()`,
    [hash(token)],
  );
  return rows[0]?.did ?? null;
}

export async function getSessionDid(request) {
  const token = request.cookies?.get?.(SESSION_COOKIE)?.value;
  return verifySessionToken(token);
}

export async function revokeSessionToken(token) {
  if (!token) return;
  await query(`DELETE FROM web_sessions WHERE token_hash = $1`, [hash(token)]);
}

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax",
  secure: true,
  path: "/",
  maxAge: MAX_AGE_SECONDS,
};
