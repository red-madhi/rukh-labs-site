import Link from "next/link";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import {
  getWebsiteProjectHref,
  type DesignDirection,
} from "@/lib/web-development";

type SampleSiteFrameProps = {
  direction: DesignDirection;
  children: React.ReactNode;
};

export function SampleSiteFrame({
  direction,
  children,
}: SampleSiteFrameProps) {
  const projectHref = getWebsiteProjectHref({ design: direction.slug });

  return (
    <div className="min-h-screen bg-[#050506]">
      <a
        href="#sample-site-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-black"
      >
        Skip to sample website
      </a>

      <aside
        aria-label="Rukh Labs sample website controls"
        className="relative z-[70] border-b border-white/12 bg-[#09080a] text-white"
      >
        <div className="mx-auto flex min-h-14 max-w-[100rem] items-center justify-between gap-4 px-4 py-2 sm:px-6 lg:px-8">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span
                aria-hidden
                className="size-2 shrink-0 bg-[color:var(--brand-red)] shadow-[0_0_16px_rgba(240,0,28,0.62)]"
              />
              <span className="truncate text-xs font-semibold uppercase tracking-[0.14em] text-white/72">
                Rukh Labs · Full sample website
              </span>
            </div>
            <p className="mt-0.5 hidden truncate text-[11px] text-white/38 sm:block">
              Fictional concept: {direction.sampleName} · {direction.sampleDomain}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <Link
              href={direction.href}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-white/14 px-3 text-xs font-semibold text-white/72 transition hover:border-white/30 hover:bg-white/[0.06] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ff5364] sm:px-4"
            >
              <ArrowLeft aria-hidden className="size-3.5" />
              <span className="hidden sm:inline">Back to {direction.name}</span>
              <span className="sm:hidden">Back</span>
            </Link>
            <Link
              href={projectHref}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full bg-[color:var(--brand-red)] px-3 text-xs font-semibold text-white transition hover:bg-[#ff2038] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ff5364] sm:px-4"
            >
              <span className="hidden sm:inline">Start with this direction</span>
              <span className="sm:hidden">Start a project</span>
              <ArrowUpRight aria-hidden className="size-3.5" />
            </Link>
          </div>
        </div>
      </aside>

      <div id="sample-site-content">{children}</div>
    </div>
  );
}
