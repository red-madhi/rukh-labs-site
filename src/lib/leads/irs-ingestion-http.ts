import { privateJson } from "@/lib/leads/crawl";
import { IrsInputError, validateIrsBatch, validateIrsReport } from "@/lib/leads/irs-ingestion-contract";
import { ingestIrsBatch, IrsConflictError, reportIrsRun } from "@/lib/leads/irs-ingestion-store";

export async function handleIrsPayload(payload: unknown, stage: "candidates" | "report") {
  try {
    return privateJson(stage === "candidates"
      ? await ingestIrsBatch(validateIrsBatch(payload))
      : await reportIrsRun(validateIrsReport(payload)));
  } catch (error) {
    if (error instanceof IrsInputError) return privateJson({ error: error.message }, { status: error.status });
    if (error instanceof IrsConflictError) return privateJson({ error: error.message }, { status: 409 });
    return privateJson({ error: "IRS ingestion failed. Retry the identical request." }, { status: 503 });
  }
}
