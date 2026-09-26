/**
 * Room hazards in the Pilot: school lockers that burst open, spilled cafeteria slop, crumbling
 * ledges in Dimension 35-C and scanner beams at Customs. All invented (canon: false). They can't
 * be hurt and go quiet once a room is cleared.
 */
import { blob, dot, INK, shade, stroke, wonkyPoly, wonkyRect } from '../../../engine/art/draw';
import type { Brain, EnemyApi, EnemyDef, SpriteArt, StatusDef } from '../../../engine/types';
import { PILOT } from '../../balance';

const S01E01 = 'S01E01' as const;
const H = PILOT.hazards;

const lockerArt = (key: string, open: boolean): SpriteArt => ({
  key,
  width: 36,
  height: 60,
  draw: (g, w, h) => {
    wonkyRect(g, 2, 2, w - 4, h - 4, { fill: 0x5b7fa3, seed: 901, radius: 3 });
    if (open) {
      wonkyRect(g, 5, 6, w - 10, h - 12, { fill: 0x1d2536, seed: 902, radius: 2, lineWidth: 2 });
      wonkyPoly(g, [[w - 6, 5], [w + 0, 8], [w + 0, h - 8], [w - 6, h - 5]], { fill: 0x7ea3c7, seed: 903, lineWidth: 2 });
    } else {
      for (let i = 0; i < 4; i++) stroke(g, [[9, 10 + i * 5], [w - 9, 10 + i * 5]], 0x2f4a66, 2);
      dot(g, w - 9, h / 2 + 4, 2.5, 0xd9d2bf);
    }
  },
});

const slopArt: SpriteArt = {
  key: 'hazard-slop',
  width: 84,
  height: 40,
  draw: (g, w, h) => {
    blob(g, w / 2, h / 2, w * 0.47, h * 0.42, { fill: 0x8fae4a, seed: 911, wobble: 0.14, lineWidth: 2.5 });
    blob(g, w * 0.36, h * 0.44, w * 0.14, h * 0.16, { fill: 0xb6d36a, seed: 912, outline: null, wobble: 0.2 });
    dot(g, w * 0.62, h * 0.38, 4, 0xd8e8a0);
    dot(g, w * 0.7, h * 0.58, 3, 0xd8e8a0);
  },
};

const ledgeArt = (key: string, gone: boolean): SpriteArt => ({
  key,
  width: 54,
  height: 54,
  draw: (g, w, h) => {
    if (gone) {
      blob(g, w / 2, h / 2, w * 0.44, h * 0.42, { fill: 0x2a1f3d, seed: 921, wobble: 0.12, lineWidth: 3 });
      blob(g, w / 2, h * 0.56, w * 0.3, h * 0.26, { fill: 0x160f22, seed: 922, outline: null });
      return;
    }
    blob(g, w / 2, h / 2, w * 0.44, h * 0.42, { fill: 0xf2b6d8, seed: 923, wobble: 0.1, lineWidth: 2 });
    stroke(g, [[w * 0.2, h * 0.35], [w * 0.42, h * 0.5], [w * 0.36, h * 0.72]], shade(0xf2b6d8, -0.45), 2.5);
    stroke(g, [[w * 0.42, h * 0.5], [w * 0.66, h * 0.44], [w * 0.8, h * 0.62]], shade(0xf2b6d8, -0.45), 2.5);
    stroke(g, [[w * 0.55, h * 0.2], [w * 0.62, h * 0.44]], shade(0xf2b6d8, -0.45), 2);
  },
});

const scannerArt: SpriteArt = {
  key: 'hazard-scanner',
  width: 34,
  height: 48,
  draw: (g, w, h) => {
    wonkyRect(g, 8, h * 0.45, w - 16, h * 0.5, { fill: 0x6d7280, seed: 931, radius: 3 });
    wonkyRect(g, 2, 3, w - 4, h * 0.46, { fill: 0x9aa0ad, seed: 932, radius: 6 });
    dot(g, w / 2, h * 0.25, 7, 0xff3355);
    dot(g, w / 2 - 2, h * 0.22, 2.5, 0xffc0c8);
    g.lineStyle(2, INK, 1);
    g.strokeCircle(w / 2, h * 0.25, 7);
  },
};

/** Second states the hazards swap to (their base art is registered with the hazards themselves). */
export const PILOT_HAZARD_ART: SpriteArt[] = [lockerArt('hazard-locker-open', true), ledgeArt('hazard-ledge-gone', true)];

/** Flings a fan of textbooks when Morty wanders close. */
export const burstLocker: EnemyDef = {
  id: 'burst-locker',
  name: 'Bursting Locker',
  firstAppears: S01E01,
  canon: false,
  hp: 1,
  speed: 0,
  radius: 14,
  contactDamage: 0,
  art: lockerArt('hazard-locker', false),
  hazard: { placement: 'wall' },
  brain: function* (api: EnemyApi): Brain {
    yield api.rng.float(1, 3);
    while (true) {
      if (api.distToPlayer() < H.locker.range && api.canSeePlayer()) {
        const angle = api.angleToPlayer();
        yield* api.windup(H.locker.windup, { kind: 'arc', x: api.self.x, y: api.self.y, radius: 170, angle, spread: 0.9 });
        api.self.setArt('hazard-locker-open');
        api.sfx('throw');
        api.shake(3, 100);
        api.shoot({ angle, speed: 330, kind: 'book', count: 3, spread: 0.6, radius: 10 });
        yield 0.6;
        api.self.setArt('hazard-locker');
        yield api.rng.float(H.locker.cooldown[0], H.locker.cooldown[1]);
      } else {
        yield 0.4;
      }
    }
  },
};

/** A puddle of cafeteria slop: it slows Morty, and now and then it bubbles over. */
export const slopSpill: EnemyDef = {
  id: 'slop-spill',
  name: 'Slop Spill',
  firstAppears: S01E01,
  canon: false,
  hp: 1,
  speed: 0,
  radius: 30,
  contactDamage: 0,
  art: slopArt,
  hazard: { placement: 'floor', flat: true },
  brain: function* (api: EnemyApi): Brain {
    let splash = api.rng.float(2, 4);
    while (true) {
      if (api.distToPlayer() < 42) api.ctx.applyStatus('slimed');
      splash -= api.dt();
      if (splash <= 0) {
        yield* api.windup(H.slop.windup, { kind: 'ring', x: api.self.x, y: api.self.y, radius: 58, thickness: 18 });
        api.sfx('splat');
        api.hazard({ kind: 'shockwave', x: api.self.x, y: api.self.y, speed: 260, maxRadius: 80, thickness: 18, damage: 1 });
        splash = api.rng.float(H.slop.every[0], H.slop.every[1]);
      }
      yield;
    }
  },
};

/** A cracked ledge beside a drop: stand on it and it gives way, then grows back. */
export const crumblingLedge: EnemyDef = {
  id: 'crumbling-ledge',
  name: 'Crumbling Ledge',
  firstAppears: S01E01,
  canon: false,
  hp: 1,
  speed: 0,
  radius: 24,
  contactDamage: 0,
  art: ledgeArt('hazard-ledge', false),
  hazard: { placement: 'cliff-edge', flat: true },
  brain: function* (api: EnemyApi): Brain {
    while (true) {
      if (api.distToPlayer() < 28) {
        api.sfx('crumble');
        yield* api.windup(H.ledge.windup, { kind: 'circle', x: api.self.x, y: api.self.y, radius: 30 });
        api.shake(4, 150);
        api.self.setArt('hazard-ledge-gone');
        let gone = H.ledge.regrow;
        while (gone > 0) {
          api.pitfall(26);
          gone -= api.dt();
          yield;
        }
        api.self.setArt('hazard-ledge');
        yield 0.5;
      }
      yield;
    }
  },
};

/** A security scanner that sweeps a beam across the room. */
export const scannerSweeper: EnemyDef = {
  id: 'scanner-sweeper',
  name: 'Security Scanner',
  firstAppears: S01E01,
  canon: false,
  hp: 1,
  speed: 0,
  radius: 14,
  contactDamage: 0,
  art: scannerArt,
  hazard: { placement: 'wall' },
  brain: function* (api: EnemyApi): Brain {
    yield api.rng.float(1.5, 3);
    while (true) {
      const center = api.angleToPlayer();
      const dir = api.rng.sign();
      const from = center - dir * H.scanner.arc;
      const to = center + dir * H.scanner.arc;
      api.sfx('scanner');
      yield* api.windup(H.scanner.windup, { kind: 'line', x: api.self.x, y: api.self.y, angle: from, length: H.scanner.length, width: 14 });
      api.hazard({ kind: 'sweep', x: api.self.x, y: api.self.y, from, to, length: H.scanner.length, width: 10, seconds: H.scanner.sweep, damage: 1 });
      yield H.scanner.sweep + api.rng.float(H.scanner.cooldown[0], H.scanner.cooldown[1]);
    }
  },
};

export const PILOT_HAZARDS: EnemyDef[] = [burstLocker, slopSpill, crumblingLedge, scannerSweeper];

export const slimed: StatusDef = {
  id: 'slimed',
  name: 'Slimed',
  description: 'Wading through cafeteria slop. Slower until you step out.',
  firstAppears: S01E01,
  canon: false,
  positive: false,
  duration: { kind: 'seconds', value: 0.4 },
  stats: { mult: { moveSpeed: H.slop.slow } },
  icon: (g) => {
    blob(g, 16, 20, 11, 8, { fill: 0x8fae4a, seed: 941, lineWidth: 2 });
    dot(g, 12, 9, 3, 0x8fae4a);
    dot(g, 20, 6, 2.5, 0x8fae4a);
  },
};
