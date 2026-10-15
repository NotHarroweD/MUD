import { zoneOf } from "./world";
import type { GearSlot, Item } from "./types";

export const shopStockFor = (zoneId: string, slot: GearSlot): Item[] => {
  const zone = zoneOf({ zoneId, x: 0, y: 0 });
  const tier = zone.level;
  const rarity = tier >= 4 ? "rare" : "common";
  const tierName = ["Wayfarer", "Briar", "Cinder", "Moonsteel", "Dawnforged"][Math.min(tier - 1, 4)];
  const make = (variant: string, stats: Partial<Item>, index: number): Item => ({
    id: `stock:${zone.id}:${slot}:${variant}`,
    name: `${tierName} ${variant}`,
    slot,
    rarity,
    power: 0,
    guard: 0,
    maxHealth: 0,
    criticalChance: 0,
    evasion: 0,
    focus: 0,
    value: zone.id === "waking-garden" ? 12 + index * 10 : (10 + tier * 8) + index * (5 + tier * 2),
    description: `Tier ${tier} ${slot} gear stocked for the ${zone.name} market.`,
    enhancementCapacity: 5,
    enhancements: [],
    ...stats,
  });

  if (slot === "weapon") {
    return [
      make("Trailblade", { power: zone.id === "waking-garden" ? 2 : 1 + Math.floor((tier - 1) / 2), criticalChance: Math.floor(tier / 2) }, 0),
      make("Keen Pike", { power: 1 + Math.floor((tier - 1) / 3), attributes: { dexterity: Math.max(1, Math.floor((2 + tier * 2) / 3)) } }, 1),
    ];
  }
  if (slot === "armor") {
    return [
      make("Bastion Coat", { guard: 1 + Math.floor(tier / 2), maxHealth: zone.id === "waking-garden" ? 4 : 2 + tier * 2, attributes: { vitality: Math.floor(tier / 3) } }, 0),
      make("Quickstep Mantle", { guard: Math.floor(tier / 2), maxHealth: tier, evasion: 2 + tier, attributes: { dexterity: Math.floor(tier / 3) } }, 1),
    ];
  }
  return [
    make("Wellspring Charm", { focus: 1 + Math.floor(tier / 2), maxHealth: tier * 2, attributes: { intelligence: 1 + Math.floor(tier / 3), wisdom: 1 + Math.floor(tier / 3) } }, 0),
    make("Keeneye Locket", { criticalChance: 1 + tier, evasion: tier, attributes: { wisdom: Math.floor(tier / 3), dexterity: Math.max(1, Math.floor((2 + tier * 2) / 3)) } }, 1),
  ];
};
