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

  function normalize(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function visible(element) {
    if (!(element instanceof HTMLElement)) return false;
    const style = getComputedStyle(element);
    if (style.visibility === "hidden" || style.display === "none") return false;
    const rect = element.getBoundingClientRect();
    return rect.width > 0 || rect.height > 0;
  }

  function explicitLabel(element) {
    if (element.id) {
      try {
        const label = document.querySelector(`label[for="${CSS.escape(element.id)}"]`);
        if (label) return normalize(label.innerText || label.textContent);
      } catch {}
    }
    const wrapping = element.closest("label");
    if (wrapping) return normalize(wrapping.innerText || wrapping.textContent);
    return "";
  }

  function nearbyText(element) {
    const parts = [
      explicitLabel(element),
      element.getAttribute("aria-label"),
      element.getAttribute("placeholder"),
      element.getAttribute("name"),
      element.getAttribute("id"),
      element.getAttribute("data-automation-id"),
    ];
    let parent = element.parentElement;
    for (let depth = 0; depth < 3 && parent; depth += 1, parent = parent.parentElement) {
      const legend = parent.querySelector(":scope > legend");
      const heading = parent.querySelector(":scope > label, :scope > [role='label'], :scope > p, :scope > span");
      if (legend) parts.push(legend.textContent);
      else if (heading && !heading.contains(element)) parts.push(heading.textContent);
    }
    return normalize(parts.filter(Boolean).join(" | ")).slice(0, 900);
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
        if (new RegExp(pattern, "i").test(question)) return answer;
      } catch {
        if (question.toLowerCase().includes(pattern.toLowerCase())) return answer;
      }
    }
    return "";
  }

  function answerFor(question, profile) {
    if (!question || protectedQuestion(question)) return { answer: "", key: "", protected: true };
    const custom = customAnswer(question, profile);
    if (custom) return { answer: custom, key: "custom", protected: false };
    for (const rule of BASE_RULES) {
      if (!rule.pattern.test(question)) continue;
      const answer = normalize(profile?.[rule.key]);
      return { answer, key: rule.key, protected: false };
    }
    return { answer: "", key: "", protected: false };
  }

  function nativeSetter(element, value) {
    if (element instanceof HTMLTextAreaElement) {
      const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set;
      if (setter) setter.call(element, value); else element.value = value;
    } else if (element instanceof HTMLInputElement) {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
      if (setter) setter.call(element, value); else element.value = value;
    } else {
      element.value = value;
    }
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
    element.dispatchEvent(new Event("blur", { bubbles: true }));
  }

  function fillText(element, answer) {
    if (normalize(element.value)) return false;
    nativeSetter(element, answer);
    return normalize(element.value) === normalize(answer) || Boolean(answer);
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
    try {
      group = Array.from(document.querySelectorAll(`input[type="radio"][name="${CSS.escape(name)}"]`));
    } catch {
      group = [radio];
    }
    if (group.some((item) => item.checked)) return false;
    const desired = normalizedChoice(answer);
    const target = group.find((item) => normalizedChoice(radioLabel(item)) === desired)
      || group.find((item) => normalizedChoice(radioLabel(item)).includes(desired));
    if (!target) return false;
    target.click();
    return target.checked;
  }

  function bytesFromBase64(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
    return bytes;
  }

  function chooseResume(resumes) {
    const text = normalize(document.body?.innerText).toLowerCase();
    if (/\b(power bi|\bdax\b|power query|microsoft fabric|semantic model)\b/i.test(text) && resumes?.powerBi?.base64) return resumes.powerBi;
    if (/\b(data engineer|analytics engineer|etl|elt|data pipeline|dbt|snowflake|databricks)\b/i.test(text) && resumes?.dataOps?.base64) return resumes.dataOps;
    if (resumes?.analytics?.base64) return resumes.analytics;
    if (resumes?.powerBi?.base64) return resumes.powerBi;
    if (resumes?.dataOps?.base64) return resumes.dataOps;
    return null;
  }

  function fillResumeInputs(resumes) {
    const resume = chooseResume(resumes);
    if (!resume?.base64) return false;
    const inputs = Array.from(document.querySelectorAll('input[type="file"]'));
    let filled = false;
    for (const input of inputs) {
      const question = nearbyText(input);
      const accept = normalize(input.getAttribute("accept"));
      if (!RESUME.test(question) && !/pdf|doc|application/i.test(accept)) continue;
      try {
        const file = new File([bytesFromBase64(resume.base64)], resume.name || "resume.pdf", { type: resume.type || "application/pdf" });
        const transfer = new DataTransfer();
        transfer.items.add(file);
        input.files = transfer.files;
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.dispatchEvent(new Event("change", { bubbles: true }));
        filled = true;
      } catch {}
    }
    return filled;
  }

  function fieldInventory(profile) {
    const controls = Array.from(document.querySelectorAll("input, textarea, select"));
    const seenRadioGroups = new Set();
    let fillable = 0;
    let unknown = 0;
    let protectedCount = 0;
    let skipped = 0;
    for (const element of controls) {
      if (element.disabled) { skipped += 1; continue; }
      const type = String(element.getAttribute("type") || "").toLowerCase();
      if (["submit", "button", "reset", "image", "hidden", "file"].includes(type)) { skipped += 1; continue; }
      if (type === "checkbox") { skipped += 1; continue; }
      if (type === "radio" && element.name) {
        if (seenRadioGroups.has(element.name)) continue;
        seenRadioGroups.add(element.name);
      }
      if (!visible(element) && type !== "radio") { skipped += 1; continue; }
      const question = nearbyText(element);
      const resolution = answerFor(question, profile);
      if (resolution.protected) { protectedCount += 1; continue; }
      if (resolution.answer) fillable += 1;
      else unknown += 1;
    }
    return { fillable, unknown, protected: protectedCount, skipped };
  }

  async function fillPage(profile, resumes) {
    const controls = Array.from(document.querySelectorAll("input, textarea, select"));
    const handledRadioGroups = new Set();
    let filled = 0;
    let skipped = 0;
    let unknown = 0;
    let protectedCount = 0;

    for (const element of controls) {
      if (element.disabled) { skipped += 1; continue; }
      const type = String(element.getAttribute("type") || "").toLowerCase();
      if (["submit", "button", "reset", "image", "hidden", "file"].includes(type)) { skipped += 1; continue; }
      if (type === "checkbox") { skipped += 1; continue; }
      if (type === "radio" && element.name) {
        if (handledRadioGroups.has(element.name)) continue;
        handledRadioGroups.add(element.name);
      }
      if (!visible(element) && type !== "radio") { skipped += 1; continue; }
      const question = nearbyText(element);
      const resolution = answerFor(question, profile);
      if (resolution.protected) { protectedCount += 1; continue; }
      if (!resolution.answer) { unknown += 1; continue; }

      let changed = false;
      if (element instanceof HTMLSelectElement) changed = fillSelect(element, resolution.answer);
      else if (element instanceof HTMLInputElement && type === "radio") changed = fillRadioGroup(element, resolution.answer);
      else if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) changed = fillText(element, resolution.answer);
      if (changed) filled += 1; else skipped += 1;
    }

    const resumeFilled = fillResumeInputs(resumes);
    return { filled, skipped, unknown, protected: protectedCount, resumeFilled };
  }

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type !== "JOB_CANNON_ACTION") return undefined;
    (async () => {
      try {
        const { profile = {}, resumes = {} } = await chrome.storage.local.get(["profile", "resumes"]);
        if (message.action === "scan") {
          sendResponse({ ok: true, ...fieldInventory(profile) });
          return;
        }
        if (message.action === "fill") {
          sendResponse({ ok: true, ...(await fillPage(profile, resumes)) });
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
