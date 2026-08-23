const profileStatus = document.getElementById("profileStatus");
const result = document.getElementById("result");
const fillButton = document.getElementById("fillButton");
const scanButton = document.getElementById("scanButton");
const optionsButton = document.getElementById("optionsButton");

async function getState() {
  return chrome.storage.local.get(["profile", "resumes"]);
}

async function refreshProfileStatus() {
  const { profile, resumes } = await getState();
  const required = [profile?.firstName, profile?.lastName, profile?.email, profile?.phone];
  const complete = required.filter(Boolean).length;
  const resumeCount = Object.values(resumes || {}).filter((item) => item?.base64).length;
  profileStatus.className = complete >= 3 ? "status good" : "status";
  profileStatus.textContent = `${complete}/4 core contact fields ready · ${resumeCount} resume variant${resumeCount === 1 ? "" : "s"} loaded`;
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
  result.className = "status";
  result.textContent = action === "fill" ? "Filling routine fields…" : "Scanning visible fields…";
  try {
    const tab = await activeTab();
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ["content.js"] });
    const response = await chrome.tabs.sendMessage(tab.id, { type: "JOB_CANNON_ACTION", action });
    if (!response?.ok) throw new Error(response?.error || "The page did not return a result.");
    result.className = "status good";
    if (action === "fill") {
      result.textContent = `Filled ${response.filled} · skipped ${response.skipped} · unknown ${response.unknown} · resume ${response.resumeFilled ? "attached" : "not attached"}. Review before submitting.`;
    } else {
      result.textContent = `${response.fillable} routine fields recognized · ${response.unknown} unknown · ${response.protected} protected/attestation fields intentionally ignored.`;
    }
  } catch (error) {
    result.className = "status";
    result.textContent = error instanceof Error ? error.message : String(error);
  } finally {
    fillButton.disabled = false;
    scanButton.disabled = false;
  }
}

fillButton.addEventListener("click", () => void run("fill"));
scanButton.addEventListener("click", () => void run("scan"));
optionsButton.addEventListener("click", () => chrome.runtime.openOptionsPage());
void refreshProfileStatus();
