import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

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

const MAX_FIELD = 300;
const MAX_MESSAGE = 1800;

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

async function redisCommand(command: unknown[]) {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    throw new Error("Lead storage is not configured.");
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Lead storage failed with ${response.status}.`);
  }

  return response.json() as Promise<{ result?: unknown; error?: string }>;
}

async function redisPipeline(commands: unknown[][]) {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    throw new Error("Lead storage is not configured.");
  }

  const response = await fetch(`${url.replace(/\/$/, "")}/pipeline`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(commands),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Lead storage pipeline failed with ${response.status}.`);
  }

  const result = (await response.json()) as Array<{ result?: unknown; error?: string }>;
  if (result.some((item) => item.error)) {
    throw new Error("Lead storage pipeline returned an error.");
  }
}

async function enforceRateLimit(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwarded || "unknown";
  const key = `rukh:contact:rate:${ip}`;
  const increment = await redisCommand(["INCR", key]);
  const count = Number(increment.result ?? 0);

  if (count === 1) {
    await redisCommand(["EXPIRE", key, 600]);
  }

  return count <= 6;
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
    const body = (await request.json()) as ContactPayload;

    // Honeypot field. Real users never see or fill this.
    if (clean(body.website)) {
      return NextResponse.json({ ok: true });
    }

    const name = clean(body.name, 120);
    const email = clean(body.email, 180).toLowerCase();
    const message = clean(body.message, MAX_MESSAGE);
    const reason = clean(body.reason, 120);

    if (!name) {
      return NextResponse.json({ error: "Enter your name." }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    }
    if (message.length < 20) {
      return NextResponse.json({ error: "Add a little more detail to your message." }, { status: 400 });
    }

    const withinLimit = await enforceRateLimit(request);
    if (!withinLimit) {
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
      organization: clean(body.organization, 180),
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

    const serialized = JSON.stringify(lead);
    await redisPipeline([
      ["SET", `rukh:lead:${id}`, serialized],
      ["LPUSH", "rukh:leads", id],
      ["LTRIM", "rukh:leads", 0, 9999],
    ]);

    let notificationSent = false;
    try {
      notificationSent = await sendNotification(lead);
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
