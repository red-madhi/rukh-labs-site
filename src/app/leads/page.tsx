import type { Metadata } from "next";
import { LeadsDashboard } from "@/app/leads/leads-dashboard";

export const metadata: Metadata = {
  title: "Rukh Leads",
  description: "Private lead operations dashboard for Rukh Labs.",
  robots: {
    index: false,
    follow: false,
    noarchive: true,
    nosnippet: true,
    noimageindex: true,
  },
};

export default function LeadsPage() {
  return <LeadsDashboard />;
}
