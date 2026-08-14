import { NextResponse } from "next/server";

export const runtime = "nodejs";

function getNeonEndpoint(connectionString: string) {
  const parsed = new URL(connectionString);
  const hostParts = parsed.hostname.split(".");
  if (hostParts.length < 2) throw new Error("Invalid database host.");
  hostParts[0] = "api";
  return `https://${hostParts.join(".")}/sql`;
}

export async function GET() {
  if (process.env.VERCEL_ENV === "production") {
    return new NextResponse(null, { status: 404 });
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    return NextResponse.json({ ok: false, database: "missing" }, { status: 503 });
  }

  try {
    const response = await fetch(getNeonEndpoint(connectionString), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Neon-Connection-String": connectionString,
        "Neon-Raw-Text-Output": "true",
        "Neon-Array-Mode": "true",
      },
      body: JSON.stringify({ query: "SELECT 1", params: [] }),
      cache: "no-store",
    });

    if (!response.ok) {
      return NextResponse.json({ ok: false, database: "unreachable" }, { status: 503 });
    }

    return NextResponse.json({ ok: true, database: "connected" });
  } catch {
    return NextResponse.json({ ok: false, database: "unreachable" }, { status: 503 });
  }
}
