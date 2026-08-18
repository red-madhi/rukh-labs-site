import { NextRequest, NextResponse } from "next/server";
import { leadNeonQuery, neonRowsToObjects } from "@/lib/leads/neon";
import type {
  LeadCollectorState,
  LeadCollectorStatus,
  LeadOpportunity,
  LeadPriority,
  LeadSource,
  LeadStatus,
} from "@/lib/leads/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const allowedSources: LeadSource[] = ["intent", "new-business", "site-audit", "inbound", "referral"];
const allowedStatuses: LeadStatus[] = ["new", "contacted", "replied", "meeting", "proposal", "won", "lost", "ignored"];
const allowedPriorities: LeadPriority[] = ["hot", "strong", "watch"];
const allowedCollectorStatuses: LeadCollectorStatus[] = ["ready", "needs-setup", "planned", "error"];

const sourceLabels: Record<LeadSource, string> = {
  intent: "Public buying signal",
  "new-business": "New business filing",
  "site-audit": "Website audit",
  inbound: "Rukh Labs inquiry",
  referral: "Referral partner",
};

function parseJsonArray(value: string | null) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function parseAudit(value: string | null) {
  if (!value) return undefined;
  try {
    const parsed = JSON.parse(value) as LeadOpportunity["audit"];
    return parsed && typeof parsed === "object" ? parsed : undefined;
  } catch {
    return undefined;
  }
}

function toLead(row: Record<string, string | null>): LeadOpportunity {
  const source = allowedSources.includes(row.source as LeadSource) ? (row.source as LeadSource) : "site-audit";
  const status = allowedStatuses.includes(row.status as LeadStatus) ? (row.status as LeadStatus) : "new";
  const score = Number(row.score ?? 0);
  const priority = allowedPriorities.includes(row.priority as LeadPriority)
    ? (row.priority as LeadPriority)
    : score >= 85
      ? "hot"
      : score >= 70
        ? "strong"
        : "watch";

  return {
    id: row.id ?? "",
    source,
    sourceLabel: sourceLabels[source],
    sourceUrl: row.source_url || undefined,
    discoveredAt: row.discovered_at ?? new Date(0).toISOString(),
    company: row.company_name || "Unnamed prospect",
    contactName: row.contact_name || undefined,
    contactEmail: row.contact_email || undefined,
    contactPhone: row.contact_phone || undefined,
    contactUrl: row.contact_url || undefined,
    website: row.website_url || undefined,
    location: row.location || "Location not confirmed",
    industry: row.industry || "Unclassified",
    summary: row.summary || "No summary has been generated yet.",
    score,
    priority,
    status,
    signals: parseJsonArray(row.signals),
    risks: parseJsonArray(row.risks),
    tags: parseJsonArray(row.tags),
    pitch: row.pitch || "No outreach draft has been generated yet.",
    audit: parseAudit(row.audit),
    sample: false,
  };
}

function toCollector(row: Record<string, string | null>): LeadCollectorState {
  const status = allowedCollectorStatuses.includes(row.status as LeadCollectorStatus)
    ? (row.status as LeadCollectorStatus)
    : "planned";

  return {
    id: row.source_id ?? "unknown",
    name: row.name || "Unnamed collector",
    description: row.description || "No collector description is available.",
    cadence: row.cadence || "Not scheduled",
    status,
    lastRun: row.last_run_at || undefined,
    lastSuccess: row.last_success_at || undefined,
    lastItems: row.last_items === null ? undefined : Number(row.last_items),
    lastError: row.last_error || undefined,
  };
}

function privateJson(body: unknown, init?: ResponseInit) {
  const response = NextResponse.json(body, init);
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive, nosnippet");
  return response;
}

export async function GET(request: NextRequest) {
  try {
    const sourceValue = request.nextUrl.searchParams.get("source");
    const statusValue = request.nextUrl.searchParams.get("status");
    const source = allowedSources.includes(sourceValue as LeadSource) ? sourceValue : null;
    const status = allowedStatuses.includes(statusValue as LeadStatus) ? statusValue : null;
    const minimumScore = Math.min(100, Math.max(0, Number(request.nextUrl.searchParams.get("minScore") ?? 0) || 0));
    const limit = Math.min(500, Math.max(1, Number(request.nextUrl.searchParams.get("limit") ?? 250) || 250));

    const [leadResult, collectorResult] = await Promise.all([
      leadNeonQuery(
        `SELECT
          id::text,
          source,
          source_url,
          discovered_at::text,
          company_name,
          contact_name,
          contact_email,
          contact_phone,
          contact_url,
          website_url,
          location,
          industry,
          summary,
          score::text,
          priority,
          status,
          signals::text,
          risks::text,
          tags::text,
          pitch,
          audit::text
        FROM public.lead_opportunities
        WHERE archived_at IS NULL
          AND ($1::text IS NULL OR source = $1)
          AND ($2::text IS NULL OR status = $2)
          AND score >= $3::int
        ORDER BY score DESC, discovered_at DESC
        LIMIT $4::int`,
        [source, status, String(minimumScore), String(limit)],
      ),
      leadNeonQuery(
        `SELECT
          source_id,
          name,
          description,
          cadence,
          status,
          last_run_at::text,
          last_success_at::text,
          last_items::text,
          last_error
        FROM public.lead_source_state
        ORDER BY sort_order, source_id`,
      ),
    ]);

    return privateJson({
      leads: neonRowsToObjects(leadResult).map(toLead),
      collectors: neonRowsToObjects(collectorResult).map(toCollector),
    });
  } catch (error) {
    console.error("Rukh Leads GET failed", error);
    return privateJson(
      {
        error: "The live lead database is not ready. The dashboard will use clearly marked preview records until setup is complete.",
      },
      { status: 503 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = (await request.json()) as { id?: unknown; status?: unknown };
    const id = typeof body.id === "string" ? body.id.trim() : "";
    const status = typeof body.status === "string" ? body.status : "";

    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
      return privateJson({ error: "Lead ID is invalid." }, { status: 400 });
    }
    if (!allowedStatuses.includes(status as LeadStatus)) {
      return privateJson({ error: "Lead status is invalid." }, { status: 400 });
    }

    const result = await leadNeonQuery(
      `WITH previous AS (
         SELECT id, status
         FROM public.lead_opportunities
         WHERE id = $1::uuid
       ), updated AS (
         UPDATE public.lead_opportunities AS lead
         SET status = $2, updated_at = now()
         FROM previous
         WHERE lead.id = previous.id
         RETURNING lead.id, previous.status AS old_status
       ), activity AS (
         INSERT INTO public.lead_activity (lead_id, action, from_status, to_status)
         SELECT id, 'status_changed', old_status, $2
         FROM updated
         RETURNING lead_id
       )
       SELECT lead_id::text FROM activity`,
      [id, status],
    );

    if (!(result.rows?.length ?? 0)) {
      return privateJson({ error: "Lead was not found." }, { status: 404 });
    }
    return privateJson({ ok: true, id, status });
  } catch (error) {
    console.error("Rukh Leads PATCH failed", error);
    return privateJson({ error: "Lead status could not be updated." }, { status: 503 });
  }
}
