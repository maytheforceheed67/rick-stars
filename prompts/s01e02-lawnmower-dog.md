# Rick-Stars · Prompt 02: Playtest fixes, better combat and items, more like the show, then S01E02 "Lawnmower Dog"

You're continuing **Rick-Stars**, the unofficial Rick and Morty fan roguelite built from Prompt 01 (`prompts/s01e01-pilot.md`). The Pilot is playable end to end. A playtest turned up several problems:

- art bugs;
- flat combat;
- items nobody wants to pick up;
- a gun that comes from nowhere;
- travel that doesn't feel like the show.

This prompt fixes those, then adds Episode 2.

Before you write code:

- **Read the existing docs:** `README.md`, `docs/ADDING_AN_EPISODE.md` and `prompts/s01e01-pilot.md`. Their rules still hold:
  - original art, audio and dialogue;
  - canon gating (`firstAppears`, `canon`);
  - the engine never names an episode;
  - tunable numbers live in `src/content/balance.ts`;
  - every random call goes through `Rng`;
  - the title-screen disclaimer stays.
- **Play the current Pilot once at normal speed** (`npm run dev`) so you've seen the problems yourself. `?debug=1` adds the debug panel.

Work through the parts in order. After each part:
- run `npm test`, `npm run typecheck` and `npm run build`;
- play what you changed;
- fix anything broken before moving on.

If time runs short, finish parts in order. A finished part beats five half-done ones.

---

## Part 1 · Playtest bugs

1. **Beth and Summer look like they have beards.** `drawPerson` and `drawPortrait` in `src/content/shared/art.ts` draw the back layer of the `long` and `bob` hairstyles as a shape around the whole head. It shows below the chin like a beard.
   - Hair must never frame or cover the jaw.
   - Match the show: Summer's hair is tied back in a ponytail, and Beth has shoulder-length blonde hair.

2. **Mr. Goldenfold is drawn wrong.** In the show he's an African-American man with a black mustache and black, balding hair. He wears a yellow v-neck sweater over an orange undershirt, with a grey tie, and no glasses. The game draws him light-skinned, with grey hair, glasses and a white shirt.
   - Fix his portrait (`src/content/episodes/s01e01-pilot/characters.ts`) and his in-room sprite (`src/content/episodes/s01e01-pilot/art.ts`).
   - Check every other character the same way against the show (skin tone, hair, facial hair, clothes), fix mismatches, and list what you changed.
   - Add a **character sheet** to debug mode: one screen that draws every character's portrait and world sprite side by side, so this is quick to check now and for every later episode.

3. **Active items can be used forever.** Picking up an active item always gives it a full charge (`Inventory.add` in `src/engine/effects/inventory.ts`), and the swapped-out item drops right next to Morty (`RunScene.giveItem`). Swapping two active items back and forth gives unlimited uses. Fix it:
   - An active item keeps its current charge when it's dropped and picked up again.
   - A dropped item lands a step away, so Morty doesn't swap back by accident.
   - Swapping asks first: "Swap Neutrino Bomb for Rick's Flask? [E]".
   - Add a unit test.

4. **Morty's gun comes from nowhere.** Every run starts with "Rick's Spare Ray Gun", and nothing in the story hands it to him. Part 3 fixes this.

5. **Anything else you find** while playing the whole Pilot at normal speed: fix it and list it in your final summary.

## Part 2 · Combat that feels good

Fights feel flat right now. Shots are small, enemies soak hits without reacting, and everything spawns at once.

**Feel**
- **Shots:** bigger and brighter, with a muzzle flash, a slight recoil kick, an impact spark and a distinct hit sound. Enemy shots stay clearly different from Morty's in both color and shape.
- **Hits:** enemies flash white, flinch and get knocked back.
  - Kills pop with a short hit-stop (30–60 ms) and a burst.
  - Heavier hits shake the screen harder.
  - Shake and flashes still obey Settings.
- **Morty:**
  - He shoots while moving at full speed, and his dash leaves afterimages.
  - A **perfect dodge** means dashing through an attack in its last 0.15 s before it lands. It slows time for 0.4 s and adds to the Rick Meter.
- **Damage numbers:** an optional setting, off by default.

**Enemies**
- At least 6 enemy types per act, each with a distinct role:
  - rusher;
  - shooter;
  - area denial;
  - tank;
  - support (buffs or heals others);
  - summoner.
- Each type keeps an elite variant. Elites get a visible modifier (shielded, hasty, splitting, explodes on death), not just more HP.
- Enemies move with intent:
  - shooters keep their distance and strafe;
  - rushers flank;
  - nobody stands idle for more than 1.5 s;
  - nobody shoots through walls.
- Every attack keeps a readable wind-up of at least 0.4 s.

**Rooms**
- Combat rooms spawn in 1–3 waves, each with a spawn warning. Nothing spawns within 3 tiles of Morty.
- Add ambush rooms, plus hazards that fit each act: lockers that burst open, spilled cafeteria slop, crumbling cliff edges, scanner beams.

**Bosses**
- Each boss has 3 phases and at least 3 attack patterns, with a phase-change moment: a line, a roar, or the arena changing.
- After a big attack, a short stagger window lets Morty's hits do extra damage.
- The boss bar shows phase ticks.

**Rick Meter**
- Calling Rick should feel huge: time freezes on the call, Rick delivers a line, then the freeze ray sweeps the room.
- Shattering a frozen enemy can chain to frozen enemies next to it.

**Numbers.** All of these live in `balance.ts`.
- Regular enemies die in 2–4 hits from the starting weapon, and elites in 5–8. Update `ENEMIES.regularHp` and its test to fit.
- Design target: a boss fight takes 60–90 seconds for a player without items.

## Part 3 · Weapons that make sense

In the show, Morty doesn't carry a gun until Customs, where Rick hands him one and swears the agents are robots. Give every weapon a story reason, shown on screen when Morty gets it:

| Where | Morty's weapon | How he gets it |
|---|---|---|
| Prologue (home) | Garage junk he throws | During target practice, Rick yells at him to throw stuff at the drones |
| Act 1 (school) | Dodgeballs from his gym bag | Invented slapstick. **No guns at school:** it isn't canon, and it reads badly in a school setting |
| Act 2 (Dimension 35-C) | Rick's spare ray gun | Rick tosses it to him on arrival, because the critters here bite |
| Act 3 (Customs) | Rick's own ray gun | Canon: Rick hands it over when their cover is blown |

- **Frank fight.** Change it to match the show. Morty pelts Frank with dodgeballs and survives his attacks until Frank is dazed. Then Rick walks in and freezes him.
- **Weapons and items.** Each act's story weapon replaces the last one. Items that change shots apply to whatever Morty is holding, so they carry over between acts.
- **Every future episode** needs a story reason for its weapons, shown in that episode. Add this rule to `docs/ADDING_AN_EPISODE.md`.

## Part 4 · Items worth collecting

Most Pilot items are small stat bumps, and there are only 3 synergies. Players can't feel them, so they stop caring. Examples:
- Calculator: +1 damage.
- Hall Pass: +12% move speed.
- Freeze Ray Mod: 12% freeze chance.
- Customs Stamp: 20% slow chance.

New rules for every item:

- **Every passive changes what you do or what you see.** It must do at least one of these:
  - change how shots behave (piercing, homing, splitting, bouncing, exploding, chaining, orbiting, charge shots);
  - add a companion that fights or helps;
  - trigger a visible effect on hit, kill, dash or taking damage;
  - change how Morty or his shots look;
  - be a large stat change: at least +25%, or +1 heart.
- **No pure stat change under 20%.** Enforce it with a content test: each item declares effect tags, and a pure-stat item must clear the threshold.
- **Active items are big.** Using one changes the room: it clears bullets, freezes everything, summons help or rewrites the floor. The HUD icon shows its charge.
- **Rework the existing Pilot items** to meet these rules instead of adding filler. Keep the identities of the canon items:
  - Freeze Ray Mod;
  - Rick's Flask;
  - Neutrino Bomb;
  - Frank's Switchblade;
  - Broken Leg Serum;
  - Mega Seed.
- **Synergies and transformations.**
  - The Pilot gets at least 12 synergies, each with a visible "SYNERGY!" moment.
  - Add 2 **transformations**. Holding any 3 items from a themed set (for example "Garage Tinkerer" or "Seed Smuggler") changes Morty's look and grants a strong bonus.
- **Rewards feel earned.** Bosses always drop a rare item. Treasure rooms offer a choice of 2. Shops mix one good item with consumables.
- **Every item says what it does.**
  - The pickup banner shows the funny line plus one plain line, such as "Shots pierce one enemy".
  - The pause screen lists every item Morty holds with its exact effect.

## Part 5 · Feel like the show

- **Travel the way the show does.** No generic exit doors or signs between acts. Morty goes wherever the episode goes:
  - by **Rick's ship**, the flying car he built in the garage;
  - through a **portal from Rick's portal gun** (green swirl);
  - through the **Customs departure portal**.

  Each trip is a short in-engine transition: the ship lifting off and crossing the sky, or stepping through a portal.
- **A Garage hub you walk around.** Replace the menu Garage with a room Morty walks around:
  - the workbench is upgrades;
  - the closet is shirts;
  - the TV is stats and settings;
  - walking into **Rick's ship** opens the Season Map, shown as the ship's navigation screen ("Where to, Morty?").
- **Rick comes along.** In acts where the episode has Rick with Morty (35-C and Customs), Rick walks with him as a non-combat companion.
  - He can't be hurt and doesn't block shots.
  - He comments on what's happening in short lines, burps included.
  - Calling Rick with the full meter is Rick stepping in, not appearing from nowhere.
- **Places look like the show:**
  - the Smiths' house and garage;
  - Harry Herpson High's lockers and classrooms;
  - Dimension 35-C's pastel, lumpy hills;
  - Customs' grey bureaucracy.

  Room-to-room doors inside an act become things that belong there: classroom doors, natural archways, security gates.
- **Scenes are acted out, not just drawn.** Big story beats play in-engine: characters walk, talk in speech bubbles and react. Comic panels remain for quick recaps and are always skippable.
- **Episode title card.** Each run opens with a short original card showing the episode number and title.

## Part 6 · S01E02 "Lawnmower Dog"

Build it by following `docs/ADDING_AN_EPISODE.md`, with Parts 2–5 applied from the start.

### What happens (source of truth)

**Snuffles (B-plot)**
- Jerry is fed up with Snuffles, the family dog, who keeps peeing on the carpet. He asks Rick to make the dog smarter, and Rick builds an intelligence-boosting helmet.
- Snuffles keeps getting smarter:
  - he boosts the helmet with extra batteries;
  - he builds a robotic arm and a speaker so he can talk;
  - he watches a TV special about how dogs were domesticated, and it turns him against humans;
  - he builds a robot suit, renames himself **Snowball**, and gives other dogs helmets.

**Dream diving (A-plot)**
- Rick wants Morty's math grade up so Morty can keep going on adventures. They dive into **Mr. Goldenfold's** dreams to incept him into giving Morty an A.
- **Goldenfold's dream takes place on a plane.** Rick tries to scare him into better grades, but Goldenfold controls his own dream and fights back with machine guns. Dying in a dream means dying for real.
- Goldenfold turns the dream against them, and they end up falling toward lava. To slow time, they dive into the dream of **Mrs. Pancakes**, Goldenfold's TV crush.
- Her dream is a club Morty is far too young for. Keep it off-screen: show only the velvet rope and a **centaur** bouncer.
- The centaur threatens them, so they dive into the centaur's dream. There they meet **Scary Terry**, a legally safe knockoff of a famous slasher, with blades for fingers and a foul catchphrase.
- They escape into a **little girl's dream**. Terry follows, because he can travel between dreams.
- Terry chases them into his house and into **his own dream**. There he's a kid at school, mocked for failing a pop quiz and forgetting his pants.
- Rick and Morty stand up for him. Terry wakes up as their friend, carries them back up through every dream layer, and helps convince Goldenfold. Morty gets his A.

**Ending**
- The dogs take over the world. Jerry tries to stop them the crudest way possible (keep it off-screen) and gets captured.
- Snowball rules, and humans live the way dogs used to. Snowball keeps Morty in luxury as his favorite.
- After what seems like a year, Rick reveals they're inside **Snowball's dream**. He makes Morty seriously ill (implied, off-screen) so Snowball sees what cruelty does.
- Snowball has a change of heart and leads the dogs away to a world of their own.

**Tone for this episode**
- Drop Rick's "terrorist" bluff entirely. He's just an obnoxious hijacker.
- Keep the club, Jerry's attempt and Morty's illness implied.
- Skip the post-credits scene.
- Write every line fresh. Short nods to famous moments are fine.

### Run structure (a starting point; keep the spirit)

- **Prologue, "Good Boy"** (fixed layout):
  - Snuffles gets the helmet.
  - Morty and Rick sneak into Goldenfold's house at night. This is a stealth-lite tutorial for the new mechanics.
  - They dive into his dream.
- **Act 1, "Goldenfold's Dream" (the plane):**
  - Goldenfold's dream control reshapes fights: walls slide, the cabin tilts, and he summons weapons.
  - **Weapon story:** Rick explains that in a dream you can imagine your own gear. Morty's weapon is whatever he dreams up, and it gets stranger with each layer.
  - **Boss:** Dream Goldenfold.
  - The act ends with the fall toward the lava.
- **Act 2, "Dreams Within Dreams":** one floor that crosses Mrs. Pancakes' dream (seen from outside), the centaur's dream and the little girl's dream.
  - **New mechanic, Scary Terry:** an unkillable stalker who hunts Morty from room to room. Hits only stagger him. The only way to shake him is to dive into another dreamer's dream, and he follows a while later.
  - The finale is the chase into Terry's house.
- **Act 3, "Scary Terry's Dream" (Terry's school):**
  - Protect Terry from the kids mocking him.
  - Help him with his pop quiz. Reuse the quiz system from the Pilot's special room.
  - Win him over.
  - The finale is the climb back up through the dream layers **with Terry fighting beside you** as a companion. It ends with the incept on Goldenfold.
- **"Meanwhile" interludes, playing as Jerry:** 2 short non-combat interludes between acts. `ActDef.playable` already supports this.
  - First: Jerry vs. an ever-smarter Snuffles.
  - Later: Jerry sneaking past dog patrols until he's captured. Reuse the Pilot's Suspicion mechanic.
- **Epilogue, "Snowball":**
  - Morty in the dog-ruled world, then a fight through the dog army to **Snowball in his robot suit**.
  - The fight ends in the canon twist, not a kill: it's Snowball's dream, he sees Morty suffer, and he relents.
  - The dogs leave through a portal to their own world.

### Content and canon

- **Canon gating.** New canon content gets `firstAppears: 'S01E02'`. That covers:
  - Snuffles/Snowball;
  - the helmet;
  - Scary Terry;
  - Mrs. Pancakes;
  - the centaur;
  - the little girl;
  - Rick's dream-diving device.

  Mr. Goldenfold stays `'S01E01'`. Pilot content may be reused, and nothing from S01E03 or later can be.
- **Enemies:** at least 6 per act, following Part 2. Ideas:
  - dream passengers and flight attendants;
  - Goldenfold's dream soldiers;
  - the little girl's toys;
  - Terry's classmates;
  - dog soldiers in robot suits.
- **Items:** at least 20 new ones, following Part 4, with at least 6 new synergies and 1 transformation. Canon candidates include Snuffles' helmet, Terry's finger blades, Rick's dream-diving device and a parachute from the plane.
- **Unlocks:** clearing the episode unlocks at least 2 items into the pool, and the Season Map marks "Anatomy Park" as next.

## Part 7 · Tests and done

**New or updated tests**
- The active-item swap keeps its charge.
- Item rules: every item declares effect tags, and pure-stat items clear the 20% floor.
- Synergies and transformations trigger.
- Hits-to-kill bands for every enemy, computed from `balance.ts`.
- Canon gating for S01E02: nothing from S01E03 or later.
- The 1,000-seed dungeon test covers every new procedural act.
- Each act's weapon comes from a scripted story beat.
- A save migration, if any saved id or field changes. Bump the save version and test the v2 fixture.

**Done means**
- `npm test`, `npm run typecheck` and `npm run build` all pass, and full runs of both episodes produce no console errors.
- The Pilot and Lawnmower Dog can each be won start to finish, at normal speed, without debug shortcuts.
- The debug character sheet shows no beards on Beth or Summer, and a Mr. Goldenfold who matches the show.
- `README.md` and `docs/ADDING_AN_EPISODE.md` are updated. Anything cut is listed in the README under "Not yet implemented." Don't silently stub anything.
