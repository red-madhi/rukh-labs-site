import { cn } from "@/lib/utils";
import {
  getDesignDirection,
  type DesignDirectionSlug,
} from "@/lib/web-development";

type DesignPreviewSize = "mini" | "card" | "full";

type DesignPreviewProps = {
  slug: DesignDirectionSlug;
  size?: DesignPreviewSize;
  className?: string;
};

type DirectionPreviewProps = {
  size: DesignPreviewSize;
};

function BrowserShell({
  slug,
  size,
  className,
  children,
}: DesignPreviewProps & {
  children: React.ReactNode;
}) {
  const direction = getDesignDirection(slug);

  return (
    <div
      role="img"
      aria-label={`${direction?.name ?? slug} website design direction preview`}
      className={cn(
        "overflow-hidden rounded-[1.15rem] border border-black/45 bg-[#111217] shadow-[0_24px_70px_rgba(0,0,0,0.34)]",
        size === "mini" && "h-44 rounded-xl",
        size === "card" && "h-[18rem] sm:h-[20rem]",
        size === "full" && "h-[25rem] sm:h-[32rem] lg:h-[38rem]",
        className,
      )}
    >
      <div aria-hidden="true" className="h-full">
        <div className="flex h-8 items-center gap-1.5 border-b border-white/10 bg-[#17181d] px-3">
          <span className="size-1.5 rounded-full bg-[#ff6b66]" />
          <span className="size-1.5 rounded-full bg-[#e8b84f]" />
          <span className="size-1.5 rounded-full bg-[#58b979]" />
          <span className="ml-2 truncate text-[8px] font-medium tracking-wide text-white/38">
            {direction?.sampleDomain}
          </span>
        </div>
        <div className="h-[calc(100%-2rem)] overflow-hidden">{children}</div>
      </div>
    </div>
  );
}

function ObsidianPreview({ size }: DirectionPreviewProps) {
  const mini = size === "mini";
  const full = size === "full";

  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-[#06080c] p-3 text-[#f2f5ec] sm:p-4">
      <div className="absolute right-[-9%] top-[10%] aspect-square w-[54%] rounded-full border border-[#c8ff41]/16 bg-[radial-gradient(circle_at_42%_36%,rgba(200,255,65,0.4),rgba(41,62,20,0.2)_18%,rgba(6,8,12,0)_63%)] shadow-[0_0_65px_rgba(200,255,65,0.12)]">
        <div className="absolute inset-[14%] rounded-full border border-white/10" />
        <div className="absolute inset-[31%] rounded-full border border-[#c8ff41]/25 bg-[#0d1110]" />
        <div className="absolute left-[16%] top-1/2 h-px w-[68%] -rotate-12 bg-[linear-gradient(90deg,transparent,#c8ff41,transparent)] opacity-55" />
      </div>
      <header className="relative z-10 flex items-center justify-between border-b border-white/14 pb-2 font-mono">
        <span
          className={cn(
            "font-semibold tracking-[0.18em]",
            mini ? "text-[7px]" : full ? "text-xs" : "text-[9px]",
          )}
        >
          NORTHSTAR
        </span>
        {!mini ? (
          <div className={cn("flex items-center gap-4 text-white/48", full ? "text-[10px]" : "text-[7px]")}>
            <span>Platform</span>
            <span>Mission</span>
            <span className="border border-[#c8ff41]/45 px-2 py-1 text-[#dfff8c]">
              Request access
            </span>
          </div>
        ) : (
          <span className="h-1 w-8 bg-[#c8ff41]/70" />
        )}
      </header>
      <main className="relative z-10 flex flex-1 flex-col justify-center">
        <span
          className={cn(
            "font-mono uppercase tracking-[0.22em] text-[#c8ff41]",
            mini ? "text-[6px]" : full ? "text-[10px]" : "text-[7px]",
          )}
        >
          Northstar 02 / Launch systems
        </span>
        <h3
          className={cn(
            "mt-2 max-w-[68%] font-semibold uppercase leading-[0.9] tracking-[-0.055em]",
            mini
              ? "text-xl"
              : full
                ? "mt-4 text-3xl sm:text-6xl lg:text-7xl"
                : "text-3xl sm:text-4xl",
          )}
        >
          Build for orbit.
        </h3>
        {!mini ? (
          <p
            className={cn(
              "mt-3 max-w-[48%] leading-relaxed text-white/52",
              full ? "text-sm" : "text-[9px]",
            )}
          >
            A compact inference platform for work that cannot wait.
          </p>
        ) : null}
      </main>
      <footer
        className={cn(
          "relative z-10 grid grid-cols-3 border-t border-white/14 pt-2 font-mono uppercase tracking-[0.16em] text-white/38",
          mini ? "text-[5px]" : full ? "text-[9px]" : "text-[6px]",
        )}
      >
        <span>Edge compute</span>
        <span>Private by design</span>
        <span className="text-right text-[#c8ff41]">Explore platform →</span>
      </footer>
    </div>
  );
}

function SignalPreview({ size }: DirectionPreviewProps) {
  const mini = size === "mini";
  const full = size === "full";

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#f4f6f8] p-3 text-[#10213d] sm:p-4">
      <header className="flex items-center justify-between border-b border-[#10213d]/18 pb-2">
        <span
          className={cn(
            "font-bold tracking-[-0.03em]",
            mini ? "text-[8px]" : full ? "text-sm" : "text-[10px]",
          )}
        >
          CEDAR<span className="text-[#2159d1]">/</span>STRATEGY
        </span>
        {!mini ? (
          <div className={cn("flex items-center gap-4 font-medium", full ? "text-[10px]" : "text-[7px]")}>
            <span>Services</span>
            <span>Insights</span>
            <span className="bg-[#173f99] px-2.5 py-1.5 text-white">Book a call</span>
          </div>
        ) : (
          <span className="h-1.5 w-8 bg-[#2159d1]" />
        )}
      </header>
      <main className={cn("grid flex-1 gap-3 pt-3", mini ? "grid-cols-[1.35fr_0.65fr]" : "grid-cols-[1.15fr_0.85fr]")}>
        <div className="flex flex-col justify-between">
          <div>
            <span
              className={cn(
                "font-semibold uppercase tracking-[0.16em] text-[#2159d1]",
                mini ? "text-[5px]" : full ? "text-[9px]" : "text-[6px]",
              )}
            >
              Strategy + operating clarity
            </span>
            <h3
              className={cn(
                "mt-2 max-w-[12ch] font-semibold leading-[0.98] tracking-[-0.045em]",
                mini
                  ? "text-lg"
                  : full
                    ? "mt-4 text-3xl sm:text-5xl lg:text-6xl"
                    : "text-2xl sm:text-3xl",
              )}
            >
              Clear thinking for complex growth.
            </h3>
            {!mini ? (
              <p className={cn("mt-3 max-w-[48ch] leading-relaxed text-[#10213d]/62", full ? "text-sm" : "text-[9px]")}>
                Practical strategy and operating support for teams navigating consequential change.
              </p>
            ) : null}
          </div>
          <div className={cn("flex items-center gap-3 font-semibold text-[#173f99]", mini ? "text-[6px]" : full ? "text-xs" : "text-[8px]")}>
            <span className="h-px w-8 bg-[#2159d1]" />
            View capabilities
          </div>
        </div>
        <aside className="grid content-start border-l border-[#10213d]/16 pl-3">
          <span className={cn("uppercase tracking-[0.14em] text-[#10213d]/48", mini ? "text-[5px]" : full ? "text-[8px]" : "text-[6px]")}>
            Selected outcomes
          </span>
          <div className="mt-2 border-t border-[#10213d]/18 py-2">
            <strong className={cn("block tracking-[-0.04em]", mini ? "text-base" : full ? "text-3xl" : "text-xl")}>37</strong>
            <span className={cn("text-[#10213d]/54", mini ? "text-[5px]" : full ? "text-[9px]" : "text-[6px]")}>
              Growth engagements
            </span>
          </div>
          <div className="border-t border-[#10213d]/18 py-2">
            <strong className={cn("block tracking-[-0.04em]", mini ? "text-base" : full ? "text-3xl" : "text-xl")}>4.8×</strong>
            <span className={cn("text-[#10213d]/54", mini ? "text-[5px]" : full ? "text-[9px]" : "text-[6px]")}>
              Median client return
            </span>
          </div>
          {!mini ? (
            <div className="mt-1 bg-[#dfe7f8] p-2">
              <span className={cn("font-semibold", full ? "text-[10px]" : "text-[7px]")}>
                Featured: Market expansion
              </span>
            </div>
          ) : null}
        </aside>
      </main>
    </div>
  );
}

function AtelierPreview({ size }: DirectionPreviewProps) {
  const mini = size === "mini";
  const full = size === "full";

  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-[#eee7d8] p-3 text-[#211c18] sm:p-4">
      <header className="flex items-start justify-between">
        <span
          className={cn(
            "[font-family:Georgia,'Times_New_Roman',serif] italic",
            mini ? "text-[9px]" : full ? "text-base" : "text-xs",
          )}
        >
          Mara Bell
        </span>
        <div
          className={cn(
            "flex gap-4 uppercase tracking-[0.18em] text-[#211c18]/55",
            mini ? "text-[5px]" : full ? "text-[9px]" : "text-[6px]",
          )}
        >
          <span>Work</span>
          <span>Index</span>
          {!mini ? <span>About</span> : null}
        </div>
      </header>
      <main className="grid flex-1 grid-cols-[0.78fr_1.22fr] items-center gap-3">
        <div className="relative z-10">
          <span
            className={cn(
              "uppercase tracking-[0.2em] text-[#7d2a24]",
              mini ? "text-[5px]" : full ? "text-[9px]" : "text-[6px]",
            )}
          >
            Selected works / 2023—26
          </span>
          <h3
            className={cn(
              "mt-2 [font-family:Georgia,'Times_New_Roman',serif] font-normal italic leading-[0.9] tracking-[-0.04em]",
              mini
                ? "text-xl"
                : full
                  ? "mt-4 text-3xl sm:text-6xl lg:text-7xl"
                  : "text-3xl sm:text-4xl",
            )}
          >
            Form, place, memory.
          </h3>
          {!mini ? (
            <p className={cn("mt-4 max-w-[30ch] leading-relaxed text-[#211c18]/58", full ? "text-sm" : "text-[8px]")}>
              Identity, objects, and spaces shaped with patience.
            </p>
          ) : null}
        </div>
        <div className="relative h-[72%] min-h-20 overflow-hidden bg-[linear-gradient(145deg,#3d4034_0%,#8d6f52_48%,#bdab8c_48%,#d9cbb3_100%)]">
          <div className="absolute inset-x-[13%] bottom-0 h-[72%] bg-[#782d27] shadow-[-18px_-16px_0_rgba(238,231,216,0.44)]" />
          <div className="absolute left-[9%] top-[12%] aspect-square w-[28%] rounded-full border border-[#eee7d8]/70" />
          <span
            className={cn(
              "absolute bottom-2 right-2 [font-family:Georgia,'Times_New_Roman',serif] italic text-[#fff8ea]/78",
              mini ? "text-[6px]" : full ? "text-xs" : "text-[8px]",
            )}
          >
            Study No. 14
          </span>
        </div>
      </main>
      <footer
        className={cn(
          "flex justify-between border-t border-[#211c18]/24 pt-2 uppercase tracking-[0.16em] text-[#211c18]/48",
          mini ? "text-[5px]" : full ? "text-[8px]" : "text-[6px]",
        )}
      >
        <span>New York / London</span>
        <span>Scroll to explore ↓</span>
      </footer>
    </div>
  );
}

function MainStreetPreview({ size }: DirectionPreviewProps) {
  const mini = size === "mini";
  const full = size === "full";

  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-[#fff8e9] p-3 text-[#173f32] sm:p-4">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="grid size-5 place-items-center rounded-full bg-[#d9673f] text-[8px] font-bold text-white">
            J
          </span>
          <span className={cn("font-bold tracking-[-0.03em]", mini ? "text-[8px]" : full ? "text-sm" : "text-[10px]")}>
            Juniper &amp; Pine
          </span>
        </div>
        {!mini ? (
          <div className={cn("flex items-center gap-3 font-semibold", full ? "text-[9px]" : "text-[6px]")}>
            <span>Menu</span>
            <span>Visit</span>
            <span className="rounded-full bg-[#173f32] px-2.5 py-1.5 text-[#fff8e9]">
              Order pickup
            </span>
          </div>
        ) : (
          <span className="rounded-full bg-[#173f32] px-2 py-1 text-[5px] text-white">Order</span>
        )}
      </header>
      <main className={cn("grid flex-1 items-center gap-3", mini ? "grid-cols-[1.25fr_0.75fr]" : "grid-cols-[1.05fr_0.95fr]")}>
        <div>
          <span
            className={cn(
              "font-bold uppercase tracking-[0.15em] text-[#d9673f]",
              mini ? "text-[5px]" : full ? "text-[9px]" : "text-[6px]",
            )}
          >
            Neighborhood bakery + café
          </span>
          <h3
            className={cn(
              "mt-2 max-w-[12ch] font-black leading-[0.96] tracking-[-0.05em]",
              mini
                ? "text-lg"
                : full
                  ? "mt-4 text-3xl sm:text-5xl lg:text-6xl"
                  : "text-2xl sm:text-3xl",
            )}
          >
            Good mornings, made here.
          </h3>
          {!mini ? (
            <p className={cn("mt-3 max-w-[38ch] leading-relaxed text-[#173f32]/66", full ? "text-sm" : "text-[8px]")}>
              Fresh bread, bright coffee, and a place to stay awhile.
            </p>
          ) : null}
          <div
            className={cn(
              "mt-3 inline-flex rounded-full bg-[#f1dfbf] px-2.5 py-1 font-semibold",
              mini ? "text-[5px]" : full ? "text-[10px]" : "text-[7px]",
            )}
          >
            Open Tue–Sun · 7am–3pm
          </div>
        </div>
        <div className="relative grid aspect-square max-h-[85%] w-full max-w-60 place-items-center justify-self-end rounded-[35%_65%_48%_52%] bg-[#efb84c]">
          <div className="absolute inset-[17%] rotate-12 rounded-[55%_45%_62%_38%] bg-[#d9673f]" />
          <div className="absolute inset-[32%] -rotate-12 rounded-[45%_55%_38%_62%] border-[6px] border-[#fff8e9]/72" />
          <span
            className={cn(
              "absolute bottom-[10%] rounded-full bg-white px-2 py-1 font-bold shadow-sm",
              mini ? "text-[5px]" : full ? "text-[9px]" : "text-[6px]",
            )}
          >
            Baked today
          </span>
        </div>
      </main>
      <footer
        className={cn(
          "flex items-center justify-between border-t border-[#173f32]/18 pt-2 font-semibold",
          mini ? "text-[5px]" : full ? "text-[9px]" : "text-[6px]",
        )}
      >
        <span>184 Pine Street</span>
        <span className="text-[#d9673f]">See today&apos;s menu →</span>
      </footer>
    </div>
  );
}

function SpotlightPreview({ size }: DirectionPreviewProps) {
  const mini = size === "mini";
  const full = size === "full";

  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-[#fff6ed] p-3 text-[#17133c] sm:p-4">
      <div
        aria-hidden
        className="absolute -right-[8%] top-[17%] aspect-square w-[39%] rounded-full bg-[#ff654f]"
      />
      <div
        aria-hidden
        className="absolute right-[8%] top-[30%] aspect-[0.72/1] w-[27%] rotate-6 rounded-[1.25rem] border-[3px] border-[#17133c] bg-[#6657ff] shadow-[7px_8px_0_#c7ee4f]"
      />
      <div
        aria-hidden
        className="absolute right-[25%] top-[48%] aspect-square w-[17%] -rotate-6 rounded-xl border-[3px] border-[#17133c] bg-[#ffd552]"
      />

      <header className="relative z-10 flex items-center justify-between border-b-2 border-[#17133c] pb-2">
        <span
          className={cn(
            "font-black uppercase tracking-[-0.045em]",
            mini ? "text-[9px]" : full ? "text-base" : "text-xs",
          )}
        >
          MIKA<span className="text-[#ff4f3b]">/</span>ROWE
        </span>
        {!mini ? (
          <div
            className={cn(
              "flex items-center gap-4 font-bold uppercase tracking-[0.08em]",
              full ? "text-[9px]" : "text-[6px]",
            )}
          >
            <span>Watch</span>
            <span>Guides</span>
            <span className="rounded-full bg-[#17133c] px-2.5 py-1.5 text-[#fff6ed]">
              Work with me
            </span>
          </div>
        ) : (
          <span className="rounded-full bg-[#17133c] px-2 py-1 text-[5px] font-bold uppercase text-white">
            Media kit
          </span>
        )}
      </header>

      <main className="relative z-10 grid flex-1 grid-cols-[1.08fr_0.92fr] items-center gap-3">
        <div>
          <span
            className={cn(
              "font-bold uppercase tracking-[0.16em] text-[#ff4f3b]",
              mini ? "text-[5px]" : full ? "text-[9px]" : "text-[6px]",
            )}
          >
            Travel films · useful gear · honest takes
          </span>
          <h3
            className={cn(
              "mt-2 max-w-[8ch] font-black leading-[0.86] tracking-[-0.065em]",
              mini
                ? "text-xl"
                : full
                  ? "mt-4 text-4xl sm:text-6xl lg:text-7xl"
                  : "text-3xl sm:text-4xl",
            )}
          >
            Make the trip count.
          </h3>
          {!mini ? (
            <p
              className={cn(
                "mt-4 max-w-[34ch] leading-relaxed text-[#17133c]/62",
                full ? "text-sm" : "text-[8px]",
              )}
            >
              Field-tested city guides and stories for people who would rather
              go than scroll.
            </p>
          ) : null}
        </div>

        <div className="relative h-[76%] min-h-24">
          <div className="absolute bottom-[4%] right-[2%] w-[72%] rotate-3 rounded-xl border-2 border-[#17133c] bg-[#6657ff] p-2 text-[#fff6ed] shadow-[6px_7px_0_#17133c]">
            <span
              className={cn(
                "block font-bold uppercase tracking-[0.14em] text-[#c7ee4f]",
                mini ? "text-[5px]" : full ? "text-[8px]" : "text-[6px]",
              )}
            >
              New film · 12 min
            </span>
            <strong
              className={cn(
                "mt-1 block max-w-[9ch] leading-[0.95]",
                mini ? "text-[9px]" : full ? "text-lg" : "text-xs",
              )}
            >
              Kyoto after the last train
            </strong>
          </div>
          {!mini ? (
            <div className="absolute left-[4%] top-[8%] w-[48%] -rotate-5 rounded-lg border-2 border-[#17133c] bg-[#ffd552] p-2 shadow-[5px_5px_0_#17133c]">
              <span
                className={cn(
                  "block font-black uppercase tracking-[0.12em]",
                  full ? "text-[8px]" : "text-[6px]",
                )}
              >
                Field note 08
              </span>
              <span
                className={cn(
                  "mt-3 block font-bold leading-tight",
                  full ? "text-sm" : "text-[9px]",
                )}
              >
                One bag. Seven days.
              </span>
            </div>
          ) : null}
        </div>
      </main>

      <footer
        className={cn(
          "relative z-10 flex items-center justify-between border-t-2 border-[#17133c] pt-2 font-bold uppercase tracking-[0.11em]",
          mini ? "text-[5px]" : full ? "text-[9px]" : "text-[6px]",
        )}
      >
        <span>Films · Guides · Partnerships</span>
        <span className="text-[#ff4f3b]">Latest stories →</span>
      </footer>
    </div>
  );
}

function DispatchPreview({ size }: DirectionPreviewProps) {
  const mini = size === "mini";
  const full = size === "full";

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#f3eddf] p-3 text-[#18352f] sm:p-4">
      <div
        className={cn(
          "flex items-center justify-between border-b border-[#18352f]/35 pb-1 uppercase tracking-[0.16em] text-[#18352f]/62",
          mini ? "text-[4px]" : full ? "text-[7px]" : "text-[5px]",
        )}
      >
        <span>Independent journal · Issue 24</span>
        <span>Sunday, 8:00 AM</span>
      </div>

      <header className="border-b-[3px] border-[#18352f] py-2 text-center">
        <span
          className={cn(
            "[font-family:Georgia,'Times_New_Roman',serif] font-bold leading-none tracking-[-0.055em]",
            mini ? "text-base" : full ? "text-4xl" : "text-2xl",
          )}
        >
          The Sunday Index
        </span>
      </header>

      {!mini ? (
        <nav
          className={cn(
            "flex items-center justify-center gap-5 border-b border-[#18352f]/30 py-1.5 font-bold uppercase tracking-[0.13em]",
            full ? "text-[8px]" : "text-[6px]",
          )}
        >
          <span>Cities</span>
          <span>Objects</span>
          <span>Culture</span>
          <span className="text-[#d85637]">Subscribe</span>
        </nav>
      ) : null}

      <main
        className={cn(
          "grid flex-1 gap-3 py-3",
          mini ? "grid-cols-[1.35fr_0.65fr]" : "grid-cols-[1.2fr_0.8fr]",
        )}
      >
        <article className="flex flex-col justify-between border-r border-[#18352f]/28 pr-3">
          <div>
            <span
              className={cn(
                "font-bold uppercase tracking-[0.16em] text-[#d85637]",
                mini ? "text-[5px]" : full ? "text-[8px]" : "text-[6px]",
              )}
            >
              Cover story · Cities
            </span>
            <h3
              className={cn(
                "mt-2 max-w-[16ch] [font-family:Georgia,'Times_New_Roman',serif] font-bold leading-[0.94] tracking-[-0.045em]",
                mini
                  ? "text-base"
                  : full
                    ? "text-3xl sm:text-5xl lg:text-6xl"
                    : "text-2xl sm:text-3xl",
              )}
            >
              What the corner store knows about good cities.
            </h3>
            {!mini ? (
              <p
                className={cn(
                  "mt-3 max-w-[48ch] leading-relaxed text-[#18352f]/64",
                  full ? "text-sm" : "text-[8px]",
                )}
              >
                The smallest shops do more than sell things. They remember us,
                connect us, and keep a block alive.
              </p>
            ) : null}
          </div>
          <span
            className={cn(
              "font-semibold text-[#18352f]/58",
              mini ? "text-[5px]" : full ? "text-[9px]" : "text-[6px]",
            )}
          >
            By Lena Ortiz · 8 min read
          </span>
        </article>

        <aside className="grid content-start gap-2">
          <span
            className={cn(
              "font-bold uppercase tracking-[0.15em] text-[#18352f]/52",
              mini ? "text-[5px]" : full ? "text-[8px]" : "text-[6px]",
            )}
          >
            Also in this issue
          </span>
          {[
            "The slow comeback of public benches",
            "Notes from the last overnight train",
            "A field guide to useful objects",
          ]
            .slice(0, mini ? 2 : 3)
            .map((title, index) => (
              <div
                key={title}
                className="border-t border-[#18352f]/24 pt-2"
              >
                <span
                  className={cn(
                    "block font-bold leading-tight",
                    mini ? "text-[7px]" : full ? "text-sm" : "text-[9px]",
                  )}
                >
                  {title}
                </span>
                <span
                  className={cn(
                    "mt-1 block uppercase tracking-[0.12em] text-[#d85637]",
                    mini ? "text-[4px]" : full ? "text-[7px]" : "text-[5px]",
                  )}
                >
                  0{index + 2} / Read
                </span>
              </div>
            ))}
        </aside>
      </main>

      <footer
        className={cn(
          "flex items-center justify-between border-t-[3px] border-[#18352f] pt-2 font-bold uppercase tracking-[0.12em]",
          mini ? "text-[5px]" : full ? "text-[8px]" : "text-[6px]",
        )}
      >
        <span>Essays for a slower internet</span>
        <span className="text-[#d85637]">Read issue 24 →</span>
      </footer>
    </div>
  );
}

export function DesignPreview({
  slug,
  size = "card",
  className,
}: DesignPreviewProps) {
  const preview = {
    obsidian: <ObsidianPreview size={size} />,
    signal: <SignalPreview size={size} />,
    atelier: <AtelierPreview size={size} />,
    "main-street": <MainStreetPreview size={size} />,
    spotlight: <SpotlightPreview size={size} />,
    dispatch: <DispatchPreview size={size} />,
  } satisfies Record<DesignDirectionSlug, React.ReactNode>;

  return (
    <BrowserShell slug={slug} size={size} className={className}>
      {preview[slug]}
    </BrowserShell>
  );
}
