import { FARZIN_GOOGLE_PLAY_URL } from "@/lib/site-config";

export type ChangelogEntry = {
  date: string;
  product: "Rukh Labs" | "Glass Squares OS" | "Farzin" | "Lab";
  title: string;
  description: string;
  status: "Published" | "In progress" | "Prototype" | "Draft" | "Research";
  href?: string;
  linkLabel?: string;
};

export const changelogEntries: ChangelogEntry[] = [
  {
    date: "2026-08-02",
    product: "Rukh Labs",
    title: "Rukh Labs brand identity finalized",
    description:
      "Adopted the silver rook-and-hourglass emblem, geometric Rukh wordmark, and gold-accented lockup as the official Rukh Labs identity.",
    status: "Published",
  },
  {
    date: "2026-07-28",
    product: "Farzin",
    title: "Farzin 1.0.0 released on Google Play",
    description:
      "The first production release of Farzin is now available for Android through Google Play.",
    status: "Published",
    href: FARZIN_GOOGLE_PLAY_URL,
    linkLabel: "Get Farzin on Google Play",
  },
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
    title: "Early brand mark direction",
    description:
      "Explored an angular red monogram before the official rook-and-hourglass identity was finalized.",
    status: "Prototype",
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
    href: FARZIN_GOOGLE_PLAY_URL,
    linkLabel: "See Farzin on Google Play",
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
