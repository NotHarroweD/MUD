import { materials } from "./content";
import type { MaterialId, MaterialStack, Rarity } from "./types";

export interface RarityWeight {
  rarity: Rarity;
  weight: number;
}

// Tuning table is intentionally centralized: weights are relative and normalize to 100.
export const materialRarityWeights: RarityWeight[] = [
  { rarity: "uncommon", weight: 70 },
  { rarity: "rare", weight: 25 },
  { rarity: "mythic", weight: 5 },
];

const idsByRarity: Record<Rarity, MaterialId[]> = {
  common: [],
  uncommon: ["verdant-resin"],
  rare: ["emberglass"],
  mythic: ["storm-thread"],
};

export const rollMaterialRarity = (roll = Math.random() * 100): Rarity => {
  let boundary = 0;
  for (const entry of materialRarityWeights) {
    boundary += entry.weight;
    if (roll < boundary) return entry.rarity;
  }
  return materialRarityWeights.at(-1)?.rarity ?? "uncommon";
};

export const chooseMaterial = (victoryCount: number, guaranteedRare = false): MaterialStack => {
  const rarity = guaranteedRare ? "rare" : rollMaterialRarity();
  const candidates = idsByRarity[rarity];
  const id = candidates[victoryCount % candidates.length] ?? "verdant-resin";
  return { id, name: materials[id].name, rarity, quantity: 1 };
};
