"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

const CATEGORY_LABELS = {
  inactive: "Inactive",
  bot_spam: "Bot / spam",
  right_wing_explicit: "Explicit right-wing",
  anti_palestine: "Anti-Palestinian",
  islamophobia: "Islamophobic",
  xenophobia: "Xenophobic",
};

function fmtDate(value) {
  if (!value) return "Never";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function relativeDays(value) {
  if (!value) return "No observed activity";
  const days = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 86_400_000));
  if (days === 0) return "Active today";
  return `${days} day${days === 1 ? "" : "s"} since activity`;
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: { "content-type": "application/json", ...(options.headers ?? {}) },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
  return data;
}

function Login() {
  const [handle, setHandle] = useState("");
  const [busy, setBusy] = useState(false);
  const authFailed = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("auth") === "failed";

  function submit(event) {
    event.preventDefault();
    const clean = handle.trim().replace(/^@/, "");
    if (!clean) return;
    setBusy(true);
    window.location.href = `/api/auth/login?handle=${encodeURIComponent(clean)}`;
  }

  return (
    <main className="loginShell">
      <section className="loginCard glass">
        <div className="brandMark">IG</div>
        <p className="eyebrow">IAZMA NETWORK HYGIENE</p>
        <h1>Guard your Bluesky graph.</h1>
        <p className="lede">
          Find inactive, automated, spammy, and explicitly flagged accounts. You review the evidence; Guard handles the graph cleanup and keeps them out of IAZMA.
        </p>
        <form onSubmit={submit} className="loginForm">
          <label htmlFor="handle">Bluesky handle</label>
          <div className="loginRow">
            <input id="handle" value={handle} onChange={(e) => setHandle(e.target.value)} placeholder="you.bsky.social" autoCapitalize="none" autoCorrect="off" />
            <button className="primary" disabled={busy}>{busy ? "Opening…" : "Connect Bluesky"}</button>
          </div>
        </form>
        {authFailed && <p className="errorText">Bluesky sign-in did not complete. Try connecting again.</p>}
        <div className="privacyNote">
          <strong>Deliberately conservative.</strong> Political/content matches never auto-block. Every block requires your click and shows the public evidence that triggered the review.
        </div>
      </section>
    </main>
  );
}

function Stat({ label, value, note }) {
  return (
    <div className="stat glass">
      <span>{label}</span>
      <strong>{value ?? 0}</strong>
      <small>{note}</small>
    </div>
  );
}

function Avatar({ item }) {
  if (item.avatar) return <img className="avatar" src={item.avatar} alt="" />;
  const initials = (item.display_name || item.handle || "?").slice(0, 2).toUpperCase();
  return <div className="avatar fallback">{initials}</div>;
}

function ReviewCard({ item, onIgnore, onBlock, busy }) {
  return (
    <article className="reviewCard glass">
      <div className="cardTop">
        <Avatar item={item} />
        <div className="identity">
          <strong>{item.display_name || item.handle}</strong>
          <span>@{item.handle}</span>
        </div>
        <div className={`confidence ${item.confidence}`}>{item.confidence === "high" ? "HIGH" : "REVIEW"}</div>
      </div>
      <div className="chips">
        {(item.categories ?? []).map((cat) => <span className={`chip ${cat}`} key={cat}>{CATEGORY_LABELS[cat] || cat}</span>)}
      </div>
      <div className="metricsLine">
        <span>{relativeDays(item.last_activity_at)}</span>
        <span>{Number(item.followers_count ?? 0).toLocaleString()} followers</span>
        <span>{Number(item.follows_count ?? 0).toLocaleString()} following</span>
      </div>
      {item.description && <p className="bio">{item.description}</p>}
      <div className="evidenceList">
        {(item.evidence ?? []).map((e, idx) => (
          <div className="evidence" key={`${e.category}-${idx}`}>
            <div><strong>{e.label || CATEGORY_LABELS[e.category] || e.category}</strong><span>{e.source}</span></div>
            {e.excerpt && <p>{e.excerpt}</p>}
          </div>
        ))}
      </div>
      <div className="cardActions">
        <button className="secondary" disabled={busy} onClick={() => onIgnore(item.did)}>Keep / false positive</button>
        <button className="danger" disabled={busy} onClick={() => onBlock(item)}>
          {item.is_following ? "Unfollow + block" : "Block"}
        </button>
      </div>
    </article>
  );
}

function Settings({ settings, onSaved }) {
  const [form, setForm] = useState(settings);
  const [saving, setSaving] = useState(false);
  useEffect(() => setForm(settings), [settings]);
  if (!form) return null;

  const updateFilter = (name) => setForm((f) => ({ ...f, filters: { ...f.filters, [name]: !f.filters?.[name] } }));

  async function save() {
    setSaving(true);
    try {
      const saved = await api("/api/settings", { method: "POST", body: JSON.stringify(form) });
      setForm(saved);
      onSaved(saved);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="settingsPanel glass">
      <div className="sectionHeading"><div><p className="eyebrow">RULES</p><h2>Scanner settings</h2></div></div>
      <div className="settingsGrid">
        <label className="field"><span>Inactive after</span><div className="numberField"><input type="number" min="30" max="365" value={form.inactive_days} onChange={(e) => setForm({ ...form, inactive_days: Number(e.target.value) })} /><em>days</em></div></label>
        <label className="field"><span>Bot/spam threshold</span><div className="numberField"><input type="number" min="50" max="95" value={form.bot_threshold} onChange={(e) => setForm({ ...form, bot_threshold: Number(e.target.value) })} /><em>/100</em></div></label>
      </div>
      <label className="toggleRow"><input type="checkbox" checked={form.auto_unfollow} onChange={() => setForm({ ...form, auto_unfollow: !form.auto_unfollow })} /><span><strong>Automatically unfollow accounts that unfollow you</strong><small>Only after Guard has previously observed them following you. First-run non-followers are never touched.</small></span></label>
      <div className="filterBox">
        <h3>Evidence-based content review</h3>
        <p>These switches create a review flag from explicit profile text or high-precision public phrase matches. They never trigger an automatic block.</p>
        {[
          ["rightWing", "Explicit right-wing self-identification"],
          ["antiPalestine", "Explicit anti-Palestinian content"],
          ["islamophobia", "Islamophobic content"],
          ["xenophobia", "Xenophobic content"],
        ].map(([key, label]) => (
          <label className="miniToggle" key={key}><input type="checkbox" checked={form.filters?.[key] !== false} onChange={() => updateFilter(key)} /><span>{label}</span></label>
        ))}
      </div>
      <button className="primary" onClick={save} disabled={saving}>{saving ? "Saving…" : "Save settings"}</button>
    </section>
  );
}

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("review");
  const [error, setError] = useState("");
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState(null);
  const [busyDid, setBusyDid] = useState(null);

  const load = useCallback(async () => {
    try {
      const next = await api("/api/dashboard", { method: "GET", headers: {} });
      setData(next);
      setError("");
      return next;
    } catch (e) {
      if (/401|Unauthorized/.test(e.message)) setData({ authenticated: false });
      else setError(e.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const scanPercent = useMemo(() => {
    const s = progress || data?.scan;
    if (!s?.total) return s?.status === "complete" ? 100 : 0;
    return Math.min(100, Math.round((s.processed / s.total) * 100));
  }, [progress, data]);

  async function continueScan(scanId) {
    setScanning(true);
    setError("");
    try {
      let current;
      do {
        current = await api("/api/scan/batch", { method: "POST", body: JSON.stringify({ scanId, limit: 8 }) });
        setProgress(current);
        if (current.status !== "complete") await new Promise((resolve) => setTimeout(resolve, 180));
      } while (current.status !== "complete");
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setScanning(false);
    }
  }

  async function startScan() {
    setScanning(true);
    setProgress({ total: 0, processed: 0, flagged: 0, status: "starting" });
    setError("");
    try {
      const started = await api("/api/scan/start", { method: "POST", body: "{}" });
      setProgress({ total: started.total, processed: 0, flagged: 0, status: started.total ? "running" : "complete" });
      if (started.total) await continueScan(started.scanId);
      else await load();
    } catch (e) {
      setError(e.message);
      setScanning(false);
    }
  }

  async function ignore(did) {
    setBusyDid(did);
    try {
      await api("/api/action/ignore", { method: "POST", body: JSON.stringify({ did }) });
      await load();
    } catch (e) { setError(e.message); }
    finally { setBusyDid(null); }
  }

  async function block(item) {
    const label = item.is_following ? "unfollow and block" : "block";
    if (!window.confirm(`Really ${label} @${item.handle}? This creates a public Bluesky block record and permanently suppresses the DID from IAZMA until you restore it.`)) return;
    setBusyDid(item.did);
    try {
      await api("/api/action/block", { method: "POST", body: JSON.stringify({ did: item.did }) });
      await load();
    } catch (e) { setError(e.message); }
    finally { setBusyDid(null); }
  }

  async function restore(did) {
    setBusyDid(did);
    try {
      await api("/api/action/restore", { method: "POST", body: JSON.stringify({ did }) });
      await load();
    } catch (e) { setError(e.message); }
    finally { setBusyDid(null); }
  }

  async function logout() {
    await api("/api/auth/logout", { method: "POST", body: "{}" }).catch(() => {});
    window.location.reload();
  }

  if (loading) return <main className="loadingScreen"><div className="spinner" /><span>Loading Guard…</span></main>;
  if (!data?.authenticated) return <Login />;

  const scan = progress || data.scan;

  return (
    <main className="appShell">
      <header className="topbar glass">
        <div className="brand"><div className="brandMark small">IG</div><div><strong>IAZMA Guard</strong><span>Bluesky graph hygiene</span></div></div>
        <div className="profileMini"><Avatar item={data.user || {}} /><div><strong>@{data.user?.handle || "connected"}</strong><span>{data.user?.did?.slice(0, 22)}…</span></div><button className="ghost" onClick={logout}>Disconnect</button></div>
      </header>

      <section className="hero">
        <div><p className="eyebrow">GRAPH CONTROL</p><h1>Clean signal. No follow-back games.</h1><p>Guard scans current followers, shows evidence for anything questionable, and keeps removed DIDs out of IAZMA permanently.</p></div>
        <button className="scanButton" onClick={startScan} disabled={scanning}><span>{scanning ? "SCANNING" : "SCAN FOLLOWERS"}</span><small>{data.user?.last_scan_at ? `Last: ${fmtDate(data.user.last_scan_at)}` : "First scan builds the baseline"}</small></button>
      </section>

      {error && <div className="errorBanner">{error}</div>}
      {scan && (scanning || scan.status === "running" || scan.status === "starting") && (
        <section className="scanProgress glass">
          <div><strong>{scan.status === "starting" ? "Syncing your graph…" : `Scanning followers · ${scanPercent}%`}</strong><span>{scan.processed ?? 0} / {scan.total ?? "?"} analyzed · {scan.flagged ?? 0} flagged</span></div>
          <div className="progressTrack"><div className="progressFill" style={{ width: `${scanPercent}%` }} /></div>
          {!scanning && scan.id && <button className="secondary" onClick={() => continueScan(scan.id)}>Resume scan</button>}
        </section>
      )}

      <section className="statsGrid">
        <Stat label="Followers observed" value={data.counts?.followers} note={`Graph sync ${fmtDate(data.user?.last_graph_sync_at)}`} />
        <Stat label="Following" value={data.counts?.following} note="Current follow records" />
        <Stat label="Needs review" value={data.queue?.length} note="Never auto-blocked" />
        <Stat label="Suppressed from IAZMA" value={data.suppressions?.length} note="Stored by immutable DID" />
      </section>

      <nav className="tabs">
        {[["review", `Review ${data.queue?.length || ""}`], ["history", "Unfollowers + actions"], ["suppression", "IAZMA suppression"], ["settings", "Settings"]].map(([key, label]) => (
          <button key={key} className={tab === key ? "active" : ""} onClick={() => setTab(key)}>{label}</button>
        ))}
      </nav>

      {tab === "review" && (
        <section className="contentSection">
          <div className="sectionHeading"><div><p className="eyebrow">REVIEW QUEUE</p><h2>Evidence before action.</h2></div><span>{data.queue?.length || 0} account(s)</span></div>
          {!data.queue?.length ? <div className="empty glass"><strong>Nothing waiting.</strong><p>Run a scan to analyze current followers. Accounts you marked as false positives stay dismissed on future scans.</p></div> : (
            <div className="reviewGrid">{data.queue.map((item) => <ReviewCard key={item.did} item={item} busy={busyDid === item.did} onIgnore={ignore} onBlock={block} />)}</div>
          )}
        </section>
      )}

      {tab === "history" && (
        <section className="contentSection">
          <div className="sectionHeading"><div><p className="eyebrow">AUDIT LOG</p><h2>Every graph mutation.</h2></div><span>{data.counts?.observed_unfollowers || 0} unfollowers observed</span></div>
          <div className="table glass">
            <div className="tr head"><span>Account</span><span>Action</span><span>Reason</span><span>When</span></div>
            {(data.actions ?? []).map((a) => <div className="tr" key={a.id}><span><strong>{a.display_name || a.handle || a.target_did.slice(0, 18)}</strong>{a.handle && <small>@{a.handle}</small>}</span><span className="mono">{a.action}</span><span>{a.reason || "—"}</span><span>{fmtDate(a.created_at)}</span></div>)}
            {!data.actions?.length && <div className="emptyRow">No actions yet.</div>}
          </div>
        </section>
      )}

      {tab === "suppression" && (
        <section className="contentSection">
          <div className="sectionHeading"><div><p className="eyebrow">SHARED WITH IAZMA</p><h2>Permanent recommendation exclusions.</h2></div><span>{data.suppressions?.length || 0} active</span></div>
          <div className="table glass suppressionTable">
            <div className="tr head"><span>Account</span><span>Reason</span><span>Source</span><span></span></div>
            {(data.suppressions ?? []).map((s) => <div className="tr" key={s.did}><span><strong>{s.handle ? `@${s.handle}` : s.did.slice(0, 24)}</strong><small>{s.did}</small></span><span>{s.reason}</span><span className="mono">{s.source}</span><span><button className="secondary compact" disabled={busyDid === s.did} onClick={() => restore(s.did)}>Re-allow in IAZMA</button></span></div>)}
            {!data.suppressions?.length && <div className="emptyRow">No suppressed accounts yet.</div>}
          </div>
        </section>
      )}

      {tab === "settings" && <Settings settings={data.settings} onSaved={(saved) => setData((d) => ({ ...d, settings: saved }))} />}

      <footer><span>IAZMA Guard</span><span>Blocks are public AT Protocol records. Content flags are review signals, not political inference.</span></footer>
    </main>
  );
}
