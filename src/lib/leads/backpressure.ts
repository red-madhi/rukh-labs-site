import { leadNeonQuery, neonRowsToObjects } from "@/lib/leads/neon";

export type LeadQueuePressure = {
  domainQueue: number;
  auditQueue: number;
  qualified: number;
};

export async function getLeadQueuePressure(): Promise<LeadQueuePressure> {
  const result = await leadNeonQuery(
    `SELECT
       count(*) FILTER (
         WHERE archived_at IS NULL
           AND status IN ('domain-pending','domain-working','no-website')
       )::text AS domain_queue,
       count(*) FILTER (
         WHERE archived_at IS NULL
           AND status IN ('audit-pending','audit-working')
       )::text AS audit_queue,
       count(*) FILTER (
         WHERE archived_at IS NULL AND status = 'qualified'
       )::text AS qualified
     FROM public.lead_candidates`,
  );
  const row = neonRowsToObjects(result)[0] ?? {};
  return {
    domainQueue: Number(row.domain_queue ?? 0),
    auditQueue: Number(row.audit_queue ?? 0),
    qualified: Number(row.qualified ?? 0),
  };
}

export function blindCandidateAllowance(
  requested: number,
  pressure: LeadQueuePressure,
) {
  const desired = Math.max(0, Math.floor(requested));
  if (pressure.domainQueue >= 75_000) return Math.min(desired, 5);
  if (pressure.domainQueue >= 30_000) return Math.min(desired, 25);
  if (pressure.domainQueue >= 15_000) return Math.min(desired, 75);
  if (pressure.domainQueue >= 5_000) return Math.min(desired, 150);
  return desired;
}

export function backpressureLabel(pressure: LeadQueuePressure) {
  if (pressure.domainQueue >= 75_000) return "critical";
  if (pressure.domainQueue >= 30_000) return "heavy";
  if (pressure.domainQueue >= 15_000) return "high";
  if (pressure.domainQueue >= 5_000) return "moderate";
  return "normal";
}
