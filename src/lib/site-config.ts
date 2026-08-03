import type { Metadata } from "next";

export const FARZIN_GOOGLE_PLAY_URL =
  "https://play.google.com/store/apps/details?id=com.rukhlabs.farzin";

export const siteConfig = {
  name: "Rukh Labs",
  url: "https://rukhlabs.com",
  contactEmail: "rukhlabs@gmail.com",
  tagline: "Software should feel powerful again.",
  description:
    "Rukh Labs builds clean, secure, beautifully designed software for people who expect more from their tools.",
  links: {
    patreon: "https://patreon.com/rukhlabs",
    farzinGooglePlay: FARZIN_GOOGLE_PLAY_URL,
    email: "mailto:rukhlabs@gmail.com",
    websiteProject:
      "mailto:rukhlabs@gmail.com?subject=Rukh%20Labs%20Website%20Project",
  },
  brandLines: [
    "Software should feel powerful again.",
    "Beautiful software for people who expect more.",
    "Built against bloat.",
    "Clean tools. Sharper standards.",
    "Independent software lab.",
  ],
  navItems: [
    { label: "Products", href: "/products" },
    { label: "Websites", href: "/services/web-development" },
    { label: "Glass Squares OS", href: "/products/glass-squares-os" },
    {
      label: "Farzin",
      href: FARZIN_GOOGLE_PLAY_URL,
      external: true,
    },
    { label: "Changelog", href: "/changelog" },
    { label: "Security", href: "/security" },
    { label: "About", href: "/about" },
    { label: "Contact", href: "/contact" },
  ],
  footer: {
    products: [
      { label: "Products", href: "/products" },
      { label: "Glass Squares OS", href: "/products/glass-squares-os" },
      {
        label: "Farzin",
        href: FARZIN_GOOGLE_PLAY_URL,
        external: true,
      },
      { label: "Download", href: "/download" },
    ],
    company: [
      { label: "Web Development", href: "/services/web-development" },
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
  productInterestOptions: ["Everything Rukh Labs", "Glass Squares OS"],
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
      images: [
        {
          url: "/brand/rukh-labs-primary.png",
          width: 1549,
          height: 690,
          alt: "Rukh Labs",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      images: ["/brand/rukh-labs-primary.png"],
    },
  };
}
