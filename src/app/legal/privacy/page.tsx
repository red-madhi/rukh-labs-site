import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import { PageHeader } from "@/components/ui/page-header";
import { Section } from "@/components/ui/section";
import { createPageMetadata } from "@/lib/site-config";

export const metadata: Metadata = createPageMetadata({
  title: "Farzin Chess Privacy Policy",
  description:
    "Farzin Chess is a Rukh Labs chess training app built around simple, account-free chess practice.",
  path: "/legal/privacy",
});

const policySections = [
  {
    title: "No account required",
    copy: "Farzin Chess does not require a Rukh Labs account. You can use the app without creating a login or providing personal account information to Rukh Labs.",
  },
  {
    title: "Data collection",
    copy: "Farzin Chess is designed to work without collecting personal information from you. Game progress, settings, and training activity are stored locally on your device unless you choose to export, back up, restore, or share information yourself.",
  },
  {
    title: "Purchases and distribution",
    copy: "Farzin Chess may use Google Play services for app distribution and optional purchases. If you make an optional purchase, payment is processed by Google Play, not directly by Farzin Chess. Rukh Labs does not receive your full payment card information.",
  },
  {
    title: "Optional feedback and support",
    copy: "If you choose to send feedback, a bug report, or a support message, Rukh Labs may receive the information you choose to include, such as your message, email address, screenshots, or device/app details you provide. We use this information only to understand, troubleshoot, and respond to the issue.",
  },
  {
    title: "Data sharing and sale",
    copy: "Farzin Chess does not sell user data. Rukh Labs does not share personal information with advertisers or data brokers.",
  },
  {
    title: "Children",
    copy: "Farzin Chess is not specifically directed to children under 13. The app is intended for general chess players and chess learners.",
  },
  {
    title: "Data deletion",
    copy: "Because Farzin Chess does not require an account, there is no Rukh Labs account to delete. You can delete locally stored app data by clearing the app's storage in Android settings or uninstalling the app. If you contacted Rukh Labs for support and want that support message deleted, contact us using the email below.",
  },
  {
    title: "Changes to this policy",
    copy: 'We may update this Privacy Policy when Farzin Chess changes or when legal, platform, or product requirements change. The updated version will be posted on this page with a new "Last updated" date.',
  },
];

export default function PrivacyPage() {
  return (
    <>
      <PageHeader
        eyebrow="Legal"
        title="Farzin Chess Privacy Policy"
        description="Farzin Chess is a Rukh Labs chess training app built around simple, account-free chess practice. We do not sell user data."
      />
      <Section>
        <Container>
          <div className="mb-6 rounded-lg border border-[#d6ad5b]/20 bg-[#d6ad5b]/8 p-5 text-sm leading-7 text-white/68">
            <p className="font-medium text-[color:var(--brand-bronze)]">
              Last updated: July 8, 2026
            </p>
            <p>
              Farzin Chess is a Rukh Labs chess training app built around
              simple, account-free chess practice. We do not sell user data.
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
                For privacy questions, contact Rukh Labs at:{" "}
                <a
                  className="font-medium text-[color:var(--brand-bronze)] underline-offset-4 transition hover:underline"
                  href="mailto:rukhlabs@gmail.com"
                >
                  rukhlabs@gmail.com
                </a>
              </p>
            </Card>
          </div>
        </Container>
      </Section>
    </>
  );
}
