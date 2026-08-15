export type NetworkGoal =
  | "balanced"
  | "community-entry"
  | "follow-backs"
  | "visibility"
  | "clients"
  | "collaboration";

export type RelationshipStage = "structural" | "active" | "activated" | "converted";
export type TieConfidenceLevel = "possible" | "likely" | "strong";

export type HumanFitLabel =
  | "my-kind-of-person"
  | "worth-cultivating"
  | "already-know"
  | "not-for-me"
  | "not-my-audience"
  | "destination-only";

export type WeightedPathLike = {
  targetDid: string;
  viaDids: string[];
  pathConfidence: number;
  weightedCost: number;
  stage: RelationshipStage;
};

export type BridgeScoreInputs = {
  weightedDistance: number;
  nodeIndependentPaths: number;
  destinationClusters: number;
  tieConfidence: number;
  interactionStrength: number;
  reciprocityPotential: number;
  visibilityPotential: number;
  topicalFit: number;
  marginalCoverage: number;
  followersCount: number;
  stage: RelationshipStage;
  humanFit?: HumanFitLabel | null;
  historicalConversionRate?: number;
  spamPenalty?: number;
};

const GOAL_WEIGHTS: Record<
  NetworkGoal,
  {
    distance: number;
    independence: number;
    clusters: number;
    tie: number;
    interaction: number;
    reciprocity: number;
    visibility: number;
    relevance: number;
    coverage: number;
    reach: number;
  }
> = {
  balanced: {
    distance: 0.12,
    independence: 0.14,
    clusters: 0.08,
    tie: 0.13,
    interaction: 0.1,
    reciprocity: 0.13,
    visibility: 0.1,
    relevance: 0.09,
    coverage: 0.07,
    reach: 0.04,
  },
  "community-entry": {
    distance: 0.11,
    independence: 0.16,
    clusters: 0.12,
    tie: 0.14,
    interaction: 0.11,
    reciprocity: 0.09,
    visibility: 0.08,
    relevance: 0.1,
    coverage: 0.07,
    reach: 0.02,
  },
  "follow-backs": {
    distance: 0.09,
    independence: 0.09,
    clusters: 0.05,
    tie: 0.14,
    interaction: 0.11,
    reciprocity: 0.25,
    visibility: 0.07,
    relevance: 0.1,
    coverage: 0.06,
    reach: 0.04,
  },
  visibility: {
    distance: 0.1,
    independence: 0.15,
    clusters: 0.08,
    tie: 0.1,
    interaction: 0.09,
    reciprocity: 0.07,
    visibility: 0.17,
    relevance: 0.08,
    coverage: 0.08,
    reach: 0.08,
  },
  clients: {
    distance: 0.08,
    independence: 0.1,
    clusters: 0.08,
    tie: 0.12,
    interaction: 0.11,
    reciprocity: 0.11,
    visibility: 0.08,
    relevance: 0.19,
    coverage: 0.08,
    reach: 0.05,
  },
  collaboration: {
    distance: 0.09,
    independence: 0.1,
    clusters: 0.07,
    tie: 0.16,
    interaction: 0.15,
    reciprocity: 0.14,
    visibility: 0.07,
    relevance: 0.13,
    coverage: 0.06,
    reach: 0.03,
  },
};

export const NETWORK_GOALS: Array<{
  id: NetworkGoal;
  label: string;
  description: string;
}> = [
  {
    id: "balanced",
    label: "Balanced growth",
    description: "Balance reach, follow-back potential, relevant communities, and durable bridges.",
  },
  {
    id: "community-entry",
    label: "Enter a community",
    description: "Prefer several independent, trustworthy paths into distinct parts of a target community.",
  },
  {
    id: "follow-backs",
    label: "Earn follow-backs",
    description: "Prioritize reachable people with strong reciprocity signals over prestige.",
  },
  {
    id: "visibility",
    label: "Increase visibility",
    description: "Favor people likely to create public exposure through replies, quotes, and reposts.",
  },
  {
    id: "clients",
    label: "Find clients",
    description: "Favor topic and audience fit, realistic access, and relevant professional clusters.",
  },
  {
    id: "collaboration",
    label: "Find collaborators",
    description: "Favor reciprocal interaction, shared interests, and durable working relationships.",
  },
];

export function clamp(value: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value));
}

export function confidenceLevel(score: number): TieConfidenceLevel {
  if (score >= 78) return "strong";
  if (score >= 58) return "likely";
  return "possible";
}

export function relationshipStageRank(stage: RelationshipStage) {
  return { structural: 0, active: 1, activated: 2, converted: 3 }[stage];
}

export function bestRelationshipStage(stages: RelationshipStage[]): RelationshipStage {
  return stages.reduce<RelationshipStage>(
    (best, current) =>
      relationshipStageRank(current) > relationshipStageRank(best) ? current : best,
    "structural",
  );
}

export function calculateTieConfidence(input: {
  mutual: boolean;
  outgoingScore: number;
  incomingScore: number;
  outgoingEvents: number;
  incomingEvents: number;
  distinctDays: number;
  recencyHours: number | null;
}) {
  const recency =
    input.recencyHours == null
      ? 0
      : input.recencyHours <= 72
        ? 12
        : input.recencyHours <= 336
          ? 8
          : input.recencyHours <= 1_440
            ? 4
            : 0;
  const bidirectional = input.outgoingEvents > 0 && input.incomingEvents > 0 ? 12 : 0;
  return clamp(
    (input.mutual ? 30 : 8) +
      Math.min(17, input.outgoingScore * 0.32) +
      Math.min(23, input.incomingScore * 0.42) +
      Math.min(10, input.distinctDays * 2.5) +
      recency +
      bidirectional,
  );
}

export function calculateWeightedPathCost(hops: number, confidence: number) {
  return Math.round((Math.max(1, hops) + (100 - clamp(confidence)) / 32) * 100) / 100;
}

function internalNodes(path: WeightedPathLike) {
  if (path.viaDids.length <= 2) return [];
  return path.viaDids.slice(1, -1);
}

/**
 * Greedy node-disjoint approximation. Target endpoints may be shared; internal
 * brokers may not. Direct paths to different targets count independently.
 */
export function countNodeIndependentPaths(paths: WeightedPathLike[]) {
  const ordered = [...paths].sort(
    (a, b) =>
      relationshipStageRank(b.stage) - relationshipStageRank(a.stage) ||
      b.pathConfidence - a.pathConfidence ||
      a.weightedCost - b.weightedCost,
  );
  const used = new Set<string>();
  const directTargets = new Set<string>();
  let count = 0;

  for (const path of ordered) {
    const internal = internalNodes(path);
    if (!internal.length) {
      if (directTargets.has(path.targetDid)) continue;
      directTargets.add(path.targetDid);
      count += 1;
      continue;
    }
    if (internal.some((did) => used.has(did))) continue;
    internal.forEach((did) => used.add(did));
    count += 1;
  }
  return count;
}

export function humanFitAdjustment(label?: HumanFitLabel | null) {
  if (label === "worth-cultivating") return 14;
  if (label === "my-kind-of-person") return 10;
  if (label === "already-know") return 8;
  if (label === "not-for-me" || label === "not-my-audience") return -100;
  if (label === "destination-only") return -80;
  return 0;
}

export function calculateExpectedBridgeValue(
  input: BridgeScoreInputs,
  goal: NetworkGoal = "balanced",
) {
  const weights = GOAL_WEIGHTS[goal] ?? GOAL_WEIGHTS.balanced;
  const distanceScore = clamp(118 - input.weightedDistance * 21);
  const independenceScore = clamp(Math.log2(input.nodeIndependentPaths + 1) * 31);
  const clusterScore = clamp(Math.log2(input.destinationClusters + 1) * 28);
  const reachScore = clamp((Math.log10(Math.max(0, input.followersCount) + 10) / 6.5) * 100);
  const stageBonus = { structural: 0, active: 5, activated: 12, converted: 18 }[input.stage];
  const calibration = clamp(input.historicalConversionRate ?? 50);

  const score =
    distanceScore * weights.distance +
    independenceScore * weights.independence +
    clusterScore * weights.clusters +
    clamp(input.tieConfidence) * weights.tie +
    clamp(input.interactionStrength) * weights.interaction +
    clamp(input.reciprocityPotential) * weights.reciprocity +
    clamp(input.visibilityPotential) * weights.visibility +
    clamp(input.topicalFit) * weights.relevance +
    clamp(input.marginalCoverage) * weights.coverage +
    reachScore * weights.reach +
    (calibration - 50) * 0.08 +
    stageBonus +
    humanFitAdjustment(input.humanFit) -
    Math.max(0, input.spamPenalty ?? 0);

  return clamp(Math.round(score));
}

export function normalizeNetworkGoal(value: string | null | undefined): NetworkGoal {
  return NETWORK_GOALS.some((goal) => goal.id === value) ? (value as NetworkGoal) : "balanced";
}
