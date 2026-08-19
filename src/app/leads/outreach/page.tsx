import type { Metadata } from "next";
import { LeadFeedNav } from "../lead-feed-nav";
import { OutreachCampaign } from "./outreach-campaign";

export const metadata: Metadata = {
  title: "Outreach | Rukh Leads",
  robots: { index: false, follow: false, noarchive: true, nosnippet: true },
};

export default function OutreachPage() {
  return (
    <>
      <LeadFeedNav active="outreach" />
      <OutreachCampaign />
    </>
  );
}
