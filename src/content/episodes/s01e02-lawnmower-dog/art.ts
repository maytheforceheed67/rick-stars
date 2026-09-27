/**
 * Sprites for "Lawnmower Dog": the dogs (Snuffles to Snowball), the dream people, the toys,
 * Scary Terry, the bosses and the props. All original art drawn in code.
 */
import { blob, dot, eye, INK, mouth, shade, stroke, wonkyPoly, wonkyRect, type EyeMood } from '../../../engine/art/draw';
import type { Graphics, SpriteArt } from '../../../engine/types';
import { drawPerson, type PersonStyle } from '../../shared/art';
import { GOLDENFOLD } from '../s01e01-pilot/art';

const art = (key: string, width: number, height: number, draw: (g: Graphics, w: number, h: number) => void): SpriteArt => ({ key, width, height, draw });

/** Where drawPerson puts the head, so hats and masks can sit on it. */
function headOf(w: number, h: number, build: PersonStyle['build'] = 'kid'): { cx: number; cy: number; r: number } {
  return { cx: w / 2, cy: h * (build === 'kid' ? 0.3 : 0.26), r: w * (build === 'kid' ? 0.3 : build === 'big' ? 0.27 : 0.26) };
}

// ---- dogs ----------------------------------------------------------------------------------------

export interface DogStyle {
  seed: number;
  fur: number;
  ear?: number;
  /** Snuffles' intelligence helmet: a silver dome with an antenna light. */
  helmet?: boolean;
  /** A robot suit over the body. */
  suit?: number;
  /** A robot arm (Snuffles' first upgrade). */
  arm?: boolean;
  /** An officer's cap. */
  cap?: number;
  eyes?: EyeMood;
  /** Heavy jowls (bulldogs, mastiffs). */
  jowls?: boolean;
  /** Curly poodle fluff. */
  curly?: boolean;
  /** A medic's cross on the suit. */
  cross?: boolean;
  tongue?: boolean;
  drool?: boolean;
}

/** The helmet the dogs wear: silver bowl, a band of lights, an antenna with a green bulb. */
function dogHelmet(g: Graphics, cx: number, cy: number, r: number, seed: number): void {
  stroke(g, [[cx + r * 0.2, cy - r * 0.9], [cx + r * 0.45, cy - r * 1.45]], INK, 2);
  dot(g, cx + r * 0.45, cy - r * 1.5, r * 0.16, 0x97ce4c);
  dot(g, cx + r * 0.4, cy - r * 1.55, r * 0.06, 0xffffff);
  wonkyPoly(g, [[cx - r * 0.95, cy - r * 0.25], [cx - r * 0.8, cy - r * 0.85], [cx - r * 0.3, cy - r * 1.12], [cx + r * 0.3, cy - r * 1.12], [cx + r * 0.8, cy - r * 0.85], [cx + r * 0.95, cy - r * 0.25]], {
    fill: 0xc9ced9,
    seed,
    lineWidth: 2.5,
    wobble: 0.3,
  });
  wonkyRect(g, cx - r * 1.02, cy - r * 0.38, r * 2.04, r * 0.26, { fill: 0x8c95a6, seed: seed + 1, radius: 2, lineWidth: 2 });
  for (let i = -1; i <= 1; i++) dot(g, cx + i * r * 0.5, cy - r * 0.25, r * 0.08, i === 0 ? 0xff4a3d : 0x6fd0ff);
  g.fillStyle(0xffffff, 0.5);
  g.fillEllipse(cx - r * 0.35, cy - r * 0.8, r * 0.4, r * 0.18);
}

/** A chibi dog standing (or, with a suit, sitting in a little robot body), feet at the bottom. */
export function drawDog(g: Graphics, w: number, h: number, s: DogStyle): void {
  const cx = w / 2;
  const ear = s.ear ?? shade(s.fur, -0.2);
  const bodyY = h * 0.72;
  const bodyRx = w * 0.34;
  const bodyRy = h * 0.2;
  // Tail
  stroke(g, [[cx + bodyRx * 0.8, bodyY - 2], [cx + bodyRx * 1.15, bodyY - bodyRy * 0.9], [cx + bodyRx * 1.2, bodyY - bodyRy * 1.3]], INK, 5);
  stroke(g, [[cx + bodyRx * 0.8, bodyY - 2], [cx + bodyRx * 1.15, bodyY - bodyRy * 0.9], [cx + bodyRx * 1.2, bodyY - bodyRy * 1.3]], s.fur, 2.5);
  // Legs
  const legC = s.suit ?? s.fur;
  for (const lx of [-0.55, -0.2, 0.2, 0.55]) {
    wonkyRect(g, cx + bodyRx * lx - 4, bodyY + bodyRy * 0.3, 8, h - (bodyY + bodyRy * 0.3) - 2, { fill: legC, seed: s.seed + Math.round(lx * 10), radius: 3, lineWidth: 2 });
  }
  // Body
  if (s.curly) for (let i = 0; i < 6; i++) blob(g, cx - bodyRx * 0.7 + i * bodyRx * 0.28, bodyY - bodyRy * 0.4, bodyRy * 0.55, bodyRy * 0.55, { fill: s.fur, seed: s.seed + 20 + i, lineWidth: 2 });
  blob(g, cx, bodyY, bodyRx, bodyRy, { fill: s.fur, seed: s.seed + 2, wobble: s.curly ? 0.12 : 0.05, lineWidth: 2.5 });
  if (s.suit !== undefined) {
    wonkyRect(g, cx - bodyRx * 0.85, bodyY - bodyRy * 0.8, bodyRx * 1.7, bodyRy * 1.5, { fill: s.suit, seed: s.seed + 3, radius: 6, lineWidth: 2.5 });
    g.lineStyle(2, shade(s.suit, -0.35), 1);
    g.lineBetween(cx - bodyRx * 0.5, bodyY - bodyRy * 0.6, cx - bodyRx * 0.5, bodyY + bodyRy * 0.5);
    g.lineBetween(cx + bodyRx * 0.5, bodyY - bodyRy * 0.6, cx + bodyRx * 0.5, bodyY + bodyRy * 0.5);
    dot(g, cx, bodyY - bodyRy * 0.1, 3, 0x6fd0ff);
    if (s.cross) {
      g.fillStyle(0xffffff, 1);
      g.fillRect(cx - 7, bodyY - 3, 14, 5);
      g.fillRect(cx - 2.5, bodyY - 8, 5, 15);
      g.fillStyle(0xe0484d, 1);
      g.fillRect(cx - 6, bodyY - 2, 12, 3);
      g.fillRect(cx - 1.5, bodyY - 7, 3, 13);
    }
  }
  if (s.arm) {
    // A little robot arm with a claw, sticking out of the helmet's harness.
    stroke(g, [[cx - bodyRx * 0.6, bodyY - bodyRy * 0.6], [cx - bodyRx * 1.2, bodyY - bodyRy * 1.6], [cx - bodyRx * 1.45, bodyY - bodyRy * 1.1]], INK, 6);
    stroke(g, [[cx - bodyRx * 0.6, bodyY - bodyRy * 0.6], [cx - bodyRx * 1.2, bodyY - bodyRy * 1.6], [cx - bodyRx * 1.45, bodyY - bodyRy * 1.1]], 0xb8bdd4, 3);
    wonkyPoly(g, [[cx - bodyRx * 1.45, bodyY - bodyRy * 1.1], [cx - bodyRx * 1.7, bodyY - bodyRy * 0.8], [cx - bodyRx * 1.35, bodyY - bodyRy * 0.75]], { fill: 0x8c95a6, seed: s.seed + 30, lineWidth: 2 });
  }
  // Head
  const hy = h * 0.4;
  const hr = w * 0.27;
  blob(g, cx - hr * 0.95, hy + hr * 0.15, hr * 0.32, hr * 0.62, { fill: ear, seed: s.seed + 4, lineWidth: 2.5 });
  blob(g, cx + hr * 0.95, hy + hr * 0.15, hr * 0.32, hr * 0.62, { fill: ear, seed: s.seed + 5, lineWidth: 2.5 });
  if (s.curly) for (let i = 0; i < 5; i++) blob(g, cx - hr * 0.8 + i * hr * 0.4, hy - hr * 0.8, hr * 0.32, hr * 0.32, { fill: s.fur, seed: s.seed + 40 + i, lineWidth: 2 });
  blob(g, cx, hy, hr, hr * 0.92, { fill: s.fur, seed: s.seed + 6, wobble: 0.04, lineWidth: 2.5 });
  // Snout, nose, jowls
  blob(g, cx, hy + hr * 0.45, hr * (s.jowls ? 0.7 : 0.5), hr * (s.jowls ? 0.45 : 0.36), { fill: shade(s.fur, 0.25), seed: s.seed + 7, lineWidth: 2 });
  dot(g, cx, hy + hr * 0.3, hr * 0.14, INK);
  if (s.jowls) {
    stroke(g, [[cx - hr * 0.5, hy + hr * 0.6], [cx - hr * 0.3, hy + hr * 0.78], [cx, hy + hr * 0.62], [cx + hr * 0.3, hy + hr * 0.78], [cx + hr * 0.5, hy + hr * 0.6]], INK, 2);
  } else {
    stroke(g, [[cx - hr * 0.2, hy + hr * 0.6], [cx, hy + hr * 0.5], [cx + hr * 0.2, hy + hr * 0.6]], INK, 2);
  }
  if (s.tongue) blob(g, cx + hr * 0.1, hy + hr * 0.78, hr * 0.14, hr * 0.2, { fill: 0xf28fb8, seed: s.seed + 8, lineWidth: 1.5 });
  if (s.drool) {
    g.fillStyle(0xcfeeff, 0.9);
    g.fillEllipse(cx - hr * 0.35, hy + hr * 0.95, hr * 0.14, hr * 0.3);
  }
  eye(g, cx - hr * 0.38, hy - hr * 0.12, hr * 0.2, s.eyes ?? 'normal', { x: 0, y: 0.2 });
  eye(g, cx + hr * 0.38, hy - hr * 0.12, hr * 0.2, s.eyes ?? 'normal', { x: 0, y: 0.2 }, true);
  if (s.helmet) dogHelmet(g, cx, hy, hr, s.seed + 9);
  if (s.cap !== undefined) {
    wonkyRect(g, cx - hr * 0.9, hy - hr * 1.05, hr * 1.8, hr * 0.5, { fill: s.cap, seed: s.seed + 10, radius: 4, lineWidth: 2.5 });
    wonkyRect(g, cx - hr * 1.05, hy - hr * 0.62, hr * 2.1, hr * 0.18, { fill: INK, seed: s.seed + 11, radius: 2, lineWidth: 1.5 });
    dot(g, cx, hy - hr * 0.82, hr * 0.13, 0xffd54a);
  }
}

export const SNUFFLES_FUR = 0xf4efe4;
export const SNUFFLES_EAR = 0xe3d3bc;

export const snufflesSprite = art('snuffles', 44, 42, (g, w, h) => drawDog(g, w, h, { seed: 1201, fur: SNUFFLES_FUR, ear: SNUFFLES_EAR, tongue: true }));
export const snufflesHelmetSprite = art('snuffles-helmet', 44, 46, (g, w, h) => drawDog(g, w, h, { seed: 1202, fur: SNUFFLES_FUR, ear: SNUFFLES_EAR, helmet: true }));
export const snufflesArmSprite = art('snuffles-arm', 52, 48, (g, w, h) => drawDog(g, w, h, { seed: 1203, fur: SNUFFLES_FUR, ear: SNUFFLES_EAR, helmet: true, arm: true, eyes: 'angry' }));
/** Snowball as he appears in scenes: in the robot suit, not the full war machine. */
export const snowballSprite = art('snowball', 52, 54, (g, w, h) => drawDog(g, w, h, { seed: 1204, fur: SNUFFLES_FUR, ear: SNUFFLES_EAR, helmet: true, suit: 0x9aa3b5, eyes: 'angry' }));
export const dogTrooperSprite = art('dog-trooper', 46, 48, (g, w, h) => {
  drawDog(g, w, h, { seed: 1211, fur: 0xb07a4a, ear: 0x7a4f2c, helmet: true, suit: 0x5d6b7b, eyes: 'angry' });
  // A laser blaster clipped to the suit.
  wonkyRect(g, w * 0.66, h * 0.6, 14, 6, { fill: 0x3d4a5c, seed: 1212, radius: 2, lineWidth: 2 });
  dot(g, w * 0.66 + 14, h * 0.6 + 3, 2.5, 0xff4a3d);
});

// ---- dream people --------------------------------------------------------------------------------

/** A brown fedora (Scary Terry's hat), on a head at (cx, cy) of radius r. */
function fedora(g: Graphics, cx: number, cy: number, r: number, seed: number, color = 0x5a3a22): void {
  wonkyRect(g, cx - r * 1.25, cy - r * 0.72, r * 2.5, r * 0.3, { fill: color, seed, radius: 3, lineWidth: 2 });
  wonkyPoly(g, [[cx - r * 0.75, cy - r * 0.62], [cx - r * 0.6, cy - r * 1.35], [cx, cy - r * 1.2], [cx + r * 0.6, cy - r * 1.35], [cx + r * 0.75, cy - r * 0.62]], { fill: shade(color, 0.1), seed: seed + 1, lineWidth: 2 });
  g.fillStyle(shade(color, -0.4), 1);
  g.fillRect(cx - r * 0.72, cy - r * 0.8, r * 1.44, r * 0.14);
}

const TERRY_STRIPES = [0x8b2323, 0x4f5a2a, 0x8b2323, 0x4f5a2a] as const;

/** Scary Terry: lanky, scarred, striped sweater, brown hat, blades for fingers. */
export function drawTerry(g: Graphics, w: number, h: number, seed = 1301): void {
  drawPerson(g, w, h, {
    seed,
    skin: 0xd98f7f,
    hair: 0x3a2a20,
    hairStyle: 'none',
    shirt: 0x8b2323,
    stripe: TERRY_STRIPES,
    pants: 0x3a2e24,
    shoes: 0x1c1612,
    build: 'adult',
    eyes: 'angry',
    mouth: 'grit',
    brow: 0x5a2a20,
  });
  const hd = headOf(w, h, 'adult');
  // Scars
  for (const [dx, dy, rr] of [[-0.45, -0.35, 0.16], [0.4, 0.45, 0.12], [0.1, -0.6, 0.1]] as const) {
    g.fillStyle(0xb35a52, 0.8);
    g.fillEllipse(hd.cx + dx * hd.r, hd.cy + dy * hd.r, hd.r * rr * 2, hd.r * rr * 1.4);
  }
  fedora(g, hd.cx, hd.cy, hd.r, seed + 50);
  // Finger blades on his right hand.
  const hx = w * 0.84;
  const hy = h * 0.76;
  for (let i = 0; i < 4; i++) {
    stroke(g, [[hx - 3 + i * 2.5, hy], [hx + 2 + i * 3, hy + 13]], INK, 3.5);
    stroke(g, [[hx - 3 + i * 2.5, hy], [hx + 2 + i * 3, hy + 13]], 0xdfe6ee, 1.8);
  }
}

export const scaryTerrySprite = art('scary-terry', 48, 70, (g, w, h) => drawTerry(g, w, h));

/** Terry as a kid in his own dream: the little hat, the sweater, and no pants. */
export const littleTerrySprite = art('little-terry', 40, 54, (g, w, h) => {
  drawPerson(g, w, h, { seed: 1311, skin: 0xf0c6a8, hair: 0x3a2a20, hairStyle: 'buzz', shirt: 0x8b2323, stripe: TERRY_STRIPES, pants: 0xf0c6a8, shoes: 0x3b2f2a, eyes: 'sleepy', mouth: 'frown' });
  // Boxer shorts with little hearts, where the pants should be.
  wonkyRect(g, w * 0.3, h * 0.73, w * 0.4, h * 0.1, { fill: 0xf4efe6, seed: 1312, radius: 2, lineWidth: 2 });
  dot(g, w * 0.4, h * 0.78, 1.8, 0xe0484d);
  dot(g, w * 0.58, h * 0.77, 1.8, 0xe0484d);
  const hd = headOf(w, h, 'kid');
  fedora(g, hd.cx, hd.cy, hd.r * 0.85, 1313);
});

export const littleGirlSprite = art('little-girl', 40, 54, (g, w, h) =>
  drawPerson(g, w, h, { seed: 1321, skin: 0xf6d7bd, hair: 0xf2d16b, hairStyle: 'ponytail', shirt: 0xf2a7c9, pants: 0xf2a7c9, shoes: 0xffffff, lashes: true, mouth: 'smile', eyes: 'happy' }),
);

/** The centaur bouncer: a horse's body, a bouncer's torso, sunglasses, a STAFF shirt. */
export const centaurSprite = art('centaur', 76, 78, (g, w, h) => {
  const coat = 0x8a5a3a;
  // Tail and back legs
  stroke(g, [[w * 0.88, h * 0.55], [w * 0.97, h * 0.72], [w * 0.93, h * 0.84]], INK, 7);
  stroke(g, [[w * 0.88, h * 0.55], [w * 0.97, h * 0.72], [w * 0.93, h * 0.84]], 0x3a2418, 4);
  for (const lx of [0.3, 0.42, 0.66, 0.8]) {
    wonkyRect(g, w * lx - 4, h * 0.68, 8, h * 0.3, { fill: coat, seed: 1331 + Math.round(lx * 10), radius: 3, lineWidth: 2 });
    wonkyRect(g, w * lx - 5, h - 7, 10, 6, { fill: 0x2a2020, seed: 1336 + Math.round(lx * 10), radius: 2, lineWidth: 2 });
  }
  blob(g, w * 0.58, h * 0.6, w * 0.32, h * 0.16, { fill: coat, seed: 1340, wobble: 0.04, lineWidth: 2.5 });
  // Human torso rising from the front of the horse.
  wonkyRect(g, w * 0.16, h * 0.3, w * 0.28, h * 0.32, { fill: 0x1c1a26, seed: 1341, radius: 6, lineWidth: 2.5 });
  g.fillStyle(0xffffff, 1);
  g.fillRect(w * 0.2, h * 0.4, w * 0.2, 5);
  // Crossed arms
  wonkyRect(g, w * 0.13, h * 0.44, w * 0.34, h * 0.08, { fill: 0xa8744e, seed: 1342, radius: 4, lineWidth: 2 });
  // Head
  blob(g, w * 0.3, h * 0.2, w * 0.11, h * 0.11, { fill: 0xa8744e, seed: 1343, lineWidth: 2.5 });
  wonkyRect(g, w * 0.2, h * 0.08, w * 0.2, h * 0.07, { fill: 0x1c1612, seed: 1344, radius: 3, lineWidth: 2 });
  wonkyRect(g, w * 0.21, h * 0.17, w * 0.18, h * 0.05, { fill: INK, seed: 1345, radius: 2, lineWidth: 1 });
  mouth(g, w * 0.3, h * 0.26, 7, 'flat');
});

export const mrsPancakesSprite = art('mrs-pancakes', 44, 62, (g, w, h) =>
  drawPerson(g, w, h, { seed: 1351, skin: 0xf3d0b5, hair: 0xf5d98b, hairStyle: 'bob', shirt: 0xd8327f, pants: 0x3a2e4a, shoes: 0xd8327f, build: 'adult', lashes: true, lips: 0xd8323f, mouth: 'smile' }),
);

// ---- enemies: Goldenfold's dream -----------------------------------------------------------------

export const ENEMY_ART: Record<string, SpriteArt> = {
  passenger: art('enemy-dream-passenger', 44, 60, (g, w, h) => {
    drawPerson(g, w, h, { seed: 1401, skin: 0xc98d62, hair: 0x2b2118, hairStyle: 'swoop', shirt: 0x7fa6d9, stripe: [0x7fa6d9, 0xdfe9f7, 0x7fa6d9], pants: 0x7fa6d9, shoes: 0x5a4a6a, build: 'adult', eyes: 'sleepy', mouth: 'open' });
    // A sleep mask pushed down over the eyes.
    const hd = headOf(w, h, 'adult');
    wonkyRect(g, hd.cx - hd.r * 0.9, hd.cy - hd.r * 0.28, hd.r * 1.8, hd.r * 0.5, { fill: 0x3a2a5c, seed: 1402, radius: 4, lineWidth: 2 });
  }),
  attendant: art('enemy-flight-attendant', 44, 60, (g, w, h) => {
    drawPerson(g, w, h, { seed: 1411, skin: 0xe8b98e, hair: 0x7a4a2a, hairStyle: 'bob', shirt: 0x2d3a6e, neckline: 'v', undershirt: 0xf4efe6, tie: 0xd8323f, pants: 0x2d3a6e, shoes: 0x1c1a26, build: 'adult', lashes: true, lips: 0xd8323f, mouth: 'smile' });
    // A little peanut tray.
    wonkyRect(g, w * 0.72, h * 0.58, 14, 5, { fill: 0xc9ced9, seed: 1412, radius: 2, lineWidth: 1.5 });
    dot(g, w * 0.76, h * 0.56, 2.5, 0xd9a441);
    dot(g, w * 0.83, h * 0.56, 2.5, 0xd9a441);
  }),
  soldier: art('enemy-dream-soldier', 46, 60, (g, w, h) => {
    drawPerson(g, w, h, { seed: 1421, skin: 0xa8744e, hair: 0x1c1612, hairStyle: 'buzz', shirt: 0x5b6b3a, pants: 0x4a5530, shoes: 0x2a2018, build: 'adult', eyes: 'angry', mouth: 'grit' });
    const hd = headOf(w, h, 'adult');
    wonkyPoly(g, [[hd.cx - hd.r * 1.1, hd.cy - hd.r * 0.2], [hd.cx - hd.r * 0.9, hd.cy - hd.r * 1.05], [hd.cx + hd.r * 0.9, hd.cy - hd.r * 1.05], [hd.cx + hd.r * 1.1, hd.cy - hd.r * 0.2]], { fill: 0x4f5a2a, seed: 1422, lineWidth: 2.5 });
    // A dream machine gun, too big and very round.
    wonkyRect(g, w * 0.5, h * 0.58, w * 0.48, 7, { fill: 0x3a3a44, seed: 1423, radius: 2, lineWidth: 2 });
    blob(g, w * 0.62, h * 0.66, 5.5, 5.5, { fill: 0x5a3a22, seed: 1424, lineWidth: 2 });
  }),
  snackCart: art('enemy-snack-cart', 50, 52, (g, w, h) => {
    for (const x of [w * 0.22, w * 0.78]) blob(g, x, h - 6, 6, 5, { fill: INK, seed: 1431, lineWidth: 1.5 });
    wonkyRect(g, w * 0.08, h * 0.2, w * 0.84, h * 0.66, { fill: 0xc9ced9, seed: 1432, radius: 5, lineWidth: 2.5 });
    for (let i = 0; i < 3; i++) {
      g.lineStyle(2, 0x8c95a6, 1);
      g.lineBetween(w * 0.14, h * (0.42 + i * 0.14), w * 0.86, h * (0.42 + i * 0.14));
    }
    wonkyRect(g, w * 0.08, h * 0.12, w * 0.84, h * 0.12, { fill: 0xd8323f, seed: 1433, radius: 3, lineWidth: 2 });
    for (let i = 0; i < 4; i++) wonkyRect(g, w * (0.16 + i * 0.18), h * 0.02, 6, 10, { fill: [0xe0484d, 0x6fd0ff, 0xf2c14e, 0x97ce4c][i], seed: 1434 + i, radius: 2, lineWidth: 1.5 });
    eye(g, w * 0.36, h * 0.34, 5, 'angry');
    eye(g, w * 0.64, h * 0.34, 5, 'angry', { x: 0, y: 0 }, true);
  }),
  cloud: art('enemy-turbulence-cloud', 52, 44, (g, w, h) => {
    for (const [x, y, r] of [[0.28, 0.5, 0.2], [0.5, 0.36, 0.26], [0.72, 0.5, 0.2], [0.5, 0.58, 0.24]] as const) blob(g, w * x, h * y, w * r, h * r * 1.1, { fill: 0x8a8fa8, seed: 1441 + Math.round(x * 10), lineWidth: 2.5 });
    blob(g, w * 0.5, h * 0.48, w * 0.3, h * 0.24, { fill: 0xa3a8c0, outline: null, seed: 1446 });
    eye(g, w * 0.4, h * 0.45, 4.5, 'angry');
    eye(g, w * 0.6, h * 0.45, 4.5, 'angry', { x: 0, y: 0 }, true);
    wonkyPoly(g, [[w * 0.5, h * 0.66], [w * 0.42, h * 0.84], [w * 0.5, h * 0.82], [w * 0.44, h * 0.99], [w * 0.6, h * 0.76], [w * 0.52, h * 0.77]], { fill: 0xffe27a, seed: 1447, lineWidth: 2 });
  }),
  luggage: art('enemy-lost-luggage', 50, 48, (g, w, h) => {
    wonkyRect(g, w * 0.36, h * 0.04, w * 0.28, h * 0.14, { fill: 0x3a2a20, seed: 1451, radius: 4, lineWidth: 2 });
    wonkyRect(g, w * 0.06, h * 0.16, w * 0.88, h * 0.76, { fill: 0x2f8f8a, seed: 1452, radius: 7, lineWidth: 2.5 });
    g.fillStyle(0x1f6f6a, 1);
    g.fillRect(w * 0.08, h * 0.5, w * 0.84, 4);
    wonkyRect(g, w * 0.66, h * 0.22, 12, 9, { fill: 0xf2c14e, seed: 1453, radius: 1, lineWidth: 1.5 });
    // A zipper mouth full of teeth.
    for (let i = 0; i < 6; i++) wonkyPoly(g, [[w * (0.24 + i * 0.09), h * 0.5], [w * (0.285 + i * 0.09), h * 0.62], [w * (0.33 + i * 0.09), h * 0.5]], { fill: 0xffffff, seed: 1454 + i, lineWidth: 1.2 });
    eye(g, w * 0.32, h * 0.34, 4.5, 'angry');
    eye(g, w * 0.54, h * 0.34, 4.5, 'angry', { x: 0, y: 0 }, true);
  }),
  carryOn: art('enemy-carry-on', 28, 26, (g, w, h) => {
    wonkyRect(g, w * 0.3, 1, w * 0.4, 5, { fill: INK, seed: 1461, radius: 2, lineWidth: 1 });
    wonkyRect(g, 2, 5, w - 4, h - 9, { fill: 0xd8327f, seed: 1462, radius: 4, lineWidth: 2 });
    dot(g, 7, h - 3, 3, INK);
    dot(g, w - 7, h - 3, 3, INK);
    eye(g, w * 0.38, h * 0.45, 3, 'angry');
    eye(g, w * 0.62, h * 0.45, 3, 'angry', { x: 0, y: 0 }, true);
  }),
  machineGun: art('enemy-dream-machine-gun', 48, 30, (g, w, h) => {
    g.fillStyle(0xc58bff, 0.35);
    g.fillEllipse(w / 2, h / 2, w, h);
    wonkyRect(g, w * 0.08, h * 0.36, w * 0.84, h * 0.24, { fill: 0x3a3a44, seed: 1471, radius: 3, lineWidth: 2 });
    blob(g, w * 0.44, h * 0.66, w * 0.14, h * 0.24, { fill: 0x3a3a44, seed: 1472, lineWidth: 2 });
    wonkyRect(g, w * 0.08, h * 0.44, w * 0.2, h * 0.3, { fill: 0x7a4a2a, seed: 1473, radius: 3, lineWidth: 2 });
    for (let i = 0; i < 3; i++) dot(g, w * (0.66 + i * 0.09), h * 0.48, 2, 0x8c95a6);
    // Little dream wings.
    wonkyPoly(g, [[w * 0.4, h * 0.36], [w * 0.3, h * 0.02], [w * 0.52, h * 0.3]], { fill: 0xf4efe6, seed: 1474, lineWidth: 1.5 });
  }),
  slidingWall: art('hazard-sliding-seats', 56, 108, (g, w, h) => {
    g.fillStyle(0xc58bff, 0.25);
    g.fillRoundedRect(0, 0, w, h, 10);
    for (let i = 0; i < 3; i++) {
      const y = 6 + i * 34;
      wonkyRect(g, 8, y + 6, w - 16, 26, { fill: 0x3f63b0, seed: 1481 + i, radius: 6, lineWidth: 2.5 });
      wonkyRect(g, 6, y, w - 12, 12, { fill: 0x5b7fd0, seed: 1484 + i, radius: 5, lineWidth: 2 });
      g.fillStyle(0xf4efe6, 0.9);
      g.fillRect(12, y + 3, w - 24, 4);
    }
  }),

  // ---- enemies: dreams within dreams ----
  sheep: art('enemy-counting-sheep', 46, 40, (g, w, h) => {
    for (const lx of [0.28, 0.42, 0.6, 0.74]) wonkyRect(g, w * lx - 3, h * 0.66, 6, h * 0.3, { fill: INK, seed: 1501 + Math.round(lx * 10), radius: 2, lineWidth: 1 });
    for (let i = 0; i < 7; i++) blob(g, w * (0.3 + (i % 4) * 0.14), h * (0.4 + Math.floor(i / 4) * 0.18), w * 0.14, h * 0.16, { fill: 0xfaf7f0, seed: 1506 + i, lineWidth: 2 });
    blob(g, w * 0.5, h * 0.48, w * 0.3, h * 0.22, { fill: 0xfaf7f0, outline: null, seed: 1514 });
    blob(g, w * 0.2, h * 0.36, w * 0.13, h * 0.17, { fill: 0x2a2432, seed: 1515, lineWidth: 2 });
    eye(g, w * 0.18, h * 0.34, 3, 'angry');
    // A number tag: this one's getting counted.
    wonkyRect(g, w * 0.54, h * 0.4, 12, 10, { fill: 0xf2c14e, seed: 1516, radius: 2, lineWidth: 1.5 });
    stroke(g, [[w * 0.54 + 6, h * 0.4 + 2], [w * 0.54 + 6, h * 0.4 + 8]], INK, 1.5);
  }),
  windupSoldier: art('enemy-windup-soldier', 40, 60, (g, w, h) => {
    drawPerson(g, w, h, { seed: 1521, skin: 0xf6c9a8, hair: 0x1c1612, hairStyle: 'none', shirt: 0xc0392b, pants: 0x2d3a6e, shoes: 0x1c1612, eyes: 'normal', mouth: 'flat' });
    const hd = headOf(w, h, 'kid');
    wonkyRect(g, hd.cx - hd.r * 0.8, hd.cy - hd.r * 1.9, hd.r * 1.6, hd.r * 1.3, { fill: 0x1c1612, seed: 1522, radius: 6, lineWidth: 2 });
    dot(g, hd.cx - hd.r * 0.45, hd.cy + hd.r * 0.3, hd.r * 0.18, 0xe0484d, 0.8);
    dot(g, hd.cx + hd.r * 0.45, hd.cy + hd.r * 0.3, hd.r * 0.18, 0xe0484d, 0.8);
    // Wind-up key and a cork gun.
    stroke(g, [[w * 0.2, h * 0.55], [w * 0.04, h * 0.55]], INK, 3);
    blob(g, w * 0.04, h * 0.5, 3.5, 5, { fill: 0xf2c14e, seed: 1523, lineWidth: 1.5 });
    blob(g, w * 0.04, h * 0.6, 3.5, 5, { fill: 0xf2c14e, seed: 1524, lineWidth: 1.5 });
    wonkyRect(g, w * 0.62, h * 0.58, w * 0.36, 6, { fill: 0x8a6d4b, seed: 1525, radius: 2, lineWidth: 2 });
  }),
  teddy: art('enemy-teddy-bruiser', 56, 60, (g, w, h) => {
    const fur = 0xa8744e;
    blob(g, w * 0.3, h - 8, w * 0.14, 7, { fill: fur, seed: 1531, lineWidth: 2.5 });
    blob(g, w * 0.7, h - 8, w * 0.14, 7, { fill: fur, seed: 1532, lineWidth: 2.5 });
    blob(g, w * 0.5, h * 0.66, w * 0.34, h * 0.26, { fill: fur, seed: 1533, lineWidth: 2.5 });
    blob(g, w * 0.5, h * 0.68, w * 0.18, h * 0.14, { fill: shade(fur, 0.3), seed: 1534, lineWidth: 2 });
    blob(g, w * 0.14, h * 0.58, w * 0.1, h * 0.14, { fill: fur, seed: 1535, lineWidth: 2.5 });
    blob(g, w * 0.86, h * 0.58, w * 0.1, h * 0.14, { fill: fur, seed: 1536, lineWidth: 2.5 });
    blob(g, w * 0.28, h * 0.14, w * 0.1, w * 0.1, { fill: fur, seed: 1537, lineWidth: 2.5 });
    blob(g, w * 0.72, h * 0.14, w * 0.1, w * 0.1, { fill: fur, seed: 1538, lineWidth: 2.5 });
    blob(g, w * 0.5, h * 0.3, w * 0.28, h * 0.22, { fill: fur, seed: 1539, lineWidth: 2.5 });
    blob(g, w * 0.5, h * 0.38, w * 0.12, h * 0.08, { fill: shade(fur, 0.35), seed: 1540, lineWidth: 2 });
    dot(g, w * 0.5, h * 0.35, 3, INK);
    // One button eye, one angry eye, and stitches.
    dot(g, w * 0.38, h * 0.27, 4.5, INK);
    dot(g, w * 0.38, h * 0.27, 1.5, 0x8c95a6);
    eye(g, w * 0.62, h * 0.27, 4.5, 'angry', { x: 0, y: 0 }, true);
    for (let i = 0; i < 4; i++) stroke(g, [[w * (0.4 + i * 0.06), h * 0.56], [w * (0.43 + i * 0.06), h * 0.62]], INK, 1.5);
  }),
  jackInTheBox: art('enemy-jack-in-the-box', 44, 58, (g, w, h) => {
    wonkyRect(g, w * 0.1, h * 0.52, w * 0.8, h * 0.44, { fill: 0xe0484d, seed: 1551, radius: 3, lineWidth: 2.5 });
    g.fillStyle(0x3f6fb5, 1);
    g.fillRect(w * 0.14, h * 0.56, w * 0.3, h * 0.17);
    g.fillRect(w * 0.46, h * 0.74, w * 0.4, h * 0.18);
    // The spring and the clown on top.
    for (let i = 0; i < 4; i++) stroke(g, [[w * 0.4, h * (0.5 - i * 0.05)], [w * 0.6, h * (0.475 - i * 0.05)]], 0x8c95a6, 3);
    blob(g, w * 0.5, h * 0.22, w * 0.2, h * 0.14, { fill: 0xf8f0e8, seed: 1552, lineWidth: 2.5 });
    blob(g, w * 0.5, h * 0.26, 3.5, 3.5, { fill: 0xe0484d, seed: 1553, lineWidth: 1.5 });
    wonkyPoly(g, [[w * 0.32, h * 0.14], [w * 0.5, h * 0.0], [w * 0.68, h * 0.14]], { fill: 0x97ce4c, seed: 1554, lineWidth: 2 });
    eye(g, w * 0.42, h * 0.19, 3, 'happy');
    eye(g, w * 0.58, h * 0.19, 3, 'happy', { x: 0, y: 0 }, true);
    mouth(g, w * 0.5, h * 0.31, 8, 'grit');
  }),
  teaDoll: art('enemy-tea-party-doll', 40, 56, (g, w, h) => {
    drawPerson(g, w, h, { seed: 1561, skin: 0xf7e3dd, hair: 0xa8552a, hairStyle: 'bob', shirt: 0xb89cf0, pants: 0xb89cf0, shoes: 0xffffff, lashes: true, lips: 0xe0484d, eyes: 'normal', mouth: 'smile' });
    const hd = headOf(w, h, 'kid');
    dot(g, hd.cx - hd.r * 0.5, hd.cy + hd.r * 0.35, hd.r * 0.16, 0xf28fb8, 0.8);
    dot(g, hd.cx + hd.r * 0.5, hd.cy + hd.r * 0.35, hd.r * 0.16, 0xf28fb8, 0.8);
    // A teapot.
    blob(g, w * 0.86, h * 0.64, 6, 5, { fill: 0xffffff, seed: 1562, lineWidth: 2 });
    stroke(g, [[w * 0.95, h * 0.62], [w * 1.0, h * 0.58]], INK, 2);
  }),
  musicBox: art('enemy-music-box', 46, 50, (g, w, h) => {
    wonkyRect(g, w * 0.06, h * 0.5, w * 0.88, h * 0.46, { fill: 0xd98fb0, seed: 1571, radius: 4, lineWidth: 2.5 });
    wonkyRect(g, w * 0.06, h * 0.44, w * 0.88, h * 0.1, { fill: 0xf2b0cf, seed: 1572, radius: 3, lineWidth: 2 });
    g.fillStyle(0xf2c14e, 1);
    g.fillRect(w * 0.12, h * 0.7, w * 0.76, 3);
    // The ballerina, mid-spin.
    stroke(g, [[w * 0.5, h * 0.44], [w * 0.5, h * 0.3]], INK, 2);
    wonkyPoly(g, [[w * 0.32, h * 0.3], [w * 0.68, h * 0.3], [w * 0.5, h * 0.2]], { fill: 0xf8c4dc, seed: 1573, lineWidth: 1.5 });
    blob(g, w * 0.5, h * 0.12, 5, 5, { fill: 0xf6d7bd, seed: 1574, lineWidth: 1.5 });
    stroke(g, [[w * 0.5, h * 0.2], [w * 0.36, h * 0.06]], INK, 1.5);
    stroke(g, [[w * 0.5, h * 0.2], [w * 0.64, h * 0.06]], INK, 1.5);
    eye(g, w * 0.34, h * 0.62, 3.5, 'angry');
    eye(g, w * 0.66, h * 0.62, 3.5, 'angry', { x: 0, y: 0 }, true);
  }),
  dancer: art('enemy-twirl-dancer', 24, 30, (g, w, h) => {
    stroke(g, [[w * 0.45, h * 0.62], [w * 0.4, h - 2]], INK, 2);
    stroke(g, [[w * 0.55, h * 0.62], [w * 0.64, h - 3]], INK, 2);
    wonkyPoly(g, [[1, h * 0.6], [w - 1, h * 0.6], [w * 0.5, h * 0.36]], { fill: 0xf8c4dc, seed: 1581, lineWidth: 1.5 });
    blob(g, w * 0.5, h * 0.24, 6, 6, { fill: 0xf6d7bd, seed: 1582, lineWidth: 1.5 });
    eye(g, w * 0.4, h * 0.22, 1.8, 'angry');
    eye(g, w * 0.6, h * 0.22, 1.8, 'angry', { x: 0, y: 0 }, true);
  }),

  // ---- enemies: Terry's dream school ----
  mockingKid: art('enemy-mocking-kid', 40, 54, (g, w, h) => {
    drawPerson(g, w, h, { seed: 1601, skin: 0xe8b98e, hair: 0xd9a441, hairStyle: 'swoop', shirt: 0x3f8f5f, pants: 0x5a6a8a, shoes: 0xf4efe6, eyes: 'happy', mouth: 'open' });
    const hd = headOf(w, h, 'kid');
    wonkyPoly(g, [[hd.cx - hd.r, hd.cy - hd.r * 0.45], [hd.cx - hd.r * 0.8, hd.cy - hd.r * 1.05], [hd.cx + hd.r * 0.8, hd.cy - hd.r * 1.05], [hd.cx + hd.r * 1.5, hd.cy - hd.r * 0.45]], { fill: 0xe0484d, seed: 1602, lineWidth: 2 });
  }),
  failingGrade: art('enemy-failing-grade', 48, 60, (g, w, h) => {
    stroke(g, [[w * 0.36, h * 0.84], [w * 0.3, h - 3]], INK, 4);
    stroke(g, [[w * 0.56, h * 0.84], [w * 0.64, h - 3]], INK, 4);
    wonkyPoly(g, [[w * 0.18, h * 0.04], [w * 0.9, h * 0.04], [w * 0.9, h * 0.24], [w * 0.44, h * 0.24], [w * 0.44, h * 0.4], [w * 0.8, h * 0.4], [w * 0.8, h * 0.58], [w * 0.44, h * 0.58], [w * 0.44, h * 0.88], [w * 0.18, h * 0.88]], { fill: 0xe0303a, seed: 1611, lineWidth: 3, wobble: 0.6 });
    eye(g, w * 0.26, h * 0.34, 4.5, 'angry');
    eye(g, w * 0.38, h * 0.34, 4.5, 'angry', { x: 0, y: 0 }, true);
    mouth(g, w * 0.31, h * 0.5, 8, 'grit');
  }),
  laughingMouth: art('enemy-laughing-mouth', 50, 40, (g, w, h) => {
    blob(g, w / 2, h / 2, w * 0.46, h * 0.4, { fill: 0xd8323f, seed: 1621, wobble: 0.06, lineWidth: 3 });
    blob(g, w / 2, h / 2, w * 0.34, h * 0.24, { fill: 0x3a1020, seed: 1622, lineWidth: 2 });
    g.fillStyle(0xffffff, 1);
    for (let i = 0; i < 5; i++) g.fillRect(w * (0.22 + i * 0.115), h * 0.3, w * 0.09, h * 0.12);
    for (let i = 0; i < 4; i++) g.fillRect(w * (0.28 + i * 0.115), h * 0.6, w * 0.09, h * 0.1);
    blob(g, w * 0.5, h * 0.62, w * 0.14, h * 0.08, { fill: 0xf28fb8, outline: null, seed: 1623 });
  }),

  // ---- enemies: Snowball's world ----
  helmetPup: art('enemy-helmet-pup', 36, 36, (g, w, h) => drawDog(g, w, h, { seed: 1701, fur: 0xd9a441, ear: 0x9a6a2a, helmet: true, eyes: 'angry', tongue: true })),
  trooper: dogTrooperSprite,
  bulldog: art('enemy-robo-bulldog', 54, 50, (g, w, h) => drawDog(g, w, h, { seed: 1711, fur: 0xc9a27a, ear: 0x8a6a4a, helmet: true, suit: 0x6b7a8f, jowls: true, eyes: 'angry' })),
  mastiff: art('enemy-drool-mastiff', 52, 48, (g, w, h) => drawDog(g, w, h, { seed: 1721, fur: 0x7a5a3a, ear: 0x4a3420, helmet: true, jowls: true, drool: true, eyes: 'sleepy' })),
  poodle: art('enemy-medic-poodle', 44, 48, (g, w, h) => drawDog(g, w, h, { seed: 1731, fur: 0xf2f0f6, ear: 0xe3dff0, helmet: true, suit: 0xf4efe6, curly: true, cross: true })),
  kennelMaster: art('enemy-kennel-master', 48, 50, (g, w, h) => drawDog(g, w, h, { seed: 1741, fur: 0x3a3a44, ear: 0x1c1a26, suit: 0x3d4a5c, cap: 0x2d3a6e, eyes: 'angry' })),
};

// ---- bosses --------------------------------------------------------------------------------------

/** Goldenfold as he dreams himself: bigger, glowing, and holding a machine gun. */
export const dreamGoldenfoldSprite = art('boss-dream-goldenfold', 80, 104, (g, w, h) => {
  g.fillStyle(0xc58bff, 0.3);
  g.fillEllipse(w / 2, h * 0.5, w, h * 0.95);
  drawPerson(g, w, h, { seed: 1801, ...GOLDENFOLD, pants: 0x6a5646, build: 'big', eyes: 'angry', mouth: 'grit' });
  wonkyRect(g, w * 0.46, h * 0.58, w * 0.52, 9, { fill: 0x3a3a44, seed: 1802, radius: 2, lineWidth: 2.5 });
  blob(g, w * 0.62, h * 0.68, 8, 8, { fill: 0x3a3a44, seed: 1803, lineWidth: 2 });
  wonkyRect(g, w * 0.4, h * 0.6, w * 0.14, 12, { fill: 0x7a4a2a, seed: 1804, radius: 3, lineWidth: 2 });
});

/** Snowball in the full war suit: Snuffles' head in a glass dome on a walking robot. */
export const snowballBossSprite = art('boss-snowball', 104, 116, (g, w, h) => {
  const metal = 0x9aa3b5;
  const dark = shade(metal, -0.35);
  for (const s of [-1, 1]) {
    wonkyRect(g, w / 2 + s * w * 0.2 - 9, h * 0.66, 18, h * 0.3, { fill: dark, seed: 1901 + s, radius: 4, lineWidth: 2.5 });
    wonkyRect(g, w / 2 + s * w * 0.2 - 13, h - 10, 26, 9, { fill: INK, seed: 1903 + s, radius: 3, lineWidth: 2 });
    // Arms with claws.
    wonkyRect(g, w / 2 + s * w * 0.38 - 8, h * 0.38, 16, h * 0.3, { fill: metal, seed: 1905 + s, radius: 5, lineWidth: 2.5 });
    wonkyPoly(g, [[w / 2 + s * w * 0.38 - 9, h * 0.68], [w / 2 + s * w * 0.38 + 9, h * 0.68], [w / 2 + s * w * 0.38 + s * 12, h * 0.8]], { fill: dark, seed: 1907 + s, lineWidth: 2 });
  }
  wonkyRect(g, w * 0.24, h * 0.36, w * 0.52, h * 0.36, { fill: metal, seed: 1909, radius: 10, lineWidth: 3 });
  dot(g, w / 2, h * 0.52, 8, 0x6fd0ff);
  dot(g, w / 2 - 2, h * 0.5, 3, 0xffffff);
  for (let i = 0; i < 3; i++) dot(g, w * (0.33 + i * 0.17), h * 0.66, 3, 0xff4a3d);
  // The dome with Snowball inside.
  g.fillStyle(0xbfe4ff, 0.45);
  g.fillCircle(w / 2, h * 0.24, w * 0.22);
  drawDogHead(g, w / 2, h * 0.26, w * 0.15, 1911);
  g.lineStyle(3, INK, 1);
  g.strokeCircle(w / 2, h * 0.24, w * 0.22);
  g.fillStyle(0xffffff, 0.55);
  g.fillEllipse(w * 0.42, h * 0.14, w * 0.1, h * 0.04);
});

/** A dog's head for cutscene portraits: Snuffles before and after the helmet, Snowball, troopers. */
export function drawDogPortrait(g: Graphics, S: number, expression: string, o: { fur: number; ear: number; helmet: boolean; suit?: number; seed: number }): void {
  if (o.suit !== undefined) wonkyRect(g, S * 0.14, S * 0.78, S * 0.72, S * 0.3, { fill: o.suit, seed: o.seed, radius: S * 0.1, lineWidth: 4 });
  else blob(g, S / 2, S * 0.92, S * 0.34, S * 0.2, { fill: o.fur, seed: o.seed, lineWidth: 4 });
  const cx = S / 2;
  const hy = S * 0.5;
  const hr = S * 0.3;
  blob(g, cx - hr * 0.95, hy + hr * 0.15, hr * 0.32, hr * 0.62, { fill: o.ear, seed: o.seed + 1, lineWidth: 4 });
  blob(g, cx + hr * 0.95, hy + hr * 0.15, hr * 0.32, hr * 0.62, { fill: o.ear, seed: o.seed + 2, lineWidth: 4 });
  blob(g, cx, hy, hr, hr * 0.92, { fill: o.fur, seed: o.seed + 3, wobble: 0.03, lineWidth: 4 });
  blob(g, cx, hy + hr * 0.45, hr * 0.5, hr * 0.36, { fill: shade(o.fur, 0.25), seed: o.seed + 4, lineWidth: 3 });
  dot(g, cx, hy + hr * 0.3, hr * 0.14, INK);
  const mood: EyeMood = expression === 'angry' ? 'angry' : expression === 'sad' ? 'sleepy' : expression === 'scared' ? 'scared' : expression === 'happy' ? 'happy' : 'normal';
  eye(g, cx - hr * 0.38, hy - hr * 0.12, hr * 0.2, mood, { x: 0.1, y: 0.1 });
  eye(g, cx + hr * 0.38, hy - hr * 0.12, hr * 0.2, mood, { x: -0.1, y: 0.1 }, true);
  mouth(g, cx, hy + hr * 0.66, hr * 0.4, expression === 'happy' ? 'smile' : expression === 'angry' ? 'grit' : expression === 'sad' ? 'frown' : 'flat');
  if (o.helmet) dogHelmet(g, cx, hy, hr, o.seed + 5);
}

/** Just the head (for the boss dome). */
function drawDogHead(g: Graphics, cx: number, hy: number, hr: number, seed: number): void {
  blob(g, cx - hr * 0.95, hy + hr * 0.15, hr * 0.32, hr * 0.62, { fill: SNUFFLES_EAR, seed, lineWidth: 2.5 });
  blob(g, cx + hr * 0.95, hy + hr * 0.15, hr * 0.32, hr * 0.62, { fill: SNUFFLES_EAR, seed: seed + 1, lineWidth: 2.5 });
  blob(g, cx, hy, hr, hr * 0.92, { fill: SNUFFLES_FUR, seed: seed + 2, lineWidth: 2.5 });
  blob(g, cx, hy + hr * 0.45, hr * 0.5, hr * 0.36, { fill: 0xffffff, seed: seed + 3, lineWidth: 2 });
  dot(g, cx, hy + hr * 0.3, hr * 0.14, INK);
  eye(g, cx - hr * 0.38, hy - hr * 0.12, hr * 0.2, 'angry');
  eye(g, cx + hr * 0.38, hy - hr * 0.12, hr * 0.2, 'angry', { x: 0, y: 0 }, true);
  dogHelmet(g, cx, hy, hr, seed + 4);
}

// ---- props ---------------------------------------------------------------------------------------

/** A swirl of dream: where Morty dives in or wakes up. */
export function dreamSwirl(g: Graphics, x: number, y: number, rx: number, ry: number): void {
  blob(g, x, y, rx, ry, { fill: 0x3a2a7a, outline: 0x1c1440, lineWidth: 3, seed: 2001, wobble: 0.08 });
  blob(g, x, y, rx * 0.78, ry * 0.78, { fill: 0x7f5fd6, outline: null, seed: 2002, wobble: 0.1 });
  blob(g, x, y, rx * 0.5, ry * 0.5, { fill: 0xc9b3ff, outline: null, seed: 2003, wobble: 0.12 });
  g.lineStyle(2, 0xf4e9ff, 0.9);
  for (let i = 0; i < 3; i++) {
    g.beginPath();
    g.arc(x, y, rx * (0.3 + i * 0.18), i * 2, i * 2 + 2.2, false);
    g.strokePath();
  }
  for (let i = 0; i < 5; i++) {
    const a = i * 1.3;
    dot(g, x + Math.cos(a) * rx * 0.62, y + Math.sin(a) * ry * 0.62, 1.8, 0xffffff);
  }
}

export const DOG_PROP_ART: SpriteArt[] = [
  art('dream-swirl', 90, 90, (g, w, h) => dreamSwirl(g, w / 2, h / 2, w * 0.46, h * 0.46)),
  art('dream-inceptor', 44, 40, (g, w, h) => {
    wonkyRect(g, w * 0.1, h * 0.42, w * 0.8, h * 0.52, { fill: 0x5d6b7b, seed: 2011, radius: 5, lineWidth: 2.5 });
    for (let i = 0; i < 3; i++) dot(g, w * (0.28 + i * 0.22), h * 0.62, 3, [0x97ce4c, 0xffd54a, 0xff4a3d][i]);
    stroke(g, [[w * 0.5, h * 0.42], [w * 0.5, h * 0.2]], INK, 3);
    wonkyPoly(g, [[w * 0.22, h * 0.24], [w * 0.5, h * 0.02], [w * 0.78, h * 0.24], [w * 0.5, h * 0.3]], { fill: 0xc9ced9, seed: 2012, lineWidth: 2 });
    stroke(g, [[w * 0.9, h * 0.7], [w * 1.0, h * 0.9]], 0xd8327f, 2.5);
  }),
  art('goldenfold-bed', 96, 64, (g, w, h) => {
    wonkyRect(g, 4, h * 0.2, w - 8, h * 0.72, { fill: 0x8a6d4b, seed: 2021, radius: 6, lineWidth: 2.5 });
    wonkyRect(g, 10, h * 0.28, w * 0.3, h * 0.3, { fill: 0xf4efe6, seed: 2022, radius: 8, lineWidth: 2 });
    wonkyRect(g, w * 0.28, h * 0.34, w * 0.68, h * 0.52, { fill: 0x3f6fb5, seed: 2023, radius: 6, lineWidth: 2.5 });
    blob(g, w * 0.22, h * 0.42, 13, 12, { fill: GOLDENFOLD.skin, seed: 2024, lineWidth: 2.5 });
    stroke(g, [[w * 0.17, h * 0.4], [w * 0.2, h * 0.42]], INK, 2);
    stroke(g, [[w * 0.24, h * 0.4], [w * 0.27, h * 0.42]], INK, 2);
    stroke(g, [[w * 0.18, h * 0.48], [w * 0.26, h * 0.48]], GOLDENFOLD.mustache, 3);
  }),
  art('creaky-board', 60, 22, (g, w, h) => {
    wonkyRect(g, 2, 4, w - 4, h - 8, { fill: 0x7a5a3a, seed: 2031, radius: 2, lineWidth: 2 });
    g.lineStyle(1.5, 0x4a3420, 1);
    g.lineBetween(8, h / 2, w - 8, h / 2 - 1);
    dot(g, 7, h / 2, 1.8, 0xc9ced9);
    dot(g, w - 7, h / 2, 1.8, 0xc9ced9);
    g.lineStyle(2, 0xffe27a, 0.8);
    g.lineBetween(w * 0.4, 2, w * 0.36, -2);
    g.lineBetween(w * 0.6, 2, w * 0.64, -2);
  }),
  art('velvet-rope', 120, 40, (g, w, h) => {
    for (const x of [8, w - 8]) {
      wonkyRect(g, x - 4, 8, 8, h - 12, { fill: 0xd9a441, seed: 2041 + x, radius: 2, lineWidth: 2 });
      blob(g, x, 8, 6, 5, { fill: 0xf2c14e, seed: 2043 + x, lineWidth: 2 });
    }
    g.lineStyle(7, INK, 1);
    g.beginPath();
    g.arc(w / 2, -w * 0.6, w * 0.82, Math.PI * 0.33, Math.PI * 0.67, false);
    g.strokePath();
    g.lineStyle(4, 0xb01e3a, 1);
    g.beginPath();
    g.arc(w / 2, -w * 0.6, w * 0.82, Math.PI * 0.33, Math.PI * 0.67, false);
    g.strokePath();
  }),
  art('club-door', 84, 96, (g, w, h) => {
    wonkyRect(g, w * 0.14, h * 0.3, w * 0.72, h * 0.68, { fill: 0x2a1a3a, seed: 2051, radius: 4, lineWidth: 3 });
    dot(g, w * 0.76, h * 0.66, 3, 0xf2c14e);
    // Neon sign: a pink star.
    const cx = w / 2;
    const cy = h * 0.14;
    const pts: [number, number][] = [];
    for (let i = 0; i < 10; i++) {
      const r = i % 2 ? 7 : 16;
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
    }
    g.fillStyle(0xff7ae3, 0.3);
    g.fillCircle(cx, cy, 22);
    wonkyPoly(g, pts, { fill: 0xff7ae3, seed: 2052, lineWidth: 2.5 });
  }),
  art('dreamer-sheep', 50, 44, (g, w, h) => {
    for (let i = 0; i < 6; i++) blob(g, w * (0.3 + (i % 3) * 0.18), h * (0.55 + Math.floor(i / 3) * 0.16), w * 0.14, h * 0.15, { fill: 0xfaf7f0, seed: 2061 + i, lineWidth: 2 });
    blob(g, w * 0.2, h * 0.62, w * 0.12, h * 0.14, { fill: 0x2a2432, seed: 2067, lineWidth: 2 });
    stroke(g, [[w * 0.14, h * 0.6], [w * 0.2, h * 0.62]], 0xffffff, 1.5);
    dreamBubble(g, w * 0.78, h * 0.2);
  }),
  art('dreamer-doll', 44, 46, (g, w, h) => {
    wonkyRect(g, 4, h * 0.56, w - 8, h * 0.36, { fill: 0xf2b0cf, seed: 2071, radius: 6, lineWidth: 2 });
    blob(g, w * 0.3, h * 0.56, 8, 8, { fill: 0xf7e3dd, seed: 2072, lineWidth: 2 });
    stroke(g, [[w * 0.25, h * 0.55], [w * 0.29, h * 0.56]], INK, 1.5);
    stroke(g, [[w * 0.32, h * 0.55], [w * 0.36, h * 0.56]], INK, 1.5);
    dreamBubble(g, w * 0.72, h * 0.22);
  }),
  art('dreamer-sleeper', 56, 50, (g, w, h) => {
    g.fillStyle(0xc9b3ff, 0.35);
    g.fillEllipse(w / 2, h * 0.72, w, h * 0.4);
    wonkyRect(g, 6, h * 0.58, w - 12, h * 0.26, { fill: 0x5b7fd0, seed: 2081, radius: 6, lineWidth: 2 });
    blob(g, w * 0.24, h * 0.58, 8, 8, { fill: 0xe8b98e, seed: 2082, lineWidth: 2 });
    dreamBubble(g, w * 0.76, h * 0.2);
  }),
  art('terry-bed', 96, 64, (g, w, h) => {
    wonkyRect(g, 4, h * 0.2, w - 8, h * 0.72, { fill: 0x3a2418, seed: 2091, radius: 6, lineWidth: 2.5 });
    wonkyRect(g, 10, h * 0.28, w * 0.3, h * 0.3, { fill: 0xd9d0c0, seed: 2092, radius: 8, lineWidth: 2 });
    wonkyRect(g, w * 0.28, h * 0.34, w * 0.68, h * 0.52, { fill: 0x8b2323, seed: 2093, radius: 6, lineWidth: 2.5 });
    for (let i = 0; i < 3; i++) {
      g.fillStyle(0x4f5a2a, 1);
      g.fillRect(w * 0.3, h * (0.42 + i * 0.14), w * 0.64, h * 0.05);
    }
    blob(g, w * 0.22, h * 0.42, 12, 11, { fill: 0xd98f7f, seed: 2094, lineWidth: 2.5 });
    fedora(g, w * 0.22, h * 0.42, 12, 2095);
  }),
  art('dog-tv', 60, 54, (g, w, h) => {
    wonkyRect(g, 4, 4, w - 8, h - 14, { fill: 0x3a3150, seed: 2101, radius: 5, lineWidth: 2.5 });
    wonkyRect(g, 10, 9, w - 20, h - 24, { fill: 0x9fd8f0, seed: 2102, radius: 3, lineWidth: 2 });
    // A documentary: a wolf, then a leash.
    blob(g, w * 0.4, h * 0.42, 9, 7, { fill: 0x8a8fa8, seed: 2103, lineWidth: 1.5 });
    wonkyPoly(g, [[w * 0.33, h * 0.36], [w * 0.36, h * 0.26], [w * 0.4, h * 0.36]], { fill: 0x8a8fa8, seed: 2104, lineWidth: 1.5 });
    stroke(g, [[w * 0.5, h * 0.44], [w * 0.7, h * 0.32]], 0xe0484d, 2);
    stroke(g, [[w * 0.3, h - 10], [w * 0.2, h - 2]], INK, 3);
    stroke(g, [[w * 0.7, h - 10], [w * 0.8, h - 2]], INK, 3);
  }),
  art('dog-searchlight', 44, 58, (g, w, h) => {
    g.fillStyle(0xfff2a8, 0.28);
    g.fillTriangle(w / 2, h * 0.3, 0, h, w, h);
    wonkyRect(g, w / 2 - 4, h * 0.3, 8, h * 0.66, { fill: 0x5d6b7b, seed: 2111, radius: 2, lineWidth: 2 });
    blob(g, w / 2, h * 0.24, 11, 9, { fill: 0x3d4a5c, seed: 2112, lineWidth: 2.5 });
    blob(g, w / 2, h * 0.26, 7, 5, { fill: 0xfff2a8, seed: 2113, lineWidth: 1.5 });
    wonkyPoly(g, [[w * 0.3, h * 0.08], [w * 0.5, 0], [w * 0.7, h * 0.08]], { fill: 0xd9a441, seed: 2114, lineWidth: 1.5 });
  }),
  art('dog-checkpoint', 110, 70, (g, w, h) => {
    for (const x of [8, w - 8]) wonkyRect(g, x - 6, 10, 12, h - 12, { fill: 0x3d4a5c, seed: 2121 + x, radius: 3, lineWidth: 2 });
    wonkyRect(g, 8, 16, w - 16, 12, { fill: 0xd9a441, seed: 2125, radius: 4, lineWidth: 2 });
    // A bone emblem.
    blob(g, w / 2 - 12, 10, 6, 6, { fill: 0xf4efe6, seed: 2126, lineWidth: 2 });
    blob(g, w / 2 + 12, 10, 6, 6, { fill: 0xf4efe6, seed: 2127, lineWidth: 2 });
    wonkyRect(g, w / 2 - 12, 6, 24, 8, { fill: 0xf4efe6, seed: 2128, radius: 3, lineWidth: 2 });
  }),
  art('luxury-bed', 96, 60, (g, w, h) => {
    wonkyRect(g, 4, h * 0.3, w - 8, h * 0.62, { fill: 0x8b5fbf, seed: 2131, radius: 20, lineWidth: 2.5 });
    wonkyRect(g, 12, h * 0.36, w - 24, h * 0.4, { fill: 0xf2c14e, seed: 2132, radius: 16, lineWidth: 2 });
    // A bone-shaped pillow.
    blob(g, w * 0.3, h * 0.44, 7, 7, { fill: 0xf4efe6, seed: 2133, lineWidth: 2 });
    blob(g, w * 0.3, h * 0.6, 7, 7, { fill: 0xf4efe6, seed: 2134, lineWidth: 2 });
    wonkyRect(g, w * 0.27, h * 0.44, 12, 16, { fill: 0xf4efe6, seed: 2135, radius: 3, lineWidth: 2 });
  }),
  art('golden-bowl', 40, 24, (g, w, h) => {
    wonkyPoly(g, [[3, 6], [w - 3, 6], [w - 8, h - 3], [8, h - 3]], { fill: 0xf2c14e, seed: 2141, lineWidth: 2.5 });
    for (let i = 0; i < 5; i++) dot(g, 10 + i * 5, 6, 3, 0x8a5a3a);
    stroke(g, [[12, 12], [w - 12, 12]], 0xffffff, 1.5);
  }),
  art('nightmare-teacher', 52, 92, (g, w, h) => {
    g.fillStyle(0x1c1440, 0.85);
    g.fillEllipse(w / 2, h * 0.6, w * 0.9, h * 0.8);
    blob(g, w / 2, h * 0.2, w * 0.3, h * 0.16, { fill: 0x1c1440, seed: 2151, lineWidth: 3 });
    dot(g, w * 0.4, h * 0.2, 4, 0xff4a3d);
    dot(g, w * 0.6, h * 0.2, 4, 0xff4a3d);
    wonkyRect(g, w * 0.76, h * 0.36, 6, h * 0.34, { fill: 0xd9a441, seed: 2152, radius: 2, lineWidth: 2 });
  }),
  art('smith-couch', 110, 56, (g, w, h) => {
    wonkyRect(g, 4, h * 0.2, w - 8, h * 0.72, { fill: 0x5f7f45, seed: 2161, radius: 10, lineWidth: 2.5 });
    wonkyRect(g, 14, h * 0.48, w - 28, h * 0.3, { fill: 0x7a9f5a, seed: 2162, radius: 6, lineWidth: 2 });
  }),
  art('battery-box', 36, 26, (g, w, h) => {
    wonkyRect(g, 2, 6, w - 4, h - 8, { fill: 0xd98f3a, seed: 2171, radius: 3, lineWidth: 2 });
    for (let i = 0; i < 4; i++) wonkyRect(g, 6 + i * 7, 1, 5, 9, { fill: 0x3a3a44, seed: 2172 + i, radius: 1, lineWidth: 1.2 });
  }),
];

/** A little thought bubble with a Z in it (dreamers). */
function dreamBubble(g: Graphics, x: number, y: number): void {
  dot(g, x - 8, y + 10, 2, 0xffffff);
  blob(g, x, y, 9, 7, { fill: 0xffffff, seed: 2181, lineWidth: 1.5 });
  stroke(g, [[x - 3, y - 3], [x + 3, y - 3], [x - 3, y + 3], [x + 3, y + 3]], 0x7f5fd6, 1.8);
}

// ---- enemy shots ---------------------------------------------------------------------------------

export const DOG_SHOT_ART: SpriteArt[] = [
  art('shot-cork', 14, 12, (g) => {
    wonkyRect(g, 1, 2, 12, 8, { fill: 0xc9935f, seed: 2201, radius: 3, lineWidth: 2 });
  }),
  art('shot-teacup', 18, 14, (g) => {
    wonkyPoly(g, [[2, 3], [14, 3], [12, 12], [4, 12]], { fill: 0xffffff, seed: 2211, lineWidth: 2 });
    stroke(g, [[14, 5], [17, 7], [14, 9]], INK, 1.5);
    dot(g, 8, 7, 2, 0xf28fb8);
  }),
  art('shot-kibble', 12, 12, (g) => {
    blob(g, 6, 6, 5, 4, { fill: 0x8a5a3a, seed: 2221, lineWidth: 1.5 });
  }),
  art('shot-fpaper', 18, 20, (g) => {
    wonkyRect(g, 1, 1, 16, 18, { fill: 0xf4efe6, seed: 2231, radius: 1, lineWidth: 1.5 });
    stroke(g, [[7, 15], [7, 5], [13, 5]], 0xe0303a, 2.5);
    stroke(g, [[7, 10], [11, 10]], 0xe0303a, 2.5);
  }),
  // A fat round dream bullet (enemy shots are never streaks).
  art('shot-bullet', 12, 12, (g) => {
    blob(g, 6, 6, 5, 5, { fill: 0xd9a441, seed: 2241, wobble: 0.04, lineWidth: 2 });
    dot(g, 4.5, 4.5, 1.6, 0xfff0b8);
  }),
  art('shot-laugh', 22, 16, (g) => {
    stroke(g, [[2, 12], [6, 3], [10, 12]], 0xff7ae3, 2.5);
    stroke(g, [[3.5, 8], [8.5, 8]], 0xff7ae3, 2);
    stroke(g, [[13, 3], [13, 12]], 0xff7ae3, 2.5);
    stroke(g, [[19, 3], [19, 12]], 0xff7ae3, 2.5);
    stroke(g, [[13, 7.5], [19, 7.5]], 0xff7ae3, 2);
  }),
];
