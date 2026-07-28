"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { Logo } from "@/components/layout/logo";
import { buttonStyles } from "@/components/ui/button";
import { siteConfig } from "@/lib/site-config";
import { cn } from "@/lib/utils";

function isNavItemActive(pathname: string, href: string) {
  return (
    pathname === href ||
    (href === "/services/web-development" && pathname.startsWith(`${href}/`))
  );
}

export function Header() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const isWebsiteSample =
    pathname.startsWith("/services/web-development/designs/") &&
    pathname.endsWith("/sample");

  if (isWebsiteSample) {
    return null;
  }

  return (
    <header className="sticky top-0 z-50 border-b border-[color:var(--brand-red)]/18 bg-[#060507]/88 backdrop-blur-xl">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-[#f4e8c8] focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-[#080a0f]"
      >
        Skip to content
      </a>
      <div className="mx-auto flex h-[4.5rem] max-w-7xl items-center justify-between px-5 sm:px-6 lg:px-8">
        <Logo />

        <nav className="hidden items-center gap-1 xl:flex" aria-label="Primary navigation">
          {siteConfig.navItems.map((item) => {
            const active = isNavItemActive(pathname, item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-label={item.external ? `${item.label} on Google Play` : undefined}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-3 py-2 text-sm font-medium text-white/62 transition hover:bg-[color:var(--brand-red)]/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--brand-red)]",
                  active && "bg-[color:var(--brand-red)]/12 text-white",
                )}
              >
                {item.label}
                {item.external ? (
                  <ArrowUpRight aria-hidden className="size-3.5" />
                ) : null}
              </Link>
            );
          })}
        </nav>

        <div className="hidden items-center gap-3 xl:flex">
          <Link href="/download" className={buttonStyles({ size: "sm" })}>
            Glass Squares OS Beta
          </Link>
        </div>

        <button
          type="button"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-controls="mobile-menu"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
          className="inline-flex size-11 items-center justify-center rounded-full border border-white/12 bg-white/[0.04] text-white transition hover:border-[color:var(--brand-red)]/45 hover:bg-white/[0.07] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--brand-red)] xl:hidden"
        >
          {open ? <X aria-hidden className="size-5" /> : <Menu aria-hidden className="size-5" />}
        </button>
      </div>

      <div
        id="mobile-menu"
        aria-hidden={!open}
        className={cn(
          "grid overflow-hidden border-t border-[color:var(--brand-red)]/18 bg-[#080607]/96 transition-[grid-template-rows] duration-300 xl:hidden",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className="min-h-0">
          <nav className="mx-auto flex max-w-7xl flex-col gap-1 px-5 py-5" aria-label="Mobile navigation">
            {siteConfig.navItems.map((item) => {
              const active = isNavItemActive(pathname, item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-label={item.external ? `${item.label} on Google Play` : undefined}
                  aria-current={active ? "page" : undefined}
                  tabIndex={open ? undefined : -1}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "rounded-lg px-4 py-3 text-sm font-medium text-white/70 transition hover:bg-[color:var(--brand-red)]/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--brand-red)]",
                    active && "bg-[color:var(--brand-red)]/12 text-white",
                  )}
                >
                  <span className="flex items-center justify-between gap-3">
                    {item.label}
                    {item.external ? (
                      <ArrowUpRight aria-hidden className="size-4" />
                    ) : null}
                  </span>
                </Link>
              );
            })}
            <Link
              href="/download"
              tabIndex={open ? undefined : -1}
              onClick={() => setOpen(false)}
              className={buttonStyles({ className: "mt-3 w-full" })}
            >
              Glass Squares OS Beta
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}
