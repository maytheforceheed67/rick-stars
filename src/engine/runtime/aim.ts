/**
 * Where a held weapon is and where its shots leave from: every shot starts at the weapon, never
 * in the middle of Morty. Pure math, so the tests can check it without Phaser.
 *
 * The weapon hangs off an arm from the shoulder on the aim's side. A held sprite is drawn
 * pointing right; aiming left, it's flipped vertically so it's never upside down, which is why
 * every "across" offset flips sign with the side.
 */
import { FEEL } from '../../content/balance';
import type { Vec, WeaponSpec } from '../types';

export type Side = 1 | -1;

/** A character's shoulder (right side, from the body's center) plus a weapon's anchors. */
export interface Hold {
  shoulder: Vec;
  grip: Vec;
  muzzle: Vec;
}

/**
 * Where everything is drawn. The weapon is held at chest height: a point drawn at (x, y) is over
 * the floor at (x, y + lift), which is where its shots collide (walls, enemies), like a shadow.
 */
export interface RigPose {
  /** Which side of the body the weapon is on: the aim's side. */
  side: Side;
  /** Aim angle, from the shoulder. */
  angle: number;
  shoulder: Vec;
  hand: Vec;
  muzzle: Vec;
  /** How high above the floor the weapon is held. */
  lift: number;
}

/** A weapon's anchors on a character, with the defaults filled in. */
export function holdFor(shoulder: Vec, weapon: WeaponSpec | undefined): Hold {
  const release = weapon?.style === 'thrown' ? FEEL.weapon.throwRelease : FEEL.weapon.muzzle;
  return { shoulder, grip: weapon?.grip ?? FEEL.weapon.grip, muzzle: weapon?.muzzle ?? release };
}

/** The aim's side of the body, holding the current side through a dead zone around straight up and down. */
export function aimSide(angle: number, current: Side, deadZone = FEEL.weapon.sideDeadZone): Side {
  const c = Math.cos(angle);
  if (c > deadZone) return 1;
  if (c < -deadZone) return -1;
  return current;
}

/** `v` in the aim's frame (along it, across it), turned to world space. */
function along(angle: number, side: Side, v: Vec): Vec {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const y = v.y * side;
  return { x: v.x * c - y * s, y: v.x * s + y * c };
}

/**
 * Where everything is for a body at `body` aiming at a world point (or along an angle, for the
 * arrow keys). The angle is taken from the shoulder, so a gun's barrel points right at the cursor.
 */
export function rigPose(body: Vec, aim: Vec | number, hold: Hold, current: Side): RigPose {
  const chest = { x: body.x, y: body.y + hold.shoulder.y };
  const rough = typeof aim === 'number' ? aim : Math.atan2(aim.y - chest.y, aim.x - chest.x);
  const side = aimSide(rough, current);
  const shoulder = { x: body.x + hold.shoulder.x * side, y: body.y + hold.shoulder.y };
  const angle = typeof aim === 'number' ? aim : Math.atan2(aim.y - shoulder.y, aim.x - shoulder.x);
  const g = along(angle, side, hold.grip);
  const hand = { x: shoulder.x + g.x, y: shoulder.y + g.y };
  const m = along(angle, side, hold.muzzle);
  return { side, angle, shoulder, hand, muzzle: { x: hand.x + m.x, y: hand.y + m.y }, lift: Math.max(0, -hold.shoulder.y) };
}

/**
 * Walks from inside the body out to the muzzle. If a wall is in the way, the shot pops against
 * it right there instead of starting on the other side.
 */
export function clearMuzzle(from: Vec, to: Vec, solid: (x: number, y: number) => boolean, step = 3): { at: Vec; blocked: boolean } {
  const d = Math.hypot(to.x - from.x, to.y - from.y);
  const n = Math.max(1, Math.ceil(d / step));
  let last = from;
  for (let i = 1; i <= n; i++) {
    const p = { x: from.x + ((to.x - from.x) * i) / n, y: from.y + ((to.y - from.y) * i) / n };
    if (solid(p.x, p.y)) return { at: last, blocked: true };
    last = p;
  }
  return { at: to, blocked: false };
}

/**
 * When the trigger fires. A press fires the same frame if the weapon is ready. A press while it's
 * cooling down is held and fires the moment it's ready, so a click is never lost; a press when he
 * can't fire for some other reason (mid hit-stop, say) is held for FEEL.weapon.fireBuffer. Holding
 * the button fires at the weapon's rate from the first frame.
 */
export class FireGate {
  /** Seconds until the weapon can fire again. */
  cooldown = 0;
  /** Seconds a buffered press has left. */
  buffered = 0;

  constructor(private readonly bufferSeconds = FEEL.weapon.fireBuffer) {}

  /**
   * Advances one frame. `pressed`: the button went down since last frame; `held`: it's down now;
   * `interval`: seconds between shots; `canFire`: armed and free to act. Returns true to fire now.
   */
  step(dt: number, pressed: boolean, held: boolean, interval: number, canFire: boolean): boolean {
    this.cooldown -= dt;
    // Held at least until the weapon's ready again.
    if (pressed) this.buffered = Math.max(this.bufferSeconds, this.cooldown + dt);
    if ((held || this.buffered > 0) && this.cooldown <= 0 && canFire) {
      // Carry at most a frame of overshoot, so holding fires at a steady rate.
      this.cooldown = Math.max(this.cooldown, -dt) + interval;
      this.buffered = 0;
      return true;
    }
    this.buffered = Math.max(0, this.buffered - dt);
    if (this.cooldown < 0) this.cooldown = 0;
    return false;
  }

  reset(): void {
    this.cooldown = 0;
    this.buffered = 0;
  }
}
