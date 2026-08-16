export type Product = {
  slug: string;
  name: string;
  category: string;
  status:
    | "In development"
    | "Beta waitlist"
    | "Google Play · v1.0.0"
    | "Free web app"
    | "Research"
    | "Prototype"
    | "Roadmap";
  shortDescription: string;
  longDescription: string;
  features: string[];
  href: string;
};

export const products: Product[] = [
  {
    slug: "glass-squares-os",
    name: "Glass Squares OS",
    category: "Operating System",
    status: "In development",
    shortDescription:
      "A Linux-based desktop operating system built around glassy surfaces, square-based layouts, low bloat, and practical compatibility.",
    longDescription:
      "Glass Squares OS is a Linux-based desktop operating system built around glassy surfaces, square-based layouts, low bloat, practical compatibility, and a familiar workflow.",
    features: [
      "Glass shell interface",
      "Square-based layout system",
      "Low-bloat defaults",
      "Practical compatibility paths",
      "Privacy-respecting defaults",
      "Power-user controls",
    ],
    href: "/products/glass-squares-os",
  },
  {
    slug: "farzin",
    name: "Farzin",
    category: "Android Chess Training App",
    status: "Google Play · v1.0.0",
    shortDescription:
      "A premium Android chess training app for focused game review, opening preparation, tactical practice, and progress tracking.",
    longDescription:
      "Farzin is a premium Android chess training app for focused game review, opening preparation, tactical practice, and progress tracking.",
    features: [
      "Game review",
      "Engine-assisted analysis",
      "Opening prep",
      "Tactical drills",
      "Study plans",
      "Progress tracking",
    ],
    href: "/products/farzin",
  },
];

export const labProduct = {
  slug: "bluesky-network",
  name: "IAZMA",
  category: "Bluesky Network Discovery",
  status: "Free web app" as const,
  shortDescription:
    "Discover who to follow through either your followers or the accounts you follow, ranked by overlap and reach.",
  longDescription:
    "IAZMA is a free browser-based social-graph tool that can use followers or the accounts a profile follows as its recommendation source, rank commonly followed accounts, explain every match, keep resumable progress on the user's device, and optionally connect through Bluesky OAuth for deliberate in-tool follows.",
  features: [
    "Follower or following sources",
    "Second-degree account discovery",
    "Overlap and reach ranking",
    "Local resumable scans",
    "Shared-connection explanations",
    "Optional OAuth follow actions",
    "CSV export",
  ],
  href: "/tools/bluesky-network",
};
