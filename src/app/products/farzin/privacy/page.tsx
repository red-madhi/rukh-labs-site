import type { Metadata } from "next";
import { TrackedAnchor } from "@/components/analytics/tracked-link";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import { PageHeader } from "@/components/ui/page-header";
import { Section } from "@/components/ui/section";
import { createPageMetadata, siteConfig } from "@/lib/site-config";

export const metadata: Metadata = createPageMetadata({
  title: "Farzin Privacy Policy",
  description:
    "Privacy information for Farzin, the Android chess training application from Rukh Labs.",
  path: "/products/farzin/privacy",
  image: {
    url: "/opengraph-image",
    width: 1200,
    height: 630,
    alt: "Farzin privacy information from Rukh Labs",
  },
});

const policySections = [
  { title: "No account required", copy: "Farzin does not require a Rukh Labs account. You can use the app without creating a login or providing personal account information to Rukh Labs." },
  { title: "Data collection", copy: "Farzin is designed to work without collecting personal information from you. Game progress, settings, and training activity are stored locally on your device unless you choose to export, back up, restore, or share information yourself." },
  { title: "Purchases and distribution", copy: "Farzin may use Google Play services for app distribution and optional purchases. If you make an optional purchase, payment is processed by Google Play, not directly by Farzin. Rukh Labs does not receive your full payment-card information." },
  { title: "Optional feedback and support", copy: "If you choose to send feedback, a bug report, or a support message, Rukh Labs may receive the information you include, such as your message, email address, screenshots, or device and app details. That information is used to understand, troubleshoot, and respond to the issue." },
  { title: "Data sharing and sale", copy: "Farzin does not sell user data. Rukh Labs does not share personal information with advertisers or data brokers." },
  { title: "Children", copy: "Farzin is not specifically directed to children under 13. The app is intended for general chess players and chess learners." },
  { title: "Data deletion", copy: "Because Farzin does not require an account, there is no Rukh Labs account to delete. You can delete locally stored app data by clearing the app's storage in Android settings or uninstalling the app. If you contacted Rukh Labs for support and want that support message deleted, contact Rukh Labs using the email below." },
  { title: "Changes to this policy", copy: "This policy may be updated when Farzin changes or when legal, platform, or product requirements change. The updated version will be posted on this page with a new Last updated date." },
] as const;

export default function FarzinPrivacyPage() {
  return (
    <>
      <div className="border-b border-white/10 bg-black/15">
        <Container className="py-4">
          <Breadcrumbs items={[
            { name: "Home", path: "/" },
            { name: "Products", path: "/products" },
            { name: "Farzin", path: "/products/farzin" },
            { name: "Privacy", path: "/products/farzin/privacy" },
          ]} />
        </Container>
      </div>
      <PageHeader
        eyebrow="Farzin legal"
        title="Farzin Privacy Policy"
        description="Privacy information for the Farzin Android chess training application."
      />
      <Section>
        <Container>
          <div className="mb-6 rounded-lg border border-[#d6ad5b]/20 bg-[#d6ad5b]/8 p-5 text-sm leading-7 text-white/68">
            <p className="font-medium text-[color:var(--brand-bronze)]">Last updated: August 5, 2026</p>
            <p className="mt-2">Farzin is designed around account-free chess practice. Rukh Labs does not sell user data.</p>
          </div>
          <div className="grid gap-4">
            {policySections.map((item) => (
              <Card key={item.title} className="p-6">
                <Badge tone="gold">{item.title}</Badge>
                <p className="mt-5 text-sm leading-7 text-white/62">{item.copy}</p>
              </Card>
            ))}
            <Card className="p-6">
              <Badge tone="gold">Contact</Badge>
              <p className="mt-5 text-sm leading-7 text-white/62">
                For Farzin privacy questions, email{" "}
                <TrackedAnchor href={siteConfig.links.email} eventName="email_click" eventProperties={{ source_page: "/products/farzin/privacy" }} className="font-medium text-[color:var(--brand-bronze)] underline-offset-4 transition hover:underline">
                  {siteConfig.contactEmail}
                </TrackedAnchor>
                .
              </p>
            </Card>
          </div>
        </Container>
      </Section>
    </>
  );
}
