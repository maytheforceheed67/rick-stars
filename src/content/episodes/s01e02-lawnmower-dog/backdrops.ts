/** Cutscene backdrops for "Lawnmower Dog", drawn in code. The Pilot's are reused too. */
import { blob, dot, INK, portalSwirl, wonkyPoly, wonkyRect } from '../../../engine/art/draw';
import type { BackdropDef, Graphics } from '../../../engine/types';

function sky(g: Graphics, w: number, h: number, top: number, bottom: number): void {
  const n = 6;
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const mix = (a: number, b: number, sh: number) => Math.round(((a >> sh) & 0xff) * (1 - t) + ((b >> sh) & 0xff) * t);
    g.fillStyle((mix(top, bottom, 16) << 16) | (mix(top, bottom, 8) << 8) | mix(top, bottom, 0), 1);
    g.fillRect(0, (h / n) * i, w, h / n + 1);
  }
}

/** A little dog in a helmet, walking a little human on a leash. */
function dogWalkingHuman(g: Graphics, x: number, y: number, s: number, seed: number): void {
  blob(g, x, y, s * 0.5, s * 0.3, { fill: 0xd9a441, seed, lineWidth: 2 });
  blob(g, x + s * 0.5, y - s * 0.35, s * 0.3, s * 0.28, { fill: 0xd9a441, seed: seed + 1, lineWidth: 2 });
  wonkyPoly(g, [[x + s * 0.3, y - s * 0.55], [x + s * 0.5, y - s * 0.8], [x + s * 0.7, y - s * 0.55]], { fill: 0xc9ced9, seed: seed + 2, lineWidth: 2 });
  g.lineStyle(2, 0xe0484d, 1);
  g.lineBetween(x + s * 0.6, y - s * 0.2, x + s * 1.6, y - s * 0.1);
  wonkyRect(g, x + s * 1.5, y - s * 0.45, s * 0.3, s * 0.55, { fill: 0xf2c14e, seed: seed + 3, radius: 3, lineWidth: 2 });
  dot(g, x + s * 1.65, y - s * 0.6, s * 0.16, 0xf3cfa8);
}

export const DOG_BACKDROPS: BackdropDef[] = [
  {
    id: 'dog-world',
    draw: (g, w, h) => {
      sky(g, w, h, 0x8b5fbf, 0xf2a7c9);
      // A giant bone-shaped monument where the town hall used to be.
      blob(g, w * 0.5 - 60, h * 0.22, 26, 26, { fill: 0xf4efe6, seed: 3501, lineWidth: 3 });
      blob(g, w * 0.5 + 60, h * 0.22, 26, 26, { fill: 0xf4efe6, seed: 3502, lineWidth: 3 });
      wonkyRect(g, w * 0.5 - 60, h * 0.17, 120, 22, { fill: 0xf4efe6, seed: 3503, radius: 8 });
      for (let i = 0; i < 5; i++) {
        const x = i * (w / 4.5);
        wonkyRect(g, x, h * 0.5, w * 0.18, h * 0.3, { fill: 0x5f4a7a, seed: 3510 + i, radius: 3 });
        wonkyPoly(g, [[x - 6, h * 0.51], [x + w * 0.09, h * 0.38], [x + w * 0.18 + 6, h * 0.51]], { fill: 0x4a3a62, seed: 3520 + i });
      }
      g.fillStyle(0x6f9a5a, 1);
      g.fillRect(0, h * 0.78, w, h * 0.22);
      g.lineStyle(3, INK, 0.6);
      g.lineBetween(0, h * 0.78, w, h * 0.78);
      dogWalkingHuman(g, w * 0.15, h * 0.88, 40, 3530);
      dogWalkingHuman(g, w * 0.6, h * 0.9, 34, 3540);
    },
  },
  {
    id: 'dog-portal-yard',
    draw: (g, w, h) => {
      sky(g, w, h, 0x9fd8f0, 0xdff4ff);
      g.fillStyle(0x7fbf5a, 1);
      g.fillRect(0, h * 0.72, w, h * 0.28);
      wonkyRect(g, w * 0.04, h * 0.3, w * 0.26, h * 0.44, { fill: 0xb08a5a, seed: 3601, radius: 4 });
      wonkyPoly(g, [[w * 0.02, h * 0.31], [w * 0.17, h * 0.14], [w * 0.32, h * 0.31]], { fill: 0x8a5a3a, seed: 3602 });
      portalSwirl(g, w * 0.66, h * 0.52, w * 0.16, h * 0.3, 3603);
      for (let i = 0; i < 4; i++) dogWalkingHuman(g, w * (0.42 + i * 0.06), h * (0.82 + (i % 2) * 0.04), 20, 3610 + i * 10);
    },
  },
];
