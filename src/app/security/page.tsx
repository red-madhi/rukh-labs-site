import type { Metadata } from "next";
import {
  DatabaseZap,
  FileText,
  KeyRound,
  LockKeyhole,
  RefreshCcw,
  ShieldCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import { PageHeader } from "@/components/ui/page-header";
import { Reveal } from "@/components/ui/reveal";
import { Section } from "@/components/ui/section";
import { createPageMetadata } from "@/lib/site-config";

export const metadata: Metadata = createPageMetadata({
  title: "Security",
  description:
    "Security, privacy, and trust principles for Rukh Labs products.",
  path: "/security",
});

const securitySections = [
  {
    title: "Privacy principles",
    copy: "Collect less, explain more, and keep product behavior legible to the user.",
    icon: ShieldCheck,
  },
  {
    title: "Update philosophy",
    copy: "Updates should be clear, reversible where practical, and described in release notes people can read.",
    icon: RefreshCcw,
  },
  {
    title: "OS security direction",
    copy: "Rukh OS is exploring sane defaults, app permission direction, encrypted storage direction, and low-noise system services.",
    icon: LockKeyhole,
  },
  {
    title: "App security direction",
    copy: "Farzin and future apps should minimize data surfaces and make account or sync behavior explicit.",
    icon: KeyRound,
  },
  {
    title: "Responsible disclosure",
    copy: "A formal intake process is planned before public releases. For now, security reports can start through contact.",
    icon: FileText,
  },
  {
    title: "Data minimization",
    copy: "No mystery bloat, no unnecessary telemetry claims, and no invented certifications.",
    icon: DatabaseZap,
  },
];

export default function SecurityPage() {
  return (
    <>
      <PageHeader
        eyebrow="Security"
        title="Security is not decoration."
        description="Rukh Labs products are designed around sane defaults, clear updates, and respect for the user."
      />
      <Section>
        <Container>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {securitySections.map((item, index) => {
              const Icon = item.icon;

              return (
                <Reveal key={item.title} delay={index * 0.04}>
                  <Card interactive className="h-full p-6">
                    <span className="grid size-11 place-items-center rounded-lg border border-[#4db7ff]/22 bg-[#4db7ff]/10 text-[#9fdcff]">
                      <Icon aria-hidden className="size-5" />
                    </span>
                    <h2 className="mt-5 text-lg font-semibold text-white">{item.title}</h2>
                    <p className="mt-3 text-sm leading-6 text-white/58">{item.copy}</p>
                  </Card>
                </Reveal>
              );
            })}
          </div>
          <Reveal>
            <Card className="mt-8 p-6">
              <Badge tone="gold">No false certainty</Badge>
              <p className="mt-5 max-w-4xl text-sm leading-7 text-white/62">
                Rukh Labs does not claim third-party audits, certifications, or
                guarantees that do not exist. Security documentation will mature
                alongside public builds, release notes, and disclosure channels.
              </p>
            </Card>
          </Reveal>
        </Container>
      </Section>
    </>
  );
}
