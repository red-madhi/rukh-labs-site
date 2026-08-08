"use client";

import {
  type ChangeEvent,
  type FormEvent,
  type MouseEvent as ReactMouseEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  AlertTriangle,
  ArrowUpRight,
  Check,
  Download,
  Eye,
  LoaderCircle,
  Network,
  Pause,
  Play,
  RefreshCw,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { Button, buttonStyles } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  SCAN_MODE_COPY,
  collectFollows,
  createScanOptions,
  csvCell,
  errorMessage,
  fetchProfile,
  fetchProfiles,
  formatCount,
  formatExactCount,
  isAbortError,
  normalizeActorInput,
  rankCandidates,
  type BlueskyProfile,
  type FailedFollower,
  type NetworkCandidate,
  type SavedScanStage,
  type ScanMode,
  type ScanOptions,
  type ScanSnapshot,
} from "@/lib/bluesky-network";
import {
  deleteLatestScan,
  loadLatestScan,
  saveScan,
} from "@/lib/bluesky-network-storage";

const STORAGE_KEY = "following" as const;
const OWN_FOLLOWS_CAP = 20_000;
const inputClass =
  "w-full rounded-lg border border-white/12 bg-[#090707]/80 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/34 focus:border-[#16c8ff]/65 focus:ring-4 focus:ring-[#16c8ff]/10";

type Phase = "idle" | "loading" | "scanning" | "hydrating" | "paused" | "complete" | "error";
type SortKey = "score" | "overlap" | "shared" | "followers" | "hidden";
type Runtime = {
  actor: BlueskyProfile;
  options: ScanOptions;
  sources: BlueskyProfile[];
  sourcesComplete: boolean;
  targetFollowing: Set<string>;
  targetFollowingComplete: boolean;
  processed: Set<string>;
  failed: Map<string, FailedFollower>;
  candidates: Map<string, NetworkCandidate>;
  createdAt: string;
};

function fromSnapshot(snapshot: ScanSnapshot): Runtime {
  return {
    actor: snapshot.actor,
    options: { ...snapshot.options, source: "following" },
    sources: snapshot.followers,
    sourcesComplete: snapshot.followersComplete,
    targetFollowing: new Set(snapshot.targetFollowingDids),
    targetFollowingComplete: snapshot.targetFollowingComplete,
    processed: new Set(snapshot.processedFollowerDids),
    failed: new Map(snapshot.failedFollowers.map((item) => [item.did, item])),
    candidates: new Map(snapshot.candidates.map((item) => [item.did, item])),
    createdAt: snapshot.createdAt,
  };
}

function toSnapshot(runtime: Runtime, stage: SavedScanStage): ScanSnapshot {
  return {
    version: 1,
    id: "latest",
    actor: runtime.actor,
    options: runtime.options,
    followers: runtime.sources,
    followersComplete: runtime.sourcesComplete,
    targetFollowingDids: [...runtime.targetFollowing],
    targetFollowingComplete: runtime.targetFollowingComplete,
    processedFollowerDids: [...runtime.processed],
    failedFollowers: [...runtime.failed.values()],
    candidates: [...runtime.candidates.values()],
    stage,
    createdAt: runtime.createdAt,
    updatedAt: new Date().toISOString(),
  };
}

function selectEvenly(profiles: readonly BlueskyProfile[], maximum: number | null) {
  if (maximum === null || profiles.length <= maximum) return [...profiles];
  if (maximum <= 1) return profiles.slice(0, 1);
  const step = (profiles.length - 1) / (maximum - 1);
  return Array.from({ length: maximum }, (_, index) => profiles[Math.round(index * step)]);
}

function mergeCandidate(runtime: Runtime, profile: BlueskyProfile, sourceDid: string) {
  if (profile.did === runtime.actor.did) return;
  const current = runtime.candidates.get(profile.did);
  if (current) {
    if (!current.sharedBy.includes(sourceDid)) current.sharedBy.push(sourceDid);
    current.displayName ||= profile.displayName;
    current.description ||= profile.description;
    current.avatar ||= profile.avatar;
    return;
  }
  runtime.candidates.set(profile.did, {
    ...profile,
    sharedBy: [sourceDid],
    alreadyFollowing: runtime.targetFollowing.has(profile.did),
    profileLoaded: false,
  });
}

function applyProfile(candidate: NetworkCandidate, profile: BlueskyProfile) {
  Object.assign(candidate, profile, {
    sharedBy: candidate.sharedBy,
    alreadyFollowing: candidate.alreadyFollowing,
    profileLoaded: true,
    profileUnavailable: false,
  });
}

function Avatar({ profile, className }: { profile: BlueskyProfile; className?: string }) {
  const label = profile.displayName || profile.handle;
  const initials = label
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
  return (
    <span
      aria-hidden
      className={cn(
        "grid shrink-0 place-items-center rounded-full border border-white/12 bg-gradient-to-br from-[#16c8ff]/25 to-[#9a6dff]/20 bg-cover bg-center text-xs font-semibold text-white/80",
        className,
      )}
      style={profile.avatar ? { backgroundImage: `url(${profile.avatar})` } : undefined}
    >
      {profile.avatar ? null : initials || "?"}
    </span>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/8 bg-black/15 px-3 py-3">
      <dt className="text-[0.64rem] font-semibold uppercase tracking-[0.14em] text-white/38">{label}</dt>
      <dd className="mt-1.5 text-base font-semibold text-white">{value}</dd>
    </div>
  );
}

export function BlueskyFollowingExplorer() {
  const runtimeRef = useRef<Runtime | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const pauseRequested = useRef(false);
  const requestCount = useRef(0);

  const [handle, setHandle] = useState("");
  const [mode, setMode] = useState<ScanMode>("balanced");
  const [minShared, setMinShared] = useState(2);
  const [phase, setPhase] = useState<Phase>("idle");
  const [actor, setActor] = useState<BlueskyProfile | null>(null);
  const [sources, setSources] = useState<BlueskyProfile[]>([]);
  const [candidates, setCandidates] = useState<NetworkCandidate[]>([]);
  const [processed, setProcessed] = useState(0);
  const [failed, setFailed] = useState(0);
  const [requests, setRequests] = useState(0);
  const [message, setMessage] = useState("Enter a Bluesky handle to begin.");
  const [error, setError] = useState("");
  const [storageWarning, setStorageWarning] = useState("");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("score");
  const [resultMinShared, setResultMinShared] = useState(2);
  const [minFollowers, setMinFollowers] = useState(0);
  const [minOverlap, setMinOverlap] = useState(0);
  const [hideFollowing, setHideFollowing] = useState(true);
  const [shown, setShown] = useState(100);
  const [selectedDid, setSelectedDid] = useState<string | null>(null);

  const running = phase === "loading" || phase === "scanning" || phase === "hydrating";
  const runtime = runtimeRef.current;
  const attempted = processed + failed;
  const percent = sources.length ? Math.min(100, (attempted / sources.length) * 100) : 0;

  function countRequest() {
    requestCount.current += 1;
    setRequests(requestCount.current);
  }

  function sync(nextMessage?: string) {
    const current = runtimeRef.current;
    if (!current) return;
    setActor(current.actor);
    setSources(current.sources);
    setCandidates([...current.candidates.values()]);
    setProcessed(current.processed.size);
    setFailed(current.failed.size);
    setRequests(requestCount.current);
    if (nextMessage) setMessage(nextMessage);
  }

  async function persist(stage: SavedScanStage) {
    const current = runtimeRef.current;
    if (!current) return;
    try {
      await saveScan(toSnapshot(current, stage), STORAGE_KEY);
      setStorageWarning("");
    } catch {
      setStorageWarning("Progress could not be stored locally. Keep this tab open until the scan finishes.");
    }
  }

  useEffect(() => {
    let cancelled = false;
    void loadLatestScan(STORAGE_KEY)
      .then((snapshot) => {
        if (!snapshot || cancelled) return;
        const restored = fromSnapshot(snapshot);
        runtimeRef.current = restored;
        setHandle(restored.actor.handle);
        setMode(restored.options.mode);
        setMinShared(restored.options.minShared);
        setResultMinShared(restored.options.minShared);
        setPhase(snapshot.stage === "complete" ? "complete" : "paused");
        setMessage(
          snapshot.stage === "complete"
            ? "Saved following-graph results restored from this browser."
            : "An unfinished following-graph scan is ready to resume.",
        );
        sync();
      })
      .catch(() => {
        if (!cancelled) setStorageWarning("Local resume storage is unavailable in this browser.");
      });
    return () => {
      cancelled = true;
      controllerRef.current?.abort();
    };
  }, []);


  useEffect(() => {
    if (!selectedDid) return;
    const close = (event: KeyboardEvent) => event.key === "Escape" && setSelectedDid(null);
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [selectedDid]);

  const ranked = useMemo(() => rankCandidates(candidates, processed), [candidates, processed]);
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return ranked
      .filter((item) => item.sharedCount >= resultMinShared)
      .filter((item) => (item.followersCount ?? 0) >= minFollowers)
      .filter((item) => item.overlapPct >= minOverlap)
      .filter((item) => !hideFollowing || !item.alreadyFollowing)
      .filter((item) => {
        if (!query) return true;
        return [item.displayName, item.handle, item.description]
          .filter(Boolean)
          .some((value) => value!.toLowerCase().includes(query));
      })
      .sort((a, b) => {
        if (sort === "overlap") return b.overlapPct - a.overlapPct || b.sharedCount - a.sharedCount;
        if (sort === "shared") return b.sharedCount - a.sharedCount || b.overlapPct - a.overlapPct;
        if (sort === "followers") return (b.followersCount ?? 0) - (a.followersCount ?? 0);
        if (sort === "hidden") return b.hiddenGemScore - a.hiddenGemScore || b.overlapPct - a.overlapPct;
        return b.discoveryScore - a.discoveryScore || b.overlapPct - a.overlapPct;
      });
  }, [ranked, search, resultMinShared, minFollowers, minOverlap, hideFollowing, sort]);

  const sourceByDid = useMemo(() => new Map(sources.map((item) => [item.did, item])), [sources]);
  const selected = selectedDid ? ranked.find((item) => item.did === selectedDid) ?? null : null;
  const selectedConnections = selected
    ? selected.sharedBy
        .map((did) => sourceByDid.get(did))
        .filter((item): item is BlueskyProfile => Boolean(item))
        .slice(0, 250)
    : [];
  const remainingProfiles = runtime
    ? [...runtime.candidates.values()].filter(
        (item) => item.sharedBy.length >= runtime.options.minShared && !item.profileLoaded,
      ).length
    : 0;
  const graphComplete = Boolean(
    runtime &&
      runtime.sourcesComplete &&
      runtime.options.maxFollowsPerFollower === null &&
      runtime.failed.size === 0,
  );

  async function setupScan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalized = normalizeActorInput(handle);
    if (!normalized) {
      setError("Enter a Bluesky handle, DID, or profile URL.");
      return;
    }

    controllerRef.current?.abort();
    pauseRequested.current = false;
    requestCount.current = 0;
    runtimeRef.current = null;
    setError("");
    setCandidates([]);
    setSources([]);
    setActor(null);
    setProcessed(0);
    setFailed(0);
    setRequests(0);
    setPhase("loading");
    setMessage("Looking up the Bluesky account…");
    try {
      await deleteLatestScan(STORAGE_KEY);
    } catch {
      setStorageWarning("The previous local scan could not be cleared, but this scan can continue.");
    }

    const controller = new AbortController();
    controllerRef.current = controller;

    try {
      const options = createScanOptions(mode, minShared, "following");
      const profile = await fetchProfile(normalized, {
        signal: controller.signal,
        onRequest: countRequest,
      });
      const totalFollowing = profile.followsCount ?? 0;
      if (
        mode === "complete" &&
        totalFollowing > 1_000 &&
        !window.confirm(
          `This profile follows about ${formatExactCount(totalFollowing)} accounts. A complete graph scan may take a long time and make thousands of public API requests. Continue?`,
        )
      ) {
        setPhase("idle");
        setMessage("Complete graph scan cancelled before following data was loaded.");
        return;
      }

      setActor(profile);
      setMessage("Loading the accounts this profile follows…");
      const ownLimit = totalFollowing > OWN_FOLLOWS_CAP ? OWN_FOLLOWS_CAP : null;
      const followingResult = await collectFollows(profile.did, ownLimit, {
        signal: controller.signal,
        onRequest: countRequest,
        onPage: (count) =>
          setMessage(`Loaded ${formatExactCount(count)} accounts this profile follows…`),
      });
      const sourceProfiles = selectEvenly(followingResult.profiles, options.maxFollowers);
      if (!sourceProfiles.length) {
        throw new Error("This profile is not following any public accounts available to scan.");
      }

      runtimeRef.current = {
        actor: profile,
        options,
        sources: sourceProfiles,
        sourcesComplete:
          followingResult.complete && sourceProfiles.length === followingResult.profiles.length,
        targetFollowing: new Set(followingResult.profiles.map((item) => item.did)),
        targetFollowingComplete: followingResult.complete,
        processed: new Set(),
        failed: new Map(),
        candidates: new Map(),
        createdAt: new Date().toISOString(),
      };
      setResultMinShared(options.minShared);
      sync("Curated graph loaded. Starting people-to-follow discovery…");
      await persist("scanning");
      await runScan(controller);
    } catch (caught) {
      if (isAbortError(caught)) {
        setPhase(pauseRequested.current ? "paused" : "idle");
        setMessage(
          pauseRequested.current
            ? "Scan paused. Completed work was saved in this browser."
            : "Scan cancelled.",
        );
        if (runtimeRef.current) await persist("paused");
      } else {
        setError(errorMessage(caught));
        setPhase("error");
        setMessage("The scan stopped after an error. Completed work was preserved when possible.");
        if (runtimeRef.current) await persist("paused");
      }
    } finally {
      if (controllerRef.current === controller) controllerRef.current = null;
    }
  }

  async function runScan(controller: AbortController) {
    const current = runtimeRef.current;
    if (!current) return;
    setPhase("scanning");
    pauseRequested.current = false;
    const queue = current.sources.filter(
      (item) => !current.processed.has(item.did) && !current.failed.has(item.did),
    );

    for (let index = 0; index < queue.length; index += current.options.concurrency) {
      if (controller.signal.aborted) {
        throw new DOMException("The operation was aborted.", "AbortError");
      }
      const batch = queue.slice(index, index + current.options.concurrency);
      setMessage(`Scanning ${batch.map((item) => `@${item.handle}`).join(", ")}…`);
      const outcomes = await Promise.allSettled(
        batch.map(async (sourceProfile) => ({
          sourceProfile,
          follows: await collectFollows(
            sourceProfile.did,
            current.options.maxFollowsPerFollower,
            { signal: controller.signal, onRequest: countRequest },
          ),
        })),
      );

      outcomes.forEach((outcome, position) => {
        const fallback = batch[position];
        if (outcome.status === "rejected") {
          if (isAbortError(outcome.reason)) throw outcome.reason;
          current.failed.set(fallback.did, {
            did: fallback.did,
            handle: fallback.handle,
            message: errorMessage(outcome.reason),
          });
          return;
        }
        for (const profile of outcome.value.follows.profiles) {
          mergeCandidate(current, profile, outcome.value.sourceProfile.did);
        }
        current.processed.add(outcome.value.sourceProfile.did);
      });

      sync(
        `Scanned ${formatExactCount(current.processed.size)} of ${formatExactCount(current.sources.length)} selected accounts this profile follows.`,
      );
      if ((index / Math.max(1, current.options.concurrency)) % 8 === 0) {
        await persist("scanning");
      }
    }

    await hydrateProfiles(controller.signal, current.options.profileBatchSize);
    if (controller.signal.aborted) {
      throw new DOMException("The operation was aborted.", "AbortError");
    }
    sync(remainingProfilesMessage());
    setPhase("complete");
    await persist("complete");
  }

  function remainingProfilesMessage() {
    const current = runtimeRef.current;
    if (!current) return "Scan complete.";
    const remaining = [...current.candidates.values()].filter(
      (item) => item.sharedBy.length >= current.options.minShared && !item.profileLoaded,
    ).length;
    return remaining
      ? `Graph scan complete. ${formatExactCount(remaining)} additional candidate profiles can still be loaded.`
      : "Scan complete. Sort, filter, inspect, or export the people-to-follow recommendations.";
  }

  async function hydrateProfiles(signal: AbortSignal, limit: number) {
    const current = runtimeRef.current;
    if (!current) return;
    const pending = [...current.candidates.values()]
      .filter((item) => item.sharedBy.length >= current.options.minShared && !item.profileLoaded)
      .sort((a, b) => b.sharedBy.length - a.sharedBy.length || a.handle.localeCompare(b.handle))
      .slice(0, limit);
    if (!pending.length) return;

    setPhase("hydrating");
    for (let index = 0; index < pending.length; index += 25 * current.options.concurrency) {
      if (signal.aborted) throw new DOMException("The operation was aborted.", "AbortError");
      const superBatch = pending.slice(index, index + 25 * current.options.concurrency);
      const batches: NetworkCandidate[][] = [];
      for (let offset = 0; offset < superBatch.length; offset += 25) {
        batches.push(superBatch.slice(offset, offset + 25));
      }
      setMessage(
        `Loading follower counts and profile details (${formatExactCount(Math.min(index + superBatch.length, pending.length))} of ${formatExactCount(pending.length)})…`,
      );
      const outcomes = await Promise.allSettled(
        batches.map((batch) =>
          fetchProfiles(
            batch.map((item) => item.did),
            { signal, onRequest: countRequest },
          ),
        ),
      );
      outcomes.forEach((outcome, batchIndex) => {
        const requested = batches[batchIndex];
        if (outcome.status === "rejected") {
          if (isAbortError(outcome.reason)) throw outcome.reason;
          return;
        }
        const returned = new Map(outcome.value.map((profile) => [profile.did, profile]));
        requested.forEach((candidate) => {
          const profile = returned.get(candidate.did);
          if (profile) applyProfile(candidate, profile);
          else {
            candidate.profileLoaded = true;
            candidate.profileUnavailable = true;
          }
        });
      });
      sync();
      if (index % 250 === 0) await persist("hydrating");
    }
  }

  function pause() {
    pauseRequested.current = true;
    setMessage("Pausing after the current requests stop…");
    controllerRef.current?.abort();
  }

  function resume() {
    if (!runtimeRef.current) return;
    setError("");
    const controller = new AbortController();
    controllerRef.current = controller;
    void runScan(controller).catch(async (caught) => {
      if (isAbortError(caught)) {
        setPhase("paused");
        setMessage("Scan paused. Completed work was saved in this browser.");
        await persist("paused");
      } else {
        setError(errorMessage(caught));
        setPhase("error");
        await persist("paused");
      }
    });
  }

  function retryFailed() {
    const current = runtimeRef.current;
    if (!current) return;
    current.failed.clear();
    sync("Retrying followed-account scans that previously failed…");
    resume();
  }

  async function loadMoreProfiles() {
    const current = runtimeRef.current;
    if (!current || running) return;
    const controller = new AbortController();
    controllerRef.current = controller;
    try {
      await hydrateProfiles(controller.signal, current.options.profileBatchSize);
      sync(remainingProfilesMessage());
      setPhase("complete");
      await persist("complete");
    } catch (caught) {
      if (!isAbortError(caught)) setError(errorMessage(caught));
    } finally {
      if (controllerRef.current === controller) controllerRef.current = null;
    }
  }

  async function startOver() {
    if (running && !window.confirm("Stop this scan and erase its locally saved progress?")) return;
    controllerRef.current?.abort();
    runtimeRef.current = null;
    requestCount.current = 0;
    setActor(null);
    setSources([]);
    setCandidates([]);
    setProcessed(0);
    setFailed(0);
    setRequests(0);
    setPhase("idle");
    setMessage("Enter a Bluesky handle to begin.");
    setError("");
    setSelectedDid(null);
    try {
      await deleteLatestScan(STORAGE_KEY);
      setStorageWarning("");
    } catch {
      setStorageWarning("The locally saved scan could not be erased.");
    }
  }

  function exportCsv() {
    if (!filtered.length) return;
    const rows: Array<Array<string | number | boolean>> = [
      [
        "Rank",
        "Display name",
        "Handle",
        "Followers",
        "Shared followed accounts",
        "Overlap %",
        "Discovery score",
        "Hidden gem score",
        "Already following",
        "Profile URL",
      ],
      ...filtered.map((item, index) => [
        index + 1,
        item.displayName || "",
        item.handle,
        item.followersCount ?? 0,
        item.sharedCount,
        item.overlapPct.toFixed(4),
        item.discoveryScore,
        item.hiddenGemScore,
        item.alreadyFollowing,
        `https://bsky.app/profile/${item.handle}`,
      ]),
    ];
    const blob = new Blob([rows.map((row) => row.map(csvCell).join(",")).join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${actor?.handle || "bluesky"}-following-network-explorer.csv`;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  return (
    <div className="grid gap-6">
      <p className="sr-only" aria-live="polite">{message}{error ? ` ${error}` : ""}</p>

      <Card className="p-5 sm:p-7">
        <form onSubmit={setupScan} className="grid gap-6">
          <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
            <label className="grid gap-2 text-sm font-medium text-white/78">
              Bluesky handle or profile URL
              <div className="relative">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/36">@</span>
                <input
                  value={handle}
                  onChange={(event: ChangeEvent<HTMLInputElement>) => setHandle(event.target.value)}
                  className={cn(inputClass, "pl-8")}
                  placeholder="handle.bsky.social"
                  autoComplete="off"
                  spellCheck={false}
                  disabled={running}
                />
              </div>
            </label>
            <Button type="submit" size="lg" disabled={running}>
              {phase === "loading" ? (
                <LoaderCircle aria-hidden className="size-4 animate-spin" />
              ) : (
                <Network aria-hidden className="size-4" />
              )}
              Analyze following graph
            </Button>
          </div>

          <fieldset disabled={running}>
            <legend className="text-sm font-medium text-white/78">Scan depth</legend>
            <div className="mt-3 grid gap-3 lg:grid-cols-3">
              {(Object.keys(SCAN_MODE_COPY) as ScanMode[]).map((key) => {
                const copy = SCAN_MODE_COPY[key];
                const selectedMode = key === mode;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setMode(key)}
                    className={cn(
                      "rounded-xl border p-4 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#16c8ff]",
                      selectedMode
                        ? "border-[#16c8ff]/55 bg-[#16c8ff]/10"
                        : "border-white/10 bg-white/[0.025] hover:border-white/20",
                    )}
                  >
                    <span className="flex items-center justify-between gap-3 font-semibold text-white">
                      {copy.name}
                      {selectedMode ? <Check aria-hidden className="size-4 text-[#8ce8ff]" /> : null}
                    </span>
                    <span className="mt-2 block text-sm leading-6 text-white/56">{copy.description}</span>
                    <span className="mt-3 block text-xs leading-5 text-white/36">{copy.detail}</span>
                  </button>
                );
              })}
            </div>
          </fieldset>

          <label className="grid max-w-md gap-2 text-sm text-white/68">
            Minimum shared followed accounts before profile lookup
            <input
              type="number"
              min={1}
              max={100}
              value={minShared}
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                setMinShared(Math.min(100, Math.max(1, Number(event.target.value) || 1)))
              }
              className={inputClass}
              disabled={running}
            />
            <span className="text-xs leading-5 text-white/38">
              Use 1 for a small or highly varied following list. Higher values emphasize repeated recommendations.
            </span>
          </label>
        </form>
      </Card>

      {error ? (
        <div role="alert" className="flex items-start gap-3 rounded-xl border border-[#ff5364]/35 bg-[#ff5364]/10 p-4 text-sm leading-6 text-[#ffd1d5]">
          <AlertTriangle aria-hidden className="mt-0.5 size-5 shrink-0" />
          <div><p className="font-semibold">The scan hit a problem.</p><p className="text-[#ffd1d5]/78">{error}</p></div>
        </div>
      ) : null}
      {storageWarning ? (
        <div className="flex items-start gap-3 rounded-xl border border-[#f4bd43]/25 bg-[#f4bd43]/8 p-4 text-sm leading-6 text-[#ffe4a0]">
          <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0" />{storageWarning}
        </div>
      ) : null}

      {actor || phase !== "idle" ? (
        <Card className="p-5 sm:p-7">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              {actor ? <Avatar profile={actor} className="size-14" /> : null}
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#8ce8ff]">
                  {phase === "complete" ? "Following graph analyzed" : phase === "paused" ? "Scan paused" : "Curated graph scan"}
                </p>
                <h2 className="mt-1 truncate text-xl font-semibold text-white">
                  {actor?.displayName || actor?.handle || "Preparing scan"}
                </h2>
                {actor ? <p className="truncate text-sm text-white/46">@{actor.handle}</p> : null}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {running ? (
                <Button variant="secondary" size="sm" onClick={pause}>
                  <Pause aria-hidden className="size-4" />{phase === "loading" ? "Cancel" : "Pause"}
                </Button>
              ) : null}
              {(phase === "paused" || phase === "error") && runtime ? (
                <Button size="sm" onClick={resume}><Play aria-hidden className="size-4" />Resume</Button>
              ) : null}
              {failed > 0 && !running ? (
                <Button variant="secondary" size="sm" onClick={retryFailed}>
                  <RefreshCw aria-hidden className="size-4" />Retry failed
                </Button>
              ) : null}
              <Button variant="ghost" size="sm" onClick={() => void startOver()}>
                <Trash2 aria-hidden className="size-4" />Start over
              </Button>
            </div>
          </div>
          <div className="mt-6">
            <div className="flex items-center justify-between gap-4 text-xs text-white/46">
              <span>{message}</span>
              <span className="shrink-0 tabular-nums">{formatExactCount(attempted)} / {formatExactCount(sources.length)}</span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/[0.06]">
              <div
                className={cn(
                  "h-full rounded-full bg-gradient-to-r from-[#f0001c] via-[#16c8ff] to-[#9a6dff] transition-[width]",
                  phase === "loading" && "w-1/3 animate-pulse",
                )}
                style={phase === "loading" ? undefined : { width: `${percent}%` }}
              />
            </div>
          </div>
          <dl className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Metric label="Following scanned" value={`${formatExactCount(processed)} / ${formatExactCount(sources.length)}`} />
            <Metric label="Candidates found" value={formatExactCount(candidates.length)} />
            <Metric label="Profiles ranked" value={formatExactCount(ranked.length)} />
            <Metric label="Public API requests" value={formatExactCount(requests)} />
          </dl>
          {runtime ? (
            <div className="mt-5 flex flex-wrap gap-2 text-xs">
              <span className="rounded-full border border-[#16c8ff]/25 bg-[#16c8ff]/8 px-3 py-1 text-[#8ce8ff]">
                Curated graph: people this profile follows
              </span>
              <span className={cn(
                "rounded-full border px-3 py-1",
                graphComplete
                  ? "border-[#16c8ff]/30 bg-[#16c8ff]/8 text-[#8ce8ff]"
                  : "border-white/10 bg-white/[0.035] text-white/52",
              )}>
                {graphComplete ? "Complete graph scan" : "Sampled or partial graph scan"}
              </span>
              <span className="rounded-full border border-white/10 bg-white/[0.035] px-3 py-1 text-white/52">
                Overlap denominator: {formatExactCount(processed)} successful followed-account scans
              </span>
              {!runtime.targetFollowingComplete ? (
                <span className="rounded-full border border-[#f4bd43]/25 bg-[#f4bd43]/8 px-3 py-1 text-[#ffe4a0]">
                  Source list and already-following filter are partial
                </span>
              ) : null}
              {failed ? (
                <span className="rounded-full border border-[#ff5364]/25 bg-[#ff5364]/8 px-3 py-1 text-[#ffb4b8]">
                  {formatExactCount(failed)} followed-account scans failed
                </span>
              ) : null}
            </div>
          ) : null}
        </Card>
      ) : null}

      {ranked.length ? (
        <div className="grid gap-5">
          <Card className="p-5 sm:p-7">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#8ce8ff]">Ranked people to follow</p>
                <h2 className="mt-2 text-2xl font-semibold text-white sm:text-3xl">
                  Accounts your chosen network already knows.
                </h2>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-white/56">
                  Each account is recommended by people this profile deliberately follows. Discovery Score weights normalized overlap at 65% and log-scaled reach at 35%, while every raw input remains visible.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {remainingProfiles > 0 && !running ? (
                  <Button size="sm" onClick={() => void loadMoreProfiles()}>
                    <RefreshCw aria-hidden className="size-4" />
                    Load next {formatExactCount(Math.min(runtime?.options.profileBatchSize ?? 0, remainingProfiles))}
                  </Button>
                ) : null}
                <Button variant="secondary" size="sm" onClick={exportCsv} disabled={!filtered.length}>
                  <Download aria-hidden className="size-4" />Export CSV
                </Button>
              </div>
            </div>
            <div className="mt-7 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <label className="grid gap-2 text-xs font-medium uppercase tracking-[0.12em] text-white/42 md:col-span-2">
                Search results
                <span className="relative">
                  <Search aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-white/34" />
                  <input
                    value={search}
                    onChange={(event: ChangeEvent<HTMLInputElement>) => setSearch(event.target.value)}
                    className={cn(inputClass, "pl-10 normal-case tracking-normal")}
                    placeholder="Name, handle, or bio keyword"
                  />
                </span>
              </label>
              <label className="grid gap-2 text-xs font-medium uppercase tracking-[0.12em] text-white/42">
                Sort by
                <select
                  value={sort}
                  onChange={(event: ChangeEvent<HTMLSelectElement>) => setSort(event.target.value as SortKey)}
                  className={cn(inputClass, "normal-case tracking-normal")}
                >
                  <option value="score">Discovery score</option>
                  <option value="overlap">Overlap percentage</option>
                  <option value="shared">Shared followed accounts</option>
                  <option value="followers">Total followers</option>
                  <option value="hidden">Hidden gems</option>
                </select>
              </label>
              <label className="grid gap-2 text-xs font-medium uppercase tracking-[0.12em] text-white/42">
                Minimum shared
                <input
                  type="number"
                  min={1}
                  value={resultMinShared}
                  onChange={(event: ChangeEvent<HTMLInputElement>) =>
                    setResultMinShared(Math.max(1, Number(event.target.value) || 1))
                  }
                  className={cn(inputClass, "normal-case tracking-normal")}
                />
              </label>
              <label className="grid gap-2 text-xs font-medium uppercase tracking-[0.12em] text-white/42">
                Minimum overlap %
                <input
                  type="number"
                  min={0}
                  step={0.1}
                  value={minOverlap}
                  onChange={(event: ChangeEvent<HTMLInputElement>) =>
                    setMinOverlap(Math.max(0, Number(event.target.value) || 0))
                  }
                  className={cn(inputClass, "normal-case tracking-normal")}
                />
              </label>
              <label className="grid gap-2 text-xs font-medium uppercase tracking-[0.12em] text-white/42">
                Minimum followers
                <input
                  type="number"
                  min={0}
                  step={100}
                  value={minFollowers}
                  onChange={(event: ChangeEvent<HTMLInputElement>) =>
                    setMinFollowers(Math.max(0, Number(event.target.value) || 0))
                  }
                  className={cn(inputClass, "normal-case tracking-normal")}
                />
              </label>
              <label className="flex items-center gap-3 rounded-lg border border-white/10 bg-black/15 px-4 py-3 text-sm text-white/64 md:col-span-2">
                <input
                  type="checkbox"
                  checked={hideFollowing}
                  onChange={(event: ChangeEvent<HTMLInputElement>) => setHideFollowing(event.target.checked)}
                  className="size-4 accent-[#16c8ff]"
                />
                Hide accounts this profile already follows
              </label>
            </div>
            <div className="mt-5 flex flex-wrap justify-between gap-3 text-sm text-white/46">
              <span>Showing {formatExactCount(Math.min(shown, filtered.length))} of {formatExactCount(filtered.length)} matching accounts</span>
              <span>{formatExactCount(ranked.length)} ranked profiles loaded</span>
            </div>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            {filtered.slice(0, shown).map((item, index) => (
              <Card key={item.did} className="flex h-full flex-col p-5 sm:p-6">
                <div className="flex items-start gap-4">
                  <Avatar profile={item} className="size-12" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="truncate text-lg font-semibold text-white">{item.displayName || item.handle}</h3>
                        <p className="truncate text-sm text-white/46">@{item.handle}</p>
                      </div>
                      <span className="rounded-full border border-[#16c8ff]/25 bg-[#16c8ff]/8 px-2.5 py-1 text-xs font-semibold text-[#8ce8ff]">#{index + 1}</span>
                    </div>
                    {item.alreadyFollowing ? (
                      <span className="mt-2 inline-flex rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[0.7rem] text-white/48">Already following</span>
                    ) : null}
                  </div>
                </div>
                <p className="mt-4 min-h-12 text-sm leading-6 text-white/56">{item.description || "No profile description available."}</p>
                <dl className="mt-5 grid grid-cols-3 gap-2">
                  <Metric label="Overlap" value={`${item.overlapPct.toFixed(item.overlapPct < 1 ? 2 : 1)}%`} />
                  <Metric label="Shared" value={formatExactCount(item.sharedCount)} />
                  <Metric label="Followers" value={formatCount(item.followersCount)} />
                </dl>
                <div className="mt-5 rounded-xl border border-white/8 bg-black/15 p-4">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-white/56">Discovery Score</span>
                    <span className="font-semibold text-white">{item.discoveryScore}</span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                    <div className="h-full rounded-full bg-gradient-to-r from-[#f0001c] to-[#16c8ff]" style={{ width: `${item.discoveryScore}%` }} />
                  </div>
                </div>
                <div className="mt-auto flex flex-wrap gap-2 pt-5">
                  <Button variant="secondary" size="sm" onClick={() => setSelectedDid(item.did)}>
                    <Eye aria-hidden className="size-4" />Why this account
                  </Button>
                  <a
                    href={`https://bsky.app/profile/${item.handle}`}
                    target="_blank"
                    rel="noreferrer"
                    className={buttonStyles({ size: "sm", className: "flex-1" })}
                  >
                    Open & follow<ArrowUpRight aria-hidden className="size-4" />
                  </a>
                </div>
              </Card>
            ))}
          </div>
          {shown < filtered.length ? (
            <div className="flex justify-center">
              <Button variant="secondary" onClick={() => setShown((value) => value + 100)}>Show 100 more</Button>
            </div>
          ) : null}
          {!filtered.length ? (
            <Card className="p-8 text-center">
              <Search aria-hidden className="mx-auto size-7 text-white/34" />
              <h3 className="mt-4 text-lg font-semibold text-white">No results match those filters.</h3>
              <p className="mt-2 text-sm text-white/52">Lower the overlap, shared-account, or follower-count thresholds.</p>
            </Card>
          ) : null}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-5">
          <Network aria-hidden className="size-5 text-[#8ce8ff]" />
          <h3 className="mt-4 font-semibold text-white">Intentional curators</h3>
          <p className="mt-2 text-sm leading-6 text-white/52">
            This mode treats the accounts a profile deliberately follows as curators for people-to-follow recommendations.
          </p>
        </Card>
        <Card className="p-5">
          <RefreshCw aria-hidden className="size-5 text-[#ffb4b8]" />
          <h3 className="mt-4 font-semibold text-white">Resumable locally</h3>
          <p className="mt-2 text-sm leading-6 text-white/52">
            Following-graph progress is saved separately in IndexedDB on this device, not in a Rukh Labs account or database.
          </p>
        </Card>
        <Card className="p-5">
          <Download aria-hidden className="size-5 text-[#ffe4a0]" />
          <h3 className="mt-4 font-semibold text-white">Account discovery only</h3>
          <p className="mt-2 text-sm leading-6 text-white/52">
            Follow graphs make sense for recommending people. Likes and activity would be better signals for recommending individual posts.
          </p>
        </Card>
      </div>

      {selected ? (
        <div
          className="fixed inset-0 z-[80] grid place-items-center bg-black/75 p-4 backdrop-blur-sm"
          onMouseDown={(event: ReactMouseEvent<HTMLDivElement>) =>
            event.target === event.currentTarget && setSelectedDid(null)
          }
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="following-candidate-title"
            className="max-h-[88vh] w-full max-w-2xl overflow-hidden rounded-2xl border border-white/12 bg-[#0b090b] shadow-[0_30px_120px_rgba(0,0,0,0.6)]"
          >
            <div className="flex items-start justify-between gap-4 border-b border-white/10 p-5 sm:p-6">
              <div className="flex min-w-0 items-center gap-4">
                <Avatar profile={selected} className="size-12" />
                <div className="min-w-0">
                  <h2 id="following-candidate-title" className="truncate text-xl font-semibold text-white">
                    {selected.displayName || selected.handle}
                  </h2>
                  <p className="truncate text-sm text-white/46">@{selected.handle}</p>
                </div>
              </div>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setSelectedDid(null)}
                className="grid size-10 shrink-0 place-items-center rounded-full border border-white/10 text-white/60 hover:bg-white/[0.06] hover:text-white"
              >
                <X aria-hidden className="size-4" />
              </button>
            </div>
            <div className="max-h-[calc(88vh-5.5rem)] overflow-y-auto p-5 sm:p-6">
              <dl className="grid gap-3 sm:grid-cols-3">
                <Metric label="Network overlap" value={`${selected.overlapPct.toFixed(2)}%`} />
                <Metric label="Shared followed accounts" value={formatExactCount(selected.sharedCount)} />
                <Metric label="Total followers" value={formatExactCount(selected.followersCount)} />
              </dl>
              <div className="mt-6 rounded-xl border border-[#16c8ff]/20 bg-[#16c8ff]/6 p-4 text-sm leading-6 text-white/64">
                <p className="font-semibold text-white">Why this account ranked here</p>
                <p className="mt-2">
                  {formatExactCount(selected.sharedCount)} of the {formatExactCount(processed)} successfully scanned accounts this profile follows also follow this account, producing {selected.overlapPct.toFixed(2)}% overlap. Log-scaled public reach combines with overlap for a Discovery Score of {selected.discoveryScore}.
                </p>
              </div>
              <div className="mt-6">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-semibold text-white">Shared followed accounts</h3>
                  <span className="text-xs text-white/42">
                    {formatExactCount(selectedConnections.length)} of {formatExactCount(selected.sharedCount)} shown
                  </span>
                </div>
                <div className="mt-3 grid gap-2">
                  {selectedConnections.map((profile) => (
                    <a
                      key={profile.did}
                      href={`https://bsky.app/profile/${profile.handle}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/[0.025] p-3 hover:border-[#16c8ff]/25 hover:bg-[#16c8ff]/6"
                    >
                      <Avatar profile={profile} className="size-9" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-white">{profile.displayName || profile.handle}</span>
                        <span className="block truncate text-xs text-white/42">@{profile.handle}</span>
                      </span>
                      <ArrowUpRight aria-hidden className="size-4 text-white/36" />
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
