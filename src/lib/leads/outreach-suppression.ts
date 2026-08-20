import { extractEmailAddresses, selectPrimaryEmail } from "@/lib/leads/contact-values";
import { leadNeonQuery, neonRowsToObjects } from "@/lib/leads/neon";

export async function assertLeadEmailSendable(leadId: string) {
  const [leadResult, bouncedResult] = await Promise.all([
    leadNeonQuery(
      `SELECT contact_email, website_url
       FROM public.lead_opportunities
       WHERE id = $1::uuid
         AND archived_at IS NULL`,
      [leadId],
    ),
    leadNeonQuery(
      `SELECT COALESCE(raw_payload->'outreach'->>'recipientEmail', contact_email) AS recipient_email
       FROM public.lead_opportunities
       WHERE archived_at IS NULL
         AND contact_email IS NOT NULL
         AND (
           COALESCE(raw_payload->'outreach'->>'state', '') = 'bounced'
           OR COALESCE(raw_payload->'outreach'->>'emailSuppressed', 'false') = 'true'
           OR raw_payload->'outreach'->>'lastBounceAt' IS NOT NULL
         )`,
    ),
  ]);

  const row = neonRowsToObjects(leadResult)[0];
  if (!row) throw new Error("Lead was not found.");

  const email = selectPrimaryEmail(row.contact_email, row.website_url);
  if (!email) throw new Error("This lead does not have a valid email address.");

  const suppressedEmails = new Set(
    neonRowsToObjects(bouncedResult).flatMap((item) => extractEmailAddresses(item.recipient_email)),
  );
  if (suppressedEmails.has(email)) {
    throw new Error(`Delivery is suppressed for ${email} because that address previously bounced. No email was sent.`);
  }

  return { email, suppressed: false };
}
