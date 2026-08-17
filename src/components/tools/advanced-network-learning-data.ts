import type { AdvancedNetworkPurpose } from "@/components/tools/advanced-network-explain";

export type DemoNodeId =
  | "you"
  | "follower-one"
  | "follower-two"
  | "connector-one"
  | "connector-two"
  | "destination"
  | "new-branch";

type DemoNode = {
  id: DemoNodeId;
  label: string;
  shortLabel: string;
  x: number;
  y: number;
  minStep: number;
  tone: "you" | "warm" | "connector" | "destination" | "branch";
  description: string;
};

export type DemoEdge = {
  from: DemoNodeId;
  to: DemoNodeId;
  minStep: number;
  activeAt?: number;
  dashed?: boolean;
};

export type TutorialStep = {
  title: string;
  sentence: string;
  whatHappened: string;
  whyItMatters: string;
  yourPart: string;
  yourPartKind: AdvancedNetworkPurpose;
  focus: DemoNodeId[];
};

export const NODES: DemoNode[] = [
  {
    id: "you",
    label: "Your account",
    shortLabel: "YOU",
    x: 78,
    y: 145,
    minStep: 0,
    tone: "you",
    description:
      "Your account is the starting point. IAZMA does not post, message, or follow from here unless you deliberately click a Bluesky action.",
  },
  {
    id: "follower-one",
    label: "Person already connected to you",
    shortLabel: "Follower",
    x: 205,
    y: 77,
    minStep: 0,
    tone: "warm",
    description:
      "Someone already connected to you. Even a quiet or modest-sized account can be close to a much larger community through the people they know.",
  },
  {
    id: "follower-two",
    label: "Another existing connection",
    shortLabel: "Mutual",
    x: 205,
    y: 218,
    minStep: 0,
    tone: "warm",
    description:
      "A second starting connection gives IAZMA another route to compare. Multiple separate routes are safer than depending on one person.",
  },
  {
    id: "connector-one",
    label: "Reachable connector",
    shortLabel: "Connector",
    x: 355,
    y: 72,
    minStep: 1,
    tone: "connector",
    description:
      "This person sits between your existing network and a destination community. IAZMA checks whether the route looks active and reachable before ranking them.",
  },
  {
    id: "connector-two",
    label: "A separate route",
    shortLabel: "2nd route",
    x: 355,
    y: 222,
    minStep: 2,
    tone: "connector",
    description:
      "This is a separate path that does not depend on the first connector. Independent routes make the recommendation less fragile and less clique-dependent.",
  },
  {
    id: "destination",
    label: "Large account or community",
    shortLabel: "Destination",
    x: 525,
    y: 145,
    minStep: 2,
    tone: "destination",
    description:
      "The larger account or community is a destination on the map. It explains the direction of the strategy; it is usually not the person you should cold-message or chase.",
  },
  {
    id: "new-branch",
    label: "New branch unlocked",
    shortLabel: "New branch",
    x: 475,
    y: 270,
    minStep: 4,
    tone: "branch",
    description:
      "When a recommended relationship becomes genuinely active or reciprocal, that person becomes a new starting branch. IAZMA can then look outward from there and discover additional communities.",
  },
];

export const EDGES: DemoEdge[] = [
  { from: "you", to: "follower-one", minStep: 0, activeAt: 0 },
  { from: "you", to: "follower-two", minStep: 0, activeAt: 0 },
  { from: "follower-one", to: "connector-one", minStep: 1, activeAt: 1 },
  { from: "follower-two", to: "connector-two", minStep: 2, activeAt: 2 },
  { from: "connector-one", to: "destination", minStep: 2, activeAt: 2 },
  { from: "connector-two", to: "destination", minStep: 2, activeAt: 2 },
  { from: "you", to: "connector-one", minStep: 3, activeAt: 3, dashed: true },
  { from: "connector-two", to: "new-branch", minStep: 4, activeAt: 4, dashed: true },
];

export const STEPS: TutorialStep[] = [
  {
    title: "Your current network already reaches farther than it looks.",
    sentence:
      "IAZMA starts with people already connected to you—not with a random list of popular accounts.",
    whatHappened:
      "The tool identifies your first circle: followers, mutuals, and people with an existing public connection to you.",
    whyItMatters:
      "One of those people may already be only a few real relationships away from a large account or useful community. You usually cannot see that from a profile page.",
    yourPart:
      "Nothing yet. Connecting your account and choosing a starting scope gives IAZMA permission to analyze the visible network graph.",
    yourPartKind: "automatic",
    focus: ["you", "follower-one", "follower-two"],
  },
  {
    title: "IAZMA traces the routes outward.",
    sentence:
      "It looks beyond follower counts and follows the actual relationship routes between people.",
    whatHappened:
      "The tool found a person your existing connection can reach. It checks reciprocal follows, repeated public interaction, recency, and route strength where those signals are available.",
    whyItMatters:
      "A route with signs of real interaction is more useful than a shorter route made only of silent follows.",
    yourPart:
      "Still automatic. You are watching the engine map possibilities; no Bluesky action has been taken.",
    yourPartKind: "automatic",
    focus: ["follower-one", "connector-one"],
  },
  {
    title: "Separate routes make the result more trustworthy.",
    sentence:
      "IAZMA checks whether several different people can lead toward the same destination community.",
    whatHappened:
      "A second route reached the same destination without relying on the first connector. The destination is now supported by more than one branch.",
    whyItMatters:
      "Five routes that all depend on one middle person are fragile. Two genuinely separate routes show broader access to the community.",
    yourPart:
      "Treat the destination as context. Do not interpret it as an instruction to chase the large account directly.",
    yourPartKind: "strategy",
    focus: ["connector-one", "connector-two", "destination"],
  },
  {
    title: "The map becomes a short list of reachable people.",
    sentence:
      "IAZMA ranks the people along the strongest routes and explains why each person is on the list.",
    whatHappened:
      "The route analysis produced a practical recommendation: a reachable person whose genuine relevance you can check before doing anything.",
    whyItMatters:
      "This turns a giant network graph into a small number of reasonable next moves instead of telling you to mass-follow strangers.",
    yourPart:
      "This is the first human action: open the profile, decide whether you actually like their work, and follow or interact only when it feels natural.",
    yourPartKind: "action",
    focus: ["you", "connector-one", "destination"],
  },
  {
    title: "A real relationship creates a new branch.",
    sentence:
      "When one of those relationships becomes active or reciprocal, IAZMA can explore outward from that new foothold.",
    whatHappened:
      "The network gained a real new connection. That person is no longer just a possible route; they can become a new starting branch for later analysis.",
    whyItMatters:
      "This is how the map grows without spam: genuine relationships create new routes, and new routes reveal additional communities that were previously out of view.",
    yourPart:
      "Keep the relationship normal. The tool measures public evidence over time; it does not require manufactured replies or transactional networking.",
    yourPartKind: "strategy",
    focus: ["connector-two", "new-branch"],
  },
];

export const TONE_STYLES = {
  you: {
    fill: "#101d24",
    stroke: "#8ce8ff",
    text: "#d9f8ff",
  },
  warm: {
    fill: "#10231c",
    stroke: "#7fe5ad",
    text: "#d8ffe8",
  },
  connector: {
    fill: "#1b1527",
    stroke: "#c495ff",
    text: "#f0e4ff",
  },
  destination: {
    fill: "#282014",
    stroke: "#f1d49a",
    text: "#fff1cf",
  },
  branch: {
    fill: "#211527",
    stroke: "#ff9ee8",
    text: "#ffe4fa",
  },
} as const;
