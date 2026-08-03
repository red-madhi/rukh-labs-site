import { ArrowDownRight, ArrowRight, ChevronDown, Menu } from "lucide-react";
import { AtelierProjectGallery } from "./atelier-project-gallery";

const atelierProjectHref = "/contact?inquiry=website&design=atelier";

const atelierNav = [
  { label: "Work", href: "#atelier-work" },
  { label: "Practice", href: "#atelier-practice" },
  { label: "Notes", href: "#atelier-notes" },
  { label: "Contact", href: "#atelier-contact" },
] as const;

const focus =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#7d2a24]";

export function AtelierSampleSite() {
  return (
    <article className="min-h-screen overflow-hidden bg-[#eee7d8] text-[#211c18] [color-scheme:light]">
      <header className="sticky top-0 z-50 border-b border-[#211c18]/18 bg-[#eee7d8]/94 backdrop-blur-xl">
        <div className="mx-auto flex h-18 max-w-[94rem] items-center justify-between px-5 sm:px-8 lg:px-12">
          <a
            href="#atelier-top"
            className={`[font-family:Georgia,'Times_New_Roman',serif] text-xl italic ${focus}`}
          >
            Mara Bell
          </a>

          <nav
            aria-label="Mara Bell Studio sample navigation"
            className="hidden items-center gap-8 lg:flex"
          >
            {atelierNav.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className={`text-[11px] font-semibold uppercase tracking-[0.18em] text-[#211c18]/52 transition hover:text-[#7d2a24] ${focus}`}
              >
                {item.label}
              </a>
            ))}
          </nav>

          <details className="group relative lg:hidden">
            <summary
              className={`flex min-h-11 cursor-pointer list-none items-center gap-2 border border-[#211c18]/22 px-3 text-xs font-semibold uppercase tracking-[0.14em] [&::-webkit-details-marker]:hidden ${focus}`}
            >
              <Menu aria-hidden className="size-4" />
              Index
            </summary>
            <nav
              aria-label="Mara Bell Studio mobile sample navigation"
              className="absolute right-0 top-[calc(100%+0.65rem)] grid w-60 border border-[#211c18]/18 bg-[#f4eddf] p-2 shadow-[0_24px_70px_rgba(33,28,24,0.2)]"
            >
              {atelierNav.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className={`flex min-h-11 items-center border-b border-[#211c18]/10 px-3 text-xs font-semibold uppercase tracking-[0.14em] text-[#211c18]/64 last:border-b-0 hover:bg-[#7d2a24] hover:text-[#fff8ea] ${focus}`}
                >
                  {item.label}
                </a>
              ))}
            </nav>
          </details>
        </div>
      </header>

      <section
        id="atelier-top"
        aria-labelledby="atelier-heading"
        className="scroll-mt-24 border-b border-[#211c18]/20"
      >
        <div className="mx-auto grid min-h-[calc(100vh-4.5rem)] max-w-[94rem] items-center gap-14 px-5 py-16 sm:px-8 lg:grid-cols-[0.85fr_1.15fr] lg:px-12 lg:py-24">
          <div className="relative z-10 lg:py-16">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#7d2a24]">
              Independent studio · New York / London
            </p>
            <h1
              id="atelier-heading"
              className="mt-7 max-w-[8ch] [font-family:Georgia,'Times_New_Roman',serif] text-[clamp(4.2rem,9.5vw,10rem)] font-normal italic leading-[0.78] tracking-[-0.065em]"
            >
              Form, place, memory.
            </h1>
            <p className="mt-9 max-w-xl text-base leading-8 text-[#211c18]/62">
              Mara Bell is a multidisciplinary studio shaping identities,
              objects, and spaces for cultural organizations and independent
              makers.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <a
                href="#atelier-work"
                className={`inline-flex min-h-12 items-center justify-center gap-3 bg-[#7d2a24] px-6 text-xs font-semibold uppercase tracking-[0.14em] text-[#fff8ea] transition hover:bg-[#952f28] ${focus}`}
              >
                Explore selected work
                <ArrowDownRight aria-hidden className="size-4" />
              </a>
              <a
                href={atelierProjectHref}
                className={`inline-flex min-h-12 items-center justify-center border border-[#211c18]/26 px-6 text-xs font-semibold uppercase tracking-[0.14em] transition hover:border-[#7d2a24] hover:text-[#7d2a24] ${focus}`}
              >
                Commission a project
              </a>
            </div>
          </div>

          <figure className="relative mx-auto w-full max-w-3xl lg:ml-[-3rem]">
            <div className="relative aspect-[5/6] overflow-hidden bg-[#3d4034] sm:aspect-[6/5]">
              <div className="absolute inset-y-0 left-[9%] w-[34%] bg-[#cbb99d]" />
              <div className="absolute bottom-0 right-0 h-[68%] w-[64%] bg-[#7d2a24]" />
              <div className="absolute left-[24%] top-[13%] aspect-square w-[27%] rounded-full border border-[#eee7d8]/80" />
              <div className="absolute right-[12%] top-[9%] h-px w-[38%] bg-[#eee7d8]/60" />
              <div className="absolute bottom-[14%] left-[16%] h-[42%] w-px bg-[#eee7d8]/48" />
              <span className="absolute bottom-6 right-7 [font-family:Georgia,'Times_New_Roman',serif] text-4xl italic text-[#fff8ea] sm:text-5xl">
                Quiet House
              </span>
            </div>
            <figcaption className="mt-4 flex justify-between gap-5 border-t border-[#211c18]/24 pt-3 text-[10px] uppercase tracking-[0.16em] text-[#211c18]/48">
              <span>Quiet House / Spatial identity</span>
              <span>2026</span>
            </figcaption>
          </figure>
        </div>
      </section>

      <section
        id="atelier-work"
        aria-labelledby="atelier-work-heading"
        className="scroll-mt-24 border-b border-[#211c18]/20"
      >
        <div className="mx-auto max-w-[94rem] px-5 py-24 sm:px-8 lg:px-12 lg:py-32">
          <div className="grid gap-7 lg:grid-cols-[0.75fr_1.25fr] lg:items-end">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#7d2a24]">
                Selected work / 2024—26
              </p>
              <h2
                id="atelier-work-heading"
                className="mt-5 [font-family:Georgia,'Times_New_Roman',serif] text-5xl font-normal italic leading-none tracking-[-0.045em] sm:text-7xl"
              >
                Work in context.
              </h2>
            </div>
            <p className="max-w-xl text-base leading-8 text-[#211c18]/58 lg:justify-self-end">
              Identity is treated as a material system: something that needs to
              hold together across pages, rooms, objects, and time.
            </p>
          </div>

          <AtelierProjectGallery />
        </div>
      </section>

      <section
        id="atelier-case-study"
        aria-labelledby="atelier-case-study-heading"
        className="scroll-mt-24 border-b border-[#211c18]/20 bg-[#25231f] text-[#eee7d8]"
      >
        <div className="mx-auto max-w-[94rem] px-5 py-24 sm:px-8 lg:px-12 lg:py-32">
          <div className="grid gap-10 lg:grid-cols-[0.65fr_1.35fr]">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#d89b8e]">
                Featured case study
              </p>
              <h2
                id="atelier-case-study-heading"
                className="mt-6 [font-family:Georgia,'Times_New_Roman',serif] text-5xl font-normal italic leading-[0.9] tracking-[-0.045em] sm:text-7xl"
              >
                Quiet House
              </h2>
              <dl className="mt-9 grid grid-cols-2 gap-x-5 gap-y-6 border-t border-[#eee7d8]/20 pt-6 text-xs">
                <div>
                  <dt className="uppercase tracking-[0.16em] text-[#eee7d8]/38">
                    Scope
                  </dt>
                  <dd className="mt-2 text-[#eee7d8]/72">Identity + spatial</dd>
                </div>
                <div>
                  <dt className="uppercase tracking-[0.16em] text-[#eee7d8]/38">
                    Year
                  </dt>
                  <dd className="mt-2 text-[#eee7d8]/72">2026</dd>
                </div>
                <div>
                  <dt className="uppercase tracking-[0.16em] text-[#eee7d8]/38">
                    Place
                  </dt>
                  <dd className="mt-2 text-[#eee7d8]/72">Catskills, New York</dd>
                </div>
                <div>
                  <dt className="uppercase tracking-[0.16em] text-[#eee7d8]/38">
                    Format
                  </dt>
                  <dd className="mt-2 text-[#eee7d8]/72">Print, web, environment</dd>
                </div>
              </dl>
            </div>

            <div>
              <div className="grid gap-5 sm:grid-cols-[1.25fr_0.75fr]">
                <div className="relative aspect-[4/3] overflow-hidden bg-[#7d2a24]">
                  <div className="absolute inset-y-0 left-[12%] w-[31%] bg-[#cbb99d]" />
                  <div className="absolute right-[12%] top-[18%] aspect-square w-[34%] rounded-full border border-[#eee7d8]/72" />
                  <span className="absolute bottom-5 right-5 [font-family:Georgia,'Times_New_Roman',serif] text-3xl italic">
                    Threshold / 01
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-5 sm:grid-cols-1">
                  <div className="relative aspect-square bg-[#cbb99d]">
                    <div className="absolute inset-[22%] rounded-full bg-[#3d4034]" />
                  </div>
                  <div className="relative aspect-square border border-[#eee7d8]/25">
                    <span className="absolute inset-0 grid place-items-center [font-family:Georgia,'Times_New_Roman',serif] text-6xl italic text-[#d89b8e]">
                      Q
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-9 grid gap-6 text-base leading-8 text-[#eee7d8]/62 md:grid-cols-2">
                <p>
                  Quiet House needed an identity that could hold silence without
                  feeling precious. The system begins with thresholds: narrow
                  rules, interrupted fields, and typography that leaves room for
                  what is not being said.
                </p>
                <p>
                  The same logic moves from the booking site into printed matter
                  and room signage. Nothing is copied at a new scale; each format
                  inherits the pace and proportion of the whole.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        id="atelier-practice"
        aria-labelledby="atelier-practice-heading"
        className="scroll-mt-24 border-b border-[#211c18]/20"
      >
        <div className="mx-auto max-w-[94rem] px-5 py-24 sm:px-8 lg:px-12 lg:py-32">
          <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#7d2a24]">
                The practice
              </p>
              <h2
                id="atelier-practice-heading"
                className="mt-6 max-w-[9ch] [font-family:Georgia,'Times_New_Roman',serif] text-5xl font-normal italic leading-[0.9] tracking-[-0.045em] sm:text-7xl"
              >
                Small studio. Close collaboration.
              </h2>
            </div>
            <div>
              <p className="max-w-2xl text-lg leading-9 text-[#211c18]/62">
                Mara works directly with founders, curators, and makers from the
                first conversation through the final application. The practice
                stays intentionally small so thinking and making remain connected.
              </p>
              <div className="mt-12 grid gap-px bg-[#211c18]/18 sm:grid-cols-2">
                {[
                  "Identity systems",
                  "Editorial design",
                  "Art direction",
                  "Spatial graphics",
                ].map((capability, index) => (
                  <div key={capability} className="bg-[#eee7d8] p-6">
                    <span className="text-[10px] uppercase tracking-[0.16em] text-[#7d2a24]">
                      0{index + 1}
                    </span>
                    <h3 className="mt-8 [font-family:Georgia,'Times_New_Roman',serif] text-2xl italic">
                      {capability}
                    </h3>
                  </div>
                ))}
              </div>
              <ol className="mt-12 grid grid-cols-2 gap-x-6 gap-y-8 border-t border-[#211c18]/24 pt-6 sm:grid-cols-4">
                {["Listen", "Distill", "Make", "Refine"].map((step, index) => (
                  <li key={step}>
                    <span className="text-[10px] uppercase tracking-[0.16em] text-[#211c18]/38">
                      0{index + 1}
                    </span>
                    <strong className="mt-2 block text-sm font-semibold">{step}</strong>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </section>

      <section
        id="atelier-notes"
        aria-labelledby="atelier-notes-heading"
        className="scroll-mt-24 border-b border-[#211c18]/20"
      >
        <div className="mx-auto grid max-w-[94rem] gap-12 px-5 py-24 sm:px-8 lg:grid-cols-[0.7fr_1.3fr] lg:px-12 lg:py-32">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#7d2a24]">
              Studio notes
            </p>
            <h2
              id="atelier-notes-heading"
              className="mt-5 [font-family:Georgia,'Times_New_Roman',serif] text-5xl font-normal italic"
            >
              On making.
            </h2>
          </div>
          <div className="border-t border-[#211c18]/24">
            {[
              {
                title: "Materials before moodboards",
                meta: "May 18, 2026 · 4 min",
                body: "A project becomes more specific when the material conditions arrive early: the paper, the room, the manufacturing tolerance, the light. Mood follows from those decisions more honestly than the other way around.",
              },
              {
                title: "Designing identity in physical space",
                meta: "March 02, 2026 · 6 min",
                body: "Spatial identity is not a logo placed on a wall. It is the pace of arrival, the hierarchy of information, the distance from which something must be understood, and the material that carries it.",
              },
            ].map((note) => (
              <details key={note.title} className="group border-b border-[#211c18]/24">
                <summary
                  className={`flex min-h-24 cursor-pointer list-none items-center justify-between gap-5 py-6 [&::-webkit-details-marker]:hidden ${focus}`}
                >
                  <div>
                    <span className="text-[10px] uppercase tracking-[0.15em] text-[#211c18]/42">
                      {note.meta}
                    </span>
                    <h3 className="mt-2 [font-family:Georgia,'Times_New_Roman',serif] text-2xl italic">
                      {note.title}
                    </h3>
                  </div>
                  <ChevronDown
                    aria-hidden
                    className="size-5 shrink-0 text-[#211c18]/36 transition group-open:rotate-180 group-open:text-[#7d2a24]"
                  />
                </summary>
                <p className="max-w-2xl pb-7 text-base leading-8 text-[#211c18]/62">
                  {note.body}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section
        id="atelier-contact"
        aria-labelledby="atelier-contact-heading"
        className="scroll-mt-24 bg-[#7d2a24] text-[#fff8ea]"
      >
        <div className="mx-auto flex max-w-[94rem] flex-col gap-10 px-5 py-24 sm:px-8 lg:flex-row lg:items-end lg:justify-between lg:px-12 lg:py-28">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#fff8ea]/58">
              New commissions / 2026
            </p>
            <h2
              id="atelier-contact-heading"
              className="mt-6 max-w-[14ch] [font-family:Georgia,'Times_New_Roman',serif] text-5xl font-normal italic leading-[0.9] tracking-[-0.045em] sm:text-7xl"
            >
              Have a place, object, or story that needs a form?
            </h2>
          </div>
          <a
            href={atelierProjectHref}
            className="inline-flex min-h-13 shrink-0 items-center justify-center gap-3 border border-[#fff8ea]/50 px-6 text-xs font-semibold uppercase tracking-[0.14em] transition hover:bg-[#fff8ea] hover:text-[#7d2a24] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#fff8ea]"
          >
            Begin an inquiry
            <ArrowRight aria-hidden className="size-4" />
          </a>
        </div>
      </section>

      <footer className="border-t border-[#211c18]/20 bg-[#eee7d8]">
        <div className="mx-auto flex max-w-[94rem] flex-col gap-5 px-5 py-9 text-[10px] uppercase tracking-[0.15em] text-[#211c18]/46 sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-12">
          <span className="[font-family:Georgia,'Times_New_Roman',serif] text-base normal-case italic text-[#211c18]">
            Mara Bell
          </span>
          <span>marabell.studio · Fictional website concept by Rukh Labs.</span>
          <a href="#atelier-top" className={`text-[#7d2a24] ${focus}`}>
            Back to top ↑
          </a>
        </div>
      </footer>
    </article>
  );
}
