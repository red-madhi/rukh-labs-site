import { NextRequest, NextResponse } from "next/server";
import { hasAdvancedNetworkAccess } from "@/lib/advanced-network-access";

export const runtime = "nodejs";
export const maxDuration = 60;

const XRPC = "https://public.api.bsky.app/xrpc";
const DEFAULT_STARTING_NODES = 20;
const EXPLORE_STARTING_NODES = 100;
const MAX_TARGETS = 10;
const PROFILE_BATCH_SIZE = 25;
const MAX_KNOWN_PEER_EDGES = 500;

type Profile = {
  did: string;
  handle: string;
  displayName?: string;
  avatar?: string;
  followersCount?: number;
  followsCount?: number;
};

type Relationship = {
  did: string;
  following?: string;
  followedBy?: string;
};

type GraphNode = {
  id: string;
  did: string;
  handle: string;
  displayName?: string;
  avatar?: string;
  followersCount: number;
  followsCount: number;
  kind: "self" | "follower" | "mutual" | "target";
  score: number;
};

type GraphEdge = {
  source: string;
  target: string;
  kind:
    | "self-mutual"
    | "self-follower"
    | "self-target"
    | "verified-target-bridge"
    | "known-peer-edge";
  reciprocal: boolean;
};

type NeonResponse = {
  rows?: Array<Array<string | null>>;
};

function normalize(input: string) {
  let value = input.trim();
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) {
    try {
      const url = new URL(value);
      const parts = url.pathname.split("/").filter(Boolean);
      const profileIndex = parts.indexOf("profile");
      value = profileIndex >= 0 ? parts[profileIndex + 1] ?? "" : parts.at(-1) ?? "";
    } catch {
      return "";
    }
  }
  return value.replace(/^@/, "").replace(/[/?#].*$/, "").trim();
}

async function xrpc<T>(method: string, params: URLSearchParams) {
  const response = await fetch(`${XRPC}/${method}?${params.toString()}`, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Bluesky ${method} returned ${response.status}.`);
  return (await response.json()) as T;
}

async function getProfile(actor: string) {
  return xrpc<Profile>("app.bsky.actor.getProfile", new URLSearchParams({ actor }));
}

async function getFollowers(actor: string) {
  const followers: Profile[] = [];
  let cursor = "";
  do {
    const params = new URLSearchParams({ actor, limit: "100" });
    if (cursor) params.set("cursor", cursor);
    const payload = await xrpc<{ followers?: Profile[]; cursor?: string }>(
      "app.bsky.graph.getFollowers",
      params,
    );
    followers.push(...(payload.followers ?? []));
    cursor = payload.cursor ?? "";
  } while (cursor && followers.length < 2000);
  return followers;
}

async function getProfiles(actors: string[]) {
  const profiles: Profile[] = [];
  const uniqueActors = Array.from(new Set(actors.filter(Boolean)));
  for (let index = 0; index < uniqueActors.length; index += PROFILE_BATCH_SIZE) {
    const params = new URLSearchParams();
    for (const actor of uniqueActors.slice(index, index + PROFILE_BATCH_SIZE)) {
      params.append("actors", actor);
    }
    const payload = await xrpc<{ profiles?: Profile[] }>("app.bsky.actor.getProfiles", params);
    profiles.push(...(payload.profiles ?? []));
  }
  return profiles;
}

async function getRelationships(actor: string, others: string[]) {
  const relationships: Relationship[] = [];
  for (let index = 0; index < others.length; index += 30) {
    const params = new URLSearchParams({ actor });
    for (const did of others.slice(index, index + 30)) params.append("others", did);
    const payload = await xrpc<{ relationships?: Relationship[] }>(
      "app.bsky.graph.getRelationships",
      params,
    );
    relationships.push(...(payload.relationships ?? []));
  }
  return relationships;
}

function getNeonEndpoint(connectionString: string) {
  const parsed = new URL(connectionString);
  const hostParts = parsed.hostname.split(".");
  if (hostParts.length < 2) throw new Error("Database connection host is invalid.");
  hostParts[0] = "api";
  return `https://${hostParts.join(".")}/sql`;
}

async function neonQuery(query: string, params: Array<string | null> = []) {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) return { rows: [] } as NeonResponse;

  const response = await fetch(getNeonEndpoint(connectionString), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Neon-Connection-String": connectionString,
      "Neon-Raw-Text-Output": "true",
      "Neon-Array-Mode": "true",
    },
    body: JSON.stringify({ query, params }),
    cache: "no-store",
  });

  if (!response.ok) throw new Error(`Advanced Network campaign query failed with ${response.status}.`);
  return (await response.json()) as NeonResponse;
}

async function getSavedTargetHandles(actorDid: string) {
  const result = await neonQuery(
    `SELECT t.target_handle
     FROM public.advanced_network_targets t
     JOIN public.advanced_network_campaigns c ON c.id=t.campaign_id
     JOIN public.advanced_network_accounts a ON a.id=c.account_id
     WHERE a.bluesky_did=$1
       AND c.status='active'
       AND t.status IN ('active','candidate')
     ORDER BY t.wave ASC,
              CASE WHEN t.status='active' THEN 0 ELSE 1 END,
              t.priority_score DESC,
              t.created_at ASC
     LIMIT ${MAX_TARGETS}`,
    [actorDid],
  );

  return (result.rows ?? [])
    .map((row) => row[0])
    .filter((value): value is string => Boolean(value));
}

async function getKnownPeerEdges(dids: string[]) {
  const unique = Array.from(new Set(dids.filter(Boolean))).slice(0, 120);
  if (unique.length < 2) return [] as Array<{ source: string; target: string }>;

  const placeholders = unique.map((_, index) => `$${index + 1}`).join(",");
  const result = await neonQuery(
    `SELECT source_did, target_did
     FROM public.advanced_network_follow_edges
     WHERE active=true
       AND source_did IN (${placeholders})
       AND target_did IN (${placeholders})
     ORDER BY last_seen_at DESC
     LIMIT ${MAX_KNOWN_PEER_EDGES}`,
    unique,
  );

  return (result.rows ?? [])
    .map((row) => ({ source: row[0] ?? "", target: row[1] ?? "" }))
    .filter((edge) => edge.source && edge.target && edge.source !== edge.target);
}

function influenceScore(profile: Profile, mutual: boolean) {
  const followers = Math.max(0, profile.followersCount ?? 0);
  const follows = Math.max(0, profile.followsCount ?? 0);
  const ratio = followers / Math.max(1, follows);
  return Math.round(
    Math.log10(followers + 10) * 22 +
      Math.min(24, Math.log2(ratio + 1) * 8) +
      (mutual ? 35 : 0),
  );
}

function edgeKey(source: string, target: string) {
  return `${source}->${target}`;
}

export async function POST(request: NextRequest) {
  if (!(await hasAdvancedNetworkAccess())) {
    return NextResponse.json({ error: "Private beta access is required." }, { status: 403 });
  }

  try {
    const body = (await request.json()) as {
      actor?: string;
      scope?: "all-followers" | "mutuals-only";
      targets?: string[];
      explore?: boolean;
    };
    const actorInput = normalize(String(body.actor ?? ""));
    if (!actorInput) {
      return NextResponse.json({ error: "Connect a Bluesky account first." }, { status: 400 });
    }

    const explore = Boolean(body.explore);
    const maxStartingNodes = explore ? EXPLORE_STARTING_NODES : DEFAULT_STARTING_NODES;
    const scope = body.scope === "mutuals-only" ? "mutuals-only" : "all-followers";
    const actor = await getProfile(actorInput);
    const profileFollowers = Math.max(0, actor.followersCount ?? 0);

    const followerStubs = await getFollowers(actor.did);
    const followerDids = followerStubs.map((profile) => profile.did).filter(Boolean);
    const hydratedProfiles = followerDids.length ? await getProfiles(followerDids) : [];
    const hydratedByDid = new Map(hydratedProfiles.map((profile) => [profile.did, profile]));
    const followers = followerStubs.map((stub) => ({
      ...stub,
      ...(hydratedByDid.get(stub.did) ?? {}),
    }));
    const observableFollowers = followers.length;

    const followerRelationships = followerDids.length
      ? await getRelationships(actor.did, followerDids)
      : [];
    const relationByDid = new Map(
      followerRelationships.map((relationship) => [relationship.did, relationship]),
    );

    const enrichedFollowers = followers.map((profile) => {
      const relation = relationByDid.get(profile.did);
      const mutual = Boolean(relation?.following && relation?.followedBy);
      return {
        profile,
        mutual,
        followedBy: Boolean(relation?.followedBy),
        score: influenceScore(profile, mutual),
      };
    });

    const startingPool = enrichedFollowers.filter(
      (item) => scope === "all-followers" || item.mutual,
    );
    const selectedStarting = [...startingPool]
      .sort(
        (a, b) =>
          b.score - a.score ||
          (b.profile.followersCount ?? 0) - (a.profile.followersCount ?? 0),
      )
      .slice(0, maxStartingNodes);

    const requestedTargetInputs = Array.from(
      new Set((body.targets ?? []).map((value) => normalize(String(value))).filter(Boolean)),
    ).slice(0, MAX_TARGETS);

    const savedTargetInputs = requestedTargetInputs.length
      ? []
      : await getSavedTargetHandles(actor.did);
    const targetInputs = (requestedTargetInputs.length
      ? requestedTargetInputs
      : savedTargetInputs
    ).slice(0, MAX_TARGETS);
    const targetSource = requestedTargetInputs.length
      ? "current-run"
      : savedTargetInputs.length
        ? "saved-campaign"
        : "none";

    const targetProfiles = (
      await Promise.all(
        targetInputs.map(async (target) => {
          try {
            return await getProfile(target);
          } catch {
            return null;
          }
        }),
      )
    ).filter((profile): profile is Profile => Boolean(profile && profile.did !== actor.did));

    const nodes: GraphNode[] = [
      {
        id: actor.did,
        did: actor.did,
        handle: actor.handle,
        displayName: actor.displayName,
        avatar: actor.avatar,
        followersCount: profileFollowers,
        followsCount: Math.max(0, actor.followsCount ?? 0),
        kind: "self",
        score: 999,
      },
      ...selectedStarting.map(({ profile, mutual, score }) => ({
        id: profile.did,
        did: profile.did,
        handle: profile.handle,
        displayName: profile.displayName,
        avatar: profile.avatar,
        followersCount: Math.max(0, profile.followersCount ?? 0),
        followsCount: Math.max(0, profile.followsCount ?? 0),
        kind: mutual ? ("mutual" as const) : ("follower" as const),
        score,
      })),
      ...targetProfiles.map((profile) => ({
        id: profile.did,
        did: profile.did,
        handle: profile.handle,
        displayName: profile.displayName,
        avatar: profile.avatar,
        followersCount: Math.max(0, profile.followersCount ?? 0),
        followsCount: Math.max(0, profile.followsCount ?? 0),
        kind: "target" as const,
        score: influenceScore(profile, false),
      })),
    ];

    const edges: GraphEdge[] = selectedStarting.map(({ profile, mutual }) => ({
      source: actor.did,
      target: profile.did,
      kind: mutual ? ("self-mutual" as const) : ("self-follower" as const),
      reciprocal: mutual,
    }));

    if (targetProfiles.length) {
      const actorTargetRelationships = await getRelationships(
        actor.did,
        targetProfiles.map((profile) => profile.did),
      );
      for (const relationship of actorTargetRelationships) {
        if (relationship.following || relationship.followedBy) {
          edges.push({
            source: actor.did,
            target: relationship.did,
            kind: "self-target",
            reciprocal: Boolean(relationship.following && relationship.followedBy),
          });
        }
      }

      const startingDids = selectedStarting.map(({ profile }) => profile.did);
      const targetBridgeGroups = await Promise.all(
        targetProfiles.map(async (target) => ({
          target,
          relationships: startingDids.length
            ? await getRelationships(target.did, startingDids)
            : [],
        })),
      );

      for (const { target, relationships } of targetBridgeGroups) {
        for (const relationship of relationships) {
          if (relationship.following && relationship.followedBy) {
            edges.push({
              source: relationship.did,
              target: target.did,
              kind: "verified-target-bridge",
              reciprocal: true,
            });
          }
        }
      }
    }

    let knownPeerEdgeCount = 0;
    if (explore) {
      const displayedIds = nodes.map((node) => node.did);
      const known = await getKnownPeerEdges(displayedIds);
      const knownSet = new Set(known.map((edge) => edgeKey(edge.source, edge.target)));
      const existingDirected = new Set(edges.map((edge) => edgeKey(edge.source, edge.target)));
      const actorId = actor.did;

      for (const edge of known) {
        if (edge.source === actorId || edge.target === actorId) continue;
        if (existingDirected.has(edgeKey(edge.source, edge.target))) continue;
        edges.push({
          source: edge.source,
          target: edge.target,
          kind: "known-peer-edge",
          reciprocal: knownSet.has(edgeKey(edge.target, edge.source)),
        });
        knownPeerEdgeCount += 1;
      }
    }

    const mutualCount = enrichedFollowers.filter((item) => item.mutual).length;
    const verifiedBridgeCount = edges.filter(
      (edge) => edge.kind === "verified-target-bridge",
    ).length;

    return NextResponse.json({
      actor: { did: actor.did, handle: actor.handle, displayName: actor.displayName },
      scope,
      generatedAt: new Date().toISOString(),
      targetSource,
      explore,
      totals: {
        profileFollowers,
        observableFollowers,
        mutuals: mutualCount,
        startingPool: startingPool.length,
        displayedStartingNodes: selectedStarting.length,
        targets: targetProfiles.length,
        verifiedTargetBridges: verifiedBridgeCount,
        knownPeerEdges: knownPeerEdgeCount,
      },
      nodes,
      edges,
      note:
        explore
          ? "Explore mode shows a larger live follower slice plus active peer edges already verified during Advanced Network analysis. Zoomed-out structure is simplified visually; zooming in reveals the underlying real accounts and relationships."
          : targetSource === "saved-campaign"
            ? "Mapped targets were restored from this account's persisted Advanced Network campaign. Every visible account and edge still comes from live Bluesky profile or relationship data."
            : "Every visible account and edge in this response comes from live Bluesky profile or relationship data. Follower counts are hydrated from full app.bsky.actor.getProfiles records.",
    });
  } catch (error) {
    console.error("Advanced Network live map failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Live network map failed." },
      { status: 502 },
    );
  }
}
