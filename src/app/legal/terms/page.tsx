import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import { PageHeader } from "@/components/ui/page-header";
import { Section } from "@/components/ui/section";
import { createPageMetadata } from "@/lib/site-config";

// Qualified legal review is required before these limited website-use terms are expanded or restored to public footer navigation.
export const metadata: Metadata = createPageMetadata({
  title: "Website Terms of Use",
  description: "Terms for using the Rukh Labs website and its public information.",
  path: "/legal/terms",
  robots: { index: false, follow: true },
});

const terms = [
  {
    title: "Using this website",
    copy: "Rukh Labs provides this website for general information about its services, products, and work. Please use the site lawfully and do not interfere with its operation or misuse information made available here.",
  },
  {
    title: "External links",
    copy: "This website may link to third-party websites or services for convenience. Rukh Labs does not control those sites or their content, availability, or practices.",
  },
  {
    title: "Rukh Labs intellectual property",
    copy: "The Rukh Labs name, product identities, original software, website design, and other original materials on this site belong to Rukh Labs or their respective owners. Do not reuse them in a way that suggests affiliation or permission without approval.",
  },
  {
    title: "Product and roadmap information",
    copy: "Public product descriptions, release notes, and roadmap information describe the current direction of work. They are not a promise that a proposed feature, integration, compatibility path, or product will be released.",
  },
  {
    title: "Project services",
    copy: "Services for a specific project are defined by the written agreement, proposal, scope, and other documents accepted for that project. This website does not change those project-specific arrangements.",
  },
  {
    title: "Questions and updates",
    copy: "For questions about this website, contact hello@rukhlabs.com. Rukh Labs may update these website terms as the site, products, and services change.",
  },
] as const;

export default function TermsPage() {
  return (
    <>
      <div className="border-b border-white/10 bg-black/15">
        <Container className="py-4">
          <Breadcrumbs items={[
            { name: "Home", path: "/" },
            { name: "Terms", path: "/legal/terms" },
          ]} />
        </Container>
      </div>
      <PageHeader
        eyebrow="Legal"
        title="Website Terms of Use"
        description="Information for using the Rukh Labs website and understanding public product and service information."
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
