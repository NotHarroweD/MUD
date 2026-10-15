import { availableEncountersFor, createInitialState, guardOf, maxHealthOf, powerOf, reduceGame } from "../src/game/engine";
import { encounters, enhancements } from "../src/game/content";
import { shopStockFor } from "../src/game/shops";
import { zones } from "../src/game/world";
import type { Attribute, GameState, GearSlot } from "../src/game/types";

type Options = { runs: number; seed: number; targetLevel: number; maxBattles: number; zone: string; strategy: "aggressive" | "adaptive"; build: "strength" | "balanced" | "arcane"; craft: "off" | "focused" | "balanced"; details: boolean };
type RunResult = { battles: number; wins: number; deaths: number; turns: number; reached: boolean; stopReason: string; level: number; xp: number; craftingLevel: number; enhancementsApplied: number; power: number; guard: number; maxHealth: number; gold: number; bankedGold: number; materials: Record<string, number>; kills: Record<string, number>; losses: Record<string, number>; levels: Record<number, number> };

const parseArgs = (): Options => {
  const args = process.argv.slice(2);
  const value = (key: string, fallback: string): string => {
    const index = args.indexOf(`--${key}`);
    return index >= 0 ? args[index + 1] ?? fallback : fallback;
  };
  const zone = value("zone", "waking-garden");
  if (!zones[zone]) throw new Error(`Unknown zone '${zone}'. Available: ${Object.keys(zones).join(", ")}`);
  const strategy = value("strategy", "adaptive");
  const build = value("build", "balanced");
  const craft = value("craft", "focused");
  if (strategy !== "adaptive" && strategy !== "aggressive") throw new Error("--strategy must be adaptive or aggressive");
  if (build !== "strength" && build !== "balanced" && build !== "arcane") throw new Error("--build must be strength, balanced, or arcane");
  if (craft !== "off" && craft !== "focused" && craft !== "balanced") throw new Error("--craft must be off, focused, or balanced");
  return {
    runs: Math.max(1, Number(value("runs", "100"))),
    seed: Number(value("seed", "20261014")),
    targetLevel: Math.max(2, Number(value("target-level", "50"))),
    maxBattles: Math.max(1, Number(value("max-battles", "10000"))),
    zone,
    strategy,
    build,
    craft,
    details: args.includes("--details"),
  };
};

const randomFor = (seed: number): (() => number) => {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const pathTo = (state: GameState, targetX: number, targetY: number): [number, number][] => {
  const queue: [number, number, [number, number][]][] = [[state.location.x, state.location.y, []]];
  const seen = new Set([`${state.location.x},${state.location.y}`]);
  const zone = zones[state.location.zoneId];
  while (queue.length) {
    const [x, y, path] = queue.shift()!;
    if (x === targetX && y === targetY) return path;
    for (let dy = -1; dy <= 1; dy += 1) for (let dx = -1; dx <= 1; dx += 1) {
      if (dx === 0 && dy === 0) continue;
      const nx = x + dx, ny = y + dy, key = `${nx},${ny}`;
      if (nx >= 0 && ny >= 0 && nx < zone.width && ny < zone.height && !seen.has(key)) {
        seen.add(key);
        queue.push([nx, ny, [...path, [nx, ny]]]);
      }
    }
  }
  return [];
};

const moveTo = (state: GameState, x: number, y: number): GameState =>
  pathTo(state, x, y).reduce((current, [nx, ny]) => reduceGame(current, { type: "move-to", x: nx, y: ny }), state);

const shopCoordinates = (state: GameState, slot: GearSlot): [number, number] | undefined => {
  const zone = zones[state.location.zoneId];
  const tile = slot === "weapon" ? "weapon-shop" : slot === "armor" ? "armor-shop" : "charm-shop";
  const entry = Object.entries(zone.tiles).find(([, type]) => type === tile);
  if (!entry) return undefined;
  return entry[0].split(",").map(Number) as [number, number];
};

const manageGear = (initial: GameState, craftMode: Options["craft"]): GameState => {
  let state = initial;
  for (const slot of ["weapon", "armor", "charm"] as const) {
    const coords = shopCoordinates(state, slot);
    if (!coords) continue;
    state = moveTo(state, coords[0], coords[1]);
    const stock = shopStockFor(state.location.zoneId, slot);
    // Buy the strongest baseline item in each slot when affordable.
    const candidate = stock.reduce((best, item) => (item.power + item.guard + item.maxHealth / 4 + item.criticalChance / 5 + item.focus > best.power + best.guard + best.maxHealth / 4 + best.criticalChance / 5 + best.focus ? item : best));
    const equipped = state.player.inventory.find((item) => item.id === state.player.equipment[slot]);
    if (state.player.gold >= candidate.value && equipped?.name !== candidate.name) {
      state = reduceGame(state, { type: "buy-item", itemId: candidate.id });
      const purchased = state.player.inventory.at(-1);
      if (purchased) state = reduceGame(state, { type: "equip", itemId: purchased.id });
    }
  }
  const coords = shopCoordinates(state, "weapon");
  if (coords) state = moveTo(state, coords[0], coords[1]);
  for (const upgradeId of ["edgecraft", "bulwark"] as const) state = reduceGame(state, { type: "upgrade", upgradeId });
  if (craftMode !== "off") {
    let guard = 0;
    while (guard < 15) {
      guard += 1;
      const weapon = state.player.inventory.find((item) => item.id === state.player.equipment.weapon);
      const armor = state.player.inventory.find((item) => item.id === state.player.equipment.armor);
      const focusedTarget = weapon && weapon.enhancements.length < weapon.enhancementCapacity ? weapon : undefined;
      const balancedTarget = armor && armor.enhancements.length < armor.enhancementCapacity && (armor.enhancements.length < (weapon?.enhancements.length ?? 0)) ? armor : focusedTarget;
      const target = craftMode === "balanced" ? balancedTarget : focusedTarget;
      if (!target || (state.player.materials["verdant-resin"] ?? 0) < 1) break;
      const recipe = craftMode === "balanced" && target.slot === "armor" ? "vital-weave" : "keen-edge";
      const before = state;
      state = reduceGame(state, { type: "craft-enhancement", enhancementId: recipe, itemId: target.id });
      if (state === before) break;
    }
  }
  return state;
};

const chooseAttribute = (level: number, build: Options["build"]): Attribute =>
  build === "arcane" ? (level % 2 === 0 ? "intelligence" : "wisdom") : build === "strength" || level % 2 === 0 ? "strength" : "vitality";

const settleVictory = (initial: GameState, options: Options): GameState => {
  let state = initial;
  while (state.player.unspentAttributePoints > 0) state = reduceGame(state, { type: "raise-attribute", attribute: chooseAttribute(state.player.level, options.build) });
  state = manageGear(state, options.craft);
  return reduceGame(state, { type: "dismiss-reward" });
};

const chooseEncounter = (state: GameState, blockedAtLevel: Record<string, number>, strategy: Options["strategy"]): GameState => {
  const available = availableEncountersFor(state);
  if (!available.length) return state;
  // Adaptive characters retreat to the strongest trial they have previously beaten
  // after a setback, earning levels and gear before trying the frontier again.
  const selected = state.location.zoneId === "waking-garden" && strategy === "adaptive"
    ? [...available].reverse().find((id) => blockedAtLevel[id] === undefined || state.player.level > blockedAtLevel[id]) ?? available[0]
    : state.location.zoneId === "waking-garden" ? available.at(-1)! : available[0];
  return selected === state.encounterId ? state : reduceGame(state, { type: "select-encounter", encounterId: selected });
};

const actionFor = (state: GameState, strategy: Options["strategy"], build: Options["build"]): "strike" | "cast" | "brace" | "focus" => {
  if (strategy === "aggressive") return "strike";
  const intent = state.enemy.intent;
  const raw = intent === "cinder-burst" ? 5 : intent === "dust-bite" ? 4 : intent === "bite" ? 2 : 0;
  const incoming = raw + (encounters[state.enemy.id].damageBonus ?? 0);
  const mitigated = Math.max(0, incoming - guardOf(state.player));
  const nearLethal = mitigated >= state.player.hp - 2;
  if (nearLethal && incoming > guardOf(state.player)) return "brace";
  if (state.player.hp <= Math.max(3, state.player.maxHp * 0.35) && intent === "veil") return "focus";
  if (build === "arcane") return "cast";
  return "strike";
};

const simulateRun = (options: Options, runIndex: number): RunResult => {
  const originalRandom = Math.random;
  Math.random = randomFor(options.seed + runIndex * 0x9e3779b9);
  try {
    const zone = zones[options.zone];
    const sanctuary = Object.entries(zone.tiles).find(([, type]) => type === "sanctuary")?.[0].split(",").map(Number) ?? [0, 0];
    let state: GameState = { ...createInitialState(), location: { zoneId: zone.id, x: sanctuary[0], y: sanctuary[1] } };
    let battles = 0, wins = 0, deaths = 0, turns = 0;
    let stopReason = "battle limit reached";
    const kills: Record<string, number> = {}, losses: Record<string, number> = {}, blockedAtLevel: Record<string, number> = {}, levels: Record<number, number> = {};

    while (battles < options.maxBattles && state.player.level < options.targetLevel) {
      state = chooseEncounter(state, blockedAtLevel, options.strategy);
      const priorLevel = state.player.level;
      state = reduceGame(state, { type: "start" });
      if (state.phase !== "active") { stopReason = `start rejected (${state.phase}, ${state.encounterId})`; break; }
      battles += 1;
      const fought = state.enemy.id;
      let localTurns = 0;
      while (state.phase === "active" && localTurns < 300) {
        state = reduceGame(state, { type: actionFor(state, options.strategy, options.build) });
        localTurns += 1;
      }
      turns += localTurns;
      if (state.phase === "victory") {
        wins += 1;
        kills[fought] = (kills[fought] ?? 0) + 1;
        state = settleVictory(state, options);
        if (state.player.level > priorLevel) for (let level = priorLevel + 1; level <= state.player.level; level += 1) levels[level] = (levels[level] ?? 0) + 1;
      } else if (state.phase === "defeat") {
        deaths += 1;
        losses[fought] = (losses[fought] ?? 0) + 1;
        blockedAtLevel[fought] = state.player.level;
        state = reduceGame(state, { type: "dismiss-reward" });
      } else { stopReason = `turn cap reached (${fought})`; break; }
    }
    if (state.player.level >= options.targetLevel) stopReason = "target level reached";
    return {
      battles, wins, deaths, turns, reached: state.player.level >= options.targetLevel, stopReason, level: state.player.level,
      xp: state.player.experience, craftingLevel: state.player.craftingLevel, gold: state.player.gold,
      power: powerOf(state.player), guard: guardOf(state.player), maxHealth: maxHealthOf(state.player),
      enhancementsApplied: state.player.inventory.reduce((sum, item) => sum + item.enhancements.length, 0),
      bankedGold: state.player.bankedGold, materials: { ...state.player.materials }, kills, losses, levels,
    };
  } finally {
    Math.random = originalRandom;
  }
};

const average = (values: number[]): number => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
const percentile = (values: number[], fraction: number): number => [...values].sort((a, b) => a - b)[Math.min(values.length - 1, Math.floor((values.length - 1) * fraction))] ?? 0;
const mergeCounts = (runs: RunResult[], field: "kills" | "losses" | "materials" | "levels"): Record<string, number> => {
  const total: Record<string, number> = {};
  for (const run of runs) for (const [key, value] of Object.entries(run[field])) total[key] = (total[key] ?? 0) + value;
  return total;
};

const main = (): void => {
  if (process.argv.includes("--help")) {
    console.log("Usage: npm run simulate -- [--runs 100] [--seed 20261014] [--target-level 50] [--max-battles 10000] [--zone waking-garden] [--strategy adaptive|aggressive] [--build strength|balanced|arcane] [--craft off|focused|balanced] [--details]");
    return;
  }
  const options = parseArgs();
  const runs = Array.from({ length: options.runs }, (_, index) => simulateRun(options, index));
  const battleCounts = runs.map((run) => run.battles);
  const totalBattles = runs.reduce((sum, run) => sum + run.battles, 0);
  const totalWins = runs.reduce((sum, run) => sum + run.wins, 0);
  const totalDeaths = runs.reduce((sum, run) => sum + run.deaths, 0);
  const totalTurns = runs.reduce((sum, run) => sum + run.turns, 0);
  const reachedRuns = runs.filter((run) => run.reached);
  const reachedBattles = reachedRuns.map((run) => run.battles);
  const encounterWins = mergeCounts(runs, "kills");
  const encounterDeaths = mergeCounts(runs, "losses");
  const encounterPerformance = Object.fromEntries([...new Set([...Object.keys(encounterWins), ...Object.keys(encounterDeaths)])].map((id) => {
    const wins = encounterWins[id] ?? 0, deaths = encounterDeaths[id] ?? 0;
    return [id, { wins, deaths, winRate: wins + deaths ? `${(wins / (wins + deaths) * 100).toFixed(1)}%` : "n/a" }];
  }));
  const stopReasons = runs.reduce<Record<string, number>>((counts, run) => ({ ...counts, [run.stopReason]: (counts[run.stopReason] ?? 0) + 1 }), {});
  const result = {
    config: options,
    population: {
      characters: runs.length,
      reachedTarget: runs.filter((run) => run.reached).length,
      targetReachRate: `${(runs.filter((run) => run.reached).length / runs.length * 100).toFixed(1)}%`,
      battlesToTarget: { mean: reachedRuns.length ? Number(average(reachedBattles).toFixed(1)) : null, median: reachedRuns.length ? percentile(reachedBattles, 0.5) : null, p90: reachedRuns.length ? percentile(reachedBattles, 0.9) : null },
      meanBattlesSimulated: Number(average(battleCounts).toFixed(1)),
      meanCharacterLevel: Number(average(runs.map((run) => run.level)).toFixed(2)),
      wins: totalWins,
      deaths: totalDeaths,
      winRate: totalBattles ? `${(totalWins / totalBattles * 100).toFixed(1)}%` : "0%",
      meanTurnsPerBattle: totalBattles ? Number((totalTurns / totalBattles).toFixed(2)) : 0,
      meanCraftingLevel: Number(average(runs.map((run) => run.craftingLevel)).toFixed(2)),
      meanEnhancementsApplied: Number(average(runs.map((run) => run.enhancementsApplied)).toFixed(2)),
      meanPower: Number(average(runs.map((run) => run.power)).toFixed(2)),
      meanGuard: Number(average(runs.map((run) => run.guard)).toFixed(2)),
      meanMaxHealth: Number(average(runs.map((run) => run.maxHealth)).toFixed(2)),
      meanCarriedGoldAtStop: Number(average(runs.map((run) => run.gold)).toFixed(1)),
      meanBankedGoldAtStop: Number(average(runs.map((run) => run.bankedGold)).toFixed(1)),
    },
    ...(options.details ? { runOutcomes: runs.map(({ battles, wins, deaths, level, xp, reached, stopReason }) => ({ battles, wins, deaths, level, xp, reached, stopReason })) } : {}),
    levelMilestones: mergeCounts(runs, "levels"),
    stopReasons,
    encounterPerformance,
    materialsCollected: mergeCounts(runs, "materials"),
  };
  console.log(JSON.stringify(result, null, 2));
};

main();
