import type { NextRequest } from "next/server";
import { hasValidBasicAuth, hasValidCronAuth } from "@/lib/leads/auth";
import {
  beginCollectorRun,
  completeCollectorRun,
  failCollectorRun,
  privateJson,
} from "@/lib/leads/crawl";

export { privateJson };

export function collectorAuthorized(request: NextRequest) {
  return hasValidCronAuth(request) || hasValidBasicAuth(request);
}

export const beginCollector = beginCollectorRun;
export const finishCollector = completeCollectorRun;
export const failCollector = failCollectorRun;

export async function mapLimit<T, R>(
  values: readonly T[],
  concurrency: number,
  worker: (value: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(values.length);
  let nextIndex = 0;

  async function runWorker() {
    while (nextIndex < values.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await worker(values[index], index);
    }
  }

  await Promise.all(
    Array.from(
      { length: Math.max(1, Math.min(Math.floor(concurrency) || 1, values.length || 1)) },
      () => runWorker(),
    ),
  );
  return results;
}
