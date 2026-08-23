const profileStatus = document.getElementById("profileStatus");
const result = document.getElementById("result");
const fillButton = document.getElementById("fillButton");
const scanButton = document.getElementById("scanButton");
const learnButton = document.getElementById("learnButton");
const optionsButton = document.getElementById("optionsButton");

async function getState() {
  return chrome.storage.local.get(["profile", "resumes"]);
}

function atsLabel(value) {
  if (!value) return "Generic";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

async function refreshProfileStatus() {
  const { profile, resumes } = await getState();
  const required = [profile?.firstName, profile?.lastName, profile?.email, profile?.phone];
  const complete = required.filter(Boolean).length;
  const resumeCount = Object.values(resumes || {}).filter((item) => item?.base64).length;
  const experienceCount = Array.isArray(profile?.experience) ? profile.experience.length : 0;
  const educationCount = Array.isArray(profile?.education) ? profile.education.length : 0;
  const learnedCount = Array.isArray(profile?.answerBank) ? profile.answerBank.filter((item) => item?.source === "learned").length : 0;
  profileStatus.className = complete >= 3 ? "status good" : "status";
  profileStatus.textContent = `${complete}/4 contact · ${experienceCount} jobs · ${educationCount} education · ${learnedCount} learned answers · ${resumeCount} resumes`;
}

async function activeTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) throw new Error("No active tab found.");
  if (!/^https?:/i.test(tab.url || "")) throw new Error("Open a normal web application page first.");
  return tab;
}

async function run(action) {
  fillButton.disabled = true;
  scanButton.disabled = true;
  learnButton.disabled = true;
  result.className = "status";
  result.textContent = action === "fill" ? "Filling routine and structured fields…" : action === "learn" ? "Learning safe answers already entered on this page…" : "Scanning visible fields…";
  try {
    const tab = await activeTab();
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ["content.js"] });
    const response = await chrome.tabs.sendMessage(tab.id, { type: "JOB_CANNON_ACTION", action });
    if (!response?.ok) throw new Error(response?.error || "The page did not return a result.");
    result.className = "status good";
    const ats = atsLabel(response.ats);
    if (action === "fill") {
      result.textContent = `${ats} adapter · filled ${response.filled} · unknown ${response.unknown} · protected ${response.protected} · resume ${response.resumeFilled ? "attached" : "not attached"} (${response.recommendedResume || "none"}). Review before submitting.`;
    } else if (action === "learn") {
      result.textContent = `${ats} adapter · learned ${response.learned} safe answer${response.learned === 1 ? "" : "s"}${response.questions?.length ? `: ${response.questions.slice(0, 3).join(" · ")}` : ""}.`;
      await refreshProfileStatus();
    } else {
      result.textContent = `${ats} adapter · ${response.fillable} recognized · ${response.unknown} unknown · ${response.protected} protected · recommended resume: ${response.recommendedResume || "none"}.`;
    }
  } catch (error) {
    result.className = "status";
    result.textContent = error instanceof Error ? error.message : String(error);
  } finally {
    fillButton.disabled = false;
    scanButton.disabled = false;
    learnButton.disabled = false;
  }
}

fillButton.addEventListener("click", () => void run("fill"));
scanButton.addEventListener("click", () => void run("scan"));
learnButton.addEventListener("click", () => void run("learn"));
optionsButton.addEventListener("click", () => chrome.runtime.openOptionsPage());
void refreshProfileStatus();
