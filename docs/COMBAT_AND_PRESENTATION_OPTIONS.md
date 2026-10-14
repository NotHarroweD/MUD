# Combat and presentation options

## Comparison

| Approach | Cost / feasibility | Player appeal and depth | Progression, loot, multiplayer path | Prototype fit |
| --- | --- | --- | --- | --- |
| A. Modernized interface RPG | Lowest; very solo-friendly | Deep choices are possible but risks feeling click-heavy | Excellent for systems, economy, and later authoritative services | Good baseline, weak test of immediate feedback |
| B. Illustrated encounters | Low-medium; a bounded 2D canvas plus DOM decisions | Clear enemy identity, telegraphs, cooldown-like actions, and reward reveals without full world simulation | Strong fit for equipment, rare loot, builds, and later encounter services | **Recommended** |
| C. Compact action RPG | Highest; movement, collision, animation, tuning, and camera work multiply scope | Highest moment-to-moment mastery potential | Compatible, but delays testing inventory/economy fantasy | Too expensive for milestone one |

## Recommendation

Build **Option B: illustrated encounters**. The first player-facing test is a 3–5 minute hunt where the player reads an enemy intent, uses a defensive response, chooses damage versus preparation, earns a rare-drop chance, compares the find, equips an upgrade, and sees the next milestone. It deliberately avoids a world map, pathfinding, networking, and third-party art.

This is not a commitment against a later compact action mode. The simulation has no Phaser dependencies, so an action scene or server-authoritative encounter adapter can replace the first renderer without rewriting progression, items, or rewards.
