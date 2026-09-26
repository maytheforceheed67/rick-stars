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
  source?: HitSource;
  tag?: string;
  applies?: string;
  /** Pixel radius the texture was drawn at (used to scale it). */
  baseRadius?: number;
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
  source: HitSource = 'shot';
  tag?: string;
  applies?: string;
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
    this.source = o.source ?? 'shot';
    this.tag = o.tag;
    this.applies = o.applies;
    const scale = o.radius / (o.baseRadius ?? 8);
    this.img.setTexture(o.texture).setScale(scale).setPosition(o.x, o.y).setVisible(true).setActive(true).setAlpha(1);
    if (o.tint !== undefined) this.img.setTint(o.tint);
    else this.img.clearTint();
    this.img.setRotation(this.spin ? 0 : o.angle);
    if (this.glow) {
      this.glow.setPosition(o.x, o.y).setScale((o.radius * 3.4) / 8).setVisible(true).setTint(o.tint ?? 0xffffff);
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

  /** Moves everything; calls onBounce/onDie for effects. */
  update(dt: number, room: RoomView, onBounce: (p: Projectile) => void, onDie: (p: Projectile, hitWall: boolean) => void): void {
    for (const p of this.items) {
      if (!p.active) continue;
      p.life -= dt;
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
