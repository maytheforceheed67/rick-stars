# Adding an episode

Adding an episode means adding a content folder and pointing one line of `src/content/registry.ts` at it. The engine doesn't need to change: episodes bring their own enemies, items, rooms, mechanics, cutscenes, dialogue, art and music.

This guide uses S01E02 "Lawnmower Dog" as the example. The Pilot (`src/content/episodes/s01e01-pilot/`) is the reference implementation: when in doubt, copy what it does.

## The steps

1. **Create the folder** `src/content/episodes/s01e02-lawnmower-dog/`. Use the same file layout as the Pilot (see [What goes in each file](#what-goes-in-each-file)).
2. **Tag every definition** with `firstAppears: 'S01E02'`, plus `canon: true` if it's from the show or `canon: false` if you invented it (see [Canon gating](#canon-gating)).
3. **Put tuning numbers in `src/content/balance.ts`**, in a new block next to `PILOT`:
   ```ts
   export const LAWNMOWER_DOG = {
     enemies: { 'dream-crawler': { hp: 12, speed: 110 } },
     snuffles: { hp: 260, speed: 120 },
     // mechanic tuning, timers, ...
   };
   ```
   Regular enemies must have 8–15 HP and bosses 180–300 (`ENEMIES.regularHp` and `ENEMIES.bossHp`); a test enforces this.
4. **Export the episode** from `episode.ts` as one `EpisodeDef` (see the skeleton below).
5. **List it** in `src/content/registry.ts`. That file is the only list of episodes:
   ```ts
   import { lawnmowerDog } from './episodes/s01e02-lawnmower-dog/episode';
   // ...
   { id: 'S01E02', season: 1, number: 2, title: 'Lawnmower Dog', def: lawnmowerDog },
   ```
   With a `def`, the Season Map makes the node playable, and once the Pilot is cleared it's "next up".
6. **Update the one test that pins what's playable.** In `tests/content.test.ts`, "lists all of Season 1…" expects `['S01E01']`; make it `['S01E01', 'S01E02']`. Everything else picks up the new episode automatically:
   - registry validation, including canon gating and templates;
   - the 1,000-seed dungeon test, which runs for every procedural act;
   - the canon-gating pool test and the enemy HP bands.

   Add episode-specific tests if the episode has new rules worth pinning down.
7. **Check it.**
   - Run `npm test`, `npm run typecheck` and `npm run build`.
   - Then play it with `npm run dev` and http://localhost:5173/?debug=1. The debug panel jumps to any act or room, spawns any enemy or item, and has god mode.
   - At boot, any content problem is printed to the console and flagged on the title screen.

If something truly needs new engine support (a new kind of hook, a new tile type), add it to the engine generically, named for what it does and not for the episode. Then document it in `src/engine/types.ts`.

## What goes in each file

Split things however reads best; the only fixed point is that `episode.ts` exports the `EpisodeDef`. The Pilot's layout:

| File | Contents |
|---|---|
| `episode.ts` | The `EpisodeDef`: title, synopsis, starting weapon, prologue/acts/epilogue, `unlocksOnClear`, and the `content` bundle that registers everything below |
| `acts.ts` | `BiomeDef` palettes and the `ActDef`s |
| `rooms.ts` | ASCII `RoomTemplate`s |
| `enemies.ts`, `bosses.ts` | `EnemyDef`s (bosses have a `boss` block) |
| `items.ts` | `ItemDef`s and `SynergyDef`s |
| `statuses.ts` | `StatusDef`s |
| `mechanics/` | One `MechanicDef` per episode mechanic |
| `specialRooms.ts` | `SpecialRoomDef`s (one special room per act) |
| `encounters.ts` | Finale `EncounterDef`s, plus `RoomScriptDef`s for fixed-layout rooms |
| `cutscenes.ts` | `CutsceneDef`s (comic pages of 2–6 panels) |
| `dialogue.ts` | Lines said during play: taunts, Rick's instructions, reactions |
| `characters.ts` | New `CharacterDef`s (portrait, world sprite, speech color) |
| `backdrops.ts` | Cutscene panel backgrounds |
| `art.ts`, `icons.ts` | Code-drawn sprites (`SpriteArt`) and drawing helpers |
| `music.ts` | The episode's music tracks |

Shared cast and content live in `src/content/shared/`: Morty, Rick, Jerry, Beth, Summer, the freeze-ray gadget, pickups, Garage upgrades and death barks. Add to it only when something is genuinely cross-episode.

## Skeletons

### `episode.ts`

```ts
import type { EpisodeDef } from '../../../engine/types';

export const lawnmowerDog: EpisodeDef = {
  id: 'S01E02',
  firstAppears: 'S01E02',
  canon: true,
  season: 1,
  number: 2,
  title: 'Lawnmower Dog',
  synopsis: 'One sentence for the Season Map.',
  startWeapon: 'ricks-spare-ray-gun', // shared; or an S01E02 weapon
  prologue: PROLOGUE,                 // optional; skippable after the first clear
  acts: [ACT_1, ACT_2, ACT_3],
  epilogue: EPILOGUE,                 // optional
  unlocksOnClear: ['some-locked-item'],
  content: {
    characters: [], items: [], synergies: [], statuses: [], enemies: [...ENEMIES, ...BOSSES],
    encounters: [], specialRooms: [], mechanics: [], gadgets: [], pickups: [],
    cutscenes: [], backdrops: [], templates: [], scripts: [], sprites: [],
    music: {}, // optional; sfx: {} too
  },
};
```

`unlocksOnClear` ids should be items marked `locked: true`. They join every pool (subject to canon gating) after the first clear.

### A procedural act (`acts.ts`)

```ts
export const ACT_1: ActDef = {
  id: 'dog-suburbs',                     // prefix act ids with a short episode slug
  name: 'Smith Backyard',
  subtitle: 'Act 1',
  playable: 'morty',                     // later B-plots can hand control to 'summer', 'jerry'...
  biome: SUBURB_BIOME,                   // palette, floor pattern, music track id
  layout: {
    kind: 'procedural',
    roomCount: [8, 11],                  // rooms besides the start room and any calm prefix; the act must total 8-12
    templates: SUBURB_COMBAT.map((t) => t.id), // at least 12
    startTemplate: 'dog-start',
    treasureTemplate: 'dog-treasure',
    shopTemplate: 'dog-shop',
    // calmPrefix: { count: [3, 4], templates: [...], lastTemplate: '...' } // non-combat run-up, like the customs queues
  },
  enemyPool: [w('dream-crawler', 3)],    // { id, weight }
  itemPool: [w('freeze-ray-mod', 1)],    // earlier episodes' items are fine
  eliteChance: 0.12,
  shop: { keeperArt: 'dog-shopkeeper', name: 'Dog Treat Stand', alwaysStocks: ['some-consumable'] },
  specialRoom: 'dog-special',
  finale: [{ kind: 'boss', boss: 'snuffles', template: 'dog-boss' }], // or { kind: 'encounter', encounter: '...' }; more stages chain
  rick: { gadget: 'freeze-ray', entrance: 'portal' }, // what Q does; add a GadgetDef for a new one
  mechanics: [],                         // MechanicDef ids
  startStatuses: [],
  intro: ['dog-intro'],                  // cutscene ids
  outro: ['dog-outro'],
};
```

The prologue and epilogue use `layout: { kind: 'fixed', start, rooms: [{ x, y, kind, template, script }] }` instead. Rooms next to each other on that grid get doors between them; see `PROLOGUE` in the Pilot.

## Rooms (`rooms.ts`)

Templates are the room interior as ASCII rows. The engine adds the walls and doors around them.

```
.  floor           #  wall (stops movement and shots)   =  low block (stops movement, not shots)
^  cliff (fall)    ~  slow floor                        e  enemy spawn   E  elite spawn
$  maybe a pickup  P  player spawn                      I  item pedestal K  shopkeeper
any other character: a marker with floor underneath, meaning whatever your script or mechanic says
```

Rules the validator enforces:

- **Size.** Combat, start, treasure, shop and special-room templates are exactly 15 columns × 9 rows.
- **Door cells.** These must be floor (`.` or `~`):
  - the middle of the top row, (7, 0);
  - the middle of the bottom row, (7, 8);
  - the middle of the left column, (0, 4);
  - the middle of the right column, (14, 4).
- **Enemy spawns** (`e`/`E`) sit at least 3 steps (Manhattan distance) from every door cell, and combat templates need at least one.
- **Reachability.** Every door cell and every marker can be reached from the first door. The check walks across floor, slow floor and cliffs, since a mechanic may make cliffs walkable.
- **Numbers.** Each procedural act needs at least 12 combat templates. A generated act has 8–12 rooms in all, counting the start room and any calm prefix; the dungeon test checks this over 1,000 seeds.
- **Finale templates** can be any size: the Pilot has a 15×23 tree and a 41×9 hall. The first stage is a dead end, so its door can be on any side. Later stages have no door, so they need a `P`.

## Enemies and bosses

```ts
export const dreamCrawler: EnemyDef = {
  id: 'dream-crawler', name: 'Dream Crawler', firstAppears: 'S01E02', canon: false,
  ...LAWNMOWER_DOG.enemies['dream-crawler'],   // hp, speed
  radius: 14, contactDamage: 1, art: ART.dreamCrawler,
  elite: { hpMult: 1.7, scale: 1.2, params: { burst: 3 } },
  brain: function* (api) {
    while (true) {
      api.chase(1);
      if (api.distToPlayer() < 160) {
        api.stop();
        yield* api.windup(0.5, () => ({ kind: 'circle', x: api.self.x, y: api.self.y, radius: 80 }));
        // ...attack...
        yield 1.2;                          // yield a number to wait that many seconds
      }
      yield;                                // yield nothing to wait one frame
    }
  },
};
```

- **Brains** are generator functions: `yield` waits a frame, `yield 0.5` waits half a second, and `yield () => cond` waits until the condition holds.
- **Ready-made archetypes** live in `src/engine/brains.ts`: `chaser`, `shooter`, `charger`, `swarmer`, `idle` and `during`.
- **Telegraphs.** Every attack should go through `api.windup(seconds, telegraph)`. The telegraph is a circle, arc, line or ring, or an array of them. The engine stretches any wind-up shorter than 0.4 s.
- **Bosses** add `boss: { title, defeatCutscene?, reward?, onDefeat?, music? }`, and an act's finale stage points at them.
- **Enemy shots** use `kind` to pick the texture `shot-<kind>`:
  - built-in kinds: `orb`, `paper`, `ball`, `book`, `spore`, `bolt`, `stamp`, `ice`;
  - to add a new look, register a sprite keyed `shot-<kind>` in `content.sprites`.

## Items, synergies and statuses

```ts
{ id: 'squeaky-bone', name: 'Squeaky Bone', firstAppears: 'S01E02', canon: false,
  blurb: 'One line, shown on pickup. Make it funny.',
  kind: 'passive', rarity: 'common', price: 14,     // 'active' | 'consumable' | 'weapon'; 'rare'; 'story' for scripted gear
  stats: { add: { damage: 0.5 }, mult: { fireRate: 1.1 } },
  hooks: { onKill: (ctx, enemy, hit) => { /* ... */ } },
  icon: (g) => { /* draw a 32x32 icon centered on 16,16 */ } }
```

- **Hooks:** `onFire`, `onHit`, `onKill`, `onDamageTaken`, `onDash`, `onDashContact`, `onRoomClear`.
- **Stats** combine as (base + adds) × multipliers, then clamp to `STAT_LIMITS`.
- **Actives** have `active: { recharge: rooms, use(ctx) }`; consumables have `consumable: { use(ctx) }`.
- **Pool flags:**
  - `locked: true` keeps an item out of pools until it's unlocked (via `unlocksOnClear` or a Garage upgrade);
  - `noPool: true` marks story gear that scripts hand out.
- **Synergies** are `{ requires: [a, b], stats?, hooks?, blurb }` and switch on while the player holds every required item.
- **Statuses** have a duration: `seconds`, `rooms`, `act` or `manual`. They can also take:
  - `stats` and `flags` (`noDash`, `wobblyMove`, `wobblyAim`, `scrambled`);
  - `thenApply`, to chain into another status;
  - `endsWithAct`.

## Mechanics (plugins)

An episode-specific system is a `MechanicDef` that the acts list by id:

```ts
export const dreamDepth: MechanicDef = {
  id: 'dream-depth', name: 'Dream Depth', firstAppears: 'S01E02', canon: false,
  help: 'One line for the pause screen.',
  create(api) {
    let depth = 0;
    return {
      onActStart() {}, onRoomEnter(room) {}, update(dt) {}, onRoomClear(room) {}, onActEnd() {},
      onAction() {},                 // the F key
      onPlayerEvent(e) {},           // fire, dash, fall, hurt
      allowsTile(tile) { return undefined; }, // let the player stand on cliffs etc.
      onFall() { return false; },    // take over what a fall does
      hud: () => ({ label: 'Dream depth', value: depth / 3, color: 0x97ce4c }),
    };
  },
};
```

`api` is the full game context plus:
- `room()` and `here()` (the current room's script API);
- `playerTile()`, `hint()` and `playCutscene()`;
- `convertRooms(from, to)`, which is how Customs turns its calm rooms into combat rooms;
- `setWeapon()`.

See `mechanics/grapplingShoes.ts` and `mechanics/suspicion.ts`.

## Encounters, special rooms and scripted rooms

- **Encounters** are finale stages: `{ id, name, template, music?, script(api) }`.
- **Special rooms** are `{ id, name, icon, templates, script? }`.
- **Room scripts** give fixed-layout rooms their behavior and are registered under `content.scripts`.

All three get the room script API:
- spawning: `spawnEnemy`, `spawnPickup`, `spawnPedestal`, `addProp`;
- room control: `makeCombat`, `lockDoors`/`unlockDoors`, `completeRoom`, `completeStage`, `endAct`;
- presentation: `showChoice` (multiple choice with keys 1–4), `setObjective`, `setTimer`, `hint`, `playCutscene`;
- timing: room-scoped `after(seconds, fn)`.

A script returns hooks: `onEnter(firstTime)`, `update(dt)`, `onExit()`, `onEnemiesCleared()`, `onBossDefeated()`. The Pilot's `encounters.ts` covers most patterns: a timed puzzle, waves, an escape run and a quiz.

## Cutscenes, characters and dialogue

- **Cutscenes** have 2–6 panels. Each panel is `{ backdrop, speaker?, expression?, cast?, text, caption?, sfx? }`.
  - The validator checks that every backdrop and character exists.
  - It also checks that every character has appeared by the cutscene's own `firstAppears`.
  - Cutscenes can be skipped with Esc.
- **Characters** need a code-drawn `portrait(g, size, expression)`, a speech `color` and an optional world `sprite`. `src/content/shared/art.ts` has `drawPerson` and `drawPortrait` helpers.
- **Dialogue** is original, in character.
  - Rick is brilliant, drunk and dismissive, and burps mid-sentence, written `—*urrp*—`.
  - Morty is anxious ("aw geez").
  - Don't transcribe the episode; short nods to famous moments are fine.

## Art, music and sound

- **Sprites** are `SpriteArt { key, width, height, draw(g, w, h) }`, drawn with Phaser Graphics and baked to textures at boot. The house style: thick dark outlines, slightly wobbly shapes, flat bright colors, and portal green (`0x97ce4c`) as the accent. `src/engine/art/draw.ts` has the helpers: `blob`, `wonkyRect`, `wonkyPoly`, `eye`, `mouth` and more.
- **Music** goes in `content.music` as `{ [trackId]: Track }`: step patterns for bass, lead, drums and pad (the format is in `src/engine/audio/music.ts`). Biomes, acts, bosses and encounters refer to tracks by id, and the validator checks that they exist.
  - Built-in tracks: `title`, `garage`, `boss`, `calm`.
- **Sound effects** go in `content.sfx` as WebAudio recipes (the format is in `src/engine/audio/sfx.ts`). Play them with `ctx.sfx(id)` / `api.sfx(id)`.
- **Ids must be unique** across the engine and every episode, for both tracks and sound effects.

## Canon gating

- **Tag everything.** Every definition carries `firstAppears` and `canon`.
- **An episode can only reference what has appeared by then.** The validator fails the build's tests otherwise, and item pools apply the same rule to unlocked items.
- **Earlier content is fair game.** S01E02 can put Pilot items in its pools, fight Pilot enemies, reuse school templates, or bring back Mr. Goldenfold (`firstAppears: 'S01E01'`).
- **New content from the episode itself** gets `firstAppears: 'S01E02'`, `canon: true`. For Lawnmower Dog that includes Snuffles/Snowball and Scary Terry.
- **Invented content** gets `firstAppears: 'S01E02'`, `canon: false`.
- **Nothing later in the show can be used yet.** For example, Meeseeks don't show up until S01E05.
- **Ids are unique** within each category, and an item and an enemy can't share one. Prefix episode-scoped ids with a short slug (`dog-…`, like the Pilot's `pilot-…`), especially acts, encounters, special rooms, cutscenes, scripts and templates.
