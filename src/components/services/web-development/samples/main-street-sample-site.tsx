import { ArrowRight, Check, Clock, MapPin, Menu } from "lucide-react";
import { MainStreetMenu } from "./main-street-menu";

const mainStreetMailto =
  "mailto:rukhlabs@gmail.com?subject=Main%20Street%20Website%20Direction%20Inquiry";

const mainStreetNav = [
  { label: "Menu", href: "#mainstreet-menu" },
  { label: "Our bakery", href: "#mainstreet-story" },
  { label: "Catering", href: "#mainstreet-catering" },
  { label: "Visit", href: "#mainstreet-visit" },
] as const;

const focus =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#173f32]";

export function MainStreetSampleSite() {
  return (
    <article className="min-h-screen overflow-hidden bg-[#fff8e9] text-[#173f32] [color-scheme:light]">
      <header className="sticky top-0 z-50 border-b border-[#173f32]/14 bg-[#fff8e9]/94 backdrop-blur-xl">
        <div className="mx-auto flex h-18 max-w-[94rem] items-center justify-between gap-5 px-5 sm:px-8 lg:px-12">
          <a
            href="#mainstreet-top"
            className={`flex items-center gap-2.5 text-base font-black tracking-[-0.04em] ${focus}`}
          >
            <span className="grid size-8 place-items-center rounded-full bg-[#d9673f] text-sm text-white">
              J
            </span>
            Juniper &amp; Pine
          </a>

          <nav
            aria-label="Juniper and Pine sample navigation"
            className="hidden items-center gap-7 lg:flex"
          >
            {mainStreetNav.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className={`text-sm font-bold text-[#173f32]/62 transition hover:text-[#d35b35] ${focus}`}
              >
                {item.label}
              </a>
            ))}
            <a
              href="#mainstreet-menu"
              className={`inline-flex min-h-11 items-center rounded-full bg-[#173f32] px-5 text-sm font-bold text-[#fff8e9] transition hover:bg-[#245a49] ${focus}`}
            >
              See today&apos;s menu
            </a>
          </nav>

          <details className="group relative lg:hidden">
            <summary
              className={`flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-full border border-[#173f32]/20 px-3 text-xs font-black uppercase tracking-[0.1em] [&::-webkit-details-marker]:hidden ${focus}`}
            >
              <Menu aria-hidden className="size-4" />
              Menu
            </summary>
            <nav
              aria-label="Juniper and Pine mobile sample navigation"
              className="absolute right-0 top-[calc(100%+0.65rem)] grid w-64 rounded-2xl border border-[#173f32]/14 bg-[#fffdf7] p-2 shadow-[0_24px_70px_rgba(23,63,50,0.18)]"
            >
              {mainStreetNav.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className={`flex min-h-11 items-center rounded-xl px-3 text-sm font-bold text-[#173f32]/68 hover:bg-[#f3e5c9] hover:text-[#173f32] ${focus}`}
                >
                  {item.label}
                </a>
              ))}
            </nav>
          </details>
        </div>
      </header>

      <section
        id="mainstreet-top"
        aria-labelledby="mainstreet-heading"
        className="relative scroll-mt-24 border-b border-[#173f32]/14"
      >
        <div className="mx-auto grid min-h-[calc(100vh-4.5rem)] max-w-[94rem] items-center gap-12 px-5 py-16 sm:px-8 lg:grid-cols-[1.02fr_0.98fr] lg:px-12 lg:py-24">
          <div className="relative z-10">
            <p className="text-xs font-black uppercase tracking-[0.15em] text-[#d35b35]">
              Neighborhood bakery + café
            </p>
            <h1
              id="mainstreet-heading"
              className="mt-6 max-w-[10ch] text-[clamp(4rem,8.5vw,8.5rem)] font-black leading-[0.82] tracking-[-0.075em]"
            >
              Good mornings, made here.
            </h1>
            <p className="mt-8 max-w-xl text-lg leading-8 text-[#173f32]/64">
              Fresh bread, bright coffee, and a table waiting in Brookvale.
              Everything is baked in small batches before the doors open.
            </p>
            <div className="mt-8 inline-flex min-h-10 items-center gap-2 rounded-full bg-[#f1dfbf] px-4 text-sm font-bold text-[#173f32]">
              <Clock aria-hidden className="size-4 text-[#d35b35]" />
              Open Tue–Sun · 7am–3pm
            </div>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a
                href="#mainstreet-menu"
                className={`inline-flex min-h-12 items-center justify-center gap-3 rounded-full bg-[#173f32] px-6 text-sm font-bold text-[#fff8e9] transition hover:bg-[#245a49] ${focus}`}
              >
                See today&apos;s menu
                <ArrowRight aria-hidden className="size-4" />
              </a>
              <a
                href="#mainstreet-visit"
                className={`inline-flex min-h-12 items-center justify-center rounded-full border border-[#173f32]/22 px-6 text-sm font-bold transition hover:border-[#d35b35] hover:text-[#d35b35] ${focus}`}
              >
                Plan your visit
              </a>
            </div>
          </div>

          <figure className="relative mx-auto aspect-square w-full max-w-[38rem]">
            <div
              aria-hidden
              className="absolute inset-[2%] rounded-[38%_62%_46%_54%] bg-[#efb84c]"
            />
            <div
              aria-hidden
              className="absolute inset-[18%_10%_13%_30%] rotate-6 rounded-[58%_42%_60%_40%] bg-[#d9673f]"
            />
            <div
              aria-hidden
              className="absolute bottom-[18%] left-[9%] h-[28%] w-[38%] rounded-[50%_50%_42%_42%] border-[12px] border-[#fff8e9] bg-[#8c512e]"
            />
            <div
              aria-hidden
              className="absolute right-[18%] top-[20%] aspect-[1.2/1] w-[42%] rounded-[50%_52%_45%_48%] bg-[#f5d69a] shadow-[-12px_14px_0_rgba(23,63,50,0.14)]"
            >
              <span className="absolute left-[19%] top-[25%] h-[8%] w-[62%] -rotate-6 rounded-full bg-[#b66e3e]" />
              <span className="absolute left-[24%] top-[46%] h-[8%] w-[54%] -rotate-6 rounded-full bg-[#b66e3e]" />
            </div>
            <figcaption className="absolute bottom-[5%] right-[5%] rounded-full bg-[#fffdf7] px-4 py-2 text-xs font-black shadow-[0_10px_30px_rgba(23,63,50,0.14)]">
              Baked before sunrise
            </figcaption>
          </figure>
        </div>
      </section>

      <ul className="mx-auto grid max-w-[94rem] grid-cols-2 border-b border-[#173f32]/14 px-5 sm:px-8 lg:grid-cols-4 lg:px-12">
        {[
          "Baked here daily",
          "Locally roasted coffee",
          "Plant-forward lunch",
          "Catering for 8–80",
        ].map((item, index) => (
          <li
            key={item}
            className="flex min-h-20 items-center gap-3 border-b border-[#173f32]/10 px-2 text-xs font-black uppercase leading-5 tracking-[0.1em] text-[#173f32]/58 odd:border-r sm:px-4 lg:border-b-0 lg:border-r lg:first:pl-0 lg:last:border-r-0"
          >
            <span className="grid size-6 shrink-0 place-items-center rounded-full bg-[#efb84c] text-[10px] text-[#173f32]">
              {index + 1}
            </span>
            {item}
          </li>
        ))}
      </ul>

      <section
        id="mainstreet-menu"
        aria-labelledby="mainstreet-menu-heading"
        className="scroll-mt-24 border-b border-[#173f32]/14"
      >
        <div className="mx-auto max-w-[94rem] px-5 py-24 sm:px-8 lg:px-12 lg:py-32">
          <div className="grid gap-7 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.15em] text-[#d35b35]">
                Today&apos;s menu
              </p>
              <h2
                id="mainstreet-menu-heading"
                className="mt-5 max-w-[10ch] text-4xl font-black leading-[0.92] tracking-[-0.055em] sm:text-6xl"
              >
                A little something for right now.
              </h2>
            </div>
            <p className="max-w-xl text-base leading-8 text-[#173f32]/58 lg:justify-self-end">
              The counter follows the season and the oven. These are the things
              we&apos;re making today; when they&apos;re gone, tomorrow gets its turn.
            </p>
          </div>

          <MainStreetMenu />
        </div>
      </section>

      <section className="border-b border-[#173f32]/14 bg-[#173f32] text-[#fff8e9]">
        <div className="mx-auto grid max-w-[94rem] gap-10 px-5 py-20 sm:px-8 lg:grid-cols-[0.86fr_1.14fr] lg:px-12 lg:py-24">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.15em] text-[#efb84c]">
              This week at the counter
            </p>
            <h2 className="mt-5 max-w-[9ch] text-4xl font-black leading-[0.92] tracking-[-0.055em] sm:text-6xl">
              The season brought rhubarb.
            </h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              ["Rhubarb custard danish", "Flaky, tart, vanilla-soft"],
              ["Spring herb focaccia", "Chive, parsley, young garlic"],
              ["Strawberry cream cake", "Brown sugar sponge, berries, cream"],
            ].map(([name, description], index) => (
              <article
                key={name}
                className="relative min-h-52 overflow-hidden rounded-[1.5rem] border border-[#fff8e9]/14 p-5"
              >
                <div
                  aria-hidden
                  className={`absolute -right-8 -top-8 size-28 rounded-[44%_56%_62%_38%] ${
                    index === 0
                      ? "bg-[#d9673f]"
                      : index === 1
                        ? "bg-[#7c9a5e]"
                        : "bg-[#efb84c]"
                  }`}
                />
                <span className="relative text-xs font-black text-[#efb84c]">
                  0{index + 1}
                </span>
                <h3 className="relative mt-16 text-xl font-extrabold leading-tight">
                  {name}
                </h3>
                <p className="relative mt-3 text-sm leading-6 text-[#fff8e9]/56">
                  {description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section
        id="mainstreet-story"
        aria-labelledby="mainstreet-story-heading"
        className="scroll-mt-24 border-b border-[#173f32]/14"
      >
        <div className="mx-auto grid max-w-[94rem] gap-12 px-5 py-24 sm:px-8 lg:grid-cols-[0.9fr_1.1fr] lg:px-12 lg:py-32">
          <div className="relative min-h-[28rem] overflow-hidden rounded-[2.5rem] bg-[#f1dfbf]">
            <div
              aria-hidden
              className="absolute left-[12%] top-[10%] size-[42%] rounded-[62%_38%_54%_46%] bg-[#efb84c]"
            />
            <div
              aria-hidden
              className="absolute bottom-[8%] right-[9%] size-[54%] rounded-[42%_58%_37%_63%] bg-[#d9673f]"
            />
            <div
              aria-hidden
              className="absolute inset-[24%] rounded-[50%_50%_45%_55%] border-[18px] border-[#173f32]/75"
            />
            <span className="absolute bottom-8 left-8 max-w-[8ch] text-4xl font-black leading-[0.92] tracking-[-0.05em]">
              Since the borrowed mixer.
            </span>
          </div>

          <div className="lg:py-10">
            <p className="text-xs font-black uppercase tracking-[0.15em] text-[#d35b35]">
              Our bakery
            </p>
            <h2
              id="mainstreet-story-heading"
              className="mt-5 max-w-[9ch] text-4xl font-black leading-[0.92] tracking-[-0.055em] sm:text-6xl"
            >
              Built for the block.
            </h2>
            <p className="mt-7 max-w-xl text-lg leading-9 text-[#173f32]/62">
              Juniper &amp; Pine began with a borrowed mixer, a six-seat counter,
              and the belief that everyday food deserves care. The counter is
              bigger now. The idea is not.
            </p>
            <ul className="mt-9 grid gap-3 sm:grid-cols-3">
              {[
                "Small batches",
                "Regional ingredients",
                "Room to linger",
              ].map((value) => (
                <li
                  key={value}
                  className="flex min-h-20 items-center gap-3 rounded-2xl border border-[#173f32]/14 bg-[#fffdf7] px-4 text-sm font-bold"
                >
                  <Check aria-hidden className="size-4 text-[#d35b35]" />
                  {value}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section
        id="mainstreet-catering"
        aria-labelledby="mainstreet-catering-heading"
        className="scroll-mt-24 border-b border-[#173f32]/14 bg-[#f3e5c9]"
      >
        <div className="mx-auto max-w-[94rem] px-5 py-24 sm:px-8 lg:px-12 lg:py-28">
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.15em] text-[#d35b35]">
                Catering for 8–80
              </p>
              <h2
                id="mainstreet-catering-heading"
                className="mt-5 max-w-[10ch] text-4xl font-black leading-[0.92] tracking-[-0.055em] sm:text-6xl"
              >
                Bring the good part of morning.
              </h2>
              <p className="mt-6 max-w-xl text-base leading-8 text-[#173f32]/60">
                Simple food that travels well, arrives ready, and still tastes
                like it came from a neighborhood bakery.
              </p>
              <a
                href={mainStreetMailto}
                className={`mt-8 inline-flex min-h-12 items-center justify-center gap-3 rounded-full bg-[#d9673f] px-6 text-sm font-bold text-white transition hover:bg-[#c5512f] ${focus}`}
              >
                Ask about catering
                <ArrowRight aria-hidden className="size-4" />
              </a>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                ["Breakfast boxes", "Pastry, fruit, yogurt, and house coffee"],
                ["Pastry boards", "A generous mix for meetings and gatherings"],
                ["Sandwich lunches", "Seasonal sandwiches, salad, and something sweet"],
                ["Celebration cakes", "Small-batch cakes sized for the room"],
              ].map(([title, description], index) => (
                <article
                  key={title}
                  className="rounded-[1.5rem] border border-[#173f32]/14 bg-[#fff8e9] p-5"
                >
                  <span className="text-xs font-black text-[#d35b35]">
                    0{index + 1}
                  </span>
                  <h3 className="mt-7 text-xl font-extrabold">{title}</h3>
                  <p className="mt-3 text-sm leading-6 text-[#173f32]/56">
                    {description}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section
        id="mainstreet-visit"
        aria-labelledby="mainstreet-visit-heading"
        className="scroll-mt-24"
      >
        <div className="mx-auto grid max-w-[94rem] gap-10 px-5 py-24 sm:px-8 lg:grid-cols-[0.82fr_1.18fr] lg:px-12 lg:py-32">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.15em] text-[#d35b35]">
              Come by
            </p>
            <h2
              id="mainstreet-visit-heading"
              className="mt-5 max-w-[9ch] text-4xl font-black leading-[0.92] tracking-[-0.055em] sm:text-6xl"
            >
              Your table is by the window.
            </h2>
          </div>
          <div className="overflow-hidden rounded-[2rem] border border-[#173f32]/14 bg-[#fffdf7]">
            <div className="grid sm:grid-cols-2">
              <div className="border-b border-[#173f32]/12 p-6 sm:border-b-0 sm:border-r sm:p-8">
                <MapPin aria-hidden className="size-5 text-[#d35b35]" />
                <p className="mt-5 text-xs font-black uppercase tracking-[0.12em] text-[#173f32]/42">
                  Sample location
                </p>
                <address className="mt-3 text-xl font-extrabold not-italic">
                  184 Pine Street
                  <br />
                  Brookvale
                </address>
                <p className="mt-4 text-sm leading-6 text-[#173f32]/54">
                  This address is fictional and shown only for the website sample.
                </p>
              </div>
              <div className="p-6 sm:p-8">
                <Clock aria-hidden className="size-5 text-[#d35b35]" />
                <p className="mt-5 text-xs font-black uppercase tracking-[0.12em] text-[#173f32]/42">
                  Bakery hours
                </p>
                <dl className="mt-3 grid grid-cols-[1fr_auto] gap-x-6 gap-y-2 text-sm">
                  <dt>Tuesday–Friday</dt>
                  <dd className="font-bold">7am–3pm</dd>
                  <dt>Saturday–Sunday</dt>
                  <dd className="font-bold">8am–3pm</dd>
                  <dt>Monday</dt>
                  <dd className="font-bold text-[#d35b35]">Closed</dd>
                </dl>
              </div>
            </div>
            <div className="flex flex-col gap-4 border-t border-[#173f32]/12 bg-[#efb84c] p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
              <p className="max-w-lg text-sm font-bold leading-6">
                Questions about a menu, visit, or project like this sample?
              </p>
              <a
                href={mainStreetMailto}
                className={`inline-flex min-h-11 items-center justify-center rounded-full bg-[#173f32] px-5 text-sm font-bold text-[#fff8e9] ${focus}`}
              >
                Ask a question
              </a>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-[#173f32]/14 bg-[#173f32] text-[#fff8e9]">
        <div className="mx-auto grid max-w-[94rem] gap-8 px-5 py-10 sm:px-8 md:grid-cols-3 lg:px-12">
          <div>
            <strong className="text-lg font-black">Juniper &amp; Pine</strong>
            <p className="mt-2 text-xs text-[#fff8e9]/48">juniperandpine.com</p>
          </div>
          <nav aria-label="Juniper and Pine footer sample navigation">
            <ul className="grid grid-cols-2 gap-3 text-xs font-bold text-[#fff8e9]/62">
              {mainStreetNav.map((item) => (
                <li key={item.href}>
                  <a
                    href={item.href}
                    className="hover:text-[#efb84c] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#efb84c]"
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          <div className="text-xs leading-6 text-[#fff8e9]/48 md:text-right">
            <p>Fictional website concept created by Rukh Labs.</p>
            <a
              href="#mainstreet-top"
              className="mt-2 inline-block font-bold text-[#efb84c] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#efb84c]"
            >
              Back to top ↑
            </a>
          </div>
        </div>
      </footer>
    </article>
  );
}
