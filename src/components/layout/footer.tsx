import Link from "next/link";
import { Logo } from "@/components/layout/logo";
import { Container } from "@/components/ui/container";
import { siteConfig } from "@/lib/site-config";

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: { label: string; href: string }[];
}) {
  return (
    <div>
      <h2 className="text-sm font-semibold text-white">{title}</h2>
      <ul className="mt-4 space-y-3">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="text-sm text-white/55 transition hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#4db7ff]"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-white/10 bg-[#05070b]/80">
      <Container className="py-12 sm:py-16">
        <div className="grid gap-10 lg:grid-cols-[1.5fr_1fr_1fr_1fr]">
          <div className="max-w-sm">
            <Logo />
            <p className="mt-5 text-sm leading-6 text-white/58">
              Clean tools. Sharper standards. Beautiful software for people who
              expect more.
            </p>
            <p className="mt-4 text-xs text-white/42">Independent software lab.</p>
          </div>
          <FooterColumn title="Products" links={siteConfig.footer.products} />
          <FooterColumn title="Company" links={siteConfig.footer.company} />
          <FooterColumn title="Legal" links={siteConfig.footer.legal} />
        </div>
        <div className="mt-12 flex flex-col gap-3 border-t border-white/10 pt-6 text-xs text-white/42 sm:flex-row sm:items-center sm:justify-between">
          <span>&copy; 2026 Rukh Labs. All rights reserved.</span>
          <span>Software should feel powerful again.</span>
        </div>
      </Container>
    </footer>
  );
}
