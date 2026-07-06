import { Badge } from "@/components/ui/badge";

const appCards = [
  { title: "Files", detail: "Local first" },
  { title: "Settings", detail: "Clear controls" },
  { title: "Terminal", detail: "Power ready" },
  { title: "Updates", detail: "Readable notes" },
];

export function OSMockup() {
  return (
    <div className="relative min-h-[560px] w-full min-w-0 overflow-hidden rounded-lg border border-white/12 bg-[#07101a] shadow-[0_28px_120px_rgba(0,0,0,0.42)] sm:aspect-[1.45] sm:min-h-[360px]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_35%_20%,rgba(77,183,255,0.22),transparent_34%),radial-gradient(circle_at_78%_84%,rgba(214,173,91,0.18),transparent_35%),linear-gradient(135deg,#07101a,#0c1320_48%,#06070b)]" />
      <div className="visual-grid absolute inset-0 opacity-30" />
      <div className="relative flex h-full flex-col p-4 sm:p-6">
        <div className="mb-4 flex items-center justify-between rounded-lg border border-white/10 bg-black/22 px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="grid size-8 place-items-center rounded-md border border-[#d6ad5b]/40 bg-[#d6ad5b]/10 text-xs font-semibold text-[#f3d99d]">
              R
            </span>
            <span className="text-sm font-medium text-white">Rukh Desktop</span>
          </div>
          <div className="hidden items-center gap-2 sm:flex">
            <Badge tone="gold">Low bloat</Badge>
            <Badge tone="blue">Secure defaults</Badge>
            <Badge tone="ivory">Fast boot</Badge>
          </div>
        </div>
        <div className="grid flex-1 gap-4 lg:grid-cols-[210px_1fr_240px]">
          <aside className="hidden rounded-lg border border-white/10 bg-[#07101a]/70 p-4 lg:block">
            <p className="text-xs font-semibold text-white/46">Workspace</p>
            <div className="mt-4 space-y-2">
              {["Home", "Apps", "Files", "Network", "System"].map((item, index) => (
                <div
                  key={item}
                  className={`rounded-md px-3 py-2 text-sm ${
                    index === 0 ? "bg-[#4db7ff]/12 text-[#9fdcff]" : "text-white/52"
                  }`}
                >
                  {item}
                </div>
              ))}
            </div>
          </aside>
          <main className="rounded-lg border border-white/12 bg-[#0b111b]/78 p-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <p className="text-xs text-white/42">Control center</p>
                <h3 className="mt-1 text-lg font-semibold text-white">Clean defaults</h3>
              </div>
              <span className="rounded-full bg-[#4db7ff]/12 px-3 py-1 text-xs text-[#9fdcff]">
                14 ms input
              </span>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {appCards.map((card) => (
                <div key={card.title} className="rounded-lg border border-white/10 bg-white/[0.045] p-4">
                  <div className="h-2 w-10 rounded-full bg-[#d6ad5b]/70" />
                  <h4 className="mt-5 text-sm font-semibold text-white">{card.title}</h4>
                  <p className="mt-1 text-xs text-white/48">{card.detail}</p>
                </div>
              ))}
            </div>
          </main>
          <aside className="rounded-lg border border-white/12 bg-black/32 p-4 font-mono text-xs leading-6 text-[#9fdcff]">
            <p>$ rukh update</p>
            <p>packages: clean</p>
            <p>services: minimal</p>
            <p>privacy: default</p>
            <div className="mt-5 rounded-md border border-[#d6ad5b]/22 bg-[#d6ad5b]/10 p-3 font-sans text-xs leading-5 text-[#f3d99d]">
              Practical compatibility, not magic.
            </div>
          </aside>
        </div>
        <div className="mt-4 flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-black/26 px-4 py-3">
          {["Launcher", "Files", "Browser", "Notes", "Settings"].map((item) => (
            <span
              key={item}
              className="size-8 rounded-md border border-white/10 bg-white/[0.055] shadow-[0_0_18px_rgba(77,183,255,0.08)]"
              title={item}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
