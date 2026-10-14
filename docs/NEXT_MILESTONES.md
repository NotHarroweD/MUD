# Next milestones

## What the prototype proved

### Observed playtest results — 2026-10-13

- A Chromium playthrough at a 1280px viewport completed the common-loot hunt, armed the rare-loot test, completed a rare hunt, equipped `Stormglass Fang`, and bought `Edgecraft`.
- The final UI visibly showed the rare reward, equipped item, comparison values, updated build totals, and next goal. The captured browser console was empty.
- The deterministic state confirmed victory, level 3, 16 gold after two victories and one 8-gold upgrade, and `Stormglass Fang` equipped.
- A canvas-only active-encounter capture visibly showed both combatants, health bars, and the Cinder Burst telegraph.
- Automated rules cover brace reduction, victory rewards, deterministic rare loot, equipment + upgrade calculations, defeat, and restart.

### Still unproven

One developer playthrough is not a usability study. The prototype does not yet demonstrate sustained variety, player demand, or whether the three-button combat stays interesting after repeated runs.

## Priority order

1. **Test with players.** Observe five new players completing the hunt. Measure whether they recognize Cinder Burst and understand item value without explanation.
2. **Add encounter variety.** Create two original enemy behaviors that force different choices, then add a compact encounter selector.
3. **Make loot decisions richer.** Add item traits with tradeoffs, duplicate handling/salvage, and a visible collection log before any player trading.
4. **Add a specialization objective.** Track a simple hunt achievement and introduce a second upgrade branch that has a measurable niche.
5. **Validate balance with data.** Instrument local encounter outcomes and action choices; tune only after observing dominant actions.
6. **Plan authoritative services.** Specify accounts, encounter seed validation, inventories, loot, currency, and leaderboards before introducing persistence or multiplayer.

## Known limitations

- All data is in memory and resets on refresh.
- The rare toggle is a deliberate developer playtest aid, not a player-facing production feature.
- Art uses original procedural shapes only; there is no audio, animation set, map, or mobile touch-specific QA yet.
- Phaser currently contributes a roughly 1.22 MB minified JavaScript entry bundle. Keep it for fast iteration, but review renderer/dependency weight before a production client.
- This prototype has no authority or security model. Client values are untrusted and must not be used for live rewards, currency, inventories, trades, rankings, or combat validation.
