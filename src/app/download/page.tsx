import type { Metadata } from "next";
import Link from "next/link";
import { Download, FileCheck2, ShieldCheck } from "lucide-react";
import { WaitlistForm } from "@/components/forms/waitlist-form";
import { Badge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import { PageHeader } from "@/components/ui/page-header";
import { Reveal } from "@/components/ui/reveal";
import { Section } from "@/components/ui/section";
import { createPageMetadata } from "@/lib/site-config";

export const metadata: Metadata = createPageMetadata({
  title: "Download",
  description:
    "Rukh OS and Farzin downloads are not public yet. Join the beta list for access when builds are ready.",
  path: "/download",
});

const betaCards = [
  {
    title: "Rukh OS beta",
    copy: "Early images will focus on install research, desktop experience, default apps, and compatibility testing.",
    icon: Download,
  },
  {
    title: "Farzin beta",
    copy: "Early access will focus on game review, analysis flow, study plans, and training interface feedback.",
    icon: FileCheck2,
  },
  {
    title: "Checksums and release notes",
    copy: "Public builds will include checksums, version notes, and security-relevant changes before general access.",
    icon: ShieldCheck,
  },
];

export default function DownloadPage() {
  return (
    <>
      <PageHeader
        eyebrow="Beta access"
        title="Downloads are not public yet."
        description="Rukh OS and Farzin are currently in development. Join the beta list to get access when builds are ready."
      />
      <Section>
        <Container>
          <div className="grid gap-4 lg:grid-cols-3">
            {betaCards.map((item, index) => {
              const Icon = item.icon;

              return (
                <Reveal key={item.title} delay={index * 0.05}>
                  <Card interactive className="h-full p-6">
                    <span className="grid size-11 place-items-center rounded-lg border border-[#d6ad5b]/24 bg-[#d6ad5b]/10 text-[#f3d99d]">
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
              <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <Badge tone="blue">Release notes</Badge>
                  <p className="mt-4 max-w-2xl text-sm leading-6 text-white/60">
                    The changelog tracks roadmap direction and will become the
                    release notes hub as builds open.
                  </p>
                </div>
                <Link href="/changelog" className={buttonStyles({ variant: "secondary" })}>
                  View Release Notes
                </Link>
              </div>
            </Card>
          </Reveal>
        </Container>
      </Section>
      <Section className="border-t border-white/10 bg-white/[0.025]">
        <Container>
          <Reveal>
            <div className="max-w-3xl">
              <Badge tone="gold">Join beta</Badge>
              <h2 className="mt-5 text-3xl font-semibold text-white sm:text-5xl">
                Get access when builds are ready.
              </h2>
            </div>
            <div className="mt-8">
              <WaitlistForm />
            </div>
          </Reveal>
        </Container>
      </Section>
    </>
  );
}
