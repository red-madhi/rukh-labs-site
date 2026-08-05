import type { MetadataRoute } from "next";
import { seoRoutes } from "@/lib/seo-routes";
import { siteConfig } from "@/lib/site-config";

export default function sitemap(): MetadataRoute.Sitemap {
  return seoRoutes
    .filter((route) => route.indexable)
    .map((route) => ({
      url: new URL(route.path, siteConfig.url).toString(),
      lastModified: route.lastModified,
      changeFrequency: route.changeFrequency,
      priority: route.priority,
    }));
}
