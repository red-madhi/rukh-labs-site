import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import { PageHeader } from "@/components/ui/page-header";
import { Section } from "@/components/ui/section";
import { createPageMetadata } from "@/lib/site-config";

export const metadata: Metadata = createPageMetadata({
  title: "Terms",
  description: "Placeholder terms for Rukh Labs.",
  path: "/legal/terms",
});

const terms = [
  {
    title: "Status",
    copy: "These terms are placeholders for a pre-launch website and should be reviewed by qualified counsel before production use.",
  },
  {
    title: "Beta access",
    copy: "Early access may be limited, changed, paused, or discontinued while products are in development.",
  },
  {
    title: "No guarantees",
    copy: "Public product pages should not be read as promises of final features, compatibility, certifications, or release dates.",
  },
  {
    title: "Acceptable use",
    copy: "A final terms document should define acceptable use for accounts, downloads, feedback channels, and security testing.",
  },
  {
    title: "Intellectual property",
    copy: "The Rukh Labs name, product names, original site copy, and product concepts should be protected in the final launch terms.",
  },
];

export default function TermsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Legal"
        title="Terms"
        description="Placeholder terms for Rukh Labs. This is not final legal advice and should be reviewed before launch."
      />
      <Section>
        <Container>
          <div className="grid gap-4">
            {terms.map((item) => (
              <Card key={item.title} className="p-6">
                <Badge tone="blue">{item.title}</Badge>
                <p className="mt-5 text-sm leading-7 text-white/62">{item.copy}</p>
              </Card>
            ))}
          </div>
        </Container>
      </Section>
    </>
  );
}
