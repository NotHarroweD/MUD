# Playtest session guide

Purpose: observe five new players completing the Never Ending Reign hunt, and record what they did, not what we hoped they'd do. Follow `docs/PLAYTEST_PLAN.md` for the scenarios and questions. This guide covers how to run a session.

## Before the session

1. Install and start the game on the facilitator's machine:

   ```sh
   cd ~/Documents/MUD
   npm install
   npm run dev -- --host
   ```

   Vite prints a `Network:` address such as `http://192.168.1.20:5173/`. Testers on the same Wi-Fi can open that address. For a more stable build, use `npm run build` followed by `npx vite preview --host --port 4173`.

2. Open the game in a fresh browser window at a desktop size (around 1280px wide). Note the browser and screen size in the session record.

3. Make sure the "Test rare loot" button is not used. It is a developer aid and would bias the loot scenarios.

4. Have the observation sheet below ready, and keep the page open in a window the tester cannot see.

## Running one session (20 to 30 minutes)

- Greet the tester and say: "We're testing the game, not you. There are no wrong moves. Please think out loud."
- Give only this task: "Win one hunt, see what you get, and see if you can make your character stronger."
- Do not explain intents, Brace, equipment, or specialties. If the tester asks, answer with "What do you think it does?" and note the question.
- Do not refresh the page. The game resets on refresh, so a refresh counts as a note, not a fix.
- Stop after the tester has reached a level 2 choice or after 30 minutes, whichever comes first.

## Observation sheet (one per tester)

Record times in seconds from the moment the page loads.

| Item | Observation |
| --- | --- |
| Tester ID, date, browser, screen size | |
| Time to first click on Begin Hunt | |
| Did they read the enemy's next move before striking? (yes/no, quote if useful) | |
| First time they used Brace, and whether they understood what it did | |
| Did they use Focus? When? | |
| Did they explain the Cinder Burst in their own words? Quote it. | |
| Result of the first hunt (won, lost, how many turns) | |
| Did they understand the loot reveal? What did they say the reward was worth? | |
| Did they inspect an item? Did they equip one? Why? | |
| Did they sell anything? Did they know what the gold was for? | |
| Did they understand the level-two specialty choice? Which one? | |
| Did they notice the milestone list? Did they say anything about it? | |
| Did they ever say what their next goal was? Quote it. | |
| Did any action feel useless or obviously dominant? | |
| Where did they get stuck, confused, or ask for help? | |
| Anything they said they enjoyed or disliked | |

## Things to watch for

- Whether the tester understands the intent panel without being told what it means.
- Whether the Brace label (now "No effect during a veil" on veil turns) is read and trusted.
- Whether trait text on relics (Steady Hand, Veil Keen, Stormcharge) changes their decision, or is ignored.
- Whether the Glasswing Moth is chosen at all, and whether testers understand the veil.

## After the session

1. Copy the observation sheet into a new file under `docs/playtests/`, named by date and tester ID, for example `docs/playtests/2026-10-14-P1.md`. Keep quotes verbatim.
2. Add a short summary to `progress.md`, separating what testers did (observed) from what we assumed.
3. Do not change the game after one session. Wait until all five sessions are recorded, then look for patterns. Only then propose changes in `docs/NEXT_MILESTONES.md`, priority 5.

## Privacy

Testers should be told the session is recorded, and that notes will use their ID rather than their name. Do not store personal details in the repository.
