import type { NextRequest } from "next/server";

export const LEADS_SECURITY_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "X-Robots-Tag": "noindex, nofollow, noarchive, nosnippet",
} as const;

export function secureEqual(candidate: string, expected: string) {
  const candidateBytes = new TextEncoder().encode(candidate);
  const expectedBytes = new TextEncoder().encode(expected);
  if (candidateBytes.length !== expectedBytes.length) return false;

  let difference = 0;
  for (let index = 0; index < candidateBytes.length; index += 1) {
    difference |= candidateBytes[index] ^ expectedBytes[index];
  }
  return difference === 0;
}

export function hasValidBasicAuth(request: NextRequest) {
  const expectedUsername = process.env.LEADS_USERNAME;
  const expectedPassword = process.env.LEADS_PASSWORD;
  if (!expectedUsername || !expectedPassword) return false;

  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Basic ")) return false;

  let decoded = "";
  try {
    decoded = atob(authorization.slice(6).trim());
  } catch {
    return false;
  }

  const separator = decoded.indexOf(":");
  if (separator < 0) return false;

  return (
    secureEqual(decoded.slice(0, separator), expectedUsername) &&
    secureEqual(decoded.slice(separator + 1), expectedPassword)
  );
}

export function hasValidCronAuth(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization");
  return Boolean(
    cronSecret &&
      authorization?.startsWith("Bearer ") &&
      secureEqual(authorization.slice(7), cronSecret),
  );
}
