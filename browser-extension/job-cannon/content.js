(() => {
  if (window.__JOB_CANNON_AUTOFILL_LOADED__) return;
  window.__JOB_CANNON_AUTOFILL_LOADED__ = true;

  const PROTECTED = /\b(gender|sex assigned|race|racial|ethnic|ethnicity|veteran|disability|disabled|pronouns?|sexual orientation|religion|religious|marital status|date of birth|birth date|\bdob\b|self[- ]identify|demographic)\b/i;
  const ATTESTATION = /\b(certify|attest|electronic signature|signature|terms and conditions|privacy policy|consent|acknowledge|i understand|agree to|agreement|truthful and complete|legally binding)\b/i;
  const HIGH_RISK = /\b(social security|ssn|taxpayer|bank account|routing number|credit card|passport number|driver'?s license number)\b/i;
  const CAPTCHA = /captcha|recaptcha|hcaptcha|human verification/i;
  const RESUME = /\b(resume|résumé|cv|curriculum vitae)\b/i;

  const BASE_RULES = [
    { key: "firstName", pattern: /\b(first|given)\s*name\b/i },
    { key: "lastName", pattern: /\b(last|family|surname)\s*name\b|\bsurname\b/i },
    { key: "email", pattern: /\be[- ]?mail\b/i },
    { key: "phone", pattern: /\b(phone|mobile|telephone|cell)\b/i },
    { key: "address1", pattern: /\b(street address|address line ?1|address 1|home address|mailing address)\b/i },
    { key: "city", pattern: /\bcity\b/i },
    { key: "state", pattern: /\b(state|province|region)\b/i },
    { key: "postalCode", pattern: /\b(zip|postal)\s*(code)?\b/i },
    { key: "country", pattern: /\bcountry\b/i },
    { key: "linkedin", pattern: /linkedin/i },
    { key: "github", pattern: /github/i },
    { key: "portfolio", pattern: /\b(portfolio|personal website|website url|personal site)\b/i },
    { key: "salaryExpectation", pattern: /\b(salary|compensation|desired pay|pay expectation|expected pay|expected compensation)\b/i },
    { key: "workAuthorized", pattern: /\b(authorized to work|legally authorized|work authorization|right to work|eligible to work)\b/i },
    { key: "needsSponsorship", pattern: /\b(sponsor|sponsorship|visa support|immigration sponsorship)\b/i },
    { key: "willingToRelocate", pattern: /\b(relocate|relocation)\b/i },
    { key: "willingToTravel", pattern: /\b(willing to travel|travel requirement|travel up to)\b/i },
    { key: "sourceAnswer", pattern: /\b(how did you hear|how you heard|source of application|referred by)\b/i },
  ];

  const EXPERIENCE_PATTERNS = {
    company: /\b(employer|company|organization)\b/i,
    title: /\b(job title|position title|role title|title)\b/i,
    location: /\b(work location|job location|location)\b/i,
    startDate: /\b(start date|date started|from date)\b/i,
    endDate: /\b(end date|date ended|to date)\b/i,
    startMonth: /\b(start|from).*\bmonth\b|\bmonth.*(start|from)\b/i,
    startYear: /\b(start|from).*\byear\b|\byear.*(start|from)\b/i,
    endMonth: /\b(end|to).*\bmonth\b|\bmonth.*(end|to)\b/i,
    endYear: /\b(end|to).*\byear\b|\byear.*(end|to)\b/i,
  };

  const EDUCATION_PATTERNS = {
    school: /\b(school|university|college|institution)\b/i,
    degree: /\bdegree|qualification\b/i,
    field: /\b(field of study|major|discipline)\b/i,
    location: /\b(school location|education location)\b/i,
    startDate: /\b(education start date|school start date)\b/i,
    endDate: /\b(graduation date|education end date|school end date)\b/i,
    startMonth: /\b(education|school).*\bstart.*month\b/i,
    startYear: /\b(education|school).*\bstart.*year\b/i,
    endMonth: /\b(graduation|education|school).*\b(month|end month)\b/i,
    endYear: /\b(graduation|education|school).*\b(year|end year)\b/i,
  };

  const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  function normalize(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function detectATS() {
    const host = location.hostname.toLowerCase();
    if (host.includes("myworkdayjobs.com") || host.includes("workday.com")) return "workday";
    if (host.includes("greenhouse.io")) return "greenhouse";
    if (host.includes("lever.co")) return "lever";
    if (host.includes("ashbyhq.com")) return "ashby";
    if (host.includes("smartrecruiters.com")) return "smartrecruiters";
    if (host.includes("jobvite.com")) return "jobvite";
    return "generic";
  }

  function visible(element) {
    if (!(element instanceof HTMLElement)) return false;
    const style = getComputedStyle(element);
    if (style.visibility === "hidden" || style.display === "none") return false;
    const rect = element.getBoundingClientRect();
    return rect.width > 0 || rect.height > 0;
  }

  function explicitLabel(element) {
    const labelledBy = element.getAttribute?.("aria-labelledby");
    if (labelledBy) {
      const text = labelledBy.split(/\s+/).map((id) => document.getElementById(id)?.textContent || "").join(" ");
      if (normalize(text)) return normalize(text);
    }
    if (element.id) {
      try {
        const label = document.querySelector(`label[for="${CSS.escape(element.id)}"]`);
        if (label) return normalize(label.innerText || label.textContent);
      } catch {}
    }
    const wrapping = element.closest?.("label");
    if (wrapping) return normalize(wrapping.innerText || wrapping.textContent);
    return "";
  }

  function adapterContainer(element, ats) {
    const selectors = ats === "workday"
      ? ["[data-automation-id*='formField']", "[data-automation-id*='question']", "[role='group']"]
      : ats === "greenhouse"
        ? [".field", ".application-question", ".field-container"]
        : ats === "lever"
          ? [".application-field", ".custom-question", ".field"]
          : ats === "ashby"
            ? ["[class*='field']", "[class*='question']", "[role='group']"]
            : ["fieldset", "[role='group']"];
    for (const selector of selectors) {
      const container = element.closest?.(selector);
      if (container) return container;
    }
    return element.parentElement;
  }

  function nearbyText(element, ats = detectATS()) {
    const parts = [
      explicitLabel(element),
      element.getAttribute?.("aria-label"),
      element.getAttribute?.("placeholder"),
      element.getAttribute?.("name"),
      element.getAttribute?.("id"),
      element.getAttribute?.("data-automation-id"),
      element.getAttribute?.("data-qa"),
      element.getAttribute?.("data-testid"),
    ];
    const container = adapterContainer(element, ats);
    if (container && container !== element) {
      const legend = container.querySelector?.("legend");
      const label = container.querySelector?.("label, [role='label'], [data-automation-id*='label']");
      if (legend) parts.push(legend.textContent);
      if (label && !label.contains(element)) parts.push(label.textContent);
      parts.push(normalize(container.textContent).slice(0, 420));
    }
    return normalize(parts.filter(Boolean).join(" | ")).slice(0, 1100);
  }

  function protectedQuestion(question) {
    return PROTECTED.test(question) || ATTESTATION.test(question) || HIGH_RISK.test(question) || CAPTCHA.test(question);
  }

  function customAnswer(question, profile) {
    for (const item of profile?.answerBank || []) {
      const pattern = normalize(item?.pattern);
      const answer = normalize(item?.answer);
      if (!pattern || !answer) continue;
      try {
        if (new RegExp(pattern, "i").test(question)) return { answer, pattern };
      } catch {
        if (question.toLowerCase().includes(pattern.toLowerCase())) return { answer, pattern };
      }
    }
    return null;
  }

  function datePart(value, part) {
    const match = String(value || "").match(/^(\d{4})-(\d{2})/);
    if (!match) return "";
    if (part === "year") return match[1];
    if (part === "month-number") return String(Number(match[2]));
    if (part === "month-name") return MONTHS[Number(match[2]) - 1] || "";
    return `${match[1]}-${match[2]}`;
  }

  function structuredKind(question) {
    const lower = question.toLowerCase();
    const educationContext = /school|university|college|education|degree|major|field of study|graduat/.test(lower);
    const experienceContext = /employer|work experience|employment|job title|position title|company/.test(lower);
    if (educationContext && !experienceContext) return "education";
    if (experienceContext) return "experience";
    return "";
  }

  function matchingStructuredField(question, kind) {
    const patterns = kind === "education" ? EDUCATION_PATTERNS : EXPERIENCE_PATTERNS;
    return Object.entries(patterns).find(([, pattern]) => pattern.test(question))?.[0] || "";
  }

  function occurrenceIndex(element, kind, field, ats) {
    const selector = "input, textarea, select, [role='combobox'], button[aria-haspopup='listbox']";
    const candidates = Array.from(document.querySelectorAll(selector)).filter((candidate) => {
      if (!visible(candidate)) return false;
      const question = nearbyText(candidate, ats);
      return structuredKind(question) === kind && matchingStructuredField(question, kind) === field;
    });
    const index = candidates.indexOf(element);
    return index < 0 ? 0 : index;
  }

  function structuredAnswer(element, question, profile, ats) {
    const kind = structuredKind(question);
    if (!kind) return null;
    const field = matchingStructuredField(question, kind);
    if (!field) return null;
    const index = occurrenceIndex(element, kind, field, ats);
    const source = kind === "education" ? profile?.education?.[index] : profile?.experience?.[index];
    if (!source) return null;
    let answer = "";
    if (field === "company") answer = source.company;
    else if (field === "title") answer = source.title;
    else if (field === "school") answer = source.school;
    else if (field === "degree") answer = source.degree;
    else if (field === "field") answer = source.field;
    else if (field === "location") answer = source.location;
    else if (field === "startDate") answer = source.startDate;
    else if (field === "endDate") answer = source.current ? "" : source.endDate;
    else if (field === "startMonth") answer = datePart(source.startDate, element instanceof HTMLSelectElement || element.getAttribute?.("role") === "combobox" ? "month-name" : "month-number");
    else if (field === "startYear") answer = datePart(source.startDate, "year");
    else if (field === "endMonth") answer = source.current ? "" : datePart(source.endDate, element instanceof HTMLSelectElement || element.getAttribute?.("role") === "combobox" ? "month-name" : "month-number");
    else if (field === "endYear") answer = source.current ? "" : datePart(source.endDate, "year");
    return normalize(answer) ? { answer: normalize(answer), key: `${kind}.${index}.${field}`, protected: false, pattern: "" } : null;
  }

  function answerFor(element, question, profile, ats) {
    if (!question || protectedQuestion(question)) return { answer: "", key: "", protected: true, pattern: "" };
    const structured = structuredAnswer(element, question, profile, ats);
    if (structured) return structured;
    const custom = customAnswer(question, profile);
    if (custom) return { answer: custom.answer, key: "custom", protected: false, pattern: custom.pattern };
    for (const rule of BASE_RULES) {
      if (!rule.pattern.test(question)) continue;
      const answer = normalize(profile?.[rule.key]);
      return { answer, key: rule.key, protected: false, pattern: "" };
    }
    return { answer: "", key: "", protected: false, pattern: "" };
  }

  function nativeSetter(element, value) {
    if (element instanceof HTMLTextAreaElement) {
      const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set;
      if (setter) setter.call(element, value); else element.value = value;
    } else if (element instanceof HTMLInputElement) {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
      if (setter) setter.call(element, value); else element.value = value;
    } else if (element instanceof HTMLElement && element.isContentEditable) {
      element.textContent = value;
    } else {
      element.value = value;
    }
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
    element.dispatchEvent(new Event("blur", { bubbles: true }));
  }

  function fillText(element, answer) {
    if (normalize(element.value || element.textContent)) return false;
    nativeSetter(element, answer);
    return true;
  }

  function normalizedChoice(value) {
    const text = normalize(value).toLowerCase();
    if (/^(yes|y|true|authorized|eligible)$/.test(text)) return "yes";
    if (/^(no|n|false|not authorized|not eligible)$/.test(text)) return "no";
    return text;
  }

  function fillSelect(select, answer) {
    if (select.value && select.selectedIndex > 0) return false;
    const desired = normalizedChoice(answer);
    const options = Array.from(select.options);
    const option = options.find((item) => normalizedChoice(`${item.text} ${item.value}`) === desired)
      || options.find((item) => normalizedChoice(item.text).includes(desired) || desired.includes(normalizedChoice(item.text)));
    if (!option) return false;
    select.value = option.value;
    select.dispatchEvent(new Event("input", { bubbles: true }));
    select.dispatchEvent(new Event("change", { bubbles: true }));
    return true;
  }

  function radioLabel(radio) {
    return normalize(explicitLabel(radio) || radio.value || radio.getAttribute("aria-label"));
  }

  function fillRadioGroup(radio, answer) {
    const name = radio.name;
    if (!name) return false;
    let group;
    try { group = Array.from(document.querySelectorAll(`input[type="radio"][name="${CSS.escape(name)}"]`)); }
    catch { group = [radio]; }
    if (group.some((item) => item.checked)) return false;
    const desired = normalizedChoice(answer);
    const target = group.find((item) => normalizedChoice(radioLabel(item)) === desired)
      || group.find((item) => normalizedChoice(radioLabel(item)).includes(desired));
    if (!target) return false;
    target.click();
    return target.checked;
  }

  function wait(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }

  async function fillCombobox(element, answer, ats) {
    if (element instanceof HTMLInputElement && normalize(element.value)) return false;
    const currentText = normalize(element.textContent);
    if (!(element instanceof HTMLInputElement) && currentText && !/select|choose|please/i.test(currentText)) return false;
    try {
      element.click();
      if (element instanceof HTMLInputElement) {
        nativeSetter(element, answer);
        element.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
      }
      await wait(ats === "workday" ? 180 : 90);
      const desired = normalizedChoice(answer);
      const optionSelectors = [
        "[role='option']",
        "[data-automation-id*='promptOption']",
        "[data-automation-id*='selectOption']",
        "[data-qa*='option']",
        "[class*='option']",
      ];
      const options = Array.from(document.querySelectorAll(optionSelectors.join(","))).filter(visible);
      const target = options.find((option) => normalizedChoice(option.textContent) === desired)
        || options.find((option) => normalizedChoice(option.textContent).includes(desired) || desired.includes(normalizedChoice(option.textContent)));
      if (target) {
        target.click();
        await wait(40);
        return true;
      }
      if (element instanceof HTMLInputElement) {
        element.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
        return normalize(element.value) === normalize(answer);
      }
    } catch {}
    return false;
  }

  function bytesFromBase64(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
    return bytes;
  }

  function scoreResumeVariant(key, text) {
    if (key === "powerBi") return (text.match(/power bi|dax|power query|fabric|semantic model|tableau/g) || []).length * 3;
    if (key === "dataOps") return (text.match(/data engineer|analytics engineer|etl|elt|pipeline|dbt|snowflake|databricks|python/g) || []).length * 3;
    if (key === "analytics") return (text.match(/data analyst|analytics|reporting|visualization|sql|dashboard|business intelligence/g) || []).length * 2 + 1;
    return 0;
  }

  function chooseResume(resumes) {
    const text = normalize(document.body?.innerText).toLowerCase();
    return Object.entries(resumes || {})
      .filter(([, resume]) => resume?.base64)
      .map(([key, resume]) => ({ key, resume, score: scoreResumeVariant(key, text) }))
      .sort((a, b) => b.score - a.score)[0] || null;
  }

  function resumeLabel(key) {
    if (key === "powerBi") return "Power BI";
    if (key === "dataOps") return "Data ops / engineering";
    if (key === "analytics") return "Analytics";
    return key || "None";
  }

  function fillResumeInputs(resumes) {
    const choice = chooseResume(resumes);
    if (!choice?.resume?.base64) return { filled: false, recommended: "None" };
    const inputs = Array.from(document.querySelectorAll('input[type="file"]'));
    let filled = false;
    for (const input of inputs) {
      const question = nearbyText(input);
      const accept = normalize(input.getAttribute("accept"));
      if (!RESUME.test(question) && !/pdf|doc|application/i.test(accept)) continue;
      if (input.files?.length) continue;
      try {
        const resume = choice.resume;
        const file = new File([bytesFromBase64(resume.base64)], resume.name || "resume.pdf", { type: resume.type || "application/pdf" });
        const transfer = new DataTransfer();
        transfer.items.add(file);
        input.files = transfer.files;
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.dispatchEvent(new Event("change", { bubbles: true }));
        filled = true;
      } catch {}
    }
    return { filled, recommended: resumeLabel(choice.key) };
  }

  function controls() {
    const selector = "input, textarea, select, [role='combobox'], button[aria-haspopup='listbox'], [contenteditable='true']";
    const all = Array.from(document.querySelectorAll(selector));
    return all.filter((element, index) => all.indexOf(element) === index);
  }

  function shouldSkip(element) {
    if (element.disabled) return true;
    const type = String(element.getAttribute?.("type") || "").toLowerCase();
    if (["submit", "button", "reset", "image", "hidden", "file", "password"].includes(type)) return true;
    if (type === "checkbox") return true;
    if (!visible(element) && type !== "radio") return true;
    return false;
  }

  function currentValue(element) {
    if (element instanceof HTMLSelectElement) return normalize(element.selectedOptions?.[0]?.text || element.value);
    if (element instanceof HTMLInputElement && element.type === "radio") return element.checked ? radioLabel(element) : "";
    if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) return normalize(element.value);
    return normalize(element.textContent);
  }

  function fieldInventory(profile, resumes) {
    const ats = detectATS();
    const seenRadioGroups = new Set();
    const unknownQuestions = [];
    let fillable = 0;
    let unknown = 0;
    let protectedCount = 0;
    let skipped = 0;
    for (const element of controls()) {
      if (shouldSkip(element)) { skipped += 1; continue; }
      const type = String(element.getAttribute?.("type") || "").toLowerCase();
      if (type === "radio" && element.name) {
        if (seenRadioGroups.has(element.name)) continue;
        seenRadioGroups.add(element.name);
      }
      const question = nearbyText(element, ats);
      const resolution = answerFor(element, question, profile, ats);
      if (resolution.protected) { protectedCount += 1; continue; }
      if (resolution.answer) fillable += 1;
      else {
        unknown += 1;
        if (question && unknownQuestions.length < 10) unknownQuestions.push(question.slice(0, 180));
      }
    }
    const choice = chooseResume(resumes);
    return { ats, fillable, unknown, protected: protectedCount, skipped, unknownQuestions, recommendedResume: choice ? resumeLabel(choice.key) : "None" };
  }

  async function fillPage(profile, resumes) {
    const ats = detectATS();
    const handledRadioGroups = new Set();
    const usedPatterns = new Set();
    let filled = 0;
    let skipped = 0;
    let unknown = 0;
    let protectedCount = 0;

    for (const element of controls()) {
      if (shouldSkip(element)) { skipped += 1; continue; }
      const type = String(element.getAttribute?.("type") || "").toLowerCase();
      if (type === "radio" && element.name) {
        if (handledRadioGroups.has(element.name)) continue;
        handledRadioGroups.add(element.name);
      }
      const question = nearbyText(element, ats);
      const resolution = answerFor(element, question, profile, ats);
      if (resolution.protected) { protectedCount += 1; continue; }
      if (!resolution.answer) { unknown += 1; continue; }

      let changed = false;
      if (element instanceof HTMLSelectElement) changed = fillSelect(element, resolution.answer);
      else if (element instanceof HTMLInputElement && type === "radio") changed = fillRadioGroup(element, resolution.answer);
      else if (element.getAttribute?.("role") === "combobox" || element.getAttribute?.("aria-haspopup") === "listbox") changed = await fillCombobox(element, resolution.answer, ats);
      else if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement || element.isContentEditable) changed = fillText(element, resolution.answer);
      if (changed) {
        filled += 1;
        if (resolution.pattern) usedPatterns.add(resolution.pattern.toLowerCase());
      } else skipped += 1;
    }

    const resume = fillResumeInputs(resumes);
    if (usedPatterns.size) {
      const now = new Date().toISOString();
      profile.answerBank = (profile.answerBank || []).map((item) => usedPatterns.has(normalize(item.pattern).toLowerCase()) ? { ...item, uses: Number(item.uses || 0) + 1, lastUsedAt: now } : item);
      await chrome.storage.local.set({ profile });
    }
    return { ats, filled, skipped, unknown, protected: protectedCount, resumeFilled: resume.filled, recommendedResume: resume.recommended };
  }

  function escapeRegex(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function learnableQuestion(element, ats) {
    const label = explicitLabel(element) || nearbyText(element, ats).split(" | ")[0];
    return normalize(label).slice(0, 160);
  }

  async function learnPage(profile) {
    const ats = detectATS();
    const learned = [];
    const seenRadioGroups = new Set();
    const existing = [...(profile.answerBank || [])];
    for (const element of controls()) {
      if (shouldSkip(element)) continue;
      const type = String(element.getAttribute?.("type") || "").toLowerCase();
      if (type === "radio" && element.name) {
        if (seenRadioGroups.has(element.name)) continue;
        seenRadioGroups.add(element.name);
      }
      const question = nearbyText(element, ats);
      if (!question || protectedQuestion(question)) continue;
      const known = answerFor(element, question, profile, ats);
      if (known.answer) continue;
      let answer = "";
      if (type === "radio" && element.name) {
        const checked = document.querySelector(`input[type="radio"][name="${CSS.escape(element.name)}"]:checked`);
        answer = checked ? radioLabel(checked) : "";
      } else answer = currentValue(element);
      if (!answer || answer.length > 1200) continue;
      const label = learnableQuestion(element, ats);
      if (!label || label.length < 3) continue;
      const pattern = escapeRegex(label);
      const found = existing.find((item) => normalize(item.pattern).toLowerCase() === pattern.toLowerCase());
      if (found) found.answer = answer;
      else existing.push({ pattern, answer, source: "learned", uses: 0 });
      learned.push(label);
    }
    profile.answerBank = existing;
    await chrome.storage.local.set({ profile });
    return { ats, learned: learned.length, questions: learned.slice(0, 8) };
  }

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type !== "JOB_CANNON_ACTION") return undefined;
    (async () => {
      try {
        const { profile = {}, resumes = {} } = await chrome.storage.local.get(["profile", "resumes"]);
        if (message.action === "scan") {
          sendResponse({ ok: true, ...fieldInventory(profile, resumes) });
          return;
        }
        if (message.action === "fill") {
          sendResponse({ ok: true, ...(await fillPage(profile, resumes)) });
          return;
        }
        if (message.action === "learn") {
          sendResponse({ ok: true, ...(await learnPage(profile)) });
          return;
        }
        sendResponse({ ok: false, error: "Unknown Job Cannon action." });
      } catch (error) {
        sendResponse({ ok: false, error: error instanceof Error ? error.message : String(error) });
      }
    })();
    return true;
  });
})();
