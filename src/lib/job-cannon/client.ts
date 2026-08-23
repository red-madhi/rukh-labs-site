import type {
  JobCannonExperience,
  JobCannonJob,
  JobCannonProfile,
  JobCannonSettings,
  JobCannonTailoredResume,
} from "@/lib/job-cannon/types";

export const EMPTY_PROFILE: JobCannonProfile = {
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
  headline: "",
  masterSummary: "",
  certifications: [],
  experience: [],
  education: [],
  answerBank: [],
};

export const DEFAULT_SETTINGS: JobCannonSettings = {
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
  autoReadyThreshold: 82,
  duplicateWindowDays: 45,
};

const STOPWORDS = new Set([
  "and", "the", "with", "for", "from", "that", "this", "you", "your", "our", "are", "will", "have", "has", "job", "role", "team", "work", "years", "experience", "skills", "using", "into", "within", "about", "who", "what", "where", "when", "which", "their", "they", "them", "company", "business", "data", "strong", "ability", "including", "required", "preferred", "responsibilities", "qualifications",
]);

export function splitLines(value: string) {
  return value.split(/\n|,/).map((item) => item.trim()).filter(Boolean);
}

export function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

export function normalizeProfile(value?: Partial<JobCannonProfile> | null): JobCannonProfile {
  return {
    ...EMPTY_PROFILE,
    ...(value || {}),
    certifications: Array.isArray(value?.certifications) ? value.certifications.filter(Boolean) : [],
    experience: Array.isArray(value?.experience) ? value.experience.map((item) => ({
      id: item.id || crypto.randomUUID(),
      company: item.company || "",
      title: item.title || "",
      location: item.location || "",
      startDate: item.startDate || "",
      endDate: item.endDate || "",
      current: Boolean(item.current),
      bullets: Array.isArray(item.bullets) ? item.bullets.filter(Boolean) : [],
      technologies: Array.isArray(item.technologies) ? item.technologies.filter(Boolean) : [],
    })) : [],
    education: Array.isArray(value?.education) ? value.education.map((item) => ({
      id: item.id || crypto.randomUUID(),
      school: item.school || "",
      degree: item.degree || "",
      field: item.field || "",
      location: item.location || "",
      startDate: item.startDate || "",
      endDate: item.endDate || "",
    })) : [],
    answerBank: Array.isArray(value?.answerBank) ? value.answerBank.map((item) => ({
      pattern: item.pattern || "",
      answer: item.answer || "",
      source: (item.source === "learned" ? "learned" : "manual") as const,
      lastUsedAt: item.lastUsedAt,
      uses: Number(item.uses) || 0,
    })).filter((item) => item.pattern && item.answer) : [],
  };
}

export function normalizeCompanyKey(value: string) {
  return value
    .toLowerCase()
    .replace(/\b(incorporated|inc|llc|ltd|limited|corp|corporation|company|co)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeTitle(value: string) {
  return value.toLowerCase().replace(/\b(sr|senior|jr|junior|ii|iii|iv)\b/g, " ").replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}

export function findDuplicate(job: JobCannonJob, existing: JobCannonJob[], windowDays: number) {
  const companyKey = normalizeCompanyKey(job.company);
  const titleKey = normalizeTitle(job.title);
  const cutoff = Date.now() - Math.max(1, windowDays) * 86_400_000;
  return existing.find((candidate) => {
    if (candidate.id === job.id) return false;
    if (candidate.url === job.url) return true;
    const candidateTime = Date.parse(candidate.discoveredAt || candidate.postedAt || "");
    if (Number.isFinite(candidateTime) && candidateTime < cutoff) return false;
    if (normalizeCompanyKey(candidate.company) !== companyKey) return false;
    const otherTitle = normalizeTitle(candidate.title);
    return otherTitle === titleKey || otherTitle.includes(titleKey) || titleKey.includes(otherTitle);
  });
}

export function scoreJob(job: JobCannonJob, settings: JobCannonSettings, profile: JobCannonProfile) {
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

  return { score: clamp(Math.round(score)), reasons, risks, matchedSkills };
}

function keywordTokens(value: string) {
  const phraseMatches = value.match(/\b(?:power bi|power query|microsoft fabric|data modeling|data model|business intelligence|semantic model|data visualization|data warehouse|data pipeline|sql server|azure data factory|snowflake|databricks|tableau|dax|etl|elt|sql|python|ssrs|ssas|ssis)\b/gi) || [];
  const words = value.toLowerCase().match(/[a-z][a-z0-9+#.-]{2,}/g) || [];
  const weighted = [...phraseMatches.map((item) => item.toLowerCase()), ...words.filter((word) => !STOPWORDS.has(word))];
  const counts = new Map<string, number>();
  for (const token of weighted) counts.set(token, (counts.get(token) || 0) + 1);
  return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).map(([token]) => token);
}

function bulletScore(bullet: string, keywords: string[]) {
  const lower = bullet.toLowerCase();
  let score = 0;
  for (const [index, keyword] of keywords.entries()) {
    if (!lower.includes(keyword)) continue;
    score += Math.max(1, 8 - Math.floor(index / 4));
  }
  if (/\b\d+(?:\.\d+)?%|\$\d+|\d+[kmb]\b/i.test(bullet)) score += 2;
  return score;
}

function experienceScore(item: JobCannonExperience, keywords: string[]) {
  return item.bullets.reduce((sum, bullet) => sum + bulletScore(bullet, keywords), 0)
    + item.technologies.reduce((sum, technology) => sum + (keywords.some((keyword) => technology.toLowerCase().includes(keyword)) ? 5 : 0), 0);
}

export function buildTailoredResume(job: JobCannonJob, profile: JobCannonProfile): JobCannonTailoredResume {
  const keywords = keywordTokens(`${job.title}\n${job.description}\n${job.sourceSnippet || ""}`).slice(0, 28);
  const profileSkills = splitLines(profile.skills);
  const matchedSkills = profileSkills
    .map((skill) => ({ skill, score: keywords.some((keyword) => skill.toLowerCase().includes(keyword) || keyword.includes(skill.toLowerCase())) ? 2 : 0 }))
    .sort((a, b) => b.score - a.score)
    .map((item) => item.skill)
    .slice(0, 14);

  const rankedExperience = profile.experience
    .map((item) => ({ item, score: experienceScore(item, keywords) }))
    .sort((a, b) => b.score - a.score);

  const experience = rankedExperience.map(({ item }) => ({
    experienceId: item.id,
    company: item.company,
    title: item.title,
    bullets: item.bullets
      .map((bullet) => ({ bullet, score: bulletScore(bullet, keywords) }))
      .sort((a, b) => b.score - a.score)
      .map((entry) => entry.bullet)
      .slice(0, 6),
  }));

  const headline = profile.headline.trim() || job.title;
  const summaryBase = profile.masterSummary.trim();
  const strongestKeywords = keywords.filter((keyword) => matchedSkills.some((skill) => skill.toLowerCase().includes(keyword) || keyword.includes(skill.toLowerCase()))).slice(0, 7);
  const summary = summaryBase
    ? `${summaryBase}${strongestKeywords.length ? ` Focus for this role: ${strongestKeywords.join(", ")}.` : ""}`
    : strongestKeywords.length
      ? `${headline} with hands-on experience in ${strongestKeywords.join(", ")}.`
      : headline;

  return {
    createdAt: new Date().toISOString(),
    headline,
    summary,
    skills: matchedSkills,
    matchedKeywords: keywords.slice(0, 16),
    experience,
  };
}

export function tailoredResumeText(job: JobCannonJob, profile: JobCannonProfile, tailored: JobCannonTailoredResume) {
  const lines = [
    `${profile.firstName} ${profile.lastName}`.trim(),
    tailored.headline,
    [profile.email, profile.phone, profile.linkedin, profile.portfolio].filter(Boolean).join(" | "),
    "",
    "SUMMARY",
    tailored.summary,
    "",
    "SKILLS",
    tailored.skills.join(" • "),
    "",
    "EXPERIENCE",
  ];

  for (const section of tailored.experience) {
    const source = profile.experience.find((item) => item.id === section.experienceId);
    const dates = source ? [source.startDate, source.current ? "Present" : source.endDate].filter(Boolean).join(" – ") : "";
    lines.push(`${section.title} | ${section.company}${dates ? ` | ${dates}` : ""}`);
    for (const bullet of section.bullets) lines.push(`- ${bullet}`);
    lines.push("");
  }

  if (profile.education.length) {
    lines.push("EDUCATION");
    for (const item of profile.education) lines.push([item.degree, item.field, item.school, item.endDate].filter(Boolean).join(" | "));
    lines.push("");
  }
  if (profile.certifications.length) {
    lines.push("CERTIFICATIONS");
    for (const item of profile.certifications) lines.push(`- ${item}`);
  }
  lines.push("", `Tailored locally for: ${job.title} — ${job.company}`);
  return lines.join("\n");
}
