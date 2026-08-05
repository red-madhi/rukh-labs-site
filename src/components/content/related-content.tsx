import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { ContentLink } from "@/lib/content";

export function RelatedContent({ links }: { links: readonly ContentLink[] }) {
  return (
    <section className="border-t border-white/10 pt-10" aria-labelledby="related-content">
      <h2 id="related-content" className="text-2xl font-semibold text-white">Related content</h2>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {links.map((link) => (
          <Link key={link.href} href={link.href} className="group rounded-xl border border-white/10 bg-white/[0.02] p-5 transition hover:border-[#16c8ff]/35 hover:bg-[#16c8ff]/[0.04] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[color:var(--brand-red)]">
            <span className="flex items-center justify-between gap-3 font-medium text-white">{link.label}<ArrowRight aria-hidden className="size-4 text-[#67e8f9] transition group-hover:translate-x-0.5" /></span>
            {link.description ? <span className="mt-2 block text-sm leading-6 text-white/56">{link.description}</span> : null}
          </Link>
        ))}
      </div>
    </section>
  );
}
