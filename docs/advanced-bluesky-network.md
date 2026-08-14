# Advanced Bluesky Network

## Product goal

Advanced Bluesky Network is a paid, account-specific relationship-intelligence workspace. It should answer: **where on Bluesky do you want to move, what reciprocal relationships can get you there efficiently, and did the recommended actions actually improve your position?**

The free Network Explorer remains a public, disposable discovery tool. Advanced Network requires private access plus Bluesky OAuth and keeps persistent history.

## Repeatable engine

1. Snapshot the customer’s followers, follows, and mutual relationships.
2. Let the customer choose the **starting network** for the run:
   - **All followers**: every follower can be considered as a potential warm starting bridge, including people the customer does not follow back.
   - **Mutual followers only**: the starting pool contains only reciprocal relationships.
3. Build large-account wave #1 from explicit targets, categories, or suggested directions.
4. Compute shortest **mutual-follow-only** paths from the chosen starting graph to those endpoints. When the customer chooses All Followers, the first customer→follower edge may be one-way; reciprocal degree calculations begin from that follower outward.
5. Rank existing mutuals by bridge value and identify missing bridge accounts.
6. Find bridge besties: mutual follows with recurring public interaction.
7. Treat the large account as a node, not merely an endpoint. Find the large account’s besties using the same reciprocal + interaction rule.
8. Expand one level into besties-of-besties on both sides.
9. Search all customer followers for warm reciprocal bridges into those bestie layers when the campaign scope allows it.
10. Rank recommended follows using reciprocal distance, independent paths, cluster overlap, interaction, reach, relevance, estimated follow-back likelihood, and compute cost.
11. Track every recommendation as recommended → followed → followed back / lost follow.
12. Recalculate dynamic importance whenever the graph changes.
13. Refresh the graph and launch **large-account wave #2**, excluding wave #1 and accounts already followed. Use the newly expanded network as the starting position.
14. Repeat the bestie / bestie-of-bestie / follower-bridge expansion for wave #2.
15. Persist before/after snapshots so path compression and network strength can be compared by run/day/week.

## Starting-network tradeoffs

### All followers

Pros:
- Widest warm-edge pool and strongest chance of finding hidden bridges.
- Surfaces useful followers the customer may have overlooked.
- Better for discovering distant or unexpected communities.

Tradeoffs:
- More graph work, so the run is more expensive and can take longer.
- One-way follower relationships are weaker than mutual starting relationships.
- Requires aggressive quality filtering so mass-follow, inactive, and low-value accounts do not dominate the graph.

### Mutual followers only

Pros:
- Every starting edge is reciprocal and socially stronger.
- Cheaper and faster to process.
- Produces a cleaner graph with easier-to-explain paths.

Tradeoffs:
- Can miss one-way followers who already have excellent reciprocal relationships deeper in the target network.
- Smaller accounts may have too few mutuals to expose useful paths.
- Can be slower to break into entirely new clusters.

The recommended default is **All followers** for maximum discovery, with **Mutual followers only** available as the focused/low-cost mode.

## Targeting

Customers can choose:

- Up to 10 explicit Bluesky profiles.
- One or more categories (politics, sports, gaming, entertainment, tech, etc.).
- Hybrid mode: explicit anchors + category discovery.
- Suggested Direction: the engine recommends the clusters with the best expected network gain per unit of compute.

A cheap reconnaissance pass evaluates all explicit targets. A deep run may analyze fewer targets and defer expensive/low-return targets until another path makes them cheaper.

## Shared graph vs. customer data

Shared cache:

- Bluesky profiles.
- Directed follow edges and observation timestamps.
- Aggregated public interaction scores.
- Cached bestie relationships.

Customer-specific:

- Access/account record.
- Campaigns and target configuration, including starting-network scope.
- Runs and graph snapshots.
- Recommendations and reasons.
- Followed / followed-back state.
- Customer-specific shortest paths and importance scores.

This separation lets many customers reuse a cached Mark Hamill, AOC, gaming, or AT Protocol neighborhood instead of recrawling it independently.

## Initial private beta

The first UI uses a site access-code gate and existing browser OAuth so the product surface can be tested without exposing it publicly. Production persistence should move to a server-side AT Protocol OAuth/BFF flow with database-backed OAuth state/session storage before broad paid rollout.

## Scaling direction

- Queue expensive graph jobs; never perform full crawls in a normal page request.
- Deduplicate graph fetches across customers.
- Use cache freshness windows for shared high-interest profiles.
- Incrementally maintain edges from Bluesky event streams as usage grows.
- Apply per-plan compute budgets and deep-target limits.
- Keep automatic following/replying out of the product; recommend actions and let the customer choose them.
