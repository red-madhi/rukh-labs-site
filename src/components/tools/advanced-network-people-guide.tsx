import {
  Compass,
  ExternalLink,
  GitBranch,
  SlidersHorizontal,
  Target,
  UsersRound,
} from "lucide-react";
import { Card } from "@/components/ui/card";

const guides = [
  {
    icon: Compass,
    title: "Next follows / Action Center",
    meaning: "This is the actual action list: people IAZMA thinks are worth considering now.",
    action: "Open the profile, decide whether the person is genuinely relevant, then follow or interact naturally. Use See details for the reason and suggested next move.",
  },
  {
    icon: UsersRound,
    title: "Bridge candidates",
    meaning: "Promising people who could connect your existing network toward a destination. They are possibilities, not proven relationships yet.",
    action: "Treat them like normal people, not stepping stones. If they are relevant to you, build a real relationship over time. The tool will promote them to an activated bridge only when evidence supports it.",
  },
  {
    icon: GitBranch,
    title: "Warm network / activated bridges",
    meaning: "People already close to you in the graph. Activated bridges have a real active or reciprocal route connecting you toward another community.",
    action: "This is mostly a relationship map, not a follow list. Maintain genuine interaction with people you actually value; you do not need to manufacture activity with everyone shown.",
  },
  {
    icon: Target,
    title: "Target-circle connections / destinations",
    meaning: "These explain where people sit around the larger accounts or communities you want to become closer to.",
    action: "Usually do nothing directly. Destinations are goals, not cold-outreach assignments. A target-circle person becomes actionable when IAZMA also surfaces them in a recommendation or cultivation list.",
  },
  {
    icon: SlidersHorizontal,
    title: "Teach the engine your taste",
    meaning: "These are saved recommendations that IAZMA wants your human judgment on. Graph math cannot know who you actually like.",
    action: "Open unfamiliar profiles first, then label them. Your choices change future rankings so the tool stops recommending technically useful people who are a bad personal fit.",
  },
] as const;

export function AdvancedNetworkPeopleGuide() {
  return (
    <Card className="overflow-hidden border-[#16c8ff]/18 p-0">
      <div className="border-b border-white/8 bg-[radial-gradient(circle_at_0%_0%,rgba(22,200,255,0.09),transparent_34%),radial-gradient(circle_at_100%_0%,rgba(170,99,255,0.07),transparent_34%)] px-5 py-5 sm:px-6">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-[#16c8ff]/20 bg-[#16c8ff]/[0.055] text-[#8ce8ff]">
            <Compass className="size-5" aria-hidden />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8ce8ff]">
              Read this first
            </p>
            <h2 className="mt-1 text-xl font-semibold text-white sm:text-2xl">
              What the people lists mean — and what you are supposed to do with them.
            </h2>
            <p className="mt-2 max-w-4xl text-sm leading-6 text-white/50">
              The short version: <strong className="font-semibold text-white/72">Next follows, Action Center, and People to cultivate</strong> are action-oriented. <strong className="font-semibold text-white/72">Destinations, target circles, and network maps</strong> are mostly context. They are not instructions to chase everyone shown.
            </p>
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-6">
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-[#e6bd73]/16 bg-[#e6bd73]/[0.035] p-3.5 text-xs leading-5 text-white/48">
          <ExternalLink className="mt-0.5 size-4 shrink-0 text-[#f1d49a]" aria-hidden />
          <p>
            <strong className="font-semibold text-[#f1d49a]">Opening accounts:</strong>{" "}
            any Bluesky <span className="font-mono text-[#b9f1ff]">@handle ↗</span> shown in IAZMA PRO is clickable. Tap the handle to open that profile on Bluesky.
          </p>
        </div>

        <div className="grid gap-3 lg:grid-cols-2">
          {guides.map((guide) => {
            const Icon = guide.icon;
            return (
              <div key={guide.title} className="rounded-xl border border-white/8 bg-black/15 p-4">
                <div className="flex items-center gap-2">
                  <Icon className="size-4 shrink-0 text-[#9cecff]" aria-hidden />
                  <h3 className="text-sm font-semibold text-white">{guide.title}</h3>
                </div>
                <p className="mt-3 text-xs leading-5 text-white/44">
                  <span className="font-semibold text-white/64">What it is: </span>
                  {guide.meaning}
                </p>
                <p className="mt-2 text-xs leading-5 text-white/44">
                  <span className="font-semibold text-[#f1d49a]">What to do: </span>
                  {guide.action}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}
