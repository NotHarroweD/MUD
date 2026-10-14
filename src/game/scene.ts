import Phaser from "phaser";
import type { GameState } from "./types";

const colors = {
  ember: 0xff8a5c,
  emberBright: 0xffd38a,
  ink: 0x0c1d1b,
  leaf: 0x1d4b3e,
  moss: 0x5b9870,
  violet: 0xae82ff,
  smoke: 0x718083,
};

export class ArenaScene extends Phaser.Scene {
  private state?: GameState;
  private graphics?: Phaser.GameObjects.Graphics;

  public constructor() {
    super("arena");
  }

  public updateState(state: GameState): void {
    this.state = state;
    this.drawArena();
  }

  public create(): void {
    this.graphics = this.add.graphics();
    this.scale.on("resize", () => this.drawArena());
    this.drawArena();
  }

  private drawArena(): void {
    const graphics = this.graphics ?? this.add.graphics();
    graphics.clear();
    const { width, height } = this.scale;
    const state = this.state;

    graphics.fillStyle(colors.ink, 1).fillRect(0, 0, width, height);
    graphics.fillStyle(colors.leaf, 1).fillCircle(width * 0.5, height * 0.92, width * 0.42);
    graphics.fillStyle(colors.moss, 0.26).fillCircle(width * 0.15, height * 0.45, width * 0.27);
    graphics.fillStyle(colors.moss, 0.16).fillCircle(width * 0.8, height * 0.32, width * 0.32);

    for (let index = 0; index < 12; index += 1) {
      const x = (index * 97) % width;
      const y = 30 + ((index * 61) % Math.max(1, height - 45));
      graphics.fillStyle(colors.smoke, 0.18).fillCircle(x, y, 3 + (index % 3));
    }

    const playerX = width * 0.3;
    const enemyX = width * 0.7;
    const centerY = height * 0.62;
    const playerHpRatio = state ? state.player.hp / state.player.maxHp : 1;
    const enemyHpRatio = state ? state.enemy.hp / state.enemy.maxHp : 1;
    const rare = state?.lastReward?.rarity === "rare";

    graphics.fillStyle(colors.violet, 0.2).fillCircle(playerX, centerY, 58);
    graphics.fillStyle(colors.violet, 1).fillCircle(playerX, centerY, 24);
    graphics.fillStyle(0xe8d5ff, 1).fillCircle(playerX - 6, centerY - 6, 6);
    graphics.fillStyle(colors.ember, 0.2).fillCircle(enemyX, centerY, 70);
    graphics.fillStyle(colors.ember, 1).fillCircle(enemyX, centerY, 35);
    graphics.fillStyle(colors.emberBright, 1).fillCircle(enemyX + 11, centerY - 10, 6);

    if (state?.phase === "active" && state.enemy.intent === "cinder-burst") {
      graphics.lineStyle(3, colors.emberBright, 0.85).strokeCircle(enemyX, centerY, 52);
    }
    if (state?.braced) {
      graphics.lineStyle(4, colors.violet, 0.9).strokeCircle(playerX, centerY, 40);
    }
    if (rare) {
      graphics.lineStyle(3, colors.violet, 0.95).strokeCircle(width * 0.5, height * 0.28, 23);
      graphics.fillStyle(colors.violet, 1).fillTriangle(width * 0.5, height * 0.21, width * 0.47, height * 0.31, width * 0.53, height * 0.31);
    }

    this.drawBar(graphics, playerX - 56, centerY + 64, 112, playerHpRatio, colors.violet);
    this.drawBar(graphics, enemyX - 56, centerY + 64, 112, enemyHpRatio, colors.ember);
  }

  private drawBar(
    graphics: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    width: number,
    ratio: number,
    color: number,
  ): void {
    graphics.fillStyle(0x07100f, 0.9).fillRoundedRect(x, y, width, 8, 4);
    graphics.fillStyle(color, 0.95).fillRoundedRect(x + 2, y + 2, Math.max(0, (width - 4) * ratio), 4, 2);
  }
}
