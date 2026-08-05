import type { ContentCta, ContentLink, ContentSection } from "@/lib/content";

export type WorkProject = {
  slug: string;
  title: string;
  metaTitle: string;
  description: string;
  summary: string;
  projectType:
    | "Internal studio platform"
    | "Rukh Labs product"
    | "Product in development"
    | "Fictional service demonstration";
  status: string;
  sections: readonly ContentSection[];
  related: readonly ContentLink[];
  cta: ContentCta;
};

export const workProjects: readonly WorkProject[] = [
  {
    slug: "rukh-labs-website",
    title: "Rukh Labs Website",
    metaTitle: "Rukh Labs Website Work",
    description:
      "An internal studio platform documenting the design, technical structure, privacy controls, and search foundation of the Rukh Labs website.",
    summary:
      "The Rukh Labs website is an internal studio platform for products, services, resources, and public project documentation. It is not presented as client work.",
    projectType: "Internal studio platform",
    status: "Public platform in active iteration",
    sections: [
      {
        id: "project-summary",
        title: "Project summary",
        blocks: [
          { type: "paragraph", content: "The site gives Rukh Labs one public structure for website services, career portfolio services, original products, product privacy, changelog entries, and studio information. The implementation is intentionally organized around clear routes instead of a single product-heavy landing page." },
          { type: "callout", title: "Project classification", content: "This is Rukh Labs' own platform. It is an internal studio project, not a client case study, and no client results are represented here." },
        ],
      },
      {
        id: "challenge-and-constraints",
        title: "Challenge and constraints",
        blocks: [
          { type: "paragraph", content: "The public site needs to make distinct offers understandable without flattening them into one generic claim. It also needs to keep a private recruiter portfolio isolated from public navigation, links, the sitemap, and search snippets while allowing the studio to publish genuinely useful public material." },
          { type: "list", items: ["Keep the permanent Rukh Labs identity consistent across services and products.", "Use one canonical production host and explicit indexability decisions by route.", "Avoid personal profile details, client claims, fabricated metrics, and private-portfolio references on public pages.", "Keep long-form information server-rendered and maintainable without introducing a hosted CMS."] },
        ],
      },
      {
        id: "implementation",
        title: "Current implementation",
        blocks: [
          { type: "paragraph", content: "The public application is built with the Next.js App Router and typed React components. It uses a shared metadata helper, route manifest, generated sitemap, robots route, reusable JSON-LD serializer, breadcrumbs, route-specific social images, typed analytics events, and a local regression audit." },
          { type: "table", columns: ["Area", "Current implementation"], rows: [["Information architecture", "Separate product, service, work, insight, legal, and contact routes with direct internal links."], ["Search foundations", "Canonical metadata, sitemap registration, robots directives, redirects, Open Graph images, and route-specific structured data."], ["Privacy separation", "The private portfolio carries noindex, nofollow, noarchive, and nosnippet directives, is absent from public navigation, and is not in the sitemap."], ["Measurement", "Vercel Analytics events are typed and avoid form values, message text, and other personal data."]], caption: "Repository-backed platform work" },
        ],
      },
      {
        id: "limitations",
        title: "Current limitations",
        blocks: [
          { type: "paragraph", content: "The platform does not claim measured traffic, conversion, or ranking outcomes. Real client case studies, reviews, and testimonials are intentionally deferred until Rukh Labs has permission and verified source material. The contact flow prepares a local email draft; it does not submit inquiries to a server from this repository." },
        ],
      },
    ],
    related: [
      { label: "Rukh Labs work hub", href: "/work", description: "Explore the studio's public product and service work." },
      { label: "Small-business website cost guide", href: "/insights/small-business-website-cost-guide", description: "Plan a website project before requesting a quote." },
      { label: "Website design and development", href: "/services/web-development", description: "Review the studio's current website service." },
    ],
    cta: { eyebrow: "Website work", title: "Plan the next version of your website with more clarity.", description: "Use the project brief generator to organize the questions a useful website needs to answer.", label: "Create a website project brief", href: "/tools/website-project-brief" },
  },
  {
    slug: "farzin",
    title: "Farzin",
    metaTitle: "Farzin Product Work",
    description:
      "Rukh Labs product work documenting Farzin, an Android chess training app for focused review, opening preparation, tactical practice, and progress tracking.",
    summary:
      "Farzin is a Rukh Labs Android chess training product. This page explains the product work and design direction; the product page explains the app itself.",
    projectType: "Rukh Labs product",
    status: "Google Play release: version 1.0.0",
    sections: [
      {
        id: "project-summary",
        title: "Project summary",
        blocks: [
          { type: "paragraph", content: "Farzin is an Android chess training app built around focused game review, opening preparation, tactical drills, engine-assisted analysis, and progress tracking. The public product page and Google Play distribution provide the current product access points." },
          { type: "callout", title: "Project classification", content: "Farzin is a first-party Rukh Labs product. It is not a client engagement or a claim about external product work." },
        ],
      },
      {
        id: "design-challenge",
        title: "Design challenge",
        blocks: [
          { type: "paragraph", content: "Chess study can become a crowded mix of browsing, disconnected tools, prompts, and opaque engine output. Farzin's stated direction is a calmer training surface that keeps review, preparation, drills, and tracking connected without treating more interface noise as progress." },
          { type: "list", items: ["Keep the board and analysis hierarchy readable.", "Make engine-assisted analysis a study aid rather than a wall of unexplained numbers.", "Support a focused path from review to preparation, drills, and progress tracking.", "Use a product privacy approach that does not require a Rukh Labs account for ordinary use."] },
        ],
      },
      {
        id: "current-implementation",
        title: "Current implementation",
        blocks: [
          { type: "paragraph", content: "The current public release is Farzin 1.0.0 on Google Play. The Rukh Labs product page documents the product's Android availability, training features, visual direction, and privacy policy. Its visual system uses a serious board, a focused analysis panel, gold accents, and compact training cards that reinforce the study-first direction." },
          { type: "links", title: "Product references", links: [{ label: "Explore Farzin", href: "/products/farzin", description: "Product details and Google Play access." }, { label: "Farzin privacy policy", href: "/products/farzin/privacy", description: "Current public privacy information for the product." }] },
        ],
      },
      {
        id: "limitations",
        title: "Current limitations",
        blocks: [
          { type: "paragraph", content: "This page does not report ratings, downloads, pricing, user counts, or measured study outcomes. It describes the product direction and public release information available in the Rukh Labs repository and product pages." },
        ],
      },
    ],
    related: [
      { label: "Farzin chess training app", href: "/products/farzin", description: "Read the product page and access the Google Play listing." },
      { label: "Rukh Labs work hub", href: "/work", description: "Explore the studio's other first-party work." },
      { label: "Rukh Labs products", href: "/products", description: "See the product portfolio." },
    ],
    cta: { eyebrow: "Farzin", title: "Explore the product behind the work.", description: "Farzin is available for Android through Google Play.", label: "Explore Farzin", href: "/products/farzin", variant: "product" },
  },
  {
    slug: "glass-squares-os",
    title: "Glass Squares OS",
    metaTitle: "Glass Squares OS Product Work",
    description:
      "Product-in-development work documenting the current Glass Squares OS concept, implementation direction, research boundaries, and roadmap distinction.",
    summary:
      "Glass Squares OS is a Rukh Labs product in development. This page separates the current concept and interface work from research and future direction.",
    projectType: "Product in development",
    status: "In development",
    sections: [
      {
        id: "project-summary",
        title: "Project summary",
        blocks: [
          { type: "paragraph", content: "Glass Squares OS is a Linux-based desktop operating system project built around glassy surfaces, square-based layouts, low-bloat defaults, practical compatibility, and user control. It is presented as a product in development, not a production-ready operating system." },
          { type: "callout", title: "Project classification", content: "This is a first-party Rukh Labs product in development. Its future direction is not a statement that every planned feature is complete or available." },
        ],
      },
      {
        id: "implementation-and-research",
        title: "Existing direction, active prototype work, and research",
        blocks: [
          { type: "table", columns: ["Area", "Current public status"], rows: [["Existing direction", "A visual desktop concept with glass panels, square-based layout, minimal bloat, practical compatibility paths, privacy-respecting defaults, and power-user controls."], ["Active prototype work", "Interface and product-direction work documented through the public site, product mockups, and changelog."], ["Research and roadmap", "Future utility concepts, compatibility choices, and product work remain research or roadmap direction unless documented as released."], ["Production readiness", "Not claimed. The project is explicitly labeled in development."]], caption: "Status distinctions for Glass Squares OS" },
          { type: "paragraph", content: "The public design direction focuses on making a desktop feel more deliberate: a visual system with glassy surfaces and square layouts, paired with familiar workflow and practical compatibility intentions. The product page is the source of truth for the public feature direction." },
        ],
      },
      {
        id: "constraints",
        title: "Constraints and product standards",
        blocks: [
          { type: "list", items: ["Do not present research or roadmap ideas as completed features.", "Keep privacy, control, and low-bloat defaults part of the product direction rather than optional decoration.", "Keep compatibility messaging practical and avoid claiming support that has not been documented.", "Use the public changelog to distinguish published, in-progress, prototype, draft, and research status."] },
        ],
      },
      {
        id: "limitations",
        title: "Current limitations",
        blocks: [
          { type: "paragraph", content: "There is no claim of production readiness, public release timing, user adoption, benchmark performance, or complete feature coverage. The work page documents the product's current public direction only." },
        ],
      },
    ],
    related: [
      { label: "Glass Squares OS", href: "/products/glass-squares-os", description: "Read the public product direction." },
      { label: "Rukh Labs changelog", href: "/changelog", description: "Review published status notes and product direction." },
      { label: "Rukh Labs work hub", href: "/work", description: "Explore first-party studio work." },
    ],
    cta: { eyebrow: "Glass Squares OS", title: "Explore the product direction.", description: "See the current public concept and beta-interest path for Glass Squares OS.", label: "Explore Glass Squares OS", href: "/products/glass-squares-os", variant: "product" },
  },
  {
    slug: "career-portfolio-demo",
    title: "Career Portfolio Demonstration",
    metaTitle: "Career Portfolio Demonstration Work",
    description:
      "A fictional Rukh Labs service demonstration showing recruiter scan hierarchy, case-study structure, dashboard interaction, and privacy-safe portfolio presentation.",
    summary:
      "This is a fictional service demonstration, built to show how a career portfolio can make evidence easier to scan without disclosing a real identity, employer, or confidential work.",
    projectType: "Fictional service demonstration",
    status: "Public demonstration; no downloads or submission endpoint",
    sections: [
      {
        id: "project-summary",
        title: "Project summary",
        blocks: [
          { type: "paragraph", content: "The career portfolio demonstration is a fully functional fictional candidate experience. It includes a recruiter-friendly narrative, case-study presentation, resume view, and an interactive scenario dashboard while avoiding real personal data, employer information, and downloadable files." },
          { type: "callout", title: "Project classification", content: "This is a fictional Rukh Labs service demonstration. It is not a client portfolio, does not represent a named candidate, and does not expose a private recruiter portfolio." },
        ],
      },
      {
        id: "design-challenge",
        title: "Design challenge",
        blocks: [
          { type: "paragraph", content: "A career portfolio needs to serve readers with different depths of attention. A recruiter may need a direct role and proof hierarchy; a hiring manager may need business context and project outcomes; a technical reviewer may need methods, constraints, and artifact detail. The demonstration organizes those paths without requiring the visitor to download personal files." },
          { type: "list", items: ["Make the opening story quickly scannable.", "Use fictionalized case-study content rather than confidential work.", "Include interactive proof only where interaction helps explain the work.", "Keep privacy boundaries explicit and avoid a hidden contact or file-download path."] },
        ],
      },
      {
        id: "what-was-delivered",
        title: "What was delivered",
        blocks: [
          { type: "table", columns: ["Element", "Purpose"], rows: [["Recruiter scan hierarchy", "Makes role direction, strengths, and selected proof easy to find first."], ["Case-study structure", "Creates room for context, choices, constraints, and outcomes without pretending the projects are real client work."], ["Resume view", "Shows how a concise employment narrative can sit alongside deeper project pages."], ["Interactive dashboard", "Lets a visitor explore a fictional scenario without exposing private data or distributing files."], ["Privacy labeling", "States that the demonstration is fictional and carries no real identity, confidential employer data, or downloadable personal material."]], caption: "Demonstration components" },
        ],
      },
      {
        id: "limitations",
        title: "Current limitations",
        blocks: [
          { type: "paragraph", content: "The public demonstration is intentionally noindex as a conversion example, while this work page is indexable editorial context. It does not substitute for a candidate's own approved evidence, and it makes no claim that a portfolio guarantees interviews or employment." },
        ],
      },
    ],
    related: [
      { label: "Explore the fictional career portfolio demonstration", href: "/services/career-portfolios/demo", description: "Open the interactive noindex demo." },
      { label: "Data analyst career portfolio guide", href: "/insights/data-analyst-career-portfolio-guide", description: "Plan analytics evidence and technical depth." },
      { label: "How to show confidential work", href: "/insights/show-confidential-work-in-career-portfolio", description: "Protect private details before publishing." },
    ],
    cta: { eyebrow: "Career portfolios", title: "Build a portfolio that gives the work a clearer shape.", description: "Rukh Labs can help translate approved experience into a recruiter-ready site with the right privacy controls.", label: "Explore career portfolio services", href: "/services/career-portfolios" },
  },
] as const;

export function getWorkProject(slug: string) {
  return workProjects.find((project) => project.slug === slug);
}
