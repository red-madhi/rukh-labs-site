// @ts-nocheck
import { createDecipheriv, createHash, randomUUID } from "node:crypto";
import { neon } from "@neondatabase/serverless";
import { assessProfile } from "@/lib/iazma-guard-classify";

const PUBLIC_API = "https://public.api.bsky.app/xrpc";
const FOLLOW = "app.bsky.graph.follow";
const BLOCK = "app.bsky.graph.block";

function getSql() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not configured.");
  return neon(process.env.DATABASE_URL);
}

async function fetchJson(url: string | URL, init?: RequestInit) {
  const response = await fetch(url, { ...init, cache: "no-store" });
  if (!response.ok) {
    let message = `Bluesky returned ${response.status}.`;
    try { const body = await response.json(); message = body.message || body.error || message; } catch {}
    throw new Error(message);
  }
  return response.json();
}

function encryptionKey() {
  const secret = process.env.ADVANCED_NETWORK_ACCESS_SECRET?.trim();
  if (!secret) throw new Error("Advanced network secret is not configured.");
  return createHash("sha256").update(`rukh-bluesky-follow-automation:${secret}`).digest();
}

function decryptSecret(value: string) {
  const [version, ivText, tagText, encryptedText] = value.split(".");
  if (version !== "v1" || !ivText || !tagText || !encryptedText) throw new Error("Saved Bluesky credential is unreadable.");
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(ivText, "base64url"));
  decipher.setAuthTag(Buffer.from(tagText, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedText, "base64url")), decipher.final(),
  ]).toString("utf8");
}

async function resolvePds(did: string) {
  const doc = did.startsWith("did:plc:")
    ? await fetchJson(`https://plc.directory/${did}`)
    : await fetchJson(`https://${did.slice("did:web:".length).split(":")[0]}/.well-known/did.json`);
  const service = doc.service?.find((item) => item.id?.endsWith("#atproto_pds"));
  if (!service || typeof service.serviceEndpoint !== "string") throw new Error("Could not resolve Bluesky PDS.");
  return service.serviceEndpoint.replace(/\/$/, "");
}

async function configuredSession() {
  const sql = getSql();
  const rows = await sql`
    SELECT actor_handle, app_password_enc
    FROM bluesky_follow_automation_settings WHERE id=1
  `;
  const current = rows[0];
  if (!current?.app_password_enc) throw new Error("Save the Bluesky app password in IAZMA Auto DM first.");
  const actor = String(current.actor_handle);
  const password = decryptSecret(String(current.app_password_enc));
  const didRes = await fetchJson(`${PUBLIC_API}/com.atproto.identity.resolveHandle?handle=${encodeURIComponent(actor)}`);
  const pdsUrl = await resolvePds(didRes.did);
  const session = await fetchJson(`${pdsUrl}/xrpc/com.atproto.server.createSession`, {
    method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ identifier: actor, password }),
  });
  return { ...session, pdsUrl };
}

async function authXrpc(session, method: string, body?: unknown, params?: URLSearchParams) {
  const url = new URL(`${session.pdsUrl}/xrpc/${method}`);
  if (params) for (const [k,v] of params) url.searchParams.append(k,v);
  return fetchJson(url, {
    method: body === undefined ? "GET" : "POST",
    headers: { Accept: "application/json", Authorization: `Bearer ${session.accessJwt}`,
      ...(body === undefined ? {} : { "Content-Type": "application/json" }) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

async function allFollowers(actor: string) {
  const out = []; let cursor = "";
  do {
    const url = new URL(`${PUBLIC_API}/app.bsky.graph.getFollowers`);
    url.searchParams.set("actor", actor); url.searchParams.set("limit", "100");
    if (cursor) url.searchParams.set("cursor", cursor);
    const page = await fetchJson(url); out.push(...(page.followers ?? [])); cursor = page.cursor ?? "";
  } while (cursor && out.length < 10000);
  return out;
}

async function allFollowRecords(session) {
  const out = []; let cursor = "";
  do {
    const params = new URLSearchParams({ repo: session.did, collection: FOLLOW, limit: "100" });
    if (cursor) params.set("cursor", cursor);
    const page = await authXrpc(session, "com.atproto.repo.listRecords", undefined, params);
    for (const record of page.records ?? []) {
      const subject = record.value?.subject;
      if (typeof subject === "string") out.push({ did: subject, uri: record.uri });
    }
    cursor = page.cursor ?? "";
  } while (cursor && out.length < 10000);
  return out;
}

function rkey(uri: string) { return uri.split("/").pop() || ""; }
async function deleteFollow(session, uri: string) {
  await authXrpc(session, "com.atproto.repo.deleteRecord", { repo: session.did, collection: FOLLOW, rkey: rkey(uri) });
}
async function createBlock(session, did: string) {
  return authXrpc(session, "com.atproto.repo.createRecord", {
    repo: session.did, collection: BLOCK,
    record: { $type: BLOCK, subject: did, createdAt: new Date().toISOString() },
  });
}

export async function ensureGuardSchema() {
  const sql = getSql();
  await sql`CREATE TABLE IF NOT EXISTS users (did text PRIMARY KEY, handle text, display_name text, avatar text, created_at timestamptz NOT NULL DEFAULT now(), last_login_at timestamptz, last_graph_sync_at timestamptz, last_scan_at timestamptz)`;
  await sql`CREATE TABLE IF NOT EXISTS settings (owner_did text PRIMARY KEY REFERENCES users(did) ON DELETE CASCADE, inactive_days integer NOT NULL DEFAULT 90, bot_threshold integer NOT NULL DEFAULT 70, auto_unfollow boolean NOT NULL DEFAULT true, filters jsonb NOT NULL DEFAULT '{"rightWing":true,"antiPalestine":true,"islamophobia":true,"xenophobia":true}'::jsonb, updated_at timestamptz NOT NULL DEFAULT now())`;
  await sql`CREATE TABLE IF NOT EXISTS relationships (owner_did text NOT NULL REFERENCES users(did) ON DELETE CASCADE, did text NOT NULL, handle text, display_name text, avatar text, description text, followers_count integer, follows_count integer, posts_count integer, account_created_at timestamptz, was_follower boolean NOT NULL DEFAULT false, is_follower boolean NOT NULL DEFAULT false, is_following boolean NOT NULL DEFAULT false, follow_uri text, first_seen_at timestamptz NOT NULL DEFAULT now(), last_seen_at timestamptz NOT NULL DEFAULT now(), last_activity_at timestamptz, unfollowed_me_at timestamptz, PRIMARY KEY(owner_did,did))`;
  await sql`CREATE TABLE IF NOT EXISTS scans (id text PRIMARY KEY, owner_did text NOT NULL REFERENCES users(did) ON DELETE CASCADE, status text NOT NULL DEFAULT 'running', total integer NOT NULL DEFAULT 0, processed integer NOT NULL DEFAULT 0, flagged integer NOT NULL DEFAULT 0, started_at timestamptz NOT NULL DEFAULT now(), completed_at timestamptz)`;
  await sql`CREATE TABLE IF NOT EXISTS assessments (owner_did text NOT NULL REFERENCES users(did) ON DELETE CASCADE, did text NOT NULL, scan_id text REFERENCES scans(id) ON DELETE SET NULL, status text NOT NULL DEFAULT 'pending', score integer NOT NULL DEFAULT 0, categories text[] NOT NULL DEFAULT ARRAY[]::text[], confidence text, evidence jsonb NOT NULL DEFAULT '[]'::jsonb, last_activity_at timestamptz, assessed_at timestamptz, dismissed_at timestamptz, blocked_at timestamptz, PRIMARY KEY(owner_did,did))`;
  await sql`CREATE TABLE IF NOT EXISTS suppressions (owner_did text NOT NULL REFERENCES users(did) ON DELETE CASCADE, did text NOT NULL, handle text, reason text NOT NULL, source text NOT NULL, evidence jsonb NOT NULL DEFAULT '{}'::jsonb, active boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(owner_did,did))`;
  await sql`CREATE TABLE IF NOT EXISTS actions (id bigserial PRIMARY KEY, owner_did text NOT NULL REFERENCES users(did) ON DELETE CASCADE, target_did text NOT NULL, action text NOT NULL, reason text, metadata jsonb NOT NULL DEFAULT '{}'::jsonb, created_at timestamptz NOT NULL DEFAULT now())`;
  return sql;
}

async function addAction(sql, ownerDid, targetDid, action, reason, metadata={}) {
  await sql`INSERT INTO actions(owner_did,target_did,action,reason,metadata) VALUES (${ownerDid},${targetDid},${action},${reason ?? null},${JSON.stringify(metadata)}::jsonb)`;
}
async function suppress(sql, ownerDid, did, handle, reason, source, evidence={}) {
  await sql`INSERT INTO suppressions(owner_did,did,handle,reason,source,evidence,active) VALUES (${ownerDid},${did},${handle ?? null},${reason},${source},${JSON.stringify(evidence)}::jsonb,true)
    ON CONFLICT(owner_did,did) DO UPDATE SET handle=excluded.handle,reason=excluded.reason,source=excluded.source,evidence=excluded.evidence,active=true,updated_at=now()`;
}

export async function syncIazmaGuardReciprocity({ automatic=true, force=false }={}) {
  const sql = await ensureGuardSchema();
  const session = await configuredSession(); const ownerDid = session.did;
  const profile = await fetchJson(`${PUBLIC_API}/app.bsky.actor.getProfile?actor=${encodeURIComponent(ownerDid)}`);
  await sql`INSERT INTO users(did,handle,display_name,avatar,last_login_at) VALUES (${ownerDid},${profile.handle ?? null},${profile.displayName ?? null},${profile.avatar ?? null},now()) ON CONFLICT(did) DO UPDATE SET handle=excluded.handle,display_name=excluded.display_name,avatar=excluded.avatar`;
  await sql`INSERT INTO settings(owner_did) VALUES (${ownerDid}) ON CONFLICT(owner_did) DO NOTHING`;
  if (!force) {
    const recent = await sql`SELECT last_graph_sync_at > now() - interval '12 minutes' AS recent FROM users WHERE did=${ownerDid}`;
    if (recent[0]?.recent) return { ownerDid, skipped: true, followers: 0, following: 0, lostFollowers: 0, autoUnfollowed: 0 };
  }
  const priorRows = await sql`SELECT did FROM relationships WHERE owner_did=${ownerDid} AND is_follower=true`;
  const prior = new Set(priorRows.map(r=>String(r.did)));
  const [followers,follows,settingRows] = await Promise.all([allFollowers(ownerDid),allFollowRecords(session),sql`SELECT auto_unfollow FROM settings WHERE owner_did=${ownerDid}`]);
  const current = new Set(followers.map(f=>f.did)); const followMap = new Map(follows.map(f=>[f.did,f.uri]));
  await sql`UPDATE relationships SET is_follower=false,is_following=false,follow_uri=null WHERE owner_did=${ownerDid}`;
  if (followers.length) {
    const payload=JSON.stringify(followers.map(f=>({did:f.did,handle:f.handle,display_name:f.displayName??null,avatar:f.avatar??null,description:f.description??null,followers_count:f.followersCount??0,follows_count:f.followsCount??0,posts_count:f.postsCount??0,created_at:f.createdAt??null})));
    await sql`INSERT INTO relationships(owner_did,did,handle,display_name,avatar,description,followers_count,follows_count,posts_count,account_created_at,was_follower,is_follower,last_seen_at)
      SELECT ${ownerDid},x.did,x.handle,x.display_name,x.avatar,x.description,x.followers_count,x.follows_count,x.posts_count,x.created_at::timestamptz,true,true,now() FROM jsonb_to_recordset(${payload}::jsonb) AS x(did text,handle text,display_name text,avatar text,description text,followers_count int,follows_count int,posts_count int,created_at text)
      ON CONFLICT(owner_did,did) DO UPDATE SET handle=excluded.handle,display_name=excluded.display_name,avatar=excluded.avatar,description=excluded.description,followers_count=excluded.followers_count,follows_count=excluded.follows_count,posts_count=excluded.posts_count,account_created_at=coalesce(excluded.account_created_at,relationships.account_created_at),was_follower=true,is_follower=true,last_seen_at=now()`;
  }
  for (const f of follows) await sql`INSERT INTO relationships(owner_did,did,is_following,follow_uri,last_seen_at) VALUES (${ownerDid},${f.did},true,${f.uri},now()) ON CONFLICT(owner_did,did) DO UPDATE SET is_following=true,follow_uri=excluded.follow_uri,last_seen_at=now()`;
  const lost=[...prior].filter(did=>!current.has(did)); let autoUnfollowed=0;
  const enabled=settingRows[0]?.auto_unfollow !== false;
  for (const did of lost) {
    await sql`UPDATE relationships SET unfollowed_me_at=coalesce(unfollowed_me_at,now()) WHERE owner_did=${ownerDid} AND did=${did}`;
    const uri=followMap.get(did);
    if (automatic && enabled && uri) {
      try { await deleteFollow(session,uri); const rr=await sql`SELECT handle FROM relationships WHERE owner_did=${ownerDid} AND did=${did}`; await suppress(sql,ownerDid,did,rr[0]?.handle,"Unfollowed you after you followed them","unfollowed_me",{observedBy:"graph-diff"}); await addAction(sql,ownerDid,did,"auto_unfollow","They stopped following you",{followUri:uri}); await sql`UPDATE relationships SET is_following=false,follow_uri=null WHERE owner_did=${ownerDid} AND did=${did}`; autoUnfollowed++; }
      catch(e){ await addAction(sql,ownerDid,did,"auto_unfollow_error",String(e?.message??e)); }
    }
  }
  await sql`UPDATE users SET last_graph_sync_at=now() WHERE did=${ownerDid}`;
  return { ownerDid, followers:followers.length, following:follows.length-autoUnfollowed, lostFollowers:lost.length, autoUnfollowed };
}

async function authorFeed(did:string) { const u=new URL(`${PUBLIC_API}/app.bsky.feed.getAuthorFeed`);u.searchParams.set("actor",did);u.searchParams.set("limit","30");return (await fetchJson(u)).feed??[]; }
async function profile(did:string) { return fetchJson(`${PUBLIC_API}/app.bsky.actor.getProfile?actor=${encodeURIComponent(did)}`); }

export async function startGuardScan() {
  const graph=await syncIazmaGuardReciprocity({automatic:true,force:true}); const sql=getSql(); const id=randomUUID();
  await sql`INSERT INTO scans(id,owner_did,status,total,processed,flagged) VALUES (${id},${graph.ownerDid},'running',0,0,0)`;
  await sql`INSERT INTO assessments(owner_did,did,scan_id,status,score,categories,confidence,evidence)
    SELECT owner_did,did,${id},'pending',0,ARRAY[]::text[],null,'[]'::jsonb FROM relationships WHERE owner_did=${graph.ownerDid} AND is_follower=true
    ON CONFLICT(owner_did,did) DO UPDATE SET scan_id=excluded.scan_id,status=CASE WHEN assessments.status IN ('ignored','blocked') THEN assessments.status ELSE 'pending' END,score=CASE WHEN assessments.status IN ('ignored','blocked') THEN assessments.score ELSE 0 END,categories=CASE WHEN assessments.status IN ('ignored','blocked') THEN assessments.categories ELSE ARRAY[]::text[] END,confidence=CASE WHEN assessments.status IN ('ignored','blocked') THEN assessments.confidence ELSE null END,evidence=CASE WHEN assessments.status IN ('ignored','blocked') THEN assessments.evidence ELSE '[]'::jsonb END`;
  const c=await sql`SELECT count(*)::int total FROM assessments WHERE owner_did=${graph.ownerDid} AND scan_id=${id} AND status='pending'`; const total=Number(c[0]?.total??0);
  await sql`UPDATE scans SET total=${total},status=${total===0?'complete':'running'},completed_at=${total===0?new Date().toISOString():null}::timestamptz WHERE id=${id}`;
  await sql`UPDATE users SET last_scan_at=now() WHERE did=${graph.ownerDid}`; return {scanId:id,total,graph};
}

export async function processGuardBatch(scanId:string, requested=8) {
  const sql=getSql(); const owner=(await sql`SELECT owner_did FROM scans WHERE id=${scanId}`)[0]?.owner_did; if(!owner) throw new Error("Scan not found.");
  const st=(await sql`SELECT inactive_days,bot_threshold,auto_unfollow,filters FROM settings WHERE owner_did=${owner}`)[0]??{inactive_days:90,bot_threshold:70,auto_unfollow:true,filters:{}};
  const limit=Math.max(1,Math.min(12,Number(requested)||8)); const rows=await sql`SELECT did FROM assessments WHERE owner_did=${owner} AND scan_id=${scanId} AND status='pending' ORDER BY did LIMIT ${limit}`;
  for(const row of rows){ const did=String(row.did); await sql`UPDATE assessments SET status='processing' WHERE owner_did=${owner} AND did=${did} AND scan_id=${scanId}`; try{ const rr=(await sql`SELECT * FROM relationships WHERE owner_did=${owner} AND did=${did}`)[0]; const [fresh,feed]=await Promise.all([profile(did),authorFeed(did)]); const p={...rr,handle:fresh.handle??rr.handle,display_name:fresh.displayName??rr.display_name,description:fresh.description??rr.description,followers_count:fresh.followersCount??rr.followers_count,follows_count:fresh.followsCount??rr.follows_count,posts_count:fresh.postsCount??rr.posts_count,account_created_at:fresh.createdAt??rr.account_created_at}; const a=assessProfile(p,feed,st); await sql`UPDATE relationships SET handle=${p.handle},display_name=${p.display_name},description=${p.description},followers_count=${p.followers_count},follows_count=${p.follows_count},posts_count=${p.posts_count},last_activity_at=${a.lastActivity}::timestamptz WHERE owner_did=${owner} AND did=${did}`; await sql`UPDATE assessments SET status=${a.flagged?'flagged':'clear'},score=${a.score},categories=${a.categories}::text[],confidence=${a.confidence},evidence=${JSON.stringify(a.evidence)}::jsonb,last_activity_at=${a.lastActivity}::timestamptz,assessed_at=now() WHERE owner_did=${owner} AND did=${did} AND scan_id=${scanId}`; }catch(e){ await sql`UPDATE assessments SET status='error',evidence=${JSON.stringify([{category:'error',label:String(e?.message??e)}])}::jsonb,assessed_at=now() WHERE owner_did=${owner} AND did=${did} AND scan_id=${scanId}`; }}
  const stat=(await sql`SELECT count(*) FILTER(WHERE status IN('clear','flagged','error'))::int processed,count(*) FILTER(WHERE status='flagged')::int flagged,count(*) FILTER(WHERE status IN('pending','processing'))::int remaining FROM assessments WHERE owner_did=${owner} AND scan_id=${scanId}`)[0]; const complete=Number(stat.remaining)===0; await sql`UPDATE scans SET processed=${Number(stat.processed)},flagged=${Number(stat.flagged)},status=${complete?'complete':'running'},completed_at=${complete?new Date().toISOString():null}::timestamptz WHERE id=${scanId}`; return {id:scanId,status:complete?'complete':'running',...stat};
}

export async function guardDashboard() {
  const sql=await ensureGuardSchema(); const ses=await configuredSession(); const owner=ses.did; await syncIdentityOnly(sql,ses);
  const [user,setting,queue,suppressions,actions,scan,counts]=await Promise.all([
    sql`SELECT did,handle,display_name,avatar,last_graph_sync_at,last_scan_at FROM users WHERE did=${owner}`,
    sql`SELECT inactive_days,bot_threshold,auto_unfollow,filters FROM settings WHERE owner_did=${owner}`,
    sql`SELECT r.did,r.handle,r.display_name,r.avatar,r.description,r.followers_count,r.follows_count,r.posts_count,r.is_following,r.last_activity_at,a.score,a.categories,a.confidence,a.evidence,a.assessed_at FROM assessments a JOIN relationships r ON r.owner_did=a.owner_did AND r.did=a.did WHERE a.owner_did=${owner} AND a.status='flagged' AND r.is_follower=true ORDER BY a.score DESC,a.assessed_at DESC NULLS LAST LIMIT 250`,
    sql`SELECT did,handle,reason,source,evidence,created_at,updated_at FROM suppressions WHERE owner_did=${owner} AND active=true ORDER BY updated_at DESC LIMIT 500`,
    sql`SELECT a.id,a.target_did,a.action,a.reason,a.metadata,a.created_at,r.handle,r.display_name,r.avatar FROM actions a LEFT JOIN relationships r ON r.owner_did=a.owner_did AND r.did=a.target_did WHERE a.owner_did=${owner} ORDER BY a.created_at DESC LIMIT 100`,
    sql`SELECT id,status,total,processed,flagged,started_at,completed_at FROM scans WHERE owner_did=${owner} ORDER BY started_at DESC LIMIT 1`,
    sql`SELECT count(*) FILTER(WHERE is_follower=true)::int followers,count(*) FILTER(WHERE is_following=true)::int following,count(*) FILTER(WHERE unfollowed_me_at IS NOT NULL)::int observed_unfollowers FROM relationships WHERE owner_did=${owner}`
  ]); return {user:user[0],settings:setting[0],queue,suppressions,actions,scan:scan[0]??null,counts:counts[0]??{followers:0,following:0,observed_unfollowers:0}};
}
async function syncIdentityOnly(sql,session){ const exists=await sql`SELECT 1 FROM users WHERE did=${session.did}`; if(!exists.length){const p=await profile(session.did);await sql`INSERT INTO users(did,handle,display_name,avatar) VALUES (${session.did},${p.handle??null},${p.displayName??null},${p.avatar??null}) ON CONFLICT(did) DO NOTHING`;await sql`INSERT INTO settings(owner_did) VALUES (${session.did}) ON CONFLICT(owner_did) DO NOTHING`;}}

export async function saveGuardSettings(input){const sql=await ensureGuardSchema();const s=await configuredSession();await syncIdentityOnly(sql,s);const filters={rightWing:input.filters?.rightWing!==false,antiPalestine:input.filters?.antiPalestine!==false,islamophobia:input.filters?.islamophobia!==false,xenophobia:input.filters?.xenophobia!==false};await sql`UPDATE settings SET inactive_days=${Math.max(30,Math.min(365,Number(input.inactive_days)||90))},bot_threshold=${Math.max(50,Math.min(95,Number(input.bot_threshold)||70))},auto_unfollow=${input.auto_unfollow!==false},filters=${JSON.stringify(filters)}::jsonb,updated_at=now() WHERE owner_did=${s.did}`;return guardDashboard();}
export async function ignoreGuardDid(did){const sql=getSql();const s=await configuredSession();await sql`UPDATE assessments SET status='ignored',dismissed_at=now() WHERE owner_did=${s.did} AND did=${did}`;await addAction(sql,s.did,did,'ignore_flag','Marked as false positive / keep');}
export async function restoreGuardDid(did){const sql=getSql();const s=await configuredSession();await sql`UPDATE suppressions SET active=false,updated_at=now() WHERE owner_did=${s.did} AND did=${did}`;await addAction(sql,s.did,did,'restore_iazma','Removed from IAZMA suppression list');}
export async function blockGuardDid(did){const sql=getSql();const s=await configuredSession();const rows=await sql`SELECT r.handle,r.is_following,r.follow_uri,a.categories,a.evidence FROM relationships r LEFT JOIN assessments a ON a.owner_did=r.owner_did AND a.did=r.did WHERE r.owner_did=${s.did} AND r.did=${did}`;const t=rows[0];if(!t)throw new Error('Account is not in the Guard graph.');let unfollowed=false;if(t.is_following&&t.follow_uri){await deleteFollow(s,String(t.follow_uri));unfollowed=true;}const b=await createBlock(s,did);const reason=(t.categories??[]).join(', ')||'Manual moderation';await suppress(sql,s.did,did,t.handle,reason,'cleanup',{categories:t.categories??[],blockUri:b.uri});await addAction(sql,s.did,did,unfollowed?'unfollow_block':'block',reason,{blockUri:b.uri,evidence:t.evidence??[]});await sql`UPDATE assessments SET status='blocked',blocked_at=now() WHERE owner_did=${s.did} AND did=${did}`;await sql`UPDATE relationships SET is_follower=false,is_following=false,follow_uri=null WHERE owner_did=${s.did} AND did=${did}`;return {unfollowed,blocked:true};}
