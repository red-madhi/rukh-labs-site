import {
  ArrowLeft,
  ArrowRight,
  Bell,
  ChevronDown,
  Clock3,
  FileText,
  FolderClosed,
  FolderOpen,
  Grid2X2,
  HardDrive,
  Home,
  ImageIcon,
  Search,
  Settings,
  ShieldCheck,
  Volume2,
  Wifi,
} from "lucide-react";
import { OfficialBrandArt } from "@/components/brand/official-brand-art";

const locations = [
  { label: "Home", icon: Home, active: true },
  { label: "Recent", icon: Clock3 },
  { label: "Documents", icon: FileText },
  { label: "Pictures", icon: ImageIcon },
  { label: "System", icon: HardDrive },
];

const folders = [
  { label: "Documents", detail: "24 items", icon: FileText, tone: "cyan" },
  { label: "Projects", detail: "8 items", icon: FolderClosed, tone: "violet" },
  { label: "Pictures", detail: "81 items", icon: ImageIcon, tone: "blue" },
];

const recentFiles = [
  { name: "Release notes", type: "Document", time: "Today" },
  { name: "System backup", type: "Archive", time: "Yesterday" },
];

function DesktopWallpaper({ compact = false }: { compact?: boolean }) {
  return (
    <>
      <div className="absolute inset-0 bg-[linear-gradient(132deg,#020713_4%,#061b36_43%,#11114a_72%,#08051c)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_16%_4%,rgba(46,213,255,0.24),transparent_29%),radial-gradient(circle_at_84%_90%,rgba(109,49,255,0.31),transparent_34%)]" />
      <div
        className={`absolute rotate-[-11deg] rounded-[24%] border border-cyan-100/28 bg-cyan-300/[0.055] shadow-[inset_0_1px_1px_rgba(255,255,255,0.22),0_28px_80px_rgba(23,168,255,0.14)] backdrop-blur-[2px] ${
          compact ? "-right-2 top-3 size-20" : "-right-10 top-8 size-48 sm:size-64"
        }`}
      />
      <div
        className={`absolute rotate-[17deg] rounded-[26%] border border-violet-100/20 bg-violet-400/[0.065] shadow-[inset_0_1px_1px_rgba(255,255,255,0.18),0_28px_80px_rgba(93,45,255,0.16)] backdrop-blur-[2px] ${
          compact ? "-bottom-4 left-4 size-16" : "-bottom-24 left-[12%] size-56 sm:size-72"
        }`}
      />
      <div className="visual-grid absolute inset-0 opacity-[0.16]" />
    </>
  );
}

export function OSMiniPreview() {
  return (
    <div
      aria-hidden
      className="relative aspect-[1.46] overflow-hidden rounded-xl border border-[#4bdcff]/25 bg-[#030717] shadow-[inset_0_1px_0_rgba(255,255,255,0.14)]"
    >
      <DesktopWallpaper compact />
      <div className="absolute left-[9%] top-[10%] h-[66%] w-[73%] overflow-hidden rounded-[0.55rem] border border-white/15 bg-[#061124]/80 shadow-[0_12px_35px_rgba(0,0,0,0.35)] backdrop-blur-md">
        <div className="flex h-[22%] items-center gap-1.5 border-b border-white/10 px-2">
          <span className="size-1.5 rounded-full bg-white/30" />
          <span className="size-1.5 rounded-full bg-white/20" />
          <span className="h-1 w-10 rounded-full bg-white/12" />
        </div>
        <div className="grid h-[78%] grid-cols-[28%_1fr]">
          <div className="border-r border-white/10 p-2">
            <span className="block h-1.5 w-8 rounded-full bg-cyan-200/45" />
            <span className="mt-2 block h-1.5 w-6 rounded-full bg-white/12" />
            <span className="mt-2 block h-1.5 w-7 rounded-full bg-white/10" />
          </div>
          <div className="grid grid-cols-3 gap-1.5 p-2">
            <span className="rounded border border-cyan-200/15 bg-cyan-300/10" />
            <span className="rounded border border-violet-200/15 bg-violet-300/10" />
            <span className="rounded border border-blue-200/15 bg-blue-300/10" />
          </div>
        </div>
      </div>
      <div className="absolute bottom-[5%] left-1/2 flex -translate-x-1/2 gap-1 rounded-md border border-white/14 bg-black/35 p-1 backdrop-blur-md">
        {Array.from({ length: 5 }).map((_, index) => (
          <span
            key={index}
            className={`size-2 rounded-[2px] border border-white/10 ${
              index === 0 ? "bg-cyan-300/55" : "bg-white/18"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

export function OSMockup() {
  return (
    <div className="relative min-h-[510px] w-full min-w-0 overflow-hidden rounded-[2rem] border border-[#37d6ff]/30 bg-[#030714] shadow-[0_34px_120px_rgba(17,101,255,0.2),inset_0_1px_0_rgba(255,255,255,0.16)] sm:aspect-[1.46] sm:min-h-[390px]">
      <DesktopWallpaper />

      <div className="absolute inset-x-0 top-0 z-20 flex h-11 items-center justify-between border-b border-white/10 bg-[#020711]/58 px-4 backdrop-blur-2xl sm:px-5">
        <div className="flex items-center gap-2.5">
          <OfficialBrandArt
            brand="glass-squares"
            decorative
            className="size-6 rounded-[0.45rem] shadow-[0_0_20px_rgba(49,201,255,0.28)]"
          />
          <span className="text-[11px] font-semibold tracking-[-0.01em] text-white/90 sm:text-xs">
            Glass Squares
          </span>
        </div>
        <div className="hidden w-[32%] items-center gap-2 rounded-lg border border-white/10 bg-black/25 px-3 py-1.5 text-white/38 sm:flex">
          <Search aria-hidden className="size-3.5" />
          <span className="text-[10px]">Search</span>
        </div>
        <div className="flex items-center gap-2.5 text-white/72">
          <Wifi aria-hidden className="size-3.5" />
          <Volume2 aria-hidden className="size-3.5" />
          <span className="hidden text-[10px] font-medium sm:inline">09:41</span>
          <ChevronDown aria-hidden className="size-3.5" />
        </div>
      </div>

      <div className="absolute inset-x-3 bottom-[4.5rem] top-[3.6rem] z-10 overflow-hidden rounded-[1.15rem] border border-white/15 bg-[#071226]/82 shadow-[0_26px_70px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.1)] backdrop-blur-2xl sm:inset-x-[5.5%] sm:bottom-[4.9rem] sm:top-[4.2rem]">
        <div className="flex h-11 items-center justify-between border-b border-white/10 bg-black/12 px-3 sm:h-12 sm:px-4">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-1 text-white/34">
              <ArrowLeft aria-hidden className="size-3.5" />
              <ArrowRight aria-hidden className="size-3.5" />
            </div>
            <span className="h-4 w-px bg-white/10" />
            <FolderOpen aria-hidden className="size-4 text-[#65ddff]" />
            <span className="text-xs font-semibold text-white/88">Files</span>
          </div>
          <div className="flex items-center gap-2 text-white/48">
            <Grid2X2 aria-hidden className="size-3.5 text-cyan-100/80" />
            <Settings aria-hidden className="size-3.5" />
          </div>
        </div>

        <div className="grid h-[calc(100%_-_2.75rem)] grid-cols-1 sm:h-[calc(100%_-_3rem)] sm:grid-cols-[9.2rem_1fr]">
          <aside className="hidden border-r border-white/10 bg-black/10 p-3 sm:flex sm:flex-col">
            <p className="px-2 pb-2 text-[9px] font-semibold uppercase tracking-[0.18em] text-white/32">
              Places
            </p>
            <nav className="space-y-0.5">
              {locations.map((item) => {
                const Icon = item.icon;

                return (
                  <div
                    key={item.label}
                    className={`flex items-center gap-2.5 rounded-md px-2 py-2 text-[10px] ${
                      item.active
                        ? "border border-cyan-200/10 bg-cyan-300/10 text-cyan-50"
                        : "border border-transparent text-white/48"
                    }`}
                  >
                    <Icon
                      aria-hidden
                      className={`size-3.5 ${item.active ? "text-[#62dcff]" : "text-white/34"}`}
                    />
                    {item.label}
                  </div>
                );
              })}
            </nav>
            <div className="mt-auto rounded-lg border border-emerald-200/10 bg-emerald-300/[0.055] p-2.5">
              <div className="flex items-center gap-2 text-[9px] font-medium text-emerald-100/75">
                <ShieldCheck aria-hidden className="size-3.5" />
                System ready
              </div>
            </div>
          </aside>

          <main className="min-w-0 overflow-hidden p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[9px] font-medium uppercase tracking-[0.18em] text-[#74ddff]/68">
                  Home
                </p>
                <h3 className="mt-1 text-base font-semibold tracking-[-0.02em] text-white sm:text-lg">
                  Good morning.
                </h3>
              </div>
              <span
                aria-hidden
                className="grid size-8 place-items-center rounded-lg border border-white/10 bg-white/[0.045] text-white/48"
              >
                <Bell aria-hidden className="size-3.5" />
              </span>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2 sm:gap-3">
              {folders.map((folder) => {
                const Icon = folder.icon;
                const iconTone =
                  folder.tone === "cyan"
                    ? "border-cyan-200/15 bg-cyan-300/10 text-[#67ddff]"
                    : folder.tone === "violet"
                      ? "border-violet-200/15 bg-violet-300/10 text-[#b5a2ff]"
                      : "border-blue-200/15 bg-blue-300/10 text-[#82baff]";

                return (
                  <div
                    key={folder.label}
                    className="min-w-0 rounded-lg border border-white/10 bg-white/[0.045] p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.055)] sm:p-3"
                  >
                    <span
                      className={`grid size-7 place-items-center rounded-md border sm:size-8 ${iconTone}`}
                    >
                      <Icon aria-hidden className="size-3.5 sm:size-4" />
                    </span>
                    <p className="mt-3 truncate text-[10px] font-semibold text-white/88 sm:text-xs">
                      {folder.label}
                    </p>
                    <p className="mt-0.5 text-[8px] text-white/32 sm:text-[9px]">{folder.detail}</p>
                  </div>
                );
              })}
            </div>

            <div className="mt-4">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-[10px] font-semibold text-white/72 sm:text-xs">Recent</p>
                <span className="text-[8px] font-medium text-cyan-100/50 sm:text-[9px]">View all</span>
              </div>
              <div className="overflow-hidden rounded-lg border border-white/10 bg-black/10">
                {recentFiles.map((file, index) => (
                  <div
                    key={file.name}
                    className={`grid grid-cols-[1fr_auto] items-center gap-3 px-3 py-2 ${
                      index > 0 ? "border-t border-white/8" : ""
                    }`}
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span className="grid size-6 shrink-0 place-items-center rounded-md border border-white/10 bg-white/[0.045] text-white/38">
                        <FileText aria-hidden className="size-3" />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-[9px] font-medium text-white/74 sm:text-[10px]">
                          {file.name}
                        </p>
                        <p className="text-[8px] text-white/28">{file.type}</p>
                      </div>
                    </div>
                    <span className="text-[8px] text-white/26">{file.time}</span>
                  </div>
                ))}
              </div>
            </div>
          </main>
        </div>
      </div>

      <div className="absolute bottom-3 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1.5 rounded-[0.85rem] border border-white/15 bg-[#020712]/58 p-1.5 shadow-[0_12px_40px_rgba(0,0,0,0.34),inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-2xl sm:bottom-4 sm:gap-2 sm:p-2">
        <span className="grid size-7 place-items-center rounded-lg border border-cyan-100/20 bg-cyan-300/12 text-[#65dcff] shadow-[0_0_20px_rgba(31,191,255,0.16)] sm:size-8">
          <Grid2X2 aria-hidden className="size-3.5 sm:size-4" />
        </span>
        <span className="grid size-7 place-items-center rounded-lg border border-white/10 bg-white/[0.05] text-white/54 sm:size-8">
          <FolderOpen aria-hidden className="size-3.5 sm:size-4" />
        </span>
        <span className="grid size-7 place-items-center rounded-lg border border-white/10 bg-white/[0.05] text-white/54 sm:size-8">
          <Search aria-hidden className="size-3.5 sm:size-4" />
        </span>
        <span className="grid size-7 place-items-center rounded-lg border border-white/10 bg-white/[0.05] text-white/54 sm:size-8">
          <Settings aria-hidden className="size-3.5 sm:size-4" />
        </span>
      </div>
    </div>
  );
}
