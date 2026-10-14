# Ashfall Frontier — first playable prototype

An original browser-game vertical slice inspired by the progression, specialization, and discovery appeal researched from Shimlar. It is not a clone and uses no Shimlar code, art, prose, data, or branding.

## Run locally

```sh
npm install
npm run dev
```

Open the local URL printed by Vite. Choose an encounter (Ashmaw or the Glasswing Moth), then Begin Hunt. Read the enemy's intent, use Brace against telegraphed hits, win loot, equip a relic, and purchase a level-two specialty. `Test rare loot` makes the next victory award Stormglass Fang.

## Verify

```sh
npm test
npm run typecheck
npm run build
```

`window.render_game_to_text()` exposes concise current state for browser automation. `window.advanceTime(ms)` redraws deterministically for the same purpose.

## Documentation

- `docs/PROJECT_STATUS.md`
- `docs/SHIMLAR_RESEARCH.md`
- `docs/GAME_DESIGN.md`
- `docs/COMBAT_AND_PRESENTATION_OPTIONS.md`
- `docs/PROTOTYPE_PLAN.md`
- `docs/TECHNICAL_PLAN.md`
- `docs/PLAYTEST_PLAN.md`
- `docs/NEXT_MILESTONES.md` (completed after validation)
