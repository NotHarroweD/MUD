import { lootTable, rareLoot } from "./content";
import type { Item } from "./types";

export const chooseLoot = (guaranteedRare: boolean, victoryCount: number): Item => {
  if (guaranteedRare) {
    return rareLoot;
  }

  return lootTable[victoryCount % lootTable.length];
};
