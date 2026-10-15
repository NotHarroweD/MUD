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

    if (!state || state.phase === "idle") return;

    const playerX = width * 0.3;
    const enemyX = width * 0.7;
    const centerY = height * 0.62;

    const moth = state?.enemy.id === "glasswing";
    const gardenPalette = [0x9acb71, 0x67bdb0, 0xd2a45d, 0xb87955, 0xb68ce0, 0x8eae63, 0x68a9bb, 0x9a9c72, 0x9b77bd, 0xe0b86f];
    const gardenIndex = state?.enemy.id.startsWith("garden-") ? ["garden-sproutling", "garden-dewling", "garden-petal-mite", "garden-thornbud", "garden-pollen-wisp", "garden-bramble-pup", "garden-glasscap-toad", "garden-rootbound-stag", "garden-duskwing-matriarch", "garden-warden"].indexOf(state.enemy.id) : -1;
    const gardenColor = gardenPalette[Math.max(0, gardenIndex)];
    const enemyBody = moth ? colors.smoke : gardenIndex >= 0 ? gardenColor : colors.ember;
    const enemyGlow = moth ? colors.violet : gardenIndex >= 0 ? gardenColor : colors.ember;
    const enemyRadius = gardenIndex >= 0 ? 23 + gardenIndex * 1.25 : 35;

    graphics.fillStyle(colors.violet, 0.2).fillCircle(playerX, centerY, 58);
    graphics.fillStyle(colors.violet, 1).fillCircle(playerX, centerY, 24);
    graphics.fillStyle(0xe8d5ff, 1).fillCircle(playerX - 6, centerY - 6, 6);
    graphics.fillStyle(enemyGlow, 0.2).fillCircle(enemyX, centerY, enemyRadius * 2);
    graphics.fillStyle(enemyBody, 1).fillCircle(enemyX, centerY, enemyRadius);
    graphics.fillStyle(moth ? colors.violet : colors.emberBright, 1).fillCircle(enemyX + 11, centerY - 10, 6);

    if (gardenIndex === 3 || gardenIndex === 7 || gardenIndex === 9) {
      graphics.fillStyle(enemyBody, 1)
        .fillTriangle(enemyX - enemyRadius * 0.75, centerY - enemyRadius * 0.55, enemyX - enemyRadius * 1.15, centerY - enemyRadius * 1.3, enemyX - enemyRadius * 0.2, centerY - enemyRadius * 0.85)
        .fillTriangle(enemyX + enemyRadius * 0.75, centerY - enemyRadius * 0.55, enemyX + enemyRadius * 1.15, centerY - enemyRadius * 1.3, enemyX + enemyRadius * 0.2, centerY - enemyRadius * 0.85);
    }

    if (state?.braced) {
      graphics.lineStyle(4, colors.violet, 0.9).strokeCircle(playerX, centerY, 40);
    }
  }
}
