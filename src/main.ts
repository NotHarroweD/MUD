import Phaser from "phaser";
import { createInitialState, reduceGame } from "./game/engine";
import { ArenaScene } from "./game/scene";
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
  renderApp(appRoot, state, dispatch, render);
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
    player: { hp: state.player.hp, maxHp: state.player.maxHp, power: state.player.basePower, guard: state.player.baseGuard, level: state.player.level, gold: state.player.gold },
    enemy: { name: state.enemy.name, hp: state.enemy.hp, maxHp: state.enemy.maxHp, intent: state.enemy.intent },
    turn: state.turn,
    braced: state.braced,
    rareLootTest: state.guaranteedRare,
    equipped: state.player.inventory.find((item) => item.id === state.player.equippedId)?.name,
    reward: state.lastReward?.name,
  });

window.advanceTime = () => {
  updateScene();
};
