export type ChangelogEntry = {
  date: string;
  product: "Rukh Labs" | "Rukh OS" | "Farzin" | "Lab";
  title: string;
  description: string;
  status: "Published" | "In progress" | "Prototype" | "Draft" | "Research";
};

export const changelogEntries: ChangelogEntry[] = [
  {
    date: "2026-07-04",
    product: "Rukh Labs",
    title: "Site foundation",
    description:
      "Initial public web presence for Rukh Labs, Rukh OS, and Farzin.",
    status: "Published",
  },
  {
    date: "2026-07-02",
    product: "Rukh OS",
    title: "Desktop concept direction",
    description:
      "Defined the first visual direction for the Rukh OS desktop shell, app surfaces, and compatibility messaging.",
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
