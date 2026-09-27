/**
 * Reusable drawing for people: chibi world sprites and cutscene portraits. All original art,
 * drawn in code with the engine's wobbly-outline helpers.
 */
import { blob, dot, eye, INK, jitter, mouth, shade, stroke, wonkyPoly, wonkyRect, type EyeMood } from '../../engine/art/draw';
import type { Graphics, SpritePose } from '../../engine/types';

export const SKIN = 0xf3cfa8;
export const SKIN_PALE = 0xefd9c4;

export type HairStyle = 'morty' | 'rick' | 'buzz' | 'stubble' | 'sides' | 'long' | 'swoop' | 'bob' | 'ponytail' | 'none';
export type MouthKind = 'flat' | 'smile' | 'frown' | 'open' | 'wavy' | 'grit';

/** Clothing and face details shared by world sprites and portraits. */
export interface OutfitStyle {
  /** V-neck shows the undershirt (or skin); collar adds a shirt collar at the neck. */
  neckline?: 'v' | 'collar' | 'v-collar';
  undershirt?: number;
  tie?: number;
  /** Horizontal bands across the chest, top to bottom (Jerry's season 1 shirt). */
  stripe?: readonly number[];
  /** Bare or short sleeves show the arms. */
  sleeves?: 'none' | 'short' | 'long';
  mustache?: number;
  /** Lipstick color. */
  lips?: number;
  lashes?: boolean;
}

export interface PersonStyle extends OutfitStyle {
  seed: number;
  skin: number;
  hair: number;
  hairStyle: HairStyle;
  shirt: number;
  pants: number;
  shoes?: number;
  /** Lab coat or jacket over the shirt. */
  coat?: number;
  build?: 'kid' | 'adult' | 'big';
  eyes?: EyeMood;
  mouth?: MouthKind;
  brow?: number;
  unibrow?: boolean;
  glasses?: boolean;
}

/** Hairstyles with a layer behind the head. */
function hasBackHair(style: HairStyle): boolean {
  return style === 'rick' || style === 'long' || style === 'bob' || style === 'ponytail' || style === 'sides';
}

/**
 * Hair behind the head, drawn before the face. It hangs beside the face and neck but never
 * under the chin, so long hair can't read as a beard.
 */
export function drawHairBack(g: Graphics, style: HairStyle, color: number, cx: number, cy: number, r: number, seed: number): void {
  const back = shade(color, -0.12);
  switch (style) {
    case 'rick':
      drawHair(g, 'rick', color, cx, cy, r, seed);
      break;
    case 'sides':
      // A balding fringe: only its ends show beside the head, around the ears.
      blob(g, cx, cy - r * 0.02, r * 1.22, r * 0.52, { fill: color, seed, lineWidth: 2 });
      break;
    case 'bob':
    case 'long': {
      const len = style === 'long' ? 1.5 : 0.92;
      // Crown behind the head: its lowest point is hidden by the face.
      blob(g, cx, cy - r * 0.14, r * 1.12, r * 0.96, { fill: back, seed });
      for (const side of [-1, 1]) {
        wonkyPoly(
          g,
          [
            [cx + side * r * 0.78, cy - r * 0.62],
            [cx + side * r * 1.16, cy - r * 0.12],
            [cx + side * r * 1.2, cy + r * (len - 0.4)],
            [cx + side * r * 1.1, cy + r * (len - 0.12)],
            [cx + side * r * 1.26, cy + r * len],
            [cx + side * r * 0.9, cy + r * (len - 0.02)],
            [cx + side * r * 0.82, cy + r * 0.3],
          ],
          { fill: back, seed: seed + (side > 0 ? 2 : 3), lineWidth: 2 },
        );
      }
      break;
    }
    case 'ponytail':
      blob(g, cx, cy - r * 0.14, r * 1.08, r * 0.94, { fill: back, seed });
      // The tail swings out from behind the head on one side.
      wonkyPoly(
        g,
        [
          [cx + r * 0.66, cy - r * 0.8],
          [cx + r * 1.22, cy - r * 0.62],
          [cx + r * 1.46, cy - r * 0.02],
          [cx + r * 1.34, cy + r * 0.62],
          [cx + r * 1.14, cy + r * 0.2],
          [cx + r * 0.9, cy - r * 0.24],
        ],
        { fill: back, seed: seed + 4, lineWidth: 2 },
      );
      break;
    default:
      break;
  }
}

/** Hair in front of the face: bangs, caps, sides. */
export function drawHairFront(g: Graphics, style: HairStyle, color: number, cx: number, cy: number, r: number, seed: number): void {
  switch (style) {
    case 'rick':
    case 'sides':
    case 'none':
      break;
    case 'stubble':
      // Close-cropped: a faint cap with short dark strands.
      g.fillStyle(color, 0.35);
      g.slice(cx, cy, r * 0.99, Math.PI * 1.08, Math.PI * 1.92, false);
      g.fillPath();
      for (let i = 0; i < 11; i++) {
        const a = Math.PI * (1.12 + (i / 10) * 0.76);
        const rr = r * (0.62 + jitter(seed, i) * 0.12);
        const x = cx + Math.cos(a) * rr;
        const y = cy + Math.sin(a) * rr;
        stroke(g, [[x, y], [x + Math.cos(a) * r * 0.1, y + Math.sin(a) * r * 0.1]], color, Math.max(1.2, r * 0.05));
      }
      break;
    case 'bob':
    case 'long':
      wonkyPoly(
        g,
        [
          [cx - r, cy - r * 0.1],
          [cx - r * 0.6, cy - r * 0.97],
          [cx + r * 0.7, cy - r * 0.97],
          [cx + r, cy - r * 0.1],
          [cx + r * 0.28, cy - r * 0.58],
          [cx - r * 0.42, cy - r * 0.5],
        ],
        { fill: color, seed: seed + 10, lineWidth: 2 },
      );
      break;
    case 'ponytail': {
      // Pulled back: a smooth cap with a side part, no bangs.
      const pts: [number, number][] = [];
      for (let i = 0; i <= 10; i++) {
        const a = Math.PI + (i / 10) * Math.PI;
        pts.push([cx + Math.cos(a) * r * 1.03, cy + Math.sin(a) * r * 1.01 - r * 0.02]);
      }
      pts.push([cx + r * 0.98, cy - r * 0.14], [cx + r * 0.5, cy - r * 0.52], [cx - r * 0.08, cy - r * 0.64], [cx - r * 0.55, cy - r * 0.5], [cx - r * 0.98, cy - r * 0.14]);
      wonkyPoly(g, pts, { fill: color, seed: seed + 11, wobble: 1.2 });
      stroke(g, [[cx - r * 0.08, cy - r * 0.64], [cx + r * 0.1, cy - r * 0.98]], shade(color, -0.25), 2);
      break;
    }
    default:
      drawHair(g, style, color, cx, cy, r, seed);
  }
}

/** Front-only hairstyles (and Rick's spikes), drawn over a head at (cx, cy) with radius r. */
export function drawHair(g: Graphics, style: HairStyle, color: number, cx: number, cy: number, r: number, seed: number): void {
  const out = { fill: color, seed, wobble: 1.2 };
  switch (style) {
    case 'morty': {
      const pts: [number, number][] = [];
      for (let i = 0; i <= 10; i++) {
        const a = Math.PI + (i / 10) * Math.PI;
        pts.push([cx + Math.cos(a) * r * 1.04, cy + Math.sin(a) * r * 1.02 - r * 0.02]);
      }
      pts.push([cx + r * 0.95, cy - r * 0.05], [cx + r * 0.5, cy - r * 0.42], [cx + r * 0.1, cy - r * 0.3], [cx - r * 0.35, cy - r * 0.45], [cx - r * 0.95, cy - r * 0.05]);
      wonkyPoly(g, pts, out);
      break;
    }
    case 'rick': {
      const pts: [number, number][] = [];
      const spikes = 11;
      for (let i = 0; i <= spikes * 2; i++) {
        const a = Math.PI * 0.92 + (i / (spikes * 2)) * Math.PI * 1.16;
        const len = i % 2 === 0 ? r * (1.55 + jitter(seed, i) * 0.18) : r * 0.95;
        pts.push([cx + Math.cos(a) * len, cy + Math.sin(a) * len - r * 0.1]);
      }
      wonkyPoly(g, pts, out);
      break;
    }
    case 'buzz':
      g.fillStyle(color, 1);
      g.slice(cx, cy, r * 1.02, Math.PI, Math.PI * 2, false);
      g.fillPath();
      g.lineStyle(2.5, INK, 1);
      g.beginPath();
      g.arc(cx, cy, r * 1.02, Math.PI, Math.PI * 2, false);
      g.strokePath();
      break;
    case 'swoop': {
      const pts: [number, number][] = [
        [cx - r * 1.02, cy + r * 0.1],
        [cx - r * 0.95, cy - r * 0.7],
        [cx - r * 0.2, cy - r * 1.18],
        [cx + r * 0.7, cy - r * 1.0],
        [cx + r * 1.05, cy - r * 0.3],
        [cx + r * 0.9, cy - r * 0.1],
        [cx + r * 0.2, cy - r * 0.55],
        [cx - r * 0.7, cy - r * 0.35],
      ];
      wonkyPoly(g, pts, out);
      break;
    }
    default:
      break;
  }
}

/** A mustache centred at (x, y), `w` wide. */
function drawMustache(g: Graphics, x: number, y: number, w: number, color: number, seed: number): void {
  wonkyPoly(
    g,
    [
      [x - w * 0.5, y + w * 0.16],
      [x - w * 0.38, y - w * 0.1],
      [x - w * 0.08, y - w * 0.14],
      [x, y - w * 0.06],
      [x + w * 0.08, y - w * 0.14],
      [x + w * 0.38, y - w * 0.1],
      [x + w * 0.5, y + w * 0.16],
      [x + w * 0.22, y + w * 0.08],
      [x, y + w * 0.1],
      [x - w * 0.22, y + w * 0.08],
    ],
    { fill: color, seed, lineWidth: Math.max(1.5, w * 0.06), wobble: 0.4 },
  );
}

/** Lipstick under the mouth line. */
function drawLips(g: Graphics, x: number, y: number, w: number, color: number): void {
  g.fillStyle(color, 1);
  g.fillEllipse(x, y + w * 0.04, w * 0.72, w * 0.3);
}

/** Eyelashes flicking out from the top outer corner of an eye. */
function drawLashes(g: Graphics, x: number, y: number, r: number, side: -1 | 1): void {
  for (let i = 0; i < 2; i++) {
    const a = -Math.PI / 2 + side * (0.75 + i * 0.35);
    stroke(g, [[x + Math.cos(a) * r, y + Math.sin(a) * r], [x + Math.cos(a) * r * 1.55, y + Math.sin(a) * r * 1.55]], INK, Math.max(1.5, r * 0.22));
  }
}

/**
 * Neckline, tie and stripes on a shirt whose top edge is at (cx, top), `bw` wide and `bh` tall.
 * Draw after the shirt and before the head.
 */
function drawOutfit(g: Graphics, o: OutfitStyle, shirt: number, skin: number, cx: number, top: number, bw: number, bh: number, seed: number): void {
  if (o.stripe?.length) {
    const band = bh * 0.13;
    o.stripe.forEach((c, i) => {
      g.fillStyle(c, 1);
      g.fillRect(cx - bw * 0.47, top + bh * 0.42 + i * band, bw * 0.94, band);
    });
  }
  const v = o.neckline === 'v' || o.neckline === 'v-collar';
  if (v) {
    wonkyPoly(g, [[cx - bw * 0.16, top + 1], [cx + bw * 0.16, top + 1], [cx, top + bh * 0.42]], { fill: o.undershirt ?? skin, seed: seed + 40, lineWidth: 2, wobble: 0.3 });
  }
  if (o.tie !== undefined) {
    const t = top + (v ? bh * 0.06 : bh * 0.02);
    const tw = Math.max(3, bw * 0.07);
    wonkyPoly(g, [[cx - tw, t], [cx + tw, t], [cx + tw * 1.3, t + bh * 0.62], [cx, t + bh * 0.72], [cx - tw * 1.3, t + bh * 0.62]], { fill: o.tie, seed: seed + 41, lineWidth: 2, wobble: 0.3 });
  }
  if (o.neckline === 'collar' || o.neckline === 'v-collar') {
    const cw = bw * 0.2;
    const collar = shade(shirt, 0.18);
    wonkyPoly(g, [[cx - cw * 1.05, top], [cx - cw * 0.05, top + 1], [cx - cw * 0.3, top + bh * 0.18]], { fill: collar, seed: seed + 42, lineWidth: 2, wobble: 0.3 });
    wonkyPoly(g, [[cx + cw * 1.05, top], [cx + cw * 0.05, top + 1], [cx + cw * 0.3, top + bh * 0.18]], { fill: collar, seed: seed + 43, lineWidth: 2, wobble: 0.3 });
  }
}

/** Full-body chibi sprite, feet at the bottom of the w x h box. */
/**
 * Draws a person standing, or with a `pose`: one foot up mid-stride (the arms swinging against
 * the legs), and/or one arm left out because a held weapon's arm is drawn in its place.
 */
export function drawPerson(g: Graphics, w: number, h: number, s: PersonStyle, pose?: SpritePose): void {
  const cx = w / 2;
  const stride = pose?.stride ?? 0;
  const freeArm = pose?.freeArm ?? 0;
  const build = s.build ?? 'kid';
  const bodyW = w * (build === 'big' ? 0.78 : build === 'adult' ? 0.6 : 0.56);
  const headR = w * (build === 'kid' ? 0.3 : build === 'big' ? 0.27 : 0.26);
  const headY = h * (build === 'kid' ? 0.3 : 0.26);
  const torsoTop = headY + headR * 0.8;
  const torsoBot = h * 0.76;
  const shoe = s.shoes ?? 0x3b2f2a;

  if (hasBackHair(s.hairStyle)) drawHairBack(g, s.hairStyle, s.hair, cx, headY, headR, s.seed);

  // Mid-stride, one foot is up off the floor and its leg is shorter.
  const lift = (side: number) => (stride === side ? 3.5 : 0);
  blob(g, cx - bodyW * 0.22, h - 5 - lift(-1), bodyW * (stride === -1 ? 0.18 : 0.2), 4.5, { fill: shoe, seed: s.seed + 1, lineWidth: 2 });
  blob(g, cx + bodyW * 0.22, h - 5 - lift(1), bodyW * (stride === 1 ? 0.18 : 0.2), 4.5, { fill: shoe, seed: s.seed + 2, lineWidth: 2 });
  if (stride === 0) {
    wonkyRect(g, cx - bodyW * 0.38, torsoBot - 4, bodyW * 0.76, h - torsoBot - 3, { fill: s.pants, seed: s.seed + 3, radius: 3, lineWidth: 2.5 });
    stroke(g, [[cx, torsoBot], [cx, h - 8]], shade(s.pants, -0.35), 2);
  } else {
    for (const side of [-1, 1]) {
      const x = side < 0 ? cx - bodyW * 0.38 : cx;
      wonkyRect(g, x, torsoBot - 4, bodyW * 0.38, h - torsoBot - 3 - lift(side), { fill: s.pants, seed: s.seed + 3 + side, radius: 3, lineWidth: 2.5 });
    }
  }

  const bare = s.coat === undefined && (s.sleeves === 'none' || s.sleeves === 'short');
  const armColor = s.coat ?? (bare ? s.skin : s.shirt);
  const armY = torsoTop + (torsoBot - torsoTop) * 0.45;
  const armH = (torsoBot - torsoTop) * 0.42;
  for (const side of [-1, 1]) {
    if (side === freeArm) continue;
    // Arms swing against the legs: the one opposite the lifted foot comes forward (a little lower).
    const swing = stride === 0 ? 0 : stride === side ? -1 : 1.5;
    blob(g, cx + side * bodyW * 0.55, armY + swing, bodyW * 0.14, armH, { fill: armColor, seed: s.seed + (side < 0 ? 4 : 5), lineWidth: 2.5 });
    if (bare && s.sleeves === 'short') blob(g, cx + side * bodyW * 0.53, armY + swing - armH * 0.55, bodyW * 0.15, armH * 0.42, { fill: s.shirt, seed: s.seed + (side < 0 ? 12 : 13), lineWidth: 2 });
    dot(g, cx + side * bodyW * 0.56, torsoBot - 2 + swing, bodyW * 0.1, s.skin);
  }
  wonkyRect(g, cx - bodyW / 2, torsoTop, bodyW, torsoBot - torsoTop, { fill: s.shirt, seed: s.seed + 6, radius: 7, lineWidth: 2.5 });
  // The head covers the top of the torso, so necklines start at its chin.
  const neck = headY + headR * 0.98;
  drawOutfit(g, s, s.shirt, s.skin, cx, neck, bodyW, torsoBot - neck, s.seed);
  if (s.coat !== undefined) {
    wonkyPoly(g, [[cx - bodyW / 2, torsoTop + 2], [cx - bodyW * 0.1, torsoTop + 2], [cx - bodyW * 0.18, torsoBot + 2], [cx - bodyW * 0.58, torsoBot + 4]], { fill: s.coat, seed: s.seed + 7, lineWidth: 2.5 });
    wonkyPoly(g, [[cx + bodyW / 2, torsoTop + 2], [cx + bodyW * 0.1, torsoTop + 2], [cx + bodyW * 0.18, torsoBot + 2], [cx + bodyW * 0.58, torsoBot + 4]], { fill: s.coat, seed: s.seed + 8, lineWidth: 2.5 });
  }

  blob(g, cx, headY, headR, headR * 1.02, { fill: s.skin, seed: s.seed + 9, wobble: 0.03, lineWidth: 2.5 });
  drawHairFront(g, s.hairStyle, s.hair, cx, headY, headR, s.seed);

  const er = headR * 0.24;
  const ex = headR * 0.36;
  const ey = headY + headR * 0.06;
  eye(g, cx - ex, ey, er, s.eyes ?? 'normal', { x: 0, y: 0.2 });
  eye(g, cx + ex, ey, er, s.eyes ?? 'normal', { x: 0, y: 0.2 }, true);
  if (s.lashes) {
    drawLashes(g, cx - ex, ey, er, -1);
    drawLashes(g, cx + ex, ey, er, 1);
  }
  if (s.unibrow) {
    stroke(g, [[cx - headR * 0.62, headY - headR * 0.25], [cx - headR * 0.2, headY - headR * 0.33], [cx + headR * 0.2, headY - headR * 0.25], [cx + headR * 0.62, headY - headR * 0.33]], s.brow ?? s.hair, 3);
  } else if (s.brow !== undefined) {
    stroke(g, [[cx - headR * 0.55, headY - headR * 0.3], [cx - headR * 0.2, headY - headR * 0.34]], s.brow, 2);
    stroke(g, [[cx + headR * 0.2, headY - headR * 0.34], [cx + headR * 0.55, headY - headR * 0.3]], s.brow, 2);
  }
  if (s.glasses) {
    g.lineStyle(2, INK, 1);
    g.strokeCircle(cx - ex, ey, er * 1.35);
    g.strokeCircle(cx + ex, ey, er * 1.35);
  }
  const my = headY + headR * 0.55;
  if (s.lips !== undefined) drawLips(g, cx, my, headR * 0.5, s.lips);
  mouth(g, cx, my, headR * 0.5, s.mouth ?? 'flat');
  if (s.mustache !== undefined) drawMustache(g, cx, headY + headR * 0.42, headR * 0.62, s.mustache, s.seed + 14);
}

export interface PortraitStyle extends OutfitStyle {
  seed: number;
  skin: number;
  hair: number;
  hairStyle: HairStyle;
  shirt: number;
  coat?: number;
  /** Head radius as a fraction of the portrait size. */
  headR?: number;
  /** Vertical stretch of the head (Rick's long face). */
  headStretch?: number;
  brow?: number;
  unibrow?: boolean;
  glasses?: boolean;
  /** Extra drawing on top (props, drool, badges). */
  extra?(g: Graphics, S: number, expression: string): void;
}

export function moodFor(expression: string): EyeMood {
  switch (expression) {
    case 'angry':
    case 'sleepy':
    case 'scared':
    case 'drunk':
    case 'happy':
      return expression;
    default:
      return 'normal';
  }
}

export function mouthFor(expression: string): MouthKind {
  switch (expression) {
    case 'happy':
      return 'smile';
    case 'angry':
      return 'grit';
    case 'scared':
      return 'open';
    case 'drunk':
      return 'wavy';
    case 'sad':
      return 'frown';
    case 'shout':
      return 'open';
    default:
      return 'flat';
  }
}

/** Head-and-shoulders portrait inside an S x S box. */
export function drawPortrait(g: Graphics, S: number, expression: string, p: PortraitStyle): void {
  const cx = S / 2;
  const r = S * (p.headR ?? 0.24);
  const ry = r * (p.headStretch ?? 1);
  const headY = S * 0.46;
  // Shoulders
  const bare = p.coat === undefined && p.sleeves === 'none';
  wonkyRect(g, cx - S * 0.38, S * 0.8, S * 0.76, S * 0.35, { fill: bare ? p.skin : p.shirt, seed: p.seed, radius: S * 0.14, lineWidth: 4 });
  if (bare) wonkyRect(g, cx - S * 0.24, S * 0.86, S * 0.48, S * 0.3, { fill: p.shirt, seed: p.seed + 9, radius: S * 0.05, lineWidth: 3.5 });
  drawOutfit(g, p, p.shirt, p.skin, cx, S * 0.8, S * 0.5, S * 0.22, p.seed);
  if (p.coat !== undefined) {
    wonkyPoly(g, [[cx - S * 0.38, S * 0.86], [cx - S * 0.06, S * 0.8], [cx - S * 0.02, S * 1.05], [cx - S * 0.4, S * 1.05]], { fill: p.coat, seed: p.seed + 1, lineWidth: 4 });
    wonkyPoly(g, [[cx + S * 0.38, S * 0.86], [cx + S * 0.06, S * 0.8], [cx + S * 0.02, S * 1.05], [cx + S * 0.4, S * 1.05]], { fill: p.coat, seed: p.seed + 2, lineWidth: 4 });
  }
  wonkyRect(g, cx - S * 0.06, headY + ry * 0.7, S * 0.12, S * 0.12, { fill: p.skin, seed: p.seed + 3, lineWidth: 3.5 });

  if (hasBackHair(p.hairStyle)) drawHairBack(g, p.hairStyle, p.hair, cx, headY, r, p.seed + 4);
  blob(g, cx - r * 0.98, headY + ry * 0.08, r * 0.14, r * 0.22, { fill: p.skin, seed: p.seed + 5, lineWidth: 3 });
  blob(g, cx + r * 0.98, headY + ry * 0.08, r * 0.14, r * 0.22, { fill: p.skin, seed: p.seed + 6, lineWidth: 3 });
  blob(g, cx, headY, r, ry, { fill: p.skin, seed: p.seed + 7, wobble: 0.025, lineWidth: 4 });
  const bangs = p.hairStyle === 'long' || p.hairStyle === 'bob' || p.hairStyle === 'ponytail';
  drawHairFront(g, p.hairStyle, p.hair, cx, bangs ? headY : headY - (ry - r) * 0.8, r, p.seed + 4);

  const mood = moodFor(expression);
  const er = r * 0.23;
  const ey = headY + ry * 0.02;
  eye(g, cx - r * 0.38, ey, er, mood, { x: 0.1, y: 0.1 });
  eye(g, cx + r * 0.38, ey, er, mood, { x: -0.1, y: 0.1 }, true);
  if (p.lashes) {
    drawLashes(g, cx - r * 0.38, ey, er, -1);
    drawLashes(g, cx + r * 0.38, ey, er, 1);
  }
  const brow = p.brow ?? shade(p.hair, -0.2);
  const lift = expression === 'scared' ? -r * 0.12 : expression === 'angry' ? r * 0.08 : 0;
  if (p.unibrow) {
    stroke(g, [[cx - r * 0.7, ey - er * 1.5 + lift], [cx - r * 0.35, ey - er * 1.9], [cx, ey - er * 1.45 + lift], [cx + r * 0.35, ey - er * 1.9], [cx + r * 0.7, ey - er * 1.5 + lift]], brow, 5);
  } else {
    stroke(g, [[cx - r * 0.62, ey - er * 1.55 - lift], [cx - r * 0.18, ey - er * 1.75 + lift]], brow, 4);
    stroke(g, [[cx + r * 0.18, ey - er * 1.75 + lift], [cx + r * 0.62, ey - er * 1.55 - lift]], brow, 4);
  }
  if (p.glasses) {
    g.lineStyle(3, INK, 1);
    g.strokeCircle(cx - r * 0.38, ey, er * 1.45);
    g.strokeCircle(cx + r * 0.38, ey, er * 1.45);
    stroke(g, [[cx - r * 0.1, ey], [cx + r * 0.1, ey]], INK, 3);
  }
  // Nose
  stroke(g, [[cx + r * 0.02, ey + er * 0.9], [cx - r * 0.06, ey + ry * 0.32], [cx + r * 0.06, ey + ry * 0.34]], shade(p.skin, -0.35), 3);
  const my = headY + ry * 0.58;
  if (p.lips !== undefined) drawLips(g, cx, my, r * 0.46, p.lips);
  mouth(g, cx, my, r * 0.46, mouthFor(expression));
  if (p.mustache !== undefined) drawMustache(g, cx, headY + ry * 0.45, r * 0.62, p.mustache, p.seed + 14);
  p.extra?.(g, S, expression);
}
