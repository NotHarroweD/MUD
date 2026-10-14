# Authoritative services plan

Status: planning document, 2026-10-13. Nothing in this document is implemented. The prototype is entirely client-side and must not be treated as secure multiplayer persistence.

## Why this exists

The brief requires that the client never decide its own rewards, damage, currency balance, or item ownership. Today the browser decides all of them. This plan lists what currently runs on the client, what a server must own, and the order in which to introduce that ownership without rewriting the game rules.

## What runs on the client today

Everything in `src/game/` runs in the browser:

- Combat resolution: strike, Brace, Focus, damage, and enemy intent cycles (`engine.ts`, `content.ts`).
- Loot selection: `chooseLoot` picks the reward from the victory count and the rare-loot test flag (`loot.ts`).
- Currency: gold is granted on victory (12 base, plus milestone and salvage gold), spent on upgrades (8), and gained by selling (item value).
- Inventory and ownership: the pack, equipped relic, and discovered collection live in one `GameState` object.
- Progression: experience, level, encounter win counts, and titles.
- The `guaranteedRare` toggle, which lets any player force a rare reward.

Any of these can be changed by editing the page. The rare-loot toggle and `window.render_game_to_text` already show that the state is inspectable and writable from the console.

## What the server must own

| Authority | Server responsibility | Client role |
| --- | --- | --- |
| Encounter outcome | Holds enemy state, validates each action, resolves damage and enemy turns | Sends an intent (strike, brace, focus) and renders the returned result |
| Randomness and loot | Draws loot and any rare roll from a server seed; the client never chooses a reward | Displays the reward it was sent |
| Currency | Single source of truth for gold; applies victory, milestone, salvage, sale, and purchase changes | Requests a sale or purchase and shows the new balance |
| Inventory and equipment | Owns item instances and their ownership; validates equip and sell requests | Requests equip and sell; renders the server's pack |
| Progression and titles | Awards experience, levels, milestones, and titles | Displays them |
| Leaderboards and records | Computes rankings from server-recorded outcomes only | Displays rankings |

## Actions the server must reject

- A strike, brace, or focus outside an active encounter.
- An action in an encounter the player is not in.
- A sale of an equipped item or of an item the player does not own.
- An upgrade the player cannot afford or has already bought.
- Any reward not drawn from the server seed (including the rare-loot test).
- Any client-supplied damage, HP, gold, or item fields. The request body carries only the intent and the target id.

## Encounter seeds

A hunt starts when the server creates an encounter record: encounter id, a seed, the player's snapshot (level, equipped item, upgrades), and the enemy's starting state. The seed determines loot and any future randomness. The server stores the seed with the encounter so an outcome can be audited and replayed deterministically from the rules in `src/game/`.

Because the rules module is framework-independent and deterministic, the same functions can run on the server. The client then becomes a renderer with an optimistic preview at most. The server result is always the truth.

## Persistence

The prototype has no persistence; state resets on refresh. Introducing persistence means:

1. A player account with a stable id. Identity must be authenticated server-side; the client never asserts its own id.
2. A character record: level, experience, gold, titles, win counts, and upgrades.
3. An item table: each owned item is a row with an owner, a template id, and a creation event. Duplicated items are never created by editing a row, only by an audited grant.
4. A ledger for gold: every change to gold is an entry with a reason (victory, milestone, salvage, sale, upgrade), so balances can be reconciled.

## Build order

1. **Pure-rules service.** Run the existing `reduceGame` on the server for one encounter type behind a single endpoint. Keep the browser rendering only. No accounts yet; the server holds state in memory for one session.
2. **Seeded encounters.** Move loot and rare rolls onto the server seed. Remove the client rare toggle from any non-development build.
3. **Accounts and characters.** Add authentication and a persistent character record. Only then add real storage.
4. **Item and gold ledger.** Replace in-memory inventory and gold with ledger-backed records and audited grants.
5. **Leaderboards.** Compute rankings from ledger and encounter records only.
6. **Multiplayer features** (parties, trading, markets). Out of scope until steps 1 through 5 are verified.

## Open questions

- Hosting, storage technology, and authentication provider. These need a decision before step 3; no account or service should be created without owner approval.
- Whether encounter outcomes should be replayable by players for transparency, or kept server-only.
- How to handle client latency for turn-based actions. Ashfall is turn-based, so a request-response loop is likely sufficient; real-time combat would need a different model.

## Verification for each step

- Unit tests for the shared rules run unchanged against the server.
- A test that a tampered client request (changed damage, gold, or item fields) has no effect.
- A reconciliation check that the gold ledger sums to the character balance.
- No secrets or credentials in the repository.
