"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowUpRight,
  BriefcaseBusiness,
  CheckCircle2,
  Clipboard,
  Download,
  ExternalLink,
  FileJson,
  Gauge,
  ListChecks,
  LoaderCircle,
  Radar,
  Search,
  Settings2,
  ShieldCheck,
  SkipForward,
  Sparkles,
  Target,
  UserRound,
  WandSparkles,
} from "lucide-react";
import type {
  JobCannonJob,
  JobCannonProfile,
  JobCannonSearchResponse,
  JobCannonSettings,
  JobCannonStatus,
} from "@/lib/job-cannon/types";
import styles from "@/app/leads/leads.module.css";

const JOBS_KEY = "job-cannon.jobs.v1";
const PROFILE_KEY = "job-cannon.profile.v1";
const SETTINGS_KEY = "job-cannon.settings.v1";
const SOURCE_OFFSET_KEY = "job-cannon.source-offset.v1";

const DEFAULT_SETTINGS: JobCannonSettings = {
  roles: [
    "Power BI Developer",
    "Senior Data Analyst",
    "Business Intelligence Analyst",
    "BI Analyst",
    "Analytics Engineer",
    "Reporting Analyst",
  ].join("\n"),
  location: "Remote",
  minSalary: 90000,
  maxAgeHours: 72,
  remoteOnly: true,
  rejectTerms: ["active security clearance", "TS/SCI", "commission only"].join("\n"),
};

const EMPTY_PROFILE: JobCannonProfile = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  address1: "",
  city: "",
  state: "",
  postalCode: "",
  country: "United States",
  linkedin: "",
  portfolio: "",
  github: "",
  salaryExpectation: "",
  workAuthorized: "",
  needsSponsorship: "",
  willingToRelocate: "",
  willingToTravel: "",
  sourceAnswer: "Company website",
  skills: "Power BI, DAX, Power Query, SQL, ETL, Microsoft Fabric, Tableau, data modeling, reporting, dashboards",
  answerBank: [],
};

const STATUS_LABELS: Record<JobCannonStatus, string> = {
  new: "New",
  queued: "Queued",
  applying: "Applying",
  applied: "Applied",
  interview: "Interview",
  offer: "Offer",
  rejected: "Rejected",
  skipped: "Skipped",
};

function splitLines(value: string) {
  return value.split(/\n|,/).map((item) => item.trim()).filter(Boolean);
}

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

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

function scoreJob(job: JobCannonJob, settings: JobCannonSettings, profile: JobCannonProfile) {
  const title = job.title.toLowerCase();
  const combined = `${job.title} ${job.company} ${job.location} ${job.description}`.toLowerCase();
  const desiredRoles = splitLines(settings.roles).map((item) => item.toLowerCase());
  const skills = splitLines(profile.skills).map((item) => item.toLowerCase());
  const rejectTerms = splitLines(settings.rejectTerms).map((item) => item.toLowerCase());
  let score = 48;
  const reasons: string[] = [];
  const risks: string[] = [];

  const titleMatch = desiredRoles.find((role) => title.includes(role) || role.includes(title));
  if (titleMatch) {
    score += 24;
    reasons.push("Target title match");
  } else if (/power bi|business intelligence|data analyst|analytics|reporting/i.test(job.title)) {
    score += 10;
    reasons.push("Adjacent BI / analytics title");
  }

  const matchedSkills = skills.filter((skill) => skill.length >= 2 && combined.includes(skill));
  if (matchedSkills.length) {
    score += Math.min(20, matchedSkills.length * 2);
    reasons.push(`${matchedSkills.length} profile skill${matchedSkills.length === 1 ? "" : "s"} matched`);
  }

  if (job.postedAt) {
    const ageHours = Math.max(0, (Date.now() - Date.parse(job.postedAt)) / 3_600_000);
    if (ageHours <= 12) { score += 10; reasons.push("Posted within 12 hours"); }
    else if (ageHours <= 24) { score += 7; reasons.push("Posted within 24 hours"); }
    else if (ageHours <= 72) { score += 3; reasons.push("Still fresh"); }
  } else {
    risks.push("Posting date could not be verified");
  }

  const remote = /remote|telecommute|anywhere/i.test(`${job.location} ${job.description}`);
  if (settings.remoteOnly) {
    if (remote) { score += 8; reasons.push("Remote match"); }
    else { score -= 16; risks.push("Remote status not confirmed"); }
  }

  if (job.salaryMax || job.salaryMin) {
    const ceiling = job.salaryMax || job.salaryMin || 0;
    if (ceiling >= settings.minSalary) { score += 5; reasons.push("Compensation clears target"); }
    else { score -= 18; risks.push("Listed compensation is below target"); }
  }

  const reject = rejectTerms.find((term) => term && combined.includes(term));
  if (reject) {
    score = Math.min(score, 22);
    risks.push(`Reject term: ${reject}`);
  }

  if (/director|vice president|\bvp\b|chief data|head of/i.test(job.title)) {
    score -= 12;
    risks.push("Likely management-heavy");
  }

  if (/phd required|doctorate required/i.test(combined)) {
    score = Math.min(score, 25);
    risks.push("Doctorate appears required");
  }

  return { score: clamp(Math.round(score)), reasons, risks };
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
      const storedJobs = localStorage.getItem(JOBS_KEY);
      const storedProfile = localStorage.getItem(PROFILE_KEY);
      const storedSettings = localStorage.getItem(SETTINGS_KEY);
      const storedOffset = localStorage.getItem(SOURCE_OFFSET_KEY);
      if (storedJobs) setJobs(JSON.parse(storedJobs) as JobCannonJob[]);
      if (storedProfile) {
        const next = { ...EMPTY_PROFILE, ...(JSON.parse(storedProfile) as Partial<JobCannonProfile>) };
        setProfile(next);
        setAnswerBankText((next.answerBank || []).map((item) => `${item.pattern} => ${item.answer}`).join("\n"));
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
    .filter(({ job }) => !["applied", "interview", "offer", "rejected", "skipped"].includes(job.status || "new"))
    .sort((a, b) => b.score - a.score || Date.parse(b.job.postedAt || b.job.discoveredAt) - Date.parse(a.job.postedAt || a.job.discoveredAt));
  const queue = scoredJobs
    .filter(({ job }) => ["queued", "applying", "applied", "interview", "offer", "rejected"].includes(job.status || "new"))
    .sort((a, b) => b.score - a.score);
  const appliedCount = jobs.filter((job) => ["applied", "interview", "offer"].includes(job.status || "new")).length;
  const strongCount = activeResults.filter((item) => item.score >= 80).length;
  const profileFields = [profile.firstName, profile.lastName, profile.email, profile.phone, profile.city, profile.state, profile.linkedin, profile.workAuthorized, profile.needsSponsorship];
  const profileCompleteness = Math.round((profileFields.filter(Boolean).length / profileFields.length) * 100);

  function updateJob(id: string, patch: Partial<JobCannonJob>) {
    setJobs((current) => current.map((job) => job.id === id ? { ...job, ...patch } : job));
  }

  async function runSearch() {
    setLoading(true);
    setMessage("Searching the next ATS sources and checking live job pages…");
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
      setJobs((current) => {
        const byId = new Map(current.map((job) => [job.id, job]));
        for (const job of body.jobs || []) {
          const existing = byId.get(job.id);
          byId.set(job.id, existing ? { ...job, status: existing.status } : { ...job, status: "new" });
        }
        return Array.from(byId.values());
      });
      setMessage(`Scan complete · ${body.sources.join(", ")} · ${body.checked} live pages checked · ${body.jobs.length} fresh jobs kept.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Job search failed.");
    } finally {
      setLoading(false);
    }
  }

  function updateAnswerBank(raw: string) {
    setAnswerBankText(raw);
    const answerBank = raw.split("\n").map((line) => {
      const index = line.indexOf("=>");
      if (index < 1) return null;
      const pattern = line.slice(0, index).trim();
      const answer = line.slice(index + 2).trim();
      return pattern && answer ? { pattern, answer } : null;
    }).filter((item): item is { pattern: string; answer: string } => Boolean(item));
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

  function openApplication(job: JobCannonJob) {
    updateJob(job.id, { status: "applying" });
    window.open(job.url, "_blank", "noopener,noreferrer");
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
                <Badge><WandSparkles className="mr-1.5 size-3" /> Browser autofill</Badge>
              </div>
              <h1 className="mt-3 text-[clamp(2.4rem,8vw,5.4rem)] font-black uppercase leading-[.86] tracking-[-.07em]">
                JOB <span className="text-[#ff6f65]">CANNON</span>
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-white/48 sm:text-base">
                Find fresh company-site roles, score them against your criteria, queue the best ones, then use the companion extension to fill routine ATS fields. It never clicks the final submit button.
              </p>
            </div>
            <button
              onClick={() => void runSearch()}
              disabled={loading}
              className="inline-flex min-h-12 items-center justify-center gap-2 border border-[#ef2a26]/40 bg-[#ef2a26]/12 px-5 py-3 text-xs font-black uppercase tracking-[.12em] text-[#ff9187] transition hover:bg-[#ef2a26]/18 disabled:opacity-50"
            >
              {loading ? <LoaderCircle className="size-4 animate-spin" /> : <Radar className="size-4" />}
              {loading ? "Scanning" : "Scan next ATS sources"}
            </button>
          </div>
          {message ? <p className="mt-4 border border-white/10 bg-white/[.025] px-4 py-3 text-xs leading-5 text-white/58">{message}</p> : null}
        </header>

        <section className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Metric label="Discovered" value={jobs.length} note="Stored only in this browser" />
          <Metric label="Strong matches" value={strongCount} note="Current score ≥80" />
          <Metric label="In queue" value={queue.filter((item) => ["queued", "applying"].includes(item.job.status || "new")).length} note="Ready or actively applying" />
          <Metric label="Applied" value={appliedCount} note="Applied + interview + offer" />
        </section>

        <nav className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {([
            ["search", Search, "Search"],
            ["queue", ListChecks, "Queue"],
            ["profile", UserRound, "Profile"],
            ["extension", Sparkles, "Extension"],
          ] as const).map(([key, Icon, label]) => (
            <button key={key} onClick={() => setView(key)} className={`inline-flex min-h-11 items-center justify-center gap-2 border px-3 py-2 text-xs font-bold uppercase tracking-[.1em] ${view === key ? "border-sky-300/35 bg-sky-300/[.08] text-sky-200" : "border-white/10 bg-black/30 text-white/42"}`}>
              <Icon className="size-4" /> {label}
            </button>
          ))}
        </nav>

        {view === "search" ? (
          <div className="mt-3 grid gap-3 xl:grid-cols-[360px_minmax(0,1fr)]">
            <aside className={`${styles.cut} self-start border border-white/10 bg-[#080706]/94 p-4 sm:p-5 xl:sticky xl:top-3`}>
              <div className="flex items-center gap-2"><Settings2 className="size-4 text-sky-200" /><h2 className="text-sm font-black uppercase tracking-[.12em]">Search rules</h2></div>
              <div className="mt-4 space-y-4">
                <label className="block">
                  <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[.12em] text-white/38">Target roles · one per line</span>
                  <textarea value={settings.roles} onChange={(event) => setSettings((current) => ({ ...current, roles: event.target.value }))} rows={8} className="w-full border border-white/10 bg-black/35 px-3 py-2 text-sm leading-6 text-white outline-none focus:border-sky-300/40" />
                </label>
                <Field label="Location" value={settings.location} onChange={(value) => setSettings((current) => ({ ...current, location: value }))} />
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Minimum salary" value={String(settings.minSalary || "")} type="number" onChange={(value) => setSettings((current) => ({ ...current, minSalary: Number(value) || 0 }))} />
                  <Field label="Max age · hours" value={String(settings.maxAgeHours || "")} type="number" onChange={(value) => setSettings((current) => ({ ...current, maxAgeHours: Math.max(6, Number(value) || 72) }))} />
                </div>
                <label className="flex items-center gap-3 border border-white/10 bg-white/[.025] p-3 text-xs text-white/62">
                  <input type="checkbox" checked={settings.remoteOnly} onChange={(event) => setSettings((current) => ({ ...current, remoteOnly: event.target.checked }))} />
                  Penalize roles that are not clearly remote
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[.12em] text-white/38">Hard reject terms</span>
                  <textarea value={settings.rejectTerms} onChange={(event) => setSettings((current) => ({ ...current, rejectTerms: event.target.value }))} rows={4} className="w-full border border-white/10 bg-black/35 px-3 py-2 text-sm leading-6 text-white outline-none focus:border-sky-300/40" />
                </label>
              </div>
            </aside>

            <main className="space-y-3">
              {activeResults.length ? activeResults.map(({ job, score, reasons, risks }) => (
                <article key={job.id} className={`${styles.cut} border border-white/10 bg-[#080706]/94 p-4 sm:p-5`}>
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone={score >= 85 ? "hot" : score >= 75 ? "good" : "warn"}>{score}% fit</Badge>
                        <Badge>{job.provider}</Badge>
                        <Badge>{relativeTime(job.postedAt)}</Badge>
                        {job.employmentType ? <Badge>{job.employmentType}</Badge> : null}
                      </div>
                      <h2 className="mt-3 text-xl font-black leading-tight text-[#f5efe0] sm:text-2xl">{job.title}</h2>
                      <p className="mt-1 text-sm font-semibold text-sky-200/80">{job.company}</p>
                      <p className="mt-1 text-xs text-white/42">{job.location}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button onClick={() => updateJob(job.id, { status: "queued" })} className="inline-flex min-h-10 items-center gap-2 border border-emerald-300/30 bg-emerald-300/[.07] px-3 py-2 text-xs font-bold text-emerald-200"><Target className="size-4" /> Queue</button>
                      <button onClick={() => openApplication(job)} className="inline-flex min-h-10 items-center gap-2 border border-sky-300/30 bg-sky-300/[.07] px-3 py-2 text-xs font-bold text-sky-200"><ArrowUpRight className="size-4" /> Open application</button>
                      <button onClick={() => updateJob(job.id, { status: "skipped" })} className="inline-flex min-h-10 items-center gap-2 border border-white/10 bg-white/[.025] px-3 py-2 text-xs font-bold text-white/45"><SkipForward className="size-4" /> Skip</button>
                    </div>
                  </div>
                  {job.salaryMin || job.salaryMax ? <p className="mt-3 text-sm font-bold text-emerald-200/80">{currency(job.salaryMin)}{job.salaryMax && job.salaryMax !== job.salaryMin ? ` – ${currency(job.salaryMax)}` : ""}{job.salaryUnit ? ` / ${job.salaryUnit}` : ""}</p> : null}
                  <p className="mt-3 line-clamp-4 text-sm leading-6 text-white/48">{job.description || job.sourceSnippet || "No description extracted."}</p>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <div className="border border-emerald-300/12 bg-emerald-300/[.035] p-3"><p className="text-[9px] font-bold uppercase tracking-[.14em] text-emerald-200/60">Why it scored</p><p className="mt-2 text-xs leading-5 text-white/48">{reasons.join(" · ") || "No strong positive signal yet."}</p></div>
                    <div className="border border-[#d7a45f]/14 bg-[#d7a45f]/[.035] p-3"><p className="text-[9px] font-bold uppercase tracking-[.14em] text-[#efc37c]/65">Watch</p><p className="mt-2 text-xs leading-5 text-white/48">{risks.join(" · ") || "No obvious filter conflict."}</p></div>
                  </div>
                </article>
              )) : (
                <div className={`${styles.cut} border border-white/10 bg-[#080706]/94 p-8 text-center`}>
                  <Radar className="mx-auto size-8 text-white/20" />
                  <h2 className="mt-3 text-lg font-black">No active results yet</h2>
                  <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-white/42">Run a scan. Job Cannon rotates across Greenhouse, Lever, Ashby, Workday, SmartRecruiters, and Jobvite four sources at a time to keep API usage sane.</p>
                </div>
              )}
            </main>
          </div>
        ) : null}

        {view === "queue" ? (
          <div className="mt-3 space-y-3">
            {queue.length ? queue.map(({ job, score }) => (
              <article key={job.id} className={`${styles.cut} border border-white/10 bg-[#080706]/94 p-4 sm:p-5`}>
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                  <div>
                    <div className="flex flex-wrap gap-2"><Badge tone={score >= 80 ? "good" : "warn"}>{score}% fit</Badge><Badge>{STATUS_LABELS[job.status || "new"]}</Badge><Badge>{job.provider}</Badge></div>
                    <h2 className="mt-3 text-xl font-black">{job.title}</h2>
                    <p className="mt-1 text-sm text-sky-200/75">{job.company} · {job.location}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => openApplication(job)} className="inline-flex min-h-10 items-center gap-2 border border-sky-300/30 bg-sky-300/[.07] px-3 py-2 text-xs font-bold text-sky-200"><ExternalLink className="size-4" /> Open + fill</button>
                    <button onClick={() => updateJob(job.id, { status: "applied" })} className="inline-flex min-h-10 items-center gap-2 border border-emerald-300/30 bg-emerald-300/[.07] px-3 py-2 text-xs font-bold text-emerald-200"><CheckCircle2 className="size-4" /> Applied</button>
                    <select value={job.status || "new"} onChange={(event) => updateJob(job.id, { status: event.target.value as JobCannonStatus })} className="min-h-10 border border-white/10 bg-black/50 px-3 text-xs text-white/70">
                      {Object.entries(STATUS_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                    </select>
                  </div>
                </div>
              </article>
            )) : <div className={`${styles.cut} border border-white/10 bg-[#080706]/94 p-8 text-center text-sm text-white/45`}>Queue a strong match from Search and it will show up here.</div>}
          </div>
        ) : null}

        {view === "profile" ? (
          <section className="mt-3 grid gap-3 xl:grid-cols-[minmax(0,1fr)_340px]">
            <div className={`${styles.cut} border border-white/10 bg-[#080706]/94 p-4 sm:p-6`}>
              <div className="flex items-center justify-between gap-3"><div><h2 className="text-lg font-black uppercase tracking-[.08em]">Autofill profile</h2><p className="mt-1 text-xs text-white/38">Saved locally in this browser. Nothing here is written to the repo.</p></div><Badge tone={profileCompleteness >= 75 ? "good" : "warn"}>{profileCompleteness}% complete</Badge></div>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <Field label="First name" value={profile.firstName} onChange={(value) => setProfile((p) => ({ ...p, firstName: value }))} />
                <Field label="Last name" value={profile.lastName} onChange={(value) => setProfile((p) => ({ ...p, lastName: value }))} />
                <Field label="Email" type="email" value={profile.email} onChange={(value) => setProfile((p) => ({ ...p, email: value }))} />
                <Field label="Phone" value={profile.phone} onChange={(value) => setProfile((p) => ({ ...p, phone: value }))} />
                <Field label="Address" value={profile.address1} onChange={(value) => setProfile((p) => ({ ...p, address1: value }))} />
                <Field label="City" value={profile.city} onChange={(value) => setProfile((p) => ({ ...p, city: value }))} />
                <Field label="State" value={profile.state} onChange={(value) => setProfile((p) => ({ ...p, state: value }))} />
                <Field label="Postal code" value={profile.postalCode} onChange={(value) => setProfile((p) => ({ ...p, postalCode: value }))} />
                <Field label="Country" value={profile.country} onChange={(value) => setProfile((p) => ({ ...p, country: value }))} />
                <Field label="LinkedIn" value={profile.linkedin} onChange={(value) => setProfile((p) => ({ ...p, linkedin: value }))} />
                <Field label="Portfolio / website" value={profile.portfolio} onChange={(value) => setProfile((p) => ({ ...p, portfolio: value }))} />
                <Field label="GitHub" value={profile.github} onChange={(value) => setProfile((p) => ({ ...p, github: value }))} />
                <Field label="Salary expectation" value={profile.salaryExpectation} onChange={(value) => setProfile((p) => ({ ...p, salaryExpectation: value }))} placeholder="e.g. 110000" />
                <Field label="How did you hear about us?" value={profile.sourceAnswer} onChange={(value) => setProfile((p) => ({ ...p, sourceAnswer: value }))} />
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <Field label="Work authorized?" value={profile.workAuthorized} onChange={(value) => setProfile((p) => ({ ...p, workAuthorized: value }))} placeholder="Yes / No" />
                <Field label="Need sponsorship?" value={profile.needsSponsorship} onChange={(value) => setProfile((p) => ({ ...p, needsSponsorship: value }))} placeholder="Yes / No" />
                <Field label="Relocate?" value={profile.willingToRelocate} onChange={(value) => setProfile((p) => ({ ...p, willingToRelocate: value }))} placeholder="Yes / No" />
                <Field label="Travel?" value={profile.willingToTravel} onChange={(value) => setProfile((p) => ({ ...p, willingToTravel: value }))} placeholder="Yes / No" />
              </div>
              <label className="mt-4 block"><span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[.12em] text-white/38">Skills used for scoring</span><textarea rows={4} value={profile.skills} onChange={(event) => setProfile((p) => ({ ...p, skills: event.target.value }))} className="w-full border border-white/10 bg-black/35 px-3 py-2 text-sm leading-6 text-white outline-none focus:border-sky-300/40" /></label>
              <label className="mt-4 block"><span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[.12em] text-white/38">Custom answer bank · question pattern =&gt; answer</span><textarea rows={6} value={answerBankText} onChange={(event) => updateAnswerBank(event.target.value)} placeholder={'why are you interested => I am interested because...\npreferred name => ...'} className="w-full border border-white/10 bg-black/35 px-3 py-2 text-sm leading-6 text-white outline-none focus:border-sky-300/40" /></label>
            </div>
            <aside className={`${styles.cut} self-start border border-white/10 bg-[#080706]/94 p-5 xl:sticky xl:top-3`}>
              <Gauge className="size-5 text-sky-200" /><h3 className="mt-3 text-lg font-black">Keep the profile factual</h3><p className="mt-2 text-sm leading-6 text-white/45">The extension reuses these answers. It deliberately skips EEO/demographic questions, legal attestations, signatures, CAPTCHA, and the final submit button.</p>
              <div className="mt-5 grid gap-2">
                <button onClick={() => void copyProfile()} className="inline-flex min-h-11 items-center justify-center gap-2 border border-white/12 bg-white/[.035] px-3 text-xs font-bold text-white/65"><Clipboard className="size-4" /> Copy profile JSON</button>
                <button onClick={downloadProfile} className="inline-flex min-h-11 items-center justify-center gap-2 border border-sky-300/30 bg-sky-300/[.07] px-3 text-xs font-bold text-sky-200"><Download className="size-4" /> Download profile JSON</button>
              </div>
            </aside>
          </section>
        ) : null}

        {view === "extension" ? (
          <section className="mt-3 grid gap-3 lg:grid-cols-2">
            <div className={`${styles.cut} border border-white/10 bg-[#080706]/94 p-5 sm:p-6`}>
              <BriefcaseBusiness className="size-6 text-[#ff766b]" />
              <h2 className="mt-3 text-2xl font-black">Install the autofill extension</h2>
              <ol className="mt-4 space-y-3 text-sm leading-6 text-white/52">
                <li><strong className="text-white/80">1.</strong> Download the Rukh Labs repository ZIP and extract it.</li>
                <li><strong className="text-white/80">2.</strong> In Chrome/Edge open Extensions → Developer mode → Load unpacked.</li>
                <li><strong className="text-white/80">3.</strong> Select <code className="bg-white/[.05] px-1.5 py-0.5 text-sky-200">browser-extension/job-cannon</code>.</li>
                <li><strong className="text-white/80">4.</strong> Open Job Cannon extension Options, import the profile JSON from this page, and upload your resume variants.</li>
                <li><strong className="text-white/80">5.</strong> On an ATS application, click the extension → <strong className="text-white/80">Fill this page</strong>.</li>
              </ol>
              <a href="https://github.com/red-madhi/rukh-labs-site/archive/refs/heads/main.zip" className="mt-5 inline-flex min-h-11 items-center gap-2 border border-sky-300/30 bg-sky-300/[.07] px-4 py-2 text-xs font-bold text-sky-200" target="_blank" rel="noreferrer"><Download className="size-4" /> Download repository ZIP</a>
            </div>
            <div className={`${styles.cut} border border-white/10 bg-[#080706]/94 p-5 sm:p-6`}>
              <ShieldCheck className="size-6 text-emerald-200" />
              <h2 className="mt-3 text-2xl font-black">What v1 automates</h2>
              <div className="mt-4 space-y-3 text-sm leading-6 text-white/52">
                <p>✓ Contact details, links, location, salary, work authorization, sponsorship, relocation/travel, and saved custom answers.</p>
                <p>✓ Native text fields, textareas, selects, radio groups, and resume PDF file inputs where the ATS permits normal DOM assignment.</p>
                <p>✓ Resume selection from Power BI, analytics, and data-ops variants based on the job-page text.</p>
                <p>✓ Unknown-field reporting so we can expand the answer bank over time.</p>
                <p className="border border-[#d7a45f]/20 bg-[#d7a45f]/[.04] p-3 text-[#efc37c]/80">It does not bypass CAPTCHA, invent qualifications, fill demographic/EEO answers, accept legal attestations, sign your name, or submit the application.</p>
              </div>
              <div className="mt-5 flex flex-wrap gap-2"><button onClick={() => void copyProfile()} className="inline-flex min-h-11 items-center gap-2 border border-white/12 bg-white/[.035] px-4 py-2 text-xs font-bold text-white/65"><FileJson className="size-4" /> Copy extension profile</button><button onClick={downloadProfile} className="inline-flex min-h-11 items-center gap-2 border border-white/12 bg-white/[.035] px-4 py-2 text-xs font-bold text-white/65"><Download className="size-4" /> Download JSON</button></div>
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}
