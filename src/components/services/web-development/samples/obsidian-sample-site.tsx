import { ArrowDownRight, ArrowRight, Check, ChevronDown, Menu } from "lucide-react";

const obsidianNav = [
  { label: "Platform", href: "#obsidian-platform" },
  { label: "Deployment", href: "#obsidian-deployment" },
  { label: "Architecture", href: "#obsidian-architecture" },
  { label: "Security", href: "#obsidian-security" },
] as const;

const capabilities = [
  {
    number: "01",
    title: "Edge runtime",
    description:
      "Run approved inspection and decision workflows on industrial PCs, field stations, and mobile kits.",
    detail: "Containers · local queue · hardware health",
  },
  {
    number: "02",
    title: "Fleet control",
    description:
      "Stage, approve, version, and roll back deployments across sites without losing local operating continuity.",
    detail: "Cohorts · policy sets · controlled rollout",
  },
  {
    number: "03",
    title: "Audit trail",
    description:
      "Record the policy, software version, operator, and output behind every decision made at the edge.",
    detail: "Event records · export rules · retention",
  },
] as const;

const architecture = [
  {
    title: "Runtime",
    eyebrow: "At each site",
    body: "An encrypted local queue keeps approved workflows running through outages. Health checks and version state remain visible to operators.",
    items: ["Approved containers", "Encrypted local queue", "Hardware health"],
  },
  {
    title: "Control plane",
    eyebrow: "Across the fleet",
    body: "Teams stage releases by cohort, set operating policies, and restore a prior version without reaching into every individual machine.",
    items: ["Staged rollouts", "Cohort policies", "One-step rollback"],
  },
  {
    title: "Security",
    eyebrow: "At every boundary",
    body: "Signed artifacts, role-scoped access, and tamper-evident event records keep change deliberate and reviewable.",
    items: ["Signed artifacts", "Scoped roles", "Event integrity"],
  },
] as const;

const obsidianFaqs = [
  {
    question: "What happens when a site loses connectivity?",
    answer:
      "Approved workflows continue locally. Events queue on site and synchronize only when an allowed connection returns.",
  },
  {
    question: "Can teams deploy models they already use?",
    answer:
      "The sample platform is designed around containerized, approved workloads, with deployment policy defined before anything reaches a site.",
  },
  {
    question: "How are updates controlled?",
    answer:
      "Releases move through signed packages, named cohorts, approval gates, and a recorded rollback path.",
  },
  {
    question: "What data leaves a site?",
    answer:
      "Export policy determines what can synchronize. A deployment can retain raw source files locally and share only approved event records.",
  },
] as const;

const focus =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#c8ff41]";

export function ObsidianSampleSite() {
  return (
    <article className="min-h-screen overflow-hidden bg-[#06080c] text-[#f2f5ec] [color-scheme:dark]">
      <header className="sticky top-0 z-50 border-b border-white/12 bg-[#06080c]/94 backdrop-blur-xl">
        <div className="mx-auto flex h-18 max-w-[96rem] items-center justify-between px-5 sm:px-8 lg:px-12">
          <a
            href="#obsidian-top"
            className={`font-mono text-sm font-bold tracking-[0.2em] text-white ${focus}`}
          >
            NORTHSTAR<span className="text-[#c8ff41]">/</span>
          </a>

          <nav
            aria-label="Northstar Systems sample navigation"
            className="hidden items-center gap-7 lg:flex"
          >
            {obsidianNav.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className={`font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-white/52 transition hover:text-[#c8ff41] ${focus}`}
              >
                {item.label}
              </a>
            ))}
            <a
              href="#obsidian-architecture"
              className={`inline-flex min-h-11 items-center border border-[#c8ff41]/55 px-4 font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-[#dfff8c] transition hover:bg-[#c8ff41] hover:text-[#071008] ${focus}`}
            >
              Review architecture
            </a>
          </nav>

          <details className="group relative lg:hidden">
            <summary
              className={`flex min-h-11 cursor-pointer list-none items-center gap-2 border border-white/16 px-3 font-mono text-xs uppercase tracking-[0.12em] text-white [&::-webkit-details-marker]:hidden ${focus}`}
            >
              <Menu aria-hidden className="size-4" />
              Menu
            </summary>
            <nav
              aria-label="Northstar Systems mobile sample navigation"
              className="absolute right-0 top-[calc(100%+0.65rem)] grid w-64 border border-white/14 bg-[#0b0e10] p-2 shadow-2xl"
            >
              {obsidianNav.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className={`flex min-h-11 items-center border-b border-white/8 px-3 font-mono text-xs uppercase tracking-[0.12em] text-white/64 last:border-b-0 hover:bg-white/[0.04] hover:text-[#c8ff41] ${focus}`}
                >
                  {item.label}
                </a>
              ))}
            </nav>
          </details>
        </div>
      </header>

      <section
        id="obsidian-top"
        aria-labelledby="obsidian-heading"
        className="relative scroll-mt-24 border-b border-white/12"
      >
        <div
          aria-hidden
          className="absolute right-[-18rem] top-[-12rem] size-[42rem] rounded-full bg-[radial-gradient(circle,rgba(200,255,65,0.14),rgba(6,8,12,0)_68%)]"
        />
        <div className="mx-auto grid min-h-[calc(100vh-4.5rem)] max-w-[96rem] items-center gap-14 px-5 py-20 sm:px-8 lg:grid-cols-[1.08fr_0.92fr] lg:px-12 lg:py-28">
          <div className="relative z-10">
            <p className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-[#c8ff41]">
              Edge operations platform / Release 2.4
            </p>
            <h1
              id="obsidian-heading"
              className="mt-7 max-w-[10ch] text-[clamp(3.6rem,8.7vw,8.8rem)] font-semibold uppercase leading-[0.82] tracking-[-0.075em]"
            >
              Critical software.
              <span className="block text-white/34">No cloud required.</span>
            </h1>
            <p className="mt-8 max-w-2xl text-base leading-8 text-white/58 sm:text-lg">
              Northstar runs inspection, diagnostics, and decision support on
              site—across factories, field stations, and mobile teams—even when
              connectivity disappears.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <a
                href="#obsidian-platform"
                className={`inline-flex min-h-12 items-center justify-center gap-3 bg-[#c8ff41] px-6 font-mono text-xs font-bold uppercase tracking-[0.12em] text-[#071008] transition hover:bg-[#dcff88] ${focus}`}
              >
                Explore the platform
                <ArrowDownRight aria-hidden className="size-4" />
              </a>
              <a
                href="#obsidian-deployment"
                className={`inline-flex min-h-12 items-center justify-center gap-3 border border-white/18 px-6 font-mono text-xs font-bold uppercase tracking-[0.12em] text-white/76 transition hover:border-white/40 hover:text-white ${focus}`}
              >
                See a field deployment
              </a>
            </div>
          </div>

          <figure className="relative mx-auto w-full max-w-xl border border-white/14 bg-[#090c0d] p-5 shadow-[0_35px_100px_rgba(0,0,0,0.48)] sm:p-7">
            <figcaption className="flex flex-wrap items-start justify-between gap-3 border-b border-white/12 pb-5 font-mono">
              <div>
                <span className="block text-[10px] uppercase tracking-[0.16em] text-white/38">
                  Deployment state
                </span>
                <strong className="mt-2 block text-sm tracking-[0.12em]">
                  WEST GRID / 42 NODES
                </strong>
              </div>
              <span className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.14em] text-[#c8ff41]">
                <span className="size-1.5 rounded-full bg-[#c8ff41] shadow-[0_0_12px_#c8ff41]" />
                Policy current
              </span>
            </figcaption>

            <div className="relative my-8 grid min-h-72 place-items-center overflow-hidden border border-white/10 bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:30px_30px]">
              <div aria-hidden className="absolute size-64 rounded-full border border-[#c8ff41]/12" />
              <div aria-hidden className="absolute size-44 rounded-full border border-white/10" />
              <div className="relative z-10 grid size-28 place-items-center border border-[#c8ff41]/45 bg-[#0d1110] text-center shadow-[0_0_48px_rgba(200,255,65,0.08)]">
                <div>
                  <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-white/36">
                    Local runtime
                  </span>
                  <strong className="mt-1 block font-mono text-lg text-[#c8ff41]">
                    READY
                  </strong>
                </div>
              </div>
              {[
                "left-5 top-7",
                "right-5 top-10",
                "bottom-8 left-8",
                "bottom-7 right-7",
              ].map((position, index) => (
                <span
                  key={position}
                  className={`absolute ${position} grid size-12 place-items-center border border-white/14 bg-[#0a0d0e] font-mono text-[9px] text-white/50`}
                >
                  N{String(index + 1).padStart(2, "0")}
                </span>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-px bg-white/10 font-mono text-[10px] sm:grid-cols-3">
              <div className="bg-[#090c0d] p-3">
                <span className="block uppercase tracking-[0.12em] text-white/34">
                  Online
                </span>
                <strong className="mt-1 block text-sm text-white">42 / 42</strong>
              </div>
              <div className="bg-[#090c0d] p-3">
                <span className="block uppercase tracking-[0.12em] text-white/34">
                  Queue
                </span>
                <strong className="mt-1 block text-sm text-white">0 pending</strong>
              </div>
              <div className="col-span-2 bg-[#090c0d] p-3 sm:col-span-1">
                <span className="block uppercase tracking-[0.12em] text-white/34">
                  Last sync
                </span>
                <strong className="mt-1 block text-sm text-white">08:42 UTC</strong>
              </div>
            </div>
          </figure>
        </div>
      </section>

      <ul className="mx-auto grid max-w-[96rem] border-b border-white/12 px-5 sm:grid-cols-2 sm:px-8 lg:grid-cols-4 lg:px-12">
        {[
          "On-site processing",
          "Signed deployments",
          "Policy-controlled sync",
          "Offline-first",
        ].map((item, index) => (
          <li
            key={item}
            className="flex min-h-20 items-center gap-3 border-b border-white/10 font-mono text-[11px] uppercase tracking-[0.13em] text-white/52 last:border-b-0 sm:border-b-0 sm:border-r sm:px-5 sm:first:pl-0 sm:last:border-r-0"
          >
            <span className="text-[#c8ff41]">0{index + 1}</span>
            {item}
          </li>
        ))}
      </ul>

      <section
        id="obsidian-platform"
        aria-labelledby="obsidian-platform-heading"
        className="scroll-mt-24 border-b border-white/12"
      >
        <div className="mx-auto max-w-[96rem] px-5 py-24 sm:px-8 lg:px-12 lg:py-32">
          <div className="grid gap-8 lg:grid-cols-[0.65fr_1.35fr]">
            <p className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-[#c8ff41]">
              01 / Platform
            </p>
            <div>
              <h2
                id="obsidian-platform-heading"
                className="max-w-[13ch] text-4xl font-semibold uppercase leading-[0.93] tracking-[-0.055em] sm:text-6xl lg:text-7xl"
              >
                Built for networks that disappear.
              </h2>
              <p className="mt-6 max-w-2xl text-base leading-8 text-white/52">
                Keep essential work close to the equipment, people, and operating
                conditions that depend on it.
              </p>
            </div>
          </div>

          <ol className="mt-16 border-t border-white/16">
            {capabilities.map((capability) => (
              <li
                key={capability.number}
                className="grid gap-5 border-b border-white/12 py-8 sm:grid-cols-[4rem_0.7fr_1.3fr] sm:items-start lg:py-10"
              >
                <span className="font-mono text-xs text-[#c8ff41]">
                  {capability.number}
                </span>
                <div>
                  <h3 className="text-2xl font-semibold uppercase tracking-[-0.035em]">
                    {capability.title}
                  </h3>
                  <p className="mt-3 font-mono text-[10px] uppercase leading-5 tracking-[0.12em] text-white/32">
                    {capability.detail}
                  </p>
                </div>
                <p className="max-w-2xl text-base leading-8 text-white/56">
                  {capability.description}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section
        id="obsidian-deployment"
        aria-labelledby="obsidian-deployment-heading"
        className="scroll-mt-24 border-b border-white/12 bg-[#090b0e]"
      >
        <div className="mx-auto max-w-[96rem] px-5 py-24 sm:px-8 lg:px-12 lg:py-32">
          <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <p className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-[#c8ff41]">
                Illustrative deployment / Gridline Energy
              </p>
              <h2
                id="obsidian-deployment-heading"
                className="mt-6 max-w-[13ch] text-4xl font-semibold uppercase leading-[0.93] tracking-[-0.055em] sm:text-6xl"
              >
                Inspection triage across 42 remote substations.
              </h2>
              <p className="mt-7 max-w-xl text-base leading-8 text-white/54">
                Field teams capture inspection material locally, prioritize
                anomalies before leaving the site, and synchronize a redacted
                event record when an approved connection returns.
              </p>
            </div>

            <div className="border border-white/14 bg-[#06080c] p-5 sm:p-8">
              <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-white/34">
                Operating sequence
              </p>
              <ol className="mt-7 grid gap-px bg-white/10 sm:grid-cols-3">
                {[
                  ["Capture", "Inspection media stays on site."],
                  ["Prioritize", "Local workflow flags review order."],
                  ["Synchronize", "Approved event records move upstream."],
                ].map(([title, description], index) => (
                  <li key={title} className="bg-[#090c0d] p-5">
                    <span className="font-mono text-xs text-[#c8ff41]">
                      0{index + 1}
                    </span>
                    <h3 className="mt-8 text-lg font-semibold uppercase">{title}</h3>
                    <p className="mt-3 text-sm leading-6 text-white/48">{description}</p>
                  </li>
                ))}
              </ol>
              <dl className="mt-8 grid grid-cols-2 gap-6 border-t border-white/12 pt-8 sm:grid-cols-3">
                <div>
                  <dt className="font-mono text-[10px] uppercase tracking-[0.12em] text-white/34">
                    Sites
                  </dt>
                  <dd className="mt-2 text-3xl font-semibold">42</dd>
                </div>
                <div>
                  <dt className="font-mono text-[10px] uppercase tracking-[0.12em] text-white/34">
                    Review cycle
                  </dt>
                  <dd className="mt-2 text-3xl font-semibold">18→7m</dd>
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <dt className="font-mono text-[10px] uppercase tracking-[0.12em] text-white/34">
                    Raw files exported
                  </dt>
                  <dd className="mt-2 text-3xl font-semibold">0</dd>
                </div>
              </dl>
              <p className="mt-5 font-mono text-[9px] uppercase tracking-[0.11em] text-white/28">
                Illustrative metrics for this fictional sample website.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section
        id="obsidian-architecture"
        aria-labelledby="obsidian-architecture-heading"
        className="scroll-mt-24 border-b border-white/12"
      >
        <div className="mx-auto max-w-[96rem] px-5 py-24 sm:px-8 lg:px-12 lg:py-32">
          <div className="max-w-4xl">
            <p className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-[#c8ff41]">
              02 / Architecture
            </p>
            <h2
              id="obsidian-architecture-heading"
              className="mt-6 text-4xl font-semibold uppercase leading-[0.93] tracking-[-0.055em] sm:text-6xl"
            >
              Control without dependence.
            </h2>
          </div>

          <div className="mt-14 grid gap-3 lg:grid-cols-3">
            {architecture.map((item, index) => (
              <details
                key={item.title}
                open={index === 0}
                className="group border border-white/14 bg-[#090c0d] open:border-[#c8ff41]/32"
              >
                <summary
                  className={`flex min-h-18 cursor-pointer list-none items-center justify-between gap-4 p-5 [&::-webkit-details-marker]:hidden ${focus}`}
                >
                  <div>
                    <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#c8ff41]">
                      {item.eyebrow}
                    </span>
                    <h3 className="mt-2 text-xl font-semibold uppercase">{item.title}</h3>
                  </div>
                  <ChevronDown
                    aria-hidden
                    className="size-4 text-white/34 transition group-open:rotate-180 group-open:text-[#c8ff41]"
                  />
                </summary>
                <div className="border-t border-white/10 p-5">
                  <p className="text-sm leading-7 text-white/54">{item.body}</p>
                  <ul className="mt-6 grid gap-3">
                    {item.items.map((feature) => (
                      <li
                        key={feature}
                        className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.12em] text-white/56"
                      >
                        <span className="h-px w-5 bg-[#c8ff41]" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section
        id="obsidian-security"
        aria-labelledby="obsidian-security-heading"
        className="scroll-mt-24 border-b border-white/12 bg-[#c8ff41] text-[#071008]"
      >
        <div className="mx-auto grid max-w-[96rem] gap-12 px-5 py-20 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:px-12 lg:py-24">
          <div>
            <p className="font-mono text-xs font-bold uppercase tracking-[0.18em]">
              03 / Security posture
            </p>
            <h2
              id="obsidian-security-heading"
              className="mt-6 max-w-[13ch] text-4xl font-semibold uppercase leading-[0.9] tracking-[-0.055em] sm:text-6xl"
            >
              Every change has a path back.
            </h2>
          </div>
          <div>
            <p className="max-w-xl text-base leading-8 text-[#071008]/68">
              Northstar treats software distribution as an operating decision:
              signed, scoped, recorded, and reversible.
            </p>
            <ul className="mt-8 grid gap-3 sm:grid-cols-2">
              {[
                "Signed artifacts",
                "Least-privilege roles",
                "Offline audit records",
                "Policy-controlled export",
              ].map((item) => (
                <li
                  key={item}
                  className="flex min-h-12 items-center gap-3 border border-[#071008]/18 px-4 text-sm font-semibold"
                >
                  <Check aria-hidden className="size-4" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section
        aria-labelledby="obsidian-faq-heading"
        className="border-b border-white/12"
      >
        <div className="mx-auto grid max-w-[96rem] gap-12 px-5 py-24 sm:px-8 lg:grid-cols-[0.7fr_1.3fr] lg:px-12">
          <div>
            <p className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-[#c8ff41]">
              System questions
            </p>
            <h2
              id="obsidian-faq-heading"
              className="mt-5 text-4xl font-semibold uppercase tracking-[-0.05em]"
            >
              Before deployment.
            </h2>
          </div>
          <div className="border-t border-white/14">
            {obsidianFaqs.map((faq) => (
              <details key={faq.question} className="group border-b border-white/14">
                <summary
                  className={`flex min-h-18 cursor-pointer list-none items-center justify-between gap-5 py-5 text-base font-semibold [&::-webkit-details-marker]:hidden ${focus}`}
                >
                  {faq.question}
                  <ChevronDown
                    aria-hidden
                    className="size-4 shrink-0 text-white/34 transition group-open:rotate-180 group-open:text-[#c8ff41]"
                  />
                </summary>
                <p className="max-w-2xl pb-6 text-sm leading-7 text-white/52">
                  {faq.answer}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#0a0d0e]">
        <div className="mx-auto flex max-w-[96rem] flex-col gap-9 px-5 py-24 sm:px-8 lg:flex-row lg:items-end lg:justify-between lg:px-12 lg:py-28">
          <div>
            <p className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-[#c8ff41]">
              Northstar / Edge operations
            </p>
            <h2 className="mt-6 max-w-[12ch] text-4xl font-semibold uppercase leading-[0.92] tracking-[-0.055em] sm:text-6xl">
              Bring decision support to the edge.
            </h2>
          </div>
          <a
            href="#obsidian-architecture"
            className={`inline-flex min-h-13 shrink-0 items-center justify-center gap-3 border border-[#c8ff41]/55 px-6 font-mono text-xs font-bold uppercase tracking-[0.12em] text-[#dfff8c] transition hover:bg-[#c8ff41] hover:text-[#071008] ${focus}`}
          >
            Review the architecture
            <ArrowRight aria-hidden className="size-4" />
          </a>
        </div>
      </section>

      <footer className="border-t border-white/12 bg-[#06080c]">
        <div className="mx-auto flex max-w-[96rem] flex-col gap-4 px-5 py-8 font-mono text-[10px] uppercase tracking-[0.12em] text-white/34 sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-12">
          <span>Northstar Systems / northstar.systems</span>
          <span>Fictional website concept created by Rukh Labs.</span>
          <a href="#obsidian-top" className={`text-[#c8ff41] ${focus}`}>
            Back to top ↑
          </a>
        </div>
      </footer>
    </article>
  );
}
