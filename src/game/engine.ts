import { createAshmaw, starterItem } from "./content";
import { chooseLoot } from "./loot";
import type { GameAction, GameState, Intent, Item, Player, UpgradeId } from "./types";

const XP_PER_LEVEL = 10;
const UPGRADE_COST = 8;

const addLog = (state: GameState, entry: string): GameState => ({
  ...state,
  log: [entry, ...state.log].slice(0, 5),
});

const equippedItem = (player: Player): Item =>
  player.inventory.find((item) => item.id === player.equippedId) ?? starterItem;

export const powerOf = (player: Player): number =>
  player.basePower + equippedItem(player).power + (player.upgrades.includes("edgecraft") ? 1 : 0);

export const guardOf = (player: Player): number =>
  player.baseGuard + equippedItem(player).guard + (player.upgrades.includes("bulwark") ? 1 : 0);

const enemyDamage = (intent: Intent): number => (intent === "cinder-burst" ? 5 : 2);

const nextIntent = (intent: Intent): Intent => (intent === "cinder-burst" ? "bite" : "cinder-burst");

const rewardVictory = (state: GameState): GameState => {
  const reward = chooseLoot(state.guaranteedRare, state.victories);
  const experience = state.player.experience + XP_PER_LEVEL;
  const level = Math.max(1, Math.floor(experience / XP_PER_LEVEL) + 1);
  const player = {
    ...state.player,
    experience,
    level,
    gold: state.player.gold + 12,
    inventory: [...state.player.inventory, reward],
  };

  return addLog(
    {
      ...state,
      phase: "victory",
      player,
      victories: state.victories + 1,
      lastReward: reward,
      braced: false,
    },
    `Victory! +${XP_PER_LEVEL} experience, +12 gold, and ${reward.name}.`,
  );
};

const resolveEnemyTurn = (state: GameState): GameState => {
  const rawDamage = enemyDamage(state.enemy.intent);
  const damage = state.braced ? Math.max(0, rawDamage - guardOf(state.player)) : rawDamage;
  const hp = Math.max(0, state.player.hp - damage);
  const intentName = state.enemy.intent === "cinder-burst" ? "Cinder Burst" : "Bite";
  const afterHit = addLog(
    {
      ...state,
      player: { ...state.player, hp },
      enemy: { ...state.enemy, intent: nextIntent(state.enemy.intent) },
      turn: state.turn + 1,
      braced: false,
    },
    `Ashmaw uses ${intentName} for ${damage} damage${state.braced ? " after your Brace" : ""}.`,
  );

  return hp === 0 ? addLog({ ...afterHit, phase: "defeat" }, "You fall back to camp. The hunt can begin again.") : afterHit;
};

const takeTurn = (state: GameState, action: "strike" | "brace" | "focus"): GameState => {
  if (state.phase !== "active") {
    return state;
  }

  if (action === "strike") {
    const damage = powerOf(state.player);
    const hp = Math.max(0, state.enemy.hp - damage);
    const afterStrike = addLog(
      { ...state, enemy: { ...state.enemy, hp } },
      `You Strike for ${damage} damage.`,
    );
    return hp === 0 ? rewardVictory(afterStrike) : resolveEnemyTurn(afterStrike);
  }

  if (action === "brace") {
    return resolveEnemyTurn(addLog({ ...state, braced: true }, "You Brace against the next hit."));
  }

  const hp = Math.min(state.player.maxHp, state.player.hp + 3);
  return resolveEnemyTurn(addLog({ ...state, player: { ...state.player, hp } }, "You Focus and restore 3 health."));
};

const buyUpgrade = (state: GameState, upgradeId: UpgradeId): GameState => {
  if (
    state.player.level < 2 ||
    state.player.gold < UPGRADE_COST ||
    state.player.upgrades.includes(upgradeId)
  ) {
    return state;
  }

  return addLog(
    {
      ...state,
      player: {
        ...state.player,
        gold: state.player.gold - UPGRADE_COST,
        upgrades: [...state.player.upgrades, upgradeId],
      },
    },
    `${upgradeId === "edgecraft" ? "Edgecraft" : "Bulwark"} unlocked.`,
  );
};

export const createInitialState = (): GameState => ({
  phase: "idle",
  player: {
    hp: 14,
    maxHp: 14,
    basePower: 3,
    baseGuard: 1,
    experience: 0,
    level: 1,
    gold: 0,
    equippedId: starterItem.id,
    inventory: [starterItem],
    upgrades: [],
  },
  enemy: createAshmaw(),
  turn: 1,
  braced: false,
  guaranteedRare: false,
  victories: 0,
  log: ["Choose Begin Hunt. Watch Ashmaw's intent before committing."],
});

export const reduceGame = (state: GameState, action: GameAction): GameState => {
  switch (action.type) {
    case "start":
      if (state.phase === "active") {
        return state;
      }
      return addLog(
        {
          ...state,
          phase: "active",
          player: { ...state.player, hp: state.player.maxHp },
          enemy: createAshmaw(),
          turn: 1,
          braced: false,
          lastReward: undefined,
        },
        "The Cinderwood Hunt begins. Ashmaw is gathering a Cinder Burst.",
      );
    case "strike":
    case "brace":
    case "focus":
      return takeTurn(state, action.type);
    case "equip":
      if (!state.player.inventory.some((item) => item.id === action.itemId)) {
        return state;
      }
      return addLog(
        { ...state, player: { ...state.player, equippedId: action.itemId } },
        `${state.player.inventory.find((item) => item.id === action.itemId)?.name ?? "Item"} equipped.`,
      );
    case "upgrade":
      return buyUpgrade(state, action.upgradeId);
    case "toggle-guaranteed-rare":
      return addLog(
        { ...state, guaranteedRare: !state.guaranteedRare },
        `Rare-loot test ${state.guaranteedRare ? "disabled" : "enabled"} for your next victory.`,
      );
  }
};
