import { getAgent } from "./oauth.js";
import { addAction, getSettings, query, suppress } from "./db.js";

const PUBLIC_API = "https://public.api.bsky.app/xrpc";
const USER_AGENT = "IAZMA-Guard/0.1 (+https://rukhlabs.com)";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function publicXrpc(method, params = {}) {
  const url = new URL(`${PUBLIC_API}/${method}`);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }

  let lastError;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: { "user-agent": USER_AGENT, accept: "application/json" },
        cache: "no-store",
      });
      if (response.ok) return response.json();
      const body = await response.text();
      lastError = new Error(`${method} failed (${response.status}): ${body.slice(0, 240)}`);
      if (response.status !== 429 && response.status < 500) throw lastError;
      const retryAfter = Number(response.headers.get("retry-after")) || attempt + 1;
      await sleep(Math.min(retryAfter * 1000, 3000));
    } catch (error) {
      lastError = error;
      if (attempt < 2) await sleep((attempt + 1) * 400);
    }
  }
  throw lastError ?? new Error(`${method} failed`);
}

export async function fetchProfile(actor) {
  return publicXrpc("app.bsky.actor.getProfile", { actor });
}

export async function fetchAllFollowers(actor) {
  const followers = [];
  let cursor;
  do {
    const page = await publicXrpc("app.bsky.graph.getFollowers", {
      actor,
      limit: 100,
      cursor,
    });
    followers.push(...(page.followers ?? []));
    cursor = page.cursor;
  } while (cursor);
  return followers;
}

export async function fetchAuthorFeed(actor, limit = 30) {
  const page = await publicXrpc("app.bsky.feed.getAuthorFeed", {
    actor,
    limit,
    filter: "posts_with_replies",
  });
  return page.feed ?? [];
}

export async function fetchFollowRecords(agent, ownerDid) {
  const records = [];
  let cursor;
  do {
    const result = await agent.com.atproto.repo.listRecords({
      repo: ownerDid,
      collection: "app.bsky.graph.follow",
      limit: 100,
      cursor,
    });
    for (const record of result.data.records ?? []) {
      const subject = record.value?.subject;
      if (typeof subject === "string") {
        records.push({ did: subject, uri: record.uri });
      }
    }
    cursor = result.data.cursor;
  } while (cursor);
  return records;
}

async function bulkUpsertFollowers(ownerDid, followers) {
  if (!followers.length) return;
  const payload = followers.map((f) => ({
    did: f.did,
    handle: f.handle ?? null,
    display_name: f.displayName ?? null,
    avatar: f.avatar ?? null,
    description: f.description ?? null,
    followers_count: f.followersCount ?? null,
    follows_count: f.followsCount ?? null,
    posts_count: f.postsCount ?? null,
    account_created_at: f.createdAt ?? null,
  }));

  await query(
    `WITH data AS (
       SELECT * FROM jsonb_to_recordset($2::jsonb) AS x(
         did text, handle text, display_name text, avatar text, description text,
         followers_count integer, follows_count integer, posts_count integer,
         account_created_at timestamptz
       )
     )
     INSERT INTO relationships(
       owner_did, did, handle, display_name, avatar, description,
       followers_count, follows_count, posts_count, account_created_at,
       was_follower, is_follower, first_seen_at, last_seen_at
     )
     SELECT $1, did, handle, display_name, avatar, description,
            followers_count, follows_count, posts_count, account_created_at,
            true, true, now(), now()
     FROM data
     ON CONFLICT(owner_did, did) DO UPDATE SET
       handle = EXCLUDED.handle,
       display_name = EXCLUDED.display_name,
       avatar = EXCLUDED.avatar,
       description = EXCLUDED.description,
       followers_count = EXCLUDED.followers_count,
       follows_count = EXCLUDED.follows_count,
       posts_count = EXCLUDED.posts_count,
       account_created_at = COALESCE(EXCLUDED.account_created_at, relationships.account_created_at),
       was_follower = true,
       is_follower = true,
       last_seen_at = now()`,
    [ownerDid, JSON.stringify(payload)],
  );
}

async function bulkUpsertFollows(ownerDid, follows) {
  if (!follows.length) return;
  await query(
    `WITH data AS (
       SELECT * FROM jsonb_to_recordset($2::jsonb) AS x(did text, uri text)
     )
     INSERT INTO relationships(owner_did, did, is_following, follow_uri, first_seen_at, last_seen_at)
     SELECT $1, did, true, uri, now(), now() FROM data
     ON CONFLICT(owner_did, did) DO UPDATE SET
       is_following = true,
       follow_uri = EXCLUDED.follow_uri,
       last_seen_at = now()`,
    [ownerDid, JSON.stringify(follows)],
  );
}

function uriRkey(uri) {
  const bits = uri?.split("/");
  return bits?.[bits.length - 1];
}

export async function deleteFollowRecord(agent, ownerDid, followUri) {
  if (!followUri) return false;
  try {
    if (typeof agent.deleteFollow === "function") {
      await agent.deleteFollow(followUri);
    } else {
      await agent.com.atproto.repo.deleteRecord({
        repo: ownerDid,
        collection: "app.bsky.graph.follow",
        rkey: uriRkey(followUri),
      });
    }
    return true;
  } catch (error) {
    const message = String(error?.message ?? error);
    if (/not.?found|recordnotfound/i.test(message)) return false;
    throw error;
  }
}

export async function createBlockRecord(agent, ownerDid, targetDid) {
  const result = await agent.com.atproto.repo.createRecord({
    repo: ownerDid,
    collection: "app.bsky.graph.block",
    record: {
      $type: "app.bsky.graph.block",
      subject: targetDid,
      createdAt: new Date().toISOString(),
    },
  });
  return result.data?.uri ?? null;
}

export async function syncGraph(ownerDid, { automatic = true } = {}) {
  const agent = await getAgent(ownerDid);
  const settings = await getSettings(ownerDid);

  const [followers, follows, priorFollowerRows] = await Promise.all([
    fetchAllFollowers(ownerDid),
    fetchFollowRecords(agent, ownerDid),
    query(`SELECT did FROM relationships WHERE owner_did = $1 AND is_follower = true`, [ownerDid]),
  ]);

  const currentFollowerSet = new Set(followers.map((f) => f.did));
  const followMap = new Map(follows.map((f) => [f.did, f.uri]));
  const priorFollowerSet = new Set(priorFollowerRows.map((r) => r.did));

  await query(
    `UPDATE relationships
     SET is_follower = false, is_following = false, follow_uri = null
     WHERE owner_did = $1`,
    [ownerDid],
  );

  await bulkUpsertFollowers(ownerDid, followers);
  await bulkUpsertFollows(ownerDid, follows);

  const lostFollowers = [];
  for (const did of priorFollowerSet) {
    if (!currentFollowerSet.has(did)) lostFollowers.push(did);
  }

  const autoUnfollowed = [];
  for (const targetDid of lostFollowers) {
    await query(
      `UPDATE relationships SET unfollowed_me_at = COALESCE(unfollowed_me_at, now())
       WHERE owner_did = $1 AND did = $2`,
      [ownerDid, targetDid],
    );

    const followUri = followMap.get(targetDid);
    if (automatic && settings.auto_unfollow && followUri) {
      try {
        await deleteFollowRecord(agent, ownerDid, followUri);
        const relRows = await query(
          `SELECT handle FROM relationships WHERE owner_did = $1 AND did = $2`,
          [ownerDid, targetDid],
        );
        const handle = relRows[0]?.handle ?? null;
        await suppress(
          ownerDid,
          targetDid,
          handle,
          "Unfollowed you after you followed them",
          "unfollowed_me",
          { observedBy: "graph-diff" },
        );
        await addAction(
          ownerDid,
          targetDid,
          "auto_unfollow",
          "They stopped following you",
          { followUri },
        );
        await query(
          `UPDATE relationships SET is_following = false, follow_uri = null
           WHERE owner_did = $1 AND did = $2`,
          [ownerDid, targetDid],
        );
        autoUnfollowed.push(targetDid);
      } catch (error) {
        await addAction(ownerDid, targetDid, "auto_unfollow_error", String(error?.message ?? error));
      }
    }
  }

  await query(`UPDATE users SET last_graph_sync_at = now() WHERE did = $1`, [ownerDid]);

  return {
    followers: followers.length,
    following: follows.length - autoUnfollowed.length,
    lostFollowers: lostFollowers.length,
    autoUnfollowed: autoUnfollowed.length,
  };
}
