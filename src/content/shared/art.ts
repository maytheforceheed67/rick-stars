/**
 * Reusable drawing for people: chibi world sprites and cutscene portraits. All original art,
 * drawn in code with the engine's wobbly-outline helpers.
 */
import { blob, dot, eye, INK, jitter, mouth, shade, stroke, wonkyPoly, wonkyRect, type EyeMood } from '../../engine/art/draw';
import type { Graphics } from '../../engine/types';

export const SKIN = 0xf3cfa8;
export const SKIN_PALE = 0xefd9c4;

export type HairStyle = 'morty' | 'rick' | 'buzz' | 'sides' | 'long' | 'swoop' | 'bob' | 'none';
export type MouthKind = 'flat' | 'smile' | 'frown' | 'open' | 'wavy' | 'grit';

export interface PersonStyle {
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

/** Hair drawn over a head at (cx, cy) with radius r. */
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
    case 'sides':
      blob(g, cx - r * 0.95, cy + r * 0.05, r * 0.28, r * 0.42, { fill: color, seed });
      blob(g, cx + r * 0.95, cy + r * 0.05, r * 0.28, r * 0.42, { fill: color, seed: seed + 1 });
      break;
    case 'long': {
      blob(g, cx, cy + r * 0.25, r * 1.18, r * 1.25, { fill: shade(color, -0.12), seed });
      break;
    }
    case 'bob':
      blob(g, cx, cy + r * 0.05, r * 1.15, r * 1.1, { fill: shade(color, -0.1), seed });
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
    case 'none':
      break;
  }
}

/** Full-body chibi sprite, feet at the bottom of the w x h box. */
export function drawPerson(g: Graphics, w: number, h: number, s: PersonStyle): void {
  const cx = w / 2;
  const build = s.build ?? 'kid';
  const bodyW = w * (build === 'big' ? 0.78 : build === 'adult' ? 0.6 : 0.56);
  const headR = w * (build === 'kid' ? 0.3 : build === 'big' ? 0.27 : 0.26);
  const headY = h * (build === 'kid' ? 0.3 : 0.26);
  const torsoTop = headY + headR * 0.8;
  const torsoBot = h * 0.76;
  const shoe = s.shoes ?? 0x3b2f2a;

  // Back hair first so the head covers it.
  if (s.hairStyle === 'long' || s.hairStyle === 'bob' || s.hairStyle === 'rick') drawHair(g, s.hairStyle, s.hair, cx, headY, headR, s.seed);

  blob(g, cx - bodyW * 0.22, h - 5, bodyW * 0.2, 4.5, { fill: shoe, seed: s.seed + 1, lineWidth: 2 });
  blob(g, cx + bodyW * 0.22, h - 5, bodyW * 0.2, 4.5, { fill: shoe, seed: s.seed + 2, lineWidth: 2 });
  wonkyRect(g, cx - bodyW * 0.38, torsoBot - 4, bodyW * 0.76, h - torsoBot - 3, { fill: s.pants, seed: s.seed + 3, radius: 3, lineWidth: 2.5 });
  stroke(g, [[cx, torsoBot], [cx, h - 8]], shade(s.pants, -0.35), 2);

  const armColor = s.coat ?? s.shirt;
  blob(g, cx - bodyW * 0.55, torsoTop + (torsoBot - torsoTop) * 0.45, bodyW * 0.14, (torsoBot - torsoTop) * 0.42, { fill: armColor, seed: s.seed + 4, lineWidth: 2.5 });
  blob(g, cx + bodyW * 0.55, torsoTop + (torsoBot - torsoTop) * 0.45, bodyW * 0.14, (torsoBot - torsoTop) * 0.42, { fill: armColor, seed: s.seed + 5, lineWidth: 2.5 });
  dot(g, cx - bodyW * 0.56, torsoBot - 2, bodyW * 0.1, s.skin);
  dot(g, cx + bodyW * 0.56, torsoBot - 2, bodyW * 0.1, s.skin);
  wonkyRect(g, cx - bodyW / 2, torsoTop, bodyW, torsoBot - torsoTop, { fill: s.shirt, seed: s.seed + 6, radius: 7, lineWidth: 2.5 });
  if (s.coat !== undefined) {
    wonkyPoly(g, [[cx - bodyW / 2, torsoTop + 2], [cx - bodyW * 0.1, torsoTop + 2], [cx - bodyW * 0.18, torsoBot + 2], [cx - bodyW * 0.58, torsoBot + 4]], { fill: s.coat, seed: s.seed + 7, lineWidth: 2.5 });
    wonkyPoly(g, [[cx + bodyW / 2, torsoTop + 2], [cx + bodyW * 0.1, torsoTop + 2], [cx + bodyW * 0.18, torsoBot + 2], [cx + bodyW * 0.58, torsoBot + 4]], { fill: s.coat, seed: s.seed + 8, lineWidth: 2.5 });
  }

  blob(g, cx, headY, headR, headR * 1.02, { fill: s.skin, seed: s.seed + 9, wobble: 0.03, lineWidth: 2.5 });
  if (s.hairStyle !== 'long' && s.hairStyle !== 'bob' && s.hairStyle !== 'rick') drawHair(g, s.hairStyle, s.hair, cx, headY, headR, s.seed);
  if (s.hairStyle === 'long' || s.hairStyle === 'bob') {
    wonkyPoly(g, [[cx - headR, headY - headR * 0.1], [cx - headR * 0.6, headY - headR * 0.95], [cx + headR * 0.7, headY - headR * 0.95], [cx + headR, headY - headR * 0.1], [cx + headR * 0.3, headY - headR * 0.55], [cx - headR * 0.4, headY - headR * 0.5]], { fill: s.hair, seed: s.seed + 10, lineWidth: 2 });
  }

  const er = headR * 0.24;
  eye(g, cx - headR * 0.36, headY + headR * 0.06, er, s.eyes ?? 'normal', { x: 0, y: 0.2 });
  eye(g, cx + headR * 0.36, headY + headR * 0.06, er, s.eyes ?? 'normal', { x: 0, y: 0.2 }, true);
  if (s.unibrow) {
    stroke(g, [[cx - headR * 0.62, headY - headR * 0.25], [cx - headR * 0.2, headY - headR * 0.33], [cx + headR * 0.2, headY - headR * 0.25], [cx + headR * 0.62, headY - headR * 0.33]], s.brow ?? s.hair, 3);
  } else if (s.brow !== undefined) {
    stroke(g, [[cx - headR * 0.55, headY - headR * 0.3], [cx - headR * 0.2, headY - headR * 0.34]], s.brow, 2);
    stroke(g, [[cx + headR * 0.2, headY - headR * 0.34], [cx + headR * 0.55, headY - headR * 0.3]], s.brow, 2);
  }
  if (s.glasses) {
    g.lineStyle(2, INK, 1);
    g.strokeCircle(cx - headR * 0.36, headY + headR * 0.06, er * 1.35);
    g.strokeCircle(cx + headR * 0.36, headY + headR * 0.06, er * 1.35);
  }
  mouth(g, cx, headY + headR * 0.55, headR * 0.5, s.mouth ?? 'flat');
}

export interface PortraitStyle {
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
  wonkyRect(g, cx - S * 0.38, S * 0.8, S * 0.76, S * 0.35, { fill: p.shirt, seed: p.seed, radius: S * 0.14, lineWidth: 4 });
  if (p.coat !== undefined) {
    wonkyPoly(g, [[cx - S * 0.38, S * 0.86], [cx - S * 0.06, S * 0.8], [cx - S * 0.02, S * 1.05], [cx - S * 0.4, S * 1.05]], { fill: p.coat, seed: p.seed + 1, lineWidth: 4 });
    wonkyPoly(g, [[cx + S * 0.38, S * 0.86], [cx + S * 0.06, S * 0.8], [cx + S * 0.02, S * 1.05], [cx + S * 0.4, S * 1.05]], { fill: p.coat, seed: p.seed + 2, lineWidth: 4 });
  }
  wonkyRect(g, cx - S * 0.06, headY + ry * 0.7, S * 0.12, S * 0.16, { fill: p.skin, seed: p.seed + 3, lineWidth: 3.5 });

  if (p.hairStyle === 'rick' || p.hairStyle === 'long' || p.hairStyle === 'bob') drawHair(g, p.hairStyle, p.hair, cx, headY, r, p.seed + 4);
  blob(g, cx - r * 0.98, headY + ry * 0.08, r * 0.14, r * 0.22, { fill: p.skin, seed: p.seed + 5, lineWidth: 3 });
  blob(g, cx + r * 0.98, headY + ry * 0.08, r * 0.14, r * 0.22, { fill: p.skin, seed: p.seed + 6, lineWidth: 3 });
  blob(g, cx, headY, r, ry, { fill: p.skin, seed: p.seed + 7, wobble: 0.025, lineWidth: 4 });
  if (p.hairStyle !== 'rick' && p.hairStyle !== 'long' && p.hairStyle !== 'bob') drawHair(g, p.hairStyle, p.hair, cx, headY - (ry - r) * 0.8, r, p.seed + 4);
  if (p.hairStyle === 'long' || p.hairStyle === 'bob') {
    wonkyPoly(g, [[cx - r, headY - r * 0.1], [cx - r * 0.6, headY - r * 1.0], [cx + r * 0.7, headY - r * 1.0], [cx + r, headY - r * 0.1], [cx + r * 0.25, headY - r * 0.6], [cx - r * 0.45, headY - r * 0.5]], { fill: p.hair, seed: p.seed + 8, lineWidth: 3 });
  }

  const mood = moodFor(expression);
  const er = r * 0.23;
  const ey = headY + ry * 0.02;
  eye(g, cx - r * 0.38, ey, er, mood, { x: 0.1, y: 0.1 });
  eye(g, cx + r * 0.38, ey, er, mood, { x: -0.1, y: 0.1 }, true);
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
  mouth(g, cx, headY + ry * 0.58, r * 0.46, mouthFor(expression));
  p.extra?.(g, S, expression);
}
