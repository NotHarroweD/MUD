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

## Additional character, equipment, and combat reference

The community-maintained [Shimlar Wiki](https://shimlar.fandom.com/wiki/Starting_the_Game) describes five character attributes: Strength (melee damage and weapon requirements), Dexterity (melee hit and evasion), Intelligence (spell capacity and requirements), Wisdom (spell effectiveness and spell defense), and Vitality (maximum hit points and armor requirements). It also describes choosing a stat to raise at level-up. These are useful evidence about the documented design, but the wiki is not an official current-game source and its details should be treated as historical until verified in-game.

The wiki's [Equipment Basics](https://shimlar.fandom.com/wiki/Equipment_Basics) describes weapons, spells, armor, and shields as distinct equipment; equipment has stat/level requirements, and a single-weapon/no-shield setup trades defense and hit chance for higher damage. [Masteries](https://shimlar.fandom.com/wiki/Masteries) describes weapon/spell mastery affecting hit and critical chance, armor mastery affecting armor class, and a separate double-hit mastery. [Accessories](https://shimlar.fandom.com/wiki/Accessories) describes modifiers to attributes, evasion, accuracy, and other costs. These are reference patterns, not rules to copy into Never Ending Reign.

Current public [Shimlar zone data](https://dev.shimlar.org/maps/test-environment) exposes zone level, base equipment classes (AC/WC/SC), monster stats, experience and gold rewards, plus an evasion/resistance section. This supports encounter data and defenses as system dimensions, while leaving the exact current combat formula and the meaning of every abbreviated field unverified here.

### Early-zone progression numbers (checked 2026-10-14)

Public developer map entries give useful *relative* early-game values, although they do not expose the XP requirement for each player level:

| Zone | Entry level | Monster XP sequence | Monster gold sequence | Next gate shown |
| --- | ---: | --- | --- | --- |
| Torogaar | 1 | 10, 15, 23, 34, 51, 76, 114, 171, 256 | 2–10 | Sewers 5; Shimwood Forest 10; Wilderness 15 |
| The Sewers | 5 | 30, 45, 68, 101, 152, 228, 342, 513, 769, 1,153 | 5–50, +5 per monster | Listed exits are level 1 |
| Shimwood Forest | 10 | 200, 300, 450, 675, 1,013, 1,519, 2,278, 3,417, 5,126, 7,689, 11,533, 17,300 | 15–180, +15 per monster | Listed exits are level 1; Labyrinth is level 125 |

Torogaar's starting enemies therefore rise by roughly 1.5× XP per step while gold moves from 2 to 10. The Sewers and Shimwood continue a roughly 1.5× XP sequence, with gold increasing more gradually. Their level-5 and level-10 portal requirements give concrete early access milestones. [Torogaar](https://dev.shimlar.org/maps/torogaar), [The Sewers](https://dev.shimlar.org/maps/the-sewers), [Shimwood Forest](https://dev.shimlar.org/maps/shimwood-forest)

These tables inform the shape of a Never Ending Reign progression curve (separate enemy difficulty, XP, gold, and zone access), not its absolute values. Shimlar uses a very different level/stat scale, and these pages do not reveal the XP needed for each player level or a prescribed number of kills per level. Its early gem-drop rates also vary by zone: no gems in Torogaar, 1/60 in the Sewers, and 1/50 in Shimwood. The game-design decision to make a monster's XP a deliberate fraction of the current level's requirement still needs to be made for Never Ending Reign.

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
