import {
  ArrowDownRight,
  ArrowRight,
  BadgeCheck,
  Bookmark,
  BriefcaseBusiness,
  Camera,
  Check,
  Clapperboard,
  Eye,
  Heart,
  Mail,
  Music2,
  Play,
  Sparkles,
} from "lucide-react";
import { SampleMobileMenu } from "./sample-mobile-menu";
import { SpotlightContentGrid } from "./spotlight-content-grid";

const spotlightProjectHref = "/contact?inquiry=website&design=spotlight";

const spotlightNav = [
  { label: "Watch", href: "#spotlight-watch" },
  { label: "The Edit", href: "#spotlight-edit" },
  { label: "Partnerships", href: "#spotlight-partnerships" },
  { label: "About", href: "#spotlight-about" },
] as const;

const heroReels = [
  {
    label: "48 hours in Lisbon",
    meta: "Instagram · 1.8M views",
    tone:
      "bg-[radial-gradient(circle_at_68%_18%,rgba(255,255,255,0.48),transparent_18%),radial-gradient(circle_at_22%_62%,rgba(255,211,173,0.58),transparent_22%),linear-gradient(155deg,#ff9b86,#ef547d_46%,#6d59df)]",
  },
  {
    label: "3 pieces on repeat",
    meta: "TikTok · 842K views",
    tone:
      "bg-[radial-gradient(circle_at_34%_18%,rgba(255,255,255,0.3),transparent_19%),linear-gradient(155deg,#9889ff,#5949dd_48%,#211d3a)]",
  },
  {
    label: "Actually worth the save",
    meta: "TikTok · 614K views",
    tone:
      "bg-[radial-gradient(circle_at_70%_20%,rgba(255,255,255,0.4),transparent_17%),linear-gradient(155deg,#ffd8ca,#ff9a7e_48%,#ed5680)]",
  },
] as const;

const socialProof = [
  {
    platform: "Instagram",
    value: "642K",
    label: "followers",
    icon: Camera,
  },
  {
    platform: "TikTok",
    value: "518K",
    label: "followers",
    icon: Music2,
  },
  {
    platform: "YouTube",
    value: "126K",
    label: "subscribers",
    icon: Clapperboard,
  },
  {
    platform: "Average",
    value: "14.8K",
    label: "saves per post",
    icon: Bookmark,
  },
] as const;

const creatorPlatforms = [
  { label: "Instagram", icon: Camera },
  { label: "TikTok", icon: Music2 },
  { label: "YouTube", icon: Clapperboard },
] as const;

const highlights = [
  {
    name: "Wear again",
    subtitle: "Outfit repeats",
    tone: "from-[#ff6e7f] to-[#ffad83]",
  },
  {
    name: "48 hours",
    subtitle: "City weekends",
    tone: "from-[#725cff] to-[#a78dff]",
  },
  {
    name: "The shelf",
    subtitle: "Beauty empties",
    tone: "from-[#f4a281] to-[#ff668c]",
  },
  {
    name: "Under $50",
    subtitle: "Useful finds",
    tone: "from-[#f0c473] to-[#bd766f]",
  },
  {
    name: "One bag",
    subtitle: "Travel systems",
    tone: "from-[#4db8a9] to-[#3c6ba0]",
  },
  {
    name: "Ask Mika",
    subtitle: "Community Q&A",
    tone: "from-[#ff5e8c] to-[#705bff]",
  },
] as const;

const editItems = [
  {
    eyebrow: "On repeat",
    title: "The carry-everywhere shoulder bag",
    copy: "Soft enough to pack flat, structured enough to find your keys.",
    note: "Purchased · not sponsored",
    tone:
      "bg-[radial-gradient(circle_at_67%_28%,rgba(255,255,255,0.7),transparent_18%),linear-gradient(145deg,#f4d4c4,#cb8e88_54%,#715269)]",
  },
  {
    eyebrow: "Used to empty",
    title: "The five-minute skin tint",
    copy: "Light coverage, no complicated prep, and a finish that still looks like skin.",
    note: "PR sample · repurchased",
    tone:
      "bg-[radial-gradient(circle_at_38%_23%,rgba(255,255,255,0.72),transparent_17%),linear-gradient(145deg,#ffd9ca,#f39b82_52%,#c8577d)]",
  },
  {
    eyebrow: "Travel tested",
    title: "The charger that replaced three",
    copy: "One compact brick for a phone, camera battery, and laptop.",
    note: "Affiliate link available",
    tone:
      "bg-[radial-gradient(circle_at_70%_26%,rgba(255,255,255,0.45),transparent_17%),linear-gradient(145deg,#9e95ff,#6757cf_52%,#29263f)]",
  },
] as const;

const partnershipPrinciples = [
  "The product must make sense for the audience before the deliverables do.",
  "Paid work is labeled clearly, with honest context about what was provided.",
  "Each format is made for the platform instead of cropped into six versions.",
] as const;

const partnershipMetrics = [
  { icon: Eye, value: "1.8M", label: "series views" },
  { icon: Bookmark, value: "31K", label: "saves" },
  { icon: Heart, value: "7.4%", label: "engagement" },
] as const;

const focus =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#5a43d8]";

export function SpotlightSampleSite() {
  return (
    <div className="min-h-screen overflow-x-clip bg-[#fffaf8] text-[#1b1824] [color-scheme:light]">
      <header className="sticky top-0 z-50 border-b border-[#1b1824]/10 bg-[#fffaf8]/92 backdrop-blur-xl">
        <div className="mx-auto flex min-h-18 max-w-[96rem] items-center justify-between gap-4 px-5 py-3 sm:px-8 lg:px-12">
          <a
            href="#spotlight-top"
            className={`flex min-w-0 items-center gap-2.5 ${focus}`}
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[conic-gradient(from_210deg,#ff5d78,#ffb073,#7d6cff,#ff5d78)] p-[2px]">
              <span className="grid size-full place-items-center rounded-full bg-[#1b1824] text-[9px] font-bold text-white">
                MR
              </span>
            </span>
            <span className="min-w-0">
              <strong className="flex items-center gap-1.5 truncate text-sm font-semibold tracking-[-0.025em]">
                Mika Rowe
                <BadgeCheck
                  aria-label="Verified creator"
                  className="size-4 fill-[#5a43d8] text-white"
                />
              </strong>
              <span className="block truncate text-[11px] text-[#1b1824]/62">
                @mikarowe
              </span>
            </span>
          </a>

          <nav
            aria-label="Mika Rowe sample navigation"
            className="hidden items-center gap-7 lg:flex"
          >
            {spotlightNav.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className={`text-xs font-semibold text-[#1b1824]/66 transition hover:text-[#c92f51] ${focus}`}
              >
                {item.label}
              </a>
            ))}
            <a
              href="#spotlight-partnerships"
              className={`inline-flex min-h-11 items-center gap-2 rounded-full bg-[#1b1824] px-5 text-xs font-semibold text-white transition hover:bg-[#5a43d8] ${focus}`}
            >
              Media kit preview
              <ArrowRight aria-hidden className="size-4" />
            </a>
          </nav>

          <SampleMobileMenu
            ariaLabel="Mika Rowe mobile sample navigation"
            summaryLabel="Menu"
            items={spotlightNav}
            cta={{
              label: "Media kit preview",
              href: "#spotlight-partnerships",
            }}
            summaryClassName={`flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-full border border-[#1b1824]/16 bg-white/70 px-3 text-xs font-semibold [&::-webkit-details-marker]:hidden ${focus}`}
            panelClassName="absolute right-0 top-[calc(100%+0.7rem)] grid w-64 rounded-2xl border border-[#1b1824]/12 bg-white p-2 shadow-[0_24px_70px_rgba(40,26,62,0.18)]"
            linkClassName={`flex min-h-11 items-center rounded-xl px-3 text-xs font-semibold text-[#1b1824]/66 hover:bg-[#f6efff] hover:text-[#5a43d8] ${focus}`}
            ctaClassName={`mt-2 inline-flex min-h-11 items-center justify-center rounded-xl bg-[#1b1824] px-4 text-xs font-semibold text-white ${focus}`}
          />
        </div>
      </header>

      <section
        id="spotlight-top"
        aria-labelledby="spotlight-heading"
        className="relative scroll-mt-24 border-b border-[#1b1824]/10"
      >
        <div
          aria-hidden
          className="absolute -right-48 top-10 size-[34rem] rounded-full bg-[radial-gradient(circle,rgba(255,91,127,0.2),transparent_67%)] blur-2xl"
        />
        <div
          aria-hidden
          className="absolute -left-48 bottom-[-10rem] size-[32rem] rounded-full bg-[radial-gradient(circle,rgba(116,95,255,0.15),transparent_67%)] blur-2xl"
        />
        <div className="mx-auto grid min-h-[calc(100vh-4.5rem)] max-w-[96rem] items-center gap-14 px-5 py-16 sm:px-8 lg:grid-cols-[0.9fr_1.1fr] lg:px-12 lg:py-24">
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#1b1824]/12 bg-white/74 px-4 py-2 text-xs font-semibold shadow-sm">
              <Sparkles aria-hidden className="size-4 text-[#c92f51]" />
              Style, places, and things actually worth saving
            </div>
            <h1
              id="spotlight-heading"
              className="mt-7 max-w-[10ch] text-[clamp(3.35rem,7.5vw,8.2rem)] font-semibold leading-[0.88] tracking-[-0.074em]"
            >
              What I&apos;d send the group chat.
            </h1>
            <p className="mt-7 max-w-2xl text-lg leading-8 text-[#1b1824]/62 sm:text-xl">
              Mika Rowe makes social-first stories about personal style, quick
              escapes, beauty that earns its shelf space, and the useful things
              between them.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a
                href="#spotlight-watch"
              className={`inline-flex min-h-12 items-center justify-center gap-3 rounded-full bg-[#5a43d8] px-6 text-sm font-semibold text-white transition hover:bg-[#4832bd] ${focus}`}
              >
                Browse what&apos;s new
                <ArrowDownRight aria-hidden className="size-4" />
              </a>
              <a
                href="#spotlight-edit"
                className={`inline-flex min-h-12 items-center justify-center gap-3 rounded-full border border-[#1b1824]/18 bg-white/70 px-6 text-sm font-semibold transition hover:border-[#c92f51]/40 hover:bg-white ${focus}`}
              >
                Browse The Edit
                <ArrowDownRight aria-hidden className="size-4" />
              </a>
            </div>
            <div className="mt-9 flex flex-wrap items-center gap-2">
              {creatorPlatforms.map(({ icon: Icon, label }) => (
                <span
                  key={label}
                  className="inline-flex items-center gap-2 rounded-full bg-[#1b1824]/[0.055] px-3 py-2 text-xs font-semibold text-[#1b1824]/62"
                >
                  <Icon aria-hidden className="size-4" />
                  {label}
                </span>
              ))}
            </div>
          </div>

          <figure className="relative z-10 mx-auto h-[27rem] w-full max-w-[43rem] sm:h-[39rem]">
            {heroReels.map((reel, index) => (
              <div
                key={reel.label}
                aria-hidden
                className={`absolute aspect-[9/14] overflow-hidden rounded-[1.7rem] border border-white/70 text-white shadow-[0_28px_75px_rgba(46,30,72,0.24)] ${reel.tone} ${
                  index === 0
                    ? "bottom-[4%] left-[2%] h-[72%] -rotate-6"
                    : index === 1
                      ? "left-1/2 top-0 z-10 h-[96%] -translate-x-1/2"
                      : "right-[2%] top-[12%] h-[72%] rotate-6"
                }`}
              >
                <div className="absolute inset-0 bg-gradient-to-t from-black/76 via-black/4 to-black/18" />
                <div className="relative flex h-full flex-col p-3 sm:p-5">
                  <div className="flex items-center justify-between gap-3 text-[9px] font-semibold sm:text-[11px]">
                    <span className="rounded-full bg-black/24 px-2.5 py-1.5 backdrop-blur">
                      {index === 0 ? "REEL" : index === 1 ? "TIKTOK" : "SHORT"}
                    </span>
                    <span className="rounded-full bg-black/24 px-2.5 py-1.5 backdrop-blur">
                      {index === 1 ? "0:31" : index === 0 ? "0:46" : "0:52"}
                    </span>
                  </div>
                  <span className="absolute left-1/2 top-[42%] grid size-10 -translate-x-1/2 place-items-center rounded-full bg-white/88 text-[#1b1824] shadow-lg sm:size-14">
                    <Play
                      aria-hidden
                      className="ml-0.5 size-3.5 fill-current sm:size-5"
                    />
                  </span>
                  <div className="mt-auto">
                    <strong className="block text-base leading-tight tracking-[-0.035em] sm:text-2xl">
                      {reel.label}
                    </strong>
                    <span className="mt-2 block text-[9px] text-white/72 sm:text-xs">
                      {reel.meta}
                    </span>
                  </div>
                </div>
              </div>
            ))}
            <figcaption className="sr-only">
              A stack of vertical creator videos for travel, personal style,
              and useful recommendations.
            </figcaption>
          </figure>
        </div>
      </section>

      <section
        aria-label="Illustrative social audience"
        className="border-b border-[#1b1824]/10 bg-[#1b1824] text-white"
      >
        <dl className="mx-auto grid max-w-[96rem] grid-cols-2 px-5 sm:px-8 lg:grid-cols-4 lg:px-12">
          {socialProof.map((metric, index) => {
            const Icon = metric.icon;

            return (
              <div
                key={metric.platform}
                className={`px-3 py-7 sm:px-5 lg:border-l lg:border-white/12 ${
                  index % 2 === 1 ? "border-l border-white/12" : ""
                } ${index > 1 ? "border-t border-white/12 lg:border-t-0" : ""} ${
                  index === 0 ? "lg:border-l-0" : ""
                }`}
              >
                <dt className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/58">
                  <Icon aria-hidden className="size-4" />
                  {metric.platform}
                </dt>
                <dd className="mt-3 text-3xl font-semibold tracking-[-0.055em] sm:text-4xl">
                  {metric.value}
                </dd>
                <span className="mt-1 block text-xs text-white/54">
                  {metric.label}
                </span>
              </div>
            );
          })}
        </dl>
        <p className="mx-auto max-w-[96rem] px-5 pb-4 text-[10px] text-white/48 sm:px-8 lg:px-12">
          Illustrative audience data for this fictional sample website.
        </p>
      </section>

      <section className="border-b border-[#1b1824]/10">
        <div className="mx-auto max-w-[96rem] px-5 py-16 sm:px-8 lg:px-12">
          <div className="flex items-end justify-between gap-6">
            <div>
                <p className="text-xs font-semibold text-[#c92f51]">
                Story highlights
              </p>
              <h2 className="mt-2 text-3xl font-semibold tracking-[-0.05em] sm:text-4xl">
                Start with your thing.
              </h2>
            </div>
            <span className="hidden text-xs font-semibold text-[#1b1824]/60 sm:block">
              Featured series
            </span>
          </div>
          <div className="mt-8 flex snap-x snap-mandatory gap-5 overflow-x-auto pb-3">
            {highlights.map((highlight) => (
              <div
                key={highlight.name}
                className="w-24 shrink-0 snap-start text-center"
              >
                <span
                  className={`mx-auto grid size-20 place-items-center rounded-full bg-gradient-to-br p-[3px] shadow-[0_10px_25px_rgba(56,37,86,0.12)] ${highlight.tone}`}
                >
                  <span className="grid size-full place-items-center rounded-full border-[3px] border-[#fffaf8] bg-[#1b1824] text-sm font-semibold text-white">
                    {highlight.name
                      .split(" ")
                      .map((word) => word[0])
                      .join("")}
                  </span>
                </span>
                <strong className="mt-3 block text-xs font-semibold">
                  {highlight.name}
                </strong>
                <span className="mt-1 block text-[10px] leading-4 text-[#1b1824]/62">
                  {highlight.subtitle}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section
        id="spotlight-watch"
        aria-labelledby="spotlight-watch-heading"
        className="scroll-mt-24 border-b border-[#1b1824]/10"
      >
        <div className="mx-auto max-w-[96rem] px-5 py-24 sm:px-8 lg:px-12 lg:py-32">
          <div className="grid gap-7 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
            <div>
              <p className="text-xs font-semibold text-[#c92f51]">
                Across the feed
              </p>
              <h2
                id="spotlight-watch-heading"
                className="mt-4 max-w-[10ch] text-5xl font-semibold leading-[0.94] tracking-[-0.065em] sm:text-7xl"
              >
                Watch now. Save for later.
              </h2>
            </div>
            <p className="max-w-2xl text-lg leading-8 text-[#1b1824]/58 lg:justify-self-end">
              Reels, TikToks, longer videos, and the useful details behind each
              one—organized without making people dig through six profiles.
            </p>
          </div>
          <SpotlightContentGrid />
        </div>
      </section>

      <section
        id="spotlight-edit"
        aria-labelledby="spotlight-edit-heading"
        className="scroll-mt-24 border-b border-[#1b1824]/10 bg-[#f6f1ff]"
      >
        <div className="mx-auto max-w-[96rem] px-5 py-24 sm:px-8 lg:px-12 lg:py-32">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold text-[#5a43d8]">The Edit</p>
            <h2
              id="spotlight-edit-heading"
              className="mt-4 text-5xl font-semibold leading-[0.94] tracking-[-0.065em] sm:text-7xl"
            >
              The links people keep asking for.
            </h2>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-[#1b1824]/58">
              A small, transparent collection of things Mika uses, repurchases,
              and recommends—with sponsorship and affiliate context kept clear.
            </p>
          </div>

          <div className="mt-12 grid gap-5 lg:grid-cols-3">
            {editItems.map((item) => (
              <article
                key={item.title}
                className="overflow-hidden rounded-[1.75rem] border border-[#1b1824]/10 bg-white shadow-[0_20px_60px_rgba(59,40,93,0.08)]"
              >
                <div className={`aspect-[4/3] ${item.tone}`} />
                <div className="p-6">
                  <span className="text-[11px] font-semibold text-[#c92f51]">
                    {item.eyebrow}
                  </span>
                  <h3 className="mt-3 text-2xl font-semibold leading-[1.02] tracking-[-0.045em]">
                    {item.title}
                  </h3>
                  <p className="mt-4 text-sm leading-7 text-[#1b1824]/64">
                    {item.copy}
                  </p>
                  <p className="mt-5 border-t border-[#1b1824]/10 pt-4 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#1b1824]/62">
                    {item.note}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section
        id="spotlight-partnerships"
        aria-labelledby="spotlight-partnerships-heading"
        className="scroll-mt-24 border-b border-white/10 bg-[#1b1824] text-white"
      >
        <div className="mx-auto grid max-w-[96rem] gap-12 px-5 py-24 sm:px-8 lg:grid-cols-[0.78fr_1.22fr] lg:px-12 lg:py-32">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-[#ffec7a] px-4 py-2 text-xs font-semibold text-[#1b1824]">
              <BriefcaseBusiness aria-hidden className="size-4" />
              Brand partnerships
            </div>
            <h2
              id="spotlight-partnerships-heading"
              className="mt-6 max-w-[10ch] text-5xl font-semibold leading-[0.94] tracking-[-0.065em] sm:text-7xl"
            >
              Built to earn the save.
            </h2>
            <p className="mt-7 max-w-xl text-lg leading-8 text-white/66">
              Good partnerships answer a real audience question. Mika works
              with style, travel, beauty, mobility, and everyday-tech brands
              that can stand up to an honest recommendation.
            </p>
          </div>

          <div className="grid gap-5">
            <article className="rounded-[2rem] border border-white/14 bg-white/[0.06] p-6 sm:p-8">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <span className="text-xs font-semibold text-[#ff9db0]">
                  Illustrative collaboration · Trailglass
                </span>
                <span className="rounded-full border border-white/16 px-3 py-1.5 text-[10px] font-semibold text-white/66">
                  Reel · TikTok · Story set
                </span>
              </div>
              <h3 className="mt-8 max-w-[18ch] text-3xl font-semibold leading-[0.98] tracking-[-0.05em] sm:text-5xl">
                One carry-on. Three rail cities. A recommendation that earned
                its place.
              </h3>
              <p className="mt-6 max-w-2xl text-base leading-8 text-white/64">
                A four-part series built around real packing choices, station
                transfers, and two weeks of use—not a product held up for six
                seconds.
              </p>
              <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {partnershipMetrics.map(({ icon: Icon, value, label }, index) => (
                  <div
                    key={label}
                    className={`rounded-2xl bg-white p-4 text-[#1b1824] ${
                      index === 2 ? "col-span-2 sm:col-span-1" : ""
                    }`}
                  >
                    <Icon aria-hidden className="size-4 text-[#5a43d8]" />
                    <strong className="mt-4 block text-2xl font-semibold">
                      {value}
                    </strong>
                    <span className="mt-1 block text-[10px] font-semibold uppercase tracking-[0.1em] text-[#1b1824]/62">
                      {label}
                    </span>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-[10px] text-white/48">
                Illustrative results for this fictional sample.
              </p>
            </article>

            <ul className="grid gap-3">
              {partnershipPrinciples.map((principle) => (
                <li
                  key={principle}
                  className="flex items-start gap-4 rounded-2xl border border-white/12 px-5 py-4 text-sm leading-7 text-white/68"
                >
                  <Check
                    aria-hidden
                    className="mt-1 size-4 shrink-0 text-[#ff9db0]"
                    strokeWidth={2.5}
                  />
                  {principle}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section
        id="spotlight-about"
        aria-labelledby="spotlight-about-heading"
        className="scroll-mt-24 border-b border-[#1b1824]/10"
      >
        <div className="mx-auto grid max-w-[96rem] gap-12 px-5 py-24 sm:px-8 lg:grid-cols-[0.82fr_1.18fr] lg:px-12 lg:py-32">
          <div
            aria-hidden
            className="relative min-h-[29rem] overflow-hidden rounded-[2rem] bg-[radial-gradient(circle_at_46%_28%,rgba(255,255,255,0.62),transparent_18%),linear-gradient(145deg,#ffc0b1,#f16d88_46%,#775fff)] shadow-[0_28px_75px_rgba(54,36,84,0.17)]"
          >
            <span className="absolute left-1/2 top-[31%] grid size-40 -translate-x-1/2 place-items-center rounded-full border border-white/45 bg-white/18 text-6xl font-semibold tracking-[-0.08em] text-white backdrop-blur-sm">
              MR
            </span>
            <span className="absolute inset-x-6 bottom-6 rounded-2xl border border-white/24 bg-black/20 p-5 text-white backdrop-blur-md">
              <strong className="block text-lg font-semibold">Mika Rowe</strong>
              <span className="mt-1 block text-xs text-white/72">
                Creator · storyteller · professional friend with the link
              </span>
            </span>
          </div>

          <div className="self-center">
            <p className="text-xs font-semibold text-[#c92f51]">About Mika</p>
            <h2
              id="spotlight-about-heading"
              className="mt-4 max-w-[11ch] text-5xl font-semibold leading-[0.94] tracking-[-0.065em] sm:text-7xl"
            >
              Taste is useful when it is honest.
            </h2>
            <p className="mt-7 max-w-2xl text-lg leading-8 text-[#1b1824]/60">
              Mika makes polished, candid content about the choices that shape
              everyday life: what to wear again, where to spend a weekend, what
              deserves space on the shelf, and what is not worth the hype.
            </p>
            <div className="mt-8 flex flex-wrap gap-2">
              {[
                "Personal style",
                "Weekend travel",
                "Beauty",
                "Useful technology",
                "Real-life recommendations",
              ].map((topic) => (
                <span
                  key={topic}
                  className="rounded-full border border-[#1b1824]/12 bg-white px-4 py-2 text-xs font-semibold text-[#1b1824]/62"
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
        className="scroll-mt-24 bg-[linear-gradient(135deg,#ffeff3,#f0edff)]"
      >
        <div className="mx-auto max-w-[96rem] px-5 py-24 sm:px-8 lg:px-12 lg:py-32">
          <div className="grid gap-9 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <p className="text-xs font-semibold text-[#5a43d8]">
                Build the creator home behind the feed
              </p>
              <h2
                id="spotlight-contact-heading"
                className="mt-4 max-w-[14ch] text-5xl font-semibold leading-[0.94] tracking-[-0.065em] sm:text-7xl"
              >
                Make every platform point somewhere memorable.
              </h2>
            </div>
            <a
              href={spotlightProjectHref}
              className={`inline-flex min-h-14 items-center justify-center gap-3 rounded-full bg-[#1b1824] px-7 text-sm font-semibold text-white transition hover:bg-[#5a43d8] ${focus}`}
            >
              <Mail aria-hidden className="size-4" />
              Build a creator site like this
              <ArrowRight aria-hidden className="size-4" />
            </a>
          </div>
        </div>
      </section>

      <footer className="bg-[#1b1824] text-white">
        <div className="mx-auto flex max-w-[96rem] flex-col gap-6 px-5 py-9 sm:px-8 md:flex-row md:items-center md:justify-between lg:px-12">
          <a
            href="#spotlight-top"
            className={`flex items-center gap-2 text-sm font-semibold ${focus}`}
          >
            <span className="grid size-8 place-items-center rounded-full bg-[conic-gradient(from_210deg,#ff5d78,#ffb073,#7d6cff,#ff5d78)] p-[2px]">
              <span className="grid size-full place-items-center rounded-full bg-[#1b1824] text-[8px] font-bold">
                MR
              </span>
            </span>
            @mikarowe
          </a>
          <p className="text-xs leading-6 text-white/58">
            Fictional social-first creator concept by Rukh Labs.
          </p>
          <a
            href="#spotlight-partnerships"
            className={`inline-flex items-center gap-2 text-xs font-semibold text-[#ff9db0] transition hover:text-white ${focus}`}
          >
            Partnership details
            <ArrowRight aria-hidden className="size-4" />
          </a>
        </div>
      </footer>
    </div>
  );
}
