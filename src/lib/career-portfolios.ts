export type CareerPortfolioPackage = {
  id: "essential" | "signature" | "proof-system";
  name: string;
  price: string;
  priceNote: string;
  summary: string;
  bestFor: string;
  features: string[];
  recommended?: boolean;
};

export const careerPortfolioPackages: CareerPortfolioPackage[] = [
  {
    id: "essential",
    name: "Career Essential",
    price: "$995",
    priceNote: "Fixed-scope starting package",
    summary:
      "A focused, recruiter-ready portfolio that turns a resume into a clear professional story.",
    bestFor: "A strong individual contributor applying to a defined role family.",
    features: [
      "One polished scrolling portfolio page",
      "Positioning, headline, and career narrative",
      "Two proof-of-work case studies",
      "Resume and contact call-to-action",
      "Responsive build and basic search setup",
      "One structured revision round",
    ],
  },
  {
    id: "signature",
    name: "Career Signature",
    price: "$1,995",
    priceNote: "Most complete portfolio for active searches",
    summary:
      "A distinctive portfolio system with deeper case studies and interactive proof designed around the jobs you want.",
    bestFor: "Experienced professionals who need their judgment—not just their job titles—to stand out.",
    features: [
      "Custom multi-section visual direction",
      "Up to four structured case studies",
      "Interactive skills and evidence mapping",
      "Resume and LinkedIn message alignment",
      "Private or public publishing options",
      "Two structured revision rounds",
    ],
    recommended: true,
  },
  {
    id: "proof-system",
    name: "Career Proof System",
    price: "From $3,500",
    priceNote: "Custom scope for complex or senior work",
    summary:
      "A multi-page evidence system for leaders, technical specialists, consultants, and candidates with substantial work to demonstrate.",
    bestFor: "Senior, technical, creative, or cross-functional candidates with several audiences and proof formats.",
    features: [
      "Multi-page information architecture",
      "Case-study interviews and copy strategy",
      "Interactive demos, data stories, or media",
      "Privacy and redaction planning",
      "Analytics and custom integrations",
      "Launch support and handoff documentation",
    ],
  },
];

export const careerPortfolioInquiryHref =
  "/contact?inquiry=career-portfolio";

export function getCareerPortfolioInquiryHref(packageId?: string) {
  const params = new URLSearchParams({ inquiry: "career-portfolio" });
  if (packageId) params.set("package", packageId);
  return `/contact?${params.toString()}`;
}

export const careerPortfolioProcess = [
  {
    number: "01",
    title: "Choose the target",
    copy: "Define the roles, audience, positioning, and the decisions a recruiter should be able to make quickly.",
  },
  {
    number: "02",
    title: "Mine the evidence",
    copy: "Turn experience, projects, results, artifacts, and constraints into credible proof without exposing private work.",
  },
  {
    number: "03",
    title: "Build the story",
    copy: "Design the hierarchy, case studies, visuals, and interactions around how hiring teams actually scan candidates.",
  },
  {
    number: "04",
    title: "Launch with control",
    copy: "Publish on an existing domain or a new one, add privacy controls, test every device, and hand over the finished site.",
  },
] as const;

export const careerPortfolioFaqs = [
  {
    question: "Do I need to buy another domain?",
    answer:
      "Usually not. A portfolio can live at a path such as yourdomain.com/portfolio or on a subdomain. A separate domain is optional when you want an independent personal brand.",
  },
  {
    question: "What if my work is confidential?",
    answer:
      "We can redact details, rebuild representative examples with fictional data, describe the decision process without naming a client, or keep selected pages unlisted and excluded from search engines.",
  },
  {
    question: "Is this resume writing?",
    answer:
      "It is broader. The site translates resume claims into a visual evidence system. Resume and LinkedIn alignment can be included, but the core deliverable is a portfolio designed to help a hiring team understand your value.",
  },
  {
    question: "Are hosting and domain fees included?",
    answer:
      "The build and launch work are included as scoped. Third-party domain, hosting, email, or premium service fees remain the client’s responsibility and are confirmed before launch.",
  },
] as const;
