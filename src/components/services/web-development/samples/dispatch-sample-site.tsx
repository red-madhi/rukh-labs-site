import {
  ArrowDownRight,
  ArrowRight,
  Bookmark,
  Check,
  Clock3,
  Headphones,
  LockKeyhole,
  Mail,
  Search,
  Share2,
  Sparkles,
} from "lucide-react";
import { DispatchMembershipDemo } from "./dispatch-membership-demo";
import { DispatchStoryIndex } from "./dispatch-story-index";
import { SampleMobileMenu } from "./sample-mobile-menu";

const dispatchMailto =
  "mailto:rukhlabs@gmail.com?subject=Dispatch%20Website%20Direction%20Inquiry";

const dispatchNav = [
  { label: "Latest", href: "#dispatch-latest" },
  { label: "Read", href: "#dispatch-reader" },
  { label: "Notes", href: "#dispatch-notes" },
  { label: "Archive", href: "#dispatch-archive" },
] as const;

const latestStories = [
  {
    category: "Work",
    access: "Supporting members",
    title: "Who owns the quiet hour?",
    description:
      "What disappears when every empty minute becomes available for work.",
    author: "Malik Foster",
    readTime: "9 min",
  },
  {
    category: "Culture",
    access: "Free",
    title: "A library of things people almost threw away",
    description:
      "Inside a repair archive where ordinary objects keep their histories.",
    author: "Iris Chen",
    readTime: "11 min",
  },
  {
    category: "Design",
    access: "Supporting members",
    title: "Maintenance is the product",
    description:
      "Why the best systems make care visible before something breaks.",
    author: "Evan Rook",
    readTime: "6 min",
  },
] as const;

const notes = [
  {
    number: "01",
    title: "A public bench is infrastructure.",
    body: "A seat changes who can wait, who can stay, and whether a walk through the neighborhood has room for a pause.",
    category: "Cities",
  },
  {
    number: "02",
    title: "Why repair cafés are full again.",
    body: "The draw is not only thrift. It is the rare pleasure of learning how an ordinary object was supposed to work.",
    category: "Culture",
  },
  {
    number: "03",
    title: "The useful life of a cardboard box.",
    body: "A perfect package is often the one that can be flattened, labeled twice, and trusted for one more move.",
    category: "Objects",
  },
] as const;

const focus =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#b8402d]";

export function DispatchSampleSite() {
  return (
    <div className="min-h-screen overflow-x-clip bg-[#fbfaf7] text-[#151a18] [color-scheme:light]">
      <header className="sticky top-0 z-50 border-b border-[#151a18]/10 bg-[#fbfaf7]/94 backdrop-blur-xl">
        <div className="mx-auto flex min-h-18 max-w-[96rem] items-center justify-between gap-4 px-5 py-3 sm:px-8 lg:px-12">
          <a
            href="#dispatch-top"
            className={`min-w-0 leading-none ${focus}`}
          >
            <strong className="block truncate [font-family:Georgia,'Times_New_Roman',serif] text-xl font-bold tracking-[-0.045em] sm:text-2xl">
              The Sunday Index
            </strong>
            <span className="mt-1 block text-[10px] font-medium text-[#151a18]/62">
              by Lena Ortiz
            </span>
          </a>

          <nav
            aria-label="The Sunday Index sample navigation"
            className="hidden items-center gap-6 lg:flex"
          >
            {dispatchNav.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className={`text-xs font-semibold text-[#151a18]/66 transition hover:text-[#a83b2b] ${focus}`}
              >
                {item.label}
              </a>
            ))}
            <a
              href="#dispatch-archive"
              aria-label="Search the archive"
              className={`grid size-10 place-items-center rounded-full border border-[#151a18]/10 bg-white text-[#151a18]/64 transition hover:border-[#151a18]/24 hover:text-[#151a18] ${focus}`}
            >
              <Search aria-hidden className="size-4" />
            </a>
            <a
              href="#dispatch-membership"
              className={`text-xs font-semibold text-[#151a18]/66 hover:text-[#151a18] ${focus}`}
            >
              Membership
            </a>
            <a
              href="#dispatch-membership"
              className={`inline-flex min-h-11 items-center rounded-full bg-[#151a18] px-5 text-xs font-semibold text-white transition hover:bg-[#b8402d] ${focus}`}
            >
              Join the publication
            </a>
          </nav>

          <SampleMobileMenu
            ariaLabel="The Sunday Index mobile sample navigation"
            summaryLabel="Menu"
            items={dispatchNav}
            cta={{
              label: "Join",
              href: "#dispatch-membership",
            }}
            summaryClassName={`flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-full border border-[#151a18]/12 bg-white px-3 text-xs font-semibold [&::-webkit-details-marker]:hidden ${focus}`}
            panelClassName="absolute right-0 top-[calc(100%+0.65rem)] grid w-64 rounded-2xl border border-[#151a18]/12 bg-white p-2 shadow-[0_24px_70px_rgba(25,31,28,0.15)]"
            linkClassName={`flex min-h-11 items-center rounded-xl px-3 text-xs font-semibold text-[#151a18]/66 hover:bg-[#f3f1eb] hover:text-[#a83b2b] ${focus}`}
            ctaClassName={`mt-2 inline-flex min-h-11 items-center justify-center rounded-xl bg-[#151a18] px-4 text-xs font-semibold text-white ${focus}`}
          />
        </div>
      </header>

      <section
        id="dispatch-top"
        aria-labelledby="dispatch-heading"
        className="scroll-mt-24 border-b border-[#151a18]/10"
      >
        <div className="mx-auto grid min-h-[calc(100vh-4.5rem)] max-w-[96rem] items-center gap-14 px-5 py-16 sm:px-8 lg:grid-cols-[1.16fr_0.84fr] lg:px-12 lg:py-24">
          <article>
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full bg-[#f6e6e1] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.11em] text-[#a8402e]">
                New · Free essay
              </span>
              <span className="text-xs font-medium text-[#151a18]/62">
                Cities · 8 min read
              </span>
            </div>
            <h1
              id="dispatch-heading"
              className="mt-7 max-w-[12ch] [font-family:Georgia,'Times_New_Roman',serif] text-[clamp(3rem,6.5vw,7.5rem)] font-bold leading-[0.9] tracking-[-0.067em]"
            >
              What the corner store knows about good cities.
            </h1>
            <p className="mt-7 max-w-3xl [font-family:Georgia,'Times_New_Roman',serif] text-xl leading-9 text-[#151a18]/68 sm:text-2xl sm:leading-10">
              The smallest shops do more than sell things. They remember us,
              connect us, and keep a block alive after everything else closes.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <span className="grid size-11 place-items-center rounded-full bg-[#1e5748] text-sm font-bold text-white">
                LO
              </span>
              <span className="min-w-0">
                <strong className="block text-sm font-semibold">
                  Lena Ortiz
                </strong>
                <span className="mt-1 block text-xs text-[#151a18]/62">
                  July 26, 2026 · Reporting from Denver
                </span>
              </span>
            </div>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a
                href="#dispatch-reader"
                className={`inline-flex min-h-12 items-center justify-center gap-3 rounded-full bg-[#b8402d] px-6 text-sm font-semibold text-white transition hover:bg-[#9d3324] ${focus}`}
              >
                Read the essay
                <ArrowDownRight aria-hidden className="size-4" />
              </a>
              <a
                href="#dispatch-membership"
                className={`inline-flex min-h-12 items-center justify-center gap-3 rounded-full border border-[#151a18]/14 bg-white px-6 text-sm font-semibold transition hover:border-[#151a18]/30 ${focus}`}
              >
                Join thoughtful readers
                <ArrowDownRight aria-hidden className="size-4" />
              </a>
            </div>
          </article>

          <aside className="relative overflow-hidden rounded-[2rem] bg-[#151a18] p-6 text-white shadow-[0_30px_80px_rgba(22,28,25,0.2)] sm:p-8">
            <div
              aria-hidden
              className="absolute -right-20 -top-20 size-60 rounded-full bg-[radial-gradient(circle,rgba(214,82,55,0.42),transparent_68%)]"
            />
            <div className="relative">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.11em] text-white/68">
                <Mail aria-hidden className="size-3.5" />
                The Thursday Letter
              </span>
              <h2 className="mt-7 [font-family:Georgia,'Times_New_Roman',serif] text-4xl font-bold leading-[0.98] tracking-[-0.05em] sm:text-5xl">
                Good writing should arrive without a feed in between.
              </h2>
              <p className="mt-5 text-sm leading-7 text-white/64">
                One considered essay every other Thursday, plus notes from the
                reporting process and something worth reading next.
              </p>
              <div className="mt-7 grid gap-3">
                <a
                  href="#dispatch-membership"
                  className={`inline-flex min-h-12 items-center justify-center rounded-full bg-white px-5 text-sm font-semibold text-[#151a18] transition hover:bg-[#f2e8df] ${focus}`}
                >
                  Explore free membership
                </a>
                <a
                  href="#dispatch-membership"
                  className={`inline-flex min-h-12 items-center justify-center rounded-full border border-white/18 px-5 text-sm font-semibold text-white/74 transition hover:border-white/36 hover:text-white ${focus}`}
                >
                  See supporting benefits
                </a>
              </div>
              <p className="mt-5 text-[10px] leading-5 text-white/60">
                Fictional membership interface. No information is collected.
              </p>
            </div>
          </aside>
        </div>
      </section>

      <section
        id="dispatch-latest"
        aria-labelledby="dispatch-latest-heading"
        className="scroll-mt-24 border-b border-[#151a18]/10"
      >
        <div className="mx-auto max-w-[96rem] px-5 py-20 sm:px-8 lg:px-12 lg:py-28">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold text-[#a83b2b]">
                Latest from the publication
              </p>
              <h2
                id="dispatch-latest-heading"
                className="mt-3 [font-family:Georgia,'Times_New_Roman',serif] text-4xl font-bold tracking-[-0.05em] sm:text-6xl"
              >
                Read next
              </h2>
            </div>
            <p className="max-w-md text-sm leading-7 text-[#151a18]/64">
              Essays, field notes, and recurring series—kept readable,
              searchable, and connected to the people who made them.
            </p>
          </div>

          <div className="mt-10 grid gap-5 lg:grid-cols-3">
            {latestStories.map((story, index) => (
              <article
                key={story.title}
                className="flex flex-col rounded-[1.5rem] border border-[#151a18]/10 bg-white p-6 shadow-[0_18px_50px_rgba(27,34,30,0.045)] sm:min-h-[24rem] sm:p-7"
              >
                <div className="flex items-center justify-between gap-4">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#a83b2b]">
                    {story.category}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                      story.access === "Free"
                        ? "bg-[#edf1eb] text-[#446250]"
                        : "bg-[#f8ebe7] text-[#a74431]"
                    }`}
                  >
                    {story.access === "Supporting members" ? (
                      <LockKeyhole aria-hidden className="size-3" />
                    ) : null}
                    {story.access}
                  </span>
                </div>
                <span className="mt-7 text-xs font-medium text-[#151a18]/62">
                  0{index + 2}
                </span>
                <h3 className="mt-4 [font-family:Georgia,'Times_New_Roman',serif] text-3xl font-bold leading-[1.02] tracking-[-0.045em] sm:text-4xl">
                  {story.title}
                </h3>
                <p className="mt-5 text-sm leading-7 text-[#151a18]/64">
                  {story.description}
                </p>
                <div className="mt-auto flex items-center justify-between gap-3 border-t border-[#151a18]/10 pt-5 text-xs">
                  <span className="font-semibold">{story.author}</span>
                  <span className="inline-flex items-center gap-2 text-[#151a18]/62">
                    <Clock3 aria-hidden className="size-3.5" />
                    {story.readTime}
                  </span>
                </div>
                <a
                  href={
                    story.access === "Supporting members"
                      ? "#dispatch-membership"
                      : "#dispatch-archive"
                  }
                  className={`mt-5 inline-flex items-center gap-2 text-xs font-semibold text-[#a83b2b] hover:text-[#151a18] ${focus}`}
                >
                  {story.access === "Supporting members"
                    ? "Preview membership"
                    : "Browse free essays"}
                  <ArrowRight aria-hidden className="size-3.5" />
                </a>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section
        id="dispatch-reader"
        aria-labelledby="dispatch-reader-heading"
        className="scroll-mt-24 border-b border-[#151a18]/10 bg-white"
      >
        <div className="mx-auto max-w-[86rem] px-5 py-24 sm:px-8 lg:px-12 lg:py-32">
          <div className="mx-auto max-w-[52rem]">
            <div className="flex items-center justify-between gap-4 border-y border-[#151a18]/10 py-3 text-[10px] font-semibold uppercase tracking-[0.11em] text-[#151a18]/62">
              <span>Reading view</span>
              <span>Essay · 8 minutes</span>
            </div>
            <p className="mt-12 text-xs font-semibold text-[#a83b2b]">
              Cities · Public Rooms
            </p>
            <h2
              id="dispatch-reader-heading"
              className="mt-5 [font-family:Georgia,'Times_New_Roman',serif] text-5xl font-bold leading-[0.95] tracking-[-0.06em] sm:text-7xl"
            >
              What the corner store knows about good cities.
            </h2>
            <p className="mt-7 [font-family:Georgia,'Times_New_Roman',serif] text-xl leading-9 text-[#151a18]/66 sm:text-2xl sm:leading-10">
              The smallest shops do more than sell things. They remember us,
              connect us, and keep a block alive after everything else closes.
            </p>
            <div className="mt-8 flex flex-col gap-5 border-b border-[#151a18]/10 pb-8 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-full bg-[#1e5748] text-xs font-bold text-white">
                  LO
                </span>
                <span>
                  <strong className="block text-sm font-semibold">
                    Lena Ortiz
                  </strong>
                  <time
                    dateTime="2026-07-26"
                    className="mt-1 block text-xs text-[#151a18]/62"
                  >
                    July 26, 2026
                  </time>
                </span>
              </div>
              <div
                aria-label="Article tool preview"
                className="flex items-center gap-2"
              >
                {[
                  { label: "Save", icon: Bookmark },
                  { label: "Share", icon: Share2 },
                  { label: "Listen", icon: Headphones },
                ].map(({ label, icon: Icon }) => (
                  <span
                    key={label}
                    title={`${label} tool shown in this sample`}
                    className="grid size-10 place-items-center rounded-full border border-[#151a18]/10 text-[#151a18]/58"
                  >
                    <Icon aria-hidden className="size-4" />
                    <span className="sr-only">{label} tool preview</span>
                  </span>
                ))}
              </div>
            </div>
          </div>

          <article className="mx-auto mt-12 max-w-[43rem]">
            <p className="[font-family:Georgia,'Times_New_Roman',serif] text-xl leading-9 text-[#151a18]/82 sm:text-[1.35rem] sm:leading-10">
              At 6:12 on a Tuesday morning, Rosa Alvarez turns on the lights at
              Mercado Luna. Before the register opens, she has already received
              a package for the third-floor apartment, put aside the paper for
              Mr. Han, and learned that the bus on Colfax is running twelve
              minutes late.
            </p>
            <p className="mt-7 [font-family:Georgia,'Times_New_Roman',serif] text-xl leading-9 text-[#151a18]/82 sm:text-[1.35rem] sm:leading-10">
              None of this appears on the inventory sheet. It is still part of
              what the store provides. A good corner shop is a place where
              errands become encounters and small information moves faster than
              any neighborhood app.
            </p>

            <blockquote className="my-12 border-l-2 border-[#b8402d] pl-6 [font-family:Georgia,'Times_New_Roman',serif] text-3xl font-bold leading-tight tracking-[-0.04em] text-[#1e5748] sm:text-4xl">
              A useful city is built from places where being known is part of
              the service.
            </blockquote>

            <p className="[font-family:Georgia,'Times_New_Roman',serif] text-xl leading-9 text-[#151a18]/82 sm:text-[1.35rem] sm:leading-10">
              The store is not nostalgic by default. It survives because it is
              close, observant, flexible, and useful in ways a delivery window
              cannot reproduce. The lesson for city design is not to preserve
              every shop unchanged. It is to make room for the small,
              adaptable places that let a block take care of itself.
            </p>

            <details className="group mt-12 rounded-2xl border border-[#151a18]/10 bg-[#f5f3ed] p-5 sm:p-6">
              <summary
                className={`flex min-h-11 cursor-pointer list-none items-center justify-between gap-5 text-sm font-semibold [&::-webkit-details-marker]:hidden ${focus}`}
              >
                Continue the sample essay
                <span
                  aria-hidden
                  className="text-lg transition group-open:rotate-45"
                >
                  +
                </span>
              </summary>
              <div className="border-t border-[#151a18]/10 pt-5">
                <p className="[font-family:Georgia,'Times_New_Roman',serif] text-lg leading-9 text-[#151a18]/70">
                  The reporting starts with ordinary questions: who comes in,
                  what they ask for, which services appear because a person
                  behind the counter noticed the pattern, and what the block
                  would need if that door disappeared tomorrow.
                </p>
                <p className="mt-5 text-xs leading-6 text-[#151a18]/62">
                  Excerpt from a fictional article created for this website
                  sample.
                </p>
              </div>
            </details>

            <div className="mt-12 rounded-[1.5rem] border border-[#151a18]/10 bg-white p-6 shadow-[0_18px_50px_rgba(27,34,30,0.05)] sm:p-7">
              <div className="flex items-start gap-4">
                <span className="grid size-12 shrink-0 place-items-center rounded-full bg-[#1e5748] text-sm font-bold text-white">
                  LO
                </span>
                <div>
                <p className="text-xs font-semibold text-[#a83b2b]">
                    Written by Lena Ortiz
                  </p>
                  <p className="mt-3 text-sm leading-7 text-[#151a18]/62">
                    Lena reports on the ordinary systems behind useful public
                    life: shops, sidewalks, libraries, transit, repair, and the
                    people who keep them working.
                  </p>
                  <a
                    href="#dispatch-about"
                    className={`mt-4 inline-flex items-center gap-2 text-xs font-semibold text-[#1e5748] hover:text-[#a83b2b] ${focus}`}
                  >
                    About the publication
                    <ArrowRight aria-hidden className="size-4" />
                  </a>
                </div>
              </div>
            </div>
          </article>
        </div>
      </section>

      <section
        id="dispatch-notes"
        aria-labelledby="dispatch-notes-heading"
        className="scroll-mt-24 border-b border-[#151a18]/10 bg-[#f3f1eb]"
      >
        <div className="mx-auto max-w-[96rem] px-5 py-20 sm:px-8 lg:px-12 lg:py-28">
          <div className="grid gap-7 lg:grid-cols-[0.72fr_1.28fr] lg:items-end">
            <div>
              <p className="text-xs font-semibold text-[#a83b2b]">
                Short observations
              </p>
              <h2
                id="dispatch-notes-heading"
                className="mt-3 [font-family:Georgia,'Times_New_Roman',serif] text-5xl font-bold tracking-[-0.055em] sm:text-7xl"
              >
                Notes
              </h2>
            </div>
            <p className="max-w-xl text-base leading-8 text-[#151a18]/64 lg:justify-self-end">
              Small arguments, field notes, and useful details that do not need
              2,000 words to make their point.
            </p>
          </div>

          <ol className="mt-10 grid gap-4 lg:grid-cols-3">
            {notes.map((note) => (
              <li
                key={note.number}
                className="flex min-h-[19rem] flex-col rounded-[1.4rem] border border-[#151a18]/10 bg-white p-6"
              >
                <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.11em]">
                  <span className="text-[#a83b2b]">{note.category}</span>
                  <span className="text-[#151a18]/60">{note.number}</span>
                </div>
                <h3 className="mt-8 [font-family:Georgia,'Times_New_Roman',serif] text-3xl font-bold leading-[1.04] tracking-[-0.04em]">
                  {note.title}
                </h3>
                <p className="mt-auto pt-6 text-sm leading-7 text-[#151a18]/64">
                  {note.body}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section
        id="dispatch-membership"
        aria-labelledby="dispatch-membership-heading"
        className="scroll-mt-24 border-b border-white/10 bg-[#151a18] text-white"
      >
        <div className="mx-auto max-w-[96rem] px-5 py-24 sm:px-8 lg:px-12 lg:py-32">
          <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-2 text-xs font-semibold text-white/68">
                <Sparkles aria-hidden className="size-4 text-[#f39a83]" />
                Reader supported
              </span>
              <h2
                id="dispatch-membership-heading"
                className="mt-6 max-w-[11ch] [font-family:Georgia,'Times_New_Roman',serif] text-5xl font-bold leading-[0.95] tracking-[-0.06em] sm:text-7xl"
              >
                Keep the work independent.
              </h2>
              <p className="mt-7 max-w-xl text-lg leading-8 text-white/62">
                Read the public essays for free. Supporting members make deeper
                reporting, audio editions, and a durable archive possible.
              </p>
            </div>

            <DispatchMembershipDemo />
          </div>
          <p className="mt-6 text-[10px] leading-5 text-white/58">
            Membership options are illustrative. This fictional concept does
            not process subscriptions or payments.
          </p>
        </div>
      </section>

      <section
        id="dispatch-archive"
        aria-labelledby="dispatch-archive-heading"
        className="scroll-mt-24 border-b border-[#151a18]/10"
      >
        <div className="mx-auto max-w-[96rem] px-5 py-24 sm:px-8 lg:px-12 lg:py-32">
          <div className="grid gap-7 lg:grid-cols-[0.72fr_1.28fr] lg:items-end">
            <div>
              <p className="text-xs font-semibold text-[#a83b2b]">
                Searchable by design
              </p>
              <h2
                id="dispatch-archive-heading"
                className="mt-3 [font-family:Georgia,'Times_New_Roman',serif] text-5xl font-bold tracking-[-0.055em] sm:text-7xl"
              >
                The archive
              </h2>
            </div>
            <p className="max-w-xl text-base leading-8 text-[#151a18]/64 lg:justify-self-end">
              Find essays by subject, author, or series. Every story keeps its
              access level, byline, date, reading time, and place in the
              publication.
            </p>
          </div>
          <DispatchStoryIndex />
        </div>
      </section>

      <section
        id="dispatch-about"
        aria-labelledby="dispatch-about-heading"
        className="scroll-mt-24 border-b border-[#151a18]/10 bg-[#f3f1eb]"
      >
        <div className="mx-auto grid max-w-[96rem] gap-12 px-5 py-24 sm:px-8 lg:grid-cols-[0.8fr_1.2fr] lg:px-12 lg:py-32">
          <div className="flex min-h-[26rem] items-end rounded-[2rem] bg-[#1e5748] p-7 text-white shadow-[0_26px_70px_rgba(26,73,60,0.16)] sm:p-9">
            <div>
              <span className="grid size-24 place-items-center rounded-full border border-white/20 bg-white/10 [font-family:Georgia,'Times_New_Roman',serif] text-4xl font-bold">
                LO
              </span>
              <p className="mt-8 text-xs font-semibold text-white/58">
                Founder · editor · reporter
              </p>
              <h3 className="mt-3 [font-family:Georgia,'Times_New_Roman',serif] text-4xl font-bold tracking-[-0.045em]">
                Lena Ortiz
              </h3>
              <p className="mt-4 max-w-md text-sm leading-7 text-white/68">
                Reporting on the quiet systems behind public life since 2018.
              </p>
            </div>
          </div>

          <div className="self-center">
            <p className="text-xs font-semibold text-[#a83b2b]">
              Why this publication exists
            </p>
            <h2
              id="dispatch-about-heading"
              className="mt-4 max-w-[12ch] [font-family:Georgia,'Times_New_Roman',serif] text-5xl font-bold leading-[0.95] tracking-[-0.06em] sm:text-7xl"
            >
              Essays for a slower internet.
            </h2>
            <p className="mt-7 max-w-2xl [font-family:Georgia,'Times_New_Roman',serif] text-xl leading-9 text-[#151a18]/66">
              The Sunday Index reports on the material details behind ordinary
              systems: who maintains them, who benefits, and what their design
              quietly asks people to accept.
            </p>
            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {[
                "Independent and reader supported",
                "One major essay every other Thursday",
                "Occasional expert contributors",
                "Corrections and sourcing kept visible",
              ].map((item) => (
                <span
                  key={item}
                  className="flex items-start gap-3 rounded-xl bg-white p-4 text-sm leading-6 text-[#151a18]/62"
                >
                  <Check
                    aria-hidden
                    className="mt-1 size-3.5 shrink-0 text-[#a83b2b]"
                  />
                  {item}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section
        id="dispatch-newsletter"
        aria-labelledby="dispatch-newsletter-heading"
        className="scroll-mt-24 bg-[#b8402d] text-white"
      >
        <div className="mx-auto max-w-[96rem] px-5 py-24 sm:px-8 lg:px-12 lg:py-28">
          <div className="grid gap-9 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <p className="text-xs font-semibold text-white">
                A publication that belongs to its author
              </p>
              <h2
                id="dispatch-newsletter-heading"
                className="mt-4 max-w-[13ch] [font-family:Georgia,'Times_New_Roman',serif] text-5xl font-bold leading-[0.95] tracking-[-0.06em] sm:text-7xl"
              >
                Build beyond the newsletter platform.
              </h2>
            </div>
            <a
              href={dispatchMailto}
              className="inline-flex min-h-14 items-center justify-center gap-3 rounded-full bg-[#151a18] px-7 text-sm font-semibold text-white transition hover:bg-[#1e5748] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
            >
              <Mail aria-hidden className="size-4" />
              Build a publication like this
              <ArrowRight aria-hidden className="size-4" />
            </a>
          </div>
        </div>
      </section>

      <footer className="bg-[#151a18] text-white">
        <div className="mx-auto grid max-w-[96rem] gap-8 px-5 py-10 sm:px-8 md:grid-cols-[1fr_auto] md:items-end lg:px-12">
          <div>
            <a
              href="#dispatch-top"
              className={`[font-family:Georgia,'Times_New_Roman',serif] text-2xl font-bold tracking-[-0.045em] ${focus}`}
            >
              The Sunday Index
            </a>
            <p className="mt-2 text-xs text-white/60">
              by Lena Ortiz · Fictional publication concept by Rukh Labs.
            </p>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-3">
            <a
              href="#dispatch-reader"
              className={`text-xs font-semibold text-white/58 hover:text-white ${focus}`}
            >
              Read
            </a>
            <a
              href="#dispatch-archive"
              className={`text-xs font-semibold text-white/58 hover:text-white ${focus}`}
            >
              Archive
            </a>
            <a
              href={dispatchMailto}
              className={`inline-flex items-center gap-2 text-xs font-semibold text-[#f39a83] hover:text-white ${focus}`}
            >
              Build this direction
              <ArrowRight aria-hidden className="size-4" />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
