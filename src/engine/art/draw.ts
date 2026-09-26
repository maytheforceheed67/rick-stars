/**
 * Helpers for the game's look: thick dark outlines, slightly wobbly shapes, flat bright colors.
 * Everything takes a Graphics object, so content can use these without importing Phaser.
 * Wobble is deterministic (hash-based), so textures look the same every boot.
 */
import type { Graphics } from '../types';

export const INK = 0x1a1424;
export const LINE = 3;
export const PORTAL_GREEN = 0x97ce4c;
export const PORTAL_GREEN_DARK = 0x4f8a1f;

/** Deterministic pseudo-random value in [-1, 1]. */
export function jitter(seed: number, i: number): number {
  const s = Math.sin(seed * 127.1 + i * 311.7) * 43758.5453;
  return (s - Math.floor(s)) * 2 - 1;
}

export interface ShapeStyle {
  fill: number;
  fillAlpha?: number;
  outline?: number | null;
  lineWidth?: number;
  seed?: number;
  /** Radius wobble as a fraction of the radius (ellipses) or pixels (rects). */
  wobble?: number;
}

function paint(g: Graphics, points: { x: number; y: number }[], s: ShapeStyle): void {
  g.fillStyle(s.fill, s.fillAlpha ?? 1);
  g.fillPoints(points, true, true);
  if (s.outline !== null) {
    g.lineStyle(s.lineWidth ?? LINE, s.outline ?? INK, 1);
    g.strokePoints(points, true, true);
  }
}

/** A slightly lumpy ellipse. */
export function blob(g: Graphics, cx: number, cy: number, rx: number, ry: number, s: ShapeStyle): void {
  const n = Math.max(12, Math.round((rx + ry) / 2.2));
  const seed = s.seed ?? 1;
  const amount = s.wobble ?? 0.05;
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const k = 1 + jitter(seed, i) * amount;
    pts.push({ x: cx + Math.cos(a) * rx * k, y: cy + Math.sin(a) * ry * k });
  }
  paint(g, pts, s);
}

/** A slightly wonky rounded rectangle. */
export function wonkyRect(g: Graphics, x: number, y: number, w: number, h: number, s: ShapeStyle & { radius?: number }): void {
  const seed = s.seed ?? 3;
  const amt = s.wobble ?? 1.5;
  const r = Math.min(s.radius ?? 4, w / 2, h / 2);
  const corners = [
    { x: x + r, y },
    { x: x + w - r, y },
    { x: x + w, y: y + r },
    { x: x + w, y: y + h - r },
    { x: x + w - r, y: y + h },
    { x: x + r, y: y + h },
    { x, y: y + h - r },
    { x, y: y + r },
  ];
  const pts = corners.map((p, i) => ({ x: p.x + jitter(seed, i) * amt, y: p.y + jitter(seed, i + 9) * amt }));
  paint(g, pts, s);
}

/** Polygon with wobble on each vertex. */
export function wonkyPoly(g: Graphics, points: [number, number][], s: ShapeStyle): void {
  const seed = s.seed ?? 5;
  const amt = s.wobble ?? 1;
  paint(
    g,
    points.map(([px, py], i) => ({ x: px + jitter(seed, i) * amt, y: py + jitter(seed, i + 17) * amt })),
    s,
  );
}

export function dot(g: Graphics, x: number, y: number, r: number, color: number, alpha = 1): void {
  g.fillStyle(color, alpha);
  g.fillCircle(x, y, r);
}

export function stroke(g: Graphics, points: [number, number][], color = INK, width = LINE): void {
  g.lineStyle(width, color, 1);
  g.beginPath();
  g.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) g.lineTo(points[i][0], points[i][1]);
  g.strokePath();
}

export type EyeMood = 'normal' | 'angry' | 'sleepy' | 'scared' | 'drunk' | 'happy';

/** A cartoon eye: white ball, pupil, optional lid for mood. */
export function eye(g: Graphics, x: number, y: number, r: number, mood: EyeMood = 'normal', look: { x: number; y: number } = { x: 0, y: 0 }, flip = false): void {
  g.fillStyle(0xffffff, 1);
  g.fillCircle(x, y, r);
  g.lineStyle(Math.max(1.5, r * 0.28), INK, 1);
  g.strokeCircle(x, y, r);
  const pr = mood === 'scared' ? r * 0.28 : r * 0.42;
  g.fillStyle(INK, 1);
  g.fillCircle(x + look.x * r * 0.35, y + look.y * r * 0.35, pr);
  const dir = flip ? -1 : 1;
  g.fillStyle(INK, 1);
  if (mood === 'angry') {
    g.fillTriangle(x - r * 1.1 * dir, y - r * 1.1, x + r * 1.1 * dir, y - r * 0.2, x + r * 1.1 * dir, y - r * 1.2);
  } else if (mood === 'sleepy' || mood === 'drunk') {
    g.fillRect(x - r * 1.05, y - r * 1.05, r * 2.1, r * (mood === 'drunk' ? 0.95 : 1.15));
  }
}

/** Simple mouth shapes. */
export function mouth(g: Graphics, x: number, y: number, w: number, kind: 'flat' | 'smile' | 'frown' | 'open' | 'wavy' | 'grit'): void {
  g.lineStyle(Math.max(2, w * 0.14), INK, 1);
  switch (kind) {
    case 'flat':
      stroke(g, [[x - w / 2, y], [x + w / 2, y]], INK, Math.max(2, w * 0.14));
      break;
    case 'smile':
      g.beginPath();
      g.arc(x, y - w * 0.35, w * 0.55, Math.PI * 0.2, Math.PI * 0.8, false);
      g.strokePath();
      break;
    case 'frown':
      g.beginPath();
      g.arc(x, y + w * 0.45, w * 0.55, Math.PI * 1.2, Math.PI * 1.8, false);
      g.strokePath();
      break;
    case 'open':
      g.fillStyle(0x5a1a2a, 1);
      g.fillEllipse(x, y, w, w * 0.7);
      g.strokeEllipse(x, y, w, w * 0.7);
      break;
    case 'wavy':
      stroke(g, [[x - w / 2, y], [x - w / 4, y - w * 0.15], [x, y + w * 0.1], [x + w / 4, y - w * 0.15], [x + w / 2, y]], INK, Math.max(2, w * 0.12));
      break;
    case 'grit':
      g.fillStyle(0xffffff, 1);
      g.fillRect(x - w / 2, y - w * 0.18, w, w * 0.36);
      g.strokeRect(x - w / 2, y - w * 0.18, w, w * 0.36);
      stroke(g, [[x - w / 6, y - w * 0.18], [x - w / 6, y + w * 0.18]], INK, 1.5);
      stroke(g, [[x + w / 6, y - w * 0.18], [x + w / 6, y + w * 0.18]], INK, 1.5);
      break;
  }
}

/** Darkens (amount < 0) or lightens (amount > 0) a color. */
export function shade(color: number, amount: number): number {
  const r = (color >> 16) & 0xff;
  const gg = (color >> 8) & 0xff;
  const b = color & 0xff;
  const f = (c: number) => Math.max(0, Math.min(255, Math.round(amount < 0 ? c * (1 + amount) : c + (255 - c) * amount)));
  return (f(r) << 16) | (f(gg) << 8) | f(b);
}

/** 5-point heart shape centered at (x, y). */
export function heart(g: Graphics, x: number, y: number, size: number, fill: number, half = false): void {
  const s = size / 2;
  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i <= 40; i++) {
    const t = (i / 40) * Math.PI * 2;
    const hx = 16 * Math.pow(Math.sin(t), 3);
    const hy = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
    pts.push({ x: x + (hx / 17) * s, y: y + (hy / 17) * s });
  }
  g.fillStyle(0x3a2230, 1);
  g.fillPoints(pts, true, true);
  if (fill >= 0) {
    g.fillStyle(fill, 1);
    const clip = half ? pts.map((p) => ({ x: Math.min(p.x, x), y: p.y })) : pts;
    g.fillPoints(clip, true, true);
  }
  g.lineStyle(2.5, INK, 1);
  g.strokePoints(pts, true, true);
}

/** Gear/bolt shape used for Scrap. */
export function gear(g: Graphics, x: number, y: number, r: number, color: number): void {
  const pts: { x: number; y: number }[] = [];
  const teeth = 8;
  for (let i = 0; i < teeth * 2; i++) {
    const a = (i / (teeth * 2)) * Math.PI * 2;
    const rr = i % 2 === 0 ? r : r * 0.72;
    pts.push({ x: x + Math.cos(a) * rr, y: y + Math.sin(a) * rr });
  }
  g.fillStyle(color, 1);
  g.fillPoints(pts, true, true);
  g.lineStyle(2, INK, 1);
  g.strokePoints(pts, true, true);
  g.fillStyle(shade(color, -0.45), 1);
  g.fillCircle(x, y, r * 0.3);
}

/** A green portal swirl. */
export function portalSwirl(g: Graphics, x: number, y: number, rx: number, ry: number, seed = 7): void {
  blob(g, x, y, rx, ry, { fill: PORTAL_GREEN_DARK, outline: 0x2e5a12, lineWidth: 3, seed, wobble: 0.08 });
  blob(g, x, y, rx * 0.78, ry * 0.78, { fill: PORTAL_GREEN, outline: null, seed: seed + 1, wobble: 0.1 });
  blob(g, x, y, rx * 0.5, ry * 0.5, { fill: 0xc9f59a, outline: null, seed: seed + 2, wobble: 0.12 });
  g.lineStyle(2, 0xe9ffd6, 0.9);
  for (let i = 0; i < 3; i++) {
    g.beginPath();
    g.arc(x, y, rx * (0.3 + i * 0.18), i * 2, i * 2 + 2.2, false);
    g.strokePath();
  }
}
