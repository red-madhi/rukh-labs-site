import type { Metadata } from "next";
import { ContactForm } from "@/components/forms/contact-form";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import { PageHeader } from "@/components/ui/page-header";
import { Reveal } from "@/components/ui/reveal";
import { Section } from "@/components/ui/section";
import { createPageMetadata, siteConfig } from "@/lib/site-config";

export const metadata: Metadata = createPageMetadata({
  title: "Contact",
  description: "Contact Rukh Labs for beta access, product feedback, security reports, partnerships, or press.",
  path: "/contact",
});

export default function ContactPage() {
  return (
    <>
      <PageHeader
        eyebrow="Contact"
        title="Talk to Rukh Labs."
        description="Send product feedback, beta interest, security reports, or serious partnership notes."
      />
      <Section>
        <Container className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
          <Reveal>
            <div>
              <Badge tone="gold">What this is for</Badge>
              <div className="mt-6 grid gap-3">
                {siteConfig.contactReasons.map((reason) => (
                  <Card key={reason} className="p-4">
                    <h2 className="text-base font-semibold text-white">{reason}</h2>
                  </Card>
                ))}
              </div>
            </div>
          </Reveal>
          <Reveal delay={0.08}>
            <ContactForm />
          </Reveal>
        </Container>
      </Section>
    </>
  );
}
