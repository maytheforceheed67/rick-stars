/**
 * How Morty walks: a snappy ramp up to full speed, a quick stop with no drifting, a hard brake
 * when he turns around, and the same speed on diagonals as on straight lines. Pure math so the
 * tests can hold it to the numbers in FEEL.move.
 */
import { FEEL } from '../../content/balance';
import type { Vec } from '../types';

export interface MoveTuning {
  startSeconds: number;
  stopSeconds: number;
  turnSeconds: number;
}

/** Where the input points, never faster than full speed on a diagonal. */
export function inputDirection(x: number, y: number): Vec {
  const len = Math.hypot(x, y);
  return len > 1 ? { x: x / len, y: y / len } : { x, y };
}

/**
 * One frame of walking: the new velocity, from the old one, the input direction (length up to 1)
 * and this moment's top speed (sneaking, a slow floor or a slowing status lower it; the feel
 * stays as snappy because every ramp is timed against the top speed).
 */
export function stepWalk(v: Vec, input: Vec, top: number, dt: number, t: MoveTuning = FEEL.move): Vec {
  const len = Math.hypot(input.x, input.y);
  const speed = Math.hypot(v.x, v.y);
  if (len < 1e-6 || top <= 0) {
    // Stopping: straight to rest, whatever speed he's at.
    const brake = (Math.max(top, 1) / t.stopSeconds) * dt;
    if (speed <= brake) return { x: 0, y: 0 };
    return { x: v.x - (v.x / speed) * brake, y: v.y - (v.y / speed) * brake };
  }
  const dx = input.x / len;
  const dy = input.y / len;
  const want = top * Math.min(1, len);
  // Split the velocity into along the input and across it.
  let along = v.x * dx + v.y * dy;
  let acrossX = v.x - along * dx;
  let acrossY = v.y - along * dy;
  const turn = (top / t.turnSeconds) * dt;
  if (along < 0) along = Math.min(0, along + turn);
  else if (along < want) along = Math.min(want, along + (top / t.startSeconds) * dt);
  else along = Math.max(want, along - (top / t.stopSeconds) * dt);
  // Sideways speed from before a turn dies off as hard as a reversal.
  const across = Math.hypot(acrossX, acrossY);
  if (across <= turn) {
    acrossX = 0;
    acrossY = 0;
  } else {
    acrossX -= (acrossX / across) * turn;
    acrossY -= (acrossY / across) * turn;
  }
  return { x: along * dx + acrossX, y: along * dy + acrossY };
}

/**
 * The walk cycle, timed to how far he's actually gone: one bob per step (two per stride), and a
 * foot up in the middle of each step, left and right in turn.
 */
export class WalkCycle {
  /** Steps taken, counting the part-way one. */
  phase = 0;

  /** Moves the cycle on by this much ground covered. */
  advance(distance: number, stepLength = FEEL.move.stepLength): void {
    this.phase += distance / stepLength;
  }

  /** Which foot is up (-1 left, 1 right) or both down (0). */
  get stride(): -1 | 0 | 1 {
    const s = Math.sin(Math.PI * (this.phase % 1));
    if (s < 0.5) return 0;
    return Math.floor(this.phase) % 2 === 0 ? 1 : -1;
  }

  /** How far up the body is this moment (px, up is negative), peaking mid-step. */
  bob(px = FEEL.move.bobPx, limp = false): number {
    const up = Math.abs(Math.sin(Math.PI * this.phase));
    // A limp: every other step drops instead of rising.
    if (limp && Math.floor(this.phase) % 2 === 1) return px * 0.8 * up;
    return -px * up;
  }

  /** Steps completed, for things that happen every few steps (dust). */
  get steps(): number {
    return Math.floor(this.phase);
  }

  reset(): void {
    this.phase = 0;
  }
}
