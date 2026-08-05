import type { ContentCta, ContentLink } from "@/lib/content";

export type FocusedService = {
  parent: "web-development" | "career-portfolios";
  slug: string;
  path: string;
  parentPath: string;
  parentLabel: string;
  title: string;
  metaTitle: string;
  description: string;
  eyebrow: string;
  summary: string;
  focus: readonly { title: string; copy: string }[];
  approach: readonly string[];
  pricingNote: string;
  related: readonly ContentLink[];
  cta: ContentCta;
};

export const focusedServices: readonly FocusedService[] = [
  {
    parent: "career-portfolios",
    slug: "data-analysts",
    path: "/services/career-portfolios/data-analysts",
    parentPath: "/services/career-portfolios",
    parentLabel: "Career portfolios",
    title: "Career Portfolios for Data Analysts",
    metaTitle: "Career Portfolio Websites for Data Analysts",
    description: "Career portfolio websites for data analysts who need to show business context, technical decisions, dashboard work, and privacy-safe proof.",
    eyebrow: "Career portfolios for data analysts",
    summary: "Show more than a list of tools. Build a portfolio that gives the business question, data work, decisions, and technical evidence a clear place to live.",
    focus: [
      { title: "Business context before the stack", copy: "Frame the decision, stakeholder question, data constraints, and what the analysis was meant to make easier." },
      { title: "Proof at the right depth", copy: "Pair an easy recruiter scan with deeper pages for Power BI, Tableau, SQL, Python, Excel, automation, and dashboard decisions." },
      { title: "Privacy-aware evidence", copy: "Use approved screenshots, synthetic data, recreated visuals, and clear limitations when enterprise work cannot be shown directly." },
    ],
    approach: ["Role and positioning statement tailored to the analyst work you want next.", "Case-study structure for source data, cleaning, modeling, calculations, visuals, and decisions.", "Technical depth for dashboards, SQL, Python, Power BI, Tableau, Excel, and automation where appropriate.", "Clear labels for synthetic data, redacted work, limitations, and artifacts that should remain private.", "Accessible hierarchy for recruiters, hiring managers, and technical reviewers."],
    pricingNote: "Current packages are published on the parent Career Portfolio Studio page. Scope is shaped around the approved work, evidence, and privacy needs involved.",
    related: [
      { label: "Data analyst career portfolio guide", href: "/insights/data-analyst-career-portfolio-guide", description: "Plan the evidence and project structure." },
      { label: "How to show confidential work", href: "/insights/show-confidential-work-in-career-portfolio", description: "Review safer ways to present sensitive projects." },
      { label: "Career portfolio demonstration work", href: "/work/career-portfolio-demo", description: "See how a fictional privacy-safe demonstration is framed." },
    ],
    cta: { eyebrow: "Career Portfolio Studio", title: "Make the analysis easier to understand and remember.", description: "Start with the roles, projects, and privacy boundaries that should shape your portfolio.", label: "Start a data analyst portfolio", href: "/contact?inquiry=career-portfolio" },
  },
  {
    parent: "career-portfolios",
    slug: "bi-developers",
    path: "/services/career-portfolios/bi-developers",
    parentPath: "/services/career-portfolios",
    parentLabel: "Career portfolios",
    title: "Career Portfolios for BI Developers",
    metaTitle: "Career Portfolio Websites for BI Developers",
    description: "Career portfolio websites for BI developers who need to explain Power BI, semantic models, DAX, data quality, governance, and privacy-safe technical work.",
    eyebrow: "Career portfolios for BI developers",
    summary: "A BI portfolio can make semantic models, DAX, ETL decisions, and dashboard interaction understandable without publishing sensitive source data or internal systems.",
    focus: [
      { title: "Model reasoning", copy: "Explain the grain, facts, dimensions, star or snowflake choices, relationships, and measures that shaped a semantic model." },
      { title: "Governed delivery", copy: "Make room for Power Query, M, data quality, row-level security, deployment, documentation, performance, and ownership decisions." },
      { title: "Technical evidence with boundaries", copy: "Show enough architecture and interaction to demonstrate depth while keeping enterprise data, connections, and access details private." },
    ],
    approach: ["A positioning layer for the BI development work you want to be hired to do.", "Case-study pages that connect semantic-model design to the questions a report needed to answer.", "Technical sections for DAX measures, calculation groups, Power Query, M, ETL, security, and governance.", "Clear treatment of synthetic demonstrations, redacted screenshots, and limitations.", "Navigation that lets a recruiter scan while preserving a path into the technical work."],
    pricingNote: "Current packages are published on the parent Career Portfolio Studio page. The final scope depends on the number of approved case studies, artifacts, and technical views required.",
    related: [
      { label: "Data analyst career portfolio guide", href: "/insights/data-analyst-career-portfolio-guide", description: "Use a layered structure for business and technical readers." },
      { label: "How to show confidential work", href: "/insights/show-confidential-work-in-career-portfolio", description: "Protect models, data, and implementation details." },
      { label: "Career portfolio demonstration work", href: "/work/career-portfolio-demo", description: "Explore the fictional portfolio approach." },
    ],
    cta: { eyebrow: "Career Portfolio Studio", title: "Give technical BI work a clearer narrative.", description: "Build a portfolio around semantic models, measures, delivery decisions, and approved evidence.", label: "Start a BI developer portfolio", href: "/contact?inquiry=career-portfolio" },
  },
  {
    parent: "web-development",
    slug: "small-business",
    path: "/services/web-development/small-business",
    parentPath: "/services/web-development",
    parentLabel: "Web development",
    title: "Website Design for Small Businesses",
    metaTitle: "Small-Business Website Design",
    description: "Small-business website design for clearer services, mobile usability, contact actions, practical maintenance, and a trustworthy public presence.",
    eyebrow: "Websites for small businesses",
    summary: "A small-business website should make the offer, proof, and next action easy to understand on any device without creating unnecessary operational weight.",
    focus: [
      { title: "Credibility and clarity", copy: "Explain the service, who it helps, the questions visitors ask, and the proof that belongs near a decision." },
      { title: "Practical actions", copy: "Design contact, call, booking, form, location, service-area, and review paths around how the business actually works." },
      { title: "Ownership after launch", copy: "Plan domains, hosting, analytics, updates, maintenance, content changes, and the people responsible for them." },
    ],
    approach: ["Clarify a focused offer and decide whether one page or a multi-page structure will serve it better.", "Build responsive service pages with readable hierarchy, accessible controls, and direct contact actions.", "Plan forms, booking, calls, testimonials or reviews only when real and approved, and third-party services that need setup.", "Establish practical analytics, privacy, hosting, and maintenance expectations before launch.", "Keep projects remote and avoid unsupported location-based claims."],
    pricingNote: "Current Rukh Labs website packages are published on the parent website service page. They are transparent studio examples, not market-average claims.",
    related: [
      { label: "Small-business website cost guide", href: "/insights/small-business-website-cost-guide", description: "Compare scope before comparing proposals." },
      { label: "Create a website project brief", href: "/tools/website-project-brief", description: "Organize goals, pages, features, and constraints." },
      { label: "Rukh Labs website work", href: "/work/rukh-labs-website", description: "See the internal platform work behind the studio site." },
    ],
    cta: { eyebrow: "Website Studio", title: "Start with the decisions your site needs to support.", description: "Use a project brief to turn your scope, content, and operational needs into a useful starting point.", label: "Plan a small-business website", href: "/tools/website-project-brief" },
  },
  {
    parent: "web-development",
    slug: "professional-services",
    path: "/services/web-development/professional-services",
    parentPath: "/services/web-development",
    parentLabel: "Web development",
    title: "Website Design for Professional Services",
    metaTitle: "Professional-Services Website Design",
    description: "Professional-services website design for consultants, advisory firms, analysts, technical providers, and teams with complex services to explain.",
    eyebrow: "Websites for professional services",
    summary: "Professional service sites earn trust by making complex work easier to understand: who the work is for, how engagement works, what proof is approved to show, and what a decision-maker should do next.",
    focus: [
      { title: "Complex service explanation", copy: "Turn a broad capability statement into an information hierarchy that separates audiences, problems, methods, and engagement paths." },
      { title: "Decision-maker navigation", copy: "Give prospective clients a clear route through thought leadership, selected proof, service details, consultation flows, and contact." },
      { title: "Trust without invented proof", copy: "Use real approved credentials, case studies, and testimonials when available. Do not fill the gap with fictional results or generic logos." },
    ],
    approach: ["Map audiences, service lines, longer sales-cycle questions, and the evidence each page needs.", "Create a clear hierarchy for consulting, advisory, technical, strategy, data, or independent professional services.", "Use content systems that make future insights and permissioned work easier to publish.", "Design consultation and contact paths that respect privacy, security expectations, and decision-maker time.", "Use an appropriate direction such as Signal when its clarity-first visual style suits the business."],
    pricingNote: "Current Rukh Labs website packages are published on the parent website service page. Scope changes with the service architecture, content system, integrations, and approved proof involved.",
    related: [
      { label: "Small-business website cost guide", href: "/insights/small-business-website-cost-guide", description: "Understand scope before accepting a proposal." },
      { label: "Create a website project brief", href: "/tools/website-project-brief", description: "Prepare a concise brief for a complex service site." },
      { label: "Rukh Labs website work", href: "/work/rukh-labs-website", description: "Explore the studio's own information architecture." },
    ],
    cta: { eyebrow: "Website Studio", title: "Give a complex service a clearer public shape.", description: "Start a brief that identifies the audiences, pages, proof, and consultation flow your site needs.", label: "Plan a professional-services website", href: "/tools/website-project-brief" },
  },
] as const;

export function getFocusedService(parent: FocusedService["parent"], slug: string) {
  return focusedServices.find((service) => service.parent === parent && service.slug === slug);
}
