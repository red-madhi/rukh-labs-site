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
      "People already close to you in the graph: followers, mutuals, and other accounts with an existing relationship foothold.",
  },
  mutual: {
    label: "Mutual",
    description: "You follow them and they follow you back. Mutual edges are the core trusted links used for reciprocal path distance.",
  },
  bridge: {
    label: "Bridge",
    description:
      "A reachable person who connects your network toward a destination. Bridges are the people to cultivate because stronger real relationships with them can move you closer to the larger account's social neighborhood.",
  },
  independentPath: {
    label: "Independent path",
    description:
      "A distinct warm route from you toward the same destination. Four genuinely separate bridge routes are more strategically valuable than one fragile route because they create broader social proof.",
  },
  targetCircle: {
    label: "Target-circle connection",
    description:
      "Someone who appears in or near a destination account's close reciprocal/interaction neighborhood. This describes their position around the target; it does not mean they are already your friend or bestie.",
  },
  targetBestie: {
    label: "Target-circle bestie",
    description:
      "A strongly connected account in the destination's neighborhood, based on reciprocal-follow and repeated-interaction evidence. They are a bestie/close connection of the target circle, not automatically your bestie.",
  },
  bridgeBestie: {
    label: "Bridge-circle bestie",
    description:
      "Someone strongly connected to one of your bridge accounts. Building a genuine relationship here can widen the number of warm routes into a target neighborhood.",
  },
  bestieOfBestie: {
    label: "Bestie-of-bestie",
    description:
      "One layer beyond a strong reciprocal/interaction relationship. It is a deeper neighborhood signal used to find additional routes without pretending every account is directly close to the destination.",
  },
  emergingRelationship: {
    label: "Your emerging relationship",
    description:
      "A relationship involving your own account that is showing signs of strengthening through reciprocity and repeated interaction. This term should only be used when the evidence is about you and that person directly.",
  },
  wave2: {
    label: "Wave 2",
    description:
      "A fresh influential destination discovered after expanding the first set of bridges, besties, and deeper neighborhoods. It keeps the engine moving outward instead of repeatedly analyzing the same big accounts.",
  },
  reciprocity: {
    label: "Reciprocity potential",
    description:
      "A heuristic signal for how promising a relationship may be to turn mutual. It is not a probability or a promise of a follow-back.",
  },
  observable: {
    label: "Observable graph",
    description:
      "The portion of the network Bluesky's graph endpoint can currently enumerate. It can be smaller than the profile's total follower count because some relationships are not publicly enumerable.",
  },
  socialProof: {
    label: "Destination social proof",
    description:
      "How much warm relationship coverage you have around a destination. More independent bridge people and paths mean you are less socially distant from that neighborhood.",
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
  "bridge",
  "independentPath",
  "socialProof",
  "warmNetwork",
  "mutual",
  "targetCircle",
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
            <span className="mt-0.5 block text-[11px] text-white/34">What bridges, besties, paths, levels, and target circles actually mean.</span>
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
