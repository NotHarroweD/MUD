import { availableEncountersFor, createInitialState, guardOf, reduceGame } from "./engine";
import { encounters } from "./content";
import type { Attribute, GameState } from "./types";

export interface DevSimulationReport {
  runs: number;
  reachedLevel: number;
  meanBattles: number;
  meanDeaths: number;
  meanWins: number;
  meanLevel: number;
  monsters: { name: string; wins: number; losses: number }[];
}

const seededRandom = (seed: number): (() => number) => {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/** Runs fresh characters through the actual reducer to provide a repeatable early-game balance check. */
export const simulateFreshProgression = (runs = 20, targetLevel = 50, seed = 20261014): DevSimulationReport => {
  const originalRandom = Math.random;
  const totals = { battles: 0, deaths: 0, wins: 0, level: 0 };
  const wins: Record<string, number> = {};
  const losses: Record<string, number> = {};
  let reachedLevel = 0;
  try {
    for (let run = 0; run < runs; run += 1) {
      Math.random = seededRandom(seed + run * 0x9e3779b9);
      let state: GameState = createInitialState();
      let battles = 0;
      let deaths = 0;
      let guard = 0;
      while (state.player.level < targetLevel && battles < 5000 && guard < 250000) {
        guard += 1;
        if (state.phase !== "active") {
          if (state.phase === "victory") {
            while (state.player.unspentAttributePoints > 0) {
              const attribute: Attribute = state.player.attributes.strength <= state.player.attributes.vitality ? "strength" : "vitality";
              state = reduceGame(state, { type: "raise-attribute", attribute });
            }
            state = reduceGame(state, { type: "dismiss-reward" });
          } else if (state.phase === "defeat") {
            deaths += 1;
            losses[state.enemy.id] = (losses[state.enemy.id] ?? 0) + 1;
            state = reduceGame(state, { type: "dismiss-reward" });
            state = reduceGame(state, { type: "rest" });
          } else {
            const available = availableEncountersFor(state);
            if (!available.length) break;
            const next = available.at(-1)!;
            if (next !== state.encounterId) state = reduceGame(state, { type: "select-encounter", encounterId: next });
            state = reduceGame(state, { type: "start" });
            if (state.phase === "active") battles += 1;
          }
          continue;
        }

        const enemy = encounters[state.enemy.id];
        const incoming = (state.enemy.intent === "cinder-burst" ? 5 : state.enemy.intent === "dust-bite" ? 4 : state.enemy.intent === "bite" ? 2 : 0) + (enemy.damageBonus ?? 0);
        const action = incoming - guardOf(state.player) >= state.player.hp - 2 && incoming > guardOf(state.player) ? "brace" : "strike";
        state = reduceGame(state, { type: action });
      }
      totals.battles += battles;
      totals.deaths += deaths;
      totals.level += state.player.level;
      if (state.player.level >= targetLevel) reachedLevel += 1;
      for (const [id, count] of Object.entries(state.encounterWins)) wins[id] = (wins[id] ?? 0) + count;
      totals.wins += Object.values(state.encounterWins).reduce((sum, count) => sum + count, 0);
    }
  } finally {
    Math.random = originalRandom;
  }
  return {
    runs,
    reachedLevel,
    meanBattles: totals.battles / runs,
    meanDeaths: totals.deaths / runs,
    meanWins: totals.wins / runs,
    meanLevel: totals.level / runs,
    monsters: Object.entries(encounters)
      .filter(([id]) => id.startsWith("garden-"))
      .map(([id, enemy]) => ({ name: enemy.name, wins: wins[id] ?? 0, losses: losses[id] ?? 0 })),
  };
};
