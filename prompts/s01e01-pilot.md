# Rick-Stars · Prompt 01: Foundation + S01E01 "Pilot"

You're building **Rick-Stars**, an unofficial, non-commercial Rick and Morty fan game. It's a top-down action roguelite in the style of *The Binding of Isaac* and *Enter the Gungeon*, and the campaign moves through the show one episode at a time.

This prompt covers two things:

1. **The foundation:** an engine and content architecture that can eventually hold every episode of the series.
2. **Episode 1, "Pilot" (S01E01):** the first fully playable episode.

Build only Episode 1's content now. Later episodes will come in follow-up prompts. Every decision should make adding an episode a matter of adding a content folder, never editing engine code.

---

## 1. Tech stack

- TypeScript (strict), Vite, Phaser 3 (pin `phaser@^3`, Arcade physics), Vitest.
- Browser game, desktop-first, played with keyboard and mouse.
- No backend. Save to `localStorage` with a versioned schema and migrations.
- Scripts: `npm run dev`, `npm run build` (static `dist/`, hostable anywhere), `npm test`, `npm run typecheck`.
- If you're building inside a React app (e.g. Lovable), mount Phaser in a single component and keep all game logic out of React.

## 2. Ground rules

- **Original assets only.** Don't use any art, audio or voice clips from the show. Draw sprites in code (Phaser Graphics or inline SVG) with thick dark outlines, slightly wobbly shapes, flat bright colors and portal green (~`#97CE4C`) as the accent. Generate sound effects with WebAudio (jsfxr-style), and include a proper burp.
- **Original dialogue.** Write new lines in each character's voice:
  - Rick is brilliant, drunk and dismissive, and burps mid-sentence (write it as `—*urrp*—`).
  - Morty is anxious and stammering ("aw geez").

  Don't transcribe lines from the episode. Short nods to famous moments are fine.
- **Canon gating.** Every piece of content records the episode it first appears in (`firstAppears: 'S01E01'`) and whether it's canon or invented for this game (`canon: false`). An episode may only use content that has appeared by that point in the show. For the Pilot, that rules out Meeseeks, the Citadel or Council of Ricks, Birdperson, Mr. Poopybutthole, Pickle Rick, plumbuses and so on. Enforce this with a test.
- **Tone:** crude cartoon comedy and cartoon violence, no gore. The seed-smuggling gag stays implied and off-screen.
- **Disclaimer:** the title screen reads "Unofficial fan game. Not affiliated with Adult Swim."

## 3. Architecture (this is what has to scale to the whole series)

```
src/
  engine/            # knows nothing about specific episodes
    rng.ts           # seeded PRNG; every random call goes through it
    dungeon/         # room-graph generation from an act's config
    combat/          # player, weapons, pooled projectiles, enemies, AI behaviors
    effects/         # status effects + the item hook system
    mechanics/       # the interface episode-specific mechanics implement
    save/            # versioned save + migrations
    ui/              # HUD, minimap, dialogue box, cutscene player, menus
  content/
    registry.ts      # the only file that lists episodes
    balance.ts       # every tunable number
    shared/          # content reused across episodes
    episodes/s01e01-pilot/
      episode.ts  acts.ts  enemies.ts  bosses.ts  items.ts
      rooms.ts  dialogue.ts  cutscenes.ts  mechanics/
  scenes/            # Boot, Title, Garage (hub), SeasonMap, Run, Cutscene, GameOver
```

Content is typed data plus small behavior functions, roughly:

```ts
type EpisodeId = `S${string}E${string}`;          // 'S01E01'
interface ContentMeta { id: string; firstAppears: EpisodeId; canon: boolean }

interface EpisodeDef extends ContentMeta {
  season: number; number: number; title: string;
  prologue?: CutsceneId; epilogue: CutsceneId;
  acts: ActDef[];                  // played in order; one run = one episode
  unlocksOnClear: ContentId[];     // joins the global pool after the first clear
}

interface ActDef {
  id: string; name: string;
  playable: CharacterId;           // Morty for the whole Pilot; later B-plots can hand control to Summer, Jerry...
  biome: BiomeDef;
  roomCount: [min: number, max: number];
  enemyPool: Weighted<EnemyId>[];  // { id, weight }
  itemPool: Weighted<ItemId>[];
  specialRooms: SpecialRoomDef[];
  finale: BossId | EncounterId;
  rickGadget: GadgetId;            // what Rick does when you call him (see Rick Meter)
  mechanics: MechanicId[];         // episode-specific plugins, e.g. 'grappling-shoes'
  intro?: CutsceneId; outro?: CutsceneId;
}
```

- **Mechanics are plugins.** Episode-specific systems all implement one interface: lifecycle hooks (`onActStart`, `onRoomEnter`, `update`, `onRoomClear`, `onActEnd`) plus an optional HUD widget. That covers the Pilot's grappling shoes and customs suspicion, and whatever later episodes need. The engine never special-cases an episode.
- **Items use hooks** (`onFire`, `onHit`, `onKill`, `onDamageTaken`, `onDash`, `onRoomClear`) plus stat modifiers, so effects stack and synergize without special-case code.
- **Validate the registry** at boot and in tests: every referenced id exists and canon gating holds.
- Write `docs/ADDING_AN_EPISODE.md` with the exact steps for adding S01E02, so the next prompt can be short.

## 4. Core loop

- **One run is one episode.** The player picks an unlocked episode on the Season Map, plays its acts in order and reaches the epilogue. If Morty dies, the run ends and the player goes back to the hub.
- **Acts** are procedurally generated room grids of 8–12 rooms, Isaac-style.
  - Combat rooms lock their doors until they're cleared.
  - Every act has a start room, combat rooms, one treasure room, one shop, one special room and a finale.
  - Author room layouts as small ASCII grids (walls, pits and cliffs, spawn points, pickups), with at least 12 per act for the generator to pick from.
- **Scrap** is the only currency. Enemies drop it and shops take it during a run. Unspent Scrap is banked when the run ends: half on a death, all of it on a clear.
- **Rick's Garage (the hub).** Banked Scrap buys permanent upgrades: +1 max heart, a starting consumable, new items unlocked into the pool and cosmetics. Keep upgrades modest so skill matters more than grinding.
- **Season Map:** Season 1's 11 episodes appear as nodes. Only "Pilot" is playable. The rest show their titles and are locked as "coming soon": Lawnmower Dog, Anatomy Park, M. Night Shaym-Aliens!, Meeseeks and Destroy, Rick Potion #9, Raising Gazorpazorp, Rixty Minutes, Something Ricked This Way Comes, Close Rick-counters of the Rick Kind, Ricksy Business. Later seasons appear as one locked row.
- **Seeds:** every run has a seed, shown on the pause and death screens. Players can enter a seed to replay a run.

## 5. Player and combat

- **Morty, seen top-down.** Controls:
  - WASD: move
  - Mouse: aim
  - Left click: fire
  - Space: dash (brief invulnerability)
  - Shift: sneak (walk slowly)
  - E: interact
  - Q: call Rick
  - F: toggle the grappling shoes, once Morty has them
  - R: use a consumable
  - Tab: map
  - Esc: pause
- **Health:** Morty starts with 3 hearts and takes damage in half hearts.
- **Starting weapon:** Rick's spare ray gun (straight shots, medium fire rate).
- **Rick Meter:** fills as Morty deals damage. When it's full, press Q and Rick barges in, uses the act's gadget, says something rude and leaves. In the Pilot the gadget is the **freeze ray**: every enemy on screen freezes, and frozen enemies shatter on their next hit.
- **Starting numbers** (all in `balance.ts`):
  - Fire rate 3/s, shot damage 3.5.
  - Dash cooldown 0.8 s, with 0.25 s of invulnerability.
  - Regular enemies 8–15 HP, bosses 180–300 HP.
  - Every enemy attack gets a readable wind-up of at least 0.4 s.
- **Run length:** a full Pilot run should take 20–30 minutes.

## 6. Episode 1: "Pilot" (S01E01)

### What happens (source of truth)

- **Cold open:** in the middle of the night, a very drunk Rick drags Morty into a flying car he built from junk in the garage. He announces he'll wipe out humanity with a neutrino bomb and start over. Morty forces him to land, and Rick claims it was a test to make Morty more assertive. Then Rick passes out, leaving Morty to defuse the bomb.
- **Breakfast:** Jerry and Beth are upset that Rick keeps Morty out of school. Rick calls school a waste of time, then compliments Beth's breakfast. She tears up and forgives him, which annoys Jerry.
- **School (Harry Herpson High):** Morty falls asleep during Mr. Goldenfold's math test. The bully Frank Palicky pulls a switchblade on him over an insult Morty never made. Rick freezes Frank with a freeze ray and pulls Morty out of school. Later, Summer tries to flirt with the frozen Frank, and he tips over and shatters.
- **Dimension 35-C:** Rick portals them to a colorful, oddly shaped world where Mega Trees grow Mega Fruit, which hold the Mega Seeds he needs for his research. Morty doesn't turn on his special shoes, falls off a cliff and breaks both legs. Rick portals to a future dimension where every drugstore sells Broken Leg Serum, and one shot heals Morty. Then Morty uses the shoes to reach the Mega Fruit.
- **Interdimensional Customs:** the serum trip drained the portal gun, so they have to go home through customs. Morty hides the seeds (way up there). Their cover gets blown. Rick hands Morty a gun and says the bureaucratic insect agents (Gromflomites) are robots. They aren't. Rick and Morty shoot their way out.
- **Meanwhile:** Principal Vagina tells Jerry and Beth that Morty has spent about seven hours in school over two months, and they start packing Rick off to a nursing home.
- **Ending:** Rick asks Morty for the square root of pi and the first law of thermodynamics, and Morty nails both. The family is stunned. Rick explains that it's the Mega Seeds: the smarts are temporary, and the side effects arrive right away. Morty loses control of his body while Rick rambles about a hundred years of Rick and Morty adventures.

### Run structure

**Prologue: "Just a Test"** (fixed layout, about 2 minutes, skippable after the first clear)
- **Tutorial:** in Morty's bedroom and the garage, drunk Rick yells instructions while the player learns to move, dash and shoot at junk target drones.
- **Cutscene:** the flight, the neutrino bomb, "it was a test," and Rick passing out.
- **Finale:** defuse the neutrino bomb before the timer runs out. It's a short sequence puzzle (wires and switches), and the instructions come from Rick mumbling in his sleep.
- **Next:** the breakfast cutscene.

**Act 1: Harry Herpson High**
- **Biome:** hallways, lockers, classrooms, cafeteria, gym.
- **Starting status:** Morty is **Sleep-Deprived** (−15% fire rate) because Rick kept him up all night. It wears off after 3 cleared rooms.
- **Enemies** (invented, `canon: false`), each with an elite variant. For example:
  - pop-quiz paper swarms
  - a hall monitor whose whistle pulls in nearby enemies
  - a dodgeball jock whose throws bounce
  - cafeteria slop that splits when hit
- **Special room, Goldenfold's Pop Quiz:** quiz sheets attack while Morty answers 3 quick multiple-choice math questions (keys 1–4, 8 seconds each). All correct earns a rare item. Any wrong answer applies **Failing Grade** (−10% damage for the rest of the act).
- **Shop:** a school vending machine.
- **Boss, Frank Palicky:**
  - Attacks: switchblade slash arcs, lunging dashes, and kicking lockers open so textbooks fly out.
  - At half HP he's enraged and faster.
  - At zero HP a cutscene plays: Rick walks in, freezes him solid and drags Morty out. The frozen Frank stays in the boss room.
- **Outro cutaways:** Summer and the frozen Frank (he shatters), then Principal Vagina telling Jerry and Beth about the seven hours.

**Act 2: Dimension 35-C**
- **Biome:** bright, lumpy hills, cliff faces, floating rock shelves, Mega Trees.
- **Grappling Shoes** (mechanic plugin), toggled with F:
  - **On:** Morty can walk on cliff-face tiles to reach Mega Trees and side areas. The battery drains while they're on and recharges while they're off.
  - **Falling:** stepping onto a cliff tile with the shoes off, or running out of battery on one, means a fall. Morty returns to the last safe tile, loses half a heart and gets **Broken Legs** (−50% speed, no dash). Broken Legs lasts until he uses Broken Leg Serum or clears 2 more rooms.
- **Scripted canon beat in the first room:** the room's only exit crosses a cliff tile before the player has learned the toggle. Morty falls and his legs break. In the cutscene that follows, Rick lectures him about turning on the shoes, portals away to the future drugstore, comes back with the serum and heals him. This teaches the mechanic and explains why the portal gun is empty.
- **Enemies** (invented): canon shows almost nothing hostile here, so design 4 critters that fit the colorful, lumpy look. At least one steals Mega Fruit, and at least one knocks Morty toward cliff edges.
- **Special room:** a Mega Tree grove with a rare item, reachable only across cliff tiles.
- **Shop:** an odd 35-C trader critter. It always stocks Broken Leg Serum.
- **Finale, the Big Mega Tree:** a tall vertical arena made of cliff-face tiles. Morty has to harvest 3 Mega Fruit while waves of critters attack, keeping the shoes on and recharging on battery pads.
- **Outro cutscene:** the portal gun is empty, so they're going through customs, and the seeds go into hiding.

**Act 3: Interdimensional Customs**
- **Biome:** queue mazes, scanner gates, offices, a confiscated-goods vault, a departure hall.
- **Suspicion** (mechanic plugin):
  - The first 3–4 rooms are non-combat queue rooms.
  - Scanner gates add suspicion. Dashing, running or firing near agents adds more. Sneaking (holding Shift) adds less.
  - Each room crossed undetected pays out Scrap.
  - The cover is always blown at the final checkpoint, because that's canon. It can blow earlier if the meter fills.
- **Cover blown:**
  - Alarms go off, and every remaining room becomes a combat room.
  - Rick hands Morty his own ray gun, a weapon upgrade with more damage and a slight spread.
  - Rick swears the agents are robots. Their nameplates read "ROBOT" until the act ends, then flip to "NOT A ROBOT."
- **Enemies:** Gromflomite agents in invented roles, for example:
  - a clerk who throws paperwork and whose stamp slows Morty
  - a guard with a blaster
  - a riot agent with a shield that Morty has to flank
  - a sniper with a visible aim line
- **Special room:** the Confiscated Goods vault, where Morty chooses 1 of 3 items.
- **Shop:** Duty-Free (overpriced).
- **Boss, the Customs Supervisor** (invented; a senior Gromflomite):
  - Attacks: "DENIED" stamp shockwaves, paperwork barrages and summoned agents.
  - In phase 2 he seals the room with red-tape laser hazards.
- **Escape:** a 30–45 second sprint through the departure hall to the portal home while agents flood in.

**Epilogue: "Temporarily a Genius"**
- **Cutscene:** Jerry and Beth packing up Rick's things for the nursing home.
- **Interactive quiz:** Rick asks for the square root of pi (≈ 1.7724538509) and the first law of thermodynamics (energy is conserved; it can't be created or destroyed, only change form). The questions are multiple choice. Morty is seed-smart, so the right answers glow faintly; it's a victory lap, not a gotcha. Correct answers pay bonus Scrap.
- **Side effects:** for a few seconds the controls wobble and fail while Rick rambles about a hundred years of adventures.
- **Episode Complete screen:** stats, time, seed and the items found.

### Episode 1 items (at least 20 in total)

Canon (`firstAppears: 'S01E01'`):
- **Freeze Ray Mod** (passive): 12% of shots freeze the enemy they hit, and frozen enemies shatter on their next hit.
- **Rick's Flask** (active, 3-room recharge): heals 1 heart, with a 25% chance of **Drunk** for 5 seconds (wobbly aim, +20% damage).
- **Neutrino Bomb** (active, 6-room recharge): huge blast radius on a 3-second fuse. It costs Morty a full heart if he doesn't get clear.
- **Frank's Switchblade** (passive, dropped by Frank): dashing through enemies slashes them.
- **Broken Leg Serum** (consumable): cures Broken Legs and heals 1 heart.
- **Mega Seed** (consumable, joins the pool after the first clear): 20 seconds of **Genius** (+40% damage, Rick Meter fills 50% faster), followed by 6 seconds of **Side Effects** (wobbly movement, no dash).
- **Story gear** (not in the random pool): the Grappling Shoes (Act 2) and Rick's Ray Gun (Act 3).

Invented (`canon: false`):
- Fill out the rest of the pool with items themed on school, 35-C and customs.
- Every item gets a one-line funny description on pickup, Isaac-style.
- Include at least 2 synergies, for example:
  - Freeze Ray Mod + Frank's Switchblade: dash slashes instantly shatter frozen enemies.
  - Neutrino Bomb + Freeze Ray Mod: anything that survives the blast is frozen.

## 7. UI, feel and accessibility

- **HUD:** hearts, Rick Meter, the active item and its charge, the consumable slot, Scrap, minimap, status-effect icons and the act name. Mechanics add their own widgets: the shoe battery in Act 2 and the Suspicion meter in Act 3.
- **Cutscenes:** comic-panel style, 2–6 panels each, with portraits drawn in code. They're stored as data and are always skippable.
- **Death screen:** the cause of death, the seed, run stats, a random Rick one-liner and a retry button.
- **Game feel:** hit flash, knockback, particles, a brief hit-stop on big hits, screen shake.
- **Settings:** volume sliders, a screen-shake toggle, a reduced-flash mode and text speed.
- **Telegraphs:** use shape and motion as well as color.
- **Performance:** hold 60 FPS with 40 enemies and 200 projectiles on screen, using pooled objects.
- **Debug mode** (`?debug=1`): FPS, hitboxes, god mode, jump to any act or room, spawn items and enemies, reveal the map, set the seed.

## 8. Tests (Vitest)

- **RNG:** the same seed produces the same sequence and the same floors.
- **Dungeon:** for 1,000 seeds per act, every room is reachable, there's exactly one finale room, every required special room exists and no rooms overlap.
- **Content:** every id in the registry resolves, and no S01E01 pool contains content that first appears in a later episode.
- **Items:** stat modifiers and hooks stack correctly, and the synergies trigger.
- **Save:** a round-trip works, and a v1 fixture migrates correctly.

## 9. Build order

Work in these milestones. After each one, run the tests, the typecheck and the build, and fix anything broken before moving on.

1. Scaffold, scenes, input and one room where Morty moves and shoots.
2. Enemy behavior archetypes (chaser, shooter, charger, swarmer), damage, hearts, and death returning the player to the Garage.
3. Seeded dungeon generation, doors, minimap and room types.
4. Items, status effects, hooks, pickups, shop, Scrap and saving.
5. Pilot content, in this order:
   1. Act 1 and Frank
   2. Act 2 and the shoes
   3. Act 3, with Suspicion and the Supervisor
   4. The prologue, the epilogue and the cutscenes
6. Hub, Season Map, unlocks and the canon-gating tests.
7. Game feel, audio, accessibility and a balance pass.

Don't silently stub anything. If you cut something, list it in the README under "Not yet implemented."

## 10. Done means

- `npm test`, `npm run typecheck` and `npm run build` all pass, and a full run produces no console errors.
- A full Pilot run can be won start to finish: prologue, three acts, epilogue.
- Dying returns the player to the Garage.
- Clearing the Pilot adds its unlocks to the pool and marks Lawnmower Dog as next ("coming soon").
- A README covers how to run the game, the controls and the architecture, and `docs/ADDING_AN_EPISODE.md` exists.

**Stretch goals** (only after everything above is done):
- Gamepad support.
- Key rebinding.
- Mid-run save & quit.
- A "nursing home" par time: beat it, and Rick gets home before Jerry finishes packing, for bonus Scrap.
