/**
 * Pooled projectiles with hand-rolled collision against the room's tiles (walls stop them,
 * low blocks don't). Keeping them out of the physics engine makes 200+ shots cheap.
 */
import Phaser from 'phaser';
import type { HitSource } from '../types';
import type { RoomView } from './RoomView';

export interface ProjectileOpts {
  x: number;
  y: number;
  angle: number;
  speed: number;
  damage: number;
  radius: number;
  life: number;
  bounces?: number;
  texture: string;
  tint?: number;
  /** Degrees per second of visual spin (0 = point along the velocity). */
  spin?: number;
  /** Stays upright and just faces left or right (critters running). */
  upright?: boolean;
  source?: HitSource;
  tag?: string;
  applies?: string;
  /** Pixel radius the texture was drawn at (used to scale it). */
  baseRadius?: number;
  /** Halo color, for pools with glow (defaults to the tint). */
  glow?: number;
  /** Player shot behaviors (see BASE_STATS): enemies to pass through, homing turn rate, mini
   * shots to split into, blast radius, lightning jumps, enemy ricochets. */
  pierce?: number;
  homing?: number;
  split?: number;
  blast?: number;
  chain?: number;
  ricochet?: number;
  /** A critical hit, a freeze bolt, or a charged shot. */
  crit?: boolean;
  freezes?: boolean;
  charged?: boolean;
  /** An enemy (uid) this shot can't hit, e.g. the one a split shot burst out of. */
  ignore?: number;
}

export class Projectile {
  active = false;
  x = 0;
  y = 0;
  vx = 0;
  vy = 0;
  radius = 6;
  damage = 1;
  life = 1;
  bounces = 0;
  bounced = false;
  spin = 0;
  upright = false;
  source: HitSource = 'shot';
  tag?: string;
  applies?: string;
  pierce = 0;
  homing = 0;
  split = 0;
  blast = 0;
  chain = 0;
  ricochet = 0;
  crit = false;
  freezes = false;
  charged = false;
  /** Enemies already hit, so a piercing shot never hits the same one twice. */
  readonly hits = new Set<number>();
  /** How it was launched (split shots copy their parent's look). */
  launched!: ProjectileOpts;
  readonly img: Phaser.GameObjects.Image;
  /** Soft additive halo that makes the player's shots read as bright energy. */
  private readonly glow?: Phaser.GameObjects.Image;

  constructor(scene: Phaser.Scene, depth: number, glow: boolean) {
    this.img = scene.add.image(0, 0, '__WHITE').setVisible(false).setActive(false).setDepth(depth);
    if (glow) this.glow = scene.add.image(0, 0, 'fx-dot').setVisible(false).setDepth(depth - 1).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.55);
  }

  /** Keeps the halo on the shot. */
  syncGlow(): void {
    this.glow?.setPosition(this.x, this.y);
  }

  launch(o: ProjectileOpts): void {
    this.launched = o;
    this.active = true;
    this.x = o.x;
    this.y = o.y;
    this.vx = Math.cos(o.angle) * o.speed;
    this.vy = Math.sin(o.angle) * o.speed;
    this.radius = o.radius;
    this.damage = o.damage;
    this.life = o.life;
    this.bounces = o.bounces ?? 0;
    this.bounced = false;
    this.spin = o.spin ?? 0;
    this.upright = !!o.upright;
    this.source = o.source ?? 'shot';
    this.tag = o.tag;
    this.applies = o.applies;
    this.pierce = o.pierce ?? 0;
    this.homing = o.homing ?? 0;
    this.split = o.split ?? 0;
    this.blast = o.blast ?? 0;
    this.chain = o.chain ?? 0;
    this.ricochet = o.ricochet ?? 0;
    this.crit = !!o.crit;
    this.freezes = !!o.freezes;
    this.charged = !!o.charged;
    this.hits.clear();
    if (o.ignore !== undefined) this.hits.add(o.ignore);
    const scale = o.radius / (o.baseRadius ?? 8);
    this.img.setTexture(o.texture).setScale(scale).setPosition(o.x, o.y).setVisible(true).setActive(true).setAlpha(1);
    if (o.tint !== undefined) this.img.setTint(o.tint);
    else this.img.clearTint();
    this.img.setRotation(this.spin || this.upright ? 0 : o.angle).setFlipX(this.upright && Math.cos(o.angle) < 0);
    if (this.glow) {
      this.glow.setPosition(o.x, o.y).setScale((o.radius * 3.4) / 8).setVisible(true).setTint(o.glow ?? o.tint ?? 0xffffff);
    }
  }

  kill(): void {
    this.active = false;
    this.img.setVisible(false).setActive(false);
    this.glow?.setVisible(false);
  }

  destroy(): void {
    this.img.destroy();
    this.glow?.destroy();
  }
}

export class ProjectilePool {
  private readonly items: Projectile[] = [];

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly depth: number,
    private readonly max: number,
    private readonly opts: { glow?: boolean } = {},
  ) {}

  spawn(o: ProjectileOpts): Projectile | null {
    let p = this.items.find((x) => !x.active);
    if (!p) {
      if (this.items.length >= this.max) return null;
      p = new Projectile(this.scene, this.depth, !!this.opts.glow);
      this.items.push(p);
    }
    p.launch(o);
    return p;
  }

  /**
   * Moves everything; calls onBounce/onDie for effects. `steer` gets each homing shot and returns
   * the point it should turn toward (or null).
   */
  update(
    dt: number,
    room: RoomView,
    onBounce: (p: Projectile) => void,
    onDie: (p: Projectile, hitWall: boolean) => void,
    steer?: (p: Projectile) => { x: number; y: number } | null,
  ): void {
    for (const p of this.items) {
      if (!p.active) continue;
      p.life -= dt;
      if (p.homing > 0 && steer) {
        const target = steer(p);
        if (target) {
          const speed = Math.hypot(p.vx, p.vy);
          const cur = Math.atan2(p.vy, p.vx);
          const want = Math.atan2(target.y - p.y, target.x - p.x);
          const diff = Math.atan2(Math.sin(want - cur), Math.cos(want - cur));
          const turn = Math.max(-p.homing * dt, Math.min(p.homing * dt, diff));
          p.vx = Math.cos(cur + turn) * speed;
          p.vy = Math.sin(cur + turn) * speed;
        }
      }
      if (p.life <= 0) {
        onDie(p, false);
        p.kill();
        continue;
      }
      const nx = p.x + p.vx * dt;
      const ny = p.y + p.vy * dt;
      if (this.solid(room, nx, ny)) {
        const hitX = this.solid(room, nx, p.y);
        const hitY = this.solid(room, p.x, ny);
        if (p.bounces > 0) {
          p.bounces--;
          p.bounced = true;
          if (hitX || !hitY) p.vx = -p.vx;
          if (hitY || !hitX) p.vy = -p.vy;
          onBounce(p);
        } else {
          onDie(p, true);
          p.kill();
        }
        continue;
      }
      p.x = nx;
      p.y = ny;
      p.img.setPosition(p.x, p.y);
      p.syncGlow();
      if (p.spin) p.img.angle += p.spin * dt;
      else if (p.upright) p.img.setFlipX(p.vx < 0);
      else p.img.setRotation(Math.atan2(p.vy, p.vx));
    }
  }

  private solid(room: RoomView, x: number, y: number): boolean {
    const t = room.tileAt(x, y);
    return t === 'wall' || t === 'void';
  }

  forEachActive(fn: (p: Projectile) => void): void {
    for (const p of this.items) if (p.active) fn(p);
  }

  count(): number {
    return this.items.reduce((n, p) => n + (p.active ? 1 : 0), 0);
  }

  clear(): void {
    for (const p of this.items) p.kill();
  }

  destroy(): void {
    for (const p of this.items) p.destroy();
    this.items.length = 0;
  }
}
