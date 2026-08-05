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
  evidenceEyebrow: string;
  evidenceTitle: string;
  evidenceDescription: string;
  approach: readonly string[];
  exampleTitle: string;
  exampleDescription: string;
  exampleItems: readonly { label: string; value: string }[];
  exampleDiagram?: {
    title: string;
    inputs: readonly string[];
    output: string;
    description: string;
  };
  exampleCode?: {
    title: string;
    code: string;
    description: string;
  };
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
    evidenceEyebrow: "Portfolio evidence",
    evidenceTitle: "What an analyst portfolio should prove.",
    evidenceDescription: "A strong case study connects the business question and intended audience to the source data, cleaning, data-quality decisions, modeling, analysis, measures, and visualization. It also documents assumptions and limitations, then closes with the outcome or intended decision without overstating what the evidence proves.",
    approach: ["Role and positioning statement tailored to the analyst work you want next.", "Case-study structure for source data, cleaning, modeling, calculations, visuals, and decisions.", "Technical depth for dashboards, SQL, Python, Power BI, Tableau, Excel, and automation where appropriate.", "Clear labels for synthetic data, redacted work, limitations, and artifacts that should remain private.", "Accessible hierarchy for recruiters, hiring managers, and technical reviewers."],
    exampleTitle: "Service-support resolution analysis",
    exampleDescription: "This fictional planning example is not client work. It shows how a candidate could explain a service-operations analysis using entirely synthetic data; it represents no company, employer, customer, or measured result.",
    exampleItems: [
      { label: "Business question", value: "How should support leaders examine resolution patterns by category and channel without treating one rate as the whole service story?" },
      { label: "Audience and intended decision", value: "A fictional support-operations lead reviewing where process definitions or staffing questions deserve deeper investigation." },
      { label: "Source tables", value: "Synthetic Tickets, Agents, Dates, Categories, and Channels tables with no personal or confidential records." },
      { label: "Data-quality issue", value: "Some fictional tickets have missing resolution timestamps or reopened status. The analyst would flag them, define their treatment, and document the limitation." },
      { label: "Measure definition", value: "Resolved Tickets counts records meeting the documented final-status rule; Total Tickets counts eligible ticket records in filter context. Reopened tickets and incomplete records require an explicit, disclosed rule." },
      { label: "Dashboard purpose", value: "Pair a primary resolution-rate view with a trend, category and channel breakdowns, operational detail, and filters that support investigation rather than a performance claim." },
      { label: "Assumptions, limitations, and privacy", value: "All data and results are fictional and synthetic. Definitions are illustrative, no real organization is represented, and no business impact is claimed." },
      { label: "Suggested portfolio-page structure", value: "Overview; business context; data and quality; model; measures; visual design; findings; assumptions and limitations; technical appendix." },
    ],
    exampleDiagram: {
      title: "Illustrative star schema",
      inputs: ["Dim Date", "Dim Agent", "Dim Category", "Dim Channel"],
      output: "Fact Tickets",
      description: "One row in Fact Tickets represents one synthetic ticket. Separate dimensions support consistent filtering and readable reporting logic; this is an illustrative design, not a universal requirement.",
    },
    exampleCode: {
      title: "Illustrative DAX measure",
      code: "Resolution Rate =\nDIVIDE(\n    [Resolved Tickets],\n    [Total Tickets]\n)",
      description: "The measure is only meaningful with documented numerator, denominator, filter-context, reopened-ticket, and incomplete-record rules. Its fictional output is not a performance claim.",
    },
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
    evidenceEyebrow: "Technical delivery",
    evidenceTitle: "How to present BI architecture and delivery.",
    evidenceDescription: "Show the model grain, facts and dimensions, and why a star or snowflake structure was chosen. Connect semantic models, DAX, calculation groups where relevant, Power Query, M, and ETL to data quality, row-level security, governance, deployment, performance, and documentation decisions.",
    approach: ["A positioning layer for the BI development work you want to be hired to do.", "Case-study pages that connect semantic-model design to the questions a report needed to answer.", "Technical sections for DAX measures, calculation groups, Power Query, M, ETL, security, and governance.", "Clear treatment of synthetic demonstrations, redacted screenshots, and limitations.", "Navigation that lets a recruiter scan while preserving a path into the technical work."],
    exampleTitle: "Workforce-events semantic model",
    exampleDescription: "This fictional planning example is not client work and was not built from an employer system. It outlines a privacy-safe BI case study using synthetic workforce-event records only.",
    exampleItems: [
      { label: "Fact-table grain", value: "One synthetic workforce event per row, keyed to a date, department, manager role, and status; no named person or employee record is included." },
      { label: "Semantic-model design", value: "A star-shaped model separates descriptive dimensions from Fact Workforce Events, with relationships and measure ownership documented in the model." },
      { label: "Power Query and ETL", value: "An illustrative staging flow standardizes status values, validates keys, rejects duplicate event identifiers, and records transformation decisions in Power Query or M documentation." },
      { label: "Row-level security", value: "A conceptual department-access mapping demonstrates how authorization could filter the model; it contains no real identities, access assignments, or security configuration." },
      { label: "Data-quality rule", value: "Every event must have one valid event date, status, and department key before entering the reporting fact table; exceptions remain visible in a quality log." },
      { label: "Deployment and governance", value: "Describe development, review, and production stages; ownership; refresh expectations; measure review; and change-control responsibilities without claiming a real deployment." },
      { label: "Documentation", value: "Include grain, relationship diagram, transformation notes, DAX definitions, calculation-group rationale where relevant, security concept, quality rules, performance checks, and limitations." },
      { label: "Synthetic-data disclosure", value: "All model elements and values are fictional. No real employer, workforce, client, deployment, or measured outcome is represented." },
    ],
    exampleDiagram: {
      title: "Illustrative workforce model",
      inputs: ["Dim Date", "Dim Department", "Dim Manager", "Dim Status"],
      output: "Fact Workforce Events",
      description: "Each dimension filters the event-grain fact table. The diagram communicates model intent without exposing any real organization, identity, source, or access design.",
    },
    exampleCode: {
      title: "Illustrative DAX measure",
      code: "Event Count =\nCOUNTROWS(\n    'Fact Workforce Events'\n)",
      description: "The base measure makes filter behavior explicit and can support documented derived measures. Any calculation group or downstream rate would still need a stated business definition.",
    },
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
    evidenceEyebrow: "Website essentials",
    evidenceTitle: "What a small-business website needs to make clear.",
    evidenceDescription: "The site should clarify the offer, audience, services, and approved proof, then make calls, contact, forms, or booking easy on mobile where relevant. It should also define domain and hosting ownership, content ownership, and who is responsible for maintenance after launch.",
    approach: ["Clarify a focused offer and decide whether one page or a multi-page structure will serve it better.", "Build responsive service pages with readable hierarchy, accessible controls, and direct contact actions.", "Plan forms, booking, calls, testimonials or reviews only when real and approved, and third-party services that need setup.", "Establish practical analytics, privacy, hosting, and maintenance expectations before launch.", "Keep projects remote and avoid unsupported location-based claims."],
    exampleTitle: "Independent service-business website plan",
    exampleDescription: "This fictional planning example is not client work. It uses a generic service business to demonstrate page and ownership decisions without a fabricated address, review, result, customer, or service-area claim.",
    exampleItems: [
      { label: "Primary audience", value: "People comparing a clearly defined professional service and deciding whether an initial conversation is appropriate." },
      { label: "Primary action", value: "Use an accessible inquiry form or a plainly labeled booking path after reviewing service fit, process, and approved proof." },
      { label: "Suggested page structure", value: "Home, services, process, about the practice, approved work or proof, questions, and contact." },
      { label: "Service explanation", value: "Each service page states who it is for, the problem it addresses, what is included, boundaries, process, and the next step." },
      { label: "Contact or booking path", value: "Persistent but unobtrusive contact actions, clear form labels, confirmation feedback, and a fallback email link." },
      { label: "Proof section", value: "Reserve structured space for genuine, permissioned credentials or examples when available; never substitute invented reviews or outcomes." },
      { label: "Mobile behavior", value: "Readable type, touch-sized controls, stacked content, concise navigation, and forms that do not create horizontal overflow." },
      { label: "Ownership and maintenance", value: "The business controls the domain and content. Hosting access, updates, backups, form checks, and maintenance responsibility are documented before launch." },
    ],
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
    evidenceEyebrow: "Decision-maker clarity",
    evidenceTitle: "How to explain complex services to decision-makers.",
    evidenceDescription: "Map distinct audiences to a clear service architecture and engagement model. Support longer decision cycles with thought leadership, approved proof, permissioned case studies, a coherent consultation flow, and direct explanations of trust, privacy, and security expectations.",
    approach: ["Map audiences, service lines, longer sales-cycle questions, and the evidence each page needs.", "Create a clear hierarchy for consulting, advisory, technical, strategy, data, or independent professional services.", "Use content systems that make future insights and permissioned work easier to publish.", "Design consultation and contact paths that respect privacy, security expectations, and decision-maker time.", "Use an appropriate direction such as Signal when its clarity-first visual style suits the business."],
    exampleTitle: "Technical advisory practice website plan",
    exampleDescription: "This fictional planning example is not client work. It demonstrates information architecture for a generic advisory practice without invented clients, logos, testimonials, results, or commercial metrics.",
    exampleItems: [
      { label: "Decision-maker audience", value: "Leaders and technical evaluators who need different levels of context before deciding whether to request a consultation." },
      { label: "Service hierarchy", value: "Organize capabilities into a small number of outcome-oriented service groups, then give each a scope, audience, process, boundaries, and related expertise." },
      { label: "Engagement path", value: "Explain discovery, fit assessment, proposal, delivery, and review as a decision path rather than promising an outcome." },
      { label: "Insights and resources", value: "Publish genuinely authored articles, guides, or technical notes that help a prospective buyer understand the practice's reasoning." },
      { label: "Approved proof", value: "Use permissioned case studies, credentials, methods, or anonymized evidence only when truthful and authorized; leave the section clearly labeled when proof is not public." },
      { label: "Consultation path", value: "Set expectations for the inquiry, information requested, response process, and who the service is not designed for." },
      { label: "Privacy and security", value: "State how inquiry data is handled, avoid collecting unnecessary sensitive information, and explain relevant security boundaries without making unsupported guarantees." },
      { label: "Longer sales-cycle content", value: "Provide evaluation questions, engagement detail, technical depth, procurement context, and related insights that remain useful across multiple review stages." },
    ],
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
