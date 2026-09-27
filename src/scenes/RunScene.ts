/**
 * One run through one episode. Builds each act's floor, runs rooms (combat, shops, scripts,
 * finales), and implements the APIs content code uses (GameCtx, RoomScriptApi, MechanicApi).
 * The engine never special-cases an episode: everything episode-specific comes in as content.
 */
import Phaser from 'phaser';
import { BASE_STATS, ECONOMY, ENEMIES, PLAYER, RICK_METER, ROOMS, SHOTS, STAT_LIMITS } from '../content/balance';
import { bakeArt, TEXTURE_PAD } from '../engine/art/textures';
import { GAME_HEIGHT, GAME_WIDTH, HUD_HEIGHT, TILE } from '../engine/constants';
import { buildFixedFloor, generateFloor, type FloorConfig, type FloorRoom } from '../engine/dungeon/generate';
import { DIR_VEC, doorCell, OPPOSITE, type Dir, type ParsedTemplate } from '../engine/dungeon/templates';
import { activeSynergies, activeTransformations, hookSources, itemModifiers, runHook, type HookSource } from '../engine/effects/hooks';
import { computeStats, type StatBlock, type StatModifiers } from '../engine/effects/stats';
import type { StatusChange } from '../engine/effects/status';
import { nextUp } from '../engine/episodes';
import { enemyPoolFor, itemPoolFor, type ItemFilter } from '../engine/pools';
import type { Registry } from '../engine/registry';
import type { Rng } from '../engine/rng';
import { freshRoomState, RunState, type PedestalState, type RoomState } from '../engine/run/RunState';
import { Companion, Orbiters, type CompanionHost } from '../engine/runtime/Companion';
import { Enemy, type EnemyHost, type SpawnOpts } from '../engine/runtime/Enemy';
import { Fx, type BurstStyle } from '../engine/runtime/Fx';
import { Player, type PlayerHost, type PlayerInput } from '../engine/runtime/Player';
import { ProjectilePool, type Projectile } from '../engine/runtime/Projectiles';
import { RoomView, type DoorSpec } from '../engine/runtime/RoomView';
import { readTime, Stage } from '../engine/runtime/Stage';
import { HazardLayer, TelegraphLayer } from '../engine/runtime/Telegraphs';
import { WorldObjects, type Interactable, type PedestalObj, type PickupObj, type PropObj, type Ware } from '../engine/runtime/WorldObjects';
import type { Settings } from '../engine/save/save';
import { persist, svc } from '../engine/services';
import type {
  ActDef,
  BossInfo,
  ContentId,
  EnemyRef,
  EnemySelf,
  EnemyShotSpec,
  EpisodeId,
  EliteMod,
  ExplosionSpec,
  GadgetDef,
  GameCtx,
  HitInfo,
  HitSource,
  ItemDef,
  LookSpec,
  MechanicApi,
  MechanicDef,
  MechanicInstance,
  PlayerShotSpec,
  PropSpec,
  RoomInfo,
  RoomKind,
  RoomScript,
  RoomScriptApi,
  RickLines,
  SceneStep,
  StatusFlags,
  StoryWeapon,
  TileKind,
  TravelKind,
  TravelSpec,
  TransformationDef,
  Vec,
  VfxSpec,
} from '../engine/types';
import type { HudApi, HudModel } from '../engine/ui/hudModel';
import { installDebug } from '../debug/debug';

export interface RunSceneData {
  episodeId: EpisodeId;
  seed: string;
  /** Debug: start at this index of the act sequence. */
  startAct?: number;
  /** Play the prologue even after the episode has been cleared. */
  playPrologue?: boolean;
}

export interface RunSummary {
  victory: boolean;
  episodeId: EpisodeId;
  episodeTitle: string;
  seed: string;
  seconds: number;
  kills: number;
  rooms: number;
  items: string[];
  scrapBanked: number;
  cause: string;
  newUnlocks: string[];
  /** What the Season Map now calls "next up" (null when nothing is left). */
  nextEpisode: { title: string; playable: boolean } | null;
  quit: boolean;
}

const MAX_ENEMIES = 45;

/** The way out for each kind of trip, unless the act names its own art. */
const TRAVEL_ART: Record<TravelKind, string> = { ship: 'flying-car', portal: 'exit-portal', departure: 'exit-departure' };

/** One enemy a combat room will bring in. */
interface SpawnPlan {
  id: ContentId;
  x: number;
  y: number;
  elite: boolean;
}
const SPIN: Record<string, number> = { paper: 540, book: 420, stamp: 360, ball: 600, spore: 200 };

export class RunScene extends Phaser.Scene implements EnemyHost, PlayerHost {
  reg!: Registry;
  run!: RunState;
  player!: Player;
  ctx!: GameCtx;
  telegraphs!: TelegraphLayer;
  hazards!: HazardLayer;
  fx!: Fx;
  objects!: WorldObjects;
  enemies: Enemy[] = [];
  godModeOn = false;

  private initData!: RunSceneData;
  private hud!: HudApi;
  private enemyGroup!: Phaser.Physics.Arcade.Group;
  private playerShots!: ProjectilePool;
  private enemyShots!: ProjectilePool;
  private roomView: RoomView | null = null;
  private roomInfoObj: RoomInfo | null = null;
  private roomState!: RoomState;
  private scriptApi: RoomScriptApi | null = null;
  private script: RoomScript | null = null;
  private colliders: Phaser.Physics.Arcade.Collider[] = [];
  private mechanics: { def: MechanicDef; inst: MechanicInstance }[] = [];
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private frameDelta = 0;
  private statsCache: StatBlock | null = null;
  private sourcesCache: HookSource[] | null = null;
  private upgradeMods: StatModifiers[] = [];
  private maxHpValue = 6;
  private timers: { at: number; fn: () => void; room: boolean }[] = [];
  private transitioning = false;
  private scriptLock = false;
  private doorsOpen = true;
  private bossEnemy: Enemy | null = null;
  private exitProp: PropObj | null = null;
  private objectiveText: string | null = null;
  private hudTimer: { left: number; label: string } | null = null;
  private hintText: string | null = null;
  private readonly actors = new Map<string, () => Vec | null>();
  private lastSafe: Vec = { x: 0, y: 0 };
  private rickBusy = false;
  private ended = false;
  private finishingAct = false;
  private dead = false;
  private meterAnnounced = false;
  private interactable: Interactable | null = null;
  /** Recoil offset for the camera; decays every frame. */
  private camKick = { x: 0, y: 0 };
  /** Resting scroll of a fixed camera (null while it follows Morty). */
  private camRest: Vec | null = null;
  /** Game speed during a perfect-dodge slow-mo (1 = normal) and when it ends, in real ms. */
  private timeFactor = 1;
  private slowMoUntil = 0;
  /** True while Rick's entrance stops time. */
  private worldHold = false;
  /** Enemies still to come in this room, wave by wave. */
  private waves: SpawnPlan[][] = [];
  private waveTotal = 0;
  /** Spawns whose warning is still showing. */
  private pendingSpawns = 0;
  /** An ambush room waiting for Morty to walk in (where he entered). */
  private ambushFrom: Vec | null = null;
  /** A swap waiting for its confirming second E press. */
  private pendingSwap: PedestalObj | null = null;
  private pendingSwapUntil = 0;
  /** In-engine acted scenes (characters walking and talking in the room). */
  private stage!: Stage;
  /** Whether Morty's controls were already locked when the current scene started. */
  private lockedBeforeScene = false;
  /** Run time when the act's story weapon changes hands (0 = nothing pending). */
  private weaponDue = 0;
  /** Travelling between acts (the ship trip or a portal swallowing the screen). */
  private traveling = false;
  /** Rick walking with Morty (acts with rick.follows): when he last spoke, and a line counter. */
  private rickTalkAt = 0;
  private rickLineCount = 0;
  private travelFx: Phaser.GameObjects.GameObject[] = [];
  /** Buddies from items, and the junk circling Morty. */
  private companions: Companion[] = [];
  private orbiters: Orbiters | null = null;
  /** Build-ups toward the next critical hit and freeze bolt (critRate, freezeRate). */
  private critAcc = 0;
  private freezeAcc = 0;
  /** Run time of the last volley, for charged shots. */
  private lastFireAt = 0;
  private chargeAnnounced = false;
  private chargeRing: Phaser.GameObjects.Arc | null = null;
  /** What Morty looks like right now (items and transformations), and its pieces. */
  private lookKey = '';
  private look: LookSpec = {};
  private accessory: Phaser.GameObjects.Image | null = null;
  private trailTimer = 0;
  /** The transformation Morty is in, if any. */
  private transformation: TransformationDef | null = null;
  /** Counts shots fired, to cycle through a thrown weapon's looks. */
  private shotsFired = 0;
  private readonly playerAnchor = () => ({ x: this.player.x, y: this.player.y - 48 });
  private readonly screenAnchor = () => {
    const v = this.cameras.main.worldView;
    return { x: v.centerX, y: v.y + 185 };
  };

  constructor() {
    super('Run');
  }

  init(data: RunSceneData): void {
    this.initData = data;
    // Scenes are reused between runs, so reset every piece of per-run state here.
    this.enemies = [];
    this.godModeOn = false;
    this.roomView = null;
    this.roomInfoObj = null;
    this.scriptApi = null;
    this.script = null;
    this.colliders = [];
    this.mechanics = [];
    this.statsCache = null;
    this.sourcesCache = null;
    this.upgradeMods = [];
    this.timers = [];
    this.transitioning = false;
    this.scriptLock = false;
    this.doorsOpen = true;
    this.bossEnemy = null;
    this.exitProp = null;
    this.objectiveText = null;
    this.hudTimer = null;
    this.hintText = null;
    this.actors.clear();
    this.rickBusy = false;
    this.ended = false;
    this.finishingAct = false;
    this.dead = false;
    this.meterAnnounced = false;
    this.interactable = null;
    this.pendingSwap = null;
    this.weaponDue = 0;
    this.traveling = false;
    this.travelFx = [];
    this.rickTalkAt = 0;
    this.rickLineCount = 0;
    this.companions = [];
    this.orbiters = null;
    this.critAcc = 0;
    this.freezeAcc = 0;
    this.lastFireAt = 0;
    this.chargeAnnounced = false;
    this.chargeRing = null;
    this.lookKey = '';
    this.look = {};
    this.accessory = null;
    this.trailTimer = 0;
    this.transformation = null;
    this.camKick = { x: 0, y: 0 };
    this.camRest = null;
    this.timeFactor = 1;
    this.slowMoUntil = 0;
    this.worldHold = false;
    this.waves = [];
    this.pendingSpawns = 0;
    this.ambushFrom = null;
  }

  create(): void {
    const s = svc();
    this.reg = s.registry;
    const data = this.initData;
    const ep = this.reg.episodes.get(data.episodeId);
    if (!ep) throw new Error(`Episode ${data.episodeId} isn't playable`);
    const save = s.save;
    const cleared = (save.episodes[ep.id]?.clears ?? 0) > 0;

    const startItems: ContentId[] = [];
    for (const [id, level] of Object.entries(save.upgrades)) {
      const u = this.reg.upgrades.get(id);
      if (!u) continue;
      if (u.stats) for (let i = 0; i < Math.min(level, u.costs.length); i++) this.upgradeMods.push(u.stats);
      if (u.startItem) startItems.push(u.startItem);
    }
    const base = computeStats(BASE_STATS, this.upgradeMods, STAT_LIMITS);
    this.maxHpValue = Math.max(2, Math.round(base.maxHearts) * 2);
    this.run = new RunState(this.reg, ep, data.seed, {
      skipPrologue: cleared && !data.playPrologue,
      startHp: this.maxHpValue,
    });
    const rec = (save.episodes[ep.id] ??= { attempts: 0, clears: 0, bestTimeMs: null });
    rec.attempts++;
    persist();

    this.cameras.main.setViewport(0, HUD_HEIGHT, GAME_WIDTH, GAME_HEIGHT - HUD_HEIGHT);
    this.enemyGroup = this.physics.add.group();
    this.playerShots = new ProjectilePool(this, 4000, 260, { glow: true });
    this.enemyShots = new ProjectilePool(this, 4200, 420);
    this.telegraphs = new TelegraphLayer(this);
    this.hazards = new HazardLayer(this, (id) => this.sfx(id));
    this.fx = new Fx(this, () => this.settings());
    this.objects = new WorldObjects(this);
    this.player = new Player(this, this, this.playerTexture(), 0, 0);
    this.stage = this.makeStage();
    this.orbiters = new Orbiters(this.companionHost());
    this.ctx = this.buildCtx();
    this.setupInput();

    this.scene.launch('Hud', { run: this });
    this.hud = this.scene.get('Hud') as unknown as HudApi;
    for (const id of startItems) this.giveItem(id, true);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.cleanup());
    if (s.debug) installDebug(this);
    const first = Math.min(data.startAct ?? 0, this.run.sequence.length - 1);
    this.time.delayedCall(20, () => {
      // Every run opens with the episode's title card (debug jumps go straight in).
      if (first > 0) {
        this.startAct(first);
        return;
      }
      this.scene.pause();
      this.scene.launch('TitleCard', {
        season: ep.season,
        number: ep.number,
        title: ep.title,
        onDone: () => {
          this.scene.resume();
          this.input.keyboard?.resetKeys();
          this.startAct(0);
        },
      });
    });
  }

  private cleanup(): void {
    // Phaser tears down this scene's objects itself; this just releases what it doesn't know about.
    this.companions.forEach((c) => c.destroy());
    this.companions = [];
    this.orbiters?.destroy();
    this.accessory?.destroy();
    this.accessory = null;
    this.chargeRing?.destroy();
    this.chargeRing = null;
    this.timeFactor = 1;
    this.tweens.timeScale = 1;
    if (this.physics?.world) this.physics.world.timeScale = 1;
    this.teardownRoom();
    this.playerShots?.destroy();
    this.enemyShots?.destroy();
    this.telegraphs?.destroy();
    this.hazards?.destroy();
    this.fx?.destroy();
    this.objects?.clear();
    this.player?.destroy();
  }

  // ---- host plumbing ---------------------------------------------------------------------------

  get rng(): Rng {
    return this.run.play;
  }

  settings(): Settings {
    return svc().save.settings;
  }

  frameDt(): number {
    return this.frameDelta;
  }

  now(): number {
    return this.run.time;
  }

  godMode(): boolean {
    return this.godModeOn;
  }

  room(): RoomView {
    return this.roomView!;
  }

  roomInfo(): RoomInfo {
    return this.roomInfoObj!;
  }

  windupMult(): number {
    return this.stats().enemyWindupMult;
  }

  hp(): number {
    return this.run.hp;
  }

  maxHp(): number {
    this.stats();
    return this.maxHpValue;
  }

  flags(): StatusFlags {
    return this.run.statuses.flags();
  }

  tileUnderPlayer(): TileKind {
    return this.roomView ? this.roomView.tileAt(this.player.x, this.player.y) : 'floor';
  }

  sfx(id: string): void {
    svc().audio.play(id);
  }

  shake(intensity: number, ms: number): void {
    this.fx.shake(intensity, ms);
  }

  stats(): StatBlock {
    if (!this.statsCache) {
      const inv = this.run.inventory;
      const s = computeStats(
        BASE_STATS,
        [...itemModifiers(inv, this.reg.items, this.reg.synergies, this.reg.transformations), ...this.run.statuses.modifiers(), ...this.upgradeMods],
        STAT_LIMITS,
      );
      this.statsCache = s;
      const max = Math.max(2, Math.round(s.maxHearts) * 2);
      if (max > this.maxHpValue) this.run.hp += max - this.maxHpValue;
      this.maxHpValue = max;
      this.run.hp = Math.min(this.run.hp, max);
    }
    return this.statsCache;
  }

  private sources(): HookSource[] {
    if (!this.sourcesCache) this.sourcesCache = hookSources(this.run.inventory, this.reg.items, this.reg.synergies, this.reg.transformations);
    return this.sourcesCache;
  }

  private invalidateStats(): void {
    this.statsCache = null;
    this.sourcesCache = null;
    this.stats();
  }

  private playerTexture(): string {
    const ch = this.reg.characters.get(this.run.act.playable);
    const key = ch?.sprite?.key ?? 'morty';
    // An item or transformation look beats the Garage shirt.
    if (this.look.shirt !== undefined && ch?.recolor) {
      const k = `${key}-look-${this.look.shirt.toString(16)}`;
      if (!this.textures.exists(k)) bakeArt(this, ch.recolor(this.look.shirt, k));
      return k;
    }
    const shirt = svc().save.shirt;
    if (shirt && this.textures.exists(`${key}-${shirt}`)) return `${key}-${shirt}`;
    return key;
  }

  private buildCtx(): GameCtx {
    const run = this.run;
    return {
      rng: run.play,
      player: this.player,
      episodeId: run.episode.id,
      get actId() {
        return run.act.id;
      },
      now: () => run.time,
      stats: () => this.stats(),
      hasItem: (id) => run.inventory.has(id),
      giveItem: (id, o) => this.giveItem(id, o?.silent),
      applyStatus: (id) => this.applyStatus(id),
      removeStatus: (id) => {
        if (run.statuses.remove(id)) this.invalidateStats();
      },
      hasStatus: (id) => run.statuses.has(id),
      enemies: () => this.enemies.filter((e) => this.isTarget(e)),
      damageEnemy: (e, amount, source, tag) => this.hitEnemy(e as Enemy, amount, { source, tag }),
      freeze: (e, s) => {
        if ((e as Enemy).alive) (e as Enemy).freeze(s);
      },
      stun: (e, s) => {
        if ((e as Enemy).alive) (e as Enemy).stun(s);
      },
      poison: (e, dps, s) => {
        if ((e as Enemy).alive) (e as Enemy).poison(dps, s);
      },
      slow: (e, m, s) => {
        if ((e as Enemy).alive) (e as Enemy).slow(m, s);
      },
      explode: (spec) => this.explode(spec),
      playerShot: (spec) => this.spawnPlayerShot(spec),
      after: (s, fn) => this.after(s, fn, false),
      scrap: () => run.scrap,
      addScrap: (n, x, y) => this.addScrap(n, x, y),
      spendScrap: (n) => {
        if (run.scrap < n) return false;
        run.scrap -= n;
        return true;
      },
      flags: run.flags,
      toast: (t, o) => this.hud.toast(t, o),
      say: (who, text, s) => this.say(who, text, s),
      sfx: (id) => this.sfx(id),
      shake: (i, ms) => this.fx.shake(i, ms),
      flash: (c, ms) => this.fx.flash(c, ms),
      marker: (art, x, y, seconds) => this.showMarker(art, x, y, seconds),
      vfx: (spec) => this.vfx(spec),
      clearEnemyShots: () => {
        let n = 0;
        this.enemyShots.forEachActive((p) => {
          this.fx.burst('spark', p.x, p.y, 2);
          p.kill();
          n++;
        });
        return n;
      },
      pushEnemies: (x, y, radius, force) => {
        for (const e of this.enemies) {
          if (this.isTarget(e) && Math.hypot(e.x - x, e.y - y) < radius + e.radius) e.knock(Math.atan2(e.y - y, e.x - x), force);
        }
      },
    };
  }

  private vfx(spec: VfxSpec): void {
    switch (spec.kind) {
      case 'burst':
        this.fx.burst(spec.style, spec.x, spec.y, spec.count);
        return;
      case 'ring':
        this.fx.ring(spec.x, spec.y, spec.color, spec.radius, 320, 4);
        return;
      case 'zap':
        this.fx.zap(spec.from, spec.to, spec.color);
        return;
      case 'slash':
        this.fx.slash(spec.x, spec.y, spec.angle, spec.color);
        return;
      case 'text':
        this.fx.floatText(spec.x, spec.y, spec.text, spec.color ?? '#ffffff', 20);
        return;
    }
  }

  // ---- Rick walking with Morty ----------------------------------------------------------------

  /** Where Rick trails: a step behind Morty, on the side away from where he's aiming. */
  private rickSpot(): Vec {
    const p = this.player;
    const a = p.aimAngle + Math.PI + 0.5;
    return this.clampToRoom({ x: p.x + Math.cos(a) * 78, y: p.y + Math.sin(a) * 44 });
  }

  /** In acts where the episode has Rick along, he's in every room with Morty. */
  private placeRickBuddy(): void {
    if (!this.run.act.rick.follows || !this.roomView) return;
    const spot = this.rickSpot();
    this.stage.ensureActor('rick', spot);
  }

  private updateRickBuddy(dt: number): void {
    const lines = this.run.act.rick.follows;
    if (!lines || this.stage.running || this.rickBusy || this.traveling || !this.stage.has('rick')) return;
    const target = this.rickSpot();
    // He doesn't walk through walls; he waits where he is until Morty moves on.
    const view = this.roomView;
    const free = !view || (view.tileAt(target.x, target.y) !== 'wall' && view.tileAt(target.x, target.y) !== 'block');
    if (free) this.stage.follow('rick', target, dt, this.run.time);
    if (this.run.time - this.rickTalkAt > 26) this.rickSays('idle');
  }

  /** Rick comments on what just happened, now and then (never talks over himself). */
  private rickSays(kind: keyof RickLines, chance = 1): void {
    const lines = this.run.act.rick.follows;
    if (!lines || !this.stage.has('rick') || this.stage.running || this.dead) return;
    const pool = lines[kind];
    if (!pool.length || this.run.time - this.rickTalkAt < 7) return;
    // A fixed stride through the pool, so his chatter never touches the gameplay RNG.
    this.rickLineCount++;
    if (chance < 1 && (this.rickLineCount * 7919) % 100 >= chance * 100) return;
    this.rickTalkAt = this.run.time;
    const line = pool[(this.rickLineCount * 5) % pool.length];
    this.say('rick', line, 2.6);
    if (this.rickLineCount % 3 === 0) this.after(1.2, () => this.sfx('burp'), true);
  }

  // ---- companions, orbiting junk, charged shots and looks ------------------------------------

  private companionHost(): CompanionHost {
    return {
      scene: this,
      playerPos: () => ({ x: this.player.x, y: this.player.y }),
      nearestEnemy: (from, range) => this.nearestTarget(from, range, true),
      targets: () => this.enemies.filter((e) => this.isTarget(e) && e.spawnLeft <= 0),
      shoot: (from, angle, damage, color) =>
        this.playerShots.spawn({ x: from.x, y: from.y, angle, speed: 560, damage, radius: 6, life: 0.8, texture: 'shot-player', tint: color, glow: color, source: 'companion' }),
      hit: (e, damage, source, angle) => this.hitEnemy(e, damage, { source, angle }),
      eatShots: (at, radius) => this.eatEnemyShots(at, radius),
      shotDamage: () => this.stats().damage,
      rate: () => this.stats().companionRate,
      sfx: (id) => this.sfx(id),
      burst: (style, x, y, count) => this.fx.burst(style, x, y, count),
    };
  }

  /** Keeps the buddies in step with what Morty holds. */
  private syncCompanions(): void {
    const owned = this.run.inventory.owned();
    this.companions = this.companions.filter((c) => {
      if (owned.includes(c.itemId)) return true;
      c.destroy();
      return false;
    });
    for (const id of owned) {
      const spec = this.reg.items.get(id)?.companion;
      if (!spec || this.companions.some((c) => c.itemId === id)) continue;
      const c = new Companion(this.companionHost(), id, spec, this.companions.length);
      this.companions.push(c);
      this.fx.burst('portal', c.img.x, c.img.y, 10);
    }
  }

  /** Morty's look: the latest item's look for each piece, with a transformation's look on top. */
  private refreshLook(): void {
    const owned = this.run.inventory.owned();
    const look: LookSpec = {};
    for (const id of owned) {
      const l = this.reg.items.get(id)?.look;
      if (l) Object.assign(look, l);
    }
    this.transformation = activeTransformations(owned, this.reg.transformations)[0] ?? null;
    if (this.transformation) Object.assign(look, this.transformation.look);
    this.look = look;
    const key = JSON.stringify(look);
    if (key === this.lookKey) return;
    this.lookKey = key;
    this.player.setTexture(this.playerTexture());
    this.accessory?.destroy();
    this.accessory = look.accessory && this.textures.exists(look.accessory) ? this.add.image(0, 0, look.accessory) : null;
  }

  /** Per frame: buddies, orbiting junk, the charged-shot glow, the accessory, the trail, dash erasing. */
  private updateGear(dt: number): void {
    const st = this.stats();
    const p = this.player;
    this.updateRickBuddy(dt);
    for (const c of this.companions) c.update(dt);
    this.orbiters?.update(dt, st.orbit);
    if (p.isDashing && st.dashEraseShots > 0) {
      const n = this.eatEnemyShots(p, st.dashEraseShots);
      if (n) {
        this.fx.burst('paper', p.x, p.y - 10, Math.min(12, n * 3));
        this.sfx('spark');
      }
    }
    // A glow around Morty when his next shot is charged.
    const ready = st.chargeShot > 0 && !!this.run.inventory.weapon && this.run.time - this.lastFireAt >= st.chargeShot;
    if (ready && !this.chargeAnnounced) {
      this.chargeAnnounced = true;
      this.sfx('charge-ready');
    }
    if (ready) {
      this.chargeRing ??= this.add.circle(p.x, p.y, 26, 0xfff2a8, 0).setStrokeStyle(3, 0xfff2a8, 0.9).setDepth(p.sprite.depth - 1);
      this.chargeRing.setPosition(p.x, p.y - 8).setScale(1 + 0.1 * Math.sin(this.run.time * 12)).setDepth(p.sprite.depth - 1);
    } else if (this.chargeRing) {
      this.chargeRing.destroy();
      this.chargeRing = null;
    }
    const s = p.sprite;
    if (this.accessory) {
      const top = s.y - s.displayHeight * s.originY + TEXTURE_PAD;
      this.accessory.setPosition(s.x, top + (this.look.dy ?? 0)).setDepth(s.depth + 1).setFlipX(s.flipX).setAlpha(s.alpha).setVisible(p.falling <= 0);
    }
    if (this.look.trail !== undefined && p.moving) {
      this.trailTimer -= dt;
      if (this.trailTimer <= 0) {
        this.trailTimer = 0.07;
        const wobble = Math.sin(this.run.time * 37) * 8;
        this.fx.pop(s.x + wobble, s.y + 10, 'fx-dot', this.look.trail, 0.8, 0.1, 450);
      }
    }
  }

  private showMarker(art: string, x: number, y: number, seconds: number): void {
    if (!this.textures.exists(art)) return;
    const img = this.add.image(x, y, art).setDepth(y);
    this.tweens.add({ targets: img, scale: 1.15, duration: 180, yoyo: true, repeat: -1 });
    this.time.delayedCall(seconds * 1000, () => img.destroy());
  }

  private after(seconds: number, fn: () => void, room: boolean): void {
    this.timers.push({ at: this.run.time + seconds, fn, room });
  }

  private runTimers(): void {
    if (!this.timers.length) return;
    const now = this.run.time;
    const due = this.timers.filter((t) => t.at <= now);
    if (!due.length) return;
    this.timers = this.timers.filter((t) => t.at > now);
    for (const t of due) t.fn();
  }

  // ---- input -----------------------------------------------------------------------------------

  private setupInput(): void {
    const kb = this.input.keyboard!;
    this.keys = kb.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,SPACE,SHIFT,E,Q,F,R,C,TAB,ESC,M,ENTER', true) as Record<string, Phaser.Input.Keyboard.Key>;
    this.input.mouse?.disableContextMenu();
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (this.stage.running) this.stage.skip();
      else if (p.rightButtonDown() && !this.dead && !this.player.controlLocked) this.useActive();
    });
  }

  private readInput(): PlayerInput {
    const k = this.keys;
    const mx = (k.D.isDown ? 1 : 0) - (k.A.isDown ? 1 : 0);
    const my = (k.S.isDown ? 1 : 0) - (k.W.isDown ? 1 : 0);
    const ax = (k.RIGHT.isDown ? 1 : 0) - (k.LEFT.isDown ? 1 : 0);
    const ay = (k.DOWN.isDown ? 1 : 0) - (k.UP.isDown ? 1 : 0);
    const p = this.input.activePointer;
    const world = this.cameras.main.getWorldPoint(p.x, p.y);
    let aimX = world.x;
    let aimY = world.y;
    let fire = p.leftButtonDown();
    if (ax || ay) {
      aimX = this.player.x + ax * 100;
      aimY = this.player.y + ay * 100;
      fire = true;
    }
    return { moveX: mx, moveY: my, aimX, aimY, fire, dash: Phaser.Input.Keyboard.JustDown(k.SPACE), sneak: k.SHIFT.isDown };
  }

  private handleButtons(): void {
    const k = this.keys;
    const JD = Phaser.Input.Keyboard.JustDown;
    if (JD(k.ESC)) {
      this.openPause();
      return;
    }
    if (JD(k.TAB) || JD(k.M)) this.hud.toggleMap();
    const e = JD(k.E);
    const q = JD(k.Q);
    const f = JD(k.F);
    const r = JD(k.R);
    const c = JD(k.C);
    if (this.dead || this.player.controlLocked || this.player.falling > 0) return;
    if (e) this.interactable?.act();
    if (q) this.callRick();
    if (f) this.mechanics.forEach((m) => m.inst.onAction?.());
    if (r) this.useConsumable();
    if (c) this.useActive();
  }

  private openPause(): void {
    if (this.dead || this.ended) return;
    this.scene.pause();
    this.scene.launch('Pause', {
      onResume: () => {
        this.scene.resume();
        this.input.keyboard?.resetKeys();
      },
      onQuit: () => {
        this.scene.resume();
        this.finishRun(false, true);
      },
      model: () => this.hudModel(),
    });
  }

  // ---- main loop -------------------------------------------------------------------------------

  override update(time: number, delta: number): void {
    this.updateSlowMo(time);
    const dt = Math.min(delta / 1000, 1 / 20) * this.timeFactor;
    this.frameDelta = dt;
    this.fx.update(dt);
    this.applyCameraKick(delta / 1000);
    if (this.worldHold) {
      if (!this.physics.world.isPaused) this.physics.world.pause();
      return;
    }
    if (this.fx.stopped || this.transitioning || !this.roomView) return;
    const run = this.run;
    run.time += dt;
    this.runTimers();
    if (!this.roomView) return;
    if (this.weaponDue && run.time >= this.weaponDue && !this.stage.running) {
      this.weaponDue = 0;
      this.giveActWeapon();
    }
    if (this.hudTimer) this.hudTimer.left = Math.max(0, this.hudTimer.left - dt);
    const changes = run.statuses.tick(dt);
    if (changes.length) this.onStatusChanges(changes);

    if (this.stage.running) {
      const JD = Phaser.Input.Keyboard.JustDown;
      const k = this.keys;
      if (JD(k.SPACE) || JD(k.ENTER) || JD(k.E)) this.stage.skip();
    }
    const input = this.readInput();
    this.handleButtons();
    if (!this.roomView || this.ended) return;
    if (this.dead) return;
    this.player.update(dt, input);
    this.updateGear(dt);
    this.checkTiles();
    for (const m of this.mechanics) m.inst.update?.(dt);
    this.script?.update?.(dt);
    if (!this.roomView) return;

    for (const e of [...this.enemies]) {
      if (!e.alive) continue;
      const poison = e.tick(dt, run.time);
      if (poison > 0) this.hitEnemy(e, poison, { source: 'poison' });
      if (e.alive && e.pending === 'kill') this.hitEnemy(e, e.hp + 1, { source: 'hazard' });
      else if (e.alive && e.pending === 'despawn') this.despawnEnemy(e);
    }
    this.separateEnemies();
    this.checkContacts();

    this.playerShots.update(
      dt,
      this.roomView,
      () => this.sfx('bounce'),
      (p, wall) => wall && this.fx.burst('hit', p.x, p.y, 3),
      (p) => this.homingTarget(p),
    );
    this.checkPlayerShots();
    this.enemyShots.update(
      dt,
      this.roomView,
      () => undefined,
      (p, wall) => wall && this.fx.burst('hit', p.x, p.y, 2),
    );
    this.checkEnemyShots();
    const reduced = this.settings().reducedFlash;
    this.hazards.update(
      dt,
      run.time,
      { x: this.player.x, y: this.player.y, radius: this.player.radius },
      (h) => this.damagePlayer(h, 'a hazard'),
      reduced,
      (id) => this.applyStatus(id),
    );
    this.telegraphs.draw(run.time, reduced);

    this.objects.update(dt, this.player, this.stats().magnet, (p) => this.collectPickup(p));
    this.objects.tickPedestals(dt);
    if (this.pendingSwap && (run.time > this.pendingSwapUntil || this.pendingSwap.taken || Math.hypot(this.player.x - this.pendingSwap.x, this.player.y - this.pendingSwap.y) > 110)) {
      this.pendingSwap = null;
    }
    this.interactable = this.objects.nearestInteractable(
      this.player,
      (p) => this.pedestalLabel(p),
      (p) => this.takePedestal(p),
    );

    this.updateEncounter();
    this.updateDoors(false);
    this.checkRoomClear();
    this.checkDoorTransition();
  }

  // ---- acts and rooms --------------------------------------------------------------------------

  private floorConfig(act: ActDef): FloorConfig {
    if (act.layout.kind !== 'procedural') throw new Error('floorConfig needs a procedural layout');
    const layout = act.layout;
    const special = act.specialRoom ? this.reg.specialRooms.get(act.specialRoom) : undefined;
    return {
      roomCount: layout.roomCount,
      templates: layout.templates,
      startTemplate: layout.startTemplate,
      treasureTemplate: layout.treasureTemplate,
      shopTemplate: layout.shopTemplate,
      special: special ? { id: special.id, templates: special.templates } : undefined,
      finaleTemplate: this.stageTemplate(act, 0),
      calmPrefix: layout.calmPrefix,
    };
  }

  private stageTemplate(act: ActDef, stage: number): ContentId {
    const s = act.finale[stage];
    return s.kind === 'boss' ? s.template : this.reg.encounters.get(s.encounter)!.template;
  }

  private startAct(index: number): void {
    const run = this.run;
    this.teardownRoom();
    run.actIndex = index;
    const act = run.act;
    this.player.setTexture(this.playerTexture());
    this.actors.clear();
    this.actors.set(act.playable, this.playerAnchor);
    this.mechanics = act.mechanics.map((id) => {
      const def = this.reg.mechanics.get(id)!;
      return { def, inst: def.create(this.makeMechanicApi()) };
    });
    const floor =
      act.layout.kind === 'procedural'
        ? generateFloor(this.floorConfig(act), run.rng.fork(`floor:${act.id}`))
        : buildFixedFloor(act.layout);
    run.floor = floor;
    run.rooms = floor.rooms.map((r) => freshRoomState(r.kind));
    run.stage = -1;
    for (const s of act.startStatuses ?? []) run.statuses.add(s);
    this.prepareWeapon(index);
    this.invalidateStats();
    this.mechanics.forEach((m) => m.inst.onActStart?.());
    this.weaponDue = 0;
    this.playCutscenes(act.intro ?? [], () => {
      this.enterRoom(floor.startId);
      if (act.arrive) this.arrive(act.arrive);
      this.hud.banner(act.name, act.subtitle);
      // A beat after arriving, and never later than the first room he walks into. An opening
      // scene usually hands it over itself; if not, it comes once the scene is over.
      if (act.weapon?.when === 'start') this.weaponDue = run.time + 1.6;
      if (act.opening && this.scriptApi) {
        // The opening brings Rick on itself (out of the portal behind Morty).
        this.stage.clear();
        this.playScene(act.opening(this.scriptApi), () => this.placeRickBuddy());
      }
    });
  }

  /**
   * Morty's weapon as an act begins: put away for a quiet act, otherwise kept from the last act.
   * Starting part-way through an episode (a debug jump) hands over whatever the story would have
   * given him by now.
   */
  private prepareWeapon(index: number): void {
    const run = this.run;
    const inv = run.inventory;
    if (run.act.unarmed) {
      inv.weapon = null;
      return;
    }
    if (inv.weapon) return;
    for (let i = index - 1; i >= 0; i--) {
      const w = run.sequence[i].weapon;
      if (w) {
        inv.weapon = w.item;
        return;
      }
    }
  }

  /**
   * The act's story weapon changes hands on screen: whoever gives it says their line, the weapon
   * arcs into Morty's hands, and the item banner says what it is.
   */
  private giveActWeapon(): void {
    const run = this.run;
    const w: StoryWeapon | undefined = run.act.weapon;
    if (!w || run.inventory.weapon === w.item || !this.roomView) return;
    const item = this.reg.items.get(w.item);
    if (!item) return;
    const p = this.player;
    this.say(w.from, w.line, readTime(w.line) + 0.8);
    // From the giver's hands if they're here, out of Morty's own bag, or tossed in from off-screen.
    const giver = w.from === run.act.playable ? null : (this.actors.get(w.from)?.() ?? null);
    const view = this.cameras.main.worldView;
    const start = w.from === run.act.playable ? { x: p.x, y: p.y - 10 } : (giver ?? { x: p.x < view.centerX ? view.right - 40 : view.x + 40, y: view.y + 40 });
    const icon = this.add.image(start.x, start.y, `icon-${item.id}`).setDepth(5200).setScale(1.3);
    const arc = { t: 0 };
    const high = w.from === run.act.playable ? 90 : 140;
    this.tweens.add({
      targets: arc,
      t: 1,
      duration: 620,
      ease: 'Sine.easeInOut',
      onUpdate: () => {
        const t = arc.t;
        icon.setPosition(start.x + (this.player.x - start.x) * t, start.y + (this.player.y - 16 - start.y) * t - Math.sin(Math.PI * t) * high);
        icon.setAngle(t * 540);
      },
      onComplete: () => {
        icon.destroy();
        this.fx.pop(this.player.x, this.player.y - 16, 'fx-star', item.weapon?.color ?? 0xffffff, 0.6, 2.4, 220);
        this.giveItem(w.item);
      },
    });
    this.sfx('throw-light');
  }

  private enterRoom(id: number, from?: Dir): void {
    const run = this.run;
    const floor = run.floor!;
    this.leaveRoom();
    const fr = floor.rooms[id];
    const st = run.rooms[id];
    const firstVisit = !st.visited;
    st.visited = true;
    st.seen = true;
    for (const n of Object.values(fr.neighbors)) if (n !== undefined) run.rooms[n].seen = true;
    run.currentRoom = id;
    run.stage = fr.kind === 'finale' ? 0 : -1;
    const doors: DoorSpec[] = (Object.entries(fr.neighbors) as [Dir, number][]).map(([dir, target]) => ({
      dir,
      target,
      targetKind: run.rooms[target].kind,
    }));
    const tplId = fr.kind === 'finale' ? this.stageTemplate(run.act, 0) : fr.template;
    this.buildRoom(this.reg.templates.get(tplId)!, doors, st, id, fr, firstVisit, from);
  }

  /** Later finale stages happen in rooms off the floor grid (e.g. the escape after a boss). */
  private enterStage(stage: number): void {
    this.leaveRoom();
    this.run.stage = stage;
    const st = freshRoomState('finale');
    st.visited = true;
    const tpl = this.reg.templates.get(this.stageTemplate(this.run.act, stage))!;
    this.buildRoom(tpl, [], st, -1 - stage, null, true);
  }

  private buildRoom(tpl: ParsedTemplate, doors: DoorSpec[], st: RoomState, id: number, fr: FloorRoom | null, firstVisit: boolean, from?: Dir): void {
    const run = this.run;
    const act = run.act;
    const view = new RoomView(this, tpl, fr?.biome ?? act.biome, doors, this.hashSeed() + id * 101);
    this.roomView = view;
    this.roomState = st;
    this.colliders = [
      this.physics.add.collider(this.player.sprite, view.walls),
      this.physics.add.collider(this.player.sprite, view.blocks),
      this.physics.add.collider(this.player.sprite, this.objects.blockers),
      this.physics.add.collider(this.enemyGroup, view.walls),
      this.physics.add.collider(this.enemyGroup, view.blocks, undefined, (e) => !(e as Enemy).def.flying),
      this.physics.add.collider(this.enemyGroup, this.objects.blockers),
    ];
    this.roomInfoObj = this.makeRoomInfo(id, tpl, st, fr, firstVisit);
    this.scriptApi = this.makeScriptApi();

    const pos = from ? this.doorEntry(view, from) : (this.roomInfoObj.markers('P')[0] ?? this.arrivalSpot(view, st.kind));
    this.player.setPosition(pos.x, pos.y);
    this.player.dashLeft = 0;
    this.lastSafe = { ...pos };
    this.companions.forEach((c) => c.reposition());
    this.placeRickBuddy();
    this.setupCamera(view);

    this.restoreContents(st);
    if (st.kind === 'treasure') this.stockTreasure(st);
    if (st.kind === 'shop') this.stockShop(st, firstVisit);
    if (st.kind === 'combat' && !st.cleared) {
      // Whether a room is an ambush is decided once, on the first visit.
      if (st.data.ambush === undefined) {
        const chance = this.run.act.ambushChance ?? ROOMS.ambushChance;
        st.data.ambush = firstVisit && this.run.stats.roomsCleared >= 1 && fr?.kind === 'combat' && this.run.play.chance(chance);
      }
      this.planWaves(tpl, st.data.ambush === true);
      this.placeHazards(tpl);
    }

    this.script = null;
    if (fr?.kind === 'special' && fr.specialId) {
      const sr = this.reg.specialRooms.get(fr.specialId);
      if (sr?.script) this.script = sr.script(this.scriptApi);
    }
    if (fr?.script) this.script = this.reg.scripts.get(fr.script)?.script(this.scriptApi) ?? null;
    const stageIndex = fr ? (fr.kind === 'finale' ? 0 : -1) : run.stage;
    if (stageIndex >= 0) this.startStage(stageIndex, st, firstVisit);
    this.script?.onEnter?.(firstVisit);
    this.mechanics.forEach((m) => m.inst.onRoomEnter?.(this.roomInfoObj!));
    if (st.kind === 'combat' && !st.cleared && this.hostileCount() === 0 && !this.encounterPending()) st.cleared = true;

    this.doorsOpen = true;
    this.updateDoors(true);
    this.updateMusic();
    if (firstVisit && fr && fr.kind !== 'start') this.after(0.8, () => this.rickSays('enter', 0.45), true);
    // Walked on before the act's weapon changed hands: hand it over right away.
    if (this.weaponDue) this.weaponDue = Math.min(this.weaponDue, run.time + 0.4);
  }

  private startStage(stage: number, st: RoomState, firstVisit: boolean): void {
    const act = this.run.act;
    const spec = act.finale[stage];
    if (st.cleared) {
      this.spawnExit();
      return;
    }
    if (spec.kind === 'boss') {
      const at = this.roomInfoObj!.markers('e')[0] ?? { x: this.roomView!.widthPx / 2, y: this.roomView!.heightPx / 2 };
      const boss = this.spawnEnemy(spec.boss, at.x, at.y, { delay: 1.0 });
      this.bossEnemy = boss;
      const info = boss?.def.boss;
      if (boss && info?.character) this.actors.set(info.character, () => (boss.alive ? { x: boss.x, y: boss.y - boss.displayHeight * boss.originY - 6 } : null));
      if (info?.objective) this.objectiveText = info.objective;
      if (boss && firstVisit) {
        this.hud.banner(boss.def.boss?.title ?? boss.def.name, 'BOSS', 0xe0484d);
        this.time.delayedCall(300, () => this.sfx('boss-roar'));
      }
    } else {
      const enc = this.reg.encounters.get(spec.encounter)!;
      this.script = enc.script(this.scriptApi!);
    }
  }

  /** Where to stand with no door to walk in through (a start room, or a debug jump). */
  private arrivalSpot(view: RoomView, kind: RoomState['kind']): Vec {
    // Hostile rooms spawn their enemies mid-room, so arrive where the south door would put you.
    if (kind !== 'start' && kind !== 'calm') {
      const c = doorCell(view.cols, view.rows, 'S');
      if (view.template.tiles[c.row]?.[c.col] === 'floor') return this.doorEntry(view, 'S');
    }
    return this.openSpotNear(view.widthPx / 2, view.heightPx / 2);
  }

  private doorEntry(view: RoomView, from: Dir): Vec {
    const c = doorCell(view.cols, view.rows, from);
    const p = view.cellCenter(c.col, c.row);
    const v = DIR_VEC[from];
    return { x: p.x - v.dx * 4, y: p.y - v.dy * 4 };
  }

  private setupCamera(view: RoomView): void {
    const cam = this.cameras.main;
    cam.setBackgroundColor(Phaser.Display.Color.IntegerToColor(view.biome.palette.background).darken(35).color);
    const vw = cam.width;
    const vh = cam.height;
    cam.stopFollow();
    this.camKick = { x: 0, y: 0 };
    cam.setFollowOffset(0, 0);
    if (view.widthPx <= vw && view.heightPx <= vh) {
      cam.removeBounds();
      cam.centerOn(view.widthPx / 2, view.heightPx / 2);
      this.camRest = { x: cam.scrollX, y: cam.scrollY };
      return;
    }
    this.camRest = null;
    const bx = view.widthPx < vw ? (view.widthPx - vw) / 2 : 0;
    const by = view.heightPx < vh ? (view.heightPx - vh) / 2 : 0;
    cam.setBounds(bx, by, Math.max(view.widthPx, vw), Math.max(view.heightPx, vh));
    cam.startFollow(this.player.sprite, true, 0.14, 0.14);
    cam.centerOn(this.player.x, this.player.y);
  }

  private hashSeed(): number {
    let h = 0;
    for (const ch of this.run.seed) h = (h * 31 + ch.charCodeAt(0)) | 0;
    return Math.abs(h) % 100000;
  }

  private makeRoomInfo(id: number, tpl: ParsedTemplate, st: RoomState, fr: FloorRoom | null, firstVisit: boolean): RoomInfo {
    const view = this.roomView!;
    const player = this.player;
    return {
      id,
      get kind() {
        return st.kind;
      },
      templateId: tpl.id,
      specialId: fr?.specialId,
      get cleared() {
        return st.cleared;
      },
      firstVisit,
      prefixIndex: fr?.prefixIndex,
      isLastPrefix: !!fr?.lastPrefix,
      widthPx: view.widthPx,
      heightPx: view.heightPx,
      tileAt: (x, y) => view.tileAt(x, y),
      tileCenter: (tx, ty) => view.cellCenter(tx, ty),
      markers: (ch) => tpl.markers.filter((m) => m.ch === ch).map((m) => view.cellCenter(m.col, m.row)),
      randomFloorPoint: (rng, minDist = 0) => {
        for (let i = 0; i < 60; i++) {
          const col = rng.int(0, tpl.cols - 1);
          const row = rng.int(0, tpl.rows - 1);
          if (tpl.tiles[row][col] !== 'floor') continue;
          const p = view.cellCenter(col, row);
          if (Math.hypot(p.x - player.x, p.y - player.y) >= minDist) return p;
        }
        return { x: view.widthPx / 2, y: view.heightPx / 2 };
      },
      data: st.data,
    };
  }

  private leaveRoom(): void {
    if (!this.roomView) return;
    this.script?.onExit?.();
    const st = this.roomState;
    st.pickups = this.objects.pickups.filter((p) => !p.collected).map((p) => ({ id: p.def.id, x: p.x, y: p.y }));
    st.pedestals = this.objects.pedestals
      .filter((p) => !p.taken)
      .map((p) => ({ itemId: p.ware.item?.id, pickupId: p.ware.pickup?.id, x: p.x, y: p.y, price: p.price, group: p.group, charge: p.charge }));
    this.teardownRoom();
  }

  private teardownRoom(): void {
    if (this.stage?.running) this.endSceneLock();
    this.stage?.clear();
    for (const e of this.enemies) e.remove();
    this.enemies = [];
    this.bossEnemy = null;
    this.playerShots?.clear();
    this.enemyShots?.clear();
    this.hazards?.clear();
    this.telegraphs?.clear();
    this.objects?.clear();
    this.fx?.clearBubbles();
    this.colliders.forEach((c) => c.destroy());
    this.colliders = [];
    this.roomView?.destroy();
    this.roomView = null;
    this.exitProp = null;
    this.script = null;
    this.scriptLock = false;
    this.objectiveText = null;
    this.hudTimer = null;
    this.hintText = null;
    this.timers = this.timers.filter((t) => !t.room);
    this.waves = [];
    this.pendingSpawns = 0;
    this.ambushFrom = null;
    for (const key of [...this.actors.keys()]) if (key !== this.run?.act.playable && key !== 'rick') this.actors.delete(key);
    this.hud?.hideChoice();
  }

  private restoreContents(st: RoomState): void {
    for (const p of st.pickups) this.spawnPickupAt(p.id, p.x, p.y, false);
    st.pickups = [];
    for (const p of st.pedestals) this.placeWare(p);
    st.pedestals = [];
    for (const spec of (st.data.__props as PropSpec[] | undefined) ?? []) this.objects.addProp(spec);
  }

  private transitionTo(fn: () => void): void {
    if (this.transitioning) return;
    this.transitioning = true;
    const cam = this.cameras.main;
    cam.fadeOut(110, 0, 0, 0);
    cam.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      fn();
      cam.fadeIn(140, 0, 0, 0);
      this.transitioning = false;
    });
  }

  private checkDoorTransition(): void {
    if (this.transitioning || !this.doorsOpen || this.player.falling > 0 || !this.roomView) return;
    const p = this.player;
    const v = this.roomView;
    for (const d of v.doors) {
      if (!d.open) continue;
      const inX = Math.abs(p.x - d.x) < TILE * 0.7;
      const inY = Math.abs(p.y - d.y) < TILE * 0.7;
      let go = false;
      switch (d.spec.dir) {
        case 'N':
          go = inX && p.y < TILE * 0.95;
          break;
        case 'S':
          go = inX && p.y > v.heightPx - TILE * 0.95;
          break;
        case 'W':
          go = inY && p.x < TILE * 0.95;
          break;
        case 'E':
          go = inY && p.x > v.widthPx - TILE * 0.95;
          break;
      }
      if (go) {
        const target = d.spec.target;
        const from = OPPOSITE[d.spec.dir];
        this.transitionTo(() => this.enterRoom(target, from));
        return;
      }
    }
  }

  hostileCount(): number {
    let n = 0;
    for (const e of this.enemies) if (this.isTarget(e)) n++;
    return n;
  }

  enemiesNear(x: number, y: number, radius: number): Enemy[] {
    return this.enemies.filter((e) => this.isTarget(e) && Math.hypot(e.x - x, e.y - y) <= radius);
  }

  /** A live, hostile enemy (not a calm NPC or a room hazard). */
  private isTarget(e: Enemy): boolean {
    return e.alive && !e.passive && !e.dazed && !e.def.hazard;
  }

  /** Morty falls if he's within `radius` of (x, y) and nothing lets him stand on a drop. */
  pitfall(x: number, y: number, radius: number): void {
    const p = this.player;
    if (this.dead || p.falling > 0 || Math.hypot(p.x - x, p.y - y) > radius + p.radius * 0.5) return;
    if (this.mechanics.some((m) => m.inst.allowsTile?.('cliff') === true)) return;
    this.playerFalls();
  }

  private updateDoors(force: boolean): void {
    if (!this.roomView) return;
    const fighting = this.hostileCount() > 0 || this.pendingSpawns > 0 || (this.waves.length > 0 && !this.ambushFrom);
    const lock = this.scriptLock || (!this.roomState.cleared && fighting);
    if (!force && lock === !this.doorsOpen) return;
    this.doorsOpen = !lock;
    this.roomView.setDoorsOpen(this.doorsOpen);
    if (!force && this.roomView.doors.length) this.sfx(this.doorsOpen ? 'door-open' : 'door-close');
  }

  private checkRoomClear(): void {
    const st = this.roomState;
    if (!this.roomView || st.cleared || st.kind !== 'combat') return;
    if (this.hostileCount() > 0 || this.encounterPending()) return;
    if (this.script?.onEnemiesCleared?.()) return;
    this.clearRoom(true);
  }

  private clearRoom(reward: boolean): void {
    const st = this.roomState;
    if (st.cleared) return;
    st.cleared = true;
    for (const e of [...this.enemies]) if (e.alive && e.def.hazard) this.despawnEnemy(e);
    const run = this.run;
    run.stats.roomsCleared++;
    this.sfx('room-clear');
    runHook(this.sources(), 'onRoomClear', this.ctx);
    this.onStatusChanges(run.statuses.roomCleared());
    if (run.inventory.chargeActive(1)) {
      const a = this.reg.items.get(run.inventory.active!.id);
      this.hud.toast(`${a?.name ?? 'Active item'} is charged! (Right-click / C)`, { color: 0x97ce4c });
    }
    this.mechanics.forEach((m) => m.inst.onRoomClear?.(this.roomInfoObj!));
    if (reward) this.rollRoomReward();
    this.after(0.6, () => this.rickSays('clear', 0.6), true);
  }

  private rollRoomReward(): void {
    const rng = this.run.play;
    if (!rng.chance(ECONOMY.roomRewardChance)) return;
    const at = this.openSpotNear(this.roomView!.widthPx / 2, this.roomView!.heightPx / 2);
    const kind = rng.weighted([
      { id: 'scrap', weight: 55 },
      { id: 'heart-half', weight: 22 },
      { id: 'heart-full', weight: 8 },
      { id: 'consumable', weight: 15 },
    ]);
    if (kind === 'consumable') {
      const id = this.randomItem({ kind: 'consumable' });
      if (id) {
        this.placeWare({ itemId: id, x: at.x, y: at.y });
        return;
      }
    }
    if (kind === 'scrap') {
      const n = rng.int(1, 3);
      for (let i = 0; i < n; i++) this.spawnPickupAt('scrap', at.x, at.y, true);
    } else {
      this.spawnPickupAt(kind === 'consumable' ? 'scrap' : kind, at.x, at.y, true);
    }
  }

  private openSpotNear(x: number, y: number): Vec {
    const view = this.roomView!;
    let best = { x, y };
    let bestD = Infinity;
    for (let r = 0; r < view.rows; r++) {
      for (let c = 0; c < view.cols; c++) {
        if (view.template.tiles[r][c] !== 'floor') continue;
        const p = view.cellCenter(c, r);
        const d = Math.hypot(p.x - x, p.y - y);
        if (d < bestD) {
          bestD = d;
          best = p;
        }
      }
    }
    return best;
  }

  /**
   * Plans a combat room's enemies from its spawn markers and splits them into 1-3 waves. Later
   * waves bring one extra enemy each, so waves never make a room easier.
   */
  private planWaves(tpl: ParsedTemplate, ambush: boolean): void {
    const run = this.run;
    const pool = enemyPoolFor(this.reg, run.episode.id, run.act);
    const marks = tpl.markers.filter((m) => m.ch === 'e' || m.ch === 'E');
    if (!pool.length || !marks.length) return;
    const rng = run.play;
    let count = marks.length <= 3 ? 1 : marks.length <= 6 ? rng.int(1, 2) : rng.int(2, 3);
    if (ambush) count = Math.max(2, count);
    const at = (m: { col: number; row: number }) => this.roomView!.cellCenter(m.col, m.row);
    const plans: SpawnPlan[] = marks.map((m) => ({
      id: rng.weighted(pool),
      ...at(m),
      elite: m.ch === 'E' || (run.stats.roomsCleared > 0 && rng.chance(run.act.eliteChance)),
    }));
    for (let w = 1; w < count; w++) plans.push({ id: rng.weighted(pool), ...at(rng.pick(marks)), elite: false });
    this.waves = Array.from({ length: count }, (_, k) => plans.filter((_, i) => i % count === k));
    this.waveTotal = count;
    if (ambush) this.ambushFrom = { x: this.player.x, y: this.player.y };
    else this.nextWave();
  }

  /** Some combat rooms get one or two of the act's hazards (lockers, spills, scanners...). */
  private placeHazards(tpl: ParsedTemplate): void {
    const act = this.run.act;
    const rng = this.run.play;
    if (!act.hazards?.length || !rng.chance(act.hazardChance ?? 0.5)) return;
    const used = new Set<string>();
    const n = rng.int(1, 2);
    for (let i = 0; i < n; i++) {
      const id = rng.weighted(act.hazards);
      const def = this.reg.enemies.get(id);
      if (!def?.hazard) continue;
      const cell = this.hazardCell(tpl, def.hazard.placement, used);
      if (cell) this.spawnEnemy(id, cell.x, cell.y, { delay: 0.2 });
    }
  }

  /** A random floor cell for a hazard, away from doors, markers and Morty. */
  private hazardCell(tpl: ParsedTemplate, placement: 'wall' | 'floor' | 'cliff-edge', used: Set<string>): Vec | null {
    const view = this.roomView!;
    const tiles = tpl.tiles;
    const doors = (['N', 'S', 'E', 'W'] as Dir[]).map((d) => doorCell(tpl.cols, tpl.rows, d));
    const marked = new Set(tpl.markers.map((m) => `${m.col},${m.row}`));
    const at = (c: number, r: number) => (r < 0 || c < 0 || r >= tpl.rows || c >= tpl.cols ? 'wall' : tiles[r][c]);
    const cells: { p: Vec; key: string }[] = [];
    for (let r = 0; r < tpl.rows; r++) {
      for (let c = 0; c < tpl.cols; c++) {
        const key = `${c},${r}`;
        if (tiles[r][c] !== 'floor' || marked.has(key) || used.has(key)) continue;
        if (doors.some((d) => Math.abs(d.col - c) + Math.abs(d.row - r) < 3)) continue;
        const near = [at(c - 1, r), at(c + 1, r), at(c, r - 1), at(c, r + 1)];
        if (placement === 'wall' && !near.includes('wall')) continue;
        if (placement === 'cliff-edge' && !near.includes('cliff')) continue;
        const p = view.cellCenter(c, r);
        if (Math.hypot(p.x - this.player.x, p.y - this.player.y) < ROOMS.safeSpawnTiles * TILE) continue;
        cells.push({ p, key });
      }
    }
    if (!cells.length) return null;
    const pick = this.run.play.pick(cells);
    used.add(pick.key);
    return pick.p;
  }

  /** True while a room still has enemies on the way. */
  private encounterPending(): boolean {
    return this.waves.length > 0 || this.pendingSpawns > 0 || this.ambushFrom !== null;
  }

  private nextWave(): void {
    const wave = this.waves.shift();
    if (!wave) return;
    const n = this.waveTotal - this.waves.length;
    if (n > 1) this.hud.toast(`Wave ${n} of ${this.waveTotal}`, { color: 0xc58bff, seconds: 1.3 });
    wave.forEach((plan, i) => this.warnSpawn(plan, i * 0.07));
  }

  /** Shows where an enemy will appear, then brings it in. */
  private warnSpawn(plan: SpawnPlan, lag: number): void {
    const at = this.safeSpawnPoint(plan.x, plan.y);
    this.pendingSpawns++;
    const tele = this.telegraphs.add({ kind: 'spawn', x: at.x, y: at.y, radius: 24 }, () => true);
    const total = ROOMS.spawnWarning + lag;
    const counter = { t: 0 };
    this.tweens.add({ targets: counter, t: 1, duration: total * 1000, onUpdate: () => tele.setProgress(counter.t) });
    this.after(
      total,
      () => {
        tele.destroy();
        this.pendingSpawns = Math.max(0, this.pendingSpawns - 1);
        this.fx.ring(at.x, at.y, 0xc58bff, 34, 220);
        this.fx.burst('smoke', at.x, at.y, 4);
        this.spawnEnemy(plan.id, at.x, at.y, { elite: plan.elite, delay: ROOMS.warnedSpawnDelay });
      },
      true,
    );
  }

  /** The spot itself, or the closest open floor that keeps a safe distance from Morty. */
  private safeSpawnPoint(x: number, y: number): Vec {
    const view = this.roomView!;
    const p = this.player;
    const safe = ROOMS.safeSpawnTiles * TILE;
    if (Math.hypot(x - p.x, y - p.y) >= safe) return { x, y };
    let best: Vec | null = null;
    let bestD = Infinity;
    let far: Vec = { x, y };
    let farD = -1;
    for (let r = 1; r < view.rows - 1; r++) {
      for (let c = 1; c < view.cols - 1; c++) {
        if (view.template.tiles[r][c] !== 'floor') continue;
        const cell = view.cellCenter(c, r);
        const fromMorty = Math.hypot(cell.x - p.x, cell.y - p.y);
        if (fromMorty > farD) {
          farD = fromMorty;
          far = cell;
        }
        if (fromMorty < safe) continue;
        const d = Math.hypot(cell.x - x, cell.y - y);
        if (d < bestD) {
          bestD = d;
          best = cell;
        }
      }
    }
    return best ?? far;
  }

  /** Waves roll in as the previous one thins out; ambushes spring when Morty walks in. */
  private updateEncounter(): void {
    if (!this.roomView || this.roomState.cleared) return;
    if (this.ambushFrom) {
      const p = this.player;
      if (Math.hypot(p.x - this.ambushFrom.x, p.y - this.ambushFrom.y) > ROOMS.ambushTrigger * TILE) this.springAmbush();
      return;
    }
    if (this.waves.length && this.pendingSpawns === 0 && this.hostileCount() <= ROOMS.nextWaveAt) this.nextWave();
  }

  private springAmbush(): void {
    this.ambushFrom = null;
    this.hud.banner('AMBUSH!', 'The doors slam shut behind you.');
    this.sfx('door-close');
    this.sfx('alarm');
    this.fx.shake(10, 260);
    this.updateDoors(true);
    this.nextWave();
  }

  /** Treasure rooms offer a choice of two: one of them rare when the pool has any. */
  private stockTreasure(st: RoomState): void {
    if (st.stocked) return;
    st.stocked = true;
    const view = this.roomView!;
    const at = this.roomInfoObj!.markers('I')[0] ?? { x: view.widthPx / 2, y: view.heightPx / 2 };
    const held: ContentId[] = [];
    const first = this.randomItem({ rarity: 'rare', kinds: ['passive', 'active'] }) ?? this.randomItem({ kinds: ['passive', 'active'] });
    if (first) held.push(first);
    const second = this.randomItem({ kinds: ['passive', 'active'], exclude: held });
    if (second) held.push(second);
    if (!held.length) {
      for (let i = 0; i < 5; i++) this.spawnPickupAt('scrap', at.x, at.y, true);
      return;
    }
    if (held.length === 1) {
      this.placeWare({ itemId: held[0], x: at.x, y: at.y });
      return;
    }
    // Side by side, a step and a half apart (closer if that's off the floor).
    const gap = [TILE * 1.5, TILE].find((g) => view.tileAt(at.x - g, at.y) === 'floor' && view.tileAt(at.x + g, at.y) === 'floor') ?? TILE;
    held.forEach((id, i) => this.placeWare({ itemId: id, x: at.x + (i ? gap : -gap), y: at.y, group: `treasure-${this.run.currentRoom}` }));
  }

  private stockShop(st: RoomState, firstVisit: boolean): void {
    const act = this.run.act;
    const info = this.roomInfoObj!;
    const keeperAt = info.markers('K')[0];
    if (keeperAt && act.shop) {
      this.addProp({ art: act.shop.keeperArt, x: keeperAt.x, y: keeperAt.y, solid: true, actor: 'shopkeeper' });
      if (firstVisit) this.after(0.4, () => this.fx.bubble({ x: keeperAt.x, y: keeperAt.y - 60 }, `${act.shop!.name}: Everything's for sale!`, 0xffd54a, 2.4), true);
    }
    if (st.stocked) return;
    st.stocked = true;
    const spots = info.markers('I');
    const mult = this.stats().shopPriceMult * (act.shop?.priceMult ?? 1);
    const price = (n: number) => Math.max(1, Math.round(n * mult));
    const wares: Ware[] = [];
    const taken: ContentId[] = [];
    const stock = (id: ContentId | null | undefined): boolean => {
      const item = id ? this.reg.items.get(id) : undefined;
      if (!item) return false;
      wares.push({ item });
      taken.push(item.id);
      return true;
    };
    // The shop's staple is reserved first, so no random roll can put a second one on the shelf.
    const staple = act.shop?.alwaysStocks?.find((id) => this.reg.items.has(id));
    if (staple) taken.push(staple);
    // One good item (a passive or an active, rare half the time), then consumables.
    const rare = this.run.play.chance(0.5);
    stock((rare ? this.randomItem({ rarity: 'rare', kinds: ['passive', 'active'], exclude: taken }) : null) ?? this.randomItem({ kinds: ['passive', 'active'], exclude: taken }));
    stock(staple ?? this.randomItem({ kind: 'consumable', exclude: taken }));
    wares.push({ pickup: this.reg.pickups.get('heart-full') });
    const extra = this.run.play.chance(0.6) ? this.randomItem({ kind: 'consumable', exclude: taken }) : null;
    if (!stock(extra)) wares.push({ pickup: this.reg.pickups.get('heart-half') });
    wares.slice(0, spots.length).forEach((w, i) => {
      const base = w.item ? w.item.price : w.pickup?.id === 'heart-full' ? ECONOMY.prices.heartFull : ECONOMY.prices.heartHalf;
      this.placeWare({ itemId: w.item?.id, pickupId: w.pickup?.id, x: spots[i].x, y: spots[i].y, price: price(base) });
    });
  }

  private startMusicFor(): string {
    const act = this.run.act;
    if (this.bossEnemy?.alive) return this.bossEnemy.def.boss?.music ?? 'boss';
    return act.music ?? act.biome.music;
  }

  private updateMusic(): void {
    svc().audio.music(this.startMusicFor());
  }

  // ---- finales and act flow ------------------------------------------------------------------

  private onBossKilled(boss: Enemy, at: Vec): void {
    this.bossEnemy = null;
    this.clearEnemiesSilently();
    this.enemyShots.clear();
    this.hazards.clear();
    this.telegraphs.clear();
    this.fx.shake(14, 500);
    this.fx.flash(0xffffff, 180);
    this.updateMusic();
    // Doors stay shut until the defeat has played out (completeStage opens the way on).
    this.scriptLock = true;
    const info = boss.def.boss!;
    if (this.script?.onBossDefeated?.()) return;
    this.finishBossDefeat(info, at);
  }

  /**
   * A boss who isn't killed: at 0 HP he's left dazed and harmless while his ending plays out in
   * the room (Rick walking in to freeze Frank), then the defeat goes on as usual.
   */
  private dazeBoss(e: Enemy): void {
    const info = e.def.boss!;
    e.hp = 0;
    e.daze();
    this.bossEnemy = null;
    this.objectiveText = null;
    this.scriptLock = true;
    for (const o of [...this.enemies]) {
      if (o === e || !o.alive) continue;
      this.fx.burst('death', o.x, o.y, 6);
      o.remove();
    }
    this.enemies = [e];
    this.enemyShots.clear();
    this.hazards.clear();
    this.telegraphs.clear();
    this.run.stats.kills++;
    this.fx.hitStop(140);
    this.fx.shake(10, 360);
    this.fx.flash(0xffffff, 140);
    this.fx.ring(e.x, e.y, 0xffe27a, e.radius * 3, 320, 5);
    this.fx.floatText(e.x, e.y - e.displayHeight * e.originY - 10, 'DAZED!', '#ffe27a', 26);
    this.sfx('stagger');
    this.updateMusic();
    const at = { x: e.x, y: e.y };
    this.after(
      0.7,
      () =>
        info.dazed!(this.scriptApi!, e, () => {
          if (e.alive) {
            this.enemies = this.enemies.filter((o) => o !== e);
            e.remove();
          }
          this.finishBossDefeat(info, at);
        }),
      true,
    );
  }

  private finishBossDefeat(info: BossInfo, at: Vec): void {
    const finish = () => {
      info.onDefeat?.(this.scriptApi!, at);
      if (info.reward && !this.run.inventory.has(info.reward)) {
        const c = this.openSpotNear(this.roomView!.widthPx / 2 - TILE * 2, this.roomView!.heightPx / 2);
        this.placeWare({ itemId: info.reward, x: c.x, y: c.y });
      }
      this.completeStage();
    };
    if (info.defeatCutscene) this.after(0.6, () => this.playCutscenes([info.defeatCutscene!], finish), true);
    else finish();
  }

  private completeStage(): void {
    const st = this.roomState;
    if (!st.cleared) {
      st.cleared = true;
      this.run.stats.roomsCleared++;
    }
    this.scriptLock = false;
    this.objectiveText = null;
    this.hudTimer = null;
    this.spawnExit();
  }

  /**
   * The way on once a finale stage is done: into the next stage (a security gate), or out of the
   * act the way the show travels (Rick's ship, a portal). Never a generic door.
   */
  private spawnExit(): void {
    if (this.exitProp || !this.roomView) return;
    const act = this.run.act;
    const more = this.run.stage + 1 < act.finale.length;
    const marker = this.roomInfoObj!.markers('X')[0];
    const pos = marker ?? this.openSpotNear(this.roomView.widthPx / 2 + TILE * 2, this.roomView.heightPx / 2);
    const travel = act.travel;
    const art = more ? (act.stageExit?.art ?? 'exit-gate') : (travel?.art ?? TRAVEL_ART[travel?.by ?? 'portal']);
    const label = more ? (act.stageExit?.label ?? 'Keep going') : (travel?.label ?? 'Head home');
    const ship = !more && travel?.by === 'ship';
    this.exitProp = this.objects.addProp({ art, x: pos.x, y: pos.y + (ship ? 34 : 24), interact: { label, fn: () => this.useExit() } });
    this.exitProp.pulse();
    if (ship) {
      this.fx.burst('smoke', pos.x, pos.y + 20, 10);
      this.sfx('door-open');
    } else {
      this.fx.burst('portal', pos.x, pos.y);
      this.sfx('portal');
    }
  }

  private useExit(): void {
    const act = this.run.act;
    const next = this.run.stage + 1;
    if (next < act.finale.length) {
      this.transitionTo(() => this.enterStage(next));
      return;
    }
    if (act.travel && this.exitProp) this.travelOut(act.travel, this.exitProp, () => this.finishAct(true));
    else this.finishAct();
  }

  /**
   * Ends the act: travel out (unless Morty already did, through the exit), the outro recap, then
   * the next act.
   */
  private finishAct(traveled = false): void {
    if (this.finishingAct || this.ended) return;
    const act = this.run.act;
    if (!traveled && act.travel && !this.run.isLastAct) {
      this.travelOut(act.travel, null, () => this.finishAct(true));
      return;
    }
    this.finishingAct = true;
    const run = this.run;
    this.mechanics.forEach((m) => m.inst.onActEnd?.());
    run.statuses.actEnded();
    this.invalidateStats();
    this.player.setControlLocked(false);
    this.playCutscenes(act.outro ?? [], () => {
      this.finishingAct = false;
      this.clearTravelFx();
      if (run.isLastAct) this.finishRun(true);
      else this.startAct(run.actIndex + 1);
    });
  }

  // ---- travel between acts -------------------------------------------------------------------

  /**
   * Morty leaves the act the way the show does it: he climbs into Rick's ship and it lifts off
   * across the sky, or he steps into a portal and it swallows the screen.
   */
  private travelOut(spec: TravelSpec, exit: PropObj | null, done: () => void): void {
    if (this.traveling) return;
    this.traveling = true;
    const p = this.player;
    p.setControlLocked(true);
    p.iframes = Math.max(p.iframes, 99);
    this.hintText = null;
    this.objectiveText = null;
    // Rick comes along if he's standing around (after freezing Frank, say).
    const rickAt = this.stage.position('rick');
    const target = exit ? { x: exit.x, y: exit.y - (spec.by === 'ship' ? 30 : 14) } : { x: p.x, y: p.y };
    const proxy = { x: p.x, y: p.y };
    const dist = Math.hypot(target.x - p.x, target.y - p.y);
    if (rickAt && exit) this.stage.play([{ kind: 'walk', who: 'rick', to: { x: target.x + 20, y: target.y } }]);
    this.tweens.add({
      targets: proxy,
      x: target.x,
      y: target.y,
      duration: Math.min(700, 120 + dist * 1.6),
      onUpdate: () => p.setPosition(proxy.x, proxy.y),
      onComplete: () => {
        if (spec.by === 'ship') this.shipTrip(exit, done);
        else this.portalTrip(spec.by, target, done);
      },
    });
  }

  /** Into the portal: Morty spins down into it, then it swells to fill the screen. */
  private portalTrip(kind: TravelKind, at: Vec, done: () => void): void {
    const p = this.player;
    this.sfx('portal');
    this.tweens.add({ targets: p.sprite, scale: 0.1, angle: 540, alpha: 0.2, duration: 380, ease: 'Quad.easeIn' });
    const cam = this.cameras.main;
    const swirl = this.add.image(at.x, at.y, kind === 'departure' ? 'exit-departure' : 'exit-portal').setDepth(8000).setScale(0.8);
    this.travelFx.push(swirl);
    this.fx.burst('portal', at.x, at.y, 24);
    this.tweens.add({
      targets: swirl,
      scale: Math.max(cam.width, cam.height) / 40,
      angle: 200,
      duration: 700,
      delay: 260,
      ease: 'Quad.easeIn',
      onComplete: () => {
        cam.fadeOut(160, kind === 'departure' ? 60 : 30, kind === 'departure' ? 120 : 90, kind === 'departure' ? 160 : 30);
        this.time.delayedCall(200, done);
      },
    });
  }

  /** Into Rick's ship: it lifts off, and a short sky shot shows it crossing to wherever's next. */
  private shipTrip(exit: PropObj | null, done: () => void): void {
    const p = this.player;
    const cam = this.cameras.main;
    this.tweens.add({ targets: p.sprite, alpha: 0, scale: 0.6, duration: 200 });
    this.sfx('dash');
    if (exit) this.tweens.add({ targets: exit.img, y: exit.img.y - 120, scale: 1.15, duration: 700, ease: 'Quad.easeIn' });
    this.fx.burst('smoke', exit?.x ?? p.x, (exit?.y ?? p.y) + 10, 14);
    this.time.delayedCall(exit ? 650 : 150, () => {
      // The sky: a strip of night with stars, clouds, and the ship zooming across.
      const W = cam.width;
      const H = cam.height;
      const sky = this.add.graphics().setScrollFactor(0).setDepth(9000);
      sky.fillGradientStyle(0x0b1030, 0x0b1030, 0x2a2a5c, 0x2a2a5c, 1);
      sky.fillRect(0, 0, W, H);
      for (let i = 0; i < 60; i++) {
        sky.fillStyle(0xffffff, 0.3 + ((i * 37) % 10) / 14);
        sky.fillCircle((i * 211) % W, (i * 97) % (H * 0.7), 1 + (i % 3));
      }
      sky.fillStyle(0x3a3f6e, 1);
      for (let i = 0; i < 7; i++) sky.fillEllipse(i * (W / 6), H - 30 + (i % 2) * 14, W / 4, 90);
      const ship = this.add.image(-120, H * 0.5, 'flying-car-sky').setScrollFactor(0).setDepth(9001).setScale(1.4);
      this.travelFx.push(sky, ship);
      sky.setAlpha(0);
      this.tweens.add({ targets: sky, alpha: 1, duration: 200 });
      this.tweens.add({ targets: ship, x: W + 160, duration: 1500, ease: 'Sine.easeInOut' });
      this.tweens.add({ targets: ship, y: H * 0.42, duration: 375, yoyo: true, repeat: 1, ease: 'Sine.easeInOut' });
      this.time.delayedCall(1450, () => {
        cam.fadeOut(160, 11, 16, 48);
        this.time.delayedCall(200, done);
      });
    });
  }

  private clearTravelFx(): void {
    this.travelFx.forEach((o) => o.destroy());
    this.travelFx = [];
    this.traveling = false;
    const cam = this.cameras.main;
    cam.resetFX();
    cam.setAlpha(1);
    const s = this.player.sprite;
    s.setScale(1).setAngle(0).setAlpha(1);
    this.player.iframes = 0;
  }

  /** Arriving the way the story says: out of a portal, or the ship setting down. */
  private arrive(kind: TravelKind): void {
    const p = this.player;
    const s = p.sprite;
    if (kind === 'ship') {
      const spot = { x: p.x + TILE * 1.6, y: p.y - 10 };
      const ship = this.objects.addProp({ art: 'flying-car', x: spot.x, y: spot.y - 260, depth: spot.y });
      this.tweens.add({ targets: ship.img, y: spot.y, duration: 700, ease: 'Bounce.easeOut', onComplete: () => this.fx.burst('smoke', spot.x, spot.y, 10) });
      return;
    }
    const swirl = this.add.image(p.x, p.y - 20, kind === 'departure' ? 'exit-departure' : 'exit-portal').setDepth(s.depth - 1).setScale(0.1);
    this.sfx('portal');
    this.fx.burst('portal', p.x, p.y - 20, 18);
    s.setScale(0.2);
    this.tweens.add({ targets: swirl, scale: 0.9, duration: 220, ease: 'Back.easeOut' });
    this.tweens.add({ targets: s, scale: 1, duration: 320, delay: 120, ease: 'Back.easeOut' });
    this.tweens.add({ targets: swirl, scale: 0, alpha: 0, delay: 700, duration: 260, onComplete: () => swirl.destroy() });
  }

  finishRun(victory: boolean, quit = false): void {
    if (this.ended) return;
    this.ended = true;
    const s = svc();
    const save = s.save;
    const run = this.run;
    const ep = run.episode;
    const rec = (save.episodes[ep.id] ??= { attempts: 0, clears: 0, bestTimeMs: null });
    const banked = victory ? run.scrap : Math.floor(run.scrap * ECONOMY.bankOnDeath);
    save.bankedScrap += banked;
    save.lifetime.runs++;
    if (!victory) save.lifetime.deaths++;
    save.lifetime.kills += run.stats.kills;
    save.lifetime.scrapEarned += run.stats.scrapEarned;
    const newUnlocks: string[] = [];
    if (victory) {
      rec.clears++;
      const ms = Math.round(run.time * 1000);
      if (rec.bestTimeMs === null || ms < rec.bestTimeMs) rec.bestTimeMs = ms;
      for (const id of ep.unlocksOnClear) {
        if (!save.unlocked.includes(id)) {
          save.unlocked.push(id);
          newUnlocks.push(id);
        }
      }
    }
    persist();
    const next = nextUp(this.reg.listings, (id) => (save.episodes[id]?.clears ?? 0) > 0);
    const summary: RunSummary = {
      victory,
      episodeId: ep.id,
      episodeTitle: ep.title,
      seed: run.seed,
      seconds: run.time,
      kills: run.stats.kills,
      rooms: run.stats.roomsCleared,
      items: run.stats.itemsFound.filter((id) => this.reg.items.get(id)?.rarity !== 'story').map((id) => this.reg.items.get(id)?.name ?? id),
      scrapBanked: banked,
      cause: quit ? 'Quit to the Garage' : run.lastDamageSource || 'Unknown',
      newUnlocks: newUnlocks.map((id) => this.reg.items.get(id)?.name ?? id),
      nextEpisode: next ? { title: next.title, playable: !!next.def } : null,
      quit,
    };
    svc().audio.music(null);
    this.scene.stop('Hud');
    this.scene.stop('Cutscene');
    this.scene.start('GameOver', summary);
  }

  playCutscenes(ids: ContentId[], done?: () => void): void {
    const list = ids.filter((id) => this.reg.cutscenes.has(id));
    if (!list.length) {
      done?.();
      return;
    }
    const save = svc().save;
    for (const id of list) if (!save.seenCutscenes.includes(id)) save.seenCutscenes.push(id);
    this.scene.pause();
    this.scene.launch('Cutscene', {
      ids: list,
      onDone: () => {
        this.scene.resume();
        this.input.keyboard?.resetKeys();
        done?.();
      },
    });
  }

  // ---- player ----------------------------------------------------------------------------------

  private checkTiles(): void {
    if (!this.roomView || this.player.falling > 0) return;
    const tile = this.roomView.tileAt(this.player.x, this.player.y);
    if (tile === 'cliff') {
      const allowed = this.mechanics.some((m) => m.inst.allowsTile?.('cliff') === true);
      if (!allowed) this.playerFalls();
    } else if (tile === 'floor' || tile === 'slow') {
      this.lastSafe = { x: this.player.x, y: this.player.y };
    }
  }

  private playerFalls(): void {
    const p = this.player;
    this.sfx('fall');
    this.fx.burst('smoke', p.x, p.y, 6);
    this.mechanics.forEach((m) => m.inst.onPlayerEvent?.({ type: 'fall', x: p.x, y: p.y }));
    p.startFall(() => {
      p.setPosition(this.lastSafe.x, this.lastSafe.y);
      p.iframes = Math.max(p.iframes, 0.8);
      const handled = this.mechanics.some((m) => m.inst.onFall?.() === true);
      if (!handled) this.damagePlayer(PLAYER.fallDamage, 'a long fall', { ignoreInvulnerability: true });
    });
  }

  /** Morty can only fire once the story has handed him something to fight with. */
  armed(): boolean {
    return !!this.run.inventory.weapon;
  }

  onFire(angle: number): void {
    const id = this.run.inventory.weapon;
    const w = id ? this.reg.items.get(id)?.weapon : undefined;
    if (!w) return;
    const st = this.stats();
    const n = Math.max(1, Math.round(st.projectiles));
    const spread = st.spread + (n > 1 ? 0.14 * (n - 1) : 0);
    const p = this.player;
    const thrown = w.style === 'thrown';
    const looks = typeof w.shot === 'string' ? [w.shot] : (w.shot ?? ['shot-player']);
    // Crits and freeze bolts come around on a steady count, never by luck.
    this.critAcc += st.critRate;
    const crit = this.critAcc >= 1;
    if (crit) this.critAcc -= 1;
    this.freezeAcc += st.freezeRate;
    const freezes = this.freezeAcc >= 1;
    if (freezes) this.freezeAcc -= 1;
    const charged = st.chargeShot > 0 && this.run.time - this.lastFireAt >= st.chargeShot;
    this.lastFireAt = this.run.time;
    this.chargeAnnounced = false;
    const glow = freezes ? 0xbfeaff : crit ? 0xffd54a : charged ? 0xfff2a8 : (this.look.glow ?? w.color);
    for (let i = 0; i < n; i++) {
      const a = n > 1 ? angle - spread / 2 + (spread * i) / (n - 1) : angle;
      this.playerShots.spawn({
        x: p.x + Math.cos(a) * 18,
        y: p.y + Math.sin(a) * 18 - 6,
        angle: a,
        speed: st.shotSpeed,
        damage: st.damage * (crit ? SHOTS.critMult : 1) * (charged ? SHOTS.chargeMult : 1),
        radius: st.shotSize * (charged ? SHOTS.chargeSize : 1) * (crit ? 1.25 : 1),
        life: st.range / st.shotSpeed,
        bounces: Math.round(st.bounces),
        // Junk cycles through its pile in order, so the look never touches the gameplay RNG.
        texture: freezes ? 'shot-ice' : looks[this.shotsFired++ % looks.length],
        tint: freezes || thrown ? undefined : crit ? 0xffd54a : w.color,
        glow,
        spin: freezes ? 0 : w.spin,
        source: 'shot',
        pierce: Math.round(st.pierce) + (charged ? SHOTS.chargePierce : 0),
        homing: st.homing,
        split: Math.round(st.split),
        blast: st.blast,
        chain: Math.round(st.chain),
        ricochet: Math.round(st.ricochet),
        crit,
        freezes,
        charged,
      });
    }
    this.sfx(charged ? 'charge-shot' : (w.sfx ?? (w.damageMult > 1.2 ? 'shoot-heavy' : 'shoot')));
    if (charged) {
      this.fx.pop(p.x + Math.cos(angle) * 26, p.y + Math.sin(angle) * 26 - 6, 'fx-star', 0xfff2a8, 1, 3.2, 200, angle);
      this.kickCamera(angle + Math.PI, 5);
    } else if (thrown) {
      // A throw: a little whoosh off his hand and a lighter kick than a gun.
      this.fx.pop(p.x + Math.cos(angle) * 22, p.y + Math.sin(angle) * 22 - 6, 'fx-puff', 0xffffff, 0.3, 1, 130);
      this.kickCamera(angle + Math.PI, 1.2);
    } else {
      this.fx.pop(p.x + Math.cos(angle) * 24, p.y + Math.sin(angle) * 24 - 6, 'fx-star', w.color, 0.5, 1.5, 90, angle);
      this.kickCamera(angle + Math.PI, 2.2);
    }
    runHook(this.sources(), 'onFire', this.ctx, { angle, x: p.x, y: p.y });
    this.mechanics.forEach((m) => m.inst.onPlayerEvent?.({ type: 'fire', angle }));
  }

  onDash(): void {
    this.sfx('dash');
    runHook(this.sources(), 'onDash', this.ctx);
    this.mechanics.forEach((m) => m.inst.onPlayerEvent?.({ type: 'dash' }));
  }

  damagePlayer(halves: number, source: string, opts?: { ignoreInvulnerability?: boolean }): void {
    if (this.dead || this.ended || halves <= 0 || this.godModeOn || this.stage.running) return;
    const p = this.player;
    if (!opts?.ignoreInvulnerability && p.isInvulnerable) {
      if (p.inPerfectWindow) this.perfectDodge();
      return;
    }
    const run = this.run;
    const dodge = this.stats().dodgeChance;
    if (!opts?.ignoreInvulnerability && dodge > 0 && run.play.chance(dodge)) {
      // Slipped right past it.
      p.iframes = Math.max(p.iframes, 0.5);
      this.fx.floatText(p.x, p.y - 64, 'MISSED!', '#ffd54a', 18);
      this.fx.pop(p.x, p.y - 20, 'fx-star', 0xffd54a, 0.8, 2.4, 260);
      this.sfx('whiff');
      return;
    }
    run.hp -= halves;
    run.lastDamageSource = source;
    run.stats.damageTaken += halves;
    p.iframes = PLAYER.hurtIframes;
    this.sfx('hurt');
    this.fx.shake(9, 180);
    this.fx.flash(0xff3040, 90);
    this.fx.hitStop(55);
    this.fx.burst('hit', p.x, p.y - 10, 8);
    runHook(this.sources(), 'onDamageTaken', this.ctx, halves, source);
    this.rickSays('hurt', 0.4);
    this.mechanics.forEach((m) => m.inst.onPlayerEvent?.({ type: 'hurt', halves, source }));
    if (run.hp <= 0) {
      run.hp = 0;
      this.onDeath();
    }
  }

  healPlayer(halves: number): void {
    if (this.run.hp >= this.maxHp()) return;
    this.run.hp = Math.min(this.maxHpValue, this.run.hp + halves);
    this.sfx('heal');
    this.fx.burst('heal', this.player.x, this.player.y - 20);
  }

  private onDeath(): void {
    this.dead = true;
    this.player.setControlLocked(true);
    this.sfx('death');
    svc().audio.music(null);
    (this.player.sprite.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    this.tweens.add({
      targets: this.player.sprite,
      angle: 720,
      scale: 0.2,
      alpha: 0,
      duration: 1100,
      ease: 'Cubic.easeIn',
      onComplete: () => this.finishRun(false),
    });
  }

  // ---- combat ----------------------------------------------------------------------------------

  spawnEnemy(id: ContentId, x: number, y: number, opts: SpawnOpts = {}): Enemy | null {
    if (this.hostileCount() >= MAX_ENEMIES || !this.roomView) return null;
    const def = this.reg.enemies.get(id);
    if (!def) return null;
    if (opts.elite && def.elite && !opts.mod) {
      // Every elite gets a visible twist. Enemies that already split on death don't split twice.
      const allowed: EliteMod[] = def.elite.mods ?? (def.onDeath ? ['shielded', 'hasty', 'explosive'] : ['shielded', 'hasty', 'splitting', 'explosive']);
      opts = { ...opts, mod: this.run.play.pick(allowed) };
    }
    const e = new Enemy(this, this, def, x, y, opts);
    this.enemies.push(e);
    this.enemyGroup.add(e);
    return e;
  }

  setHostile(e: Enemy): void {
    if (!e.alive || !e.passive) return;
    e.passive = false;
    e.spawnLeft = 0.3;
  }

  private despawnEnemy(e: Enemy): void {
    this.fx.burst('smoke', e.x, e.y, 6);
    this.enemies = this.enemies.filter((o) => o !== e);
    e.remove();
  }

  private clearEnemiesSilently(): void {
    for (const e of this.enemies) {
      if (!e.alive) continue;
      this.fx.burst('death', e.x, e.y, 6);
      e.remove();
    }
    this.enemies = [];
  }

  enemyShot(spec: EnemyShotSpec & { x: number; y: number }, sourceName: string): void {
    const n = spec.count ?? 1;
    const spread = spec.spread ?? 0;
    const kind = spec.kind ?? 'orb';
    for (let i = 0; i < n; i++) {
      const a = n > 1 ? spec.angle - spread / 2 + (spread * i) / (n - 1) : spec.angle;
      this.enemyShots.spawn({
        x: spec.x,
        y: spec.y,
        angle: a,
        speed: spec.speed,
        damage: spec.damage ?? 1,
        radius: spec.radius ?? 9,
        life: spec.life ?? 3.5,
        bounces: spec.bounces ?? 0,
        texture: `shot-${kind}`,
        tint: spec.color,
        spin: SPIN[kind] ?? 0,
        tag: sourceName,
        applies: spec.applies,
      });
    }
  }

  private spawnPlayerShot(spec: PlayerShotSpec): void {
    const ice = spec.source === 'shard';
    const custom = spec.texture !== undefined && this.textures.exists(spec.texture);
    this.playerShots.spawn({
      x: spec.x,
      y: spec.y,
      angle: spec.angle,
      speed: spec.speed ?? 520,
      damage: spec.damage,
      radius: spec.radius ?? 7,
      life: spec.life ?? 0.7,
      texture: custom ? spec.texture! : ice ? 'shot-ice' : 'shot-player',
      // Content sprites keep their own colors; energy bolts take the tint.
      tint: ice || custom ? undefined : (spec.color ?? 0x97ce4c),
      glow: spec.color,
      spin: spec.spin,
      upright: spec.upright,
      source: spec.source ?? 'shot',
      tag: spec.tag,
      pierce: spec.pierce,
      homing: spec.homing,
    });
  }

  private checkPlayerShots(): void {
    this.playerShots.forEachActive((p) => {
      for (const e of this.enemies) {
        if (!p.active) return;
        if (!this.isTarget(e) || e.spawnLeft > 0 || p.hits.has(e.uid)) continue;
        if (Math.hypot(p.x - e.x, p.y - e.y) > p.radius + e.radius) continue;
        if (e.def.shieldArc && !e.frozen && !p.charged) {
          const from = Math.atan2(p.y - e.y, p.x - e.x);
          const facing = (e.memory.facing as number | undefined) ?? Math.atan2(this.player.y - e.y, this.player.x - e.x);
          const diff = Math.abs(Math.atan2(Math.sin(from - facing), Math.cos(from - facing)));
          if (diff < ((e.def.shieldArc / 2) * Math.PI) / 180) {
            this.fx.burst('spark', p.x, p.y, 5);
            this.sfx('bounce');
            p.kill();
            return;
          }
        }
        this.shotHits(p, e);
      }
    });
  }

  /** A player shot connects: the damage, then whatever the shot does on impact. */
  private shotHits(p: Projectile, e: Enemy): void {
    p.hits.add(e.uid);
    const angle = Math.atan2(p.vy, p.vx);
    this.hitEnemy(e, p.damage, { source: p.source, tag: p.tag, bounced: p.bounced, angle, crit: p.crit });
    this.fx.burst('spark', p.x, p.y, 5);
    this.fx.ring(p.x, p.y, 0xfff2a8, 16, 150);
    if (p.crit) {
      this.fx.floatText(e.x, e.y - e.displayHeight * e.originY - 8, 'CRIT!', '#ffd54a', 22);
      this.fx.ring(p.x, p.y, 0xffd54a, 44, 240, 4);
      this.sfx('crit');
    }
    if (p.freezes && e.alive && !e.frozen) {
      e.freeze(SHOTS.freezeSeconds);
      this.fx.burst('ice', e.x, e.y, 8);
    }
    if (p.blast > 0) this.shotBlast(p.x, p.y, p.blast, p.damage * SHOTS.blastDamage, e);
    if (p.chain > 0) this.chainLightning(e, p.damage * SHOTS.chainDamage, p.chain);
    if (p.split > 0) this.splitShot(p, e, angle);
    if (p.pierce > 0) {
      p.pierce--;
      return;
    }
    if (p.ricochet > 0) {
      const next = this.nearestTarget({ x: p.x, y: p.y }, SHOTS.ricochetRange, true, p.hits);
      if (next) {
        // Bounces off this one toward the next.
        p.ricochet--;
        p.bounced = true;
        const speed = Math.hypot(p.vx, p.vy);
        const a = Math.atan2(next.y - p.y, next.x - p.x);
        p.vx = Math.cos(a) * speed;
        p.vy = Math.sin(a) * speed;
        p.life = Math.max(p.life, SHOTS.ricochetRange / speed + 0.1);
        this.sfx('bounce');
        return;
      }
    }
    p.kill();
  }

  /** Mini shots fanning out of a shot that just hit. */
  private splitShot(p: Projectile, e: Enemy, angle: number): void {
    const n = p.split;
    p.split = 0;
    const speed = Math.hypot(p.vx, p.vy) * 0.9;
    const base = p.launched;
    for (let i = 0; i < n; i++) {
      const a = angle + (n > 1 ? (i / (n - 1) - 0.5) * SHOTS.splitFan : 0);
      this.playerShots.spawn({
        x: p.x,
        y: p.y,
        angle: a,
        speed,
        damage: p.damage * SHOTS.splitDamage,
        radius: Math.max(4, p.radius * 0.55),
        life: SHOTS.splitLife,
        texture: base.texture,
        tint: base.tint,
        glow: base.glow,
        spin: base.spin,
        source: 'shot',
        tag: 'split',
        homing: p.homing,
        ignore: e.uid,
      });
    }
  }

  /** A shot's small impact explosion, splashing everything near it but the one it hit. */
  private shotBlast(x: number, y: number, radius: number, damage: number, except: Enemy): void {
    this.fx.burst('fire', x, y, 8);
    this.fx.ring(x, y, 0xffa94d, radius, 220, 4);
    this.sfx('pop');
    for (const o of [...this.enemies]) {
      if (o === except || !this.isTarget(o)) continue;
      if (Math.hypot(o.x - x, o.y - y) > radius + o.radius) continue;
      this.hitEnemy(o, damage, { source: 'explosion', tag: 'blast', angle: Math.atan2(o.y - y, o.x - x) });
    }
  }

  /** Lightning jumping from a hit enemy to the next nearest ones. */
  private chainLightning(from: Enemy, damage: number, jumps: number): void {
    const done = new Set<number>([from.uid]);
    let cur: Vec = { x: from.x, y: from.y - 10 };
    for (let i = 0; i < jumps; i++) {
      const next = this.nearestTarget(cur, SHOTS.chainRange, false, done);
      if (!next) break;
      done.add(next.uid);
      const to = { x: next.x, y: next.y - 10 };
      this.fx.zap(cur, to, SHOTS.chainColor);
      this.hitEnemy(next, damage, { source: 'zap', angle: Math.atan2(to.y - cur.y, to.x - cur.x) });
      cur = to;
    }
    if (done.size > 1) this.sfx('zap');
  }

  /** The nearest enemy Morty could fight within `range` of a point. */
  private nearestTarget(from: Vec, range: number, los: boolean, skip?: ReadonlySet<number>): Enemy | null {
    let best: Enemy | null = null;
    let bestD = range;
    for (const e of this.enemies) {
      if (!this.isTarget(e) || e.spawnLeft > 0 || skip?.has(e.uid)) continue;
      const d = Math.hypot(e.x - from.x, e.y - from.y);
      if (d >= bestD) continue;
      if (los && this.roomView && !this.roomView.lineOfSight(from.x, from.y, e.x, e.y)) continue;
      best = e;
      bestD = d;
    }
    return best;
  }

  /** What a homing shot turns toward: the nearest enemy ahead of it. */
  private homingTarget(p: Projectile): Vec | null {
    const heading = Math.atan2(p.vy, p.vx);
    let best: Enemy | null = null;
    let bestD = SHOTS.homingRange;
    for (const e of this.enemies) {
      if (!this.isTarget(e) || e.spawnLeft > 0 || p.hits.has(e.uid)) continue;
      const d = Math.hypot(e.x - p.x, e.y - p.y);
      if (d >= bestD) continue;
      const a = Math.atan2(e.y - p.y, e.x - p.x);
      if (Math.abs(Math.atan2(Math.sin(a - heading), Math.cos(a - heading))) > SHOTS.homingCone) continue;
      best = e;
      bestD = d;
    }
    return best ? { x: best.x, y: best.y } : null;
  }

  /** Removes enemy bullets within `radius` of a point; returns how many. */
  private eatEnemyShots(at: Vec, radius: number): number {
    let n = 0;
    this.enemyShots.forEachActive((p) => {
      if (Math.hypot(p.x - at.x, p.y - at.y) > radius + p.radius) return;
      p.kill();
      n++;
    });
    return n;
  }

  private checkEnemyShots(): void {
    const pl = this.player;
    this.enemyShots.forEachActive((p) => {
      if (Math.hypot(p.x - pl.x, p.y - pl.y) > p.radius + pl.radius * 0.75) return;
      if (pl.isInvulnerable) {
        if (pl.inPerfectWindow) this.perfectDodge();
        return;
      }
      this.damagePlayer(p.damage, p.tag ?? 'a stray shot');
      if (p.applies) this.applyStatus(p.applies);
      p.kill();
    });
  }

  private checkContacts(): void {
    const p = this.player;
    for (const e of this.enemies) {
      if (!this.isTarget(e) || e.spawnLeft > 0 || e.frozen || e.def.contactDamage <= 0) continue;
      if (Math.hypot(e.x - p.x, e.y - p.y) < e.radius + p.radius * 0.8) {
        if (p.isInvulnerable) {
          if (p.inPerfectWindow) this.perfectDodge();
          continue;
        }
        this.damagePlayer(e.def.contactDamage, e.def.name);
        p.knockback(Math.atan2(p.y - e.y, p.x - e.x), 320);
      }
    }
    if (p.isDashing) {
      for (const e of this.enemies) {
        if (!this.isTarget(e) || p.dashHits.has(e.uid)) continue;
        if (Math.hypot(e.x - p.x, e.y - p.y) < e.radius + p.radius + 4) {
          p.dashHits.add(e.uid);
          runHook(this.sources(), 'onDashContact', this.ctx, e);
        }
      }
    }
  }

  private separateEnemies(): void {
    const list = this.enemies;
    for (let i = 0; i < list.length; i++) {
      const a = list[i];
      if (!a.alive || a.boss || a.def.flying || a.def.hazard) continue;
      for (let j = i + 1; j < list.length; j++) {
        const b = list[j];
        if (!b.alive || b.boss || b.def.flying || b.def.hazard) continue;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const d = Math.hypot(dx, dy) || 0.01;
        const overlap = a.radius + b.radius - d;
        if (overlap <= 0) continue;
        const push = overlap * 5;
        a.knockVx -= (dx / d) * push;
        a.knockVy -= (dy / d) * push;
        b.knockVx += (dx / d) * push;
        b.knockVy += (dy / d) * push;
      }
    }
  }

  hitEnemy(e: Enemy, damage: number, opts: { source: HitSource; tag?: string; bounced?: boolean; angle?: number; crit?: boolean }): void {
    if (!e.alive || e.invulnerable || e.passive || damage <= 0) return;
    if (e.shieldHits > 0) {
      if (opts.source === 'explosion' || opts.source === 'rick') {
        e.breakShield();
      } else if (opts.source !== 'poison') {
        // The bubble soaks the hit.
        const popped = e.absorbHit();
        this.fx.burst('spark', e.x, e.y - 10, popped ? 12 : 4);
        if (popped) this.fx.ring(e.x, e.y - 10, 0x7fdcff, e.radius * 2.6, 260, 4);
        this.sfx(popped ? 'shield-pop' : 'bounce');
        return;
      }
    }
    const wasFrozen = e.frozen;
    let dmg = damage;
    if (e.staggerLeft > 0 && opts.source !== 'poison') dmg *= ENEMIES.staggerMult;
    let shatter = false;
    if (wasFrozen && opts.source !== 'poison') {
      if (e.boss) {
        dmg *= ENEMIES.bossShatterMult;
        e.unfreeze();
        this.fx.burst('ice', e.x, e.y, 10);
        this.sfx('shatter');
      } else {
        shatter = true;
        dmg = Math.max(dmg, e.hp);
      }
    }
    e.hp -= dmg;
    e.flashHit();
    if (opts.angle !== undefined) e.knock(opts.angle, this.stats().knockback);
    if (opts.source !== 'rick' && opts.source !== 'hazard') this.addRickMeter(dmg);
    const killed = e.hp <= 0;
    const info: HitInfo = { source: opts.source, damage: dmg, tag: opts.tag, wasFrozen, killed, bounced: opts.bounced, crit: opts.crit };
    runHook(this.sources(), 'onHit', this.ctx, e, info);
    if (!killed && e.alive && opts.source === 'shot') {
      const st = this.stats();
      const rng = this.run.play;
      if (st.freezeChance > 0 && rng.chance(st.freezeChance)) e.freeze(2.5);
      if (st.poisonChance > 0 && rng.chance(st.poisonChance)) e.poison(3, 3);
      if (st.slowChance > 0 && rng.chance(st.slowChance)) e.slow(0.6, 2);
    }
    if (this.settings().damageNumbers && opts.source !== 'poison') {
      this.fx.floatText(e.x + this.run.play.float(-10, 10), e.y - e.displayHeight * e.originY, String(Math.round(dmg)), dmg >= 8 ? '#ffd166' : '#ffffff', dmg >= 8 ? 18 : 14);
    }
    if (dmg >= 8) this.fx.shake(Math.min(12, 2 + dmg * 0.45), 90);
    if (killed && e.alive) {
      if (e === this.bossEnemy && e.def.boss?.dazed) this.dazeBoss(e);
      else this.killEnemy(e, info, shatter);
    } else if (!killed) this.sfx(dmg >= 8 ? 'hit-heavy' : 'hit');
  }

  private killEnemy(e: Enemy, info: HitInfo, shatter: boolean): void {
    const x = e.x;
    const y = e.y;
    e.alive = false;
    if (shatter) {
      this.fx.burst('ice', x, y);
      this.sfx('shatter');
      this.fx.floatText(x, y - 30, 'SHATTER!', '#bfeaff', 18);
      // Frozen neighbours go too, one after another.
      const near = this.enemies
        .filter((o) => o !== e && o.alive && o.frozen && !o.boss && Math.hypot(o.x - x, o.y - y) < ENEMIES.shatterChainRadius)
        .sort((a, b) => Math.hypot(a.x - x, a.y - y) - Math.hypot(b.x - x, b.y - y));
      near.forEach((o, i) => this.after(0.08 * (i + 1), () => o.alive && o.frozen && this.hitEnemy(o, 1, { source: 'shard' }), true));
    } else {
      this.fx.burst((e.def.deathFx as BurstStyle | undefined) ?? 'death', x, y);
      this.sfx('enemy-die');
    }
    this.fx.ring(x, y, 0xffffff, e.radius * 2.4, 220, 4);
    this.fx.hitStop(e.boss ? 140 : 40);
    const run = this.run;
    run.stats.kills++;
    if (!e.boss) {
      const n = e.elite ? run.play.int(ENEMIES.eliteScrap[0], ENEMIES.eliteScrap[1]) : run.play.chance(e.def.scrapChance ?? ENEMIES.scrapChance) ? 1 : 0;
      for (let i = 0; i < n; i++) this.spawnPickupAt('scrap', x, y, true);
    }
    runHook(this.sources(), 'onKill', this.ctx, e, info);
    e.def.onDeath?.(e.api);
    if (e.mod === 'splitting' && !e.splitChild) {
      for (const side of [-1, 1]) {
        this.spawnEnemy(e.def.id, x + side * e.radius * 0.8, y, { splitChild: true, hpScale: (ENEMIES.elite.splitHpShare * e.maxHp) / e.def.hp, delay: 0.25 });
      }
    }
    if (e.mod === 'explosive') this.eliteExplosion(x, y);
    this.enemies = this.enemies.filter((o) => o !== e);
    const wasBoss = e === this.bossEnemy;
    e.remove();
    if (wasBoss) this.onBossKilled(e, { x, y });
  }

  private explode(spec: ExplosionSpec): void {
    if (spec.small) {
      this.fx.burst('slime', spec.x, spec.y, 10);
      this.fx.ring(spec.x, spec.y, spec.color ?? 0xffa94d, spec.radius, 260, 5);
      this.sfx('pop');
      this.fx.shake(4, 120);
    } else {
      this.fx.burst('fire', spec.x, spec.y);
      this.fx.burst('smoke', spec.x, spec.y);
      this.sfx('explosion');
      this.fx.shake(14, 320);
      this.fx.flash(spec.color ?? 0xffa94d, 120);
    }
    const ring = this.add.circle(spec.x, spec.y, spec.radius, spec.color ?? 0xffa94d, 0.25).setDepth(4400).setStrokeStyle(6, 0xfff1c9, 0.9);
    ring.setScale(0.2);
    this.tweens.add({ targets: ring, scale: 1, alpha: 0, duration: 380, onComplete: () => ring.destroy() });
    for (const e of [...this.enemies]) {
      if (!this.isTarget(e)) continue;
      const d = Math.hypot(e.x - spec.x, e.y - spec.y);
      if (d > spec.radius + e.radius) continue;
      this.hitEnemy(e, spec.damage, { source: 'explosion', tag: spec.tag, angle: Math.atan2(e.y - spec.y, e.x - spec.x) });
    }
    const p = this.player;
    if (spec.playerDamage && Math.hypot(p.x - spec.x, p.y - spec.y) < spec.radius + p.radius) {
      this.damagePlayer(spec.playerDamage, 'his own bomb', { ignoreInvulnerability: true });
    }
  }

  private addRickMeter(amount: number): void {
    const run = this.run;
    const before = run.rickMeter;
    run.rickMeter = Math.min(RICK_METER.max, before + amount * this.stats().rickMeterGain);
    if (before < RICK_METER.max && run.rickMeter >= RICK_METER.max && !this.meterAnnounced) {
      this.meterAnnounced = true;
      this.hud.toast('Rick Meter full! Press Q', { color: 0x97ce4c });
      this.sfx('portal');
    }
  }

  /** An explosive elite's parting gift: a telegraphed blast where it died. */
  private eliteExplosion(x: number, y: number): void {
    const r = ENEMIES.elite.explosionRadius;
    const tele = this.telegraphs.add({ kind: 'circle', x, y, radius: r }, () => true);
    const counter = { t: 0 };
    this.tweens.add({ targets: counter, t: 1, duration: ENEMIES.elite.explosionDelay * 1000, onUpdate: () => tele.setProgress(counter.t) });
    this.sfx('telegraph-big');
    this.after(
      ENEMIES.elite.explosionDelay,
      () => {
        tele.destroy();
        this.fx.burst('fire', x, y, 16);
        this.fx.ring(x, y, 0xff8a3d, r, 260, 6);
        this.sfx('explosion');
        this.fx.shake(8, 200);
        const p = this.player;
        if (Math.hypot(p.x - x, p.y - y) < r + p.radius) this.damagePlayer(1, 'an exploding elite');
      },
      true,
    );
  }

  /** Stops the world (not tweens or bubbles) while Rick makes his entrance. */
  private holdWorld(on: boolean): void {
    this.worldHold = on;
    if (on) {
      this.physics.world.pause();
      (this.player.sprite.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    } else if (!this.fx.stopped) {
      this.physics.world.resume();
    }
  }

  /** Rick's beam sweeps across the room, hitting each enemy as it passes. */
  private sweepBeam(from: Vec, gadget: GadgetDef, targets: Enemy[], done: () => void): void {
    const live = targets.filter((e) => e.alive);
    if (!live.length) {
      done();
      return;
    }
    const cx = live.reduce((a, e) => a + e.x, 0) / live.length;
    const cy = live.reduce((a, e) => a + e.y, 0) / live.length;
    const base = Math.atan2(cy - from.y, cx - from.x);
    const rel = (e: Enemy) => Phaser.Math.Angle.Wrap(Math.atan2(e.y - from.y, e.x - from.x) - base);
    const rels = live.map(rel);
    const a0 = Math.min(...rels) - 0.3;
    const a1 = Math.max(...rels) + 0.3;
    const hit = new Set<Enemy>();
    const color = gadget.color ?? 0xbfeaff;
    const g = this.add.graphics().setDepth(5000);
    const counter = { t: 0 };
    const len = 1700;
    this.tweens.add({
      targets: counter,
      t: 1,
      duration: 560,
      ease: 'Sine.easeInOut',
      onUpdate: () => {
        const cur = a0 + (a1 - a0) * counter.t;
        const a = base + cur;
        const ex = from.x + Math.cos(a) * len;
        const ey = from.y + Math.sin(a) * len;
        g.clear();
        g.lineStyle(22, color, 0.22);
        g.lineBetween(from.x, from.y, ex, ey);
        g.lineStyle(8, color, 0.95);
        g.lineBetween(from.x, from.y, ex, ey);
        g.lineStyle(3, 0xffffff, 1);
        g.lineBetween(from.x, from.y, ex, ey);
        for (const e of live) {
          if (hit.has(e) || !e.alive || rel(e) > cur) continue;
          hit.add(e);
          gadget.hit?.(this.ctx, e);
          this.fx.burst('ice', e.x, e.y, 6);
        }
      },
      onComplete: () => {
        for (const e of live) if (!hit.has(e) && e.alive) gadget.hit?.(this.ctx, e);
        this.tweens.add({ targets: g, alpha: 0, duration: 220, onComplete: () => g.destroy() });
        done();
      },
    });
  }

  /** Nudges the camera; it springs back over a few frames. Off with screen shake. */
  private kickCamera(angle: number, px: number): void {
    if (!this.settings().screenShake) return;
    this.camKick.x = Phaser.Math.Clamp(this.camKick.x + Math.cos(angle) * px, -6, 6);
    this.camKick.y = Phaser.Math.Clamp(this.camKick.y + Math.sin(angle) * px, -6, 6);
  }

  private applyCameraKick(realDt: number): void {
    const cam = this.cameras.main;
    const k = Math.exp(-realDt * 22);
    this.camKick.x *= k;
    this.camKick.y *= k;
    if (this.camRest) cam.setScroll(this.camRest.x + this.camKick.x, this.camRest.y + this.camKick.y);
    else cam.setFollowOffset(-this.camKick.x, -this.camKick.y);
  }

  /** Dashed through an attack at the last moment: slow-mo, a flourish and some Rick Meter. */
  private perfectDodge(): void {
    const p = this.player;
    p.perfectUsed = true;
    this.slowMo(PLAYER.perfectDodgeSlowMo.factor, PLAYER.perfectDodgeSlowMo.seconds);
    this.run.rickMeter = Math.min(RICK_METER.max, this.run.rickMeter + RICK_METER.perfectDodge);
    this.fx.pop(p.x, p.y - 20, 'fx-star', 0x9fdcff, 1, 4, 380);
    this.fx.ring(p.x, p.y - 10, 0x9fdcff, 70, 420, 4);
    this.fx.floatText(p.x, p.y - 70, 'PERFECT!', '#9fdcff', 22);
    this.sfx('perfect');
    this.run.stats.perfectDodges++;
  }

  /** Slows the whole game to `factor` speed for `seconds` of real time. */
  private slowMo(factor: number, seconds: number): void {
    this.timeFactor = factor;
    this.slowMoUntil = this.time.now + seconds * 1000;
    this.physics.world.timeScale = 1 / factor;
    this.tweens.timeScale = factor;
  }

  private updateSlowMo(now: number): void {
    if (this.timeFactor === 1 || now < this.slowMoUntil) return;
    this.timeFactor = 1;
    this.physics.world.timeScale = 1;
    this.tweens.timeScale = 1;
  }

  private makeStage(): Stage {
    return new Stage({
      scene: this,
      fx: this.fx,
      playerId: () => this.run.act.playable,
      playerPos: () => ({ x: this.player.x, y: this.player.y }),
      movePlayer: (x, y) => this.player.setPosition(x, y),
      facePlayer: (left) => {
        this.player.aimAngle = left ? Math.PI : 0;
      },
      spriteKey: (who) => this.reg.characters.get(who)?.sprite?.key ?? null,
      say: (who, text, seconds) => this.say(who, text, seconds),
      setAnchor: (who, anchor, previous) => {
        if (anchor) this.actors.set(who, anchor);
        else if (!previous || this.actors.get(who) === previous) this.actors.delete(who);
      },
      doorNear: (to) => this.doorNear(to),
      clamp: (p) => this.clampToRoom(p),
      sfx: (id) => this.sfx(id),
      giveWeapon: () => {
        const w = this.run.act.weapon;
        if (!w || this.run.inventory.weapon === w.item) return 0;
        this.giveActWeapon();
        return readTime(w.line) + 0.3;
      },
    });
  }

  /** Plays an in-engine scene; Morty can't move (or be hurt) until it's over. */
  private playScene(steps: SceneStep[], onDone?: () => void): void {
    if (this.stage.running) this.stage.skip();
    this.lockedBeforeScene = this.player.controlLocked;
    this.player.setControlLocked(true);
    this.stage.play(steps, () => {
      this.endSceneLock();
      onDone?.();
    });
  }

  private endSceneLock(): void {
    this.player.setControlLocked(this.lockedBeforeScene);
    this.lockedBeforeScene = false;
  }

  /** The door nearest a spot (where someone walking in comes from), or the bottom of the room. */
  private doorNear(to: Vec): Vec {
    const view = this.roomView;
    if (!view) return to;
    const door = [...view.doors].sort((a, b) => Math.hypot(a.x - to.x, a.y - to.y) - Math.hypot(b.x - to.x, b.y - to.y))[0];
    return door ? { x: door.x, y: door.y } : { x: view.widthPx / 2, y: view.heightPx - TILE };
  }

  private clampToRoom(p: Vec): Vec {
    const view = this.roomView;
    if (!view) return p;
    return {
      x: Phaser.Math.Clamp(p.x, TILE * 1.5, view.widthPx - TILE * 1.5),
      y: Phaser.Math.Clamp(p.y, TILE * 1.5, view.heightPx - TILE * 1.5),
    };
  }

  private callRick(): void {
    const run = this.run;
    if (this.rickBusy || !this.roomView) return;
    if (run.rickMeter < RICK_METER.max) {
      this.sfx('ui-deny');
      return;
    }
    const hostile = this.enemies.filter((e) => this.isTarget(e));
    if (!hostile.length) {
      this.hud.toast("Rick won't show up with nothing to shoot.");
      this.sfx('ui-deny');
      return;
    }
    const act = run.act;
    const gadget = this.reg.gadgets.get(act.rick.gadget);
    if (!gadget) return;
    run.rickMeter = 0;
    this.meterAnnounced = false;
    this.rickBusy = true;
    // Time stops the moment Morty calls.
    this.holdWorld(true);
    this.fx.flash(gadget.color ?? 0xbfeaff, 110);
    this.sfx('rick-call');
    const view = this.roomView;
    const p = this.player;
    const side = p.x > view.widthPx / 2 ? -1 : 1;
    const target = { x: Phaser.Math.Clamp(p.x + side * 80, TILE * 1.5, view.widthPx - TILE * 1.5), y: Phaser.Math.Clamp(p.y, TILE * 1.5, view.heightPx - TILE * 1.5) };
    // Walking with Morty already? Then he just steps in from where he is.
    const buddyAt = this.stage.position('rick');
    const portal = !buddyAt && act.rick.entrance === 'portal';
    let start = target;
    if (buddyAt) {
      start = buddyAt;
      this.stage.setActorVisible('rick', false);
    } else if (!portal) {
      const door = [...view.doors].sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y))[0];
      start = door ? { x: door.x, y: door.y } : { x: side < 0 ? TILE : view.widthPx - TILE, y: target.y };
    }
    const rick = this.add.image(start.x, start.y, 'rick').setDepth(target.y + 1).setOrigin(0.5, 0.85).setFlipX(side < 0);
    this.actors.set('rick', () => ({ x: rick.x, y: rick.y - 64 }));
    let swirl: Phaser.GameObjects.Image | null = null;
    if (portal) {
      swirl = this.add.image(target.x, target.y - 20, 'exit-portal').setDepth(target.y).setScale(0.1);
      this.tweens.add({ targets: swirl, scale: 0.8, duration: 180 });
      rick.setScale(0.2);
      this.sfx('portal');
    }
    const leave = () => {
      const back = this.stage.position('rick') ?? start;
      this.tweens.add({
        targets: rick,
        x: back.x,
        y: back.y,
        scale: portal ? 0.1 : 1,
        duration: 300,
        onComplete: () => {
          rick.destroy();
          swirl?.destroy();
          this.actors.delete('rick');
          this.rickBusy = false;
          // Back to walking along (and to his own speech bubbles).
          if (buddyAt && this.stage.has('rick')) {
            this.stage.setActorVisible('rick', true);
            this.placeRickBuddy();
          }
        },
      });
    };
    this.tweens.add({
      targets: rick,
      x: target.x,
      y: target.y,
      scale: 1,
      duration: portal ? 220 : 360,
      ease: 'Quad.easeOut',
      onComplete: () => {
        this.say('rick', run.play.pick(gadget.lines), 2.6);
        gadget.activate(this.ctx);
        this.time.delayedCall(320, () =>
          this.sweepBeam({ x: rick.x + side * 18, y: rick.y - 36 }, gadget, hostile, () => {
            this.holdWorld(false);
            this.time.delayedCall(450, () => this.sfx('burp'));
            this.time.delayedCall(1100, leave);
          }),
        );
      },
    });
  }

  // ---- items and pickups -----------------------------------------------------------------------

  giveItem(id: ContentId, silent = false, charge?: number): void {
    const item = this.reg.items.get(id);
    if (!item) return;
    const inv = this.run.inventory;
    const before = new Set(activeSynergies(inv.owned(), this.reg.synergies).map((s) => s.id));
    const beforeT = new Set(activeTransformations(inv.owned(), this.reg.transformations).map((t) => t.id));
    const res = inv.add(item, { charge });
    if (!res.added) {
      this.hud.toast(`You already have ${item.name}.`);
      return;
    }
    if (res.dropped) {
      const at = this.dropSpot();
      this.placeWare({ itemId: res.dropped.id, x: at.x, y: at.y, charge: res.dropped.charge }, false);
    }
    this.run.stats.itemsFound.push(id);
    this.run.offered.add(id);
    this.invalidateStats();
    this.syncCompanions();
    this.refreshLook();
    if (!silent && item.kind !== 'weapon') this.after(1.2, () => this.rickSays('item', 0.6), false);
    if (!silent) {
      const kind = item.kind === 'active' ? 'Active item: right-click or C' : item.kind === 'consumable' ? 'Consumable: press R' : item.kind === 'weapon' ? 'Weapon' : 'Passive';
      this.hud.itemBanner(item.name, item.blurb, item.effect, kind);
      this.sfx('item');
      this.fx.burst('scrap', this.player.x, this.player.y - 30, 10);
    }
    // New synergies and transformations get their own moment, after the item's banner.
    let delay = silent ? 0 : 1.4;
    for (const s of activeSynergies(inv.owned(), this.reg.synergies)) {
      if (before.has(s.id)) continue;
      this.after(delay, () => this.celebrate('SYNERGY!', s.name, s.effect, 0x97ce4c), false);
      delay += 1.6;
    }
    for (const t of activeTransformations(inv.owned(), this.reg.transformations)) {
      if (beforeT.has(t.id)) continue;
      this.after(delay, () => this.celebrate('TRANSFORMATION!', t.name, t.effect, 0xff8fd8), false);
      delay += 1.6;
    }
  }

  /** The "SYNERGY!" (or "TRANSFORMATION!") moment: a big banner, confetti and a fanfare. */
  private celebrate(title: string, name: string, effect: string, color: number): void {
    const p = this.player;
    this.hud.celebrate(title, name, effect, color);
    this.sfx('synergy');
    this.fx.burst('confetti', p.x, p.y - 30);
    this.fx.ring(p.x, p.y - 20, color, 110, 520, 6);
    this.fx.flash(color, 120);
  }

  private useActive(): void {
    const inv = this.run.inventory;
    if (!inv.active || this.dead || !this.roomView) return;
    if (!inv.activeReady()) {
      this.sfx('ui-deny');
      this.hud.toast('Not charged yet. Clear more rooms.');
      return;
    }
    const def = this.reg.items.get(inv.active.id);
    if (!def?.active) return;
    if (def.active.use(this.ctx) === false) {
      this.sfx('ui-deny');
      return;
    }
    inv.spendActive();
    // Actives are big: every use gets a moment.
    this.fx.ring(this.player.x, this.player.y - 16, 0xffffff, 160, 360, 5);
    runHook(this.sources(), 'onUseActive', this.ctx, def.id);
  }

  private useConsumable(): void {
    const inv = this.run.inventory;
    const id = inv.consumable;
    if (!id || this.dead) return;
    const def = this.reg.items.get(id);
    if (!def?.consumable) return;
    if (def.consumable.use(this.ctx) === false) {
      this.sfx('ui-deny');
      return;
    }
    inv.takeConsumable();
    this.hud.toast(`Used ${def.name}`);
  }

  private applyStatus(id: ContentId): void {
    const def = this.reg.statuses.get(id);
    if (!def) return;
    if (this.run.statuses.add(id)) this.hud.toast(def.name, { color: def.positive ? 0x97ce4c : 0xff8a3d, sub: def.description });
    this.invalidateStats();
  }

  private onStatusChanges(changes: StatusChange[]): void {
    if (!changes.length) return;
    for (const c of changes) {
      const applied = c.applied ? this.reg.statuses.get(c.applied) : undefined;
      if (applied) this.hud.toast(applied.name, { color: applied.positive ? 0x97ce4c : 0xff8a3d, sub: applied.description });
    }
    this.invalidateStats();
  }

  randomItem(filter: ItemFilter = {}): ContentId | null {
    const run = this.run;
    const owned = new Set([...run.inventory.owned(), ...(run.inventory.consumable ? [run.inventory.consumable] : []), ...run.offered]);
    const pool = itemPoolFor(this.reg, run.episode.id, run.act, new Set(svc().save.unlocked), owned, filter);
    if (!pool.length) return null;
    const id = run.play.weighted(pool);
    const item = this.reg.items.get(id);
    // Consumables can show up again; everything else only once per run.
    if (item && item.kind !== 'consumable') run.offered.add(id);
    return id;
  }

  private placeWare(p: PedestalState, armed = true): void {
    const ware: Ware = { item: p.itemId ? this.reg.items.get(p.itemId) : undefined, pickup: p.pickupId ? this.reg.pickups.get(p.pickupId) : undefined };
    if (!ware.item && !ware.pickup) return;
    this.objects.spawnPedestal(ware, p.x, p.y, p.price, p.group, { charge: p.charge, armed });
  }

  /** Where a swapped-out item lands: a step and a half from Morty, on open floor. */
  private dropSpot(): Vec {
    const view = this.roomView!;
    const aim = this.player.aimAngle;
    let best = this.openSpotNear(this.player.x - TILE * 1.6, this.player.y);
    let bestScore = -Infinity;
    for (let i = 0; i < 8; i++) {
      // Prefer dropping behind Morty, away from where he's facing.
      const a = aim + Math.PI + (i % 2 ? 1 : -1) * Math.ceil(i / 2) * (Math.PI / 4);
      const x = this.player.x + Math.cos(a) * TILE * 1.6;
      const y = this.player.y + Math.sin(a) * TILE * 1.6;
      if (view.tileAt(x, y) !== 'floor') continue;
      const score = -i;
      if (score > bestScore) {
        bestScore = score;
        best = { x, y };
      }
    }
    return best;
  }

  /** The held item a pedestal's item would replace, if taking it is a swap. */
  private swapTarget(p: PedestalObj): ItemDef | null {
    if (!p.ware.item) return null;
    const out = this.run.inventory.swapsOut(p.ware.item);
    return out ? (this.reg.items.get(out) ?? null) : null;
  }

  private pedestalLabel(p: PedestalObj): string {
    const held = this.swapTarget(p);
    const price = p.price !== undefined ? ` (${p.price} Scrap)` : '';
    if (held && this.pendingSwap === p) return `Swap ${held.name} for ${p.name}?${price} Press E again`;
    if (held) return `${p.price !== undefined ? 'Buy' : 'Take'} ${p.name}${price} (swaps out ${held.name})`;
    if (p.price !== undefined) return `Buy ${p.name}${price}`;
    return p.group ? `Take ${p.name} (you only get one)` : `Take ${p.name}`;
  }

  private takePedestal(p: PedestalObj): void {
    const run = this.run;
    const held = this.swapTarget(p);
    if (held && this.pendingSwap !== p) {
      // Swaps ask first; the second press confirms.
      this.pendingSwap = p;
      this.pendingSwapUntil = run.time + 4;
      this.sfx('ui-move');
      return;
    }
    this.pendingSwap = null;
    if (p.price !== undefined) {
      if (run.scrap < p.price) {
        this.sfx('ui-deny');
        this.hud.toast(`Need ${p.price} Scrap. You have ${run.scrap}.`);
        return;
      }
      if (p.ware.pickup && p.ware.pickup.collect(this.ctx) === false) {
        this.sfx('ui-deny');
        this.hud.toast("You don't need that right now.");
        return;
      }
      run.scrap -= p.price;
      this.sfx('scrap');
    } else if (p.ware.pickup && p.ware.pickup.collect(this.ctx) === false) {
      return;
    }
    if (p.ware.item) this.giveItem(p.ware.item.id, false, p.charge);
    if (p.group) {
      for (const o of this.objects.pedestalsInGroup(p.group)) {
        if (o === p) continue;
        this.fx.burst('smoke', o.x, o.y - 20, 6);
        this.objects.removePedestal(o);
      }
    }
    this.objects.removePedestal(p);
  }

  spawnPickupAt(id: ContentId, x: number, y: number, pop = true): void {
    const def = this.reg.pickups.get(id);
    if (!def || !this.roomView) return;
    const rng = this.run.play;
    const a = rng.angle();
    const v = pop ? rng.float(80, 220) : 0;
    this.objects.spawnPickup(def, x, y, { x: Math.cos(a) * v, y: Math.sin(a) * v });
  }

  private collectPickup(p: PickupObj): boolean {
    if (p.def.collect(this.ctx) === false) return false;
    this.fx.burst(p.def.id === 'scrap' ? 'scrap' : 'heal', p.x, p.y - 8, 5);
    if (p.def.id !== 'scrap') this.sfx('pickup');
    return true;
  }

  private addScrap(n: number, x?: number, y?: number): void {
    const amount = Math.max(0, Math.round(n));
    this.run.scrap += amount;
    this.run.stats.scrapEarned += amount;
    this.sfx('scrap');
    if (x !== undefined && y !== undefined) this.fx.floatText(x, y - 20, `+${amount}`, '#ffd54a', 16);
  }

  private addProp(spec: PropSpec): PropObj {
    const prop = this.objects.addProp(spec);
    if (spec.persist) {
      const list = ((this.roomState.data.__props as PropSpec[] | undefined) ??= []);
      list.push({ art: spec.art, x: spec.x, y: spec.y, solid: spec.solid, radius: spec.radius, depth: spec.depth });
    }
    if (spec.actor) this.actors.set(spec.actor, () => (prop.destroyed ? null : { x: prop.x, y: prop.y - prop.img.displayHeight * prop.img.originY - 6 }));
    return prop;
  }

  say(who: ContentId, text: string, seconds = 2.6): void {
    const ch = this.reg.characters.get(who);
    const color = ch?.color ?? 0xffd54a;
    const actor = this.actors.get(who);
    const pos = actor?.();
    if (actor && pos) {
      this.fx.bubble(pos, text, color, seconds, actor, ch?.name);
      return;
    }
    this.fx.bubble(this.screenAnchor(), text, color, seconds, this.screenAnchor, ch?.name ?? who);
  }

  // ---- script and mechanic APIs ----------------------------------------------------------------

  private makeScriptApi(): RoomScriptApi {
    const st = this.roomState;
    const run = this.run;
    const extra = {
      room: this.roomInfoObj!,
      spawnEnemy: (id: ContentId, x: number, y: number, o?: { elite?: boolean; passive?: boolean; delay?: number }): EnemySelf | null =>
        this.spawnEnemy(id, x, y, { elite: o?.elite, passive: o?.passive, delay: o?.delay }),
      randomEnemy: () => run.play.weighted(enemyPoolFor(this.reg, run.episode.id, run.act)),
      spawnPickup: (id: ContentId, x: number, y: number) => this.spawnPickupAt(id, x, y, true),
      spawnPedestal: (itemId: ContentId, x: number, y: number, o?: { price?: number; choiceGroup?: string }) =>
        this.placeWare({ itemId, x, y, price: o?.price, group: o?.choiceGroup }),
      randomItem: (f?: ItemFilter) => this.randomItem(f),
      addProp: (spec: PropSpec) => this.addProp(spec),
      enemyCount: () => this.hostileCount(),
      setHostile: (e: EnemyRef) => this.setHostile(e as Enemy),
      makeCombat: () => {
        st.kind = 'combat';
        st.cleared = false;
        for (const e of this.enemies) if (e.alive && e.passive) this.setHostile(e);
      },
      clearEnemies: () => this.clearEnemiesSilently(),
      lockDoors: () => {
        this.scriptLock = true;
      },
      unlockDoors: () => {
        this.scriptLock = false;
      },
      completeRoom: () => this.clearRoom(false),
      completeStage: () => this.completeStage(),
      endAct: () => this.finishAct(),
      showChoice: (p: Parameters<HudApi['showChoice']>[0]) => this.hud.showChoice(p),
      hideChoice: () => this.hud.hideChoice(),
      playCutscene: (id: ContentId, done?: () => void) => this.playCutscenes([id], done),
      setObjective: (t: string | null) => {
        this.objectiveText = t;
      },
      setTimer: (s: number | null, label?: string) => {
        this.hudTimer = s === null ? null : { left: s, label: label ?? '' };
      },
      timerLeft: () => this.hudTimer?.left ?? 0,
      hint: (t: string | null) => {
        this.hintText = t;
      },
      after: (s: number, fn: () => void) => this.after(s, fn, true),
      giveActWeapon: () => this.giveActWeapon(),
      actScene: (steps: SceneStep[], done?: () => void) => this.playScene(steps, done),
    };
    return Object.assign(Object.create(this.ctx) as GameCtx, extra) as RoomScriptApi;
  }

  private makeMechanicApi(): MechanicApi {
    const run = this.run;
    const extra = {
      room: () => this.roomInfoObj!,
      here: () => this.scriptApi!,
      playerTile: () => this.tileUnderPlayer(),
      hint: (t: string | null) => {
        this.hintText = t;
      },
      playCutscene: (id: ContentId, done?: () => void) => this.playCutscenes([id], done),
      convertRooms: (from: RoomKind, to: RoomKind) => {
        run.rooms.forEach((r) => {
          if (r.kind === from && !r.visited) {
            r.kind = to;
            r.cleared = !(to === 'combat' || to === 'special' || to === 'finale');
          }
        });
      },
      giveActWeapon: () => this.giveActWeapon(),
    };
    return Object.assign(Object.create(this.ctx) as GameCtx, extra) as MechanicApi;
  }

  // ---- HUD model -------------------------------------------------------------------------------

  hudModel(): HudModel {
    const run = this.run;
    const inv = run.inventory;
    const items = this.reg.items;
    const act = run.act;
    const floor = run.floor;
    const gadget = this.reg.gadgets.get(act.rick.gadget);
    const describe = (id: ContentId) => ({ id, name: items.get(id)?.name ?? id, effect: items.get(id)?.effect ?? '' });
    return {
      hp: run.hp,
      maxHp: this.maxHp(),
      rick: { value: run.rickMeter / RICK_METER.max, ready: run.rickMeter >= RICK_METER.max, gadget: gadget?.name ?? 'Rick' },
      active: inv.active ? { ...describe(inv.active.id), charge: inv.active.charge, max: inv.active.max } : null,
      consumable: inv.consumable ? describe(inv.consumable) : null,
      weapon: inv.weapon ? describe(inv.weapon) : null,
      scene: this.stage.running,
      passives: inv.passives.map(describe),
      synergies: activeSynergies(inv.owned(), this.reg.synergies).map((s) => ({ name: s.name, effect: s.effect })),
      transformation: this.transformation ? { name: this.transformation.name, effect: this.transformation.effect } : null,
      scrap: run.scrap,
      statuses: run.statuses.list().map((s) => ({ id: s.def.id, name: s.def.name, positive: s.def.positive, remaining: s.remaining, kind: s.def.duration.kind })),
      actName: act.name,
      actNumber: run.actIndex + 1,
      actCount: run.sequence.length,
      widgets: this.mechanics.map((m) => m.inst.hud?.() ?? null).filter((w): w is NonNullable<typeof w> => !!w),
      boss: this.bossEnemy?.alive
        ? { title: this.bossEnemy.def.boss?.title ?? this.bossEnemy.def.name, hp: Math.max(0, this.bossEnemy.hp), maxHp: this.bossEnemy.maxHp, phases: this.bossEnemy.def.boss?.phases }
        : null,
      objective: this.objectiveText,
      timer: this.hudTimer ? { ...this.hudTimer } : null,
      hint: this.hintText,
      seed: run.seed,
      time: run.time,
      map: floor
        ? {
            rooms: floor.rooms.map((r) => {
              const st = run.rooms[r.id];
              return { id: r.id, x: r.x, y: r.y, kind: st.kind, visited: st.visited, seen: st.seen, cleared: st.cleared, current: r.id === run.currentRoom && run.stage <= 0 };
            }),
            gridW: floor.gridW,
            gridH: floor.gridH,
            inAnnex: run.stage > 0,
          }
        : null,
      mechanicHelp: this.mechanics.map((m) => `${m.def.name}: ${m.def.help}`),
    };
  }

  // ---- debug helpers (?debug=1) ----------------------------------------------------------------

  debugKillAll(): void {
    for (const e of [...this.enemies]) if (e.alive && !e.passive) this.hitEnemy(e, 99999, { source: 'rick' });
  }

  debugGotoRoom(id: number): void {
    if (!this.run.floor?.rooms[id]) return;
    this.transitionTo(() => this.enterRoom(id));
  }

  debugGotoAct(index: number): void {
    if (index < 0 || index >= this.run.sequence.length) return;
    this.startAct(index);
  }

  debugFinishStage(): void {
    if (this.run.stage < 0) {
      const f = this.run.floor?.finaleId;
      if (f !== null && f !== undefined) this.debugGotoRoom(f);
      return;
    }
    this.clearEnemiesSilently();
    this.bossEnemy = null;
    this.hud.hideChoice();
    this.completeStage();
  }

  debugRevealMap(): void {
    this.run.rooms.forEach((r) => (r.seen = true));
  }

  debugSpawnEnemy(id: ContentId, elite = false): void {
    const at = this.roomInfoObj?.randomFloorPoint(this.run.play, 150);
    if (at) this.spawnEnemy(id, at.x, at.y, { elite });
  }

  debugAddMeter(): void {
    this.addRickMeter(RICK_METER.max);
  }

  debugState(): Record<string, unknown> {
    return {
      act: this.run.act.id,
      actIndex: this.run.actIndex,
      room: this.run.currentRoom,
      stage: this.run.stage,
      kind: this.roomState?.kind,
      cleared: this.roomState?.cleared,
      hp: this.run.hp,
      scrap: this.run.scrap,
      weapon: this.run.inventory.weapon,
      scene: this.stage.running,
      enemies: this.hostileCount(),
      shots: this.playerShots.count() + this.enemyShots.count(),
      ended: this.ended,
      dead: this.dead,
      transitioning: this.transitioning,
      flags: { ...this.run.flags },
    };
  }

  debugUseExit(): void {
    if (this.exitProp) this.useExit();
  }

  debugSpawnShots(n: number): void {
    const p = this.player;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      this.enemyShot({ x: p.x + Math.cos(a) * 300, y: p.y + Math.sin(a) * 200, angle: a + Math.PI / 2, speed: 60, kind: 'orb', life: 20 }, 'stress test');
    }
  }
}
