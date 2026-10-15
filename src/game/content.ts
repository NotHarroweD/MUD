import type { Enemy, EncounterId, EnhancementId, GearEnhancement, Intent, Item, MaterialId, UpgradeId } from "./types";

export const starterItem: Item = {
  id: "cinderhook",
  name: "Cinderhook Knife",
  slot: "weapon",
  rarity: "common",
  power: 1,
  guard: 0,
  maxHealth: 0,
  criticalChance: 0,
  evasion: 0,
  focus: 0,
  value: 4,
  description: "A practical blade, warm from the forge.",
  enhancementCapacity: 5,
  enhancements: [],
};

export const lootTable: Item[] = [
  {
    id: "ashband",
    name: "Glowing Ashband",
    slot: "armor",
    rarity: "common",
    power: 0,
    guard: 2,
    maxHealth: 4,
    criticalChance: 0,
    evasion: 0,
    focus: 0,
    attributes: { vitality: 1 },
    value: 9,
    description: "A heat-hardened band that steadies your stance.",
    enhancementCapacity: 5,
    enhancements: [],
    trait: {
      id: "steady-hand",
      name: "Steady Hand",
      text: "A successful Brace also restores 1 health.",
    },
  },
  {
    id: "emberlens",
    name: "Ember Lens",
    slot: "charm",
    rarity: "common",
    power: 0,
    guard: 0,
    maxHealth: 0,
    criticalChance: 3,
    evasion: 2,
    focus: 1,
    attributes: { intelligence: 1, dexterity: 1 },
    value: 10,
    description: "A sharp red lens that helps find an opening, at the cost of your guard.",
    enhancementCapacity: 5,
    enhancements: [],
    trait: {
      id: "veil-keen",
      name: "Veil Keen",
      text: "+2 damage to Strikes against a veiled enemy.",
    },
  },
];

export interface MaterialDefinition {
  id: MaterialId;
  name: string;
  rarity: "uncommon" | "rare" | "mythic";
  description: string;
}

export const materials: Record<MaterialId, MaterialDefinition> = {
  "verdant-resin": { id: "verdant-resin", name: "Verdant Resin", rarity: "uncommon", description: "A flexible sap used to bind an enhancement to gear." },
  emberglass: { id: "emberglass", name: "Emberglass Shard", rarity: "rare", description: "A heat-lit fragment that carries a precise combat property." },
  "storm-thread": { id: "storm-thread", name: "Storm Thread", rarity: "mythic", description: "A charged filament capable of holding an exceptional enhancement." },
};

export const enhancements: Record<EnhancementId, GearEnhancement> = {
  "keen-edge": { id: "keen-edge", name: "Keen Edge", bonus: { power: 1 }, material: "verdant-resin", requiredCraftingLevel: 1 },
  "vital-weave": { id: "vital-weave", name: "Vital Weave", bonus: { maxHealth: 3 }, material: "verdant-resin", requiredCraftingLevel: 1 },
  "warding-knot": { id: "warding-knot", name: "Warding Knot", bonus: { guard: 1 }, material: "emberglass", requiredCraftingLevel: 2 },
};

export const craftingExperienceForNextLevel = (level: number): number => 25 + (level - 1) * 25;

export interface EncounterDefinition {
  id: EncounterId;
  name: string;
  subtitle: string;
  description: string;
  opening: string;
  maxHp: number;
  evasion: number;
  pattern: Intent[];
  experienceReward?: number;
  goldReward?: number;
  damageBonus?: number;
}

const gardenRoster: {
  id: Extract<EncounterId, `garden-${string}`>;
  name: string;
  subtitle: string;
  maxHp: number;
  evasion: number;
  damageBonus: number;
  experienceReward: number;
  goldReward: number;
  pattern: Intent[];
}[] = [
  { id: "garden-sproutling", name: "Sproutling", subtitle: "Garden trainee", maxHp: 8, evasion: 0, damageBonus: 0, experienceReward: 10, goldReward: 12, pattern: ["bite"] },
  { id: "garden-dewling", name: "Dewling", subtitle: "Dewdrop lurker", maxHp: 12, evasion: 3, damageBonus: 0, experienceReward: 20, goldReward: 16, pattern: ["bite", "veil"] },
  { id: "garden-petal-mite", name: "Petal Mite", subtitle: "Budding skirmisher", maxHp: 18, evasion: 5, damageBonus: 0, experienceReward: 35, goldReward: 20, pattern: ["bite", "cinder-burst"] },
  { id: "garden-thornbud", name: "Thornbud", subtitle: "Bramble guard", maxHp: 24, evasion: 5, damageBonus: 1, experienceReward: 50, goldReward: 25, pattern: ["cinder-burst", "bite"] },
  { id: "garden-pollen-wisp", name: "Pollen Wisp", subtitle: "Floating trickster", maxHp: 30, evasion: 9, damageBonus: 1, experienceReward: 75, goldReward: 30, pattern: ["veil", "dust-bite"] },
  { id: "garden-bramble-pup", name: "Bramble Pup", subtitle: "Young pack hunter", maxHp: 40, evasion: 8, damageBonus: 2, experienceReward: 110, goldReward: 38, pattern: ["bite", "cinder-burst"] },
  { id: "garden-glasscap-toad", name: "Glasscap Toad", subtitle: "Sporebound bruiser", maxHp: 52, evasion: 10, damageBonus: 2, experienceReward: 160, goldReward: 48, pattern: ["cinder-burst", "dust-bite"] },
  { id: "garden-rootbound-stag", name: "Rootbound Stag", subtitle: "Old-growth sentinel", maxHp: 68, evasion: 10, damageBonus: 3, experienceReward: 240, goldReward: 62, pattern: ["bite", "cinder-burst", "dust-bite"] },
  { id: "garden-duskwing-matriarch", name: "Duskwing Matriarch", subtitle: "Veilwing elder", maxHp: 88, evasion: 14, damageBonus: 4, experienceReward: 360, goldReward: 82, pattern: ["veil", "dust-bite", "cinder-burst"] },
  { id: "garden-warden", name: "Warden of the Garden", subtitle: "Keeper of the waking path", maxHp: 115, evasion: 12, damageBonus: 5, experienceReward: 550, goldReward: 110, pattern: ["cinder-burst", "dust-bite", "bite"] },
];

export const encounters: Record<EncounterId, EncounterDefinition> = {
  ashmaw: {
    id: "ashmaw",
    name: "Ashmaw",
    subtitle: "Cinder brute",
    description: "A cinder brute that alternates heavy blasts with close-range bites.",
    opening: "The Cinderwood Hunt begins. Ashmaw enters the clearing.",
    maxHp: 12,
    evasion: 5,
    pattern: ["cinder-burst", "bite"],
  },
  glasswing: {
    id: "glasswing",
    name: "Glasswing Moth",
    subtitle: "Veil stalker",
    description: "An elusive veil stalker with a punishing Dust Bite.",
    opening: "The Glasswing Moth drifts into the clearing.",
    maxHp: 12,
    evasion: 12,
    pattern: ["veil", "dust-bite"],
  },
  ...Object.fromEntries(gardenRoster.map((enemy) => [enemy.id, {
    id: enemy.id,
    name: enemy.name,
    subtitle: enemy.subtitle,
    description: `A tier ${gardenRoster.indexOf(enemy) + 1} Waking Garden trial. Learn its rhythm, then prepare for a stronger foe.`,
    opening: `${enemy.name} enters the garden clearing. Choose your action carefully.`,
    maxHp: enemy.maxHp,
    evasion: enemy.evasion,
    damageBonus: enemy.damageBonus,
    experienceReward: enemy.experienceReward,
    goldReward: enemy.goldReward,
    pattern: enemy.pattern,
  }])) as Record<Extract<EncounterId, `garden-${string}`>, EncounterDefinition>,
};

export const createEncounter = (id: EncounterId, zoneLevel = 1): Enemy => {
  const definition = encounters[id];
  return {
    id,
    name: definition.name,
    hp: definition.maxHp + Math.max(0, zoneLevel - 1) * 6,
    maxHp: definition.maxHp + Math.max(0, zoneLevel - 1) * 6,
    intent: definition.pattern[0],
    evasion: definition.evasion,
    magicDefense: Math.floor(definition.evasion * 0.65),
    zoneLevel,
  };
};

export const upgradeLabels: Record<UpgradeId, { name: string; description: string }> = {
  edgecraft: {
    name: "Edgecraft",
    description: "+1 physical damage. End fights sooner.",
  },
  bulwark: {
    name: "Bulwark",
    description: "+1 Guard. Brace absorbs more.",
  },
  veilsight: {
    name: "Veilsight",
    description: "+2 damage to Strikes against a veiled enemy.",
  },
};

export interface Milestone {
  id: string;
  name: string;
  encounterId: EncounterId;
  wins: number;
  reward: number;
}

export const milestones: Milestone[] = [
  { id: "cinder-breaker", name: "Cinder Breaker", encounterId: "ashmaw", wins: 3, reward: 6 },
  { id: "veil-piercer", name: "Veil Piercer", encounterId: "glasswing", wins: 3, reward: 6 },
];
