import { NextRequest, NextResponse } from "next/server";

export function proxy(request: NextRequest) {
  if (
    request.nextUrl.pathname === "/api/leads/outreach" &&
    request.method === "POST"
  ) {
    const guarded = request.nextUrl.clone();
    guarded.pathname = "/api/leads/outreach/guard";
    return NextResponse.rewrite(guarded);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/leads/outreach"],
};
