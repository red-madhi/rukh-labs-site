import type { Metadata } from "next";
import { LeadFeedNav } from "../lead-feed-nav";
import { LeadStatusDashboard } from "./lead-status-dashboard";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Lead Statuses | Rukh Leads",
  robots: { index: false, follow: false, noarchive: true, nosnippet: true },
};

// Keep this page dynamic so status metrics and queue outcomes stay current in production.
export default function LeadStatusesPage() {
  return (
    <>
      <LeadFeedNav active="statuses" />
      <LeadStatusDashboard />
    </>
  );
}
