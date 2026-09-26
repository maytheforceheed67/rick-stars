/**
 * Buddies that come with items and follow Morty from room to room: a reprogrammed junk drone
 * that shoots, a baby critter that pounces, a guard that circles him and eats bullets. Also the
 * junk that orbits him (the `orbit` stat), which bonks enemies and blocks shots.
 */
import Phaser from 'phaser';
import { SHOTS } from '../../content/balance';
import type { CompanionSpec, ContentId, Vec } from '../types';
import type { Enemy } from './Enemy';

export interface CompanionHost {
  readonly scene: Phaser.Scene;
  playerPos(): Vec;
  /** The nearest enemy Morty could fight within `range` of a point (in line of sight). */
  nearestEnemy(from: Vec, range: number): Enemy | null;
  /** Hostile enemies (for contact checks). */
  targets(): Enemy[];
  /** Fires a player-side shot from a companion. */
  shoot(from: Vec, angle: number, damage: number, color: number): void;
  hit(enemy: Enemy, damage: number, source: 'companion' | 'orbit', angle: number): void;
  /** Removes enemy bullets within `radius` of a point; returns how many. */
  eatShots(at: Vec, radius: number): number;
  /** Morty's current shot damage (companions scale with it). */
  shotDamage(): number;
  /** Multiplier on how often companions act (companionRate). */
  rate(): number;
  sfx(id: string): void;
  burst(style: 'spark' | 'hit' | 'slime', x: number, y: number, count: number): void;
}

export class Companion {
  readonly img: Phaser.GameObjects.Image;
  private readonly shadow: Phaser.GameObjects.Ellipse;
  private x: number;
  private y: number;
  private cooldown: number;
  private t = 0;
  private pounce: { from: Vec; target: Enemy; t: number; hit: boolean } | null = null;

  constructor(
    private readonly host: CompanionHost,
    readonly itemId: ContentId,
    readonly spec: CompanionSpec,
    private readonly index: number,
  ) {
    const p = host.playerPos();
    this.x = p.x + this.offset().x;
    this.y = p.y + this.offset().y;
    this.cooldown = spec.every * 0.5;
    this.shadow = host.scene.add.ellipse(this.x, this.y + 14, 26, 8, 0x000000, 0.22).setDepth(-400);
    this.img = host.scene.add.image(this.x, this.y, spec.art).setDepth(this.y);
  }

  /** Where it hangs around, relative to Morty: alternate sides, a step behind. */
  private offset(): Vec {
    const side = this.index % 2 === 0 ? -1 : 1;
    const row = Math.floor(this.index / 2);
    return { x: side * (46 + row * 26), y: this.spec.flying ? -34 - row * 10 : 14 + row * 18 };
  }

  /** Puts it back next to Morty (entering a room). */
  reposition(): void {
    const p = this.host.playerPos();
    const o = this.offset();
    this.x = p.x + o.x;
    this.y = p.y + o.y;
    this.pounce = null;
    this.sync(0);
  }

  update(dt: number): void {
    this.t += dt;
    const host = this.host;
    const p = host.playerPos();
    if (this.spec.kind === 'guard') {
      // Circles Morty and eats whatever bullets it touches.
      const a = this.t * 2.4 + this.index * 2.1;
      this.x = p.x + Math.cos(a) * 58;
      this.y = p.y + Math.sin(a) * 40 - 8;
      if (host.eatShots({ x: this.x, y: this.y }, 20) > 0) host.burst('spark', this.x, this.y, 4);
      this.sync(dt);
      return;
    }
    if (this.pounce) {
      this.updatePounce(dt);
      this.sync(dt);
      return;
    }
    const o = this.offset();
    const k = 1 - Math.exp(-dt * 6);
    this.x += (p.x + o.x - this.x) * k;
    this.y += (p.y + o.y - this.y) * k;
    this.cooldown -= dt * host.rate();
    if (this.cooldown <= 0) this.act();
    this.sync(dt);
  }

  private act(): void {
    const host = this.host;
    const me = { x: this.x, y: this.y };
    if (this.spec.kind === 'shooter') {
      const target = host.nearestEnemy(me, 460);
      if (!target) {
        this.cooldown = 0.25;
        return;
      }
      host.shoot(me, Math.atan2(target.y - this.y, target.x - this.x), host.shotDamage() * this.spec.damage, 0xffe27a);
      this.cooldown = this.spec.every;
      return;
    }
    // Pouncer: leaps at something close.
    const target = host.nearestEnemy(me, 280);
    if (!target) {
      this.cooldown = 0.25;
      return;
    }
    this.pounce = { from: me, target, t: 0, hit: false };
    host.sfx('hop');
    this.cooldown = this.spec.every;
  }

  private updatePounce(dt: number): void {
    const pn = this.pounce!;
    const host = this.host;
    pn.t += dt;
    const leap = 0.28;
    const back = 0.32;
    if (pn.t <= leap) {
      const k = pn.t / leap;
      const tx = pn.target.alive ? pn.target.x : this.x;
      const ty = pn.target.alive ? pn.target.y : this.y;
      this.x = pn.from.x + (tx - pn.from.x) * k;
      this.y = pn.from.y + (ty - pn.from.y) * k - Math.sin(Math.PI * k) * 40;
      return;
    }
    if (!pn.hit) {
      pn.hit = true;
      if (pn.target.alive) {
        host.hit(pn.target, host.shotDamage() * this.spec.damage, 'companion', Math.atan2(pn.target.y - pn.from.y, pn.target.x - pn.from.x));
        host.burst('hit', this.x, this.y, 6);
      }
      pn.from = { x: this.x, y: this.y };
    }
    const k = Math.min(1, (pn.t - leap) / back);
    const p = host.playerPos();
    const o = this.offset();
    this.x = pn.from.x + (p.x + o.x - pn.from.x) * k;
    this.y = pn.from.y + (p.y + o.y - pn.from.y) * k;
    if (k >= 1) this.pounce = null;
  }

  private sync(_dt: number): void {
    const bob = this.spec.flying ? Math.sin(this.t * 5 + this.index) * 4 : 0;
    this.img.setPosition(this.x, this.y + bob).setDepth(this.y + (this.spec.flying ? 40 : 0));
    this.img.setFlipX(this.host.playerPos().x < this.x);
    this.shadow.setPosition(this.x, this.y + (this.spec.flying ? 30 : 14)).setVisible(true);
  }

  destroy(): void {
    this.img.destroy();
    this.shadow.destroy();
  }
}

/** The `orbit` stat: pieces of junk circling Morty that bonk enemies and block enemy bullets. */
export class Orbiters {
  private readonly pieces: Phaser.GameObjects.Image[] = [];
  private angle = 0;
  /** Per-enemy cooldown so one piece doesn't hit the same enemy every frame. */
  private readonly lastHit = new Map<number, number>();
  private t = 0;

  constructor(private readonly host: CompanionHost) {}

  update(dt: number, count: number): void {
    const n = Math.max(0, Math.round(count));
    while (this.pieces.length < n) this.pieces.push(this.host.scene.add.image(0, 0, 'orbit-junk'));
    while (this.pieces.length > n) this.pieces.pop()!.destroy();
    if (!n) return;
    this.t += dt;
    this.angle += dt * SHOTS.orbitSpeed;
    const p = this.host.playerPos();
    const targets = this.host.targets();
    this.pieces.forEach((img, i) => {
      const a = this.angle + (i / n) * Math.PI * 2;
      const x = p.x + Math.cos(a) * SHOTS.orbitRadius;
      const y = p.y - 10 + Math.sin(a) * SHOTS.orbitRadius * 0.75;
      img.setPosition(x, y).setDepth(y + 1).setAngle(this.t * 400 + i * 90);
      if (this.host.eatShots({ x, y }, 16) > 0) this.host.burst('spark', x, y, 3);
      for (const e of targets) {
        if (Math.hypot(e.x - x, e.y - y) > e.radius + 12) continue;
        const last = this.lastHit.get(e.uid) ?? -99;
        if (this.t - last < SHOTS.orbitCooldown) continue;
        this.lastHit.set(e.uid, this.t);
        this.host.hit(e, this.host.shotDamage() * SHOTS.orbitDamage, 'orbit', a + Math.PI / 2);
      }
    });
  }

  destroy(): void {
    this.pieces.forEach((p) => p.destroy());
    this.pieces.length = 0;
    this.lastHit.clear();
  }
}
