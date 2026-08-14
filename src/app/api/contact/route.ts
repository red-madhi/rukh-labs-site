import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const WEBSITE_REASON = "Website design project";
const CAREER_REASON = "Career portfolio project";
const MAX_FIELD = 300;
const MAX_MESSAGE = 1800;
const MAX_BODY_BYTES = 24_000;
const IP_LIMIT = 6;
const IP_WINDOW_MS = 10 * 60 * 1000;
const EMAIL_LIMIT = 5;

const ipWindows = new Map<string, { count: number; resetAt: number }>();

type ContactPayload = {
  name?: string;
  email?: string;
  phone?: string;
  reason?: string;
  organization?: string;
  projectType?: string;
  packageId?: string;
  designDirection?: string;
  currentWebsite?: string;
  budget?: string;
  timeline?: string;
  referral?: string;
  message?: string;
  sourcePage?: string;
  referrer?: string;
  utm?: Record<string, string>;
  website?: string;
};

type NeonQueryResponse = {
  fields?: Array<{ name?: string }>;
  rows?: Array<Array<string | null>>;
  rowCount?: number;
};

function clean(value: unknown, max = MAX_FIELD) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "'": "&#39;",
      '"': "&quot;",
    };
    return entities[character] ?? character;
  });
}

function getNeonEndpoint(connectionString: string) {
  const parsed = new URL(connectionString);
  const hostParts = parsed.hostname.split(".");
  if (hostParts.length < 2) {
    throw new Error("Database connection host is invalid.");
  }
  hostParts[0] = "api";
  return `https://${hostParts.join(".")}/sql`;
}

async function neonQuery(query: string, params: Array<string | null> = []) {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("Lead storage is not configured.");
  }

  const response = await fetch(getNeonEndpoint(connectionString), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Neon-Connection-String": connectionString,
      "Neon-Raw-Text-Output": "true",
      "Neon-Array-Mode": "true",
    },
    body: JSON.stringify({ query, params }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Lead storage query failed with ${response.status}.`);
  }

  return (await response.json()) as NeonQueryResponse;
}

function getRequestIp(request: NextRequest) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    "unknown"
  );
}

function withinIpLimit(request: NextRequest) {
  const now = Date.now();
  const ip = getRequestIp(request);
  const current = ipWindows.get(ip);

  if (!current || current.resetAt <= now) {
    ipWindows.set(ip, { count: 1, resetAt: now + IP_WINDOW_MS });
    return true;
  }

  current.count += 1;
  if (current.count > IP_LIMIT) return false;
  return true;
}

async function withinEmailLimit(email: string) {
  const result = await neonQuery(
    "SELECT COUNT(*)::int FROM public.contact_leads WHERE email = $1 AND submitted_at > now() - interval '10 minutes'",
    [email],
  );
  const count = Number(result.rows?.[0]?.[0] ?? 0);
  return count < EMAIL_LIMIT;
}

function isAllowedOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin) return true;

  try {
    const hostname = new URL(origin).hostname.toLowerCase();
    return (
      hostname === "rukhlabs.com" ||
      hostname === "www.rukhlabs.com" ||
      hostname.endsWith(".vercel.app") ||
      hostname === "localhost" ||
      hostname === "127.0.0.1"
    );
  } catch {
    return false;
  }
}

async function storeLead(lead: Record<string, unknown>) {
  await neonQuery(
    `INSERT INTO public.contact_leads (
      id, submitted_at, name, email, phone, reason, organization, project_type,
      package_id, design_direction, current_website, budget, timeline, referral,
      message, source_page, referrer, utm
    ) VALUES (
      $1::uuid, $2::timestamptz, $3, $4, $5, $6, $7, $8,
      $9, $10, $11, $12, $13, $14, $15, $16, $17, $18::jsonb
    )`,
    [
      String(lead.id),
      String(lead.submittedAt),
      String(lead.name),
      String(lead.email),
      String(lead.phone || "") || null,
      String(lead.reason),
      String(lead.organization || "") || null,
      String(lead.projectType || "") || null,
      String(lead.packageId || "") || null,
      String(lead.designDirection || "") || null,
      String(lead.currentWebsite || "") || null,
      String(lead.budget || "") || null,
      String(lead.timeline || "") || null,
      String(lead.referral || "") || null,
      String(lead.message),
      String(lead.sourcePage || "/contact"),
      String(lead.referrer || "") || null,
      JSON.stringify(lead.utm ?? {}),
    ],
  );
}

async function markNotificationSent(id: string) {
  await neonQuery(
    "UPDATE public.contact_leads SET notification_sent = true, updated_at = now() WHERE id = $1::uuid",
    [id],
  );
}

async function sendNotification(lead: Record<string, unknown>) {
  const apiKey = process.env.RESEND_API_KEY;
  const destination = process.env.CONTACT_NOTIFICATION_EMAIL;
  const from = process.env.CONTACT_FROM_EMAIL || "Rukh Labs <hello@rukhlabs.com>";

  if (!apiKey || !destination) return false;

  const details = [
    ["Name", lead.name],
    ["Email", lead.email],
    ["Phone", lead.phone || "Not provided"],
    ["Reason", lead.reason],
    ["Organization / role", lead.organization || "Not provided"],
    ["Project type", lead.projectType || "Not provided"],
    ["Package", lead.packageId || "Not provided"],
    ["Design direction", lead.designDirection || "Not provided"],
    ["Current website", lead.currentWebsite || "Not provided"],
    ["Budget", lead.budget || "Not provided"],
    ["Timeline", lead.timeline || "Not provided"],
    ["Referral", lead.referral || "Not provided"],
    ["Source page", lead.sourcePage || "/contact"],
    ["Referrer", lead.referrer || "Direct / unknown"],
  ];

  const htmlRows = details
    .map(
      ([label, value]) =>
        `<tr><td style="padding:6px 12px 6px 0;color:#777;vertical-align:top">${escapeHtml(String(label))}</td><td style="padding:6px 0;color:#111">${escapeHtml(String(value ?? ""))}</td></tr>`,
    )
    .join("");

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "User-Agent": "Rukh-Labs-Contact/1.0",
      "Idempotency-Key": String(lead.id),
    },
    body: JSON.stringify({
      from,
      to: [destination],
      reply_to: String(lead.email),
      subject: `New Rukh Labs inquiry: ${String(lead.reason || "Contact")} — ${String(lead.name)}`,
      html: `<div style="font-family:Arial,sans-serif;max-width:720px;margin:auto"><h1>New Rukh Labs inquiry</h1><table style="border-collapse:collapse">${htmlRows}</table><h2 style="margin-top:24px">Message</h2><div style="white-space:pre-wrap;line-height:1.6">${escapeHtml(String(lead.message))}</div><p style="margin-top:24px;color:#777;font-size:12px">Lead ID: ${escapeHtml(String(lead.id))}</p></div>`,
    }),
    cache: "no-store",
  });

  return response.ok;
}

export async function POST(request: NextRequest) {
  try {
    if (!isAllowedOrigin(request)) {
      return NextResponse.json({ error: "Request origin is not allowed." }, { status: 403 });
    }

    const contentLength = Number(request.headers.get("content-length") || 0);
    if (contentLength > MAX_BODY_BYTES) {
      return NextResponse.json({ error: "Submission is too large." }, { status: 413 });
    }

    const body = (await request.json()) as ContactPayload;

    // Honeypot field. Real users never see or fill this.
    if (clean(body.website)) {
      return NextResponse.json({ ok: true });
    }

    const name = clean(body.name, 120);
    const email = clean(body.email, 180).toLowerCase();
    const message = clean(body.message, MAX_MESSAGE);
    const reason = clean(body.reason, 120);
    const organization = clean(body.organization, 180);
    const isProject = reason === WEBSITE_REASON || reason === CAREER_REASON;

    if (!name) {
      return NextResponse.json({ error: "Enter your name." }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    }
    if (!reason) {
      return NextResponse.json({ error: "Choose an inquiry type." }, { status: 400 });
    }
    if (isProject && !organization) {
      return NextResponse.json(
        {
          error:
            reason === CAREER_REASON
              ? "Enter your current role or the role you are targeting."
              : "Enter your business, brand, or project name.",
        },
        { status: 400 },
      );
    }
    if (message.length < 20) {
      return NextResponse.json({ error: "Add a little more detail to your message." }, { status: 400 });
    }

    if (!withinIpLimit(request) || !(await withinEmailLimit(email))) {
      return NextResponse.json(
        { error: "Too many submissions. Try again in a few minutes." },
        { status: 429 },
      );
    }

    const id = crypto.randomUUID();
    const submittedAt = new Date().toISOString();
    const utm = Object.fromEntries(
      Object.entries(body.utm ?? {})
        .slice(0, 8)
        .map(([key, value]) => [clean(key, 80), clean(value, 180)]),
    );

    const lead = {
      id,
      submittedAt,
      status: "new",
      name,
      email,
      phone: clean(body.phone, 80),
      reason,
      organization,
      projectType: clean(body.projectType, 180),
      packageId: clean(body.packageId, 120),
      designDirection: clean(body.designDirection, 120),
      currentWebsite: clean(body.currentWebsite, 300),
      budget: clean(body.budget, 120),
      timeline: clean(body.timeline, 120),
      referral: clean(body.referral, 300),
      message,
      sourcePage: clean(body.sourcePage, 180) || "/contact",
      referrer: clean(body.referrer, 500),
      utm,
    };

    await storeLead(lead);

    let notificationSent = false;
    try {
      notificationSent = await sendNotification(lead);
      if (notificationSent) {
        try {
          await markNotificationSent(id);
        } catch (statusError) {
          console.error("Contact notification status update failed", statusError);
        }
      }
    } catch (notificationError) {
      console.error("Contact notification failed", notificationError);
    }

    return NextResponse.json({ ok: true, id, notificationSent }, { status: 201 });
  } catch (error) {
    console.error("Contact submission failed", error);
    return NextResponse.json(
      { error: "The form could not be submitted right now. Please try again." },
      { status: 503 },
    );
  }
}
