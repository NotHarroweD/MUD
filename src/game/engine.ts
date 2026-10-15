import { createEncounter, craftingExperienceForNextLevel, enhancements, encounters, milestones, starterItem, upgradeLabels } from "./content";
import { chooseMaterial } from "./loot";
import { shopStockFor } from "./shops";
import { isAdjacent, slotAtShopTile, tileTypeAt, zoneOf } from "./world";
import type {
  BattleEvent,
  Attribute,
  Attributes,
  Enemy,
  EncounterId,
  GameAction,
  GameState,
  Intent,
  Item,
  Player,
  RewardSummary,
  UpgradeId,
} from "./types";

export const XP_PER_LEVEL = 10;
export const ATTRIBUTE_POINTS_PER_LEVEL = 2;
const BASE_VICTORY_GOLD = 12;
const UPGRADE_COST = 8;
const VEILED_STRIKE_DAMAGE = 1;
const VEILSIGHT_BONUS = 2;
const BRACE_HEAL = 1;
const randomInt = (minimum: number, maximum: number): number =>
  Math.floor(Math.random() * (maximum - minimum + 1)) + minimum;

const encountersForLocation = (location: GameState["location"]) => zoneOf(location).encounters;

export const availableEncountersFor = (state: GameState): EncounterId[] => {
  const roster = encountersForLocation(state.location);
  if (state.location.zoneId !== "waking-garden") return roster;
  let available = Math.min(1, roster.length);
  while (available < roster.length && state.encounterWins[roster[available - 1]] > 0) available += 1;
  return roster.slice(0, available);
};

const addLog = (state: GameState, entry: string): GameState => ({
  ...state,
  log: [entry, ...state.log].slice(0, 12),
});

const emit = (state: GameState, event: Omit<BattleEvent, "seq">): GameState => {
  const seq = state.eventSeq + 1;
  return { ...state, eventSeq: seq, events: [...state.events, { ...event, seq }] };
};

const equippedItem = (player: Player): Item =>
  player.inventory.find((item) => item.id === player.equipment.weapon) ?? starterItem;

const hasTrait = (player: Player, traitId: NonNullable<Item["trait"]>["id"]): boolean =>
  equippedItems(player).some((item) => item.trait?.id === traitId);

export const equippedItems = (player: Player): Item[] =>
  Object.values(player.equipment)
    .map((id) => player.inventory.find((item) => item.id === id))
    .filter((item): item is Item => item !== undefined);

export const effectiveAttributesOf = (player: Player): Attributes => {
  const attributes = { ...player.attributes };
  for (const item of equippedItems(player)) {
    for (const [attribute, value] of Object.entries(item.attributes ?? {}) as [Attribute, number][]) {
      attributes[attribute] += value;
    }
  }
  return attributes;
};

export const xpForNextLevel = (level: number): number => XP_PER_LEVEL + Math.max(0, level - 1) * 5;

export const totalXpForLevel = (level: number): number => {
  let total = 0;
  for (let current = 1; current < level; current += 1) total += xpForNextLevel(current);
  return total;
};

const levelForExperience = (experience: number): number => {
  let level = 1;
  while (experience >= totalXpForLevel(level + 1)) level += 1;
  return level;
};

export const maxHealthOf = (player: Player): number =>
  10 + effectiveAttributesOf(player).vitality * 2 + equippedItems(player).reduce((sum, item) => sum + item.maxHealth + enhancementBonus(item, "maxHealth"), 0);

const enhancementBonus = (item: Item, property: "power" | "guard" | "maxHealth" | "criticalChance" | "evasion" | "focus"): number =>
  item.enhancements.reduce((sum, id) => sum + (enhancements[id]?.bonus[property] ?? 0), 0);

export const powerOf = (player: Player): number =>
  3 + Math.floor((effectiveAttributesOf(player).strength - 2) / 2) + equippedItem(player).power + enhancementBonus(equippedItem(player), "power") + (player.upgrades.includes("edgecraft") ? 1 : 0);

export const spellPowerOf = (player: Player): number =>
  2 + Math.floor((effectiveAttributesOf(player).wisdom - 2) / 2);

export const guardOf = (player: Player): number =>
  1 + Math.floor((effectiveAttributesOf(player).vitality - 2) / 3) + equippedItems(player).reduce((sum, item) => sum + item.guard + enhancementBonus(item, "guard"), 0) + (player.upgrades.includes("bulwark") ? 1 : 0);

export const hitChanceAgainst = (player: Player, enemy: Enemy, veiled = false): number =>
  Math.max(10, Math.min(98, 80 + (effectiveAttributesOf(player).dexterity - 2) * 3 - enemy.evasion - (veiled ? 10 : 0)));

export const spellHitChanceAgainst = (player: Player, enemy: Enemy, veiled = false): number =>
  Math.max(10, Math.min(98, 80 + (effectiveAttributesOf(player).intelligence - 2) * 3 - enemy.magicDefense - (veiled ? 10 : 0)));

export const evasionOf = (player: Player): number =>
  Math.max(0, Math.min(45, 4 + (effectiveAttributesOf(player).dexterity - 2) * 2 + equippedItems(player).reduce((sum, item) => sum + item.evasion + enhancementBonus(item, "evasion"), 0)));

export const criticalChanceOf = (player: Player): number =>
  Math.max(2, Math.min(40, 4 + equippedItems(player).reduce((sum, item) => sum + item.criticalChance + enhancementBonus(item, "criticalChance"), 0)));

export const focusRecoveryOf = (player: Player): number =>
  Math.max(1, 2 + equippedItems(player).reduce((sum, item) => sum + item.focus + enhancementBonus(item, "focus"), 0));

const withUpdatedMaxHealth = (player: Player, hpAdjustment: number): Player => {
  const maxHp = maxHealthOf(player);
  return { ...player, maxHp, hp: Math.max(0, Math.min(maxHp, player.hp + hpAdjustment)) };
};

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
  const material = chooseMaterial(state.victories, state.guaranteedRare);
  const experienceReward = encounters[state.encounterId].experienceReward ?? XP_PER_LEVEL;
  const goldReward = encounters[state.encounterId].goldReward ?? BASE_VICTORY_GOLD;
  const experience = state.player.experience + experienceReward;
  const level = levelForExperience(experience);
  const levelsGained = level - state.player.level;
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
  const craftingExperience = state.player.craftingExperience + 10;
  let craftingLevel = state.player.craftingLevel;
  let remainingCraftingExperience = craftingExperience;
  while (remainingCraftingExperience >= craftingExperienceForNextLevel(craftingLevel)) {
    remainingCraftingExperience -= craftingExperienceForNextLevel(craftingLevel);
    craftingLevel += 1;
  }
  const player = {
    ...state.player,
    experience,
    level,
    unspentAttributePoints: state.player.unspentAttributePoints + levelsGained * ATTRIBUTE_POINTS_PER_LEVEL,
    gold: state.player.gold + goldReward + milestoneGold,
    materials: { ...state.player.materials, [material.id]: (state.player.materials[material.id] ?? 0) + material.quantity },
    craftingLevel,
    craftingExperience: remainingCraftingExperience,
  };
  const rewards: RewardSummary = {
    experience: experienceReward,
    baseGold: goldReward,
    milestones: earned.map((milestone) => ({ name: milestone.name, gold: milestone.reward })),
    material,
    leveledTo: level > state.player.level ? level : undefined,
  };
  const victory: GameState = {
    ...state,
    phase: "victory",
    player,
    victories: state.victories + 1,
    encounterWins,
    titles: [...state.titles, ...earned.map((milestone) => milestone.id)],
    lastRewards: rewards,
    braced: false,
  };
  const withVictoryLog = addLog(
    victory,
    `Victory! +${experienceReward} experience, +${goldReward} gold, and ${material.quantity} ${material.name}.`,
  );

  return earned.reduce(
    (current, milestone) => addLog(current, `Milestone reached: ${milestone.name}. +${milestone.reward} gold.`),
    withVictoryLog,
  );
};

const resolveEnemyTurn = (state: GameState): GameState => {
  const intent = state.enemy.intent;
  const baseDamage = intent === "veil" ? 0 : enemyDamage[intent] + (encounters[state.enemy.id].damageBonus ?? 0);
  const enemyEvades = baseDamage > 0 && Math.random() * 100 < evasionOf(state.player);
  const rawDamage = enemyEvades ? 0 : Math.max(0, baseDamage + randomInt(-1, 1));
  const guard = state.braced ? Math.max(0, guardOf(state.player) + randomInt(-1, 1)) : 0;
  const damage =
    rawDamage === 0 || !state.braced ? rawDamage : Math.max(0, rawDamage - guard);
  const hp = Math.max(0, state.player.hp - damage);
  const message = enemyEvades
    ? `You evade ${state.enemy.name}'s ${intentName[intent]}.`
    : intent === "veil"
      ? `${state.enemy.name} veils itself. Its next strike will be a Dust Bite.`
      : `${state.enemy.name} uses ${intentName[intent]} for ${damage} damage${state.braced ? " after your Brace" : ""}.`;

  let next = state;
  if (enemyEvades) next = emit(next, { target: "player", kind: "evade", amount: 0 });
  if (state.braced && rawDamage - damage > 0) {
    next = emit(next, { target: "player", kind: "block", amount: rawDamage - damage });
  }
  if (damage > 0) {
    next = emit(next, { target: "player", kind: "damage", amount: damage });
  }

  const afterHit = addLog(
    {
      ...next,
      player: { ...next.player, hp },
      enemy: { ...next.enemy, intent: nextIntent(next.enemy) },
      turn: next.turn + 1,
      braced: false,
    },
    message,
  );

  if (hp !== 0) return afterHit;
  const zone = zoneOf(state.location);
  const sanctuary = Object.entries(zone.tiles).find(([, type]) => type === "sanctuary")?.[0]?.split(",").map(Number);
  const location = sanctuary ? { ...state.location, x: sanctuary[0], y: sanctuary[1] } : state.location;
  const progressInLevel = state.player.experience - totalXpForLevel(state.player.level);
  const experienceLost = progressInLevel > 0 ? Math.max(1, Math.floor(progressInLevel * 0.2)) : 0;
  const goldLost = state.player.gold;
  const defeated = {
    ...afterHit,
    phase: "defeat" as const,
    location,
    player: { ...afterHit.player, gold: 0, experience: Math.max(totalXpForLevel(state.player.level), state.player.experience - experienceLost) },
  };
  return addLog(defeated, `You fall and awaken at ${zone.name}'s sanctuary. Lost ${goldLost} carried gold and ${experienceLost} experience.`);
};

const takeTurn = (state: GameState, action: "strike" | "cast" | "brace" | "focus"): GameState => {
  if (state.phase !== "active") {
    return state;
  }

  const turnStart: GameState = { ...state, events: [] };

  if (action === "strike") {
    const veiled = turnStart.enemy.intent === "veil";
    const veiledKeen = hasTrait(turnStart.player, "veil-keen");
    const stormcharge = hasTrait(turnStart.player, "stormcharge");
    const firstStrike = turnStart.enemy.hp === turnStart.enemy.maxHp;
    const veiledDamage =
      VEILED_STRIKE_DAMAGE + (turnStart.player.upgrades.includes("veilsight") ? VEILSIGHT_BONUS : 0);
    const traitBonus =
      (veiled && veiledKeen ? 2 : 0) + (firstStrike && stormcharge ? 2 : 0);
    const hitChance = hitChanceAgainst(turnStart.player, turnStart.enemy, veiled);
    if (Math.random() * 100 >= hitChance) {
      const missed = emit(turnStart, { target: "enemy", kind: "miss", amount: 0 });
      return resolveEnemyTurn(addLog(missed, `Your Strike misses ${turnStart.enemy.name}.`));
    }
    const critical = Math.random() * 100 < criticalChanceOf(turnStart.player);
    const baseStrikeDamage = (veiled ? veiledDamage : powerOf(turnStart.player)) + traitBonus + randomInt(-1, 1);
    const damage = Math.max(1, critical ? Math.floor(baseStrikeDamage * 1.5) : baseStrikeDamage);
    const hp = Math.max(0, turnStart.enemy.hp - damage);
    const struck = emit({ ...turnStart, enemy: { ...turnStart.enemy, hp } }, { target: "enemy", kind: "damage", amount: damage, critical });
    const afterStrike = addLog(
      struck,
      veiled
        ? turnStart.player.upgrades.includes("veilsight")
          ? `Veilsight finds a gap in the veil for ${damage} damage.`
          : `Your Strike only scratches the veil for ${damage} damage.`
        : `You Strike for ${damage} damage${critical ? " — critical hit!" : ""}.`,
    );
    return hp === 0 ? rewardVictory(afterStrike) : resolveEnemyTurn(afterStrike);
  }

  if (action === "cast") {
    const veiled = turnStart.enemy.intent === "veil";
    const hitChance = spellHitChanceAgainst(turnStart.player, turnStart.enemy, veiled);
    if (Math.random() * 100 >= hitChance) {
      const missed = emit(turnStart, { target: "enemy", kind: "miss", amount: 0 });
      return resolveEnemyTurn(addLog(missed, `Your spell misses ${turnStart.enemy.name}.`));
    }
    const critical = Math.random() * 100 < criticalChanceOf(turnStart.player);
    const rolledDamage = spellPowerOf(turnStart.player) + randomInt(-1, 1);
    const damage = Math.max(1, critical ? Math.floor(rolledDamage * 1.5) : rolledDamage);
    const hp = Math.max(0, turnStart.enemy.hp - damage);
    const cast = emit({ ...turnStart, enemy: { ...turnStart.enemy, hp } }, { target: "enemy", kind: "damage", amount: damage, critical });
    const afterCast = addLog(cast, `You cast for ${damage} damage${critical ? " — critical hit!" : ""}.`);
    return hp === 0 ? rewardVictory(afterCast) : resolveEnemyTurn(afterCast);
  }

  if (action === "brace") {
    const heals = hasTrait(turnStart.player, "steady-hand");
    const hp = heals ? Math.min(turnStart.player.maxHp, turnStart.player.hp + BRACE_HEAL) : turnStart.player.hp;
    let braced: GameState = { ...turnStart, braced: true, player: { ...turnStart.player, hp } };
    if (hp > turnStart.player.hp) {
      braced = emit(braced, { target: "player", kind: "heal", amount: hp - turnStart.player.hp });
    }
    return resolveEnemyTurn(
      addLog(braced, heals ? "You Brace. Steady Hand restores 1 health." : "You Brace against the next hit."),
    );
  }

  const healAmount = Math.max(1, focusRecoveryOf(turnStart.player) + randomInt(-1, 1));
  const healed = Math.min(turnStart.player.maxHp, turnStart.player.hp + healAmount);
  let focused: GameState = { ...turnStart, player: { ...turnStart.player, hp: healed } };
  if (healed > turnStart.player.hp) {
    focused = emit(focused, { target: "player", kind: "heal", amount: healed - turnStart.player.hp });
  }
  return resolveEnemyTurn(addLog(focused, `You Focus and restore ${healed - turnStart.player.hp} health.`));
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
  if (state.phase === "active" || !item || Object.values(state.player.equipment).includes(item.id)) {
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
  encounterId: "garden-sproutling",
  player: {
    hp: 14,
    maxHp: 14,
    attributes: { strength: 2, dexterity: 2, intelligence: 2, wisdom: 2, vitality: 2 },
    unspentAttributePoints: 0,
    experience: 0,
    level: 1,
    gold: 0,
    bankedGold: 0,
    equipment: { weapon: starterItem.id },
    inventory: [starterItem],
    upgrades: [],
    materials: {},
    craftingLevel: 1,
    craftingExperience: 0,
  },
  location: { zoneId: "waking-garden", x: 1, y: 2 },
  enemy: createEncounter("garden-sproutling"),
  turn: 1,
  braced: false,
  guaranteedRare: false,
  victories: 0,
  encounterWins: Object.fromEntries(Object.keys(encounters).map((id) => [id, 0])) as Record<EncounterId, number>,
  titles: [],
  eventSeq: 0,
  events: [],
  log: ["You awaken in the Waking Garden. Meet its ten trials, gather gear, and reach level 50 to enter the Wilderness."],
});

const moveTo = (state: GameState, x: number, y: number): GameState => {
  if (state.phase === "active") return state;
  const zone = zoneOf(state.location);
  if (x < 0 || y < 0 || x >= zone.width || y >= zone.height || !isAdjacent(state.location, x, y)) return state;
  const location = { ...state.location, x, y };
  const tile = tileTypeAt(zone, x, y);
  const connection = zone.connections[`${x},${y}`];
  const shop = slotAtShopTile(tile);
  const message = connection
    ? `${connection.name} entrance reached${connection.requiredLevel ? ` · level ${connection.requiredLevel} required` : ""}.`
    : shop ? `You arrive at the ${shop} shop.` : tile === "sanctuary" ? `${zone.name}'s sanctuary is here.` : `You move through ${zone.name}.`;
  return addLog({ ...state, location }, message);
};

const enterZone = (state: GameState): GameState => {
  if (state.phase === "active") return state;
  const zone = zoneOf(state.location);
  const connection = zone.connections[`${state.location.x},${state.location.y}`];
  if (!connection || (connection.requiredLevel && state.player.level < connection.requiredLevel)) return state;
  const destination = zoneOf({ zoneId: connection.zoneId, x: connection.x, y: connection.y });
  const encounterId = destination.encounters[0] ?? "ashmaw";
  const next = {
    ...state, location: { zoneId: destination.id, x: connection.x, y: connection.y },
    encounterId, enemy: createEncounter(encounterId, destination.level), phase: "idle" as const,
    turn: 1, events: [], braced: false,
  };
  return addLog(next, `You enter ${destination.name} · ${destination.type}, level ${destination.level}.`);
};

const buyShopItem = (state: GameState, itemId: string): GameState => {
  if (state.phase === "active") return state;
  const zone = zoneOf(state.location);
  const slot = slotAtShopTile(tileTypeAt(zone, state.location.x, state.location.y));
  const item = slot ? shopStockFor(zone.id, slot).find((stock) => stock.id === itemId) : undefined;
  if (!item || state.player.gold < item.value) return state;
  const owned: Item = { ...item, id: `shop:${zone.id}:${slot}:${state.victories}:${state.player.inventory.length}` };
  return addLog({ ...state, player: { ...state.player, gold: state.player.gold - item.value, inventory: [...state.player.inventory, owned] } }, `Bought ${item.name} for ${item.value} gold.`);
};

const restAtSanctuary = (state: GameState): GameState => {
  if (state.phase === "active" || tileTypeAt(zoneOf(state.location), state.location.x, state.location.y) !== "sanctuary") return state;
  if (state.phase === "idle" && state.player.hp === state.player.maxHp) return state;
  return addLog({
    ...state,
    phase: "idle",
    player: { ...state.player, hp: state.player.maxHp },
    lastRewards: undefined,
    events: [],
    braced: false,
  }, `You rest at ${zoneOf(state.location).name}'s sanctuary and recover fully.`);
};

const bankGold = (state: GameState, direction: "deposit" | "withdraw"): GameState => {
  if (state.phase === "active" || tileTypeAt(zoneOf(state.location), state.location.x, state.location.y) !== "bank") return state;
  if (direction === "deposit") {
    if (state.player.gold === 0) return state;
    const amount = state.player.gold;
    return addLog({ ...state, player: { ...state.player, gold: 0, bankedGold: state.player.bankedGold + amount } }, `Deposited ${amount} gold in the Waking Garden bank.`);
  }
  if (state.player.bankedGold === 0) return state;
  const amount = state.player.bankedGold;
  return addLog({ ...state, player: { ...state.player, gold: state.player.gold + amount, bankedGold: 0 } }, `Withdrew ${amount} gold from the Waking Garden bank.`);
};

export const reduceGame = (state: GameState, action: GameAction): GameState => {
  switch (action.type) {
    case "start":
      if (state.phase === "active" || !availableEncountersFor(state).includes(state.encounterId)) {
        return state;
      }
      return addLog(
        {
          ...state,
          phase: "active",
          player: { ...state.player, hp: state.player.maxHp },
          enemy: createEncounter(state.encounterId, zoneOf(state.location).level),
          turn: 1,
          braced: false,
          lastRewards: undefined,
          events: [],
          log: [],
        },
        encounters[state.encounterId].opening,
      );
    case "dismiss-reward":
      if (state.phase !== "victory" && state.phase !== "defeat") return state;
      if (state.phase === "victory" && state.player.unspentAttributePoints > 0) return state;
      return addLog({ ...state, phase: "idle" }, "The hunt is over. Choose when you are ready for another.");
    case "move-to":
      return moveTo(state, action.x, action.y);
    case "enter-zone":
      return enterZone(state);
    case "rest":
      return restAtSanctuary(state);
    case "bank-deposit":
      return bankGold(state, "deposit");
    case "bank-withdraw":
      return bankGold(state, "withdraw");
    case "buy-item":
      return buyShopItem(state, action.itemId);
    case "craft-enhancement": {
      if (state.phase === "active") return state;
      const recipe = enhancements[action.enhancementId];
      const item = state.player.inventory.find((candidate) => candidate.id === action.itemId);
      if (!recipe || !item || state.player.craftingLevel < recipe.requiredCraftingLevel) return state;
      if ((state.player.materials[recipe.material] ?? 0) < 1 || item.enhancements.length >= item.enhancementCapacity) return state;
      const updatedItem = { ...item, enhancements: [...item.enhancements, recipe.id] };
      const inventory = state.player.inventory.map((candidate) => candidate.id === item.id ? updatedItem : candidate);
      const materials = { ...state.player.materials, [recipe.material]: state.player.materials[recipe.material]! - 1 };
      const gainedXp = state.player.craftingExperience + 5;
      let craftingLevel = state.player.craftingLevel;
      let craftingExperience = gainedXp;
      while (craftingExperience >= craftingExperienceForNextLevel(craftingLevel)) {
        craftingExperience -= craftingExperienceForNextLevel(craftingLevel);
        craftingLevel += 1;
      }
      const player = { ...state.player, inventory, materials, craftingLevel, craftingExperience };
      const previousMaxHp = state.player.maxHp;
      const updatedPlayer = withUpdatedMaxHealth(player, maxHealthOf(player) - previousMaxHp);
      return addLog({ ...state, player: updatedPlayer }, `Crafted ${recipe.name} onto ${item.name}.`);
    }
    case "raise-attribute": {
      if (state.phase === "active" || state.player.unspentAttributePoints < 1) return state;
      const previousMaxHp = state.player.maxHp;
      const pointsToApply = Math.min(ATTRIBUTE_POINTS_PER_LEVEL, state.player.unspentAttributePoints);
      const player = {
        ...state.player,
        attributes: { ...state.player.attributes, [action.attribute]: state.player.attributes[action.attribute] + pointsToApply },
        unspentAttributePoints: state.player.unspentAttributePoints - pointsToApply,
      };
      const hpIncrease = maxHealthOf(player) - previousMaxHp;
      const updatedPlayer = withUpdatedMaxHealth(player, hpIncrease);
      return addLog({ ...state, player: updatedPlayer }, `${action.attribute[0].toUpperCase()}${action.attribute.slice(1)} increased by ${pointsToApply} to ${player.attributes[action.attribute]}.`);
    }
    case "select-encounter":
      if (state.phase === "active" || !availableEncountersFor(state).includes(action.encounterId)) {
        return state;
      }
      return addLog(
        {
          ...state,
          phase: "idle",
          encounterId: action.encounterId,
          enemy: createEncounter(action.encounterId, zoneOf(state.location).level),
          turn: 1,
          braced: false,
          events: [],
        },
        `${encounters[action.encounterId].name} is ready to hunt.`,
      );
    case "strike":
    case "cast":
    case "brace":
    case "focus":
      return takeTurn(state, action.type);
    case "equip":
      if (state.phase === "active") return state;
      if (!state.player.inventory.some((item) => item.id === action.itemId)) {
        return state;
      }
      {
        const item = state.player.inventory.find((candidate) => candidate.id === action.itemId);
        if (!item) return state;
        const previousMaxHp = state.player.maxHp;
        const player = {
          ...state.player,
          equipment: { ...state.player.equipment, [item.slot]: item.id },
        };
        const updatedPlayer = withUpdatedMaxHealth(player, maxHealthOf(player) - previousMaxHp);
      return addLog(
          { ...state, player: updatedPlayer },
          `${item.name} equipped in your ${item.slot} slot.`,
      );
      }
    case "sell":
      return sellItem(state, action.itemId);
    case "upgrade":
      return buyUpgrade(state, action.upgradeId);
    case "toggle-guaranteed-rare":
      return addLog(
        { ...state, guaranteedRare: !state.guaranteedRare },
        `Rare-loot test ${state.guaranteedRare ? "disabled" : "enabled"} for your next victory.`,
      );
  }
};
