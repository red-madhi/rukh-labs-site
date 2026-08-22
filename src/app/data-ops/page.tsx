import type { Metadata } from "next";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Check,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  Database,
  FileSpreadsheet,
  GitCompare,
  LockKeyhole,
  RefreshCw,
  Rows3,
  SearchCheck,
  ShieldCheck,
  Wrench,
  X,
} from "lucide-react";
import { DataOpsIntakeForm } from "@/components/services/data-operations/data-ops-intake-form";
import { DataOpsPipelineVisual } from "@/components/services/data-operations/data-ops-pipeline-visual";
import { StructuredData } from "@/components/seo/structured-data";
import { Badge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/ui/reveal";
import { Section } from "@/components/ui/section";
import {
  dataOpsFaqs,
  dataOpsOffers,
  getDataOpsIntakeHref,
  type DataOpsOffer,
} from "@/lib/data-operations";
import { createPageMetadata, siteConfig } from "@/lib/site-config";

const pageDescription =
  "Rukh Labs automates recurring spreadsheet, reporting, reconciliation, and data-migration processes, with validation, exception handling, monitoring, and clear handoff evidence.";

export const metadata: Metadata = createPageMetadata({
  title: "Data Operations Automation, Reconciliation & Migration QA",
  description: pageDescription,
  path: "/data-ops",
  image: {
    url: "/opengraph-image",
    width: 1200,
    height: 630,
    alt: "Rukh Labs data operations automation",
  },
  keywords: [
    "data operations automation",
    "Power BI automation",
    "spreadsheet automation",
    "data reconciliation",
    "migration validation",
    "Power Query consulting",
    "reporting automation",
  ],
});

const problems = [
  {
    title: "Recurring file assembly",
    description: "People download, rename, combine, clean, and reshape the same exports every reporting cycle.",
    icon: FileSpreadsheet,
  },
  {
    title: "Silent refresh failures",
    description: "A source, column, credential, or gateway changes and the output quietly stops being trustworthy.",
    icon: RefreshCw,
  },
  {
    title: "Manual reconciliation",
    description: "Teams compare old and new systems, chase missing records, and explain mismatched totals by hand.",
    icon: GitCompare,
  },
  {
    title: "Migration uncertainty",
    description: "Mappings exist in scattered spreadsheets, transformation rules are unclear, and sign-off lacks evidence.",
    icon: Database,
  },
  {
    title: "Key-person dependency",
    description: "One analyst knows the sequence, the exceptions, and the fixes. When they are unavailable, the process stalls.",
    icon: LockKeyhole,
  },
  {
    title: "Outputs without controls",
    description: "A dashboard can look polished while duplicates, missing IDs, changed schemas, or bad totals go undetected.",
    icon: AlertTriangle,
  },
] as const;

const deliverables = [
  {
    title: "A controlled workflow",
    description: "Inputs, transformations, matching logic, outputs, and human approval points are explicit instead of living in one person’s memory.",
    icon: Rows3,
  },
  {
    title: "Validation that can be inspected",
    description: "Row counts, control totals, schema checks, duplicates, nulls, and reconciliation results are recorded rather than assumed.",
    icon: SearchCheck,
  },
  {
    title: "An exception-first operating model",
    description: "The routine work runs automatically. People review the records that actually require judgment or correction.",
    icon: ClipboardCheck,
  },
  {
    title: "A runbook and ownership boundary",
    description: "The handoff states how the process runs, what is monitored, what triggers escalation, and what remains a client decision.",
    icon: ShieldCheck,
  },
] as const;

const processSteps = [
  {
    number: "01",
    title: "Define the operating result",
    description: "Start with the recurring output, deadline, source owners, manual effort, and cost of failure—not a preferred tool.",
  },
  {
    number: "02",
    title: "Profile the real inputs",
    description: "Identify schema variation, missing keys, duplicates, source drift, edge cases, and any security constraints before building.",
  },
  {
    number: "03",
    title: "Automate the mechanics",
    description: "Build ingestion, transformation, matching, reconciliation, exception routing, and output generation around a fixed scope.",
  },
  {
    number: "04",
    title: "Prove the output",
    description: "Test known cases, compare totals, document exceptions, and establish acceptance evidence before the workflow is treated as complete.",
  },
  {
    number: "05",
    title: "Monitor what can break",
    description: "Track missing files, schema changes, failed runs, duplicate spikes, reconciliation gaps, and required human approvals.",
  },
] as const;

const goodFit = [
  "A weekly, monthly, or event-driven process with a named owner",
  "Two or more files, systems, entities, locations, or teams",
  "Four or more hours of recurring manual effort",
  "A measurable output, deadline, and acceptance condition",
  "A real cost when data is late, incomplete, or wrong",
] as const;

const poorFit = [
  "A vague request to add AI without a defined operating problem",
  "Unbounded staff augmentation or on-call access to everything",
  "Unauthorized scraping, access, purchasing, or platform abuse",
  "A production system requiring regulated controls that have not been agreed",
  "Free custom discovery disguised as a request for a quick estimate",
] as const;

function OfferCard({ offer }: { offer: DataOpsOffer }) {
  return (
    <article
      className={`relative flex h-full flex-col overflow-hidden rounded-[1.35rem] border p-6 sm:p-7 ${
        offer.recommended
          ? "border-[#16c8ff]/38 bg-[radial-gradient(circle_at_88%_6%,rgba(22,200,255,0.18),transparent_38%),linear-gradient(145deg,rgba(8,24,32,0.96),rgba(12,9,14,0.96))] shadow-[0_28px_90px_rgba(22,200,255,0.08)] lg:col-span-2"
          : "border-white/11 bg-white/[0.025]"
      }`}
    >
      {offer.recommended ? (
        <Badge tone="blue" className="mb-5 self-start uppercase tracking-[0.12em]">
          Core engagement
        </Badge>
      ) : null}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-sm">
          <h3 className="text-2xl font-semibold text-white">{offer.name}</h3>
          <p className="mt-2 text-xs font-medium uppercase tracking-[0.11em] text-white/36">{offer.priceNote}</p>
        </div>
        <p className={`font-semibold tracking-[-0.045em] text-white ${offer.recommended ? "text-4xl sm:text-5xl" : "text-3xl"}`}>
          {offer.price}
        </p>
      </div>
      <p className="mt-6 text-base leading-7 text-white/62">{offer.summary}</p>
      <p className="mt-3 text-sm leading-6 text-[#9de9fb]">{offer.bestFor}</p>
      <ul className={`mt-7 grid gap-3 ${offer.recommended ? "sm:grid-cols-2" : ""}`}>
        {offer.features.map((feature) => (
          <li key={feature} className="flex items-start gap-3 text-sm leading-6 text-white/62">
            <Check aria-hidden className="mt-1 size-4 shrink-0 text-[#8ce8ff]" strokeWidth={2.2} />
            {feature}
          </li>
        ))}
      </ul>
      <Link
        href={getDataOpsIntakeHref(offer.id)}
        className={buttonStyles({
          variant: offer.recommended ? "glass" : "secondary",
          className: "mt-8 w-full sm:w-auto sm:self-start",
        })}
      >
        Discuss {offer.name}
        <ArrowRight aria-hidden className="size-4" />
      </Link>
    </article>
  );
}

type DataOpsPageProps = {
  searchParams: Promise<{ offer?: string }>;
};

export default async function DataOpsPage({ searchParams }: DataOpsPageProps) {
  const query = await searchParams;
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Service",
        "@id": `${siteConfig.url}/data-ops/#service`,
        name: "Data operations automation and migration validation",
        serviceType: "Data operations automation, reporting automation, reconciliation, and migration quality assurance",
        description: pageDescription,
        url: `${siteConfig.url}/data-ops`,
        provider: {
          "@type": "Organization",
          "@id": `${siteConfig.url}/#organization`,
          name: siteConfig.name,
          url: siteConfig.url,
          email: siteConfig.contactEmail,
        },
        audience: {
          "@type": "BusinessAudience",
          audienceType: "Small and midsize organizations, consulting firms, and operations teams",
        },
        areaServed: "United States",
        serviceOutput: "A controlled data workflow, validation evidence, exception handling, and documented operating handoff",
        offers: dataOpsOffers.map((offer) => ({
          "@type": "Offer",
          name: offer.name,
          description: `${offer.summary} ${offer.priceNote}`,
          url: `${siteConfig.url}${getDataOpsIntakeHref(offer.id)}`,
          priceSpecification: {
            "@type": "UnitPriceSpecification",
            priceCurrency: "USD",
            minPrice: offer.minimumPrice,
            maxPrice: offer.maximumPrice,
            unitText: offer.billingUnit === "month" ? "MONTH" : "PROJECT",
          },
        })),
      },
      {
        "@type": "FAQPage",
        mainEntity: dataOpsFaqs.map((faq) => ({
          "@type": "Question",
          name: faq.question,
          acceptedAnswer: {
            "@type": "Answer",
            text: faq.answer,
          },
        })),
      },
    ],
  };

  return (
    <>
      <StructuredData data={structuredData} />

      <section className="relative overflow-hidden border-b border-white/10">
        <div className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,#16c8ff_38%,#f0001c_72%,transparent)]" />
        <div className="absolute left-[-12rem] top-[-10rem] size-[34rem] rounded-full bg-[#16c8ff]/10 blur-3xl" />
        <div className="absolute right-[-14rem] top-[20%] size-[32rem] rounded-full bg-[color:var(--brand-red)]/9 blur-3xl" />
        <Container className="relative grid min-h-[calc(100vh-4.5rem)] items-center gap-12 py-16 sm:py-20 lg:grid-cols-[0.9fr_1.1fr] lg:py-24">
          <Reveal>
            <div className="max-w-3xl">
              <Badge tone="blue" className="uppercase tracking-[0.16em]">
                Rukh Labs Data Operations
              </Badge>
              <h1 className="mt-7 text-5xl font-semibold leading-[1.01] tracking-[-0.045em] text-white sm:text-7xl">
                Stop rebuilding the same report{" "}
                <span className="bg-[linear-gradient(105deg,#ffffff_5%,#8ce8ff_48%,#ff7280_90%)] bg-clip-text text-transparent">
                  every week.
                </span>
              </h1>
              <p className="mt-7 max-w-2xl text-lg leading-8 text-white/68 sm:text-xl">
                Rukh Labs takes recurring spreadsheet, reporting, reconciliation,
                and migration processes off your team&apos;s plate—then adds the
                validation, exception handling, and monitoring needed to keep them trustworthy.
              </p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Link href="#intake" className={buttonStyles({ variant: "glass", size: "lg" })}>
                  Submit a workflow brief
                  <ArrowRight aria-hidden className="size-4" />
                </Link>
                <Link href="#demo" className={buttonStyles({ variant: "secondary", size: "lg" })}>
                  See the operating model
                </Link>
              </div>
              <div className="mt-9 flex flex-wrap gap-2">
                {["Excel", "Power Query", "Power BI", "SQL", "Python", "Migration QA"].map((item) => (
                  <span key={item} className="rounded-full border border-white/10 bg-white/[0.025] px-3 py-1.5 text-xs font-medium text-white/46">
                    {item}
                  </span>
                ))}
              </div>
              <p className="mt-7 max-w-2xl border-l border-[#16c8ff]/44 pl-4 text-sm leading-6 text-white/46">
                The offer is not “more dashboards” or “AI agents.” It is accountable ownership of one defined operating process and evidence that the output is right.
              </p>
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <DataOpsPipelineVisual />
          </Reveal>
        </Container>
      </section>

      <Section>
        <Container>
          <Reveal>
            <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr] lg:items-end">
              <div>
                <Badge tone="red">Operational pain</Badge>
                <h2 className="mt-5 text-3xl font-semibold text-white sm:text-5xl">
                  The dashboard is usually not the real problem.
                </h2>
              </div>
              <p className="max-w-2xl text-lg leading-8 text-white/60 lg:justify-self-end">
                The expensive part is the brittle chain before the output: missing files,
                changing columns, duplicate records, unclear mappings, manual fixes, and
                no reliable way to prove the result.
              </p>
            </div>
          </Reveal>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {problems.map((problem, index) => {
              const Icon = problem.icon;
              return (
                <Reveal key={problem.title} delay={(index % 3) * 0.05}>
                  <Card interactive className="h-full p-5 sm:p-6">
                    <span className="grid size-11 place-items-center rounded-xl border border-[color:var(--brand-red)]/24 bg-[color:var(--brand-red)]/9 text-[#ff9ba5]">
                      <Icon aria-hidden className="size-5" />
                    </span>
                    <h3 className="mt-5 text-xl font-semibold text-white">{problem.title}</h3>
                    <p className="mt-3 text-sm leading-6 text-white/55">{problem.description}</p>
                  </Card>
                </Reveal>
              );
            })}
          </div>
        </Container>
      </Section>

      <Section id="demo" className="scroll-mt-24 border-y border-white/10 bg-white/[0.018]">
        <Container className="grid gap-10 xl:grid-cols-[0.74fr_1.26fr] xl:items-center">
          <Reveal>
            <div>
              <Badge tone="blue">Synthetic demonstration</Badge>
              <h2 className="mt-5 text-3xl font-semibold text-white sm:text-5xl">
                Automate the mechanics. Keep people on the exceptions.
              </h2>
              <p className="mt-6 text-lg leading-8 text-white/62">
                This fictional workflow begins with inconsistent location files and a
                master reference list. It standardizes schemas, matches records, validates
                totals, and produces both a management output and a human-review queue.
              </p>
              <div className="mt-7 rounded-xl border border-[#16c8ff]/16 bg-[#16c8ff]/[0.035] p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8ce8ff]">The operating contract</p>
                <p className="mt-3 text-sm leading-7 text-white/60">
                  Every expected file arrives. Every transformation is repeatable. Every
                  control is recorded. Every unresolved record is visible. The final output
                  is released only when the agreed acceptance rules pass.
                </p>
              </div>
              <p className="mt-5 text-xs leading-5 text-white/34">
                All data shown in the demonstration is synthetic. It does not represent an employer, client, customer, or production environment.
              </p>
            </div>
          </Reveal>
          <Reveal delay={0.08}>
            <DataOpsPipelineVisual />
          </Reveal>
        </Container>
      </Section>

      <Section>
        <Container>
          <Reveal>
            <div className="max-w-4xl">
              <Badge tone="ivory">What delivery includes</Badge>
              <h2 className="mt-5 text-3xl font-semibold text-white sm:text-5xl">
                A process that can be run, checked, and handed over.
              </h2>
              <p className="mt-6 max-w-3xl text-lg leading-8 text-white/60">
                Code is only one layer. The useful deliverable is a controlled operating
                system around the work, with explicit boundaries and evidence.
              </p>
            </div>
          </Reveal>
          <div className="mt-12 grid gap-5 md:grid-cols-2">
            {deliverables.map((deliverable, index) => {
              const Icon = deliverable.icon;
              return (
                <Reveal key={deliverable.title} delay={(index % 2) * 0.06}>
                  <Card className="h-full p-6 sm:p-7">
                    <div className="flex items-start gap-4">
                      <span className="grid size-11 shrink-0 place-items-center rounded-xl border border-[#16c8ff]/22 bg-[#16c8ff]/8 text-[#8ce8ff]">
                        <Icon aria-hidden className="size-5" />
                      </span>
                      <div>
                        <h3 className="text-xl font-semibold text-white">{deliverable.title}</h3>
                        <p className="mt-3 text-sm leading-7 text-white/56">{deliverable.description}</p>
                      </div>
                    </div>
                  </Card>
                </Reveal>
              );
            })}
          </div>
        </Container>
      </Section>

      <Section className="border-y border-[#16c8ff]/14 bg-[#16c8ff]/[0.018]">
        <Container className="grid gap-5 lg:grid-cols-2">
          <Reveal>
            <Card className="h-full border-[#16c8ff]/18 p-6 sm:p-7">
              <Badge tone="blue">Direct operations work</Badge>
              <h2 className="mt-5 text-2xl font-semibold text-white sm:text-3xl">One painful process, fully owned.</h2>
              <p className="mt-4 text-sm leading-7 text-white/57">
                Rukh Labs can work directly with an operations, finance, reporting, or data team to remove one recurring workflow and leave behind a controlled process instead of another fragile file.
              </p>
              <ul className="mt-6 grid gap-3 text-sm leading-6 text-white/58">
                {["Clear client owner and acceptance rules", "Fixed implementation scope", "Optional managed monitoring after launch"].map((item) => (
                  <li key={item} className="flex items-start gap-3"><Check aria-hidden className="mt-1 size-4 shrink-0 text-[#8ce8ff]" />{item}</li>
                ))}
              </ul>
            </Card>
          </Reveal>
          <Reveal delay={0.06}>
            <Card className="h-full border-[#e6bd73]/18 p-6 sm:p-7">
              <Badge tone="gold">White-label partner delivery</Badge>
              <h2 className="mt-5 text-2xl font-semibold text-white sm:text-3xl">Keep the client. Add the delivery capacity.</h2>
              <p className="mt-4 text-sm leading-7 text-white/57">
                Microsoft consultancies, MSPs, ERP or HRIS implementers, fractional CFO firms, and operations advisers can use Rukh Labs behind the scenes for Power BI, Power Query, reconciliation, mapping, and migration QA.
              </p>
              <ul className="mt-6 grid gap-3 text-sm leading-6 text-white/58">
                {["NDA and no-poaching boundary", "Fixed wholesale work packages", "Your firm owns the relationship and markup"].map((item) => (
                  <li key={item} className="flex items-start gap-3"><Check aria-hidden className="mt-1 size-4 shrink-0 text-[#f3d58f]" />{item}</li>
                ))}
              </ul>
            </Card>
          </Reveal>
        </Container>
      </Section>

      <Section id="offers" className="scroll-mt-24 border-y border-white/10 bg-white/[0.02]">
        <Container>
          <Reveal>
            <div className="grid gap-6 lg:grid-cols-[0.82fr_1.18fr] lg:items-end">
              <div>
                <Badge tone="gold">Clear commercial entry points</Badge>
                <h2 className="mt-5 text-3xl font-semibold text-white sm:text-5xl">
                  Buy a result, not an undefined block of hours.
                </h2>
              </div>
              <p className="max-w-2xl text-lg leading-8 text-white/60 lg:justify-self-end">
                These are starting scopes. Final price reflects confirmed sources,
                data sensitivity, edge cases, deployment requirements, and support boundaries.
              </p>
            </div>
          </Reveal>
          <div className="mt-12 grid gap-5 lg:grid-cols-2">
            {dataOpsOffers.map((offer) => (
              <Reveal key={offer.id}>
                <OfferCard offer={offer} />
              </Reveal>
            ))}
          </div>
          <p className="mt-6 text-xs leading-5 text-white/34">
            Third-party platform, cloud, licensing, connector, and hosting costs are separate when required. Fixed scopes assume timely access to agreed sample data and decision-makers.
          </p>
        </Container>
      </Section>

      <Section>
        <Container>
          <Reveal>
            <div className="max-w-4xl">
              <Badge tone="blue">Delivery sequence</Badge>
              <h2 className="mt-5 text-3xl font-semibold text-white sm:text-5xl">
                Build controls before pretending the workflow is automated.
              </h2>
            </div>
          </Reveal>
          <ol className="mt-12 grid gap-px overflow-hidden rounded-[1.4rem] border border-white/10 bg-white/10 lg:grid-cols-5">
            {processSteps.map((step, index) => (
              <Reveal key={step.number} delay={index * 0.04}>
                <li className="h-full bg-[#09090c] p-5 sm:p-6">
                  <span className="font-mono text-xs font-semibold text-[#8ce8ff]">{step.number}</span>
                  <h3 className="mt-5 text-lg font-semibold text-white">{step.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-white/50">{step.description}</p>
                </li>
              </Reveal>
            ))}
          </ol>
        </Container>
      </Section>

      <Section className="border-y border-white/10 bg-white/[0.018]">
        <Container className="grid gap-6 lg:grid-cols-2">
          <Reveal>
            <Card className="h-full border-emerald-300/16 bg-emerald-300/[0.025] p-6 sm:p-7">
              <div className="flex items-center gap-3">
                <span className="grid size-11 place-items-center rounded-xl border border-emerald-300/20 bg-emerald-300/9 text-emerald-200">
                  <CheckCircle2 aria-hidden className="size-5" />
                </span>
                <div>
                  <Badge tone="slate">Strong fit</Badge>
                  <h2 className="mt-2 text-2xl font-semibold text-white">A real process with a measurable result.</h2>
                </div>
              </div>
              <ul className="mt-7 grid gap-3">
                {goodFit.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm leading-6 text-white/60">
                    <Check aria-hidden className="mt-1 size-4 shrink-0 text-emerald-200" />
                    {item}
                  </li>
                ))}
              </ul>
            </Card>
          </Reveal>
          <Reveal delay={0.06}>
            <Card className="h-full border-[color:var(--brand-red)]/18 bg-[color:var(--brand-red)]/[0.025] p-6 sm:p-7">
              <div className="flex items-center gap-3">
                <span className="grid size-11 place-items-center rounded-xl border border-[color:var(--brand-red)]/22 bg-[color:var(--brand-red)]/8 text-[#ff9ba5]">
                  <X aria-hidden className="size-5" />
                </span>
                <div>
                  <Badge tone="slate">Poor fit</Badge>
                  <h2 className="mt-2 text-2xl font-semibold text-white">A technology request without operating boundaries.</h2>
                </div>
              </div>
              <ul className="mt-7 grid gap-3">
                {poorFit.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm leading-6 text-white/60">
                    <X aria-hidden className="mt-1 size-4 shrink-0 text-[#ff9ba5]" />
                    {item}
                  </li>
                ))}
              </ul>
            </Card>
          </Reveal>
        </Container>
      </Section>

      <Section id="intake" className="scroll-mt-24">
        <Container className="grid gap-10 xl:grid-cols-[0.7fr_1.3fr] xl:items-start">
          <Reveal>
            <div className="xl:sticky xl:top-24">
              <Badge tone="red">Start with the workflow</Badge>
              <h2 className="mt-5 text-3xl font-semibold text-white sm:text-5xl">
                Explain the recurring pain once.
              </h2>
              <p className="mt-6 text-lg leading-8 text-white/60">
                The form is designed to qualify the process without requiring a sales call,
                production access, or a pile of attachments. Specificity gets a better answer.
              </p>
              <div className="mt-7 grid gap-3">
                {[
                  { icon: Clock3, text: "How often the work runs and how long it takes" },
                  { icon: Database, text: "What files, systems, or teams provide the inputs" },
                  { icon: BarChart3, text: "What output must be delivered and how it is checked" },
                  { icon: Wrench, text: "What breaks, changes, or requires manual correction" },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.text} className="flex items-center gap-3 rounded-lg border border-white/9 bg-white/[0.02] p-3 text-sm text-white/54">
                      <Icon aria-hidden className="size-4 shrink-0 text-[#8ce8ff]" />
                      {item.text}
                    </div>
                  );
                })}
              </div>
              <div className="mt-7 rounded-xl border border-[#e6bd73]/16 bg-[#e6bd73]/[0.025] p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.13em] text-[#f3d58f]">Security boundary</p>
                <p className="mt-3 text-sm leading-6 text-white/52">
                  Do not submit credentials, personal records, confidential datasets, or production exports. The first step uses descriptions, redacted examples, or synthetic samples.
                </p>
              </div>
            </div>
          </Reveal>
          <Reveal delay={0.06}>
            <DataOpsIntakeForm initialOffer={query.offer} />
          </Reveal>
        </Container>
      </Section>

      <Section className="border-t border-white/10 bg-white/[0.015]">
        <Container>
          <Reveal>
            <div className="max-w-4xl">
              <Badge tone="ivory">Frequently asked questions</Badge>
              <h2 className="mt-5 text-3xl font-semibold text-white sm:text-5xl">
                What this service is—and what it is not.
              </h2>
            </div>
          </Reveal>
          <div className="mt-10 grid gap-3 lg:grid-cols-2">
            {dataOpsFaqs.map((faq, index) => (
              <Reveal key={faq.question} delay={(index % 2) * 0.04}>
                <details className="group h-full rounded-xl border border-white/10 bg-white/[0.025] p-5 open:border-[#16c8ff]/22 open:bg-[#16c8ff]/[0.025] sm:p-6">
                  <summary className="cursor-pointer list-none pr-8 text-base font-semibold text-white marker:content-none">
                    {faq.question}
                  </summary>
                  <p className="mt-4 text-sm leading-7 text-white/56">{faq.answer}</p>
                </details>
              </Reveal>
            ))}
          </div>
        </Container>
      </Section>

      <Section>
        <Container>
          <Reveal>
            <div className="relative overflow-hidden rounded-[1.6rem] border border-[#16c8ff]/20 bg-[radial-gradient(circle_at_85%_10%,rgba(22,200,255,0.15),transparent_34%),radial-gradient(circle_at_12%_90%,rgba(240,0,28,0.12),transparent_38%),linear-gradient(145deg,rgba(9,20,27,0.96),rgba(13,9,14,0.96))] p-7 sm:p-10">
              <div className="relative grid gap-7 lg:grid-cols-[1fr_auto] lg:items-end">
                <div className="max-w-3xl">
                  <Badge tone="blue">One process at a time</Badge>
                  <h2 className="mt-5 text-3xl font-semibold text-white sm:text-5xl">
                    Make the recurring work disappear before building another dashboard.
                  </h2>
                  <p className="mt-5 max-w-2xl text-lg leading-8 text-white/60">
                    Start with the process that costs the most time, creates the most risk,
                    or depends on the most fragile chain of manual fixes.
                  </p>
                </div>
                <Link href="#intake" className={buttonStyles({ variant: "glass", size: "lg", className: "justify-self-start lg:justify-self-end" })}>
                  Submit the workflow
                  <ArrowRight aria-hidden className="size-4" />
                </Link>
              </div>
            </div>
          </Reveal>
        </Container>
      </Section>
    </>
  );
}
