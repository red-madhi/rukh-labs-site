import {
  ArrowDownRight,
  ArrowRight,
  BookOpen,
  Mail,
} from "lucide-react";
import { DispatchStoryIndex } from "./dispatch-story-index";
import { SampleMobileMenu } from "./sample-mobile-menu";

const dispatchMailto =
  "mailto:rukhlabs@gmail.com?subject=Dispatch%20Website%20Direction%20Inquiry";

const dispatchNav = [
  { label: "Current issue", href: "#dispatch-current" },
  { label: "The Brief", href: "#dispatch-brief" },
  { label: "Archive", href: "#dispatch-archive" },
  { label: "About", href: "#dispatch-about" },
] as const;

const currentIssueStories = [
  {
    category: "Work",
    title: "Who owns the quiet hour?",
    description:
      "What disappears when every empty minute becomes available for work.",
    author: "Malik Foster",
    readTime: "9 min",
  },
  {
    category: "Culture",
    title: "A library of things people almost threw away",
    description:
      "Inside a repair archive where ordinary objects keep their histories.",
    author: "Iris Chen",
    readTime: "11 min",
  },
  {
    category: "Design",
    title: "Maintenance is the product",
    description:
      "Why the best systems make care visible before something breaks.",
    author: "Evan Rook",
    readTime: "6 min",
  },
] as const;

const briefNotes = [
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
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#d85637]";

export function DispatchSampleSite() {
  return (
    <article className="min-h-screen overflow-hidden bg-[#f3eddf] text-[#18352f] [color-scheme:light]">
      <header className="relative z-50 border-b-[3px] border-[#18352f] bg-[#f3eddf]">
        <div className="mx-auto flex max-w-[96rem] items-center justify-between border-b border-[#18352f]/30 px-5 py-2 text-[9px] font-bold uppercase tracking-[0.15em] text-[#18352f]/70 sm:px-8 sm:text-[10px] lg:px-12">
          <span>Independent journal · Issue 24</span>
          <time dateTime="2026-07-26">Sunday, July 26, 2026</time>
        </div>

        <div className="mx-auto flex min-h-24 max-w-[96rem] items-center justify-between gap-5 px-5 py-4 sm:px-8 lg:px-12">
          <a
            href="#dispatch-top"
            className={`[font-family:Georgia,'Times_New_Roman',serif] text-3xl font-bold leading-none tracking-[-0.055em] sm:text-5xl ${focus}`}
          >
            The Sunday Index
          </a>
          <p className="hidden max-w-[26ch] text-right text-xs leading-5 text-[#18352f]/68 md:block">
            Essays on cities, culture, and the designed world.
          </p>

          <SampleMobileMenu
            ariaLabel="The Sunday Index mobile sample navigation"
            summaryLabel="Sections"
            items={dispatchNav}
            cta={{
              label: "Newsletter",
              href: "#dispatch-newsletter",
            }}
            summaryClassName={`flex min-h-11 cursor-pointer list-none items-center gap-2 border border-[#18352f]/35 px-3 text-xs font-bold uppercase tracking-[0.12em] [&::-webkit-details-marker]:hidden ${focus}`}
            panelClassName="absolute right-0 top-[calc(100%+0.65rem)] grid w-64 border-2 border-[#18352f] bg-[#f8f3e9] p-2 shadow-[7px_8px_0_#18352f]"
            linkClassName={`flex min-h-11 items-center border-b border-[#18352f]/15 px-3 text-xs font-bold uppercase tracking-[0.11em] text-[#18352f]/70 last:border-b-0 hover:bg-[#e7ddcb] hover:text-[#b33a25] ${focus}`}
            ctaClassName={`mt-2 inline-flex min-h-11 items-center justify-center bg-[#d85637] px-4 text-xs font-bold uppercase tracking-[0.11em] text-white ${focus}`}
          />
        </div>

        <nav
          aria-label="The Sunday Index sample navigation"
          className="mx-auto hidden max-w-[96rem] items-center justify-between border-t border-[#18352f]/30 px-5 sm:px-8 lg:flex lg:px-12"
        >
          <div className="flex">
            {dispatchNav.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className={`inline-flex min-h-12 items-center border-r border-[#18352f]/24 px-5 text-[11px] font-bold uppercase tracking-[0.13em] text-[#18352f]/70 first:border-l transition hover:bg-[#e7ddcb] hover:text-[#18352f] ${focus}`}
              >
                {item.label}
              </a>
            ))}
          </div>
          <a
            href="#dispatch-newsletter"
            className={`inline-flex min-h-12 items-center gap-2 bg-[#d85637] px-5 text-[11px] font-bold uppercase tracking-[0.13em] text-white transition hover:bg-[#b9412b] ${focus}`}
          >
            Newsletter
            <ArrowRight aria-hidden className="size-4" />
          </a>
        </nav>
      </header>

      <div>
        <section
          id="dispatch-top"
          aria-labelledby="dispatch-heading"
          className="scroll-mt-24 border-b-[3px] border-[#18352f]"
        >
          <div className="mx-auto grid min-h-[calc(100vh-9rem)] max-w-[96rem] gap-0 px-5 sm:px-8 lg:grid-cols-[1.08fr_0.92fr] lg:px-12">
            <article className="flex flex-col justify-center border-b border-[#18352f]/30 py-16 lg:border-b-0 lg:border-r lg:py-24 lg:pr-12">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[10px] font-bold uppercase tracking-[0.15em]">
                <span className="bg-[#d85637] px-3 py-1.5 text-white">
                  Cover story
                </span>
                <span className="text-[#18352f]/66">Cities · 8 min read</span>
              </div>
              <h1
                id="dispatch-heading"
                className="mt-8 max-w-[12ch] [font-family:Georgia,'Times_New_Roman',serif] text-[clamp(3.9rem,7.6vw,8rem)] font-bold leading-[0.87] tracking-[-0.065em]"
              >
                What the corner store knows about good cities.
              </h1>
              <p className="mt-8 max-w-2xl [font-family:Georgia,'Times_New_Roman',serif] text-xl leading-9 text-[#18352f]/74">
                The smallest shops do more than sell things. They remember us,
                connect us, and keep a block alive after everything else closes.
              </p>
              <div className="mt-8 flex flex-col gap-5 border-t border-[#18352f]/30 pt-6 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm font-semibold">
                  By Lena Ortiz
                  <span className="font-normal text-[#18352f]/66">
                    {" "}
                    · July 26, 2026
                  </span>
                </p>
                <a
                  href="#dispatch-current"
                  className={`inline-flex min-h-11 items-center gap-2 text-xs font-bold uppercase tracking-[0.13em] text-[#b33a25] transition hover:text-[#18352f] ${focus}`}
                >
                  Explore this issue
                  <ArrowDownRight aria-hidden className="size-4" />
                </a>
              </div>
            </article>

            <figure className="flex flex-col justify-center py-12 lg:pl-12 lg:py-24">
              <div className="relative aspect-[5/4] overflow-hidden border-2 border-[#18352f] bg-[#e6ddcb]">
                <div
                  aria-hidden
                  className="absolute inset-0 bg-[linear-gradient(rgba(24,53,47,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(24,53,47,0.12)_1px,transparent_1px)] bg-[size:48px_48px]"
                />
                <div
                  aria-hidden
                  className="absolute left-[13%] top-[14%] h-[72%] w-[18%] bg-[#d85637]"
                />
                <div
                  aria-hidden
                  className="absolute right-[12%] top-[10%] h-[22%] w-[48%] bg-[#1f5e9b]"
                />
                <div
                  aria-hidden
                  className="absolute bottom-[13%] right-[13%] h-[34%] w-[52%] border-[8px] border-[#18352f] bg-[#f3eddf]"
                />
                <span className="absolute left-[14%] top-[9%] bg-[#f3eddf] px-2 py-1 text-[9px] font-bold uppercase tracking-[0.13em]">
                  Market
                </span>
                <span className="absolute right-[13%] top-[25%] bg-[#f3eddf] px-2 py-1 text-[9px] font-bold uppercase tracking-[0.13em]">
                  Shade line
                </span>
                <span className="absolute bottom-[28%] right-[27%] bg-[#d85637] px-2 py-1 text-[9px] font-bold uppercase tracking-[0.13em] text-white">
                  Bench + notice board
                </span>
                <span className="absolute bottom-[8%] left-[8%] [font-family:Georgia,'Times_New_Roman',serif] text-3xl font-bold italic sm:text-5xl">
                  One useful corner
                </span>
              </div>
              <figcaption className="flex items-start justify-between gap-5 border-b border-[#18352f]/30 py-3 text-[9px] font-bold uppercase leading-5 tracking-[0.12em] text-[#18352f]/66">
                <span>Field diagram / corner store, shade, public seat</span>
                <span>Figure 01</span>
              </figcaption>
            </figure>
          </div>
        </section>

        <section
          id="dispatch-current"
          aria-labelledby="dispatch-current-heading"
          className="scroll-mt-24 border-b-[3px] border-[#18352f]"
        >
          <div className="mx-auto max-w-[96rem] px-5 py-20 sm:px-8 lg:px-12 lg:py-28">
            <div className="flex flex-col gap-5 border-b-[3px] border-[#18352f] pb-6 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#b33a25]">
                  Issue 24 · The ordinary systems issue
                </p>
                <h2
                  id="dispatch-current-heading"
                  className="mt-3 [font-family:Georgia,'Times_New_Roman',serif] text-4xl font-bold tracking-[-0.045em] sm:text-6xl"
                >
                  Also in this issue
                </h2>
              </div>
              <p className="max-w-md text-sm leading-7 text-[#18352f]/70">
                Three essays about the systems people notice only when they stop
                working.
              </p>
            </div>

            <div className="grid md:grid-cols-3">
              {currentIssueStories.map((story, index) => (
                <article
                  key={story.title}
                  className="flex min-h-[27rem] flex-col border-b border-[#18352f]/30 py-8 md:border-b-0 md:border-r md:px-7 md:first:pl-0 md:last:border-r-0 md:last:pr-0"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#b33a25]">
                      {story.category}
                    </span>
                    <span className="text-[10px] font-bold text-[#18352f]/68">
                      0{index + 2}
                    </span>
                  </div>
                  <h3 className="mt-10 [font-family:Georgia,'Times_New_Roman',serif] text-3xl font-bold leading-[0.97] tracking-[-0.04em] sm:text-4xl">
                    {story.title}
                  </h3>
                  <p className="mt-5 text-sm leading-7 text-[#18352f]/72">
                    {story.description}
                  </p>
                  <p className="mt-auto border-t border-[#18352f]/25 pt-5 text-xs font-semibold">
                    {story.author}
                    <span className="font-normal text-[#18352f]/66">
                      {" "}
                      · {story.readTime}
                    </span>
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section
          id="dispatch-brief"
          aria-labelledby="dispatch-brief-heading"
          className="scroll-mt-24 border-b-[3px] border-[#18352f] bg-[#e6ddcb]"
        >
          <div className="mx-auto max-w-[96rem] px-5 py-20 sm:px-8 lg:px-12 lg:py-28">
            <div className="grid gap-7 lg:grid-cols-[0.7fr_1.3fr] lg:items-end">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#b33a25]">
                  Short observations
                </p>
                <h2
                  id="dispatch-brief-heading"
                  className="mt-3 [font-family:Georgia,'Times_New_Roman',serif] text-5xl font-bold tracking-[-0.05em] sm:text-7xl"
                >
                  The Brief
                </h2>
              </div>
              <p className="max-w-xl text-base leading-8 text-[#18352f]/72 lg:justify-self-end">
                Small arguments, field notes, and useful details that do not
                need 2,000 words to make their point.
              </p>
            </div>

            <ol className="mt-12 border-t-[3px] border-[#18352f]">
              {briefNotes.map((note) => (
                <li
                  key={note.number}
                  className="grid gap-5 border-b border-[#18352f]/35 py-7 sm:grid-cols-[4rem_0.9fr_1.1fr] sm:items-start"
                >
                  <span className="text-xs font-bold text-[#b33a25]">
                    {note.number}
                  </span>
                  <div>
                    <span className="text-[9px] font-bold uppercase tracking-[0.14em] text-[#18352f]/68">
                      {note.category}
                    </span>
                    <h3 className="mt-2 [font-family:Georgia,'Times_New_Roman',serif] text-2xl font-bold leading-tight">
                      {note.title}
                    </h3>
                  </div>
                  <p className="max-w-2xl text-sm leading-7 text-[#18352f]/72">
                    {note.body}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section
          id="dispatch-long-read"
          aria-labelledby="dispatch-long-read-heading"
          className="scroll-mt-24 border-b-[3px] border-[#18352f] bg-[#18352f] text-[#f3eddf]"
        >
          <div className="mx-auto grid max-w-[96rem] gap-12 px-5 py-24 sm:px-8 lg:grid-cols-[0.72fr_1.28fr] lg:px-12 lg:py-32">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#f08b70]">
                From the archive · Issue 20
              </p>
              <h2
                id="dispatch-long-read-heading"
                className="mt-6 max-w-[10ch] [font-family:Georgia,'Times_New_Roman',serif] text-5xl font-bold leading-[0.92] tracking-[-0.055em] sm:text-7xl"
              >
                The bus stop that changed the block.
              </h2>
              <p className="mt-7 text-sm font-semibold text-white/70">
                By Nora Bell · Cities · 12 min read
              </p>
            </div>

            <div className="max-w-[44rem] lg:justify-self-end">
              <p className="[font-family:Georgia,'Times_New_Roman',serif] text-xl leading-9 text-[#f3eddf]/84 sm:text-2xl sm:leading-10">
                At 4:17 on a July afternoon, the old bench measured 118 degrees.
                Nobody sat. Riders took turns inside a narrow strip of shade
                while the bus moved as a blue dot on their phones.
              </p>
              <p className="mt-7 [font-family:Georgia,'Times_New_Roman',serif] text-xl leading-9 text-[#f3eddf]/84 sm:text-2xl sm:leading-10">
                Three months later, a fabric canopy changed the choreography of
                the corner. Older neighbors sat long enough to talk. Children
                used the route map to count stops. The intervention cost less
                than a block of decorative paving; its effect was not decorative.
              </p>

              <details className="group mt-10 border-y border-white/20">
                <summary
                  className={`flex min-h-14 cursor-pointer list-none items-center justify-between gap-5 text-xs font-bold uppercase tracking-[0.14em] text-[#f08b70] [&::-webkit-details-marker]:hidden ${focus}`}
                >
                  Continue the field note
                  <span className="text-lg transition group-open:rotate-45">+</span>
                </summary>
                <div className="pb-8">
                  <p className="[font-family:Georgia,'Times_New_Roman',serif] text-lg leading-9 text-[#f3eddf]/72">
                    The lesson was not that every stop needs the same canopy. It
                    was that observation came before design: where people stood,
                    what the sun did, which route carried groceries, and how
                    long a delayed bus asked someone to wait.
                  </p>
                  <p className="mt-5 text-xs font-bold uppercase tracking-[0.13em] text-white/64">
                    Excerpt from a fictional article created for this sample.
                  </p>
                </div>
              </details>
            </div>
          </div>
        </section>

        <section
          id="dispatch-archive"
          aria-labelledby="dispatch-archive-heading"
          className="scroll-mt-24 border-b-[3px] border-[#18352f]"
        >
          <div className="mx-auto max-w-[96rem] px-5 py-24 sm:px-8 lg:px-12 lg:py-32">
            <div className="grid gap-7 lg:grid-cols-[0.72fr_1.28fr] lg:items-end">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#b33a25]">
                  Story index
                </p>
                <h2
                  id="dispatch-archive-heading"
                  className="mt-4 [font-family:Georgia,'Times_New_Roman',serif] text-5xl font-bold tracking-[-0.055em] sm:text-7xl"
                >
                  The archive
                </h2>
              </div>
              <p className="max-w-xl text-base leading-8 text-[#18352f]/72 lg:justify-self-end">
                Browse essays by subject. Every story keeps its byline, date,
                reading time, issue, and place in the publication.
              </p>
            </div>

            <DispatchStoryIndex />
          </div>
        </section>

        <section
          id="dispatch-about"
          aria-labelledby="dispatch-about-heading"
          className="scroll-mt-24 bg-[#1f5e9b] text-white"
        >
          <div className="mx-auto grid max-w-[96rem] gap-12 px-5 py-24 sm:px-8 lg:grid-cols-[1.08fr_0.92fr] lg:px-12 lg:py-32">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/72">
                Why this publication exists
              </p>
              <h2
                id="dispatch-about-heading"
                className="mt-6 max-w-[12ch] [font-family:Georgia,'Times_New_Roman',serif] text-5xl font-bold leading-[0.92] tracking-[-0.055em] sm:text-7xl"
              >
                Essays for a slower internet.
              </h2>
              <p className="mt-7 max-w-2xl [font-family:Georgia,'Times_New_Roman',serif] text-xl leading-9 text-white/76">
                The Sunday Index reports on the material details behind ordinary
                systems: who maintains them, who benefits, and what their design
                quietly asks people to accept.
              </p>
            </div>

            <aside
              id="dispatch-newsletter"
              className="scroll-mt-24 border-2 border-white/55 bg-[#f3eddf] p-6 text-[#18352f] sm:p-8"
            >
              <BookOpen aria-hidden className="size-7 text-[#b33a25]" />
              <p className="mt-7 text-[10px] font-bold uppercase tracking-[0.16em] text-[#b33a25]">
                The Thursday Note
              </p>
              <h3 className="mt-4 [font-family:Georgia,'Times_New_Roman',serif] text-4xl font-bold leading-[0.95] tracking-[-0.045em]">
                One considered essay every other Thursday.
              </h3>
              <p className="mt-5 text-sm leading-7 text-[#18352f]/72">
                No feed-chasing. No daily noise. Just the new story, a short
                editor&apos;s note, and something worth reading next.
              </p>
              <details className="group mt-7 border-y border-[#18352f]/30">
                <summary
                  className={`flex min-h-12 cursor-pointer list-none items-center justify-between text-xs font-bold uppercase tracking-[0.13em] text-[#b33a25] [&::-webkit-details-marker]:hidden ${focus}`}
                >
                  Preview a note
                  <span className="text-lg transition group-open:rotate-45">+</span>
                </summary>
                <p className="pb-5 [font-family:Georgia,'Times_New_Roman',serif] text-base leading-8 text-[#18352f]/68">
                  This week: the public rooms that survive because someone keeps
                  arriving early, unfolding the chairs, and putting the coffee on.
                </p>
              </details>
              <a
                href={dispatchMailto}
                className={`mt-7 inline-flex min-h-12 w-full items-center justify-center gap-3 bg-[#d85637] px-5 text-xs font-bold uppercase tracking-[0.13em] text-white transition hover:bg-[#b9412b] ${focus}`}
              >
                <Mail aria-hidden className="size-4" />
                Build a publication like this
              </a>
            </aside>
          </div>
        </section>
      </div>

      <footer className="border-t-[3px] border-[#18352f] bg-[#f3eddf]">
        <div className="mx-auto grid max-w-[96rem] gap-8 px-5 py-10 sm:px-8 md:grid-cols-[1fr_auto] md:items-end lg:px-12">
          <div>
            <a
              href="#dispatch-top"
              className={`[font-family:Georgia,'Times_New_Roman',serif] text-3xl font-bold tracking-[-0.055em] ${focus}`}
            >
              The Sunday Index
            </a>
            <p className="mt-3 max-w-md text-xs leading-6 text-[#18352f]/66">
              Fictional independent-publication concept by Rukh Labs.
            </p>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-3">
            <a
              href="#dispatch-current"
              className={`text-xs font-bold uppercase tracking-[0.12em] text-[#18352f]/70 hover:text-[#b33a25] ${focus}`}
            >
              Current issue
            </a>
            <a
              href="#dispatch-archive"
              className={`text-xs font-bold uppercase tracking-[0.12em] text-[#18352f]/70 hover:text-[#b33a25] ${focus}`}
            >
              Archive
            </a>
            <a
              href={dispatchMailto}
              className={`inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-[#b33a25] hover:text-[#18352f] ${focus}`}
            >
              Build this direction
              <ArrowRight aria-hidden className="size-4" />
            </a>
          </div>
        </div>
      </footer>
    </article>
  );
}
