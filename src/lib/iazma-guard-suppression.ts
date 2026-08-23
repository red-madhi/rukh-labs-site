type GuardSuppressionResult = {
  suppressed: Set<string>;
  enabled: boolean;
};

const MAX_BATCH = 1000;
const REQUEST_TIMEOUT_MS = 2500;

function guardConfig() {
  const url = process.env.IAZMA_GUARD_URL?.replace(/\/$/, "");
  const apiKey = process.env.IAZMA_GUARD_API_KEY;
  return url && apiKey ? { url, apiKey } : null;
}

export async function getGuardSuppressedDids(
  ownerDid: string,
  dids: string[],
): Promise<GuardSuppressionResult> {
  const config = guardConfig();
  const unique = Array.from(new Set(dids.filter(Boolean))).slice(0, MAX_BATCH);
  if (!config || !ownerDid || !unique.length) {
    return { suppressed: new Set<string>(), enabled: Boolean(config) };
  }

  try {
    const response = await fetch(`${config.url}/api/suppression/check`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-iazma-key": config.apiKey,
      },
      body: JSON.stringify({ ownerDid, dids: unique }),
      cache: "no-store",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!response.ok) {
      console.warn(`IAZMA Guard suppression lookup returned ${response.status}; failing open.`);
      return { suppressed: new Set<string>(), enabled: true };
    }

    const payload = (await response.json()) as { suppressed?: unknown };
    const suppressed = Array.isArray(payload.suppressed)
      ? payload.suppressed.filter((did): did is string => typeof did === "string")
      : [];
    return { suppressed: new Set(suppressed), enabled: true };
  } catch (error) {
    console.warn("IAZMA Guard suppression lookup failed; failing open.", error);
    return { suppressed: new Set<string>(), enabled: true };
  }
}
