export type ContentLink = {
  label: string;
  href: string;
  description?: string;
  external?: boolean;
};

export type ContentSource = {
  title: string;
  publisher: string;
  href: string;
  accessedOn: string;
  reason: string;
};

export type ContentBlock =
  | { type: "paragraph"; content: string }
  | { type: "list"; items: readonly string[]; ordered?: boolean }
  | { type: "checklist"; items: readonly string[] }
  | { type: "callout"; title: string; content: string; tone?: "blue" | "gold" | "red" }
  | {
      type: "table";
      columns: readonly string[];
      rows: readonly (readonly string[])[];
      caption?: string;
    }
  | {
      type: "model";
      caption: string;
      dimensions: readonly string[];
      fact: string;
      description: string;
    }
  | {
      type: "code";
      title: string;
      language: string;
      content: string;
      description?: string;
    }
  | { type: "links"; title?: string; links: readonly ContentLink[] };

export type ContentSection = {
  id: string;
  title: string;
  blocks: readonly ContentBlock[];
};

export type ContentCta = {
  eyebrow: string;
  title: string;
  description: string;
  label: string;
  href: string;
  variant?: "service" | "product";
};
