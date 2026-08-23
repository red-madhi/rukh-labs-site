const PROFILE_FIELDS = [
  "firstName", "lastName", "email", "phone", "address1", "city", "state", "postalCode", "country",
  "linkedin", "portfolio", "github", "salaryExpectation", "workAuthorized", "needsSponsorship",
  "willingToRelocate", "willingToTravel", "sourceAnswer", "skills",
];

const RESUME_INPUTS = {
  powerBi: "resumePowerBi",
  analytics: "resumeAnalytics",
  dataOps: "resumeDataOps",
};

const status = document.getElementById("status");

function setStatus(message, good = false) {
  status.className = good ? "status good" : "status";
  status.textContent = message;
}

function answerBankFromText(value) {
  return value.split("\n").map((line) => {
    const index = line.indexOf("=>");
    if (index < 1) return null;
    const pattern = line.slice(0, index).trim();
    const answer = line.slice(index + 2).trim();
    return pattern && answer ? { pattern, answer } : null;
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

async function load() {
  const { profile = {}, resumes = {} } = await chrome.storage.local.get(["profile", "resumes"]);
  for (const field of PROFILE_FIELDS) {
    const element = document.getElementById(field);
    if (element) element.value = profile[field] || (field === "country" ? "United States" : "");
  }
  document.getElementById("answerBank").value = answerBankToText(profile.answerBank);
  renderResumeNotes(resumes);
}

async function buildProfileFromForm() {
  const profile = {};
  for (const field of PROFILE_FIELDS) profile[field] = document.getElementById(field)?.value?.trim() || "";
  profile.answerBank = answerBankFromText(document.getElementById("answerBank").value || "");
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
  renderResumeNotes(resumes);
  setStatus(`Saved ${PROFILE_FIELDS.filter((field) => profile[field]).length} profile fields, ${profile.answerBank.length} custom answers, and ${Object.values(resumes).filter((item) => item?.base64).length} resume variants.`, true);
}

async function importProfile(file) {
  const parsed = JSON.parse(await file.text());
  const profile = { ...parsed };
  if (!Array.isArray(profile.answerBank)) profile.answerBank = [];
  await chrome.storage.local.set({ profile });
  await load();
  setStatus("Profile JSON imported. Resume files are stored separately and were not changed.", true);
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
