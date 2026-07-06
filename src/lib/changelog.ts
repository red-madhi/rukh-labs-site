export type ChangelogEntry = {
  date: string;
  product: "Rukh Labs" | "Glass Squares OS" | "Farzin" | "Lab";
  title: string;
  description: string;
  status: "Published" | "In progress" | "Prototype" | "Draft" | "Research";
};

export const changelogEntries: ChangelogEntry[] = [
  {
    date: "2026-07-06",
    product: "Glass Squares OS",
    title: "Product rename and visual direction",
    description:
      "Rukh Labs renamed its OS project to Glass Squares OS and began aligning the desktop concept around glass panels, square layouts, and a sharper visual identity.",
    status: "In progress",
  },
  {
    date: "2026-07-06",
    product: "Rukh Labs",
    title: "Brand mark direction",
    description:
      "Introduced the red angular Rukh Labs mark direction across the site for stronger parent-brand recognition.",
    status: "In progress",
  },
  {
    date: "2026-07-04",
    product: "Rukh Labs",
    title: "Site foundation",
    description:
      "Initial public web presence for Rukh Labs, Glass Squares OS, and Farzin.",
    status: "Published",
  },
  {
    date: "2026-07-02",
    product: "Glass Squares OS",
    title: "Desktop concept direction",
    description:
      "Defined the first visual direction for the Glass Squares OS desktop shell, app surfaces, and compatibility messaging.",
    status: "In progress",
  },
  {
    date: "2026-06-28",
    product: "Farzin",
    title: "Analysis interface prototype",
    description:
      "Early concept work for game review, move analysis, and focused chess study.",
    status: "Prototype",
  },
  {
    date: "2026-06-24",
    product: "Rukh Labs",
    title: "Security principles drafted",
    description:
      "Established baseline principles around sane defaults, privacy, transparent updates, and user respect.",
    status: "Draft",
  },
  {
    date: "2026-06-20",
    product: "Lab",
    title: "Product roadmap opened",
    description:
      "Started planning future software experiments and utility products under the Rukh Labs brand.",
    status: "Research",
  },
];
