"use client";

import { useRef } from "react";
import { Menu } from "lucide-react";

type SampleMobileMenuProps = {
  ariaLabel: string;
  summaryLabel: string;
  items: readonly {
    label: string;
    href: string;
  }[];
  cta: {
    label: string;
    href: string;
  };
  summaryClassName: string;
  panelClassName: string;
  linkClassName: string;
  ctaClassName: string;
};

export function SampleMobileMenu({
  ariaLabel,
  summaryLabel,
  items,
  cta,
  summaryClassName,
  panelClassName,
  linkClassName,
  ctaClassName,
}: SampleMobileMenuProps) {
  const detailsRef = useRef<HTMLDetailsElement>(null);

  function closeMenu() {
    if (detailsRef.current) {
      detailsRef.current.open = false;
    }
  }

  return (
    <details ref={detailsRef} className="group relative lg:hidden">
      <summary className={summaryClassName}>
        <Menu aria-hidden className="size-4" />
        {summaryLabel}
      </summary>
      <nav aria-label={ariaLabel} className={panelClassName}>
        {items.map((item) => (
          <a
            key={item.href}
            href={item.href}
            onClick={closeMenu}
            className={linkClassName}
          >
            {item.label}
          </a>
        ))}
        <a
          href={cta.href}
          onClick={closeMenu}
          className={ctaClassName}
        >
          {cta.label}
        </a>
      </nav>
    </details>
  );
}
