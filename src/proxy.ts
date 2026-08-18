import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  hasValidBasicAuth,
  hasValidCronAuth,
  LEADS_SECURITY_HEADERS,
} from "@/lib/leads/auth";

function challenge(message = "Authentication required.") {
  return new NextResponse(message, {
    status: 401,
    headers: {
      ...LEADS_SECURITY_HEADERS,
      "WWW-Authenticate": 'Basic realm="Rukh Leads", charset="UTF-8"',
    },
  });
}

export function proxy(request: NextRequest) {
  const isCollector = request.nextUrl.pathname.startsWith("/api/leads/collect/");

  if (isCollector) {
    if (!process.env.CRON_SECRET) {
      return new NextResponse(
        "Lead automation is locked until CRON_SECRET is configured in the server environment.",
        { status: 503, headers: LEADS_SECURITY_HEADERS },
      );
    }

    if (!hasValidCronAuth(request) && !hasValidBasicAuth(request)) {
      return new NextResponse("Collector authentication failed.", {
        status: 401,
        headers: LEADS_SECURITY_HEADERS,
      });
    }
  } else {
    if (!process.env.LEADS_USERNAME || !process.env.LEADS_PASSWORD) {
      return new NextResponse(
        "Rukh Leads is locked until LEADS_USERNAME and LEADS_PASSWORD are configured in the server environment.",
        { status: 503, headers: LEADS_SECURITY_HEADERS },
      );
    }

    if (!hasValidBasicAuth(request)) return challenge();
  }

  const response = NextResponse.next();
  for (const [name, value] of Object.entries(LEADS_SECURITY_HEADERS)) {
    response.headers.set(name, value);
  }
  return response;
}

export const config = {
  matcher: ["/leads/:path*", "/api/leads/:path*"],
};
