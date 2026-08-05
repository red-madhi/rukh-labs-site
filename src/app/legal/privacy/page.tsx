import type { Metadata } from "next";
import Link from "next/link";
import { TrackedAnchor } from "@/components/analytics/tracked-link";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import { PageHeader } from "@/components/ui/page-header";
import { Section } from "@/components/ui/section";
import { createPageMetadata, siteConfig } from "@/lib/site-config";

export const metadata: Metadata = createPageMetadata({
  title: "Privacy Policy",
  description:
    "How Rukh Labs handles website inquiries, email communications, analytics, technical logs, and beta-interest forms.",
  path: "/legal/privacy",
});

const policySections = [
  {
    title: "Information you choose to provide",
    copy: "The project inquiry form prepares an email draft on your device. Nothing is sent to Rukh Labs until you review and send that email through your email provider. If you email Rukh Labs directly, the message may include your name, email address, phone number, organization, project details, and any other information you choose to provide.",
  },
  {
    title: "Beta-interest form",
    copy: "The current Glass Squares OS beta-interest form validates the entered address in your browser and shows a local confirmation. It does not transmit the email address to Rukh Labs. A non-identifying analytics event may record that the form was completed, without the address or selected personal information. This policy will be updated before any server-side waitlist collection is introduced.",
  },
  {
    title: "Analytics and technical information",
    copy: "Rukh Labs uses Vercel Analytics to understand general site usage and conversion actions. Events are configured not to include names, email addresses, phone numbers, form messages, or résumé data. Vercel and the site hosting infrastructure may also process technical information and logs needed to deliver, secure, and operate the website, such as request, device, browser, and network information.",
  },
  {
    title: "How information is used",
    copy: "Information is used to respond to inquiries, evaluate and deliver requested services, provide product support, maintain and secure the website, understand aggregate site usage, and comply with applicable obligations. Rukh Labs does not use inquiry details to build advertising profiles.",
  },
  {
    title: "Sharing and service providers",
    copy: "Information may be processed by providers used to operate the website and communications, including Vercel and the email providers involved when you send a message. Information may also be disclosed when reasonably necessary to comply with law, protect rights or security, or complete a business transaction. Rukh Labs does not sell personal information.",
  },
  {
    title: "Retention",
    copy: "Communications and related project records are kept only as long as reasonably useful for the inquiry, working relationship, recordkeeping, security, or legal needs. Hosting and analytics providers may retain technical data under their own policies. No fixed deletion period is promised where one has not been implemented.",
  },
  {
    title: "Security limitations",
    copy: "Rukh Labs uses reasonable technical and organizational care, but no website, email system, or internet transmission can be guaranteed completely secure. Avoid sending credentials, payment-card details, confidential employer data, or other sensitive information through a first-contact message.",
  },
  {
    title: "Children",
    copy: "This business website and its services are not directed to children under 13, and Rukh Labs does not knowingly seek personal information from children through the site.",
  },
  {
    title: "Policy updates",
    copy: "This policy may change when the website, service providers, or business practices change. The current version will be posted here with an updated date.",
  },
] as const;

export default function PrivacyPage() {
  return (
    <>
      <div className="border-b border-white/10 bg-black/15">
        <Container className="py-4">
          <Breadcrumbs
            items={[
              { name: "Home", path: "/" },
              { name: "Privacy", path: "/legal/privacy" },
            ]}
          />
        </Container>
      </div>
      <PageHeader
        eyebrow="Legal"
        title="Rukh Labs Privacy Policy"
        description="This policy explains how the Rukh Labs website and business handle information from inquiries, email, analytics, technical logs, and current beta-interest forms."
      />
      <Section>
        <Container>
          <div className="mb-6 rounded-lg border border-[#d6ad5b]/20 bg-[#d6ad5b]/8 p-5 text-sm leading-7 text-white/68">
            <p className="font-medium text-[color:var(--brand-bronze)]">
              Last updated: August 4, 2026
            </p>
            <p className="mt-2">
              Looking for the Android app policy? Read the{" "}
              <Link href="/products/farzin/privacy" className="font-medium text-white underline underline-offset-4">
                Farzin Privacy Policy
              </Link>
              .
            </p>
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
                For privacy questions, contact Rukh Labs at{" "}
                <TrackedAnchor
                  href={siteConfig.links.email}
                  eventName="email_click"
                  eventProperties={{ source_page: "/legal/privacy" }}
                  className="font-medium text-[color:var(--brand-bronze)] underline-offset-4 transition hover:underline"
                >
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
