import { createEncounter, encounters, milestones, starterItem, upgradeLabels } from "./content";
import { chooseLoot } from "./loot";
import type { Enemy, GameAction, GameState, Intent, Item, Player, UpgradeId } from "./types";

const XP_PER_LEVEL = 10;
const UPGRADE_COST = 8;
const VEILED_STRIKE_DAMAGE = 1;
const VEILSIGHT_BONUS = 2;

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

const enemyDamage: Record<Intent, number> = {
  bite: 2,
  "cinder-burst": 5,
  "dust-bite": 4,
  veil: 0,
};

const intentName: Record<Intent, string> = {
  bite: "Bite",
  "cinder-burst": "Cinder Burst",
  "dust-bite": "Dust Bite",
  veil: "Veil",
};

const nextIntent = (enemy: Enemy): Intent => {
  const pattern = encounters[enemy.id].pattern;
  const index = pattern.indexOf(enemy.intent);
  return pattern[(index + 1) % pattern.length];
};

const rewardVictory = (state: GameState): GameState => {
  const reward = chooseLoot(state.guaranteedRare, state.victories);
  const experience = state.player.experience + XP_PER_LEVEL;
  const level = Math.max(1, Math.floor(experience / XP_PER_LEVEL) + 1);
  const encounterWins = {
    ...state.encounterWins,
    [state.encounterId]: state.encounterWins[state.encounterId] + 1,
  };
  const earned = milestones.filter(
    (milestone) =>
      milestone.encounterId === state.encounterId &&
      encounterWins[state.encounterId] >= milestone.wins &&
      !state.titles.includes(milestone.id),
  );
  const milestoneGold = earned.reduce((sum, milestone) => sum + milestone.reward, 0);
  const player = {
    ...state.player,
    experience,
    level,
    gold: state.player.gold + 12 + milestoneGold,
    inventory: [...state.player.inventory, reward],
  };
  const victory: GameState = {
    ...state,
    phase: "victory",
    player,
    victories: state.victories + 1,
    encounterWins,
    titles: [...state.titles, ...earned.map((milestone) => milestone.id)],
    discovered: state.discovered.includes(reward.id) ? state.discovered : [...state.discovered, reward.id],
    lastReward: reward,
    braced: false,
  };
  const withVictoryLog = addLog(victory, `Victory! +${XP_PER_LEVEL} experience, +12 gold, and ${reward.name}.`);

  return earned.reduce(
    (current, milestone) => addLog(current, `Milestone reached: ${milestone.name}. +${milestone.reward} gold.`),
    withVictoryLog,
  );
};

const resolveEnemyTurn = (state: GameState): GameState => {
  const intent = state.enemy.intent;
  const rawDamage = enemyDamage[intent];
  const damage =
    rawDamage === 0 || !state.braced ? rawDamage : Math.max(0, rawDamage - guardOf(state.player));
  const hp = Math.max(0, state.player.hp - damage);
  const message =
    intent === "veil"
      ? `${state.enemy.name} veils itself. Its next strike will be a Dust Bite.`
      : `${state.enemy.name} uses ${intentName[intent]} for ${damage} damage${state.braced ? " after your Brace" : ""}.`;
  const afterHit = addLog(
    {
      ...state,
      player: { ...state.player, hp },
      enemy: { ...state.enemy, intent: nextIntent(state.enemy) },
      turn: state.turn + 1,
      braced: false,
    },
    message,
  );

  return hp === 0 ? addLog({ ...afterHit, phase: "defeat" }, "You fall back to camp. The hunt can begin again.") : afterHit;
};

const takeTurn = (state: GameState, action: "strike" | "brace" | "focus"): GameState => {
  if (state.phase !== "active") {
    return state;
  }

  if (action === "strike") {
    const veiled = state.enemy.intent === "veil";
    const veiledDamage =
      VEILED_STRIKE_DAMAGE + (state.player.upgrades.includes("veilsight") ? VEILSIGHT_BONUS : 0);
    const damage = veiled ? veiledDamage : powerOf(state.player);
    const hp = Math.max(0, state.enemy.hp - damage);
    const afterStrike = addLog(
      { ...state, enemy: { ...state.enemy, hp } },
      veiled
        ? state.player.upgrades.includes("veilsight")
          ? `Veilsight finds a gap in the veil for ${damage} damage.`
          : `Your Strike only scratches the veil for ${damage} damage.`
        : `You Strike for ${damage} damage.`,
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
    `${upgradeLabels[upgradeId].name} unlocked.`,
  );
};

const sellItem = (state: GameState, itemId: string): GameState => {
  const item = state.player.inventory.find((candidate) => candidate.id === itemId);
  if (state.phase === "active" || !item || item.id === state.player.equippedId) {
    return state;
  }

  return addLog(
    {
      ...state,
      player: {
        ...state.player,
        gold: state.player.gold + item.value,
        inventory: state.player.inventory.filter((candidate) => candidate.id !== itemId),
      },
    },
    `Sold ${item.name} for ${item.value} gold.`,
  );
};

export const createInitialState = (): GameState => ({
  phase: "idle",
  encounterId: "ashmaw",
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
  enemy: createEncounter("ashmaw"),
  turn: 1,
  braced: false,
  guaranteedRare: false,
  victories: 0,
  encounterWins: { ashmaw: 0, glasswing: 0 },
  titles: [],
  discovered: [starterItem.id],
  log: ["Choose an encounter, then Begin Hunt. Watch its intent before committing."],
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
          enemy: createEncounter(state.encounterId),
          turn: 1,
          braced: false,
          lastReward: undefined,
        },
        encounters[state.encounterId].opening,
      );
    case "select-encounter":
      if (state.phase === "active") {
        return state;
      }
      return addLog(
        {
          ...state,
          phase: "idle",
          encounterId: action.encounterId,
          enemy: createEncounter(action.encounterId),
          turn: 1,
          braced: false,
        },
        `${encounters[action.encounterId].name} is ready to hunt.`,
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
    case "sell":
      return sellItem(state, action.itemId);
    case "toggle-guaranteed-rare":
      return addLog(
        { ...state, guaranteedRare: !state.guaranteedRare },
        `Rare-loot test ${state.guaranteedRare ? "disabled" : "enabled"} for your next victory.`,
      );
  }
};
