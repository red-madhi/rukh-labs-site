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
    "Privacy policy for Farzin Chess, an account-free chess training app by Rukh Labs.",
  path: "/legal/privacy",
});

const items = [
  {
    title: "No account required",
    copy: "Farzin Chess does not require an account. You can use the app without creating a Rukh Labs login or providing personal account information to Rukh Labs.",
  },
  {
    title: "Purchases and distribution",
    copy: "The app may use Google Play services for purchases and app distribution. If optional purchases are made, payments are processed by Google Play, not directly by Farzin Chess.",
  },
  {
    title: "No sale of user data",
    copy: "Farzin Chess does not sell user data.",
  },
  {
    title: "Player progress",
    copy: "Farzin Chess is designed to work without an account. Progress, settings, and training activity are intended to stay on the device unless you choose to export, back up, restore, or share information yourself.",
  },
  {
    title: "Optional feedback",
    copy: "If you choose to send feedback, a bug report, or a support message, Rukh Labs may receive the information you decide to include so we can understand and respond to the issue.",
  },
];

export default function PrivacyPage() {
  return (
    <>
      <PageHeader
        eyebrow="Legal"
        title="Farzin Chess Privacy Policy"
        description="Farzin Chess is built around simple, account-free chess training. We do not sell user data."
      />
      <Section>
        <Container>
          <div className="mb-6 rounded-lg border border-[#d6ad5b]/20 bg-[#d6ad5b]/8 p-5 text-sm leading-7 text-white/68">
            <p>
              Last updated: July 8, 2026. Farzin Chess is a Rukh Labs chess
              training app. This page explains the basic privacy position for
              the app and its optional Google Play purchase flow.
            </p>
          </div>
          <div className="grid gap-4">
            {items.map((item) => (
              <Card key={item.title} className="p-6">
                <Badge tone="gold">{item.title}</Badge>
                <p className="mt-5 text-sm leading-7 text-white/62">{item.copy}</p>
              </Card>
            ))}
          </div>
        </Container>
      </Section>
    </>
  );
}
