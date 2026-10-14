# Shimlar research

_Sources accessed 2026-10-13. This document distinguishes evidence from design interpretation._

## Confirmed current-game evidence

| System | Evidence |
| --- | --- |
| Progression and rewards | The current welcome page lists daily bonuses to experience, gold, gems, shadows, purse/conquest drops, resources, and mastery chance. [Welcome](https://shimlar.org/welcome.php) |
| Modes and specialization | Normal, Ironman, and Hardcore Ironman are documented. Ironman disables item sending, markets, resource market, shared estates, and PK while retaining a separate leaderboard. [Game modes](https://shimlar.org/gameModes.htm) |
| High-stakes progress | Hardcore Ironman has permanent-death/reset behavior, life milestones, locked race line, restrictions, and a record that includes dead accounts. [Game modes](https://shimlar.org/gameModes.htm) |
| Zones and encounters | The current map entry for Chellinias Tavern exposes zone level/type, shops, drop categories/rates, resources, monster stats, experience, gold, and portals. [Zone entry](https://dev.shimlar.org/maps/chellinias-tavern) |
| Long-term systems | News records quests, estates, professions, masteries, conquests, item/accessory modifiers, title tiers, reincarnation/renown, class changes, rarity adjustments, and economy fixes. [Older news](https://shimlar.org/pages/olderNews.php) |

## Historical source evidence

The public [historical repository](https://github.com/KoenVingerhoets/Shimlar) identifies itself as source code from 2007, describes an Apache/PHP/MySQL and JavaScript application, and shows historical battle, game, market, clan, quest, map, and manual files. Its database-reset instructions reference players, stats, inventory, transfers, market, messages, clans, quests, and PK logs. This confirms a broad online-RPG system existed historically, but does **not** establish current behavior. The repository is GPL-3.0; no code or assets are copied into this project.

## What a player appears to do

1. Select a mode and pursue a character/race progression path.
2. Visit level-gated zones for monster encounters and resource/rare-drop opportunities.
3. Accumulate experience, gold, mastery, items, gems, and resources.
4. Convert discoveries into improved combat/economy capacity through equipment, professions, upgrades, quests, conquests, and estates.
5. Compete through rankings, modes, milestones, and specialized progression.

This is a synthesis of the evidence above, not a claim about every onboarding screen or combat input in the live game.

## Why the loop motivates

- The game pairs familiar numerical progression with multiple rates and collections to optimize.
- Modes create distinct prestige paths; the Ironman rules demonstrate that self-sufficient achievement is recognized separately.
- Zone tables and changelog entries show that rewards vary by activity, creating room for knowledge and specialization.
- Historical references to market and transfers, together with current market restrictions in Ironman, support the importance of a player economy, although current market mechanics were not independently accessible.

## Gaps and conflicts

- The iframe-based current game could not be inspected past its shell; current creation, action timing, full combat formulas, and exact market rules remain unverified.
- The monster-reference endpoint and community wiki were inaccessible through available tools.
- The historical code is not assumed to represent the modern game.
- Exact rarity odds, item values, leaderboard criteria, and social systems require direct in-game research later.

## Preserve and improve

Preserve the ownership fantasy: a build that grows over time, a niche to master, surprising valuable drops, and visible accomplishment. Improve readability with illustrated encounters, short contextual choices, explicit item comparisons, and fewer low-value actions. The new game is original: it uses its own setting, terminology, characters, rewards, rules, visuals, and code.
