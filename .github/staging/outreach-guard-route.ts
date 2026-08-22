import { NextResponse } from "next/server";
import { POST as runLegacyOutreachAction } from "../route";
import { assertLeadOutreachSafety } from "@/lib/leads/outreach-safety";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function uniqueLeadIds(payload: Record<string, unknown>) {
  const values: unknown[] = [
    payload.leadId,
    payload.id,
    payload.leadIds,
    payload.ids,
    payload.selectedLeadIds,
  ];

  const ids = values.flatMap((value) =>
    Array.isArray(value) ? value : value == null ? [] : [value],
  );

  return [...new Set(ids.map((value) => String(value).trim()).filter(Boolean))];
}

export async function POST(request: Request) {
  const rawBody = await request.text();

  try {
    const payload = JSON.parse(rawBody) as Record<string, unknown>;
    const action = String(payload.action ?? "").trim();

    if (/send|follow[-_ ]?up/i.test(action)) {
      const leadIds = uniqueLeadIds(payload);
      if (!leadIds.length) {
        throw new Error(
          "A send-like outreach action was blocked because it did not identify the lead or leads being sent.",
        );
      }

      for (const leadId of leadIds) {
        await assertLeadOutreachSafety(leadId);
      }
    }

    const forwardedRequest = new Request(request.url, {
      method: "POST",
      headers: request.headers,
      body: rawBody,
    });

    return await runLegacyOutreachAction(forwardedRequest);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Outreach safety check failed.",
      },
      { status: 400 },
    );
  }
}
