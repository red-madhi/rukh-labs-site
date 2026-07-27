import { Badge } from "@/components/ui/badge";
import { OfficialBrandArt } from "@/components/brand/official-brand-art";

const appCards = [
  { title: "Files", detail: "Glass cards" },
  { title: "Settings", detail: "Square controls" },
  { title: "Terminal", detail: "Power ready" },
  { title: "Updates", detail: "Clear notes" },
];

export function OSMockup() {
  return (
    <div className="relative min-h-[560px] w-full min-w-0 overflow-hidden rounded-[2rem] border border-[#16c8ff]/22 bg-[#040616] shadow-[0_28px_120px_rgba(17,101,255,0.16)] sm:aspect-[1.45] sm:min-h-[360px]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_28%_16%,rgba(22,200,255,0.28),transparent_34%),radial-gradient(circle_at_78%_84%,rgba(109,49,255,0.28),transparent_36%),linear-gradient(135deg,#020617,#0b1741_48%,#05051a)]" />
      <div className="visual-grid absolute inset-0 opacity-30" />
      <div className="relative flex h-full flex-col p-4 sm:p-6">
        <div className="mb-4 flex items-center justify-between rounded-2xl border border-[#16c8ff]/18 bg-black/30 px-4 py-3 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <OfficialBrandArt brand="glass-squares" decorative className="size-9 rounded-xl" />
            <span className="text-sm font-medium text-white">Glass Squares</span>
          </div>
          <div className="hidden items-center gap-2 sm:flex">
            <Badge tone="gold">Low bloat</Badge>
            <Badge tone="blue">Private</Badge>
            <Badge tone="ivory">Fast</Badge>
          </div>
        </div>
        <div className="grid flex-1 gap-4 lg:grid-cols-[210px_1fr_240px]">
          <aside className="hidden rounded-lg border border-white/10 bg-black/34 p-4 lg:block">
            <p className="text-xs font-semibold text-white/46">Workspace</p>
            <div className="mt-4 space-y-2">
              {["Shell", "Tiles", "Files", "Network", "System"].map((item, index) => (
                <div
                  key={item}
                  className={`rounded-md px-3 py-2 text-sm ${
                    index === 0 ? "bg-[#16c8ff]/12 text-[#7de2ff]" : "text-white/52"
                  }`}
                >
                  {item}
                </div>
              ))}
            </div>
          </aside>
          <main className="rounded-lg border border-white/12 bg-white/[0.06] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <p className="text-xs text-white/42">Control center</p>
                <h3 className="mt-1 text-lg font-semibold text-white">Glass shell</h3>
              </div>
              <span className="rounded-full bg-[#16c8ff]/12 px-3 py-1 text-xs text-[#7de2ff]">
                square grid UI
              </span>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {appCards.map((card) => (
                <div key={card.title} className="rounded-lg border border-white/10 bg-white/[0.065] p-4 backdrop-blur">
                  <div className="h-8 w-8 rounded-md border border-[#16c8ff]/22 bg-[linear-gradient(135deg,rgba(22,200,255,0.18),rgba(109,49,255,0.18))]" />
                  <h4 className="mt-5 text-sm font-semibold text-white">{card.title}</h4>
                  <p className="mt-1 text-xs text-white/48">{card.detail}</p>
                </div>
              ))}
            </div>
          </main>
          <aside className="rounded-lg border border-white/12 bg-black/38 p-4 font-mono text-xs leading-6 text-[#74dcff]">
            <p>$ glass status</p>
            <p>shell: frosted</p>
            <p>tiles: square</p>
            <p>privacy: default</p>
            <div className="mt-5 rounded-md border border-[#6d31ff]/30 bg-[#6d31ff]/12 p-3 font-sans text-xs leading-5 text-[#c4a8ff]">
              Practical compatibility, not magic.
            </div>
          </aside>
        </div>
        <div className="mt-4 flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-black/26 px-4 py-3">
          {["Launcher", "Files", "Browser", "Notes", "Settings", "Glass shell"].map((item) => (
            <span
              key={item}
              className="size-8 rounded-md border border-white/10 bg-white/[0.06] shadow-[0_0_18px_rgba(22,200,255,0.16)]"
              title={item}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
