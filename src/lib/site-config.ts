import type { Metadata } from "next";

export const FARZIN_GOOGLE_PLAY_URL =
  "https://play.google.com/store/apps/details?id=com.rukhlabs.farzin";

export const siteConfig = {
  name: "Rukh Labs",
  url: "https://rukhlabs.com",
  contactEmail: "hello@rukhlabs.com",
  tagline: "Clean tools. Sharper standards.",
  description:
    "Rukh Labs is an independent digital studio and software lab providing data operations automation, distinctive websites, recruiter-ready career portfolios, and original software.",
  links: {
    patreon: "https://patreon.com/rukhlabs",
    farzinGooglePlay: FARZIN_GOOGLE_PLAY_URL,
    email: "mailto:hello@rukhlabs.com",
    dataOpsProject: "/data-ops#intake",
    websiteProject: "/contact?inquiry=website",
    careerPortfolioProject: "/contact?inquiry=career-portfolio",
  },
  brandLines: [
    "Clean tools. Sharper standards.",
    "Independent digital studio and software lab.",
  ],
  navItems: [
    { label: "Data Ops", href: "/data-ops" },
    { label: "Websites", href: "/services/web-development" },
    { label: "Career Portfolios", href: "/services/career-portfolios" },
    { label: "Work", href: "/work" },
    { label: "Products", href: "/products" },
    { label: "Insights", href: "/insights" },
    { label: "About", href: "/about" },
  ],
  footer: {
    products: [
      { label: "Products", href: "/products" },
      { label: "Glass Squares OS", href: "/products/glass-squares-os" },
      {
        label: "Farzin",
        href: "/products/farzin",
      },
      { label: "Download", href: "/download" },
    ],
    company: [
      { label: "Data Operations", href: "/data-ops" },
      { label: "Web Development", href: "/services/web-development" },
      { label: "Career Portfolios", href: "/services/career-portfolios" },
      { label: "Work", href: "/work" },
      { label: "Insights", href: "/insights" },
      { label: "About", href: "/about" },
      { label: "Changelog", href: "/changelog" },
      { label: "Security", href: "/security" },
      { label: "Contact", href: "/contact" },
    ],
    legal: [{ label: "Privacy", href: "/legal/privacy" }],
  },
  productInterestOptions: ["Everything Rukh Labs", "Glass Squares OS"],
  contactReasons: [
    "Website design project",
    "Career portfolio project",
    "Data operations project",
    "Beta access",
    "Product feedback",
    "Security report",
    "Partnership or press",
    "Something else",
  ],
};

type MetadataInput = {
  title: string;
  description: string;
  path?: string;
  image?: {
    url: string;
    width?: number;
    height?: number;
    alt: string;
  };
  robots?: Metadata["robots"];
  type?: "website" | "article";
  publishedTime?: string;
  modifiedTime?: string;
  authors?: string[];
  keywords?: string[];
};

export function createPageMetadata({
  title,
  description,
  path = "/",
  image,
  robots,
  type = "website",
  publishedTime,
  modifiedTime,
  authors,
  keywords,
}: MetadataInput): Metadata {
  const fullTitle =
    title.includes(siteConfig.name) ? title : `${title} | ${siteConfig.name}`;
  const url = new URL(path, siteConfig.url).toString();

  const openGraph: NonNullable<Metadata["openGraph"]> = {
    title: fullTitle,
    description,
    url,
    siteName: siteConfig.name,
    type,
  };

  if (image) {
    openGraph.images = [image];
  }

  if (type === "article") {
    Object.assign(openGraph, {
      publishedTime,
      modifiedTime,
      authors,
    });
  }

  return {
    title: fullTitle,
    description,
    metadataBase: new URL(siteConfig.url),
    alternates: {
      canonical: url,
    },
    openGraph,
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      images: image ? [image] : undefined,
    },
    robots,
    authors: authors?.map((name) => ({ name })),
    keywords,
  };
}
