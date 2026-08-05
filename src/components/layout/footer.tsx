"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight, Heart } from "lucide-react";
import { Logo } from "@/components/layout/logo";
import { buttonStyles } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { siteConfig } from "@/lib/site-config";

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: { label: string; href: string; external?: boolean }[];
}) {
  return (
    <div>
      <h2 className="text-sm font-semibold text-white">{title}</h2>
      <ul className="mt-4 space-y-3">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              aria-label={link.external ? `${link.label} on Google Play` : undefined}
              className="inline-flex items-center gap-1 text-sm text-white/55 transition hover:text-[color:var(--brand-bronze)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[color:var(--brand-red)]"
            >
              {link.label}
              {link.external ? (
                <ArrowUpRight aria-hidden className="size-3.5" />
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Footer() {
  const pathname = usePathname();
  const isWebsiteSample =
    pathname.startsWith("/services/web-development/designs/") &&
    pathname.endsWith("/sample");
  const isPrivatePortfolio = pathname.startsWith("/portfolio/brett-gallaher");
  const isCareerPortfolioDemo = pathname === "/services/career-portfolios/demo";

  if (isWebsiteSample || isPrivatePortfolio || isCareerPortfolioDemo) {
    return null;
  }

  return (
    <footer className="border-t border-[color:var(--brand-red)]/16 bg-[#050506]/86">
      <Container className="py-12 sm:py-16">
        <div className="grid gap-10 lg:grid-cols-[1.5fr_1fr_1fr_1fr]">
          <div className="max-w-sm">
            <Logo />
            <p className="mt-5 text-sm leading-6 text-white/58">
              Clean tools. Sharper standards.
            </p>
            <p className="mt-4 text-xs text-white/50">
              Independent digital studio and software lab.
            </p>
            <a
              href={siteConfig.links.patreon}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonStyles({
                variant: "secondary",
                size: "sm",
                className:
                  "mt-6 border-[color:var(--brand-red)]/30 bg-[color:var(--brand-red)]/10 hover:border-[color:var(--brand-red)]/55 hover:bg-[color:var(--brand-red)]/16",
              })}
            >
              <Heart aria-hidden className="size-4 text-[#ff596b]" />
              Support Rukh Labs on Patreon
            </a>
          </div>
          <FooterColumn title="Products" links={siteConfig.footer.products} />
          <FooterColumn title="Company" links={siteConfig.footer.company} />
          <FooterColumn title="Legal" links={siteConfig.footer.legal} />
        </div>
        <div className="mt-12 flex flex-col gap-3 border-t border-[color:var(--brand-red)]/14 pt-6 text-xs text-white/50 sm:flex-row sm:items-center sm:justify-between">
          <span>&copy; 2026 Rukh Labs. All rights reserved.</span>
          <span>Websites · Career portfolios · Original software</span>
        </div>
      </Container>
    </footer>
  );
}
