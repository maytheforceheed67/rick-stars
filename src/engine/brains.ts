/**
 * Reusable enemy behavior archetypes. Content builds enemies by calling these with parameters,
 * or by writing its own brain with the same EnemyApi. Every attack is telegraphed via
 * api.windup (never shorter than 0.4 s).
 */
import type { Brain, EnemyApi, EnemyShotSpec, TelegraphSpec } from './types';

/** Runs `fn` every frame for `seconds`. */
export function* during(api: EnemyApi, seconds: number, fn: (t: number) => void): Brain {
  let t = 0;
  while (t < seconds) {
    fn(t);
    t += api.dt();
    yield;
  }
}

export interface ChaserOpts {
  speed?: number;
  /** Seconds between lunges (0 = never). */
  lungeEvery?: number;
  lungeMult?: number;
  lungeTime?: number;
  windup?: number;
}

/** Walks at the player; optionally lunges after a telegraphed wind-up. */
export function* chaser(api: EnemyApi, o: ChaserOpts = {}): Brain {
  let next = o.lungeEvery ? api.rng.float(o.lungeEvery * 0.5, o.lungeEvery) : Infinity;
  while (true) {
    api.chase(o.speed ?? 1);
    next -= api.dt();
    if (next <= 0 && api.distToPlayer() < 260) {
      api.stop();
      let angle = api.angleToPlayer();
      yield* api.windup(o.windup ?? 0.45, () => {
        angle = api.angleToPlayer();
        return { kind: 'line', x: api.self.x, y: api.self.y, angle, length: 170, width: api.self.radius * 2 };
      });
      yield* during(api, o.lungeTime ?? 0.28, () => api.moveAngle(angle, o.lungeMult ?? 3.2));
      api.stop();
      yield 0.25;
      next = o.lungeEvery ?? Infinity;
    }
    yield;
  }
}

export interface ShooterOpts {
  min: number;
  max: number;
  cooldown: number;
  windup: number;
  move?: number;
  /** Builds the shot at fire time. */
  shot(api: EnemyApi): EnemyShotSpec;
  telegraph?(api: EnemyApi): TelegraphSpec;
}

/** Keeps its distance, strafes, and fires telegraphed shots when it can see the player. */
export function* shooter(api: EnemyApi, o: ShooterOpts): Brain {
  let t = api.rng.float(0.6, o.cooldown);
  while (true) {
    api.keepDistance(o.min, o.max, o.move ?? 1);
    t -= api.dt();
    if (t <= 0 && api.distToPlayer() < o.max + 220 && api.canSeePlayer()) {
      api.stop();
      yield* api.windup(
        o.windup,
        o.telegraph ? () => o.telegraph!(api) : () => ({ kind: 'line', x: api.self.x, y: api.self.y, angle: api.angleToPlayer(), length: 150, width: 12 }),
      );
      api.shoot(o.shot(api));
      t = o.cooldown * api.rng.float(0.85, 1.15);
    }
    yield;
  }
}

export interface ChargerOpts {
  windup: number;
  /** Speed multiplier while charging. */
  chargeMult: number;
  chargeTime: number;
  rest: number;
  approach?: number;
  onCharge?(api: EnemyApi): void;
}

/** Sizes up the player, telegraphs a line, then barrels along it. */
export function* charger(api: EnemyApi, o: ChargerOpts): Brain {
  while (true) {
    yield* during(api, api.rng.float(0.7, 1.4), () => api.chase(o.approach ?? 0.6));
    api.stop();
    let angle = api.angleToPlayer();
    const length = api.self.def.speed * o.chargeMult * o.chargeTime;
    yield* api.windup(o.windup, () => {
      angle = api.angleToPlayer();
      return { kind: 'line', x: api.self.x, y: api.self.y, angle, length, width: api.self.radius * 2 };
    });
    let t = 0;
    while (t < o.chargeTime) {
      api.moveAngle(angle, o.chargeMult);
      o.onCharge?.(api);
      t += api.dt();
      if (t > 0.06 && api.self.blocked) break;
      yield;
    }
    api.stop();
    yield o.rest;
  }
}

export interface SwarmerOpts {
  wobble?: number;
  freq?: number;
  speed?: number;
}

/** Zig-zags straight at the player. */
export function* swarmer(api: EnemyApi, o: SwarmerOpts = {}): Brain {
  const phase = api.rng.float(0, Math.PI * 2);
  let t = 0;
  while (true) {
    t += api.dt();
    api.moveAngle(api.angleToPlayer() + Math.sin(t * (o.freq ?? 5) + phase) * (o.wobble ?? 0.7), o.speed ?? 1);
    yield;
  }
}

/** Stands still (used by harmless targets and calm NPCs). */
export function* idle(api: EnemyApi): Brain {
  while (true) {
    api.stop();
    yield;
  }
}
