export type JobCannonStatus =
  | "new"
  | "queued"
  | "applying"
  | "applied"
  | "interview"
  | "offer"
  | "rejected"
  | "skipped";

export type JobCannonJob = {
  id: string;
  title: string;
  company: string;
  location: string;
  description: string;
  url: string;
  provider: string;
  postedAt?: string;
  discoveredAt: string;
  employmentType?: string;
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency?: string;
  salaryUnit?: string;
  sourceSnippet?: string;
  status?: JobCannonStatus;
};

export type JobCannonSearchRequest = {
  roles?: string[];
  location?: string;
  maxAgeHours?: number;
  sourceOffset?: number;
  sourceCount?: number;
};

export type JobCannonSearchResponse = {
  ok: boolean;
  jobs: JobCannonJob[];
  sources: string[];
  sourceOffset: number;
  nextSourceOffset: number;
  searched: number;
  checked: number;
  budget?: {
    used?: number;
    limit?: number;
  };
  error?: string;
};

export type JobCannonAnswer = {
  pattern: string;
  answer: string;
};

export type JobCannonProfile = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address1: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  linkedin: string;
  portfolio: string;
  github: string;
  salaryExpectation: string;
  workAuthorized: string;
  needsSponsorship: string;
  willingToRelocate: string;
  willingToTravel: string;
  sourceAnswer: string;
  skills: string;
  answerBank: JobCannonAnswer[];
};

export type JobCannonSettings = {
  roles: string;
  location: string;
  minSalary: number;
  maxAgeHours: number;
  remoteOnly: boolean;
  rejectTerms: string;
};
