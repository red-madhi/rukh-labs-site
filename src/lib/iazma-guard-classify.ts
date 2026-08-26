/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
function daysAgo(iso) {
  if (!iso) return null;
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms)) return null;
  return Math.floor(ms / 86_400_000);
}

function normalizeText(text = "") {
  return text
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, " URL ")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function excerpt(text, max = 180) {
  const clean = String(text ?? "").replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
}

function postText(item) {
  const record = item?.post?.record;
  return typeof record?.text === "string" ? record.text : "";
}

function activityTime(item) {
  const recordCreated = item?.post?.record?.createdAt;
  const repostIndexed = item?.reason?.indexedAt;
  const postIndexed = item?.post?.indexedAt;
  return [recordCreated, repostIndexed, postIndexed]
    .filter(Boolean)
    .sort()
    .at(-1) ?? null;
}

function explicitRightWingBioEvidence(profile) {
  const bio = `${profile.display_name ?? ""}\n${profile.description ?? ""}`.trim();
  if (!bio) return [];
  const lower = bio.toLowerCase();
  const negativeContexts = ["anti-maga", "anti maga", "against maga", "not maga", "maga tears", "former republican", "ex-republican"];
  if (negativeContexts.some((x) => lower.includes(x))) return [];

  const patterns = [
    { re: /\bproud\s+(?:maga|conservative|republican)\b/i, label: "explicit political self-identification" },
    { re: /\b(?:maga|america first)\b.{0,30}\b(?:supporter|patriot|voter|conservative)\b/i, label: "explicit political self-identification" },
    { re: /\b(?:conservative|right[- ]wing|republican)\b.{0,24}\b(?:voter|supporter|activist|politics|account)\b/i, label: "explicit political self-identification" },
    { re: /\bchristian nationalist\b/i, label: "explicit political self-identification" },
  ];
  for (const p of patterns) {
    if (p.re.test(bio)) {
      return [{ category: "right_wing_explicit", source: "profile", label: p.label, excerpt: excerpt(bio) }];
    }
  }

  // Very short bios that are effectively a slogan, e.g. "MAGA 🇺🇸".
  if (bio.length <= 80 && /\bMAGA\b/i.test(bio)) {
    return [{ category: "right_wing_explicit", source: "profile", label: "explicit MAGA profile text", excerpt: excerpt(bio) }];
  }
  return [];
}

const CONTENT_PATTERNS = {
  anti_palestine: [
    /\bpalestinians?\s+(?:are|=)\s+(?:all\s+)?terrorists?\b/i,
    /\bno\s+innocent\s+palestinians?\b/i,
    /\b(?:there\s+is\s+)?no\s+(?:such\s+thing\s+as\s+)?palestine\b/i,
    /\bpalestine\s+never\s+existed\b/i,
    /\b(?:flatten|level|erase|wipe\s+out)\s+gaza\b/i,
    /\bgaza\s+(?:should|must)\s+be\s+(?:flattened|leveled|destroyed)\b/i,
  ],
  islamophobia: [
    /\bislam\s+is\s+(?:a\s+)?(?:cancer|disease|evil)\b/i,
    /\bban\s+islam\b/i,
    /\bmuslims?\s+(?:are|=)\s+(?:all\s+)?(?:terrorists?|invaders?|savages?)\b/i,
    /\bdeport\s+(?:all\s+)?muslims?\b/i,
  ],
  xenophobia: [
    /\bimmigrants?\s+(?:are|=)\s+(?:all\s+)?(?:invaders?|vermin|criminals?)\b/i,
    /\bdeport\s+(?:all|every)\s+(?:immigrants?|migrants?|foreigners?)\b/i,
    /\bgo\s+back\s+to\s+your\s+country\b/i,
    /\bmass\s+deportation\s+now\b/i,
  ],
};

function contentEvidence(profile, posts, filters) {
  const evidence = [];
  const sources = [
    { source: "profile", text: profile.description ?? "" },
    ...posts.map((text) => ({ source: "post", text })),
  ];

  const enabled = {
    anti_palestine: filters?.antiPalestine !== false,
    islamophobia: filters?.islamophobia !== false,
    xenophobia: filters?.xenophobia !== false,
  };

  for (const [category, patterns] of Object.entries(CONTENT_PATTERNS)) {
    if (!enabled[category]) continue;
    for (const item of sources) {
      if (!item.text) continue;
      if (patterns.some((re) => re.test(item.text))) {
        evidence.push({
          category,
          source: item.source,
          label: "high-precision phrase match — verify context",
          excerpt: excerpt(item.text),
        });
        break;
      }
    }
  }
  return evidence;
}

function botSpamScore(profile, posts) {
  let score = 0;
  const reasons = [];
  const bio = `${profile.display_name ?? ""} ${profile.description ?? ""}`.trim();
  const bioLower = bio.toLowerCase();

  if (/\b(?:bot|automated|rss bot|feed bot)\b/i.test(bio)) {
    score += 75;
    reasons.push("Profile explicitly identifies as automated/bot");
  }

  const spamBioTerms = ["crypto signals", "forex signals", "dm for promo", "paid promotion", "followers for sale", "airdrop", "guaranteed returns"];
  if (spamBioTerms.some((term) => bioLower.includes(term))) {
    score += 55;
    reasons.push("Profile contains common promotion/spam language");
  }

  const followers = Number(profile.followers_count ?? 0);
  const follows = Number(profile.follows_count ?? 0);
  const postCount = Number(profile.posts_count ?? 0);
  if (follows >= 1500 && followers < 100 && follows / Math.max(followers, 1) >= 20) {
    score += 45;
    reasons.push("Extreme following-to-follower ratio");
  } else if (follows >= 500 && followers < 120 && follows / Math.max(followers, 1) >= 8) {
    score += 30;
    reasons.push("High following-to-follower ratio");
  }
  if (follows >= 500 && postCount === 0) {
    score += 35;
    reasons.push("Mass-following account with no public posts");
  }

  const normalized = posts.map(normalizeText).filter((x) => x.length >= 10);
  if (normalized.length >= 6) {
    const counts = new Map();
    for (const text of normalized) counts.set(text, (counts.get(text) ?? 0) + 1);
    const maxDuplicate = Math.max(...counts.values());
    const duplicateRatio = maxDuplicate / normalized.length;
    if (duplicateRatio >= 0.5) {
      score += 45;
      reasons.push("Recent posts are heavily duplicated");
    } else if (duplicateRatio >= 0.3) {
      score += 30;
      reasons.push("Recent posts show substantial duplication");
    }

    const linkRatio = posts.filter((text) => /https?:\/\//i.test(text)).length / posts.length;
    if (linkRatio >= 0.8) {
      score += 25;
      reasons.push("Nearly every recent post contains an external link");
    }
  }

  if (posts.length >= 10) {
    const promoHits = posts.filter((text) => /\b(?:buy now|limited offer|promo|airdrop|free money|guaranteed return|dm me)\b/i.test(text)).length;
    if (promoHits / posts.length >= 0.5) {
      score += 35;
      reasons.push("Recent posts are dominated by solicitation/promotion language");
    }
  }

  return { score: Math.min(score, 100), reasons };
}

export function assessProfile(profile, feed, settings) {
  const posts = feed.map(postText).filter(Boolean);
  const activities = feed.map(activityTime).filter(Boolean).sort();
  const lastActivity = activities.at(-1) ?? null;
  const createdAt = profile.account_created_at ?? null;
  const inactiveDays = settings.inactive_days ?? 90;
  const inactivityAge = daysAgo(lastActivity ?? createdAt);

  const categories = [];
  const evidence = [];
  let score = 0;

  if (inactivityAge !== null && inactivityAge > inactiveDays) {
    categories.push("inactive");
    score = Math.max(score, 100);
    evidence.push({
      category: "inactive",
      source: lastActivity ? "activity" : "account-age",
      label: `No public activity for ${inactivityAge} days`,
      excerpt: lastActivity ? `Last observed activity: ${lastActivity}` : `No public posts; account age exceeds ${inactiveDays} days`,
    });
  }

  const bot = botSpamScore(profile, posts);
  if (bot.score >= (settings.bot_threshold ?? 70)) {
    categories.push("bot_spam");
    score = Math.max(score, bot.score);
    evidence.push(...bot.reasons.slice(0, 4).map((reason) => ({
      category: "bot_spam",
      source: "heuristic",
      label: reason,
      excerpt: "",
    })));
  }

  if (settings.filters?.rightWing !== false) {
    const rightWing = explicitRightWingBioEvidence(profile);
    if (rightWing.length) {
      categories.push("right_wing_explicit");
      evidence.push(...rightWing);
      score = Math.max(score, 85);
    }
  }

  const content = contentEvidence(profile, posts, settings.filters ?? {});
  for (const item of content) {
    if (!categories.includes(item.category)) categories.push(item.category);
  }
  if (content.length) {
    evidence.push(...content);
    score = Math.max(score, 80);
  }

  const confidence = categories.includes("inactive")
    ? "high"
    : categories.includes("bot_spam") && bot.score >= 85
      ? "high"
      : categories.length
        ? "review"
        : "clear";

  return {
    flagged: categories.length > 0,
    score,
    categories,
    confidence,
    evidence: evidence.slice(0, 8),
    lastActivity,
  };
}

export function categoryLabel(value) {
  return ({
    inactive: "Inactive > threshold",
    bot_spam: "Bot / spam",
    right_wing_explicit: "Explicit right-wing profile",
    anti_palestine: "Anti-Palestinian content",
    islamophobia: "Islamophobic content",
    xenophobia: "Xenophobic content",
  })[value] ?? value;
}
