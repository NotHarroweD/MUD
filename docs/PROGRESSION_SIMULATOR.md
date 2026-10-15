# Progression simulator

The simulator runs the production TypeScript combat reducer directly. It seeds `Math.random` per character so a run can be repeated, and advances characters through fights, level choices, shop purchases, upgrades, and optional enhancement crafting.

## Run it

```sh
npm run simulate -- --runs 100 --seed 20261014 --target-level 50
```

Options:

- `--runs N`: number of simulated characters (default 100)
- `--seed N`: repeatable starting seed (default 20261014)
- `--target-level N`: level at which each character stops (default 50)
- `--max-battles N`: safety limit per character (default 10000)
- `--zone ID`: start at that zone's sanctuary to isolate its encounter difficulty (default `waking-garden`)
- `--strategy adaptive|aggressive`: adaptive uses a defensive action when the simulated incoming hit is near lethal and backs off after a loss; aggressive always Strikes
- `--build strength|balanced|arcane`: focus Strength, balance Strength and Vitality, or alternate Intelligence and Wisdom and cast in combat
- `--craft off|focused|balanced`: skip crafting, stack Keen Edge on the weapon, or alternate Keen Edge and Vital Weave
- `--details`: include each character's stop reason and progression summary

The browser's interim **Dev Tools** panel includes **Start over as a new player** for resetting the live local character, plus a seeded 20-character early-progression run. The browser run uses the game reducer, reveals Garden trials after wins, allocates level-up points, and revives at the sanctuary after losses. It currently does not model shop purchases, so use the CLI simulator for gear-policy comparisons.

The JSON report includes reach rate, mean/median/90th-percentile battles for characters that reach the target, deaths, win rate, turns per battle, level milestones, encounter win rates, materials collected, crafting level, and final combat stats. Level milestones count how many characters reached each level.

## First baseline

On 2026-10-14, 100 characters with seed `20261014`, adaptive play, a balanced Strength/Vitality build, focused crafting, and a level-50 target all reached the target. They needed a mean of 25.4 battles (median 24, 90th percentile 30), with an 83.7% battle win rate. Mean crafting level at the target was 4.14.

This is a fastest-frontier baseline, not the intended onboarding loop: the simulator selects the newest revealed trial after each win, and the current rules reveal a trial after only one victory. Revealed trials have no player-level requirement; earlier trials remain available. The intended progress gate is combat difficulty (whether the player can defeat the next monster), while level milestones are a way to evaluate the pacing curve. Only zone entrances use hard level gates. Reaching level 50 in about 25 battles shows how strongly the current Warden reward and level curve accelerate a character once that enemy is available; it should not be used as a prediction for the intended progression. Encounter win rates still help identify combat difficulty peaks.

## Model boundaries

- Characters start at level 1. `--zone` is a combat test fixture: it places the character at the selected sanctuary without simulating the journey or checking its entry requirement.
- The adaptive policy can use the engine's current intent value as pattern knowledge. The game UI still hides that intent; this is a scripted combat policy for comparing outcomes, not a claim that players see the next move.
- The simulator does not model chat, movement obstacles, real-time delays, item selling, banking, players, or multiplayer interactions.
- Gear buying is a simple fixed policy and crafting is optional. More policies can be added as the balance questions become clearer.
- Every victory currently awards exactly one material; the report counts remaining materials after crafting, not total drops by rarity.
