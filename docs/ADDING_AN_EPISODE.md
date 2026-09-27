# Adding an episode

Adding an episode means adding a content folder and pointing one line of `src/content/registry.ts` at it. The engine doesn't need to change: episodes bring their own enemies, items, rooms, mechanics, cutscenes, dialogue, art and music.

This guide uses S01E03 "Anatomy Park", the next episode on the Season Map, as its running example. Two finished episodes are the reference implementations. When in doubt, copy what they do:

- the Pilot (`src/content/episodes/s01e01-pilot/`): procedural acts, bosses, a calm-prefix stealth act, fixed-layout prologue and epilogue;
- Lawnmower Dog (`src/content/episodes/s01e02-lawnmower-dog/`): acts that cross from one place into the next, cutaways to Jerry, an enemy that can't be killed, a story trip across town, and mechanics reused from the Pilot.

## The steps

1. **Create the folder** `src/content/episodes/s01e03-anatomy-park/`. Use the same file layout as the others (see [What goes in each file](#what-goes-in-each-file)).
2. **Tag every definition** with `firstAppears: 'S01E03'`, plus `canon: true` if it's from the show or `canon: false` if you invented it (see [Canon gating](#canon-gating)).
3. **Put tuning numbers in `src/content/balance.ts`**, in a new block next to `PILOT` and `LAWNMOWER_DOG`:
   ```ts
   export const ANATOMY_PARK = {
     enemies: { 'germ-tourist': { hp: 12, speed: 110 } },
     pancreasPirate: { hp: 260, speed: 120 },
     // mechanic tuning, timers, ...
   };
   ```
   Tune HP against the weapon Morty holds in that act (see [Weapons need a story reason](#weapons-need-a-story-reason)). A test holds every enemy an act can field, its summons included, to `ENEMIES.hitsToKill`: 2–4 hits for a regular enemy and 5–8 for an elite. It also holds every boss fight to `ENEMIES.bossFight`: 60–90 seconds, assuming Morty lands half his shots.
4. **Export the episode** from `episode.ts` as one `EpisodeDef` (see the skeleton below).
5. **List it** in `src/content/registry.ts`. That file is the only list of episodes:
   ```ts
   import { anatomyPark } from './episodes/s01e03-anatomy-park/episode';
   // ...
   { id: 'S01E03', season: 1, number: 3, title: 'Anatomy Park', def: anatomyPark },
   ```
   With a `def`, the Season Map makes the node playable, and once Lawnmower Dog is cleared it's "next up".
6. **Update the one test that pins what's playable.** In `tests/content.test.ts`, "lists all of Season 1…" expects `['S01E01', 'S01E02']`; make it `['S01E01', 'S01E02', 'S01E03']`. Everything else picks up the new episode automatically:
   - registry validation, including canon gating and templates;
   - the 1,000-seed dungeon test, which runs for every procedural act (and checks regions, if the act has them);
   - the canon-gating pool test;
   - the story-weapon checks, the hits-to-kill bands and the boss-fight length;
   - the synergy and transformation checks.

   Add a test file for the episode's own rules: the act order, its weapon beats, canon gating for its characters, its unlocks and what its signature items do. `tests/lawnmower-dog.test.ts` is the model.
7. **Check it.**
   - Run `npm test`, `npm run typecheck` and `npm run build`.
   - Then play it with `npm run dev` and http://localhost:5173/?debug=1. The debug panel jumps to any act or room, spawns any enemy or item, and has god mode.
   - At boot, any content problem is printed to the console and flagged on the title screen.

If something truly needs new engine support (a new kind of hook, a new tile type), add it to the engine generically, named for what it does and not for the episode. Then document it in `src/engine/types.ts`.

## What goes in each file

Split things however reads best; the only fixed point is that `episode.ts` exports the `EpisodeDef`. The Pilot's layout (Lawnmower Dog keeps its statuses in `items.ts` and has no `icons.ts`):

| File | Contents |
|---|---|
| `episode.ts` | The `EpisodeDef`: title, synopsis, prologue/acts/epilogue, `unlocksOnClear`, and the `content` bundle that registers everything below |
| `acts.ts` | `BiomeDef` palettes and the `ActDef`s, each with its story weapon beat |
| `weapons.ts` | The episode's story weapons and their shot sprites |
| `rooms.ts` | ASCII `RoomTemplate`s |
| `enemies.ts`, `bosses.ts` | `EnemyDef`s (bosses have a `boss` block) |
| `items.ts` | `ItemDef`s, `SynergyDef`s and `TransformationDef`s, plus companion and look sprites |
| `statuses.ts` | `StatusDef`s |
| `mechanics/` | One `MechanicDef` per episode mechanic |
| `specialRooms.ts` | `SpecialRoomDef`s (one special room per act) |
| `encounters.ts` | Finale `EncounterDef`s, plus `RoomScriptDef`s for fixed-layout rooms |
| `cutscenes.ts` | `CutsceneDef`s (comic pages of 2–6 panels) for quick recaps |
| `scenes.ts` | In-engine scenes (`SceneStep` lists) for the big story beats |
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

export const anatomyPark: EpisodeDef = {
  id: 'S01E03',
  firstAppears: 'S01E03',
  canon: true,
  season: 1,
  number: 3,
  title: 'Anatomy Park',
  synopsis: 'One sentence for the Season Map.',
  prologue: PROLOGUE,                 // optional; skippable after the first clear
  acts: [ACT_1, ACT_2, ACT_3],         // cutaway (interlude) acts go in this list too, in story order
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

`unlocksOnClear` ids should be items marked `locked: true`. They join every pool (subject to canon gating) after the first clear. So an unlock that first appears in Anatomy Park never shows up in the Pilot or Lawnmower Dog.

### A procedural act (`acts.ts`)

```ts
export const ACT_1: ActDef = {
  id: 'park-gates',                      // prefix act ids with a short episode slug
  name: 'The Park Gates',
  subtitle: 'Act 1',
  playable: 'morty',                     // cutaways hand control to someone else (see "Cutaways" below)
  biome: GATES_BIOME,                    // palette, floor pattern, drawing style, music track id
  layout: {
    kind: 'procedural',
    roomCount: [8, 11],                  // rooms besides the start room and any calm prefix; the act must total 8-12
    templates: GATES_COMBAT.map((t) => t.id), // at least 12
    startTemplate: 'park-start',
    treasureTemplate: 'park-treasure',
    shopTemplate: 'park-shop',
    // calmPrefix: { count: [3, 4], templates: [...], lastTemplate: '...' } // non-combat run-up, like the customs queues
    // regions: [RIDES_BIOME, LIVER_BIOME]  // walk from one place into the next (see "Places that change" below)
  },
  enemyPool: [w('germ-tourist', 3)],     // { id, weight }
  itemPool: [w('freeze-ray-mod', 1)],    // earlier episodes' items are fine
  eliteChance: 0.12,
  shop: { keeperArt: 'park-vendor', name: 'Snack Kiosk', alwaysStocks: ['some-consumable'] },
  specialRoom: 'park-special',
  finale: [{ kind: 'boss', boss: 'pancreas-pirate', template: 'park-boss' }], // or { kind: 'encounter', encounter: '...' }; more stages chain
  // Where Morty's weapon comes from in this act; required when the act has enemies.
  weapon: { item: 'ricks-spare-ray-gun', when: 'start', from: 'rick', line: "Here, Morty, catch! Point the green end at 'em." },
  rick: { gadget: 'freeze-ray', entrance: 'portal' }, // what Q does; add a GadgetDef for a new one; `follows` brings him along
  mechanics: [],                         // MechanicDef ids
  startStatuses: [],
  arrive: 'portal',                      // or { by: 'portal', art: 'some-swirl' } for a portal that looks different
  opening: gatesOpening,                 // an in-engine scene in the first room (see "In-engine scenes")
  travel: { by: 'portal', label: 'Go deeper' }, // how Morty leaves; every act but the last needs one
  intro: ['park-intro'],                 // cutscene ids
  outro: ['park-outro'],
};
```

The prologue and epilogue use `layout: { kind: 'fixed', start, rooms: [{ x, y, kind, template, script, biome? }] }` instead. Rooms next to each other on that grid get doors between them; see `PROLOGUE` in either episode. Rooms that aren't next to each other can still be linked by a story trip with `trips: [{ from: { x, y }, to: { x, y } }]`. In Lawnmower Dog, a room script in the Smith garage calls `api.travelTo(to, 'ship', ship)` to fly across town to the Goldenfolds' house. The fixed-floor test counts trips when it checks every room can be reached. A quiet act with nothing to fight (the Pilot's epilogue at home) sets `unarmed: true`, and Morty puts his weapon away.

## Weapons need a story reason

Morty never pulls a weapon out of nowhere. **Every weapon he uses needs a story reason, and that reason has to be shown in the episode where he gets it.** The validator refuses an act that has enemies but no `weapon` beat, and the tests check that each scripted beat is handed over by code in the episode.

- **The beat.** Each act declares `weapon: { item, when, from, line }`:
  - `when: 'start'`: handed over as the act begins, right after its intro;
  - `when: 'scripted'`: a room script or mechanic calls `api.giveActWeapon()` at the story moment (the Pilot's garage script and its cover-blown moment in Customs). Until then Morty keeps the previous act's weapon, or has none.
  - `from` is who hands it over and `line` is what they say. On screen, the line appears as a speech bubble, the weapon arcs into Morty's hands (from the giver, out of his own bag, or tossed in from off-screen), and the item banner explains it.
- **Pick weapons that fit the story and the setting.** Follow the show where it says what Morty has. Where it doesn't, invent something that fits, and mark it `canon: false`. The Pilot:

  | Act | Weapon | Why |
  |---|---|---|
  | Prologue | Garage junk (thrown) | Rick yells at him to throw stuff at the drones |
  | School | Dodgeballs from his gym bag | No guns at school |
  | Dimension 35-C | Rick's spare ray gun | Rick tosses it over; the critters bite |
  | Customs | Rick's own ray gun | Canon: Rick hands it over when the cover is blown |

  Lawnmower Dog, where most of the fighting happens in dreams:

  | Act | Weapon | Why |
  |---|---|---|
  | Prologue, both Jerry cutaways | None (`unarmed`) | A break-in, and then Jerry |
  | Goldenfold's dream | Imagined ray gun | Morty realizes he's dreaming and makes one up |
  | Dreams within dreams | Rubber duck launcher | Deeper dream, weirder imagination |
  | Scary Terry's dream | Laser cat | By now, anything goes |
  | Snowball's world | Tennis ball launcher | Rick smuggles it in: dogs can't resist tennis balls |

- **Weapons are items** of `kind: 'weapon'`, `rarity: 'story'`, `noPool: true`, with a `WeaponSpec`. Beyond damage, fire rate, extra projectiles and spread, it can set:
  - `style: 'thrown'` (no muzzle flash, drawn untinted) or the default `'energy'`;
  - `shot` (a sprite key, or a list to cycle through: the Pilot's junk pile) and `spin`;
  - `sizeMult`, `speedMult`, `rangeMult`, `knockbackMult`, `bounces` and `sfx`.
- **Each act's weapon replaces the last one.** Items that change shots (bounces, freezing, extra projectiles, hooks) apply to whatever Morty holds, so they carry over between acts.
- **Balance against the weapon.** The hits-to-kill test uses each act's own weapon, so a hard-hitting weapon needs tougher enemies.

## Make it feel like the show

- **Travel between acts the way the episode does.** There are no generic exit doors between acts. Every act but the episode's last sets `travel: { by, label, art? }`, and the validator refuses one without it:
  - `by: 'ship'`: Rick's flying car sets down in the finale room, Morty climbs in, and it lifts off across the sky;
  - `by: 'portal'`: a green portal from Rick's portal gun;
  - `by: 'departure'`: an official departure portal (Customs).

  `arrive` says how Morty shows up at the start of an act (stepping out of a portal, the ship landing). A portal can look like something else: `travel.art` and `arrive: { by: 'portal', art }` swap in any sprite, and Lawnmower Dog uses a purple dream swirl to go one dream deeper. An act with several finale stages can dress the way between them with `stageExit: { art, label }` (the Pilot's security gate into the departure hall).
- **Rick comes along when the episode has him along.** `rick.follows` is a set of short lines (`enter`, `clear`, `hurt`, `item`, `idle`). With it, Rick walks with Morty through the act, comments now and then (burps included), can't be hurt and doesn't block shots. Calling him with a full meter is him stepping in.
- **Act out the big beats in the room.** `ActDef.opening(api)` returns scene steps (see [In-engine scenes](#in-engine-scenes)) played in the first room right after Morty arrives: Rick walking out of the portal to explain Dimension 35-C and tossing Morty his spare gun. Put a story weapon's handover in a scene with the `{ kind: 'weapon' }` step. Comic cutscenes (`intro`, `outro`) are for quick recaps; keep them short.
- **Make places look like themselves.** A biome's `style` picks how walls, blocks and doors are drawn:

  | Field | Options |
  |---|---|
  | `walls` (walls and tall `#` blocks) | `bricks`, `lockers`, `hills`, `panels`, `house`, `cabin` (a plane: overhead bins and oval windows) |
  | `blocks` (low `=` blocks) | `crate`, `desk`, `rock`, `counter`, `furniture`, `seat`, `toy`, `hedge` |
  | `doors` (between rooms) | `plain`, `classroom`, `arch`, `gate`, `house` |

  A room in a fixed layout can look like somewhere else with `biome` on its `FixedRoomDef`. Examples are the inside of Rick's ship in the Pilot's prologue, the Smith garage, and the dog-ruled streets outside Snowball's palace.
- **Every run opens with a title card** built from the episode's season, number and title. You don't need to add anything.
- **The Garage is a room Morty walks around.** The workbench sells upgrades, the closet has shirts, the TV has stats and settings, and Rick's ship opens the Season Map as the ship's navigation screen. Episodes don't need to touch it.

### Places that change

An act doesn't have to stay in one place.

- **Regions.** `layout.regions: [CENTAUR_DREAM, GIRL_DREAM]` splits a procedural floor into places along the way from the start room to the finale.
  - The act's own biome comes first, then each region in order, so walking deeper crosses from Mrs. Pancakes' club into a centaur's dream and then a little girl's.
  - Every place gets its own rooms and fights on the way through, including the last one, not just the finale. Side rooms move on with their depth, so the first place isn't most of the floor. `regionOf()` in `src/engine/dungeon/generate.ts` has the rule.
  - Every room looks like its place and plays its music, and a toast names each new place as Morty crosses into it.
  - Mechanics see `room.region` (0 is the act's biome). Scary Terry only turns up past the first region.
  - The dungeon test checks over 1,000 seeds that every region has rooms and a fight of its own, in order, from the start to the finale. The validator checks each region's music.
- **Finale stages somewhere else.** A stage can take a `biome`, as in `{ kind: 'encounter', encounter: 'dog-terry-chase', biome: TERRY_HOUSE }`: the chase ends inside Terry's house.
- **Rooms somewhere else** in a fixed layout take `biome` on the `FixedRoomDef` (above), and `trips` link rooms across town (see the act skeleton).

### Cutaways

A "Meanwhile" act that cuts to another character sets `interlude: true`. For example, Jerry chasing a Snuffles who's getting smarter:

```ts
export const MEANWHILE: ActDef = {
  id: 'dog-meanwhile-snuffles', name: 'Meanwhile: Good Boy?', subtitle: 'Meanwhile',
  playable: 'jerry', interlude: true, unarmed: true,
  biome: SMITH_DAY, layout: { kind: 'fixed', start: { x: 0, y: 0 }, rooms: [/* ... */] },
  enemyPool: [], itemPool: [], eliteChance: 0,
  finale: [{ kind: 'encounter', encounter: 'dog-snuffles-smarter' }], // ends with api.endAct()
  rick: RICK, mechanics: [],
};
```

- **Needs no `travel`.** It cuts back to the story instead.
- **The validator refuses a cutaway that's armed or has enemies to fight.**
- **Sitting it out.** Morty's companions, looks, orbiting junk and Rick calls sit it out, and come back afterwards.
- **Reuse.** A cutaway can reuse a mechanic from an earlier episode. Jerry's second cutaway runs the Pilot's suspicion meter with dog troopers.

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
export const germTourist: EnemyDef = {
  id: 'germ-tourist', name: 'Germ Tourist', firstAppears: 'S01E03', canon: false,
  ...ANATOMY_PARK.enemies['germ-tourist'],     // hp, speed
  radius: 14, contactDamage: 1, art: ART.germTourist,
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
- **Bosses** add `boss: { title, phases?, reward?, onDefeat?, defeatCutscene?, music? }`, and an act's finale stage points at them. More options:
  - `character` names the character the boss is, so scenes and `ctx.say()` talk from his head;
  - `objective` is the line shown while the fight lasts;
  - `dazed(api, boss, done)` means the boss isn't killed. At 0 HP he's left dazed and harmless while the hook plays his ending, usually an in-engine scene. Frank works this way: Morty wears him out with dodgeballs, then Rick walks in and freezes him. So does Snowball: his war suit powers down (`boss.setAlpha(0.25)` in a `do` step), and Rick talks him down.
- **Summons.** List what an enemy brings into the room under `spawns` (its brood, its backup). The validator checks the ids, and the hits-to-kill test covers the summons too.
- **Enemies that can't be killed.** `stalker: { staggerHits, staggerSeconds }` makes an enemy like Scary Terry:
  - every hit shoves him, and every `staggerHits` hits leave him dizzy for `staggerSeconds`;
  - he never counts toward clearing a room, and he's left out of the hits-to-kill test;
  - he can't also be a boss or a hazard.

  Bring him in from a mechanic, and give the player a way to shake him. In Lawnmower Dog, diving into a sleeper's dream (E) makes him lose the scent for a while (`mechanics/scaryTerry.ts`).
- **Enemy shots** use `kind` to pick the texture `shot-<kind>`:
  - built-in kinds: `orb`, `paper`, `ball`, `book`, `spore`, `bolt`, `stamp`, `ice`;
  - to add a new look, register a sprite keyed `shot-<kind>` in `content.sprites`.

## Items, synergies, transformations and statuses

```ts
{ id: 'kidney-stone', name: 'Kidney Stone', firstAppears: 'S01E03', canon: false,
  blurb: 'One funny line, shown on pickup.',
  effect: 'Shots bounce off an enemy toward the next one.', // one plain line: exactly what it does
  tags: ['shots'],                                        // what it changes (see below)
  kind: 'passive', rarity: 'common', price: 14,           // 'active' | 'consumable' | 'weapon'; 'rare'; 'story' for scripted gear
  stats: { add: { ricochet: 1 } },
  hooks: { onKill: (ctx, enemy, hit) => { /* ... */ } },
  icon: (g) => { /* draw a 32x32 icon centered on 16,16 */ } }
```

**The rules every item follows** (`ITEM_RULES` in `balance.ts`, enforced by `tests/items.test.ts`):

- **Every item says what it does.** `blurb` is the joke; `effect` is one plain line ("Shots pierce one enemy"). The pickup banner shows both, and the pause screen lists every held item with its `effect`.
- **Every passive changes what Morty does or what he sees.** Its `tags` say how, and the test checks each tag is backed by the item:
  - `shots`: changes how shots behave, through the shot stats below or an `onFire` hook;
  - `companion`: has a `companion` (a buddy that follows Morty);
  - `on-hit`, `on-kill`, `on-dash`, `on-hurt`: a visible effect from that hook;
  - `look`: has a `look` (a shirt color, an accessory, a trail, a shot glow);
  - `mechanic`: runs an episode mechanic (the grappling shoes);
  - `stat`: plain stat changes.
- **No small stat bumps.** A plain stat change is never under 20%. An item that is only stats needs one change of at least 25%, or a whole heart.
- **Actives are big** and tagged `room`: using one changes the room (clears bullets, freezes everything, summons help).
- **Consumables** are tagged `heal` or `status`.

**Shot behaviors** are stats in `BASE_STATS`, tuned in `SHOTS`, and stack like any stat:

| Stat | What it does |
|---|---|
| `pierce` | Shots pass through this many enemies |
| `homing` | Shots turn toward the nearest enemy ahead (radians per second) |
| `split` | Shots burst into this many mini shots on a hit |
| `blast` | Shots explode on impact with this radius |
| `chain` | Hits zap lightning to this many more enemies |
| `ricochet` | Shots bounce off an enemy toward the next one |
| `orbit` | Pieces of junk circle Morty, bonking enemies and blocking bullets |
| `chargeShot` | Seconds without firing that charge the next shot (triple damage, huge, piercing) |
| `critRate`, `freezeRate` | Share of volleys that crit or freeze (0.2 = every 5th) |
| `dashEraseShots` | Dashing erases enemy bullets within this radius |
| `dodgeChance` | Chance a hit misses Morty entirely |
| `companionRate` | How often companions attack |

- **Companions:** `companion: { art, kind: 'shooter' | 'pouncer' | 'guard', every, damage, flying? }`. Register the art in `content.sprites`.
- **Looks:** `look: { shirt?, accessory?, dy?, trail?, glow? }`. The latest item wins for each piece, and a transformation's look goes on top.
- **Hooks:** `onFire`, `onHit`, `onKill`, `onDamageTaken`, `onDash`, `onDashContact`, `onRoomClear`, `onUseActive`. Hits tell you `source` ('shot', 'slash', 'explosion', 'zap', 'orbit', 'companion'...), `tag`, `crit` and `bounced`. For visuals, hooks call `ctx.vfx(...)`: a particle burst, a ring, a lightning zap, a slash or a floating word.
- **Stats** combine as (base + adds) × multipliers, then clamp to `STAT_LIMITS`.
- **Actives** have `active: { recharge: rooms, use(ctx) }`; consumables have `consumable: { use(ctx) }`. Return `false` from `use` to keep the charge (nothing to hit).
- **Pool flags:**
  - `locked: true` keeps an item out of pools until it's unlocked (via `unlocksOnClear` or a Garage upgrade);
  - `noPool: true` marks story gear that scripts hand out.
- **Synergies** are `{ requires: [a, b], effect, blurb, stats?, hooks? }`. They switch on while the player holds every required item, with a "SYNERGY!" moment. Never require two actives: Morty holds one at a time.
- **Transformations** go in `content.transformations`: `{ set, count?, look, effect, stats?, hooks? }`. Holding any `count` (default 3) items from the set transforms Morty: a new look, a strong bonus and a "TRANSFORMATION!" moment. The Pilot has two, Garage Tinkerer and Seed Smuggler.
- **Rewards:** bosses always drop a rare item (a test checks), treasure rooms offer a choice of two, and shops lead with one good item.
- **Statuses** have a duration: `seconds`, `rooms`, `act` or `manual`. They can also take:
  - `stats` and `flags` (`noDash`, `wobblyMove`, `wobblyAim`, `scrambled`);
  - `thenApply`, to chain into another status;
  - `endsWithAct`.

## Mechanics (plugins)

An episode-specific system is a `MechanicDef` that the acts list by id:

```ts
export const immuneResponse: MechanicDef = {
  id: 'immune-response', name: 'Immune Response', firstAppears: 'S01E03', canon: false,
  help: 'One line for the pause screen.',
  create(api) {
    let alarm = 0;
    return {
      onActStart() {}, onRoomEnter(room) {}, update(dt) {}, onRoomClear(room) {}, onActEnd() {},
      onAction() {},                 // the F key
      onPlayerEvent(e) {},           // fire, dash, fall, hurt
      allowsTile(tile) { return undefined; }, // let the player stand on cliffs etc.
      onFall() { return false; },    // take over what a fall does
      hud: () => ({ label: 'Immune response', value: alarm / 100, color: 0x97ce4c }),
    };
  },
};
```

`api` is the full game context plus:
- `room()` and `here()` (the current room's script API);
- `playerTile()`, `hint()` and `playCutscene()`;
- `convertRooms(from, to)`, which is how Customs turns its calm rooms into combat rooms;
- `giveActWeapon()`, which hands over the act's story weapon.

The game context also has:
- `tilt(radians, seconds)`, which banks the camera (the plane in Goldenfold's dream);
- `pushEnemies(x, y, radius, force)`, which shoves enemies away from a point;
- `removeItem(id)`, which takes an item away (Scary Terry heading home after the climb).

**Mechanics can be factories.** `createSuspicion(setup)` in the Pilot's `mechanics/suspicion.ts` builds a suspicion meter. You give it:
- who watches;
- the scanner and checkpoint art;
- the lines;
- what happens when the cover is blown.

Customs and Lawnmower Dog's dog patrols (`mechanics/dogPatrols.ts`) are each one call to it. If a mechanic from an earlier episode almost fits, make it a factory rather than copying it.

See `mechanics/grapplingShoes.ts` and `mechanics/suspicion.ts` in the Pilot, and `mechanics/` in Lawnmower Dog (creaky floors, dream control, Scary Terry, Terry's confidence, dog patrols).

## Encounters, special rooms and scripted rooms

- **Encounters** are finale stages: `{ id, name, template, music?, script(api) }`.
- **Special rooms** are `{ id, name, icon, templates, script? }`.
- **Room scripts** give fixed-layout rooms their behavior and are registered under `content.scripts`.

All three get the room script API:
- spawning: `spawnEnemy`, `spawnPickup`, `spawnPedestal`, `addProp`;
- room control: `makeCombat`, `lockDoors`/`unlockDoors`, `completeRoom`, `completeStage`, `endAct`;
- presentation: `showChoice` (multiple choice with keys 1–4), `setObjective`, `setTimer`, `hint`, `playCutscene`;
- story: `giveActWeapon()` and `actScene(steps, onDone)` (see below);
- timing: room-scoped `after(seconds, fn)`.

### In-engine scenes

Big story beats should play out in the room, not only as comic panels. `api.actScene(steps, onDone)` (or an act's `opening`) runs a list of steps, one after another, while Morty stands still and can't be hurt. Space, Enter or E skips ahead.

| Step | Does |
|---|---|
| `{ kind: 'enter', who, via: 'door' \| 'portal' \| 'here', to }` | Walks in through the nearest door, steps out of a green portal, or fades in |
| `{ kind: 'walk', who, to, speed? }` | Walks to a spot |
| `{ kind: 'say', who, text, seconds? }` | A speech bubble; waits about as long as it takes to read |
| `{ kind: 'face', who, toward }` | Turns to face a spot |
| `{ kind: 'emote', who, emote: 'jump' \| 'shake' \| 'shock' }` | A little reaction |
| `{ kind: 'beam', who, to, color, sfx? }` | A ray-gun beam (the freeze ray) |
| `{ kind: 'wait', seconds }` | A pause |
| `{ kind: 'weapon' }` | The act's story weapon changes hands: its giver says the line and Morty catches it |
| `{ kind: 'pose', who, art }` | Swaps a character's sprite (Rick passing out); `null` puts theirs back |
| `{ kind: 'do', fn }` | Runs code: drop a prop, set a flag, play a sound |
| `{ kind: 'leave', who, via: 'door' \| 'portal' \| 'here' }` | Walks out, leaves through a portal, or fades away |

- **Who.** A `who` is a character id with a world sprite. The act's playable character is the player himself.
- **Spots.** A spot is `{ x, y }`, or `{ near: 'rick', side?, gap? }` to stand next to someone.
- **Examples.**
  - The Pilot's `scenes.ts`: the neutrino-bomb reveal in the ship, the 35-C arrival, the Customs desk and the cover being blown. Also Frank's `dazed` hook in `bosses.ts`.
  - Lawnmower Dog's `scenes.ts`: the helmet, the dream inceptor, Goldenfold turning the dream on them, Terry falling asleep, and Snowball relenting.
- **Skipping.** Every `do`, `weapon` and `pose` step still runs, so a skipped scene ends in the same place.

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
- **Earlier content is fair game.** Lawnmower Dog brings back Mr. Goldenfold (`firstAppears: 'S01E01'`). Scary Terry's dream reuses the Pilot's school templates and school enemies, and the dog patrols reuse the Pilot's suspicion meter. Anatomy Park can do the same with anything from S01E01 or S01E02.
- **New content from the episode itself** gets `firstAppears: 'S01E03'`, `canon: true`. For Lawnmower Dog, that meant Snuffles/Snowball, the helmet, Scary Terry, Mrs. Pancakes, the centaur, the little girl and the dream inceptor.
- **Invented content** gets `firstAppears: 'S01E03'`, `canon: false`.
- **Nothing later in the show can be used yet.** For example, Meeseeks don't show up until S01E05.
- **Ids are unique** within each category, and an item and an enemy can't share one. Prefix episode-scoped ids with a short slug (`park-…`, like the Pilot's `pilot-…` and Lawnmower Dog's `dog-…`), especially acts, encounters, special rooms, cutscenes, scripts and templates.
