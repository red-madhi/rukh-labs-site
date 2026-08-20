import fs from "node:fs";

function read(path) {
  return fs.readFileSync(path, "utf8");
}

function write(path, content) {
  fs.writeFileSync(path, content);
}

function replaceOnce(content, from, to, label) {
  if (!content.includes(from)) throw new Error(`Could not find ${label}`);
  return content.replace(from, to);
}

function patchCrawl() {
  const path = "src/lib/leads/crawl.ts";
  let content = read(path);
  content = replaceOnce(
    content,
    'import { leadNeonQuery, neonRowsToObjects } from "@/lib/leads/neon";\n',
    'import { contactValueMetadata, selectPrimaryWebsite } from "@/lib/leads/contact-values";\nimport { leadNeonQuery, neonRowsToObjects } from "@/lib/leads/neon";\n',
    "crawl contact-value import",
  );
  content = replaceOnce(
    content,
    `export function normalizeWebsiteUrl(value?: string | null) {\n  const raw = cleanText(value, 500);\n  if (!raw) return null;\n  const withProtocol = /^https?:\\/\\//i.test(raw) ? raw : \`https://\${raw}\`;\n  try {\n    const parsed = new URL(withProtocol);\n    if (!["http:", "https:"].includes(parsed.protocol)) return null;\n    parsed.hash = "";\n    return parsed.toString();\n  } catch {\n    return null;\n  }\n}\n`,
    `export function normalizeWebsiteUrl(value?: string | null) {\n  return selectPrimaryWebsite(value);\n}\n`,
    "website normalizer",
  );
  const oldMap = `  const normalized = candidates\n    .map((candidate) => ({\n      source: cleanText(candidate.source, 80),\n      source_key: cleanText(candidate.sourceKey, 300),\n      organization_name: cleanText(candidate.organizationName, 260),\n      alternate_name: cleanText(candidate.alternateName, 260) || null,\n      category: cleanText(candidate.category, 160) || null,\n      address_line1: cleanText(candidate.addressLine1, 220) || null,\n      city: cleanText(candidate.city, 120) || null,\n      state: cleanText(candidate.state, 80) || null,\n      postal_code: cleanText(candidate.postalCode, 24) || null,\n      country_code: cleanText(candidate.countryCode, 3).toUpperCase() || "US",\n      contact_name: cleanText(candidate.contactName, 180) || null,\n      phone: cleanText(candidate.phone, 60) || null,\n      email: cleanText(candidate.email, 220).toLowerCase() || null,\n      website_url: normalizeWebsiteUrl(candidate.websiteUrl),\n      source_url: normalizeWebsiteUrl(candidate.sourceUrl),\n      formed_at: candidate.formedAt || null,\n      priority_seed: clamp(candidate.prioritySeed ?? 0),\n      metadata: candidate.metadata ?? {},\n    }))\n`;
  const newMap = `  const normalized = candidates\n    .map((candidate) => {\n      const contactValues = contactValueMetadata(candidate.email, candidate.websiteUrl);\n      return {\n        source: cleanText(candidate.source, 80),\n        source_key: cleanText(candidate.sourceKey, 300),\n        organization_name: cleanText(candidate.organizationName, 260),\n        alternate_name: cleanText(candidate.alternateName, 260) || null,\n        category: cleanText(candidate.category, 160) || null,\n        address_line1: cleanText(candidate.addressLine1, 220) || null,\n        city: cleanText(candidate.city, 120) || null,\n        state: cleanText(candidate.state, 80) || null,\n        postal_code: cleanText(candidate.postalCode, 24) || null,\n        country_code: cleanText(candidate.countryCode, 3).toUpperCase() || "US",\n        contact_name: cleanText(candidate.contactName, 180) || null,\n        phone: cleanText(candidate.phone, 60) || null,\n        email: contactValues.primaryEmail,\n        website_url: contactValues.primaryWebsite,\n        source_url: normalizeWebsiteUrl(candidate.sourceUrl),\n        formed_at: candidate.formedAt || null,\n        priority_seed: clamp(candidate.prioritySeed ?? 0),\n        metadata: {\n          ...(candidate.metadata ?? {}),\n          ...(contactValues.emailCandidates.length > 1\n            ? {\n                contactEmailCandidates: contactValues.emailCandidates,\n                alternateContactEmails: contactValues.alternateContactEmails,\n              }\n            : {}),\n          ...(contactValues.websiteCandidates.length > 1\n            ? {\n                websiteCandidates: contactValues.websiteCandidates,\n                alternateWebsiteUrls: contactValues.alternateWebsiteUrls,\n              }\n            : {}),\n        },\n      };\n    })\n`;
  content = replaceOnce(content, oldMap, newMap, "candidate normalization map");
  write(path, content);
}

function patchLeadApi() {
  const path = "src/app/api/leads/route.ts";
  let content = read(path);
  content = replaceOnce(
    content,
    'import { cleanText, crawlStats } from "@/lib/leads/crawl";\n',
    'import { selectPrimaryEmail } from "@/lib/leads/contact-values";\nimport { cleanText, crawlStats } from "@/lib/leads/crawl";\n',
    "lead API contact-value import",
  );
  content = replaceOnce(
    content,
    '    contactEmail: row.contact_email || undefined,\n',
    '    contactEmail: selectPrimaryEmail(row.contact_email, row.website_url) || undefined,\n',
    "lead API primary email",
  );
  write(path, content);
}

function patchEmailOutreach() {
  const path = "src/lib/leads/email-outreach.ts";
  let content = read(path);
  content = replaceOnce(
    content,
    'import { leadNeonQuery, neonRowsToObjects } from "@/lib/leads/neon";\n',
    'import { selectPrimaryEmail } from "@/lib/leads/contact-values";\nimport { leadNeonQuery, neonRowsToObjects } from "@/lib/leads/neon";\n',
    "email outreach contact-value import",
  );
  content = replaceOnce(
    content,
    `function normalizeEmail(value: unknown) {\n  const email = clean(value, 320).toLowerCase();\n  return /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email) ? email : "";\n}\n\n`,
    "",
    "legacy email normalizer",
  );
  content = replaceOnce(
    content,
    `    \`SELECT contact_email, COALESCE(raw_payload->'outreach', '{}'::jsonb)::text AS outreach\n     FROM public.lead_opportunities WHERE id = $1::uuid AND archived_at IS NULL\`,\n`,
    `    \`SELECT contact_email, website_url, COALESCE(raw_payload->'outreach', '{}'::jsonb)::text AS outreach\n     FROM public.lead_opportunities WHERE id = $1::uuid AND archived_at IS NULL\`,\n`,
    "draft query website",
  );
  content = replaceOnce(
    content,
    `    \`SELECT contact_email, status, COALESCE(raw_payload->'outreach', '{}'::jsonb)::text AS outreach\n     FROM public.lead_opportunities WHERE id = $1::uuid AND archived_at IS NULL\`,\n`,
    `    \`SELECT contact_email, website_url, status, COALESCE(raw_payload->'outreach', '{}'::jsonb)::text AS outreach\n     FROM public.lead_opportunities WHERE id = $1::uuid AND archived_at IS NULL\`,\n`,
    "send query website",
  );
  const oldRecipient = "  const recipientEmail = normalizeEmail(row.contact_email);\n";
  const newRecipient = "  const recipientEmail = selectPrimaryEmail(row.contact_email, row.website_url);\n";
  if (content.split(oldRecipient).length - 1 !== 2) throw new Error("Expected two outreach recipient normalizers");
  content = content.split(oldRecipient).join(newRecipient);
  write(path, content);
}

function patchSuppression() {
  const path = "src/lib/leads/outreach-suppression.ts";
  const content = `import { extractEmailAddresses, selectPrimaryEmail } from "@/lib/leads/contact-values";\nimport { leadNeonQuery, neonRowsToObjects } from "@/lib/leads/neon";\n\nexport async function assertLeadEmailSendable(leadId: string) {\n  const [leadResult, bouncedResult] = await Promise.all([\n    leadNeonQuery(\n      \`SELECT contact_email, website_url\n       FROM public.lead_opportunities\n       WHERE id = $1::uuid\n         AND archived_at IS NULL\`,\n      [leadId],\n    ),\n    leadNeonQuery(\n      \`SELECT COALESCE(raw_payload->'outreach'->>'recipientEmail', contact_email) AS recipient_email\n       FROM public.lead_opportunities\n       WHERE archived_at IS NULL\n         AND contact_email IS NOT NULL\n         AND (\n           COALESCE(raw_payload->'outreach'->>'state', '') = 'bounced'\n           OR COALESCE(raw_payload->'outreach'->>'emailSuppressed', 'false') = 'true'\n           OR raw_payload->'outreach'->>'lastBounceAt' IS NOT NULL\n         )\`,\n    ),\n  ]);\n\n  const row = neonRowsToObjects(leadResult)[0];\n  if (!row) throw new Error("Lead was not found.");\n\n  const email = selectPrimaryEmail(row.contact_email, row.website_url);\n  if (!email) throw new Error("This lead does not have a valid email address.");\n\n  const suppressedEmails = new Set(\n    neonRowsToObjects(bouncedResult).flatMap((item) => extractEmailAddresses(item.recipient_email)),\n  );\n  if (suppressedEmails.has(email)) {\n    throw new Error(\`Delivery is suppressed for \${email} because that address previously bounced. No email was sent.\`);\n  }\n\n  return { email, suppressed: false };\n}\n`;
  write(path, content);
}

patchCrawl();
patchLeadApi();
patchEmailOutreach();
patchSuppression();
console.log("Applied multi-contact normalization patches.");
