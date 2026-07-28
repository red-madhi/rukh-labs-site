import { siteConfig } from "@/lib/site-config";

export const websiteProjectEmail = siteConfig.contactEmail;
export const websiteProjectMailto = siteConfig.links.websiteProject;

export type DesignDirectionSlug =
  | "obsidian"
  | "signal"
  | "atelier"
  | "main-street"
  | "spotlight"
  | "dispatch";

export type DesignDirection = {
  slug: DesignDirectionSlug;
  name: string;
  summary: string;
  bestFor: readonly string[];
  traits: readonly string[];
  sampleDomain: string;
  sampleName: string;
  sampleDescription: string;
  href: `/services/web-development/designs/${DesignDirectionSlug}`;
  sampleHref: `/services/web-development/designs/${DesignDirectionSlug}/sample`;
};

export const designDirections = [
  {
    slug: "obsidian",
    name: "Obsidian",
    summary:
      "Dark, cinematic, and sharply technical, with dramatic scale and disciplined product storytelling.",
    bestFor: [
      "Software",
      "Startups",
      "Gaming",
      "Creative technology",
      "Product launches",
    ],
    traits: [
      "High-contrast launch hierarchy",
      "Monospaced technical accents",
      "Restrained motion and color",
      "Asymmetric product storytelling",
    ],
    sampleDomain: "northstar.systems",
    sampleName: "Northstar Systems",
    sampleDescription:
      "A secure edge-operations platform for infrastructure and field teams.",
    href: "/services/web-development/designs/obsidian",
    sampleHref: "/services/web-development/designs/obsidian/sample",
  },
  {
    slug: "signal",
    name: "Signal",
    summary:
      "Clear structure, measured typography, and strong information hierarchy for businesses that need to look established.",
    bestFor: [
      "Consultants",
      "Professional services",
      "Data companies",
      "B2B businesses",
      "Agencies",
    ],
    traits: [
      "Structured information design",
      "Confident business typography",
      "Proof-driven page hierarchy",
      "Clean calls to action",
    ],
    sampleDomain: "cedarstrategy.co",
    sampleName: "Cedar Strategy",
    sampleDescription:
      "An independent strategy practice for teams making consequential growth decisions.",
    href: "/services/web-development/designs/signal",
    sampleHref: "/services/web-development/designs/signal/sample",
  },
  {
    slug: "atelier",
    name: "Atelier",
    summary:
      "Editorial pacing, expressive typography, and image-led layouts for work that deserves room to breathe.",
    bestFor: ["Artists", "Designers", "Photographers", "Writers", "Portfolios"],
    traits: [
      "Editorial, image-led pacing",
      "Expressive serif typography",
      "Asymmetric project layouts",
      "Quiet, intentional navigation",
    ],
    sampleDomain: "marabell.studio",
    sampleName: "Mara Bell Studio",
    sampleDescription:
      "An editorial portfolio for a multidisciplinary identity and spatial design practice.",
    href: "/services/web-development/designs/atelier",
    sampleHref: "/services/web-development/designs/atelier/sample",
  },
  {
    slug: "main-street",
    name: "Main Street",
    summary:
      "Warm, direct, and conversion-focused, making services, credibility, and the next step immediately clear.",
    bestFor: [
      "Local businesses",
      "Contractors",
      "Restaurants",
      "Salons",
      "Independent services",
    ],
    traits: [
      "Friendly conversion hierarchy",
      "Prominent contact actions",
      "Clear service and trust signals",
      "Warm, approachable presentation",
    ],
    sampleDomain: "juniperandpine.com",
    sampleName: "Juniper & Pine",
    sampleDescription:
      "A warm, conversion-focused neighborhood bakery and café website.",
    href: "/services/web-development/designs/main-street",
    sampleHref: "/services/web-development/designs/main-street/sample",
  },
  {
    slug: "spotlight",
    name: "Spotlight",
    summary:
      "Bold, personality-led, and media-forward, with a polished rhythm built for creators and public-facing personal brands.",
    bestFor: [
      "Influencers",
      "Content creators",
      "Podcasters",
      "Personal brands",
      "Brand partnerships",
    ],
    traits: [
      "Creator-first storytelling",
      "Social content and series highlights",
      "Partnership proof and media-kit calls to action",
      "Energetic modular layouts",
    ],
    sampleDomain: "mikarowe.co",
    sampleName: "Mika Rowe",
    sampleDescription:
      "A creator portfolio for travel films, practical gear guides, and selective brand partnerships.",
    href: "/services/web-development/designs/spotlight",
    sampleHref: "/services/web-development/designs/spotlight/sample",
  },
  {
    slug: "dispatch",
    name: "Dispatch",
    summary:
      "A content-rich editorial system with strong reading hierarchy, flexible publishing structure, and a memorable point of view.",
    bestFor: [
      "Bloggers",
      "Independent publications",
      "Essayists",
      "Newsletters",
      "Editorial teams",
    ],
    traits: [
      "Reading-first editorial hierarchy",
      "Flexible categories and archives",
      "Feature-story and newsletter presentation",
      "Dense content without visual clutter",
    ],
    sampleDomain: "sundayindex.press",
    sampleName: "The Sunday Index",
    sampleDescription:
      "An independent journal for essays on cities, culture, and the designed world.",
    href: "/services/web-development/designs/dispatch",
    sampleHref: "/services/web-development/designs/dispatch/sample",
  },
] as const satisfies readonly DesignDirection[];

export type WebsitePackageId = "launch" | "business" | "custom";

export type WebsitePackage = {
  id: WebsitePackageId;
  name: string;
  price: string;
  priceNote: string;
  summary: string;
  bestFor: string;
  features: readonly string[];
  recommended?: boolean;
};

export const websitePackages = [
  {
    id: "launch",
    name: "Launch Site",
    price: "$995",
    priceNote: "For the outlined one-page scope",
    summary:
      "A focused, polished presence built to explain one business, campaign, brand, or launch clearly.",
    bestFor:
      "New businesses, campaigns, personal brands, and focused product launches.",
    features: [
      "One polished scrolling page",
      "Responsive mobile and desktop design",
      "Up to five major content sections",
      "Contact CTA or contact form integration",
      "Basic search metadata",
      "Social sharing metadata",
      "One primary design direction",
      "One revision round",
    ],
  },
  {
    id: "business",
    name: "Business Site",
    price: "$1,995",
    priceNote: "For the outlined five-page scope",
    summary:
      "A flexible multi-page website for organizations that need room to explain, establish trust, and generate leads.",
    bestFor:
      "Established businesses, consultants, professional services, and growing organizations.",
    features: [
      "Up to five core pages",
      "Customized visual direction",
      "Responsive mobile and desktop design",
      "Contact or lead-generation functionality",
      "Basic analytics setup",
      "Search and social metadata",
      "Reusable content components",
      "Two revision rounds",
    ],
    recommended: true,
  },
  {
    id: "custom",
    name: "Custom Build",
    price: "Starting at $3,500",
    priceNote: "Final pricing is based on scope",
    summary:
      "An original digital experience for projects that go beyond a conventional marketing website.",
    bestFor:
      "Complex platforms, original product experiences, commerce, and integration-heavy builds.",
    features: [
      "Fully original visual system",
      "Advanced animation and interaction",
      "Larger page structures",
      "Custom tools or calculators",
      "API and third-party integrations",
      "Account or application interfaces",
      "E-commerce",
      "Content-management requirements",
      "Complex migration work",
    ],
  },
] as const satisfies readonly WebsitePackage[];

export type WebsiteAddOn = {
  name: string;
  price: string;
  note: string;
};

export const websiteAddOns = [
  {
    name: "Copy and content refinement",
    price: "Starting at $250",
    note: "Shape existing material into clearer, more confident website copy.",
  },
  {
    name: "Additional pages",
    price: "Starting at $175 per page",
    note: "Extend an approved visual system with more focused content.",
  },
  {
    name: "Booking, forms, or third-party integrations",
    price: "Custom quote",
    note: "Connect the site to the tools your work already depends on.",
  },
  {
    name: "E-commerce functionality",
    price: "Custom quote",
    note: "Plan and build an appropriate product, checkout, and order experience.",
  },
  {
    name: "Ongoing maintenance and updates",
    price: "$99 per month",
    note: "Routine content updates, dependency care, and practical site support.",
  },
  {
    name: "Hosting and domain setup assistance",
    price: "Custom quote",
    note: "Get the technical setup configured cleanly and handed over clearly.",
  },
] as const satisfies readonly WebsiteAddOn[];

export type WebsiteProcessStep = {
  number: string;
  title: string;
  description: string;
};

export const websiteProcess = [
  {
    number: "01",
    title: "Choose a direction",
    description:
      "Select a visual starting point or request a completely custom design.",
  },
  {
    number: "02",
    title: "Define the scope",
    description:
      "Establish pages, content, functionality, integrations, and project goals.",
  },
  {
    number: "03",
    title: "Design and build",
    description:
      "Rukh Labs creates the responsive website and shares progress for review.",
  },
  {
    number: "04",
    title: "Launch and support",
    description:
      "The site is tested, launched, and optionally maintained by Rukh Labs.",
  },
] as const satisfies readonly WebsiteProcessStep[];

export type WebsiteDeliverable = {
  title: string;
  description: string;
};

export const websiteDeliverables = [
  {
    title: "Responsive design",
    description: "Layouts shaped for phones, tablets, laptops, and larger displays.",
  },
  {
    title: "Accessible structure",
    description: "Semantic foundations, keyboard support, and sensible contrast.",
  },
  {
    title: "Performance-conscious build",
    description: "A lean implementation that avoids unnecessary weight and motion.",
  },
  {
    title: "Search and social metadata",
    description: "Core page metadata and share information set up correctly.",
  },
  {
    title: "Modern browser support",
    description: "Tested behavior across current mainstream browser engines.",
  },
  {
    title: "Maintainable code",
    description: "Reusable components and a codebase that can evolve cleanly.",
  },
  {
    title: "Deployment assistance",
    description: "Practical help getting the approved site live on the chosen platform.",
  },
  {
    title: "Approved final deliverables",
    description:
      "Ownership of approved final site content and deliverables, subject to third-party licensing.",
  },
] as const satisfies readonly WebsiteDeliverable[];

export type WebsiteFaq = {
  question: string;
  answer: string;
};

export const websiteFaqs = [
  {
    question: "Are these prebuilt templates?",
    answer:
      "No. The design directions are proven starting systems, not cloned websites. Each project is adapted around the client’s content, goals, brand, and audience.",
  },
  {
    question: "Can the colors, fonts, and layout be changed?",
    answer:
      "Yes. A direction establishes the initial mood and design logic. Color, typography, composition, and individual components are customized to make the result feel specific to the client.",
  },
  {
    question: "What does the client need to provide?",
    answer:
      "Most projects need a clear point of contact, business details, approved logos or brand assets, page content, and timely feedback. Rukh Labs can also help refine incomplete content as an optional service.",
  },
  {
    question: "Are hosting and domain costs included?",
    answer:
      "No. Domain registration, hosting, third-party platforms, payment processing, and subscription costs are billed separately by their providers. Rukh Labs can help configure them.",
  },
  {
    question: "Can Rukh Labs update an existing website?",
    answer:
      "Yes. Existing sites can be refreshed, rebuilt, migrated, or extended after the current platform and codebase are reviewed. The estimate depends on the condition and complexity of the existing site.",
  },
  {
    question: "Can Rukh Labs build online stores or web applications?",
    answer:
      "Yes, when the project is a good fit. Commerce, account interfaces, calculators, custom tools, APIs, and other application features are scoped as custom builds.",
  },
  {
    question: "Who owns the finished website?",
    answer:
      "After final payment, the client owns the approved final website content and project deliverables described in the agreement, subject to any third-party software, fonts, media, or platform licenses.",
  },
  {
    question: "Does Rukh Labs provide ongoing support?",
    answer:
      "Yes. Optional maintenance is available for routine updates and practical support. Larger feature work or redesigns are estimated separately.",
  },
] as const satisfies readonly WebsiteFaq[];

export function getDesignDirection(slug: string) {
  return designDirections.find((direction) => direction.slug === slug);
}
