"use client";

import {
  Archive,
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  Clock3,
  Database,
  Download,
  FileUp,
  Gauge,
  History,
  ListChecks,
  Network,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
  UsersRound,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ComponentType, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";

const DB_NAME = "rukh-iazma-x";
const STORE_NAME = "workspace";
const STATE_KEY = "state-v1";
const VERSION = 1;
const RESERVED_X_PATHS = new Set(["home", "i", "intent", "search", "hashtag", "settings", "messages", "compose", "explore", "notifications"]);

type Relationship = "mutual" | "following" | "follower" | "candidate";
type QueueStatus = "pending" | "followed" | "skipped";
type TabKey = "overview" | "import" | "candidates" | "queue" | "campaigns" | "data";

type Account = {
  key: string;
  accountId?: string;
  handle?: string;
  profileUrl: string;
  followsYou: boolean;
  youFollow: boolean;
  archiveKnown: boolean;
  sources: string[];
  campaigns: string[];
  firstSeen: string;
  lastSeen: string;
  followedAt?: string;
};

type Campaign = { id: string; name: string; createdAt: string };
type QueueEntry = { id: string; accountKey: string; addedAt: string; status: QueueStatus; completedAt?: string };
type HistoryEvent = {
  id: string;
  at: string;
  type: "import" | "queued" | "followed" | "skipped" | "follow-back" | "restore";
  accountKey?: string;
  detail: string;
};
type Snapshot = { id: string; at: string; followers: number; following: number; mutuals: number; archiveAccounts: number };
type IazmaState = {
  version: number;
  accounts: Record<string, Account>;
  campaigns: Campaign[];
  queue: QueueEntry[];
  history: HistoryEvent[];
  snapshots: Snapshot[];
  paceMinutes: number;
  nextFollowAt?: string;
};
type Score = { total: number; confidence: number; path: number; reciprocity: number; influence: number; bridge: number };
type ArchiveObservation = { accountId: string; profileUrl: string; relation: "follower" | "following" };

const emptyState = (): IazmaState => ({
  version: VERSION,
  accounts: {},
  campaigns: [{ id: "general", name: "General network", createdAt: new Date().toISOString() }],
  queue: [],
  history: [],
  snapshots: [],
  paceMinutes: 5,
});

function uid(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}

function nowIso() {
  return new Date().toISOString();
}

function relationship(account: Account): Relationship {
  if (account.followsYou && account.youFollow) return "mutual";
  if (account.youFollow) return "following";
  if (account.followsYou) return "follower";
  return "candidate";
}

function clamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function scoreAccount(account: Account): Score {
  const rel = relationship(account);
  const sourceCount = new Set(account.sources).size;
  const campaignCount = new Set(account.campaigns).size;
  const path = clamp(28 + sourceCount * 18 + (rel === "mutual" ? 22 : rel === "follower" ? 12 : 0));
  const reciprocity = rel === "mutual" ? 100 : rel === "follower" ? 86 : rel === "following" ? 34 : 52;
  const influence = 50;
  const bridge = clamp(24 + Math.max(0, sourceCount - 1) * 28 + campaignCount * 16);
  const total = clamp(path * 0.35 + reciprocity * 0.25 + influence * 0.2 + bridge * 0.2);
  const confidence = clamp(
    18 + (account.accountId ? 28 : 0) + (account.handle ? 22 : 0) + (account.archiveKnown ? 22 : 0) + Math.min(10, sourceCount * 3),
  );
  return { total, confidence, path, reciprocity, influence, bridge };
}

function accountLabel(account: Account) {
  return account.handle ? `@${account.handle}` : `X user ${account.accountId ?? "unknown"}`;
}

function normalizeProfileUrl(raw: string | undefined, accountId: string) {
  if (raw?.startsWith("http")) return raw.replace("twitter.com", "x.com");
  return `https://x.com/i/user/${accountId}`;
}

function extractHandles(text: string) {
  const handles = new Set<string>();
  const atRegex = /(?:^|[^A-Za-z0-9_])@([A-Za-z0-9_]{1,15})\b/g;
  const urlRegex = /https?:\/\/(?:www\.)?(?:x|twitter)\.com\/([A-Za-z0-9_]{1,15})(?=[/?#\s]|$)/gi;
  let match: RegExpExecArray | null;
  while ((match = atRegex.exec(text))) handles.add(match[1]);
  while ((match = urlRegex.exec(text))) {
    const handle = match[1];
    if (!RESERVED_X_PATHS.has(handle.toLowerCase())) handles.add(handle);
  }
  return [...handles];
}

function parseWrappedArray(text: string): unknown[] {
  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");
  if (start < 0 || end < start) return [];
  try {
    const value = JSON.parse(text.slice(start, end + 1));
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function archiveObservations(name: string, text: string): ArchiveObservation[] {
  const lower = name.toLowerCase();
  const relation = lower.includes("following") ? "following" : lower.includes("follower") ? "follower" : null;
  if (!relation) return [];
  const records = parseWrappedArray(text);
  const out: ArchiveObservation[] = [];
  for (const raw of records) {
    if (!raw || typeof raw !== "object") continue;
    const wrapped = raw as Record<string, unknown>;
    const payload = wrapped[relation];
    if (!payload || typeof payload !== "object") continue;
    const row = payload as Record<string, unknown>;
    const accountId = String(row.accountId ?? "").trim();
    if (!accountId) continue;
    const userLink = typeof row.userLink === "string" ? row.userLink : undefined;
    out.push({ accountId, profileUrl: normalizeProfileUrl(userLink, accountId), relation });
  }
  return out;
}

async function decompressRaw(bytes: Uint8Array) {
  const data = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  const stream = new Blob([data]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function readArchiveZip(file: File) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const decoder = new TextDecoder();
  const minimumEocd = 22;
  const maxComment = 0xffff;
  let eocd = -1;

  for (let offset = bytes.length - minimumEocd; offset >= Math.max(0, bytes.length - minimumEocd - maxComment); offset--) {
    if (view.getUint32(offset, true) === 0x06054b50) {
      eocd = offset;
      break;
    }
  }
  if (eocd < 0) throw new Error("That ZIP does not look like a standard X archive.");

  const entries = view.getUint16(eocd + 10, true);
  let cursor = view.getUint32(eocd + 16, true);
  const files: Array<{ name: string; text: string }> = [];

  for (let i = 0; i < entries; i++) {
    if (view.getUint32(cursor, true) !== 0x02014b50) throw new Error("The ZIP directory could not be read.");
    const method = view.getUint16(cursor + 10, true);
    const compressedSize = view.getUint32(cursor + 20, true);
    const nameLength = view.getUint16(cursor + 28, true);
    const extraLength = view.getUint16(cursor + 30, true);
    const commentLength = view.getUint16(cursor + 32, true);
    const localOffset = view.getUint32(cursor + 42, true);
    const name = decoder.decode(bytes.slice(cursor + 46, cursor + 46 + nameLength));
    const useful = /(^|\/)(followers?|following)(?:-part\d+)?\.js$/i.test(name);

    if (useful) {
      if (view.getUint32(localOffset, true) !== 0x04034b50) throw new Error(`Could not read ${name}.`);
      const localNameLength = view.getUint16(localOffset + 26, true);
      const localExtraLength = view.getUint16(localOffset + 28, true);
      const dataStart = localOffset + 30 + localNameLength + localExtraLength;
      const compressed = bytes.slice(dataStart, dataStart + compressedSize);
      let uncompressed: Uint8Array;
      if (method === 0) uncompressed = compressed;
      else if (method === 8) uncompressed = await decompressRaw(compressed);
      else throw new Error(`${name} uses an unsupported ZIP compression method.`);
      files.push({ name, text: decoder.decode(uncompressed) });
    }
    cursor += 46 + nameLength + extraLength + commentLength;
  }

  if (!files.length) throw new Error("No follower.js or following.js files were found inside the archive.");
  return files;
}

function openDb() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function loadWorkspace() {
  const db = await openDb();
  return new Promise<IazmaState | null>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const request = tx.objectStore(STORE_NAME).get(STATE_KEY);
    request.onsuccess = () => resolve((request.result as IazmaState | undefined) ?? null);
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => db.close();
  });
}

async function saveWorkspace(state: IazmaState) {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(state, STATE_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

function relationshipTone(rel: Relationship) {
  if (rel === "mutual") return "border-emerald-300/20 bg-emerald-300/[0.06] text-emerald-200";
  if (rel === "follower") return "border-[#16c8ff]/20 bg-[#16c8ff]/[0.06] text-[#8ce8ff]";
  if (rel === "following") return "border-[#e6bd73]/20 bg-[#e6bd73]/[0.05] text-[#f1d49a]";
  return "border-white/10 bg-white/[0.035] text-white/60";
}

function formatDate(value: string | undefined) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

function formatCountdown(target: string | undefined, now: number) {
  if (!target) return "ready";
  const diff = Math.max(0, new Date(target).getTime() - now);
  if (!diff) return "ready";
  const totalSeconds = Math.ceil(diff / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-white/10 bg-white/[0.025] ${className}`}>{children}</div>;
}

function Kpi({ label, value, detail, icon: Icon }: { label: string; value: string | number; detail: string; icon: ComponentType<{ className?: string }> }) {
  return (
    <Panel className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/38">{label}</p>
          <p className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-white">{value}</p>
        </div>
        <span className="grid size-10 place-items-center rounded-xl border border-[#16c8ff]/20 bg-[#16c8ff]/[0.05] text-[#8ce8ff]">
          <Icon className="size-5" />
        </span>
      </div>
      <p className="mt-3 text-sm leading-6 text-white/42">{detail}</p>
    </Panel>
  );
}

export function IazmaXWorkspace() {
  const [state, setState] = useState<IazmaState>(() => emptyState());
  const [hydrated, setHydrated] = useState(false);
  const [tab, setTab] = useState<TabKey>("overview");
  const [pasteText, setPasteText] = useState("");
  const [source, setSource] = useState("manual import");
  const [campaignId, setCampaignId] = useState("general");
  const [campaignName, setCampaignName] = useState("");
  const [search, setSearch] = useState("");
  const [relationshipFilter, setRelationshipFilter] = useState<"all" | Relationship>("all");
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [status, setStatus] = useState("Local database ready.");
  const [busy, setBusy] = useState(false);
  const [clock, setClock] = useState(Date.now());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const restoreInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;
    loadWorkspace()
      .then((saved) => {
        if (active && saved?.version === VERSION) setState(saved);
      })
      .catch(() => setStatus("IndexedDB was unavailable; this session will still work, but persistence may not."))
      .finally(() => active && setHydrated(true));
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const timer = window.setTimeout(() => {
      saveWorkspace(state).catch(() => setStatus("Could not persist the latest workspace state."));
    }, 250);
    return () => window.clearTimeout(timer);
  }, [state, hydrated]);

  useEffect(() => {
    const timer = window.setInterval(() => setClock(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const accounts = useMemo(() => Object.values(state.accounts), [state.accounts]);
  const scoredAccounts = useMemo(
    () => accounts.map((account) => ({ account, score: scoreAccount(account) })).sort((a, b) => b.score.total - a.score.total),
    [accounts],
  );
  const mutuals = accounts.filter((account) => relationship(account) === "mutual").length;
  const pendingQueue = state.queue.filter((entry) => entry.status === "pending");
  const nextEntry = pendingQueue[0];
  const nextAccount = nextEntry ? state.accounts[nextEntry.accountKey] : undefined;
  const ready = !state.nextFollowAt || new Date(state.nextFollowAt).getTime() <= clock;

  const filteredCandidates = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return scoredAccounts.filter(({ account }) => {
      const rel = relationship(account);
      if (relationshipFilter !== "all" && rel !== relationshipFilter) return false;
      if (!needle) return true;
      return accountLabel(account).toLowerCase().includes(needle) || account.sources.some((item) => item.toLowerCase().includes(needle));
    });
  }, [relationshipFilter, scoredAccounts, search]);

  const sourceStats = useMemo(() => {
    const map = new Map<string, { source: string; accounts: number; mutuals: number }>();
    for (const account of accounts) {
      for (const sourceName of account.sources) {
        const row = map.get(sourceName) ?? { source: sourceName, accounts: 0, mutuals: 0 };
        row.accounts += 1;
        if (relationship(account) === "mutual") row.mutuals += 1;
        map.set(sourceName, row);
      }
    }
    return [...map.values()].sort((a, b) => b.mutuals / Math.max(1, b.accounts) - a.mutuals / Math.max(1, a.accounts));
  }, [accounts]);

  function updateState(mutator: (current: IazmaState) => IazmaState) {
    setState((current) => mutator(current));
  }

  function addHandles(handles: string[], sourceName: string, selectedCampaignId: string) {
    const importedAt = nowIso();
    const cleanSource = sourceName.trim() || "manual import";
    updateState((current) => {
      const next = { ...current, accounts: { ...current.accounts }, history: [...current.history] };
      for (const rawHandle of handles) {
        const handle = rawHandle.replace(/^@/, "");
        const key = `handle:${handle.toLowerCase()}`;
        const existing = next.accounts[key];
        next.accounts[key] = {
          key,
          handle,
          profileUrl: `https://x.com/${handle}`,
          followsYou: existing?.followsYou ?? false,
          youFollow: existing?.youFollow ?? false,
          archiveKnown: existing?.archiveKnown ?? false,
          sources: [...new Set([...(existing?.sources ?? []), cleanSource])],
          campaigns: [...new Set([...(existing?.campaigns ?? []), selectedCampaignId])],
          firstSeen: existing?.firstSeen ?? importedAt,
          lastSeen: importedAt,
          followedAt: existing?.followedAt,
        };
      }
      next.history.unshift({ id: uid("event"), at: importedAt, type: "import", detail: `Imported ${handles.length} handle${handles.length === 1 ? "" : "s"} from ${cleanSource}.` });
      return next;
    });
  }

  function applyArchive(observations: ArchiveObservation[], filename: string) {
    const importedAt = nowIso();
    const followers = new Map(observations.filter((row) => row.relation === "follower").map((row) => [row.accountId, row]));
    const following = new Map(observations.filter((row) => row.relation === "following").map((row) => [row.accountId, row]));
    const ids = new Set([...followers.keys(), ...following.keys()]);

    updateState((current) => {
      const nextAccounts = { ...current.accounts };
      const nextHistory = [...current.history];
      for (const account of Object.values(nextAccounts)) {
        if (!account.archiveKnown || !account.accountId) continue;
        const previousFollower = account.followsYou;
        const isFollower = followers.has(account.accountId);
        const isFollowing = following.has(account.accountId);
        nextAccounts[account.key] = { ...account, followsYou: isFollower, youFollow: isFollowing, lastSeen: isFollower || isFollowing ? importedAt : account.lastSeen };
        if (!previousFollower && isFollower && account.youFollow) {
          nextHistory.unshift({ id: uid("event"), at: importedAt, type: "follow-back", accountKey: account.key, detail: `${accountLabel(account)} appeared as a new follower in this archive snapshot.` });
        }
      }

      for (const accountId of ids) {
        const followerRow = followers.get(accountId);
        const followingRow = following.get(accountId);
        const key = `id:${accountId}`;
        const existing = nextAccounts[key];
        nextAccounts[key] = {
          key,
          accountId,
          profileUrl: followerRow?.profileUrl ?? followingRow?.profileUrl ?? existing?.profileUrl ?? `https://x.com/i/user/${accountId}`,
          followsYou: Boolean(followerRow),
          youFollow: Boolean(followingRow),
          archiveKnown: true,
          sources: [...new Set([...(existing?.sources ?? []), "X archive"])],
          campaigns: existing?.campaigns ?? ["general"],
          firstSeen: existing?.firstSeen ?? importedAt,
          lastSeen: importedAt,
          followedAt: existing?.followedAt,
          handle: existing?.handle,
        };
      }

      const archiveAccounts = Object.values(nextAccounts).filter((account) => account.archiveKnown && (account.followsYou || account.youFollow));
      const mutualCount = archiveAccounts.filter((account) => account.followsYou && account.youFollow).length;
      return {
        ...current,
        accounts: nextAccounts,
        history: [{ id: uid("event"), at: importedAt, type: "import", detail: `Imported X archive snapshot from ${filename}.` }, ...nextHistory].slice(0, 1500),
        snapshots: [{ id: uid("snapshot"), at: importedAt, followers: followers.size, following: following.size, mutuals: mutualCount, archiveAccounts: archiveAccounts.length }, ...current.snapshots].slice(0, 100),
      };
    });
  }

  async function importFiles(files: FileList | File[]) {
    const list = Array.from(files);
    if (!list.length) return;
    setBusy(true);
    try {
      let observations: ArchiveObservation[] = [];
      let handles: string[] = [];
      const names: string[] = [];
      for (const file of list) {
        names.push(file.name);
        if (file.name.toLowerCase().endsWith(".zip")) {
          const archiveFiles = await readArchiveZip(file);
          for (const item of archiveFiles) observations.push(...archiveObservations(item.name, item.text));
          continue;
        }
        const text = await file.text();
        const archiveRows = archiveObservations(file.name, text);
        if (archiveRows.length) observations.push(...archiveRows);
        else handles = handles.concat(extractHandles(text));
      }
      if (observations.length) applyArchive(observations, names.join(", "));
      if (handles.length) addHandles([...new Set(handles)], source, campaignId);
      setStatus(`Imported ${observations.length ? `${observations.length.toLocaleString()} archive relationship records` : "no archive relationships"}${handles.length ? ` and ${new Set(handles).size.toLocaleString()} handles` : ""}.`);
      setTab("overview");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "The import failed.");
    } finally {
      setBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function importPaste() {
    const handles = extractHandles(pasteText);
    if (!handles.length) {
      setStatus("No X handles or profile URLs were found in that text.");
      return;
    }
    addHandles(handles, source, campaignId);
    setPasteText("");
    setStatus(`Imported ${handles.length.toLocaleString()} unique handles.`);
    setTab("candidates");
  }

  function addSelectedToQueue() {
    if (!selected.size) return;
    const at = nowIso();
    updateState((current) => {
      const queuedKeys = new Set(current.queue.filter((entry) => entry.status === "pending").map((entry) => entry.accountKey));
      const additions = [...selected]
        .filter((key) => !queuedKeys.has(key) && current.accounts[key] && !current.accounts[key].youFollow)
        .map((key) => ({ id: uid("queue"), accountKey: key, addedAt: at, status: "pending" as const }));
      return {
        ...current,
        queue: [...current.queue, ...additions],
        history: [{ id: uid("event"), at, type: "queued", detail: `Added ${additions.length} account${additions.length === 1 ? "" : "s"} to the follow queue.` }, ...current.history],
      };
    });
    setSelected(new Set());
    setStatus(`Queued selected candidates. Manual follow pacing is ${state.paceMinutes} minute${state.paceMinutes === 1 ? "" : "s"}.`);
    setTab("queue");
  }

  function markFollowed(entry: QueueEntry, account: Account) {
    if (!ready) return;
    const at = nowIso();
    const nextAllowed = new Date(Date.now() + state.paceMinutes * 60_000).toISOString();
    updateState((current) => ({
      ...current,
      accounts: { ...current.accounts, [account.key]: { ...current.accounts[account.key], youFollow: true, followedAt: at, lastSeen: at } },
      queue: current.queue.map((item) => (item.id === entry.id ? { ...item, status: "followed", completedAt: at } : item)),
      nextFollowAt: nextAllowed,
      history: [{ id: uid("event"), at, type: "followed", accountKey: account.key, detail: `Marked ${accountLabel(account)} as followed.` }, ...current.history],
    }));
  }

  function skipEntry(entry: QueueEntry, account: Account) {
    const at = nowIso();
    updateState((current) => ({
      ...current,
      queue: current.queue.map((item) => (item.id === entry.id ? { ...item, status: "skipped", completedAt: at } : item)),
      history: [{ id: uid("event"), at, type: "skipped", accountKey: account.key, detail: `Skipped ${accountLabel(account)}.` }, ...current.history],
    }));
  }

  function createCampaign() {
    const name = campaignName.trim();
    if (!name) return;
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "campaign";
    const id = `campaign-${slug}-${Date.now()}`;
    updateState((current) => ({ ...current, campaigns: [...current.campaigns, { id, name, createdAt: nowIso() }] }));
    setCampaignId(id);
    setCampaignName("");
  }

  function exportDatabase() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `iazma-x-backup-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function restoreDatabase(file: File) {
    try {
      const parsed = JSON.parse(await file.text()) as IazmaState;
      if (parsed?.version !== VERSION || !parsed.accounts || !Array.isArray(parsed.queue)) throw new Error("That is not a compatible IAZMA X backup.");
      setState({ ...parsed, history: [{ id: uid("event"), at: nowIso(), type: "restore", detail: `Restored backup ${file.name}.` }, ...parsed.history] });
      setStatus(`Restored ${file.name}.`);
      setTab("overview");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "The backup could not be restored.");
    } finally {
      if (restoreInputRef.current) restoreInputRef.current.value = "";
    }
  }

  function clearDatabase() {
    if (!window.confirm("Clear the local IAZMA X database on this device? Export a backup first if you want to keep it.")) return;
    setState(emptyState());
    setSelected(new Set());
    setStatus("Local IAZMA X database cleared.");
  }

  const tabs: Array<{ key: TabKey; label: string; icon: ComponentType<{ className?: string }> }> = [
    { key: "overview", label: "Overview", icon: Gauge },
    { key: "import", label: "Import", icon: FileUp },
    { key: "candidates", label: "Candidates", icon: UsersRound },
    { key: "queue", label: "Follow queue", icon: ListChecks },
    { key: "campaigns", label: "Campaigns", icon: Network },
    { key: "data", label: "Data", icon: Database },
  ];

  return (
    <>
      <Section className="relative overflow-hidden border-b border-white/10 py-10 sm:py-14">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_82%_18%,rgba(22,200,255,0.14),transparent_33%),radial-gradient(circle_at_10%_10%,rgba(240,0,28,0.10),transparent_31%)]" />
        <Container className="relative">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-4xl">
              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em]">
                <span className="rounded-full border border-white/10 bg-white/[0.035] px-3 py-1 text-white/56">Private admin</span>
                <span className="rounded-full border border-[#16c8ff]/20 bg-[#16c8ff]/[0.05] px-3 py-1 text-[#8ce8ff]">IAZMA X</span>
                <span className="rounded-full border border-emerald-300/20 bg-emerald-300/[0.05] px-3 py-1 text-emerald-200">Local-first</span>
              </div>
              <h1 className="mt-5 text-4xl font-semibold tracking-[-0.045em] text-white sm:text-6xl">Twitter/X network intelligence without an API bill.</h1>
              <p className="mt-4 max-w-3xl text-base leading-7 text-white/54 sm:text-lg">Import archive snapshots and handle lists, score the network you actually know, organize campaigns, and run a paced manual follow queue. The database stays in this browser unless you export it.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 px-5 py-4 text-sm text-white/48 lg:max-w-sm">
              <div className="flex items-center gap-2 font-medium text-white/76"><ShieldCheck className="size-4 text-[#8ce8ff]" /> Safe execution boundary</div>
              <p className="mt-2 leading-6">IAZMA never clicks Follow on X. It ranks, queues, times, records, and opens the profile; you perform the follow.</p>
            </div>
          </div>
        </Container>
      </Section>

      <Section className="py-8 sm:py-10">
        <Container>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Kpi label="Known accounts" value={accounts.length.toLocaleString()} detail="Archive IDs plus imported handles." icon={UsersRound} />
            <Kpi label="Mutuals" value={mutuals.toLocaleString()} detail="Known two-way relationships." icon={Network} />
            <Kpi label="Queue" value={pendingQueue.length.toLocaleString()} detail={`Manual follows paced every ${state.paceMinutes} min.`} icon={Clock3} />
            <Kpi label="Snapshots" value={state.snapshots.length.toLocaleString()} detail="Archive imports retained for comparison." icon={Archive} />
          </div>

          <div className="mt-6 overflow-x-auto rounded-2xl border border-white/10 bg-black/20 p-1.5">
            <div className="flex min-w-max gap-1">
              {tabs.map(({ key, label, icon: Icon }) => (
                <button key={key} type="button" onClick={() => setTab(key)} className={`inline-flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-medium transition ${tab === key ? "bg-white/[0.09] text-white" : "text-white/46 hover:bg-white/[0.045] hover:text-white/76"}`}>
                  <Icon className="size-4" /> {label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-white/8 bg-white/[0.018] px-4 py-3 text-sm text-white/48">{busy ? "Working locally…" : status}</div>

          {tab === "overview" && (
            <div className="mt-6 grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
              <Panel className="overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 p-5 sm:p-6">
                  <div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8ce8ff]">Best next accounts</p><h2 className="mt-2 text-2xl font-semibold text-white">Highest-value known candidates</h2></div>
                  <Button variant="glass" size="sm" onClick={() => setTab("candidates")}>Open candidates</Button>
                </div>
                <div className="divide-y divide-white/8">
                  {scoredAccounts.filter(({ account }) => !account.youFollow).slice(0, 8).map(({ account, score }) => (
                    <div key={account.key} className="grid gap-4 p-5 sm:grid-cols-[1fr_auto] sm:items-center sm:px-6">
                      <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="truncate font-semibold text-white">{accountLabel(account)}</span><span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.08em] ${relationshipTone(relationship(account))}`}>{relationship(account)}</span></div><p className="mt-2 truncate text-sm text-white/42">{account.sources.join(" · ") || "No source label"}</p></div>
                      <div className="flex items-center gap-5 text-right"><div><p className="text-[11px] uppercase tracking-[0.12em] text-white/32">IAZMA</p><p className="text-xl font-semibold text-white">{score.total}</p></div><div><p className="text-[11px] uppercase tracking-[0.12em] text-white/32">Confidence</p><p className="text-xl font-semibold text-[#8ce8ff]">{score.confidence}%</p></div></div>
                    </div>
                  ))}
                  {!accounts.length && <div className="p-8 text-sm leading-6 text-white/46">Import an X archive or paste handles to build the first graph.</div>}
                </div>
              </Panel>

              <div className="grid gap-6">
                <Panel className="p-5 sm:p-6">
                  <div className="flex items-center gap-2 text-sm font-semibold text-white"><Sparkles className="size-4 text-[#f1d49a]" /> Next follow</div>
                  {nextAccount && nextEntry ? <><p className="mt-4 text-2xl font-semibold text-white">{accountLabel(nextAccount)}</p><p className="mt-2 text-sm text-white/46">Queue position 1 of {pendingQueue.length}</p><p className={`mt-5 text-4xl font-semibold tracking-[-0.04em] ${ready ? "text-emerald-200" : "text-[#f1d49a]"}`}>{formatCountdown(state.nextFollowAt, clock)}</p><Button variant="glass" className="mt-5 w-full" onClick={() => setTab("queue")}>Open queue</Button></> : <p className="mt-4 text-sm leading-6 text-white/46">Nothing is queued yet. Select candidates and add them to the paced follow workflow.</p>}
                </Panel>
                <Panel className="p-5 sm:p-6">
                  <div className="flex items-center gap-2 text-sm font-semibold text-white"><BarChart3 className="size-4 text-[#8ce8ff]" /> Strongest sources</div>
                  <div className="mt-4 grid gap-3">{sourceStats.slice(0, 5).map((row) => <div key={row.source} className="rounded-xl border border-white/8 bg-black/20 p-3"><div className="flex items-center justify-between gap-3"><span className="truncate text-sm font-medium text-white/78">{row.source}</span><span className="text-xs text-white/38">{row.accounts} accounts</span></div><p className="mt-1 text-xs text-white/38">{row.mutuals} mutuals · {Math.round((row.mutuals / Math.max(1, row.accounts)) * 100)}% mutual rate</p></div>)}{!sourceStats.length && <p className="text-sm leading-6 text-white/42">Source performance appears after imports.</p>}</div>
                </Panel>
              </div>
            </div>
          )}

          {tab === "import" && (
            <div className="mt-6 grid gap-6 xl:grid-cols-2">
              <Panel className="p-5 sm:p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8ce8ff]">Archive + files</p><h2 className="mt-2 text-2xl font-semibold text-white">Drop the X archive ZIP</h2><p className="mt-3 text-sm leading-6 text-white/46">The browser reads follower/following files locally. The ZIP is not uploaded to Rukh Labs. You can also import extracted .js files, CSV, TXT, or JSON containing handles/profile URLs.</p>
                <button type="button" disabled={busy} onClick={() => fileInputRef.current?.click()} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); void importFiles(event.dataTransfer.files); }} className="mt-6 grid min-h-56 w-full place-items-center rounded-2xl border border-dashed border-[#16c8ff]/28 bg-[#16c8ff]/[0.025] p-8 text-center transition hover:border-[#16c8ff]/50 hover:bg-[#16c8ff]/[0.045] disabled:opacity-50"><span><Upload className="mx-auto size-8 text-[#8ce8ff]" /><span className="mt-4 block font-semibold text-white">Choose files or drop them here</span><span className="mt-2 block text-sm text-white/42">.zip · .js · .json · .csv · .txt</span></span></button>
                <input ref={fileInputRef} type="file" multiple accept=".zip,.js,.json,.csv,.txt" className="hidden" onChange={(event) => event.target.files && void importFiles(event.target.files)} />
                <p className="mt-4 text-xs leading-5 text-white/32">X archives commonly identify followers/following with numeric account IDs rather than current @handles. IAZMA preserves those IDs and archived profile links instead of inventing names.</p>
              </Panel>
              <Panel className="p-5 sm:p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#f1d49a]">Universal handle import</p><h2 className="mt-2 text-2xl font-semibold text-white">Paste whatever you collected</h2>
                <div className="mt-5 grid gap-4 sm:grid-cols-2"><label className="grid gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-white/38">Source<input value={source} onChange={(event) => setSource(event.target.value)} className="h-11 rounded-xl border border-white/10 bg-black/25 px-3 text-sm font-normal normal-case tracking-normal text-white outline-none focus:border-[#16c8ff]/45" placeholder="@alice following" /></label><label className="grid gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-white/38">Campaign<select value={campaignId} onChange={(event) => setCampaignId(event.target.value)} className="h-11 rounded-xl border border-white/10 bg-[#090b11] px-3 text-sm font-normal normal-case tracking-normal text-white outline-none focus:border-[#16c8ff]/45">{state.campaigns.map((campaign) => <option key={campaign.id} value={campaign.id}>{campaign.name}</option>)}</select></label></div>
                <textarea value={pasteText} onChange={(event) => setPasteText(event.target.value)} className="mt-4 min-h-56 w-full resize-y rounded-2xl border border-white/10 bg-black/25 p-4 font-mono text-sm leading-6 text-white outline-none placeholder:text-white/22 focus:border-[#16c8ff]/45" placeholder={"@alice\nhttps://x.com/bob\nrandom copied text containing @carol"} />
                <Button variant="gold" className="mt-4 w-full sm:w-auto" onClick={importPaste}>Import handles</Button>
              </Panel>
            </div>
          )}

          {tab === "candidates" && (
            <Panel className="mt-6 overflow-hidden">
              <div className="grid gap-4 border-b border-white/10 p-5 sm:p-6 lg:grid-cols-[1fr_auto] lg:items-end"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8ce8ff]">Candidate engine</p><h2 className="mt-2 text-2xl font-semibold text-white">Rank what IAZMA actually knows</h2><p className="mt-2 text-sm leading-6 text-white/44">Unknown influence stays neutral instead of being fabricated. Confidence is shown separately from score.</p></div><Button variant="glass" disabled={!selected.size} onClick={addSelectedToQueue}>Add {selected.size || "selected"} to queue</Button></div>
              <div className="grid gap-3 border-b border-white/8 bg-black/15 p-4 md:grid-cols-[1fr_14rem]"><label className="relative"><Search className="pointer-events-none absolute left-3 top-3.5 size-4 text-white/28" /><input value={search} onChange={(event) => setSearch(event.target.value)} className="h-11 w-full rounded-xl border border-white/10 bg-black/25 pl-10 pr-3 text-sm text-white outline-none focus:border-[#16c8ff]/45" placeholder="Search handles or sources" /></label><select value={relationshipFilter} onChange={(event) => setRelationshipFilter(event.target.value as "all" | Relationship)} className="h-11 rounded-xl border border-white/10 bg-[#090b11] px-3 text-sm text-white outline-none focus:border-[#16c8ff]/45"><option value="all">All relationships</option><option value="candidate">Candidates</option><option value="follower">Follows you</option><option value="following">You follow</option><option value="mutual">Mutual</option></select></div>
              <div className="max-h-[46rem] divide-y divide-white/8 overflow-auto">
                {filteredCandidates.slice(0, 500).map(({ account, score }) => { const checked = selected.has(account.key); return <label key={account.key} className="grid cursor-pointer gap-4 p-4 transition hover:bg-white/[0.02] sm:grid-cols-[auto_1fr_auto] sm:items-center sm:px-6"><input type="checkbox" checked={checked} disabled={account.youFollow} onChange={() => setSelected((current) => { const next = new Set(current); if (next.has(account.key)) next.delete(account.key); else next.add(account.key); return next; })} className="size-4 accent-[#16c8ff]" /><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="truncate font-semibold text-white">{accountLabel(account)}</span><span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.08em] ${relationshipTone(relationship(account))}`}>{relationship(account)}</span>{account.archiveKnown && <span className="rounded-full border border-white/8 bg-white/[0.025] px-2 py-0.5 text-[11px] text-white/38">archive</span>}</div><p className="mt-2 truncate text-sm text-white/40">{account.sources.join(" · ") || "No source"}</p></div><div className="flex gap-5 sm:text-right"><div><p className="text-[10px] uppercase tracking-[0.12em] text-white/30">Score</p><p className="text-lg font-semibold text-white">{score.total}</p></div><div><p className="text-[10px] uppercase tracking-[0.12em] text-white/30">Confidence</p><p className="text-lg font-semibold text-[#8ce8ff]">{score.confidence}%</p></div></div></label>; })}
                {!filteredCandidates.length && <div className="p-8 text-sm text-white/44">No accounts match this filter.</div>}
              </div>
            </Panel>
          )}

          {tab === "queue" && (
            <div className="mt-6 grid gap-6 xl:grid-cols-[0.75fr_1.25fr]">
              <Panel className="p-5 sm:p-6"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#f1d49a]">Paced workflow</p><h2 className="mt-2 text-2xl font-semibold text-white">One manual follow at a time</h2><label className="mt-5 grid gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-white/38">Minutes between completed follows<input type="number" min={1} max={180} value={state.paceMinutes} onChange={(event) => updateState((current) => ({ ...current, paceMinutes: Math.max(1, Math.min(180, Number(event.target.value) || 5)) }))} className="h-11 rounded-xl border border-white/10 bg-black/25 px-3 text-sm font-normal normal-case tracking-normal text-white outline-none focus:border-[#16c8ff]/45" /></label><div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-5"><p className="text-xs font-semibold uppercase tracking-[0.12em] text-white/34">Next slot</p><p className={`mt-2 text-4xl font-semibold tracking-[-0.04em] ${ready ? "text-emerald-200" : "text-[#f1d49a]"}`}>{formatCountdown(state.nextFollowAt, clock)}</p><p className="mt-2 text-xs leading-5 text-white/34">The timer paces this workflow only. It does not automate X or circumvent X limits.</p></div></Panel>
              <Panel className="overflow-hidden">
                <div className="border-b border-white/10 p-5 sm:p-6"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8ce8ff]">Queue</p><h2 className="mt-2 text-2xl font-semibold text-white">{pendingQueue.length} pending</h2></div>
                {nextEntry && nextAccount ? <div className="border-b border-white/10 bg-[#16c8ff]/[0.025] p-5 sm:p-6"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8ce8ff]">Up next</p><h3 className="mt-2 text-2xl font-semibold text-white">{accountLabel(nextAccount)}</h3><p className="mt-2 text-sm text-white/42">IAZMA {scoreAccount(nextAccount).total} · {scoreAccount(nextAccount).confidence}% confidence</p></div><a href={nextAccount.profileUrl} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center gap-2 rounded-full border border-[#16c8ff]/30 bg-[#16c8ff]/[0.06] px-4 text-sm font-medium text-[#8ce8ff] transition hover:bg-[#16c8ff]/[0.1]">Open on X <ArrowUpRight className="size-4" /></a></div><div className="mt-5 flex flex-wrap gap-3"><Button variant="glass" disabled={!ready} onClick={() => markFollowed(nextEntry, nextAccount)}><CheckCircle2 className="size-4" /> I followed this account</Button><Button variant="ghost" onClick={() => skipEntry(nextEntry, nextAccount)}>Skip</Button></div></div> : <div className="p-8 text-sm text-white/44">The queue is empty.</div>}
                <div className="max-h-[32rem] divide-y divide-white/8 overflow-auto">{pendingQueue.slice(1).map((entry, index) => { const account = state.accounts[entry.accountKey]; if (!account) return null; return <div key={entry.id} className="flex items-center justify-between gap-4 p-4 sm:px-6"><div className="min-w-0"><p className="truncate text-sm font-medium text-white/74">{index + 2}. {accountLabel(account)}</p><p className="mt-1 text-xs text-white/32">IAZMA {scoreAccount(account).total} · added {formatDate(entry.addedAt)}</p></div><a href={account.profileUrl} target="_blank" rel="noreferrer" className="text-xs font-medium text-white/40 hover:text-[#8ce8ff]">View</a></div>; })}</div>
              </Panel>
            </div>
          )}

          {tab === "campaigns" && (
            <div className="mt-6 grid gap-6 xl:grid-cols-[0.65fr_1.35fr]">
              <Panel className="p-5 sm:p-6"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#f1d49a]">Campaigns</p><h2 className="mt-2 text-2xl font-semibold text-white">Create a network target</h2><div className="mt-5 flex gap-2"><input value={campaignName} onChange={(event) => setCampaignName(event.target.value)} onKeyDown={(event) => event.key === "Enter" && createCampaign()} className="h-11 min-w-0 flex-1 rounded-xl border border-white/10 bg-black/25 px-3 text-sm text-white outline-none focus:border-[#16c8ff]/45" placeholder="Leftist developers" /><Button variant="gold" size="sm" onClick={createCampaign}><Plus className="size-4" /> Add</Button></div></Panel>
              <Panel className="overflow-hidden"><div className="border-b border-white/10 p-5 sm:p-6"><h2 className="text-2xl font-semibold text-white">Active campaigns</h2></div><div className="divide-y divide-white/8">{state.campaigns.map((campaign) => { const campaignAccounts = accounts.filter((account) => account.campaigns.includes(campaign.id)); const campaignMutuals = campaignAccounts.filter((account) => relationship(account) === "mutual").length; return <div key={campaign.id} className="grid gap-3 p-5 sm:grid-cols-[1fr_auto] sm:items-center sm:px-6"><div><p className="font-semibold text-white">{campaign.name}</p><p className="mt-1 text-sm text-white/38">Created {formatDate(campaign.createdAt)}</p></div><div className="flex gap-6 sm:text-right"><div><p className="text-[10px] uppercase tracking-[0.12em] text-white/28">Accounts</p><p className="text-lg font-semibold text-white">{campaignAccounts.length}</p></div><div><p className="text-[10px] uppercase tracking-[0.12em] text-white/28">Mutuals</p><p className="text-lg font-semibold text-[#8ce8ff]">{campaignMutuals}</p></div></div></div>; })}</div></Panel>
            </div>
          )}

          {tab === "data" && (
            <div className="mt-6 grid gap-6 xl:grid-cols-[0.65fr_1.35fr]">
              <div className="grid gap-6">
                <Panel className="p-5 sm:p-6"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8ce8ff]">Portable local database</p><h2 className="mt-2 text-2xl font-semibold text-white">Backup / restore</h2><p className="mt-3 text-sm leading-6 text-white/44">Your normalized graph lives in IndexedDB on this device. Export a JSON backup before clearing browser data or moving computers.</p><div className="mt-5 grid gap-3 sm:grid-cols-2"><Button variant="glass" onClick={exportDatabase}><Download className="size-4" /> Export backup</Button><Button variant="secondary" onClick={() => restoreInputRef.current?.click()}><Upload className="size-4" /> Restore backup</Button></div><input ref={restoreInputRef} type="file" accept="application/json,.json" className="hidden" onChange={(event) => event.target.files?.[0] && void restoreDatabase(event.target.files[0])} /></Panel>
                <Panel className="p-5 sm:p-6"><div className="flex items-center gap-2 text-sm font-semibold text-white"><Trash2 className="size-4 text-[#ff8792]" /> Destructive</div><Button variant="ghost" className="mt-4 w-full border border-[#f0001c]/20 text-[#ff9da6] hover:bg-[#f0001c]/10" onClick={clearDatabase}>Clear local database</Button></Panel>
              </div>
              <Panel className="overflow-hidden"><div className="flex items-center gap-2 border-b border-white/10 p-5 sm:p-6"><History className="size-5 text-[#8ce8ff]" /><h2 className="text-2xl font-semibold text-white">Archive snapshots</h2></div><div className="divide-y divide-white/8">{state.snapshots.map((snapshot) => <div key={snapshot.id} className="grid gap-3 p-5 sm:grid-cols-[1fr_repeat(3,auto)] sm:items-center sm:px-6"><div><p className="font-medium text-white/76">{formatDate(snapshot.at)}</p><p className="mt-1 text-xs text-white/32">{snapshot.archiveAccounts.toLocaleString()} known archive accounts</p></div><div><p className="text-[10px] uppercase tracking-[0.12em] text-white/28">Followers</p><p className="text-lg font-semibold text-white">{snapshot.followers.toLocaleString()}</p></div><div><p className="text-[10px] uppercase tracking-[0.12em] text-white/28">Following</p><p className="text-lg font-semibold text-white">{snapshot.following.toLocaleString()}</p></div><div><p className="text-[10px] uppercase tracking-[0.12em] text-white/28">Mutuals</p><p className="text-lg font-semibold text-[#8ce8ff]">{snapshot.mutuals.toLocaleString()}</p></div></div>)}{!state.snapshots.length && <div className="p-8 text-sm text-white/44">No archive snapshots yet.</div>}</div></Panel>
            </div>
          )}
        </Container>
      </Section>
    </>
  );
}
