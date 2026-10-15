import Phaser from "phaser";
import { createInitialState, powerOf, guardOf, hitChanceAgainst, spellHitChanceAgainst, spellPowerOf, reduceGame } from "./game/engine";
import { ArenaScene } from "./game/scene";
import { simulateFreshProgression, type DevSimulationReport } from "./game/devtools";
import type { GameAction, GameState } from "./game/types";
import { renderApp } from "./ui/app";
import "./styles.css";

declare global {
  interface Window {
    render_game_to_text: () => string;
    advanceTime: (milliseconds: number) => void;
  }
}

const root = document.querySelector<HTMLElement>("#app");
if (!root) {
  throw new Error("Missing app root");
}
const appRoot: HTMLElement = root;

let state: GameState = createInitialState();
let sceneReady = false;
let game: Phaser.Game | undefined;
let devReport: DevSimulationReport | undefined;

const attachCanvas = (): void => {
  const host = document.querySelector<HTMLElement>("#arena-canvas");
  if (game?.canvas && host && game.canvas.parentElement !== host) {
    host.appendChild(game.canvas);
  }
};

const updateScene = (): void => {
  if (!sceneReady) {
    return;
  }
  const arena = game?.scene.getScene("arena") as ArenaScene | undefined;
  arena?.updateState(state);
};

function render(): void {
  renderApp(appRoot, state, dispatch, render, {
    report: devReport,
    reset: () => { state = createInitialState(); devReport = undefined; render(); },
    simulate: () => { devReport = simulateFreshProgression(); render(); },
  });
  attachCanvas();
  updateScene();
}

function dispatch(action: GameAction): void {
  state = reduceGame(state, action);
  render();
}

render();

game = new Phaser.Game({
  type: Phaser.CANVAS,
  parent: "arena-canvas",
  width: 920,
  height: 390,
  transparent: true,
  scene: ArenaScene,
  scale: {
    mode: Phaser.Scale.RESIZE,
    width: "100%",
    height: "100%",
  },
  render: { antialias: true, pixelArt: false },
});

game.events.once(Phaser.Core.Events.READY, () => {
  sceneReady = true;
  updateScene();
});

window.render_game_to_text = () =>
  JSON.stringify({
    coordinateSystem: "canvas origin is top-left; illustrated actors appear left (player) and right (enemy)",
    phase: state.phase,
    location: { ...state.location, zone: state.location.zoneId },
    player: { hp: state.player.hp, maxHp: state.player.maxHp, physicalDamage: powerOf(state.player), castingDamage: spellPowerOf(state.player), meleeHitChance: hitChanceAgainst(state.player, state.enemy), castingHitChance: spellHitChanceAgainst(state.player, state.enemy), guard: guardOf(state.player), attributes: state.player.attributes, level: state.player.level, experience: state.player.experience, gold: state.player.gold, bankedGold: state.player.bankedGold },
    enemy: { id: state.enemy.id, name: state.enemy.name, hp: state.enemy.hp, maxHp: state.enemy.maxHp, intent: state.enemy.intent, evasion: state.enemy.evasion, magicDefense: state.enemy.magicDefense, zoneLevel: state.enemy.zoneLevel, wins: state.encounterWins[state.enemy.id] },
    turn: state.turn,
    braced: state.braced,
    rareMaterialTest: state.guaranteedRare,
    equipped: Object.fromEntries(Object.entries(state.player.equipment).map(([slot, id]) => [slot, state.player.inventory.find((item) => item.id === id)?.name])),
    reward: state.lastRewards?.material?.name,
  });

window.advanceTime = () => {
  updateScene();
};
