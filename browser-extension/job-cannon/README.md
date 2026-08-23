# Job Cannon Autofill

A user-triggered Manifest V3 browser extension for reducing repetitive ATS form entry.

## Install locally

1. Download or clone the Rukh Labs repository.
2. Open `chrome://extensions` or `edge://extensions`.
3. Enable **Developer mode**.
4. Choose **Load unpacked**.
5. Select `browser-extension/job-cannon`.
6. Open the extension's **Options** page.
7. Import the profile JSON exported by `/job-cannon` and upload one or more resume variants.
8. Open a job application page, click Job Cannon, then choose **Fill this page**.
9. Review every answer and submit the application yourself.

## Guardrails

Job Cannon intentionally does not:

- bypass CAPTCHA or anti-bot controls;
- click a final Submit / Apply button;
- answer demographic or EEO questions;
- answer disability or veteran self-identification questions;
- accept legal attestations, consent checkboxes, or electronic signatures;
- fabricate qualifications or application answers.

The extension uses `activeTab` and injects only after the user clicks it. Profile and resume data are stored in local browser extension storage.
