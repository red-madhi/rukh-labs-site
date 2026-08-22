import Link from "next/link";
import { leadNeonQuery, neonRowsToObjects } from "@/lib/leads/neon";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function getPartnerProspects() {
  const result = await leadNeonQuery(`
    SELECT
      id::text,
      COALESCE(company_name, '') AS company_name,
      COALESCE(summary, '') AS summary,
      COALESCE(website_url, '') AS website_url,
      COALESCE(contact_email, '') AS contact_email,
      COALESCE(score, 0)::int AS score
    FROM public.lead_opportunities
    WHERE archived_at IS NULL
      AND source = 'power-bi'
      AND (
        COALESCE(tags, '[]'::jsonb)::text ~* '(partner|white-label|consult|msp|implementation|fractional-cfo|bookkeep|integrator)'
        OR COALESCE(signals, '[]'::jsonb)::text ~* '(consultancy|managed IT|implementation firm|Microsoft partner|ERP|HRIS|CRM|fractional CFO|bookkeeping|systems integrator)'
        OR COALESCE(summary, '') ~* '(consultancy|managed IT|implementation firm|Microsoft partner|ERP|HRIS|CRM|fractional CFO|bookkeeping|systems integrator)'
      )
    ORDER BY score DESC, discovered_at DESC
    LIMIT 100
  `);

  return neonRowsToObjects(result);
}

export default async function PartnerProspectsPage() {
  const rows = await getPartnerProspects();

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-300">
            Channel acquisition
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-white">
            Partner Prospects
          </h1>
          <p className="mt-3 max-w-3xl text-slate-400">
            Microsoft, Power BI, MSP, ERP, HRIS, CRM, finance, and operations
            firms get a separate white-label pitch and separate results.
          </p>
        </div>
        <Link
          href="/leads/outreach/safety"
          className="rounded-xl border border-white/10 px-4 py-2 text-sm text-white"
        >
          Outreach safety
        </Link>
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        {rows.map((row) => (
          <article
            key={String(row.id)}
            className="rounded-2xl border border-white/10 bg-white/[0.035] p-5"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-white">
                  {String(row.company_name || "Unknown company")}
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Lead {String(row.id)}
                </p>
              </div>
              <span className="rounded-full bg-violet-300/10 px-3 py-1 text-xs text-violet-100">
                Score {Number(row.score) || 0}
              </span>
            </div>

            <p className="mt-4 text-sm leading-6 text-slate-400">
              {String(row.summary || "")}
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              {row.website_url ? (
                <a
                  href={String(row.website_url)}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-slate-200"
                >
                  Website
                </a>
              ) : null}
              {row.contact_email ? (
                <span className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-slate-400">
                  {String(row.contact_email)}
                </span>
              ) : null}
            </div>
          </article>
        ))}
      </div>

      {!rows.length ? (
        <div className="mt-8 rounded-2xl border border-dashed border-white/10 p-10 text-center text-sm text-slate-400">
          No partner prospects are tagged yet. The next crawler pass can score
          partner signals into this feed.
        </div>
      ) : null}
    </main>
  );
}
