"use client";

import { BookOpen } from "lucide-react";
import { HelpPopover } from "@/components/tools/advanced-network-explain";

export const NETWORK_TERM_DEFINITIONS = {
  destination: {
    label: "Destination / target",
    description:
      "A larger account or community you want to become closer to. It gives the map a direction. It is usually context—not the next person you should cold-message or chase.",
  },
  destinationNeighborhood: {
    label: "Destination neighborhood",
    description:
      "The group of people who regularly connect or interact around a destination account. IAZMA looks for reachable people near that community instead of treating the large account as the only goal.",
  },
  warmNetwork: {
    label: "Warm network",
    description:
      "People already close to you: followers, mutuals, and accounts with signs of an existing public relationship. A person who actually interacts with you counts as warmer than a silent follow.",
  },
  mutual: {
    label: "Mutual",
    description:
      "You follow each other. That is a useful starting signal, but it does not automatically mean friendship, trust, or an active relationship.",
  },
  bridgeCandidate: {
    label: "Bridge candidate",
    description:
      "A reachable person who may connect your current network toward a destination community. Candidate means worth checking—not someone you owe a follow and not yet a proven relationship.",
  },
  bridge: {
    label: "Activated bridge",
    description:
      "A person whose real, active or reciprocal relationship with you now creates a usable route toward another community. This is earned later; it is stronger than a bridge candidate.",
  },
  foothold: {
    label: "Foothold",
    description:
      "A genuine relationship that gives your network a real starting point inside another community. Keep treating the person normally; a foothold is evidence of connection, not permission to use them.",
  },
  weightedPath: {
    label: "Weighted path",
    description:
      "A route scored by how real and recent the public relationships look, not only by the number of hops. A slightly longer active route can rank above a short chain of silent follows.",
  },
  independentPath: {
    label: "Independent path",
    description:
      "A separate route that does not depend on the same middle person as another route. Two independent routes are stronger than several routes that all collapse through one account.",
  },
  tieConfidence: {
    label: "Connection confidence",
    description:
      "How much public evidence supports the connection: reciprocal follows, interaction in both directions, repeated activity, recency, and attention from the destination side. It is not a claim about private friendship.",
  },
  structuralPath: {
    label: "Discovered path",
    description:
      "The follow route exists, but there is not enough public activity yet to treat it as a live social relationship. Read it as a possibility, not an action.",
  },
  activePath: {
    label: "Warming path",
    description:
      "People on the route interact repeatedly, so the route looks socially alive. Your own relationship with the reachable person may still be developing.",
  },
  activatedPath: {
    label: "Activated path",
    description:
      "The route now includes visible overlap involving you, such as replies, quotes, reposts, or another active public connection.",
  },
  convertedPath: {
    label: "Reciprocal foothold",
    description:
      "The reachable relationship involving you became reciprocal and can support a durable warm route. This does not mean the final destination account followed you.",
  },
  targetCircle: {
    label: "Target-circle connection",
    description:
      "A person who appears in or near a destination account's active public network. This describes where they sit on the map; it does not mean they are already close to you.",
  },
  targetBestie: {
    label: "Target-circle bestie",
    description:
      "IAZMA shorthand for a strong, repeated, two-way public interaction around a destination. It is an evidence label—not a literal claim that the people are private best friends.",
  },
  bridgeBestie: {
    label: "Bridge-circle bestie",
    description:
      "A strong, repeated, two-way public interaction around one of your bridge accounts. This person may add another route into the same community.",
  },
  bestieOfBestie: {
    label: "Bestie-of-bestie",
    description:
      "One exploration layer beyond a strong reciprocal public relationship. It is a lead worth inspecting, not proof that the person is close to you or the destination.",
  },
  emergingRelationship: {
    label: "Your emerging relationship",
    description:
      "A connection between you and another person that is strengthening through reciprocity and repeated public interaction.",
  },
  wave2: {
    label: "Round 2 / new branch",
    description:
      "A new community that becomes worth exploring only after a first-round relationship becomes genuinely active or reciprocal. IAZMA waits for a real foothold instead of expanding from every guess.",
  },
  roundTwo: {
    label: "Round 2",
    description:
      "The next layer of discovery unlocked by a real first-round foothold. It means the tool can look outward from a new branch; it does not mean you should immediately contact everyone it finds.",
  },
  reciprocity: {
    label: "Reciprocity potential",
    description:
      "A ranking signal for how plausible a two-way connection may be based on visible network evidence. It is not a probability and never promises a follow-back.",
  },
  marginalCoverage: {
    label: "New network coverage",
    description:
      "How much genuinely new territory a person adds. The first useful route into a new part of a community matters more than another nearly identical route through the same clique.",
  },
  observable: {
    label: "Observable network",
    description:
      "The part of the network Bluesky currently lets the tool enumerate. It can be smaller than the profile's displayed follower total, so treat it as the visible map—not the entire social world.",
  },
  socialProof: {
    label: "Destination social proof",
    description:
      "How much independent, active warm-network coverage you have around a destination. Several real routes can make your name familiar through normal overlap without cold outreach.",
  },
  expandedNetwork: {
    label: "Expanded network",
    description:
      "The new circles and routes that become visible after genuine bridge relationships develop. New branches are an outcome of real connections, not mass-following.",
  },
  networkLevel: {
    label: "Network Level",
    description:
      "A progress score based on change from your saved baseline: mutual growth, real follow-backs, active bridge coverage, separate warm paths, and interaction. Raw mass-following is deliberately not rewarded.",
  },
  bridgeLeverage: {
    label: "Bridge leverage",
    description:
      "How much useful network access this person could add based on route quality, destination coverage, and separate paths. It ranks the opportunity; it is not a judgment of the person's value.",
  },
  importanceScore: {
    label: "Recommendation priority",
    description:
      "The overall score IAZMA uses to sort this recommendation list. Higher means the account looks more useful for your current goal—not that the person is objectively more important.",
  },
  sharedTargetClusters: {
    label: "Destination groups",
    description:
      "How many different destination communities this person helps connect toward. More groups can make the person broadly relevant, but personal fit still matters.",
  },
  routeDistance: {
    label: "Route distance",
    description:
      "The number of relationship steps between your starting network and the destination along this route. Shorter can help, but IAZMA also weighs whether those connections look active.",
  },
  interactionStrength: {
    label: "Interaction strength",
    description:
      "A score based on visible public activity along the route. Higher means the route shows more evidence of real interaction; it does not reveal private relationships.",
  },
  signalStrength: {
    label: "Signal strength",
    description:
      "How strongly the available public evidence supports this specific connection pattern. Use it to compare results, not as a claim of certainty.",
  },
  clusterStrength: {
    label: "Community strength",
    description:
      "How much active, separate warm-network coverage supports this destination community. Higher means the result is backed by more than one fragile route.",
  },
  humanFit: {
    label: "Human-fit feedback",
    description:
      "Your judgment about whether you would genuinely want this person in your network. This teaches future rankings what graph math cannot know about your taste.",
  },
  relationshipStage: {
    label: "Relationship stage",
    description:
      "Where the route currently sits: discovered, warming, active, or reciprocal. The stage describes public evidence and helps separate context from an actual next action.",
  },
} as const;

export type NetworkTermKey = keyof typeof NETWORK_TERM_DEFINITIONS;

export function NetworkTermHelp({ term }: { term: NetworkTermKey }) {
  const definition = NETWORK_TERM_DEFINITIONS[term];
  return (
    <HelpPopover label={definition.label} className="ml-1">
      {definition.description}
    </HelpPopover>
  );
}

const glossaryOrder: NetworkTermKey[] = [
  "destination",
  "destinationNeighborhood",
  "bridgeCandidate",
  "targetCircle",
  "bridge",
  "foothold",
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
  "bridgeLeverage",
  "interactionStrength",
  "humanFit",
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
            <span className="block text-sm font-semibold text-white">Term reference</span>
            <span className="mt-0.5 block text-[11px] text-white/34">
              The same plain-language explanations used by the info buttons throughout IAZMA PRO.
            </span>
          </span>
        </span>
        <span className="rounded-full border border-white/8 px-2.5 py-1 text-[10px] text-white/32">
          Optional
        </span>
      </summary>

      <div className="mt-5 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
        {glossaryOrder.map((key) => {
          const definition = NETWORK_TERM_DEFINITIONS[key];
          return (
            <div key={key} className="rounded-xl border border-white/7 bg-black/15 p-3.5">
              <p className="text-xs font-semibold text-white/78">{definition.label}</p>
              <p className="mt-1.5 text-[11px] leading-5 text-white/40">
                {definition.description}
              </p>
            </div>
          );
        })}
      </div>
    </details>
  );
}
