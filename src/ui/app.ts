import { collectionItems, encounters, milestones, upgradeLabels } from "../game/content";
import { guardOf, powerOf } from "../game/engine";
import type { GameAction, GameState, Intent, Item } from "../game/types";

type Dispatch = (action: GameAction) => void;

let selectedItemId = "cinderhook";

const healthLabel = (current: number, maximum: number): string => `${current} / ${maximum}`;

const signed = (value: number): string => (value >= 0 ? `+${value}` : `${value}`);

const traitLine = (item: Item): string =>
  item.trait ? `<p class="trait-line"><b>${item.trait.name}.</b> ${item.trait.text}</p>` : "";

const intentDetail: Record<Intent, { title: string; detail: string }> = {
  bite: { title: "Bite", detail: "A quick 2 damage attack is coming." },
  "cinder-burst": { title: "Cinder Burst", detail: "Heavy hit incoming. Brace to absorb your Guard." },
  "dust-bite": { title: "Dust Bite", detail: "A 4 damage strike is coming. Brace to absorb your Guard." },
  veil: { title: "Veil", detail: "Your Strikes only scratch now. Focus to recover, or strike and accept the trade." },
};

const intentCopy = (state: GameState): { title: string; detail: string } => {
  if (state.phase !== "active") {
    return { title: "Awaiting hunt", detail: "Choose an encounter, then begin when you are ready." };
  }
  return intentDetail[state.enemy.intent];
};

const encounterPicker = (state: GameState): string => {
  const active = state.phase === "active";
  return `
    <section class="encounter-picker" aria-label="Choose an encounter">
      ${Object.values(encounters)
        .map(
          (encounter) => `
        <button class="encounter-option ${encounter.id === state.encounterId ? "selected" : ""}" data-game-action="select-encounter" data-encounter-id="${encounter.id}" aria-pressed="${encounter.id === state.encounterId}" ${active ? "disabled" : ""}>
          <strong>${encounter.name}</strong><small>${encounter.subtitle}</small><span>${encounter.description}</span>
        </button>`,
        )
        .join("")}
    </section>`;
};

const itemCard = (item: Item, state: GameState, selected: boolean): string => {
  const isEquipped = item.id === state.player.equippedId;
  return `
    <article class="item-card ${item.rarity} ${selected ? "selected" : ""}">
      <div class="item-topline"><span class="rarity-tag">${item.rarity}</span>${isEquipped ? "<span class=\"equipped-tag\">equipped</span>" : ""}</div>
      <h3>${item.name}</h3>
      <p>${item.description}</p>
      ${traitLine(item)}
      <dl class="item-stats"><div><dt>Power</dt><dd>${signed(item.power)}</dd></div><div><dt>Guard</dt><dd>${signed(item.guard)}</dd></div><div><dt>Value</dt><dd>${item.value}g</dd></div></dl>
      <div class="item-actions">
        <button class="quiet-button" data-action="inspect" data-item-id="${item.id}">Inspect</button>
        <button class="quiet-button" data-action="equip" data-item-id="${item.id}" ${isEquipped ? "disabled" : ""}>Equip</button>
        <button class="quiet-button" data-action="sell" data-item-id="${item.id}" ${isEquipped || state.phase === "active" ? "disabled" : ""}>Sell ${item.value}g</button>
      </div>
    </article>`;
};

const selectedItem = (state: GameState): Item =>
  state.player.inventory.find((item) => item.id === selectedItemId) ?? state.player.inventory[0];

const bindEvents = (root: HTMLElement, dispatch: Dispatch, refresh: () => void): void => {
  root.querySelectorAll<HTMLButtonElement>("button[data-game-action]").forEach((button) => {
    button.addEventListener("click", () => {
      const action = button.dataset.gameAction;
      if (action === "start" || action === "strike" || action === "brace" || action === "focus") {
        dispatch({ type: action });
      }
      if (action === "toggle-guaranteed-rare") {
        dispatch({ type: "toggle-guaranteed-rare" });
      }
      if (action === "select-encounter") {
        const encounterId = button.dataset.encounterId;
        if (encounterId === "ashmaw" || encounterId === "glasswing") {
          dispatch({ type: "select-encounter", encounterId });
        }
      }
      if (action === "upgrade") {
        const upgradeId = button.dataset.upgradeId;
        if (upgradeId === "edgecraft" || upgradeId === "bulwark" || upgradeId === "veilsight") {
          dispatch({ type: "upgrade", upgradeId });
        }
      }
    });
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
        return;
      }
      if (button.dataset.action === "equip") {
        selectedItemId = itemId;
        dispatch({ type: "equip", itemId });
        return;
      }
      if (button.dataset.action === "sell") {
        dispatch({ type: "sell", itemId });
      }
    });
  });
};

export const renderApp = (
  root: HTMLElement,
  state: GameState,
  dispatch: Dispatch,
  refresh: () => void,
): void => {
  const existingArena = root.querySelector<HTMLElement>("#arena-canvas");
  if (state.lastReward && !state.player.inventory.some((item) => item.id === selectedItemId)) {
    selectedItemId = state.lastReward.id;
  }
  const intent = intentCopy(state);
  const inspected = selectedItem(state);
  const active = state.phase === "active";
  const canUpgrade = state.player.level >= 2 && state.player.gold >= 8;
  const goal = state.player.level < 2
    ? "Win one hunt to reach level 2 and choose a specialty."
    : state.player.upgrades.length === 0
      ? "Spend 8 gold on a specialty, then hunt with your improved build."
      : "Find and equip Stormglass Fang, then prepare for the future Ember Warden hunt.";

  root.innerHTML = `
    <main class="game-shell">
      <header class="masthead">
        <div><p class="eyebrow">ASHFALL FRONTIER / VERTICAL SLICE</p><h1>Cinderwood Hunt</h1></div>
        <div class="status-chip ${state.guaranteedRare ? "rare-test" : ""}"><span></span>${state.guaranteedRare ? "Rare loot test armed" : "Live loot table"}</div>
      </header>

      <section class="character-strip" aria-label="Character status">
        <div class="identity"><div class="portrait">W</div><div><strong>Wayfinder</strong><span>Level ${state.player.level} · ${state.player.experience} XP</span></div></div>
        <div class="meter"><span>Health</span><div class="meter-track"><i style="width:${(state.player.hp / state.player.maxHp) * 100}%"></i></div><b>${healthLabel(state.player.hp, state.player.maxHp)}</b></div>
        <dl class="quick-stats"><div><dt>Power</dt><dd>${powerOf(state.player)}</dd></div><div><dt>Guard</dt><dd>${guardOf(state.player)}</dd></div><div><dt>Gold</dt><dd>${state.player.gold}</dd></div></dl>
      </section>

      <section class="encounter-grid" aria-label="Cinderwood encounter">
        <div class="arena-frame"><div id="arena-canvas" aria-label="Illustrated ${state.enemy.name} encounter"></div><div class="arena-caption"><span>WAYFINDER</span><span>${state.enemy.name.toUpperCase()}</span></div></div>
        <aside class="intent-panel"><p class="eyebrow">${state.enemy.name.toUpperCase()}'S NEXT MOVE</p><h2>${intent.title}</h2><p>${intent.detail}</p><div class="enemy-health"><span>${state.enemy.name.toUpperCase()}</span><b>${healthLabel(state.enemy.hp, state.enemy.maxHp)}</b></div><div class="meter-track enemy"><i style="width:${(state.enemy.hp / state.enemy.maxHp) * 100}%"></i></div><p class="turn-label">Turn ${state.turn}</p></aside>
      </section>

      ${encounterPicker(state)}

      <section class="action-panel" aria-label="Combat actions">
        <div><p class="eyebrow">MAKE YOUR MOVE</p><p class="action-hint">Every action advances the enemy. Read its intent first.</p></div>
        <div class="action-buttons">
          <button class="primary-button" data-game-action="${active ? "strike" : "start"}">${active ? "Strike" : state.phase === "victory" ? "Hunt Again" : "Begin Hunt"}<small>${active ? (state.enemy.intent === "veil" ? "1 damage while veiled" : `${powerOf(state.player)} damage`) : "Enter Cinderwood"}</small></button>
          <button class="action-button" data-game-action="brace" ${active ? "" : "disabled"}>Brace<small>${active && state.enemy.intent === "veil" ? "No effect during a veil" : `Reduce next hit by ${guardOf(state.player)}`}</small></button>
          <button class="action-button" data-game-action="focus" ${active ? "" : "disabled"}>Focus<small>Restore 3 health</small></button>
        </div>
      </section>

      <section class="lower-grid">
        <article class="panel battle-log"><div class="panel-heading"><div><p class="eyebrow">HUNT LOG</p><h2>What happened</h2></div><button class="quiet-button" data-game-action="toggle-guaranteed-rare">${state.guaranteedRare ? "Disable rare test" : "Test rare loot"}</button></div><ol>${state.log.map((entry) => `<li>${entry}</li>`).join("")}</ol></article>
        <article class="panel goal-card"><p class="eyebrow">NEXT MILESTONE</p><h2>${state.phase === "victory" ? "The trail opens" : "A name in the ash"}</h2><p>${goal}</p><ul class="milestone-list" aria-label="Milestones">${milestones.map((milestone) => `<li class="${state.titles.includes(milestone.id) ? "earned" : ""}"><span>${state.titles.includes(milestone.id) ? "✦ " : ""}${milestone.name}</span><b>${Math.min(state.encounterWins[milestone.encounterId], milestone.wins)} / ${milestone.wins} ${encounters[milestone.encounterId].name} wins</b></li>`).join("")}</ul>${state.lastReward ? `<div class="reward-reveal ${state.lastReward.rarity}"><span>${state.lastReward.rarity === "rare" ? "✦ RARE DISCOVERY" : "HUNT REWARD"}</span><strong>${state.lastReward.name}</strong><em>+${state.lastReward.power} Power · ${signed(state.lastReward.guard)} Guard · ${state.lastReward.value}g value</em></div>` : ""}</article>
      </section>

      <section class="collection-grid">
        <article class="panel inventory-panel"><div class="panel-heading"><div><p class="eyebrow">PACK / ${state.player.inventory.length} ITEMS</p><h2>Relics carried</h2></div></div><div class="item-list">${state.player.inventory.map((item) => itemCard(item, state, item.id === selectedItemId)).join("")}</div><div class="collection-log"><p class="eyebrow">COLLECTION / ${state.discovered.length} OF ${collectionItems.length} FOUND</p><ul>${collectionItems.map((item) => `<li class="${state.discovered.includes(item.id) ? "found" : "missing"}">${state.discovered.includes(item.id) ? `${item.name} <span>${item.rarity}</span>` : "Undiscovered"}</li>`).join("")}</ul></div></article>
        <article class="panel inspection-panel"><p class="eyebrow">ITEM INSPECTION</p><h2>${inspected.name}</h2><p>${inspected.description}</p>${traitLine(inspected)}<dl class="comparison"><div><dt>Current power</dt><dd>${powerOf(state.player)}</dd></div><div><dt>Current guard</dt><dd>${guardOf(state.player)}</dd></div><div><dt>Trade value</dt><dd>${inspected.value} gold</dd></div></dl><p class="inspection-note">${inspected.id === state.player.equippedId ? "This relic is currently shaping your build." : "Compare its stats, then equip it if the tradeoff matches your hunt plan."}</p></article>
        <article class="panel upgrade-panel"><p class="eyebrow">LEVEL 2 SPECIALTY</p><h2>Spend knowledge</h2><p>Each specialty costs 8 gold. Edgecraft and Bulwark are general; Veilsight rewards hunting the Glasswing Moth.</p>${(["edgecraft", "bulwark", "veilsight"] as const).map((upgradeId) => `<button class="upgrade-button" data-game-action="upgrade" data-upgrade-id="${upgradeId}" ${canUpgrade && !state.player.upgrades.includes(upgradeId) ? "" : "disabled"}><span><strong>${upgradeLabels[upgradeId].name}</strong><small>${upgradeLabels[upgradeId].description}</small></span><b>${state.player.upgrades.includes(upgradeId) ? "Chosen" : "8g"}</b></button>`).join("")}</article>
      </section>
    </main>`;

  if (existingArena) {
    root.querySelector<HTMLElement>("#arena-canvas")?.replaceWith(existingArena);
  }
  bindEvents(root, dispatch, refresh);
};
