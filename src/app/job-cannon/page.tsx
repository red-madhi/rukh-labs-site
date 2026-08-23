import type { Metadata } from "next";
import { JobCannonDashboard } from "./job-cannon-dashboard";

export const metadata: Metadata = {
  title: "Job Cannon",
  description: "Private job discovery, ranking, application queue, and ATS autofill workspace.",
  robots: {
    index: false,
    follow: false,
    noarchive: true,
    nosnippet: true,
    noimageindex: true,
  },
};

export default function JobCannonPage() {
  return <JobCannonDashboard />;
}
