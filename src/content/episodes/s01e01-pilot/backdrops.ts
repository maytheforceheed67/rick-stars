/** Cutscene backdrops for the Pilot, drawn in code. */
import { blob, dot, INK, jitter, PORTAL_GREEN, portalSwirl, shade, wonkyPoly, wonkyRect } from '../../../engine/art/draw';
import type { BackdropDef, Graphics } from '../../../engine/types';

function bands(g: Graphics, w: number, h: number, top: number, bottom: number, n = 8): void {
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const r = ((top >> 16) & 0xff) * (1 - t) + ((bottom >> 16) & 0xff) * t;
    const gg = ((top >> 8) & 0xff) * (1 - t) + ((bottom >> 8) & 0xff) * t;
    const b = (top & 0xff) * (1 - t) + (bottom & 0xff) * t;
    g.fillStyle((Math.round(r) << 16) | (Math.round(gg) << 8) | Math.round(b), 1);
    g.fillRect(0, (h / n) * i, w, h / n + 1);
  }
}

function stars(g: Graphics, w: number, h: number, seed: number, count = 40): void {
  for (let i = 0; i < count; i++) {
    const x = (jitter(seed, i) * 0.5 + 0.5) * w;
    const y = (jitter(seed, i + 99) * 0.5 + 0.5) * h * 0.7;
    dot(g, x, y, 1 + (i % 3) * 0.6, 0xffffff, 0.8);
  }
}

function floor(g: Graphics, w: number, h: number, color: number, at = 0.78): void {
  g.fillStyle(color, 1);
  g.fillRect(0, h * at, w, h * (1 - at));
  g.lineStyle(3, INK, 0.6);
  g.lineBetween(0, h * at, w, h * at);
}

export const PILOT_BACKDROPS: BackdropDef[] = [
  { id: 'black', draw: (g, w, h) => bands(g, w, h, 0x141024, 0x0b0814, 4) },
  {
    id: 'night-town',
    draw: (g, w, h) => {
      bands(g, w, h, 0x0d1030, 0x2a2350);
      stars(g, w, h, 3);
      dot(g, w * 0.82, h * 0.18, h * 0.08, 0xf4efe6);
      for (let i = 0; i < 5; i++) {
        const x = i * (w / 4.5);
        wonkyRect(g, x, h * 0.62, w * 0.18, h * 0.4, { fill: 0x1c1838, seed: i + 1, radius: 3 });
        wonkyPoly(g, [[x - 6, h * 0.63], [x + w * 0.09, h * 0.48], [x + w * 0.18 + 6, h * 0.63]], { fill: 0x241f45, seed: i + 7 });
        dot(g, x + w * 0.06, h * 0.72, 5, 0xffd54a, 0.9);
      }
    },
  },
  {
    id: 'bedroom-night',
    draw: (g, w, h) => {
      bands(g, w, h, 0x2a2350, 0x1c1838, 4);
      wonkyRect(g, w * 0.62, h * 0.12, w * 0.24, h * 0.3, { fill: 0x0d1030, seed: 21, radius: 4 });
      dot(g, w * 0.74, h * 0.24, h * 0.05, 0xf4efe6);
      wonkyRect(g, w * 0.08, h * 0.15, w * 0.14, h * 0.2, { fill: 0x3f6fb5, seed: 22, radius: 2 });
      floor(g, w, h, 0x4a3a52);
      wonkyRect(g, w * 0.05, h * 0.6, w * 0.4, h * 0.22, { fill: 0x5a7fbf, seed: 23, radius: 8 });
    },
  },
  {
    id: 'car-night',
    draw: (g, w, h) => {
      bands(g, w, h, 0x0d1030, 0x3a2f6b);
      stars(g, w, h, 5, 60);
      for (let i = 0; i < 6; i++) dot(g, (i / 6) * w + 20, h * 0.66, 3, 0xffd54a, 0.8);
      wonkyPoly(g, [[0, h * 0.72], [w, h * 0.72], [w, h], [0, h]], { fill: 0x5a5a6e, seed: 31 });
      blob(g, w * 0.3, h * 0.86, w * 0.12, h * 0.1, { fill: 0x3a3f58, seed: 32 });
      dot(g, w * 0.62, h * 0.82, 6, PORTAL_GREEN);
      dot(g, w * 0.7, h * 0.82, 6, 0xe0484d);
    },
  },
  {
    id: 'kitchen',
    draw: (g, w, h) => {
      bands(g, w, h, 0xf2d58a, 0xe9c170, 4);
      wonkyRect(g, w * 0.6, h * 0.1, w * 0.28, h * 0.3, { fill: 0x9fd8f0, seed: 41, radius: 4 });
      wonkyRect(g, w * 0.05, h * 0.1, w * 0.3, h * 0.2, { fill: 0xc9935f, seed: 42, radius: 4 });
      floor(g, w, h, 0xc9a27a, 0.72);
      wonkyRect(g, w * 0.15, h * 0.62, w * 0.7, h * 0.12, { fill: 0x9c6a3e, seed: 43, radius: 6 });
      blob(g, w * 0.4, h * 0.62, 16, 7, { fill: 0xffffff, seed: 44 });
      blob(g, w * 0.4, h * 0.6, 9, 4, { fill: 0xffd54a, outline: null, seed: 45 });
    },
  },
  {
    id: 'classroom',
    draw: (g, w, h) => {
      bands(g, w, h, 0xbfd3c1, 0xa9c2ae, 4);
      wonkyRect(g, w * 0.12, h * 0.1, w * 0.76, h * 0.34, { fill: 0x2f4a3a, seed: 51, radius: 4 });
      g.lineStyle(3, 0xf4efe6, 0.9);
      g.lineBetween(w * 0.18, h * 0.2, w * 0.36, h * 0.2);
      g.lineBetween(w * 0.42, h * 0.18, w * 0.48, h * 0.26);
      g.lineBetween(w * 0.42, h * 0.26, w * 0.48, h * 0.18);
      g.lineBetween(w * 0.54, h * 0.22, w * 0.7, h * 0.22);
      g.lineBetween(w * 0.18, h * 0.34, w * 0.64, h * 0.34);
      floor(g, w, h, 0xd9d2bf);
      for (let i = 0; i < 3; i++) wonkyRect(g, w * (0.08 + i * 0.32), h * 0.66, w * 0.22, h * 0.1, { fill: 0xb07a45, seed: 52 + i, radius: 3 });
    },
  },
  {
    id: 'hallway',
    draw: (g, w, h) => {
      bands(g, w, h, 0xe6e0cf, 0xd9d2bf, 3);
      for (let i = 0; i < 8; i++) {
        wonkyRect(g, i * (w / 8) + 4, h * 0.12, w / 8 - 8, h * 0.6, { fill: 0x5b7fa3, seed: 61 + i, radius: 3 });
        g.lineStyle(2, shade(0x5b7fa3, -0.3), 1);
        g.lineBetween(i * (w / 8) + 12, h * 0.2, i * (w / 8) + w / 8 - 12, h * 0.2);
        dot(g, i * (w / 8) + w / 8 - 14, h * 0.42, 3, 0xc9ced9);
      }
      floor(g, w, h, 0xc2b99f);
    },
  },
  {
    id: 'principal-office',
    draw: (g, w, h) => {
      bands(g, w, h, 0x8b5a2b, 0x6b4520, 4);
      for (let i = 0; i < 3; i++) wonkyRect(g, w * (0.15 + i * 0.25), h * 0.14, w * 0.14, h * 0.18, { fill: 0xf4efe6, seed: 71 + i, radius: 2 });
      floor(g, w, h, 0x5a3a22, 0.7);
      wonkyRect(g, w * 0.2, h * 0.6, w * 0.6, h * 0.2, { fill: 0x9c6a3e, seed: 75, radius: 5 });
    },
  },
  {
    id: 'hills-35c',
    draw: (g, w, h) => {
      bands(g, w, h, 0xf2a6c0, 0x8fe0d0);
      dot(g, w * 0.2, h * 0.2, h * 0.07, 0xffe27a);
      dot(g, w * 0.28, h * 0.14, h * 0.04, 0xb6f07a);
      for (let i = 0; i < 4; i++) blob(g, w * (0.1 + i * 0.3), h * 0.85, w * 0.28, h * 0.32, { fill: [0x5fd4a0, 0x9fe0b5, 0x7fcf9e, 0x5fc7a8][i], seed: 81 + i, wobble: 0.1 });
      for (let i = 0; i < 3; i++) blob(g, w * (0.3 + i * 0.25), h * (0.3 + (i % 2) * 0.1), w * 0.05, h * 0.04, { fill: 0xb48be0, seed: 90 + i, wobble: 0.2 });
      wonkyPoly(g, [[w * 0.74, h * 0.62], [w * 0.76, h * 0.36], [w * 0.8, h * 0.36], [w * 0.82, h * 0.62]], { fill: 0x9c5fbf, seed: 95 });
      blob(g, w * 0.78, h * 0.3, w * 0.12, h * 0.12, { fill: 0x5fd4a0, seed: 96, wobble: 0.14 });
      dot(g, w * 0.74, h * 0.3, 6, 0xff8a3d);
      dot(g, w * 0.82, h * 0.26, 6, 0xff8a3d);
    },
  },
  {
    id: 'cliff-35c',
    draw: (g, w, h) => {
      bands(g, w, h, 0xf2a6c0, 0x8fe0d0);
      wonkyPoly(g, [[0, h * 0.3], [w * 0.55, h * 0.36], [w * 0.6, h], [0, h]], { fill: 0x3b2f6b, seed: 101 });
      g.lineStyle(4, 0x6a5acd, 1);
      for (let i = 0; i < 4; i++) g.lineBetween(w * 0.05, h * (0.45 + i * 0.12), w * 0.5, h * (0.47 + i * 0.12));
      wonkyPoly(g, [[w * 0.6, h * 0.85], [w, h * 0.8], [w, h], [w * 0.6, h]], { fill: 0x9fe0b5, seed: 102 });
    },
  },
  {
    id: 'drugstore',
    draw: (g, w, h) => {
      bands(g, w, h, 0xeaf6ff, 0xcfe6f7, 4);
      for (let r = 0; r < 3; r++) {
        wonkyRect(g, w * 0.05, h * (0.18 + r * 0.2), w * 0.9, h * 0.04, { fill: 0xb8bdd4, seed: 111 + r, radius: 2 });
        for (let i = 0; i < 10; i++) wonkyRect(g, w * (0.07 + i * 0.088), h * (0.08 + r * 0.2), w * 0.05, h * 0.1, { fill: [0x6fd08c, 0xf08fb0, 0x8ec5de][(i + r) % 3], seed: 120 + i + r * 10, radius: 3, lineWidth: 2 });
      }
      wonkyRect(g, w * 0.4, h * 0.02, w * 0.2, h * 0.07, { fill: 0xe0484d, seed: 150, radius: 3 });
      g.fillStyle(0xffffff, 1);
      g.fillRect(w * 0.49, h * 0.025, w * 0.02, h * 0.06);
      g.fillRect(w * 0.47, h * 0.045, w * 0.06, h * 0.02);
      floor(g, w, h, 0xdfe6ee);
    },
  },
  {
    id: 'customs',
    draw: (g, w, h) => {
      bands(g, w, h, 0x56657a, 0x3d4a5c, 5);
      for (let i = 0; i < 3; i++) {
        const x = w * (0.12 + i * 0.3);
        wonkyRect(g, x, h * 0.3, w * 0.04, h * 0.45, { fill: 0x8c9bb0, seed: 161 + i, radius: 3 });
        wonkyRect(g, x + w * 0.14, h * 0.3, w * 0.04, h * 0.45, { fill: 0x8c9bb0, seed: 165 + i, radius: 3 });
        wonkyRect(g, x - w * 0.01, h * 0.26, w * 0.2, h * 0.06, { fill: 0x6b7a8f, seed: 169 + i, radius: 4 });
        dot(g, x + w * 0.09, h * 0.29, 5, 0xff3355);
      }
      wonkyRect(g, w * 0.3, h * 0.04, w * 0.4, h * 0.1, { fill: 0x2f6f8f, seed: 175, radius: 4 });
      floor(g, w, h, 0xc9ced9);
      g.lineStyle(4, 0xd92f3a, 1);
      g.lineBetween(0, h * 0.86, w, h * 0.86);
    },
  },
  {
    id: 'portal',
    draw: (g, w, h) => {
      bands(g, w, h, 0x0b0814, 0x1c2a14, 4);
      portalSwirl(g, w / 2, h / 2, w * 0.28, h * 0.38, 181);
    },
  },
  {
    id: 'living-room',
    draw: (g, w, h) => {
      bands(g, w, h, 0xe0c38c, 0xd9b77a, 4);
      wonkyRect(g, w * 0.65, h * 0.14, w * 0.22, h * 0.26, { fill: 0x9fd8f0, seed: 191, radius: 4 });
      floor(g, w, h, 0xa9805a, 0.72);
      wonkyRect(g, w * 0.08, h * 0.5, w * 0.4, h * 0.2, { fill: 0x7f9fd0, seed: 192, radius: 10 });
      for (let i = 0; i < 3; i++) wonkyRect(g, w * (0.56 + i * 0.12), h * (0.62 - (i % 2) * 0.06), w * 0.1, h * 0.14, { fill: 0xc9935f, seed: 193 + i, radius: 3 });
    },
  },
  {
    id: 'garage',
    draw: (g, w, h) => {
      bands(g, w, h, 0x4a4f6e, 0x3a3f58, 4);
      wonkyRect(g, w * 0.05, h * 0.12, w * 0.3, h * 0.08, { fill: 0x8b5a2b, seed: 201, radius: 2 });
      for (let i = 0; i < 5; i++) wonkyRect(g, w * (0.07 + i * 0.055), h * 0.04, w * 0.03, h * 0.08, { fill: [0xe0484d, 0x97ce4c, 0x8ec5de][i % 3], seed: 202 + i, radius: 2, lineWidth: 2 });
      floor(g, w, h, 0x6b6a78, 0.7);
      wonkyRect(g, w * 0.55, h * 0.42, w * 0.36, h * 0.32, { fill: 0x7a8a9a, seed: 210, radius: 18 });
      dot(g, w * 0.6, h * 0.12, 8, 0xffe27a);
    },
  },
];
