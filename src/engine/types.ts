/**
 * Content-facing types. Episodes are plain data built from these interfaces plus small behavior
 * functions that talk to the running game through the APIs declared here (GameCtx, EnemyApi,
 * RoomScriptApi, MechanicApi). Nothing in this file imports Phaser at runtime, so content modules
 * stay testable in Node.
 */
import type Phaser from 'phaser';
import type { Track } from './audio/music';
import type { SfxRecipe } from './audio/sfx';
import type { Rng } from './rng';
import type { StatBlock, StatModifiers } from './effects/stats';

// ---------------------------------------------------------------------------------------------
// Identity and canon metadata
// ---------------------------------------------------------------------------------------------

/** 'S01E01' style id. Compare with compareEpisodes() in engine/episodes.ts. */
export type EpisodeId = `S${string}E${string}`;
export type ContentId = string;

export interface ContentMeta {
  id: ContentId;
  /** The episode this first appears in (in the show, or first used by this game if invented). */
  firstAppears: EpisodeId;
  /** true = from the show; false = invented for this game. */
  canon: boolean;
}

export interface Weighted<T extends string = string> {
  id: T;
  weight: number;
}

export interface Vec {
  x: number;
  y: number;
}

// ---------------------------------------------------------------------------------------------
// Art (drawn in code at boot; see engine/art)
// ---------------------------------------------------------------------------------------------

export type Graphics = Phaser.GameObjects.Graphics;

/** A texture generated at boot by drawing into a Graphics object. */
export interface SpriteArt {
  key: string;
  width: number;
  height: number;
  /**
   * Draws the sprite. With `poses`, it's also baked in every SpritePose (a walk cycle, and a
   * free front arm for holding a weapon); without a pose it draws the plain standing frame.
   */
  draw(g: Graphics, w: number, h: number, pose?: SpritePose): void;
  /**
   * Bake the walk cycle's frames too: `true` adds the weapon-holding frames as well (characters
   * you can play), 'walk' only the walk cycle (people who just walk in scenes).
   */
  poses?: boolean | 'walk';
}

/** One frame of a character in motion (SpriteArt.poses). */
export interface SpritePose {
  /** The walk cycle: -1 the left foot is up, 1 the right foot, 0 both down. */
  stride: -1 | 0 | 1;
  /** Leave out one arm (in the drawing's own left/right: -1 left, 1 right); a held weapon's arm replaces it. */
  freeArm: -1 | 0 | 1;
}

/** Draws a 32x32 item/status icon (centered at 16,16). */
export type IconDraw = (g: Graphics) => void;

/** Draws a portrait into a square box. */
export type PortraitDraw = (g: Graphics, size: number, expression: string) => void;

/** Draws a cutscene backdrop into a panel. */
export interface BackdropDef {
  id: string;
  draw(g: Graphics, w: number, h: number): void;
}

// ---------------------------------------------------------------------------------------------
// Characters, cutscenes, dialogue
// ---------------------------------------------------------------------------------------------

export interface CharacterDef extends ContentMeta {
  name: string;
  /** Accent color for speech bubbles and name tags. */
  color: number;
  portrait: PortraitDraw;
  /** World sprite, when the character appears in rooms. */
  sprite?: SpriteArt;
  /** The same sprite with a different shirt color (cosmetic upgrades for playable characters). */
  recolor?(shirt: number, key: string): SpriteArt;
  /**
   * How a playable character holds a weapon: the shoulder, from the body's center (its feet-level
   * middle), on the right side (mirrored for the left), and the colors of the arm that holds it.
   */
  holds?: { shoulder: { x: number; y: number }; sleeve: number; skin: number };
}

export interface CutscenePanel {
  backdrop: string;
  speaker?: ContentId;
  expression?: string;
  /** Other characters drawn small in the panel. */
  cast?: ContentId[];
  text: string;
  /** Narration box instead of a speech line. */
  caption?: boolean;
  sfx?: string;
}

export interface CutsceneDef extends ContentMeta {
  title?: string;
  /** 2 to 6 panels, shown one after another on a single comic page. */
  panels: CutscenePanel[];
}

// ---------------------------------------------------------------------------------------------
// Stats, statuses, items
// ---------------------------------------------------------------------------------------------

export type StatusDuration =
  | { kind: 'seconds'; value: number }
  | { kind: 'rooms'; value: number }
  | { kind: 'act' }
  | { kind: 'manual' };

export interface StatusFlags {
  noDash?: boolean;
  /** Movement direction drifts. */
  wobblyMove?: boolean;
  /** Aim drifts. */
  wobblyAim?: boolean;
  /** Inputs randomly drop and swap. */
  scrambled?: boolean;
  /** He walks with a limp (every other step dips). */
  limp?: boolean;
}

export interface StatusDef extends ContentMeta {
  name: string;
  description: string;
  positive: boolean;
  duration: StatusDuration;
  stats?: StatModifiers;
  flags?: StatusFlags;
  /** Status applied when this one runs out on its own (e.g. Genius -> Side Effects). */
  thenApply?: ContentId;
  /** Also ends when the act ends, whatever its duration (act-flavored statuses). */
  endsWithAct?: boolean;
  /**
   * Shows on the character while it lasts, so a slowdown explains itself (goo on his feet, a
   * stamp on his shirt): a sprite, at his feet, on his body or over his head.
   */
  shows?: { art: string; at: 'feet' | 'body' | 'head' };
  /** Said once, the first time it lands in a run ("Slimed: slower until you're out of the slop"). */
  explain?: string;
  icon: IconDraw;
}

export type ItemKind = 'passive' | 'active' | 'consumable' | 'weapon';
export type Rarity = 'common' | 'rare' | 'story';

/**
 * What an item changes, so the rules every item follows can be checked (tests/items.test.ts).
 * A passive must change what Morty does or what he sees: a plain 'stat' item only counts when
 * its changes are big (ITEM_RULES in balance.ts).
 */
export type ItemEffect =
  /** How shots behave: pierce, homing, split, bounce, blast, chain, orbit, charge, crits. */
  | 'shots'
  /** A companion that fights or helps. */
  | 'companion'
  /** A visible effect when a shot hits, something dies, Morty dashes or gets hurt. */
  | 'on-hit'
  | 'on-kill'
  | 'on-dash'
  | 'on-hurt'
  /** Changes how Morty or his shots look. */
  | 'look'
  /** Runs an episode mechanic (the grappling shoes). */
  | 'mechanic'
  /** Plain stat changes. */
  | 'stat'
  /** Actives: changes the whole room (clears bullets, freezes everything, summons help). */
  | 'room'
  /** Consumables. */
  | 'heal'
  | 'status';

/** How holding an item (or a transformation) changes the way Morty and his shots look. */
export interface LookSpec {
  /** Recolors his shirt. */
  shirt?: number;
  /** Something he wears, drawn over his sprite (a sprite key), nudged `dy` pixels from his head. */
  accessory?: string;
  dy?: number;
  /** A sparkly trail behind him while he moves. */
  trail?: number;
  /** The halo color of his shots. */
  glow?: number;
}

/** A buddy that follows Morty while he holds the item. */
export interface CompanionSpec {
  /** World sprite key. */
  art: string;
  /**
   * 'shooter' fires at the nearest enemy; 'pouncer' leaps onto enemies and bites; 'guard' circles
   * Morty and eats enemy bullets.
   */
  kind: 'shooter' | 'pouncer' | 'guard';
  /** Seconds between attacks (the companionRate stat speeds it up). */
  every: number;
  /** Damage per attack, as a share of Morty's shot damage. */
  damage: number;
  flying?: boolean;
}

export interface WeaponSpec {
  /** Multiplies damage from stats. */
  damageMult: number;
  fireRateMult: number;
  extraProjectiles: number;
  /** Extra total spread in radians. */
  spread: number;
  /** Energy shots are tinted this color; it also colors the muzzle flash and the shot's halo. */
  color: number;
  /** Energy bolts fired from a gun, or things Morty throws (no muzzle flash, drawn untinted). */
  style?: 'energy' | 'thrown';
  /** Shot sprite key, or several to pick from at random (a hail of garage junk). Default 'shot-player'. */
  shot?: string | readonly string[];
  /** Degrees per second a thrown shot spins (0 = points along its path). */
  spin?: number;
  /** Multiply shot size, speed, range and knockback. */
  sizeMult?: number;
  speedMult?: number;
  rangeMult?: number;
  knockbackMult?: number;
  /** Extra wall bounces. */
  bounces?: number;
  /** Sound each shot makes (default 'shoot', or 'shoot-heavy' for hard hitters). */
  sfx?: string;
  /**
   * The weapon Morty visibly holds: a sprite drawn pointing right, held at 6 px from its left
   * edge, halfway up. Guns need one; thrown weapons hold the next thing they throw by default.
   */
  held?: string;
  /** Where his hand is, from his shoulder, along the aim (x) and across it (y, + is down when aiming right). */
  grip?: { x: number; y: number };
  /** Where shots leave, from the hand, along the barrel (x) and across it (y). */
  muzzle?: { x: number; y: number };
  /** Muzzle flash size (1 = Rick's spare ray gun; his own gun gets a bigger one). */
  flash?: number;
}

export interface ItemDef extends ContentMeta {
  name: string;
  /** One-line funny description shown on pickup. */
  blurb: string;
  /** One plain line saying exactly what it does ("Shots pierce one enemy"). */
  effect: string;
  /** What it changes (see ItemEffect). */
  tags: ItemEffect[];
  kind: ItemKind;
  rarity: Rarity;
  /** Base shop price in Scrap. */
  price: number;
  stats?: StatModifiers;
  hooks?: ItemHooks;
  /** Active items: recharge is counted in cleared rooms. Return false to keep the charge. */
  active?: { recharge: number; use(ctx: GameCtx): boolean | void };
  consumable?: { use(ctx: GameCtx): boolean | void };
  weapon?: WeaponSpec;
  /** A buddy that follows Morty while he holds this. */
  companion?: CompanionSpec;
  /** How holding it changes Morty or his shots. */
  look?: LookSpec;
  icon: IconDraw;
  /** Can't drop until unlocked (garage upgrade or an episode clear). */
  locked?: boolean;
  /** Story gear handed out by scripts; never in random pools. */
  noPool?: boolean;
}

export type HitSource = 'shot' | 'slash' | 'explosion' | 'shard' | 'poison' | 'rick' | 'hazard' | 'zap' | 'orbit' | 'companion';

export interface HitInfo {
  source: HitSource;
  damage: number;
  /** Free-form tag, e.g. 'neutrino' for the bomb blast. */
  tag?: string;
  wasFrozen: boolean;
  killed: boolean;
  /** Shots only: the shot bounced off a wall (or ricocheted off an enemy) before hitting. */
  bounced?: boolean;
  /** Shots only: a critical hit (critRate). */
  crit?: boolean;
}

export interface ShotInfo {
  angle: number;
  x: number;
  y: number;
}

export interface ItemHooks {
  onFire?(ctx: GameCtx, shot: ShotInfo): void;
  onHit?(ctx: GameCtx, enemy: EnemyRef, hit: HitInfo): void;
  onKill?(ctx: GameCtx, enemy: EnemyRef, hit: HitInfo): void;
  onDamageTaken?(ctx: GameCtx, halves: number, source: string): void;
  onDash?(ctx: GameCtx): void;
  /** The dashing player passed through an enemy (once per enemy per dash). */
  onDashContact?(ctx: GameCtx, enemy: EnemyRef): void;
  onRoomClear?(ctx: GameCtx): void;
  /** Morty used his active item. */
  onUseActive?(ctx: GameCtx, itemId: ContentId): void;
}

export interface SynergyDef extends ContentMeta {
  name: string;
  blurb: string;
  /** One plain line saying exactly what it adds. */
  effect: string;
  /** Active while the player holds every one of these items. */
  requires: ContentId[];
  stats?: StatModifiers;
  hooks?: ItemHooks;
}

/**
 * Holding any `count` items from a themed set transforms Morty: a new look and a strong bonus
 * ("Garage Tinkerer").
 */
export interface TransformationDef extends ContentMeta {
  name: string;
  blurb: string;
  /** One plain line saying exactly what it does. */
  effect: string;
  set: ContentId[];
  /** How many of the set it takes (default 3). */
  count?: number;
  look: LookSpec;
  stats?: StatModifiers;
  hooks?: ItemHooks;
}

// ---------------------------------------------------------------------------------------------
// Runtime handles given to content code
// ---------------------------------------------------------------------------------------------

export interface PlayerRef {
  readonly x: number;
  readonly y: number;
  /** Health in half hearts. */
  readonly hp: number;
  readonly maxHp: number;
  readonly aimAngle: number;
  readonly moving: boolean;
  readonly sneaking: boolean;
  readonly isDashing: boolean;
  readonly isInvulnerable: boolean;
  readonly controlLocked: boolean;
  heal(halves: number): void;
  damage(halves: number, source: string, opts?: { ignoreInvulnerability?: boolean }): void;
  knockback(angle: number, force: number): void;
  setPosition(x: number, y: number): void;
  setControlLocked(locked: boolean): void;
}

export interface EnemyRef {
  readonly uid: number;
  readonly def: EnemyDef;
  readonly x: number;
  readonly y: number;
  readonly hp: number;
  readonly maxHp: number;
  readonly alive: boolean;
  readonly frozen: boolean;
  readonly elite: boolean;
  readonly passive: boolean;
  readonly poisoned: boolean;
  readonly stunned: boolean;
  /** Slowed down (a Customs Stamp, a hall monitor's whistle). */
  readonly slowed: boolean;
}

export interface ToastOptions {
  color?: number;
  seconds?: number;
  /** Big centered banner instead of a small toast. */
  banner?: boolean;
  sub?: string;
}

export interface ExplosionSpec {
  x: number;
  y: number;
  radius: number;
  damage: number;
  /** Half hearts dealt to the player if inside the radius (0 = harmless to the player). */
  playerDamage?: number;
  tag?: string;
  color?: number;
  /** A little pop (a stomp, an acid splash) instead of a full explosion: less shake and fire. */
  small?: boolean;
}

export interface PlayerShotSpec {
  x: number;
  y: number;
  angle: number;
  damage: number;
  /** Sprite key (default: an energy bolt tinted `color`). */
  texture?: string;
  /** Degrees per second the sprite spins (0 = points along its path). */
  spin?: number;
  /** Stays upright, facing left or right (critters running). */
  upright?: boolean;
  /** Enemies it passes through, and how hard it homes in (radians per second). */
  pierce?: number;
  homing?: number;
  speed?: number;
  radius?: number;
  color?: number;
  source?: HitSource;
  tag?: string;
  /** Lifetime in seconds. */
  life?: number;
}

/** The game as seen by items, statuses, gadgets, mechanics and scripts. */
export interface GameCtx {
  readonly rng: Rng;
  readonly player: PlayerRef;
  readonly episodeId: EpisodeId;
  readonly actId: string;
  /** Seconds since the run started (pauses excluded). */
  now(): number;
  stats(): StatBlock;
  hasItem(id: ContentId): boolean;
  giveItem(id: ContentId, opts?: { silent?: boolean }): void;
  /** Takes an item away (a story buddy heading home). */
  removeItem(id: ContentId): void;
  applyStatus(id: ContentId): void;
  removeStatus(id: ContentId): void;
  hasStatus(id: ContentId): boolean;
  enemies(): EnemyRef[];
  damageEnemy(enemy: EnemyRef, amount: number, source: HitSource, tag?: string): void;
  freeze(enemy: EnemyRef, seconds: number): void;
  stun(enemy: EnemyRef, seconds: number): void;
  poison(enemy: EnemyRef, dps: number, seconds: number): void;
  /** Speed multiplier for a while: below 1 slows, above 1 hastes. */
  slow(enemy: EnemyRef, mult: number, seconds: number): void;
  explode(spec: ExplosionSpec): void;
  playerShot(spec: PlayerShotSpec): void;
  /** Run something later (in run time; paused with the game). */
  after(seconds: number, fn: () => void): void;
  scrap(): number;
  addScrap(amount: number, x?: number, y?: number): void;
  spendScrap(amount: number): boolean;
  /** Run-scoped flags shared by scripts and mechanics. */
  readonly flags: Record<string, unknown>;
  toast(text: string, opts?: ToastOptions): void;
  /** Speech bubble from a character (placed near the player if the character isn't on screen). */
  say(speaker: ContentId, text: string, seconds?: number): void;
  sfx(id: string): void;
  shake(intensity: number, ms: number): void;
  /**
   * A full-screen flash of color, fading out over `ms`. It never hides the bullets: it's never
   * solid, and stays faint (FEEL.flash.busyAlpha) while anything to dodge is on screen.
   */
  flash(color: number, ms: number): void;
  /** Shows a temporary pulsing sprite (e.g. a lit bomb) for a few seconds. */
  marker(art: string, x: number, y: number, seconds: number): void;
  /** A purely visual effect: particles, a ring, a lightning zap, a slash, a word. */
  vfx(spec: VfxSpec): void;
  /** Removes every enemy bullet in the room and returns how many there were. */
  clearEnemyShots(): number;
  /** Shoves enemies within `radius` of (x, y) away from it. */
  pushEnemies(x: number, y: number, radius: number, force: number): void;
  /** Tilts the camera by `radians` for `seconds`, then levels it (a plane banking). */
  tilt(radians: number, seconds: number): void;
}

export type VfxSpec =
  | { kind: 'burst'; style: 'hit' | 'death' | 'ice' | 'scrap' | 'slime' | 'paper' | 'portal' | 'smoke' | 'spark' | 'heal' | 'fire' | 'confetti'; x: number; y: number; count?: number }
  | { kind: 'ring'; x: number; y: number; color: number; radius: number }
  | { kind: 'zap'; from: Vec; to: Vec; color?: number }
  | { kind: 'slash'; x: number; y: number; angle: number; color?: number }
  | { kind: 'text'; x: number; y: number; text: string; color?: string };

// ---------------------------------------------------------------------------------------------
// Enemies and bosses
// ---------------------------------------------------------------------------------------------

/**
 * Enemy behavior is a generator ("brain") advanced once per frame. Yield a number to wait that
 * many seconds, a predicate to wait until it's true, or nothing to wait one frame.
 */
export type BrainYield = number | undefined | void | (() => boolean);
export type Brain = Generator<BrainYield, void, undefined>;

export type TelegraphSpec =
  | { kind: 'circle'; x: number; y: number; radius: number }
  | { kind: 'arc'; x: number; y: number; radius: number; angle: number; spread: number }
  | { kind: 'line'; x: number; y: number; angle: number; length: number; width: number }
  | { kind: 'ring'; x: number; y: number; radius: number; thickness: number }
  /** Where an enemy is about to appear (not an attack). */
  | { kind: 'spawn'; x: number; y: number; radius: number };

/** Built-in enemy shot looks. Content can add a kind by registering a sprite keyed `shot-<kind>`. */
export type ShotKind = 'orb' | 'paper' | 'ball' | 'book' | 'spore' | 'bolt' | 'stamp' | 'ice' | (string & {});

export interface EnemyShotSpec {
  x?: number;
  y?: number;
  angle: number;
  speed: number;
  count?: number;
  /** Total spread in radians across `count` shots. */
  spread?: number;
  damage?: number;
  radius?: number;
  bounces?: number;
  kind?: ShotKind;
  color?: number;
  life?: number;
  /** Status applied to the player on hit (e.g. 'stamped'). */
  applies?: ContentId;
  /** Drawn this far above its floor point (a gun held at chest height; see EnemyDef.muzzle). */
  lift?: number;
}

export type MeleeSpec =
  | { shape: 'arc'; x: number; y: number; radius: number; angle: number; spread: number; damage: number; knockback?: number }
  | { shape: 'circle'; x: number; y: number; radius: number; damage: number; knockback?: number };

export type HazardSpec =
  | { kind: 'shockwave'; x: number; y: number; speed: number; maxRadius: number; thickness: number; damage: number; label?: string }
  | { kind: 'laser'; x1: number; y1: number; x2: number; y2: number; width: number; warn: number; active: number; damage: number }
  /** A lingering puddle: hurts and/or applies a status while Morty stands in it. */
  | { kind: 'pool'; x: number; y: number; radius: number; seconds: number; damage?: number; status?: ContentId; color?: number }
  /** A beam from (x, y) rotating from angle `from` to `to` over `seconds`. */
  | { kind: 'sweep'; x: number; y: number; from: number; to: number; length: number; width: number; seconds: number; damage: number };

export interface EnemySelf extends EnemyRef {
  readonly vx: number;
  readonly vy: number;
  /** Body radius in pixels (elites are bigger). */
  readonly radius: number;
  /** Size multiplier (1 for normal enemies). */
  readonly sizeScale: number;
  /** Blocked by a wall on the last physics step. */
  readonly blocked: boolean;
  setVelocity(vx: number, vy: number): void;
  setInvulnerable(on: boolean): void;
  /** 0..1 squash/lean used while winding up (purely visual). */
  setWindupPose(amount: number): void;
  setFacing(angle: number): void;
  setAlpha(alpha: number): void;
  setNameplate(text: string | null): void;
  /** Swaps the sprite (a locker bursting open, a ledge crumbling away). */
  setArt(key: string): void;
  readonly hp: number;
  readonly maxHp: number;
  /** Heals up to max HP (support enemies). */
  heal(amount: number): void;
  /** Moves faster for a while (buffed by a support enemy). */
  haste(seconds: number): void;
  /** Gives a bubble that soaks the next `hits` hits. */
  grantShield(hits: number): void;
  teleport(x: number, y: number): void;
  /** Dies normally (drops, death effects, hooks). */
  kill(): void;
  /** Leaves the room quietly: no drops, no death effects (e.g. a thief escaping). */
  despawn(): void;
  /** Per-enemy scratch state for brains. */
  readonly memory: Record<string, unknown>;
}

export interface EnemyApi {
  readonly self: EnemySelf;
  readonly player: PlayerRef;
  readonly rng: Rng;
  readonly ctx: GameCtx;
  dt(): number;
  /** Elite override for a named parameter, or the fallback. */
  param(name: string, fallback: number): number;
  /** Move along the room's flow field toward the player for this frame. */
  chase(speedMult?: number): void;
  moveToward(x: number, y: number, speedMult?: number): void;
  moveAngle(angle: number, speedMult?: number): void;
  /** Stay between min and max distance from the player, strafing. */
  keepDistance(min: number, max: number, speedMult?: number): void;
  stop(): void;
  distToPlayer(): number;
  angleToPlayer(): number;
  canSeePlayer(): boolean;
  /**
   * Shows a telegraph for `seconds` (scaled by the player's enemy wind-up multiplier, never under
   * 0.4 s) while the enemy leans into the attack. Use with yield*.
   */
  windup(seconds: number, spec?: TelegraphSpec | TelegraphSpec[] | (() => TelegraphSpec)): Brain;
  shoot(spec: EnemyShotSpec): void;
  /** Instant melee check against the player. Returns true on a hit. */
  melee(spec: MeleeSpec): boolean;
  hazard(spec: HazardSpec): void;
  spawn(enemyId: ContentId, x: number, y: number, opts?: { elite?: boolean }): EnemyRef | null;
  say(text: string, seconds?: number): void;
  sfx(id: string): void;
  shake(intensity: number, ms: number): void;
  room(): RoomInfo;
  /**
   * Leaves the enemy open after a big attack: it stops, shows dizzy stars and takes extra damage
   * (ENEMIES.staggerMult) for `seconds`. Use with yield*.
   */
  stagger(seconds: number): Brain;
  /** Other hostile enemies within `radius` (not hazards or calm NPCs). */
  allies(radius: number): EnemySelf[];
  /** Approaches the player from the side, the way rushers flank. */
  flank(speedMult?: number): void;
  /** Drops the floor within `radius` of this spot: Morty falls unless a mechanic lets him stand there. */
  pitfall(radius: number): void;
}

/** Visible twists an elite enemy spawns with, on top of its extra HP. */
export type EliteMod = 'shielded' | 'hasty' | 'splitting' | 'explosive';

export interface EnemyDef extends ContentMeta {
  name: string;
  hp: number;
  /** Pixels per second. */
  speed: number;
  /** Physics body radius in pixels. */
  radius: number;
  /** Half hearts dealt on touch (0 = harmless to touch). */
  contactDamage: number;
  art: SpriteArt;
  brain(api: EnemyApi): Brain;
  /**
   * Where this enemy's gun fires from, from its center, facing right (mirrored when it faces
   * left). Its shots start there instead of at its middle, with a small muzzle flash.
   */
  muzzle?: { x: number; y: number };
  /** Chance to drop Scrap on death (elites always drop). */
  scrapChance?: number;
  flying?: boolean;
  /** Front-facing shield: shots within this arc (degrees) of the facing direction are blocked. */
  shieldArc?: number;
  knockbackResist?: number;
  elite?: { hpMult: number; scale?: number; params?: Record<string, number>; mods?: EliteMod[] };
  onDeath?(api: EnemyApi): void;
  /** Enemies this one brings into the room (its brood, its backup, what it splits into). */
  spawns?: ContentId[];
  /** Particle style when it dies ('death', 'paper', 'slime', 'spark', ...). */
  deathFx?: string;
  /** Nameplate text shown above the enemy (e.g. Rick insisting they're robots). */
  nameplate?(ctx: GameCtx): string | null;
  boss?: BossInfo;
  /**
   * Can't be killed (Scary Terry): hits knock him back, and every `staggerHits` hits leave him
   * dizzy for `staggerSeconds`. He never counts toward clearing a room, so he can't keep its
   * doors shut; the episode decides how to shake him.
   */
  stalker?: { staggerHits: number; staggerSeconds: number };
  /**
   * Makes this a room hazard (a bursting locker, a scanner): it can't be hurt or targeted,
   * doesn't count toward clearing the room, and goes quiet once the room is cleared.
   */
  hazard?: {
    placement: 'wall' | 'floor' | 'cliff-edge';
    /** Lies flat on the floor (puddles, cracks): always drawn under characters. */
    flat?: boolean;
  };
}

export interface BossInfo {
  title: string;
  /** The character this boss is, so scenes and ctx.say() can talk from his head. */
  character?: ContentId;
  /** Objective line shown during the fight (e.g. "Daze Frank with dodgeballs"). */
  objective?: string;
  /** Plays when the boss is beaten, before the exit opens. */
  defeatCutscene?: ContentId;
  /** Item pedestal spawned when the boss is beaten. */
  reward?: ContentId;
  /** Hook run when the boss is beaten (e.g. leave a frozen statue behind). */
  onDefeat?(api: RoomScriptApi, at: Vec): void;
  music?: string;
  /** HP fractions where the fight changes phase (drawn as ticks on the boss bar). */
  phases?: number[];
  /**
   * The boss isn't killed: at 0 HP he's left dazed and harmless, and this plays the ending in the
   * room (e.g. Rick walks in and freezes him). Call done() when it's over; the rest of the defeat
   * (onDefeat, the reward and the way out) follows.
   */
  dazed?(api: RoomScriptApi, boss: EnemySelf, done: () => void): void;
}

// ---------------------------------------------------------------------------------------------
// Rooms, scripts, encounters, special rooms
// ---------------------------------------------------------------------------------------------

export type TileKind = 'floor' | 'wall' | 'block' | 'cliff' | 'slow' | 'void';

export type RoomKind = 'start' | 'combat' | 'calm' | 'treasure' | 'shop' | 'special' | 'finale';

export interface RoomInfo {
  readonly id: number;
  readonly kind: RoomKind;
  readonly templateId: string;
  readonly specialId?: string;
  readonly cleared: boolean;
  readonly firstVisit: boolean;
  /** Position within an act's calm prefix (0-based), if any. */
  readonly prefixIndex?: number;
  /** Which of the act's places this room is in (ProceduralLayout.regions; 0 = the act's biome). */
  readonly region: number;
  readonly isLastPrefix: boolean;
  readonly widthPx: number;
  readonly heightPx: number;
  tileAt(x: number, y: number): TileKind;
  tileCenter(tx: number, ty: number): Vec;
  /** World positions of a marker character in the room's template. */
  markers(ch: string): Vec[];
  randomFloorPoint(rng: Rng, minDistFromPlayer?: number): Vec;
  /** Persistent per-room state for scripts and mechanics. */
  readonly data: Record<string, unknown>;
}

export interface ChoicePrompt {
  title?: string;
  question: string;
  options: string[];
  /** Index of the right answer, if there is one. */
  correct?: number;
  /** Faintly highlight the right answer. */
  glowCorrect?: boolean;
  /** Seconds before it times out (answer = null). */
  timeLimit?: number;
  speaker?: ContentId;
  onAnswer(index: number | null): void;
}

export interface PropSpec {
  art: string;
  x: number;
  y: number;
  solid?: boolean;
  /** Radius of the solid body (defaults from the art size). */
  radius?: number;
  depth?: number;
  interact?: { label: string; fn(): void };
  /** Speech from this character (ctx.say) pops up over this prop. */
  actor?: ContentId;
  /** Decorative props that should still be there when the player comes back (no interaction). */
  persist?: boolean;
}

export interface PropHandle {
  readonly x: number;
  readonly y: number;
  setArt(art: string): void;
  setInteract(interact: PropSpec['interact'] | null): void;
  setVisible(visible: boolean): void;
  /** Visual shake/pulse to draw attention. */
  pulse(): void;
  destroy(): void;
}

export interface PedestalOptions {
  /** Shop price; omit for free pedestals. */
  price?: number;
  /** Taking one pedestal in a group removes the others. */
  choiceGroup?: string;
}

export interface RoomScriptApi extends GameCtx {
  readonly room: RoomInfo;
  spawnEnemy(id: ContentId, x: number, y: number, opts?: { elite?: boolean; passive?: boolean; delay?: number }): EnemySelf | null;
  /** Makes the current room a combat room until its enemies are dead (doors lock). */
  makeCombat(): void;
  /** Kills every enemy in the room (no drops). */
  clearEnemies(): void;
  /** Random enemy id from the act's pool. */
  randomEnemy(): ContentId;
  spawnPickup(id: ContentId, x: number, y: number): void;
  spawnPedestal(itemId: ContentId, x: number, y: number, opts?: PedestalOptions): void;
  /** Random item id from the act's pool that the player doesn't own yet. */
  randomItem(filter?: { rarity?: Rarity; kind?: ItemKind }): ContentId | null;
  addProp(spec: PropSpec): PropHandle;
  enemyCount(): number;
  setHostile(enemy: EnemyRef): void;
  lockDoors(): void;
  unlockDoors(): void;
  /** Marks this room cleared (fires room-clear hooks) and opens its doors. */
  completeRoom(): void;
  /** For finale stages: marks the stage done and opens the way on. */
  completeStage(): void;
  /** Ends the act right away (plays its outro), e.g. after the prologue's last beat. */
  endAct(): void;
  showChoice(prompt: ChoicePrompt): void;
  hideChoice(): void;
  playCutscene(id: ContentId, onDone?: () => void): void;
  setObjective(text: string | null): void;
  /** HUD countdown; null hides it. */
  setTimer(seconds: number | null, label?: string): void;
  timerLeft(): number;
  /** Floating hint text near the bottom of the screen; null hides it. */
  hint(text: string | null): void;
  /** Hands Morty this act's story weapon (ActDef.weapon), shown on screen with its line. */
  giveActWeapon(): void;
  /**
   * Plays an in-engine scene in this room: characters walk in, talk in speech bubbles and act.
   * Morty can't move meanwhile, and any key skips ahead. onDone runs when it's over.
   */
  actScene(steps: SceneStep[], onDone?: () => void): void;
  /**
   * A story trip inside a fixed layout: Morty leaves the way `by` says (climbing into Rick's ship,
   * stepping into a portal) and lands in the room at grid spot (x, y), which doors don't reach.
   * `from` is the prop he boards, if any.
   */
  travelTo(to: { x: number; y: number }, by: TravelKind, from?: PropHandle): void;
}

/** Where a scene character stands or walks to: a spot, or next to another character. */
export type SceneSpot = Vec | { near: ContentId; side?: -1 | 1; gap?: number };

/**
 * One beat of an in-engine scene; each waits for the previous one. `who` is a character id; the
 * act's playable character (Morty) is the player himself.
 */
export type SceneStep =
  /** Walks in through the nearest door, steps out of a portal, or just appears. */
  | { kind: 'enter'; who: ContentId; via: 'door' | 'portal' | 'here'; to: SceneSpot }
  | { kind: 'walk'; who: ContentId; to: SceneSpot; speed?: number }
  /** A speech bubble. Waits about as long as it takes to read unless `seconds` says otherwise. */
  | { kind: 'say'; who: ContentId; text: string; seconds?: number }
  | { kind: 'face'; who: ContentId; toward: SceneSpot }
  | { kind: 'emote'; who: ContentId; emote: 'jump' | 'shake' | 'shock' }
  /** A ray-gun beam from the character to a spot (the freeze ray). */
  | { kind: 'beam'; who: ContentId; to: SceneSpot; color: number; sfx?: string }
  | { kind: 'wait'; seconds: number }
  /** The act's story weapon changes hands (ActDef.weapon): its giver says the line, Morty catches it. */
  | { kind: 'weapon' }
  /** Swaps a character's sprite (Rick passing out, Snuffles in his helmet); null puts theirs back. */
  | { kind: 'pose'; who: ContentId; art: string | null }
  /** Runs code at this point (swap a sprite, drop a prop, set a flag). Also runs when skipped. */
  | { kind: 'do'; fn: () => void }
  /** Walks out through the nearest door, steps into a portal, or fades away where they stand. */
  | { kind: 'leave'; who: ContentId; via: 'door' | 'portal' | 'here' };

/** Script attached to a special room, encounter or fixed room. */
export interface RoomScript {
  onEnter?(firstTime: boolean): void;
  update?(dt: number): void;
  onExit?(): void;
  /** Called when all enemies in the room are dead. Return true to take over room clearing. */
  onEnemiesCleared?(): boolean;
  /** The room's boss was beaten (boss finales). Return true to take over the defeat sequence. */
  onBossDefeated?(): boolean;
}

export interface EncounterDef extends ContentMeta {
  name: string;
  template: ContentId;
  music?: string;
  script(api: RoomScriptApi): RoomScript;
}

export interface SpecialRoomDef extends ContentMeta {
  name: string;
  templates: ContentId[];
  /** Minimap icon letter. */
  icon: string;
  script?(api: RoomScriptApi): RoomScript;
}

export interface ShopDef {
  keeperArt: string;
  name: string;
  /** Price multiplier on top of the player's shop price stat (Duty-Free is overpriced). */
  priceMult?: number;
  /** Consumables this shop always stocks. */
  alwaysStocks?: ContentId[];
}

export interface PickupDef extends ContentMeta {
  name: string;
  art: string;
  /** Pulled toward the player by magnet stats. */
  magnetic?: boolean;
  /** Return false to leave the pickup on the floor (e.g. health at full HP). */
  collect(ctx: GameCtx): boolean | void;
}

export interface RoomTemplate {
  id: ContentId;
  /** Interior rows (walls and doors are added around them). See engine/dungeon/templates.ts. */
  rows: string[];
}

// ---------------------------------------------------------------------------------------------
// Mechanics, gadgets, acts, episodes
// ---------------------------------------------------------------------------------------------

export interface HudWidget {
  label: string;
  /** 0..1 fill. */
  value: number;
  color: number;
  text?: string;
  /** Draws attention (blinks) when true. */
  alert?: boolean;
}

export type PlayerEvent =
  | { type: 'fire'; angle: number }
  | { type: 'dash' }
  | { type: 'fall'; x: number; y: number }
  | { type: 'hurt'; halves: number; source: string };

export interface MechanicApi extends GameCtx {
  room(): RoomInfo;
  /** Script-level API for the room the player is in right now. */
  here(): RoomScriptApi;
  /** Tile under the player's feet. */
  playerTile(): TileKind;
  hint(text: string | null): void;
  playCutscene(id: ContentId, onDone?: () => void): void;
  /** Turns unvisited rooms of one kind into another kind (e.g. calm -> combat) for the rest of the act. */
  convertRooms(from: RoomKind, to: RoomKind): void;
  /** Hands Morty this act's story weapon (ActDef.weapon), shown on screen with its line. */
  giveActWeapon(): void;
}

export interface MechanicInstance {
  onActStart?(): void;
  onRoomEnter?(room: RoomInfo): void;
  update?(dt: number): void;
  onRoomClear?(room: RoomInfo): void;
  onActEnd?(): void;
  /** The mechanic key (F) was pressed. */
  onAction?(): void;
  onPlayerEvent?(event: PlayerEvent): void;
  /** Whether the player may stand on this tile kind right now (undefined = no opinion). */
  allowsTile?(tile: TileKind): boolean | undefined;
  /** The player fell off a cliff/pit. Return true if the mechanic handled the consequences. */
  onFall?(): boolean;
  hud?(): HudWidget | null;
}

export interface MechanicDef extends ContentMeta {
  name: string;
  /** Short help text for the pause screen. */
  help: string;
  create(api: MechanicApi): MechanicInstance;
}

export interface GadgetDef extends ContentMeta {
  name: string;
  /** Called when Rick arrives, before his beam sweeps the room. */
  activate(ctx: GameCtx): void;
  /** Called for each enemy as the beam sweeps over it. */
  hit?(ctx: GameCtx, enemy: EnemyRef): void;
  /** Beam color. */
  color?: number;
  /** Rude things Rick says while using it. */
  lines: string[];
}

export interface BiomeDef {
  id: string;
  name: string;
  palette: {
    background: number;
    floor: number;
    floorAlt: number;
    wall: number;
    wallTop: number;
    block: number;
    blockTop: number;
    cliff: number;
    cliffShadow: number;
    slow: number;
    accent: number;
    door: number;
  };
  /** Pattern drawn on floor tiles. */
  floorPattern: 'checker' | 'speckle' | 'grid' | 'planks' | 'blobs';
  /** How the place's walls, furniture and doors are drawn, so it looks like itself. */
  style?: BiomeStyle;
  /** Outdoors or dusty enough that footsteps kick up dust (grass, dirt, streets). */
  dusty?: boolean;
  music: string;
}

export interface BiomeStyle {
  /**
   * The room's walls, and the tall blocks ('#') inside it: plain bricks, school lockers, lumpy
   * pastel hills, grey metal panels, house wallpaper, or a plane cabin with windows.
   */
  walls?: 'bricks' | 'lockers' | 'hills' | 'panels' | 'house' | 'cabin';
  /** Low blocks ('='): crates, school desks, rocks, counters, furniture, plane seats, toy blocks, hedges. */
  blocks?: 'crate' | 'desk' | 'rock' | 'counter' | 'furniture' | 'seat' | 'toy' | 'hedge';
  /** Doors between rooms: plain, classroom doors, natural archways, security gates, house doors. */
  doors?: 'plain' | 'classroom' | 'arch' | 'gate' | 'house';
}

/** A finale stage. `biome` makes its room look like somewhere else (the chase into Terry's house). */
export type FinaleStage =
  | { kind: 'boss'; boss: ContentId; template: ContentId; biome?: BiomeDef }
  | { kind: 'encounter'; encounter: ContentId; biome?: BiomeDef };

export interface ProceduralLayout {
  kind: 'procedural';
  roomCount: [min: number, max: number];
  /** Combat room templates. */
  templates: ContentId[];
  startTemplate: ContentId;
  treasureTemplate: ContentId;
  shopTemplate: ContentId;
  /** A chain of calm rooms leading out of the start room before the floor branches. */
  calmPrefix?: { count: [min: number, max: number]; templates: ContentId[]; lastTemplate: ContentId };
  /**
   * Places the floor crosses after the act's own biome, in order, on the way from the start room
   * to the finale (one dream after another; see regionOf in dungeon/generate.ts). Each room looks
   * like, and plays the music of, its place.
   */
  regions?: BiomeDef[];
}

export interface FixedRoomDef {
  x: number;
  y: number;
  kind: RoomKind;
  template: ContentId;
  script?: ContentId;
  /** This room looks like somewhere else than the rest of the act (the inside of Rick's ship). */
  biome?: BiomeDef;
}

export interface FixedLayout {
  kind: 'fixed';
  rooms: FixedRoomDef[];
  start: { x: number; y: number };
  /**
   * Story trips between rooms no door connects (Rick's ship across town). A room script makes
   * the trip (RoomScriptApi.travelTo); listing it here tells the checks the rooms are linked.
   */
  trips?: { from: { x: number; y: number }; to: { x: number; y: number } }[];
}

/**
 * Where Morty's weapon comes from in an act. Every weapon needs a story reason that the player
 * sees (docs/ADDING_AN_EPISODE.md).
 */
export interface StoryWeapon {
  /** A weapon item (usually rarity 'story', noPool). */
  item: ContentId;
  /**
   * 'start': handed over as the act begins, right after its intro.
   * 'scripted': a room script or mechanic calls giveActWeapon() at the moment the story says;
   * until then Morty keeps the previous act's weapon (or has none).
   */
  when: 'start' | 'scripted';
  /** Who hands it over (a character id; the playable character means he finds it himself). */
  from: ContentId;
  /** What they say as it happens. */
  line: string;
}

/**
 * How Morty gets between acts, the way the show does it: Rick's ship (the flying car he built in
 * the garage), a green portal from Rick's portal gun, or an official departure portal.
 */
export type TravelKind = 'ship' | 'portal' | 'departure';

export interface TravelSpec {
  by: TravelKind;
  /** What the way out says ("Step through Rick's portal"). */
  label: string;
  /** Sprite for the way out (defaults: the flying car, a green portal, a departure portal). */
  art?: string;
}

/** What Rick says while he walks with Morty (short, burps included). */
export interface RickLines {
  /** Walking into a room for the first time. */
  enter: string[];
  /** A room cleared. */
  clear: string[];
  /** Morty got hurt. */
  hurt: string[];
  /** Morty picked something up. */
  item: string[];
  /** Nothing has happened for a while. */
  idle: string[];
}

export interface ActDef {
  id: string;
  name: string;
  subtitle?: string;
  playable: ContentId;
  biome: BiomeDef;
  layout: ProceduralLayout | FixedLayout;
  enemyPool: Weighted[];
  itemPool: Weighted[];
  eliteChance: number;
  /** Chance a combat room is an ambush: it looks empty until Morty walks in, then the doors slam. */
  ambushChance?: number;
  /** Hazard enemies (EnemyDef.hazard) placed in some combat rooms. */
  hazards?: Weighted[];
  /** Chance a combat room gets one or two hazards. */
  hazardChance?: number;
  shop?: ShopDef;
  specialRoom?: ContentId;
  finale: FinaleStage[];
  rick: {
    /** What he does when Morty calls him with a full Rick Meter. */
    gadget: ContentId;
    entrance: 'walk' | 'portal';
    /**
     * Rick walks with Morty through this act and comments on it. He's not a fighter: he can't be
     * hurt, doesn't block shots, and a Rick call is him stepping in.
     */
    follows?: RickLines;
  };
  mechanics: ContentId[];
  /** Where Morty's weapon comes from in this act. Required for any act with enemies. */
  weapon?: StoryWeapon;
  /** Morty puts his weapon away for this act (a quiet epilogue at home). */
  unarmed?: boolean;
  /**
   * A "Meanwhile" cutaway to another character (Jerry at home). It cuts back to the story instead
   * of traveling, and Morty's buddies, looks and Rick calls sit it out.
   */
  interlude?: boolean;
  /** Statuses applied when the act starts. */
  startStatuses?: ContentId[];
  /** Comic-panel cutscenes before the act: quick recaps, always skippable. */
  intro?: ContentId[];
  /**
   * An in-engine scene acted out in the first room right after Morty arrives (Rick walking out of
   * the portal to explain the place). Big story beats are played like this, not as comics.
   */
  opening?(api: RoomScriptApi): SceneStep[];
  outro?: ContentId[];
  /**
   * How Morty leaves once the finale is done. Every act but an episode's last (and interludes,
   * which cut away) needs one: there are no generic exit doors between acts.
   */
  travel?: TravelSpec;
  /** How he shows up at the start (stepping out of a portal, the ship landing), and its art. */
  arrive?: TravelKind | { by: TravelKind; art: string };
  /** The way into the next finale stage when there are several (a security gate). */
  stageExit?: { art: string; label: string };
  music?: string;
}

export interface EpisodeContent {
  characters: CharacterDef[];
  items: ItemDef[];
  synergies: SynergyDef[];
  statuses: StatusDef[];
  enemies: EnemyDef[];
  encounters: EncounterDef[];
  specialRooms: SpecialRoomDef[];
  mechanics: MechanicDef[];
  gadgets: GadgetDef[];
  pickups: PickupDef[];
  /** Themed item sets that transform Morty (optional). */
  transformations?: TransformationDef[];
  cutscenes: CutsceneDef[];
  backdrops: BackdropDef[];
  templates: RoomTemplate[];
  scripts: RoomScriptDef[];
  sprites: SpriteArt[];
  /** Pools of short lines by situation, e.g. 'death' for the game-over screen. */
  barks?: Record<string, string[]>;
  /** Music tracks this content adds, by id (format in engine/audio/music.ts). */
  music?: Record<string, Track>;
  /** Sound effects this content adds, by id (format in engine/audio/sfx.ts). */
  sfx?: Record<string, SfxRecipe>;
}

/** A named script for fixed-layout rooms. */
export interface RoomScriptDef {
  id: ContentId;
  script(api: RoomScriptApi): RoomScript;
}

export interface EpisodeDef extends ContentMeta {
  id: EpisodeId;
  season: number;
  number: number;
  title: string;
  /** One-line pitch shown on the Season Map. */
  synopsis: string;
  prologue?: ActDef;
  acts: ActDef[];
  epilogue?: ActDef;
  /** Content added to the global pool after the first clear. */
  unlocksOnClear: ContentId[];
  content: EpisodeContent;
}

/** Season Map entry. Episodes without a def are shown locked as "coming soon". */
export interface EpisodeListing {
  id: EpisodeId;
  season: number;
  number: number;
  title: string;
  def?: EpisodeDef;
}

export interface UpgradeDef {
  id: ContentId;
  name: string;
  description: string;
  category: 'stat' | 'start' | 'unlock' | 'cosmetic';
  /** Cost per level; the array length is the max level. */
  costs: number[];
  stats?: StatModifiers;
  startItem?: ContentId;
  unlocks?: ContentId;
  shirt?: number;
}
