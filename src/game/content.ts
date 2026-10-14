import type { Enemy, Item, UpgradeId } from "./types";

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
  },
  {
    id: "emberlens",
    name: "Ember Lens",
    rarity: "common",
    power: 2,
    guard: 0,
    value: 10,
    description: "A sharp red lens that helps find an opening.",
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
};

export const createAshmaw = (): Enemy => ({
  name: "Ashmaw",
  hp: 12,
  maxHp: 12,
  intent: "cinder-burst",
});

export const upgradeLabels: Record<UpgradeId, { name: string; description: string }> = {
  edgecraft: {
    name: "Edgecraft",
    description: "+1 Power. End fights sooner.",
  },
  bulwark: {
    name: "Bulwark",
    description: "+1 Guard. Brace absorbs more.",
  },
};
