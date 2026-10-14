export type Rarity = "common" | "rare";
export type Intent = "bite" | "cinder-burst";
export type Phase = "idle" | "active" | "victory" | "defeat";
export type UpgradeId = "edgecraft" | "bulwark";

export interface Item {
  id: string;
  name: string;
  rarity: Rarity;
  power: number;
  guard: number;
  value: number;
  description: string;
}

export interface Player {
  hp: number;
  maxHp: number;
  basePower: number;
  baseGuard: number;
  experience: number;
  level: number;
  gold: number;
  equippedId: string;
  inventory: Item[];
  upgrades: UpgradeId[];
}

export interface Enemy {
  name: string;
  hp: number;
  maxHp: number;
  intent: Intent;
}

export interface GameState {
  phase: Phase;
  player: Player;
  enemy: Enemy;
  turn: number;
  braced: boolean;
  guaranteedRare: boolean;
  victories: number;
  lastReward?: Item;
  log: string[];
}

export type GameAction =
  | { type: "start" }
  | { type: "strike" }
  | { type: "brace" }
  | { type: "focus" }
  | { type: "equip"; itemId: string }
  | { type: "upgrade"; upgradeId: UpgradeId }
  | { type: "toggle-guaranteed-rare" };
