import type { Metadata } from "next";
import { DataOpsLeadDashboard } from "@/app/leads/data-ops/data-ops-dashboard";
import { LeadFeedNav } from "@/app/leads/lead-feed-nav";

export const metadata: Metadata = {
  title: "Rukh Data Operations Pipeline",
  description: "Private ranked pipeline for active data operations problems and white-label partner prospects.",
  robots: {
    index: false,
    follow: false,
    noarchive: true,
    nosnippet: true,
    noimageindex: true,
  },
};

export default function DataOpsLeadsPage() {
  return (
    <>
      <LeadFeedNav active="data-ops" />
      <DataOpsLeadDashboard />
    </>
  );
}
