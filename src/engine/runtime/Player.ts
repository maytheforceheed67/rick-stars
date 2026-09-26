/**
 * The playable character: movement, dashing (with invulnerability), aiming, firing cadence,
 * knockback and falling. The run scene owns health and decides what firing actually does.
 */
import Phaser from 'phaser';
import { PLAYER } from '../../content/balance';
import { TEXTURE_PAD } from '../art/textures';
import type { StatBlock } from '../effects/stats';
import type { Rng } from '../rng';
import type { Settings } from '../save/save';
import type { PlayerRef, StatusFlags, TileKind } from '../types';

export interface PlayerInput {
  moveX: number;
  moveY: number;
  /** World point to aim at. */
  aimX: number;
  aimY: number;
  fire: boolean;
  /** Dash pressed this frame. */
  dash: boolean;
  sneak: boolean;
}

export interface PlayerHost {
  stats(): StatBlock;
  flags(): StatusFlags;
  tileUnderPlayer(): TileKind;
  /** False until the story hands Morty something to fight with. */
  armed(): boolean;
  onFire(angle: number): void;
  onDash(): void;
  damagePlayer(halves: number, source: string, opts?: { ignoreInvulnerability?: boolean }): void;
  healPlayer(halves: number): void;
  hp(): number;
  maxHp(): number;
  settings(): Settings;
  readonly rng: Rng;
  godMode(): boolean;
}

export class Player implements PlayerRef {
  readonly sprite: Phaser.Physics.Arcade.Sprite;
  private readonly shadow: Phaser.GameObjects.Image;
  readonly radius = PLAYER.bodyRadius;
  aimAngle = 0;
  moving = false;
  sneaking = false;
  dashLeft = 0;
  dashCooldown = 0;
  private dashVx = 0;
  private dashVy = 0;
  iframes = 0;
  knockVx = 0;
  knockVy = 0;
  fireCooldown = 0;
  falling = 0;
  private fallDone: (() => void) | null = null;
  private locked = false;
  /** Enemies already touched during the current dash. */
  readonly dashHits = new Set<number>();
  /** Seconds since the current dash started. */
  dashAge = Infinity;
  /** Each dash can earn one perfect dodge. */
  perfectUsed = false;
  private scrambleTimer = 0;
  private scrambleMode = 0;
  private ghostTimer = 0;
  private t = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly host: PlayerHost,
    texture: string,
    x: number,
    y: number,
  ) {
    this.shadow = scene.add.image(x, y, 'shadow').setDepth(-400).setScale(0.8);
    this.sprite = scene.physics.add.sprite(x, y, texture);
    this.applyTexture(texture);
  }

  private applyTexture(texture: string): void {
    const s = this.sprite;
    s.setTexture(texture);
    const fw = s.frame.width;
    const fh = s.frame.height;
    const artH = fh - TEXTURE_PAD * 2;
    const centerY = TEXTURE_PAD + artH - this.radius * 0.9;
    s.setOrigin(0.5, centerY / fh);
    (s.body as Phaser.Physics.Arcade.Body).setCircle(this.radius, fw / 2 - this.radius, centerY - this.radius);
  }

  setTexture(texture: string): void {
    this.applyTexture(texture);
  }

  // ---- PlayerRef --------------------------------------------------------------------------------

  get x(): number {
    return this.sprite.x;
  }
  get y(): number {
    return this.sprite.y;
  }
  get hp(): number {
    return this.host.hp();
  }
  get maxHp(): number {
    return this.host.maxHp();
  }
  get isDashing(): boolean {
    return this.dashLeft > 0;
  }
  get isInvulnerable(): boolean {
    return this.iframes > 0 || this.falling > 0 || this.host.godMode();
  }
  get controlLocked(): boolean {
    return this.locked;
  }
  /** True right after a dash starts: an attack landing now is a perfect dodge. */
  get inPerfectWindow(): boolean {
    return !this.perfectUsed && this.dashAge <= PLAYER.perfectDodgeWindow;
  }

  heal(halves: number): void {
    this.host.healPlayer(halves);
  }

  damage(halves: number, source: string, opts?: { ignoreInvulnerability?: boolean }): void {
    this.host.damagePlayer(halves, source, opts);
  }

  knockback(angle: number, force: number): void {
    this.knockVx += Math.cos(angle) * force;
    this.knockVy += Math.sin(angle) * force;
  }

  setPosition(x: number, y: number): void {
    this.sprite.setPosition(x, y);
    (this.sprite.body as Phaser.Physics.Arcade.Body).reset(x, y);
    this.shadow.setPosition(x, y + 4);
    this.knockVx = 0;
    this.knockVy = 0;
  }

  setControlLocked(locked: boolean): void {
    this.locked = locked;
  }

  /** Plays the fall animation, then calls onDone (the scene moves Morty back to safe ground). */
  startFall(onDone: () => void): void {
    this.falling = PLAYER.fallTime;
    this.fallDone = onDone;
    this.dashLeft = 0;
    (this.sprite.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
  }

  // ---- per frame ----------------------------------------------------------------------------------

  update(dt: number, input: PlayerInput): void {
    this.t += dt;
    this.iframes = Math.max(0, this.iframes - dt);
    this.dashCooldown = Math.max(0, this.dashCooldown - dt);
    this.fireCooldown = Math.max(0, this.fireCooldown - dt);
    this.dashAge += dt;
    const decay = Math.exp(-dt * 10);
    this.knockVx *= decay;
    this.knockVy *= decay;
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    const reduced = this.host.settings().reducedFlash;

    if (this.falling > 0) {
      this.falling -= dt;
      const k = Math.max(0.05, this.falling / PLAYER.fallTime);
      this.sprite.setScale(k).setAngle(this.sprite.angle + 540 * dt).setAlpha(0.4 + 0.6 * k);
      body.setVelocity(0, 0);
      this.shadow.setScale(0.8 * k);
      if (this.falling <= 0) {
        this.falling = 0;
        this.sprite.setScale(1).setAngle(0).setAlpha(1);
        this.shadow.setScale(0.8);
        const done = this.fallDone;
        this.fallDone = null;
        done?.();
      }
      return;
    }

    const stats = this.host.stats();
    const flags = this.host.flags();
    let mx = this.locked ? 0 : input.moveX;
    let my = this.locked ? 0 : input.moveY;
    if (flags.scrambled && !this.locked) {
      this.scrambleTimer -= dt;
      if (this.scrambleTimer <= 0) {
        this.scrambleTimer = 0.35;
        this.scrambleMode = this.host.rng.int(0, 3);
      }
      if (this.scrambleMode === 1) [mx, my] = [my, mx];
      else if (this.scrambleMode === 2) [mx, my] = [-mx, -my];
      else if (this.scrambleMode === 3) [mx, my] = [0, 0];
    }
    const len = Math.hypot(mx, my);
    if (len > 1) {
      mx /= len;
      my /= len;
    }
    if (flags.wobblyMove && len > 0) {
      const a = Math.sin(this.t * 3.1) * 0.7;
      [mx, my] = [mx * Math.cos(a) - my * Math.sin(a), mx * Math.sin(a) + my * Math.cos(a)];
    }
    this.moving = len > 0.1;
    this.sneaking = input.sneak && !this.locked;

    if (input.dash && !this.locked && !flags.noDash && this.dashCooldown <= 0 && this.dashLeft <= 0) {
      let dx = mx;
      let dy = my;
      if (!this.moving) {
        dx = Math.cos(this.aimAngle);
        dy = Math.sin(this.aimAngle);
      }
      const dl = Math.hypot(dx, dy) || 1;
      this.dashLeft = stats.dashDuration;
      this.dashVx = (dx / dl) * stats.dashSpeed;
      this.dashVy = (dy / dl) * stats.dashSpeed;
      this.iframes = Math.max(this.iframes, stats.dashIframes);
      this.dashCooldown = stats.dashCooldown;
      this.dashHits.clear();
      this.dashAge = 0;
      this.perfectUsed = false;
      this.host.onDash();
    }

    let vx: number;
    let vy: number;
    if (this.dashLeft > 0) {
      this.dashLeft -= dt;
      vx = this.dashVx;
      vy = this.dashVy;
      this.ghostTimer -= dt;
      if (this.ghostTimer <= 0) {
        this.ghostTimer = 0.035;
        this.ghost();
      }
    } else {
      const tile = this.host.tileUnderPlayer();
      const speed = stats.moveSpeed * (this.sneaking ? PLAYER.sneakSpeedMult : 1) * (tile === 'slow' ? PLAYER.slowTileMult : 1);
      vx = mx * speed;
      vy = my * speed;
    }
    body.setVelocity(vx + this.knockVx, vy + this.knockVy);

    if (!this.locked) {
      this.aimAngle = Math.atan2(input.aimY - this.sprite.y, input.aimX - this.sprite.x);
      if (flags.wobblyAim) this.aimAngle += Math.sin(this.t * 4.3) * 0.35 + Math.sin(this.t * 9.7) * 0.12;
      if (input.fire && this.fireCooldown <= 0 && this.host.armed()) {
        this.fireCooldown = 1 / Math.max(0.1, stats.fireRate);
        this.host.onFire(this.aimAngle);
      }
    }

    // Visuals
    const s = this.sprite;
    s.setDepth(s.y);
    s.setFlipX(Math.cos(this.aimAngle) < 0);
    if (this.dashLeft > 0) s.setAngle(this.dashVx >= 0 ? 14 : -14);
    else s.setAngle(this.moving ? Math.sin(this.t * (this.sneaking ? 9 : 18)) * 5 : 0);
    if (this.iframes > 0 && this.dashLeft <= 0) {
      s.setAlpha(reduced ? 0.55 + 0.25 * Math.sin(this.t * 10) : Math.sin(this.t * 45) > 0 ? 1 : 0.3);
    } else {
      s.setAlpha(this.sneaking ? 0.75 : 1);
    }
    this.shadow.setPosition(s.x, s.y + 4);
  }

  private ghost(): void {
    const s = this.sprite;
    const g = this.scene.add
      .image(s.x, s.y, s.texture.key)
      .setOrigin(s.originX, s.originY)
      .setFlipX(s.flipX)
      .setAngle(s.angle)
      .setDepth(s.depth - 1)
      .setAlpha(0.45)
      .setTint(0x9fdcff);
    this.scene.tweens.add({ targets: g, alpha: 0, duration: 220, onComplete: () => g.destroy() });
  }

  destroy(): void {
    this.shadow.destroy();
    this.sprite.destroy();
  }
}
