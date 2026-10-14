export type Rarity = "common" | "rare";
export type Intent = "bite" | "cinder-burst" | "veil" | "dust-bite";
export type Phase = "idle" | "active" | "victory" | "defeat";
export type UpgradeId = "edgecraft" | "bulwark" | "veilsight";
export type EncounterId = "ashmaw" | "glasswing";

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
  id: EncounterId;
  name: string;
  hp: number;
  maxHp: number;
  intent: Intent;
}

export interface GameState {
  phase: Phase;
  encounterId: EncounterId;
  player: Player;
  enemy: Enemy;
  turn: number;
  braced: boolean;
  guaranteedRare: boolean;
  victories: number;
  encounterWins: Record<EncounterId, number>;
  titles: string[];
  discovered: string[];
  lastReward?: Item;
  log: string[];
}

export type GameAction =
  | { type: "start" }
  | { type: "select-encounter"; encounterId: EncounterId }
  | { type: "strike" }
  | { type: "brace" }
  | { type: "focus" }
  | { type: "equip"; itemId: string }
  | { type: "sell"; itemId: string }
  | { type: "upgrade"; upgradeId: UpgradeId }
  | { type: "toggle-guaranteed-rare" };
