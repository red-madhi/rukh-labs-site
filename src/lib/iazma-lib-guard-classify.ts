/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck

export const DEFAULT_LIB_GUARD_SETTINGS = {
  min_score: 55,
  low_value_weight: 50,
  ukraine_weight: 25,
  lib_media_weight: 20,
  repost_weight: 5,
  ukraine_threshold: 20,
  lib_media_threshold: 18,
  quarantine_days: 30,
};

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Number.isFinite(Number(value)) ? Number(value) : 0));
}

function rounded(value) {
  return Math.round(clamp(value));
}

function excerpt(text, max = 180) {
  const clean = String(text ?? "").replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
}

function deepText(value, depth = 0) {
  if (!value || depth > 4) return [];
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap((item) => deepText(item, depth + 1));
  if (typeof value !== "object") return [];
  const object = value as Record<string, unknown>;
  const output = [];
  for (const key of ["text", "title", "description", "alt"]) {
    if (typeof object[key] === "string") output.push(String(object[key]));
  }
  for (const key of ["external", "media", "record", "embed", "value"]) {
    if (key in object) output.push(...deepText(object[key], depth + 1));
  }
  return output;
}

function itemText(item) {
  const pieces = [
    item?.post?.record?.text,
    ...deepText(item?.post?.embed),
  ].filter((value) => typeof value === "string" && value.trim());
  return pieces.join(" \n ").trim();
}

const UKRAINE_PATTERNS = [
  /\bukrain(?:e|ian|ians)\b/i,
  /\bzelensk(?:y|yy)\b/i,
  /\bkyiv\b|\bkiev\b/i,
  /\bcrimea\b|\bdonbas\b|\bdonetsk\b|\bluhansk\b/i,
  /\brussia(?:n)?\b.{0,45}\bukrain(?:e|ian)\b/i,
  /\bukrain(?:e|ian)\b.{0,45}\brussia(?:n)?\b/i,
  /\bnato\b.{0,45}\bukrain(?:e|ian)\b/i,
  /\bukrain(?:e|ian)\b.{0,45}\bnato\b/i,
];

const LIB_MEDIA_PATTERNS = [
  /\bmsnbc\b/i,
  /\bcnn\b/i,
  /\brachel\s+maddow\b|\bmaddow\b/i,
  /\bmorning\s+joe\b/i,
  /\bnicolle\s+wallace\b/i,
  /\blawrence\s+o['’]?donnell\b/i,
  /\bchris\s+hayes\b/i,
  /\bpod\s+save\s+america\b|\bcrooked\s+media\b/i,
  /\bthe\s+view\b/i,
  /\bstephen\s+colbert\b|\bcolbert\b/i,
  /\bjimmy\s+kimmel\b|\bkimmel\b/i,
  /\blast\s+week\s+tonight\b|\bjohn\s+oliver\b/i,
  /\bsaturday\s+night\s+live\b|\bsnl\b/i,
];

function topicStats(feed, patterns, category, label) {
  const texts = feed.map((item) => itemText(item)).filter(Boolean);
  const matches = texts.filter((text) => patterns.some((pattern) => pattern.test(text)));
  return {
    percentage: texts.length ? rounded((matches.length / texts.length) * 100) : 0,
    hits: matches.length,
    total: texts.length,
    evidence: matches.slice(0, 3).map((text) => ({
      category,
      source: "recent-post",
      label,
      excerpt: excerpt(text),
    })),
  };
}

function repostStats(feed) {
  if (!feed.length) return { percentage: 0, hits: 0, total: 0 };
  const hits = feed.filter((item) => Boolean(item?.reason)).length;
  return { percentage: rounded((hits / feed.length) * 100), hits, total: feed.length };
}

function weightedAverage(entries) {
  const active = entries.filter((entry) => entry.available !== false && Number(entry.weight) > 0);
  const denominator = active.reduce((sum, entry) => sum + Number(entry.weight), 0);
  if (!denominator) return 0;
  return active.reduce((sum, entry) => sum + clamp(entry.value) * Number(entry.weight), 0) / denominator;
}

function networkValue(profile, signals = {}) {
  const followers = Math.max(0, Number(profile.followers_count ?? profile.followersCount ?? 0));
  const reach = clamp(Math.log10(followers + 10) * 20);
  const reciprocity = profile.is_follower ? 100 : 20;
  const interaction = clamp((Number(signals.outgoingInteraction ?? 0) + Number(signals.incomingInteraction ?? 0)) * 1.55);
  const importance = clamp(signals.importanceScore ?? 0);
  const bridge = clamp(signals.expectedBridgeValue ?? 0);
  const visibility = clamp(signals.visibilityPotential ?? 0);

  const value = weightedAverage([
    { value: reach, weight: 25, available: true },
    { value: reciprocity, weight: 20, available: true },
    { value: interaction, weight: 22, available: signals.interactionAvailable === true },
    { value: importance, weight: 17, available: signals.recommendationFound === true },
    { value: bridge, weight: 11, available: signals.recommendationFound === true },
    { value: visibility, weight: 5, available: signals.recommendationFound === true },
  ]);

  return {
    value: rounded(value),
    reach: rounded(reach),
    reciprocity: rounded(reciprocity),
    interaction: rounded(interaction),
    importance: rounded(importance),
    bridge: rounded(bridge),
    visibility: rounded(visibility),
  };
}

export function normalizeLibGuardSettings(input = {}) {
  const base = { ...DEFAULT_LIB_GUARD_SETTINGS, ...(input ?? {}) };
  return {
    min_score: Math.max(25, Math.min(90, Number(base.min_score) || DEFAULT_LIB_GUARD_SETTINGS.min_score)),
    low_value_weight: Math.max(0, Math.min(100, Number(base.low_value_weight) || 0)),
    ukraine_weight: Math.max(0, Math.min(100, Number(base.ukraine_weight) || 0)),
    lib_media_weight: Math.max(0, Math.min(100, Number(base.lib_media_weight) || 0)),
    repost_weight: Math.max(0, Math.min(100, Number(base.repost_weight) || 0)),
    ukraine_threshold: Math.max(5, Math.min(90, Number(base.ukraine_threshold) || DEFAULT_LIB_GUARD_SETTINGS.ukraine_threshold)),
    lib_media_threshold: Math.max(5, Math.min(90, Number(base.lib_media_threshold) || DEFAULT_LIB_GUARD_SETTINGS.lib_media_threshold)),
    quarantine_days: Math.max(1, Math.min(180, Number(base.quarantine_days) || DEFAULT_LIB_GUARD_SETTINGS.quarantine_days)),
  };
}

export function assessLibGuardProfile(profile, feed, rawSettings, signals = {}, mutedAt = null) {
  const settings = normalizeLibGuardSettings(rawSettings);
  const ukraine = topicStats(feed, UKRAINE_PATTERNS, "ukraine_saturation", "Ukraine/Russia/NATO-topic match");
  const libMedia = topicStats(feed, LIB_MEDIA_PATTERNS, "lib_media_saturation", "TV/pundit-media match");
  const repost = repostStats(feed);
  const network = networkValue(profile, signals);
  const lowValue = 100 - network.value;

  const score = rounded(weightedAverage([
    { value: lowValue, weight: settings.low_value_weight },
    { value: ukraine.percentage, weight: settings.ukraine_weight },
    { value: libMedia.percentage, weight: settings.lib_media_weight },
    { value: repost.percentage, weight: settings.repost_weight },
  ]));

  const categories = [];
  const evidence = [];
  if (lowValue >= 55) {
    categories.push("low_network_value");
    evidence.push({
      category: "low_network_value",
      source: "iazma-network",
      label: `Network value ${network.value}/100`,
      excerpt: `Reach ${network.reach} · reciprocity ${network.reciprocity} · interaction ${network.interaction} · importance ${network.importance} · bridge ${network.bridge}`,
    });
  }
  if (ukraine.percentage >= settings.ukraine_threshold) {
    categories.push("ukraine_saturation");
    evidence.push(...ukraine.evidence);
  }
  if (libMedia.percentage >= settings.lib_media_threshold) {
    categories.push("lib_media_saturation");
    evidence.push(...libMedia.evidence);
  }
  if (repost.percentage >= 70) {
    categories.push("repost_heavy");
    evidence.push({
      category: "repost_heavy",
      source: "recent-feed",
      label: `${repost.percentage}% of sampled feed items are reposts`,
      excerpt: `${repost.hits} of ${repost.total} sampled feed items`,
    });
  }

  const flagged = score >= settings.min_score;
  if (flagged) categories.unshift("lib_guard_candidate");

  const mutedMs = mutedAt ? Date.now() - new Date(mutedAt).getTime() : 0;
  const mutedDays = Number.isFinite(mutedMs) && mutedMs > 0 ? Math.floor(mutedMs / 86_400_000) : 0;
  let recommendation = "keep";
  if (flagged) {
    if (mutedAt && mutedDays >= settings.quarantine_days && network.value < 58 && score >= Math.max(62, settings.min_score)) {
      recommendation = "unfollow";
    } else if (score >= 72 && network.value <= 45) {
      recommendation = "unfollow";
    } else if (network.value >= 65) {
      recommendation = "mute_keep";
    } else {
      recommendation = "mute";
    }
  }

  return {
    flagged,
    score,
    recommendation,
    categories,
    evidence: evidence.slice(0, 10),
    networkValue: network.value,
    lowNetworkValue: rounded(lowValue),
    ukraineSaturation: ukraine.percentage,
    libMediaSaturation: libMedia.percentage,
    repostRatio: repost.percentage,
    mutedDays,
    metrics: {
      network,
      topics: {
        ukraine: { percentage: ukraine.percentage, hits: ukraine.hits, total: ukraine.total },
        libMedia: { percentage: libMedia.percentage, hits: libMedia.hits, total: libMedia.total },
        repost: { percentage: repost.percentage, hits: repost.hits, total: repost.total },
      },
      advanced: {
        outgoingInteraction: Number(signals.outgoingInteraction ?? 0),
        incomingInteraction: Number(signals.incomingInteraction ?? 0),
        importanceScore: Number(signals.importanceScore ?? 0),
        expectedBridgeValue: Number(signals.expectedBridgeValue ?? 0),
        visibilityPotential: Number(signals.visibilityPotential ?? 0),
        independentPaths: Number(signals.independentPaths ?? 0),
        sharedBestieClusters: Number(signals.sharedBestieClusters ?? 0),
        interactionAvailable: signals.interactionAvailable === true,
        recommendationFound: signals.recommendationFound === true,
      },
    },
  };
}
