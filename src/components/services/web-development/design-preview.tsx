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
  const reels = [
    {
      platform: "REEL",
      title: "48 hours in Lisbon",
      views: "1.8M",
      tone:
        "bg-[radial-gradient(circle_at_72%_18%,rgba(255,255,255,0.44),transparent_18%),linear-gradient(155deg,#ffb09f,#ff5a71_48%,#7b61ff)]",
    },
    {
      platform: "TIKTOK",
      title: "3 pieces I wear on repeat",
      views: "842K",
      tone:
        "bg-[radial-gradient(circle_at_30%_22%,rgba(255,255,255,0.28),transparent_20%),linear-gradient(155deg,#8b7bff,#5144d8_46%,#171526)]",
    },
    {
      platform: "SHORT",
      title: "Actually worth the save",
      views: "614K",
      tone:
        "bg-[radial-gradient(circle_at_68%_22%,rgba(255,255,255,0.4),transparent_19%),linear-gradient(155deg,#ffd7c9,#ff9877_48%,#ff4f88)]",
    },
  ] as const;

  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-[#fffaf8] p-2.5 text-[#191823] sm:p-4">
      <div
        aria-hidden
        className="absolute -right-[12%] -top-[22%] aspect-square w-[54%] rounded-full bg-[radial-gradient(circle,#ff6780_0%,rgba(255,103,128,0.18)_48%,transparent_70%)] blur-xl"
      />
      <header className="relative z-10 flex items-center justify-between gap-3 border-b border-[#191823]/10 pb-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="grid size-7 shrink-0 place-items-center rounded-full bg-[conic-gradient(from_210deg,#ff5d78,#ffb073,#7d6cff,#ff5d78)] p-[2px]">
            <span className="grid size-full place-items-center rounded-full bg-[#191823] text-[7px] font-bold text-white">
              MR
            </span>
          </span>
          <span className="min-w-0">
            <strong
              className={cn(
                "block truncate font-bold tracking-[-0.035em]",
                mini ? "text-[8px]" : full ? "text-sm" : "text-[10px]",
              )}
            >
              Mika Rowe <span className="text-[#6e5cff]">●</span>
            </strong>
            <span
              className={cn(
                "block truncate text-[#191823]/48",
                mini ? "text-[5px]" : full ? "text-[8px]" : "text-[6px]",
              )}
            >
              @mikarowe
            </span>
          </span>
        </div>
        {!mini ? (
          <div
            className={cn(
              "flex items-center gap-3 font-semibold text-[#191823]/62",
              full ? "text-[9px]" : "text-[6px]",
            )}
          >
            <span>Watch</span>
            <span>The Edit</span>
            <span className="rounded-full bg-[#191823] px-3 py-1.5 text-white">
              Media kit
            </span>
          </div>
        ) : (
          <span className="rounded-full bg-[#191823] px-2 py-1 text-[5px] font-bold text-white">
            Follow
          </span>
        )}
      </header>

      <main className="relative z-10 grid min-h-0 flex-1 grid-cols-[0.82fr_1.18fr] items-center gap-2.5 py-2">
        <div className="min-w-0">
          <span
            className={cn(
              "font-bold uppercase tracking-[0.15em] text-[#ff4f72]",
              mini ? "text-[5px]" : full ? "text-[9px]" : "text-[6px]",
            )}
          >
            Style · places · real recommendations
          </span>
          <h3
            className={cn(
              "mt-2 max-w-[9ch] font-semibold leading-[0.92] tracking-[-0.06em]",
              mini
                ? "text-base"
                : full
                  ? "mt-4 text-4xl lg:text-6xl"
                  : "text-2xl",
            )}
          >
            Worth the follow. Better off-feed.
          </h3>
          {!mini ? (
            <p
              className={cn(
                "mt-3 max-w-[30ch] leading-relaxed text-[#191823]/56",
                full ? "text-sm" : "text-[8px]",
              )}
            >
              A creator home for the reels, links, edits, and partnerships
              people actually came to find.
            </p>
          ) : null}
        </div>

        <div className="relative h-[88%] min-h-0">
          {reels.map((reel, index) => (
            <div
              key={reel.title}
              className={cn(
                "absolute top-1/2 aspect-[9/14] min-h-0 -translate-y-1/2 overflow-hidden rounded-[0.7rem] border border-white/70 text-white shadow-[0_12px_30px_rgba(30,24,58,0.16)]",
                reel.tone,
                index === 1
                  ? "left-1/2 z-10 h-full -translate-x-1/2"
                  : cn(
                      "h-[78%] opacity-90",
                      index === 0 ? "left-0 -rotate-3" : "right-0 rotate-3",
                    ),
              )}
            >
              <span
                className={cn(
                  "absolute left-2 top-2 rounded-full bg-black/28 px-1.5 py-0.5 font-bold tracking-[0.12em] backdrop-blur",
                  mini ? "text-[4px]" : full ? "text-[7px]" : "text-[5px]",
                )}
              >
                {reel.platform}
              </span>
              <span className="absolute left-1/2 top-[42%] grid -translate-x-1/2 place-items-center rounded-full bg-white/88 text-[#191823] shadow-lg">
                <span
                  className={cn(
                    "ml-px block [clip-path:polygon(0_0,100%_50%,0_100%)] bg-current",
                    mini ? "h-2 w-1.5" : full ? "h-4 w-3" : "h-3 w-2",
                  )}
                />
              </span>
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/72 via-black/26 to-transparent p-2 pt-8">
                <strong
                  className={cn(
                    "block leading-tight",
                    mini ? "text-[6px]" : full ? "text-xs" : "text-[8px]",
                  )}
                >
                  {reel.title}
                </strong>
                <span
                  className={cn(
                    "mt-1 block text-white/70",
                    mini ? "text-[4px]" : full ? "text-[7px]" : "text-[5px]",
                  )}
                >
                  ▶ {reel.views}
                </span>
              </div>
            </div>
          ))}
        </div>
      </main>

      <footer
        className={cn(
          "relative z-10 flex items-center justify-between border-t border-[#191823]/10 pt-2 font-semibold",
          mini ? "text-[5px]" : full ? "text-[9px]" : "text-[6px]",
        )}
      >
        <span className="text-[#191823]/48">Instagram · TikTok · YouTube</span>
        <span className="text-[#ff4f72]">See what&apos;s new →</span>
      </footer>
    </div>
  );
}

function DispatchPreview({ size }: DirectionPreviewProps) {
  const mini = size === "mini";
  const full = size === "full";

  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-[#fbfaf7] p-2.5 text-[#151a18] sm:p-4">
      <div
        aria-hidden
        className="absolute -bottom-[35%] -right-[12%] aspect-square w-[52%] rounded-full bg-[radial-gradient(circle,rgba(218,82,55,0.12),transparent_67%)]"
      />
      <header className="relative z-10 flex items-center justify-between gap-3 border-b border-[#151a18]/10 pb-2">
        <div className="min-w-0">
          <span
            className={cn(
              "block truncate [font-family:Georgia,'Times_New_Roman',serif] font-bold tracking-[-0.045em]",
              mini ? "text-[10px]" : full ? "text-lg" : "text-xs",
            )}
          >
            The Sunday Index
          </span>
          <span
            className={cn(
              "block text-[#151a18]/42",
              mini ? "text-[6px]" : full ? "text-[8px]" : "text-[6px]",
            )}
          >
            by Lena Ortiz
          </span>
        </div>
        {!mini ? (
          <div
            className={cn(
              "flex items-center gap-3 font-semibold text-[#151a18]/64",
              full ? "text-[9px]" : "text-[6px]",
            )}
          >
            <span>Latest</span>
            <span>Archive</span>
            <span>Membership</span>
            <span className="rounded-full bg-[#151a18] px-3 py-1.5 text-white">
              Join
            </span>
          </div>
        ) : (
          <span className="rounded-full bg-[#151a18] px-2 py-1 text-[5px] font-semibold text-white">
            Join
          </span>
        )}
      </header>

      <main
        className={cn(
          "relative z-10 grid min-h-0 flex-1 items-center gap-3 py-2.5",
          mini ? "grid-cols-1" : "grid-cols-[1.2fr_0.8fr]",
        )}
      >
        <article className="min-w-0">
          <span
            className={cn(
              "font-semibold uppercase tracking-[0.13em] text-[#a83b2b]",
              mini ? "text-[6px]" : full ? "text-[8px]" : "text-[6px]",
            )}
          >
            New · Cities · Free essay
          </span>
          <h3
            className={cn(
              "mt-2 max-w-[15ch] [font-family:Georgia,'Times_New_Roman',serif] font-bold leading-[0.95] tracking-[-0.05em]",
              mini
                ? "text-base"
                : full
                  ? "mt-4 text-4xl lg:text-6xl"
                  : "text-2xl",
            )}
          >
            What the corner store knows about good cities.
          </h3>
          {!mini ? (
            <p
              className={cn(
                "mt-3 max-w-[46ch] leading-relaxed text-[#151a18]/64",
                full ? "text-sm" : "text-[8px]",
              )}
            >
              An independent publication about the ordinary systems that make
              a place worth living in.
            </p>
          ) : null}
          <span
            className={cn(
              "mt-3 block font-medium text-[#151a18]/62",
              mini ? "text-[6px]" : full ? "text-[9px]" : "text-[6px]",
            )}
          >
            Lena Ortiz · 8 min read
          </span>
        </article>

        <aside
          className={cn(
            "rounded-xl border border-[#151a18]/10 bg-white p-2 shadow-[0_12px_35px_rgba(27,33,30,0.07)]",
            mini && "hidden",
          )}
        >
          <span
            className={cn(
              "font-semibold uppercase tracking-[0.12em] text-[#a83b2b]",
              mini ? "text-[4px]" : full ? "text-[7px]" : "text-[5px]",
            )}
          >
            Reader supported
          </span>
          <strong
            className={cn(
              "mt-2 block [font-family:Georgia,'Times_New_Roman',serif] leading-[1.02] tracking-[-0.035em]",
              mini ? "text-[9px]" : full ? "text-xl" : "text-xs",
            )}
          >
            Join thoughtful readers.
          </strong>
          {!mini ? (
            <div className="mt-3 grid gap-1.5">
              <span
                className={cn(
                  "rounded-md bg-[#151a18] px-2 py-1.5 font-semibold text-white",
                  full ? "text-[8px]" : "text-[6px]",
                )}
              >
                Free · every other Thursday
              </span>
              <span
                className={cn(
                  "rounded-md bg-[#f0ede5] px-2 py-1.5 font-semibold text-[#151a18]/62",
                  full ? "text-[8px]" : "text-[6px]",
                )}
              >
                Supporting · full archive + audio
              </span>
            </div>
          ) : (
            <span className="mt-2 block rounded-md bg-[#151a18] px-1.5 py-1 text-center text-[4px] font-semibold text-white">
              Free or supporting
            </span>
          )}
        </aside>
      </main>

      {!mini ? (
        <footer
          className={cn(
            "relative z-10 flex items-center justify-between border-t border-[#151a18]/10 pt-2 font-semibold",
            full ? "text-[9px]" : "text-[6px]",
          )}
        >
          <span className="text-[#151a18]/62">
            Essays · Notes · Audio · Archive
          </span>
          <span className="text-[#a83b2b]">Read the latest →</span>
        </footer>
      ) : null}
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
