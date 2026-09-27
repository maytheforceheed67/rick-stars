/**
 * The playable character: movement, dashing (with invulnerability), aiming, firing cadence,
 * knockback and falling. The run scene owns health and decides what firing actually does.
 *
 * Two objects make up the character. `sprite` is the physics body (invisible); `view` is what
 * you see, drawn on top of it with its own bob, lean and nudges so the look never pushes the
 * body around. Tweens on `sprite` (scale, angle, alpha) show on the view too.
 */
import Phaser from 'phaser';
import { FEEL, PLAYER } from '../../content/balance';
import { poseKey, TEXTURE_PAD } from '../art/textures';
import type { StatBlock } from '../effects/stats';
import type { Rng } from '../rng';
import type { Settings } from '../save/save';
import type { PlayerRef, StatusFlags, TileKind, Vec } from '../types';
import { FireGate, type RigPose } from './aim';
import { blinkTint } from './flashes';
import { HeldWeapon } from './HeldWeapon';
import { inputDirection, stepWalk, WalkCycle } from './motion';

/** Top speed of a knockback, in pixels per second. */
const MAX_KNOCK = 900;
/** He keeps facing where he shot for this long after the last shot. */
const FACE_AIM_AFTER_SHOT = 0.4;

export interface PlayerInput {
  moveX: number;
  moveY: number;
  /** World point to aim at. */
  aimX: number;
  aimY: number;
  /** Aiming with the arrow keys: an exact direction instead of a point. */
  aimAngle?: number;
  /** Fire is held down. */
  fire: boolean;
  /** Fire went down since the last frame (a click is never lost, even a quick one). */
  firePressed: boolean;
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
  damagePlayer(halves: number, source: string, opts?: { ignoreInvulnerability?: boolean }): boolean;
  healPlayer(halves: number): void;
  hp(): number;
  maxHp(): number;
  settings(): Settings;
  readonly rng: Rng;
  godMode(): boolean;
  /** Game seconds this frame (slow motion included). */
  frameDt(): number;
  /** Whether this floor kicks up dust as he walks (grass, dirt, streets). */
  floorDusty(): boolean;
  /** A little puff of dust at his feet. */
  dust(x: number, y: number, size: number): void;
}

export class Player implements PlayerRef {
  /** The physics body. Invisible: `view` is what you see. */
  readonly sprite: Phaser.Physics.Arcade.Sprite;
  /** What you see of him. */
  readonly view: Phaser.GameObjects.Image;
  /** The weapon in his hand. */
  readonly held: HeldWeapon;
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
  private readonly gate = new FireGate();
  /** The character's texture (poses are baked from it). */
  private baseKey = '';
  private posed = false;
  /** Which way he faces (the view is flipped when true). */
  faceLeft = false;
  private sinceShot = Infinity;
  /** What he's aiming at this frame: a world point, or a direction (arrow keys). */
  private aim: Vec | number = 0;
  /** Visual-only offsets: a nudge back when he fires. */
  private nudgeX = 0;
  private nudgeY = 0;
  /** His walking velocity (knockback and dashes come on top of it). */
  private walkVx = 0;
  private walkVy = 0;
  private readonly walk = new WalkCycle();
  /** A squash or stretch that springs back (fractions of his width and height). */
  private squashX = 0;
  private squashY = 0;
  private topSpeed = 1;
  private wasMoving = false;
  private dustSteps = 0;
  private turnDust = 0;
  private limping = false;
  /** How far a scene walked him since his view was last drawn (see walkTo). */
  private sceneDx = 0;
  private sceneDy = 0;
  /** The blink after a hit: seconds left, and how far into it he is. */
  private blinkLeft = 0;
  private blinkT = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly host: PlayerHost,
    texture: string,
    x: number,
    y: number,
  ) {
    this.shadow = scene.add.image(x, y, 'shadow').setDepth(-400).setScale(0.8);
    this.sprite = scene.physics.add.sprite(x, y, texture).setVisible(false);
    this.view = scene.add.image(x, y, texture);
    this.held = new HeldWeapon(scene);
    this.applyTexture(texture);
    // Drawn after physics has moved the body this frame, so the look never lags behind it.
    scene.events.on(Phaser.Scenes.Events.POST_UPDATE, this.syncView, this);
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
    this.baseKey = texture;
    this.posed = this.scene.textures.exists(poseKey(texture, 1, 0));
    this.view.setTexture(texture).setOrigin(0.5, centerY / fh);
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
  /** Seconds until the weapon can fire again. */
  get fireCooldown(): number {
    return this.gate.cooldown;
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
    // However the shoves pile up, never fast enough to punch through a wall.
    const k = Math.hypot(this.knockVx, this.knockVy);
    if (k > MAX_KNOCK) {
      this.knockVx *= MAX_KNOCK / k;
      this.knockVy *= MAX_KNOCK / k;
    }
  }

  setPosition(x: number, y: number): void {
    this.sprite.setPosition(x, y);
    (this.sprite.body as Phaser.Physics.Arcade.Body).reset(x, y);
    this.shadow.setPosition(x, y + 4);
    this.knockVx = 0;
    this.knockVy = 0;
    this.walkVx = 0;
    this.walkVy = 0;
    this.syncView();
  }

  /** He just got hurt: he blinks for as long as he can't be hurt again. */
  blink(seconds = PLAYER.hurtIframes): void {
    this.blinkLeft = seconds;
    this.blinkT = 0;
  }

  /** A scene walks him a step, to here: he isn't steering, but he walks the walk. */
  walkTo(x: number, y: number): void {
    this.sceneDx += x - this.sprite.x;
    this.sceneDy += y - this.sprite.y;
    this.sprite.setPosition(x, y);
    (this.sprite.body as Phaser.Physics.Arcade.Body).reset(x, y);
    this.shadow.setPosition(x, y + 4);
    this.knockVx = 0;
    this.knockVy = 0;
    this.walkVx = 0;
    this.walkVy = 0;
  }

  setControlLocked(locked: boolean): void {
    this.locked = locked;
  }

  /** Turns him to face left or right (a scene turning him toward someone). */
  face(left: boolean): void {
    this.faceLeft = left;
    this.aimAngle = left ? Math.PI : 0;
    this.aim = this.aimAngle;
  }

  /** Plays the fall animation, then calls onDone (the scene moves Morty back to safe ground). */
  startFall(onDone: () => void): void {
    this.falling = PLAYER.fallTime;
    this.fallDone = onDone;
    this.dashLeft = 0;
    this.walkVx = 0;
    this.walkVy = 0;
    (this.sprite.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
  }

  /** A squash (landing, stopping) or stretch (launching) that springs back. */
  private squash(x: number, y: number): void {
    this.squashX = x;
    this.squashY = y;
  }

  /**
   * Where his weapon is right now, aiming the way he's aiming: the arm, the hand and the muzzle
   * shots leave from. Uses the body where physics has put it this frame.
   */
  rig(): RigPose {
    const b = this.sprite.body as Phaser.Physics.Arcade.Body;
    return this.held.poseAt({ x: b.center.x, y: b.center.y }, this.aim);
  }

  /** A shot just left: the weapon kicks, and his body gets a small nudge back. */
  recoil(angle: number, px: number): void {
    this.held.fire();
    this.nudgeX = -Math.cos(angle) * px;
    this.nudgeY = -Math.sin(angle) * px;
  }

  // ---- per frame ----------------------------------------------------------------------------------

  update(dt: number, input: PlayerInput): void {
    this.t += dt;
    this.sinceShot += dt;
    this.iframes = Math.max(0, this.iframes - dt);
    this.blinkLeft = Math.max(0, this.blinkLeft - dt);
    this.blinkT += dt;
    this.dashCooldown = Math.max(0, this.dashCooldown - dt);
    this.dashAge += dt;
    const decay = Math.exp(-dt * 10);
    this.knockVx *= decay;
    this.knockVy *= decay;
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;

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
        this.squash(FEEL.move.squash * 1.5, -FEEL.move.squash * 1.5);
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
    // Never faster on a diagonal.
    ({ x: mx, y: my } = inputDirection(mx, my));
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
      // Launching: stretched out along the dash.
      const M = FEEL.move;
      if (Math.abs(dx) >= Math.abs(dy)) this.squash(M.dashStretch, -M.dashStretch * 0.6);
      else this.squash(-M.dashStretch * 0.6, M.dashStretch);
      this.host.dust(this.sprite.x, this.sprite.y + 8, 1);
      this.host.onDash();
    }

    const tile = this.host.tileUnderPlayer();
    const top = stats.moveSpeed * (this.sneaking ? PLAYER.sneakSpeedMult : 1) * (tile === 'slow' ? PLAYER.slowTileMult : 1);
    this.topSpeed = top;
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
      if (this.dashLeft <= 0) {
        // Landing: carry on at walking pace the way he dashed, with a little squash.
        const d = Math.hypot(this.dashVx, this.dashVy) || 1;
        this.walkVx = (this.dashVx / d) * top;
        this.walkVy = (this.dashVy / d) * top;
        this.squash(FEEL.move.squash, -FEEL.move.squash);
      }
    } else {
      const before = { x: this.walkVx, y: this.walkVy };
      const v = stepWalk(before, { x: mx, y: my }, top, dt);
      this.walkVx = v.x;
      this.walkVy = v.y;
      vx = v.x;
      vy = v.y;
      this.kickUpDust(before, mx, my, top, dt);
    }
    body.setVelocity(vx + this.knockVx, vy + this.knockVy);

    if (!this.locked) {
      this.aim = input.aimAngle ?? { x: input.aimX, y: input.aimY };
      // Aim from the shoulder, so a gun's barrel points right at the cursor.
      this.aimAngle = this.rig().angle;
      if (flags.wobblyAim) {
        this.aimAngle += Math.sin(this.t * 4.3) * 0.35 + Math.sin(this.t * 9.7) * 0.12;
        this.aim = this.aimAngle;
      }
    }
    const interval = 1 / Math.max(0.1, stats.fireRate);
    const canFire = !this.locked && this.host.armed();
    if (this.gate.step(dt, input.firePressed && !this.locked, input.fire && !this.locked, interval, canFire)) {
      this.sinceShot = 0;
      this.host.onFire(this.aimAngle);
    }

    // Facing: toward the aim while shooting (and a moment after), otherwise where he's walking,
    // holding it through straight up and down so he doesn't flicker.
    const shooting = this.sinceShot < FACE_AIM_AFTER_SHOT;
    const c = Math.cos(this.aimAngle);
    if (shooting || !this.moving) {
      if (c < -0.2) this.faceLeft = true;
      else if (c > 0.2) this.faceLeft = false;
    } else if (Math.abs(this.walkVx) > 0.35 * Math.hypot(this.walkVx, this.walkVy)) {
      this.faceLeft = this.walkVx < 0;
    }
    this.limping = !!flags.limp;
  }

  /**
   * Dust at his feet when he sets off, pulls up or turns sharply, and every few steps on floors
   * with dust to kick up. Stopping squashes him a little.
   */
  private kickUpDust(before: Vec, mx: number, my: number, top: number, dt: number): void {
    this.turnDust = Math.max(0, this.turnDust - dt);
    const was = Math.hypot(before.x, before.y);
    const now = Math.hypot(this.walkVx, this.walkVy);
    const moving = now > top * 0.3;
    const x = this.sprite.x;
    const y = this.sprite.y + 9;
    if (moving && !this.wasMoving) this.host.dust(x - (this.walkVx / (now || 1)) * 8, y, 0.7);
    if (!moving && this.wasMoving && was > top * 0.6) {
      this.host.dust(x + (before.x / was) * 6, y, 0.8);
      this.squash(FEEL.move.squash, -FEEL.move.squash);
    }
    // A sharp turn: the input points well away from where he was going.
    const input = Math.hypot(mx, my);
    if (input > 0 && was > top * 0.5 && this.turnDust <= 0 && (before.x * mx + before.y * my) / (was * input) < -0.3) {
      this.turnDust = 0.2;
      this.host.dust(x, y, 0.9);
    }
    this.wasMoving = moving;
    if (moving && this.host.floorDusty() && this.walk.steps >= this.dustSteps + FEEL.move.dustEverySteps) {
      this.dustSteps = this.walk.steps;
      this.host.dust(x, y, 0.5);
    }
  }

  /** Puts the view (and the weapon in his hand) where the body is, with the look's offsets. */
  private syncView(): void {
    const s = this.sprite;
    const v = this.view;
    if (!v.active) return;
    const dt = this.host.frameDt();
    const k = Math.exp(-dt * 30);
    this.nudgeX *= k;
    this.nudgeY *= k;
    const M = FEEL.move;
    const armed = this.held.armed && this.falling <= 0;
    // The walk cycle keeps pace with how fast he's really walking (or a scene is walking him).
    const scripted = this.sceneDx !== 0 || this.sceneDy !== 0;
    const vx = scripted ? this.sceneDx / Math.max(dt, 1e-3) : this.walkVx;
    const vy = scripted ? this.sceneDy / Math.max(dt, 1e-3) : this.walkVy;
    this.sceneDx = 0;
    this.sceneDy = 0;
    const speed = Math.hypot(vx, vy);
    const walking = this.dashLeft <= 0 && speed > this.topSpeed * 0.15 && this.falling <= 0;
    if (walking) this.walk.advance(speed * dt);
    // The weapon's arm replaces the body's own arm on that side (in the drawing's left/right).
    const side = this.held.side;
    const freeArm = armed ? ((this.faceLeft ? -side : side) as -1 | 1) : 0;
    const stride = walking ? this.walk.stride : 0;
    const key = this.posed ? poseKey(this.baseKey, stride, freeArm) : this.baseKey;
    if (v.texture.key !== key && this.scene.textures.exists(key)) v.setTexture(key);
    // A squash or stretch springs back; standing still, he breathes.
    const spring = Math.exp(-dt / (M.squashSeconds / 3));
    this.squashX *= spring;
    this.squashY *= spring;
    const breath = !walking && this.dashLeft <= 0 ? Math.sin(this.t * Math.PI * 2 * M.breathRate) * M.breathe : 0;
    const bob = walking ? this.walk.bob(M.bobPx * Math.min(1, speed / Math.max(1, this.topSpeed)), this.limping) : 0;
    v.setPosition(s.x + this.nudgeX, s.y + this.nudgeY + bob)
      .setOrigin(s.originX, s.originY)
      .setScale(s.scaleX * (1 + this.squashX - breath * 0.5), s.scaleY * (1 + this.squashY + breath))
      .setFlipX(this.faceLeft)
      .setDepth(s.y);
    const reduced = this.host.settings().reducedFlash;
    let alpha = s.alpha;
    // Leaning into the way he's going (and hard into a dash).
    let lean = 0;
    if (this.dashLeft > 0) lean = this.dashVx >= 0 ? 14 : -14;
    else lean = M.leanDeg * Math.max(-1, Math.min(1, vx / Math.max(1, this.topSpeed)));
    if (this.sneaking) alpha *= 0.75;
    // After a hit he blinks: a bright red tint in turn with his own colors. Never see-through, so
    // you always know where you are.
    const blinking = this.blinkLeft > 0 && this.dashLeft <= 0 && this.falling <= 0;
    const tint = blinking ? blinkTint(this.blinkT, reduced) : 0xffffff;
    if (tint === 0xffffff) v.clearTint();
    else v.setTint(tint);
    v.setAngle(s.angle + lean).setAlpha(alpha);
    s.setDepth(s.y);
    this.shadow.setPosition(s.x, s.y + 4);
    const show = armed && s.scaleX > 0.9 && s.alpha > 0.6 && v.visible;
    this.held.update(dt, { x: v.x, y: v.y }, this.aim, show, alpha, v.depth);
  }

  private ghost(): void {
    const v = this.view;
    const g = this.scene.add
      .image(v.x, v.y, v.texture.key)
      .setOrigin(v.originX, v.originY)
      .setFlipX(v.flipX)
      .setAngle(v.angle)
      .setDepth(v.depth - 1)
      .setAlpha(0.45)
      .setTint(0x9fdcff);
    this.scene.tweens.add({ targets: g, alpha: 0, duration: 220, onComplete: () => g.destroy() });
  }

  destroy(): void {
    this.scene.events.off(Phaser.Scenes.Events.POST_UPDATE, this.syncView, this);
    this.held.destroy();
    this.shadow.destroy();
    this.view.destroy();
    this.sprite.destroy();
  }
}
