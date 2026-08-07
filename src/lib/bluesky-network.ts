export const BLUESKY_PUBLIC_API = "https://public.api.bsky.app/xrpc";

export type BlueskyProfile = {
  did: string;
  handle: string;
  displayName?: string;
  description?: string;
  avatar?: string;
  banner?: string;
  website?: string;
  followersCount?: number;
  followsCount?: number;
  postsCount?: number;
  createdAt?: string;
  indexedAt?: string;
};

export type NetworkCandidate = BlueskyProfile & {
  sharedBy: string[];
  alreadyFollowing: boolean;
  profileLoaded: boolean;
  profileUnavailable?: boolean;
};

export type ScanMode = "quick" | "balanced" | "complete";

export type ScanOptions = {
  mode: ScanMode;
  maxFollowers: number | null;
  maxFollowsPerFollower: number | null;
  minShared: number;
  profileBatchSize: number;
  concurrency: number;
};

export type FailedFollower = {
  did: string;
  handle: string;
  message: string;
};

export type SavedScanStage = "scanning" | "hydrating" | "paused" | "complete";

export type ScanSnapshot = {
  version: 1;
  id: "latest";
  actor: BlueskyProfile;
  options: ScanOptions;
  followers: BlueskyProfile[];
  followersComplete: boolean;
  targetFollowingDids: string[];
  targetFollowingComplete: boolean;
  processedFollowerDids: string[];
  failedFollowers: FailedFollower[];
  candidates: NetworkCandidate[];
  stage: SavedScanStage;
  createdAt: string;
  updatedAt: string;
};

export type RankedCandidate = NetworkCandidate & {
  sharedCount: number;
  overlapPct: number;
  discoveryScore: number;
  hiddenGemScore: number;
};

export const SCAN_PRESETS: Record<
  ScanMode,
  Omit<ScanOptions, "mode" | "minShared">
> = {
  quick: {
    maxFollowers: 50,
    maxFollowsPerFollower: 300,
    profileBatchSize: 500,
    concurrency: 3,
  },
  balanced: {
    maxFollowers: 250,
    maxFollowsPerFollower: 1_000,
    profileBatchSize: 1_500,
    concurrency: 3,
  },
  complete: {
    maxFollowers: null,
    maxFollowsPerFollower: null,
    profileBatchSize: 2_500,
    concurrency: 2,
  },
};

export const SCAN_MODE_COPY: Record<
  ScanMode,
  { name: string; description: string; detail: string }
> = {
  quick: {
    name: "Quick",
    description: "Fast signal from a smaller slice of the network.",
    detail: "Up to 50 followers · first 300 follows per person · 500 detailed profiles",
  },
  balanced: {
    name: "Balanced",
    description: "The practical default for most accounts.",
    detail: "Up to 250 followers · first 1,000 follows per person · 1,500 detailed profiles",
  },
  complete: {
    name: "Complete graph",
    description: "Scan every available follower and every account they follow.",
    detail: "All followers · all follows · 2,500 detailed profiles per batch",
  },
};

type XrpcErrorBody = {
  error?: string;
  message?: string;
};

type GetProfileResponse = BlueskyProfile;

type GetFollowersResponse = {
  subject: BlueskyProfile;
  cursor?: string;
  followers: BlueskyProfile[];
};

type GetFollowsResponse = {
  subject: BlueskyProfile;
  cursor?: string;
  follows: BlueskyProfile[];
};

type GetProfilesResponse = {
  profiles: BlueskyProfile[];
};

type RequestHooks = {
  signal?: AbortSignal;
  onRequest?: () => void;
};

export class BlueskyApiError extends Error {
  status?: number;
  code?: string;

  constructor(message: string, options?: { status?: number; code?: string }) {
    super(message);
    this.name = "BlueskyApiError";
    this.status = options?.status;
    this.code = options?.code;
  }
}

function wait(milliseconds: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("The operation was aborted.", "AbortError"));
      return;
    }

    const timeout = window.setTimeout(() => {
      signal?.removeEventListener("abort", abort);
      resolve();
    }, milliseconds);

    function abort() {
      window.clearTimeout(timeout);
      reject(new DOMException("The operation was aborted.", "AbortError"));
    }

    signal?.addEventListener("abort", abort, { once: true });
  });
}

function buildXrpcUrl(
  method: string,
  params: Record<string, string | number | readonly string[] | undefined>,
) {
  const url = new URL(`${BLUESKY_PUBLIC_API}/${method}`);

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) continue;

    if (Array.isArray(value)) {
      for (const item of value) url.searchParams.append(key, item);
    } else {
      url.searchParams.set(key, String(value));
    }
  }

  return url;
}

async function requestJson<T>(
  method: string,
  params: Record<string, string | number | readonly string[] | undefined>,
  hooks: RequestHooks = {},
): Promise<T> {
  const url = buildXrpcUrl(method, params);
  const attempts = 4;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    hooks.onRequest?.();

    let response: Response;
    try {
      response = await fetch(url, {
        method: "GET",
        signal: hooks.signal,
        cache: "default",
        headers: { Accept: "application/json" },
      });
    } catch (error) {
      if (hooks.signal?.aborted) throw error;
      if (attempt === attempts - 1) {
        throw new BlueskyApiError(
          "The browser could not reach Bluesky. Check your connection and try again.",
        );
      }
      await wait(750 * 2 ** attempt, hooks.signal);
      continue;
    }

    if (response.ok) return (await response.json()) as T;

    let body: XrpcErrorBody = {};
    try {
      body = (await response.json()) as XrpcErrorBody;
    } catch {
      // Some upstream failures return non-JSON responses.
    }

    const retryable = response.status === 429 || response.status >= 500;
    if (retryable && attempt < attempts - 1) {
      const retryAfter = Number(response.headers.get("retry-after"));
      const delay = Number.isFinite(retryAfter)
        ? Math.max(1_000, retryAfter * 1_000)
        : 1_000 * 2 ** attempt;
      await wait(delay, hooks.signal);
      continue;
    }

    throw new BlueskyApiError(
      body.message ||
        (response.status === 404
          ? "That Bluesky account could not be found."
          : `Bluesky returned an error (${response.status}).`),
      { status: response.status, code: body.error },
    );
  }

  throw new BlueskyApiError("Bluesky did not return a usable response.");
}

export function normalizeActorInput(input: string) {
  let value = input.trim();
  if (!value) return "";

  if (/^https?:\/\//i.test(value)) {
    try {
      const url = new URL(value);
      const segments = url.pathname.split("/").filter(Boolean);
      const profileIndex = segments.findIndex((segment) => segment === "profile");
      value = profileIndex >= 0 ? segments[profileIndex + 1] || "" : segments.at(-1) || "";
    } catch {
      return "";
    }
  }

  try {
    return decodeURIComponent(value)
      .replace(/^@/, "")
      .replace(/[/?#].*$/, "")
      .trim();
  } catch {
    return "";
  }
}

export function createScanOptions(
  mode: ScanMode,
  minShared: number,
  profileBatchSize?: number,
): ScanOptions {
  const preset = SCAN_PRESETS[mode];
  return {
    mode,
    ...preset,
    minShared: Math.min(100, Math.max(1, Math.floor(minShared || 1))),
    profileBatchSize: Math.min(
      20_000,
      Math.max(25, Math.floor(profileBatchSize || preset.profileBatchSize)),
    ),
  };
}

export async function fetchProfile(actor: string, hooks: RequestHooks = {}) {
  return requestJson<GetProfileResponse>(
    "app.bsky.actor.getProfile",
    { actor },
    hooks,
  );
}

export async function collectFollowers(
  actor: string,
  maximum: number | null,
  hooks: RequestHooks & { onPage?: (count: number) => void } = {},
) {
  const profiles: BlueskyProfile[] = [];
  const seen = new Set<string>();
  let cursor: string | undefined;

  do {
    const remaining = maximum === null ? 100 : maximum - profiles.length;
    if (remaining <= 0) break;

    const response = await requestJson<GetFollowersResponse>(
      "app.bsky.graph.getFollowers",
      {
        actor,
        limit: Math.min(100, remaining),
        cursor,
        sort: "latest",
      },
      hooks,
    );

    for (const profile of response.followers) {
      if (seen.has(profile.did)) continue;
      seen.add(profile.did);
      profiles.push(profile);
    }

    cursor = response.cursor;
    hooks.onPage?.(profiles.length);
  } while (cursor && (maximum === null || profiles.length < maximum));

  return {
    profiles,
    complete: !cursor,
  };
}

export async function collectFollows(
  actor: string,
  maximum: number | null,
  hooks: RequestHooks & { onPage?: (count: number) => void } = {},
) {
  const profiles: BlueskyProfile[] = [];
  const seen = new Set<string>();
  let cursor: string | undefined;

  do {
    const remaining = maximum === null ? 100 : maximum - profiles.length;
    if (remaining <= 0) break;

    const response = await requestJson<GetFollowsResponse>(
      "app.bsky.graph.getFollows",
      {
        actor,
        limit: Math.min(100, remaining),
        cursor,
        sort: "latest",
      },
      hooks,
    );

    for (const profile of response.follows) {
      if (seen.has(profile.did)) continue;
      seen.add(profile.did);
      profiles.push(profile);
    }

    cursor = response.cursor;
    hooks.onPage?.(profiles.length);
  } while (cursor && (maximum === null || profiles.length < maximum));

  return {
    profiles,
    complete: !cursor,
  };
}

export async function fetchProfiles(
  actors: readonly string[],
  hooks: RequestHooks = {},
) {
  if (actors.length === 0) return [];
  if (actors.length > 25) {
    throw new Error("Bluesky profile batches cannot contain more than 25 accounts.");
  }

  const response = await requestJson<GetProfilesResponse>(
    "app.bsky.actor.getProfiles",
    { actors },
    hooks,
  );
  return response.profiles;
}

export function rankCandidates(
  candidates: readonly NetworkCandidate[],
  scannedFollowerCount: number,
): RankedCandidate[] {
  const loaded = candidates.filter(
    (candidate) => candidate.profileLoaded && !candidate.profileUnavailable,
  );
  const denominator = Math.max(1, scannedFollowerCount);
  const maxOverlap = loaded.reduce(
    (maximum, candidate) =>
      Math.max(maximum, candidate.sharedBy.length / denominator),
    0,
  );
  const maxFollowers = loaded.reduce(
    (maximum, candidate) =>
      Math.max(maximum, Math.max(0, candidate.followersCount ?? 0)),
    0,
  );
  const maxReachLog = Math.log10(maxFollowers + 10);

  return loaded.map((candidate) => {
    const sharedCount = candidate.sharedBy.length;
    const overlap = sharedCount / denominator;
    const overlapNorm = maxOverlap > 0 ? overlap / maxOverlap : 0;
    const reachNorm =
      maxReachLog > 0
        ? Math.log10(Math.max(0, candidate.followersCount ?? 0) + 10) /
          maxReachLog
        : 0;

    return {
      ...candidate,
      sharedCount,
      overlapPct: overlap * 100,
      discoveryScore: Math.round((overlapNorm * 0.65 + reachNorm * 0.35) * 100),
      hiddenGemScore: Math.round(
        Math.max(0, overlapNorm * (1 - reachNorm * 0.35)) * 100,
      ),
    };
  });
}

export function formatCount(value: number | undefined) {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(Math.max(0, value ?? 0));
}

export function formatExactCount(value: number | undefined) {
  return new Intl.NumberFormat("en-US").format(Math.max(0, value ?? 0));
}

export function csvCell(value: string | number | boolean) {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function isAbortError(error: unknown) {
  return (
    error instanceof DOMException && error.name === "AbortError"
  ) || (error instanceof Error && error.name === "AbortError");
}

export function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "An unexpected error occurred.";
}
