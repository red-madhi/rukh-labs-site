import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  BriefcaseBusiness,
  Database,
  Gauge,
  Mail,
  Network,
  Search,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";

export const metadata: Metadata = {
  title: "Admin | Rukh Labs",
  description: "Private Rukh Labs admin hub.",
  robots: { index: false, follow: false },
};

const sections = [
  {
    title: "Lead tools",
    description: "Private lead discovery, qualification, partner, and outreach pages.",
    items: [
      {
        title: "Leads",
        description: "Main website-lead dashboard and crawl controls.",
        href: "/leads",
        icon: Search,
      },
      {
        title: "Data Ops Leads",
        description: "Data operations and reporting opportunities.",
        href: "/leads/data-ops",
        icon: Database,
      },
      {
        title: "Power BI Leads",
        description: "Power BI opportunities and prospect feed.",
        href: "/leads/power-bi",
        icon: BarChart3,
      },
      {
        title: "Partners",
        description: "Potential delivery, referral, and white-label partners.",
        href: "/leads/partners",
        icon: UsersRound,
      },
      {
        title: "Lead Statuses",
        description: "Lead pipeline and status management.",
        href: "/leads/statuses",
        icon: Gauge,
      },
      {
        title: "Outreach",
        description: "Prepared outreach, campaigns, and follow-ups.",
        href: "/leads/outreach",
        icon: Mail,
      },
      {
        title: "Outreach Safety",
        description: "Outreach checks, limits, and safety controls.",
        href: "/leads/outreach/safety",
        icon: ShieldCheck,
      },
    ],
  },
  {
    title: "Job tools",
    description: "Private tools for finding and handling job opportunities.",
    items: [
      {
        title: "Job Cannon",
        description: "Job discovery and application workflow.",
        href: "/job-cannon",
        icon: BriefcaseBusiness,
      },
    ],
  },
  {
    title: "IAZMA tools",
    description: "Private Bluesky network tools. These also use IAZMA's own access check.",
    items: [
      {
        title: "IAZMA PRO",
        description: "Private network strategy and growth workspace.",
        href: "/tools/bluesky-network-advanced/app",
        icon: Network,
      },
      {
        title: "IAZMA Guard",
        description: "Follower cleanup, bot review, inactivity checks, and suppression tools.",
        href: "/guard",
        icon: ShieldCheck,
      },
    ],
  },
] as const;

const pageCount = sections.reduce((total, section) => total + section.items.length, 0);

export default function AdminPage() {
  return (
    <>
      <Section className="relative overflow-hidden border-b border-white/10 py-14 sm:py-20">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_10%,rgba(240,0,28,0.13),transparent_34%),radial-gradient(circle_at_88%_30%,rgba(22,200,255,0.10),transparent_34%)]" />
        <Container className="relative">
          <Badge tone="red">Private admin</Badge>
          <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
            <div className="max-w-4xl">
              <h1 className="text-4xl font-semibold leading-[1.02] tracking-[-0.045em] text-white sm:text-6xl">
                Rukh Labs admin
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-8 text-white/58 sm:text-lg">
                One place to open the private dashboards, lead tools, job tools, and IAZMA workspaces on this site.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.025] px-5 py-4 text-sm text-white/46">
              <strong className="block text-3xl font-semibold tracking-[-0.04em] text-white">{pageCount}</strong>
              private pages linked
            </div>
          </div>
        </Container>
      </Section>

      <Section className="py-12 sm:py-16">
        <Container className="grid gap-12">
          {sections.map((section) => (
            <section key={section.title} aria-labelledby={`admin-${section.title.toLowerCase().replaceAll(" ", "-")}`}>
              <div className="grid gap-3 border-b border-white/10 pb-5 sm:grid-cols-[0.55fr_1.45fr] sm:items-end">
                <h2
                  id={`admin-${section.title.toLowerCase().replaceAll(" ", "-")}`}
                  className="text-2xl font-semibold text-white sm:text-3xl"
                >
                  {section.title}
                </h2>
                <p className="max-w-2xl text-sm leading-6 text-white/46">{section.description}</p>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="group flex min-h-40 min-w-0 flex-col rounded-2xl border border-white/10 bg-white/[0.025] p-5 transition hover:-translate-y-0.5 hover:border-[#16c8ff]/35 hover:bg-white/[0.045] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#16c8ff]"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-white/10 bg-black/20 text-[#8ce8ff]">
                          <Icon aria-hidden className="size-5" />
                        </span>
                        <ArrowRight aria-hidden className="size-4 text-white/30 transition group-hover:translate-x-1 group-hover:text-white" />
                      </div>
                      <h3 className="mt-5 text-lg font-semibold text-white">{item.title}</h3>
                      <p className="mt-2 text-sm leading-6 text-white/46">{item.description}</p>
                    </Link>
                  );
                })}
              </div>
            </section>
          ))}
        </Container>
      </Section>
    </>
  );
}
