# Advanced Bluesky Network

## Product goal

Advanced Bluesky Network is a paid, account-specific relationship-intelligence workspace. It should answer: **where on Bluesky do you want to move, what reciprocal relationships can get you there efficiently, and did the recommended actions actually improve your position?**

The free Network Explorer remains a public, disposable discovery tool. Advanced Network requires private access plus Bluesky OAuth and keeps persistent history.

## Repeatable engine

1. Snapshot the customer’s followers, follows, and mutual relationships.
2. Build large-account wave #1 from explicit targets, categories, or suggested directions.
3. Compute shortest **mutual-follow-only** paths from the customer’s current graph to those endpoints.
4. Rank existing mutuals by bridge value and identify missing bridge accounts.
5. Find bridge besties: mutual follows with recurring public interaction.
6. Treat the large account as a node, not merely an endpoint. Find the large account’s besties using the same reciprocal + interaction rule.
7. Expand one level into besties-of-besties on both sides.
8. Search all customer followers, even one-way followers, for warm reciprocal bridges into those bestie layers.
9. Rank recommended follows using reciprocal distance, independent paths, cluster overlap, interaction, reach, relevance, estimated follow-back likelihood, and compute cost.
10. Track every recommendation as recommended → followed → followed back / lost follow.
11. Recalculate dynamic importance whenever the graph changes.
12. Refresh the graph and launch **large-account wave #2**, excluding wave #1 and accounts already followed. Use the newly expanded network as the starting position.
13. Repeat the bestie / bestie-of-bestie / follower-bridge expansion for wave #2.
14. Persist before/after snapshots so path compression and network strength can be compared by run/day/week.

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
- Campaigns and target configuration.
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
