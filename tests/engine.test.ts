import { describe, expect, it } from "vitest";
import { lootTable, rareLoot } from "../src/game/content";
import { guardOf, powerOf, createInitialState, reduceGame } from "../src/game/engine";

const winHunt = (state = createInitialState()) => {
  let next = reduceGame(state, { type: "start" });
  next = reduceGame(next, { type: "strike" });
  next = reduceGame(next, { type: "strike" });
  return reduceGame(next, { type: "strike" });
};

describe("Cinderwood Hunt rules", () => {
  it("reduces a telegraphed burst when the player braces", () => {
    let state = reduceGame(createInitialState(), { type: "start" });
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
    expect(state.lastReward?.rarity).toBe("common");
  });

  it("makes rare loot deterministic through the playtest toggle", () => {
    let state = reduceGame(createInitialState(), { type: "toggle-guaranteed-rare" });
    state = winHunt(state);

    expect(state.lastReward?.name).toBe("Stormglass Fang");
    expect(state.lastReward?.rarity).toBe("rare");
  });

  it("communicates defeat after low-tempo recovery turns and permits a fresh hunt", () => {
    let state = reduceGame(createInitialState(), { type: "start" });
    for (let index = 0; index < 20 && state.phase === "active"; index += 1) {
      state = reduceGame(state, { type: "focus" });
    }

    expect(state.phase).toBe("defeat");
    state = reduceGame(state, { type: "start" });
    expect(state.phase).toBe("active");
    expect(state.player.hp).toBe(state.player.maxHp);
  });

  it("equips loot and applies a level-two specialization", () => {
    let state = winHunt();
    const item = state.lastReward;
    if (!item) throw new Error("Expected a hunt reward");

    state = reduceGame(state, { type: "equip", itemId: item.id });
    state = reduceGame(state, { type: "upgrade", upgradeId: "edgecraft" });

    expect(state.player.equippedId).toBe(item.id);
    expect(state.player.gold).toBe(4);
    expect(powerOf(state.player)).toBe(4);
    expect(guardOf(state.player)).toBe(3);
  });
});


describe("Encounter variety", () => {
  const startEncounter = (encounterId: "ashmaw" | "glasswing") => {
    let state = reduceGame(createInitialState(), { type: "select-encounter", encounterId });
    state = reduceGame(state, { type: "start" });
    return state;
  };

  it("lets the player choose an encounter only between hunts", () => {
    const selected = reduceGame(createInitialState(), { type: "select-encounter", encounterId: "glasswing" });
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
    expect(next.enemy.hp).toBe(11);
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
    expect(state.enemy.hp).toBe(12 - 4);
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


describe("Selling and collection", () => {
  it("sells an unequipped relic for its value", () => {
    let state = winHunt();
    const reward = state.lastReward;
    if (!reward) throw new Error("Expected a hunt reward");
    const goldBefore = state.player.gold;

    state = reduceGame(state, { type: "sell", itemId: reward.id });

    expect(state.player.inventory.some((item) => item.id === reward.id)).toBe(false);
    expect(state.player.gold).toBe(goldBefore + reward.value);
  });

  it("refuses to sell the equipped relic", () => {
    let state = winHunt();
    const reward = state.lastReward;
    if (!reward) throw new Error("Expected a hunt reward");
    state = reduceGame(state, { type: "equip", itemId: reward.id });
    const before = state;

    state = reduceGame(state, { type: "sell", itemId: reward.id });

    expect(state.player.inventory.some((item) => item.id === reward.id)).toBe(true);
    expect(state.player.gold).toBe(before.player.gold);
  });

  it("refuses to sell during an active fight", () => {
    let state = winHunt();
    const reward = state.lastReward;
    if (!reward) throw new Error("Expected a hunt reward");
    state = reduceGame(state, { type: "start" });

    const after = reduceGame(state, { type: "sell", itemId: reward.id });

    expect(after.player.inventory.some((item) => item.id === reward.id)).toBe(true);
  });

  it("keeps discovered items in the collection after they are sold", () => {
    let state = winHunt();
    const reward = state.lastReward;
    if (!reward) throw new Error("Expected a hunt reward");
    expect(state.discovered).toContain(reward.id);

    state = reduceGame(state, { type: "sell", itemId: reward.id });

    expect(state.discovered).toContain(reward.id);
    expect(state.discovered.filter((id) => id === reward.id)).toHaveLength(1);
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
    expect(state.player.gold).toBe(36 + 6 + 4);
  });

  it("counts Glasswing wins separately and awards Veil Piercer once", () => {
    let state = reduceGame(createInitialState(), { type: "select-encounter", encounterId: "glasswing" });
    for (let round = 0; round < 3; round += 1) {
      state = strikeUntilOver(reduceGame(state, { type: "start" }));
    }

    expect(state.encounterWins).toEqual({ ashmaw: 0, glasswing: 3 });
    expect(state.titles.filter((title) => title === "veil-piercer")).toHaveLength(1);
    expect(state.titles).not.toContain("cinder-breaker");
  });

  it("makes Veilsight add damage to veil strikes after purchase", () => {
    let state = winHunt();
    state = reduceGame(state, { type: "upgrade", upgradeId: "veilsight" });
    expect(state.player.upgrades).toContain("veilsight");

    state = reduceGame(state, { type: "select-encounter", encounterId: "glasswing" });
    state = reduceGame(state, { type: "start" });
    expect(state.enemy.intent).toBe("veil");

    state = reduceGame(state, { type: "strike" });
    expect(state.enemy.hp).toBe(12 - 3);
  });
});


const withEquipped = (item: (typeof lootTable)[number], state = createInitialState()) => ({
  ...state,
  player: { ...state.player, inventory: [...state.player.inventory, item], equippedId: item.id },
});

describe("Item traits and salvage", () => {
  it("applies Stormcharge to the first Strike of a hunt", () => {
    let state = reduceGame(createInitialState(), { type: "toggle-guaranteed-rare" });
    state = winHunt(state);
    expect(state.lastReward?.id).toBe(rareLoot.id);
    state = reduceGame(state, { type: "equip", itemId: rareLoot.id });

    state = reduceGame(state, { type: "start" });
    state = reduceGame(state, { type: "strike" });
    expect(state.enemy.hp).toBe(12 - (powerOf(state.player) + 2));
  });

  it("applies Veil Keen to strikes against a veiled enemy", () => {
    const emberLens = lootTable[1];
    let state = withEquipped(emberLens);
    state = reduceGame(state, { type: "select-encounter", encounterId: "glasswing" });
    state = reduceGame(state, { type: "start" });
    expect(state.enemy.intent).toBe("veil");

    state = reduceGame(state, { type: "strike" });
    expect(state.enemy.hp).toBe(12 - (1 + 2));
  });

  it("gives Ember Lens a guard cost in exchange for power", () => {
    const state = withEquipped(lootTable[1]);
    expect(guardOf(state.player)).toBe(0);
    expect(powerOf(state.player)).toBe(3 + 2);
  });

  it("restores health when Steady Hand users Brace", () => {
    let state = withEquipped(lootTable[0]);
    state = reduceGame(state, { type: "start" });
    state = { ...state, player: { ...state.player, hp: 10 } };

    state = reduceGame(state, { type: "brace" });

    expect(state.player.hp).toBe(10 + 1 - (5 - guardOf(withEquipped(lootTable[0]).player)));
  });

  it("salvages a duplicate reward for half its value instead of stacking it", () => {
    let state = winHunt();
    state = winHunt(state);
    state = winHunt(state);

    const copies = state.player.inventory.filter((item) => item.id === lootTable[0].id);
    expect(copies).toHaveLength(1);
    expect(state.player.inventory).toHaveLength(3);
    expect(state.log.join(" ")).toContain("salvaged");
  });
});
