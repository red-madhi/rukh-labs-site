import { NextRequest, NextResponse } from "next/server";
import {
  ADVANCED_NETWORK_ACCESS_COOKIE,
  getAdvancedNetworkAccessCookieValue,
  hasAdvancedNetworkAccess,
  isAdvancedNetworkAccessConfigured,
  verifyAdvancedNetworkAccessCode,
} from "@/lib/advanced-network-access";

export const runtime = "nodejs";

function allowedOrigin(request: NextRequest) {
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

export async function GET() {
  return NextResponse.json({
    configured: isAdvancedNetworkAccessConfigured(),
    authorized: await hasAdvancedNetworkAccess(),
  });
}

export async function POST(request: NextRequest) {
  if (!allowedOrigin(request)) {
    return NextResponse.json(
      { error: "Request origin is not allowed." },
      { status: 403 },
    );
  }
  if (!isAdvancedNetworkAccessConfigured()) {
    return NextResponse.json(
      { error: "Private beta access is not configured on this deployment yet." },
      { status: 503 },
    );
  }

  const body = (await request.json().catch(() => ({}))) as { code?: string };
  if (!verifyAdvancedNetworkAccessCode(String(body.code ?? "").trim())) {
    return NextResponse.json(
      { error: "That access code is not valid." },
      { status: 401 },
    );
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: ADVANCED_NETWORK_ACCESS_COOKIE,
    value: getAdvancedNetworkAccessCookieValue(),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: ADVANCED_NETWORK_ACCESS_COOKIE,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
}
