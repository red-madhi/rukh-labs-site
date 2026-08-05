import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import { PageHeader } from "@/components/ui/page-header";
import { Section } from "@/components/ui/section";
import { createPageMetadata } from "@/lib/site-config";

// This interim notice must be reviewed and replaced by qualified legal counsel.
// It is intentionally noindexed and is not presented as attorney-reviewed terms.
export const metadata: Metadata = createPageMetadata({
  title: "Website and Service Terms",
  description: "Current service and product terms information for Rukh Labs.",
  path: "/legal/terms",
  robots: { index: false, follow: true },
});

const terms = [
  {
    title: "Website information",
    copy: "The website describes current services, released products, and development direction in general terms. It does not guarantee that every proposed feature, compatibility path, or roadmap item will be delivered.",
  },
  {
    title: "Client services",
    copy: "Website and career portfolio projects are governed by a written proposal, scope, payment terms, and client agreement accepted before work begins. Those project documents control if they differ from this general notice.",
  },
  {
    title: "Products and early access",
    copy: "Product-specific terms may vary. Development builds, beta access, and experimental features may change, be limited, or be withdrawn as product work continues.",
  },
  {
    title: "Intellectual property and third parties",
    copy: "Rukh Labs retains rights in its name, product identities, original software, and reusable materials unless a written agreement states otherwise. Third-party platforms, software, fonts, media, and services remain subject to their own terms and licenses.",
  },
  {
    title: "Professional review pending",
    copy: "This page is a limited operational notice, not a complete set of legal terms and not legal advice. Project agreements and final website terms should be reviewed by qualified counsel.",
  },
] as const;

export default function TermsPage() {
  return (
    <>
      <div className="border-b border-white/10 bg-black/15">
        <Container className="py-4">
          <Breadcrumbs items={[
            { name: "Home", path: "/" },
            { name: "Privacy policy", path: "/legal/privacy" },
            { name: "Terms", path: "/legal/terms" },
          ]} />
        </Container>
      </div>
      <PageHeader
        eyebrow="Legal"
        title="Website and Service Terms"
        description="Project-specific services are governed by written agreements, and product terms may vary by release or platform."
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
