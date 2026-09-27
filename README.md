# Rick-Stars

An unofficial, non-commercial Rick and Morty fan game: a top-down action roguelite in the style of *The Binding of Isaac* and *Enter the Gungeon*. The campaign follows the show one episode at a time. Episodes 1 and 2, "Pilot" (S01E01) and "Lawnmower Dog" (S01E02), are fully playable; the rest of Season 1 sits on the Season Map as "coming soon".

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
| Shift | Sneak (walk slowly; it matters at Customs, in Goldenfold's creaky house and past the dog patrols) |
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

- **Title → Rick's Garage (the hub) → Season Map.** Pick an episode. Start with a random seed, or type one in: 8 characters, shown as `ABCD-EFGH`. The seed is on the pause screen and the end screen, so any run can be replayed.
- **One run is one episode:** a prologue (skippable after your first clear), the episode's acts, then the epilogue. The Pilot has three procedurally generated acts. Lawnmower Dog has three, plus two short cutaways where you play Jerry.
- **Rooms:** combat rooms lock their doors until they're cleared. Every procedurally generated act has a start room, combat rooms, one treasure room, one shop, one special room and a finale.
- **Health:** Morty starts with 3 hearts and takes damage in half hearts.
- **Scrap** is the only currency. Enemies and cleared rooms drop it, and shops take it. When a run ends, unspent Scrap is banked: half of it on a death (or when you quit), all of it on a clear.
- **Rick Meter:** it fills as you deal damage. When it's full, press Q. Rick barges in, freezes everything on screen with the freeze ray, says something rude and leaves. Frozen enemies shatter on their next hit; bosses take 2.5× damage instead.
- **The Garage** spends banked Scrap on permanent upgrades, kept modest on purpose:
  - a spare heart (two levels);
  - starting every run with a Broken Leg Serum;
  - four items unlocked into the pool;
  - three shirt colors.
- **Clearing an episode** unlocks items into the pool and marks the next episode as "next up" on the Season Map:
  - the Pilot unlocks the Mega Seed and points to Lawnmower Dog;
  - Lawnmower Dog unlocks Rick's Dream Inceptor and Nightmare Fuel, and points to Anatomy Park (still "coming soon").

  An unlock only ever joins the pools of its own episode and later ones.

### What's in the Pilot

| Part | What happens |
|---|---|
| **Prologue: "Just a Test"** | A tutorial in Morty's bedroom and the garage, where Rick yells at him to throw garage junk at the target drones. Then, in the ship, Rick reveals his neutrino bomb and passes out, and Morty defuses it from Rick's sleep-mumbled instructions before the timer runs out. |
| **Act 1: Harry Herpson High** | No guns at school: Morty fights with dodgeballs from his gym bag, and starts Sleep-Deprived. Enemies are pop quizzes, hall monitors, dodgeball jocks and cafeteria slop. There's Goldenfold's Pop Quiz room and a vending-machine shop. Morty can't beat Frank Palicky on his own: he pelts him until he's dazed, then Rick walks into the gym and freezes him. |
| **Act 2: Dimension 35-C** | Rick tosses Morty his spare ray gun, because the critters bite. The grappling shoes, starting with the scripted fall and the Broken Leg Serum trip. Invented critters, a Mega Tree grove, a trader critter, and the Big Mega Tree finale, where Morty harvests three Mega Fruit. |
| **Act 3: Interdimensional Customs** | Suspicion: sneak through 3–4 queue rooms past agents and scanners until the checkpoint blows your cover. Then Rick hands over his own ray gun, agents get "ROBOT" nameplates, and there's the Confiscated Goods vault, an overpriced Duty-Free and the Customs Supervisor, followed by a 40-second sprint to the portal home. |
| **Epilogue: "Temporarily a Genius"** | Home, with Rick's gun back in his pocket. Rick's quiz, where the right answers glow. Then the side effects kick in while Rick rambles. |

There are 34 items to find, plus the grappling shoes and the four story weapons. Six are from the episode (Freeze Ray Mod, Rick's Flask, the Neutrino Bomb, Frank's Switchblade, Broken Leg Serum, the Mega Seed) and the rest are invented, themed on school, 35-C and Customs. Every item changes how Morty plays or looks, and says in one plain line exactly what it does:

- **Shots:** pierce, homing, splitting seeds, impact blasts, chain lightning, ricochets, orbiting junk, charged shots, crits every 5th shot, ice bolts every 4th.
- **Companions:** a reprogrammed junk drone that shoots, and a baby gloop hopper that pounces.
- **Visible triggers:** acid splashes on kills, stomps on dashes, shoulder-pad shoves when hurt, DENIED stamps on hits.
- **Looks:** the letterman jacket, a sparkly cologne trail, icy or acid-green shot glows.
- **Actives change the room:** Rick's Flask burps every bullet away, the Detention Slip freezes the room, the Critter Whistle starts a stampede, the Confiscation Order turns bullets into Scrap.

There are 16 synergies, each announced with a "SYNERGY!" moment, and 2 transformations: hold any 3 items from a set to become the **Garage Tinkerer** (goggles, +30% damage, extra orbiting junk, blasting shots) or the **Seed Smuggler** (trench coat and fedora, +1 heart, a chance to slip past hits, double Scrap). Treasure rooms offer a choice of two, shops lead with one good item, and bosses drop a rare. The pause screen lists everything Morty holds with its exact effect.

### What's in Lawnmower Dog

| Part | What happens |
|---|---|
| **Prologue: "Good Boy"** | In the living room, Rick builds Snuffles an intelligence helmet to shut Jerry up. Morty needs an A from Mr. Goldenfold, so it's out to the garage and across town in Rick's ship. The Goldenfolds' house is dark and the floors creak: sneak, or the Noise meter fills and Goldenfold stirs. In the bedroom Rick sets up the dream inceptor, lays down the one rule (die in a dream and you die for real), and they dive in. Morty has no weapon for a break-in. |
| **Act 1: Goldenfold's Dream** | A plane, because of course it is. Morty realizes he's dreaming and imagines himself a ray gun. Dream Control: mid-fight the dream shifts. The cabin banks and everyone slides, seats slam across the aisle, and machine guns appear out of thin air. The crowd is dream passengers, flight attendants and soldiers, and there's a First Class lounge. Dream Goldenfold fights until he's dazed, then turns the dream on them. As they drop toward lava, Rick picks the next dream down: Mrs. Pancakes'. |
| **Meanwhile: Good Boy?** | A cutaway where you play Jerry, chasing a Snuffles who gets smarter by the minute. |
| **Act 2: Dreams Within Dreams** | From Mrs. Pancakes' club into a centaur's dream and then a little girl's. Each one looks different and brings its own crowd, from counting sheep to wind-up soldiers and a tea party. Morty imagines up a rubber duck launcher. Scary Terry hunts them from room to room, and he can't be killed: hits only shove him, and every few hits leave him dizzy. Diving into a sleeper's dream (E) shakes him off for a while. The finale chases him home, where he falls asleep, and they dive into his dream. |
| **Act 3: Scary Terry's Dream** | Terry's nightmare is school. Little Terry sits in every fight: kids who get near him mock him and his confidence drops, while clears and his pop quiz lift it. Morty's weapon is a laser cat. Win Terry over and he climbs back up through the dreams with Morty to have a word with Goldenfold: give the kid an A. |
| **Meanwhile: Off the Leash** | Jerry again, sneaking past dog troopers and searchlights. It's the Pilot's Suspicion mechanic, reused. The dogs catch him at the kennel gate anyway, because it's canon. |
| **Epilogue: "Snowball"** | Snuffles is Snowball now, and he keeps Morty in a luxury suite. Rick smuggles in a tennis ball launcher, because dogs can't resist tennis balls. Fight out through the dog-ruled streets, the park and the palace to Snowball in his war suit. Beat him until he's dizzy, and nobody dies. Rick shows him what he's turning into, and he relents and leads the dogs off to a world of their own. |

There are 27 items to find (two of them unlocked by clearing the episode), plus four dream weapons and Scary Terry himself as a story companion:

- **Canon:** Snuffles' Helmet, Helmet Batteries, Rick's Dream Inceptor, the Emergency Parachute, Terry's Finger Blades, Terry's Hat, the Velvet Rope, Mrs. Pancakes' Autograph and Snowball's Name Tag.
- **Actives change the room:** the Dream Inceptor freezes everyone in their sleep, Bottled Turbulence slams every enemy into the walls and drops every bullet, the Herd of Dream Sheep stampedes through the room, and the Dog Whistle stuns everything for 3 seconds.
- **Companions:** a Nightmare Teddy that pounces, and the robot pup that comes with Snowball's Name Tag.
- **Looks:** Snuffles' helmet, Terry's hat, Goldenfold's grade book, and a striped nightmare sweater.

There are 8 new synergies (Good Boy Genius, Scary Morty, Frequent Flyer, Tea for Two, Counting to Zzz, Straight A's, Rope-a-Dope, Jet Lag) and one transformation. Hold any 3 of six dream items to become the **Lucid Dreamer**: a sleep mask, +25% damage, gently homing shots, and kills that sometimes leave a healing dream bubble.

## Game feel

- **Shots leave the weapon.**
  - Morty holds his weapon where you can see it. It turns with the aim, flips so it's never upside down, and goes behind him when he aims up.
  - Shots start at the muzzle, with a flash, a kick of recoil and a small nudge to Morty. If the muzzle is inside a wall, the shot pops against the wall right there.
  - Thrown weapons (garage junk, dodgeballs, rubber ducks, tennis balls) swing through instead, and the next one is already back in his hand.
  - A click is never lost. It fires on the same frame if the weapon is ready, or the moment it's ready if it's still cooling down.
  - Enemies with guns (gromflomite guards and snipers, dream soldiers, dog troopers) fire from their guns too.
- **You can tell every shot apart by shape alone.** Morty's shots are white-hot bolts edged in the weapon's color, pointing along their path with a short trail; thrown things keep their own shape, with a bright rim. Enemy shots are round, warm-colored blobs with a dark outline.
- **Every hit lands visibly.** The enemy flashes solid white, squashes, gets shoved along the shot and sprays sparks, with a hit sound of its own. Shields and Scary Terry clink and throw the sparks back; frozen enemies crack. A volley that lands many hits at once caps its hit sounds and merges its sparks.
- **Movement.**
  - Morty reaches full speed in about 0.08 s and stops dead in about 0.06 s. Turning around brakes harder than stopping, and diagonals are exactly as fast as straight lines.
  - He walks with his feet and arms swinging (a four-frame cycle), bobbing twice a stride and leaning into the way he's going. He breathes when he stands still.
  - Dust puffs up when he sets off, stops or turns sharply, and every few steps on grass, dirt and streets. A dash stretches him out on launch and squashes him on landing.
  - He faces where he's walking, except while shooting and for 0.4 s after the last shot, when he faces the aim. Everyone walking in a scene walks the same way, Rick included.
- **Slowdowns show on Morty:** goo on his shoes when Slimed, casts and a limp with Broken Legs, a customs stamp when Stamped, ripples on a slow floor. The first time each one happens in a run, a short toast says why he's slow.
- **Getting hurt never hides the danger.**
  - A hit lights up only the edge of the screen in red, for 0.1 s. The middle, where the bullets are, stays clear.
  - Morty then blinks between his own colors and a bright red tint while he can't be hurt. He never fades out.
  - Every full-screen flash goes through one rule: explosions (the neutrino bomb included), the Rick call, boss kills, dream shifts, blown cover and the lava moment. A flash is never solid, and it stays at 25% opacity or less whenever there are enemy shots or hazards on screen.

The settings (on the title screen, the pause menu and the TV in the Garage) change how it looks:

| Setting | What it does |
|---|---|
| Screen shake | Off turns off camera shake, the small camera kick on each shot and the camera tilt when the plane banks |
| Reduced flashing | On turns the hurt glow into a thin red border and Morty's blink into a slow pulse. Full-screen flashes become a faint tint. Enemies flash pale pink instead of white when hit, and warnings pulse gently instead of flickering |
| Damage numbers | On shows numbers floating up from hits (off by default) |

Every number behind all this lives in `FEEL` in `src/content/balance.ts` (`weapon`, `move`, `hits`, `hurt`, `flash`), and `tests/feel.test.ts` holds the game to them.

## Debug mode

Add `?debug=1` to the URL, for example http://localhost:5173/?debug=1 (or `#debug` at the end of the URL where query strings don't get through, such as a hosted copy). A **DEBUG** panel sits in the bottom-left corner; click it to expand it. It has:

- an FPS counter, god mode and a hitbox overlay;
- **No statuses**, which clears Morty's statuses and blocks new ones, so you can judge his movement on its own (the switches carry over to the next run);
- jumping to any act or room, revealing the map, finishing the current finale stage and taking the exit;
- giving any item, spawning any enemy (normal or elite), filling the Rick Meter and killing everything;
- a stress test with 40 enemies and 200 projectiles;
- restarting the run with a typed seed.

The same tools are on `window.rickStars` in the browser console. For example: `rickStars.startRun({ seed: 'ABCDEFGH', act: 2 })`, `rickStars.startRun({ episode: 'S01E02', act: 3 })`, `rickStars.give('neutrino-bomb')`, `rickStars.state()`. Two more are there for looking at game feel: `rickStars.noStatuses(true)` does what the panel switch does, and `rickStars.slowMo(0.1, 5)` runs the game at a tenth of its speed for 5 seconds, so you can watch a shot leave the muzzle or a hit land.

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
    runtime/         Phaser objects: player, enemies, pooled projectiles, telegraphs, rooms, fx;
                     plus the pure rules for aiming, walking and flashes (aim.ts, motion.ts,
                     flashes.ts)
    save/            versioned save with migrations
    audio/           WebAudio sound effects (including a proper burp) and step-sequenced music
    art/             drawing helpers; bakes code-drawn art into textures at boot
    ui/              menus, text styles, the HUD's data model
  content/
    registry.ts      the only file that lists episodes
    balance.ts       the numbers that tune difficulty, pacing and game feel (FEEL)
    shared/          characters, items, upgrades and lines used across episodes
    episodes/s01e01-pilot/
      episode.ts  acts.ts  enemies.ts  bosses.ts  hazards.ts  items.ts  weapons.ts
      statuses.ts  rooms.ts  specialRooms.ts  encounters.ts  scenes.ts  dialogue.ts
      cutscenes.ts  characters.ts  art.ts  backdrops.ts  icons.ts  music.ts
      mechanics/     grapplingShoes.ts, suspicion.ts (a factory Lawnmower Dog reuses)
    episodes/s01e02-lawnmower-dog/
      the same kinds of files (no hazards, statuses or icons files of its own)
      mechanics/     creakyFloors.ts, dreamControl.ts, scaryTerry.ts,
                     terryConfidence.ts, dogPatrols.ts
  scenes/            Boot, Title, TitleCard, Garage, SeasonMap, Run, Hud, Cutscene,
                     Pause, GameOver
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
- **Mechanics are plugins.** A `MechanicDef` gets lifecycle hooks: `onActStart`, `onRoomEnter`, `update`, `onRoomClear`, `onActEnd` and player events. It can also add an optional HUD widget. The Pilot's grappling shoes and suspicion meter are both plugins living in the episode folder. Lawnmower Dog adds five more, and its dog patrols are the Pilot's `createSuspicion` factory with dogs plugged in.
- **Story happens in the room.** Big beats play as in-engine scenes (`SceneStep[]`): characters walk in through doors or portals, talk in speech bubbles, emote, fire beams and hand Morty his weapon. Comic-panel cutscenes still cover cutaways, time skips and a few set pieces.
- **Acts can do more than fight.** An act can:
  - cut away to another character (`interlude`: Jerry, unarmed);
  - change places as Morty goes deeper (`layout.regions`: one dream into the next);
  - send a stage somewhere else (`FinaleStage.biome`: the chase into Terry's house);
  - take a story trip across town (`FixedLayout.trips`: Rick's ship).

  An enemy can be a `stalker` that can't be killed, only knocked dizzy (Scary Terry).
- **Items use hooks and stat modifiers.**
  - Hooks: `onFire`, `onHit`, `onKill`, `onDamageTaken`, `onDash`, `onDashContact`, `onRoomClear`.
  - Stats combine as (base + every add) × every multiplier, then clamp to limits.
  - Synergies switch on when all of their items are owned.
- **Enemies are generator functions ("brains")** that yield to wait. Every attack goes through `api.windup`. It draws a telegraph that uses shape and motion as well as color, and it can't be shorter than 0.4 s.
- **Determinism.** A run's seed derives separate random streams for floor layouts and for gameplay, so the same seed always builds the same floors. A test fails if `Math.random` appears anywhere in `src/`.
- **Saves are versioned** (currently version 3, with migrations from versions 1 and 2; Lawnmower Dog needed no save changes). A corrupt save, or one from a newer version, is backed up to `rick-stars.save.backup` and replaced with a fresh one instead of crashing the game.

### Differences from the original brief's sketch

The brief sketched a folder layout and some types. The code follows it, with these deliberate differences:

- **Folders.** `engine/combat/` became `engine/runtime/`, since it also holds rooms and effects, plus `engine/brains.ts` for the AI archetypes. The mechanic interface lives in `engine/types.ts` with the rest of the content contract, not in its own `engine/mechanics/` folder.
- **Prologue and epilogue** are playable acts with fixed room layouts and scripts, not just cutscenes. Both have gameplay: the tutorial and the bomb, then the quiz and the side effects.
- **Acts.**
  - `ActDef.finale` is a list of stages, so Customs goes from the Supervisor fight straight into the escape.
  - The room count lives in `ActDef.layout`, and Rick's gadget is `ActDef.rick.gadget`.
  - Each act has one special room.
- **Two extra overlay scenes:** `Hud` and `Pause`.
- **What `balance.ts` holds:** player stats, enemy and boss HP and speed, the Rick Meter, the economy, the Pilot's mechanics and the game-feel numbers (`FEEL`). Numbers that define one specific item, status or attack pattern (a flask's heal, a dodgeball's throw speed) live next to that content.
- **Dialogue.** `dialogue.ts` holds what's said during play; cutscene text stays in `cutscenes.ts`.

## Tests

| File | Covers |
|---|---|
| `tests/rng.test.ts` | The same seed gives the same sequence; forks are independent; seeds are created, normalized and formatted correctly |
| `tests/dungeon.test.ts` | 1,000 seeds for every procedural act: 8–12 rooms, every room reachable, exactly one finale, the required special rooms present, no overlapping rooms, doors matching on both sides. For acts split into regions (the dreams), every seed crosses every region in order, from the start to the finale, and each region has rooms and a fight of its own. The same seed gives the same floor. Fixed floors are fully reachable, counting story trips. |
| `tests/content.test.ts` | The registry validates cleanly. Canon gating, including an unlocked later-episode item staying out of the Pilot. Locked, story and already-stocked items stay out of pools. The Season 1 listing and "next up". No `Math.random` in `src/`. |
| `tests/items.test.ts` | Stat modifiers and hooks stack; statuses tick, chain and expire; inventory rules, including an active item keeping its charge through a swap. The item rules: every item has a plain effect line and honest tags, no plain stat change under 20%, stat-only items need a 25% change or a heart, actives change the room, bosses drop rares. Synergies (12+) and transformations trigger from exactly their items. |
| `tests/weapons.test.ts` | Every act with enemies gets a story weapon with a speaker and a line, and scripted hand-overs exist in the episode's code. The Pilot's weapon order. Shot items carry over between weapons. Hits to kill from each act's weapon, in both episodes: 2–4 for regular enemies (summons included), 5–8 for elites. Boss fights last 60–90 seconds. |
| `tests/lawnmower-dog.test.ts` | The act order and who plays each act. The Jerry cutaways stay quiet (unarmed, no enemies, no loot). The weapon beats. Both bosses give in instead of dying. At least 20 items, 6 synergies, the transformation and 6 enemy kinds per fight. Canon gating: Snuffles, Scary Terry, Mrs. Pancakes and friends at S01E02, Goldenfold still a Pilot character, nothing from S01E03 or later, nothing leaking back into the Pilot. The clear unlocks land in the right pools, and Anatomy Park is next. Scary Terry is a stalker. What the finger blades, parachute, tennis balls and Lucid Dreamer actually do. |
| `tests/save.test.ts` | A fresh save, a round-trip, v1 and v2 fixtures migrating, corrupt-save backup and reset, out-of-range values cleaned up |
| `tests/feel.test.ts` | Game feel. Every story weapon has something in hand. The muzzle sits out along the aim for every weapon and angle, and a shot whose muzzle is inside a wall pops at the wall. Input buffering: a press when ready fires the same frame, and a press during the cooldown fires the moment it ends. Enemy shots are round and Morty's are long bolts. Movement: the start and stop times, stopping distance, turn braking, diagonals within 2%, the same ramp when slowed, the walk cycle, and walk frames for everyone who walks in scenes. Flashes: the hurt glow lasts 80–120 ms and leaves the middle of the screen clear, every full-screen flash in the code stays at 25% or less with bullets on screen, and the blink is a tint that never fades Morty out. |

## Not yet implemented

- **Stretch goals:** gamepad support, key rebinding, mid-run save and quit, and the "nursing home" par time. Quitting a run from the pause menu ends it and banks half your Scrap, the same as a death.
- **Episodes after Lawnmower Dog.** S01E03 to S01E11 are listed as "coming soon", and later seasons show as one locked row.
- **Only enemies with guns fire from a muzzle.** Everything else still attacks from its body: critters that spit, jocks and lockers that throw, bosses' patterns and hazards' sweeps.
- **60 FPS on real hardware hasn't been measured.** Projectiles and effects are pooled, and the debug panel has a 40-enemy, 200-projectile stress test. But the game has only been run in a headless browser with software rendering, where it stays well under 60 FPS even when idle. It's still unknown whether a real GPU holds 60 FPS under that load.
  - That includes the game-feel pass. It was checked frame by frame in slow motion and against the numbers in `FEEL`, but nobody has yet played it at full speed to judge how it feels.
- **Balance hasn't been playtested by people.** The numbers in `balance.ts` are first-pass values, so the 20–30 minute run length is a target, not a measurement. Neither episode has been won start to finish by a person at normal speed.
  - Automated browser runs have played every act and finale of both episodes end to end with no console errors, using debug shortcuts to get through fights.
  - Scripted input separately played through the fights and scenes with real keyboard and mouse. For the Pilot, that meant both boss fights, the shoes, the customs queue, a shop purchase and the epilogue. For Lawnmower Dog, with god mode on, it meant every act, both Jerry cutaways, the Goldenfold and Snowball fights and the ending.
- **Debug jumps skip story beats.** For example, jumping straight to the Customs boss skips the blown cover, so the agents aren't labeled "ROBOT" and Morty still has the spare ray gun. Jumping straight to the end of Dreams Within Dreams skips meeting Scary Terry, so he's "back" for the chase before he was ever there.

## Adding episodes

See [docs/ADDING_AN_EPISODE.md](docs/ADDING_AN_EPISODE.md).
