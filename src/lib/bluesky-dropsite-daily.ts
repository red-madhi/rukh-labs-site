import {
  runDailySourceRepost,
  type DailySourceRepostOptions,
} from "@/lib/bluesky-daily-source-repost";

const CONFIG = {
  key: "dropsite",
  displayName: "Drop Site",
  sourceHandle: "dropsitenews.com",
  sourceDid: "did:plc:avtgggryiqtjlg5wwsufccua",
  tableName: "bluesky_dropsite_daily_reposts",
  envPrefix: "DROP_SITE",
  defaultHour: 8,
  defaultMinute: 30,
} as const;

export function runDailyDropSiteRepost(options: DailySourceRepostOptions = {}) {
  return runDailySourceRepost(CONFIG, options);
}
