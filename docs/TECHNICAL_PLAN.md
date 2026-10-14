# Technical plan

## Runtime and boundaries

- **Vite + TypeScript:** local development and production build.
- **Phaser:** disposable scene rendering, motion, hit effects, and background drawing.
- **Game modules:** deterministic state transitions, reward selection, inventory, equipment, and upgrades. These contain no DOM or Phaser references.
- **UI module:** maps browser events to named actions and renders serializable state into accessible DOM panels.
- **Tests:** Node/Vitest tests directly exercise game modules, including rare loot, guarded hits, upgrades, and equipment.

## Shape

```text
src/game/engine.ts       state reducer and encounter rules
src/game/content.ts      original enemy, item, and trait definitions
src/game/loot.ts         deterministic reward selection
src/game/types.ts        serializable domain types
src/ui/app.ts            DOM binding and presentation
src/game/scene.ts        Phaser adapter that reads game state
```

## Input and persistence

`strike`, `brace`, `focus`, `start`, `equip`, `upgrade`, and `toggle-guaranteed-rare` are explicit action names. State is held in memory for this milestone. It is inspectable through `window.render_game_to_text()` and advanced through `window.advanceTime(ms)` for deterministic automated checks.

## Future multiplayer boundary

A production service must own accounts, encounter seeds, combat resolution, loot generation, currency, inventory, equipment, trades, and leaderboard writes. Browser-side state is only presentation and local prototype logic.
