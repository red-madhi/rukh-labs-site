export type Metrics = {
  followersCount?: number;
  followsCount?: number;
  mutualsCount?: number;
  networkXp?: number;
  baseline?: boolean;
  source?: string;
  mutualsSampled?: boolean;
};

export type Snapshot = {
  capturedAt: string;
  metrics: Metrics;
};

export type NetworkLevel = {
  xp: number;
  level: number;
  title: string;
  currentLevelXp: number;
  nextLevelXp: number | null;
  nextLevelTitle: string | null;
  progressPercent: number;
  breakdown: {
    followerGrowth: number;
    mutualGrowth: number;
    bridgeGrowth: number;
    pathGrowth: number;
    followBacks: number;
    interactions: number;
  };
  stats: {
    bridgePeople: number;
    independentPaths: number;
    newBridgePeople: number;
    newIndependentPaths: number;
    followBacks: number;
    interactionScore: number;
  };
  scoringNote: string;
};

export type ProgressResponse = {
  actor: { did: string; handle: string; displayName?: string };
  baseline: Snapshot;
  current: Snapshot;
  delta: { followers: number; follows: number; mutuals: number };
  continuingExistingHistory: boolean;
  networkLevel: NetworkLevel;
  error?: string;
};

export type MetricId = "followers" | "following" | "mutuals";
export type ChartId = MetricId | "level";

export type ProgressMetric = {
  id: MetricId;
  label: string;
  before: number;
  now: number;
  delta: number;
  measures: string;
  why: string;
  next: string;
};

export function safe(value: number | undefined) {
  return Math.max(0, value ?? 0);
}

export function exact(value: number | undefined) {
  return new Intl.NumberFormat("en-US").format(safe(value));
}

export function signed(value: number) {
  return `${value >= 0 ? "+" : ""}${new Intl.NumberFormat("en-US").format(value)}`;
}

export function localDate(value: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "baseline";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}
