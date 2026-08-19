import { getOutreachConfiguration } from "@/lib/leads/email-outreach";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const GMAIL_PROFILE_URL = "https://gmail.googleapis.com/gmail/v1/users/me/profile";
const SEND_SCOPE = "https://www.googleapis.com/auth/gmail.send";
const READ_SCOPE = "https://www.googleapis.com/auth/gmail.readonly";

function normalizeEnvValue(value: string | undefined) {
  const trimmed = (value || "").trim();
  if (trimmed.length >= 2) {
    const first = trimmed[0];
    const last = trimmed[trimmed.length - 1];
    if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
      return trimmed.slice(1, -1).trim();
    }
  }
  return trimmed;
}

export function normalizeGmailEnvironment() {
  const keys = [
    "GMAIL_CLIENT_ID",
    "GMAIL_CLIENT_SECRET",
    "GMAIL_REFRESH_TOKEN",
    "GMAIL_FROM_EMAIL",
    "GOOGLE_CLIENT_ID",
    "GOOGLE_CLIENT_SECRET",
  ] as const;

  for (const key of keys) {
    if (process.env[key] !== undefined) process.env[key] = normalizeEnvValue(process.env[key]);
  }
}

function oauthCredentials() {
  normalizeGmailEnvironment();
  return {
    clientId: process.env.GMAIL_CLIENT_ID || process.env.GOOGLE_CLIENT_ID || "",
    clientSecret: process.env.GMAIL_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET || "",
    refreshToken: process.env.GMAIL_REFRESH_TOKEN || "",
  };
}

function oauthFailure(error?: string, description?: string) {
  const detail = (description || "").toLowerCase();
  if (error === "unauthorized_client") {
    return "Google accepted the OAuth client credentials, but this refresh token is not authorized for that client. Generate a new refresh token in OAuth Playground with Use your own OAuth credentials enabled and the exact same Client ID and Client Secret configured in Vercel.";
  }
  if (error === "invalid_client") {
    return "Google rejected the OAuth client. GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET must be the matching pair from the same Google OAuth client.";
  }
  if (error === "invalid_grant") {
    return "Google rejected the refresh token. Generate a new refresh token in OAuth Playground using the exact OAuth client configured in Vercel.";
  }
  if (error === "invalid_scope") {
    return "Google rejected the Gmail scopes. Re-authorize with gmail.send and gmail.readonly together.";
  }
  if (detail === "unauthorized") {
    return "Google rejected this OAuth authorization. Re-authorize in OAuth Playground with Use your own OAuth credentials enabled and the exact Client ID and Client Secret configured in Vercel.";
  }
  return description ? `Google OAuth verification failed: ${description}.` : "Google OAuth verification failed.";
}

export function sanitizeGmailError(error: unknown) {
  const message = error instanceof Error ? error.message : "Gmail request failed.";
  if (message.trim().toLowerCase() === "unauthorized") {
    return oauthFailure(undefined, message);
  }
  return message;
}

export async function verifyGmailConnection() {
  normalizeGmailEnvironment();
  const base = getOutreachConfiguration();
  if (!base.configured) return base;

  const credentials = oauthCredentials();
  const body = new URLSearchParams({
    client_id: credentials.clientId,
    client_secret: credentials.clientSecret,
    refresh_token: credentials.refreshToken,
    grant_type: "refresh_token",
  });

  const tokenResponse = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });
  const token = (await tokenResponse.json().catch(() => ({}))) as {
    access_token?: string;
    scope?: string;
    error?: string;
    error_description?: string;
  };

  if (!tokenResponse.ok || !token.access_token) {
    const reason = oauthFailure(token.error, token.error_description);
    console.warn("Gmail OAuth verification failed", {
      error: token.error || "unknown",
      description: token.error_description || "",
      status: tokenResponse.status,
    });
    return { ...base, configured: false, missing: [reason] };
  }

  if (token.scope) {
    const granted = new Set(token.scope.split(/\s+/).filter(Boolean));
    const missingScopes = [SEND_SCOPE, READ_SCOPE].filter((scope) => !granted.has(scope));
    if (missingScopes.length) {
      console.warn("Gmail OAuth verification failed", { error: "missing_scope", missingCount: missingScopes.length });
      return {
        ...base,
        configured: false,
        missing: ["Google authorization is missing one or more required Gmail permissions. Re-authorize with gmail.send and gmail.readonly together."],
      };
    }
  }

  const profileResponse = await fetch(GMAIL_PROFILE_URL, {
    headers: { Authorization: `Bearer ${token.access_token}` },
    cache: "no-store",
  });
  const profile = (await profileResponse.json().catch(() => ({}))) as { emailAddress?: string; error?: { message?: string } };
  if (!profileResponse.ok || !profile.emailAddress) {
    const reason = profileResponse.status === 403
      ? "Google authorization cannot read Gmail. Re-authorize with gmail.send and gmail.readonly together."
      : `Gmail verification failed${profile.error?.message ? `: ${profile.error.message}` : ` (HTTP ${profileResponse.status})`}.`;
    console.warn("Gmail profile verification failed", { status: profileResponse.status });
    return { ...base, configured: false, missing: [reason] };
  }

  return { ...base, configured: true, missing: [] };
}
