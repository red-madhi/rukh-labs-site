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
    slug: "rukh-os",
    name: "Rukh OS",
    category: "Operating System",
    status: "In development",
    shortDescription:
      "A clean Linux-based desktop OS focused on speed, beauty, privacy, and familiar workflows.",
    longDescription:
      "Rukh OS is a Linux-based desktop experience designed to feel familiar, stay fast, reduce bloat, and give users more control without making them live in a terminal.",
    features: [
      "Familiar desktop patterns",
      "Low-bloat defaults",
      "Security-conscious foundation",
      "Practical compatibility paths",
      "Polished visual system",
      "Power-user controls",
    ],
    href: "/products/rukh-os",
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
