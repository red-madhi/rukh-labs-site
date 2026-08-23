# Job Cannon Autofill v2

A user-triggered Manifest V3 browser extension for reducing repetitive ATS form entry while leaving final review and submission to the applicant.

## What v2 adds

- ATS detection with specialized behavior for Workday, Greenhouse, Lever, and Ashby plus generic fallback.
- Custom combobox/listbox handling for React-style ATS widgets.
- Structured work-history and education reuse from the `/job-cannon` profile JSON.
- Repeated-field indexing so multiple jobs/schools can be reused where the ATS exposes separate controls.
- Resume-variant scoring and recommendation from the current job page.
- Explicit **Learn current answers** mode. It stores only safe, non-protected answers that are already present on the page and only after the user clicks Learn.
- Usage metadata for learned/custom answers.

## Install locally

1. Download or clone the Rukh Labs repository.
2. Open `chrome://extensions` or `edge://extensions`.
3. Enable **Developer mode**.
4. Choose **Load unpacked**.
5. Select `browser-extension/job-cannon`.
6. Open the extension's **Options** page.
7. Import the profile JSON exported by `/job-cannon` and upload one or more resume variants.
8. Open a job application page and use **Scan fields** first if you want to see the detected ATS and recommended resume.
9. Choose **Fill this page** to populate supported routine/structured fields.
10. If you manually answer a safe unknown question you want reused later, choose **Learn current answers**.
11. Review every answer and submit the application yourself.

Some ATS sites require clicking their own “Add another experience” controls before repeated history fields exist. Job Cannon fills controls that are present; it does not blindly create or delete form sections.

## Guardrails

Job Cannon intentionally does not:

- bypass CAPTCHA or anti-bot controls;
- click a final Submit / Apply button;
- answer demographic or EEO questions;
- answer disability or veteran self-identification questions;
- accept legal attestations, consent checkboxes, or electronic signatures;
- fabricate qualifications or application answers.

The extension uses `activeTab` and injects only after the user clicks it. Profile and resume data are stored in local browser extension storage.
