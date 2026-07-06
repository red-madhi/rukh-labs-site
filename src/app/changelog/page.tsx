import type { Metadata } from "next";
import { ChangelogList } from "@/components/sections/changelog-list";
import { Container } from "@/components/ui/container";
import { PageHeader } from "@/components/ui/page-header";
import { Section } from "@/components/ui/section";
import { changelogEntries } from "@/lib/changelog";
import { createPageMetadata } from "@/lib/site-config";

export const metadata: Metadata = createPageMetadata({
  title: "Changelog",
  description: "Product updates, roadmap notes, and development status from Rukh Labs.",
  path: "/changelog",
});

export default function ChangelogPage() {
  return (
    <>
      <PageHeader
        eyebrow="Roadmap"
        title="Changelog & Roadmap"
        description="A public development trail for Rukh Labs, Rukh OS, Farzin, and future lab work."
      />
      <Section>
        <Container>
          <ChangelogList entries={changelogEntries} />
        </Container>
      </Section>
    </>
  );
}
