export type SeoRouteClassification =
  | "indexable"
  | "noindex-follow"
  | "private-noindex-nofollow";

export type SeoRoute = {
  path: string;
  lastModified: string;
  changeFrequency:
    | "always"
    | "hourly"
    | "daily"
    | "weekly"
    | "monthly"
    | "yearly"
    | "never";
  priority: number;
  indexable: boolean;
  follow: boolean;
  classification: SeoRouteClassification;
};

export const SEO_CONTENT_UPDATED = "2026-08-04";
const SEO_ABOUT_UPDATED = "2026-08-05";
const SEO_PHASE_TWO_PUBLISHED = "2026-08-05";

export const seoRoutes: readonly SeoRoute[] = [
  { path: "/", lastModified: SEO_CONTENT_UPDATED, changeFrequency: "weekly", priority: 1, indexable: true, follow: true, classification: "indexable" },
  { path: "/services/web-development", lastModified: SEO_CONTENT_UPDATED, changeFrequency: "monthly", priority: 0.9, indexable: true, follow: true, classification: "indexable" },
  { path: "/services/career-portfolios", lastModified: SEO_CONTENT_UPDATED, changeFrequency: "monthly", priority: 0.9, indexable: true, follow: true, classification: "indexable" },
  { path: "/services/web-development/small-business", lastModified: SEO_PHASE_TWO_PUBLISHED, changeFrequency: "monthly", priority: 0.8, indexable: true, follow: true, classification: "indexable" },
  { path: "/services/web-development/professional-services", lastModified: SEO_PHASE_TWO_PUBLISHED, changeFrequency: "monthly", priority: 0.8, indexable: true, follow: true, classification: "indexable" },
  { path: "/services/career-portfolios/data-analysts", lastModified: SEO_PHASE_TWO_PUBLISHED, changeFrequency: "monthly", priority: 0.8, indexable: true, follow: true, classification: "indexable" },
  { path: "/services/career-portfolios/bi-developers", lastModified: SEO_PHASE_TWO_PUBLISHED, changeFrequency: "monthly", priority: 0.8, indexable: true, follow: true, classification: "indexable" },
  { path: "/products", lastModified: SEO_CONTENT_UPDATED, changeFrequency: "monthly", priority: 0.8, indexable: true, follow: true, classification: "indexable" },
  { path: "/products/farzin", lastModified: SEO_CONTENT_UPDATED, changeFrequency: "monthly", priority: 0.9, indexable: true, follow: true, classification: "indexable" },
  { path: "/products/farzin/privacy", lastModified: SEO_CONTENT_UPDATED, changeFrequency: "yearly", priority: 0.3, indexable: true, follow: true, classification: "indexable" },
  { path: "/products/glass-squares-os", lastModified: SEO_CONTENT_UPDATED, changeFrequency: "monthly", priority: 0.9, indexable: true, follow: true, classification: "indexable" },
  { path: "/download", lastModified: SEO_CONTENT_UPDATED, changeFrequency: "monthly", priority: 0.7, indexable: true, follow: true, classification: "indexable" },
  { path: "/changelog", lastModified: SEO_CONTENT_UPDATED, changeFrequency: "weekly", priority: 0.7, indexable: true, follow: true, classification: "indexable" },
  { path: "/security", lastModified: SEO_CONTENT_UPDATED, changeFrequency: "yearly", priority: 0.5, indexable: true, follow: true, classification: "indexable" },
  { path: "/about", lastModified: SEO_ABOUT_UPDATED, changeFrequency: "yearly", priority: 0.7, indexable: true, follow: true, classification: "indexable" },
  { path: "/contact", lastModified: SEO_CONTENT_UPDATED, changeFrequency: "yearly", priority: 0.8, indexable: true, follow: true, classification: "indexable" },
  { path: "/work", lastModified: SEO_PHASE_TWO_PUBLISHED, changeFrequency: "monthly", priority: 0.8, indexable: true, follow: true, classification: "indexable" },
  { path: "/work/rukh-labs-website", lastModified: SEO_PHASE_TWO_PUBLISHED, changeFrequency: "monthly", priority: 0.7, indexable: true, follow: true, classification: "indexable" },
  { path: "/work/farzin", lastModified: SEO_PHASE_TWO_PUBLISHED, changeFrequency: "monthly", priority: 0.7, indexable: true, follow: true, classification: "indexable" },
  { path: "/work/glass-squares-os", lastModified: SEO_PHASE_TWO_PUBLISHED, changeFrequency: "monthly", priority: 0.7, indexable: true, follow: true, classification: "indexable" },
  { path: "/work/career-portfolio-demo", lastModified: SEO_PHASE_TWO_PUBLISHED, changeFrequency: "monthly", priority: 0.7, indexable: true, follow: true, classification: "indexable" },
  { path: "/insights", lastModified: SEO_PHASE_TWO_PUBLISHED, changeFrequency: "monthly", priority: 0.8, indexable: true, follow: true, classification: "indexable" },
  { path: "/insights/small-business-website-cost-guide", lastModified: SEO_PHASE_TWO_PUBLISHED, changeFrequency: "monthly", priority: 0.8, indexable: true, follow: true, classification: "indexable" },
  { path: "/insights/data-analyst-career-portfolio-guide", lastModified: SEO_PHASE_TWO_PUBLISHED, changeFrequency: "monthly", priority: 0.8, indexable: true, follow: true, classification: "indexable" },
  { path: "/insights/show-confidential-work-in-career-portfolio", lastModified: SEO_PHASE_TWO_PUBLISHED, changeFrequency: "monthly", priority: 0.8, indexable: true, follow: true, classification: "indexable" },
  { path: "/tools/website-project-brief", lastModified: SEO_PHASE_TWO_PUBLISHED, changeFrequency: "monthly", priority: 0.7, indexable: true, follow: true, classification: "indexable" },
  { path: "/legal/privacy", lastModified: SEO_CONTENT_UPDATED, changeFrequency: "yearly", priority: 0.3, indexable: true, follow: true, classification: "indexable" },
  { path: "/services/web-development/designs/obsidian", lastModified: SEO_CONTENT_UPDATED, changeFrequency: "yearly", priority: 0.5, indexable: true, follow: true, classification: "indexable" },
  { path: "/services/web-development/designs/signal", lastModified: SEO_CONTENT_UPDATED, changeFrequency: "yearly", priority: 0.5, indexable: true, follow: true, classification: "indexable" },
  { path: "/services/web-development/designs/atelier", lastModified: SEO_CONTENT_UPDATED, changeFrequency: "yearly", priority: 0.5, indexable: true, follow: true, classification: "indexable" },
  { path: "/services/web-development/designs/main-street", lastModified: SEO_CONTENT_UPDATED, changeFrequency: "yearly", priority: 0.5, indexable: true, follow: true, classification: "indexable" },
  { path: "/services/web-development/designs/spotlight", lastModified: SEO_CONTENT_UPDATED, changeFrequency: "yearly", priority: 0.5, indexable: true, follow: true, classification: "indexable" },
  { path: "/services/web-development/designs/dispatch", lastModified: SEO_CONTENT_UPDATED, changeFrequency: "yearly", priority: 0.5, indexable: true, follow: true, classification: "indexable" },
  { path: "/legal/terms", lastModified: SEO_CONTENT_UPDATED, changeFrequency: "yearly", priority: 0.1, indexable: false, follow: true, classification: "noindex-follow" },
  { path: "/services/career-portfolios/demo", lastModified: SEO_CONTENT_UPDATED, changeFrequency: "never", priority: 0.1, indexable: false, follow: true, classification: "noindex-follow" },
  { path: "/services/web-development/designs/obsidian/sample", lastModified: SEO_CONTENT_UPDATED, changeFrequency: "never", priority: 0.1, indexable: false, follow: true, classification: "noindex-follow" },
  { path: "/services/web-development/designs/signal/sample", lastModified: SEO_CONTENT_UPDATED, changeFrequency: "never", priority: 0.1, indexable: false, follow: true, classification: "noindex-follow" },
  { path: "/services/web-development/designs/atelier/sample", lastModified: SEO_CONTENT_UPDATED, changeFrequency: "never", priority: 0.1, indexable: false, follow: true, classification: "noindex-follow" },
  { path: "/services/web-development/designs/main-street/sample", lastModified: SEO_CONTENT_UPDATED, changeFrequency: "never", priority: 0.1, indexable: false, follow: true, classification: "noindex-follow" },
  { path: "/services/web-development/designs/spotlight/sample", lastModified: SEO_CONTENT_UPDATED, changeFrequency: "never", priority: 0.1, indexable: false, follow: true, classification: "noindex-follow" },
  { path: "/services/web-development/designs/dispatch/sample", lastModified: SEO_CONTENT_UPDATED, changeFrequency: "never", priority: 0.1, indexable: false, follow: true, classification: "noindex-follow" },
  { path: "/portfolio/brett-gallaher", lastModified: SEO_CONTENT_UPDATED, changeFrequency: "never", priority: 0, indexable: false, follow: false, classification: "private-noindex-nofollow" },
];

export const sitemapRoutes = seoRoutes.filter((route) => route.indexable);

export const seoRedirects = [
  { source: "/farzin", destination: "/products/farzin", status: 308 },
  { source: "/farzin-chess", destination: "/products/farzin", status: 308 },
  { source: "/apps/farzin", destination: "/products/farzin", status: 308 },
  { source: "/products/farzin-chess", destination: "/products/farzin", status: 308 },
  { source: "/farzin/privacy", destination: "/products/farzin/privacy", status: 308 },
  { source: "/legal/farzin-privacy", destination: "/products/farzin/privacy", status: 308 },
  { source: "/rukh-os", destination: "/products/glass-squares-os", status: 308 },
  { source: "/products/rukh-os", destination: "/products/glass-squares-os", status: 308 },
] as const;
