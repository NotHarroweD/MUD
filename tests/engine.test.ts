import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { enhancements, lootTable } from "../src/game/content";
import { criticalChanceOf, effectiveAttributesOf, guardOf, hitChanceAgainst, powerOf, createInitialState, reduceGame } from "../src/game/engine";
import { zones, tileTypeAt } from "../src/game/world";
import { availableEncountersFor } from "../src/game/engine";
import { shopStockFor } from "../src/game/shops";
import { rollMaterialRarity } from "../src/game/loot";
import type { GameState } from "../src/game/types";

beforeEach(() => {
  vi.spyOn(Math, "random").mockReturnValue(0.5);
});

afterEach(() => {
  vi.restoreAllMocks();
});

const huntingGround = (state: GameState = createInitialState(), zoneId: "cinderwood-edge" | "glasswing-vale" = "cinderwood-edge"): GameState => ({
  ...state,
  location: { zoneId, x: 2, y: 3 },
  encounterId: zoneId === "glasswing-vale" ? "glasswing" as const : "ashmaw" as const,
});

const winHunt = (state = huntingGround()) => {
  let next = reduceGame(state, { type: "start" });
  next = reduceGame(next, { type: "strike" });
  next = reduceGame(next, { type: "strike" });
  return reduceGame(next, { type: "strike" });
};

describe("Cinderwood Hunt rules", () => {
  it("spawns in the Waking Garden and walks through the Wilderness to Cinderwood", () => {
    let state = createInitialState();
    expect(state.location).toEqual({ zoneId: "waking-garden", x: 1, y: 2 });
    state = reduceGame(state, { type: "move-to", x: 2, y: 2 });
    state = reduceGame(state, { type: "move-to", x: 3, y: 2 });
    state = reduceGame(state, { type: "move-to", x: 4, y: 2 });
    state = reduceGame(state, { type: "move-to", x: 5, y: 2 });
    state = reduceGame(state, { type: "enter-zone" });
    expect(state.location.zoneId).toBe("waking-garden");
    state = { ...state, player: { ...state.player, level: 50 } };
    state = reduceGame(state, { type: "enter-zone" });
    expect(state.location.zoneId).toBe("wilderness");
    state = reduceGame(state, { type: "move-to", x: 7, y: 5 });
    state = reduceGame(state, { type: "move-to", x: 6, y: 5 });
    state = reduceGame(state, { type: "move-to", x: 6, y: 4 });
    state = reduceGame(state, { type: "enter-zone" });
    expect(state.location.zoneId).toBe("cinderwood-edge");
    expect(state.enemy.zoneLevel).toBe(1);
    expect(reduceGame(state, { type: "start" }).phase).toBe("active");
  });

  it("marks shops and sanctuary tiles and returns a defeated player to sanctuary", () => {
    for (const zone of Object.values(zones).filter((candidate) => candidate.encounters.length > 0)) {
      expect(Object.values(zone.tiles)).toContain("sanctuary");
      expect(Object.values(zone.tiles)).toContain("weapon-shop");
      expect(Object.values(zone.tiles)).toContain("armor-shop");
      expect(Object.values(zone.tiles)).toContain("charm-shop");
    }
    expect(tileTypeAt(zones["waking-garden"], 1, 2)).toBe("sanctuary");
    let state = reduceGame(huntingGround(), { type: "start" });
    state = { ...state, player: { ...state.player, hp: 1 } };
    state = reduceGame(state, { type: "focus" });
    expect(state.phase).toBe("defeat");
    expect(state.location).toEqual({ zoneId: "cinderwood-edge", x: 3, y: 3 });
    state = reduceGame(state, { type: "rest" });
    expect(state.phase).toBe("idle");
    expect(state.player.hp).toBe(state.player.maxHp);
  });

  it("gates sub-zones by level and scales shop stock by zone", () => {
    let state = { ...createInitialState(), location: { zoneId: "emberfen", x: 5, y: 5 } };
    state = reduceGame(state, { type: "enter-zone" });
    expect(state.location.zoneId).toBe("emberfen");
    state = { ...state, player: { ...state.player, level: 3 } };
    state = reduceGame(state, { type: "enter-zone" });
    expect(state.location.zoneId).toBe("emberfen-underroot");
  });

  it("unlocks ten Waking Garden trials in order, with level and gold rewards", () => {
    let state = createInitialState();
    expect(zones["waking-garden"].encounters).toHaveLength(10);
    expect(availableEncountersFor(state)).toEqual(["garden-sproutling"]);
    state = reduceGame(state, { type: "start" });
    while (state.phase === "active") state = reduceGame(state, { type: "strike" });
    expect(state.phase).toBe("victory");
    expect(state.player.experience).toBe(10);
    expect(state.player.gold).toBe(12);
    expect(availableEncountersFor(state)).toEqual(["garden-sproutling", "garden-dewling"]);
  });

  it("lets players afford Garden shop gear from early trial rewards", () => {
    const stock = shopStockFor("waking-garden", "weapon");
    expect(stock[0].value).toBeLessThanOrEqual(12);
    const state = { ...createInitialState(), location: { zoneId: "waking-garden", x: 2, y: 1 }, player: { ...createInitialState().player, gold: 12 } };
    const bought = reduceGame(state, { type: "buy-item", itemId: stock[0].id });
    expect(bought.player.gold).toBe(0);
    expect(bought.player.inventory.some((item) => item.name === stock[0].name)).toBe(true);
  });

  it("banks gold and applies carried-gold and XP losses on death", () => {
    let state = { ...createInitialState(), location: { zoneId: "waking-garden", x: 1, y: 1 }, player: { ...createInitialState().player, gold: 12 } };
    state = reduceGame(state, { type: "bank-deposit" });
    expect(state.player).toMatchObject({ gold: 0, bankedGold: 12 });

    state = {
      ...state,
      player: { ...state.player, gold: 31, experience: 13, level: 2, hp: 1 },
      encounterId: "garden-warden",
      enemy: { ...state.enemy, id: "garden-warden", name: "Warden of the Garden", intent: "cinder-burst" },
      phase: "active",
    };
    state = reduceGame(state, { type: "focus" });
    expect(state.phase).toBe("defeat");
    expect(state.player).toMatchObject({ gold: 0, bankedGold: 12, experience: 12 });
  });

  it("reduces a telegraphed burst when the player braces", () => {
    let state = reduceGame(huntingGround(), { type: "start" });
    state = reduceGame(state, { type: "brace" });

    expect(state.player.hp).toBe(10);
    expect(state.enemy.intent).toBe("bite");
    expect(state.braced).toBe(false);
  });

  it("reaches victory with understandable rewards after three strikes", () => {
    const state = winHunt();

    expect(state.phase).toBe("victory");
    expect(state.player.gold).toBe(12);
    expect(state.player.level).toBe(2);
    expect(state.lastRewards?.material?.rarity).toBe("uncommon");
  });

  it("makes a rare material deterministic through the playtest toggle", () => {
    let state = reduceGame(huntingGround(), { type: "toggle-guaranteed-rare" });
    state = winHunt(state);

    expect(state.lastRewards?.material?.id).toBe("emberglass");
    expect(state.lastRewards?.material?.rarity).toBe("rare");
  });

  it("communicates defeat after low-tempo recovery turns and permits a fresh hunt", () => {
    let state = reduceGame(huntingGround(), { type: "start" });
    for (let index = 0; index < 20 && state.phase === "active"; index += 1) {
      state = reduceGame(state, { type: "focus" });
    }

    expect(state.phase).toBe("defeat");
    state = reduceGame(state, { type: "start" });
    expect(state.phase).toBe("active");
    expect(state.player.hp).toBe(state.player.maxHp);
  });

  it("keeps gear shop-based and applies a level-two specialization", () => {
    let state = winHunt();
    expect(state.player.inventory).toHaveLength(1);
    state = reduceGame(state, { type: "upgrade", upgradeId: "edgecraft" });
    expect(state.player.gold).toBe(4);
    expect(powerOf(state.player)).toBe(5);
  });
});


describe("Encounter variety", () => {
  const startEncounter = (encounterId: "ashmaw" | "glasswing") => {
    const zoneId = encounterId === "glasswing" ? "glasswing-vale" : "cinderwood-edge";
    let state = reduceGame(huntingGround(createInitialState(), zoneId), { type: "select-encounter", encounterId });
    state = reduceGame(state, { type: "start" });
    return state;
  };

  it("lets the player choose an encounter only between hunts", () => {
    const selected = reduceGame(huntingGround(createInitialState(), "glasswing-vale"), { type: "select-encounter", encounterId: "glasswing" });
    expect(selected.encounterId).toBe("glasswing");
    expect(selected.enemy.id).toBe("glasswing");
    expect(selected.enemy.name).toBe("Glasswing Moth");

    const active = reduceGame(selected, { type: "start" });
    const blocked = reduceGame(active, { type: "select-encounter", encounterId: "ashmaw" });
    expect(blocked.encounterId).toBe("glasswing");
    expect(blocked.phase).toBe("active");
  });

  it("makes strikes against a veiled Glasswing Moth scratch for 1 damage", () => {
    const state = startEncounter("glasswing");
    expect(state.enemy.intent).toBe("veil");

    const next = reduceGame(state, { type: "strike" });
    expect(next.enemy.hp).toBe(next.enemy.maxHp - 1);
    expect(next.player.hp).toBe(14);
    expect(next.enemy.intent).toBe("dust-bite");
  });

  it("lets Brace reduce the Dust Bite that follows the veil by guard", () => {
    let state = startEncounter("glasswing");
    state = reduceGame(state, { type: "focus" });
    expect(state.enemy.intent).toBe("dust-bite");

    state = reduceGame(state, { type: "brace" });
    expect(state.player.hp).toBe(14 - (4 - 1));
    expect(state.enemy.intent).toBe("veil");
  });

  it("lets an unbraced Dust Bite land for its full damage", () => {
    let state = startEncounter("glasswing");
    state = reduceGame(state, { type: "focus" });
    expect(state.enemy.intent).toBe("dust-bite");

    state = reduceGame(state, { type: "strike" });
    expect(state.enemy.hp).toBe(state.enemy.maxHp - 4);
    expect(state.player.hp).toBe(14 - 4);
  });

  it("allows a strike-only win against the Glasswing Moth", () => {
    let state = startEncounter("glasswing");
    for (let index = 0; index < 10 && state.phase === "active"; index += 1) {
      state = reduceGame(state, { type: "strike" });
    }

    expect(state.phase).toBe("victory");
    expect(state.player.hp).toBeGreaterThan(0);
  });

  it("keeps Ashmaw's cinder and bite cycle after encounter selection", () => {
    let state = startEncounter("ashmaw");
    expect(state.enemy.intent).toBe("cinder-burst");

    state = reduceGame(state, { type: "strike" });
    expect(state.enemy.intent).toBe("bite");

    state = reduceGame(state, { type: "strike" });
    expect(state.enemy.intent).toBe("cinder-burst");
  });
});


describe("Crafting progression", () => {
  it("crafts an enhancement onto shop gear and enforces capacity and materials", () => {
    const stock = shopStockFor("waking-garden", "weapon")[0];
    let state: GameState = { ...createInitialState(), location: { zoneId: "waking-garden", x: 2, y: 1 }, player: { ...createInitialState().player, gold: 50, materials: { "verdant-resin": 2 } } };
    state = reduceGame(state, { type: "buy-item", itemId: stock.id });
    const weapon = state.player.inventory.find((item) => item.name === stock.name)!;
    state = reduceGame(state, { type: "equip", itemId: weapon.id });
    const basePower = powerOf(state.player);
    state = reduceGame(state, { type: "craft-enhancement", itemId: weapon.id, enhancementId: "keen-edge" });
    const enhanced = state.player.inventory.find((item) => item.id === weapon.id)!;
    expect(enhanced.enhancements).toEqual(["keen-edge"]);
    expect(state.player.materials["verdant-resin"]).toBe(1);
    expect(state.player.craftingExperience).toBe(5);
    expect(powerOf(state.player)).toBe(basePower + 1);
    expect(enhancements["keen-edge"].bonus.power).toBe(1);
  });

  it("uses the configured rarity probability bands", () => {
    expect(rollMaterialRarity(0)).toBe("uncommon");
    expect(rollMaterialRarity(69.99)).toBe("uncommon");
    expect(rollMaterialRarity(70)).toBe("rare");
    expect(rollMaterialRarity(94.99)).toBe("rare");
    expect(rollMaterialRarity(95)).toBe("mythic");
    expect(rollMaterialRarity(99.99)).toBe("mythic");
  });

  it("does not reward complete equipment from enemy victories", () => {
    const state = winHunt();
    expect(state.player.inventory).toHaveLength(1);
    expect(Object.values(state.player.materials).reduce((sum, amount) => sum + (amount ?? 0), 0)).toBe(1);
  });
});


describe("Specialization objectives", () => {
  const strikeUntilOver = (state: ReturnType<typeof createInitialState>) => {
    let next = state;
    for (let index = 0; index < 20 && next.phase === "active"; index += 1) {
      next = reduceGame(next, { type: "strike" });
    }
    return next;
  };

  it("awards Cinder Breaker and gold on the third Ashmaw victory, not before", () => {
    let state = winHunt();
    state = winHunt(state);
    expect(state.titles).not.toContain("cinder-breaker");

    state = winHunt(state);
    expect(state.titles).toContain("cinder-breaker");
    expect(state.encounterWins.ashmaw).toBe(3);
    expect(state.player.gold).toBe(36 + 6);
  });

  it("counts Glasswing wins separately and awards Veil Piercer once", () => {
    let state = reduceGame(huntingGround(createInitialState(), "glasswing-vale"), { type: "select-encounter", encounterId: "glasswing" });
    for (let round = 0; round < 3; round += 1) {
      state = strikeUntilOver(reduceGame(state, { type: "start" }));
    }

    expect(state.encounterWins).toMatchObject({ ashmaw: 0, glasswing: 3 });
    expect(state.titles.filter((title) => title === "veil-piercer")).toHaveLength(1);
    expect(state.titles).not.toContain("cinder-breaker");
  });

  it("makes Veilsight add damage to veil strikes after purchase", () => {
    let state = winHunt();
    state = reduceGame(state, { type: "upgrade", upgradeId: "veilsight" });
    expect(state.player.upgrades).toContain("veilsight");

    state = reduceGame(huntingGround(state, "glasswing-vale"), { type: "select-encounter", encounterId: "glasswing" });
    state = reduceGame(state, { type: "start" });
    expect(state.enemy.intent).toBe("veil");

    state = reduceGame(state, { type: "strike" });
    expect(state.enemy.hp).toBe(state.enemy.maxHp - 3);
  });
});


const withEquipped = (item: (typeof lootTable)[number], state = huntingGround()) => ({
  ...state,
  player: { ...state.player, inventory: [...state.player.inventory, item], equipment: { ...state.player.equipment, [item.slot]: item.id } },
});

describe("Enhancements and hit calculation", () => {

  it("applies Veil Keen to strikes against a veiled enemy", () => {
    const emberLens = lootTable[1];
    let state = withEquipped(emberLens);
    state = reduceGame(huntingGround(state, "glasswing-vale"), { type: "select-encounter", encounterId: "glasswing" });
    state = reduceGame(state, { type: "start" });
    expect(state.enemy.intent).toBe("veil");

    state = reduceGame(state, { type: "strike" });
    expect(state.enemy.hp).toBe(state.enemy.maxHp - (1 + 2));
  });

  it("gives Ember Lens Dexterity and critical chance instead of raw power", () => {
    const state = withEquipped(lootTable[1]);
    expect(guardOf(state.player)).toBe(1);
    expect(powerOf(state.player)).toBe(4);
    expect(effectiveAttributesOf(state.player).dexterity).toBe(3);
    expect(criticalChanceOf(state.player)).toBe(7);
    expect(state.player.equipment.charm).toBe(lootTable[1].id);
  });

  it("calculates hit chance from Dexterity against each enemy's Evasion", () => {
    const player = createInitialState().player;
    const enemy = createInitialState().enemy;
    expect(hitChanceAgainst(player, { ...enemy, evasion: 0 })).toBe(80);
    expect(hitChanceAgainst(player, { ...enemy, evasion: 20 })).toBe(60);
    expect(hitChanceAgainst(player, { ...enemy, evasion: 0 }, true)).toBe(70);
    expect(hitChanceAgainst({ ...player, attributes: { ...player.attributes, dexterity: 4 } }, { ...enemy, evasion: 20 })).toBe(66);
    expect(hitChanceAgainst(player, { ...enemy, evasion: 100 })).toBe(10);
  });

  it("restores health when Steady Hand users Brace", () => {
    let state = withEquipped(lootTable[0]);
    state = reduceGame(state, { type: "start" });
    state = { ...state, player: { ...state.player, hp: 10 } };

    state = reduceGame(state, { type: "brace" });

    expect(state.player.hp).toBe(10 + 1 - (5 - guardOf(withEquipped(lootTable[0]).player)));
  });

});


describe("Battle feedback", () => {
  it("emits a damage event for the player's strike with the amount dealt", () => {
    let state = reduceGame(huntingGround(), { type: "start" });
    state = reduceGame(state, { type: "strike" });

    const strike = state.events.find((event) => event.target === "enemy");
    expect(strike).toMatchObject({ kind: "damage", amount: powerOf(state.player) });
  });

  it("reports blocked damage separately when Brace reduces an incoming hit", () => {
    let state = reduceGame(huntingGround(), { type: "start" });
    state = reduceGame(state, { type: "brace" });

    const block = state.events.find((event) => event.kind === "block");
    const damage = state.events.find((event) => event.kind === "damage" && event.target === "player");
    expect(block?.amount).toBe(1);
    expect(damage?.amount).toBe(4);
  });

  it("gives every event a unique, increasing sequence number", () => {
    let state = reduceGame(huntingGround(), { type: "start" });
    state = reduceGame(state, { type: "strike" });
    state = reduceGame(state, { type: "focus" });

    const seqs = state.events.map((event) => event.seq);
    expect(new Set(seqs).size).toBe(seqs.length);
    expect(seqs).toEqual([...seqs].sort((a, b) => a - b));
    expect(state.eventSeq).toBe(Math.max(...seqs));
  });

  it("clears the previous action's events when the next action begins", () => {
    let state = reduceGame(huntingGround(), { type: "start" });
    state = reduceGame(state, { type: "strike" });
    const firstSeq = state.eventSeq;

    state = reduceGame(state, { type: "focus" });
    expect(state.events.every((event) => event.seq > firstSeq)).toBe(true);
  });
});

describe("Combat variance", () => {
  it("varies strike damage within one point of the calculated power", () => {
    const lowRoll = vi.spyOn(Math, "random").mockReturnValueOnce(0.5).mockReturnValueOnce(0.99).mockReturnValue(0.01);
    const lowState = reduceGame(reduceGame(huntingGround(), { type: "start" }), { type: "strike" });
    const lowDamage = lowState.events.find((event) => event.target === "enemy")?.amount;
    lowRoll.mockReset().mockReturnValueOnce(0.5).mockReturnValueOnce(0.99).mockReturnValue(0.99);
    const highState = reduceGame(reduceGame(huntingGround(), { type: "start" }), { type: "strike" });
    const highDamage = highState.events.find((event) => event.target === "enemy")?.amount;
    expect(lowDamage).toBe(powerOf(lowState.player) - 1);
    expect(highDamage).toBe(powerOf(highState.player) + 1);
  });

  it("can miss and critically hit using the hit chance and critical rolls", () => {
    const roll = vi.spyOn(Math, "random").mockReturnValue(0.99);
    let state = reduceGame(reduceGame(huntingGround(), { type: "start" }), { type: "strike" });
    expect(state.events.some((event) => event.kind === "miss")).toBe(true);

    roll.mockReset().mockReturnValueOnce(0.5).mockReturnValueOnce(0.01).mockReturnValue(0.5);
    state = reduceGame(reduceGame(huntingGround(), { type: "start" }), { type: "strike" });
    expect(state.events.find((event) => event.target === "enemy")).toMatchObject({ kind: "damage", amount: 6, critical: true });
  });

  it("lets Dexterity evade an incoming attack", () => {
    vi.spyOn(Math, "random").mockReturnValueOnce(0.5).mockReturnValueOnce(0.99).mockReturnValueOnce(0.5).mockReturnValueOnce(0.01);
    const state = reduceGame(reduceGame(huntingGround(), { type: "start" }), { type: "strike" });
    expect(state.events.some((event) => event.kind === "evade")).toBe(true);
    expect(state.player.hp).toBe(state.player.maxHp);
  });
});

describe("Attributes, levels, and equipment slots", () => {
  it("awards two spendable points per level and lets the player raise Strength", () => {
    let state = winHunt();
    expect(state.player.unspentAttributePoints).toBe(2);
    const unchanged = reduceGame(state, { type: "dismiss-reward" });
    expect(unchanged.phase).toBe("victory");
    state = reduceGame(state, { type: "raise-attribute", attribute: "strength" });
    state = reduceGame(state, { type: "raise-attribute", attribute: "strength" });
    expect(state.player.attributes.strength).toBe(4);
    expect(state.player.unspentAttributePoints).toBe(0);
    expect(powerOf(state.player)).toBe(5);
    state = reduceGame(state, { type: "dismiss-reward" });
    expect(state.phase).toBe("idle");
  });

  it("requires more experience for later levels", () => {
    let state = winHunt();
    state = winHunt(state);
    expect(state.player.level).toBe(2);
    expect(state.player.experience).toBe(20);
    state = winHunt(state);
    expect(state.player.level).toBe(3);
    expect(state.player.unspentAttributePoints).toBe(4);
    state = reduceGame(state, { type: "raise-attribute", attribute: "dexterity" });
    expect(state.player.attributes.dexterity).toBe(4);
    expect(state.player.unspentAttributePoints).toBe(2);
    state = reduceGame(state, { type: "raise-attribute", attribute: "vitality" });
    expect(state.player.attributes.vitality).toBe(4);
    expect(state.player.unspentAttributePoints).toBe(0);
  });

  it("equips armor without replacing the weapon and applies its health and guard bonuses", () => {
    const baseState = createInitialState();
    const armor = shopStockFor("waking-garden", "armor")[0];
    const [x, y] = Object.entries(zones["waking-garden"].tiles).find(([, type]) => type === "armor-shop")![0].split(",").map(Number);
    let state: GameState = { ...baseState, location: { zoneId: "waking-garden", x, y }, player: { ...baseState.player, gold: 50 } };
    state = reduceGame(state, { type: "buy-item", itemId: armor.id });
    const ownedArmor = state.player.inventory.find((item) => item.slot === "armor");
    if (!ownedArmor) throw new Error("Expected purchased armor");
    const weaponId = state.player.equipment.weapon;
    state = reduceGame(state, { type: "equip", itemId: ownedArmor.id });
    expect(state.player.equipment.weapon).toBe(weaponId);
    expect(state.player.equipment.armor).toBe(ownedArmor.id);
    expect(ownedArmor.enhancementCapacity).toBe(5);
  });
});

describe("Victory rewards", () => {
  it("summarizes experience, gold, and the drop for display", () => {
    const state = winHunt();
    expect(state.lastRewards).toMatchObject({
      experience: 10,
      baseGold: 12,
      leveledTo: 2,
    });
    expect(state.lastRewards?.material?.quantity).toBe(1);
    expect(state.player.inventory).toHaveLength(1);
  });

  it("awards crafting experience and stacks material rewards", () => {
    let state = winHunt();
    state = winHunt(state);
    expect(state.player.craftingExperience).toBe(20);
    expect(state.player.materials["verdant-resin"]).toBe(2);
  });

  it("lists the milestone reward when it is earned", () => {
    let state = winHunt();
    state = winHunt(state);
    state = winHunt(state);

    expect(state.lastRewards?.milestones).toEqual([{ name: "Cinder Breaker", gold: 6 }]);
  });

  it("clears the reward summary when a new hunt starts", () => {
    let state = winHunt();
    state = reduceGame(state, { type: "start" });
    expect(state.lastRewards).toBeUndefined();
  });
});
