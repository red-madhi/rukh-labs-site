import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import { PageHeader } from "@/components/ui/page-header";
import { Section } from "@/components/ui/section";
import { createPageMetadata } from "@/lib/site-config";

export const metadata: Metadata = createPageMetadata({
  title: "Privacy Policy",
  description: "Placeholder privacy policy for Rukh Labs.",
  path: "/legal/privacy",
});

const items = [
  {
    title: "Status",
    copy: "This is a placeholder privacy policy for pre-launch planning. It should be reviewed by qualified counsel before any real launch.",
  },
  {
    title: "Data minimization",
    copy: "Rukh Labs intends to collect only the information needed to provide access, product updates, support, security response, and product operation.",
  },
  {
    title: "Waitlist and contact forms",
    copy: "The current website forms are frontend-only placeholders. A production implementation should disclose what is stored, where it is processed, and how users can request changes.",
  },
  {
    title: "Product analytics",
    copy: "No analytics or telemetry commitments should be treated as final until each product has a reviewed privacy design.",
  },
  {
    title: "User rights",
    copy: "The final policy should explain access, deletion, portability, correction, retention, and regional privacy rights where applicable.",
  },
];

export default function PrivacyPage() {
  return (
    <>
      <PageHeader
        eyebrow="Legal"
        title="Privacy Policy"
        description="Placeholder policy language for Rukh Labs. This is not final legal advice and should be reviewed before launch."
      />
      <Section>
        <Container>
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
