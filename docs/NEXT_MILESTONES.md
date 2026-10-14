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
2. **Add encounter variety.** _Implemented 2026-10-13 (balance unverified):_ Glasswing Moth adds a veil-and-Dust-Bite behavior that forces a strike-or-heal choice, and a compact selector switches encounters between hunts. Still to verify: browser QA and playtest results.
3. **Make loot decisions richer.** _Implemented 2026-10-13:_ three item traits (Steady Hand, Veil Keen, Stormcharge) with decisions attached, including Ember Lens' guard cost; duplicate rewards are salvaged for half value; unequipped relics sell for gold; a collection log tracks discoveries. Still to verify: whether players notice and choose by traits.
4. **Add a specialization objective.** _Implemented 2026-10-13:_ per-encounter win milestones (Cinder Breaker, Veil Piercer) award titles and gold, and Veilsight is a second upgrade branch whose niche is the Glasswing Moth. Still to verify: whether players pursue these objectives.
5. **Validate balance with data.** Instrument local encounter outcomes and action choices; tune only after observing dominant actions.
6. **Plan authoritative services.** _Planned 2026-10-13:_ see `docs/SERVICES_PLAN.md` for server-owned authority, rejected client actions, seeds, persistence, and build order. Nothing is implemented, and no hosting or account has been created.

## Known limitations

- All data is in memory and resets on refresh.
- The rare toggle is a deliberate developer playtest aid, not a player-facing production feature.
- Art uses original procedural shapes only; there is no audio, animation set, map, or mobile touch-specific QA yet.
- Phaser currently contributes a roughly 1.22 MB minified JavaScript entry bundle. Keep it for fast iteration, but review renderer/dependency weight before a production client.
- This prototype has no authority or security model. Client values are untrusted and must not be used for live rewards, currency, inventories, trades, rankings, or combat validation.
