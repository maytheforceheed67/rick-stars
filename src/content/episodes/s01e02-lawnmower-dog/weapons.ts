/**
 * What Morty fights with in "Lawnmower Dog", and why he has it (docs/ADDING_AN_EPISODE.md: every
 * weapon needs a story reason the player sees):
 *
 * - Prologue and the Jerry interludes: nothing. It's a break-in and a dog problem.
 * - Act 1, Goldenfold's dream: Rick tells him that in a dream you imagine your own gear, so he
 *   pictures Rick's ray gun. It comes out a bit off.
 * - Act 2, dreams within dreams: deeper dream, weirder gear. A rubber duck launcher.
 * - Act 3, Terry's dream: weirder still. A cat that shoots lasers out of its eyes.
 * - Epilogue, Snowball's world: Rick smuggles him a tennis ball launcher. Dogs can't resist.
 *
 * The hand-overs are ActDef.weapon beats in acts.ts, acted out in the openings (scenes.ts).
 */
import { blob, dot, INK, shade, stroke, wonkyPoly, wonkyRect } from '../../../engine/art/draw';
import type { EnemyRef, Graphics, ItemDef, SpriteArt } from '../../../engine/types';

const S01E02 = 'S01E02' as const;

/** Every dog in Snowball's army (the tennis balls distract them). */
export const DOG_IDS = new Set(['helmet-pup', 'dog-trooper', 'robo-bulldog', 'drool-mastiff', 'medic-poodle', 'kennel-master', 'snowball']);

function duck(g: Graphics, cx: number, cy: number, r: number, seed: number): void {
  blob(g, cx, cy + r * 0.2, r, r * 0.7, { fill: 0xffd83a, seed, lineWidth: 2 });
  blob(g, cx + r * 0.55, cy - r * 0.45, r * 0.5, r * 0.48, { fill: 0xffd83a, seed: seed + 1, lineWidth: 2 });
  wonkyPoly(g, [[cx + r * 0.95, cy - r * 0.5], [cx + r * 1.45, cy - r * 0.35], [cx + r * 0.95, cy - r * 0.25]], { fill: 0xff8a3d, seed: seed + 2, lineWidth: 1.5 });
  dot(g, cx + r * 0.65, cy - r * 0.55, r * 0.12, INK);
}

function tennisBall(g: Graphics, cx: number, cy: number, r: number, seed: number): void {
  blob(g, cx, cy, r, r, { fill: 0xd8f04a, seed, wobble: 0.02, lineWidth: 2 });
  g.lineStyle(1.8, 0xffffff, 1);
  g.beginPath();
  g.arc(cx - r * 1.1, cy, r * 1.05, -0.8, 0.8, false);
  g.strokePath();
  g.beginPath();
  g.arc(cx + r * 1.1, cy, r * 1.05, Math.PI - 0.8, Math.PI + 0.8, false);
  g.strokePath();
}

export const DOG_WEAPON_ART: SpriteArt[] = [
  { key: 'shot-rubber-duck', width: 28, height: 22, draw: (g) => duck(g, 11, 12, 8, 3101) },
  { key: 'shot-tennis-ball', width: 20, height: 20, draw: (g) => tennisBall(g, 10, 10, 8, 3111) },
  // What Morty holds, pointing right and gripped at (6, halfway up).
  {
    // Rick's ray gun as Morty pictured it: pink, rounder, with a little "pew" sparkle.
    key: 'held-imagined-ray-gun',
    width: 30,
    height: 16,
    draw: (g) => {
      wonkyRect(g, 3, 9, 6, 7, { fill: shade(0xf2b0cf, -0.3), seed: 3121, radius: 3 });
      wonkyRect(g, 1, 3, 21, 10, { fill: 0xf2b0cf, seed: 3122, radius: 5 });
      wonkyPoly(g, [[21, 4], [29, 2], [29, 14], [21, 12]], { fill: 0xc58bff, seed: 3123 });
      dot(g, 8, 7, 1.8, 0xffffff, 0.8);
      stroke(g, [[13, 6], [16, 9]], 0xc58bff, 1.8);
      stroke(g, [[16, 6], [13, 9]], 0xc58bff, 1.8);
    },
  },
  {
    // A cat held like a gun: Morty's hand on its middle, the lasers come out of its eyes.
    key: 'held-laser-cat',
    width: 34,
    height: 20,
    draw: (g) => {
      stroke(g, [[3, 9], [0, 4], [2, 1]], 0xf2a541, 3);
      blob(g, 12, 11, 11, 6.5, { fill: 0xf2a541, seed: 3131, lineWidth: 2 });
      for (const x of [16, 20]) stroke(g, [[x, 7], [x + 1, 14]], shade(0xf2a541, -0.35), 1.6);
      blob(g, 26, 9, 7, 6.5, { fill: 0xf2a541, seed: 3132, lineWidth: 2 });
      wonkyPoly(g, [[21, 5], [22, 0], [25, 4]], { fill: 0xf2a541, seed: 3133, lineWidth: 1.5 });
      wonkyPoly(g, [[27, 4], [30, 0], [31, 5]], { fill: 0xf2a541, seed: 3134, lineWidth: 1.5 });
      dot(g, 29.5, 8, 2, 0xff4a3d);
      dot(g, 25.5, 8, 1.6, 0xff4a3d);
      dot(g, 29.5, 8, 0.8, 0xffffff);
    },
  },
];

export const imaginedRayGun: ItemDef = {
  id: 'imagined-ray-gun',
  name: 'Imagined Ray Gun',
  blurb: "Morty pictured Rick's ray gun. His brain got it mostly right. It's pink, and it says 'pew' out loud.",
  effect: 'Fires lavender dream bolts: +15% damage.',
  tags: ['shots'],
  firstAppears: S01E02,
  canon: false,
  kind: 'weapon',
  rarity: 'story',
  price: 0,
  noPool: true,
  weapon: { damageMult: 1.15, fireRateMult: 1.05, extraProjectiles: 0, spread: 0, color: 0xc58bff, held: 'held-imagined-ray-gun', muzzle: { x: 23, y: 0 }, flash: 1.1 },
  icon: (g) => {
    wonkyRect(g, 4, 12, 20, 9, { fill: 0xf2b0cf, seed: 1, radius: 3 });
    wonkyRect(g, 7, 19, 6, 9, { fill: shade(0xf2b0cf, -0.3), seed: 2, radius: 2 });
    wonkyPoly(g, [[24, 12], [30, 10], [30, 23], [24, 21]], { fill: 0xc58bff, seed: 3 });
    stroke(g, [[10, 7], [13, 4]], 0xc58bff, 2);
    stroke(g, [[16, 7], [16, 3]], 0xc58bff, 2);
  },
};

export const rubberDuckLauncher: ItemDef = {
  id: 'rubber-duck-launcher',
  name: 'Rubber Duck Launcher',
  blurb: "Deeper dream, weirder gear. Morty tried to imagine a gun and got a tube full of bath toys.",
  effect: 'Lobs squeaky rubber ducks: +25% damage, and they bounce off walls once.',
  tags: ['shots'],
  firstAppears: S01E02,
  canon: false,
  kind: 'weapon',
  rarity: 'story',
  price: 0,
  noPool: true,
  weapon: {
    damageMult: 1.25,
    fireRateMult: 0.95,
    extraProjectiles: 0,
    spread: 0,
    color: 0xffd83a,
    style: 'thrown',
    shot: 'shot-rubber-duck',
    spin: 300,
    speedMult: 0.9,
    bounces: 1,
    knockbackMult: 1.4,
    sfx: 'squeak',
  },
  icon: (g) => {
    wonkyRect(g, 3, 14, 20, 10, { fill: 0x3f6fb5, seed: 11, radius: 4 });
    duck(g, 22, 17, 7, 12);
  },
};

export const laserCat: ItemDef = {
  id: 'laser-cat',
  name: 'Laser Cat',
  blurb: "Deeper still, weirder still. A cat, held like a gun, that shoots lasers out of its eyes. It seems fine with it.",
  effect: 'Fast red eye-lasers: +10% damage and +10% fire rate.',
  tags: ['shots'],
  firstAppears: S01E02,
  canon: false,
  kind: 'weapon',
  rarity: 'story',
  price: 0,
  noPool: true,
  weapon: {
    damageMult: 1.1,
    fireRateMult: 1.1,
    extraProjectiles: 0,
    spread: 0.04,
    color: 0xff4a3d,
    speedMult: 1.25,
    sizeMult: 0.9,
    sfx: 'laser',
    held: 'held-laser-cat',
    // Out of its eyes.
    muzzle: { x: 24, y: -2 },
    flash: 0.8,
  },
  icon: (g) => {
    blob(g, 14, 18, 10, 8, { fill: 0xf2a541, seed: 21, lineWidth: 2 });
    wonkyPoly(g, [[6, 12], [8, 4], [12, 10]], { fill: 0xf2a541, seed: 22, lineWidth: 2 });
    wonkyPoly(g, [[16, 10], [20, 4], [22, 12]], { fill: 0xf2a541, seed: 23, lineWidth: 2 });
    dot(g, 10, 16, 2, 0xff4a3d);
    dot(g, 18, 16, 2, 0xff4a3d);
    stroke(g, [[20, 16], [31, 13]], 0xff4a3d, 2);
  },
};

export const tennisBallLauncher: ItemDef = {
  id: 'tennis-ball-launcher',
  name: 'Tennis Ball Launcher',
  blurb: "Smuggled in by Rick. Dogs can't resist tennis balls. Genius dogs in robot suits can't either.",
  effect: 'Bouncy tennis balls: +30% damage, bounce twice, and dogs they hit sometimes stop to chase them.',
  tags: ['shots', 'on-hit'],
  firstAppears: S01E02,
  canon: false,
  kind: 'weapon',
  rarity: 'story',
  price: 0,
  noPool: true,
  weapon: {
    damageMult: 1.3,
    fireRateMult: 0.9,
    extraProjectiles: 0,
    spread: 0,
    color: 0xd8f04a,
    style: 'thrown',
    shot: 'shot-tennis-ball',
    spin: 540,
    bounces: 2,
    knockbackMult: 1.4,
    sfx: 'throw-light',
  },
  hooks: {
    onHit(ctx, enemy: EnemyRef, hit) {
      if (hit.source !== 'shot' || hit.killed || !DOG_IDS.has(enemy.def.id) || enemy.def.boss) return;
      if (!ctx.rng.chance(0.25)) return;
      ctx.stun(enemy, 1.2);
      ctx.vfx({ kind: 'text', x: enemy.x, y: enemy.y - 34, text: 'BALL!', color: '#d8f04a' });
    },
  },
  icon: (g) => {
    wonkyRect(g, 3, 13, 22, 10, { fill: 0x3a8f5f, seed: 31, radius: 4 });
    wonkyRect(g, 6, 20, 6, 8, { fill: 0x2a6f45, seed: 32, radius: 2 });
    tennisBall(g, 25, 15, 6, 33);
  },
};

export const DOG_WEAPONS: ItemDef[] = [imaginedRayGun, rubberDuckLauncher, laserCat, tennisBallLauncher];
