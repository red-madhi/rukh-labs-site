# Rukh Labs SEO Phase 2 content map

Implementation date: 2026-08-05
Canonical origin: `https://rukhlabs.com`

| Route | Page type | Primary audience | Search intent | Primary CTA | Parent topic | Related internal links | Structured data | Sitemap | Indexing |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `/work` | Work hub | Prospective clients, product visitors | Evaluate public Rukh Labs work | Explore a project | Studio work | Products, services, insights | `CollectionPage` | Yes | Index, follow |
| `/work/rukh-labs-website` | Internal platform work | Website prospects | Understand the studio platform | Create a website brief | Work | Website service, cost guide, tool | `CreativeWork`, `BreadcrumbList` | Yes | Index, follow |
| `/work/farzin` | Product work | Chess product visitors | Understand Farzin product work | Explore Farzin | Work | Farzin product, privacy, products | `CreativeWork`, `BreadcrumbList` | No | Noindex, follow |
| `/work/glass-squares-os` | Product-in-development work | OS product visitors | Understand current direction and limits | Explore Glass Squares OS | Work | Product page, changelog | `CreativeWork`, `BreadcrumbList` | No | Noindex, follow |
| `/work/career-portfolio-demo` | Fictional service demonstration work | Career portfolio prospects | Understand the demonstration approach | Explore career portfolio services | Work | Demo, guides, service | `CreativeWork`, `BreadcrumbList` | Yes | Index, follow |
| `/insights` | Insights hub | Website and career prospects | Find practical guidance | Open a guide | Resources | Work, services | `CollectionPage` | Yes | Index, follow |
| `/insights/small-business-website-cost-guide` | Guide | Small-business website buyers | Plan scope and proposal questions | Create a website brief | Website planning | Focused services, tool | `Article`, `BreadcrumbList` | Yes | Index, follow |
| `/insights/data-analyst-career-portfolio-guide` | Technical guide with a synthetic support-analysis model, DAX measure, quality issue, dashboard plan, and page hierarchy | Data analysts | Build a useful evidence portfolio | Explore career portfolio services | Analytics careers | Focused services, confidential-work guide, demo work | `Article`, `TechArticle`, `BreadcrumbList` | Yes | Index, follow |
| `/insights/show-confidential-work-in-career-portfolio` | Guide | Portfolio builders with sensitive work | Publish safer proof | Discuss a career portfolio | Privacy and proof | Career service, data analyst guide, demo work | `Article`, `BreadcrumbList` | Yes | Index, follow |
| `/services/career-portfolios/data-analysts` | Focused service with analyst-specific evidence and a synthetic support-analysis planning example | Data analysts | Find a portfolio service for analytics work | Start a data analyst portfolio | Career portfolios | Parent service, guides, demo work | `Service`, `BreadcrumbList` | Yes | Index, follow |
| `/services/career-portfolios/bi-developers` | Focused service with BI delivery evidence and a synthetic workforce-model planning example | BI developers | Find a portfolio service for BI work | Start a BI developer portfolio | Career portfolios | Parent service, guides, demo work | `Service`, `BreadcrumbList` | Yes | Index, follow |
| `/services/web-development/small-business` | Focused service with website essentials and a generic service-business planning example | Small-business owners | Plan a clear small-business site | Plan a small-business website | Website development | Parent service, cost guide, tool | `Service`, `BreadcrumbList` | Yes | Index, follow |
| `/services/web-development/professional-services` | Focused service with decision-maker evidence and a fictional advisory-practice planning example | Consultants and service firms | Plan a site for complex services | Plan a professional-services website | Website development | Parent service, cost guide, tool | `Service`, `BreadcrumbList` | Yes | Index, follow |
| `/tools/website-project-brief` | Browser-only tool with static fictional output plus Markdown and plain-text exports | Website planning visitors | Organize project scope | Discuss the project | Website planning | Website service, cost guide, contact | `WebApplication`, `BreadcrumbList` | Yes | Index, follow |

The primary `/products/farzin` and `/products/glass-squares-os` routes remain indexable, self-canonical, and included in the sitemap. Their overlapping Work routes are public, self-canonical, and noindex/follow, and are excluded from the sitemap through the central route manifest. They can be reconsidered for indexing after they contain substantially unique architecture, implementation detail, screenshots, iterations, tests, technical tradeoffs, release evidence, or development decisions not duplicated on the product pages.

All new Insight articles were published and last modified on the explicit Phase 2 deployment date, 2026-08-05. Every route materially changed by this phase uses that stable date in `src/lib/seo-routes.ts`; unchanged routes keep their existing meaningful dates. Same-day articles show only the publication date.

The fictional career demo at `/services/career-portfolios/demo` remains a noindex conversion example. The private recruiter portfolio remains noindex, nofollow, noarchive, nosnippet, unlisted, and excluded from this map and the sitemap.
