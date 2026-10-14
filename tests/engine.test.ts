import { describe, expect, it } from "vitest";
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
