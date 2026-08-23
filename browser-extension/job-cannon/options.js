const PROFILE_FIELDS = [
  "firstName", "lastName", "email", "phone", "address1", "city", "state", "postalCode", "country",
  "linkedin", "portfolio", "github", "salaryExpectation", "workAuthorized", "needsSponsorship",
  "willingToRelocate", "willingToTravel", "sourceAnswer", "skills", "headline", "masterSummary",
];

const RESUME_INPUTS = {
  powerBi: "resumePowerBi",
  analytics: "resumeAnalytics",
  dataOps: "resumeDataOps",
};

const status = document.getElementById("status");
let existingProfile = {};

function setStatus(message, good = false) {
  status.className = good ? "status good" : "status";
  status.textContent = message;
}

function answerBankFromText(value, previous = []) {
  const byPattern = new Map((previous || []).map((item) => [String(item.pattern || "").toLowerCase(), item]));
  return value.split("\n").map((line) => {
    const index = line.indexOf("=>");
    if (index < 1) return null;
    const pattern = line.slice(0, index).trim();
    const answer = line.slice(index + 2).trim();
    if (!pattern || !answer) return null;
    const old = byPattern.get(pattern.toLowerCase());
    return {
      pattern,
      answer,
      source: old?.source === "learned" ? "learned" : "manual",
      uses: Number(old?.uses || 0),
      lastUsedAt: old?.lastUsedAt,
    };
  }).filter(Boolean);
}

function answerBankToText(value) {
  return Array.isArray(value) ? value.map((item) => `${item.pattern} => ${item.answer}`).join("\n") : "";
}

async function fileToStoredResume(file) {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunk = 0x8000;
  for (let index = 0; index < bytes.length; index += chunk) {
    binary += String.fromCharCode(...bytes.subarray(index, Math.min(index + chunk, bytes.length)));
  }
  return {
    name: file.name,
    type: file.type || "application/octet-stream",
    base64: btoa(binary),
    size: file.size,
    savedAt: new Date().toISOString(),
  };
}

function renderResumeNotes(resumes = {}) {
  for (const [key, inputId] of Object.entries(RESUME_INPUTS)) {
    const note = document.getElementById(`${inputId}Note`);
    const resume = resumes[key];
    note.textContent = resume?.name ? `${resume.name} · ${Math.round((resume.size || 0) / 1024)} KB` : "Not loaded";
  }
}

function renderStructuredNote(profile = {}) {
  const experienceCount = Array.isArray(profile.experience) ? profile.experience.length : 0;
  const educationCount = Array.isArray(profile.education) ? profile.education.length : 0;
  const bulletCount = (profile.experience || []).reduce((sum, item) => sum + (Array.isArray(item.bullets) ? item.bullets.length : 0), 0);
  const learnedCount = (profile.answerBank || []).filter((item) => item?.source === "learned").length;
  const note = document.getElementById("structuredNote");
  note.className = experienceCount || educationCount ? "status good" : "status";
  note.textContent = `${experienceCount} work roles · ${bulletCount} factual bullets · ${educationCount} education entries · ${learnedCount} learned answers`;
}

async function load() {
  const { profile = {}, resumes = {} } = await chrome.storage.local.get(["profile", "resumes"]);
  existingProfile = { ...profile };
  for (const field of PROFILE_FIELDS) {
    const element = document.getElementById(field);
    if (element) element.value = profile[field] || (field === "country" ? "United States" : "");
  }
  document.getElementById("certifications").value = Array.isArray(profile.certifications) ? profile.certifications.join("\n") : "";
  document.getElementById("answerBank").value = answerBankToText(profile.answerBank);
  renderResumeNotes(resumes);
  renderStructuredNote(profile);
}

async function buildProfileFromForm() {
  const profile = { ...existingProfile };
  for (const field of PROFILE_FIELDS) profile[field] = document.getElementById(field)?.value?.trim() || "";
  profile.certifications = (document.getElementById("certifications").value || "").split("\n").map((item) => item.trim()).filter(Boolean);
  profile.answerBank = answerBankFromText(document.getElementById("answerBank").value || "", existingProfile.answerBank || []);
  if (!Array.isArray(profile.experience)) profile.experience = [];
  if (!Array.isArray(profile.education)) profile.education = [];
  return profile;
}

async function save() {
  const profile = await buildProfileFromForm();
  const current = await chrome.storage.local.get(["resumes"]);
  const resumes = { ...(current.resumes || {}) };
  for (const [key, inputId] of Object.entries(RESUME_INPUTS)) {
    const input = document.getElementById(inputId);
    const file = input?.files?.[0];
    if (file) resumes[key] = await fileToStoredResume(file);
  }
  await chrome.storage.local.set({ profile, resumes });
  existingProfile = { ...profile };
  renderResumeNotes(resumes);
  renderStructuredNote(profile);
  setStatus(`Saved ${PROFILE_FIELDS.filter((field) => profile[field]).length} profile fields, ${profile.experience.length} jobs, ${profile.education.length} education entries, ${profile.answerBank.length} answers, and ${Object.values(resumes).filter((item) => item?.base64).length} resume variants.`, true);
}

async function importProfile(file) {
  const parsed = JSON.parse(await file.text());
  const profile = { ...parsed };
  if (!Array.isArray(profile.answerBank)) profile.answerBank = [];
  if (!Array.isArray(profile.experience)) profile.experience = [];
  if (!Array.isArray(profile.education)) profile.education = [];
  if (!Array.isArray(profile.certifications)) profile.certifications = [];
  await chrome.storage.local.set({ profile });
  await load();
  setStatus("Profile JSON imported. Structured history was loaded; resume files were not changed.", true);
}

async function exportProfile() {
  const profile = await buildProfileFromForm();
  const blob = new Blob([JSON.stringify(profile, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "job-cannon-profile.json";
  anchor.click();
  URL.revokeObjectURL(url);
}

document.getElementById("saveButton").addEventListener("click", () => void save().catch((error) => setStatus(error.message || String(error))));
document.getElementById("exportButton").addEventListener("click", () => void exportProfile().catch((error) => setStatus(error.message || String(error))));
document.getElementById("profileFile").addEventListener("change", (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  void importProfile(file).catch((error) => setStatus(`Import failed: ${error.message || String(error)}`));
});
document.getElementById("clearResumesButton").addEventListener("click", () => {
  void chrome.storage.local.set({ resumes: {} }).then(() => {
    renderResumeNotes({});
    setStatus("Saved resume files cleared.", true);
  });
});

void load();
