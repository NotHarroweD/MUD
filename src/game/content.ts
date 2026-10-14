import type { Enemy, EncounterId, Intent, Item, UpgradeId } from "./types";

export const starterItem: Item = {
  id: "cinderhook",
  name: "Cinderhook Knife",
  rarity: "common",
  power: 1,
  guard: 0,
  value: 4,
  description: "A practical blade, warm from the forge.",
};

export const lootTable: Item[] = [
  {
    id: "ashband",
    name: "Glowing Ashband",
    rarity: "common",
    power: 0,
    guard: 2,
    value: 9,
    description: "A heat-hardened band that steadies your stance.",
    trait: {
      id: "steady-hand",
      name: "Steady Hand",
      text: "A successful Brace also restores 1 health.",
    },
  },
  {
    id: "emberlens",
    name: "Ember Lens",
    rarity: "common",
    power: 2,
    guard: -1,
    value: 10,
    description: "A sharp red lens that helps find an opening, at the cost of your guard.",
    trait: {
      id: "veil-keen",
      name: "Veil Keen",
      text: "+2 damage to Strikes against a veiled enemy.",
    },
  },
];

export const rareLoot: Item = {
  id: "stormglass-fang",
  name: "Stormglass Fang",
  rarity: "rare",
  power: 3,
  guard: 1,
  value: 85,
  description: "A violet relic that hums with trapped lightning. Sought by collectors.",
  trait: {
    id: "stormcharge",
    name: "Stormcharge",
    text: "The first Strike of each hunt deals +2 damage.",
  },
};

export const collectionItems: Item[] = [starterItem, ...lootTable, rareLoot];

export interface EncounterDefinition {
  id: EncounterId;
  name: string;
  subtitle: string;
  description: string;
  opening: string;
  maxHp: number;
  pattern: Intent[];
}

export const encounters: Record<EncounterId, EncounterDefinition> = {
  ashmaw: {
    id: "ashmaw",
    name: "Ashmaw",
    subtitle: "Cinder brute",
    description: "Telegraphs a heavy Cinder Burst, then bites. Brace the burst to keep your health.",
    opening: "The Cinderwood Hunt begins. Ashmaw is gathering a Cinder Burst.",
    maxHp: 12,
    pattern: ["cinder-burst", "bite"],
  },
  glasswing: {
    id: "glasswing",
    name: "Glasswing Moth",
    subtitle: "Veil stalker",
    description: "Veils itself so Strikes only scratch, then Dust Bites hard. Strike the veil or Focus and wait.",
    opening: "The Glasswing Moth drifts into its veil. Strikes will only scratch it.",
    maxHp: 12,
    pattern: ["veil", "dust-bite"],
  },
};

export const createEncounter = (id: EncounterId): Enemy => {
  const definition = encounters[id];
  return {
    id,
    name: definition.name,
    hp: definition.maxHp,
    maxHp: definition.maxHp,
    intent: definition.pattern[0],
  };
};

export const upgradeLabels: Record<UpgradeId, { name: string; description: string }> = {
  edgecraft: {
    name: "Edgecraft",
    description: "+1 Power. End fights sooner.",
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
