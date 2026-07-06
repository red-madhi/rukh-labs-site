export type Product = {
  slug: string;
  name: string;
  category: string;
  status: "In development" | "Beta waitlist" | "Research" | "Prototype" | "Roadmap";
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
      "A glassy Linux-based desktop OS focused on speed, privacy, familiar workflows, and a cleaner visual system.",
    longDescription:
      "Glass Squares OS is a Linux-based desktop experience built around glassy surfaces, square-based layouts, low bloat, practical compatibility, and a familiar workflow that does not force normal users to live in a terminal.",
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
    category: "Chess Software",
    status: "In development",
    shortDescription:
      "A premium chess training app for focused analysis, prep, drills, and serious improvement.",
    longDescription:
      "Farzin is built for players who want cleaner analysis, sharper prep, and study tools that do not waste their time.",
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
    "Rukh Labs is exploring focused utilities and software ideas that share the same clean, serious product standards.",
  features: ["Research notes", "Utility concepts", "Design experiments"],
  href: "/changelog",
};
