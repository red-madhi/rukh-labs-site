export const MAX_EXPLICIT_TARGETS = 10;
export const DEFAULT_DEEP_TARGETS = 6;

export type AdvancedTargetMode = "profiles" | "categories" | "hybrid" | "suggested";
export type TargetCost = "low" | "medium" | "high" | "very-high";
export type TargetDisposition = "deep-analysis" | "deferred";

export type AdvancedNetworkCategory = {
  id: string;
  label: string;
  group: string;
};

export const ADVANCED_NETWORK_CATEGORIES: AdvancedNetworkCategory[] = [
  { id: "politics", label: "Politics", group: "Public life" },
  { id: "journalism", label: "Journalism & media", group: "Public life" },
  { id: "activism", label: "Activism & advocacy", group: "Public life" },
  { id: "film-tv", label: "Film & television", group: "Entertainment" },
  { id: "celebrity", label: "Celebrities", group: "Entertainment" },
  { id: "music", label: "Music", group: "Entertainment" },
  { id: "comedy", label: "Comedy", group: "Entertainment" },
  { id: "gaming", label: "Gaming", group: "Technology & games" },
  { id: "indie-games", label: "Indie games", group: "Technology & games" },
  { id: "game-dev", label: "Game development", group: "Technology & games" },
  { id: "software", label: "Software development", group: "Technology & games" },
  { id: "linux-open-source", label: "Linux & open source", group: "Technology & games" },
  { id: "startups", label: "Startups & founders", group: "Business" },
  { id: "design", label: "Design & UX", group: "Business" },
  { id: "science", label: "Science", group: "Knowledge" },
  { id: "books", label: "Books & authors", group: "Knowledge" },
  { id: "art", label: "Art & illustration", group: "Creative" },
  { id: "creators", label: "Creators", group: "Creative" },
  { id: "sports", label: "Sports", group: "Sports" },
  { id: "nfl", label: "NFL", group: "Sports" },
  { id: "nba", label: "NBA", group: "Sports" },
  { id: "mlb", label: "MLB", group: "Sports" },
  { id: "nhl", label: "NHL", group: "Sports" },
  { id: "soccer", label: "Soccer", group: "Sports" },
];

export type ReconTarget = {
  did: string;
  handle: string;
  displayName?: string;
  followersCount: number;
  followsCount: number;
  priorityScore: number;
  estimatedCost: TargetCost;
  disposition: TargetDisposition;
  relationship: {
    following: boolean;
    followedBy: boolean;
    mutual: boolean;
  };
};

export type ReconResponse = {
  actor: {
    did: string;
    handle: string;
    displayName?: string;
  };
  categories: string[];
  requestedTargetCount: number;
  deepTargetLimit: number;
  targets: ReconTarget[];
  deferredCount: number;
};

export type NetworkImportanceInputs = {
  shortestMutualDistance?: number | null;
  independentPaths: number;
  sharedBestieClusters: number;
  interactionStrength: number;
  followersCount: number;
  followBackLikelihood: number;
  categoryRelevance: number;
};

function clamp(value: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value));
}

export function calculateDynamicImportance(input: NetworkImportanceInputs) {
  const distanceScore = input.shortestMutualDistance
    ? clamp(120 - input.shortestMutualDistance * 22)
    : 18;
  const pathScore = clamp(Math.log2(input.independentPaths + 1) * 24);
  const clusterScore = clamp(Math.log2(input.sharedBestieClusters + 1) * 22);
  const interactionScore = clamp(input.interactionStrength);
  const reachScore = clamp((Math.log10(Math.max(0, input.followersCount) + 10) / 7) * 100);
  const reciprocityScore = clamp(input.followBackLikelihood);
  const relevanceScore = clamp(input.categoryRelevance);

  return Math.round(
    distanceScore * 0.24 +
      pathScore * 0.17 +
      clusterScore * 0.14 +
      interactionScore * 0.14 +
      reachScore * 0.1 +
      reciprocityScore * 0.11 +
      relevanceScore * 0.1,
  );
}

export function estimateGraphCost(followersCount = 0, followsCount = 0): TargetCost {
  const graphSize = Math.max(0, followersCount) + Math.max(0, followsCount);
  if (graphSize >= 1_000_000) return "very-high";
  if (graphSize >= 250_000) return "high";
  if (graphSize >= 50_000) return "medium";
  return "low";
}

export function targetPriorityScore({
  followersCount,
  followsCount,
  mutual,
  oneWay,
}: {
  followersCount: number;
  followsCount: number;
  mutual: boolean;
  oneWay: boolean;
}) {
  const influence = clamp((Math.log10(Math.max(0, followersCount) + 10) / 7) * 100);
  const cost = estimateGraphCost(followersCount, followsCount);
  const costPenalty = { low: 0, medium: 5, high: 11, "very-high": 18 }[cost];
  return clamp(Math.round(influence * 0.82 + (mutual ? 24 : oneWay ? 6 : 0) - costPenalty));
}
