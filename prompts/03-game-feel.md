# Rick-Stars · Prompt 03: Game feel (shots from the weapon, readable hits, lively movement, damage feedback)

You're continuing **Rick-Stars**, the unofficial Rick and Morty fan roguelite. The Pilot (Prompt 01) and Lawnmower Dog (Prompt 02) are playable. A recorded playtest showed the game still *feels* wrong in four ways. This prompt fixes them across both episodes. It adds no new content.

What the recording showed:

- **Shots appear out of Morty's body.** He doesn't visibly hold his weapon; each shot pops out about 18 px from his middle, whatever he's holding. Recoil only nudges the camera.
- **Bullets and hits are hard to read (40–52 s).** Morty's shots are small tinted circles, and so are most enemy bullets. When a shot connects, the enemy barely reacts.
- **Movement feels static and weird.** Morty jumps from standing to full speed and back instantly. The only walk animation is his whole sprite rocking side to side, and he always faces the mouse, so he moonwalks when walking away from it. Top speed looks fine ("fairly brisk" in an empty room).
- **Getting hurt hides the danger (48.5 s and 56.5 s).** A red wash covers the whole screen, including the bullets you need to dodge.
- **Not a bug (52–54 s):** the slowdown there is the "Slimed" status from a slime puddle. It's deliberate, but the player couldn't tell *why* they were slow.

Before you write code:

- Read `README.md`, `docs/ADDING_AN_EPISODE.md` and the earlier prompts. Their rules still hold:
  - tunable numbers live in `src/content/balance.ts`;
  - every random call goes through `Rng`;
  - the engine never names an episode;
  - the Screen shake, Reduced flashes and Damage numbers settings are always respected.
- Play one combat-heavy act of each episode at normal speed with `npm run dev` (add `?debug=1` for the debug panel). Watch for exactly the problems above.
- The code involved:
  - `src/engine/runtime/Player.ts`: movement, facing, the rotation wobble, firing cadence.
  - `RunScene.onFire`: where shots spawn, the muzzle flash, the camera kick.
  - `src/engine/runtime/Projectiles.ts` and the shot sprites in `src/engine/art/engineSprites.ts`.
  - `Enemy.flashHit` and `RunScene.hitEnemy` / `shotHits`: hit reactions.
  - `RunScene.damagePlayer` and `Fx.flash`: the red wash.

Work through the parts in order. After each part:
- run `npm test`, `npm run typecheck` and `npm run build`;
- play what you changed;
- fix anything broken before moving on.

---

## Part 1 · Every shot starts at the weapon

1. **Morty holds his weapon where you can see it.** Draw each story weapon as a separate held sprite attached to his hand, drawn in code like everything else.
   - It turns toward the aim direction every frame.
   - It flips vertically when aiming left, so it's never upside down.
   - It's drawn behind him when aiming up and in front otherwise.
   - For guns, the barrel points at the cursor. For thrown weapons (garage junk, dodgeballs, rubber ducks, tennis balls), his arm holds the next object and swings through on each throw.
   - Every playable character works the same way, including Jerry when an interlude arms him.
2. **Give each weapon its own anchor points.** Add optional fields to `WeaponSpec`:
   - the held sprite;
   - the grip offset from Morty's body;
   - the muzzle offset from the grip;
   - the muzzle-flash size.
   Weapons without them get sensible defaults. The validator checks the held sprite exists.
3. **Spawn projectiles at the muzzle.** Use the rotated muzzle point, never Morty's center.
   - If the muzzle is inside a wall, the shot pops against the wall right there. It never comes out the other side.
   - Spread and extra projectiles fan out from the muzzle.
4. **Add a muzzle flash and recoil on every shot:**
   - a flash at the muzzle, 50–80 ms, scaled by the weapon (Rick's gun gets a bigger one than the spare);
   - the weapon kicks back 3–6 px along the barrel and tips up a few degrees, then returns within ~100 ms;
   - Morty's body gets a 1–2 px nudge;
   - the camera kick stays small and still obeys Screen shake;
   - thrown weapons get an arm swing and a whoosh puff instead of a flash.
5. **Make firing respond instantly.**
   - A press fires on the same frame, if the weapon is ready.
   - A press during the cooldown is buffered for ~0.15 s and fires the moment the weapon is ready. Clicks are never silently lost.
   - Holding the button fires at the weapon's fire rate, starting on the first frame.
   - Measure it: from input to projectile spawn should be one frame or less.
6. **Enemies with guns** (dream soldiers, gromflomite guards, dog troopers) should also fire from their weapon, not their middle, if that's cheap to add. Otherwise list it under "Not yet implemented".

## Part 2 · Bullets and hits you can read at a glance

1. **Player shots look nothing like enemy shots:**

   | | Morty's shots | Enemy shots |
   |---|---|---|
   | Shape | Elongated bolts pointing along their path, with a short trail | Round or chunky, never streaks |
   | Color | White-hot core, edged in the weapon's color | Warm, hostile colors (red, orange, magenta) with a dark outline |
   | Thrown weapons | Keep their object sprite (duck, ball, wrench), plus a bright rim and a trail | — |

   The difference must survive without color: shape alone should tell them apart. Check it in the busiest rooms of both episodes on every biome's floor (school checker, 35-C pastel, customs grey, the plane's blue carpet, the dream pinks). No shot should blend into the floor.
2. **Enemies react visibly the instant a shot connects:**
   - a solid white flash over the whole sprite for 60–80 ms (a real fill, not a faint tint);
   - a quick squash-and-stretch pop, ~90 ms;
   - a visible knockback shove along the shot's direction (bosses and tanks resist, but still twitch);
   - an impact spark at the contact point, sprayed along the shot's direction, bigger for crits and heavy weapons;
   - a short, punchy hit sound that's clearly different from the firing sound.
3. **Special cases get their own reactions:**
   - Shields and Scary Terry get a hard "clink" and a spark that bounces off.
   - Frozen enemies crack.
   - Kills keep their current pop and hit-stop.
4. **Keep it clean under heavy fire.** When a volley lands many hits at once, cap how many hit sounds play per frame and merge sparks, so nothing clips or turns to mush. Damage numbers stay an optional setting.

## Part 3 · Movement that feels alive

1. **Keep the top speed, add weight.** Tune with every status effect off (add a debug toggle that clears statuses and blocks new ones, and use an empty room):
   - **Starts:** full speed in ~0.08 s, a snappy ramp rather than an instant jump.
   - **Stops:** at rest within ~0.06 s, with no drifting on ice.
   - **Turns:** reversing direction brakes harder than a normal stop, so a 180° turn feels immediate.
   - **Diagonals:** the same speed as straight lines, within 2%.
   - Sneaking, slow floor and Slimed lower the top speed but keep the same snappy feel.
   - Put every number in `balance.ts` and add unit tests for the acceleration and diagonal math.
2. **Replace the rocking wobble with a real walk** for Morty, Jerry, and anyone walking in scenes (Rick walking along with Morty included):
   - a 3–4 frame walk cycle drawn in code (alternating feet, a slight arm swing);
   - a 2–3 px body bob, two bounces per stride, timed to the actual speed;
   - a 4–6° lean toward the direction of travel, and a little squash when stopping or landing;
   - idle breathing when standing still;
   - a small dust puff when starting, stopping and turning sharply, and every few steps on floors where it fits;
   - the dash keeps its afterimages, with a stretch on launch and a squash on landing.
3. **Fix facing so he stops moonwalking:**
   - While shooting (and for ~0.4 s after the last shot), he faces the aim direction.
   - Otherwise he faces where he's walking.
   - Add hysteresis around straight up and straight down so he doesn't flicker left and right.
4. **Make status slowdowns explain themselves.** When something slows Morty (Slimed, Broken Legs, Stamped, a slow floor), show it on him, not only as a HUD icon: goo on his feet, a limp or a stamp. The first time each one lands, show a short toast saying why, e.g. "Slimed: slower for 3 s".

## Part 4 · Getting hurt never hides the danger

1. **Replace the full-screen red wash with an edge flash:**
   - a red vignette on the outer edge of the screen only, 80–120 ms;
   - the play area in the middle stays fully clear;
   - with Reduced flashes on, it becomes a thin red border.
2. **Make Morty's blink readable.** During invulnerability he flickers between his normal colors and a bright white or red tint. He must never fade to near-invisible: you have to see where you are to dodge.
3. **Keep the rest:** the short hit-stop, the knockback, and the Screen shake setting all stay.
4. **Audit every other full-screen flash** and fix any that break this rule: explosions, the Rick call, perfect dodges, the neutrino bomb, dream shifts, cover blown, the lava moment. None may cover the play area with more than ~25% opacity, or for longer than ~60 ms, while enemy bullets are on screen.

## Part 5 · Tests and done

**New or updated tests**
- The muzzle position for each weapon and aim angle, including shots that start inside a wall.
- Input buffering: a press during the cooldown fires when the weapon is ready, and a press when ready fires the same frame.
- The acceleration curves, stopping distance, turn braking and diagonal normalization.
- Flash rules: the hurt flash duration and area, and the opacity limits for full-screen flashes.

**Done means**
- `npm test`, `npm run typecheck` and `npm run build` all pass, and full runs of both episodes produce no console errors.
- In a recording of a busy fight, you can tell every one of Morty's shots from every enemy bullet, and see every hit land.
- Shots visibly leave the weapon, with a flash and recoil, on the frame you press fire.
- In an empty room with statuses off, Morty's starts, stops, turns and diagonals match the numbers above, and his walk no longer rocks or moonwalks.
- Getting hurt never hides a bullet.
- `README.md` describes the feel settings and the debug toggle, and anything cut is listed under "Not yet implemented". Don't silently stub anything.
