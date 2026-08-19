"use client";

import { useCallback, useEffect, useState } from "react";
import { Database, Globe2, Radar, RefreshCw, SearchCheck } from "lucide-react";
import type { LeadCrawlStats } from "@/lib/leads/types";

const emptyStats: LeadCrawlStats = {
  candidates: 0,
  websites_found: 0,
  domain_queue: 0,
  audit_queue: 0,
  audited: 0,
  qualified: 0,
};

export function CrawlProgress() {
  const [stats, setStats] = useState<LeadCrawlStats>(emptyStats);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/leads?limit=1", {
        cache: "no-store",
        credentials: "same-origin",
      });
      if (!response.ok) return;
      const body = (await response.json()) as { stats?: Partial<LeadCrawlStats> };
      setStats({ ...emptyStats, ...(body.stats ?? {}) });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), 30_000);
    return () => window.clearInterval(timer);
  }, [load]);

  const items = [
    ["Candidates", stats.candidates, Database],
    ["Sites found", stats.websites_found, Globe2],
    ["Domain queue", stats.domain_queue, Radar],
    ["Audit queue", stats.audit_queue, SearchCheck],
    ["Audited", stats.audited, RefreshCw],
  ] as const;

  return (
    <div className="relative z-[80] mx-auto w-full max-w-[940px] px-3 pb-3 sm:pointer-events-none sm:fixed sm:bottom-3 sm:left-1/2 sm:w-[min(940px,calc(100%-1.5rem))] sm:-translate-x-1/2 sm:px-0 sm:pb-0">
      <div className="pointer-events-auto border border-[#d7a45f]/25 bg-[#090807]/95 px-3 py-3 shadow-[0_20px_80px_rgba(0,0,0,.55)] backdrop-blur-xl sm:py-2">
        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:gap-2 sm:overflow-x-auto">
          <div className="flex min-w-0 items-center justify-between gap-3 sm:contents">
            <span className="text-[8px] font-black uppercase tracking-[.2em] text-[#d7a45f] sm:shrink-0">
              Crawl universe
            </span>
            <button
              type="button"
              onClick={() => void load()}
              className="inline-flex shrink-0 items-center gap-1 text-[9px] font-bold uppercase tracking-[.12em] text-[#e2b36b] sm:order-last sm:ml-auto"
            >
              <RefreshCw className={`size-3 ${loading ? "animate-spin" : ""}`} aria-hidden />
              Refresh
            </button>
          </div>

          <div className="grid min-w-0 grid-cols-2 gap-x-3 gap-y-2 sm:contents">
            {items.map(([label, value, Icon]) => (
              <span
                key={label}
                className="flex min-w-0 items-center gap-1.5 border-l border-white/8 pl-2 text-[10px] leading-4 text-white/45 sm:inline-flex sm:shrink-0"
              >
                <Icon className={`size-3 shrink-0 ${loading ? "animate-pulse" : ""}`} aria-hidden />
                <strong className="shrink-0 text-white/85">{value.toLocaleString()}</strong>
                <span className="min-w-0 break-words">{label}</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
