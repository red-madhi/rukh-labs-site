import { ArrowRight, ChevronDown, Menu } from "lucide-react";

const signalNav = [
  { label: "Services", href: "#signal-services" },
  { label: "Work", href: "#signal-work" },
  { label: "Approach", href: "#signal-approach" },
  { label: "Insights", href: "#signal-insights" },
] as const;

const signalServices = [
  {
    number: "01",
    name: "Market direction",
    question: "Which segments merit focus?",
    deliverables: "Attractiveness model, customer evidence, market thesis",
  },
  {
    number: "02",
    name: "Offer & positioning",
    question: "Why should the right buyer choose you?",
    deliverables: "Offer architecture, narrative, proof plan",
  },
  {
    number: "03",
    name: "Operating model",
    question: "How should decisions and work flow?",
    deliverables: "Roles, handoffs, governance, decision rights",
  },
  {
    number: "04",
    name: "Growth planning",
    question: "What happens next—and who owns it?",
    deliverables: "Priorities, owners, milestones, 90-day plan",
  },
] as const;

const signalWork = [
  {
    sector: "Analytics platform",
    title: "Choosing a market the product could actually win",
    situation:
      "Pipeline was spread across six segments, with uneven conversion and no shared view of where to invest.",
    work: "Segment model, twelve buyer interviews, competitive evidence, and offer redesign.",
    decision:
      "Focus go-to-market on utilities and public infrastructure, with one offer built for regulated buying teams.",
  },
  {
    sector: "Professional services",
    title: "Building an operating model before growth broke delivery",
    situation:
      "New sales outpaced delivery capacity, while ownership shifted at every client handoff.",
    work: "Capacity model, role clarity, service economics, and handoff design.",
    decision:
      "Move to a pod structure with named decision rights and a quarterly pricing review.",
  },
  {
    sector: "Specialty manufacturer",
    title: "Testing a recurring service before funding the launch",
    situation:
      "Leadership saw demand for remote monitoring but lacked evidence on willingness to pay and service cost.",
    work: "Customer interviews, pilot design, unit economics, and launch sequence.",
    decision:
      "Pilot with one equipment family and two service tiers before investing in a wider rollout.",
  },
] as const;

const signalInsights = [
  {
    title: "The cost of serving too many segments",
    category: "Market focus",
    excerpt:
      "Fragmented focus is not only a marketing problem. It multiplies roadmap exceptions, sales narratives, onboarding paths, and service costs until the business can no longer see which customers it serves well.",
  },
  {
    title: "What a useful operating model actually decides",
    category: "Organization",
    excerpt:
      "An operating model should make ownership visible. It needs to answer who decides, where work changes hands, what gets standardized, and what the organization will deliberately keep flexible.",
  },
  {
    title: "When growth is a positioning problem",
    category: "Offer design",
    excerpt:
      "More demand generation cannot fix an offer that asks buyers to interpret its value. Before adding channels, tighten the buyer, the problem, the evidence, and the reason to act now.",
  },
] as const;

const focus =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#2159d1]";

export function SignalSampleSite() {
  return (
    <article className="min-h-screen overflow-hidden bg-[#f4f6f8] text-[#10213d] [color-scheme:light]">
      <header className="sticky top-0 z-50 border-b border-[#10213d]/16 bg-[#f4f6f8]/96 backdrop-blur-xl">
        <div className="mx-auto flex h-18 max-w-[94rem] items-center justify-between px-5 sm:px-8 lg:px-12">
          <a
            href="#signal-top"
            className={`text-sm font-extrabold tracking-[-0.03em] text-[#10213d] ${focus}`}
          >
            CEDAR<span className="px-1 text-[#2159d1]">/</span>STRATEGY
          </a>

          <nav
            aria-label="Cedar Strategy sample navigation"
            className="hidden items-center gap-7 lg:flex"
          >
            {signalNav.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className={`text-sm font-semibold text-[#10213d]/62 transition hover:text-[#2159d1] ${focus}`}
              >
                {item.label}
              </a>
            ))}
            <a
              href="#signal-contact"
              className={`inline-flex min-h-11 items-center bg-[#173f99] px-5 text-sm font-semibold text-white transition hover:bg-[#2159d1] ${focus}`}
            >
              Plan a working session
            </a>
          </nav>

          <details className="group relative lg:hidden">
            <summary
              className={`flex min-h-11 cursor-pointer list-none items-center gap-2 border border-[#10213d]/20 px-3 text-xs font-bold uppercase tracking-[0.1em] [&::-webkit-details-marker]:hidden ${focus}`}
            >
              <Menu aria-hidden className="size-4" />
              Menu
            </summary>
            <nav
              aria-label="Cedar Strategy mobile sample navigation"
              className="absolute right-0 top-[calc(100%+0.65rem)] grid w-64 border border-[#10213d]/16 bg-white p-2 shadow-[0_24px_70px_rgba(16,33,61,0.2)]"
            >
              {signalNav.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className={`flex min-h-11 items-center border-b border-[#10213d]/10 px-3 text-sm font-semibold text-[#10213d]/70 last:border-b-0 hover:bg-[#dfe7f8] hover:text-[#173f99] ${focus}`}
                >
                  {item.label}
                </a>
              ))}
              <a
                href="#signal-contact"
                className={`mt-2 inline-flex min-h-11 items-center justify-center bg-[#173f99] px-4 text-sm font-semibold text-white ${focus}`}
              >
                Plan a working session
              </a>
            </nav>
          </details>
        </div>
      </header>

      <section
        id="signal-top"
        aria-labelledby="signal-heading"
        className="scroll-mt-24 border-b border-[#10213d]/16"
      >
        <div className="mx-auto grid min-h-[calc(100vh-4.5rem)] max-w-[94rem] items-center gap-14 px-5 py-20 sm:px-8 lg:grid-cols-[1.1fr_0.9fr] lg:px-12 lg:py-28">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.17em] text-[#2159d1]">
              Independent strategy practice
            </p>
            <h1
              id="signal-heading"
              className="mt-7 max-w-[12ch] text-[clamp(3.5rem,7.4vw,7.4rem)] font-semibold leading-[0.91] tracking-[-0.065em]"
            >
              Make the next decision with a clearer view.
            </h1>
            <p className="mt-8 max-w-2xl text-lg leading-8 text-[#10213d]/64">
              Cedar helps B2B leadership teams choose where to play, align how
              the business runs, and turn strategy into an executable 90-day
              plan.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <a
                href="#signal-work"
                className={`inline-flex min-h-12 items-center justify-center gap-3 bg-[#173f99] px-6 text-sm font-semibold text-white transition hover:bg-[#2159d1] ${focus}`}
              >
                See selected work
                <ArrowRight aria-hidden className="size-4" />
              </a>
              <a
                href="#signal-approach"
                className={`inline-flex min-h-12 items-center justify-center border border-[#10213d]/22 px-6 text-sm font-semibold transition hover:border-[#2159d1] hover:text-[#2159d1] ${focus}`}
              >
                How we work
              </a>
            </div>
          </div>

          <aside
            aria-label="Example Cedar Strategy decision brief"
            className="border border-[#10213d]/18 bg-white shadow-[0_30px_80px_rgba(16,33,61,0.12)]"
          >
            <div className="flex items-center justify-between border-b border-[#10213d]/14 p-5 sm:p-6">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#2159d1]">
                  Decision brief / 014
                </p>
                <h2 className="mt-2 text-xl font-semibold">Market investment</h2>
              </div>
              <span className="size-3 bg-[#2159d1]" />
            </div>
            <dl className="divide-y divide-[#10213d]/12">
              {[
                [
                  "Situation",
                  "Growth is spread across six segments with uneven conversion.",
                ],
                [
                  "Question",
                  "Where should the next twelve months of investment go?",
                ],
                [
                  "Output",
                  "Prioritized market thesis, proof plan, and operating actions.",
                ],
              ].map(([term, description], index) => (
                <div
                  key={term}
                  className="grid gap-3 p-5 sm:grid-cols-[5rem_1fr] sm:p-6"
                >
                  <dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#10213d]/42">
                    0{index + 1} / {term}
                  </dt>
                  <dd className="text-sm leading-6 text-[#10213d]/68">
                    {description}
                  </dd>
                </div>
              ))}
            </dl>
            <div className="bg-[#dfe7f8] p-5 text-sm font-semibold text-[#173f99] sm:p-6">
              A useful engagement begins with the decision—not a deck.
            </div>
          </aside>
        </div>
      </section>

      <ul className="mx-auto grid max-w-[94rem] border-b border-[#10213d]/16 px-5 sm:grid-cols-2 sm:px-8 lg:grid-cols-4 lg:px-12">
        {[
          "B2B software",
          "Professional services",
          "Data businesses",
          "Growth-stage teams",
        ].map((audience) => (
          <li
            key={audience}
            className="flex min-h-18 items-center border-b border-[#10213d]/10 text-xs font-bold uppercase tracking-[0.12em] text-[#10213d]/48 last:border-b-0 sm:border-b-0 sm:border-r sm:px-5 sm:first:pl-0 sm:last:border-r-0"
          >
            {audience}
          </li>
        ))}
      </ul>

      <section
        id="signal-services"
        aria-labelledby="signal-services-heading"
        className="scroll-mt-24 border-b border-[#10213d]/16 bg-white"
      >
        <div className="mx-auto max-w-[94rem] px-5 py-24 sm:px-8 lg:px-12 lg:py-32">
          <div className="grid gap-8 lg:grid-cols-[0.72fr_1.28fr]">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.17em] text-[#2159d1]">
                Services
              </p>
              <h2
                id="signal-services-heading"
                className="mt-5 text-4xl font-semibold leading-[0.98] tracking-[-0.05em] sm:text-6xl"
              >
                Four kinds of decision.
              </h2>
            </div>
            <p className="max-w-2xl text-lg leading-8 text-[#10213d]/58 lg:pt-7">
              Each engagement is built around a specific choice leadership needs
              to make—not a predetermined stack of workshops.
            </p>
          </div>

          <div className="mt-14 border-t-2 border-[#10213d]">
            <div className="hidden grid-cols-[4rem_0.85fr_1fr_1.2fr] gap-6 border-b border-[#10213d]/16 py-4 text-[10px] font-bold uppercase tracking-[0.14em] text-[#10213d]/40 md:grid">
              <span>No.</span>
              <span>Capability</span>
              <span>Question answered</span>
              <span>Typical deliverables</span>
            </div>
            {signalServices.map((service) => (
              <article
                key={service.number}
                className="grid gap-5 border-b border-[#10213d]/16 py-7 md:grid-cols-[4rem_0.85fr_1fr_1.2fr] md:gap-6"
              >
                <span className="text-xs font-bold text-[#2159d1]">
                  {service.number}
                </span>
                <h3 className="text-xl font-semibold tracking-[-0.025em]">
                  {service.name}
                </h3>
                <p className="text-sm leading-6 text-[#10213d]/64">
                  {service.question}
                </p>
                <p className="text-sm leading-6 text-[#10213d]/48">
                  {service.deliverables}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section
        id="signal-work"
        aria-labelledby="signal-work-heading"
        className="scroll-mt-24 border-b border-[#10213d]/16"
      >
        <div className="mx-auto max-w-[94rem] px-5 py-24 sm:px-8 lg:px-12 lg:py-32">
          <div className="max-w-4xl">
            <p className="text-xs font-bold uppercase tracking-[0.17em] text-[#2159d1]">
              Selected work / Fictional examples
            </p>
            <h2
              id="signal-work-heading"
              className="mt-5 text-4xl font-semibold leading-[0.96] tracking-[-0.05em] sm:text-6xl"
            >
              Evidence that changed the decision.
            </h2>
          </div>

          <div className="mt-14 grid gap-5 lg:grid-cols-3">
            {signalWork.map((project, index) => (
              <article
                key={project.title}
                className="flex flex-col border border-[#10213d]/16 bg-white"
              >
                <div className="border-b border-[#10213d]/12 p-5">
                  <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#2159d1]">
                    0{index + 1} / {project.sector}
                  </span>
                  <h3 className="mt-5 text-2xl font-semibold leading-tight tracking-[-0.035em]">
                    {project.title}
                  </h3>
                </div>
                <dl className="flex flex-1 flex-col divide-y divide-[#10213d]/10">
                  {[
                    ["Situation", project.situation],
                    ["Work", project.work],
                    ["Decision", project.decision],
                  ].map(([term, description]) => (
                    <div key={term} className="p-5">
                      <dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#10213d]/40">
                        {term}
                      </dt>
                      <dd className="mt-3 text-sm leading-6 text-[#10213d]/62">
                        {description}
                      </dd>
                    </div>
                  ))}
                </dl>
              </article>
            ))}
          </div>
        </div>
      </section>

      <blockquote className="border-b border-[#10213d]/16 bg-[#173f99] text-white">
        <div className="mx-auto max-w-[94rem] px-5 py-20 sm:px-8 lg:px-12 lg:py-24">
          <p className="max-w-[18ch] text-3xl font-semibold leading-tight tracking-[-0.045em] sm:text-5xl">
            “A strategy is useful only when it changes what gets funded, stopped,
            or sequenced.”
          </p>
          <footer className="mt-8 text-xs font-bold uppercase tracking-[0.16em] text-white/54">
            A Cedar principle
          </footer>
        </div>
      </blockquote>

      <section
        id="signal-approach"
        aria-labelledby="signal-approach-heading"
        className="scroll-mt-24 border-b border-[#10213d]/16 bg-white"
      >
        <div className="mx-auto max-w-[94rem] px-5 py-24 sm:px-8 lg:px-12 lg:py-32">
          <p className="text-xs font-bold uppercase tracking-[0.17em] text-[#2159d1]">
            Approach
          </p>
          <h2
            id="signal-approach-heading"
            className="mt-5 max-w-[14ch] text-4xl font-semibold leading-[0.98] tracking-[-0.05em] sm:text-6xl"
          >
            From an open question to owned action.
          </h2>
          <ol className="mt-14 grid gap-px bg-[#10213d]/16 md:grid-cols-4">
            {[
              [
                "Frame",
                "Define the decision, the constraints, and the people who must align.",
              ],
              [
                "Evidence",
                "Collect only the evidence capable of changing the decision.",
              ],
              [
                "Decide",
                "Make the tradeoffs explicit and choose a defensible direction.",
              ],
              [
                "Mobilize",
                "Translate the choice into owners, sequence, measures, and next actions.",
              ],
            ].map(([title, description], index) => (
              <li key={title} className="bg-white p-6 lg:p-7">
                <span className="text-xs font-bold text-[#2159d1]">
                  0{index + 1}
                </span>
                <h3 className="mt-12 text-2xl font-semibold">{title}</h3>
                <p className="mt-4 text-sm leading-7 text-[#10213d]/56">
                  {description}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section
        id="signal-insights"
        aria-labelledby="signal-insights-heading"
        className="scroll-mt-24 border-b border-[#10213d]/16"
      >
        <div className="mx-auto grid max-w-[94rem] gap-12 px-5 py-24 sm:px-8 lg:grid-cols-[0.72fr_1.28fr] lg:px-12 lg:py-32">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.17em] text-[#2159d1]">
              Working notes
            </p>
            <h2
              id="signal-insights-heading"
              className="mt-5 text-4xl font-semibold tracking-[-0.05em]"
            >
              Useful before the workshop.
            </h2>
          </div>
          <div className="border-t-2 border-[#10213d]">
            {signalInsights.map((insight) => (
              <details
                key={insight.title}
                className="group border-b border-[#10213d]/16"
              >
                <summary
                  className={`flex min-h-24 cursor-pointer list-none items-center justify-between gap-5 py-6 [&::-webkit-details-marker]:hidden ${focus}`}
                >
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#2159d1]">
                      {insight.category}
                    </span>
                    <h3 className="mt-2 text-xl font-semibold">{insight.title}</h3>
                  </div>
                  <ChevronDown
                    aria-hidden
                    className="size-5 shrink-0 text-[#10213d]/38 transition group-open:rotate-180 group-open:text-[#2159d1]"
                  />
                </summary>
                <p className="max-w-2xl pb-7 text-sm leading-7 text-[#10213d]/62">
                  {insight.excerpt}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section
        id="signal-contact"
        aria-labelledby="signal-contact-heading"
        className="scroll-mt-24 bg-[#dfe7f8]"
      >
        <div className="mx-auto grid max-w-[94rem] gap-12 px-5 py-24 sm:px-8 lg:grid-cols-[1fr_0.85fr] lg:px-12 lg:py-28">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.17em] text-[#2159d1]">
              Start a conversation
            </p>
            <h2
              id="signal-contact-heading"
              className="mt-5 max-w-[13ch] text-4xl font-semibold leading-[0.96] tracking-[-0.05em] sm:text-6xl"
            >
              Start with the decision, not a deck.
            </h2>
          </div>
          <details className="self-start border border-[#10213d]/18 bg-white">
            <summary
              className={`flex min-h-16 cursor-pointer list-none items-center justify-between gap-5 p-5 font-semibold [&::-webkit-details-marker]:hidden ${focus}`}
            >
              Open a project brief
              <ChevronDown
                aria-hidden
                className="size-4 transition group-open:rotate-180"
              />
            </summary>
            <ol className="border-t border-[#10213d]/12 p-5">
              {[
                "What decision are you facing?",
                "When must it be made?",
                "Who needs to align around it?",
              ].map((prompt, index) => (
                <li
                  key={prompt}
                  className="flex gap-4 border-b border-[#10213d]/10 py-4 text-sm last:border-b-0"
                >
                  <span className="font-bold text-[#2159d1]">0{index + 1}</span>
                  {prompt}
                </li>
              ))}
            </ol>
          </details>
        </div>
      </section>

      <footer className="border-t border-[#10213d]/16 bg-[#f4f6f8]">
        <div className="mx-auto flex max-w-[94rem] flex-col gap-5 px-5 py-9 text-xs text-[#10213d]/48 sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-12">
          <strong className="font-extrabold tracking-[-0.02em] text-[#10213d]">
            CEDAR<span className="text-[#2159d1]">/</span>STRATEGY
          </strong>
          <span>Cedar Strategy is a fictional website concept created by Rukh Labs.</span>
          <a
            href="#signal-top"
            className={`font-semibold text-[#173f99] ${focus}`}
          >
            Back to top ↑
          </a>
        </div>
      </footer>
    </article>
  );
}
