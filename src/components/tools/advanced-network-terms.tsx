"use client";

import { BookOpen, HelpCircle } from "lucide-react";

export const NETWORK_TERM_DEFINITIONS = {
  destination: {
    label: "Destination / target",
    description:
      "A larger account or network neighborhood you want to become socially closer to. Destinations guide the strategy; they are usually not the people you should spend most of your effort cold-replying to.",
  },
  warmNetwork: {
    label: "Warm network",
    description:
      "People already close to you in the graph: followers, mutuals, and accounts with an existing interaction or relationship foothold. Warmth is weighted; a person who actually talks with you is warmer than a silent mutual.",
  },
  mutual: {
    label: "Mutual",
    description:
      "You follow them and they follow you back. A mutual follow is useful evidence, but it does not by itself prove friendship, trust, or active social influence.",
  },
  bridgeCandidate: {
    label: "Bridge candidate",
    description:
      "A reachable person worth cultivating because they may help connect you toward a destination. Candidate means strategically promising; it does not mean a warm route involving you has been activated yet.",
  },
  bridge: {
    label: "Activated bridge",
    description:
      "A person in your warm network whose active or reciprocal relationship with you now creates a validated route into a destination neighborhood. This is a later stage than a bridge candidate.",
  },
  weightedPath: {
    label: "Weighted path",
    description:
      "A route ranked by relationship quality, not just hop count. Reciprocal interaction, recency, target-to-bridge attention, and confidence can make a three-hop route stronger than a hollow two-hop route.",
  },
  independentPath: {
    label: "Node-independent path",
    description:
      "A route that does not rely on the same internal bridge person as another counted route. Four paths that all collapse through one person are not treated as four independent sources of social proof.",
  },
  tieConfidence: {
    label: "Tie confidence",
    description:
      "How much evidence supports a relationship: reciprocal follow status, interaction in both directions, repeated activity on separate days, recency, and attention flowing from the destination. Possible, likely, and strong are confidence bands—not claims of friendship.",
  },
  structuralPath: {
    label: "Structural path",
    description:
      "The follow chain exists, but the route has not shown enough meaningful public activity to count as an active social relationship yet.",
  },
  activePath: {
    label: "Active path",
    description:
      "People on the route repeatedly interact with one another. The route is socially alive, but it may not yet create visible overlap involving you.",
  },
  activatedPath: {
    label: "Activated path",
    description:
      "The bridge relationship has started creating visible overlap involving you—for example, replies, quotes, reposts, or a warm follower relationship connected to an active route.",
  },
  convertedPath: {
    label: "Converted path",
    description:
      "The relationship involving you is reciprocal and can support a durable warm route. Converted does not mean the final destination followed you; it means the foothold itself became real.",
  },
  targetCircle: {
    label: "Target-circle connection",
    description:
      "Someone who appears in or near a destination account's reciprocal interaction neighborhood. This describes their position around the target; it does not mean they are already your friend.",
  },
  targetBestie: {
    label: "Target-circle bestie",
    description:
      "Product shorthand for a high-confidence reciprocal interaction tie in the destination's neighborhood. It requires more than a mutual follow, but it is still an evidence label—not a literal claim about private friendship.",
  },
  bridgeBestie: {
    label: "Bridge-circle bestie",
    description:
      "A high-confidence reciprocal interaction tie around one of your bridge accounts. Cultivating this person can widen your independent routes into a destination neighborhood.",
  },
  bestieOfBestie: {
    label: "Bestie-of-bestie",
    description:
      "One evidence-discounted layer beyond a strong reciprocal interaction relationship. It is an exploration signal, not automatic proof that the person is close to the destination.",
  },
  emergingRelationship: {
    label: "Your emerging relationship",
    description:
      "A relationship involving your own account that is strengthening through reciprocity and repeated interaction. This term is reserved for evidence about you and that person directly.",
  },
  wave2: {
    label: "Wave 2 / round two",
    description:
      "A new destination neighborhood discovered only after a round-one foothold becomes activated or converted. The engine no longer expands round two from every speculative recommendation.",
  },
  reciprocity: {
    label: "Reciprocity potential",
    description:
      "A heuristic signal for how promising a relationship may be to turn mutual. It is not a probability or a promise of a follow-back.",
  },
  marginalCoverage: {
    label: "Marginal coverage",
    description:
      "How much genuinely new network territory a person adds. The first useful route into a new target subcluster is worth more than the seventh redundant person from the same clique.",
  },
  observable: {
    label: "Observable graph",
    description:
      "The portion of the network Bluesky's graph endpoint can currently enumerate. It can be smaller than the profile's total follower count because some relationships are not publicly enumerable.",
  },
  socialProof: {
    label: "Destination social proof",
    description:
      "How much active, independent warm relationship coverage you have around a destination. Passive follow chains count less than activated or converted routes.",
  },
  expandedNetwork: {
    label: "Expanded network",
    description:
      "The result of developing real bridge relationships: new destination circles, stronger independent routes, and additional communities become reachable for later analysis.",
  },
  networkLevel: {
    label: "Network Level",
    description:
      "A quality-growth score based on progress from your saved baseline: mutual growth, real follow-backs, bridge coverage, independent warm paths, and relationship interaction. Raw mass-following is intentionally not rewarded.",
  },
} as const;

export type NetworkTermKey = keyof typeof NETWORK_TERM_DEFINITIONS;

export function NetworkTermHelp({ term }: { term: NetworkTermKey }) {
  const definition = NETWORK_TERM_DEFINITIONS[term];
  return (
    <span className="group relative inline-flex align-middle">
      <button
        type="button"
        className="ml-1 inline-grid size-4 place-items-center rounded-full border border-white/10 bg-white/[0.025] text-white/30 outline-none transition hover:border-[#16c8ff]/30 hover:text-[#9cecff] focus:border-[#16c8ff]/35 focus:text-[#9cecff]"
        aria-label={`What does ${definition.label} mean?`}
        title={definition.description}
      >
        <HelpCircle className="size-2.5" aria-hidden />
      </button>
      <span
        role="tooltip"
        className="pointer-events-none absolute left-1/2 top-full z-50 mt-2 hidden w-72 -translate-x-1/2 rounded-xl border border-white/10 bg-[#090c11]/98 p-3 text-left shadow-2xl backdrop-blur-xl group-hover:block group-focus-within:block"
      >
        <span className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8ce8ff]">
          {definition.label}
        </span>
        <span className="mt-1.5 block text-[11px] leading-5 text-white/58">
          {definition.description}
        </span>
      </span>
    </span>
  );
}

const glossaryOrder: NetworkTermKey[] = [
  "destination",
  "bridgeCandidate",
  "targetCircle",
  "bridge",
  "expandedNetwork",
  "weightedPath",
  "independentPath",
  "tieConfidence",
  "structuralPath",
  "activePath",
  "activatedPath",
  "convertedPath",
  "socialProof",
  "marginalCoverage",
  "warmNetwork",
  "mutual",
  "targetBestie",
  "bridgeBestie",
  "bestieOfBestie",
  "emergingRelationship",
  "wave2",
  "reciprocity",
  "observable",
  "networkLevel",
];

export function AdvancedNetworkTerms() {
  return (
    <details className="rounded-2xl border border-white/9 bg-white/[0.016] p-5 sm:p-6">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
        <span className="flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-xl border border-[#16c8ff]/15 bg-[#16c8ff]/[0.045] text-[#8ce8ff]">
            <BookOpen className="size-4" aria-hidden />
          </span>
          <span>
            <span className="block text-sm font-semibold text-white">Network terms</span>
            <span className="mt-0.5 block text-[11px] text-white/34">
              What bridge candidates, activated bridges, target circles, evidence stages, and expanded networks actually mean.
            </span>
          </span>
        </span>
        <span className="rounded-full border border-white/8 px-2.5 py-1 text-[10px] text-white/32">Glossary</span>
      </summary>

      <div className="mt-5 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
        {glossaryOrder.map((key) => {
          const definition = NETWORK_TERM_DEFINITIONS[key];
          return (
            <div key={key} className="rounded-xl border border-white/7 bg-black/15 p-3.5">
              <p className="text-xs font-semibold text-white/78">{definition.label}</p>
              <p className="mt-1.5 text-[11px] leading-5 text-white/40">{definition.description}</p>
            </div>
          );
        })}
      </div>
    </details>
  );
}
