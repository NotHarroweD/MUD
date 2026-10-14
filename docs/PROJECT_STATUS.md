# Project status

_Inspected 2026-10-13._

## Current project

The repository was initialized but had no commits, source files, package manifest, or existing prototype. There is no work to preserve beyond the Git repository itself.

## Chosen stack

The first vertical slice uses a browser-first TypeScript application built with Vite and Phaser. Phaser supplies the small 2D encounter canvas; game rules remain framework-independent TypeScript modules; the HUD, inventory, and decisions live in accessible DOM controls.

## Important directories

- `src/game/` — deterministic combat, loot, inventory, and progression rules.
- `src/ui/` — DOM shell and presentation bindings.
- `tests/` — rule-level automated tests.
- `docs/` — research, design, playtest, and future plans.

## Commands

```sh
npm install
npm run dev
npm test
npm run typecheck
npm run build
```

## Environmental limitations

- The current live-game shell is iframe-based and not readable through the research crawler.
- The community wiki is blocked by robots rules in the available research tool.
- The historical GitHub repository is a GPL-3.0 source snapshot from 2007, not a specification for the current game; this project does not copy its code, art, names, prose, or data.
- The prototype is local-only. Browser state is not secure multiplayer persistence.

## Recommended next step

Install the declared dependencies, then run the prototype and its deterministic combat tests.
