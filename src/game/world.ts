import type { EncounterId, GearSlot, PlayerLocation, TileType } from "./types";

export interface ZoneConnection {
  zoneId: string;
  x: number;
  y: number;
  name: string;
  requiredLevel?: number;
}

export interface WorldZone {
  id: string;
  name: string;
  type: string;
  level: number;
  width: number;
  height: number;
  encounters: EncounterId[];
  safe: boolean;
  tiles: Record<string, TileType>;
  connections: Record<string, ZoneConnection>;
}

export const tileKey = (x: number, y: number): string => `${x},${y}`;

const shopTiles = (x: number, y: number): Record<string, TileType> => ({
  [tileKey(x, y)]: "weapon-shop",
  [tileKey(x + 1, y)]: "armor-shop",
  [tileKey(x + 2, y)]: "charm-shop",
});

const fieldZone = (id: string, name: string, level: number, encounters: EncounterId[]): WorldZone => {
  const exit = id === "cinderwood-edge" ? { x: 1, y: 3 } : id === "glasswing-vale" ? { x: 5, y: 3 } : id === "emberfen" ? { x: 3, y: 1 } : { x: 3, y: 5 };
  return {
    id, name, type: "Hunting grounds", level, width: 7, height: 7, encounters, safe: false,
    tiles: { [tileKey(3, 3)]: "sanctuary", ...shopTiles(0, 6), [tileKey(exit.x, exit.y)]: "entrance", ...(id === "emberfen" ? { [tileKey(5, 5)]: "subzone" as const } : {}) },
    connections: {
      [tileKey(exit.x, exit.y)]: { zoneId: "wilderness", x: id === "cinderwood-edge" ? 6 : id === "glasswing-vale" ? 10 : id === "emberfen" ? 8 : 8, y: id === "cinderwood-edge" ? 4 : id === "glasswing-vale" ? 4 : id === "emberfen" ? 4 : 6, name: "Wilderness" },
      ...(id === "emberfen" ? { [tileKey(5, 5)]: { zoneId: "emberfen-underroot", x: 1, y: 3, name: "Emberfen Underroot", requiredLevel: 3 } } : {}),
    },
  };
};

export const zones: Record<string, WorldZone> = {
  "waking-garden": {
    id: "waking-garden", name: "Waking Garden", type: "Sanctuary garden", level: 1,
    width: 7, height: 5, encounters: ["garden-sproutling", "garden-dewling", "garden-petal-mite", "garden-thornbud", "garden-pollen-wisp", "garden-bramble-pup", "garden-glasscap-toad", "garden-rootbound-stag", "garden-duskwing-matriarch", "garden-warden"], safe: true,
    tiles: { [tileKey(1, 2)]: "sanctuary", [tileKey(1, 1)]: "bank", ...shopTiles(2, 1), [tileKey(5, 2)]: "entrance" },
    connections: { [tileKey(5, 2)]: { zoneId: "wilderness", x: 8, y: 5, name: "Wilderness", requiredLevel: 50 } },
  },
  wilderness: {
    id: "wilderness", name: "The Wilderness", type: "Frontier hub", level: 1,
    width: 17, height: 11, encounters: [], safe: true,
    tiles: {
      [tileKey(8, 5)]: "sanctuary", ...shopTiles(5, 6),
      [tileKey(2, 4)]: "entrance", [tileKey(6, 4)]: "entrance", [tileKey(10, 4)]: "entrance", [tileKey(8, 1)]: "entrance", [tileKey(8, 9)]: "entrance",
    },
    connections: {
      [tileKey(2, 4)]: { zoneId: "waking-garden", x: 5, y: 2, name: "Waking Garden" },
      [tileKey(6, 4)]: { zoneId: "cinderwood-edge", x: 1, y: 3, name: "Cinderwood Edge" },
      [tileKey(10, 4)]: { zoneId: "glasswing-vale", x: 5, y: 3, name: "Glasswing Vale", requiredLevel: 2 },
      [tileKey(8, 1)]: { zoneId: "emberfen", x: 3, y: 1, name: "Emberfen", requiredLevel: 3 },
      [tileKey(8, 9)]: { zoneId: "frostbreak-rise", x: 3, y: 5, name: "Frostbreak Rise", requiredLevel: 4 },
    },
  },
  "cinderwood-edge": fieldZone("cinderwood-edge", "Cinderwood Edge", 1, ["ashmaw"]),
  "glasswing-vale": fieldZone("glasswing-vale", "Glasswing Vale", 2, ["glasswing"]),
  emberfen: fieldZone("emberfen", "Emberfen", 3, ["ashmaw", "glasswing"]),
  "frostbreak-rise": fieldZone("frostbreak-rise", "Frostbreak Rise", 4, ["ashmaw", "glasswing"]),
  "emberfen-underroot": {
    id: "emberfen-underroot", name: "Emberfen Underroot", type: "Sub-zone · volcanic caverns", level: 5,
    width: 5, height: 5, encounters: ["ashmaw", "glasswing"], safe: false,
    tiles: { [tileKey(1, 3)]: "entrance", [tileKey(3, 2)]: "sanctuary", ...shopTiles(1, 0) },
    connections: { [tileKey(1, 3)]: { zoneId: "emberfen", x: 5, y: 5, name: "Emberfen", requiredLevel: 3 } },
  },
};

export const zoneOf = (location: PlayerLocation): WorldZone => zones[location.zoneId] ?? zones["waking-garden"];
export const tileTypeAt = (zone: WorldZone, x: number, y: number): TileType => zone.tiles[tileKey(x, y)] ?? "standard";
export const isAdjacent = (a: PlayerLocation, x: number, y: number): boolean =>
  Math.max(Math.abs(a.x - x), Math.abs(a.y - y)) === 1;

export const slotAtShopTile = (tile: TileType): GearSlot | undefined =>
  tile === "weapon-shop" ? "weapon" : tile === "armor-shop" ? "armor" : tile === "charm-shop" ? "charm" : undefined;
