import type {
  ContentCta,
  ContentLink,
  ContentSection,
  ContentSource,
} from "@/lib/content";
import { SEO_PHASE_TWO_DEPLOYMENT_DATE } from "./seo-routes.ts";

export type Insight = {
  slug: string;
  title: string;
  metaTitle: string;
  description: string;
  summary: string;
  category: string;
  categories: readonly string[];
  publishedOn: string;
  modifiedOn: string;
  sections: readonly ContentSection[];
  related: readonly ContentLink[];
  cta: ContentCta;
  sources: readonly ContentSource[];
  schemaType: "Article" | "TechArticle";
};

const publishedOn = SEO_PHASE_TWO_DEPLOYMENT_DATE;

export const insights: readonly Insight[] = [
  {
    slug: "small-business-website-cost-guide",
    title: "Small-Business Website Cost Guide",
    metaTitle: "Small-Business Website Cost Guide",
    description:
      "A practical guide to planning small-business website costs, scope, proposals, and the tradeoffs between templates and custom work.",
    summary:
      "A useful website budget starts with the job the site needs to do, the content it needs to carry, and the work required to make those decisions clear. This guide helps you define scope before comparing proposals.",
    category: "Website planning",
    categories: ["Website planning"],
    publishedOn,
    modifiedOn: publishedOn,
    schemaType: "Article",
    sections: [
      {
        id: "what-you-are-buying",
        title: "What a website budget is actually buying",
        blocks: [
          {
            type: "paragraph",
            content:
              "A website is not one line item. It is a sequence of decisions: what the visitor needs to understand, which pages earn attention, what evidence supports the offer, how people contact you, and how the finished site stays accurate. A lower price can be a good fit when the scope is genuinely small. It becomes a problem when essential decisions are merely left out.",
          },
          {
            type: "table",
            caption: "Common parts of a website scope",
            columns: ["Area", "Questions to answer before you compare proposals"],
            rows: [
              ["Strategy and information architecture", "What should a visitor understand first, and which pages or actions support that decision?"],
              ["Design and development", "Is an existing template enough, or does the business need custom structure, interactions, and components?"],
              ["Content and assets", "Who will supply copy, photography, service details, policies, and approval feedback?"],
              ["Operations", "Do forms, booking, payments, memberships, integrations, or content migration require setup and testing?"],
              ["Launch and maintenance", "Who owns hosting, domains, analytics, updates, support, and future edits?"],
            ],
          },
          {
            type: "callout",
            title: "A price is not a scope",
            tone: "gold",
            content:
              "Two proposals can quote a similar page count while including very different work. Ask what is included in planning, content support, revisions, integrations, accessibility review, launch, and post-launch changes.",
          },
        ],
      },
      {
        id: "cost-drivers",
        title: "The decisions that change cost",
        blocks: [
          {
            type: "paragraph",
            content:
              "The biggest cost drivers are usually complexity and readiness, not a decorative feature list. A focused one-page site with prepared copy and clear goals is a different project from a multi-page site that needs new messaging, content migration, booking, ecommerce, or integrations.",
          },
          {
            type: "list",
            items: [
              "Domain registration and hosting are recurring operating costs; confirm who owns the accounts and renewals.",
              "Information architecture and copywriting grow when a business has several audiences, services, or proof points to explain.",
              "Photography, illustration, video, licensing, and image preparation are separate from page development unless a proposal says otherwise.",
              "Forms, booking, payments, ecommerce, membership, and third-party systems add setup, testing, and ongoing ownership questions.",
              "Accessibility, analytics, search foundations, redirects, content migration, and maintenance are often treated as optional even when they affect the usefulness of the finished site.",
            ],
          },
        ],
      },
      {
        id: "market-ranges",
        title: "Current cost ranges: treat them as planning references",
        blocks: [
          {
            type: "paragraph",
            content:
              "These current figures are broad planning references, not quotes. Scope, provider, geography, billing term, content readiness, integrations, maintenance, and platform fees can all change the total. Use them to understand the routes available, then ask each provider what the figure includes and excludes.",
          },
          {
            type: "table",
            caption: "Current market and platform reference ranges in U.S. dollars",
            columns: ["Route", "Current reference", "What the figure does and does not cover"],
            rows: [
              ["DIY website builder", "Examples include WordPress.com’s free plan and Wix Business at $39 per month with annual billing.", "Platform software only; it does not include custom strategy, content, design, or implementation help. Wix also publishes a wider annual-billing range of $17 to $159 per month."],
              ["Template-led freelancer project", "Upwork lists $20–$50+/hour for CMS web design as a current market reference.", "A broad hourly market estimate, not a fixed project price or a guarantee of scope."],
              ["Independent custom design", "Upwork lists $45–$75+/hour for full custom website design as a current market reference.", "A broad hourly market estimate; discovery, content, integrations, and support can be separate."],
              ["Agency project", "Clutch reports a $2,000–$100,000 project range, with most reviewed projects under $10,000.", "A wide agency-market reference; project type and operating context materially affect total cost."],
              ["Ecommerce or integration-heavy project", "Shopify annual-billing plans currently run $29–$299/month before third-party apps, implementation, content, and payment charges.", "Subscription pricing is separate from the work needed to plan, build, test, and operate the store or integrations."],
            ],
          },
          {
            type: "links",
            title: "Sources for these current reference ranges",
            links: [
              { label: "WordPress.com Pricing", href: "https://wordpress.com/pricing/?locale=en_us", description: "Official free-plan and paid-plan reference.", external: true },
              { label: "Wix Premium Plans", href: "https://www.wix.com/blog/wix-premium-plans", description: "Official annual-billing plan reference.", external: true },
              { label: "Upwork web designer cost", href: "https://www.upwork.com/hire/web-designers/cost/", description: "Current freelancer hourly market references.", external: true },
              { label: "Clutch web design pricing", href: "https://clutch.co/web-designers/pricing", description: "Current agency project-range reference.", external: true },
              { label: "Shopify Pricing", href: "https://www.shopify.com/pricing", description: "Official ecommerce subscription reference.", external: true },
            ],
          },
        ],
      },
      {
        id: "recurring-costs",
        title: "Recurring costs to model separately",
        blocks: [
          {
            type: "paragraph",
            content:
              "A project quote and the cost to operate a website are different budgets. Keep recurring software, domain, payment, and maintenance costs visible so an initial build does not hide the work required after launch.",
          },
          {
            type: "table",
            caption: "Recurring costs to itemize with the provider",
            columns: ["Cost", "Current reference", "Planning note"],
            rows: [
              ["Domain registration", "Price depends on the top-level domain. Cloudflare Registrar describes cost pricing based on registry and ICANN charges, without a registrar markup.", "Confirm account ownership, renewal price, and who receives renewal notices."],
              ["Hosting or platform subscription", "WordPress.com lists paid plans starting at $4/month with annual billing; Wix lists $17–$159/month with annual billing; Shopify includes hosting in its plans.", "Compare the feature set, billing term, and any usage limits rather than treating hosting as one generic price."],
              ["Payment processing", "Stripe lists 2.9% + 30¢ for a successful U.S. domestic card transaction. Shopify Basic lists the same online card rate on its current pricing page.", "Rates vary by payment method, country, plan, and transaction type; validate the rate that applies to the business."],
              ["Maintenance", "Provider- and scope-dependent; request an explicit recurring scope.", "Clarify updates, security, backups, content support, monitoring, response time, and what is billed separately."],
              ["Premium plugins or services", "May add subscriptions or usage charges.", "Itemize required apps, forms, booking, email, analytics, accessibility, and integration services before launch."],
            ],
          },
          {
            type: "links",
            title: "Sources for recurring platform and transaction references",
            links: [
              { label: "Cloudflare Registrar documentation", href: "https://developers.cloudflare.com/registrar/", description: "Official domain-pricing model reference.", external: true },
              { label: "WordPress.com Pricing", href: "https://wordpress.com/pricing/?locale=en_us", description: "Official platform subscription reference.", external: true },
              { label: "Wix Premium Plans", href: "https://www.wix.com/blog/wix-premium-plans", description: "Official platform subscription reference.", external: true },
              { label: "Shopify Pricing", href: "https://www.shopify.com/pricing", description: "Official ecommerce subscription and card-rate reference.", external: true },
              { label: "Stripe Pricing", href: "https://stripe.com/pricing", description: "Official payment-processing reference.", external: true },
            ],
          },
        ],
      },
      {
        id: "scope-options",
        title: "One page, templates, and custom work",
        blocks: [
          {
            type: "table",
            columns: ["Approach", "Usually a fit when", "Watch for"],
            rows: [
              ["One-page site", "There is one focused offer, limited supporting proof, and one primary action.", "Trying to compress several services, audiences, or detailed answers into a long scrolling page."],
              ["Template-led build", "Speed and a known visual structure matter more than a tailored system.", "Forcing a complex information architecture into the template's assumptions."],
              ["Custom website", "The offer, content, interactions, or visual system need a structure that a template cannot provide cleanly.", "Paying for custom work before the business has made basic content and decision-making inputs available."],
            ],
          },
          {
            type: "paragraph",
            content:
              "DIY, freelancer, independent studio, and agency work can all be appropriate. The useful comparison is not the label. It is whether the team can take responsibility for the decisions your project actually needs, explain exclusions plainly, and hand over a site your business can operate.",
          },
        ],
      },
      {
        id: "rukh-packages",
        title: "Where Rukh Labs’ current packages fit",
        blocks: [
          {
            type: "paragraph",
            content:
              "Rukh Labs publishes its current website packages on the service page so a prospective client can see the starting scope before starting a conversation. Those packages are examples of this studio's work, not a claim about market-wide averages. A custom quote should reflect the actual pages, content, integrations, and launch responsibilities involved.",
          },
          {
            type: "links",
            title: "Current Rukh Labs planning resources",
            links: [
              { label: "Website design and development service", href: "/services/web-development", description: "Review the current packages and scope." },
              { label: "Create a website project brief", href: "/tools/website-project-brief", description: "Organize scope before requesting a quote." },
            ],
          },
        ],
      },
      {
        id: "proposal-questions",
        title: "Questions to ask before accepting a proposal",
        blocks: [
          {
            type: "checklist",
            items: [
              "Which pages, templates, and content types are included?",
              "Who is responsible for copy, images, approvals, and content migration?",
              "How many revision rounds are included, and what counts as a new request?",
              "Which integrations, forms, booking, payments, or ecommerce requirements are included?",
              "How will hosting, domain ownership, analytics, backups, and maintenance be handled?",
              "What accessibility, privacy, SEO, and launch checks are included?",
              "What is explicitly excluded or billed separately?",
            ],
          },
        ],
      },
      {
        id: "prepare-for-a-quote",
        title: "Prepare before you request a quote",
        blocks: [
          {
            type: "paragraph",
            content:
              "You do not need a perfect brief. You do need a useful starting point: the business or project name, what the site should help someone do, the people it serves, existing content, reference sites, required pages or functions, timing, budget range, and who will make decisions. Better inputs make estimates more comparable and reduce avoidable rework.",
          },
          {
            type: "callout",
            title: "When a low-cost site is enough",
            content:
              "A low-cost template or one-page build can be the right decision when the offer is simple, the content is ready, and the site only needs to establish basic credibility and contact. Custom work earns its cost when the business needs clearer information architecture, a distinct system, technical integrations, or a site that must carry more complex decisions.",
          },
        ],
      },
    ],
    related: [
      { label: "Website design for small businesses", href: "/services/web-development/small-business", description: "See the decisions a small-business site should support." },
      { label: "Professional-services website design", href: "/services/web-development/professional-services", description: "Plan a clearer site for complex services." },
      { label: "Create a website project brief", href: "/tools/website-project-brief", description: "Turn your notes into a shareable scope brief." },
    ],
    cta: {
      eyebrow: "Website planning",
      title: "Start with a clearer project brief.",
      description: "Use the free browser-based brief generator to organize scope before you contact a designer or developer.",
      label: "Create a website project brief",
      href: "/tools/website-project-brief",
    },
    sources: [
      {
        title: "WordPress.com Pricing",
        publisher: "WordPress.com",
        href: "https://wordpress.com/pricing/?locale=en_us",
        accessedOn: publishedOn,
        reason: "Used for the current free-plan and paid platform-subscription references.",
      },
      {
        title: "Wix Premium Plans",
        publisher: "Wix",
        href: "https://www.wix.com/blog/wix-premium-plans",
        accessedOn: publishedOn,
        reason: "Used for the current annual-billing platform subscription references.",
      },
      {
        title: "Shopify Pricing",
        publisher: "Shopify",
        href: "https://www.shopify.com/pricing",
        accessedOn: publishedOn,
        reason: "Used for current ecommerce plan and online card-rate references.",
      },
      {
        title: "Stripe Pricing",
        publisher: "Stripe",
        href: "https://stripe.com/pricing",
        accessedOn: publishedOn,
        reason: "Used for the current U.S. domestic card-processing reference.",
      },
      {
        title: "Cloudflare Registrar documentation",
        publisher: "Cloudflare",
        href: "https://developers.cloudflare.com/registrar/",
        accessedOn: publishedOn,
        reason: "Used for the domain-registration pricing-model reference.",
      },
      {
        title: "Web Designer Cost",
        publisher: "Upwork",
        href: "https://www.upwork.com/hire/web-designers/cost/",
        accessedOn: publishedOn,
        reason: "Used for current freelancer hourly market references; these are broad estimates, not project quotes.",
      },
      {
        title: "Web Design Pricing",
        publisher: "Clutch",
        href: "https://clutch.co/web-designers/pricing",
        accessedOn: publishedOn,
        reason: "Used for the current agency project-range reference; it is presented as a broad estimate.",
      },
      {
        title: "Rukh Labs website design and development",
        publisher: "Rukh Labs",
        href: "https://rukhlabs.com/services/web-development",
        accessedOn: publishedOn,
        reason: "Used only to reference Rukh Labs’ own published package examples; no market-wide pricing claims are made.",
      },
    ],
  },
  {
    slug: "data-analyst-career-portfolio-guide",
    title: "Data Analyst Career Portfolio Guide",
    metaTitle: "Data Analyst Career Portfolio Guide",
    description:
      "Build a data analyst career portfolio that explains business context, technical decisions, data quality, and useful evidence without relying on a tool list alone.",
    summary:
      "A strong analytics portfolio makes the work legible. It gives a recruiter or hiring manager a quick route to the role you want, then gives a technical reader enough evidence to examine how you reasoned, modeled, checked, and communicated.",
    category: "Analytics careers",
    categories: ["Career portfolios", "Analytics careers", "Privacy and proof"],
    publishedOn,
    modifiedOn: publishedOn,
    schemaType: "TechArticle",
    sections: [
      {
        id: "choose-the-role",
        title: "Start with the role, not the software list",
        blocks: [
          {
            type: "paragraph",
            content:
              "A data analyst, BI developer, and analytics engineer can all use SQL, Power BI, Python, or Tableau. The useful distinction is the problem you want your portfolio to prove you can handle. Define a target role, the questions it is expected to answer, the systems it touches, and the level of technical depth the reader should find.",
          },
          {
            type: "table",
            columns: ["Positioning focus", "Portfolio evidence to emphasize"],
            rows: [
              ["Data analyst", "Business question, source data, cleaning choices, analysis, dashboard decisions, assumptions, and recommendations."],
              ["BI developer", "Semantic model, star or snowflake choices, DAX measures, Power Query or ETL, governance, performance, and deployment context."],
              ["Analytics engineer", "Data modeling, transformation workflow, testing, documentation, data contracts, downstream usability, and versioned implementation."],
            ],
          },
        ],
      },
      {
        id: "select-projects",
        title: "Choose projects with a question and a constraint",
        blocks: [
          {
            type: "paragraph",
            content:
              "A dashboard screenshot rarely shows why the work mattered. Start every project with a decision someone needed to make, the data available, and the constraints that shaped the solution. A smaller project with an honest explanation is more useful than a large collection of visuals with no context.",
          },
          {
            type: "checklist",
            items: [
              "State the business or operational question before naming the tool.",
              "Explain where the data came from and what was missing, unreliable, or intentionally excluded.",
              "Describe cleaning, transformations, modeling, measures, calculations, and validation decisions.",
              "Show the output at a readable scale, then offer a technical deep dive for readers who need it.",
              "Separate measured outcomes from proposed use; do not imply an outcome you did not observe.",
            ],
          },
        ],
      },
      {
        id: "show-technical-depth",
        title: "Show technical depth without making the page unreadable",
        blocks: [
          {
            type: "paragraph",
            content:
              "Use a layered structure. Begin with the business context and the result the work was intended to support. Then offer details about acquisition, SQL, Python, Excel automation, Power Query, Tableau, Power BI, DAX, semantic models, and dashboard interaction. Readers should be able to stop at the level that serves them.",
          },
          {
            type: "list",
            items: [
              "For data models, identify fact and dimension concepts, grain, important relationships, and why a structure fits the reporting question.",
              "For measures and calculations, explain the business definition, filter assumptions, edge cases, and how you checked the output.",
              "For visual design, explain the primary audience, comparison task, accessible labeling, interaction choices, and information hierarchy.",
              "For performance, document the constraints you observed and the changes you made; do not claim a benchmark you did not measure.",
            ],
          },
          {
            type: "callout",
            title: "Modeling is part of the story",
            content:
              "Microsoft's Power BI guidance describes star schema concepts as relevant to semantic-model performance and usability. In a portfolio, the point is not to repeat a pattern by name; it is to explain the data grain, relationships, and reporting behavior your model needed.",
          },
        ],
      },
      {
        id: "quality-and-limitations",
        title: "Make data quality, assumptions, and limitations visible",
        blocks: [
          {
            type: "paragraph",
            content:
              "Trust comes from showing what the work does not prove as well as what it does. Explain data freshness, missing values, definitions, exclusions, synthetic elements, unverified inputs, and assumptions. If a metric is scaled, normalized, or composite, say so plainly. This helps a reader judge the work without mistaking a polished interface for a complete answer.",
          },
          {
            type: "links",
            title: "Privacy-safe proof",
            links: [
              { label: "How to show confidential work in a career portfolio", href: "/insights/show-confidential-work-in-career-portfolio", description: "Use redaction, synthetic data, and access controls responsibly." },
              { label: "Fictional career portfolio demonstration", href: "/work/career-portfolio-demo", description: "See how a no-download, privacy-safe example is framed." },
            ],
          },
        ],
      },
      {
        id: "fictional-worked-example",
        title: "A fictional worked example",
        blocks: [
          {
            type: "callout",
            title: "Fictional example built by Rukh Labs",
            content: "All data in this service-support scenario is synthetic. No real company, employer, client, employee, customer, or measured business impact is represented. The example demonstrates portfolio structure and analytical reasoning, not a real engagement or result.",
            tone: "blue",
          },
          {
            type: "paragraph",
            content: "Business question: how should a support-operations team examine resolution patterns by category and channel while keeping the metric definition and incomplete records visible? The intended audience is a fictional support-operations lead. The intended decision is where to investigate definitions, workflow, or staffing questions next, not whether a person or team has met a performance target. This belongs in an analyst portfolio because it connects a decision to source data, quality work, modeling, measure design, dashboard structure, and limitations.",
          },
          {
            type: "table",
            caption: "Illustrative synthetic source tables",
            columns: ["Table", "Important example fields", "Role in the analysis"],
            rows: [
              ["Tickets", "Ticket ID, opened date, resolution timestamp, final status, agent key, category key, channel key", "One record per synthetic support ticket before documented quality handling."],
              ["Agents", "Agent key, team label, active-date range", "Provides non-identifying synthetic grouping attributes; no person names are used."],
              ["Dates", "Date key, date, week, month, quarter", "Supports consistent time filtering and trend comparisons."],
              ["Categories", "Category key, standardized category", "Keeps inconsistent source labels out of report groupings."],
              ["Channels", "Channel key, channel label", "Supports a controlled channel breakdown and makes incomplete values visible."],
            ],
          },
          {
            type: "model",
            caption: "Illustrative star-schema structure",
            dimensions: ["Dim Date", "Dim Agent", "Dim Category", "Dim Channel"],
            fact: "Fact Tickets",
            description: "The grain of Fact Tickets is one eligible synthetic ticket per row. Dimensions are separated so dates, agents, categories, and channels can filter the same measures consistently. This structure supports trend and breakdown questions, but it is illustrative rather than a universal modeling requirement.",
          },
          {
            type: "code",
            title: "Example measure",
            language: "DAX",
            content: "Resolution Rate =\nDIVIDE(\n    [Resolved Tickets],\n    [Total Tickets]\n)",
            description: "Resolved Tickets is the numerator: eligible tickets meeting the documented final-resolution rule in the current filter context. Total Tickets is the denominator: all eligible ticket records in that same context. Reopened tickets need an explicit rule, and blank or incomplete status and timestamp records should be flagged rather than silently counted. The business definition must be documented because the calculation is only as valid as those choices.",
          },
          {
            type: "callout",
            title: "Data-quality issue: resolution timestamps",
            content: "A fictional set of records has a resolved status but no resolution timestamp; another set was reopened after an initial resolution. The analyst would detect the conflict with status-and-timestamp validation checks, isolate affected records, agree on an eligibility rule, and preserve an exception count. The project page would document the treatment and explain that the rate can change when the operational definition changes.",
            tone: "gold",
          },
          {
            type: "table",
            caption: "Dashboard structure for the fictional scenario",
            columns: ["Layer", "Purpose", "Design and accessibility notes"],
            rows: [
              ["Primary KPI", "Show Resolution Rate with its written definition and exception context.", "Do not rely on color alone; label the value and definition directly."],
              ["Trend", "Show the rate and eligible ticket volume over time.", "Use readable axes, direct labels where practical, and sufficient contrast."],
              ["Breakdown", "Compare category and channel patterns without turning the view into a ranking claim.", "Keep category names legible and provide a table alternative when useful."],
              ["Operational detail", "Expose fictional exception records for investigation.", "Use descriptive column headers, keyboard-reachable controls, and a constrained mobile layout."],
              ["Filters and interactions", "Filter date, category, and channel while preserving definition context.", "Give controls visible labels, predictable focus order, and clear reset behavior."],
              ["Mobile and readability", "Prioritize the KPI, definition, trend, and key exceptions on narrow screens.", "Stack content, allow tables to scroll within their container, and avoid clipped labels."],
            ],
          },
          {
            type: "callout",
            title: "Assumptions and limitations",
            content: "All data is synthetic, no real company is represented, and no measured business impact is claimed. The example demonstrates portfolio structure and reasoning. Missing timestamps, reopened tickets, eligibility rules, and incomplete channel values limit interpretation, and the Resolution Rate measure is only as valid as its documented business definition.",
            tone: "red",
          },
          {
            type: "list",
            ordered: true,
            items: [
              "Overview",
              "Business context",
              "Data and quality",
              "Model",
              "Measures",
              "Visual design",
              "Findings",
              "Assumptions and limitations",
              "Technical appendix",
            ],
          },
          {
            type: "links",
            title: "Continue planning the evidence",
            links: [
              { label: "Career portfolio websites for data analysts", href: "/services/career-portfolios/data-analysts", description: "Plan analyst evidence around questions, quality, models, measures, and decisions." },
              { label: "Career portfolio websites for BI developers", href: "/services/career-portfolios/bi-developers", description: "Go deeper on semantic models, DAX, governance, and delivery." },
              { label: "How to show confidential work", href: "/insights/show-confidential-work-in-career-portfolio", description: "Choose permission, redaction, synthetic data, and access controls responsibly." },
              { label: "Career portfolio demonstration work", href: "/work/career-portfolio-demo", description: "Review a clearly disclosed fictional demonstration with no downloadable files." },
            ],
          },
        ],
      },
      {
        id: "evidence-format",
        title: "Choose the right evidence format",
        blocks: [
          {
            type: "table",
            columns: ["Format", "Useful when", "Check before publishing"],
            rows: [
              ["Screenshots", "The visual hierarchy or outcome can be understood without interaction.", "Sanitize names, values, metadata, notifications, and hidden browser UI."],
              ["Interactive demo", "Interaction changes how the reader understands the analysis or dashboard.", "Use fictional or approved data, maintain it, and make controls accessible."],
              ["GitHub repository", "The code, SQL, documentation, or data pipeline is the useful evidence.", "Review commit history, secrets, licenses, sample data, and setup instructions."],
              ["Downloadable artifact", "A reader genuinely needs to inspect a file offline.", "Remove confidential data and document versions; do not publish a file merely because it exists."],
            ],
          },
        ],
      },
      {
        id: "project-page-template",
        title: "A practical project-page structure",
        blocks: [
          {
            type: "checklist",
            items: [
              "Role or project label and one-sentence value proposition.",
              "Business question, audience, and decision context.",
              "Data sources, quality checks, transformations, and modeling choices.",
              "Measures, calculations, analysis method, and important assumptions.",
              "Dashboard or deliverable explanation with accessible visuals.",
              "Limitations, privacy approach, and what the project does not claim.",
              "Links to deeper technical material only when it is safe and useful to publish.",
            ],
          },
          {
            type: "paragraph",
            content:
              "Maintain the portfolio as your work changes. Retire weak projects, update screenshots when an interface changes, and make the opening page easier to scan than the deepest technical section. A portfolio is not a storage room for every artifact; it is a guided record of the evidence most relevant to your next role.",
          },
        ],
      },
    ],
    related: [
      { label: "Career portfolio websites for data analysts", href: "/services/career-portfolios/data-analysts", description: "Turn analytics work into recruiter-friendly case studies." },
      { label: "Career portfolio websites for BI developers", href: "/services/career-portfolios/bi-developers", description: "Show semantic models, DAX, and governed delivery." },
      { label: "How to show confidential work", href: "/insights/show-confidential-work-in-career-portfolio", description: "Protect sensitive work without losing the story." },
    ],
    cta: {
      eyebrow: "Career portfolios",
      title: "Build a portfolio around evidence, not a tool list.",
      description: "Rukh Labs can help shape a career portfolio around target roles, clear case studies, and appropriate privacy controls.",
      label: "Explore career portfolio services",
      href: "/services/career-portfolios",
    },
    sources: [
      {
        title: "Understand star schema and the importance for Power BI",
        publisher: "Microsoft Learn",
        href: "https://learn.microsoft.com/en-us/power-bi/guidance/star-schema",
        accessedOn: publishedOn,
        reason: "Used to support the discussion of facts, dimensions, model relationships, and the connection between model design, usability, and performance.",
      },
      {
        title: "DAX overview",
        publisher: "Microsoft Learn",
        href: "https://learn.microsoft.com/en-us/dax/dax-overview",
        accessedOn: publishedOn,
        reason: "Used as a primary reference for describing DAX as part of a Power BI portfolio's technical evidence.",
      },
    ],
  },
  {
    slug: "show-confidential-work-in-career-portfolio",
    title: "How to Show Confidential Work in a Career Portfolio",
    metaTitle: "How to Show Confidential Work in a Career Portfolio",
    description:
      "Practical guidance for presenting confidential work in a career portfolio using permission, redaction, synthetic data, safer artifacts, and realistic access controls.",
    summary:
      "Confidential work can demonstrate real judgment, but a portfolio is not a reason to publish information you do not have permission to share. Use a review process that protects people, organizations, systems, and contracts before you decide what belongs online.",
    category: "Privacy and proof",
    categories: ["Career portfolios", "Privacy and proof"],
    publishedOn,
    modifiedOn: publishedOn,
    schemaType: "Article",
    sections: [
      {
        id: "start-with-permission",
        title: "Start with permission and policy",
        blocks: [
          {
            type: "paragraph",
            content:
              "Before you publish a screenshot, narrative, data sample, repository, or downloadable file, review the agreements and policies that apply to the work. An NDA, employment agreement, client policy, or internal security rule may restrict what can be shared even when the project is no longer active. Ask for written permission when that is appropriate, and get qualified legal or contractual advice for questions that depend on your obligations.",
          },
          {
            type: "callout",
            title: "Practical guidance, not legal advice",
            tone: "gold",
            content:
              "This guide is a portfolio review framework. It cannot determine whether a particular disclosure is permitted. Contractual or legal questions should be reviewed with a qualified professional.",
          },
        ],
      },
      {
        id: "remove-identifiers",
        title: "Remove identifiers before you tell the story",
        blocks: [
          {
            type: "list",
            items: [
              "Company, client, employee, customer, supplier, and partner names.",
              "Email addresses, phone numbers, account IDs, tickets, invoice references, and user access details.",
              "Sensitive commercial metrics, source exports, unique dates, locations, and combinations of details that make an organization easy to infer.",
              "Browser tabs, notifications, file paths, document properties, image metadata, and screen recordings that reveal more than the main content.",
              "Credentials, API keys, connection strings, tokens, secrets in source code, and repository history that still contains them.",
            ],
          },
          {
            type: "paragraph",
            content:
              "Redaction is more than covering a logo. Review the surrounding context. A dashboard can disclose its organization through a unique metric, a filter value, a URL, a report title, or a side-panel notification even after names are removed.",
          },
        ],
      },
      {
        id: "safe-representations",
        title: "Use a safer representation when the original cannot be shown",
        blocks: [
          {
            type: "table",
            columns: ["Approach", "What it can preserve", "What to disclose"],
            rows: [
              ["Synthetic data", "Modeling, calculations, interactions, and the shape of a workflow.", "That the data is synthetic and does not represent the original organization."],
              ["Normalized or scaled values", "Relative trends and visual design without revealing exact values.", "That values were changed and why the transformation was needed."],
              ["Composite or fictional scenario", "A pattern drawn from several safe-to-describe constraints.", "That the scenario is fictionalized or composite, not a named engagement."],
              ["Rebuilt visual", "Information hierarchy and interaction without reusing a confidential artifact.", "That the visual was reconstructed from scratch for portfolio use."],
            ],
          },
          {
            type: "paragraph",
            content:
              "The goal is not to make a fictionalized piece look like a client case study. Label it honestly. A clear explanation of your role, methods, constraints, and what was changed is more credible than an unnamed story that implies private access.",
          },
        ],
      },
      {
        id: "choose-access-controls",
        title: "Choose publication and access controls deliberately",
        blocks: [
          {
            type: "paragraph",
            content:
              "A public page, an unlisted URL, a noindex page, password protection, and private hosting solve different problems. Use the access level that matches the sensitivity of the material. If the work should not be disclosed to the public, do not rely on a search directive as the primary control.",
          },
          {
            type: "table",
            columns: ["Method", "What it does", "What it does not do"],
            rows: [
              ["Public page", "Makes the work broadly shareable and indexable when search is allowed.", "Protect confidential content."],
              ["Unlisted URL", "Reduces casual discovery when a link is shared selectively.", "Authenticate a viewer or prevent someone with the URL from sharing it."],
              ["Noindex", "Asks supporting search engines not to index a crawlable page.", "Make the page private or prevent direct access."],
              ["Password protection or private hosting", "Requires access before the content is delivered.", "Replace a review of whether the viewer should receive the material at all."],
            ],
          },
          {
            type: "callout",
            title: "Noindex is not authentication",
            content:
              "Google documents noindex as an indexing rule that crawlers must be able to see. That makes it useful for search control, not a substitute for access control. Treat a noindex page as accessible to anyone who receives or discovers its URL.",
          },
        ],
      },
      {
        id: "artifact-review",
        title: "Review files and repositories separately",
        blocks: [
          {
            type: "paragraph",
            content:
              "A downloadable artifact can carry more risk than the page that links to it. Inspect file properties, embedded data, comments, revision history, hidden sheets, metadata, images, and exported source. For repositories, inspect commit history, deleted files, environment examples, package lockfiles, issue links, and deployment configuration. Remove or rotate exposed secrets through the right operational process rather than assuming a visual edit has fixed history.",
          },
        ],
      },
      {
        id: "prepublication-checklist",
        title: "Pre-publication review checklist",
        blocks: [
          {
            type: "checklist",
            items: [
              "Confirm you have permission or a sound basis to share every visible element.",
              "Remove names, identifiers, confidential metrics, access details, and indirect clues.",
              "Disclose synthetic, normalized, composite, or rebuilt elements clearly.",
              "Review files, screenshots, recordings, source history, and metadata separately.",
              "Choose public, unlisted, password-protected, or private delivery based on sensitivity.",
              "If a project cannot be represented safely, describe the capability at a high level or leave it out.",
            ],
          },
        ],
      },
    ],
    related: [
      { label: "Data analyst career portfolio guide", href: "/insights/data-analyst-career-portfolio-guide", description: "Organize analytics work into clearer project evidence." },
      { label: "Career portfolio service", href: "/services/career-portfolios", description: "Build a portfolio around real evidence and appropriate controls." },
      { label: "Fictional career portfolio demonstration", href: "/work/career-portfolio-demo", description: "See a clearly labeled privacy-safe example." },
    ],
    cta: {
      eyebrow: "Privacy and proof",
      title: "Build a portfolio that respects the work you cannot publish.",
      description: "Rukh Labs can help shape a recruiter-ready portfolio around approved evidence, clear boundaries, and privacy-aware presentation.",
      label: "Discuss a career portfolio",
      href: "/contact?inquiry=career-portfolio",
    },
    sources: [
      {
        title: "Block Search indexing with noindex",
        publisher: "Google Search Central",
        href: "https://developers.google.com/search/docs/crawling-indexing/block-indexing",
        accessedOn: publishedOn,
        reason: "Used to support the explanation that noindex is an indexing directive which requires crawler access, not authentication or private hosting.",
      },
    ],
  },
] as const;

export function getInsight(slug: string) {
  return insights.find((insight) => insight.slug === slug);
}
