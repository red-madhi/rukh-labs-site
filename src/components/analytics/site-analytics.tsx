"use client";

import {
  Analytics,
  type BeforeSendEvent,
} from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

const PRIVATE_PORTFOLIO_PREFIX = "/portfolio/brett-gallaher";

const SAFE_QUERY_PARAMETERS = new Set([
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "inquiry",
  "package",
  "design",
]);

function sanitizeAnalyticsEvent(event: BeforeSendEvent): BeforeSendEvent | null {
  try {
    const url = new URL(event.url);

    if (url.pathname.startsWith(PRIVATE_PORTFOLIO_PREFIX)) {
      return null;
    }

    for (const key of [...url.searchParams.keys()]) {
      if (!SAFE_QUERY_PARAMETERS.has(key)) {
        url.searchParams.delete(key);
      }
    }

    url.hash = "";

    return {
      ...event,
      url: url.toString(),
    };
  } catch {
    return event.url.includes(PRIVATE_PORTFOLIO_PREFIX) ? null : event;
  }
}

export function SiteAnalytics() {
  return (
    <>
      <Analytics beforeSend={sanitizeAnalyticsEvent} />
      <SpeedInsights />
    </>
  );
}