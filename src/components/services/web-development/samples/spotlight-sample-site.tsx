import {
  ArrowDownRight,
  ArrowRight,
  BriefcaseBusiness,
  Check,
  Mail,
  MapPin,
  Play,
} from "lucide-react";
import { SampleMobileMenu } from "./sample-mobile-menu";
import { SpotlightContentGrid } from "./spotlight-content-grid";

const spotlightMailto =
  "mailto:rukhlabs@gmail.com?subject=Spotlight%20Website%20Direction%20Inquiry";

const spotlightNav = [
  { label: "Stories", href: "#spotlight-stories" },
  { label: "Series", href: "#spotlight-series" },
  { label: "Partnerships", href: "#spotlight-partnerships" },
  { label: "About", href: "#spotlight-about" },
] as const;

const recurringSeries = [
  {
    number: "01",
    name: "48 Hours",
    description:
      "A complete first-weekend plan: one neighborhood at a time, with enough detail to actually use.",
    cadence: "Monthly city film",
    color: "bg-[#6657ff] text-white",
  },
  {
    number: "02",
    name: "One Bag",
    description:
      "Long-term field tests of the clothes, tools, and packing decisions that survive real travel.",
    cadence: "Practical gear guide",
    color: "bg-[#ffd552] text-[#17133c]",
  },
  {
    number: "03",
    name: "Worth the Detour",
    description:
      "Small museums, overlooked streets, late counters, and the places that give a trip its shape.",
    cadence: "Weekly short story",
    color: "bg-[#ff654f] text-[#17133c]",
  },
] as const;

const partnershipPrinciples = [
  "The product has to be useful enough to keep using after the campaign.",
  "Sponsored work is labeled clearly and built around an honest audience need.",
  "Every deliverable is designed for the platform instead of cropped into six formats.",
] as const;

const focus =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#6657ff]";

export function SpotlightSampleSite() {
  return (
    <article className="min-h-screen overflow-hidden bg-[#fff6ed] text-[#17133c] [color-scheme:light]">
      <header className="sticky top-0 z-50 border-b-2 border-[#17133c] bg-[#fff6ed]/94 backdrop-blur-xl">
        <div className="mx-auto flex h-18 max-w-[96rem] items-center justify-between gap-5 px-5 sm:px-8 lg:px-12">
          <a
            href="#spotlight-top"
            className={`text-lg font-black uppercase tracking-[-0.05em] ${focus}`}
          >
            MIKA<span className="text-[#ff4f3b]">/</span>ROWE
          </a>

          <nav
            aria-label="Mika Rowe sample navigation"
            className="hidden items-center gap-7 lg:flex"
          >
            {spotlightNav.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className={`text-xs font-black uppercase tracking-[0.11em] text-[#17133c]/68 transition hover:text-[#ff4f3b] ${focus}`}
              >
                {item.label}
              </a>
            ))}
            <a
              href="#spotlight-partnerships"
              className={`inline-flex min-h-11 items-center gap-2 rounded-full bg-[#17133c] px-5 text-xs font-black uppercase tracking-[0.1em] text-[#fff6ed] transition hover:bg-[#6657ff] ${focus}`}
            >
              Partner overview
              <ArrowRight aria-hidden className="size-4" />
            </a>
          </nav>

          <SampleMobileMenu
            ariaLabel="Mika Rowe mobile sample navigation"
            summaryLabel="Menu"
            items={spotlightNav}
            cta={{
              label: "Partner overview",
              href: "#spotlight-partnerships",
            }}
            summaryClassName={`flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-full border-2 border-[#17133c] px-3 text-xs font-black uppercase tracking-[0.1em] [&::-webkit-details-marker]:hidden ${focus}`}
            panelClassName="absolute right-0 top-[calc(100%+0.7rem)] grid w-64 rounded-2xl border-2 border-[#17133c] bg-[#fffaf4] p-2 shadow-[7px_8px_0_#17133c]"
            linkClassName={`flex min-h-11 items-center rounded-xl px-3 text-xs font-black uppercase tracking-[0.1em] text-[#17133c]/68 hover:bg-[#ffd552] hover:text-[#17133c] ${focus}`}
            ctaClassName={`mt-2 inline-flex min-h-11 items-center justify-center rounded-xl bg-[#17133c] px-4 text-xs font-black uppercase tracking-[0.1em] text-white ${focus}`}
          />
        </div>
      </header>

      <section
        id="spotlight-top"
        aria-labelledby="spotlight-heading"
        className="relative scroll-mt-24 border-b-2 border-[#17133c]"
      >
        <div
          aria-hidden
          className="absolute -right-28 top-16 size-80 rounded-full bg-[#ff654f] sm:size-[30rem]"
        />
        <div className="mx-auto grid min-h-[calc(100vh-4.5rem)] max-w-[96rem] items-center gap-14 px-5 py-16 sm:px-8 lg:grid-cols-[0.95fr_1.05fr] lg:px-12 lg:py-24">
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 rounded-full border-2 border-[#17133c] bg-[#c7ee4f] px-4 py-2 text-xs font-black uppercase tracking-[0.12em]">
              <MapPin aria-hidden className="size-4" />
              Denver based · filming everywhere
            </div>
            <h1
              id="spotlight-heading"
              className="mt-7 max-w-[9ch] text-[clamp(4.2rem,9vw,9.4rem)] font-black leading-[0.82] tracking-[-0.078em]"
            >
              Make the trip count.
            </h1>
            <p className="mt-8 max-w-2xl text-lg leading-8 text-[#17133c]/66 sm:text-xl">
              Mika Rowe makes travel films and practical field guides for
              curious people who want the useful details—not just the highlight
              reel.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <a
                href="#spotlight-stories"
                className={`inline-flex min-h-12 items-center justify-center gap-3 rounded-full bg-[#6657ff] px-6 text-sm font-black text-white transition hover:bg-[#5143e9] ${focus}`}
              >
                Explore latest stories
                <ArrowDownRight aria-hidden className="size-4" />
              </a>
              <a
                href="#spotlight-partnerships"
                className={`inline-flex min-h-12 items-center justify-center gap-3 rounded-full border-2 border-[#17133c] px-6 text-sm font-black transition hover:bg-[#ffd552] ${focus}`}
              >
                Work together
                <ArrowDownRight aria-hidden className="size-4" />
              </a>
            </div>
          </div>

          <figure className="relative z-10 mx-auto aspect-[1/1.04] w-full max-w-[42rem]">
            <div
              aria-hidden
              className="absolute left-[3%] top-[9%] h-[75%] w-[63%] -rotate-3 rounded-[2.2rem] border-[3px] border-[#17133c] bg-[#6657ff] shadow-[11px_13px_0_#17133c]"
            >
              <span className="absolute left-6 top-6 text-xs font-black uppercase tracking-[0.14em] text-[#c7ee4f]">
                New film / 12:08
              </span>
              <span className="absolute bottom-7 left-6 max-w-[8ch] text-4xl font-black leading-[0.88] tracking-[-0.06em] text-white sm:text-6xl">
                Kyoto after the last train
              </span>
              <span className="absolute right-6 top-6 grid size-12 place-items-center rounded-full bg-[#c7ee4f] text-[#17133c]">
                <Play aria-hidden className="ml-0.5 size-4 fill-current" />
              </span>
            </div>
            <div className="absolute right-[2%] top-[3%] w-[39%] rotate-5 rounded-2xl border-[3px] border-[#17133c] bg-[#ffd552] p-5 shadow-[7px_8px_0_#17133c]">
              <span className="text-[10px] font-black uppercase tracking-[0.13em]">
                Field note 08
              </span>
              <strong className="mt-8 block text-2xl font-black leading-[0.95] tracking-[-0.04em] sm:text-3xl">
                One bag. Seven days.
              </strong>
            </div>
            <div className="absolute bottom-[2%] right-[3%] w-[48%] -rotate-2 rounded-2xl border-[3px] border-[#17133c] bg-[#c7ee4f] p-5 shadow-[8px_9px_0_#17133c]">
              <span className="text-[10px] font-black uppercase tracking-[0.13em] text-[#6657ff]">
                Worth the detour
              </span>
              <strong className="mt-3 block text-xl font-black leading-tight tracking-[-0.04em] sm:text-2xl">
                The café at the end of Tram 28.
              </strong>
            </div>
            <figcaption className="sr-only">
              Featured Mika Rowe travel stories presented as bold editorial
              poster cards.
            </figcaption>
          </figure>
        </div>
      </section>

      <div className="border-b-2 border-[#17133c] bg-[#17133c] text-[#fff6ed]">
        <dl className="mx-auto grid max-w-[96rem] grid-cols-2 px-5 sm:px-8 lg:grid-cols-4 lg:px-12">
          {[
            ["1.2M", "Community across channels"],
            ["4.6M", "Average monthly views"],
            ["24–38", "Core audience"],
            ["42%", "US-based audience"],
          ].map(([value, label]) => (
            <div
              key={label}
              className="border-b border-white/16 px-3 py-7 even:border-l sm:px-5 lg:border-b-0 lg:border-l lg:first:border-l-0"
            >
              <dd className="text-3xl font-black tracking-[-0.055em] text-[#c7ee4f] sm:text-4xl">
                {value}
              </dd>
              <dt className="mt-2 text-[10px] font-bold uppercase leading-5 tracking-[0.12em] text-white/68">
                {label}
              </dt>
            </div>
          ))}
        </dl>
        <p className="mx-auto max-w-[96rem] px-5 pb-4 text-[9px] font-bold uppercase tracking-[0.12em] text-white/62 sm:px-8 lg:px-12">
          Illustrative audience data for this fictional sample website.
        </p>
      </div>

      <section
        id="spotlight-stories"
        aria-labelledby="spotlight-stories-heading"
        className="scroll-mt-24 border-b-2 border-[#17133c]"
      >
        <div className="mx-auto max-w-[96rem] px-5 py-24 sm:px-8 lg:px-12 lg:py-32">
          <div className="grid gap-8 lg:grid-cols-[0.78fr_1.22fr] lg:items-end">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.15em] text-[#ff4f3b]">
                Latest stories
              </p>
              <h2
                id="spotlight-stories-heading"
                className="mt-5 max-w-[9ch] text-5xl font-black leading-[0.9] tracking-[-0.06em] sm:text-7xl"
              >
                Worth watching. Useful later.
              </h2>
            </div>
            <p className="max-w-2xl text-lg leading-8 text-[#17133c]/62 lg:justify-self-end">
              Films set the mood. Guides keep the details. Shorts catch the
              places that do not need a ten-minute introduction.
            </p>
          </div>

          <SpotlightContentGrid />
        </div>
      </section>

      <section
        id="spotlight-series"
        aria-labelledby="spotlight-series-heading"
        className="scroll-mt-24 border-b-2 border-[#17133c] bg-[#f1dfcf]"
      >
        <div className="mx-auto max-w-[96rem] px-5 py-24 sm:px-8 lg:px-12 lg:py-32">
          <div className="max-w-4xl">
            <p className="text-xs font-black uppercase tracking-[0.15em] text-[#6657ff]">
              Recurring series
            </p>
            <h2
              id="spotlight-series-heading"
              className="mt-5 text-5xl font-black leading-[0.9] tracking-[-0.06em] sm:text-7xl"
            >
              Familiar formats. New places.
            </h2>
          </div>

          <ol className="mt-14 grid gap-5 lg:grid-cols-3">
            {recurringSeries.map((series) => (
              <li
                key={series.number}
                className={`flex min-h-[24rem] flex-col rounded-[2rem] border-[3px] border-[#17133c] p-6 shadow-[7px_8px_0_#17133c] sm:p-8 ${series.color}`}
              >
                <div className="flex items-center justify-between text-xs font-black uppercase tracking-[0.13em]">
                  <span>{series.number}</span>
                  <span>{series.cadence}</span>
                </div>
                <h3 className="mt-auto text-5xl font-black leading-[0.86] tracking-[-0.065em]">
                  {series.name}
                </h3>
                <p className="mt-5 text-sm leading-7 opacity-70">
                  {series.description}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section
        id="spotlight-partnerships"
        aria-labelledby="spotlight-partnerships-heading"
        className="scroll-mt-24 border-b-2 border-[#17133c] bg-[#17133c] text-[#fff6ed]"
      >
        <div className="mx-auto max-w-[96rem] px-5 py-24 sm:px-8 lg:px-12 lg:py-32">
          <div className="grid gap-10 lg:grid-cols-[0.78fr_1.22fr]">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-[#c7ee4f] px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-[#17133c]">
                <BriefcaseBusiness aria-hidden className="size-4" />
                Partnerships
              </div>
              <h2
                id="spotlight-partnerships-heading"
                className="mt-6 max-w-[10ch] text-5xl font-black leading-[0.9] tracking-[-0.06em] sm:text-7xl"
              >
                The audience comes first.
              </h2>
              <p className="mt-7 max-w-xl text-lg leading-8 text-white/68">
                Good partnerships feel like useful stories, not interruptions.
                Mika works with travel, mobility, design, and everyday-tech
                brands that can stand up to a real field test.
              </p>
            </div>

            <div className="grid gap-5">
              <article className="rounded-[2rem] border-2 border-white/18 bg-white/[0.06] p-6 sm:p-8">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <span className="text-xs font-black uppercase tracking-[0.15em] text-[#c7ee4f]">
                    Illustrative collaboration / Trailglass
                  </span>
                  <span className="rounded-full border border-white/18 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-white/68">
                    Film · Guide · Short-form
                  </span>
                </div>
                <h3 className="mt-8 max-w-[16ch] text-3xl font-black leading-[0.95] tracking-[-0.045em] sm:text-5xl">
                  Three rail cities. One carry-on that earned its place.
                </h3>
                <p className="mt-6 max-w-2xl text-base leading-8 text-white/68">
                  A four-part series built around actual packing choices,
                  station transfers, and two weeks of use—not a product held up
                  for six seconds.
                </p>
                <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {[
                    ["1.8M", "Series views"],
                    ["31K", "Guide saves"],
                    ["73%", "Completion rate"],
                  ].map(([value, label]) => (
                    <div
                      key={label}
                      className="rounded-2xl bg-[#fff6ed] p-4 text-[#17133c]"
                    >
                      <strong className="text-2xl font-black">{value}</strong>
                      <span className="mt-1 block text-[10px] font-bold uppercase tracking-[0.1em] opacity-55">
                        {label}
                      </span>
                    </div>
                  ))}
                </div>
                <p className="mt-4 text-[9px] font-bold uppercase tracking-[0.12em] text-white/62">
                  Illustrative results for this fictional sample.
                </p>
              </article>

              <ul className="grid gap-3">
                {partnershipPrinciples.map((principle) => (
                  <li
                    key={principle}
                    className="flex items-start gap-4 rounded-2xl border border-white/14 px-5 py-4 text-sm leading-7 text-white/70"
                  >
                    <Check
                      aria-hidden
                      className="mt-1 size-4 shrink-0 text-[#c7ee4f]"
                      strokeWidth={3}
                    />
                    {principle}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section
        id="spotlight-about"
        aria-labelledby="spotlight-about-heading"
        className="scroll-mt-24 border-b-2 border-[#17133c]"
      >
        <div className="mx-auto grid max-w-[96rem] gap-12 px-5 py-24 sm:px-8 lg:grid-cols-[0.85fr_1.15fr] lg:px-12 lg:py-32">
          <div
            aria-hidden
            className="relative min-h-[28rem] overflow-hidden rounded-[2rem] border-[3px] border-[#17133c] bg-[#6657ff] shadow-[9px_10px_0_#17133c]"
          >
            <span className="absolute -left-16 -top-16 size-64 rounded-full bg-[#ff654f]" />
            <span className="absolute bottom-[-6rem] right-[-2rem] size-80 rounded-full bg-[#c7ee4f]" />
            <span className="absolute left-[18%] top-[28%] text-[9rem] font-black leading-none tracking-[-0.09em] text-[#fff6ed] sm:text-[12rem]">
              MR
            </span>
            <span className="absolute bottom-6 left-6 rounded-full bg-[#17133c] px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-white">
              Creator · filmmaker · practical optimist
            </span>
          </div>

          <div className="self-center">
            <p className="text-xs font-black uppercase tracking-[0.15em] text-[#ff4f3b]">
              About Mika
            </p>
            <h2
              id="spotlight-about-heading"
              className="mt-5 max-w-[11ch] text-5xl font-black leading-[0.9] tracking-[-0.06em] sm:text-7xl"
            >
              Curiosity, with a packing list.
            </h2>
            <p className="mt-7 max-w-2xl text-lg leading-8 text-[#17133c]/64">
              Mika is an independent creator focused on thoughtful travel,
              useful objects, and the systems that make unfamiliar places
              easier to understand. The work is bright, specific, and honest
              about what was paid for.
            </p>
            <div className="mt-8 flex flex-wrap gap-2">
              {[
                "Travel",
                "Mobility",
                "Useful technology",
                "Design",
                "Responsible tourism",
              ].map((topic) => (
                <span
                  key={topic}
                  className="rounded-full border-2 border-[#17133c]/20 px-4 py-2 text-xs font-black uppercase tracking-[0.1em]"
                >
                  {topic}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section
        id="spotlight-contact"
        aria-labelledby="spotlight-contact-heading"
        className="scroll-mt-24 bg-[#ffd552]"
      >
        <div className="mx-auto max-w-[96rem] px-5 py-24 sm:px-8 lg:px-12 lg:py-32">
          <div className="grid gap-9 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.15em] text-[#6657ff]">
                Select collaborations / 2026
              </p>
              <h2
                id="spotlight-contact-heading"
                className="mt-5 max-w-[13ch] text-5xl font-black leading-[0.9] tracking-[-0.06em] sm:text-7xl"
              >
                Have a story worth making?
              </h2>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-[#17133c]/62">
                Share the product, the audience, the timeline, and what a useful
                collaboration would need to accomplish.
              </p>
            </div>
            <a
              href={spotlightMailto}
              className={`inline-flex min-h-14 items-center justify-center gap-3 rounded-full bg-[#17133c] px-7 text-sm font-black text-white transition hover:bg-[#6657ff] ${focus}`}
            >
              <Mail aria-hidden className="size-4" />
              Build a creator site like this
              <ArrowRight aria-hidden className="size-4" />
            </a>
          </div>
        </div>
      </section>

      <footer className="bg-[#17133c] text-[#fff6ed]">
        <div className="mx-auto flex max-w-[96rem] flex-col gap-6 px-5 py-9 sm:px-8 md:flex-row md:items-center md:justify-between lg:px-12">
          <a
            href="#spotlight-top"
            className={`text-lg font-black uppercase tracking-[-0.05em] ${focus}`}
          >
            MIKA<span className="text-[#ff654f]">/</span>ROWE
          </a>
          <p className="text-xs leading-6 text-white/64">
            Fictional creator website concept by Rukh Labs.
          </p>
          <a
            href="#spotlight-partnerships"
            className={`inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.11em] text-[#c7ee4f] transition hover:text-white ${focus}`}
          >
            Partnership details
            <ArrowRight aria-hidden className="size-4" />
          </a>
        </div>
      </footer>
    </article>
  );
}
