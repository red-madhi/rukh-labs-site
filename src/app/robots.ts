import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
      },
    ],
    sitemap: "https://rukhlabs.com/sitemap.xml",
  };
}

// The unlisted portfolio remains crawlable so robots can see its noindex tags.
// Noindex is a search directive, not access control or authentication.
