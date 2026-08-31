import {
  runDailySourceRepost,
  type DailySourceRepostOptions,
} from "@/lib/bluesky-daily-source-repost";
import { refreshDailySourceCandidate } from "@/lib/bluesky-daily-source-refresh";

const CONFIG = {
  key: "fightback",
  displayName: "Fight Back News",
  sourceHandle: "fightbacknews.bsky.social",
  sourceDid: "did:plc:t4cmpj5m5pyplz4m5tsmjdlz",
  tableName: "bluesky_fightback_daily_reposts",
  envPrefix: "FIGHTBACK",
  defaultHour: 8,
  defaultMinute: 45,
  defaultCutoffHour: 12,
} as const;

export async function runDailyFightBackRepost(
  options: DailySourceRepostOptions = {},
) {
  await refreshDailySourceCandidate(CONFIG, options);
  return runDailySourceRepost(CONFIG, options);
}
