import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Download, FileCheck2, ShieldCheck } from "lucide-react";
import { WaitlistForm } from "@/components/forms/waitlist-form";
import { Badge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import { PageHeader } from "@/components/ui/page-header";
import { Reveal } from "@/components/ui/reveal";
import { Section } from "@/components/ui/section";
import { createPageMetadata, siteConfig } from "@/lib/site-config";

export const metadata: Metadata = createPageMetadata({
  title: "Download",
  description:
    "Access Farzin on Google Play, register for the Glass Squares OS beta, and follow future Rukh Labs downloads and release notes.",
  path: "/download",
});

const releaseCards = [
  {
    title: "Glass Squares OS beta registration",
    copy: "No public OS download is available yet. Register below for beta access as qualified testing opens.",
    icon: Download,
  },
  {
    title: "Farzin on Google Play",
    copy: "Farzin 1.0.0 is the current production Android release and is available now on Google Play.",
    icon: FileCheck2,
    href: siteConfig.links.farzinGooglePlay,
    cta: "Get Farzin on Google Play",
  },
  {
    title: "Future releases and downloads",
    copy: "Future downloadable builds will include checksums, version notes, and security-relevant changes before general access.",
    icon: ShieldCheck,
  },
];

export default function DownloadPage() {
  return (
    <>
      <PageHeader
        eyebrow="Downloads & releases"
        title="Get the latest Rukh Labs software."
        description="Farzin 1.0.0 is available now on Google Play. Glass Squares OS remains in development, with beta registration opening separately. No spam. Just product access, release notes, and major updates."
      />
      <Section>
        <Container>
          <div className="grid gap-4 lg:grid-cols-3">
            {releaseCards.map((item, index) => {
              const Icon = item.icon;

              return (
                <Reveal key={item.title} delay={index * 0.05}>
                  <Card interactive className="h-full p-6">
                    <span className="grid size-11 place-items-center rounded-lg border border-[color:var(--brand-red)]/24 bg-[color:var(--brand-red)]/10 text-[#ffb4b8]">
                      <Icon aria-hidden className="size-5" />
                    </span>
                    <h2 className="mt-5 text-lg font-semibold text-white">{item.title}</h2>
                    <p className="mt-3 text-sm leading-6 text-white/58">{item.copy}</p>
                    {item.href ? (
                      <a
                        href={item.href}
                        aria-label="Get Farzin 1.0.0 on Google Play"
                        className={buttonStyles({
                          variant: "secondary",
                          size: "sm",
                          className: "mt-5",
                        })}
                      >
                        {item.cta}
                        <ArrowUpRight aria-hidden className="size-4" />
                      </a>
                    ) : null}
                  </Card>
                </Reveal>
              );
            })}
          </div>
          <Reveal>
            <Card className="mt-8 p-6">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <Badge tone="red">Release notes</Badge>
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
              <Badge tone="gold">Glass Squares OS beta</Badge>
              <h2 className="mt-5 text-3xl font-semibold text-white sm:text-5xl">
                Get access when the OS beta opens.
              </h2>
            </div>
            <div className="mt-8">
              <WaitlistForm defaultInterest="Glass Squares OS" />
            </div>
          </Reveal>
        </Container>
      </Section>
    </>
  );
}
