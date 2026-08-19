import { leadNeonQuery, neonRowsToObjects } from "@/lib/leads/neon";

export const BRAVE_MONTHLY_REQUEST_LIMIT = 900;

export async function reserveMonthlyApiUsage(service: string, amount: number, limit: number) {
  const requested = Math.max(0, Math.floor(amount));
  if (!requested) return { allowed: true, used: 0, limit };
  const result = await leadNeonQuery(
    `INSERT INTO public.lead_api_usage (service, period_start, request_count, updated_at)
     VALUES ($1, date_trunc('month', current_date)::date, $2::int, now())
     ON CONFLICT (service, period_start) DO UPDATE SET
       request_count = public.lead_api_usage.request_count + EXCLUDED.request_count,
       updated_at = now()
     WHERE public.lead_api_usage.request_count + EXCLUDED.request_count <= $3::int
     RETURNING request_count::text`,
    [service, String(requested), String(limit)],
  );
  const row = neonRowsToObjects(result)[0];
  return {
    allowed: Boolean(row),
    used: Number(row?.request_count ?? 0),
    limit,
  };
}
