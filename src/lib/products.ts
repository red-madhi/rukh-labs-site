export type Product = {
  slug: string;
  name: string;
  category: string;
  status:
    | "In development"
    | "Beta waitlist"
    | "Google Play · v1.0.0"
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
  slug: "lab",
  name: "More coming",
  category: "Lab Projects",
  status: "Research" as const,
  shortDescription:
    "Experimental tools, utilities, and software ideas from Rukh Labs.",
  longDescription:
    "Rukh Labs is exploring focused utilities and software ideas alongside its current products.",
  features: ["Research notes", "Utility concepts", "Design experiments"],
  href: "/changelog",
};
