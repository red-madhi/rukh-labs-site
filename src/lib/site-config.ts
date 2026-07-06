import type { Metadata } from "next";

export const siteConfig = {
  name: "Rukh Labs",
  url: "https://rukhlabs.com",
  tagline: "Software should feel powerful again.",
  description:
    "Rukh Labs builds clean, secure, beautifully designed software for people who expect more from their tools.",
  brandLines: [
    "Software should feel powerful again.",
    "Beautiful software for people who expect more.",
    "Built against bloat.",
    "Clean tools. Sharper standards.",
    "Independent software lab.",
  ],
  navItems: [
    { label: "Products", href: "/products" },
    { label: "Rukh OS", href: "/products/rukh-os" },
    { label: "Farzin", href: "/products/farzin" },
    { label: "Changelog", href: "/changelog" },
    { label: "Security", href: "/security" },
    { label: "About", href: "/about" },
    { label: "Contact", href: "/contact" },
  ],
  footer: {
    products: [
      { label: "Products", href: "/products" },
      { label: "Rukh OS", href: "/products/rukh-os" },
      { label: "Farzin", href: "/products/farzin" },
      { label: "Download", href: "/download" },
    ],
    company: [
      { label: "About", href: "/about" },
      { label: "Changelog", href: "/changelog" },
      { label: "Security", href: "/security" },
      { label: "Contact", href: "/contact" },
    ],
    legal: [
      { label: "Privacy", href: "/legal/privacy" },
      { label: "Terms", href: "/legal/terms" },
    ],
  },
  productInterestOptions: ["Everything Rukh Labs", "Rukh OS", "Farzin"],
  contactReasons: [
    "Beta access",
    "Product feedback",
    "Security report",
    "Partnership or press",
  ],
};

type MetadataInput = {
  title: string;
  description: string;
  path?: string;
};

export function createPageMetadata({
  title,
  description,
  path = "/",
}: MetadataInput): Metadata {
  const fullTitle =
    title === siteConfig.name ? siteConfig.name : `${title} | ${siteConfig.name}`;
  const url = new URL(path, siteConfig.url).toString();

  return {
    title: fullTitle,
    description,
    metadataBase: new URL(siteConfig.url),
    alternates: {
      canonical: url,
    },
    openGraph: {
      title: fullTitle,
      description,
      url,
      siteName: siteConfig.name,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
    },
  };
}
