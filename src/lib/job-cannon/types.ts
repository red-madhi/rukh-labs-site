export type JobCannonStatus =
  | "new"
  | "ready"
  | "queued"
  | "applying"
  | "applied"
  | "interview"
  | "offer"
  | "rejected"
  | "skipped";

export type JobCannonExperience = {
  id: string;
  company: string;
  title: string;
  location: string;
  startDate: string;
  endDate: string;
  current: boolean;
  bullets: string[];
  technologies: string[];
};

export type JobCannonEducation = {
  id: string;
  school: string;
  degree: string;
  field: string;
  location: string;
  startDate: string;
  endDate: string;
};

export type JobCannonAnswer = {
  pattern: string;
  answer: string;
  source?: "manual" | "learned";
  lastUsedAt?: string;
  uses?: number;
};

export type JobCannonTailoredExperience = {
  experienceId: string;
  company: string;
  title: string;
  bullets: string[];
};

export type JobCannonTailoredResume = {
  createdAt: string;
  headline: string;
  summary: string;
  skills: string[];
  matchedKeywords: string[];
  experience: JobCannonTailoredExperience[];
};

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
  companyKey?: string;
  duplicateOf?: string;
  lastOpenedAt?: string;
  tailoredResume?: JobCannonTailoredResume;
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
  headline: string;
  masterSummary: string;
  certifications: string[];
  experience: JobCannonExperience[];
  education: JobCannonEducation[];
  answerBank: JobCannonAnswer[];
};

export type JobCannonSettings = {
  roles: string;
  location: string;
  minSalary: number;
  maxAgeHours: number;
  remoteOnly: boolean;
  rejectTerms: string;
  autoReadyThreshold: number;
  duplicateWindowDays: number;
};
