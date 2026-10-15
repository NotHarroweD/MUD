# Game design — Never Ending Reign

## Evidence boundary

Shimlar confirmed facts appear in `SHIMLAR_RESEARCH.md`. Everything below is a proposal for an original game, not an assertion about Shimlar.

## Player fantasy

Become known for a specialty: an efficient hunter, a resilient boss breaker, a crafter who shapes gear to fit a build, or eventually a market-savvy trader. Gear comes from zone shops; hunts provide materials for player-directed modifications.

## Pillars

1. **Readable mastery.** Each foe has a distinct attack pattern that players learn through battle. Players choose pressure, defense, or recovery without seeing an enemy's queued action.
2. **Build expression.** Shop gear is a base; crafted enhancements let players choose where its power goes.
3. **Specialization, not busywork.** Trait upgrades deliberately favor either execution (damage) or resilience (guard efficiency).
4. **Earned recognition.** Milestones identify a next goal; future leaderboards measure distinct accomplishments rather than a single hours-played score.

## First-loop rules

- The player has five core attributes: Dexterity improves melee hit chance, Intelligence improves casting hit chance, Strength improves physical damage, Wisdom improves casting damage, and Vitality improves health. Gear and specialties add secondary combat values such as guard, evasion, critical chance, and Focus recovery.
- The first level takes 10 experience; each later level requires 5 more experience than the previous one. Every level grants two points that can be assigned between hunts.
- Equipment has Weapon, Armor, and Charm slots. Each item has a role, value, rarity, combat modifiers, and may carry attribute bonuses or a named trait. Replacing one slot leaves the other equipped items intact.
- The Ashmaw, a cinder beast, alternates between **Bite** and **Cinder Burst** attacks.
- **Attack** calculates melee hit chance from Dexterity relative to enemy Evasion, then resolves Strength based physical damage and a possible critical hit. **Cast** calculates casting hit chance from Intelligence relative to enemy Magic Defense, then resolves Wisdom based casting damage. **Brace** reduces the next incoming hit by guard. **Focus** restores health based on equipped gear but concedes tempo. Dexterity also contributes to evasion.
- Victory grants experience, gold, and one crafting material. Current material rarity weights are 70% uncommon Verdant Resin, 25% rare Emberglass Shard, and 5% mythic Storm Thread. A test action can force the rare tier.
- Gear is purchased from zone shops. Each piece currently has five enhancement slots. Repeating a recipe is allowed, so players can concentrate all five slots into one property or mix effects.
- Crafting starts at level 1. Hunts grant 10 crafting XP; each crafted enhancement grants 5 XP. The first threshold is 25 XP and increases by 25 per level. Recipes define material cost, minimum crafting level, and property bonus; recipes are data-driven and intended for tuning.
- Current placeholder recipes: Keen Edge (+1 power) and Vital Weave (+3 health) use Verdant Resin at level 1; Warding Knot (+1 guard) uses Emberglass at level 2. Storm Thread and mythic recipes are reserved for later progression.
- Items show their slot, enhancement capacity, and applied recipes. Enhancements contribute to normal derived combat values.
- At level two, a player purchases either `Edgecraft` (+1 power) or `Bulwark` (+1 guard). The goal becomes defeating an upgraded hunt while holding a rare relic.

## Current prototype formulas

All attribute values begin at 2. Gear attribute bonuses are added before derived values are calculated.

| Derived value | Rule |
| --- | --- |
| Physical damage | 3 + floor((Strength − 2) / 2) + weapon power + Edgecraft |
| Casting damage | 2 + floor((Wisdom − 2) / 2) |
| Guard | 1 + floor((Vitality − 2) / 3) + gear guard + Bulwark |
| Maximum health | 10 + 2 × Vitality + gear health |
| Melee hit chance | clamp(80 + 3 × (Dexterity − 2) − target Evasion − veil penalty, 10, 98)% |
| Casting hit chance | clamp(80 + 3 × (Intelligence − 2) − target Magic Defense − veil penalty, 10, 98)% |
| Evasion | clamp(4 + 2 × (Dexterity − 2) + gear evasion, 0, 45)% |
| Critical chance | clamp(4 + gear critical chance, 2, 40)% |
| Focus recovery | max(1, 2 + gear Focus) health, with ±1 combat variance |

Attacks and casts roll independently against their corresponding target defenses. Each point of Dexterity or Intelligence above the base adds 3 percentage points to its matching hit chance; enemy Evasion or Magic Defense subtracts from it. Veil effects reduce either hit chance by another 10 points. Critical hits deal 1.5× rolled damage. Incoming attacks can be evaded with the player's evasion chance; Brace subtracts a guard roll from the enemy's rolled damage. Enemy Magic Defense currently scales from its Evasion as a prototype rule. These numbers are initial balance values and are expected to change through playtesting.

## Waking Garden onboarding loop

- New characters awaken at the Waking Garden sanctuary. Its ten trials are revealed in order; defeating a trial opens the next enemy while leaving earlier enemies available for repeat hunts. This is roster progression, not a level requirement: every revealed monster can be challenged regardless of player level.
- Monsters have no hard player-level requirements. Their combat difficulty, reward, and the player's ability to win consistently should naturally pace advancement through the roster. Any level milestones used in simulator scenarios are pacing targets for tuning, not in-game restrictions.
- Zones may have hard level requirements at their entrances. The Wilderness gate from the Waking Garden requires level 50, so players can learn combat, invest attribute points, and repeat progressively harder trials before leaving.
- The Garden has weapon, armor, charm, and bank tiles. Early shop stock is priced so the first trial's gold reward can buy a basic upgrade. The bank lets players deposit or withdraw all carried gold.
- Defeat returns the player to the current zone's sanctuary, removes all carried gold, and removes 20% of progress toward the current level (at least 1 XP when progress is available). Banked gold and the current level are preserved.

## Intentional omissions

No player trading, persistence, accounts, multiplayer, live rankings, or server validation are present. Crafting is a starter framework: material tier odds, recipes, capacity progression, and economy values need balance passes. Future services must make combat, materials, balances, inventory ownership, and trade authoritative.

## Open questions

- Should later encounters remain decision-forward or add movement/dodging inside a bounded scene?
- Which specializations should receive leaderboard support first?
- What percentage of an item's long-term value should come from player demand versus combat power?
