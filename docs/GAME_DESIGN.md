# Game design — Ashfall Frontier (working title)

## Evidence boundary

Shimlar confirmed facts appear in `SHIMLAR_RESEARCH.md`. Everything below is a proposal for an original game, not an assertion about Shimlar.

## Player fantasy

Become known for a specialty: an efficient hunter, a resilient boss breaker, a collector who identifies valuable relics, or eventually a market-savvy trader. The first prototype focuses on the first two and makes a rare relic an exciting, legible reward.

## Pillars

1. **Readable mastery.** Each encounter makes the enemy's next move visible. The player chooses pressure, defense, or recovery.
2. **Discovery with a use.** Every reward is understandable; a rare reward has an identity and a concrete build consequence.
3. **Specialization, not busywork.** Trait upgrades deliberately favor either execution (damage) or resilience (guard efficiency).
4. **Earned recognition.** Milestones identify a next goal; future leaderboards measure distinct accomplishments rather than a single hours-played score.

## First-loop rules

- The player is a Wayfinder with health, power, guard, level, experience, gold, and one equipped relic.
- The Ashmaw, a cinder beast, alternates between a readable **Bite** and a telegraphed **Cinder Burst**.
- **Strike** deals reliable damage. **Brace** reduces the next enemy hit. **Focus** restores a small amount of health but concedes tempo.
- Victory grants experience, gold, and a deterministic loot roll. A rare `Stormglass Fang` can be forced with the on-screen playtest control for testing.
- Items show power, guard, value, and rarity. Equipping changes the following encounter.
- At level two, a player purchases either `Edgecraft` (+1 power) or `Bulwark` (+1 guard). The goal becomes defeating an upgraded hunt while holding a rare relic.

## Intentional omissions

No player trading, persistence, accounts, multiplayer, live rankings, server validation, crafting, or full map are present. Future services must make combat, loot, balances, inventory ownership, and trade authoritative.

## Open questions

- Should later encounters remain decision-forward or add movement/dodging inside a bounded scene?
- Which specializations should receive leaderboard support first?
- What percentage of an item's long-term value should come from player demand versus combat power?
