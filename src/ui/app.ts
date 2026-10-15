import { encounters, enhancements, materials, milestones, upgradeLabels } from "../game/content";
import { availableEncountersFor, criticalChanceOf, effectiveAttributesOf, evasionOf, focusRecoveryOf, guardOf, hitChanceAgainst, maxHealthOf, powerOf, spellHitChanceAgainst, spellPowerOf, totalXpForLevel, xpForNextLevel } from "../game/engine";
import { shopStockFor } from "../game/shops";
import type { DevSimulationReport } from "../game/devtools";
import { isAdjacent, slotAtShopTile, tileTypeAt, zoneOf } from "../game/world";
import type { Attribute, EncounterId, GameAction, GameState, GearSlot, Item, RewardSummary, TileType } from "../game/types";

type Dispatch = (action: GameAction) => void;
type DevActions = { reset: () => void; simulate: () => void; report?: DevSimulationReport };
type Channel = "global" | "battle";
interface ChatLine {
  channel: Channel | "system";
  author: string;
  text: string;
}

let selectedItemId = "cinderhook";
let gearView: "equipment" | "inventory" = "equipment";
let locationView: "details" | "map" = "details";
let chatLines: ChatLine[] = [
  { channel: "system", author: "System", text: "Welcome to Never Ending Reign." },
  { channel: "system", author: "System", text: "Chat is local to this browser until the multiplayer server exists." },
];
let chatChannel: Channel = "global";
let chatDraft = "";
let chatFocused = false;
let lastSeenEventSeq = 0;
let lastAnnouncedSeq = 0;
const renderedRatio: Record<"player" | "enemy", number> = { player: 1, enemy: 1 };

const escapeHtml = (value: string): string => {
  const entities: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  return value.replace(/[&<>"']/g, (character) => entities[character]);
};

const signed = (value: number): string => (value >= 0 ? `+${value}` : `${value}`);

const ratioOf = (current: number, maximum: number): number =>
  maximum > 0 ? Math.max(0, Math.min(1, current / maximum)) : 0;

const traitLine = (item: Item): string =>
  item.trait ? `<p class="trait-line"><b>${escapeHtml(item.trait.name)}.</b> ${escapeHtml(item.trait.text)}</p>` : "";

const animatedBar = (current: number, maximum: number, side: "player" | "enemy"): string => {
  const ratio = ratioOf(current, maximum);
  const from = renderedRatio[side];
  renderedRatio[side] = ratio;
  const hit = ratio < from ? " hit" : "";
  return `
  <div class="hp${hit}">
    <div class="hp-label"><span>Health</span><b>${current} / ${maximum}</b></div>
    <div class="hp-track"><i class="hp-fill ${side}" style="--from:${from * 100}%;--to:${ratio * 100}%"></i></div>
  </div>`;
};

const floatingNumbers = (state: GameState): string => {
  const fresh = state.events.filter((event) => event.seq > lastSeenEventSeq);
  lastSeenEventSeq = Math.max(lastSeenEventSeq, state.eventSeq);
  return fresh
    .map((event, index) => {
      const text =
        event.kind === "heal" ? `+${event.amount}` : event.kind === "block" ? `Blocked ${event.amount}` : event.kind === "evade" ? "Evaded" : event.kind === "miss" ? "Miss" : `${event.critical ? "CRIT " : ""}-${event.amount}`;
      const left = event.target === "enemy" ? 68 : 30;
      return `<span class="float ${event.kind} ${event.target}" style="left:${left}%;animation-delay:${index * 180}ms">${text}</span>`;
    })
    .join("");
};

const announceOutcome = (state: GameState): void => {
  if ((state.phase !== "victory" && state.phase !== "defeat") || state.eventSeq === lastAnnouncedSeq) {
    return;
  }
  lastAnnouncedSeq = state.eventSeq;
  const text =
    state.phase === "victory" && state.lastRewards?.material
      ? `Wayfinder defeated ${state.enemy.name} and found ${state.lastRewards.material.name}.`
      : `Wayfinder fell to ${state.enemy.name}.`;
  chatLines = [...chatLines, { channel: "battle", author: "Battle", text }];
};

const characterPanel = (state: GameState): string => {
  const latestTitle = milestones.find((milestone) => milestone.id === state.titles[state.titles.length - 1]);
  const levelStartXp = totalXpForLevel(state.player.level);
  const nextLevelXp = levelStartXp + xpForNextLevel(state.player.level);
  const xpProgress = Math.min(100, ((state.player.experience - levelStartXp) / xpForNextLevel(state.player.level)) * 100);
  const attributes = effectiveAttributesOf(state.player);
  const attributesList: Attribute[] = ["strength", "dexterity", "intelligence", "wisdom", "vitality"];
  return `
  <section class="player-hud" aria-label="Player information">
    <div class="hud-identity"><div class="portrait">W</div><div><strong>Wayfinder</strong><span>${escapeHtml(latestTitle?.name ?? "Unranked hunter")}</span></div></div>
    <div class="hud-value hud-level"><span>Level</span><b>${state.player.level}</b></div>
    <div class="hud-attributes" aria-label="Attributes">${attributesList.map((attribute) => `<div class="hud-attribute" title="${attributeInfo[attribute].effect}"><span>${attributeInfo[attribute].label}</span><b>${attributes[attribute]}</b></div>`).join("")}</div>
    <div class="hud-derived" aria-label="Combat stats">
      <div title="Physical damage"><span>PHY</span><b>${powerOf(state.player)}</b></div>
      <div title="Casting damage"><span>MAG</span><b>${spellPowerOf(state.player)}</b></div>
      <div title="Melee hit chance against this enemy"><span>HIT</span><b>${hitChanceAgainst(state.player, state.enemy)}<small>%</small></b></div>
      <div title="Casting hit chance against this enemy"><span>CAST</span><b>${spellHitChanceAgainst(state.player, state.enemy)}<small>%</small></b></div>
      <div title="Damage reduction"><span>GRD</span><b>${guardOf(state.player)}</b></div>
      <div title="Health"><span>HP</span><b>${state.player.hp}<small>/${maxHealthOf(state.player)}</small></b></div>
      <div title="Evasion"><span>EVA</span><b>${evasionOf(state.player)}<small>%</small></b></div>
      <div title="Critical chance"><span>CRIT</span><b>${criticalChanceOf(state.player)}<small>%</small></b></div>
      <div title="Focus recovery"><span>FOC</span><b>${focusRecoveryOf(state.player)}</b></div>
    </div>
    <div class="hud-xp"><div class="hud-xp-label"><span>Experience</span><b>${state.player.experience} / ${nextLevelXp} XP</b></div><div class="xp-track"><i style="width:${xpProgress}%"></i></div></div>
    <div class="hud-value hud-gold"><span>Gold</span><b>${state.player.gold} <small>g</small></b></div>
  </section>`;
};

const attributeInfo: Record<Attribute, { label: string; effect: string }> = {
  strength: { label: "Strength", effect: "Physical damage" },
  dexterity: { label: "Dexterity", effect: "Melee hit chance" },
  intelligence: { label: "Intelligence", effect: "Casting hit chance" },
  wisdom: { label: "Wisdom", effect: "Casting damage" },
  vitality: { label: "Vitality", effect: "Maximum health and guard" },
};

const tileNames: Record<TileType, string> = {
  standard: "Open ground", sanctuary: "Sanctuary", "weapon-shop": "Weapon shop", "armor-shop": "Armor shop", bank: "Bank",
  "charm-shop": "Charm shop", entrance: "Zone entrance", subzone: "Sub-zone entrance",
};
const tileGlyph: Record<TileType, string> = { standard: "·", sanctuary: "✧", "weapon-shop": "⚔", "armor-shop": "▣", "charm-shop": "◇", bank: "$", entrance: "↗", subzone: "⌄" };

const locationPanel = (state: GameState): string => {
  const zone = zoneOf(state.location);
  const tile = tileTypeAt(zone, state.location.x, state.location.y);
  const connection = zone.connections[`${state.location.x},${state.location.y}`];
  const map = Array.from({ length: zone.height }, (_, y) => `<div class="world-map-row">${Array.from({ length: zone.width }, (_, x) => {
    const kind = tileTypeAt(zone, x, y);
    const current = x === state.location.x && y === state.location.y;
    const adjacent = state.phase !== "active" && isAdjacent(state.location, x, y);
    return `<button type="button" class="map-tile tile-${kind} ${current ? "current" : ""}" data-map-x="${x}" data-map-y="${y}" title="${tileNames[kind]} · ${x + 1}, ${y + 1}" aria-label="${current ? "Your location: " : ""}${tileNames[kind]}, ${x + 1}, ${y + 1}" ${adjacent ? "" : "disabled"}>${current ? "●" : tileGlyph[kind]}</button>`;
  }).join("")}</div>`).join("");
  const movement = [[-1, -1, "↖"], [0, -1, "↑"], [1, -1, "↗"], [-1, 0, "←"], [0, 0, "●"], [1, 0, "→"], [-1, 1, "↙"], [0, 1, "↓"], [1, 1, "↘"]] as const;
  const movementGrid = `<div class="compass movement-grid" role="group" aria-label="Move around the zone">${movement.map(([dx, dy, icon]) => {
    if (dx === 0 && dy === 0) return `<span class="compass-center" aria-label="Current position">${icon}</span>`;
    const x = state.location.x + dx;
    const y = state.location.y + dy;
    const canMove = state.phase !== "active" && x >= 0 && y >= 0 && x < zone.width && y < zone.height;
    const label = `Move ${dy < 0 ? "north" : dy > 0 ? "south" : ""}${dx !== 0 && dy !== 0 ? "-" : ""}${dx < 0 ? "west" : dx > 0 ? "east" : ""}`;
    return `<button type="button" data-map-x="${x}" data-map-y="${y}" aria-label="${label}" title="${label}" ${canMove ? "" : "disabled"}>${icon}</button>`;
  }).join("")}</div>`;
  return `
  <section class="hud-panel location-panel" aria-label="Location">
    <div class="location-heading"><h2>${escapeHtml(zone.name)}</h2></div>
    <div class="location-tabs" role="tablist"><button class="location-tab ${locationView === "details" ? "active" : ""}" data-location-view="details" role="tab" aria-selected="${locationView === "details"}">Details</button><button class="location-tab ${locationView === "map" ? "active" : ""}" data-location-view="map" role="tab" aria-selected="${locationView === "map"}">Zone map</button></div>
    ${locationView === "details" ? `<dl class="coords"><div><dt>COORDINATES</dt><dd>${state.location.x + 1}, ${state.location.y + 1}</dd></div><div><dt>TILE</dt><dd>${tileNames[tile]}</dd></div></dl>${movementGrid}
      ${connection ? `<div class="entrance-card"><strong>${escapeHtml(connection.name)}</strong><span>${connection.requiredLevel ? `Requires level ${connection.requiredLevel}` : "Entrance"}</span><button type="button" class="quiet-button" data-game-action="enter-zone" ${state.player.level >= (connection.requiredLevel ?? 1) && state.phase !== "active" ? "" : "disabled"}>Enter zone</button></div>` : ""}
      ` : `<div class="world-map" style="--map-width:${zone.width}" role="group" aria-label="Full map of ${escapeHtml(zone.name)}">${map}</div><div class="map-legend">${(Object.keys(tileNames) as TileType[]).map((kind) => `<span class="tile-${kind}"><i>${tileGlyph[kind]}</i>${tileNames[kind]}</span>`).join("")}</div>${movementGrid}`}
  </section>`;
};

const shopPanel = (state: GameState): string => {
  const zone = zoneOf(state.location);
  const slot = slotAtShopTile(tileTypeAt(zone, state.location.x, state.location.y));
  if (!slot) return "";
  const stock = shopStockFor(zone.id, slot);
  return `<section class="hud-panel shop-panel" aria-label="${slot} shop"><p class="eyebrow">${escapeHtml(slot.toUpperCase())} SHOP</p><h2>${escapeHtml(zone.name)} stock</h2><div class="shop-stock">${stock.map((item) => `<article><div><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.description)}</small><span>${itemModifierSummary(item)}</span></div><button type="button" class="quiet-button" data-game-action="buy-item" data-item-id="${item.id}" ${state.phase !== "active" && state.player.gold >= item.value ? "" : "disabled"}>${item.value}g · Buy</button></article>`).join("")}</div></section>`;
};

const itemModifierSummary = (item: Item): string => {
  const modifiers = [
    item.power && `Physical damage ${signed(item.power)}`,
    item.guard && `Guard ${signed(item.guard)}`,
    item.maxHealth && `Health ${signed(item.maxHealth)}`,
    item.criticalChance && `Crit ${signed(item.criticalChance)}%`,
    item.evasion && `Evasion ${signed(item.evasion)}%`,
    item.focus && `Focus ${signed(item.focus)}`,
    ...Object.entries(item.attributes ?? {}).map(([attribute, value]) => `${attributeInfo[attribute as Attribute].label} ${signed(value)}`),
  ].filter((value): value is string => Boolean(value));
  return modifiers.length > 0 ? modifiers.join(" · ") : "No combat modifiers";
};

const itemModifierTokens = (item: Item): string => {
  const allModifiers: [string, number, string][] = [
    ["Physical", item.power, "power"], ["Guard", item.guard, "guard"], ["Health", item.maxHealth, "health"],
    ["Crit", item.criticalChance, "percent"],
    ["Evasion", item.evasion, "percent"], ["Focus", item.focus, "focus"],
  ];
  const modifiers = allModifiers.filter(([, value]) => value !== 0);
  for (const [attribute, value] of Object.entries(item.attributes ?? {})) {
    modifiers.push([attributeInfo[attribute as Attribute].label, value, "attribute"]);
  }
  return modifiers.map(([label, value, kind]) => `<span class="gear-bonus bonus-${kind}"><b>${signed(value)}${kind === "percent" ? "%" : ""}</b><small>${label}</small></span>`).join("");
};

const bankPanel = (state: GameState): string => `<section class="hud-panel tile-content bank-content" aria-label="Bank"><p class="eyebrow">WAKING GARDEN BANK</p><h2>Keep your gold safe</h2><p class="muted">Gold stored here is protected if you fall. Carried gold and part of your current-level experience are lost on defeat.</p><div class="bank-balances"><div><span>Carried</span><strong>${state.player.gold}g</strong></div><div><span>Stored</span><strong>${state.player.bankedGold}g</strong></div></div><div class="bank-actions"><button type="button" class="fight-button" data-game-action="bank-deposit" ${state.phase !== "active" && state.player.gold > 0 ? "" : "disabled"}>Deposit all carried gold</button><button type="button" class="quiet-button" data-game-action="bank-withdraw" ${state.phase !== "active" && state.player.bankedGold > 0 ? "" : "disabled"}>Withdraw all stored gold</button></div></section>`;

const sanctuaryPanel = (state: GameState): string => {
  const zone = zoneOf(state.location);
  const canRest = state.phase !== "active" && (state.phase === "defeat" || state.player.hp < state.player.maxHp);
  return `<section class="hud-panel tile-content sanctuary-content" aria-label="Sanctuary"><p class="eyebrow">SANCTUARY</p><h2>Rest and recover</h2><p class="muted">This sanctuary is bound to ${escapeHtml(zone.name)}. Rest here to restore your health and return to the hunt.</p><div class="sanctuary-health"><span>Health</span><strong>${state.phase === "defeat" ? 0 : state.player.hp} / ${state.player.maxHp}</strong><i><b style="width:${state.phase === "defeat" ? 0 : ratioOf(state.player.hp, state.player.maxHp) * 100}%"></b></i></div><button type="button" class="fight-button" data-game-action="rest" ${canRest ? "" : "disabled"}>${state.phase === "defeat" ? "Revive here" : "Rest and recover"}</button></section>`;
};

const entrancePanel = (state: GameState): string => {
  const zone = zoneOf(state.location);
  const connection = zone.connections[`${state.location.x},${state.location.y}`];
  if (!connection) return battlePanel(state);
  const required = connection.requiredLevel ?? 1;
  const canEnter = state.phase !== "active" && state.player.level >= required;
  return `<section class="hud-panel tile-content entrance-content" aria-label="Zone entrance"><p class="eyebrow">${tileTypeAt(zone, state.location.x, state.location.y) === "subzone" ? "SUB-ZONE GATE" : "ZONE ENTRANCE"}</p><h2>${escapeHtml(connection.name)}</h2><p class="muted">${canEnter ? "The path is open." : `Requires level ${required} to enter.`}</p><button type="button" class="fight-button" data-game-action="enter-zone" ${canEnter ? "" : "disabled"}>Enter ${escapeHtml(connection.name)}</button></section>`;
};

const locationContent = (state: GameState): string => {
  const zone = zoneOf(state.location);
  const tile = tileTypeAt(zone, state.location.x, state.location.y);
  if (tile === "bank") return `${bankPanel(state)}<div id="arena-canvas" class="arena-parking" aria-hidden="true"></div>`;
  if (slotAtShopTile(tile)) return `${shopPanel(state)}<div id="arena-canvas" class="arena-parking" aria-hidden="true"></div>`;
  if (tile === "sanctuary") return `${sanctuaryPanel(state)}<div id="arena-canvas" class="arena-parking" aria-hidden="true"></div>`;
  if (tile === "entrance" || tile === "subzone") return `${entrancePanel(state)}<div id="arena-canvas" class="arena-parking" aria-hidden="true"></div>`;
  return battlePanel(state);
};

const isPlayerTurnLog = (entry: string): boolean =>
  entry.startsWith("You Strike") || entry.startsWith("Your Strike") || entry.startsWith("You cast") || entry.startsWith("Your spell") || entry.startsWith("You Brace") || entry.startsWith("You Focus") || entry.startsWith("Veilsight");

const roundFeed = (state: GameState): string => {
  const turns = [...state.log].reverse().filter((entry) =>
    entry.startsWith("You Strike") || entry.startsWith("Your Strike") || entry.startsWith("You cast") || entry.startsWith("Your spell") || entry.startsWith("You Brace") || entry.startsWith("You Focus") || entry.startsWith("Veilsight") || entry.startsWith(`${state.enemy.name} uses `) || entry.startsWith(`${state.enemy.name} veils`) || entry.startsWith(`You evade ${state.enemy.name}`),
  );
  if (turns.length === 0) return `<div class="round-feed-empty">The first round is about to begin.</div>`;
  return `<ol class="round-feed" aria-label="Combat round results">${turns.map((entry, index) => `<li class="${isPlayerTurnLog(entry) ? "player-turn" : "enemy-turn"}"><span>${index % 2 === 0 ? "WAYFINDER" : escapeHtml(state.enemy.name.toUpperCase())}</span><p>${escapeHtml(entry)}</p></li>`).join("")}</ol>`;
};

const rewardsCard = (rewards: RewardSummary, state: GameState): string => `
  <div class="overlay reward-card" role="status">
    <p class="eyebrow">VICTORY</p>
    <h2>${escapeHtml(state.enemy.name)} is down</h2>
    <ul class="reward-lines">
      <li><span>Experience</span><b>+${rewards.experience} XP</b></li>
      ${rewards.leveledTo ? `<li class="level-up"><span>Level up</span><b>Level ${rewards.leveledTo}</b></li>` : ""}
      <li><span>Gold</span><b>+${rewards.baseGold}g</b></li>
      ${rewards.milestones
        .map((milestone) => `<li class="milestone"><span>✦ ${escapeHtml(milestone.name)}</span><b>+${milestone.gold}g</b></li>`)
        .join("")}
    </ul>
    ${rewards.material ? `<div class="drop ${rewards.material.rarity}"><span>✦ ${escapeHtml(rewards.material.rarity)} material</span><strong>${escapeHtml(rewards.material.name)} ×${rewards.material.quantity}</strong><em>Used to craft gear enhancements.</em></div>` : `<div class="drop"><span>Hunt reward</span><strong>No material found</strong></div>`}
    ${state.player.unspentAttributePoints > 0 ? `<section class="level-up-choices" aria-label="Choose an attribute to increase"><p class="eyebrow">LEVEL-UP CHOICE</p><h3>Choose an attribute to increase</h3><p class="muted">${state.player.unspentAttributePoints} attribute point${state.player.unspentAttributePoints === 1 ? "" : "s"} remaining. Each choice assigns up to 2 points.</p><div class="attribute-choices">${(Object.keys(attributeInfo) as Attribute[]).map((attribute) => `<button type="button" class="quiet-button" data-game-action="raise-attribute" data-attribute="${attribute}"><strong>${attributeInfo[attribute].label} +${Math.min(2, state.player.unspentAttributePoints)}</strong><small>${attributeInfo[attribute].effect}</small></button>`).join("")}</div></section>` : `<button type="button" class="quiet-button" data-game-action="dismiss-reward">Continue</button>`}
  </div>`;

const defeatCard = (): string => `
  <div class="overlay defeat-card" role="status">
    <p class="eyebrow">DEFEATED</p>
    <h2>You fall back to camp</h2>
    <p class="muted">Your health is restored when you begin another hunt.</p>
    <button type="button" class="quiet-button" data-game-action="dismiss-reward">Continue</button>
  </div>`;

const battlePanel = (state: GameState): string => {
  const active = state.phase === "active";
  const idle = state.phase === "idle";
  const zone = zoneOf(state.location);
  const availableIds = availableEncountersFor(state);
  const availableEncounters = availableIds.map((id) => encounters[id]);
  const overlay =
    state.phase === "victory" && state.lastRewards
      ? rewardsCard(state.lastRewards, state)
      : state.phase === "defeat"
        ? defeatCard()
        : "";
  const fightLabel = active ? "In battle" : state.phase === "idle" ? "Fight" : "Fight again";
  return `
  <section class="hud-panel battle-panel" aria-label="Battle">
    ${availableEncounters.length > 0 ? `<div class="battle-controls">
      <label class="field"><span>Enemy</span>
        <select id="enemy-select" ${active ? "disabled" : ""}>
          ${availableEncounters
            .map(
              (encounter) =>
                `<option value="${encounter.id}" ${encounter.id === state.encounterId ? "selected" : ""}>${zone.id === "waking-garden" ? `${availableIds.indexOf(encounter.id) + 1}. ` : ""}${escapeHtml(encounter.name)} · ${escapeHtml(encounter.subtitle)}</option>`,
            )
            .join("")}
        </select>
      </label>
      ${state.phase === "victory" || state.phase === "defeat" || availableEncounters.length === 0 ? "" : `<button type="button" class="fight-button" data-game-action="start" ${active ? "disabled" : ""}>${fightLabel}</button>`}
    </div>` : `<div class="safe-zone-banner"><span>SAFE ZONE</span><strong>${escapeHtml(zone.name)}</strong><p>${zone.id === "wilderness" ? "A frontier crossroads. Use the zone map to find an entrance to the surrounding regions." : "A quiet place to prepare. Use the zone map to walk to the Wilderness entrance."}</p></div>`}
    <div class="arena-frame battle-arena ${availableEncounters.length === 0 ? "safe-arena" : ""}">
      <div id="arena-canvas" aria-label="${idle ? "Empty battle arena" : `Illustrated ${escapeHtml(state.enemy.name)} encounter`}"></div>
      ${idle && availableEncounters.length > 0 ? `<div class="idle-arena-prompt"><span>READY WHEN YOU ARE</span><strong>Choose a trial and begin the hunt</strong></div>` : ""}
      <div class="float-layer" aria-live="polite">${floatingNumbers(state)}</div>
      ${!idle ? `<div class="nameplate player-plate"><span class="plate-name">Wayfinder</span>${animatedBar(state.player.hp, state.player.maxHp, "player")}</div><div class="nameplate enemy-plate"><span class="plate-name">${escapeHtml(state.enemy.name)}</span>${animatedBar(state.enemy.hp, state.enemy.maxHp, "enemy")}</div>` : ""}
      ${active ? roundFeed(state) : ""}
      ${overlay}
    </div>
    ${active ? `<div class="action-row">
      <button type="button" class="action-button" data-game-action="strike" ${active ? "" : "disabled"}>Attack</button>
      <button type="button" class="action-button" data-game-action="cast" ${active ? "" : "disabled"}>Cast</button>
      <button type="button" class="action-button" data-game-action="brace" ${active ? "" : "disabled"}>Brace</button>
      <button type="button" class="action-button" data-game-action="focus" ${active ? "" : "disabled"}>Focus</button>
    </div>` : ""}
  </section>`;
};

const itemCard = (item: Item, state: GameState, selected: boolean): string => {
  const isEquipped = Object.values(state.player.equipment).includes(item.id);
  const modifiers = [
    ["Physical damage", item.power], ["Guard", item.guard], ["Health", item.maxHealth],
    ["Crit", item.criticalChance], ["Evasion", item.evasion], ["Focus", item.focus],
  ].filter(([, value]) => value !== 0) as [string, number][];
  for (const [attribute, amount] of Object.entries(item.attributes ?? {})) {
    modifiers.push([attributeInfo[attribute as Attribute].label, amount]);
  }
  return `
    <article class="item-card ${item.rarity} ${selected ? "selected" : ""}">
      <div class="item-topline"><span class="rarity-tag">${item.rarity}</span>${isEquipped ? `<span class="equipped-tag">equipped</span>` : ""}</div>
      <h3>${escapeHtml(item.name)}</h3>
      <p>${escapeHtml(item.description)}</p>
      ${traitLine(item)}
      <p class="item-slot-label">${item.slot}</p>
      <p class="item-slot-label">Enhancement capacity · ${item.enhancements.length} / ${item.enhancementCapacity}${item.enhancements.length ? ` · ${item.enhancements.map((id) => escapeHtml(enhancements[id].name)).join(", ")}` : ""}</p>
      <dl class="item-stats">${modifiers.map(([label, value]) => `<div><dt>${label}</dt><dd>${signed(value)}</dd></div>`).join("")}<div><dt>Value</dt><dd>${item.value}g</dd></div></dl>
      <div class="item-actions">
        <button type="button" class="quiet-button" data-action="equip" data-item-id="${item.id}" ${isEquipped || state.phase === "active" ? "disabled" : ""}>Equip</button>
        <button type="button" class="quiet-button" data-action="sell" data-item-id="${item.id}" ${isEquipped || state.phase === "active" ? "disabled" : ""}>Sell ${item.value}g</button>
      </div>
    </article>`;
};

const equipmentPanel = (state: GameState, inspected: Item): string => `
  <section class="hud-panel pack-panel equipment-panel" aria-label="Equipment and inventory">
    <div class="equipment-tabs" role="tablist" aria-label="Equipment views">
      <button type="button" class="equipment-tab ${gearView === "equipment" ? "active" : ""}" data-gear-view="equipment" role="tab" aria-selected="${gearView === "equipment"}">Equipment</button>
      <button type="button" class="equipment-tab ${gearView === "inventory" ? "active" : ""}" data-gear-view="inventory" role="tab" aria-selected="${gearView === "inventory"}">Inventory (${state.player.inventory.length})</button>
    </div>
    ${gearView === "equipment" ? `
    <p class="eyebrow">EQUIPPED GEAR</p><h2>Your loadout</h2>
    <div class="gear-slots">
      ${(["weapon", "armor", "charm"] as GearSlot[]).map((slot) => {
        const equipped = state.player.inventory.find((item) => item.id === state.player.equipment[slot]);
        return `<div class="gear-slot gear-${slot} ${equipped ? "" : "unavailable"}"><div class="gear-slot-heading"><span>${slot === "charm" ? "Accessory" : slot}</span><b>${equipped ? escapeHtml(equipped.rarity) : "OPEN SLOT"}</b></div><strong>${escapeHtml(equipped?.name ?? "Empty")}</strong>${equipped ? `<div class="gear-bonus-list">${itemModifierTokens(equipped)}</div>${equipped.trait ? `<small class="gear-trait"><b>${escapeHtml(equipped.trait.name)}</b> · ${escapeHtml(equipped.trait.text)}</small>` : ""}` : `<small>No gear equipped</small>`}</div>`;
      }).join("")}
    </div>
    <div class="loadout-summary"><p class="eyebrow">ACTIVE CHARACTER STATS</p><div class="loadout-values"><span>Physical damage <b>${powerOf(state.player)}</b></span><span>Casting damage <b>${spellPowerOf(state.player)}</b></span><span>Guard <b>${guardOf(state.player)}</b></span><span>Evasion <b>${evasionOf(state.player)}%</b></span><span>Critical <b>${criticalChanceOf(state.player)}%</b></span><span>Focus <b>${focusRecoveryOf(state.player)}</b></span><span>Max health <b>${maxHealthOf(state.player)}</b></span></div></div>
    <div class="crafting-summary"><p class="eyebrow">CRAFTING · LEVEL ${state.player.craftingLevel}</p><div>${Object.values(materials).map((material) => `<span>${escapeHtml(material.name)} <b>${state.player.materials[material.id] ?? 0}</b></span>`).join("")}</div><small>${state.player.craftingExperience} / ${25 + (state.player.craftingLevel - 1) * 25} craft XP</small></div>` : `
    <p class="eyebrow">INVENTORY / ${state.player.inventory.length} ITEMS</p><h2>Relics carried</h2>
    <label class="inventory-select-label" for="inventory-select">Select an item</label>
    <select id="inventory-select" class="inventory-select" aria-label="Select an inventory item">${state.player.inventory.map((item) => `<option value="${item.id}" ${item.id === inspected.id ? "selected" : ""}>${escapeHtml(item.name)} · ${item.slot}${Object.values(state.player.equipment).includes(item.id) ? " · equipped" : ""}</option>`).join("")}</select>
    <div class="item-detail">${itemCard(inspected, state, true)}</div>
    <section class="crafting-summary"><p class="eyebrow">CRAFTING · LEVEL ${state.player.craftingLevel}</p><p>Material stock: ${Object.values(materials).map((material) => `${escapeHtml(material.name)} ×${state.player.materials[material.id] ?? 0}`).join(" · ")}</p><h3>Available recipes</h3>${Object.values(enhancements).map((recipe) => `<article><strong>${escapeHtml(recipe.name)}</strong><small>+${Object.entries(recipe.bonus).map(([key,value])=>`${value} ${key}`).join(", ")} · ${escapeHtml(materials[recipe.material].name)} · Level ${recipe.requiredCraftingLevel}</small><button type="button" class="quiet-button" data-game-action="craft-enhancement" data-enhancement-id="${recipe.id}" data-item-id="${inspected.id}" ${state.phase !== "active" && state.player.craftingLevel >= recipe.requiredCraftingLevel && (state.player.materials[recipe.material] ?? 0) > 0 && inspected.enhancements.length < inspected.enhancementCapacity ? "" : "disabled"}>Apply to selected gear (${inspected.enhancements.length}/${inspected.enhancementCapacity})</button></article>`).join("")}</section>
    <div class="collection-log"><p class="eyebrow">MATERIAL LEDGER</p><ul>${Object.values(materials).map((material) => `<li class="found">${escapeHtml(material.name)} <span>${state.player.materials[material.id] ?? 0} · ${material.rarity}</span></li>`).join("")}</ul></div>
    `}
  </section>`;

const specialtyPanel = (state: GameState): string => {
  const canUpgrade = state.player.level >= 2 && state.player.gold >= 8;
  return `
  <section class="hud-panel">
    <p class="eyebrow">LEVEL 2 SPECIALTY</p>
    <h2>Spend knowledge</h2>
    <p class="muted">Each specialty costs 8 gold. Edgecraft and Bulwark are general; Veilsight rewards hunting the Glasswing Moth.</p>
    ${(["edgecraft", "bulwark", "veilsight"] as const)
      .map(
        (upgradeId) => `
      <button type="button" class="upgrade-button" data-game-action="upgrade" data-upgrade-id="${upgradeId}" ${canUpgrade && !state.player.upgrades.includes(upgradeId) ? "" : "disabled"}>
        <span><strong>${upgradeLabels[upgradeId].name}</strong><small>${upgradeLabels[upgradeId].description}</small></span>
        <b>${state.player.upgrades.includes(upgradeId) ? "Chosen" : "8g"}</b>
      </button>`,
      )
      .join("")}
  </section>`;
};

const chatDock = (): string => {
  const visible = chatLines.filter((line) => line.channel === "system" || line.channel === chatChannel);
  return `
  <section class="hud-panel chat-dock" aria-label="Chat">
    <div class="chat-tabs" role="tablist">
      <button type="button" role="tab" class="chat-tab ${chatChannel === "global" ? "active" : ""}" data-chat-channel="global" aria-selected="${chatChannel === "global"}">Global</button>
      <button type="button" role="tab" class="chat-tab ${chatChannel === "battle" ? "active" : ""}" data-chat-channel="battle" aria-selected="${chatChannel === "battle"}">Battle</button>
      <span class="chat-note">Local preview · not yet networked</span>
    </div>
    <ol class="chat-lines" id="chat-lines">${visible
      .map((line) => `<li class="${line.channel}"><b>${escapeHtml(line.author)}</b> ${escapeHtml(line.text)}</li>`)
      .join("")}</ol>
    <form class="chat-form" data-chat-form>
      <input id="chat-input" type="text" maxlength="200" autocomplete="off" placeholder="Say something in ${chatChannel} chat" value="${escapeHtml(chatDraft)}" aria-label="Chat message" />
      <button type="submit" class="fight-button">Send</button>
    </form>
  </section>`;
};

const selectedItem = (state: GameState): Item =>
  state.player.inventory.find((item) => item.id === selectedItemId) ?? state.player.inventory[0];

const settingsMenu = ({ report }: DevActions): string => `
  <details class="settings-menu" ${report ? "open" : ""}>
    <summary aria-label="Open settings"><span aria-hidden="true">⚙</span> Settings</summary>
    <div class="settings-menu-body">
      <p class="eyebrow">DEVELOPER OPTIONS</p>
      <h2>Progression tools</h2>
      <p>Reset the local character to a new Wayfinder, or simulate 20 fresh characters to the level 50 Wilderness gate using the current combat rules.</p>
      <div class="dev-actions"><button type="button" class="quiet-button" data-dev-action="reset">Start over as a new player</button><button type="button" class="fight-button" data-dev-action="simulate">Simulate early progression · 20 runs</button></div>
      ${report ? `<div class="dev-report" role="status"><strong>Simulation · ${report.reachedLevel}/${report.runs} reached level 50</strong><div><span>Average battles <b>${report.meanBattles.toFixed(1)}</b></span><span>Average wins <b>${report.meanWins.toFixed(1)}</b></span><span>Average deaths <b>${report.meanDeaths.toFixed(1)}</b></span><span>Average final level <b>${report.meanLevel.toFixed(1)}</b></span></div><ul>${report.monsters.filter((monster) => monster.wins || monster.losses).map((monster) => `<li>${escapeHtml(monster.name)} <span>${monster.wins} wins · ${monster.losses} losses</span></li>`).join("")}</ul><small>Uses the game reducer and a repeatable seed. Characters reveal the next trial after a win, spend level points between hunts, and retreat to recover after defeat; shop purchases are not simulated.</small></div>` : ""}
    </div>
  </details>`;

const bindEvents = (root: HTMLElement, dispatch: Dispatch, refresh: () => void, devActions?: DevActions): void => {
  root.querySelectorAll<HTMLButtonElement>("button[data-game-action]").forEach((button) => {
    button.addEventListener("click", () => {
      const action = button.dataset.gameAction;
      if (action === "start" || action === "strike" || action === "cast" || action === "brace" || action === "focus") {
        dispatch({ type: action });
      } else if (action === "enter-zone") {
        dispatch({ type: "enter-zone" });
      } else if (action === "rest") {
        dispatch({ type: "rest" });
      } else if (action === "bank-deposit") {
        dispatch({ type: "bank-deposit" });
      } else if (action === "bank-withdraw") {
        dispatch({ type: "bank-withdraw" });
      } else if (action === "buy-item") {
        const itemId = button.dataset.itemId;
        if (itemId) dispatch({ type: "buy-item", itemId });
      } else if (action === "craft-enhancement") {
        const itemId = button.dataset.itemId;
        const enhancementId = button.dataset.enhancementId;
        if (itemId && (enhancementId === "keen-edge" || enhancementId === "vital-weave" || enhancementId === "warding-knot")) dispatch({ type: "craft-enhancement", itemId, enhancementId });
      } else if (action === "dismiss-reward") {
        dispatch({ type: "dismiss-reward" });
      } else if (action === "raise-attribute") {
        const attribute = button.dataset.attribute;
        if (attribute === "strength" || attribute === "dexterity" || attribute === "intelligence" || attribute === "wisdom" || attribute === "vitality") {
          dispatch({ type: "raise-attribute", attribute });
        }
      } else if (action === "toggle-guaranteed-rare") {
        dispatch({ type: "toggle-guaranteed-rare" });
      } else if (action === "upgrade") {
        const upgradeId = button.dataset.upgradeId;
        if (upgradeId === "edgecraft" || upgradeId === "bulwark" || upgradeId === "veilsight") {
          dispatch({ type: "upgrade", upgradeId });
        }
      }
    });
  });

  root.querySelectorAll<HTMLButtonElement>("button[data-dev-action]").forEach((button) => {
    button.addEventListener("click", () => {
      if (button.dataset.devAction === "reset") devActions?.reset();
      if (button.dataset.devAction === "simulate") devActions?.simulate();
    });
  });

  const enemySelect = root.querySelector<HTMLSelectElement>("#enemy-select");
  enemySelect?.addEventListener("change", () => {
    const value = enemySelect.value as EncounterId;
    if (value in encounters) dispatch({ type: "select-encounter", encounterId: value });
  });

  const inventorySelect = root.querySelector<HTMLSelectElement>("#inventory-select");
  inventorySelect?.addEventListener("change", () => {
    selectedItemId = inventorySelect.value;
    refresh();
  });

  root.querySelectorAll<HTMLButtonElement>("button[data-action]").forEach((button) => {
    button.addEventListener("click", () => {
      const itemId = button.dataset.itemId;
      if (!itemId) {
        return;
      }
      if (button.dataset.action === "inspect") {
        selectedItemId = itemId;
        refresh();
      } else if (button.dataset.action === "equip") {
        selectedItemId = itemId;
        dispatch({ type: "equip", itemId });
      } else if (button.dataset.action === "sell") {
        dispatch({ type: "sell", itemId });
      }
    });
  });

  root.querySelectorAll<HTMLButtonElement>("[data-gear-view]").forEach((button) => {
    button.addEventListener("click", () => {
      const view = button.dataset.gearView;
      if (view === "equipment" || view === "inventory") {
        gearView = view;
        refresh();
      }
    });
  });

  root.querySelectorAll<HTMLButtonElement>("[data-location-view]").forEach((button) => {
    button.addEventListener("click", () => {
      const view = button.dataset.locationView;
      if (view === "details" || view === "map") {
        locationView = view;
        refresh();
      }
    });
  });
  root.querySelectorAll<HTMLButtonElement>("[data-map-x][data-map-y]").forEach((button) => {
    button.addEventListener("click", () => {
      const x = Number(button.dataset.mapX);
      const y = Number(button.dataset.mapY);
      if (Number.isInteger(x) && Number.isInteger(y)) dispatch({ type: "move-to", x, y });
    });
  });

  root.querySelectorAll<HTMLButtonElement>("[data-chat-channel]").forEach((button) => {
    button.addEventListener("click", () => {
      const channel = button.dataset.chatChannel;
      if (channel === "global" || channel === "battle") {
        chatChannel = channel;
        refresh();
      }
    });
  });

  const chatInput = root.querySelector<HTMLInputElement>("#chat-input");
  chatInput?.addEventListener("input", () => {
    chatDraft = chatInput.value;
  });
  chatInput?.addEventListener("focus", () => {
    chatFocused = true;
  });
  chatInput?.addEventListener("blur", () => {
    chatFocused = false;
  });
  root.querySelector<HTMLFormElement>("[data-chat-form]")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const text = chatDraft.trim();
    if (!text) {
      return;
    }
    chatLines = [...chatLines, { channel: chatChannel, author: "Wayfinder", text }];
    chatDraft = "";
    refresh();
  });

  const chatList = root.querySelector<HTMLOListElement>("#chat-lines");
  if (chatList) {
    chatList.scrollTop = chatList.scrollHeight;
  }
  if (chatFocused && chatInput) {
    chatInput.focus();
    chatInput.setSelectionRange(chatInput.value.length, chatInput.value.length);
  }
};

export const renderApp = (
  root: HTMLElement,
  state: GameState,
  dispatch: Dispatch,
  refresh: () => void,
  devActions?: DevActions,
): void => {
  const existingArena = root.querySelector<HTMLElement>("#arena-canvas");
  announceOutcome(state);
  const inspected = selectedItem(state);

  root.innerHTML = `
    <a class="skip-link" href="#game-content">Skip to game</a>
    <main class="game-shell" id="game-content">
      <header class="topbar">
        ${characterPanel(state)}
        ${devActions ? settingsMenu(devActions) : ""}
      </header>
      <div class="workspace">
        <aside class="column">${locationPanel(state)}</aside>
        <div class="column column-center"><div class="zone-window">${locationContent(state)}</div>${chatDock()}</div>
        <aside class="column">${equipmentPanel(state, inspected)}${specialtyPanel(state)}</aside>
      </div>
    </main>`;

  if (existingArena) {
    root.querySelector<HTMLElement>("#arena-canvas")?.replaceWith(existingArena);
  }
  bindEvents(root, dispatch, refresh, devActions);
};
