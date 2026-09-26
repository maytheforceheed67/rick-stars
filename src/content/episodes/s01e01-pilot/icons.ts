/**
 * Graphics can't draw text, so icons that need a letter use this tiny stroke font.
 * Glyphs are polylines in a unit box (0..1).
 */
import { INK } from '../../../engine/art/draw';
import type { Graphics } from '../../../engine/types';

const GLYPHS: Record<string, [number, number][][]> = {
  F: [[[0.2, 1], [0.2, 0], [0.85, 0]], [[0.2, 0.48], [0.7, 0.48]]],
  Z: [[[0.15, 0], [0.85, 0], [0.15, 1], [0.85, 1]]],
  z: [[[0.2, 0.3], [0.8, 0.3], [0.2, 1], [0.8, 1]]],
  A: [[[0.1, 1], [0.5, 0], [0.9, 1]], [[0.28, 0.6], [0.72, 0.6]]],
  '+': [[[0.5, 0.15], [0.5, 0.85]], [[0.15, 0.5], [0.85, 0.5]]],
  '!': [[[0.5, 0], [0.5, 0.65]], [[0.5, 0.9], [0.5, 1]]],
  '?': [[[0.2, 0.2], [0.35, 0.02], [0.7, 0.02], [0.82, 0.25], [0.5, 0.5], [0.5, 0.7]], [[0.5, 0.9], [0.5, 1]]],
  x: [[[0.15, 0.3], [0.85, 1]], [[0.85, 0.3], [0.15, 1]]],
  '%': [[[0.85, 0], [0.15, 1]], [[0.2, 0.1], [0.3, 0.1]], [[0.7, 0.9], [0.8, 0.9]]],
};

/** Draws a glyph centered at (x, y), `size` pixels tall, with a dark outline. */
export function displayGlyph(g: Graphics, ch: string, x: number, y: number, size: number, color: number): void {
  const strokes = GLYPHS[ch];
  if (!strokes) return;
  const w = size * 0.7;
  const pts = (s: [number, number][]) => s.map(([u, v]) => ({ x: x - w / 2 + u * w, y: y - size / 2 + v * size }));
  for (const [width, c] of [
    [Math.max(4, size * 0.3), INK],
    [Math.max(2, size * 0.16), color],
  ] as const) {
    g.lineStyle(width, c, 1);
    for (const s of strokes) {
      const p = pts(s);
      g.beginPath();
      g.moveTo(p[0].x, p[0].y);
      for (let i = 1; i < p.length; i++) g.lineTo(p[i].x, p[i].y);
      g.strokePath();
    }
  }
}
