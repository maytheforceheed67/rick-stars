/**
 * A live enemy: a physics sprite driven by its content-defined brain (a generator). The brain
 * talks to the game only through the EnemyApi built here.
 */
import Phaser from 'phaser';
import { ENEMIES } from '../../content/balance';
import { TEXTURE_PAD } from '../art/textures';
import { TILE } from '../constants';
import type { Rng } from '../rng';
import type { Settings } from '../save/save';
import type {
  Brain,
  EliteMod,
  EnemyApi,
  EnemyDef,
  EnemySelf,
  EnemyShotSpec,
  GameCtx,
  HazardSpec,
  MeleeSpec,
  PlayerRef,
  RoomInfo,
  TelegraphSpec,
  Vec,
} from '../types';
import type { Fx } from './Fx';
import type { RoomView } from './RoomView';
import type { HazardLayer, TelegraphLayer } from './Telegraphs';
import { textStyle } from '../ui/text';

/** What an enemy needs from the running game. RunScene implements this. */
export interface EnemyHost {
  readonly player: PlayerRef & { radius: number };
  readonly telegraphs: TelegraphLayer;
  readonly hazards: HazardLayer;
  readonly fx: Fx;
  readonly rng: Rng;
  readonly ctx: GameCtx;
  room(): RoomView;
  roomInfo(): RoomInfo;
  frameDt(): number;
  now(): number;
  windupMult(): number;
  settings(): Settings;
  enemyShot(spec: EnemyShotSpec & { x: number; y: number }, sourceName: string): void;
  spawnEnemy(id: string, x: number, y: number, opts?: SpawnOpts): Enemy | null;
  /** Hostile enemies near a point (not hazards or calm NPCs). */
  enemiesNear(x: number, y: number, radius: number): Enemy[];
  damagePlayer(halves: number, source: string): void;
  /** Morty falls if he's within `radius` of (x, y) and nothing lets him stand there. */
  pitfall(x: number, y: number, radius: number): void;
  sfx(id: string): void;
  shake(intensity: number, ms: number): void;
}

export interface SpawnOpts {
  elite?: boolean;
  passive?: boolean;
  delay?: number;
  /** Elite twist; picked at random when an elite spawns without one. */
  mod?: EliteMod;
  /** Half of a splitting elite: smaller, weaker, and it doesn't split again. */
  splitChild?: boolean;
  hpScale?: number;
}

const MOD_COLOR: Record<EliteMod, number> = { shielded: 0x7fdcff, hasty: 0xffb03a, splitting: 0xc58bff, explosive: 0xff5a3d };

let nextUid = 1;

export class Enemy extends Phaser.Physics.Arcade.Sprite implements EnemySelf {
  readonly uid = nextUid++;
  readonly def: EnemyDef;
  readonly elite: boolean;
  readonly memory: Record<string, unknown> = {};
  readonly api: EnemyApi;
  hp: number;
  maxHp: number;
  passive: boolean;
  alive = true;
  invulnerable = false;
  moveVx = 0;
  moveVy = 0;
  knockVx = 0;
  knockVy = 0;
  frozenLeft = 0;
  stunLeft = 0;
  poisonDps = 0;
  poisonLeft = 0;
  poisonAcc = 0;
  slowMult = 1;
  slowLeft = 0;
  spawnLeft: number;
  /** Elite twist, if any. */
  readonly mod: EliteMod | null;
  /** Hits a shielded elite's bubble still absorbs. */
  shieldHits = 0;
  /** Seconds left staggered (open to extra damage). */
  staggerLeft = 0;
  /** A beaten boss left reeling instead of killed (BossInfo.dazed): harmless, can't be hurt. */
  dazed = false;
  readonly splitChild: boolean;
  /** Movement speed multiplier (hasty elites). */
  readonly speedMult: number;
  /** Seconds left of a support enemy's haste buff. */
  hasteLeft = 0;
  /** Radius in world pixels (scaled for elites). */
  readonly radius: number;

  private brain: Brain | null = null;
  private wait = 0;
  private waitUntil: (() => boolean) | null = null;
  private windupAmt = 0;
  private flashLeft = 0;
  /** Squash-and-stretch after a hit, 1 = just hit. */
  private flinch = 0;
  private facing = 0;
  private readonly baseScale: number;
  private readonly flying: boolean;
  private shadow?: Phaser.GameObjects.Ellipse;
  private ice?: Phaser.GameObjects.Image;
  private plate?: Phaser.GameObjects.Text;
  private plateText: string | null = null;
  private aura?: Phaser.GameObjects.Ellipse;
  private modIcon?: Phaser.GameObjects.Image;
  private bubble?: Phaser.GameObjects.Arc;
  private dizzy: Phaser.GameObjects.Image[] = [];

  constructor(
    private readonly host: EnemyHost,
    scene: Phaser.Scene,
    def: EnemyDef,
    x: number,
    y: number,
    opts: SpawnOpts = {},
  ) {
    super(scene, x, y, def.art.key);
    this.def = def;
    this.elite = !!opts.elite && !!def.elite;
    this.passive = !!opts.passive;
    this.mod = this.elite ? (opts.mod ?? null) : null;
    this.splitChild = !!opts.splitChild;
    this.speedMult = this.mod === 'hasty' ? ENEMIES.elite.hasteMult : 1;
    this.maxHp = Math.max(1, def.hp * (this.elite ? (def.elite?.hpMult ?? 1.6) : 1) * (opts.hpScale ?? 1));
    this.hp = this.maxHp;
    this.baseScale = this.elite ? (def.elite?.scale ?? 1.25) : this.splitChild ? 0.8 : 1;
    this.radius = def.radius * this.baseScale;
    this.flying = !!def.flying;
    this.spawnLeft = opts.delay ?? ENEMIES.spawnDelay;

    scene.add.existing(this);
    scene.physics.add.existing(this);
    const fw = def.art.width + TEXTURE_PAD * 2;
    const fh = def.art.height + TEXTURE_PAD * 2;
    const centerY = this.flying ? fh / 2 : TEXTURE_PAD + def.art.height - def.radius * 0.9;
    this.setOrigin(0.5, centerY / fh);
    this.setScale(this.baseScale);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setCircle(def.radius, fw / 2 - def.radius, centerY - def.radius);
    body.setCollideWorldBounds(false);

    if (this.flying) {
      this.shadow = scene.add.ellipse(x, y + this.radius + 10, this.radius * 1.6, this.radius * 0.5, 0x000000, 0.25).setDepth(-400);
    }
    if (this.elite) {
      const color = this.mod ? MOD_COLOR[this.mod] : 0xffd54a;
      this.aura = scene.add.ellipse(x, y, this.radius * 3, this.radius * 1.2, color, 0.28).setDepth(-450);
      this.aura.setStrokeStyle(3, color, 0.9);
      if (this.mod) this.modIcon = scene.add.image(x, y, `elite-${this.mod}`).setDepth(5150);
      if (this.mod === 'shielded') {
        this.shieldHits = ENEMIES.elite.shieldHits;
        this.bubble = scene.add.circle(x, y, this.radius * 1.6, 0x7fdcff, 0.14).setStrokeStyle(3, 0xbfeeff, 0.9).setDepth(5140);
      }
    }
    if (def.hazard) this.invulnerable = true;
    this.setAlpha(0.2);
    this.api = makeApi(this, host);
    this.brain = def.brain(this.api);
  }

  // ---- EnemySelf -------------------------------------------------------------------------------

  get frozen(): boolean {
    return this.frozenLeft > 0;
  }
  get vx(): number {
    return (this.body as Phaser.Physics.Arcade.Body).velocity.x;
  }
  get vy(): number {
    return (this.body as Phaser.Physics.Arcade.Body).velocity.y;
  }
  get blocked(): boolean {
    const b = (this.body as Phaser.Physics.Arcade.Body).blocked;
    return b.left || b.right || b.up || b.down;
  }
  get sizeScale(): number {
    return this.baseScale;
  }
  get boss(): boolean {
    return !!this.def.boss;
  }

  setVelocityRaw(vx: number, vy: number): void {
    this.moveVx = vx;
    this.moveVy = vy;
  }

  override setVelocity(vx: number, vy?: number): this {
    this.moveVx = vx;
    this.moveVy = vy ?? vx;
    return this;
  }

  setInvulnerable(on: boolean): void {
    this.invulnerable = on;
  }

  setWindupPose(amount: number): void {
    this.windupAmt = amount;
  }

  setFacing(angle: number): void {
    this.facing = angle;
  }

  setNameplate(text: string | null): void {
    if (text === this.plateText) return;
    this.plateText = text;
    if (!text) {
      this.plate?.destroy();
      this.plate = undefined;
      return;
    }
    if (!this.plate) this.plate = this.scene.add.text(this.x, this.y, text, textStyle(13, '#ffe27a')).setOrigin(0.5, 1).setDepth(5200);
    else this.plate.setText(text);
  }

  setArt(key: string): void {
    if (this.scene.textures.exists(key)) this.setTexture(key);
  }

  teleport(x: number, y: number): void {
    this.setPosition(x, y);
    (this.body as Phaser.Physics.Arcade.Body).reset(x, y);
  }

  /** Set by kill()/despawn(); the host acts on it after the enemy's update. */
  pending: 'kill' | 'despawn' | null = null;

  kill(): void {
    this.pending = 'kill';
  }

  despawn(): void {
    this.pending = 'despawn';
  }

  // ---- status ----------------------------------------------------------------------------------

  freeze(seconds: number): void {
    const s = this.boss ? seconds * ENEMIES.bossFreezeMult : seconds;
    this.frozenLeft = Math.max(this.frozenLeft, s);
    if (!this.ice) {
      this.ice = this.scene.add.image(this.x, this.y, 'fx-iceblock').setDepth(this.depth + 1).setAlpha(0.6);
      const size = Math.max(this.displayWidth, this.displayHeight) * 1.05;
      this.ice.setDisplaySize(this.displayWidth * 1.15, size);
    }
    this.refreshTint();
  }

  unfreeze(): void {
    this.frozenLeft = 0;
    this.ice?.destroy();
    this.ice = undefined;
    this.refreshTint();
  }

  stun(seconds: number): void {
    this.stunLeft = Math.max(this.stunLeft, seconds);
  }

  poison(dps: number, seconds: number): void {
    this.poisonDps = Math.max(this.poisonDps, dps);
    this.poisonLeft = Math.max(this.poisonLeft, seconds);
    this.refreshTint();
  }

  slow(mult: number, seconds: number): void {
    this.slowMult = mult;
    this.slowLeft = Math.max(this.slowLeft, seconds);
  }

  heal(amount: number): void {
    if (!this.alive || amount <= 0 || this.hp >= this.maxHp) return;
    this.hp = Math.min(this.maxHp, this.hp + amount);
    this.host.fx.burst('heal', this.x, this.y - this.displayHeight * 0.5, 5);
  }

  haste(seconds: number): void {
    this.hasteLeft = Math.max(this.hasteLeft, seconds);
  }

  grantShield(hits: number): void {
    if (!this.alive) return;
    this.shieldHits = Math.max(this.shieldHits, hits);
    if (!this.bubble) this.bubble = this.scene.add.circle(this.x, this.y, this.radius * 1.6, 0x7fdcff, 0.14).setStrokeStyle(3, 0xbfeeff, 0.9).setDepth(5140);
  }

  /** The shield bubble soaked a hit; returns true when that popped it. */
  absorbHit(): boolean {
    this.shieldHits = Math.max(0, this.shieldHits - 1);
    if (this.shieldHits > 0) {
      this.bubble?.setScale(1.12);
      return false;
    }
    this.bubble?.destroy();
    this.bubble = undefined;
    return true;
  }

  breakShield(): void {
    this.shieldHits = 0;
    this.bubble?.destroy();
    this.bubble = undefined;
  }

  /** Beaten but not killed: stops fighting and reels on the spot with stars overhead. */
  daze(): void {
    this.dazed = true;
    this.brain = null;
    this.invulnerable = true;
    this.staggerLeft = Infinity;
    this.windupAmt = 0;
    this.moveVx = 0;
    this.moveVy = 0;
    this.unfreeze();
    this.setNameplate(null);
  }

  flashHit(): void {
    this.flashLeft = 0.08;
    this.flinch = 1;
    if (this.host.settings().reducedFlash) this.setTint(0xffc0c0);
    else this.setTintFill(0xffffff);
  }

  knock(angle: number, force: number): void {
    const resist = this.boss ? 0.9 : (this.def.knockbackResist ?? 0);
    const f = force * (1 - resist);
    this.knockVx += Math.cos(angle) * f;
    this.knockVy += Math.sin(angle) * f;
  }

  private refreshTint(): void {
    if (this.frozenLeft > 0) this.setTint(0xa8e4ff);
    else if (this.poisonLeft > 0) this.setTint(0xb6f08a);
    else this.clearTint();
  }

  // ---- per frame -------------------------------------------------------------------------------

  /** Advances the enemy. Returns poison damage to apply this frame (the host applies it). */
  tick(dt: number, time: number): number {
    if (!this.alive) return 0;
    let poisonDamage = 0;
    if (this.flashLeft > 0) {
      this.flashLeft -= dt;
      if (this.flashLeft <= 0) this.refreshTint();
    }
    const decay = Math.exp(-dt * 9);
    this.knockVx *= decay;
    this.knockVy *= decay;

    if (this.spawnLeft > 0) {
      this.spawnLeft -= dt;
      this.setAlpha(Math.min(1, 0.2 + (1 - this.spawnLeft / ENEMIES.spawnDelay) * 0.8));
      this.applyVelocity(0, 0);
      this.syncVisuals(time);
      return 0;
    }
    this.setAlpha(1);

    if (this.poisonLeft > 0) {
      this.poisonLeft -= dt;
      this.poisonAcc += this.poisonDps * dt;
      if (this.poisonAcc >= 1 || this.poisonLeft <= 0) {
        poisonDamage = this.poisonAcc;
        this.poisonAcc = 0;
      }
      if (this.poisonLeft <= 0) this.refreshTint();
    }
    if (this.slowLeft > 0) {
      this.slowLeft -= dt;
      if (this.slowLeft <= 0) this.slowMult = 1;
    }

    if (this.staggerLeft > 0) this.staggerLeft = Math.max(0, this.staggerLeft - dt);
    if (this.hasteLeft > 0) this.hasteLeft = Math.max(0, this.hasteLeft - dt);
    if (this.frozenLeft > 0) {
      this.frozenLeft -= dt;
      if (this.frozenLeft <= 0) this.unfreeze();
      this.applyVelocity(0, 0);
      this.syncVisuals(time);
      return poisonDamage;
    }
    if (this.stunLeft > 0 || this.passive) {
      if (this.stunLeft > 0) this.stunLeft -= dt;
      this.applyVelocity(0, 0);
      this.syncVisuals(time);
      return poisonDamage;
    }

    this.runBrain(dt);
    this.applyVelocity(this.moveVx * this.slowMult, this.moveVy * this.slowMult);
    this.syncVisuals(time);
    return poisonDamage;
  }

  private runBrain(dt: number): void {
    if (!this.brain) return;
    if (this.wait > 0) {
      this.wait -= dt;
      if (this.wait > 0) return;
    }
    if (this.waitUntil) {
      if (!this.waitUntil()) return;
      this.waitUntil = null;
    }
    const r = this.brain.next();
    if (r.done) {
      this.brain = null;
      return;
    }
    if (typeof r.value === 'number') this.wait = r.value;
    else if (typeof r.value === 'function') this.waitUntil = r.value;
  }

  private applyVelocity(vx: number, vy: number): void {
    (this.body as Phaser.Physics.Arcade.Body).setVelocity(vx + this.knockVx, vy + this.knockVy);
  }

  private syncVisuals(time: number): void {
    this.setDepth(this.def.hazard?.flat ? -350 : this.y);
    if (this.flinch > 0) {
      this.flinch = Math.max(0, this.flinch - this.host.frameDt() * 9);
      const f = this.flinch * (this.boss ? 0.35 : 1);
      this.setScale(this.baseScale * (1 + 0.16 * f), this.baseScale * (1 - 0.13 * f));
    } else if (this.scaleX !== this.baseScale || this.scaleY !== this.baseScale) {
      this.setScale(this.baseScale);
    }
    const p = this.host.player;
    const lookAngle = this.windupAmt > 0 || this.facing ? this.facing || Math.atan2(p.y - this.y, p.x - this.x) : Math.atan2(p.y - this.y, p.x - this.x);
    this.setFlipX(Math.cos(lookAngle) < 0);
    if (this.dazed) {
      this.setAngle(Math.sin(time * 4) * 9);
    } else if (this.windupAmt > 0 && this.frozenLeft <= 0) {
      this.setAngle(Math.sin(time * 42) * 7 * this.windupAmt);
    } else if (this.flying) {
      this.setAngle(Math.sin(time * 5 + this.uid) * 4);
    } else {
      const moving = Math.abs(this.moveVx) + Math.abs(this.moveVy) > 5 && this.frozenLeft <= 0;
      this.setAngle(moving ? Math.sin(time * 16 + this.uid) * 5 : 0);
    }
    if (this.flying) {
      this.shadow?.setPosition(this.x, this.y + this.radius + 10).setScale(1 + Math.sin(time * 4 + this.uid) * 0.1);
    }
    this.aura?.setPosition(this.x, this.y + this.radius * 0.6).setAlpha(0.6 + 0.3 * Math.sin(time * (this.mod === 'explosive' ? 11 : 5)));
    const top = this.y - this.displayHeight * this.originY;
    this.modIcon?.setPosition(this.x + this.displayWidth * 0.42, top + 2);
    if (this.bubble) {
      this.bubble.setPosition(this.x, this.y - this.displayHeight * (this.originY - 0.5));
      if (this.bubble.scale > 1) this.bubble.setScale(Math.max(1, this.bubble.scale - this.host.frameDt() * 2));
    }
    const fast = this.mod === 'hasty' || this.hasteLeft > 0;
    if (fast && Math.abs(this.moveVx) + Math.abs(this.moveVy) > 20 && Math.sin(time * 30 + this.uid) > 0.6) this.speedGhost();
    if (this.staggerLeft > 0) {
      if (!this.dizzy.length) this.dizzy = [0, 1, 2].map(() => this.scene.add.image(this.x, top, 'fx-star').setTint(0xffe27a).setDepth(5160));
      this.dizzy.forEach((d, i) => {
        const a = time * 6 + (i * Math.PI * 2) / 3;
        d.setPosition(this.x + Math.cos(a) * this.radius * 1.1, top - 6 + Math.sin(a) * 5);
      });
    } else if (this.dizzy.length) {
      this.dizzy.forEach((d) => d.destroy());
      this.dizzy = [];
    }
    if (this.ice) this.ice.setPosition(this.x, this.y - this.displayHeight * (this.originY - 0.5)).setDepth(this.depth + 1);
    const plate = this.def.nameplate?.(this.host.ctx) ?? null;
    this.setNameplate(plate);
    this.plate?.setPosition(this.x, this.y - this.displayHeight * this.originY - 4);
  }

  private speedGhost(): void {
    const g = this.scene.add.image(this.x, this.y, this.texture.key).setOrigin(this.originX, this.originY).setFlipX(this.flipX).setScale(this.scaleX, this.scaleY).setDepth(this.depth - 1).setAlpha(0.35).setTint(0xffb03a);
    this.scene.tweens.add({ targets: g, alpha: 0, duration: 200, onComplete: () => g.destroy() });
  }

  /** Removes the enemy from the world (after the host has run death effects). */
  remove(): void {
    this.alive = false;
    this.brain = null;
    this.shadow?.destroy();
    this.ice?.destroy();
    this.plate?.destroy();
    this.aura?.destroy();
    this.modIcon?.destroy();
    this.bubble?.destroy();
    this.dizzy.forEach((d) => d.destroy());
    this.dizzy = [];
    this.destroy();
  }
}

function makeApi(e: Enemy, host: EnemyHost): EnemyApi {
  const speed = () => e.def.speed * e.speedMult * (e.hasteLeft > 0 ? ENEMIES.hasteBuff : 1);
  // One follow target per enemy, so a new line replaces its previous speech bubble.
  const head = () => (e.alive ? { x: e.x, y: e.y - e.displayHeight * e.originY } : null);
  const toward = (x: number, y: number, mult: number) => {
    const dx = x - e.x;
    const dy = y - e.y;
    const d = Math.hypot(dx, dy);
    if (d < 2) {
      e.setVelocityRaw(0, 0);
      return;
    }
    const s = speed() * mult;
    e.setVelocityRaw((dx / d) * s, (dy / d) * s);
  };

  const api: EnemyApi = {
    self: e,
    player: host.player,
    rng: host.rng,
    ctx: host.ctx,
    dt: () => host.frameDt(),
    param: (name, fallback) => (e.elite ? e.def.elite?.params?.[name] : undefined) ?? fallback,
    chase(mult = 1) {
      const p = host.player;
      const room = host.room();
      const flying = !!e.def.flying;
      if (flying || room.walkableLine(e.x, e.y, p.x, p.y, false, e.radius)) {
        toward(p.x, p.y, mult);
        return;
      }
      const step = room.nextStep(e.x, e.y, p.x, p.y, flying);
      if (step) toward(step.x, step.y, mult);
      else toward(p.x, p.y, mult);
    },
    moveToward: (x, y, mult = 1) => toward(x, y, mult),
    moveAngle(angle, mult = 1) {
      const s = speed() * mult;
      e.setVelocityRaw(Math.cos(angle) * s, Math.sin(angle) * s);
    },
    keepDistance(min, max, mult = 1) {
      const p = host.player;
      const d = Math.hypot(p.x - e.x, p.y - e.y);
      const a = Math.atan2(p.y - e.y, p.x - e.x);
      if (d > max) {
        api.chase(mult);
        return;
      }
      let dir = (e.memory.strafe as number | undefined) ?? 1;
      if (e.blocked || host.rng.chance(host.frameDt() * 0.5)) {
        dir = -dir;
        e.memory.strafe = dir;
      }
      const away = d < min ? a + Math.PI : a;
      const strafe = a + (Math.PI / 2) * dir;
      const wx = (d < min ? Math.cos(away) * 0.8 : 0) + Math.cos(strafe) * 0.6;
      const wy = (d < min ? Math.sin(away) * 0.8 : 0) + Math.sin(strafe) * 0.6;
      const len = Math.hypot(wx, wy) || 1;
      const s = speed() * mult;
      e.setVelocityRaw((wx / len) * s, (wy / len) * s);
    },
    stop: () => e.setVelocityRaw(0, 0),
    distToPlayer: () => Math.hypot(host.player.x - e.x, host.player.y - e.y),
    angleToPlayer: () => Math.atan2(host.player.y - e.y, host.player.x - e.x),
    canSeePlayer: () => host.room().lineOfSight(e.x, e.y, host.player.x, host.player.y),
    *windup(seconds: number, spec?: TelegraphSpec | TelegraphSpec[] | (() => TelegraphSpec)): Brain {
      const duration = Math.max(ENEMIES.minWindup, seconds * host.windupMult());
      const specs = spec === undefined ? [] : Array.isArray(spec) ? spec : [spec];
      const teles = specs.map((s) => host.telegraphs.add(s, () => e.alive));
      let t = 0;
      try {
        while (t < duration) {
          t += host.frameDt();
          e.setWindupPose(Math.min(1, t / duration));
          for (const tele of teles) tele.setProgress(t / duration);
          yield;
        }
      } finally {
        for (const tele of teles) tele.destroy();
        e.setWindupPose(0);
      }
    },
    shoot(spec: EnemyShotSpec) {
      host.enemyShot({ ...spec, x: spec.x ?? e.x, y: spec.y ?? e.y }, e.def.name);
    },
    melee(spec: MeleeSpec) {
      const p = host.player;
      const dx = p.x - spec.x;
      const dy = p.y - spec.y;
      const d = Math.hypot(dx, dy);
      if (d > spec.radius + host.player.radius) return false;
      if (spec.shape === 'arc') {
        let diff = Math.atan2(dy, dx) - spec.angle;
        diff = Math.atan2(Math.sin(diff), Math.cos(diff));
        if (Math.abs(diff) > spec.spread / 2 && d > host.player.radius * 1.5) return false;
      }
      host.damagePlayer(spec.damage, e.def.name);
      if (spec.knockback) host.player.knockback(Math.atan2(dy, dx), spec.knockback);
      return true;
    },
    hazard: (spec: HazardSpec) => host.hazards.add(spec),
    spawn: (id, x, y, opts) => host.spawnEnemy(id, x, y, { elite: opts?.elite, delay: 0.4 }),
    say(text, seconds = 2.2) {
      host.fx.bubble({ x: e.x, y: e.y - e.displayHeight * e.originY }, text, 0xff8a3d, seconds, head);
    },
    sfx: (id) => host.sfx(id),
    shake: (i, ms) => host.shake(i, ms),
    room: () => host.roomInfo(),
    pitfall: (radius) => host.pitfall(e.x, e.y, radius),
    allies: (radius) => host.enemiesNear(e.x, e.y, radius).filter((o) => o !== e),
    flank(mult = 1) {
      const p = host.player;
      const d = Math.hypot(p.x - e.x, p.y - e.y);
      if (d < 150) {
        api.chase(mult);
        return;
      }
      // Swing wide: aim at a point beside the player, on this enemy's side.
      const a = Math.atan2(p.y - e.y, p.x - e.x);
      const side = e.uid % 2 === 0 ? 1 : -1;
      const off = Math.min(140, d * 0.45);
      const tx = p.x + Math.cos(a + (Math.PI / 2) * side) * off;
      const ty = p.y + Math.sin(a + (Math.PI / 2) * side) * off;
      if (host.room().walkableLine(e.x, e.y, tx, ty, !!e.def.flying, e.radius)) toward(tx, ty, mult);
      else api.chase(mult);
    },
    *stagger(seconds: number): Brain {
      e.setVelocityRaw(0, 0);
      e.staggerLeft = Math.max(e.staggerLeft, seconds);
      host.sfx('stagger');
      while (e.staggerLeft > 0) {
        e.setVelocityRaw(0, 0);
        yield;
      }
    },
  };
  return api;
}

/** Straight-line helper for brains: a point `dist` px from (x,y) along `angle`. */
export function along(x: number, y: number, angle: number, dist: number): Vec {
  return { x: x + Math.cos(angle) * dist, y: y + Math.sin(angle) * dist };
}

export const ENEMY_TILE = TILE;
