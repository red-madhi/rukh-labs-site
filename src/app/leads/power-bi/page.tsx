import type { Metadata } from "next";
import { LeadFeedNav } from "@/app/leads/lead-feed-nav";
import { PowerBiGigsDashboard } from "@/app/leads/power-bi/power-bi-dashboard";

export const metadata: Metadata = {
  title: "Rukh Power BI Gigs",
  description: "Private Power BI freelance opportunity feed for Rukh Labs.",
  robots: {
    index: false,
    follow: false,
    noarchive: true,
    nosnippet: true,
    noimageindex: true,
  },
};

export default function PowerBiGigsPage() {
  return (
    <>
      <LeadFeedNav active="power-bi" />
      <PowerBiGigsDashboard />
    </>
  );
}
