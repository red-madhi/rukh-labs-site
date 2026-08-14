import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const ADVANCED_NETWORK_ACCESS_COOKIE = "rukh_advanced_network_access";
const ACCESS_COOKIE_PAYLOAD = "advanced-network-private-beta:v1";

function getConfig() {
  return {
    code: process.env.ADVANCED_NETWORK_ACCESS_CODE ?? "",
    secret: process.env.ADVANCED_NETWORK_ACCESS_SECRET ?? "",
  };
}

export function isAdvancedNetworkAccessConfigured() {
  const { code, secret } = getConfig();
  return Boolean(code && secret);
}

function safeEqual(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function verifyAdvancedNetworkAccessCode(input: string) {
  const { code } = getConfig();
  return Boolean(code && input && safeEqual(input, code));
}

export function getAdvancedNetworkAccessCookieValue() {
  const { secret } = getConfig();
  if (!secret) return "";
  return createHmac("sha256", secret).update(ACCESS_COOKIE_PAYLOAD).digest("hex");
}

export async function hasAdvancedNetworkAccess() {
  const expected = getAdvancedNetworkAccessCookieValue();
  if (!expected) return false;
  const store = await cookies();
  const actual = store.get(ADVANCED_NETWORK_ACCESS_COOKIE)?.value ?? "";
  return Boolean(actual && safeEqual(actual, expected));
}
