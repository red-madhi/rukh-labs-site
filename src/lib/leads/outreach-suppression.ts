import { leadNeonQuery, neonRowsToObjects } from "@/lib/leads/neon";

function normalizeEmail(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export async function assertLeadEmailSendable(leadId: string) {
  const result = await leadNeonQuery(
    `SELECT
       l.contact_email,
       EXISTS (
         SELECT 1
         FROM public.lead_opportunities bounced
         WHERE bounced.archived_at IS NULL
           AND bounced.contact_email IS NOT NULL
           AND lower(trim(bounced.contact_email)) = lower(trim(l.contact_email))
           AND (
             COALESCE(bounced.raw_payload->'outreach'->>'state', '') = 'bounced'
             OR COALESCE(bounced.raw_payload->'outreach'->>'emailSuppressed', 'false') = 'true'
             OR bounced.raw_payload->'outreach'->>'lastBounceAt' IS NOT NULL
           )
       ) AS suppressed
     FROM public.lead_opportunities l
     WHERE l.id = $1::uuid
       AND l.archived_at IS NULL`,
    [leadId],
  );

  const row = neonRowsToObjects(result)[0];
  if (!row) throw new Error("Lead was not found.");

  const email = normalizeEmail(row.contact_email);
  if (!email) throw new Error("This lead does not have a valid email address.");
  if (row.suppressed === "true" || row.suppressed === "t" || row.suppressed === "1") {
    throw new Error(`Delivery is suppressed for ${email} because that address previously bounced. No email was sent.`);
  }

  return { email, suppressed: false };
}
