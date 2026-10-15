export type Rarity = "common" | "uncommon" | "rare" | "mythic";
export type MaterialId = "verdant-resin" | "emberglass" | "storm-thread";
export type EnhancementId = "keen-edge" | "vital-weave" | "warding-knot";
export type TraitId = "veil-keen" | "steady-hand" | "stormcharge";
export interface ItemTrait {
  id: TraitId;
  name: string;
  text: string;
}
export type Intent = "bite" | "cinder-burst" | "veil" | "dust-bite";
export type Phase = "idle" | "active" | "victory" | "defeat";
export type UpgradeId = "edgecraft" | "bulwark" | "veilsight";
export type GardenEncounterId = "garden-sproutling" | "garden-dewling" | "garden-petal-mite" | "garden-thornbud" | "garden-pollen-wisp" | "garden-bramble-pup" | "garden-glasscap-toad" | "garden-rootbound-stag" | "garden-duskwing-matriarch" | "garden-warden";
export type EncounterId = "ashmaw" | "glasswing" | GardenEncounterId;
export type Attribute = "strength" | "dexterity" | "intelligence" | "wisdom" | "vitality";
export type GearSlot = "weapon" | "armor" | "charm";
export type TileType = "standard" | "sanctuary" | "weapon-shop" | "armor-shop" | "charm-shop" | "bank" | "entrance" | "subzone";

export interface PlayerLocation {
  zoneId: string;
  x: number;
  y: number;
}

export type Attributes = Record<Attribute, number>;

export interface BattleEvent {
  seq: number;
  target: "player" | "enemy";
  kind: "damage" | "heal" | "block" | "miss" | "evade";
  amount: number;
  critical?: boolean;
}

export interface RewardSummary {
  experience: number;
  baseGold: number;
  milestones: { name: string; gold: number }[];
  material?: MaterialStack;
  leveledTo?: number;
}

export interface MaterialStack {
  id: MaterialId;
  name: string;
  rarity: Rarity;
  quantity: number;
}

export interface GearEnhancement {
  id: EnhancementId;
  name: string;
  bonus: Partial<Pick<Item, "power" | "guard" | "maxHealth" | "criticalChance" | "evasion" | "focus">>;
  material: MaterialId;
  requiredCraftingLevel: number;
}

export interface Item {
  id: string;
  name: string;
  slot: GearSlot;
  rarity: Rarity;
  power: number;
  guard: number;
  maxHealth: number;
  criticalChance: number;
  evasion: number;
  focus: number;
  attributes?: Partial<Attributes>;
  value: number;
  description: string;
  trait?: ItemTrait;
  enhancementCapacity: number;
  enhancements: EnhancementId[];
}

export interface Player {
  hp: number;
  maxHp: number;
  attributes: Attributes;
  unspentAttributePoints: number;
  experience: number;
  level: number;
  gold: number;
  bankedGold: number;
  equipment: Partial<Record<GearSlot, string>>;
  inventory: Item[];
  upgrades: UpgradeId[];
  materials: Partial<Record<MaterialId, number>>;
  craftingLevel: number;
  craftingExperience: number;
}

export interface Enemy {
  id: EncounterId;
  name: string;
  hp: number;
  maxHp: number;
  intent: Intent;
  evasion: number;
  magicDefense: number;
  zoneLevel: number;
}

export interface GameState {
  phase: Phase;
  encounterId: EncounterId;
  player: Player;
  location: PlayerLocation;
  enemy: Enemy;
  turn: number;
  braced: boolean;
  guaranteedRare: boolean;
  victories: number;
  encounterWins: Record<EncounterId, number>;
  titles: string[];
  lastRewards?: RewardSummary;
  eventSeq: number;
  events: BattleEvent[];
  log: string[];
}

export type GameAction =
  | { type: "start" }
  | { type: "dismiss-reward" }
  | { type: "raise-attribute"; attribute: Attribute }
  | { type: "move-to"; x: number; y: number }
  | { type: "enter-zone" }
  | { type: "rest" }
  | { type: "bank-deposit" }
  | { type: "bank-withdraw" }
  | { type: "buy-item"; itemId: string }
  | { type: "craft-enhancement"; enhancementId: EnhancementId; itemId: string }
  | { type: "select-encounter"; encounterId: EncounterId }
  | { type: "strike" }
  | { type: "cast" }
  | { type: "brace" }
  | { type: "focus" }
  | { type: "equip"; itemId: string }
  | { type: "sell"; itemId: string }
  | { type: "upgrade"; upgradeId: UpgradeId }
  | { type: "toggle-guaranteed-rare" };
