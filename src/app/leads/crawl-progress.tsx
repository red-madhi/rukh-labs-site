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
    <div className="pointer-events-none fixed bottom-3 left-1/2 z-[80] w-[min(940px,calc(100%-1.5rem))] -translate-x-1/2">
      <div className="pointer-events-auto border border-[#d7a45f]/25 bg-[#090807]/95 px-3 py-2 shadow-[0_20px_80px_rgba(0,0,0,.55)] backdrop-blur-xl">
        <div className="flex min-w-0 items-center gap-2 overflow-x-auto">
          <span className="shrink-0 text-[8px] font-black uppercase tracking-[.2em] text-[#d7a45f]">
            Crawl universe
          </span>
          {items.map(([label, value, Icon]) => (
            <span key={label} className="inline-flex shrink-0 items-center gap-1.5 border-l border-white/8 pl-2 text-[10px] text-white/45">
              <Icon className={`size-3 ${loading ? "animate-pulse" : ""}`} aria-hidden />
              <strong className="text-white/85">{value.toLocaleString()}</strong>
              {label}
            </span>
          ))}
          <button
            type="button"
            onClick={() => void load()}
            className="ml-auto inline-flex shrink-0 items-center gap-1 text-[9px] font-bold uppercase tracking-[.12em] text-[#e2b36b]"
          >
            <RefreshCw className={`size-3 ${loading ? "animate-spin" : ""}`} aria-hidden />
            Refresh
          </button>
        </div>
      </div>
    </div>
  );
}
