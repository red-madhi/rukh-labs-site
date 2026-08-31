import { neon } from "@neondatabase/serverless";

const TIME_ZONE = "America/Denver";

type AutomationSource = {
  key: string;
  name: string;
  tableName: string;
};

type AutomationRow = {
  localDate: string;
  sourceHandle: string;
  postUri: string;
  postCreatedAt: string | null;
  status: string;
  repostUri: string | null;
  actorHandle: string | null;
  actorDid: string | null;
  publicVisible: boolean | null;
  lastCheckedAt: string | null;
  publicVerifiedAt: string | null;
  lastError: string | null;
};

const SOURCES: AutomationSource[] = [
  {
    key: "dropsite",
    name: "Drop Site",
    tableName: "bluesky_dropsite_daily_reposts",
  },
  {
    key: "fightback",
    name: "Fight Back News",
    tableName: "bluesky_fightback_daily_reposts",
  },
];

function db() {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) throw new Error("DATABASE_URL is not configured.");
  return neon(url);
}

function table(sql: ReturnType<typeof db>, source: AutomationSource) {
  if (!/^[a-z][a-z0-9_]*$/.test(source.tableName)) {
    throw new Error("Invalid automation status table.");
  }
  return sql.unsafe(source.tableName);
}

function asText(value: unknown) {
  return value === null || value === undefined ? null : String(value);
}

function asBoolean(value: unknown) {
  return typeof value === "boolean" ? value : null;
}

async function latestStatus(
  sql: ReturnType<typeof db>,
  source: AutomationSource,
): Promise<AutomationRow | null> {
  const t = table(sql, source);
  const rows = await sql`
    select
      local_date::text,
      source_handle,
      post_uri,
      post_created_at,
      status,
      repost_uri,
      actor_handle,
      actor_did,
      public_visible,
      last_checked_at,
      public_verified_at,
      last_error
    from ${t}
    order by local_date desc, updated_at desc
    limit 1
  `;
  const row = rows[0];
  if (!row) return null;
  return {
    localDate: String(row.local_date),
    sourceHandle: String(row.source_handle),
    postUri: String(row.post_uri),
    postCreatedAt: asText(row.post_created_at),
    status: String(row.status),
    repostUri: asText(row.repost_uri),
    actorHandle: asText(row.actor_handle),
    actorDid: asText(row.actor_did),
    publicVisible: asBoolean(row.public_visible),
    lastCheckedAt: asText(row.last_checked_at),
    publicVerifiedAt: asText(row.public_verified_at),
    lastError: asText(row.last_error),
  };
}

function postUrl(row: AutomationRow) {
  const parts = row.postUri.startsWith("at://")
    ? row.postUri.slice(5).split("/")
    : [];
  const rkey = parts[2];
  return rkey
    ? `https://bsky.app/profile/${encodeURIComponent(row.sourceHandle)}/post/${encodeURIComponent(rkey)}`
    : `https://bsky.app/profile/${encodeURIComponent(row.sourceHandle)}`;
}

function profileUrl(row: AutomationRow) {
  return row.actorHandle
    ? `https://bsky.app/profile/${encodeURIComponent(row.actorHandle)}`
    : null;
}

function formatDate(value: string | null) {
  if (!value) return "Not recorded";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(date);
}

function presentation(row: AutomationRow | null) {
  if (!row) {
    return {
      label: "No run recorded",
      detail: "The scheduler has not created a status row yet.",
      tone: "border-white/12 bg-white/[0.025] text-white/62",
    };
  }
  if (row.publicVisible === true && row.status === "no-new-post") {
    return {
      label: "Prior repost verified",
      detail: "The source has not published a newer eligible original post. The existing repost is still public.",
      tone: "border-[#16c8ff]/28 bg-[#16c8ff]/[0.06] text-[#a8efff]",
    };
  }
  if (row.publicVisible === true) {
    return {
      label: "Publicly verified",
      detail: "The repost exists in the configured account repository and Bluesky's public index.",
      tone: "border-emerald-300/25 bg-emerald-300/[0.06] text-emerald-100",
    };
  }
  if (row.status === "posted_pending_index") {
    return {
      label: "Waiting for Bluesky",
      detail: "The repost exists in the account repository but Bluesky has not exposed it publicly yet. Automatic retries remain active.",
      tone: "border-amber-300/25 bg-amber-300/[0.06] text-amber-100",
    };
  }
  if (row.status === "posting") {
    return {
      label: "Posting now",
      detail: "A scheduler run currently owns the posting lock. Stale locks recover automatically.",
      tone: "border-amber-300/25 bg-amber-300/[0.06] text-amber-100",
    };
  }
  return {
    label: row.status === "missing" ? "Repost missing" : "Action required",
    detail:
      row.lastError ??
      "The latest verification did not prove that the repost is publicly visible. The scheduler will retry.",
    tone: "border-rose-300/25 bg-rose-300/[0.06] text-rose-100",
  };
}

export async function AdvancedNetworkSocialAutomationStatus() {
  let statuses: Array<{ source: AutomationSource; row: AutomationRow | null }>;
  try {
    const sql = db();
    statuses = await Promise.all(
      SOURCES.map(async (source) => ({ source, row: await latestStatus(sql, source) })),
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Automation status is unavailable.";
    return (
      <section className="rounded-2xl border border-rose-300/20 bg-rose-300/[0.04] p-5 sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-rose-100">
          Social Automation Health
        </p>
        <p className="mt-2 text-sm leading-6 text-white/62">{message}</p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.025] p-5 sm:p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8ce8ff]">
            Social Automation Health
          </p>
          <h2 className="mt-2 text-xl font-semibold tracking-[-0.02em] text-white">
            Verified reposts, not optimistic database flags.
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-white/54">
            Each check reads the repost from the configured Bluesky account and confirms public AppView visibility. A missing or unindexed repost stays failed and retries automatically.
          </p>
        </div>
        <p className="text-xs text-white/42">Refresh this page for the latest check.</p>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        {statuses.map(({ source, row }) => {
          const state = presentation(row);
          const actorProfile = row ? profileUrl(row) : null;
          return (
            <article
              key={source.key}
              className="rounded-xl border border-white/10 bg-black/20 p-4 sm:p-5"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-white">{source.name}</p>
                  <p className="mt-1 text-xs text-white/42">
                    {row ? `@${row.sourceHandle}` : "No source record"}
                  </p>
                </div>
                <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${state.tone}`}>
                  {state.label}
                </span>
              </div>

              <p className="mt-4 text-sm leading-6 text-white/62">{state.detail}</p>

              {row ? (
                <dl className="mt-4 grid gap-3 text-xs sm:grid-cols-2">
                  <div>
                    <dt className="text-white/38">Latest source post</dt>
                    <dd className="mt-1 text-white/72">{formatDate(row.postCreatedAt)}</dd>
                  </div>
                  <div>
                    <dt className="text-white/38">Last verification</dt>
                    <dd className="mt-1 text-white/72">{formatDate(row.lastCheckedAt)}</dd>
                  </div>
                  <div>
                    <dt className="text-white/38">Posting account</dt>
                    <dd className="mt-1 break-all text-white/72">
                      {row.actorHandle ? `@${row.actorHandle}` : "Not recorded"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-white/38">Publicly visible</dt>
                    <dd className="mt-1 text-white/72">
                      {row.publicVisible === true
                        ? "Yes"
                        : row.publicVisible === false
                          ? "No"
                          : "Not checked"}
                    </dd>
                  </div>
                </dl>
              ) : null}

              {row ? (
                <div className="mt-5 flex flex-wrap gap-3">
                  <a
                    href={postUrl(row)}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-lg border border-[#16c8ff]/24 bg-[#16c8ff]/[0.07] px-3 py-2 text-xs font-semibold text-[#a8efff] transition hover:bg-[#16c8ff]/[0.12]"
                  >
                    Open source post
                  </a>
                  {actorProfile ? (
                    <a
                      href={actorProfile}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-lg border border-white/12 bg-white/[0.035] px-3 py-2 text-xs font-semibold text-white/72 transition hover:bg-white/[0.07]"
                    >
                      Open posting profile
                    </a>
                  ) : null}
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}
