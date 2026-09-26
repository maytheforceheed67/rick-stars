/**
 * What Morty fights with in the Pilot, and why he has it (docs/ADDING_AN_EPISODE.md: every
 * weapon needs a story reason the player sees):
 *
 * - Prologue: garage junk. Rick yells at him to throw stuff at the drones.
 * - Act 1, school: dodgeballs from his gym bag. No guns at school.
 * - Act 2, 35-C: Rick's spare ray gun (shared/items.ts), tossed over because the critters bite.
 * - Act 3, Customs: Rick's own ray gun, handed over when their cover is blown (canon).
 *
 * The hand-overs themselves are ActDef.weapon beats in acts.ts.
 */
import { blob, dot, gear, INK, shade, stroke, wonkyPoly, wonkyRect } from '../../../engine/art/draw';
import type { Graphics, ItemDef, SpriteArt } from '../../../engine/types';

const S01E01 = 'S01E01' as const;

/** Morty's dodgeballs are blue; the jocks throw red ones. */
const BALL = 0x4a8fe7;

function wrench(g: Graphics, x: number, y: number, len: number, seed: number): void {
  wonkyRect(g, x, y - 2.5, len, 5, { fill: 0xb8bdd4, seed, radius: 2, lineWidth: 2 });
  blob(g, x + len, y, 5.5, 5.5, { fill: 0xb8bdd4, seed: seed + 1, lineWidth: 2 });
  dot(g, x + len + 2, y, 2.5, 0x2a2238);
}

function sodaCan(g: Graphics, x: number, y: number, w: number, h: number, seed: number): void {
  wonkyRect(g, x, y, w, h, { fill: 0xd8323f, seed, radius: 3, lineWidth: 2 });
  g.fillStyle(0xffffff, 0.9);
  g.fillRect(x + 2, y + h * 0.45, w - 4, 3);
  g.fillStyle(0xc9ced9, 1);
  g.fillRect(x + 2, y + 1, w - 4, 2);
}

function dodgeball(g: Graphics, cx: number, cy: number, r: number, seed: number): void {
  blob(g, cx, cy, r, r, { fill: BALL, seed, wobble: 0.02, lineWidth: 2.5 });
  g.lineStyle(2, 0xffffff, 0.9);
  g.beginPath();
  g.arc(cx - r * 0.95, cy, r * 1.05, -0.85, 0.85, false);
  g.strokePath();
  dot(g, cx - r * 0.35, cy - r * 0.4, r * 0.22, 0xffffff, 0.7);
}

/** What the shots look like in the world. */
export const PILOT_WEAPON_ART: SpriteArt[] = [
  { key: 'shot-junk-wrench', width: 26, height: 14, draw: (g) => wrench(g, 2, 7, 16, 301) },
  { key: 'shot-junk-can', width: 14, height: 20, draw: (g) => sodaCan(g, 1, 1, 12, 18, 302) },
  { key: 'shot-junk-gear', width: 20, height: 20, draw: (g) => gear(g, 10, 10, 9, 0xc9ced9) },
  {
    key: 'shot-junk-bolt',
    width: 22,
    height: 12,
    draw: (g) => {
      wonkyRect(g, 1, 1, 8, 10, { fill: 0x9aa0b8, seed: 303, radius: 1, lineWidth: 2 });
      wonkyRect(g, 8, 3.5, 13, 5, { fill: 0xb8bdd4, seed: 304, radius: 1, lineWidth: 2 });
      for (let x = 11; x < 20; x += 3) stroke(g, [[x, 3.5], [x + 1.5, 8.5]], shade(0xb8bdd4, -0.4), 1.2);
    },
  },
  {
    // A dodgeball with a speed streak behind it. The ball sits in the middle of the texture, so
    // it's where the shot really is; the streak trails off to the left.
    key: 'shot-dodgeball',
    width: 40,
    height: 22,
    draw: (g) => {
      g.fillStyle(0xdcecff, 0.28);
      g.fillTriangle(1, 11, 20, 3, 20, 19);
      g.fillStyle(0xffffff, 0.45);
      g.fillTriangle(8, 11, 20, 6, 20, 16);
      dodgeball(g, 20, 11, 9, 305);
    },
  },
];

export const garageJunk: ItemDef = {
  id: 'garage-junk',
  name: 'Garage Junk',
  blurb: "Wrenches, soda cans, gears, a bolt. Rick's garage never runs out, and he told you to throw it.",
  firstAppears: S01E01,
  canon: false,
  kind: 'weapon',
  rarity: 'story',
  price: 0,
  noPool: true,
  weapon: {
    damageMult: 1,
    fireRateMult: 0.85,
    extraProjectiles: 0,
    spread: 0,
    color: 0xfff0c8,
    style: 'thrown',
    shot: ['shot-junk-wrench', 'shot-junk-can', 'shot-junk-gear', 'shot-junk-bolt'],
    spin: 720,
    speedMult: 0.8,
    rangeMult: 0.85,
    knockbackMult: 1.3,
    sfx: 'throw-light',
  },
  icon: (g) => {
    sodaCan(g, 5, 9, 10, 16, 311);
    wrench(g, 9, 21, 12, 312);
    gear(g, 23, 10, 6, 0xc9ced9);
  },
};

export const gymBagDodgeballs: ItemDef = {
  id: 'gym-bag-dodgeballs',
  name: 'Dodgeballs',
  blurb: 'From your gym bag. No guns at school, but these bounce off walls and knock people flat.',
  firstAppears: S01E01,
  canon: false,
  kind: 'weapon',
  rarity: 'story',
  price: 0,
  noPool: true,
  weapon: {
    damageMult: 1,
    fireRateMult: 1,
    extraProjectiles: 0,
    spread: 0,
    color: 0x8fc4ff,
    style: 'thrown',
    shot: 'shot-dodgeball',
    sizeMult: 1.35,
    speedMult: 0.9,
    bounces: 1,
    knockbackMult: 2.2,
    sfx: 'throw-light',
  },
  icon: (g) => {
    wonkyRect(g, 3, 14, 26, 14, { fill: 0x3a3150, seed: 321, radius: 5, lineWidth: 2 });
    stroke(g, [[9, 15], [16, 6], [23, 15]], INK, 2.5);
    dodgeball(g, 11, 17, 7, 322);
    dodgeball(g, 21, 19, 7, 323);
  },
};

function gunIcon(g: Graphics, body: number, tip: number): void {
  wonkyRect(g, 4, 12, 20, 9, { fill: body, seed: 1, radius: 3 });
  wonkyRect(g, 7, 19, 6, 9, { fill: shade(body, -0.3), seed: 2, radius: 2 });
  wonkyPoly(g, [[24, 12], [30, 10], [30, 23], [24, 21]], { fill: tip, seed: 3 });
}

export const ricksRayGun: ItemDef = {
  id: 'ricks-ray-gun',
  name: "Rick's Ray Gun",
  blurb: "Rick's own gun, handed over when the cover got blown. For shooting robots. They're definitely robots.",
  firstAppears: S01E01,
  canon: true,
  kind: 'weapon',
  rarity: 'story',
  price: 0,
  noPool: true,
  weapon: { damageMult: 1.5, fireRateMult: 1.1, extraProjectiles: 0, spread: 0.06, color: 0xff7ae3, sfx: 'shoot-heavy' },
  icon: (g) => gunIcon(g, 0xdfe6ee, 0xff7ae3),
};

export const PILOT_WEAPONS: ItemDef[] = [garageJunk, gymBagDodgeballs, ricksRayGun];
