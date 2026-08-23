"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowUpRight,
  BriefcaseBusiness,
  CheckCircle2,
  Clipboard,
  Copy,
  Download,
  ExternalLink,
  FileJson,
  FileText,
  Gauge,
  GraduationCap,
  ListChecks,
  LoaderCircle,
  Plus,
  Radar,
  Search,
  Settings2,
  ShieldCheck,
  SkipForward,
  Sparkles,
  Target,
  Trash2,
  UserRound,
  WandSparkles,
  Zap,
} from "lucide-react";
import type {
  JobCannonEducation,
  JobCannonExperience,
  JobCannonJob,
  JobCannonProfile,
  JobCannonSearchResponse,
  JobCannonSettings,
  JobCannonStatus,
} from "@/lib/job-cannon/types";
import {
  DEFAULT_SETTINGS,
  EMPTY_PROFILE,
  buildTailoredResume,
  findDuplicate,
  normalizeCompanyKey,
  normalizeProfile,
  scoreJob,
  splitLines,
  tailoredResumeText,
} from "@/lib/job-cannon/client";
import styles from "@/app/leads/leads.module.css";

const JOBS_KEY = "job-cannon.jobs.v2";
const LEGACY_JOBS_KEY = "job-cannon.jobs.v1";
const PROFILE_KEY = "job-cannon.profile.v2";
const LEGACY_PROFILE_KEY = "job-cannon.profile.v1";
const SETTINGS_KEY = "job-cannon.settings.v2";
const LEGACY_SETTINGS_KEY = "job-cannon.settings.v1";
const SOURCE_OFFSET_KEY = "job-cannon.source-offset.v1";

const STATUS_LABELS: Record<JobCannonStatus, string> = {
  new: "New",
  ready: "Ready",
  queued: "Queued",
  applying: "Applying",
  applied: "Applied",
  interview: "Interview",
  offer: "Offer",
  rejected: "Rejected",
  skipped: "Skipped",
};

function currency(value?: number) {
  if (!value) return "";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}

function relativeTime(value?: string) {
  if (!value) return "Date unknown";
  const diff = Date.now() - Date.parse(value);
  if (!Number.isFinite(diff)) return "Date unknown";
  const hours = Math.max(0, Math.floor(diff / 3_600_000));
  if (hours < 1) return "<1h old";
  if (hours < 24) return `${hours}h old`;
  return `${Math.floor(hours / 24)}d old`;
}

function Badge({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "good" | "hot" | "warn" }) {
  const cls = tone === "good"
    ? "border-emerald-300/25 bg-emerald-300/[.07] text-emerald-200"
    : tone === "hot"
      ? "border-[#ef2a26]/35 bg-[#ef2a26]/10 text-[#ff8f84]"
      : tone === "warn"
        ? "border-[#d7a45f]/35 bg-[#d7a45f]/10 text-[#efc37c]"
        : "border-white/10 bg-white/[.03] text-white/55";
  return <span className={`inline-flex items-center border px-2 py-1 text-[9px] font-bold uppercase tracking-[.12em] ${cls}`}>{children}</span>;
}

function Metric({ label, value, note }: { label: string; value: string | number; note: string }) {
  return (
    <div className={`${styles.cut} border border-white/10 bg-[#090807]/90 p-4`}>
      <p className="text-[9px] font-bold uppercase tracking-[.18em] text-white/30">{label}</p>
      <p className="mt-2 text-3xl font-black tracking-[-.05em] text-[#f5efe0]">{value}</p>
      <p className="mt-2 text-xs leading-5 text-white/38">{note}</p>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", placeholder }: { label: string; value: string; onChange: (value: string) => void; type?: string; placeholder?: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[.12em] text-white/38">{label}</span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-11 w-full border border-white/10 bg-black/35 px-3 py-2 text-sm text-white outline-none transition placeholder:text-white/20 focus:border-sky-300/40"
      />
    </label>
  );
}

function TextArea({ label, value, onChange, rows = 4, placeholder }: { label: string; value: string; onChange: (value: string) => void; rows?: number; placeholder?: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[.12em] text-white/38">{label}</span>
      <textarea rows={rows} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="w-full border border-white/10 bg-black/35 px-3 py-2 text-sm leading-6 text-white outline-none placeholder:text-white/20 focus:border-sky-300/40" />
    </label>
  );
}

function newExperience(): JobCannonExperience {
  return { id: crypto.randomUUID(), company: "", title: "", location: "", startDate: "", endDate: "", current: false, bullets: [], technologies: [] };
}

function newEducation(): JobCannonEducation {
  return { id: crypto.randomUUID(), school: "", degree: "", field: "", location: "", startDate: "", endDate: "" };
}

export function JobCannonDashboard() {
  const [view, setView] = useState<"search" | "queue" | "profile" | "extension">("search");
  const [settings, setSettings] = useState<JobCannonSettings>(DEFAULT_SETTINGS);
  const [profile, setProfile] = useState<JobCannonProfile>(EMPTY_PROFILE);
  const [jobs, setJobs] = useState<JobCannonJob[]>([]);
  const [sourceOffset, setSourceOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const [answerBankText, setAnswerBankText] = useState("");

  useEffect(() => {
    try {
      const storedJobs = localStorage.getItem(JOBS_KEY) || localStorage.getItem(LEGACY_JOBS_KEY);
      const storedProfile = localStorage.getItem(PROFILE_KEY) || localStorage.getItem(LEGACY_PROFILE_KEY);
      const storedSettings = localStorage.getItem(SETTINGS_KEY) || localStorage.getItem(LEGACY_SETTINGS_KEY);
      const storedOffset = localStorage.getItem(SOURCE_OFFSET_KEY);
      if (storedJobs) setJobs(JSON.parse(storedJobs) as JobCannonJob[]);
      if (storedProfile) {
        const next = normalizeProfile(JSON.parse(storedProfile) as Partial<JobCannonProfile>);
        setProfile(next);
        setAnswerBankText(next.answerBank.map((item) => `${item.pattern} => ${item.answer}`).join("\n"));
      }
      if (storedSettings) setSettings({ ...DEFAULT_SETTINGS, ...(JSON.parse(storedSettings) as Partial<JobCannonSettings>) });
      if (storedOffset) setSourceOffset(Number(storedOffset) || 0);
    } catch {
      setMessage("One saved Job Cannon setting could not be read. Defaults were loaded instead.");
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(JOBS_KEY, JSON.stringify(jobs));
  }, [jobs, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  }, [profile, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }, [settings, hydrated]);

  const scoredJobs = useMemo(() => jobs.map((job) => ({ job, ...scoreJob(job, settings, profile) })), [jobs, settings, profile]);
  const activeResults = scoredJobs
    .filter(({ job }) => ["new", "ready"].includes(job.status || "new") && !job.duplicateOf)
    .sort((a, b) => b.score - a.score || Date.parse(b.job.postedAt || b.job.discoveredAt) - Date.parse(a.job.postedAt || a.job.discoveredAt));
  const readyQueue = scoredJobs
    .filter(({ job }) => ["ready", "queued"].includes(job.status || "new") && !job.duplicateOf)
    .sort((a, b) => b.score - a.score);
  const pipeline = scoredJobs
    .filter(({ job }) => ["applying", "applied", "interview", "offer", "rejected"].includes(job.status || "new"))
    .sort((a, b) => Date.parse(b.job.lastOpenedAt || b.job.discoveredAt) - Date.parse(a.job.lastOpenedAt || a.job.discoveredAt));
  const appliedCount = jobs.filter((job) => ["applied", "interview", "offer"].includes(job.status || "new")).length;
  const strongCount = activeResults.filter((item) => item.score >= settings.autoReadyThreshold).length;
  const duplicateCount = jobs.filter((job) => Boolean(job.duplicateOf)).length;
  const profileFields = [profile.firstName, profile.lastName, profile.email, profile.phone, profile.city, profile.state, profile.linkedin, profile.workAuthorized, profile.needsSponsorship];
  const profileCompleteness = Math.round(((profileFields.filter(Boolean).length + Math.min(2, profile.experience.length) + Math.min(1, profile.education.length)) / (profileFields.length + 3)) * 100);

  function updateJob(id: string, patch: Partial<JobCannonJob>) {
    setJobs((current) => current.map((job) => job.id === id ? { ...job, ...patch } : job));
  }

  async function runSearch() {
    setLoading(true);
    setMessage("Searching ATS sources, checking live job pages, scoring fits, and suppressing duplicates…");
    try {
      const response = await fetch("/api/job-cannon/search", {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roles: splitLines(settings.roles),
          location: settings.location,
          maxAgeHours: settings.maxAgeHours,
          sourceOffset,
          sourceCount: 4,
        }),
      });
      const body = await response.json() as JobCannonSearchResponse;
      if (!response.ok || !body.ok) throw new Error(body.error || "Job search failed.");
      setSourceOffset(body.nextSourceOffset || 0);
      localStorage.setItem(SOURCE_OFFSET_KEY, String(body.nextSourceOffset || 0));
      let added = 0;
      let autoReady = 0;
      let duplicates = 0;
      setJobs((current) => {
        const next = [...current];
        const byId = new Map(current.map((job) => [job.id, job]));
        for (const rawJob of body.jobs || []) {
          const existing = byId.get(rawJob.id);
          if (existing) {
            const index = next.findIndex((job) => job.id === existing.id);
            if (index >= 0) next[index] = { ...rawJob, ...existing, description: rawJob.description || existing.description };
            continue;
          }
          const candidate: JobCannonJob = { ...rawJob, companyKey: normalizeCompanyKey(rawJob.company), status: "new" };
          const duplicate = findDuplicate(candidate, next, settings.duplicateWindowDays);
          if (duplicate) {
            candidate.duplicateOf = duplicate.id;
            candidate.status = "skipped";
            duplicates += 1;
          } else {
            const scored = scoreJob(candidate, settings, profile);
            if (scored.score >= settings.autoReadyThreshold && !scored.risks.some((risk) => risk.startsWith("Reject term:"))) {
              candidate.status = "ready";
              autoReady += 1;
            }
          }
          next.push(candidate);
          byId.set(candidate.id, candidate);
          added += 1;
        }
        return next;
      });
      setMessage(`Scan complete · ${body.sources.join(", ")} · ${body.checked} live pages checked · ${added} added · ${autoReady} auto-ready · ${duplicates} duplicate${duplicates === 1 ? "" : "s"} suppressed.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Job search failed.");
    } finally {
      setLoading(false);
    }
  }

  function readyStrongMatches() {
    let changed = 0;
    setJobs((current) => current.map((job) => {
      if ((job.status || "new") !== "new" || job.duplicateOf) return job;
      const scored = scoreJob(job, settings, profile);
      if (scored.score < settings.autoReadyThreshold || scored.risks.some((risk) => risk.startsWith("Reject term:"))) return job;
      changed += 1;
      return { ...job, status: "ready" };
    }));
    setMessage(`${changed} strong match${changed === 1 ? "" : "es"} moved to Ready to Apply.`);
  }

  function openApplication(job: JobCannonJob) {
    updateJob(job.id, { status: "applying", lastOpenedAt: new Date().toISOString() });
    window.open(job.url, "_blank", "noopener,noreferrer");
  }

  function openBatch(limit = 5) {
    const batch = readyQueue.slice(0, limit);
    if (!batch.length) {
      setMessage("Nothing is Ready to Apply yet.");
      return;
    }
    const now = new Date().toISOString();
    setJobs((current) => current.map((job) => batch.some((item) => item.job.id === job.id) ? { ...job, status: "applying", lastOpenedAt: now } : job));
    for (const item of batch) window.open(item.job.url, "_blank", "noopener,noreferrer");
    setMessage(`Opened ${batch.length} application${batch.length === 1 ? "" : "s"}. Browser popup settings can limit multi-tab batches.`);
  }

  function tailorJob(job: JobCannonJob) {
    if (!profile.experience.length) {
      setMessage("Add structured work history in Profile before tailoring a resume.");
      setView("profile");
      return;
    }
    const tailoredResume = buildTailoredResume(job, profile);
    updateJob(job.id, { tailoredResume });
    setMessage(`Tailored resume reordered from your stored facts for ${job.title}. No new claims were generated.`);
  }

  async function copyTailored(job: JobCannonJob) {
    const tailored = job.tailoredResume || buildTailoredResume(job, profile);
    if (!job.tailoredResume) updateJob(job.id, { tailoredResume: tailored });
    await navigator.clipboard.writeText(tailoredResumeText(job, profile, tailored));
    setMessage("Tailored resume text copied.");
  }

  function downloadTailored(job: JobCannonJob) {
    const tailored = job.tailoredResume || buildTailoredResume(job, profile);
    if (!job.tailoredResume) updateJob(job.id, { tailoredResume: tailored });
    const blob = new Blob([tailoredResumeText(job, profile, tailored)], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${job.company}-${job.title}-job-cannon.txt`.replace(/[^a-z0-9._-]+/gi, "-").replace(/-+/g, "-");
    anchor.click();
    URL.revokeObjectURL(url);
    setMessage("Tailored resume text downloaded.");
  }

  function updateAnswerBank(raw: string) {
    setAnswerBankText(raw);
    const previousByPattern = new Map(profile.answerBank.map((item) => [item.pattern.toLowerCase(), item]));
    const answerBank = raw.split("\n").map((line) => {
      const index = line.indexOf("=>");
      if (index < 1) return null;
      const pattern = line.slice(0, index).trim();
      const answer = line.slice(index + 2).trim();
      if (!pattern || !answer) return null;
      const previous = previousByPattern.get(pattern.toLowerCase());
      return { pattern, answer, source: previous?.source || "manual" as const, lastUsedAt: previous?.lastUsedAt, uses: previous?.uses || 0 };
    }).filter((item): item is NonNullable<typeof item> => Boolean(item));
    setProfile((current) => ({ ...current, answerBank }));
  }

  async function copyProfile() {
    await navigator.clipboard.writeText(JSON.stringify(profile, null, 2));
    setMessage("Extension profile JSON copied.");
  }

  function downloadProfile() {
    const blob = new Blob([JSON.stringify(profile, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "job-cannon-profile.json";
    anchor.click();
    URL.revokeObjectURL(url);
    setMessage("Profile JSON downloaded. Import it from the extension options page.");
  }

  function updateExperience(id: string, patch: Partial<JobCannonExperience>) {
    setProfile((current) => ({ ...current, experience: current.experience.map((item) => item.id === id ? { ...item, ...patch } : item) }));
  }

  function updateEducation(id: string, patch: Partial<JobCannonEducation>) {
    setProfile((current) => ({ ...current, education: current.education.map((item) => item.id === id ? { ...item, ...patch } : item) }));
  }

  return (
    <div className={`${styles.shell} min-h-screen text-[#f4efe3]`}>
      <div className={styles.stars} aria-hidden />
      <div className="relative z-10 mx-auto max-w-[1920px] px-3 py-3 sm:px-5 sm:py-5 lg:px-7">
        <header className={`${styles.cut} border border-white/10 bg-[#080706]/95 p-5 sm:p-7`}>
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex flex-wrap gap-2">
                <Badge tone="hot"><Radar className="mr-1.5 size-3" /> ATS-first discovery</Badge>
                <Badge tone="good"><ShieldCheck className="mr-1.5 size-3" /> Human final submit</Badge>
                <Badge><WandSparkles className="mr-1.5 size-3" /> ATS adapters + learning</Badge>
              </div>
              <h1 className="mt-3 text-[clamp(2.4rem,8vw,5.4rem)] font-black uppercase leading-[.86] tracking-[-.07em]">JOB <span className="text-[#ff6f65]">CANNON</span> <span className="text-[.28em] tracking-[.08em] text-white/30">V2</span></h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-white/48 sm:text-base">Discover company-site roles, suppress duplicate applications, auto-ready the best fits, tailor a factual resume locally, and use ATS-specific browser autofill. Final submission remains yours.</p>
            </div>
            <button onClick={() => void runSearch()} disabled={loading} className="inline-flex min-h-12 items-center justify-center gap-2 border border-[#ef2a26]/40 bg-[#ef2a26]/12 px-5 py-3 text-xs font-black uppercase tracking-[.12em] text-[#ff9187] transition hover:bg-[#ef2a26]/18 disabled:opacity-50">
              {loading ? <LoaderCircle className="size-4 animate-spin" /> : <Radar className="size-4" />}{loading ? "Scanning" : "Scan next ATS sources"}
            </button>
          </div>
          {message ? <p className="mt-4 border border-white/10 bg-white/[.025] px-4 py-3 text-xs leading-5 text-white/58">{message}</p> : null}
        </header>

        <section className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <Metric label="Discovered" value={jobs.length} note="Stored only in this browser" />
          <Metric label="Ready to apply" value={readyQueue.length} note={`Auto-ready score ≥${settings.autoReadyThreshold}`} />
          <Metric label="Strong unqueued" value={strongCount} note="High-fit new results" />
          <Metric label="Applied" value={appliedCount} note="Applied + interview + offer" />
          <Metric label="Duplicates" value={duplicateCount} note={`Suppressed within ${settings.duplicateWindowDays} days`} />
        </section>

        <nav className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {([[
            "search", Search, "Search"], ["queue", ListChecks, "Ready / Queue"], ["profile", UserRound, "Profile"], ["extension", Sparkles, "Extension"],
          ] as const).map(([key, Icon, label]) => (
            <button key={key} onClick={() => setView(key)} className={`inline-flex min-h-11 items-center justify-center gap-2 border px-3 py-2 text-xs font-bold uppercase tracking-[.1em] ${view === key ? "border-sky-300/35 bg-sky-300/[.08] text-sky-200" : "border-white/10 bg-black/30 text-white/42"}`}><Icon className="size-4" /> {label}</button>
          ))}
        </nav>

        {view === "search" ? (
          <div className="mt-3 grid gap-3 xl:grid-cols-[360px_minmax(0,1fr)]">
            <aside className={`${styles.cut} self-start border border-white/10 bg-[#080706]/94 p-4 sm:p-5 xl:sticky xl:top-3`}>
              <div className="flex items-center gap-2"><Settings2 className="size-4 text-sky-200" /><h2 className="text-sm font-black uppercase tracking-[.12em]">Search rules</h2></div>
              <div className="mt-4 space-y-4">
                <TextArea label="Target roles · one per line" value={settings.roles} onChange={(roles) => setSettings((current) => ({ ...current, roles }))} rows={8} />
                <Field label="Location" value={settings.location} onChange={(location) => setSettings((current) => ({ ...current, location }))} />
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Minimum salary" value={String(settings.minSalary || "")} type="number" onChange={(value) => setSettings((current) => ({ ...current, minSalary: Number(value) || 0 }))} />
                  <Field label="Max age · hours" value={String(settings.maxAgeHours || "")} type="number" onChange={(value) => setSettings((current) => ({ ...current, maxAgeHours: Math.max(6, Number(value) || 72) }))} />
                  <Field label="Auto-ready score" value={String(settings.autoReadyThreshold || "")} type="number" onChange={(value) => setSettings((current) => ({ ...current, autoReadyThreshold: Math.max(50, Math.min(100, Number(value) || 82)) }))} />
                  <Field label="Duplicate window · days" value={String(settings.duplicateWindowDays || "")} type="number" onChange={(value) => setSettings((current) => ({ ...current, duplicateWindowDays: Math.max(1, Number(value) || 45) }))} />
                </div>
                <label className="flex items-center gap-3 border border-white/10 bg-white/[.025] p-3 text-xs text-white/62"><input type="checkbox" checked={settings.remoteOnly} onChange={(event) => setSettings((current) => ({ ...current, remoteOnly: event.target.checked }))} />Penalize roles that are not clearly remote</label>
                <TextArea label="Hard reject terms" value={settings.rejectTerms} onChange={(rejectTerms) => setSettings((current) => ({ ...current, rejectTerms }))} rows={4} />
                <button onClick={readyStrongMatches} className="inline-flex min-h-11 w-full items-center justify-center gap-2 border border-emerald-300/25 bg-emerald-300/[.06] px-3 text-xs font-bold text-emerald-200"><Zap className="size-4" /> Ready all strong matches</button>
              </div>
            </aside>

            <main className="space-y-3">
              {activeResults.length ? activeResults.map(({ job, score, reasons, risks }) => (
                <article key={job.id} className={`${styles.cut} border border-white/10 bg-[#080706]/94 p-4 sm:p-5`}>
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2"><Badge tone={score >= 85 ? "hot" : score >= 75 ? "good" : "warn"}>{score}% fit</Badge><Badge>{job.provider}</Badge><Badge>{relativeTime(job.postedAt)}</Badge>{job.status === "ready" ? <Badge tone="good">Ready</Badge> : null}{job.employmentType ? <Badge>{job.employmentType}</Badge> : null}</div>
                      <h2 className="mt-3 text-xl font-black leading-tight text-[#f5efe0] sm:text-2xl">{job.title}</h2>
                      <p className="mt-1 text-sm font-semibold text-sky-200/80">{job.company}</p><p className="mt-1 text-xs text-white/42">{job.location}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button onClick={() => updateJob(job.id, { status: "ready" })} className="inline-flex min-h-10 items-center gap-2 border border-emerald-300/30 bg-emerald-300/[.07] px-3 py-2 text-xs font-bold text-emerald-200"><Target className="size-4" /> Ready</button>
                      <button onClick={() => tailorJob(job)} className="inline-flex min-h-10 items-center gap-2 border border-[#d7a45f]/30 bg-[#d7a45f]/[.06] px-3 py-2 text-xs font-bold text-[#efc37c]"><FileText className="size-4" /> Tailor</button>
                      <button onClick={() => openApplication(job)} className="inline-flex min-h-10 items-center gap-2 border border-sky-300/30 bg-sky-300/[.07] px-3 py-2 text-xs font-bold text-sky-200"><ArrowUpRight className="size-4" /> Open</button>
                      <button onClick={() => updateJob(job.id, { status: "skipped" })} className="inline-flex min-h-10 items-center gap-2 border border-white/10 bg-white/[.025] px-3 py-2 text-xs font-bold text-white/45"><SkipForward className="size-4" /> Skip</button>
                    </div>
                  </div>
                  {job.salaryMin || job.salaryMax ? <p className="mt-3 text-sm font-bold text-emerald-200/80">{currency(job.salaryMin)}{job.salaryMax && job.salaryMax !== job.salaryMin ? ` – ${currency(job.salaryMax)}` : ""}{job.salaryUnit ? ` / ${job.salaryUnit}` : ""}</p> : null}
                  <p className="mt-3 line-clamp-4 text-sm leading-6 text-white/48">{job.description || job.sourceSnippet || "No description extracted."}</p>
                  <div className="mt-4 grid gap-3 md:grid-cols-2"><div className="border border-emerald-300/12 bg-emerald-300/[.035] p-3"><p className="text-[9px] font-bold uppercase tracking-[.14em] text-emerald-200/60">Why it scored</p><p className="mt-2 text-xs leading-5 text-white/48">{reasons.join(" · ") || "No strong positive signal yet."}</p></div><div className="border border-[#d7a45f]/14 bg-[#d7a45f]/[.035] p-3"><p className="text-[9px] font-bold uppercase tracking-[.14em] text-[#efc37c]/65">Watch</p><p className="mt-2 text-xs leading-5 text-white/48">{risks.join(" · ") || "No obvious filter conflict."}</p></div></div>
                  {job.tailoredResume ? <div className="mt-3 border border-sky-300/15 bg-sky-300/[.035] p-3"><p className="text-[9px] font-bold uppercase tracking-[.14em] text-sky-200/65">Tailored locally</p><p className="mt-2 text-xs leading-5 text-white/48">Keywords: {job.tailoredResume.matchedKeywords.join(" · ")}</p><div className="mt-3 flex gap-2"><button onClick={() => void copyTailored(job)} className="inline-flex min-h-9 items-center gap-2 border border-white/10 px-3 text-xs text-white/60"><Copy className="size-3.5" /> Copy</button><button onClick={() => downloadTailored(job)} className="inline-flex min-h-9 items-center gap-2 border border-white/10 px-3 text-xs text-white/60"><Download className="size-3.5" /> Download</button></div></div> : null}
                </article>
              )) : <div className={`${styles.cut} border border-white/10 bg-[#080706]/94 p-8 text-center`}><Radar className="mx-auto size-8 text-white/20" /><h2 className="mt-3 text-lg font-black">No active results yet</h2><p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-white/42">Run a scan. Job Cannon rotates across Greenhouse, Lever, Ashby, Workday, SmartRecruiters, and Jobvite four sources at a time.</p></div>}
            </main>
          </div>
        ) : null}

        {view === "queue" ? (
          <div className="mt-3 space-y-3">
            <section className={`${styles.cut} border border-emerald-300/15 bg-emerald-300/[.035] p-4 sm:p-5`}>
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"><div><div className="flex items-center gap-2"><ListChecks className="size-5 text-emerald-200" /><h2 className="text-lg font-black uppercase tracking-[.08em]">Ready to Apply</h2></div><p className="mt-2 text-sm text-white/45">High-fit, de-duplicated applications waiting for review/fill.</p></div><div className="flex flex-wrap gap-2"><button onClick={() => openBatch(1)} className="inline-flex min-h-11 items-center gap-2 border border-sky-300/30 bg-sky-300/[.07] px-4 text-xs font-bold text-sky-200"><ExternalLink className="size-4" /> Open next</button><button onClick={() => openBatch(5)} className="inline-flex min-h-11 items-center gap-2 border border-[#ef2a26]/30 bg-[#ef2a26]/[.07] px-4 text-xs font-bold text-[#ff8f84]"><Zap className="size-4" /> Open next 5</button></div></div>
            </section>

            {readyQueue.length ? readyQueue.map(({ job, score }) => (
              <article key={job.id} className={`${styles.cut} border border-white/10 bg-[#080706]/94 p-4 sm:p-5`}>
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center"><div><div className="flex flex-wrap gap-2"><Badge tone={score >= 80 ? "good" : "warn"}>{score}% fit</Badge><Badge tone="good">{STATUS_LABELS[job.status || "new"]}</Badge><Badge>{job.provider}</Badge>{job.tailoredResume ? <Badge>Resume tailored</Badge> : null}</div><h2 className="mt-3 text-xl font-black">{job.title}</h2><p className="mt-1 text-sm text-sky-200/75">{job.company} · {job.location}</p></div><div className="flex flex-wrap gap-2"><button onClick={() => tailorJob(job)} className="inline-flex min-h-10 items-center gap-2 border border-[#d7a45f]/30 bg-[#d7a45f]/[.06] px-3 py-2 text-xs font-bold text-[#efc37c]"><FileText className="size-4" /> Tailor</button>{job.tailoredResume ? <button onClick={() => void copyTailored(job)} className="inline-flex min-h-10 items-center gap-2 border border-white/10 px-3 py-2 text-xs font-bold text-white/55"><Copy className="size-4" /> Copy resume</button> : null}<button onClick={() => openApplication(job)} className="inline-flex min-h-10 items-center gap-2 border border-sky-300/30 bg-sky-300/[.07] px-3 py-2 text-xs font-bold text-sky-200"><ExternalLink className="size-4" /> Open + fill</button><select value={job.status || "new"} onChange={(event) => updateJob(job.id, { status: event.target.value as JobCannonStatus })} className="min-h-10 border border-white/10 bg-black/50 px-3 text-xs text-white/70">{Object.entries(STATUS_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></div></div>
              </article>
            )) : <div className={`${styles.cut} border border-white/10 bg-[#080706]/94 p-8 text-center text-sm text-white/45`}>No jobs are Ready to Apply. Scan or move a strong result to Ready.</div>}

            {pipeline.length ? <><h2 className="pt-3 text-sm font-black uppercase tracking-[.12em] text-white/45">Application pipeline</h2>{pipeline.map(({ job, score }) => <article key={job.id} className={`${styles.cut} border border-white/10 bg-[#080706]/94 p-4 sm:p-5`}><div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center"><div><div className="flex flex-wrap gap-2"><Badge tone={score >= 80 ? "good" : "warn"}>{score}% fit</Badge><Badge>{STATUS_LABELS[job.status || "new"]}</Badge><Badge>{job.provider}</Badge></div><h2 className="mt-3 text-xl font-black">{job.title}</h2><p className="mt-1 text-sm text-sky-200/75">{job.company} · {job.location}</p></div><div className="flex flex-wrap gap-2"><button onClick={() => openApplication(job)} className="inline-flex min-h-10 items-center gap-2 border border-sky-300/30 bg-sky-300/[.07] px-3 py-2 text-xs font-bold text-sky-200"><ExternalLink className="size-4" /> Reopen</button><button onClick={() => updateJob(job.id, { status: "applied" })} className="inline-flex min-h-10 items-center gap-2 border border-emerald-300/30 bg-emerald-300/[.07] px-3 py-2 text-xs font-bold text-emerald-200"><CheckCircle2 className="size-4" /> Applied</button><select value={job.status || "new"} onChange={(event) => updateJob(job.id, { status: event.target.value as JobCannonStatus })} className="min-h-10 border border-white/10 bg-black/50 px-3 text-xs text-white/70">{Object.entries(STATUS_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></div></div></article>)}</> : null}
          </div>
        ) : null}

        {view === "profile" ? (
          <section className="mt-3 grid gap-3 xl:grid-cols-[minmax(0,1fr)_340px]">
            <div className="space-y-3">
              <div className={`${styles.cut} border border-white/10 bg-[#080706]/94 p-4 sm:p-6`}>
                <div className="flex items-center justify-between gap-3"><div><h2 className="text-lg font-black uppercase tracking-[.08em]">Autofill profile</h2><p className="mt-1 text-xs text-white/38">Saved locally in this browser. Nothing here is written to the repo.</p></div><Badge tone={profileCompleteness >= 75 ? "good" : "warn"}>{profileCompleteness}% complete</Badge></div>
                <div className="mt-5 grid gap-4 sm:grid-cols-2"><Field label="First name" value={profile.firstName} onChange={(firstName) => setProfile((p) => ({ ...p, firstName }))} /><Field label="Last name" value={profile.lastName} onChange={(lastName) => setProfile((p) => ({ ...p, lastName }))} /><Field label="Email" type="email" value={profile.email} onChange={(email) => setProfile((p) => ({ ...p, email }))} /><Field label="Phone" value={profile.phone} onChange={(phone) => setProfile((p) => ({ ...p, phone }))} /><Field label="Address" value={profile.address1} onChange={(address1) => setProfile((p) => ({ ...p, address1 }))} /><Field label="City" value={profile.city} onChange={(city) => setProfile((p) => ({ ...p, city }))} /><Field label="State" value={profile.state} onChange={(state) => setProfile((p) => ({ ...p, state }))} /><Field label="Postal code" value={profile.postalCode} onChange={(postalCode) => setProfile((p) => ({ ...p, postalCode }))} /><Field label="Country" value={profile.country} onChange={(country) => setProfile((p) => ({ ...p, country }))} /><Field label="LinkedIn" value={profile.linkedin} onChange={(linkedin) => setProfile((p) => ({ ...p, linkedin }))} /><Field label="Portfolio / website" value={profile.portfolio} onChange={(portfolio) => setProfile((p) => ({ ...p, portfolio }))} /><Field label="GitHub" value={profile.github} onChange={(github) => setProfile((p) => ({ ...p, github }))} /><Field label="Salary expectation" value={profile.salaryExpectation} onChange={(salaryExpectation) => setProfile((p) => ({ ...p, salaryExpectation }))} placeholder="e.g. 110000" /><Field label="How did you hear about us?" value={profile.sourceAnswer} onChange={(sourceAnswer) => setProfile((p) => ({ ...p, sourceAnswer }))} /></div>
                <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Field label="Work authorized?" value={profile.workAuthorized} onChange={(workAuthorized) => setProfile((p) => ({ ...p, workAuthorized }))} placeholder="Yes / No" /><Field label="Need sponsorship?" value={profile.needsSponsorship} onChange={(needsSponsorship) => setProfile((p) => ({ ...p, needsSponsorship }))} placeholder="Yes / No" /><Field label="Relocate?" value={profile.willingToRelocate} onChange={(willingToRelocate) => setProfile((p) => ({ ...p, willingToRelocate }))} placeholder="Yes / No" /><Field label="Travel?" value={profile.willingToTravel} onChange={(willingToTravel) => setProfile((p) => ({ ...p, willingToTravel }))} placeholder="Yes / No" /></div>
              </div>

              <div className={`${styles.cut} border border-white/10 bg-[#080706]/94 p-4 sm:p-6`}>
                <div className="flex items-center gap-2"><FileText className="size-5 text-[#efc37c]" /><h2 className="text-lg font-black uppercase tracking-[.08em]">Locked factual master resume</h2></div><p className="mt-2 text-xs leading-5 text-white/38">Tailoring only reorders and selects these facts. It never fabricates a bullet.</p>
                <div className="mt-4 grid gap-4"><Field label="Professional headline" value={profile.headline} onChange={(headline) => setProfile((p) => ({ ...p, headline }))} /><TextArea label="Master summary" value={profile.masterSummary} onChange={(masterSummary) => setProfile((p) => ({ ...p, masterSummary }))} rows={4} /><TextArea label="Skills used for scoring and tailoring" value={profile.skills} onChange={(skills) => setProfile((p) => ({ ...p, skills }))} rows={4} /><TextArea label="Certifications · one per line" value={profile.certifications.join("\n")} onChange={(value) => setProfile((p) => ({ ...p, certifications: value.split("\n").map((item) => item.trim()).filter(Boolean) }))} rows={3} /></div>
              </div>

              <div className={`${styles.cut} border border-white/10 bg-[#080706]/94 p-4 sm:p-6`}>
                <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2"><BriefcaseBusiness className="size-5 text-sky-200" /><h2 className="text-lg font-black uppercase tracking-[.08em]">Work history</h2></div><button onClick={() => setProfile((p) => ({ ...p, experience: [...p.experience, newExperience()] }))} className="inline-flex min-h-10 items-center gap-2 border border-sky-300/25 bg-sky-300/[.05] px-3 text-xs font-bold text-sky-200"><Plus className="size-4" /> Add role</button></div>
                <div className="mt-4 space-y-4">{profile.experience.map((item, index) => <div key={item.id} className="border border-white/10 bg-black/25 p-4"><div className="flex items-center justify-between gap-3"><p className="text-xs font-black uppercase tracking-[.12em] text-white/45">Role {index + 1}</p><button onClick={() => setProfile((p) => ({ ...p, experience: p.experience.filter((entry) => entry.id !== item.id) }))} className="inline-flex min-h-9 items-center gap-2 border border-white/10 px-3 text-xs text-white/45"><Trash2 className="size-3.5" /> Remove</button></div><div className="mt-3 grid gap-3 sm:grid-cols-2"><Field label="Company" value={item.company} onChange={(company) => updateExperience(item.id, { company })} /><Field label="Title" value={item.title} onChange={(title) => updateExperience(item.id, { title })} /><Field label="Location" value={item.location} onChange={(location) => updateExperience(item.id, { location })} /><div className="grid grid-cols-2 gap-2"><Field label="Start" type="month" value={item.startDate} onChange={(startDate) => updateExperience(item.id, { startDate })} /><Field label="End" type="month" value={item.endDate} onChange={(endDate) => updateExperience(item.id, { endDate })} /></div></div><label className="mt-3 flex items-center gap-2 text-xs text-white/55"><input type="checkbox" checked={item.current} onChange={(event) => updateExperience(item.id, { current: event.target.checked, endDate: event.target.checked ? "" : item.endDate })} />Current role</label><div className="mt-3 grid gap-3 lg:grid-cols-2"><TextArea label="Factual bullets · one per line" value={item.bullets.join("\n")} onChange={(value) => updateExperience(item.id, { bullets: value.split("\n").map((entry) => entry.trim()).filter(Boolean) })} rows={6} /><TextArea label="Technologies · comma or line separated" value={item.technologies.join(", ")} onChange={(value) => updateExperience(item.id, { technologies: splitLines(value) })} rows={6} /></div></div>)}{!profile.experience.length ? <p className="text-sm text-white/35">Add your roles once. Workday and other ATS adapters can then reuse them.</p> : null}</div>
              </div>

              <div className={`${styles.cut} border border-white/10 bg-[#080706]/94 p-4 sm:p-6`}>
                <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2"><GraduationCap className="size-5 text-emerald-200" /><h2 className="text-lg font-black uppercase tracking-[.08em]">Education</h2></div><button onClick={() => setProfile((p) => ({ ...p, education: [...p.education, newEducation()] }))} className="inline-flex min-h-10 items-center gap-2 border border-emerald-300/25 bg-emerald-300/[.05] px-3 text-xs font-bold text-emerald-200"><Plus className="size-4" /> Add education</button></div>
                <div className="mt-4 space-y-4">{profile.education.map((item, index) => <div key={item.id} className="border border-white/10 bg-black/25 p-4"><div className="flex items-center justify-between gap-3"><p className="text-xs font-black uppercase tracking-[.12em] text-white/45">Education {index + 1}</p><button onClick={() => setProfile((p) => ({ ...p, education: p.education.filter((entry) => entry.id !== item.id) }))} className="inline-flex min-h-9 items-center gap-2 border border-white/10 px-3 text-xs text-white/45"><Trash2 className="size-3.5" /> Remove</button></div><div className="mt-3 grid gap-3 sm:grid-cols-2"><Field label="School" value={item.school} onChange={(school) => updateEducation(item.id, { school })} /><Field label="Degree" value={item.degree} onChange={(degree) => updateEducation(item.id, { degree })} /><Field label="Field of study" value={item.field} onChange={(field) => updateEducation(item.id, { field })} /><Field label="Location" value={item.location} onChange={(location) => updateEducation(item.id, { location })} /><Field label="Start" type="month" value={item.startDate} onChange={(startDate) => updateEducation(item.id, { startDate })} /><Field label="End" type="month" value={item.endDate} onChange={(endDate) => updateEducation(item.id, { endDate })} /></div></div>)}</div>
              </div>

              <div className={`${styles.cut} border border-white/10 bg-[#080706]/94 p-4 sm:p-6`}><h2 className="text-lg font-black uppercase tracking-[.08em]">Reusable answer bank</h2><p className="mt-2 text-xs text-white/38">The extension can explicitly learn safe answers you manually enter and adds them to this same format.</p><div className="mt-4"><TextArea label="Question pattern => answer" value={answerBankText} onChange={updateAnswerBank} rows={8} placeholder={'why are you interested => I am interested because...\npreferred name => ...'} /></div></div>
            </div>

            <aside className={`${styles.cut} self-start border border-white/10 bg-[#080706]/94 p-5 xl:sticky xl:top-3`}><Gauge className="size-5 text-sky-200" /><h3 className="mt-3 text-lg font-black">One factual profile</h3><p className="mt-2 text-sm leading-6 text-white/45">The dashboard scores and tailors from it. The extension uses the same JSON for ATS forms and structured history.</p><div className="mt-5 grid gap-2"><button onClick={() => void copyProfile()} className="inline-flex min-h-11 items-center justify-center gap-2 border border-white/12 bg-white/[.035] px-3 text-xs font-bold text-white/65"><Clipboard className="size-4" /> Copy profile JSON</button><button onClick={downloadProfile} className="inline-flex min-h-11 items-center justify-center gap-2 border border-sky-300/30 bg-sky-300/[.07] px-3 text-xs font-bold text-sky-200"><Download className="size-4" /> Download profile JSON</button></div><p className="mt-5 border border-[#d7a45f]/20 bg-[#d7a45f]/[.04] p-3 text-xs leading-5 text-[#efc37c]/80">Demographic/EEO fields, disability/veteran questions, legal attestations, signatures, consent checkboxes, CAPTCHA, and final submission remain outside automation.</p></aside>
          </section>
        ) : null}

        {view === "extension" ? (
          <section className="mt-3 grid gap-3 lg:grid-cols-2">
            <div className={`${styles.cut} border border-white/10 bg-[#080706]/94 p-5 sm:p-6`}><BriefcaseBusiness className="size-6 text-[#ff766b]" /><h2 className="mt-3 text-2xl font-black">Install / update the v2 extension</h2><ol className="mt-4 space-y-3 text-sm leading-6 text-white/52"><li><strong className="text-white/80">1.</strong> Download the Rukh Labs repository ZIP and extract it.</li><li><strong className="text-white/80">2.</strong> In Chrome/Edge open Extensions → Developer mode → Load unpacked.</li><li><strong className="text-white/80">3.</strong> Select <code className="bg-white/[.05] px-1.5 py-0.5 text-sky-200">browser-extension/job-cannon</code>.</li><li><strong className="text-white/80">4.</strong> Open extension Options, import the profile JSON, and upload resume variants.</li><li><strong className="text-white/80">5.</strong> On an ATS page use Scan, Fill, or Learn current answers.</li></ol><a href="https://github.com/red-madhi/rukh-labs-site/archive/refs/heads/main.zip" className="mt-5 inline-flex min-h-11 items-center gap-2 border border-sky-300/30 bg-sky-300/[.07] px-4 py-2 text-xs font-bold text-sky-200" target="_blank" rel="noreferrer"><Download className="size-4" /> Download repository ZIP</a></div>
            <div className={`${styles.cut} border border-white/10 bg-[#080706]/94 p-5 sm:p-6`}><ShieldCheck className="size-6 text-emerald-200" /><h2 className="mt-3 text-2xl font-black">What v2 adds</h2><div className="mt-4 space-y-3 text-sm leading-6 text-white/52"><p>✓ Host detection and specialized handling for Workday, Greenhouse, Lever, and Ashby, with generic fallback for other ATS pages.</p><p>✓ Structured employment and education reuse, including repeated groups and month/year date fields where the page exposes normal controls.</p><p>✓ Custom combobox/listbox selection for React-style ATS widgets instead of only native selects.</p><p>✓ Explicit <strong className="text-white/75">Learn current answers</strong>: safe manually completed questions can be stored for future applications.</p><p>✓ Resume variant recommendation plus the dashboard’s factual local tailoring system.</p><p className="border border-[#d7a45f]/20 bg-[#d7a45f]/[.04] p-3 text-[#efc37c]/80">Still no CAPTCHA bypass, invented qualifications, demographic/EEO answers, attestations, signatures, or automatic final submit.</p></div><div className="mt-5 flex flex-wrap gap-2"><button onClick={() => void copyProfile()} className="inline-flex min-h-11 items-center gap-2 border border-white/12 bg-white/[.035] px-4 py-2 text-xs font-bold text-white/65"><FileJson className="size-4" /> Copy extension profile</button><button onClick={downloadProfile} className="inline-flex min-h-11 items-center gap-2 border border-white/12 bg-white/[.035] px-4 py-2 text-xs font-bold text-white/65"><Download className="size-4" /> Download JSON</button></div></div>
          </section>
        ) : null}
      </div>
    </div>
  );
}
