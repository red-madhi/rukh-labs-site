import assert from "node:assert/strict";
import { assessProfile } from "../lib/classify.js";

const settings = {
  inactive_days: 90,
  bot_threshold: 70,
  filters: { rightWing: true, antiPalestine: true, islamophobia: true, xenophobia: true },
};

const post = (text, days = 1) => ({
  post: {
    record: { text, createdAt: new Date(Date.now() - days * 86_400_000).toISOString() },
    indexedAt: new Date(Date.now() - days * 86_400_000).toISOString(),
  },
});

const base = {
  followers_count: 20,
  follows_count: 30,
  posts_count: 4,
  account_created_at: new Date(Date.now() - 365 * 86_400_000).toISOString(),
};

assert.deepEqual(
  assessProfile({ ...base, description: "anti-MAGA leftist" }, [post("hello")], settings).categories,
  [],
  "anti-MAGA text should not be treated as right-wing identity",
);
assert.ok(
  assessProfile({ ...base, description: "MAGA 🇺🇸" }, [post("hello")], settings).categories.includes("right_wing_explicit"),
  "short explicit MAGA profile should be reviewed",
);
assert.ok(
  assessProfile({ ...base }, [post("old", 120)], settings).categories.includes("inactive"),
  "120 days without activity should be inactive",
);
assert.ok(
  assessProfile({ ...base }, [post("Ban Islam now")], settings).categories.includes("islamophobia"),
  "explicit Islamophobic phrase should be reviewed",
);
const spamFeed = Array.from({ length: 10 }, () => post("BUY NOW https://spam.example"));
assert.ok(
  assessProfile({ ...base, description: "Automated feed bot", follows_count: 5000, followers_count: 5 }, spamFeed, settings).categories.includes("bot_spam"),
  "obvious automated repetitive spam should be flagged",
);

console.log("classifier tests passed");
