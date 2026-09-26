# Rick-Stars

An unofficial, non-commercial Rick and Morty fan game: a top-down action roguelite in the style of *The Binding of Isaac* and *Enter the Gungeon*. The campaign follows the show one episode at a time. Episode 1, "Pilot" (S01E01), is fully playable; the rest of Season 1 sits on the Season Map as "coming soon".

> **Unofficial fan game. Not affiliated with Adult Swim.** All art, sound and dialogue are original. Sprites are drawn in code, sound effects and music are synthesized with WebAudio, and every line is newly written.

## Running it

You need Node.js 22.12 or newer (the minimum for Vitest 5).

| Command | What it does |
|---|---|
| `npm install` | Installs Phaser 3, plus TypeScript, Vite and Vitest for development |
| `npm run dev` | Starts the dev server at http://localhost:5173 |
| `npm run build` | Builds a static site into `dist/`, with relative paths so it can be hosted from any folder |
| `npm run preview` | Serves the built `dist/` locally |
| `npm test` | Runs the Vitest suite once (`npm run test:watch` keeps it running) |
| `npm run typecheck` | Type-checks everything with `tsc` |

Progress is saved in the browser's `localStorage` under `rick-stars.save`.

## Controls

| Input | Action |
|---|---|
| WASD | Move |
| Mouse | Aim |
| Left click | Fire |
| Arrow keys | Shoot in that direction (optional twin-stick style) |
| Space | Dash, with brief invulnerability |
| Shift | Sneak (walk slowly; it matters at Customs) |
| E | Interact, buy, take |
| Q | Call Rick when the Rick Meter is full |
| F | Toggle the grappling shoes, once Morty has them |
| R | Use your consumable |
| Right click or C | Use your active item |
| Tab or M | Map |
| Esc | Pause; skips cutscenes |
| 1–4 | Answer quiz questions |

Menus work with the mouse, or with W/S or the arrow keys plus Enter, Space or E. A/D or left/right adjust sliders and toggles. Esc goes back.

## How a run works

- **Title → Rick's Garage (the hub) → Season Map.** Pick the Pilot. Start with a random seed, or type one in: 8 characters, shown as `ABCD-EFGH`. The seed is on the pause screen and the end screen, so any run can be replayed.
- **One run is one episode:** a prologue (skippable after your first clear), three procedurally generated acts, then the epilogue.
- **Rooms:** combat rooms lock their doors until they're cleared. Every act has a start room, combat rooms, one treasure room, one shop, one special room and a finale.
- **Health:** Morty starts with 3 hearts and takes damage in half hearts.
- **Scrap** is the only currency. Enemies and cleared rooms drop it, and shops take it. When a run ends, unspent Scrap is banked: half of it on a death (or when you quit), all of it on a clear.
- **Rick Meter:** it fills as you deal damage. When it's full, press Q. Rick barges in, freezes everything on screen with the freeze ray, says something rude and leaves. Frozen enemies shatter on their next hit; bosses take 2.5× damage instead.
- **The Garage** spends banked Scrap on permanent upgrades, kept modest on purpose:
  - a spare heart (two levels);
  - starting every run with a Broken Leg Serum;
  - four items unlocked into the pool;
  - three shirt colors.
- **Clearing the Pilot** unlocks the Mega Seed into the item pool and marks Lawnmower Dog as "next up" on the Season Map.

### What's in the Pilot

| Part | What happens |
|---|---|
| **Prologue: "Just a Test"** | A tutorial in Morty's bedroom and the garage, where Rick yells at him to throw garage junk at the target drones. Then the flight cutscene, and defusing the neutrino bomb from Rick's sleep-mumbled instructions before the timer runs out. |
| **Act 1: Harry Herpson High** | No guns at school: Morty fights with dodgeballs from his gym bag, and starts Sleep-Deprived. Enemies are pop quizzes, hall monitors, dodgeball jocks and cafeteria slop. There's Goldenfold's Pop Quiz room and a vending-machine shop. Morty can't beat Frank Palicky on his own: he pelts him until he's dazed, then Rick walks into the gym and freezes him. |
| **Act 2: Dimension 35-C** | Rick tosses Morty his spare ray gun, because the critters bite. The grappling shoes, starting with the scripted fall and the Broken Leg Serum trip. Invented critters, a Mega Tree grove, a trader critter, and the Big Mega Tree finale, where Morty harvests three Mega Fruit. |
| **Act 3: Interdimensional Customs** | Suspicion: sneak through 3–4 queue rooms past agents and scanners until the checkpoint blows your cover. Then Rick hands over his own ray gun, agents get "ROBOT" nameplates, and there's the Confiscated Goods vault, an overpriced Duty-Free and the Customs Supervisor, followed by a 40-second sprint to the portal home. |
| **Epilogue: "Temporarily a Genius"** | Home, with Rick's gun back in his pocket. Rick's quiz, where the right answers glow. Then the side effects kick in while Rick rambles. |

There are 27 items and 3 synergies (for example Freeze Ray Mod + Frank's Switchblade). The items are:
- 6 from the episode;
- 2 pieces of story gear;
- 19 invented, themed on school, 35-C and customs.

## Debug mode

Add `?debug=1` to the URL, for example http://localhost:5173/?debug=1 (or `#debug` at the end of the URL where query strings don't get through, such as a hosted copy). A **DEBUG** panel sits in the bottom-left corner; click it to expand it. It has:

- an FPS counter, god mode and a hitbox overlay;
- jumping to any act or room, revealing the map, finishing the current finale stage and taking the exit;
- giving any item, spawning any enemy (normal or elite), filling the Rick Meter and killing everything;
- a stress test with 40 enemies and 200 projectiles;
- restarting the run with a typed seed.

The same tools are on `window.rickStars` in the browser console. For example: `rickStars.startRun({ seed: 'ABCDEFGH', act: 2 })`, `rickStars.give('neutrino-bomb')`, `rickStars.state()`.

## Architecture

```
src/
  main.ts            boots Phaser, loads the save, validates the registry
  engine/            knows nothing about specific episodes
    rng.ts           seeded PRNG (sfc32); every random call goes through it
    episodes.ts      episode ids and ordering, canon gating (availableIn), "next up"
    types.ts         the content contract: EpisodeDef, ActDef, EnemyDef, ItemDef, MechanicDef...
    registry.ts      collects all content and validates it
    pools.ts         item and enemy pools for an act, with canon gating and unlocks applied
    brains.ts        reusable enemy AI: chaser, shooter, charger, swarmer
    dungeon/         ASCII room templates and Isaac-style floor generation
    effects/         stats, status effects, inventory and the item hook system
    run/             the state of the current run
    runtime/         Phaser objects: player, enemies, pooled projectiles, telegraphs, rooms, fx
    save/            versioned save with migrations
    audio/           WebAudio sound effects (including a proper burp) and step-sequenced music
    art/             drawing helpers; bakes code-drawn art into textures at boot
    ui/              menus, text styles, the HUD's data model
  content/
    registry.ts      the only file that lists episodes
    balance.ts       the numbers that tune difficulty and pacing
    shared/          characters, items, upgrades and lines used across episodes
    episodes/s01e01-pilot/
      episode.ts  acts.ts  enemies.ts  bosses.ts  items.ts  statuses.ts  rooms.ts
      specialRooms.ts  encounters.ts  dialogue.ts  cutscenes.ts  characters.ts
      art.ts  backdrops.ts  icons.ts
      mechanics/     grapplingShoes.ts, suspicion.ts
  scenes/            Boot, Title, Garage, SeasonMap, Run, Hud, Cutscene, Pause, GameOver
  debug/             the ?debug=1 panel and window.rickStars
tests/               Vitest suites
docs/                ADDING_AN_EPISODE.md
```

Key ideas:

- **Content is typed data plus small behavior functions.** An episode folder exports one `EpisodeDef`: its acts, plus a `content` bundle of characters, items, enemies, rooms, cutscenes and so on. The engine never names an episode, enemy or item.
- **There's one list of episodes.** `src/content/registry.ts` lists all of Season 1. An entry with a `def` is playable; the rest show as "coming soon".
- **Validation runs at boot and in tests.** `validateRegistry` checks that:
  - every referenced id exists;
  - canon gating holds;
  - each procedural act has at least 12 combat templates;
  - every template is sound: door cells open, enemy spawns away from doors, everything reachable;
  - every cutscene has 2–6 panels.

  At boot, problems go to the console and a warning appears on the title screen.
- **Canon gating.** Every piece of content records `firstAppears` (an episode id) and `canon` (true if it's from the show, false if it was invented for this game). An episode may only reference content that has appeared by that point. Item pools apply the same rule to unlocked items, so an unlock from a later episode never leaks into an earlier one.
- **Mechanics are plugins.** A `MechanicDef` gets lifecycle hooks: `onActStart`, `onRoomEnter`, `update`, `onRoomClear`, `onActEnd` and player events. It can also add an optional HUD widget. The Pilot's grappling shoes and suspicion meter are both plugins living in the episode folder.
- **Items use hooks and stat modifiers.**
  - Hooks: `onFire`, `onHit`, `onKill`, `onDamageTaken`, `onDash`, `onDashContact`, `onRoomClear`.
  - Stats combine as (base + every add) × every multiplier, then clamp to limits.
  - Synergies switch on when all of their items are owned.
- **Enemies are generator functions ("brains")** that yield to wait. Every attack goes through `api.windup`. It draws a telegraph that uses shape and motion as well as color, and it can't be shorter than 0.4 s.
- **Determinism.** A run's seed derives separate random streams for floor layouts and for gameplay, so the same seed always builds the same floors. A test fails if `Math.random` appears anywhere in `src/`.
- **Saves are versioned** (currently version 2, with a migration from version 1). A corrupt save, or one from a newer version, is backed up to `rick-stars.save.backup` and replaced with a fresh one instead of crashing the game.

### Differences from the original brief's sketch

The brief sketched a folder layout and some types. The code follows it, with these deliberate differences:

- **Folders.** `engine/combat/` became `engine/runtime/`, since it also holds rooms and effects, plus `engine/brains.ts` for the AI archetypes. The mechanic interface lives in `engine/types.ts` with the rest of the content contract, not in its own `engine/mechanics/` folder.
- **Prologue and epilogue** are playable acts with fixed room layouts and scripts, not just cutscenes. Both have gameplay: the tutorial and the bomb, then the quiz and the side effects.
- **Acts.**
  - `ActDef.finale` is a list of stages, so Customs goes from the Supervisor fight straight into the escape.
  - The room count lives in `ActDef.layout`, and Rick's gadget is `ActDef.rick.gadget`.
  - Each act has one special room.
- **Two extra overlay scenes:** `Hud` and `Pause`.
- **What `balance.ts` holds:** player stats, enemy and boss HP and speed, the Rick Meter, the economy and the Pilot's mechanics. Numbers that define one specific item, status or attack pattern (a flask's heal, a dodgeball's throw speed) live next to that content.
- **Dialogue.** `dialogue.ts` holds what's said during play; cutscene text stays in `cutscenes.ts`.

## Tests

| File | Covers |
|---|---|
| `tests/rng.test.ts` | The same seed gives the same sequence; forks are independent; seeds are created, normalized and formatted correctly |
| `tests/dungeon.test.ts` | 1,000 seeds for every procedural act: 8–12 rooms, every room reachable, exactly one finale, the required special rooms present, no overlapping rooms, doors matching on both sides. The same seed gives the same floor. |
| `tests/content.test.ts` | The registry validates cleanly. Canon gating, including an unlocked later-episode item staying out of the Pilot. Locked, story and already-stocked items stay out of pools. Enemy HP bands (regular 8–15, bosses 180–300). The Season 1 listing and "next up". No `Math.random` in `src/`. |
| `tests/items.test.ts` | Stat modifiers and hooks stack; statuses tick, chain and expire; inventory rules; synergies trigger |
| `tests/save.test.ts` | A fresh save, a round-trip, a v1 fixture migrating, corrupt-save backup and reset, out-of-range values cleaned up |

## Not yet implemented

- **Stretch goals:** gamepad support, key rebinding, mid-run save and quit, and the "nursing home" par time. Quitting a run from the pause menu ends it and banks half your Scrap, the same as a death.
- **Episodes after the Pilot.** S01E02 to S01E11 are listed as "coming soon", and later seasons show as one locked row.
- **60 FPS on real hardware hasn't been measured.** Projectiles and effects are pooled, and the debug panel has a 40-enemy, 200-projectile stress test. But the game has only been run in a headless browser with software rendering, where it stays well under 60 FPS even when idle. It's still unknown whether a real GPU holds 60 FPS under that load.
- **Balance hasn't been playtested by people.** The numbers in `balance.ts` are first-pass values, so the 20–30 minute run length is a target, not a measurement.
  - Automated browser runs have played every act and finale end to end, using debug shortcuts to get through fights.
  - Scripted input separately exercised both boss fights, the shoes, the customs queue, a shop purchase and the epilogue.
- **Debug jumps skip story beats.** For example, jumping straight to the Customs boss skips the blown cover, so the agents aren't labeled "ROBOT" and Morty still has the spare ray gun.

## Adding episodes

See [docs/ADDING_AN_EPISODE.md](docs/ADDING_AN_EPISODE.md).
